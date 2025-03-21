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
      } else if (path === "/api/trending") {
        return fetchTrendingMovies(env);
      } else if (path.startsWith("/api/search")) {
        const query = url.searchParams.get("q");
        return fetchSearchResults(query, env);
      } else if (path.startsWith("/api/iptv")) {
        return fetchIPTVChannels();
      } else if (path.startsWith("/api/watchlist")) {
        return handleWatchlist(request, env);
      }

      return new Response("404 Not Found", { status: 404 });
    } catch (error) {
      console.log("❌ Worker Error:", error.message);
      return new Response("Internal Server Error: " + error.message, { status: 500 });
    }
  }
};

// ✅ Fetch IPTV Channels from GitHub
async function fetchIPTVChannels() {
  const iptvUrl = "https://iptv-org.github.io/iptv/index.m3u";

  try {
    console.log("🌍 Fetching IPTV Channels...");
    const response = await fetch(iptvUrl);
    if (!response.ok) throw new Error("Failed to fetch IPTV data");

    const data = await response.text();
    return new Response(data, { headers: { "Content-Type": "text/plain" } });
  } catch (error) {
    console.log("❌ Error Fetching IPTV Channels:", error.message);
    return new Response("Internal Server Error: " + error.message, { status: 500 });
  }
}

// ✅ Home Page with Movies, TV Shows & IPTV
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
      <title>FreeStream - Watch Free Movies, TV Shows & IPTV</title>
      <style>
        body { font-family: Arial, sans-serif; background: #121212; color: #fff; text-align: center; }
        h1 { font-size: 2.5em; margin-top: 20px; }
        input { padding: 10px; width: 80%; margin: 10px 0; }
        button { padding: 10px 15px; background: red; color: white; border: none; cursor: pointer; }
        .movie-list { display: flex; flex-wrap: wrap; justify-content: center; }
        .movie { margin: 10px; cursor: pointer; width: 200px; }
        .movie img { width: 100%; border-radius: 10px; }
      </style>
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

        async function loadIPTVChannels() {
          const response = await fetch("/api/iptv");
          const data = await response.text();
          const channels = data.split("#EXTINF").slice(1).map(line => {
            const details = line.split("\n");
            return { name: details[0].split(",")[1], url: details[1] };
          });

          document.getElementById("iptv").innerHTML = channels.map(channel => \`
            <div class="movie" onclick="window.location='/iptv-player?url=\${encodeURIComponent(channel.url)}'">
              <h3>\${channel.name}</h3>
            </div>
          \`).join("");
        }
      </script>
    </head>
    <body>
      <h1>🎬 FreeStream</h1>
      <input type="text" id="searchBox" placeholder="Search movies, TV shows..." />
      <button onclick="searchMovies()">Search</button>
      <h2>Trending Now</h2>
      <div class="movie-list" id="movies">${movieListHTML}</div>
      <h2>📺 Live IPTV Channels</h2>
      <div class="movie-list" id="iptv">
        <button onclick="loadIPTVChannels()">Load IPTV Channels</button>
      </div>
    </body>
    </html>
  `;
}

// ✅ IPTV Player Page
async function generateIPTVPlayerPage(url) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FreeStream - IPTV Player</title>
      <style>
        body { font-family: Arial, sans-serif; background: #000; color: #fff; text-align: center; }
        video { width: 100%; height: 90vh; }
      </style>
    </head>
    <body>
      <h1>📺 Live IPTV</h1>
      <video controls autoplay>
        <source src="${url}" type="application/x-mpegURL">
        Your browser does not support the video tag.
      </video>
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
      <style>
        body { font-family: Arial, sans-serif; background: #000; color: #fff; text-align: center; }
        iframe { width: 100%; height: 500px; border: none; }
        .details { margin-top: 20px; font-size: 1.2em; }
      </style>
      <script>
        async function loadMovieDetails() {
          const response = await fetch("https://api.themoviedb.org/3/movie/${id}?api_key=43d89010b257341339737be36dfaac13");
          const data = await response.json();
          document.getElementById("details").innerHTML = "<strong>" + data.title + "</strong><br>" + data.overview;
        }

        window.onload = loadMovieDetails;
      </script>
    </head>
    <body>
      <h1>🎬 Now Playing</h1>
      <iframe allowfullscreen src="https://vidsrc.dev/embed/movie/${id}"></iframe>
      <div class="details" id="details">Loading movie details...</div>
    </body>
    </html>
  `;
}
