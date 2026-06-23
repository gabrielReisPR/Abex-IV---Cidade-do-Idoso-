document.addEventListener("DOMContentLoaded", () => {
    const resetForm = document.getElementById("resetForm");
    const novaSenhaInput = document.getElementById("novaSenha");
    const confirmarSenhaInput = document.getElementById("confirmarSenha");
    const submitBtn = document.getElementById("submitBtn");
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");
    const invalidMessage = document.getElementById("invalidMessage");

    const MIN_LEN = 4;

    // Lê o token da query string (?token=...).
    const params = new URLSearchParams(window.location.search);
    const token = (params.get("token") || "").trim();

    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.classList.add("show");
    };

    const clearError = () => {
        errorMessage.textContent = "";
        errorMessage.classList.remove("show");
        novaSenhaInput.classList.remove("error");
        confirmarSenhaInput.classList.remove("error");
    };

    // Sem token: não há como redefinir. Exibe aviso e esconde o formulário.
    if (!token) {
        resetForm.style.display = "none";
        invalidMessage.classList.add("show");
        invalidMessage.focus();
        return;
    }

    const handleReset = async (e) => {
        e.preventDefault();
        clearError();

        const novaSenha = novaSenhaInput.value;
        const confirmarSenha = confirmarSenhaInput.value;

        if (novaSenha.length < MIN_LEN) {
            showError(`A nova senha deve ter pelo menos ${MIN_LEN} caracteres.`);
            novaSenhaInput.classList.add("error");
            novaSenhaInput.focus();
            return;
        }

        if (novaSenha !== confirmarSenha) {
            showError("As senhas não coincidem. Digite a mesma senha nos dois campos.");
            confirmarSenhaInput.classList.add("error");
            confirmarSenhaInput.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.classList.add("loading");

        try {
            const response = await fetch(window.apiUrl('/password/reset'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    token: token,
                    nova_senha: novaSenha,
                }),
            });

            if (response.ok) {
                resetForm.style.display = "none";
                successMessage.classList.add("show");
                successMessage.focus();
            } else {
                let message = "Não foi possível redefinir a senha. O link pode ter expirado.";
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.message) {
                        message = errorData.message;
                    }
                } catch (parseError) {
                    /* mantém mensagem padrão */
                }
                showError(message);
                submitBtn.disabled = false;
                submitBtn.classList.remove("loading");
            }
        } catch (error) {
            showError("Não foi possível conectar ao servidor. Tente novamente mais tarde.");
            submitBtn.disabled = false;
            submitBtn.classList.remove("loading");
        }
    };

    resetForm.addEventListener("submit", handleReset);
});
