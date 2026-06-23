/**
 * Dashboard administrativo (staff) — indicadores, gráficos, alertas,
 * métricas de cache e exportação CSV.
 * Requer: api-base.js, funcionario-common.js e Chart.js (carregados no HTML).
 */
document.addEventListener('DOMContentLoaded', async () => {
    const ctx = await requireStaff();
    if (!ctx) return;

    const fmtErr = window.staffFormatApiError;
    const withBusy = window.staffWithButtonBusy;

    // Cores do tema para os gráficos.
    const VERDE = '#00b931';
    const VERDE_CLARO = '#5ef098';
    const GRID = 'rgba(255, 255, 255, 0.12)';
    const TEXTO = 'rgba(255, 255, 255, 0.85)';

    async function apiGet(path) {
        const r = await fetch(`${API_BASE}${path}`, {
            headers: { Authorization: `Bearer ${ctx.token}` },
        });
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(fmtErr(err));
        }
        return r.json();
    }

    function setLoadingError(el, msg) {
        if (!el) return;
        el.innerHTML = '';
        const p = document.createElement('p');
        p.className = 'staff-empty';
        p.textContent = msg;
        el.appendChild(p);
    }

    function makeCard({ icon, value, label }) {
        const card = document.createElement('div');
        card.className = 'dash-card';
        card.setAttribute('role', 'listitem');

        const i = document.createElement('i');
        i.className = `dash-card-icon ${icon}`;
        i.setAttribute('aria-hidden', 'true');

        const v = document.createElement('span');
        v.className = 'dash-card-value';
        v.textContent = value;

        const l = document.createElement('span');
        l.className = 'dash-card-label';
        l.textContent = label;

        card.appendChild(i);
        card.appendChild(v);
        card.appendChild(l);
        return card;
    }

    function numero(v) {
        const n = Number(v);
        return Number.isFinite(n) ? n.toLocaleString('pt-BR') : '0';
    }

    // 1) Indicadores gerais ---------------------------------------------------
    async function carregarResumo() {
        const cont = document.getElementById('dash-cards');
        try {
            const d = await apiGet('/dashboard/resumo');
            cont.innerHTML = '';
            const itens = [
                { icon: 'fas fa-users', value: numero(d.total_idosos), label: 'Idosos' },
                { icon: 'fas fa-user-tie', value: numero(d.total_funcionarios), label: 'Funcionários' },
                { icon: 'fas fa-calendar-alt', value: numero(d.total_atividades), label: 'Atividades' },
                { icon: 'fas fa-clipboard-check', value: numero(d.total_inscricoes_confirmadas), label: 'Inscrições confirmadas' },
                { icon: 'fas fa-newspaper', value: numero(d.total_noticias), label: 'Notícias' },
                { icon: 'fas fa-utensils', value: numero(d.total_itens_cardapio), label: 'Itens de cardápio' },
                { icon: 'fas fa-user-check', value: numero(d.total_presencas), label: 'Presenças' },
            ];
            itens.forEach((it) => cont.appendChild(makeCard(it)));
        } catch (e) {
            setLoadingError(cont, 'Erro ao carregar indicadores.');
            staffNotify(e.message || 'Erro ao carregar indicadores', 'error');
        }
    }

    // 2) Gráfico de linha: inscrições por semana ------------------------------
    async function carregarInscricoesPorSemana() {
        const canvas = document.getElementById('grafico-inscricoes');
        const vazio = document.getElementById('grafico-inscricoes-empty');
        try {
            const d = await apiGet('/dashboard/inscricoes-por-semana');
            const pontos = Array.isArray(d.pontos) ? d.pontos : [];
            if (!pontos.length) {
                canvas.hidden = true;
                vazio.hidden = false;
                return;
            }
            new Chart(canvas, {
                type: 'line',
                data: {
                    labels: pontos.map((p) => p.semana),
                    datasets: [{
                        label: 'Inscrições',
                        data: pontos.map((p) => Number(p.total) || 0),
                        borderColor: VERDE_CLARO,
                        backgroundColor: 'rgba(94, 240, 152, 0.18)',
                        pointBackgroundColor: VERDE,
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true,
                    }],
                },
                options: baseChartOptions(),
            });
        } catch (e) {
            canvas.hidden = true;
            vazio.hidden = false;
            vazio.textContent = 'Erro ao carregar o gráfico.';
            staffNotify(e.message || 'Erro ao carregar inscrições por semana', 'error');
        }
    }

    // 3) Gráfico de barras: uso por funcionalidade ----------------------------
    async function carregarUsoFuncionalidades() {
        const canvas = document.getElementById('grafico-uso');
        const vazio = document.getElementById('grafico-uso-empty');
        try {
            const d = await apiGet('/dashboard/uso-funcionalidades');
            const itens = Array.isArray(d.itens) ? d.itens : [];
            if (!itens.length) {
                canvas.hidden = true;
                vazio.hidden = false;
                return;
            }
            new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: itens.map((i) => i.funcionalidade),
                    datasets: [{
                        label: 'Usos',
                        data: itens.map((i) => Number(i.total) || 0),
                        backgroundColor: 'rgba(0, 185, 49, 0.65)',
                        borderColor: VERDE_CLARO,
                        borderWidth: 1,
                        borderRadius: 6,
                    }],
                },
                options: baseChartOptions(),
            });
        } catch (e) {
            canvas.hidden = true;
            vazio.hidden = false;
            vazio.textContent = 'Erro ao carregar o gráfico.';
            staffNotify(e.message || 'Erro ao carregar uso por funcionalidade', 'error');
        }
    }

    function baseChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: TEXTO } },
            },
            scales: {
                x: { ticks: { color: TEXTO }, grid: { color: GRID } },
                y: {
                    beginAtZero: true,
                    ticks: { color: TEXTO, precision: 0 },
                    grid: { color: GRID },
                },
            },
        };
    }

    // 4) Alertas automáticos --------------------------------------------------
    async function carregarAlertas() {
        const cont = document.getElementById('dash-alertas');
        try {
            const d = await apiGet('/dashboard/alertas');
            const alertas = Array.isArray(d.alertas) ? d.alertas : [];
            cont.innerHTML = '';

            if (!alertas.length) {
                const p = document.createElement('p');
                p.className = 'staff-empty';
                p.textContent = 'Nenhum alerta.';
                cont.appendChild(p);
                return;
            }

            const list = document.createElement('div');
            list.className = 'dash-alert-list';
            alertas.forEach((a) => {
                const item = document.createElement('div');
                item.className = 'dash-alert';
                item.setAttribute('role', 'alert');

                const info = document.createElement('div');
                info.className = 'dash-alert-info';

                const titulo = document.createElement('span');
                titulo.className = 'dash-alert-title';
                titulo.textContent = a.titulo || 'Atividade';

                const meta = document.createElement('span');
                meta.className = 'dash-alert-meta';
                meta.textContent = `${numero(a.inscritos)} de ${numero(a.capacidade)} vagas preenchidas`;

                info.appendChild(titulo);
                info.appendChild(meta);

                const badge = document.createElement('span');
                badge.className = 'dash-alert-badge';
                const pct = Math.round(Number(a.percentual) || 0);
                badge.textContent = `${pct}%`;
                badge.setAttribute('aria-label', `Ocupação de ${pct} por cento`);

                item.appendChild(info);
                item.appendChild(badge);
                list.appendChild(item);
            });
            cont.appendChild(list);
        } catch (e) {
            setLoadingError(cont, 'Erro ao carregar alertas.');
            staffNotify(e.message || 'Erro ao carregar alertas', 'error');
        }
    }

    // 5) Métricas de cache ----------------------------------------------------
    async function carregarCache() {
        const cont = document.getElementById('dash-cache');
        try {
            const d = await apiGet('/metrics/cache');
            cont.innerHTML = '';

            const hitRate = d.hit_rate != null
                ? `${(Number(d.hit_rate) * 100).toFixed(1)}%`
                : '—';
            const avgGet = d.avg_get_ms != null
                ? `${Number(d.avg_get_ms).toFixed(2)} ms`
                : '—';

            const itens = [
                {
                    icon: d.enabled ? 'fas fa-toggle-on' : 'fas fa-toggle-off',
                    value: d.enabled ? 'Ativo' : 'Inativo',
                    label: 'Estado do cache',
                },
                { icon: 'fas fa-percent', value: hitRate, label: 'Taxa de acerto' },
                { icon: 'fas fa-bullseye', value: numero(d.hits), label: 'Acertos (hits)' },
                { icon: 'fas fa-circle-xmark', value: numero(d.misses), label: 'Falhas (misses)' },
                { icon: 'fas fa-stopwatch', value: avgGet, label: 'Tempo médio de leitura' },
                { icon: 'fas fa-pen', value: numero(d.sets), label: 'Gravações (sets)' },
                { icon: 'fas fa-broom', value: numero(d.invalidations), label: 'Invalidações' },
            ];
            itens.forEach((it) => cont.appendChild(makeCard(it)));
        } catch (e) {
            setLoadingError(cont, 'Erro ao carregar métricas de cache.');
            staffNotify(e.message || 'Erro ao carregar métricas de cache', 'error');
        }
    }

    // 6) Exportar CSV ---------------------------------------------------------
    async function exportarCsv(btn) {
        await withBusy(btn, async () => {
            try {
                const r = await fetch(`${API_BASE}/dashboard/export/inscricoes.csv`, {
                    headers: { Authorization: `Bearer ${ctx.token}` },
                });
                if (!r.ok) {
                    const err = await r.json().catch(() => ({}));
                    throw new Error(fmtErr(err));
                }
                const blob = await r.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'inscricoes_presenca.csv';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                staffNotify('Exportação concluída', 'success');
            } catch (e) {
                staffNotify(e.message || 'Erro ao exportar CSV', 'error');
            }
        }, 'Exportando…');
    }

    document.getElementById('btn-export-csv').addEventListener('click', (e) => {
        exportarCsv(e.currentTarget);
    });

    // Carrega tudo em paralelo (cada seção trata seu próprio erro).
    carregarResumo();
    carregarAlertas();
    carregarInscricoesPorSemana();
    carregarUsoFuncionalidades();
    carregarCache();
});
