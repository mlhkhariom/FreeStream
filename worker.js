export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);

      if (url.pathname === "/") {
        return new Response(await renderHomePage(), { headers: { "Content-Type": "text/html" } });
      } else if (url.pathname.startsWith("/play/")) {
        const contentId = url.pathname.split("/play/")[1];
        return new Response(await renderPlayPage(contentId), { headers: { "Content-Type": "text/html" } });
      } else {
        return new Response("404 Not Found", { status: 404 });
      }
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};

// API KEYS
const TMDB_API_KEY = "43d89010b257341339737be36dfaac13";
const OMDB_API_KEY = "3ccc73c8";
const TVDB_API_KEY = "1203f4ee-92a1-4962-8e70-fe5a3fe34460";

// Fetch Movie Data from APIs
async function fetchMovieData(contentId) {
  let data = await fetchFromTMDB(contentId);
  if (!data) data = await fetchFromOMDB(contentId);
  if (!data) data = await fetchFromTVDB(contentId);
  return data;
}

// Fetch from TMDB
async function fetchFromTMDB(contentId) {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/movie/${contentId}?api_key=${TMDB_API_KEY}&language=hi-IN`);
    if (!response.ok) throw new Error("TMDB failed");
    return await response.json();
  } catch {
    return null;
  }
}

// Fetch from OMDB
async function fetchFromOMDB(imdbId) {
  try {
    const response = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
    if (!response.ok) throw new Error("OMDB failed");
    return await response.json();
  } catch {
    return null;
  }
}

// Fetch from TVDB
async function fetchFromTVDB(contentId) {
  try {
    const response = await fetch(`https://api4.thetvdb.com/v4/movies/${contentId}`, {
      headers: { Authorization: `Bearer ${TVDB_API_KEY}` }
    });
    if (!response.ok) throw new Error("TVDB failed");
    return await response.json();
  } catch {
    return null;
  }
}

// Fetch Content for Homepage
async function fetchContent(category) {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/movie/${category}?api_key=${TMDB_API_KEY}&language=hi-IN&region=IN`);
    if (!response.ok) throw new Error("TMDB API failed");
    return await response.json();
  } catch {
    return { results: [] };
  }
}

// Homepage UI
async function renderHomePage() {
  const [featured, trending, newReleases, topRated] = await Promise.all([
    fetchContent("popular"),
    fetchContent("trending/all/week"),
    fetchContent("now_playing"),
    fetchContent("top_rated")
  ]);

  return `
    <html>
      <head>
        <title>FreeCinema</title>
        <style>
          body { font-family: Arial, sans-serif; background: #111; color: white; }
          .container { width: 90%; margin: auto; }
          .header { font-size: 30px; font-weight: bold; text-align: center; padding: 20px; }
          .section { padding: 20px 0; }
          .movie-list { display: flex; overflow-x: auto; }
          .movie { margin: 10px; cursor: pointer; transition: transform 0.3s; }
          .movie img { width: 150px; height: 220px; border-radius: 10px; }
          .movie:hover { transform: scale(1.1); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">FreeCinema</div>

          <div class="section">
            <h2>Featured</h2>
            <div class="movie-list">${featured.results.length ? featured.results.map(movie => `<div class="movie" onclick="window.location='/play/${movie.id}'">
              <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" />
              <div>${movie.title}</div>
            </div>`).join("") : "<p>No movies available</p>"}</div>
          </div>

          <div class="section">
            <h2>Trending</h2>
            <div class="movie-list">${trending.results.length ? trending.results.map(movie => `<div class="movie" onclick="window.location='/play/${movie.id}'">
              <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" />
              <div>${movie.title}</div>
            </div>`).join("") : "<p>No movies available</p>"}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Play Page with Multi-API Support
async function renderPlayPage(contentId) {
  const movie = await fetchMovieData(contentId);
  if (!movie) return "<h1>Error: Movie Not Found</h1>";

  const streamOptions = `
    <option value="vidsrc">VidSrc</option>
    <option value="multiembed">MultiEmbed</option>
    <option value="autoembed">AutoEmbed</option>
  `;

  const streamURL = `https://vidsrc.dev/embed/movie/${movie.imdb_id}`;

  return `
    <html>
      <head>
        <title>${movie.title} - FreeCinema</title>
        <script src="https://cdn.jwplayer.com/libraries/your_jwplayer_key.js"></script>
        <style>
          body { font-family: Arial, sans-serif; background: #111; color: white; }
          .container { width: 90%; margin: auto; }
          .movie-title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .player { text-align: center; }
          .details { margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="movie-title">${movie.title}</div>

          <div class="player">
            <select id="streamSelect" onchange="changeStream()">
              ${streamOptions}
            </select>
            <div id="jwplayer"></div>
          </div>

          <div class="details">
            <h3>Plot:</h3>
            <p>${movie.overview || "No description available"}</p>
            <h3>Actors:</h3>
            <p>${movie.cast ? movie.cast.join(", ") : "No cast info"}</p>
          </div>

          <script>
            function changeStream() {
              const api = document.getElementById('streamSelect').value;
              let streamUrl = '';
              if (api === 'vidsrc') streamUrl = "https://vidsrc.dev/embed/movie/${movie.imdb_id}";
              if (api === 'multiembed') streamUrl = "https://multiembed.mov/directstream.php?video_id=${movie.imdb_id}";
              if (api === 'autoembed') streamUrl = "https://player.autoembed.cc/embed/movie/${movie.imdb_id}";
              jwplayer("jwplayer").setup({ file: streamUrl, width: "100%", aspectratio: "16:9", autostart: true });
            }
            changeStream();
          </script>
        </div>
      </body>
    </html>
  `;
}
