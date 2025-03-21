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
      } else if (path.startsWith("/api/iptv-channels")) {
        return fetchIPTVChannels(request);
      } else if (path === "/api/trending") {
        return fetchTrendingMovies(env);
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

  try {
    const response = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`);
    const data = await response.json();
    return new Response(JSON.stringify(data.results), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response("Internal Server Error: " + error.message, { status: 500 });
  }
}

// ✅ Generate Homepage
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
      <title>OTT & IPTV</title>
      <style>
        body { font-family: Arial, sans-serif; background: #121212; color: white; text-align: center; }
        .movie { display: inline-block; margin: 10px; cursor: pointer; width: 200px; }
        .movie img { width: 100%; border-radius: 10px; }
      </style>
    </head>
    <body>
      <h1>🎬 Trending Movies & Web Series</h1>
      <div>${movieListHTML}</div>
      <h2><a href="/iptv">📺 Live IPTV</a></h2>
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
      <title>Player</title>
      <script src="https://cdn.jwplayer.com/libraries/IDzF9Zmk.js"></script>
      <style> body { text-align: center; background: #000; color: white; } </style>
      <script>
        function playMovie() {
          jwplayer("player").setup({
            file: "https://vidsrc.dev/embed/movie/${id}",
            type: "hls",
            width: "100%",
            height: "500px",
            autostart: true
          });
        }
      </script>
    </head>
    <body onload="playMovie()">
      <h1>🎬 Now Playing</h1>
      <div id="player"></div>
    </body>
    </html>
  `;
}

// ✅ IPTV Page (Updated with All Playlists)
async function generateIPTVPage(env) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Live TV</title>
      <script src="https://cdn.jwplayer.com/libraries/IDzF9Zmk.js"></script>
      <style>
        body { font-family: Arial, sans-serif; background: #121212; color: white; text-align: center; }
        select, button { padding: 10px; margin: 10px; }
        .channel-list { max-height: 400px; overflow-y: auto; text-align: left; padding: 10px; border: 1px solid white; }
        .channel { cursor: pointer; padding: 8px; border-bottom: 1px solid #444; }
      </style>
      <script>
        async function fetchChannels() {
          let playlist = document.getElementById('playlistSelect').value;
          let response = await fetch("/api/iptv-channels?playlist=" + encodeURIComponent(playlist));
          let data = await response.json();

          let listHTML = data.channels.map(channel => \`
            <div class="channel" onclick="playChannel('\${channel.url}')">
              \${channel.name}
            </div>
          \`).join("");

          document.getElementById("channelList").innerHTML = listHTML;
        }

        function playChannel(url) {
          jwplayer("player").setup({
            file: url,
            type: "hls",
            width: "100%",
            height: "500px",
            autostart: true
          });
        }
      </script>
    </head>
    <body>
      <h1>📺 Live TV Channels</h1>
      <select id="playlistSelect" onchange="fetchChannels()">
        <option value="https://raw.githubusercontent.com/hmripon66/worldwide-by-techedubyte.com/main/worldwide%20iptv%20By%20Tech%20Edu%20Byte.m3u">🌍 Worldwide IPTV</option>
        <option value="https://github.com/hmripon66/Indian-hindi-IPTV-by-Tech-Edu-Byte/raw/main/indian%20hindi">🇮🇳 Indian Hindi</option>
        <option value="https://github.com/hmripon66/Sports-IPTV-by-Techedubyte/raw/main/sports%20by%20Tech%20Edu%20Byte.m3u">⚽ Sports IPTV</option>
        <option value="https://github.com/hmripon66/JEO-IPTV-Playlist-By-Techedubyte/raw/main/j%2Bi%2BO%20IPTV%20by%20Tech%20Edu%20Byte.m3u">📡 JIO IPTV</option>
        <option value="https://github.com/hmripon66/cartoon-iptv-by-TechEduByte/raw/main/Cartoon%20by%20techedubyte.m3u8">🎞️ Cartoon IPTV</option>
      </select>
      <div class="channel-list" id="channelList">Select a category to load channels...</div>
      <h2>Now Playing</h2>
      <div id="player"></div>
    </body>
    </html>
  `;
}

// ✅ Fetch IPTV Channels
async function fetchIPTVChannels(request) {
  const url = new URL(request.url);
  const m3uURL = url.searchParams.get("playlist");

  if (!m3uURL) return new Response(JSON.stringify({ error: "Playlist URL missing" }), { status: 400 });

  try {
    let response = await fetch(m3uURL);
    let data = await response.text();
    
    let channels = [];
    let lines = data.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("#EXTINF")) {
        let name = lines[i].split(",")[1].trim();
        let url = lines[i + 1].trim();
        if (url.startsWith("http")) {
          channels.push({ name, url });
        }
      }
    }

    return new Response(JSON.stringify({ channels }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response("Failed to load channels", { status: 500 });
  }
}
