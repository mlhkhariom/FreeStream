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
  params.region = "IN"; // Only Indian content
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
          body { background: #121212; color: white; font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .header { background: #181818; padding: 15px; font-size: 24px; text-align: center; }
          .hero { width: 100%; height: 400px; background-size: cover; background-position: center; }
          .movies-container { padding: 20px; }
          .section-title { font-size: 22px; margin: 10px 0; }
          .scroll-container { overflow-x: auto; white-space: nowrap; display: flex; gap: 10px; padding: 10px; }
          .movie { display: inline-block; width: 160px; text-align: center; }
          .movie img { width: 100%; border-radius: 10px; }
          .footer { background: #181818; padding: 10px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">🎬 FreeCinema</div>
        <div class="hero" style="background-image: url('https://image.tmdb.org/t/p/original/${featured?.results[0]?.backdrop_path}');"></div>
        <div class="movies-container">
          <h2 class="section-title">🔥 Featured</h2>
          <div class="scroll-container">${generateMovieList(featured?.results)}</div>
          <h2 class="section-title">📈 Trending</h2>
          <div class="scroll-container">${generateMovieList(trending?.results)}</div>
          <h2 class="section-title">🎬 New Releases</h2>
          <div class="scroll-container">${generateMovieList(newReleases?.results)}</div>
          <h2 class="section-title">⭐ Top Rated</h2>
          <div class="scroll-container">${generateMovieList(topRated?.results)}</div>
        </div>
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
          body { background: #121212; color: white; font-family: Arial, sans-serif; margin: 0; text-align: center; }
          .player { width: 90%; height: 400px; margin: auto; background: #222; }
          .details { padding: 20px; text-align: left; }
          .actors { display: flex; overflow-x: auto; gap: 10px; padding: 10px; }
          .actors div { text-align: center; }
          .recommendations { display: flex; overflow-x: auto; gap: 10px; }
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
          <h2>📖 Details</h2>
          <p>${movie.overview}</p>
          <h2>🎭 Cast</h2>
          <div class="actors">${generateActorsList(movie.credits?.cast)}</div>
          <h2>🎥 Recommendations</h2>
          <div class="recommendations">${await generateRecommendations(movieId)}</div>
        </div>
      </body>
    </html>
  `;
}

function generateActorsList(actors) {
  return actors?.slice(0, 10).map(actor => `
    <div>
      <img src="https://image.tmdb.org/t/p/w200/${actor.profile_path}" alt="${actor.name}" style="width:100px; border-radius: 10px;">
      <p>${actor.name}</p>
    </div>
  `).join('') || "<p>No actors available</p>";
}

async function generateRecommendations(movieId) {
  const recommendations = await fetchTMDB(`movie/${movieId}/recommendations`);
  return generateMovieList(recommendations?.results);
}
