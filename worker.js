export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/") {
        return new Response(await generateHomePage(env), { headers: { "Content-Type": "text/html" } });
      } else if (path.startsWith("/player/")) {
        const id = path.split("/")[2];
        return new Response(await generatePlayerPage(id), { headers: { "Content-Type": "text/html" } });
      } else if (path === "/iptv") {
        return new Response(await generateIPTVPage(), { headers: { "Content-Type": "text/html" } });
      } else if (path === "/api/trending") {
        return fetchTrendingMovies(env);
      }

      return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      console.error("❌ Worker Error:", error);
      return new Response(JSON.stringify({ error: "Internal Server Error", message: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
};

// ✅ Fixed fetchTrendingMovies() Function
async function fetchTrendingMovies(env) {
  const apiKey = "43d89010b257341339737be36dfaac13";
  try {
    const response = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`);
    
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    const data = await response.json();

    if (!data || !data.results || !Array.isArray(data.results)) {
      throw new Error("Invalid API response format");
    }

    return new Response(JSON.stringify(data.results), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("❌ Error fetching trending movies:", error);
    return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } }); // Returns empty array instead of crashing
  }
}

// ✅ Fixed generateHomePage() Function
async function generateHomePage(env) {
  const trendingResponse = await fetchTrendingMovies(env);
  const trendingData = await trendingResponse.json().catch(() => []);

  if (!Array.isArray(trendingData)) {
    console.error("❌ Invalid Trending Data:", trendingData);
    return `<h1>Error: Failed to load trending movies.</h1>`;
  }

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
        function loadIPTV() {
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
