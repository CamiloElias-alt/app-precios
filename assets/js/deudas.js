(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        // Firebase services
        const auth = firebase.auth();
        const db = firebase.firestore();
        
        //Obtener el contenedor principal
        const mainApp = document.getElementById('main-app'); 

        // Elementos de la UI
        const debtList = document.getElementById('debt-list');
        const searchInput = document.getElementById('search-debt-input');
        const statusFilter = document.getElementById('status-filter');
        const welcomeMessage = document.getElementById('welcome-message');
        const logoutButton = document.getElementById('logout-button');
        const loadingMessage = document.getElementById('loading-message'); 

        // Elementos del Modal
        const modal = $('#debtDetailModal');
        const markPaidButton = document.getElementById('mark-paid-button');
        const deleteDebtButton = document.getElementById('delete-debt-button');

        // Elementos para Pagos Parciales y Cuotas
        const partialPaymentInput = document.getElementById('partial-payment-amount');
        const registerPaymentButton = document.getElementById('register-payment-button');
        const amountPaidElement = document.getElementById('detail-amount-paid');
        const amountDueElement = document.getElementById('detail-amount-due');
        const paymentHistoryList = document.getElementById('payment-history-list');
        const detailClientName = document.getElementById('detail-client-name');
        const detailAmountTotal = document.getElementById('detail-amount-total');
        const detailInstallments = document.getElementById('detail-installments');
        const detailProductsList = document.getElementById('detail-products-list');
        
        let debtsCollection;
        let allDebts = []; 
        let currentDebtId = null;
        let currentDebt = null;

        // 1. AUTENTICACIÓN Y CARGA INICIAL

        auth.onAuthStateChanged((user) => {
            if (user) {
                if (mainApp) {
                    mainApp.style.display = 'block'; 
                }
                
                welcomeMessage.textContent = `Bienvenido, ${user.displayName || user.email}`;
                
                debtsCollection = db.collection('usuarios').doc(user.uid).collection('deudas');

                setupRealtimeListener();

            } else {
                window.location.href = "index.html"; 
            }
        });
        
        // 2. FUNCIÓN DE CARGA Y RENDERIZADO

        function setupRealtimeListener() {
            debtsCollection.onSnapshot(snapshot => {
                loadingMessage.style.display = 'block';
                allDebts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                filterAndRenderDebts(); 
                loadingMessage.style.display = 'none';
            }, error => {
                console.error("Error al cargar deudas en tiempo real:", error);
                loadingMessage.textContent = 'Error al cargar las deudas.';
            });
        }
        
        function filterAndRenderDebts() {
            const searchTerm = searchInput.value.toLowerCase();
            const status = statusFilter.value;

            const filteredDebts = allDebts.filter(debt => {
                const clientMatch = (debt.cliente || '').toLowerCase().includes(searchTerm);
                
                const isPaid = (debt.montoPagado || 0) >= (debt.totalFinal || 0);
                const debtStatus = isPaid ? 'PAGADA' : 'PENDIENTE';
                
                const statusMatch = status === 'TODAS' || debtStatus === status;
                
                return clientMatch && statusMatch;
            });

            renderDebtList(filteredDebts);
        }

        function renderDebtList(debts) {
            debtList.innerHTML = '';
            if (debts.length === 0) {
                debtList.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No hay deudas que coincidan con los filtros.</td></tr>`;
                return;
            }

            debts.forEach(debt => {
                const totalFinal = debt.totalFinal || 0;
                const montoPagado = debt.montoPagado || 0;
                const saldoPendiente = totalFinal - montoPagado;
                const isPaid = saldoPendiente <= 0;
                
                const statusText = isPaid ? '<span class="badge badge-success">PAGADA</span>' : '<span class="badge badge-warning">PENDIENTE</span>';
                const statusClass = isPaid ? 'table-success' : 'table-warning';
                
                const tr = document.createElement('tr');
                tr.classList.add(statusClass);
                
                tr.innerHTML = `
                    <td>${debt.cliente || 'N/A'}</td>
                    <td class="text-right">${formatCurrency(totalFinal)}</td>
                    <td class="text-right">${formatCurrency(montoPagado)}</td>
                    <td class="text-right font-weight-bold">${formatCurrency(saldoPendiente)}</td>
                    <td class="text-center">${statusText}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-primary view-debt-button" data-id="${debt.id}">Ver Detalle</button>
                    </td>
                `;
                debtList.appendChild(tr);
            });
        }

        // 3. EVENTOS DE FILTRO Y BÚSQUEDA
        
        searchInput.addEventListener('input', filterAndRenderDebts);
        statusFilter.addEventListener('change', filterAndRenderDebts);

        // 4. LÓGICA DEL MODAL

        debtList.addEventListener('click', (e) => {
            const viewButton = e.target.closest('.view-debt-button');
            if (viewButton) {
                currentDebtId = viewButton.getAttribute('data-id');
                currentDebt = allDebts.find(d => d.id === currentDebtId);
                
                if (currentDebt) {
                    displayDebtDetails(currentDebt);
                    modal.modal('show');
                }
            }
        });

        function displayDebtDetails(debt) {
            const totalFinal = debt.totalFinal || 0;
            const montoPagado = debt.montoPagado || 0;
            const saldoPendiente = totalFinal - montoPagado;
            const isPaid = saldoPendiente <= 0;
            
            // Actualizar encabezado y resumen
            detailClientName.textContent = debt.cliente || 'N/A';
            detailAmountTotal.textContent = formatCurrency(totalFinal);
            detailAmountPaid.textContent = formatCurrency(montoPagado);
            amountDueElement.textContent = formatCurrency(Math.max(0, saldoPendiente));
            detailInstallments.textContent = `${debt.cuotas || 1} cuotas (${(debt.interesPorcentaje || 0).toFixed(2)}%)`;

            // Configurar botón de pago final
            markPaidButton.disabled = isPaid;
            if (isPaid) {
                markPaidButton.textContent = 'Deuda Completamente Pagada';
                markPaidButton.classList.remove('btn-success');
                markPaidButton.classList.add('btn-light', 'text-success');
            } else {
                markPaidButton.textContent = 'Marcar Saldo Pendiente como Pagado';
                markPaidButton.classList.remove('btn-light', 'text-success');
                markPaidButton.classList.add('btn-success');
            }
            
            // Configurar formulario de pago parcial
            partialPaymentInput.value = '';
            partialPaymentInput.max = Math.max(0, saldoPendiente).toFixed(2);
            registerPaymentButton.disabled = isPaid;
            partialPaymentInput.disabled = isPaid;

            renderPaymentHistory(debt.historialPagos || []);
            
            renderProductsList(debt.productosVendidos || []);
        }
        
        function renderPaymentHistory(history) {
            paymentHistoryList.innerHTML = '';
            if (history.length === 0) {
                 paymentHistoryList.innerHTML = '<li class="list-group-item list-group-item-secondary">No hay pagos registrados.</li>';
                 return;
            }
            
            history.sort((a, b) => b.fecha.seconds - a.fecha.seconds); 
            
            history.forEach(pago => {
                const date = pago.fecha instanceof firebase.firestore.Timestamp ? pago.fecha.toDate() : new Date();
                const li = document.createElement('li');
                li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                li.innerHTML = `
                    <span>Pago por ${formatCurrency(pago.monto)}</span>
                    <small class="text-muted">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                `;
                paymentHistoryList.appendChild(li);
            });
        }
        
        function renderProductsList(products) {
            detailProductsList.innerHTML = '';
            products.forEach(p => {
                const li = document.createElement('li');
                li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
                li.innerHTML = `
                    <span class="font-weight-bold">${p.name}</span>
                    <span class="badge badge-info badge-pill">${p.quantity} unid.</span>
                    <span class="text-right">${formatCurrency(p.price * p.quantity)}</span>
                `;
                detailProductsList.appendChild(li);
            });
        }

        // 5. LÓGICA DE TRANSACCIONES
        
        // Evento para Registrar Pago Parcial
        registerPaymentButton.addEventListener('click', () => {
            if (!currentDebtId || !currentDebt) return;
            
            const paymentAmount = parseFloat(partialPaymentInput.value);
            const saldoPendiente = (currentDebt.totalFinal || 0) - (currentDebt.montoPagado || 0);

            if (isNaN(paymentAmount) || paymentAmount <= 0) {
                alert('Ingresa un monto de pago válido.');
                return;
            }

            if (paymentAmount > saldoPendiente) {
                alert(`El monto excede el saldo pendiente. Máximo a pagar: ${formatCurrency(saldoPendiente)}.`);
                return;
            }
            
            if (confirm(`¿Estás seguro de registrar un pago de ${formatCurrency(paymentAmount)} para ${currentDebt.cliente}?`)) {
                
                const newPayment = {
                    monto: paymentAmount,
                    fecha: firebase.firestore.Timestamp.now()
                };
                
                debtsCollection.doc(currentDebtId).update({
                    montoPagado: firebase.firestore.FieldValue.increment(paymentAmount),
                    historialPagos: firebase.firestore.FieldValue.arrayUnion(newPayment)
                })
                .then(() => {
                    alert('Pago registrado exitosamente. La lista de deudas se actualizará automáticamente.');
                    partialPaymentInput.value = '';
                    // No necesitas recargar deudas
                })
                .catch(error => {
                    console.error("Error al registrar pago parcial:", error);
                    alert("Hubo un error al registrar el pago.");
                });
            }
        });
        
        markPaidButton.addEventListener('click', () => {
            if (!currentDebtId || !currentDebt) return;
            
            const totalFinal = currentDebt.totalFinal || 0;
            const montoPagado = currentDebt.montoPagado || 0;
            const saldoPendiente = totalFinal - montoPagado;
            
            if (saldoPendiente <= 0) {
                alert('Esta deuda ya está completamente pagada.');
                return;
            }
            
            if (confirm(`¿Estás seguro de registrar el saldo pendiente final de ${formatCurrency(saldoPendiente)} y marcar la deuda de ${currentDebt.cliente} como PAGADA?`)) {
                
                const finalPayment = {
                    monto: saldoPendiente,
                    fecha: firebase.firestore.Timestamp.now(),
                    esPagoFinal: true
                };
                
                debtsCollection.doc(currentDebtId).update({
                    montoPagado: totalFinal, 
                    historialPagos: firebase.firestore.FieldValue.arrayUnion(finalPayment)
                })
                .then(() => {
                    alert(`Deuda de ${currentDebt.cliente} marcada como PAGADA.`);
                    modal.modal('hide');
                })
                .catch(error => {
                    console.error("Error al marcar como pagada:", error);
                    alert("Hubo un error al actualizar la deuda.");
                });
            }
        });

        deleteDebtButton.addEventListener('click', () => {
            if (!currentDebtId || !currentDebt) return;
            
            if (confirm(`⚠️ ADVERTENCIA: Esta acción es irreversible. ¿Estás seguro de que deseas ELIMINAR la deuda de ${currentDebt.cliente || 'este cliente'} por ${formatCurrency(currentDebt.totalFinal || 0)}?`)) {
                
                debtsCollection.doc(currentDebtId).delete()
                .then(() => {
                    alert('Deuda eliminada permanentemente.');
                    modal.modal('hide');
                })
                .catch(error => {
                    console.error("Error al eliminar la deuda:", error);
                    alert("Hubo un error al eliminar la deuda.");
                });
            }
        });
        
        // 6. UTILIDADES
        
        function formatCurrency(value) {
            const safeValue = isNaN(value) ? 0 : value;
            return `$${safeValue.toFixed(2)}`;
        }
        
        logoutButton.addEventListener('click', () => {
            auth.signOut().catch((error) => {
                console.error('Logout error:', error);
                alert('Error al cerrar sesión.');
            });
        });
    });
})();