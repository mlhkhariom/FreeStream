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
        return new Response(await generateIPTVPage(), { headers: { "Content-Type": "text/html" } });
      } else if (path === "/api/trending") {
        return fetchTrendingMovies(env);
      } else if (path.startsWith("/api/search")) {
        const query = url.searchParams.get("q");
        return fetchSearchResults(query);
      }

      return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      console.error("Worker Error:", error);
      return new Response(JSON.stringify({ error: "Internal Server Error", message: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
};

// ✅ Fetch Trending Movies
async function fetchTrendingMovies(env) {
  const apiKey = "43d89010b257341339737be36dfaac13";
  try {
    const response = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

    const data = await response.json();
    return new Response(JSON.stringify(data.results), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("❌ Error fetching trending movies:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch trending movies", message: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

// ✅ Search Movies & Shows
async function fetchSearchResults(query) {
  if (!query) return new Response(JSON.stringify({ error: "Query Missing" }), { status: 400, headers: { "Content-Type": "application/json" } });

  const apiKey = "43d89010b257341339737be36dfaac13";
  try {
    const response = await fetch(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&api_key=${apiKey}`);
    const data = await response.json();
    return new Response(JSON.stringify(data.results), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("❌ Error searching movies:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch search results", message: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

// ✅ Generate Home Page
async function generateHomePage(env) {
  const trendingResponse = await fetchTrendingMovies(env);
  const trendingData = await trendingResponse.json().catch(() => []);

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
      <title>FreeStream - Home</title>
      <style>
        body { font-family: Arial, sans-serif; background: #121212; color: #fff; text-align: center; }
        .container { margin: 20px; }
        .btn { padding: 10px 15px; background: red; color: white; border: none; cursor: pointer; margin: 10px; }
        .movie-list { display: flex; flex-wrap: wrap; justify-content: center; }
        .movie { margin: 10px; cursor: pointer; width: 200px; }
        .movie img { width: 100%; border-radius: 10px; }
      </style>
    </head>
    <body>
      <h1>🎬 FreeStream</h1>
      <div class="container">
        <button class="btn" onclick="window.location='/iptv'">📺 Watch Live TV</button>
      </div>
      <h2>Trending Movies & Shows</h2>
      <div class="movie-list" id="movies">${movieListHTML}</div>
    </body>
    </html>
  `;
}

// ✅ Movie Player Page
async function generatePlayerPage(id) {
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

// ✅ IPTV Player Page
async function generateIPTVPage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FreeStream - IPTV</title>
      <style>
        body { font-family: Arial, sans-serif; background: #000; color: #fff; text-align: center; }
        video { width: 80%; height: 500px; margin-top: 20px; }
      </style>
      <script>
        async function loadIPTV() {
          document.getElementById("player").src = "https://iptv-org.github.io/iptv/index.m3u";
        }
      </script>
    </head>
    <body onload="loadIPTV()">
      <h1>📺 Live TV</h1>
      <video id="player" controls autoplay></video>
    </body>
    </html>
  `;
}
