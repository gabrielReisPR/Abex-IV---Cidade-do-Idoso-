// --- FUNÇÕES GLOBAIS DE UTILIDADE E NAVEGAÇÃO ---
// showNotification: stub em disable-floating-toast.js (sem toast no canto da tela)

function navigateToHome() {
    window.location.href = 'home.html';
}

function navigateToActivities() {
    window.location.href = 'atividades.html';
}

function navigateToMenu() {
    window.location.href = 'cardapio.html';
}

function navigateToNews() {
    window.location.href = 'noticias.html';
}

window.navigateToHome = navigateToHome;
window.navigateToActivities = navigateToActivities;
window.navigateToMenu = navigateToMenu;
window.navigateToNews = navigateToNews;


// --- LÓGICA DA PÁGINA DE LOGIN ---

document.addEventListener("DOMContentLoaded", () => {
    const idosoBtn = document.getElementById("idoso-btn");
    const funcionarioBtn = document.getElementById("funcionario-btn");
    const cpfUsuarioInput = document.getElementById("cpfUsuario");
    const submitBtn = document.getElementById("submit-btn");
    const loginForm = document.getElementById("login-form");
    const feedbackMessage = document.getElementById("feedback-message");

    let userType = "idoso"; // Estado inicial

    const updateUI = () => {
        if (userType === "idoso") {
            idosoBtn.classList.add("active");
            funcionarioBtn.classList.remove("active");
            cpfUsuarioInput.placeholder = "Digite seu E-mail"; // Ajustado visualmente para combinar com o backend
            submitBtn.textContent = "Entrar como Idoso";
        } else {
            idosoBtn.classList.remove("active");
            funcionarioBtn.classList.add("active");
            cpfUsuarioInput.placeholder = "Digite seu E-mail de funcionário";
            submitBtn.textContent = "Entrar como Funcionário";
        }
    };

    idosoBtn.addEventListener("click", () => { userType = "idoso"; updateUI(); });
    funcionarioBtn.addEventListener("click", () => { userType = "funcionario"; updateUI(); });

    const handleLogin = async (e) => {
        e.preventDefault();

        // Limpa mensagens anteriores
        feedbackMessage.textContent = "";
        feedbackMessage.className = "feedback-message";

        const cpfUsuario = cpfUsuarioInput.value;
        const senha = document.getElementById("senha").value;

        const base = typeof window.API_BASE_URL === 'string' && window.API_BASE_URL ? window.API_BASE_URL : 'http://localhost:8000';
        const backendUrl = `${base}/auth/token`;

        // Prepara os dados no formato que o OAuth2 exige
        const formData = new URLSearchParams();
        formData.append("username", cpfUsuario); // Lembrando que no seu backend isso recebe o email
        formData.append("password", senha);

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();

                if (data.access_token) {
                    localStorage.setItem("token", data.access_token);
                }
                if (data.refresh_token) {
                    localStorage.setItem("refresh_token", data.refresh_token);
                }

                submitBtn.disabled = true;
                feedbackMessage.classList.remove("error");
                feedbackMessage.classList.add("success", "is-pending");
                feedbackMessage.textContent = "Entrando…";

                try {
                    const meRes = await fetch(`${base}/users/me`, {
                        headers: {
                            Authorization: `Bearer ${data.access_token}`,
                        },
                    });
                    if (meRes.ok) {
                        const me = await meRes.json();
                        if (userType === "funcionario" && !me.is_staff) {
                            localStorage.removeItem("token");
                            localStorage.removeItem("refresh_token");
                            submitBtn.disabled = false;
                            feedbackMessage.classList.remove("success", "is-pending");
                            feedbackMessage.textContent =
                                "Esta conta não está habilitada como funcionário. Procure a administração.";
                            feedbackMessage.classList.add("error");
                            return;
                        }
                        if (me.is_staff) {
                            feedbackMessage.textContent = "Abrindo o painel da equipe…";
                            window.location.assign("funcionario-home.html");
                            return;
                        }
                    }
                } catch (_) {
                    /* fallback para área do participante */
                }

                feedbackMessage.textContent = "Abrindo a área do participante…";
                window.location.assign("home.html");

            } else {
                const errorData = await response.json();
                feedbackMessage.textContent = errorData.detail || "Usuário ou senha incorretos.";
                feedbackMessage.classList.add("error");
            }
        } catch (error) {
            feedbackMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente mais tarde.";
            feedbackMessage.classList.add("error");
        }
    };

    loginForm.addEventListener("submit", handleLogin);
    updateUI();
});