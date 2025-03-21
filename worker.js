export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // Fetch Indian trending content from TMDB API
      if (url.pathname === "/api/trending") {
        const response = await fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=43d89010b257341339737be36dfaac13&region=IN`);
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
      }

      // Fetch Movie Details by TMDB ID
      if (url.pathname.startsWith("/api/movie/")) {
        const movieId = url.pathname.split("/").pop();
        const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=43d89010b257341339737be36dfaac13&append_to_response=credits,videos`);
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
      }

      // Streaming API Logic (Multiple APIs)
      if (url.pathname.startsWith("/api/stream/")) {
        const imdbId = url.pathname.split("/").pop();
        
        // List of Streaming APIs
        const streamApis = [
          `https://vidsrc.dev/embed/movie/${imdbId}`,
          `https://multiembed.mov/directstream.php?video_id=${imdbId}`,
          `https://player.autoembed.cc/embed/movie/${imdbId}`,
          `https://vidsrc.me/embed/${imdbId}`,
          `https://moviesapi.club/movie/${imdbId}`,
        ];

        // Check availability of streaming APIs
        for (let api of streamApis) {
          const checkResponse = await fetch(api, { method: 'HEAD' });
          if (checkResponse.ok) {
            return Response.redirect(api, 302);
          }
        }

        return new Response("No available sources found", { status: 404 });
      }

      return new Response("Welcome to FreeCinema!", { status: 200 });
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};
