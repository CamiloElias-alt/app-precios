// Contenido completo de clienstes.js
(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // Firebase services
        const auth = firebase.auth();
        const db = firebase.firestore();

        // 📌 Elementos de la UI
        const welcomeMessage = document.getElementById('welcome-message');
        
        // ELEMENTOS DEL BUSCADOR (NUEVOS)
        const productSearchInput = document.getElementById('product-search'); // Campo de texto para buscar
        const productOptionsList = document.getElementById('product-options'); // Datalist para sugerencias
        const selectedProductIdInput = document.getElementById('selected-product-id'); // ID oculto
        // FIN ELEMENTOS DEL BUSCADOR
        
        // const productSelect = document.getElementById('product-select'); // REMOVIDO
        const productQuantityInput = document.getElementById('product-quantity');
        const addProductButton = document.getElementById('add-product-button');
        const orderList = document.getElementById('order-list');
        const totalSubtotalInput = document.getElementById('total-subtotal');
        
        // ELEMENTOS MODIFICADOS: CUOTAS en lugar de Descuento
        const monthlyInstallmentsInput = document.getElementById('monthly-installments'); // NUEVO
        const installmentAmountLabel = document.getElementById('installment-amount'); // NUEVO
        
        const totalFinalInput = document.getElementById('total-final');
        const interestRateInput = document.getElementById('interest-rate');
        const totalInterestInput = document.getElementById('total-interest');
        const clientNameInput = document.getElementById('client-name');
        const saveDebtButton = document.getElementById('save-debt-button');
        const logoutButton = document.getElementById('logout-button');
        // ELIMINADAS: La barra de progreso y el contenedor de descuento ya no existen en el HTML

        let productsCollection;
        let debtsCollection;
        let currentUser;
        let allAvailableProducts = []; 
        let currentOrder = []; 

        // -----------------------------------------------------
        // 1. AUTENTICACIÓN Y CARGA INICIAL
        // -----------------------------------------------------

        auth.onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                welcomeMessage.textContent = user.displayName ? `¡Bienvenido, ${user.displayName}!` : `¡Bienvenido!`;
                
                productsCollection = db.collection('usuarios').doc(user.uid).collection('productos');
                debtsCollection = db.collection('usuarios').doc(user.uid).collection('deudasClientes');
                
                loadProducts(); 
            } else {
                window.location.href = "index.html";
            }
        });

        // Carga los productos de Firebase y los pone en la <datalist>
        function loadProducts() {
            if (!productSearchInput || !productOptionsList) {
                console.error("Error: Los elementos de búsqueda de producto no fueron encontrados en el DOM.");
                return;
            }

            productsCollection.onSnapshot(snapshot => {
                allAvailableProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // **ACTUALIZACIÓN CLAVE: Llenar la DATALIST**
                productOptionsList.innerHTML = '';
                
                allAvailableProducts.forEach(product => {
                    const option = document.createElement('option');
                    // El valor es lo que el usuario ve y se copia al input al seleccionar
                    const displayValue = `${product.name} - $${(product.finalPrice || 0).toFixed(2)}`;
                    option.value = displayValue;
                    
                    productOptionsList.appendChild(option);
                });
            }, error => {
                console.error("Error al cargar productos:", error);
                alert("Error al cargar la lista de productos. Verifica tus reglas de lectura en Firebase.");
            });
        }
        
        // -----------------------------------------------------
        // 2. LÓGICA DEL BUSCADOR Y AÑADIR PRODUCTO
        // -----------------------------------------------------

        // Listener para mapear el valor del input al ID real del producto
        productSearchInput.addEventListener('input', () => {
            const selectedNamePrice = productSearchInput.value.trim();
            
            // Buscar si el texto del input coincide con un valor de producto en la lista local
            const product = allAvailableProducts.find(p => {
                const productDisplayValue = `${p.name} - $${(p.finalPrice || 0).toFixed(2)}`;
                return productDisplayValue === selectedNamePrice;
            });
            
            if (product) {
                // Almacena el ID del producto seleccionado en el campo oculto
                selectedProductIdInput.value = product.id; 
            } else {
                // Si el usuario borra o escribe algo que no existe, resetea el ID
                selectedProductIdInput.value = '';
            }
        });


        addProductButton.addEventListener('click', () => {
            // Usar el ID guardado en el campo oculto
            const productId = selectedProductIdInput.value; 
            const quantity = parseFloat(productQuantityInput.value) || 0; 

            if (!productId || quantity <= 0) {
                alert('Selecciona un producto y una cantidad válida. Por favor, usa el buscador para seleccionar de la lista.');
                return;
            }

            const product = allAvailableProducts.find(p => p.id === productId);

            if (product) {
                // Usa product.finalPrice para el cálculo
                const productSalesPrice = parseFloat(product.finalPrice || 0); 
                
                if (productSalesPrice <= 0) {
                    alert('⚠️ Advertencia: El producto no tiene un precio de venta registrado. El subtotal será $0.00.');
                }
                
                const subtotalProducto = quantity * productSalesPrice; 
                
                currentOrder.push({
                    id: productId,
                    name: product.name,
                    quantity: quantity,
                    price: productSalesPrice,
                    subtotal: subtotalProducto,
                });

                // Limpiar el formulario y los campos del buscador
                productQuantityInput.value = '1';
                productSearchInput.value = ''; // Limpiar el campo de búsqueda
                selectedProductIdInput.value = ''; // Limpiar el ID oculto

                renderOrderList();
                updateTotals(); 
            } else {
                alert('Producto no encontrado. Selecciona de la lista de sugerencias.');
            }
        });

        // -----------------------------------------------------
        // 3. CÁLCULO Y RENDERIZADO
        // -----------------------------------------------------

        // Renderiza la lista de productos en la orden actual
        function renderOrderList() {
            orderList.innerHTML = '';
            if (currentOrder.length === 0) {
                orderList.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Aún no hay productos en la orden.</td></tr>';
                return;
            }
            currentOrder.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.name}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">$${item.price.toFixed(2)}</td>
                    <td class="text-right">$${item.subtotal.toFixed(2)}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-danger remove-item-button" data-index="${index}">Eliminar</button>
                    </td>
                `;
                orderList.appendChild(tr);
            });
        }

        // Calcula y actualiza el subtotal, descuento, interés y total final
        function updateTotals() {
            // MODIFICACIÓN: Usamos Número de Cuotas en lugar de Descuento Porcentual
            const numInstallments = parseFloat(monthlyInstallmentsInput.value) || 1;
            const interestRate = parseFloat(interestRateInput.value) || 0;
            
            // Asegurar que las cuotas sean al menos 1
            const safeNumInstallments = Math.max(1, numInstallments);

            // 1. Subtotal
            const subtotalCompra = currentOrder.reduce((sum, item) => sum + item.subtotal, 0);
            
            // 2. Total después de subtotal (El descuento ya no aplica, es el subtotal)
            const totalDespuesDescuento = subtotalCompra; // Sin descuento

            // 3. Interés
            const totalInterest = totalDespuesDescuento * (interestRate / 100);
            
            // 4. Total Final (EL MONTO TOTAL DE LA DEUDA)
            const totalFinal = totalDespuesDescuento + totalInterest;

            // 5. NUEVA LÓGICA: Monto por Cuota
            const installmentAmount = totalFinal / safeNumInstallments;


            // 6. Actualizar la UI
            totalSubtotalInput.value = `$${subtotalCompra.toFixed(2)}`;
            // REEMPLAZADO: Muestra el monto de la cuota en lugar del descuento
            installmentAmountLabel.value = `$${installmentAmount.toFixed(2)}`;
            
            totalInterestInput.value = `$${totalInterest.toFixed(2)}`;
            totalFinalInput.value = `$${totalFinal.toFixed(2)}`;
            
            // ELIMINADA: La lógica de la barra de progreso de descuento ya no existe.

            // Habilitar/Deshabilitar el botón de guardar
            saveDebtButton.disabled = currentOrder.length === 0 || totalFinal <= 0;
        }

        // Event Listeners para actualizar totales al cambiar cuotas o interés
        monthlyInstallmentsInput.addEventListener('input', updateTotals);
        interestRateInput.addEventListener('input', updateTotals);

        // Event Listener para eliminar un producto de la orden
        orderList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-item-button')) {
                const index = parseInt(e.target.getAttribute('data-index'));
                currentOrder.splice(index, 1);
                renderOrderList();
                updateTotals();
            }
        });

        // -----------------------------------------------------
        // 4. GUARDAR DEUDA
        // -----------------------------------------------------

        saveDebtButton.addEventListener('click', () => {
            if (saveDebtButton.disabled) return;
            
            const clientName = clientNameInput.value.trim();
            if (!clientName) {
                alert("Por favor, ingresa el nombre del cliente.");
                return;
            }

            // Recalcular todos los totales antes de guardar para asegurar la precisión
            const numInstallments = parseFloat(monthlyInstallmentsInput.value) || 1;
            const interestRate = parseFloat(interestRateInput.value) || 0;
            const subtotalCompra = currentOrder.reduce((sum, item) => sum + item.subtotal, 0);
            
            // Sin Descuento
            const totalDespuesDescuento = subtotalCompra; 
            
            const totalInterest = totalDespuesDescuento * (interestRate / 100);
            const totalFinal = totalDespuesDescuento + totalInterest;
            const safeNumInstallments = Math.max(1, numInstallments);
            const installmentAmount = totalFinal / safeNumInstallments;


            // Prepara los productos para guardarlos
            const productsToSave = currentOrder.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price, 
                subtotalProducto: item.subtotal, 
            }));

            const newDebt = {
                nombreCliente: clientName,
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                subtotalCompra: subtotalCompra,
                // MODIFICACIÓN: Guardar el número de cuotas y el monto de la cuota
                numeroCuotas: safeNumInstallments,
                montoPorCuota: installmentAmount,
                // FIN MODIFICACIÓN
                totalFinal: totalFinal,
                interesMensual: interestRate,
                estado: 'PENDIENTE', 
                montoPagado: 0,       
                historialPagos: [],   
                productosVendidos: productsToSave,
            };

            debtsCollection.add(newDebt)
                .then(() => {
                    alert(`¡Deuda de ${clientName} guardada exitosamente! Total: $${totalFinal.toFixed(2)} (${safeNumInstallments} cuotas de $${installmentAmount.toFixed(2)})`);
                    resetForm();
                })
                .catch((error) => {
                    console.error("Error al guardar la deuda: ", error);
                    alert(`Error de Guardado: ${error.message}. Asegúrate de que las reglas de Firebase permitan 'create'.`);
                });
        });

        function resetForm() {
            clientNameInput.value = '';
            interestRateInput.value = '0';
            // MODIFICACIÓN: Resetear Cuotas a 1
            monthlyInstallmentsInput.value = '1';
            
            // ✅ Limpiar los campos del buscador
            productSearchInput.value = ''; 
            selectedProductIdInput.value = ''; 
            
            currentOrder = [];
            renderOrderList();
            updateTotals(); // Limpiar la sección de totales y la barra de progreso
        }

        // 📌 Logout button
        logoutButton.addEventListener('click', () => {
            auth.signOut().catch((error) => {
                console.error('Logout error:', error);
                alert('Error al cerrar sesión.');
            });
        });
        
        updateTotals(); // Inicializa los totales a $0.00 al cargar
    });
})();