
document.addEventListener('DOMContentLoaded', () => {
    const formTitle = document.getElementById("form-title");
    const nameInput = document.getElementById("nameInput");
    const emailInput = document.getElementById("emailInput");
    const passwordInput = document.getElementById("passwordInput");
    const authButton = document.getElementById("auth-button");
    const authLink = document.getElementById("auth-link");
    const authLinkContainer = document.getElementById("auth-link-container");

    let isRegistering = false;

    function updateUI() {
        if (isRegistering) {
            formTitle.textContent = "✍️ Registrarse";
            nameInput.style.display = 'block';
            nameInput.required = true;
            authButton.textContent = 'Registrarme';
            authLinkContainer.innerHTML = '¿Ya tienes cuenta? <a href="#" id="auth-link">Inicia Sesión</a>';
        } else {
            formTitle.textContent = "🔐 Iniciar Sesión";
            nameInput.style.display = 'none';
            nameInput.required = false;
            authButton.textContent = 'Ingresar';
            authLinkContainer.innerHTML = '¿No tienes cuenta? <a href="#" id="auth-link">Regístrate</a>';
        }
        // Re-attach listener to the new link
        document.getElementById('auth-link').addEventListener('click', toggleAuthMode);
    }

    function toggleAuthMode(e) {
        e.preventDefault();
        isRegistering = !isRegistering;
        updateUI();
    }
    
    authLink.addEventListener('click', toggleAuthMode);

    authButton.addEventListener("click", (e) => {
        e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (isRegistering) {
            const name = nameInput.value.trim();
            if (!name || !email || !password) {
                alert("Por favor, completa todos los campos para registrarte.");
                return;
            }
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    return userCredential.user.updateProfile({
                        displayName: name
                    });
                })
                .then(() => {
                    window.location.href = "app-precios.html";
                })
                .catch((error) => {
                    alert(`Error al registrar: ${error.message}`);
                });

        } else {
            if (!email || !password) {
                alert("Por favor, ingresa tu correo y contraseña.");
                return;
            }
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(() => {
                    window.location.href = "app-precios.html";
                })
                .catch((error) => {
                    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                        alert('Usuario o contraseña incorrectos. Por favor, verifica tus datos o regístrate.');
                    } else {
                        alert(`Error al iniciar sesión: ${error.message}`);
                    }
                });
        }
    });

    updateUI(); // Initial UI setup
});
