/**
 * Base URL da API + refresh token automático (Sprint 5).
 *
 * - Docker (nginx em 8080/80): prefixo /api (proxy no container).
 * - Dev local (Live Server, etc.): http://host:8000
 * - Opcional: <meta name="api-base" content="https://...">
 *
 * Além de resolver a base, este script envolve window.fetch para, ao
 * receber 401 numa chamada autenticada à API, tentar renovar a sessão
 * com o refresh token e repetir a requisição uma vez — eliminando o
 * relogin após a expiração do access token.
 */
(function () {
    function resolveApiBase() {
        const meta = document.querySelector('meta[name="api-base"]');
        if (meta && meta.content.trim()) {
            return meta.content.trim().replace(/\/$/, '');
        }
        const { hostname, port, protocol } = window.location;
        if (protocol === 'file:') {
            return 'http://localhost:8000';
        }
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
        if (local && (port === '8080' || port === '80' || port === '')) {
            return '/api';
        }
        if (local) {
            return `http://${hostname}:8000`;
        }
        return '/api';
    }

    const API_BASE_URL = resolveApiBase();
    window.API_BASE_URL = API_BASE_URL;

    // Resolve caminhos relativos da API (ex.: imagens em /uploads/...)
    // para uma URL utilizável tanto no Docker (/api) quanto em dev.
    window.apiUrl = function (path) {
        if (!path) return '';
        if (/^https?:\/\//i.test(path)) return path;
        return API_BASE_URL + (path.charAt(0) === '/' ? path : '/' + path);
    };

    // --- Helpers de token (access + refresh) ---
    const auth = {
        getAccess() {
            return localStorage.getItem('token');
        },
        getRefresh() {
            return localStorage.getItem('refresh_token');
        },
        set(access, refresh) {
            if (access) localStorage.setItem('token', access);
            if (refresh) localStorage.setItem('refresh_token', refresh);
        },
        clear() {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
        },
    };
    window.authTokens = auth;

    const nativeFetch = window.fetch.bind(window);
    let refreshing = null;

    function isApiUrl(url) {
        if (!url) return false;
        if (API_BASE_URL && url.indexOf(API_BASE_URL) !== -1) return true;
        if (url.indexOf('/api') === 0) return true;
        return /\/(auth|users|atividades|cardapio|noticias|password|dashboard|home|metrics)(\/|$|\?)/.test(
            url
        );
    }

    function isAuthEndpoint(url) {
        return (
            url.indexOf('/auth/refresh') !== -1 ||
            url.indexOf('/auth/token') !== -1
        );
    }

    function doRefresh() {
        const rt = auth.getRefresh();
        if (!rt) return Promise.resolve(false);
        if (!refreshing) {
            refreshing = nativeFetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: rt }),
            })
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => {
                    if (data && data.access_token) {
                        auth.set(data.access_token, data.refresh_token);
                        return true;
                    }
                    return false;
                })
                .catch(() => false)
                .finally(() => {
                    refreshing = null;
                });
        }
        return refreshing;
    }

    function withNewToken(init) {
        const token = auth.getAccess();
        const next = Object.assign({}, init);
        const h = init && init.headers;
        if (h instanceof Headers) {
            const copy = new Headers(h);
            if (copy.has('Authorization')) {
                copy.set('Authorization', `Bearer ${token}`);
            }
            next.headers = copy;
        } else if (h && (h.Authorization || h.authorization)) {
            next.headers = Object.assign({}, h, {
                Authorization: `Bearer ${token}`,
            });
        }
        return next;
    }

    window.fetch = async function (input, init = {}) {
        const url =
            typeof input === 'string'
                ? input
                : (input && input.url) || '';
        const res = await nativeFetch(input, init);
        if (
            res.status !== 401 ||
            !isApiUrl(url) ||
            isAuthEndpoint(url)
        ) {
            return res;
        }
        const ok = await doRefresh();
        if (!ok) return res;
        // Repete a requisição uma vez com o novo access token.
        if (typeof input === 'string') {
            return nativeFetch(input, withNewToken(init));
        }
        return nativeFetch(input, init);
    };
})();
