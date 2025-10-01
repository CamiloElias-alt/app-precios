
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
    const productProfitInput = document.getElementById('product-profit'); // Input para ganancia

    let productsCollection;
    let currentUser;

    // Auth state listener
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            productsCollection = db.collection('usuarios').doc(user.uid).collection('productos');
            setupProductListener();
        } else {
            window.location.href = 'index.html';
        }
    });

    // Real-time listener for products
    function setupProductListener() {
        productsCollection.orderBy('name').onSnapshot((snapshot) => {
            productList.innerHTML = ''; // Clear the list
            if (snapshot.empty) {
                // El colspan es 5 ahora: Nombre, Precio Compra, Ganancia, Precio Venta, Acciones
                productList.innerHTML = '<tr><td colspan="5">No has agregado productos todavía.</td></tr>';
                return;
            }
            snapshot.forEach(doc => {
                const product = { id: doc.id, ...doc.data() };

                // Calcular el precio de venta
                const sellingPrice = product.price + (product.price * product.profit / 100);

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${product.name}</td>
                    <td>$${Number(product.price).toFixed(2)}</td>
                    <td>${product.profit}%</td>
                    <td>$${sellingPrice.toFixed(2)}</td>
                    <td>
                        <button class="btn btn-danger btn-sm delete-button" data-id="${product.id}">Eliminar</button>
                    </td>
                `;
                productList.appendChild(row);
            });
        }, (error) => {
            console.error("Error fetching products: ", error);
            alert("Error al cargar los productos.");
        });
    }

    // Save new product
    saveProductButton.addEventListener('click', () => {
        const name = productNameInput.value.trim();
        const price = parseFloat(productPriceInput.value);
        const profit = parseFloat(productProfitInput.value);

        if (name && !isNaN(price) && price > 0 && !isNaN(profit) && profit >= 0) {
            // Guardar nombre, precio de compra y ganancia
            productsCollection.add({ name, price, profit })
                .then(() => {
                    productForm.reset();
                    $('#productModal').modal('hide'); // Hide modal on success
                })
                .catch((error) => {
                    console.error("Error adding product: ", error);
                    alert("Error al guardar el producto.");
                });
        } else {
            alert('Por favor, completa todos los campos correctamente.');
        }
    });

    // Handle product deletion
    productList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-button')) {
            const id = e.target.getAttribute('data-id');
            if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
                productsCollection.doc(id).delete().catch((error) => {
                    console.error("Error deleting product: ", error);
                    alert('Error al eliminar el producto.');
                });
            }
        }
    });

    // Logout button
    logoutButton.addEventListener('click', () => {
        auth.signOut().catch((error) => {
            console.error('Logout error:', error); 
            alert('Error al cerrar sesión.');
        });
    });
});
