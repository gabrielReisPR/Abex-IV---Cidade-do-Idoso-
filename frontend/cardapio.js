const API_BASE =
    typeof window.API_BASE_URL === 'string' && window.API_BASE_URL
        ? window.API_BASE_URL
        : 'http://localhost:8000';

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text == null ? '' : String(text);
    return d.innerHTML;
}

function toggleVoiceAccessibility() {
    const button = document.querySelector('.accessibility-btn');
    if (!button) return;
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

window.toggleVoiceAccessibility = toggleVoiceAccessibility;

function groupByDay(itens) {
    const map = new Map();
    itens.forEach((item) => {
        const key = item.ordem_dia;
        if (!map.has(key)) {
            map.set(key, { dia: item.dia, ordem_dia: key, refeicoes: [] });
        }
        map.get(key).refeicoes.push(item);
    });
    return Array.from(map.values()).sort((a, b) => a.ordem_dia - b.ordem_dia);
}

function renderCardapio(itens) {
    const container = document.getElementById('cardapioContainer');
    if (!itens || itens.length === 0) {
        container.innerHTML =
            '<p class="cardapio-empty">Nenhum item de cardápio disponível no momento.</p>';
        return;
    }

    const grupos = groupByDay(itens);
    container.innerHTML = '';

    grupos.forEach((grupo) => {
        const block = document.createElement('section');
        block.className = 'cardapio-day-block';
        block.innerHTML = `
            <h3 class="cardapio-day-title">
                <i class="fas fa-calendar-day" aria-hidden="true"></i>
                ${escapeHtml(grupo.dia)}
            </h3>
            <div class="cardapio-meals"></div>
        `;
        const mealsEl = block.querySelector('.cardapio-meals');

        grupo.refeicoes.forEach((item) => {
            const card = document.createElement('article');
            card.className = 'cardapio-meal-card';
            const imgSrc =
                typeof window.apiUrl === 'function'
                    ? window.apiUrl(item.imagem_url)
                    : item.imagem_url;
            card.innerHTML = `
                <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.refeicao + ' — ' + item.titulo)}">
                <div class="cardapio-meal-body">
                    <span class="cardapio-meal-badge">${escapeHtml(item.refeicao)}</span>
                    <h3>${escapeHtml(item.titulo)}</h3>
                    <p>${escapeHtml(item.descricao)}</p>
                </div>
            `;
            mealsEl.appendChild(card);
        });

        container.appendChild(block);
    });
}

async function loadCardapio() {
    const spinner = document.getElementById('loadingSpinner');
    const errEl = document.getElementById('errorMessage');
    const container = document.getElementById('cardapioContainer');

    errEl.classList.remove('show');
    errEl.textContent = '';
    spinner.classList.add('show');
    container.innerHTML = '';

    try {
        const response = await fetch(`${API_BASE}/cardapio/`);
        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            const msg =
                typeof data.detail === 'string'
                    ? data.detail
                    : 'Não foi possível carregar o cardápio.';
            errEl.textContent = msg;
            errEl.classList.add('show');
            return;
        }
        const data = await response.json();
        renderCardapio(data.itens || []);
    } catch {
        errEl.textContent =
            'Não foi possível conectar ao servidor. Verifique se o backend está rodando.';
        errEl.classList.add('show');
    } finally {
        spinner.classList.remove('show');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCardapio();
});
