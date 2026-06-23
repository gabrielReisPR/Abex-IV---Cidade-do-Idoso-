/**
 * Controles de acessibilidade (WCAG AA) — Sprint 5.
 * Tamanho de fonte (3 níveis) e alto contraste, persistidos em
 * localStorage e aplicados em todas as telas que incluírem este script
 * junto de accessibility.css. Acessível por teclado e leitores de tela.
 */
(function () {
    const STORAGE_KEY = 'a11y-prefs';
    const root = document.documentElement;
    let prefs = { zoom: 0, contrast: false };

    try {
        Object.assign(prefs, JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'));
    } catch (e) {
        /* prefs default */
    }

    function apply() {
        root.classList.toggle('a11y-zoom-1', prefs.zoom === 1);
        root.classList.toggle('a11y-zoom-2', prefs.zoom === 2);
        root.classList.toggle('a11y-contrast', !!prefs.contrast);
    }

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
        } catch (e) {
            /* ignora */
        }
    }

    apply();

    function build() {
        if (document.getElementById('a11y-bar')) return;
        const bar = document.createElement('div');
        bar.id = 'a11y-bar';
        bar.setAttribute('role', 'region');
        bar.setAttribute('aria-label', 'Ferramentas de acessibilidade');
        bar.innerHTML =
            '<button type="button" class="a11y-btn" data-act="dec" ' +
            'aria-label="Diminuir tamanho do texto">A−</button>' +
            '<button type="button" class="a11y-btn" data-act="inc" ' +
            'aria-label="Aumentar tamanho do texto">A+</button>' +
            '<button type="button" class="a11y-btn a11y-contrast-btn" ' +
            'data-act="contrast" aria-pressed="' +
            !!prefs.contrast +
            '" aria-label="Alternar alto contraste">◐</button>';
        document.body.appendChild(bar);

        bar.addEventListener('click', (e) => {
            const b = e.target.closest('button');
            if (!b) return;
            const act = b.dataset.act;
            if (act === 'inc') prefs.zoom = Math.min(2, prefs.zoom + 1);
            else if (act === 'dec') prefs.zoom = Math.max(0, prefs.zoom - 1);
            else if (act === 'contrast') prefs.contrast = !prefs.contrast;
            apply();
            save();
            const cb = bar.querySelector('.a11y-contrast-btn');
            if (cb) cb.setAttribute('aria-pressed', String(!!prefs.contrast));
        });
    }

    if (document.readyState !== 'loading') build();
    else document.addEventListener('DOMContentLoaded', build);
})();
