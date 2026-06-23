/**
 * Portal do funcionário — utilitários compartilhados.
 * API: em Docker (nginx na porta 8080) usa /api; desenvolvimento local usa :8000.
 */
(function staffCommon() {
    const API_BASE =
        typeof window.API_BASE_URL === 'string' && window.API_BASE_URL
            ? window.API_BASE_URL
            : 'http://localhost:8000';

    function staffAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        };
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) return '';
        const d = document.createElement('div');
        d.textContent = String(value);
        return d.innerHTML;
    }

    function formatApiError(body) {
        if (!body || typeof body !== 'object') return 'Algo deu errado. Tente de novo.';
        const d = body.detail;
        if (typeof d === 'string') return d;
        if (Array.isArray(d)) {
            return d
                .map((x) => (typeof x === 'object' && x.msg ? x.msg : JSON.stringify(x)))
                .join(' ');
        }
        if (d && typeof d === 'object' && d.msg) return String(d.msg);
        return 'Algo deu errado. Tente de novo.';
    }

    async function requireStaff() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'login.html';
            return null;
        }
        try {
            const r = await fetch(`${API_BASE}/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!r.ok) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return null;
            }
            const user = await r.json();
            if (!user.is_staff) {
                window.location.href = 'home.html';
                return null;
            }
            return { token, user };
        } catch (e) {
            console.error(e);
            window.location.href = 'login.html';
            return null;
        }
    }

    function staffNotify(msg, type = 'info') {
        const el = document.createElement('div');
        el.className = `staff-toast staff-toast-${type}`;
        el.setAttribute('role', 'status');
        el.textContent = msg;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        setTimeout(() => {
            el.classList.remove('show');
            setTimeout(() => el.remove(), 300);
        }, 3500);
    }

    function staffLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = 'login.html';
    }

    async function staffWithButtonBusy(button, run, busyLabel) {
        if (!button) return run();
        const prev = button.disabled;
        const html = button.innerHTML;
        button.disabled = true;
        if (busyLabel) button.innerHTML = busyLabel;
        try {
            return await run();
        } finally {
            button.disabled = prev;
            button.innerHTML = html;
        }
    }

    function staffEnsureModalRoot() {
        let root = document.getElementById('staff-modal-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'staff-modal-root';
            document.body.appendChild(root);
        }
        return root;
    }

    function staffFormModal({ title, fields, submitLabel = 'Salvar' }) {
        return new Promise((resolve) => {
            const root = staffEnsureModalRoot();
            const overlay = document.createElement('div');
            overlay.className = 'staff-modal-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');

            const modal = document.createElement('div');
            modal.className = 'staff-modal';

            const h2 = document.createElement('h2');
            h2.className = 'staff-modal-title';
            h2.id = 'staff-modal-title';
            h2.textContent = title;

            const form = document.createElement('form');
            form.className = 'staff-modal-form';
            form.noValidate = true;

            const inputsById = {};

            for (const f of fields) {
                const lab = document.createElement('label');
                lab.className = 'staff-modal-label';
                lab.htmlFor = `sf-${f.id}`;
                lab.appendChild(document.createTextNode(f.label));

                let control;
                if (f.type === 'textarea') {
                    control = document.createElement('textarea');
                    control.id = `sf-${f.id}`;
                    control.name = f.id;
                    control.rows = f.rows || 4;
                    control.value = f.value ?? '';
                } else {
                    control = document.createElement('input');
                    control.id = `sf-${f.id}`;
                    control.name = f.id;
                    control.type = f.type || 'text';
                    control.value = f.value ?? '';
                }
                if (f.placeholder) control.placeholder = f.placeholder;
                if (f.required !== false) control.required = true;

                lab.appendChild(control);
                form.appendChild(lab);
                inputsById[f.id] = control;
            }

            const actions = document.createElement('div');
            actions.className = 'staff-modal-actions';

            const btnCancel = document.createElement('button');
            btnCancel.type = 'button';
            btnCancel.className = 'staff-btn staff-btn-secondary staff-modal-cancel';
            btnCancel.textContent = 'Cancelar';

            const btnOk = document.createElement('button');
            btnOk.type = 'submit';
            btnOk.className = 'staff-btn staff-btn-primary';
            btnOk.textContent = submitLabel;

            actions.appendChild(btnCancel);
            actions.appendChild(btnOk);
            form.appendChild(actions);

            modal.appendChild(h2);
            modal.appendChild(form);
            overlay.appendChild(modal);

            const esc = (e) => {
                if (e.key === 'Escape') close(null);
            };

            function close(result) {
                document.removeEventListener('keydown', esc);
                overlay.remove();
                resolve(result);
            }

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(null);
            });
            btnCancel.addEventListener('click', () => close(null));
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const out = {};
                for (const f of fields) {
                    out[f.id] = String(inputsById[f.id].value ?? '').trim();
                }
                close(out);
            });

            document.addEventListener('keydown', esc);
            root.appendChild(overlay);
            const first = form.querySelector('input, textarea');
            if (first) first.focus();
        });
    }

    window.staffLogout = staffLogout;
    window.staffNotify = staffNotify;
    window.requireStaff = requireStaff;
    window.API_BASE = API_BASE;
    window.staffAuthHeaders = staffAuthHeaders;
    window.staffEscapeHtml = escapeHtml;
    window.staffFormatApiError = formatApiError;
    window.staffWithButtonBusy = staffWithButtonBusy;
    window.staffFormModal = staffFormModal;
})();
