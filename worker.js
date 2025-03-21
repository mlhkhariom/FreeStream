export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // **Homepage**
    if (path === "/") {
      return new Response(await generateHomepage(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // **Play Page**
    if (path.startsWith("/play/")) {
      const contentId = path.split("/play/")[1];
      return new Response(await generatePlayPage(contentId), {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};

// **API Keys**
const TMDB_API = "43d89010b257341339737be36dfaac13";
const OMDB_API = "3ccc73c8";
const TVDB_API = "1203f4ee-92a1-4962-8e70-fe5a3fe34460";

// **Streaming API Endpoints**
const STREAM_APIS = {
  vidsrc: "https://vidsrc.xyz/embed/movie/",
  multiembed: "https://multiembed.mov/?video_id=",
  autoembed: "https://player.autoembed.cc/embed/movie/",
  vidsrc_icu: "https://vidsrc.icu/embed/movie/",
};

// **Homepage HTML Generator**
async function generateHomepage() {
  const trendingMovies = await fetchTMDB("trending/movie/week");
  const trendingTV = await fetchTMDB("trending/tv/week");
  const hindiDubbed = await fetchTMDB("discover/movie", "&with_original_language=hi");

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <title>FreeCinema</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>
    <style>
      body { background: #141414; color: white; font-family: Arial, sans-serif; }
      .container { max-width: 1200px; margin: auto; }
      .hero-slider img { width: 100%; height: 400px; object-fit: cover; }
      .movie-grid { display: flex; flex-wrap: wrap; gap: 15px; }
      .movie-card { width: 150px; cursor: pointer; }
      .movie-card img { width: 100%; border-radius: 8px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>FreeCinema</h1>
      
      <div class="hero-slider">
        <img src="${trendingMovies[0]?.poster_path}" alt="Featured Movie">
      </div>

      <h2>Trending Movies</h2>
      <div class="movie-grid">
        ${trendingMovies.map(movie => `
          <div class="movie-card" onclick="location.href='/play/${movie.id}'">
            <img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title}">
            <p>${movie.title}</p>
          </div>`).join("")}
      </div>

      <h2>Trending TV Shows</h2>
      <div class="movie-grid">
        ${trendingTV.map(tv => `
          <div class="movie-card" onclick="location.href='/play/${tv.id}'">
            <img src="https://image.tmdb.org/t/p/w200${tv.poster_path}" alt="${tv.name}">
            <p>${tv.name}</p>
          </div>`).join("")}
      </div>

      <h2>Hindi Dubbed Movies</h2>
      <div class="movie-grid">
        ${hindiDubbed.map(movie => `
          <div class="movie-card" onclick="location.href='/play/${movie.id}'">
            <img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title}">
            <p>${movie.title}</p>
          </div>`).join("")}
      </div>
    </div>
  </body>
  </html>`;
}

// **Play Page Generator**
async function generatePlayPage(contentId) {
  const movie = await fetchTMDB(`movie/${contentId}`);
  const imdbId = movie.imdb_id;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <title>${movie.title} - Watch Now</title>
    <script src="https://cdn.jwplayer.com/libraries/your-jwplayer-key.js"></script>
    <style>
      body { background: #141414; color: white; font-family: Arial, sans-serif; }
      .container { max-width: 1200px; margin: auto; }
      .player-container { width: 100%; height: 500px; margin-bottom: 20px; }
      .source-buttons { margin-top: 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${movie.title}</h1>
      <p>${movie.overview}</p>
      <p><strong>Director:</strong> ${movie.director}</p>
      <p><strong>Actors:</strong> ${movie.actors.join(", ")}</p>

      <div class="player-container" id="player"></div>
      
      <div class="source-buttons">
        <button onclick="changeSource('${STREAM_APIS.vidsrc}${imdbId}')">VidSrc</button>
        <button onclick="changeSource('${STREAM_APIS.multiembed}${imdbId}')">MultiEmbed</button>
        <button onclick="changeSource('${STREAM_APIS.autoembed}${imdbId}')">AutoEmbed</button>
        <button onclick="changeSource('${STREAM_APIS.vidsrc_icu}${imdbId}')">VidSrc ICU</button>
      </div>

      <script>
        function changeSource(url) {
          jwplayer("player").setup({
            file: url,
            width: "100%",
            height: "100%",
            autostart: true,
            controls: true
          });
        }
        changeSource('${STREAM_APIS.vidsrc}${imdbId}');
      </script>
    </div>
  </body>
  </html>`;
}

// **Fetch TMDB API**
async function fetchTMDB(endpoint, extraParams = "") {
  const response = await fetch(`https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API}${extraParams}`);
  const data = await response.json();
  return data.results || data;
}
