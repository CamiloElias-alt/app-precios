
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

        // Auth state listener
        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                
                // 📌 Mostrar el mensaje de bienvenida con el nombre del usuario
                if (user.displayName) {
                    welcomeMessage.textContent = `¡Bienvenido, ${user.displayName}!`;
                } else {
                    welcomeMessage.textContent = `¡Bienvenido!`;
                }

                productsCollection = db.collection('usuarios').doc(user.uid).collection('productos');
                setupProductListener();
            } else {
                window.location.href = 'index.html';
            }
        });

        // 🔍 Listener principal de Firestore (GUARDA todos los productos)
        function setupProductListener() {
            // Usa onSnapshot para obtener actualizaciones en tiempo real
            productsCollection.orderBy('name').onSnapshot((snapshot) => {
                allProducts = []; // Limpiar la lista antes de llenarla
                snapshot.forEach(doc => {
                    allProducts.push({ id: doc.id, ...doc.data() });
                });
                
                // Renderiza la lista con el filtro actual (vacío por defecto)
                renderProductList(allProducts, searchInput.value.trim());
            }, (error) => {
                console.error("Error fetching products: ", error);
                alert("Error al cargar los productos.");
            });
        }

        // 🔍 Función de Renderizado que maneja el FILTRO y la creación del HTML
        function renderProductList(products, searchTerm) {
            productList.innerHTML = ''; 
            
            const lowerCaseSearch = searchTerm.toLowerCase();
            
            // Aplica el filtro por nombre
            const filteredProducts = products.filter(product => 
                product.name.toLowerCase().includes(lowerCaseSearch)
            );

            if (filteredProducts.length === 0) {
                // El colspan se ajusta a las 3 columnas visibles
                productList.innerHTML = `<tr class="text-center"><td colspan="3" class="text-center">No se encontraron productos con el nombre "${searchTerm}".</td></tr>`; 
                return;
            }
            
            filteredProducts.forEach(product => {
                // Calcular el precio de venta (la lógica se mantiene)
                const sellingPrice = product.price + (product.price * product.profit / 100);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td data-label="Producto">${product.name}</td>
                    <td class="text-center" data-label="Precio Venta">$${sellingPrice.toFixed(2)}</td>
                    <td class="text-center" data-label="Acciones">
                        <button class="btn btn-warning btn-sm edit-button" data-id="${product.id}">Editar</button>
                        <button class="btn btn-danger btn-sm delete-button" data-id="${product.id}">Eliminar</button>
                    </td>
                `;
                productList.appendChild(row);
            });
        }
        
        // 🔍 Listener para el campo de búsqueda: filtra en tiempo real
        searchInput.addEventListener('input', () => {
            renderProductList(allProducts, searchInput.value.trim());
        });

        // 📌 Guardar nuevo producto o editar existente
        saveProductButton.addEventListener('click', () => {
            const name = productNameInput.value.trim();
            const price = parseFloat(productPriceInput.value);
            const profit = parseFloat(productProfitInput.value);
            const editId = saveProductButton.getAttribute('data-edit-id'); 

            if (name && !isNaN(price) && price > 0 && !isNaN(profit) && profit >= 0) {
                if (editId) {
                    // 🔄 Editar producto existente
                    productsCollection.doc(editId).update({ name, price, profit })
                        .then(() => {
                            productForm.reset();
                            saveProductButton.removeAttribute('data-edit-id');
                            $('#productModal').modal('hide');
                        })
                        .catch((error) => {
                            console.error("Error updating product: ", error);
                            alert("Error al actualizar el producto.");
                        });
                } else {
                    // ➕ Guardar nuevo producto
                    productsCollection.add({ name, price, profit })
                        .then(() => {
                            productForm.reset();
                            $('#productModal').modal('hide');
                        })
                        .catch((error) => {
                            console.error("Error adding product: ", error);
                            alert("Error al guardar el producto.");
                        });
                }
            } else {
                alert("Por favor, completa todos los campos correctamente.");
            }
        });

        // 📌 Eventos en la tabla (Editar y Eliminar)
        productList.addEventListener('click', (e) => {
            // Eliminar
            if (e.target.classList.contains('delete-button')) {
                const id = e.target.getAttribute('data-id');
                if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                    productsCollection.doc(id).delete().catch((error) => {
                        console.error("Error deleting product: ", error);
                        alert('Error al eliminar el producto.');
                    });
                }
            }

            // Editar
            if (e.target.classList.contains('edit-button')) {
                const id = e.target.getAttribute('data-id');

                productsCollection.doc(id).get().then(doc => {
                    if (doc.exists) {
                        const product = doc.data();

                        // Rellenar el formulario con los datos
                        productNameInput.value = product.name;
                        productPriceInput.value = product.price;
                        productProfitInput.value = product.profit;

                        // Guardar el id en el botón de guardar
                        saveProductButton.setAttribute('data-edit-id', id);

                        // Mostrar el modal
                        $('#productModal').modal('show');
                    }
                }).catch(error => {
                    console.error("Error al obtener el producto: ", error);
                    alert("No se pudo cargar el producto para editar.");
                });
            }
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