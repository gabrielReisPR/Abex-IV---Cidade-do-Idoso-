// Global variables
let currentSlide = 0;
const totalSlides = 3;
let autoSlideInterval;

// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // 1. O Leão de Chácara: Verifica autenticação antes de renderizar
    const isAuthenticated = await checkAuthentication();

    // Se não estiver autenticado, a função acima já redireciona.
    // Só inicializa a página se passar no teste.
    if (isAuthenticated) {
        initializeCarousel();
        setupEventListeners();
        initializeAccessibility();
    }
});

// --- LÓGICA DE AUTENTICAÇÃO ---

async function checkAuthentication() {
    const token = localStorage.getItem("token");

    if (!token) {
        console.warn("Nenhum token encontrado. Redirecionando para login.");
        window.location.href = "login.html";
        return false;
    }

    try {
        const base =
            typeof window.API_BASE_URL === 'string' && window.API_BASE_URL
                ? window.API_BASE_URL
                : 'http://localhost:8000';
        const response = await fetch(`${base}/users/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const userData = await response.json();

            if (userData.is_staff) {
                window.location.href = "funcionario-home.html";
                return false;
            }

            // Atualiza a interface com os dados do usuário
            const greetingElement = document.getElementById("user-greeting");
            const welcomeTitle = document.getElementById("welcome-title");

            // Prioriza o primeiro nome, se não tiver, usa o username
            const nomeExibicao = userData.first_name || userData.username;

            if (greetingElement) {
                greetingElement.textContent = `Olá, ${nomeExibicao}`;
                greetingElement.style.display = 'block';
            }
            if (welcomeTitle) {
                welcomeTitle.textContent = `Bem-vindo(a), ${nomeExibicao}!`;
            }

            return true;
        } else {
            // Token existe mas é inválido/expirado
            console.warn("Sessão inválida. Redirecionando para login.");
            localStorage.removeItem("token");
            window.location.href = "login.html";
            return false;
        }
    } catch (error) {
        console.error("Erro ao validar token com o servidor:", error);
        return true;
    }
}

function logout() {
    localStorage.removeItem("token");
    window.location.href = "login.html";
}

// Tornando o logout global para o botão HTML
window.logout = logout;


// --- LÓGICA DO CARROSSEL E NAVEGAÇÃO (Mantida) ---

function initializeCarousel() {
    startAutoSlide();
    const newsItems = document.querySelectorAll('.news-item');
    newsItems.forEach((item) => {
        item.addEventListener('click', function () {
            window.location.assign('noticias.html');
        });
    });
}

function startAutoSlide() {
    autoSlideInterval = setInterval(() => { nextSlide(); }, 3000);
}

function stopAutoSlide() { clearInterval(autoSlideInterval); }

function restartAutoSlide() {
    stopAutoSlide();
    startAutoSlide();
}

function showSlide(n) {
    const slides = document.querySelectorAll('.news-item');
    const dots = document.querySelectorAll('.dot');

    if (n >= totalSlides) currentSlide = 0;
    if (n < 0) currentSlide = totalSlides - 1;

    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));

    if (slides[currentSlide]) slides[currentSlide].classList.add('active');
    if (dots[currentSlide]) dots[currentSlide].classList.add('active');
}

function nextSlide() { currentSlide++; showSlide(currentSlide); }
function prevSlide() { currentSlide--; showSlide(currentSlide); restartAutoSlide(); }
function currentSlideFunc(n) { currentSlide = n - 1; showSlide(currentSlide); restartAutoSlide(); }

window.nextSlide = nextSlide;
window.prevSlide = prevSlide;
window.currentSlide = currentSlideFunc;

// --- FUNÇÕES DE ACESSIBILIDADE E UTILITÁRIOS ---

function toggleVoiceAccessibility() {
    const button = document.querySelector('.accessibility-btn');
    const isActive = button.classList.contains('active');

    if (isActive) {
        button.classList.remove('active');
        button.innerHTML = '<i class="fas fa-volume-up"></i><span>Ativar acessibilidade por voz</span>';
    } else {
        button.classList.add('active');
        button.innerHTML = '<i class="fas fa-volume-off"></i><span>Desativar acessibilidade por voz</span>';
    }
}
window.toggleVoiceAccessibility = toggleVoiceAccessibility;

function setupEventListeners() {
    const carousel = document.getElementById('newsCarousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', stopAutoSlide);
        carousel.addEventListener('mouseleave', startAutoSlide);
    }

    const infoCards = document.querySelectorAll('.info-card');
    infoCards.forEach((card, index) => {
        card.addEventListener('click', function () {
            switch (index) {
                case 0:
                    window.location.assign('atividades.html');
                    break;
                case 1:
                    window.location.assign('cardapio.html');
                    break;
                case 2:
                    window.location.assign('noticias.html');
                    break;
                default:
                    break;
            }
        });
        card.style.cursor = 'pointer';
    });
}

function initializeAccessibility() {
    document.addEventListener('keydown', function(event) {
        if (event.key === 'ArrowLeft') prevSlide();
        else if (event.key === 'ArrowRight') nextSlide();
    });

    const newsItems = document.querySelectorAll('.news-item');
    newsItems.forEach((item, index) => {
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.setAttribute('aria-label', `Notícia ${index + 1}: ${item.querySelector('h3').textContent}`);
        item.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                window.location.assign('noticias.html');
            }
        });
    });

    // Permite acionar os pontos do carrossel pelo teclado (Enter/Espaço).
    const dots = document.querySelectorAll('.carousel-dots .dot');
    dots.forEach((dot, index) => {
        dot.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                currentSlideFunc(index + 1);
            }
        });
    });
}

document.addEventListener('visibilitychange', function() {
    if (document.hidden) stopAutoSlide();
    else startAutoSlide();
});