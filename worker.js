export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response(await renderHomePage(), { headers: { "Content-Type": "text/html" } });
    } else if (url.pathname.startsWith("/play/")) {
      const contentId = url.pathname.split("/play/")[1];
      return new Response(await renderPlayPage(contentId), { headers: { "Content-Type": "text/html" } });
    } else {
      return new Response("404 Not Found", { status: 404 });
    }
  }
};

const TMDB_API_KEY = "43d89010b257341339737be36dfaac13";
const OMDB_API_KEY = "3ccc73c8";
const TVDB_API_KEY = "1203f4ee-92a1-4962-8e70-fe5a3fe34460";

async function fetchContent(category) {
  const response = await fetch(`https://api.themoviedb.org/3/movie/${category}?api_key=${TMDB_API_KEY}&language=hi-IN`);
  return response.json();
}

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
        <link rel="stylesheet" href="https://cssanimation.io/cssanimations.css">
        <link rel="stylesheet" href="https://animate.style/animate.min.css">
        <style>
          body { font-family: Arial, sans-serif; background-color: #111; color: white; }
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
            <div class="movie-list">${featured.results.map(movie => `<div class="movie" onclick="window.location='/play/${movie.id}'">
              <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" />
              <div>${movie.title}</div>
            </div>`).join("")}</div>
          </div>

          <div class="section">
            <h2>Trending</h2>
            <div class="movie-list">${trending.results.map(movie => `<div class="movie" onclick="window.location='/play/${movie.id}'">
              <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" />
              <div>${movie.title}</div>
            </div>`).join("")}</div>
          </div>

          <div class="section">
            <h2>New Releases</h2>
            <div class="movie-list">${newReleases.results.map(movie => `<div class="movie" onclick="window.location='/play/${movie.id}'">
              <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" />
              <div>${movie.title}</div>
            </div>`).join("")}</div>
          </div>

          <div class="section">
            <h2>Top Rated</h2>
            <div class="movie-list">${topRated.results.map(movie => `<div class="movie" onclick="window.location='/play/${movie.id}'">
              <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" />
              <div>${movie.title}</div>
            </div>`).join("")}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

async function renderPlayPage(contentId) {
  const movie = await fetch(`https://api.themoviedb.org/3/movie/${contentId}?api_key=${TMDB_API_KEY}&language=hi-IN`).then(res => res.json());
  const cast = await fetch(`https://api.themoviedb.org/3/movie/${contentId}/credits?api_key=${TMDB_API_KEY}`).then(res => res.json());
  const streamURL = `https://vidsrc.xyz/embed/movie?imdb=${movie.imdb_id}`;

  return `
    <html>
      <head>
        <title>${movie.title} - FreeCinema</title>
        <script src="https://cdn.jwplayer.com/libraries/your_jwplayer_key.js"></script>
        <style>
          body { font-family: Arial, sans-serif; background-color: #111; color: white; }
          .container { width: 90%; margin: auto; }
          .movie-title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
          .player { text-align: center; }
          .cast { display: flex; overflow-x: auto; padding: 10px 0; }
          .cast-member { margin: 10px; text-align: center; }
          .cast-member img { width: 80px; height: 80px; border-radius: 50%; }
          .recom { padding: 20px 0; }
          .recom-list { display: flex; overflow-x: auto; }
          .recom-movie { margin: 10px; cursor: pointer; transition: transform 0.3s; }
          .recom-movie img { width: 120px; height: 180px; border-radius: 10px; }
          .recom-movie:hover { transform: scale(1.1); }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="movie-title">${movie.title}</div>
          <div class="player">
            <div id="jwplayer"></div>
            <script>
              jwplayer("jwplayer").setup({
                file: "${streamURL}",
                width: "100%",
                aspectratio: "16:9",
                autostart: true
              });
            </script>
          </div>

          <h2>Cast</h2>
          <div class="cast">${cast.cast.slice(0, 10).map(actor => `<div class="cast-member">
            <img src="https://image.tmdb.org/t/p/w500${actor.profile_path}" />
            <div>${actor.name}</div>
          </div>`).join("")}</div>

          <div class="recom">
            <h2>Recommended</h2>
            <div class="recom-list">${cast.cast.slice(0, 5).map(actor => `<div class="recom-movie" onclick="window.location='/play/${actor.id}'">
              <img src="https://image.tmdb.org/t/p/w500${actor.profile_path}" />
              <div>${actor.name}</div>
            </div>`).join("")}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}
