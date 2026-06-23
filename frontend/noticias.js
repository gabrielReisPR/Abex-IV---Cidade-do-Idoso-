document.addEventListener("DOMContentLoaded", () => {
    const newsContainer = document.getElementById("newsContainer");
    const loadingSpinner = document.getElementById("loadingSpinner");
    const errorMessage = document.getElementById("errorMessage");

    const apiBase = () =>
        typeof window.API_BASE_URL === 'string' && window.API_BASE_URL
            ? window.API_BASE_URL
            : `${window.location.protocol}//${window.location.hostname}:8000`;

    const escapeHtml = (s) => {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    };

    const getDomain = (url) => {
        try {
            const domain = new URL(url).hostname;
            return domain.replace(/^www\./, '');
        } catch (_) {
            return url;
        }
    };

    const renderNews = (noticias) => {
        newsContainer.innerHTML = '';

        if (!noticias || noticias.length === 0) {
            newsContainer.innerHTML = '<p class="no-news">Nenhuma notícia encontrada no momento.</p>';
            return;
        }

        noticias.forEach(noticia => {
            const sourceDomain = getDomain(noticia.fonte);

            const article = document.createElement('article');
            article.className = 'news-item';

            const href = escapeHtml(noticia.fonte);

            // Imagem opcional: resolve via apiUrl (trata /uploads/... e URLs http).
            let imageHtml = '';
            if (noticia.imagem_url) {
                const imgSrc =
                    typeof window.apiUrl === 'function'
                        ? window.apiUrl(noticia.imagem_url)
                        : noticia.imagem_url;
                imageHtml = `
                    <div class="news-image">
                        <img src="${escapeHtml(imgSrc)}" alt="Imagem da notícia: ${escapeHtml(noticia.titulo)}" loading="lazy">
                    </div>
                `;
            }

            article.innerHTML = `
                ${imageHtml}
                <h3 class="news-title">
                    <a href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(noticia.titulo)}</a>
                </h3>
                <p class="news-description">${escapeHtml(noticia.descricao)}</p>
                <div class="news-footer">
                    <span class="news-source">Fonte: ${escapeHtml(sourceDomain)}</span>
                </div>
            `;

            newsContainer.appendChild(article);
        });
    };

    const fetchNews = async () => {
        loadingSpinner.classList.add("show");
        errorMessage.classList.remove("show");
        
        const backendUrl = `${apiBase()}/noticias`;

        try {
            const response = await fetch(backendUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const noticias = await response.json();
                renderNews(noticias);
            } else {
                const errorData = await response.json();
                errorMessage.textContent =
                    errorData.detail || errorData.message || "Falha ao carregar as notícias.";
                errorMessage.classList.add("show");
            }

        } catch (error) {
            errorMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente mais tarde.";
            errorMessage.classList.add("show");
        
        } finally {
            loadingSpinner.classList.remove("show");
        }
    };

    fetchNews();
});
