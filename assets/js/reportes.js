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
        const startDateInput = document.getElementById('start-date-input');
        const endDateInput = document.getElementById('end-date-input');
        const reportForm = document.getElementById('report-form');

        // Elementos de Resumen
        const totalProfitDisplay = document.getElementById('total-profit-display');
        const totalSalesDisplay = document.getElementById('total-sales-display');
        const totalCostDisplay = document.getElementById('total-cost-display');
        const transactionsList = document.getElementById('transactions-list');
        const transactionCount = document.getElementById('transaction-count');

        let salesCollection; // Colección de ventas
        let debtsCollection; // Colección de deudas
        let currentUser;

        
        // 1. AUTENTICACIÓN Y CARGA INICIAL
        
        auth.onAuthStateChanged((user) => {
            if (user) {
                if (mainApp) {
                    mainApp.style.display = 'block'; 
                }
                
                currentUser = user;
                welcomeMessage.textContent = `Bienvenido, ${user.displayName || user.email}`;
                
                // Inicializar colecciones específicas del usuario
                salesCollection = db.collection('usuarios').doc(currentUser.uid).collection('ventas');
                debtsCollection = db.collection('usuarios').doc(currentUser.uid).collection('deudas');

                // Establecer fechas por defecto: Hoy
                const today = new Date().toISOString().split('T')[0];
                startDateInput.value = today;
                endDateInput.value = today;

            } else {
                // No hay usuario: Redirige al login
                window.location.href = "index.html"; 
            }
        });
 
        // 2. LÓGICA DEL REPORTE

        reportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            generateReport();
        });

        async function generateReport() {
            const startDate = parseDate(startDateInput.value);
            const endDate = parseDate(endDateInput.value, true); // Incluye el final del día

            if (!startDate || !endDate || startDate > endDate) {
                alert('Por favor, ingresa un rango de fechas válido.');
                return;
            }
            
            transactionsList.innerHTML = '<tr><td colspan="5" class="text-center text-info">Generando reporte...</td></tr>';
            resetSummary();

            try {
                // 1. Consultar ventas al contado 
                const salesQuery = salesCollection
                    .where('fechaVenta', '>=', firebase.firestore.Timestamp.fromDate(startDate))
                    .where('fechaVenta', '<=', firebase.firestore.Timestamp.fromDate(endDate))
                    .get();

                // 2. Consultar ventas a crédito 
                const debtsQuery = debtsCollection
                    .where('fecha', '>=', firebase.firestore.Timestamp.fromDate(startDate))
                    .where('fecha', '<=', firebase.firestore.Timestamp.fromDate(endDate))
                    .get();

                // Esperar ambas consultas
                const [salesSnapshot, debtsSnapshot] = await Promise.all([salesQuery, debtsQuery]);
                
                // 3. Procesar resultados
                const allTransactions = [];

                // A. Procesar Ventas Contado
                salesSnapshot.forEach(doc => {
                    const sale = doc.data();
                    allTransactions.push({
                        fecha: sale.fechaVenta, 
                        tipo: 'Contado',
                        detalle: 'Venta Contado',
                        totalVenta: sale.totalVenta || 0,
                        ganancia: sale.gananciaNeta || 0,
                        costo: sale.costoTotal || 0, 
                        id: doc.id
                    });
                });

                // B. Procesar Deudas 
                debtsSnapshot.forEach(doc => {
                    const debt = doc.data();
                    
                    
                    let debtCost = 0;
                    if (Array.isArray(debt.productosVendidos)) {
                        debtCost = debt.productosVendidos.reduce((sum, item) => 
                            sum + ((item.costPrice || 0) * (item.quantity || 0)), 0);
                    }
                    
                    const totalVenta = debt.totalFinal || 0; 
                    const ganancia = totalVenta - debtCost; 
                    
                    allTransactions.push({
                        fecha: debt.fecha,
                        tipo: 'Crédito',
                        detalle: `Deuda: ${debt.cliente || 'N/A'}`,
                        totalVenta: totalVenta,
                        ganancia: ganancia,
                        id: doc.id,
                        costo: debtCost
                    });
                });
                
                // 4. Mostrar y resumir
                displayReport(allTransactions);

            } catch (error) {
                console.error("Error al generar el reporte:", error);
                transactionsList.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar el reporte. Revisa la consola.</td></tr>';
                resetSummary();
            }
        }
        
        function displayReport(transactions) {
            transactions.sort((a, b) => {
                const dateA = a.fecha.toDate();
                const dateB = b.fecha.toDate();
                return dateB.getTime() - dateA.getTime();
            });

            transactionsList.innerHTML = '';
            
            let totalSales = 0;
            let totalProfit = 0;
            let totalCost = 0;
            let transactionCountNum = 0;

            if (transactions.length === 0) {
                transactionsList.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No se encontraron transacciones en este período.</td></tr>';
            }
            
            transactions.forEach(transaction => {
                
                // Sumar al resumen
                totalSales += transaction.totalVenta;
                totalProfit += transaction.ganancia;
                
                // APLICANDO CORRECCIÓN 4: Sumar el campo
                totalCost += transaction.costo; 
                
                transactionCountNum++;

                const date = transaction.fecha instanceof firebase.firestore.Timestamp ? transaction.fecha.toDate() : new Date();
                
                const tr = document.createElement('tr');
                tr.classList.add(transaction.tipo === 'Contado' ? 'table-light' : 'table-info');

                tr.innerHTML = `
                    <td>${date.toLocaleDateString()}</td>
                    <td>${transaction.tipo}</td>
                    <td>${transaction.detalle}</td>
                    <td class="text-right">${formatCurrency(transaction.totalVenta)}</td>
                    <td class="text-right font-weight-bold ${transaction.ganancia >= 0 ? 'text-success' : 'text-danger'}">${formatCurrency(transaction.ganancia)}</td>
                `;
                transactionsList.appendChild(tr);
            });
            
            totalSalesDisplay.value = formatCurrency(totalSales);
            totalCostDisplay.value = formatCurrency(totalCost);
            totalProfitDisplay.value = formatCurrency(totalProfit);
            transactionCount.textContent = `${transactionCountNum} Transacciones`;
        }

        // 3. FUNCIONES DE UTILIDAD

        function parseDate(dateString, isEnd = false) {
            if (!dateString) return null;
            const date = new Date(dateString);
            
            if (isEnd) {
                // Para la fecha final, establecer la hora al final del día (23:59:59)
                date.setHours(23, 59, 59, 999);
            } else {
                // Para la fecha inicial, establecer la hora al inicio del día (00:00:00)
                date.setHours(0, 0, 0, 0);
            }
            return date;
        }

        function formatCurrency(value) {
            const safeValue = isNaN(value) ? 0 : value;
            return `$${safeValue.toFixed(2)}`;
        }
        
        function resetSummary() {
            totalSalesDisplay.value = '$0.00';
            totalCostDisplay.value = '$0.00';
            totalProfitDisplay.value = '$0.00';
            transactionCount.textContent = '0 Transacciones';
        }

        logoutButton.addEventListener('click', () => {
            auth.signOut().catch((error) => {
                console.error('Logout error:', error);
                alert('Error al cerrar sesión.');
            });
        });
        
        resetSummary();
    });
})();