(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // Inicializar Firebase Services
        const auth = firebase.auth();
        const db = firebase.firestore();
        
        // Obtener el contenedor principal 
        const mainApp = document.getElementById('main-app'); 

        // Elementos de la UI
        const productList = document.getElementById('product-list');
        const logoutButton = document.getElementById('logout-button');
        const saveProductButton = document.getElementById('save-product-button');
        const productForm = document.getElementById('product-form');
        const productNameInput = document.getElementById('product-name');
        const productCostInput = document.getElementById('product-cost');
        const productStockInput = document.getElementById('product-stock');
        const productProfitInput = document.getElementById('product-profit'); 
        const welcomeMessage = document.getElementById('welcome-message'); 
        const searchInput = document.getElementById('search-input'); 

        let productsCollection;
        let currentUser;
        let allProducts = [];

        // 1. AUTENTICACIÓN Y CARGA INICIAL (CORRECCIÓN DE SINCRONIZACIÓN)

        auth.onAuthStateChanged((user) => {
            if (user) {
                // Si el usuario está logueado, mostrar el contenido
                if (mainApp) {
                    mainApp.style.display = 'block'; 
                }
                
                currentUser = user;
                welcomeMessage.textContent = `Bienvenido, ${user.displayName || user.email}`;
                
                // IMPORTANTE: Asegúrate de que la colección es 'usuarios' o 'users' según tu configuración
                productsCollection = db.collection('usuarios').doc(currentUser.uid).collection('productos');
                
                // Iniciar la carga de productos y el listener de Firestore
                setupProductsListener();
            } else {
                // No hay usuario: Redirige al login
                window.location.href = "index.html"; 
            }
        });

        // 2. LÓGICA DE LA APLICACIÓN

        function setupProductsListener() {
            productsCollection.onSnapshot(snapshot => {
                allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderProducts(allProducts);
            }, error => {
                console.error("Error al escuchar productos: ", error);
            });
        }
        
        function renderProducts(products) {
            productList.innerHTML = '';
            if (products.length === 0) {
                productList.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay productos registrados.</td></tr>';
                return;
            }

            products.forEach(product => {
                //Usar 0 como valor predeterminado si el campo no existe o es inválido.
                const cost = parseFloat(product.cost) || 0;
                const profit = parseFloat(product.profit) || 0;
                
                //Cálculo del precio de venta seguro
                const price = cost * (1 + profit / 100); 
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Stock" class="text-right">${product.stock || 0}</td>
                    <td data-label="Nombre/Código">${product.name}</td>
                    <td data-label="Precio Venta" class="text-right font-weight-bold text-primary">$${price.toFixed(2)}</td>
                    <td data-label="Acciones" class="text-center">
                        <button class="btn btn-sm btn-info edit-product-button" data-id="${product.id}" data-toggle="modal" data-target="#productModal">Editar</button>
                        <button class="btn btn-sm btn-danger delete-product-button" data-id="${product.id}">Eliminar</button>
                    </td>
                `;
                productList.appendChild(tr);
            });
        }

        function filterProducts() {
            const searchTerm = searchInput.value.toLowerCase();
            const filteredProducts = allProducts.filter(product => 
                product.name.toLowerCase().includes(searchTerm)
            );
            renderProducts(filteredProducts);
        }

        // 3. EVENT LISTENERS

        saveProductButton.addEventListener('click', () => {
            const name = productNameInput.value.trim();
            const cost = parseFloat(productCostInput.value);
            const stock = parseInt(productStockInput.value);
            const profit = parseFloat(productProfitInput.value);
            const editId = saveProductButton.getAttribute('data-edit-id');

            if (!name || isNaN(cost) || isNaN(profit)) {
                alert('Por favor, completa todos los campos obligatorios (Nombre, Costo, Ganancia %).');
                return;
            }
            
            //Asegurar que stock sea un número válido, si no, usa 0
            const safeStock = isNaN(stock) ? 0 : stock;

            const productData = {
                name: name,
                cost: cost,
                stock: safeStock, 
                profit: profit,
                // Calcular y guardar el precio de venta final
                precioVenta: cost * (1 + profit / 100), 
            };

            const savePromise = editId 
                ? productsCollection.doc(editId).update(productData) 
                : productsCollection.add(productData); 

            savePromise
                .then(() => {
                    alert(`Producto ${editId ? 'actualizado' : 'guardado'} exitosamente!`);
                    $('#productModal').modal('hide'); 
                })
                .catch(error => {
                    console.error("Error al guardar el producto: ", error);
                    alert(`Error al guardar: ${error.message}`);
                });
        });

        // Cargar datos en el modal para editar y Eliminar producto
        productList.addEventListener('click', (e) => {
            const target = e.target;
            const id = target.getAttribute('data-id');

            if (target.classList.contains('edit-product-button')) {
                const product = allProducts.find(p => p.id === id);

                if (product) {
                    // Asegurar que se carguen valores numéricos para evitar errores de tipo en los inputs
                    productNameInput.value = product.name;
                    productCostInput.value = product.cost || 0;
                    productStockInput.value = product.stock || 0;
                    productProfitInput.value = product.profit || 0;
                    
                    saveProductButton.setAttribute('data-edit-id', id);
                    $('#productModalLabel').text('Editar Producto');
                    // El modal se abre por el data-target en el HTML
                }
            } else if (target.classList.contains('delete-product-button')) {
                if (confirm("⚠️ ADVERTENCIA: Esta acción es irreversible. ¿Estás seguro de que deseas ELIMINAR este producto?")) {
                    productsCollection.doc(id).delete()
                        .then(() => {
                            alert('Producto eliminado exitosamente.');
                        })
                        .catch(error => {
                            console.error("Error al eliminar el producto: ", error);
                            alert(`Error al eliminar: ${error.message}. Verifica tus reglas de seguridad.`);
                        });
                }
            }
        });

        // 4. UTILIDAD Y EVENTOS
        // Listener para el buscador

        searchInput.addEventListener('input', filterProducts);
        
        // Limpiar ID de edición al cerrar el modal
        $('#productModal').on('hidden.bs.modal', function () {
            productForm.reset();
            saveProductButton.removeAttribute('data-edit-id');
            $('#productModalLabel').text('Añadir/Editar Producto'); 
        });

        // Logout button
        logoutButton.addEventListener('click', () => {
            auth.signOut().catch((error) => {
                console.error('Logout error:', error);
                alert('Error al cerrar sesión.');
            });
        });
    });
})();