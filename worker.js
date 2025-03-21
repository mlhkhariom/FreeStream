export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/") {
        return fetchHomePage();
      }

      if (path.startsWith("/play/")) {
        const contentId = path.split("/play/")[1];
        return fetchPlayPage(contentId);
      }

      return new Response("404 - Page Not Found", { status: 404 });
    } catch (error) {
      return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
    }
  },
};

// API Keys
const TMDB_API_KEY = "43d89010b257341339737be36dfaac13";
const OMDB_API_KEY = "3ccc73c8";
const TVDB_API_KEY = "1203f4ee-92a1-4962-8e70-fe5a3fe34460";

// Streaming APIs
const STREAMING_APIS = {
  vidsrc: "https://vidsrc.dev/embed/movie/",
  vidsrc_icu: "https://vidsrc.icu/embed/movie/",
  multiembed: "https://multiembed.mov/directstream.php?video_id=",
  autoembed: "https://player.autoembed.cc/embed/movie/",
  stream8: "https://8stream.ru/player.php?tmdb=",
};

// Fetch Homepage Content
async function fetchHomePage() {
  try {
    const tmdbResponse = await fetch(`https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_API_KEY}`);
    const tmdbData = await tmdbResponse.json();

    if (!tmdbData.results) throw new Error("TMDB API Failed");

    const contentHtml = tmdbData.results.map(movie => `
      <div class="content">
        <a href="/play/${movie.id}">
          <img src="https://image.tmdb.org/t/p/w500${movie.poster_path}" alt="${movie.title}">
          <p>${movie.title || movie.name}</p>
        </a>
      </div>
    `).join("");

    return new Response(`
      <html>
      <head>
        <title>Red Xerox - Free Movies & Shows</title>
        <style>
          body { font-family: Arial, sans-serif; background: #121212; color: white; text-align: center; }
          .content { display: inline-block; width: 200px; margin: 10px; }
          img { width: 100%; border-radius: 10px; }
          a { color: white; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>Trending Movies & Shows</h1>
        <div>${contentHtml}</div>
      </body>
      </html>
    `, { headers: { "Content-Type": "text/html" } });

  } catch (error) {
    return new Response(`Failed to Load Homepage: ${error.message}`, { status: 500 });
  }
}

// Fetch Play Page with All Streaming APIs
async function fetchPlayPage(contentId) {
  try {
    const tmdbResponse = await fetch(`https://api.themoviedb.org/3/movie/${contentId}?api_key=${TMDB_API_KEY}`);
    const tmdbData = await tmdbResponse.json();
    
    if (!tmdbData.title) throw new Error("Movie Not Found");

    // Fetch Additional Movie Details from OMDB
    const omdbResponse = await fetch(`https://www.omdbapi.com/?i=${tmdbData.imdb_id}&apikey=${OMDB_API_KEY}`);
    const omdbData = await omdbResponse.json();

    // Fetch TVDB Data if it's a TV Show
    let tvdbData = {};
    if (tmdbData.media_type === "tv") {
      const tvdbResponse = await fetch(`https://api.thetvdb.com/series/${contentId}?apikey=${TVDB_API_KEY}`);
      tvdbData = await tvdbResponse.json();
    }

    const streamingOptions = Object.entries(STREAMING_APIS).map(([name, url]) => `
      <option value="${url}${contentId}">${name.toUpperCase()}</option>
    `).join("");

    return new Response(`
      <html>
      <head>
        <title>${tmdbData.title} - Watch Now</title>
        <script>
          function changeSource() {
            const selectedUrl = document.getElementById("sourceSelector").value;
            document.getElementById("player").src = selectedUrl;
          }
        </script>
        <style>
          body { font-family: Arial, sans-serif; background: #121212; color: white; text-align: center; }
          iframe { width: 80%; height: 500px; border: none; margin-top: 20px; }
          select { padding: 10px; font-size: 16px; }
        </style>
      </head>
      <body>
        <h1>${tmdbData.title}</h1>
        <p>${tmdbData.overview}</p>
        <p><strong>Genre:</strong> ${omdbData.Genre || "Unknown"}</p>
        <p><strong>Director:</strong> ${omdbData.Director || "Unknown"}</p>
        <p><strong>IMDb Rating:</strong> ${omdbData.imdbRating || "N/A"}</p>
        <p><strong>TVDB Info:</strong> ${tvdbData.data ? tvdbData.data.seriesName : "N/A"}</p>
        <label for="sourceSelector">Select Streaming Source:</label>
        <select id="sourceSelector" onchange="changeSource()">
          ${streamingOptions}
        </select>
        <iframe id="player" src="${STREAMING_APIS.vidsrc}${contentId}" allowfullscreen></iframe>
      </body>
      </html>
    `, { headers: { "Content-Type": "text/html" } });

  } catch (error) {
    return new Response(`Failed to Load Movie: ${error.message}`, { status: 500 });
  }
}
