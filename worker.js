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
      } else if (path === "/api/iptv-channels") {
        return fetchIPTVChannels();
      }

      return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      console.error("❌ Worker Error:", error);
      return new Response(JSON.stringify({ error: "Internal Server Error", message: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
  }
};

// ✅ Fetch Trending Movies
async function fetchTrendingMovies(env) {
  const apiKey = "43d89010b257341339737be36dfaac13";
  try {
    const response = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`);
    const data = await response.json();
    return new Response(JSON.stringify(data.results || []), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("❌ Error Fetching Trending Movies:", error);
    return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
  }
}

// ✅ Fetch IPTV Channel List
async function fetchIPTVChannels() {
  try {
    const response = await fetch("https://iptv-org.github.io/iptv/index.m3u");
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

    const m3uText = await response.text();
    const channels = parseM3U(m3uText);

    return new Response(JSON.stringify(channels), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("❌ Error Fetching IPTV Channels:", error);
    return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
  }
}

// ✅ Parse M3U File to Extract Channel List
function parseM3U(m3uText) {
  const lines = m3uText.split("\n");
  const channels = [];
  let currentChannel = null;

  lines.forEach(line => {
    if (line.startsWith("#EXTINF")) {
      const nameMatch = line.match(/,(.*)/);
      if (nameMatch) {
        currentChannel = { name: nameMatch[1], url: "" };
      }
    } else if (line.startsWith("http") && currentChannel) {
      currentChannel.url = line.trim().replace(".m3u", ".m3u8");
      channels.push(currentChannel);
      currentChannel = null;
    }
  });

  return channels;
}

// ✅ Home Page with Trending Movies
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
      <title>FreeStream - Watch Free Movies & TV Shows</title>
      <style>
        body { font-family: Arial, sans-serif; background: #121212; color: #fff; text-align: center; }
        h1 { font-size: 2.5em; margin-top: 20px; }
        input { padding: 10px; width: 80%; margin: 10px 0; }
        button { padding: 10px 15px; background: red; color: white; border: none; cursor: pointer; }
        .movie-list { display: flex; flex-wrap: wrap; justify-content: center; }
        .movie { margin: 10px; cursor: pointer; width: 200px; }
        .movie img { width: 100%; border-radius: 10px; }
      </style>
    </head>
    <body>
      <h1>🎬 FreeStream</h1>
      <h2>Trending Now</h2>
      <div class="movie-list">${movieListHTML}</div>
    </body>
    </html>
  `;
}

// ✅ IPTV Player Page with JW Player
async function generateIPTVPage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FreeStream - IPTV</title>
      <script src="https://cdn.jwplayer.com/libraries/IDzF9Zmk.js"></script>
      <style>
        body { font-family: Arial, sans-serif; background: #000; color: #fff; text-align: center; }
        .container { margin: 20px; }
        .channel-list { display: flex; flex-wrap: wrap; justify-content: center; }
        .channel { padding: 10px; background: #222; margin: 5px; cursor: pointer; border-radius: 5px; }
        #player { width: 80%; height: 500px; margin-top: 20px; }
      </style>
      <script>
        async function loadChannels() {
          const response = await fetch("/api/iptv-channels");
          const channels = await response.json();
          document.getElementById("channelList").innerHTML = channels.map(channel => \`
            <div class="channel" onclick="playChannel('\${channel.url}')">\${channel.name}</div>
          \`).join("");
        }

        function playChannel(url) {
          jwplayer("player").setup({
            file: url,
            autostart: true,
            width: "100%",
            height: 500,
            stretching: "uniform"
          });
        }

        window.onload = loadChannels;
      </script>
    </head>
    <body>
      <h1>📺 Live TV</h1>
      <div id="player"></div>
      <h2>Select a Channel</h2>
      <div class="channel-list" id="channelList">Loading channels...</div>
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
      </style>
    </head>
    <body>
      <h1>🎬 Now Playing</h1>
      <iframe allowfullscreen src="https://vidsrc.dev/embed/movie/${id}"></iframe>
    </body>
    </html>
  `;
}
