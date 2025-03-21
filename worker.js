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
      } else if (path.startsWith("/api/iptv")) {
        return fetchIPTVChannels();
      }

      return new Response("404 Not Found", { status: 404 });
    } catch (error) {
      console.log("Worker Error:", error.message);
      return new Response("Internal Server Error: " + error.message, { status: 500 });
    }
  }
};

// ✅ Fetch Trending Movies (Cache with KV)
async function fetchTrendingMovies(env) {
  const apiKey = "43d89010b257341339737be36dfaac13";
  const cacheKey = "trending-movies";

  if (!env.FREESTREAM_CACHE) {
    return new Response("Internal Server Error: KV Namespace Missing", { status: 500 });
  }

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

// ✅ Fetch IPTV Channels
async function fetchIPTVChannels() {
  const response = await fetch("https://iptv-org.github.io/iptv/index.m3u");
  return new Response(await response.text(), { headers: { "Content-Type": "application/x-mpegURL" } });
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
      <title>FreeStream - Movies & Live TV</title>
      <style>
        body { font-family: Arial, sans-serif; background: #121212; color: #fff; text-align: center; }
        h1 { font-size: 2.5em; margin-top: 20px; }
        .movie-list { display: flex; flex-wrap: wrap; justify-content: center; }
        .movie { margin: 10px; cursor: pointer; width: 200px; }
        .movie img { width: 100%; border-radius: 10px; }
      </style>
    </head>
    <body>
      <h1>🎬 FreeStream</h1>
      <a href="/iptv">📺 Watch Live TV</a>
      <h2>Trending Movies</h2>
      <div class="movie-list">${movieListHTML}</div>
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FreeStream - Player</title>
      <script src="https://cdn.jwplayer.com/libraries/IDzF9Zmk.js"></script>
    </head>
    <body>
      <h1>🎬 Now Playing</h1>
      <div id="player"></div>
      <script>
        jwplayer("player").setup({
          file: "https://vidsrc.dev/embed/movie/${id}",
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
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Live TV - FreeStream</title>
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
        function changeChannel() {
          let url = document.getElementById('channelList').value;
          jwplayer("player").setup({
            file: url,
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
