(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // Firebase services
        const auth = firebase.auth();
        const db = firebase.firestore();

        // 📌 Elementos de la UI
        const debtList = document.getElementById('debt-list');
        const searchInput = document.getElementById('search-debt-input');
        const statusFilter = document.getElementById('status-filter');
        const welcomeMessage = document.getElementById('welcome-message');
        const logoutButton = document.getElementById('logout-button');
        const loadingMessage = document.getElementById('loading-message');

        const modal = $('#debtDetailModal');
        const markPaidButton = document.getElementById('mark-paid-button');
        // ✅ NUEVO: Botón de Eliminar
        const deleteDebtButton = document.getElementById('delete-debt-button'); 

        // Nuevos elementos para pagos parciales
        const partialPaymentInput = document.getElementById('partial-payment-amount');
        const registerPaymentButton = document.getElementById('register-payment-button');
        const amountPaidElement = document.getElementById('detail-amount-paid');
        const amountDueElement = document.getElementById('detail-amount-due');
        const paymentHistoryList = document.getElementById('payment-history-list');

        // ✅ NUEVOS: Elementos para Cuotas Mensuales (Integración de clientes.js)
        const detailInstallmentsElement = document.getElementById('detail-installments');
        const detailInstallmentAmountElement = document.getElementById('detail-installment-amount');

        let debtsCollection;
        let allDebts = [];
        let currentDebtId = null;
        let currentDebtData = null; // Guardará los datos de la deuda abierta

        // -----------------------------------------------------
        // 1. AUTENTICACIÓN Y CARGA INICIAL
        // -----------------------------------------------------

        auth.onAuthStateChanged((user) => {
            if (user) {
                welcomeMessage.textContent = user.displayName ? `¡Bienvenido, ${user.displayName}!` : `¡Bienvenido!`;
                
                // Referencia a la colección donde guardaste las deudas
                debtsCollection = db.collection('usuarios').doc(user.uid).collection('deudasClientes');
                
                loadDebts();
                searchInput.addEventListener('input', filterDebts);
                statusFilter.addEventListener('change', filterDebts);
                
            } else {
                // Redirigir a la página de inicio de sesión si no hay usuario
                window.location.href = 'index.html';
            }
        });


        // -----------------------------------------------------
        // 2. LÓGICA DE CARGA Y FILTRADO
        // -----------------------------------------------------

        function loadDebts() {
            // Escucha en tiempo real a la colección de deudas
            debtsCollection.onSnapshot(snapshot => {
                allDebts = [];
                snapshot.forEach(doc => {
                    const debt = doc.data();
                    allDebts.push({ id: doc.id, ...debt });
                });

                // Ocultar mensaje de carga
                loadingMessage.style.display = 'none';

                // Aplicar filtro inicial
                filterDebts();
            }, error => {
                console.error("Error cargando deudas:", error);
                loadingMessage.textContent = 'Error al cargar las deudas. Revisa tu conexión a Firebase.';
                loadingMessage.style.display = 'block';
            });
        }
        
        // -----------------------------------------------------
        // 3. MOSTRAR DETALLES DE DEUDA al hacer clic en un deudor
        // -----------------------------------------------------
        
        // DELEGACIÓN DE EVENTOS: Detecta el clic en el LI y llama a openDebtDetailModal
        debtList.addEventListener('click', (e) => {
            const debtElement = e.target.closest('li[data-id]');

            if (debtElement) {
                const id = debtElement.getAttribute('data-id');
                const debt = allDebts.find(d => d.id === id);

                if (debt) {
                    openDebtDetailModal(debt.id, debt);
                } else {
                    console.error("Deuda no encontrada para ID:", id);
                    alert("Error: No se encontraron los detalles de la deuda.");
                }
            }
        });


        function filterDebts() {
            const searchTerm = searchInput.value.toLowerCase();
            const status = statusFilter.value;

            const filteredDebts = allDebts.filter(debt => {
                // Filtro por nombre de cliente o monto
                const matchesSearch = debt.nombreCliente.toLowerCase().includes(searchTerm) ||
                                      (debt.totalFinal || 0).toFixed(2).includes(searchTerm);

                // Filtro por estado
                const matchesStatus = status === 'TODAS' || debt.estado === status;

                return matchesSearch && matchesStatus;
            });

            renderDebtList(filteredDebts);
        }


        function renderDebtList(debts) {
            debtList.innerHTML = ''; // Limpiar la lista actual
            
            if (debts.length === 0) {
                debtList.innerHTML = `<p class="text-center text-muted">No hay deudas ${statusFilter.value === 'PENDIENTE' ? 'pendientes' : statusFilter.value.toLowerCase()} que coincidan con la búsqueda.</p>`;
                return;
            }

            // Calcular el total de deudas pendientes
            const totalPendiente = debts
                .filter(debt => debt.estado === 'PENDIENTE')
                .reduce((sum, debt) => {
                    const total = debt.totalFinal || 0;
                    const paid = debt.montoPagado || 0;
                    return sum + (total - paid);
                }, 0);

            // Mostrar el total general (opcional: si tienes un elemento en el HTML para esto)
            const totalDisplay = document.getElementById('total-pending-display');
            if (totalDisplay) {
                totalDisplay.textContent = `Total Pendiente: $${totalPendiente.toFixed(2)}`;
            }

            debts.forEach(debt => {
                const total = debt.totalFinal || 0;
                const paid = debt.montoPagado || 0;
                const pendiente = total - paid;
                const estadoClase = debt.estado === 'PENDIENTE' ? 'list-group-item-warning' : 'list-group-item-success';
                const estadoTexto = debt.estado === 'PENDIENTE' ? 'Pendiente' : 'Pagada';

                const li = document.createElement('li');
                li.className = `list-group-item d-flex justify-content-between align-items-center ${estadoClase}`;
                li.style.cursor = 'pointer';
                li.setAttribute('data-id', debt.id); // Guardar el ID para el detalle

                li.innerHTML = `
                    <div>
                        <strong>${debt.nombreCliente}</strong>
                        <br>
                        <small class="text-muted">Total: $${total.toFixed(2)} - Pagado: $${paid.toFixed(2)}</small>
                    </div>
                    <span class="badge badge-secondary badge-pill">
                        ${pendiente > 0 ? `$${pendiente.toFixed(2)} Pendiente` : estadoTexto}
                    </span>
                `;

                debtList.appendChild(li);
            });
        }


        // -----------------------------------------------------
        // 3. LÓGICA DEL MODAL DE DETALLE
        // -----------------------------------------------------

        function openDebtDetailModal(id, debtData) {
            currentDebtId = id;
            currentDebtData = debtData; 

            // Rellenar los detalles de la deuda en el modal
            document.getElementById('detail-client-name').textContent = debtData.nombreCliente;
            document.getElementById('detail-total-final').textContent = `$${(debtData.totalFinal || 0).toFixed(2)}`;
            document.getElementById('detail-interest-rate').textContent = `${debtData.interesMensual || 0}%`;
            document.getElementById('detail-creation-date').textContent = debtData.fechaCreacion ? debtData.fechaCreacion.toDate().toLocaleDateString() : 'N/A';
            
            // ✅ NUEVA LÓGICA: Mostrar Cuotas Mensuales y Monto por Cuota
            detailInstallmentsElement.textContent = debtData.numeroCuotas || '1';
            detailInstallmentAmountElement.textContent = `$${(debtData.montoPorCuota || 0).toFixed(2)}`;
            
            // Lógica de Pagos
            const total = debtData.totalFinal || 0;
            const paid = debtData.montoPagado || 0;
            const due = total - paid;
            
            document.getElementById('detail-amount-paid').textContent = `$${paid.toFixed(2)}`;
            document.getElementById('detail-amount-due').textContent = `$${due.toFixed(2)}`;
            
            // Deshabilitar botón de pago si ya está pagada o no debe nada
            markPaidButton.disabled = due <= 0;
            registerPaymentButton.disabled = due <= 0;
            partialPaymentInput.value = '';
            
            // El botón de eliminar siempre está activo (si hay una deuda seleccionada)
            deleteDebtButton.disabled = !currentDebtId;

            // Renderizar la lista de productos
            const productsList = document.getElementById('products-sold-list');
            productsList.innerHTML = '';
            (debtData.productosVendidos || []).forEach(item => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                
                // CORRECCIÓN DE PROPIEDADES: Usar las claves correctas (name, quantity, price)
                // Se agregó una verificación para 'name' en caso de que la data sea corrupta (como el caso de 'antonio')
                const productName = item.name || 'Producto Desconocido/Error';
                const productQuantity = item.quantity || 0;
                const productPrice = item.price || 0;
                
                li.innerHTML = `
                    ${productName} (${productQuantity} x $${(productPrice).toFixed(2)})
                    <span class="badge badge-primary badge-pill">$${(item.subtotalProducto || 0).toFixed(2)}</span>
                `;
                productsList.appendChild(li);
            });
            
            // Renderizar historial de pagos
            paymentHistoryList.innerHTML = '';
            (debtData.historialPagos || []).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).forEach(payment => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center list-group-item-info';
                const date = payment.fecha ? new Date(payment.fecha).toLocaleDateString() : 'N/A';
                li.innerHTML = `
                    Pago de $${(payment.monto || 0).toFixed(2)}
                    <small class="text-muted">${date}</small>
                `;
                paymentHistoryList.appendChild(li);
            });

            modal.modal('show');
        }

        // -----------------------------------------------------
        // 4. LÓGICA DE ELIMINACIÓN DE DEUDA (NUEVA FUNCIÓN)
        // -----------------------------------------------------

        deleteDebtButton.addEventListener('click', () => {
            if (!currentDebtId || deleteDebtButton.disabled) return;

            if (confirm(`¿Estás seguro de que deseas ELIMINAR PERMANENTEMENTE la deuda de ${currentDebtData.nombreCliente}? Esta acción no se puede deshacer.`)) {
                
                debtsCollection.doc(currentDebtId).delete()
                .then(() => {
                    alert('Deuda eliminada con éxito.');
                    modal.modal('hide');
                    // onSnapshot recargará la lista
                })
                .catch(error => {
                    console.error("Error al eliminar la deuda:", error);
                    alert("Hubo un error al eliminar la deuda. Verifica las reglas de Firebase.");
                });
            }
        });
        
        // -----------------------------------------------------
        // 5. LÓGICA DE PAGOS PARCIALES
        // -----------------------------------------------------
        
        registerPaymentButton.addEventListener('click', () => {
            if (!currentDebtId || registerPaymentButton.disabled || !currentDebtData) return;
            
            const paymentAmount = parseFloat(partialPaymentInput.value);
            const total = currentDebtData.totalFinal || 0;
            const paid = currentDebtData.montoPagado || 0;
            const montoPendiente = total - paid;

            if (isNaN(paymentAmount) || paymentAmount <= 0) {
                alert('Por favor, ingresa un monto de pago válido.');
                return;
            }

            if (paymentAmount > montoPendiente) {
                alert(`El monto de pago no puede ser mayor al saldo pendiente de $${montoPendiente.toFixed(2)}.`);
                return;
            }

            if (confirm(`¿Estás seguro de que deseas registrar un pago de $${paymentAmount.toFixed(2)}?`)) {
                
                const updateData = {
                    // Sumar el monto al campo montoPagado
                    montoPagado: firebase.firestore.FieldValue.increment(paymentAmount),
                    // Registrar el pago en el historial
                    historialPagos: firebase.firestore.FieldValue.arrayUnion({
                        monto: paymentAmount,
                        fecha: new Date().toISOString() // Usar ISO string para que sea fácil de ordenar
                    })
                };
                
                // Si el pago es igual al saldo pendiente, marcar como PAGADA
                if (paymentAmount === montoPendiente) {
                    updateData.estado = 'PAGADA';
                    updateData.fechaPago = firebase.firestore.FieldValue.serverTimestamp();
                }
                
                debtsCollection.doc(currentDebtId).update(updateData)
                .then(() => {
                    alert('Pago registrado con éxito.');
                    partialPaymentInput.value = ''; // Limpiar input
                    // onSnapshot recargará el modal y la lista
                })
                .catch(error => {
                    console.error("Error al registrar el pago:", error);
                    alert("Hubo un error al registrar el pago.");
                });
            }
        });
        
        

        // -----------------------------------------------------
        // 6. MARCAR COMO PAGADA (Pago Final)
        // -----------------------------------------------------

        markPaidButton.addEventListener('click', () => {
            if (!currentDebtId || markPaidButton.disabled || !currentDebtData) return;

            const total = currentDebtData.totalFinal || 0;
            const paid = currentDebtData.montoPagado || 0;
            const montoPendiente = total - paid;

            if (confirm(`¿Estás seguro de que deseas registrar un pago final de $${montoPendiente.toFixed(2)} y marcar esta deuda como PAGADA?`)) {
                const updateData = {
                    estado: 'PAGADA',
                    fechaPago: firebase.firestore.FieldValue.serverTimestamp(),
                    // Sumar el saldo pendiente al monto ya pagado
                    montoPagado: firebase.firestore.FieldValue.increment(montoPendiente),
                    // Registrar el pago final en el historial
                    historialPagos: firebase.firestore.FieldValue.arrayUnion({
                        monto: montoPendiente,
                        fecha: new Date().toISOString()
                    })
                };
                
                debtsCollection.doc(currentDebtId).update(updateData)
                .then(() => {
                    alert('Deuda marcada como pagada. Pago final registrado.');
                    modal.modal('hide');
                })
                .catch(error => {
                    console.error("Error al marcar como pagada:", error);
                    alert("Hubo un error al actualizar la deuda.");
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