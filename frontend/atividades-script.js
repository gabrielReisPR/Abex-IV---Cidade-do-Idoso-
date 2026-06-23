const API_BASE =
    typeof window.API_BASE_URL === 'string' && window.API_BASE_URL
        ? window.API_BASE_URL
        : 'http://localhost:8000';

const cancelModal = document.getElementById('cancelModal');
const catalogModal = document.getElementById('catalogModal');
const activitySelect = document.getElementById('activitySelect');
const activitiesGrid = document.getElementById('activitiesGrid');
const activitySummaryText = document.getElementById('activitySummaryText');
const catalogList = document.getElementById('catalogList');

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text == null ? '' : String(text);
    return d.innerHTML;
}

function apiDetailMessage(payload) {
    if (!payload || payload.detail == null) return 'Algo deu errado.';
    const d = payload.detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d) && d[0]?.msg) return d[0].msg;
    return 'Algo deu errado.';
}

async function ensureAuthenticated() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    try {
        const response = await fetch(`${API_BASE}/users/me`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

function getToken() {
    return localStorage.getItem('token');
}

function updateActivitySummary(confirmedCount) {
    if (!activitySummaryText) return;
    if (confirmedCount === 0) {
        activitySummaryText.innerHTML =
            'Você não está inscrito(a) em nenhuma atividade no momento.';
        return;
    }
    const label = confirmedCount === 1 ? 'atividade' : 'atividades';
    activitySummaryText.innerHTML = `Você está inscrito(a) em <strong>${confirmedCount} ${label}</strong>`;
}

function bindGridDelegation() {
    if (!activitiesGrid || activitiesGrid.dataset.delegationBound === '1') return;
    activitiesGrid.dataset.delegationBound = '1';
    activitiesGrid.addEventListener('click', (event) => {
        const card = event.target.closest('.activity-card');
        if (card) selectActivityCard(card);
    });
    activitiesGrid.addEventListener('keydown', (event) => {
        const card = event.target.closest('.activity-card');
        if (!card) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectActivityCard(card);
        }
    });
}

function renderActivityCards(inscricoes) {
    bindGridDelegation();

    if (!inscricoes.length) {
        activitiesGrid.innerHTML =
            '<p class="no-activities">Você ainda não possui histórico de inscrições. Use <strong>Ver todas as atividades</strong> para se inscrever.</p>';
        updateActivitySummary(0);
        return;
    }

    const confirmed = inscricoes.filter((i) => i.status === 'confirmado').length;
    updateActivitySummary(confirmed);

    activitiesGrid.innerHTML = '';
    inscricoes.forEach((inc) => {
        const a = inc.atividade;
        const isOk = inc.status === 'confirmado';
        const card = document.createElement('div');
        card.className = `activity-card ${isOk ? 'confirmed' : 'canceled'}`;
        card.dataset.inscricaoId = String(inc.id);
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute(
            'aria-label',
            `${a.titulo}, ${isOk ? 'confirmado' : 'cancelado'}`,
        );

        const statusIcon = isOk ? 'fa-check' : 'fa-times';
        const statusLabel = isOk ? 'CONFIRMADO' : 'CANCELADO';

        card.innerHTML = `
            <div class="card-status">
                <i class="fas ${statusIcon}"></i>
                <span>${statusLabel}</span>
            </div>
            <div class="card-image">
                <img src="${escapeHtml(a.imagem_url)}" alt="${escapeHtml(a.titulo)}">
            </div>
            <div class="card-content">
                <h3 class="activity-title">${escapeHtml(a.titulo)}</h3>
                <div class="activity-details">
                    <div class="detail-item">
                        <i class="fas fa-clock"></i>
                        <span>${escapeHtml(a.hora)}</span>
                    </div>
                    <div class="detail-item">
                        <i class="fas fa-calendar"></i>
                        <span>${escapeHtml(a.data)}</span>
                    </div>
                </div>
            </div>
        `;
        activitiesGrid.appendChild(card);
    });

    Array.from(activitiesGrid.children).forEach((domCard, index) => {
        domCard.style.opacity = '0';
        domCard.style.transform = 'translateY(20px)';
        setTimeout(() => {
            domCard.style.transition = 'all 0.5s ease';
            domCard.style.opacity = '1';
            domCard.style.transform = 'translateY(0)';
        }, index * 120);
    });
}

async function loadUserActivitiesFromApi() {
    const token = getToken();
    if (!activitiesGrid) return;

    activitiesGrid.innerHTML =
        '<p class="no-activities loading-hint">Carregando suas atividades...</p>';

    try {
        const response = await fetch(`${API_BASE}/atividades/minhas-inscricoes`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            activitiesGrid.innerHTML = `<p class="no-activities">${escapeHtml(apiDetailMessage(err))}</p>`;
            updateActivitySummary(0);
            return;
        }
        const data = await response.json();
        renderActivityCards(data.inscricoes || []);
    } catch {
        activitiesGrid.innerHTML =
            '<p class="no-activities">Não foi possível conectar ao servidor.</p>';
        updateActivitySummary(0);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const ok = await ensureAuthenticated();
    if (!ok) return;

    setupEventListeners();
    initializeAccessibilityButtons();
    await loadUserActivitiesFromApi();
});

function setupEventListeners() {
    window.addEventListener('click', (event) => {
        if (event.target === cancelModal) closeCancelModal();
        if (event.target === catalogModal) closeCatalogModal();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (cancelModal && cancelModal.style.display === 'block') {
                closeCancelModal();
            }
            if (catalogModal && catalogModal.style.display === 'block') {
                closeCatalogModal();
            }
        }
    });
}

function initializeAccessibilityButtons() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button) => {
        if (!button.getAttribute('aria-label')) {
            const text = button.textContent.trim();
            if (text) button.setAttribute('aria-label', text);
        }
    });
}

function cancelActivity() {
    const confirmedActivities = document.querySelectorAll(
        '.activity-card.confirmed',
    );
    if (confirmedActivities.length === 0) {
        return;
    }
    updateActivitySelectOptions();
    cancelModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => activitySelect && activitySelect.focus(), 100);
}

function closeCancelModal() {
    cancelModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    activitySelect.value = '';
}

function updateActivitySelectOptions() {
    activitySelect.innerHTML =
        '<option value="">Escolha uma atividade...</option>';
    document.querySelectorAll('.activity-card.confirmed').forEach((card) => {
        const id = card.dataset.inscricaoId;
        const title = card.querySelector('.activity-title')?.textContent || '';
        if (!id) return;
        const option = document.createElement('option');
        option.value = id;
        option.textContent = title;
        activitySelect.appendChild(option);
    });
}

async function confirmCancel() {
    const selectedId = activitySelect.value;
    if (!selectedId) {
        return;
    }

    const confirmButton = document.querySelector('.modal-footer .btn-cancel');
    setLoadingState(confirmButton, true);

    try {
        const response = await fetch(
            `${API_BASE}/atividades/inscricoes/${selectedId}/cancelar`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` },
            },
        );

        if (response.ok) {
            await loadUserActivitiesFromApi();
        } else {
            const err = await response.json().catch(() => ({}));
        }
    } catch {
    } finally {
        setLoadingState(confirmButton, false);
        closeCancelModal();
    }
}

function selectActivityCard(card) {
    document.querySelectorAll('.activity-card').forEach((c) => {
        c.classList.remove('selected');
    });
    card.classList.add('selected');

    if (!document.querySelector('#selectedCardStyle')) {
        const style = document.createElement('style');
        style.id = 'selectedCardStyle';
        style.textContent = `
            .activity-card.selected {
                border-color: #00B931;
                box-shadow: 0 0 0 3px rgba(0, 185, 49, 0.2);
            }
        `;
        document.head.appendChild(style);
    }
}

function closeCatalogModal() {
    if (catalogModal) {
        catalogModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function openCatalogModal() {
    catalogModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

async function viewAllActivities() {
    const token = getToken();
    openCatalogModal();
    catalogList.innerHTML =
        '<p class="catalog-intro">Carregando catálogo...</p>';

    try {
        const [catRes, minhasRes] = await Promise.all([
            fetch(`${API_BASE}/atividades/catalogo`),
            fetch(`${API_BASE}/atividades/minhas-inscricoes`, {
                headers: { Authorization: `Bearer ${token}` },
            }),
        ]);

        if (!catRes.ok || !minhasRes.ok) {
            catalogList.innerHTML =
                '<p class="no-activities">Não foi possível carregar o catálogo.</p>';
            return;
        }

        const catalogo = await catRes.json();
        const minhas = await minhasRes.json();
        const byActivityId = {};
        (minhas.inscricoes || []).forEach((i) => {
            byActivityId[i.atividade.id] = i;
        });

        catalogList.innerHTML = '';
        (catalogo.atividades || []).forEach((a) => {
            const row = document.createElement('div');
            row.className = 'catalog-row';

            const inc = byActivityId[a.id];
            const isConfirmed = inc && inc.status === 'confirmado';

            // Ocupação: só exibe quando há limite de vagas (vagas != null).
            const temLimite = a.vagas != null;
            const lotada = temLimite && a.vagas_disponiveis === 0;
            let ocupacaoHtml = '';
            if (temLimite) {
                const inscritos = a.inscritos != null ? a.inscritos : 0;
                const classe = lotada
                    ? 'catalog-row-vagas vagas-lotada'
                    : 'catalog-row-vagas';
                const texto = lotada
                    ? 'Atividade lotada'
                    : `${inscritos} de ${a.vagas} vagas preenchidas`;
                ocupacaoHtml = `<div class="${classe}">${escapeHtml(texto)}</div>`;
            }

            let actionHtml = '';
            if (isConfirmed) {
                actionHtml = '<span class="catalog-badge">Inscrito</span>';
            } else if (lotada) {
                actionHtml =
                    '<span class="catalog-badge catalog-badge-lotada">Lotada</span>';
            } else {
                actionHtml = `<button type="button" class="btn-inscrever" data-activity-id="${a.id}">Inscrever-se</button>`;
            }

            const imgSrc =
                typeof window.apiUrl === 'function'
                    ? window.apiUrl(a.imagem_url)
                    : a.imagem_url;

            row.innerHTML = `
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(a.titulo)}">
                <div class="catalog-row-info">
                    <h4>${escapeHtml(a.titulo)}</h4>
                    <div class="catalog-row-meta">${escapeHtml(a.hora)} · ${escapeHtml(a.data)}</div>
                    ${ocupacaoHtml}
                </div>
                ${actionHtml}
            `;

            const btn = row.querySelector('.btn-inscrever');
            if (btn) {
                btn.addEventListener('click', () =>
                    inscreverNaAtividade(a.id, btn),
                );
            }
            catalogList.appendChild(row);
        });
    } catch {
        catalogList.innerHTML =
            '<p class="no-activities">Erro de conexão.</p>';
    }
}

async function inscreverNaAtividade(activityId, button) {
    button.disabled = true;
    try {
        const response = await fetch(`${API_BASE}/atividades/inscricoes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ activity_id: activityId }),
        });

        if (response.ok) {
            await loadUserActivitiesFromApi();
            closeCatalogModal();
        } else {
            const err = await response.json().catch(() => ({}));
            button.disabled = false;
        }
    } catch {
        button.disabled = false;
    }
}

function toggleVoiceAccessibility() {
    const button = document.querySelector('.accessibility-btn');
    const isActive = button.classList.contains('active');

    if (isActive) {
        button.classList.remove('active');
        button.innerHTML =
            '<i class="fas fa-volume-up"></i><span>Ativar acessibilidade por voz</span>';
    } else {
        button.classList.add('active');
        button.innerHTML =
            '<i class="fas fa-volume-off"></i><span>Desativar acessibilidade por voz</span>';
    }
}

function setLoadingState(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

window.cancelActivity = cancelActivity;
window.closeCancelModal = closeCancelModal;
window.confirmCancel = confirmCancel;
window.viewAllActivities = viewAllActivities;
window.closeCatalogModal = closeCatalogModal;
window.toggleVoiceAccessibility = toggleVoiceAccessibility;
