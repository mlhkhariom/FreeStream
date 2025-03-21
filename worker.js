export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response(await renderHomepage(), { headers: { "Content-Type": "text/html" } });
    } else if (url.pathname.startsWith("/play/")) {
      const contentId = url.pathname.split("/play/")[1];
      return new Response(await renderPlayPage(contentId), { headers: { "Content-Type": "text/html" } });
    }
    return new Response("404 Not Found", { status: 404 });
  }
};

// TMDB API Key (Replace with your own)
const TMDB_API_KEY = "YOUR_TMDB_API_KEY";

// Fetch movie details from TMDB
async function fetchMovieDetails(id) {
  const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`);
  return response.json();
}

// Fetch trending movies
async function fetchTrendingMovies() {
  const response = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}`);
  return response.json();
}

// Homepage HTML
async function renderHomepage() {
  const movies = await fetchTrendingMovies();
  let movieCards = movies.results
    .map(movie => `<div class="movie-card"><a href="/play/${movie.id}"><img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}"></a></div>`)
    .join("");
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Red Xerox</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">
      <style>
        body { background-color: #141414; color: white; font-family: Arial, sans-serif; }
        .container { max-width: 1200px; margin: auto; }
        .movie-card { display: inline-block; margin: 10px; width: 150px; }
        .movie-card img { width: 100%; border-radius: 10px; transition: transform 0.2s; }
        .movie-card img:hover { transform: scale(1.1); }
        .header { text-align: center; font-size: 24px; padding: 20px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">Red Xerox - Trending Movies</div>
      <div class="container">${movieCards}</div>
    </body>
    </html>
  `;
}

// Play Page HTML
async function renderPlayPage(id) {
  const movie = await fetchMovieDetails(id);
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${movie.title}</title>
      <script src="https://cdn.jwplayer.com/libraries/your-jwplayer-key.js"></script>
      <style>
        body { background-color: #141414; color: white; font-family: Arial, sans-serif; }
        .container { max-width: 900px; margin: auto; padding: 20px; }
        #player { width: 100%; height: 500px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${movie.title}</h1>
        <p>${movie.overview}</p>
        <div id="player"></div>
        <script>
          jwplayer("player").setup({
            file: "https://vidsrc.xyz/embed/movie/${movie.id}",
            width: "100%",
            height: "500px",
            autostart: true
          });
        </script>
      </div>
    </body>
    </html>
  `;
}
