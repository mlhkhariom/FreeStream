export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // TMDB API Key
    const TMDB_API_KEY = "43d89010b257341339737be36dfaac13";

    // Homepage Data Fetching
    if (path === "/") {
      return fetchHomepageData();
    }

    // Search Functionality
    if (path.startsWith("/search")) {
      const query = url.searchParams.get("query");
      return searchTMDB(query);
    }

    // Movie Play Page
    if (path.startsWith("/play/movie/")) {
      const movieId = path.split("/play/movie/")[1];
      return fetchMovieDetails(movieId);
    }

    // Web Series Play Page
    if (path.startsWith("/play/series/")) {
      const params = new URLSearchParams(url.search);
      const seriesId = path.split("/play/series/")[1];
      const season = params.get("season") || 1;
      const episode = params.get("episode") || 1;
      return fetchSeriesDetails(seriesId, season, episode);
    }

    return new Response("Not Found", { status: 404 });
  },
};

// Function: Fetch Homepage Data (Trending, Bollywood, Hollywood, etc.)
async function fetchHomepageData() {
  const sections = [
    { name: "Trending in India", url: `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_API_KEY}&region=IN` },
    { name: "Hollywood", url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&region=US` },
    { name: "Bollywood", url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&region=IN&with_original_language=hi` },
    { name: "South Indian", url: `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&region=IN&with_original_language=te,ta,ml,kn` },
    { name: "Top Rated", url: `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}` },
    { name: "Popular", url: `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}` }
  ];

  let responseData = {};
  for (const section of sections) {
    const data = await fetch(section.url).then(res => res.json());
    responseData[section.name] = data.results;
  }

  return new Response(JSON.stringify(responseData), { headers: { "Content-Type": "application/json" } });
}

// Function: Search TMDB for Movies & TV Shows
async function searchTMDB(query) {
  if (!query) return new Response(JSON.stringify({ error: "No search query provided" }), { headers: { "Content-Type": "application/json" } });

  const searchUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
  const searchResults = await fetch(searchUrl).then(res => res.json());
  
  return new Response(JSON.stringify(searchResults), { headers: { "Content-Type": "application/json" } });
}

// Function: Fetch Movie Details
async function fetchMovieDetails(movieId) {
  const movieData = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`).then(res => res.json());
  const streamLinks = [
    `https://vidsrc.dev/embed/movie/${movieId}`,
    `https://multiembed.mov/directstream.php?video_id=${movieId}`,
    `https://player.autoembed.cc/embed/movie/${movieId}`
  ];

  return new Response(JSON.stringify({ movieData, streamLinks }), { headers: { "Content-Type": "application/json" } });
}

// Function: Fetch Web Series Details
async function fetchSeriesDetails(seriesId, season, episode) {
  const seriesData = await fetch(`https://api.themoviedb.org/3/tv/${seriesId}?api_key=${TMDB_API_KEY}`).then(res => res.json());
  const streamLinks = [
    `https://vidsrc.dev/embed/tv/${seriesId}/${season}/${episode}`,
    `https://multiembed.mov/directstream.php?video_id=${seriesId}&s=${season}&e=${episode}`,
    `https://player.autoembed.cc/embed/tv/${seriesId}/${season}/${episode}`
  ];

  return new Response(JSON.stringify({ seriesData, streamLinks }), { headers: { "Content-Type": "application/json" } });
}
