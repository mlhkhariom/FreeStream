export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      
      // Homepage - Return Netflix-like UI
      if (pathname === "/") {
        return new Response(await getHomePage(), { headers: { "Content-Type": "text/html" } });
      }

      // Fetch Trending Movies (Only India)
      if (pathname === "/api/trending") {
        const response = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=43d89010b257341339737be36dfaac13&region=IN`);
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
      }

      // Fetch Movie Details
      if (pathname.startsWith("/api/movie/")) {
        const movieId = pathname.split("/").pop();
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=43d89010b257341339737be36dfaac13&append_to_response=credits,videos`);
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
      }

      // Play Page (Streaming Selection & JW Player)
      if (pathname.startsWith("/play/")) {
        const imdbId = pathname.split("/").pop();
        return new Response(await getPlayPage(imdbId), { headers: { "Content-Type": "text/html" } });
      }

      // Streaming API Selection
      if (pathname.startsWith("/api/stream/")) {
        const imdbId = pathname.split("/").pop();
        const streamApis = [
          `https://vidsrc.dev/embed/movie/${imdbId}`,
          `https://multiembed.mov/directstream.php?video_id=${imdbId}`,
          `https://player.autoembed.cc/embed/movie/${imdbId}`,
          `https://vidsrc.me/embed/${imdbId}`,
          `https://moviesapi.club/movie/${imdbId}`,
        ];

        for (let api of streamApis) {
          const checkResponse = await fetch(api, { method: 'HEAD' });
          if (checkResponse.ok) return Response.redirect(api, 302);
        }

        return new Response("No available sources found", { status: 404 });
      }

      return new Response("Welcome to FreeCinema!", { status: 200 });
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};

// ------------------ UI TEMPLATES ------------------

// Netflix-Like Homepage
async function getHomePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <title>FreeCinema - Watch Indian Movies & TV</title>
        <style>
            body { background: #141414; color: white; font-family: Arial, sans-serif; margin: 0; }
            h1 { text-align: center; }
            .container { max-width: 90%; margin: auto; }
            .movie-list { display: flex; overflow-x: scroll; gap: 10px; padding: 10px; }
            .movie { width: 200px; text-align: center; cursor: pointer; }
            .movie img { width: 100%; border-radius: 10px; }
            a { color: white; text-decoration: none; }
        </style>
        <script>
          async function loadMovies() {
              const res = await fetch('/api/trending');
              const { results } = await res.json();
              const container = document.getElementById('movies');
              container.innerHTML = results.map(m => 
                \`<div class="movie">
                    <a href="/play/\${m.id}">
                        <img src="https://image.tmdb.org/t/p/w500\${m.poster_path}" />
                        <p>\${m.title}</p>
                    </a>
                </div>\`).join('');
          }
          window.onload = loadMovies;
        </script>
    </head>
    <body>
        <h1>Trending in India</h1>
        <div class="container">
            <div id="movies" class="movie-list"></div>
        </div>
    </body>
    </html>
  `;
}

// Play Page (Multi-API Streaming Selection)
async function getPlayPage(imdbId) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <title>Watch Movie</title>
        <script src="https://cdn.jwplayer.com/libraries/your-jwplayer-key.js"></script>
        <style>
            body { background: #000; color: white; font-family: Arial, sans-serif; margin: 0; }
            h2, select, button { margin: 20px; text-align: center; }
            #player { width: 100%; max-width: 900px; margin: auto; }
        </style>
        <script>
            const imdbId = "${imdbId}";

            function getStreamUrl(apiType) {
                const apis = {
                    vidsrc: "https://vidsrc.dev/embed/movie/" + imdbId,
                    multiembed: "https://multiembed.mov/directstream.php?video_id=" + imdbId,
                    autoembed: "https://player.autoembed.cc/embed/movie/" + imdbId,
                    vidsrcme: "https://vidsrc.me/embed/" + imdbId,
                    moviesapi: "https://moviesapi.club/movie/" + imdbId
                };
                return apis[apiType];
            }

            function playMovie() {
                const selectedApi = document.getElementById('sourceSelect').value;
                const streamUrl = getStreamUrl(selectedApi);

                jwplayer("player").setup({
                    file: streamUrl,
                    width: "100%",
                    aspectratio: "16:9",
                    autostart: true
                });
            }
        </script>
    </head>
    <body>
        <h2>Select a Source</h2>
        <select id="sourceSelect">
            <option value="vidsrc">VidSrc</option>
            <option value="multiembed">MultiEmbed</option>
            <option value="autoembed">AutoEmbed</option>
            <option value="vidsrcme">VidSrc.me</option>
            <option value="moviesapi">MoviesAPI</option>
        </select>
        <button onclick="playMovie()">Play</button>
        <div id="player"></div>
    </body>
    </html>
  `;
}
