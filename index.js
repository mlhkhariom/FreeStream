export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/") {
      return new Response(await generateHomePage(), { headers: { "Content-Type": "text/html" } });
    } else if (path.startsWith("/player/")) {
      const id = path.split("/")[2];
      return new Response(generatePlayerPage(id), { headers: { "Content-Type": "text/html" } });
    } else if (path.startsWith("/api/trending")) {
      return fetchTrendingMovies();
    } else if (path.startsWith("/api/search")) {
      const query = url.searchParams.get("q");
      return fetchSearchResults(query);
    }

    return new Response("Not Found", { status: 404 });
  }
};

async function fetchTrendingMovies() {
  const apiKey = "43d89010b257341339737be36dfaac13";
  const response = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${apiKey}`);
  const data = await response.json();
  return new Response(JSON.stringify(data.results), { headers: { "Content-Type": "application/json" } });
}

async function fetchSearchResults(query) {
  if (!query) return new Response("Query Missing", { status: 400 });
  const apiKey = "43d89010b257341339737be36dfaac13";
  const response = await fetch(`https://api.themoviedb.org/3/search/multi?query=${query}&api_key=${apiKey}`);
  const data = await response.json();
  return new Response(JSON.stringify(data.results), { headers: { "Content-Type": "application/json" } });
}

async function generateHomePage() {
  const trending = await fetchTrendingMovies();
  const trendingData = await trending.json();

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
      <title>FreeCinema - Watch Free Movies & TV Shows</title>
      <style>
        body { font-family: Arial, sans-serif; background: #000; color: #fff; text-align: center; }
        h1 { font-size: 2.5em; margin-top: 20px; }
        input { padding: 10px; width: 80%; margin: 10px 0; }
        button { padding: 10px 15px; background: red; color: white; border: none; cursor: pointer; }
        .movie-list { display: flex; flex-wrap: wrap; justify-content: center; }
        .movie { margin: 10px; cursor: pointer; width: 200px; }
        .movie img { width: 100%; border-radius: 10px; }
      </style>
      <script>
        async function searchMovies() {
          const query = document.getElementById('searchBox').value;
          const response = await fetch('/api/search?q=' + query);
          const data = await response.json();
          document.getElementById('movies').innerHTML = data.map(movie => \`
            <div class="movie" onclick="window.location='/player/\${movie.id}'">
              <img src="https://image.tmdb.org/t/p/w500\${movie.poster_path}" />
              <h3>\${movie.title || movie.name}</h3>
            </div>
          \`).join("");
        }
      </script>
    </head>
    <body>
      <h1>🎬 FreeCinema</h1>
      <input type="text" id="searchBox" placeholder="Search movies, TV shows..." />
      <button onclick="searchMovies()">Search</button>
      <h2>Trending Now</h2>
      <div class="movie-list" id="movies">${movieListHTML}</div>
    </body>
    </html>
  `;
}

function generatePlayerPage(id) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>FreeCinema - Player</title>
      <style>
        body { font-family: Arial, sans-serif; background: #000; color: #fff; text-align: center; }
        iframe { width: 100%; height: 500px; border: none; }
        .details { margin-top: 20px; font-size: 1.2em; }
      </style>
      <script>
        async function loadMovieDetails() {
          const response = await fetch("https://api.themoviedb.org/3/movie/${id}?api_key=43d89010b257341339737be36dfaac13");
          const data = await response.json();
          document.getElementById("details").innerHTML = "<strong>" + data.title + "</strong><br>" + data.overview;
        }

        window.onload = loadMovieDetails;
      </script>
    </head>
    <body>
      <h1>🎬 Now Playing</h1>
      <iframe allowfullscreen src="https://vidsrc.dev/embed/movie/${id}"></iframe>
      <div class="details" id="details">Loading movie details...</div>
    </body>
    </html>
  `;
  }
