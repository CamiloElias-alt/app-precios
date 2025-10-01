const form = document.getElementById("login-form");

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const nombre = document.getElementById("nombre").value.trim();
      const correo = document.getElementById("correo").value.trim();
      const contrasena = document.getElementById("contrasena").value;

      if (nombre && correo && contrasena) {
    // Guardar datos del usuario
    localStorage.setItem("usuario", JSON.stringify({ nombre, correo }));

    // Redirigir a la app de precios
    window.location.href = "app-precios.html";
  } else {
    alert("Por favor, completa todos los campos.");
  }
});