## Instrucciones rápidas para agentes AI

Este repositorio es una SPA multipágina (HTML estático + JS) que usa Firebase (Auth + Firestore) para autenticación y persistencia.

Puntos clave (leer antes de editar):
- La UI está en HTML en la raíz: `index.html`, `app-precios.html`, `ventas.html`, `clientes.html`, `deudas-pendientes.html`, `reportes.html`.
- Lógica principal en `assets/js/`: `app.js` (panel principal), `seccion.js` (login/registro), `ventas.js`, `clientes.js`, `deudas.js`, `reportes.js`.
- Estilos en `assets/css/styles.css`.
- Firebase se inicializa en los HTML que lo usan (ej. `app-precios.html`, `index.html`) — revisa las claves en cada HTML antes de cambiar la configuración.

Arquitectura y flujo de datos:
- Autenticación: `seccion.js` usa `firebase.auth()` y redirige a `app-precios.html` al iniciar sesión.
- Cada usuario tiene su propia subcolección en Firestore: `usuarios/{uid}/productos`, `usuarios/{uid}/ventas`, `usuarios/{uid}/deudas`.
- Lecturas en tiempo real: `onSnapshot` se usa para listas que deben refrescarse automáticamente (`app.js`, `deudas.js`).
- Operaciones críticas (venta, guardar deuda) usan transacciones o batch (`db.runTransaction` o `db.batch`) para asegurar consistencia y actualización de stock (`ventas.js`, `clientes.js`, `deudas.js`).

Convenciones del proyecto (no asumidas en genéricos):
- Mostrar/ocultar la app: los HTML cargan `#main-app` oculto por defecto; cuando `auth.onAuthStateChanged` confirma usuario, los scripts hacen mainApp.style.display = 'block'.
- Mensajes al usuario: se usa `alert(...)` para errores/confirmaciones; conserva este patrón en pequeños cambios para mantener coherencia UX.
- Modal UI: los formularios de producto se abren con Bootstrap modal y se cierran con jQuery (ej. `$('#productModal').modal('hide')`). Evita remover jQuery si no actualizas todo el modal logic.

Patrones de seguridad y errores esperados:
- Firestore rules: el código asume reglas que restringen acceso por UID; si agregas scripts que leen colecciones raíz, revisa reglas antes de probar.
- Manejo de errores: los scripts registran en consola y muestran alertas; sigue ese patrón en PRs pequeños.

Dónde tocar primero para tareas comunes:
- Añadir campo a producto: editar `app-precios.html` (form modal) + `assets/js/app.js` (serialización/validación) + `clientes.js`/`ventas.js` para cálculos si el campo afecta precio/stock.
- Cambiar cálculo de precio de venta: revisar `cost * (1 + profit/100)` en `app.js`, `ventas.js`, `clientes.js`.
- Soportar importación CSV de productos: crear endpoint UI en `app-precios.html`, parsear CSV en `assets/js/app.js` y usar `batch` para escritura a Firestore.

Ejemplos concretos extraídos del código:
- Calcular precio de venta: `const price = product.cost * (1 + product.profit / 100);` (varios archivos)
- Transacción de venta (validar stock y decrementar dentro de `db.runTransaction`) — ver `assets/js/ventas.js`.
- Guardar deuda y reducir stock en batch: `const batch = db.batch(); batch.update(productRef, { stock: firebase.firestore.FieldValue.increment(-qty) }); batch.set(debtsCollection.doc(), newDebt); batch.commit()` — ver `assets/js/clientes.js`.

Reglas para PRs y cambios sugeridos a agentes:
- Evita remover `firebase` o jQuery a menos que actualices todas las referencias. Hacerlo genera errores JS a nivel global.
- Para cambios que tocan Firestore, añade un comentario en el PR indicando qué colecciones y documentos se ven afectados.
- Añadir tests no es requerido (proyecto estático) pero documenta manualmente cómo probar localmente (abrir los HTML en navegador y usar una cuenta de Firebase de desarrollo).

Archivos claves para revisar al empezar:
- `assets/js/app.js`, `assets/js/ventas.js`, `assets/js/clientes.js`, `assets/js/deudas.js`, `assets/js/reportes.js`, `assets/js/seccion.js`.
- `app-precios.html`, `index.html`, `ventas.html`, `clientes.html`, `deudas-pendientes.html`, `reportes.html`.

Preguntas al autor que ayudan a mejorar las instrucciones:
- ¿Hay reglas de Firestore documentadas o un emulador local que deberíamos usar para probar? (si existe, agrégala al README)
- ¿Deseas migrar a módulos (ESM) o mantener los scripts globales y dependencias CDN (Firebase, jQuery, Bootstrap)?

Si algo falta o quieres que sea más estricto (ej. añadir checklist de QA, pasos de despliegue), dime y lo incorporo.
## Instrucciones rápidas para agentes AI

Este repositorio es una SPA multipágina (HTML estático + JS) que usa Firebase (Auth + Firestore) para autenticación y persistencia.

Puntos clave (leer antes de editar):
- La UI está en HTML en la raíz: `index.html`, `app-precios.html`, `ventas.html`, `clientes.html`, `deudas-pendientes.html`, `reportes.html`.
- Lógica principal en `assets/js/`: `app.js` (panel principal), `seccion.js` (login/registro), `ventas.js`, `clientes.js`, `deudas.js`, `reportes.js`.
- Estilos en `assets/css/styles.css`.
- Firebase se inicializa en los HTML que lo usan (ej. `app-precios.html`, `index.html`) — revisa las claves en cada HTML antes de cambiar la configuración.

Arquitectura y flujo de datos:
- Autenticación: `seccion.js` usa `firebase.auth()` y redirige a `app-precios.html` al iniciar sesión.
- Cada usuario tiene su propia subcolección en Firestore: `usuarios/{uid}/productos`, `usuarios/{uid}/ventas`, `usuarios/{uid}/deudas`.
- Lecturas en tiempo real: `onSnapshot` se usa para listas que deben refrescarse automáticamente (`app.js`, `deudas.js`).
- Operaciones críticas (venta, guardar deuda) usan transacciones o batch (`db.runTransaction` o `db.batch`) para asegurar consistencia y actualización de stock (`ventas.js`, `clientes.js`, `deudas.js`).

Convenciones del proyecto (no asumidas en genéricos):
- Mostrar/ocultar la app: los HTML cargan `#main-app` oculto por defecto; cuando `auth.onAuthStateChanged` confirma usuario, los scripts hacen `mainApp.style.display = 'block'`.
- Mensajes al usuario: se usa `alert(...)` para errores/confirmaciones; conserva este patrón en pequeños cambios para mantener coherencia UX.
- Modal UI: los formularios de producto se abren con Bootstrap modal y se cierran con jQuery (`$('#productModal').modal('hide')`). Evita remover jQuery si no actualizas todo el modal logic.

Patrones de seguridad y errores esperados:
- Firestore rules: el código asume reglas que restringen acceso por UID; si agregas scripts que leen colecciones raíz, revisa reglas antes de probar.
- Manejo de errores: los scripts registran en consola y muestran alertas; sigue ese patrón en PRs pequeños.

Dónde tocar primero para tareas comunes:
- Añadir campo a producto: editar `app-precios.html` (form modal) + `assets/js/app.js` (serialización/validación) + `clientes.js`/`ventas.js` para cálculos si el campo afecta precio/stock.
- Cambiar cálculo de precio de venta: revisar `cost * (1 + profit/100)` en `app.js`, `ventas.js`, `clientes.js`.
- Soportar importación CSV de productos: crear endpoint UI en `app-precios.html`, parsear CSV en `assets/js/app.js` y usar `batch` para escritura a Firestore.

Ejemplos concretos extraídos del código:
- Calcular precio de venta: const price = product.cost * (1 + product.profit / 100); (varios archivos)
- Transacción de venta (validar stock y decrementar dentro de `db.runTransaction`) — ver `assets/js/ventas.js`.
- Guardar deuda y reducir stock en batch: `const batch = db.batch(); batch.update(productRef, { stock: firebase.firestore.FieldValue.increment(-qty) }); batch.set(debtsCollection.doc(), newDebt); batch.commit()` — ver `assets/js/clientes.js`.

Reglas para PRs y cambios sugeridos a agentes:
- Evita remover `firebase` o jQuery a menos que actualices todas las referencias. Hacerlo genera errores JS a nivel global.
- Para cambios que tocan Firestore, añade un comentario en el PR indicando qué colecciones y documentos se ven afectados.
- Añadir tests no es requerido (proyecto estático) pero documenta manualmente cómo probar localmente (abrir los HTML en navegador y usar una cuenta de Firebase de desarrollo).

Archivos claves para revisar al empezar:
- `assets/js/app.js`, `assets/js/ventas.js`, `assets/js/clientes.js`, `assets/js/deudas.js`, `assets/js/reportes.js`, `assets/js/seccion.js`.
- `app-precios.html`, `index.html`, `ventas.html`, `clientes.html`, `deudas-pendientes.html`, `reportes.html`.

Preguntas al autor que ayudan a mejorar las instrucciones:
- ¿Hay reglas de Firestore documentadas o un emulador local que deberíamos usar para probar? (si existe, agrégala al README)
- ¿Deseas migrar a módulos (ESM) o mantener los scripts globales y dependencias CDN (Firebase, jQuery, Bootstrap)?

Si algo falta o quieres que sea más estricto (ej. añadir checklist de QA, pasos de despliegue), dime y lo incorporo.
