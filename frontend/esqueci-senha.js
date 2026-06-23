document.addEventListener("DOMContentLoaded", () => {
    const resetForm = document.getElementById("resetForm");
    const emailInput = document.getElementById("email");
    const submitBtn = document.getElementById("submitBtn");
    const errorMessage = document.getElementById("errorMessage");
    const successMessage = document.getElementById("successMessage");

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();

        errorMessage.classList.remove("show");
        emailInput.classList.remove("error");
        successMessage.classList.remove("show");

        const email = emailInput.value;

        if (!validateEmail(email)) {
            errorMessage.textContent = "Por favor, introduza um endereço de e-mail válido.";
            errorMessage.classList.add("show");
            emailInput.classList.add("error");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.classList.add("loading");

        const backendUrl = window.apiUrl('/password/reset-request');

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                }),
            });

            if (response.ok) {
                resetForm.style.display = "none";
                successMessage.classList.add("show");
                successMessage.focus();
            } else {
                let message = "Não foi possível processar o pedido. Tente novamente.";
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.message) {
                        message = errorData.message;
                    }
                } catch (parseError) {
                    /* mantém mensagem padrão */
                }
                errorMessage.textContent = message;
                errorMessage.classList.add("show");
                emailInput.classList.add("error");

                submitBtn.disabled = false;
                submitBtn.classList.remove("loading");
            }
        } catch (error) {
            errorMessage.textContent = "Não foi possível conectar ao servidor. Tente novamente mais tarde.";
            errorMessage.classList.add("show");
            emailInput.classList.add("error");

            submitBtn.disabled = false;
            submitBtn.classList.remove("loading");
        }
    };

    resetForm.addEventListener("submit", handlePasswordReset);
});