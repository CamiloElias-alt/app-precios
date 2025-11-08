(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // Firebase services
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Obtener el contenedor principal
        const mainApp = document.getElementById('main-app'); 

        // Elementos de la UI
        const welcomeMessage = document.getElementById('welcome-message');
        const logoutButton = document.getElementById('logout-button');
        
        // ELEMENTOS DEL BUSCADOR
        const productSearchInput = document.getElementById('product-search');
        const productOptionsList = document.getElementById('product-options'); 
        
        const productQuantityInput = document.getElementById('product-quantity');
        const addProductButton = document.getElementById('add-product-button');
        const orderList = document.getElementById('order-list');
        
        // ELEMENTOS DE VENTA
        const totalFinalInput = document.getElementById('total-final');
        const saveSaleButton = document.getElementById('save-sale-button');

        let productsCollection;
        let salesCollection;
        let currentUser;
        let allProducts = []; 
        let currentOrder = []; 
        const deleteButton = document.getElementById('delete-old-sales-button');

deleteButton.addEventListener('click', async () => {
    if (!confirm("¿Está seguro de que desea eliminar TODAS las ventas anteriores a 30 días? ¡Esta acción no se puede deshacer!")) {
        return;
    }

    try {
        const thirtyDaysAgo = new Date();
        // Establece la fecha límite a 30 días atrás
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const timestampLimit = firebase.firestore.Timestamp.fromDate(thirtyDaysAgo);

        // 1. Consultar las ventas a eliminar
        const snapshotToDelete = await salesCollection
            .where('fechaVenta', '<', timestampLimit)
            .get();

        if (snapshotToDelete.empty) {
            alert('✅ No se encontraron ventas para eliminar.');
            return;
        }

        const batch = db.batch(); 
        let deleteCount = 0;

        snapshotToDelete.docs.forEach(doc => {
            batch.delete(doc.ref);
            deleteCount++;
        });

        await batch.commit();

        alert(`✅ Se han eliminado ${deleteCount} registros de ventas anteriores a ${thirtyDaysAgo.toLocaleDateString()}.`);
        
    } catch (error) {
        console.error("Error al borrar ventas antiguas:", error);
        alert("⚠️ Ocurrió un error al intentar borrar los registros.");
    }
});

        // 1. AUTENTICACIÓN Y CARGA INICIAL

        auth.onAuthStateChanged((user) => {
            if (user) {
                if (mainApp) {
                    mainApp.style.display = 'block'; 
                }
                currentUser = user;
                welcomeMessage.textContent = `Bienvenido, ${user.displayName || user.email}`;
                
                productsCollection = db.collection('usuarios').doc(currentUser.uid).collection('productos');
                salesCollection = db.collection('usuarios').doc(currentUser.uid).collection('ventas');

                loadProducts();
                setupListeners();
            } else {
                window.location.href = "index.html"; 
            }
        });

        // 2. LÓGICA DE PRODUCTOS Y VISTA

        function loadProducts() {
            productsCollection.get().then(snapshot => {
                allProducts = [];
                productOptionsList.innerHTML = '';
                
                snapshot.forEach(doc => {
                    const product = doc.data();
                    product.id = doc.id;
                    
                    if ((product.stock || 0) > 0) {
                        allProducts.push(product);

                        const safeSalePrice = product.precioVenta || (product.cost * (1 + ((product.profit || 0) / 100)));
                        const formattedPrice = formatCurrency(safeSalePrice);
                        
                        const option = document.createElement('option');
                        
                        // Formato: Nombre del Producto 
                        option.value = `${product.name} [${formattedPrice}]`; 
                        option.setAttribute('data-id', product.id);
                        
                        productOptionsList.appendChild(option);
                    }
                });
            }).catch(error => {
                console.error("Error al cargar productos:", error);
                alert("Error al cargar la lista de productos.");
            });
        }
        
        function renderOrderList() {
            orderList.innerHTML = '';
            if (currentOrder.length === 0) {
                orderList.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Añade productos a la venta.</td></tr>';
                return;
            }

            currentOrder.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td data-label="Producto">${item.name}</td>
                    <td data-label="Precio Unitario" class="text-right">${formatCurrency(item.salePrice)}</td>
                    <td data-label="Cantidad" class="text-right">${item.quantity}</td>
                    <td data-label="Subtotal" class="text-right font-weight-bold">${formatCurrency(item.subtotal)}</td>
                    <td data-label="Acciones" class="text-center">
                        <button class="btn btn-sm btn-danger remove-item-button" data-index="${index}">Quitar</button>
                    </td>
                `;
                orderList.appendChild(tr);
            });
        }

        function calculateTotals() {
            let total = currentOrder.reduce((sum, item) => sum + (item.subtotal || 0), 0);
            
            // Asegurar que total es un número válido
            total = isNaN(total) ? 0 : total;

            totalFinalInput.value = formatCurrency(total);
        }

        // 3. LISTENERS Y MANEJADORES DE EVENTOS

        function setupListeners() {
            addProductButton.addEventListener('click', addProductToOrder);
            orderList.addEventListener('click', removeItemFromOrder);
            saveSaleButton.addEventListener('click', saveSale); 
            
            logoutButton.addEventListener('click', () => {
                auth.signOut().catch((error) => {
                    console.error('Logout error:', error);
                    alert('Error al cerrar sesión.');
                });
            });
        }
        
        function addProductToOrder() {
            const searchTerms = productSearchInput.value.trim();
            const quantity = parseInt(productQuantityInput.value);

            if (!searchTerms || isNaN(quantity) || quantity <= 0) {
                alert('Ingresa un producto y una cantidad válida (mayor a 0).');
                return;
            }

            // Buscar la opción seleccionada por el valor
            const selectedOption = Array.from(productOptionsList.options).find(option => 
                option.value === searchTerms
            );
            
            if (!selectedOption) {
                alert('Producto no encontrado. Selecciona una opción válida de la lista.');
                return;
            }

            const productId = selectedOption.getAttribute('data-id');
            const product = allProducts.find(p => p.id === productId);

            if (!product) {
                alert('Error interno: Producto no encontrado en el inventario.');
                return;
            }

            // Validación de Stock
            if (quantity > (product.stock || 0)) {
                alert(`Stock insuficiente. Solo quedan ${product.stock || 0} unidades de ${product.name}.`);
                return;
            }
            
            // Lógica para agregar o actualizar
            const existingItem = currentOrder.find(item => item.id === productId);
            
            const salePrice = product.precioVenta || (product.cost * (1 + ((product.profit || 0) / 100)));

            if (existingItem) {
                 // Verificar stock acumulado antes de actualizar
                if ((existingItem.quantity + quantity) > (product.stock || 0)) {
                     alert(`Stock insuficiente para añadir ${quantity} más.`);
                     return;
                }
                existingItem.quantity += quantity;
                existingItem.subtotal = existingItem.quantity * salePrice;
            } else {
                currentOrder.push({
                    id: product.id,
                    name: product.name,
                    quantity: quantity,
                    cost: product.cost || 0,
                    profit: product.profit || 0,
                    salePrice: salePrice,
                    subtotal: quantity * salePrice
                });
            }

            productSearchInput.value = '';
            productQuantityInput.value = '1';
            
            renderOrderList();
            calculateTotals();
        }

        function removeItemFromOrder(e) {
            const target = e.target.closest('.remove-item-button');
            if (target) {
                const index = parseInt(target.getAttribute('data-index'));
                currentOrder.splice(index, 1);
                renderOrderList();
                calculateTotals();
            }
        }

        // 4. GUARDAR VENTA

        function saveSale() {
            if (currentOrder.length === 0) {
                alert('Debes añadir al menos un producto para registrar la venta.');
                return;
            }
            
            const totalSaleAmount = parseFloat(totalFinalInput.value.replace('$', ''));
            if (isNaN(totalSaleAmount) || totalSaleAmount <= 0) {
                 alert('El monto total de la venta debe ser mayor a $0.00.');
                 return;
            }

            // Deshabilitar botón para evitar doble envío
            saveSaleButton.disabled = true;
            saveSaleButton.textContent = 'Procesando...';

            db.runTransaction(transaction => {
                let totalCost = 0;
                
                const stockPromises = currentOrder.map(item => {
                    const productRef = productsCollection.doc(item.id);
                    return transaction.get(productRef).then(doc => {
                        if (!doc.exists) {
                            throw new Error(`El producto ${item.name} no existe en el inventario.`);
                        }
                        const currentStock = doc.data().stock || 0;
                        if (currentStock < item.quantity) {
                            throw new Error(`Stock insuficiente para ${item.name}. Solo quedan ${currentStock}.`);
                        }
                        totalCost += item.cost * item.quantity;
                        
                        transaction.update(productRef, {
                            stock: currentStock - item.quantity
                        });
                    });
                });
                
                return Promise.all(stockPromises).then(() => {
                    const totalProfit = totalSaleAmount - totalCost; 

                    const saleData = {
                        productos: currentOrder, 
                        fechaVenta: firebase.firestore.FieldValue.serverTimestamp(),
                        totalVenta: totalSaleAmount,
                        costoTotal: totalCost,
                        gananciaNeta: totalProfit,
                        tipoVenta: 'CONTADO',
                        vendedorUid: currentUser.uid
                    };
                    
                    const newSaleRef = salesCollection.doc();
                    transaction.set(newSaleRef, saleData);
                });

            })
            .then(() => {
                alert('Venta registrada y stock actualizado exitosamente!');
                resetForm();
                loadProducts(); 
            })
            .catch((error) => {
                console.error("Error en la transacción de venta:", error);
                const errorMessage = error.message.includes('Stock insuficiente') ? error.message : `Error desconocido. Mensaje: ${error.message}`;
                alert(`⚠️ ¡ERROR AL REGISTRAR VENTA! ${errorMessage}. La operación fue revertida.`); 
            })
            .finally(() => {
                saveSaleButton.disabled = false;
                saveSaleButton.textContent = 'Registrar Venta Contado';
            });
        }

        // 5. UTILIDAD Y FORMATO

        function resetForm() {
            productSearchInput.value = '';
            productQuantityInput.value = '1';
            
            currentOrder = []; 
            renderOrderList();
            calculateTotals(); 
        }

        function formatCurrency(value) {
            const safeValue = isNaN(value) ? 0 : value;
            return `$${safeValue.toFixed(2)}`;
        }
        
        calculateTotals(); 
    });
})();