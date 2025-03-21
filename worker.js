export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/") {
        return new Response(await generateHomePage(env), { headers: { "Content-Type": "text/html" } });
      } else if (path.startsWith("/player/")) {
        const id = path.split("/")[2];
        return new Response(await generatePlayerPage(id, env), { headers: { "Content-Type": "text/html" } });
      } else if (path === "/iptv") {
        return new Response(await generateIPTVPage(env), { headers: { "Content-Type": "text/html" } });
      } else if (path === "/api/trending") {
        return fetchTrendingMovies(env);
      } else if (path.startsWith("/api/search")) {
        const query = url.searchParams.get("q");
        return fetchSearchResults(query, env);
      } else if (path.startsWith("/api/convert-m3u")) {
        return convertM3UToM3U8(request);
      }

      return new Response("404 Not Found", { status: 404 });
    } catch (error) {
      return new Response("Internal Server Error: " + error.message, { status: 500 });
    }
  }
};

// ✅ Fetch Trending Movies
async function fetchTrendingMovies(env) {
  const apiKey = "43d89010b257341339737be36dfaac13";
  const cacheKey = "trending-movies";

  try {
    let cache = await env.FREESTREAM_CACHE.get(cacheKey);
    if (cache) return new Response(cache, { headers: { "Content-Type": "application/json" } });

    const response = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`);
    const data = await response.json();

    await env.FREESTREAM_CACHE.put(cacheKey, JSON.stringify(data.results), { expirationTtl: 86400 });
    return new Response(JSON.stringify(data.results), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response("Internal Server Error: " + error.message, { status: 500 });
  }
}

// ✅ Search Movies & Shows
async function fetchSearchResults(query, env) {
  if (!query) return new Response("Query Missing", { status: 400 });
  const apiKey = "43d89010b257341339737be36dfaac13";
  const response = await fetch(`https://api.themoviedb.org/3/search/multi?query=${query}&api_key=${apiKey}`);
  const data = await response.json();
  return new Response(JSON.stringify(data.results), { headers: { "Content-Type": "application/json" } });
}

// ✅ Home Page
async function generateHomePage(env) {
  const trendingResponse = await fetchTrendingMovies(env);
  const trendingData = await trendingResponse.json();

  let movieListHTML = trendingData.map(movie => `
    <div class="movie" onclick="window.location='/player/${movie.id}'">
      <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" />
      <h3>${movie.title || movie.name}</h3>
    </div>
  `).join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FreeStream</title>
      <script>
        async function searchMovies() {
          const query = document.getElementById('searchBox').value;
          const response = await fetch('/api/search?q=' + query);
          const data = await response.json();
          document.getElementById('movies').innerHTML = data.map(movie => \`
            <div class="movie" onclick="window.location='/player/\${movie.id}'">
              <img src="https://image.tmdb.org/t/p/w500\${movie.poster_path}" />
              <h3>\${movie.title || movie.name}</h3>
            </div>
          \`).join("");
        }
      </script>
    </head>
    <body>
      <h1>🎬 FreeStream</h1>
      <input type="text" id="searchBox" placeholder="Search movies..." />
      <button onclick="searchMovies()">Search</button>
      <h2>Trending Now</h2>
      <div class="movie-list" id="movies">${movieListHTML}</div>
      <h2><a href="/iptv">📺 Watch Live TV</a></h2>
    </body>
    </html>
  `;
}

// ✅ Movie Player Page
async function generatePlayerPage(id, env) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Watch Movie</title>
      <script src="https://cdn.jwplayer.com/libraries/IDzF9Zmk.js"></script>
    </head>
    <body>
      <h1>🎬 Now Playing</h1>
      <div id="player"></div>
      <script>
        jwplayer("player").setup({
          file: "https://vidsrc.dev/embed/movie/${id}",
          type: "hls",
          width: "100%",
          height: "500px",
          autostart: true
        });
      </script>
    </body>
    </html>
  `;
}

// ✅ IPTV Player Page
async function generateIPTVPage(env) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Live TV</title>
      <script src="https://cdn.jwplayer.com/libraries/IDzF9Zmk.js"></script>
    </head>
    <body>
      <h1>📺 Live TV</h1>
      <select id="channelList" onchange="changeChannel()">
        <option value="https://iptv-org.github.io/iptv/countries/in.m3u">🇮🇳 India</option>
        <option value="https://iptv-org.github.io/iptv/countries/us.m3u">🇺🇸 USA</option>
        <option value="https://iptv-org.github.io/iptv/categories/movies.m3u">🎥 Movies</option>
      </select>
      <div id="player"></div>
      <script>
        async function getM3U8(url) {
          let response = await fetch("/api/convert-m3u?url=" + encodeURIComponent(url));
          let data = await response.json();
          return data.m3u8 || url;
        }

        async function changeChannel() {
          let url = document.getElementById('channelList').value;
          let streamURL = await getM3U8(url);

          jwplayer("player").setup({
            file: streamURL,
            type: "hls",
            width: "100%",
            height: "500px",
            autostart: true
          });
        }

        changeChannel();
      </script>
    </body>
    </html>
  `;
}

// ✅ Convert M3U to M3U8 API
async function convertM3UToM3U8(request) {
  const url = new URL(request.url);
  const m3uURL = url.searchParams.get("url");
  
  if (!m3uURL) return new Response(JSON.stringify({ error: "Missing M3U URL" }), { status: 400 });

  try {
    let response = await fetch(m3uURL);
    let data = await response.text();
    let m3u8Links = data.match(/http.*\.m3u8/g); 

    if (!m3u8Links || m3u8Links.length === 0) {
      return new Response(JSON.stringify({ error: "No playable streams found" }), { status: 404 });
    }

    return new Response(JSON.stringify({ m3u8: m3u8Links[0] }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch M3U data" }), { status: 500 });
  }
      }
