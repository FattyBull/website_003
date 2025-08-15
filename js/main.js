document.addEventListener('DOMContentLoaded', function() {
    
    // KORREKTUR: Wir verwenden IMMER die absolute URL zu deiner Live-API.
    const API_URL = 'http://hammerbanger.com/api/';

    // --- Führe seiten-spezifische Logik aus ---
    if (document.getElementById('articles-grid') || document.getElementById('category-articles-grid') || document.getElementById('search-results-grid')) {
        console.log("Fetching articles from live API...");
        fetch(`${API_URL}?get=articles`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.statusText}`);
                }
                return response.json();
            })
            .then(articles => {
                console.log("Successfully fetched articles:", articles);
                // NEU: Überprüfen, ob der Pinned-Container existiert, um die Homepage-Logik auszuführen
                if (document.getElementById('pinned-article-container')) setupHomepage(articles);
                if (document.getElementById('category-articles-grid')) setupCategoryPage(articles);
                if (document.getElementById('search-results-grid')) setupSearchPage(articles);
            })
            .catch(error => {
                console.error('CRITICAL ERROR fetching articles:', error);
                const container = document.getElementById('articles-grid') || document.getElementById('category-articles-grid') || document.getElementById('search-results-grid');
                if(container) container.innerHTML = `<p style="color: red; text-align: center;">Could not load articles. Please check the API connection.</p>`;
            });
    }

    if (document.getElementById('dynamic-article-content')) {
        initArticlePage(API_URL);
    }

    // --- Globale Event Listener ---
    setupMobileMenu();
    setupThemeToggle();
    setupSearchInput();
});

// --- Initialisierungs-Funktionen ---

function initArticlePage(API_URL) {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const category = pathParts[0];
    const articleSlug = pathParts[1];

    if (!articleSlug) {
        document.getElementById('dynamic-article-content').innerHTML = "<p>Error: No article slug provided.</p>";
        return;
    }

    fetchArticleData(API_URL, articleSlug);
}

function fetchArticleData(API_URL, slug) {
    fetch(`${API_URL}?get=article&slug=${slug}`)
        .then(response => response.json())
        .then(article => {
            if (article.error || !article) throw new Error(article.error || "Article not found");
            fetch(`${API_URL}?get=articles`)
                .then(res => res.json())
                .then(allArticles => buildArticlePage(article, allArticles));
        })
        .catch(error => {
            console.error('Error fetching single article:', error);
            document.getElementById('dynamic-article-content').innerHTML = `<p>Error loading article from database.</p>`;
        });
}

// --- Setup-Funktionen (Logik) ---

// NEU: Überarbeitete Homepage-Logik
function setupHomepage(articles) {
    const pinnedContainer = document.getElementById('pinned-article-container');
    const articlesGrid = document.getElementById('articles-grid');
    if (!pinnedContainer || !articlesGrid) return;

    pinnedContainer.innerHTML = '';
    articlesGrid.innerHTML = '';

    if (articles.length === 0) return;

    // Render the first article as PINNED
    const pinnedArticle = articles[0];
    pinnedContainer.innerHTML = createPinnedArticleCard(pinnedArticle);

    // Render the second article as FEATURED (if it exists)
    if (articles.length > 1) {
        const featuredArticle = articles[1];
        const linkUrl = `/${featuredArticle.category.toLowerCase()}/${featuredArticle.slug}/`;
        const formattedDate = formatDate(featuredArticle.published_at);
        const categoryClass = `category-${featuredArticle.category.toLowerCase()}`;
        // Note: The featured article is now added to the main grid, not a separate container.
        // We will give it a specific class to be styled differently if needed, or just treat it as a large card.
        articlesGrid.innerHTML += createFeaturedArticleCard(featuredArticle, linkUrl, categoryClass, formattedDate);
    }
    
    // Render the rest of the articles (from the 3rd one onwards)
    articles.slice(2).forEach(article => {
        articlesGrid.innerHTML += createArticleCard(article, 'card-normal');
    });
}


function setupCategoryPage(articles) {
    const categoryArticlesGrid = document.getElementById('category-articles-grid');
    if (!categoryArticlesGrid) return;
    const pathParts = window.location.pathname.split('/').filter(part => part);
    const category = pathParts[0];
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    const categoryHeaderContainer = document.getElementById('category-header-container');
    if (categoryHeaderContainer) categoryHeaderContainer.innerHTML = `<div class="category-header"><h1>${categoryName}</h1></div>`;
    const categoryArticles = articles.filter(article => article.category.toLowerCase() === category);
    categoryArticles.forEach(article => categoryArticlesGrid.innerHTML += createArticleCard(article, false));
}

function setupSearchPage(articles) {
    const searchResultsGrid = document.getElementById('search-results-grid');
    if (!searchResultsGrid) return;
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    const searchHeaderContainer = document.getElementById('search-header-container');
    if (query) {
        const keywords = query.toLowerCase().split(' ').filter(k => k);
        const results = articles.filter(article => {
            const searchableText = `${article.title} ${article.summary} ${article.category}`.toLowerCase();
            return keywords.some(keyword => searchableText.includes(keyword));
        });
        if (searchHeaderContainer) searchHeaderContainer.innerHTML = `<div class="search-header"><h1>Search Results</h1><p>${results.length} results found for "<span class="query">${query}</span>"</p></div>`;
        if (results.length > 0) {
            results.forEach(article => searchResultsGrid.innerHTML += createArticleCard(article, false));
        } else {
            searchResultsGrid.innerHTML = "<p>No articles found matching your search.</p>";
        }
    }
}

function buildArticlePage(article, allArticles) {
    document.title = `${article.title} - Hammerbanger.com`;
    const relatedArticles = allArticles.filter(a => a.category === article.category && a.id != article.id).slice(0, 3);
    let relatedArticlesHTML = '';
    if (relatedArticles.length > 0) {
        relatedArticles.forEach(related => relatedArticlesHTML += createArticleCard(related, false));
    }
    const articlePageHTML = `
        <div class="article-container">
            <article>
                <img src="${article.image_path}" alt="${article.title}" class="article-featured-image">
                <div class="article-text-content">
                    <header class="article-header">
                        <h1>${article.title}</h1>
                        <p class="article-meta">Published on ${new Date(article.published_at).toLocaleDateString()} in ${article.category}</p>
                    </header>
                    <div class="breadcrumbs">
                        <a href="/">Home</a> &gt; <a href="/${article.category.toLowerCase()}/">${article.category}</a> &gt; <span>${article.title}</span>
                    </div>
                    <div class="article-body">${article.body_html}</div>
                </div>
            </article>
            <section class="related-articles-container">
                <h2>Related Articles</h2>
                <div class="article-grid">${relatedArticlesHTML}</div>
            </section>
        </div>`;
    document.getElementById('dynamic-article-content').innerHTML = articlePageHTML;
}

// --- Globale Event Listener ---
function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mainNav = document.getElementById('main-nav');
    if (mobileMenuToggle && mainNav) mobileMenuToggle.addEventListener('click', () => mainNav.classList.toggle('mobile-nav-open'));
}

function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if(!themeToggle) return;
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        if (theme === 'dark') {
            document.documentElement.removeAttribute('data-theme');
            localStorage.removeItem('theme');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
    });
}

function setupSearchInput() {
    document.querySelectorAll('input[type="search"]').forEach(input => {
        input.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                const query = input.value.trim();
                if (query) window.location.href = `/search.html?q=${encodeURIComponent(query)}`;
            }
        });
    });
}

// --- Hilfsfunktionen ---
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// NEU: Funktion zum Erstellen der Pinned Article Card
function createPinnedArticleCard(article) {
    const linkUrl = `/${article.category.toLowerCase()}/${article.slug}/`;
    const formattedDate = formatDate(article.published_at);
    const categoryClass = `category-${article.category.toLowerCase()}`;

    return `
        <a href="${linkUrl}" class="pinned-article-card" data-id="${article.id}">
            <img src="${article.image_path}" alt="${article.title}" class="pinned-article-image">
            <div class="pinned-article-content">
                <span class="article-card-category ${categoryClass}">${article.category}</span>
                <h3 class="article-card-title">${article.title}</h3>
                <p class="article-card-summary">${article.summary}</p>
                <p class="article-card-date">${formattedDate}</p>
            </div>
        </a>
    `;
}


function createArticleCard(article, sizeClass = 'card-normal') {
    const linkUrl = `/${article.category.toLowerCase()}/${article.slug}/`;
    const formattedDate = formatDate(article.published_at);
    const categoryClass = `category-${article.category.toLowerCase()}`;

    return `
        <a href="${linkUrl}" class="article-card ${sizeClass}" data-id="${article.id}">
            <img src="${article.image_path}" alt="${article.title}" class="article-card-image">
            <div class="article-card-content">
                <span class="article-card-category ${categoryClass}">${article.category}</span>
                <h3 class="article-card-title">${article.title}</h3>
                <p class="article-card-summary">${article.summary}</p>
                <p class="article-card-date">${formattedDate}</p>
            </div>
        </a>
    `;
}

function createFeaturedArticleCard(article, linkUrl, categoryClass, formattedDate) {
  // This function now creates a card that will be placed in the main grid.
  // We can give it a special class if we want to style it differently from normal cards,
  // for example, making it span multiple columns if the grid supported it.
  // For now, it will look like a normal card but you can add a class like 'featured-in-grid'
  return `
    <a href="${linkUrl}" class="article-card card-large" data-id="${article.id}">
      <img src="${article.image_path}" alt="${article.title}" class="article-card-image">
      <div class="article-card-content">
        <span class="article-card-category ${categoryClass}">${article.category}</span>
        <h3 class="article-card-title">${article.title}</h3>
        <p class="article-card-summary">${article.summary}</p>
        <p class="article-card-date">${formattedDate}</p>
      </div>
    </a>
  `;
}
