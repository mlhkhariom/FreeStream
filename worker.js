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
      }

      return new Response("404 Not Found", { status: 404 });
    } catch (error) {
      return new Response("Internal Server Error: " + error.message, { status: 500 });
    }
  }
};

// ✅ IPTV Page with Channel List
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
        h1 { font-size: 2em; margin-top: 20px; }
        select, button { padding: 10px; margin: 10px; }
        .channel-list { max-height: 400px; overflow-y: auto; text-align: left; padding: 10px; border: 1px solid white; }
        .channel { cursor: pointer; padding: 8px; border-bottom: 1px solid #444; }
      </style>
      <script>
        async function fetchChannels() {
          let playlist = document.getElementById('playlistSelect').value;
          let response = await fetch("/api/iptv-channels?playlist=" + playlist);
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
        <option value="https://iptv-org.github.io/iptv/countries/in.m3u">🇮🇳 India</option>
        <option value="https://iptv-org.github.io/iptv/countries/us.m3u">🇺🇸 USA</option>
        <option value="https://iptv-org.github.io/iptv/countries/uk.m3u">🇬🇧 UK</option>
        <option value="https://iptv-org.github.io/iptv/categories/movies.m3u">🎥 Movies</option>
        <option value="https://iptv-org.github.io/iptv/categories/news.m3u">📰 News</option>
        <option value="https://iptv-org.github.io/iptv/categories/sports.m3u">⚽ Sports</option>
        <option value="https://iptv-org.github.io/iptv/categories/music.m3u">🎵 Music</option>
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
    return new Response(JSON.stringify({ error: "Failed to load channels" }), { status: 500 });
  }
}
