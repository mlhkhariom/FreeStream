export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/") {
        return new Response(await generateHomePage(env), { headers: { "Content-Type": "text/html" } });
      } else if (path.startsWith("/player/")) {
        const id = path.split("/")[2];
        return new Response(await generateMoviePlayer(id, env), { headers: { "Content-Type": "text/html" } });
      } else if (path.startsWith("/iptv")) {
        return new Response(await generateIPTVPage(), { headers: { "Content-Type": "text/html" } });
      } else if (path.startsWith("/iptv-player")) {
        const channelUrl = url.searchParams.get("url");
        return new Response(generateIPTVPlayer(channelUrl), { headers: { "Content-Type": "text/html" } });
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
      console.log("❌ Worker Error:", error.message);
      return new Response("Internal Server Error: " + error.message, { status: 500 });
    }
  }
};

// ✅ Fetch Trending Movies
async function fetchTrendingMovies(env) {
  const apiKey = "43d89010b257341339737be36dfaac13";
  try {
    const response = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`);
    const data = await response.json();
    return new Response(JSON.stringify(data.results), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response("Internal Server Error: " + error.message, { status: 500 });
  }
}

// ✅ Fetch IPTV Channels
async function fetchIPTVChannels() {
  const iptvUrl = "https://iptv-org.github.io/iptv/index.m3u";

  try {
    const response = await fetch(iptvUrl);
    if (!response.ok) throw new Error("Failed to fetch IPTV data");

    const data = await response.text();
    const channels = data.split("#EXTINF").slice(1).map(line => {
      const details = line.split("\n");
      return { name: details[0].split(",")[1], url: details[1] };
    });

    return new Response(JSON.stringify(channels), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response("Internal Server Error: " + error.message, { status: 500 });
  }
}

// ✅ Generate Home Page
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

// ✅ Generate IPTV Page
async function generateIPTVPage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FreeStream - IPTV</title>
      <style>
        body { font-family: Arial, sans-serif; background: #121212; color: #fff; text-align: center; }
        .btn { padding: 10px 15px; background: red; color: white; border: none; cursor: pointer; margin: 10px; }
        .movie-list { display: flex; flex-wrap: wrap; justify-content: center; }
        .movie { margin: 10px; cursor: pointer; width: 300px; padding: 10px; background: #222; border-radius: 8px; }
      </style>
      <script>
        async function loadIPTVChannels() {
          const response = await fetch("/api/iptv");
          const channels = await response.json();
          document.getElementById("iptv").innerHTML = channels.map(channel => \`
            <div class="movie" onclick="window.location='/iptv-player?url=\${encodeURIComponent(channel.url)}'">
              <h3>\${channel.name}</h3>
            </div>
          \`).join("");
        }
      </script>
    </head>
    <body>
      <h1>📺 Live IPTV Channels</h1>
      <button class="btn" onclick="loadIPTVChannels()">Load Channels</button>
      <div class="movie-list" id="iptv"></div>
    </body>
    </html>
  `;
}

// ✅ Generate IPTV Player
function generateIPTVPlayer(channelUrl) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>IPTV Player</title>
      <style>
        body { background: #000; color: white; text-align: center; }
        video { width: 100%; height: 90vh; }
      </style>
    </head>
    <body>
      <h1>📺 Live Stream</h1>
      <video controls autoplay>
        <source src="${channelUrl}" type="application/x-mpegURL">
        Your browser does not support IPTV streaming.
      </video>
    </body>
    </html>
  `;
}

// ✅ Generate Movie Player
async function generateMoviePlayer(id, env) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Movie Player</title>
      <style>
        body { background: #000; color: white; text-align: center; }
        iframe { width: 100%; height: 90vh; border: none; }
      </style>
    </head>
    <body>
      <h1>🎬 Now Playing</h1>
      <iframe allowfullscreen src="https://vidsrc.dev/embed/movie/${id}"></iframe>
    </body>
    </html>
  `;
}
