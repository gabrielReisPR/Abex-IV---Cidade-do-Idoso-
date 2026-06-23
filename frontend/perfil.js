/**
 * Tela de perfil do idoso.
 * - Exige token; sem token redireciona para login.
 * - GET /users/me para preencher o formulário.
 * - PATCH /users/me ao salvar (envia apenas campos editáveis).
 * - Feedback acessível via aria-live e logout que limpa a sessão.
 */
(function () {
    const API_BASE =
        typeof window.API_BASE_URL === 'string' && window.API_BASE_URL
            ? window.API_BASE_URL
            : 'http://localhost:8000';

    // Campos editáveis enviados no PATCH (na ordem do formulário).
    const EDITABLE_FIELDS = [
        'first_name',
        'last_name',
        'phone',
        'birth_date',
        'gender',
        'address',
        'city',
        'state',
        'zip_code',
    ];

    function authHeaders() {
        return { Authorization: 'Bearer ' + localStorage.getItem('token') };
    }

    function showError(message) {
        const el = document.getElementById('errorMessage');
        el.textContent = message;
        el.classList.add('show');
    }

    function hideError() {
        const el = document.getElementById('errorMessage');
        el.textContent = '';
        el.classList.remove('show');
    }

    function setFeedback(message, type) {
        const el = document.getElementById('feedback');
        el.textContent = message;
        el.classList.remove('is-success', 'is-error');
        if (type) el.classList.add('is-' + type);
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value == null ? '' : String(value);
    }

    function fillForm(user) {
        setValue('username', user.username);
        setValue('email', user.email);
        EDITABLE_FIELDS.forEach((field) => setValue(field, user[field]));
    }

    function collectChanges() {
        // Envia todos os campos editáveis; strings vazias viram null
        // para limpar valores no backend.
        const payload = {};
        EDITABLE_FIELDS.forEach((field) => {
            const el = document.getElementById(field);
            if (!el) return;
            const raw = el.value.trim();
            payload[field] = raw === '' ? null : raw;
        });
        return payload;
    }

    async function loadProfile() {
        const spinner = document.getElementById('loadingSpinner');
        const form = document.getElementById('perfilForm');

        hideError();
        spinner.classList.add('show');
        form.hidden = true;

        try {
            const response = await fetch(`${API_BASE}/users/me`, {
                headers: authHeaders(),
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                window.location.href = 'login.html';
                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                const msg =
                    typeof data.detail === 'string'
                        ? data.detail
                        : 'Não foi possível carregar o seu perfil.';
                showError(msg);
                return;
            }

            const user = await response.json();
            fillForm(user);
            form.hidden = false;
        } catch {
            showError(
                'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
            );
        } finally {
            spinner.classList.remove('show');
        }
    }

    async function saveProfile(event) {
        event.preventDefault();
        const button = document.getElementById('saveButton');

        setFeedback('Salvando…', null);
        button.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/users/me`, {
                method: 'PATCH',
                headers: Object.assign(
                    { 'Content-Type': 'application/json' },
                    authHeaders()
                ),
                body: JSON.stringify(collectChanges()),
            });

            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('refresh_token');
                window.location.href = 'login.html';
                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                const msg =
                    typeof data.detail === 'string'
                        ? data.detail
                        : 'Não foi possível salvar as alterações. Verifique os dados e tente novamente.';
                setFeedback(msg, 'error');
                return;
            }

            const user = await response.json();
            fillForm(user);
            setFeedback('Seus dados foram salvos com sucesso!', 'success');
        } catch {
            setFeedback(
                'Não foi possível conectar ao servidor. Tente novamente.',
                'error'
            );
        } finally {
            button.disabled = false;
        }
    }

    function logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = 'login.html';
    }

    function init() {
        if (!localStorage.getItem('token')) {
            window.location.href = 'login.html';
            return;
        }

        document
            .getElementById('perfilForm')
            .addEventListener('submit', saveProfile);
        document
            .getElementById('logoutButton')
            .addEventListener('click', logout);

        loadProfile();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
