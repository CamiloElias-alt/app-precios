// Referencias a elementos
const form = document.getElementById("form-producto");
const lista = document.getElementById("lista-productos");
const buscador = document.getElementById("buscador");
const totalEl = document.getElementById("total");

// Cargar productos desde localStorage o iniciar vacío
let productos = JSON.parse(localStorage.getItem("productos")) || [];

// Cargar usuario de sesión
const usuario = JSON.parse(localStorage.getItem("usuario"));
if (usuario) {
  document.getElementById("usuario-logeado").textContent = "Bienvenido, " + usuario.nombre;
} else {
  // Si no hay sesión, volver al login
  window.location.href = "index.html";
}

// ------------------ FUNCIONES ------------------ //

// Guardar productos en localStorage
function guardarProductos() {
  localStorage.setItem("productos", JSON.stringify(productos));
}

// Renderizar productos en la tabla
function renderProductos(filtro = "") {
  lista.innerHTML = "";
  let totalGeneral = 0;

  // Filtrar productos por búsqueda
  productos
    .filter(p => p.nombre.toLowerCase().includes(filtro.toLowerCase()))
    .forEach((p, index) => {
      const precioVenta = p.precio + (p.precio * p.ganancia / 100);
      totalGeneral += precioVenta;

      // Crear fila de la tabla
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${p.nombre}</td>
        <td>$${p.precio.toFixed(2)}</td>
        <td>${p.ganancia}%</td>
        <td>$${precioVenta.toFixed(2)}</td>
        <td><button class="btn btn-danger btn-sm">🗑️ Eliminar</button></td>
      `;

      // Agregar evento al botón de eliminar
      fila.querySelector("button").addEventListener("click", () => {
        eliminarProducto(index);
      });

      lista.appendChild(fila);
    });

  totalEl.textContent = "Total General: $" + totalGeneral.toFixed(2);
}

// Eliminar producto
function eliminarProducto(index) {
  productos.splice(index, 1);
  guardarProductos();
  renderProductos(buscador.value);
}

// Cerrar sesión
function cerrarSesion() {
  localStorage.removeItem("usuario");
  window.location.href = "index.html";
}

// ------------------ EVENTOS ------------------ //

// Agregar producto
form.addEventListener("submit", e => {
  e.preventDefault();
  const nombre = document.getElementById("nombre").value.trim();
  const precio = parseFloat(document.getElementById("precio").value);
  const ganancia = parseFloat(document.getElementById("ganancia").value);

  if(nombre && precio > 0 && ganancia > 0) {
    productos.push({ nombre, precio, ganancia });
    guardarProductos();
    form.reset();
    renderProductos(); // Volver a renderizar toda la lista
  }
});

// Filtrar productos mientras se escribe
buscador.addEventListener("input", e => {
  renderProductos(e.target.value);
});

// ------------------ INICIALIZACIÓN ------------------ //

// Renderizar productos al cargar la página
renderProductos();