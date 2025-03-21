export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/") return new Response(await generateHomePage(), { headers: { "Content-Type": "text/html" } });
    if (path.startsWith("/play/")) return new Response(await generatePlayPage(path.split("/play/")[1]), { headers: { "Content-Type": "text/html" } });

    return new Response("404 Not Found", { status: 404 });
  },
};

const TMDB_API_KEY = "43d89010b257341339737be36dfaac13";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

async function fetchTMDB(endpoint, params = {}) {
  params.api_key = TMDB_API_KEY;
  params.language = "en-US";
  params.region = "IN"; // Only fetch Indian content
  const url = `${TMDB_BASE_URL}/${endpoint}?` + new URLSearchParams(params);
  const response = await fetch(url);
  return response.ok ? await response.json() : null;
}

async function generateHomePage() {
  const featured = await fetchTMDB("movie/popular");
  const trending = await fetchTMDB("trending/movie/week");
  const newReleases = await fetchTMDB("movie/now_playing");
  const topRated = await fetchTMDB("movie/top_rated");

  return `
    <html>
      <head>
        <title>FreeCinema</title>
        <style>
          body { background: #000; color: white; font-family: Arial; padding: 0; margin: 0; }
          .header { background: #111; padding: 20px; font-size: 24px; text-align: center; }
          .slider { overflow-x: scroll; white-space: nowrap; padding: 10px; }
          .movie { display: inline-block; width: 150px; margin: 5px; }
          .movie img { width: 100%; border-radius: 5px; }
          .section-title { font-size: 20px; padding: 10px; }
          .footer { background: #111; padding: 10px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">FreeCinema - Watch Indian Movies</div>
        <h2 class="section-title">Featured</h2>
        <div class="slider">${generateMovieList(featured?.results)}</div>
        <h2 class="section-title">Trending</h2>
        <div class="slider">${generateMovieList(trending?.results)}</div>
        <h2 class="section-title">New Releases</h2>
        <div class="slider">${generateMovieList(newReleases?.results)}</div>
        <h2 class="section-title">Top Rated</h2>
        <div class="slider">${generateMovieList(topRated?.results)}</div>
        <div class="footer">© 2025 FreeCinema</div>
      </body>
    </html>
  `;
}

function generateMovieList(movies) {
  return movies?.map(movie => `
    <div class="movie">
      <a href="/play/${movie.id}">
        <img src="https://image.tmdb.org/t/p/w500/${movie.poster_path}" alt="${movie.title}">
      </a>
      <p>${movie.title}</p>
    </div>
  `).join('') || "<p>No movies available</p>";
}

async function generatePlayPage(movieId) {
  const movie = await fetchTMDB(`movie/${movieId}`, { append_to_response: "credits" });
  if (!movie) return "<html><body><h1>Movie Not Found</h1></body></html>";

  const imdbId = movie.imdb_id;
  const streamLinks = [
    `https://vidsrc.xyz/embed/movie/${imdbId}`,
    `https://multiembed.mov/?video_id=${imdbId}`,
    `https://player.autoembed.cc/embed/movie/${imdbId}`,
    `https://vidsrc.icu/embed/movie/${imdbId}`
  ];

  return `
    <html>
      <head>
        <title>${movie.title} - Watch Now</title>
        <style>
          body { background: black; color: white; font-family: Arial; text-align: center; padding: 0; margin: 0; }
          .player { width: 90%; height: 400px; margin: auto; background: #222; }
          .details { padding: 20px; text-align: left; }
          .actors { display: flex; overflow-x: scroll; white-space: nowrap; }
          .actors div { margin: 10px; text-align: center; }
          .recommendations { display: flex; overflow-x: scroll; white-space: nowrap; }
        </style>
      </head>
      <body>
        <h1>${movie.title}</h1>
        <div class="player">
          <iframe id="stream" width="100%" height="100%" src="${streamLinks[0]}" allowfullscreen></iframe>
        </div>
        <select onchange="document.getElementById('stream').src=this.value">
          ${streamLinks.map(link => `<option value="${link}">${link.split("/")[2]}</option>`).join("")}
        </select>
        <div class="details">
          <h2>Details</h2>
          <p>${movie.overview}</p>
          <h2>Cast</h2>
          <div class="actors">${generateActorsList(movie.credits?.cast)}</div>
          <h2>Recommendations</h2>
          <div class="recommendations">${await generateRecommendations(movieId)}</div>
        </div>
      </body>
    </html>
  `;
}

function generateActorsList(actors) {
  return actors?.slice(0, 10).map(actor => `
    <div>
      <img src="https://image.tmdb.org/t/p/w200/${actor.profile_path}" alt="${actor.name}" style="width:100px;">
      <p>${actor.name}</p>
    </div>
  `).join('') || "<p>No actors available</p>";
}

async function generateRecommendations(movieId) {
  const recommendations = await fetchTMDB(`movie/${movieId}/recommendations`);
  return generateMovieList(recommendations?.results);
}
