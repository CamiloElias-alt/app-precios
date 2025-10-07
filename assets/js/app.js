(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // Firebase services
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Elements from app-precios.html
        const productList = document.getElementById('product-list');
        const logoutButton = document.getElementById('logout-button');
        const saveProductButton = document.getElementById('save-product-button');
        const productForm = document.getElementById('product-form');
        const productNameInput = document.getElementById('product-name');
        const productPriceInput = document.getElementById('product-price');
        const productProfitInput = document.getElementById('product-profit');
        
        // Elementos MODIFICADOS/NUEVOS
        const welcomeMessage = document.getElementById('welcome-message'); // Elemento de bienvenida
        const searchInput = document.getElementById('search-input'); // Elemento del buscador

        let productsCollection;
        let currentUser;
        let allProducts = []; // Almacena todos los productos localmente

        // -----------------------------------------------------
        // 1. AUTENTICACIÓN Y CARGA INICIAL
        // -----------------------------------------------------

        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                
                // 📌 Mostrar el mensaje de bienvenida con el nombre del usuario
                welcomeMessage.textContent = user.displayName ? `¡Bienvenido, ${user.displayName}!` : `¡Bienvenido!`;
                
                // Referencia a la colección de productos del usuario
                productsCollection = db.collection('usuarios').doc(user.uid).collection('productos');
                
                loadProducts();
            } else {
                window.location.href = "index.html";
            }
        });

        function loadProducts() {
            productsCollection.orderBy('name').onSnapshot(snapshot => {
                allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                filterProducts(); 
            }, error => {
                console.error("Error al cargar productos:", error);
                alert("Error al cargar la lista de productos.");
            });
        }
        
        // -----------------------------------------------------
        // 2. FILTRADO Y RENDERIZADO
        // -----------------------------------------------------
        
        function filterProducts() {
            const searchText = searchInput.value.toLowerCase();

            const filteredProducts = allProducts.filter(product => {
                // Asegurar que el campo 'name' exista antes de llamar toLowerCase()
                return (product.name || '').toLowerCase().includes(searchText);
            });

            renderProductList(filteredProducts);
        }

        function renderProductList(products) {
    productList.innerHTML = ''; // Limpiar la lista actual

    if (products.length === 0) {
        // Asumiendo que 'productList' es el <tbody> de la tabla
        productList.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No hay productos registrados o no coinciden con la búsqueda.</td></tr>';
        return;
    }

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${product.name}</td>
            <td class="text-center">$${(product.finalPrice || 0).toFixed(2)}</td> 
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-warning edit-button" data-id="${product.id}">Editar</button>
                <button type="button" class="btn btn-sm btn-danger delete-button" data-id="${product.id}">Eliminar</button>
            </td>
        `;
        productList.appendChild(tr);
    });
}
        // -----------------------------------------------------
        // 3. LISTENERS: Guardar/Editar Producto
        // -----------------------------------------------------

        saveProductButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            
            // ✅ CLAVE: Asegurar la conversión de texto a número y usar 0 si está vacío.
            const name = productNameInput.value.trim();
            const price = parseFloat(productPriceInput.value) || 0; 
            const profit = parseFloat(productProfitInput.value) || 0;

            if (!name || price <= 0) {
                alert("Por favor, rellena el nombre y un precio de costo válido (mayor a 0).");
                return;
            }

            const finalPrice = price * (1 + profit / 100);
            
            const productData = {
                name: name,
                price: price, // Guardado como número
                profit: profit, // Guardado como número
                finalPrice: finalPrice // Guardado como número
            };

            const editId = saveProductButton.getAttribute('data-edit-id');

            let savePromise;

            if (editId) {
                // Modo Edición
                savePromise = productsCollection.doc(editId).update(productData);
            } else {
                // Modo Guardar Nuevo
                savePromise = productsCollection.add(productData);
            }

            savePromise
                .then(() => {
                    alert(`Producto "${name}" guardado exitosamente.`);
                    $('#productModal').modal('hide');
                    productForm.reset();
                    saveProductButton.removeAttribute('data-edit-id'); // Limpiar ID de edición
                })
                .catch((error) => {
                    console.error("Error al guardar el producto: ", error);
                    alert("Error al guardar el producto. Intenta de nuevo.");
                });
        });


        // -----------------------------------------------------
        // 4. LISTENERS: Eliminar y Editar
        // -----------------------------------------------------

        productList.addEventListener('click', (e) => {
            // Eliminar
            if (e.target.classList.contains('delete-button')) {
                const id = e.target.getAttribute('data-id');
                const product = allProducts.find(p => p.id === id);

                if (confirm(`¿Estás seguro de que deseas eliminar el producto: "${product.name}"?`)) {
                    productsCollection.doc(id).delete().then(() => {
                        // La lista se actualiza automáticamente con onSnapshot
                        alert(`Producto "${product.name}" eliminado.`);
                    }).catch(error => {
                        console.error("Error al eliminar el producto: ", error);
                        alert('Error al eliminar el producto.');
                    });
                }
            }

            // Editar
            if (e.target.classList.contains('edit-button')) {
                const id = e.target.getAttribute('data-id');
                
                // Usar la lista local para evitar otra llamada a Firebase
                const product = allProducts.find(p => p.id === id);

                if (product) {
                    // Rellenar el formulario con los datos
                    productNameInput.value = product.name;
                    // ✅ CLAVE: Usamos || 0 para evitar errores si la data vieja es nula/inválida
                    productPriceInput.value = (product.price || 0).toFixed(2);
                    productProfitInput.value = (product.profit || 0).toFixed(2);

                    // Guardar el id en el botón de guardar
                    saveProductButton.setAttribute('data-edit-id', id);

                    // Mostrar el modal
                    $('#productModal').modal('show');
                } else {
                    alert("No se pudo cargar el producto para editar.");
                }
            }
        });

        // Listener para el buscador
        searchInput.addEventListener('input', filterProducts);
        
        // Limpiar ID de edición al cerrar el modal
        $('#productModal').on('hidden.bs.modal', function () {
            productForm.reset();
            saveProductButton.removeAttribute('data-edit-id');
        });

        // 📌 Logout button
        logoutButton.addEventListener('click', () => {
            auth.signOut().catch((error) => {
                console.error('Logout error:', error);
                alert('Error al cerrar sesión.');
            });
        });
    });
})();