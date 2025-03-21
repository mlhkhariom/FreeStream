export default {
    async fetch(request) {
        try {
            const url = new URL(request.url);
            const pathname = url.pathname;

            if (pathname === "/") {
                return new Response(await getHomePage(), { headers: { "Content-Type": "text/html" } });
            }

            if (pathname.startsWith("/search")) {
                const query = url.searchParams.get("q");
                return new Response(await searchContent(query), { headers: { "Content-Type": "text/html" } });
            }

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

// **API Configuration**
const TMDB_API_KEY = "43d89010b257341339737be36dfaac13";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// **Homepage**
async function getHomePage() {
    return `
        <html>
            <head>
                <title>OTT Streaming</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #121212; color: white; text-align: center; }
                    .container { padding: 50px; }
                    h1 { color: #f4c542; text-shadow: 3px 3px 10px rgba(255, 255, 255, 0.3); }
                    input { width: 300px; padding: 10px; border-radius: 5px; border: none; }
                    ul { list-style-type: none; padding: 0; }
                    li { padding: 5px; cursor: pointer; }
                    li:hover { background: #333; }
                    button { padding: 10px 20px; margin-top: 10px; cursor: pointer; background: #f4c542; border: none; border-radius: 5px; }
                    button:hover { background: #ffb300; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Find Your Favorite Movie 🎬</h1>
                    <input type="text" id="searchQuery" placeholder="Search by Name or IMDb ID..." onkeyup="fetchSuggestions()" />
                    <ul id="suggestions"></ul>
                    <button onclick="searchMovie()">Search</button>
                </div>
                <script>
                    async function fetchSuggestions() {
                        let query = document.getElementById('searchQuery').value;
                        if (query.length < 3) return;
                        let res = await fetch('/search?q=' + encodeURIComponent(query) + '&suggestions=true');
                        let data = await res.json();
                        let list = document.getElementById('suggestions');
                        list.innerHTML = data.map(m => \`<li onclick="selectMovie('\${m.id}')">\${m.title}</li>\`).join('');
                    }
                    function selectMovie(id) {
                        window.location.href = '/play/' + id;
                    }
                    function searchMovie() {
                        let query = document.getElementById('searchQuery').value;
                        if (query) {
                            window.location.href = '/search?q=' + encodeURIComponent(query);
                        }
                    }
                </script>
            </body>
        </html>
    `;
}

// **Search Function**
async function searchContent(query) {
    const response = await fetch(`${TMDB_BASE_URL}/search/movie?query=${query}&api_key=${TMDB_API_KEY}`);
    const data = await response.json();
    
    if (query.includes("&suggestions=true")) {
        return new Response(JSON.stringify(data.results.map(movie => ({ id: movie.id, title: movie.title }))), {
            headers: { "Content-Type": "application/json" }
        });
    }

    let results = data.results.map(movie => `
        <div>
            <h3><a href="/play/${movie.id}">${movie.title} (${movie.release_date?.split('-')[0] || "N/A"})</a></h3>
        </div>
    `).join("");

    return `
        <html>
            <head><title>Search Results</title></head>
            <body>
                <h1>Search Results for: ${query}</h1>
                ${results || "<p>No results found.</p>"}
                <a href="/">🔙 Go Back</a>
            </body>
        </html>
    `;
}

// **Play Page with Movie Details & Streaming Options**
async function getPlayPage(movieId) {
    const movie = await fetchMovieDetails(movieId);

    return `
        <html>
            <head>
                <title>${movie.title}</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #121212; color: white; text-align: center; }
                    .container { padding: 20px; }
                    h1 { color: #f4c542; }
                    select, button { padding: 10px; margin: 5px; border-radius: 5px; }
                    iframe { width: 80%; height: 400px; border: none; }
                    .actors { display: flex; justify-content: center; }
                    .actor img { border-radius: 50%; width: 80px; margin: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>${movie.title}</h1>
                    <p><strong>Release:</strong> ${movie.release_date}</p>
                    <p><strong>IMDb Rating:</strong> ${movie.vote_average}/10</p>
                    <p>${movie.overview}</p>
                    <div class="actors">
                        ${movie.cast.map(actor => `<div><img src="${actor.image}" alt="${actor.name}" /><p>${actor.name}</p></div>`).join('')}
                    </div>
                    <label for="sourceSelect">Choose Stream Source:</label>
                    <select id="sourceSelect">
                        <option value="https://vidsrc.to/embed/movie/${movie.imdb_id}" selected>VidSrc (Default)</option>
                        <option value="https://multiembed.mov/embed/movie/${movie.imdb_id}">MultiEmbed</option>
                        <option value="https://player.autoembed.cc/embed/movie/${movie.imdb_id}">AutoEmbed</option>
                        <option value="https://vidsrc.me/embed/movie/${movie.imdb_id}">VidSrc ICU</option>
                    </select>
                    <button onclick="loadMovie()">Play</button>
                    <br>
                    <iframe id="moviePlayer" src="https://vidsrc.to/embed/movie/${movie.imdb_id}" allowfullscreen></iframe>
                </div>
                <script>
                    function loadMovie() {
                        let selectedSource = document.getElementById("sourceSelect").value;
                        document.getElementById("moviePlayer").src = selectedSource;
                    }
                </script>
            </body>
        </html>
    `;
}

// **Fetch Movie Details from TMDB**
async function fetchMovieDetails(movieId) {
    const response = await fetch(`${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=credits`);
    const data = await response.json();

    return {
        title: data.title,
        overview: data.overview,
        release_date: data.release_date,
        vote_average: data.vote_average,
        imdb_id: data.imdb_id,
        cast: data.credits.cast.slice(0, 5).map(actor => ({ name: actor.name, image: `https://image.tmdb.org/t/p/w200${actor.profile_path}` }))
    };
}
