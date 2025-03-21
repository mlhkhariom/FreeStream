export default {
    async fetch(request) {
        try {
            const url = new URL(request.url);
            const pathname = url.pathname;

            // Homepage
            if (pathname === "/") {
                return new Response(await getHomePage(), { headers: { "Content-Type": "text/html" } });
            }

            // Play Page
            if (pathname.startsWith("/play/")) {
                const contentId = pathname.split("/play/")[1];
                return new Response(await getPlayPage(contentId), { headers: { "Content-Type": "text/html" } });
            }

            return new Response("404 - Not Found", { status: 404 });
        } catch (error) {
            return new Response(`Error: ${error.message}`, { status: 500 });
        }
    }
};

// TMDB API Configuration
const TMDB_API_KEY = "43d89010b257341339737be36dfaac13";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Fetch Data from TMDB
async function fetchTMDB(endpoint) {
    try {
        const response = await fetch(`${TMDB_BASE_URL}${endpoint}?api_key=${TMDB_API_KEY}`);
        const data = await response.json();

        if (!data || !data.results) {
            throw new Error(`Invalid API Response: ${JSON.stringify(data)}`);
        }

        return data.results; 
    } catch (error) {
        console.error(`TMDB Fetch Error: ${error.message}`);
        return []; // Return empty array to prevent undefined error
    }
}

// Homepage (Trending, Bollywood, Hollywood)
async function getHomePage() {
    const trending = await fetchTMDB(`/trending/all/week`);
    const bollywood = await fetchTMDB(`/discover/movie?region=IN&with_original_language=hi`);
    const hollywood = await fetchTMDB(`/discover/movie?region=US&with_original_language=en`);
    const topRated = await fetchTMDB(`/movie/top_rated`);

    return `
        <html>
        <head>
            <title>Red Xerox - Streaming Platform</title>
            <style>
                body { background: #141414; color: white; font-family: Arial, sans-serif; }
                .container { width: 90%; margin: auto; }
                .section { margin-bottom: 30px; }
                h2 { border-bottom: 2px solid red; display: inline-block; }
                .movies { display: flex; overflow-x: auto; gap: 10px; }
                .movie img { width: 150px; height: 225px; border-radius: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Red Xerox - Movie Streaming</h1>
                ${createSection("Trending in India", trending)}
                ${createSection("Bollywood", bollywood)}
                ${createSection("Hollywood", hollywood)}
                ${createSection("Top Rated", topRated)}
            </div>
        </body>
        </html>
    `;
}

// Play Page (Movie Details & Streaming)
async function getPlayPage(contentId) {
    try {
        const movie = await fetchTMDB(`/movie/${contentId}`);

        if (!movie || !movie.title) {
            return `<h1>Error: Movie Not Found</h1>`;
        }

        const streamingUrls = [
            `https://vidsrc.dev/embed/movie/${contentId}`,
            `https://player.autoembed.cc/embed/movie/${contentId}`,
            `https://multiembed.mov/?video_id=${contentId}`
        ];

        return `
            <html>
            <head>
                <title>${movie.title} - Watch Now</title>
                <style>
                    body { background: #141414; color: white; font-family: Arial, sans-serif; }
                    .container { width: 90%; margin: auto; }
                    .player { text-align: center; margin-bottom: 20px; }
                    .details { padding: 20px; background: #222; border-radius: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>${movie.title} (${movie.release_date?.split("-")[0] || "N/A"})</h1>
                    <div class="player">
                        <iframe src="${streamingUrls[0]}" width="100%" height="500px" allowfullscreen></iframe>
                    </div>
                    <div class="details">
                        <h2>About the Movie</h2>
                        <p>${movie.overview || "No description available."}</p>
                        <h3>Genre: ${movie.genres?.map(g => g.name).join(", ") || "N/A"}</h3>
                        <h3>IMDb Rating: ${movie.vote_average || "N/A"}</h3>
                    </div>
                </div>
            </body>
            </html>
        `;
    } catch (error) {
        console.error(`Error Fetching Play Page: ${error.message}`);
        return `<h1>Error: Unable to Load Movie</h1>`;
    }
}

// Create Movie Sections
function createSection(title, movies) {
    return `
        <div class="section">
            <h2>${title}</h2>
            <div class="movies">
                ${movies.map(movie => `
                    <a href="/play/${movie.id}">
                        <img src="https://image.tmdb.org/t/p/w500/${movie.poster_path}" alt="${movie.title}">
                    </a>
                `).join("")}
            </div>
        </div>
    `;
}
