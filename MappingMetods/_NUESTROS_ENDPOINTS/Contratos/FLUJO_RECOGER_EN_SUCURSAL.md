---
tags: [flujo, migracion, store-pickup, ola-7]
partidas: [E-15]
actualizado: 2026-08-31
---

# Flujo — Recoger en sucursal

Mapeo completo del flujo del código de recogida, levantado el 31-ago-2026 leyendo
`APIMagento`, `APIMagentoDMZ`, `ServicioSAP` y `MaviSAP`. Sirve para planear qué se migra,
en qué orden y contra qué.

El flujo entero vive hoy en **IntelisisTmp @ MAVICUBOS**, el servidor que sale de servicio.
Todo lo que aparece abajo apunta ahí salvo lo ya migrado.

---

## 1. Qué hace el flujo

Cuando un cliente elige recoger su pedido en tienda, el sistema le genera una **clave de
venta** que presenta en sucursal. La clave se guarda en una tabla junto con su nombre,
correo y teléfono, se le manda por correo, y la sucursal la consulta al entregarle.

Son cuatro momentos:

1. **Se siembra la fila** al crear la orden, sin clave todavía.
2. **Se genera la clave** y se completa la fila.
3. **Se regenera** si hace falta.
4. **Se consulta** desde la app de sucursal.

---

## 2. Los seis procesos

| # | Proceso | Entrada | Qué hace con la tabla | Dueño |
|---|---|---|---|---|
| 1 | `setOrder`, rama `instore_pickup` | interna | **INSERT** con `ClaveVenta` vacía | Dev 2 |
| 2 | `order/createStorepickupCode/{idEcommerce}/{idOrder}` | POST | genera clave → **INSERT o UPDATE** | Dev 2 |
| 3 | `setOrder`, rama transferencia bancaria | interna | genera clave → **INSERT o UPDATE** | Dev 2 |
| 4 | `order/generateNewStorepickupCode/{idEcommerce}` | GET | regenera → **UPDATE** | Dev 2 |
| 5 | `order/GetPickUpCode` | POST | **SELECT** de `ClaveVenta` | **Dev 3 — E-15, hecho** |
| 6 | `RecogerEnSucursalCorreo` | interna | **SELECT** para armar el correo | Dev 2 |

**Cinco de los seis son de Dev 2, y dos ni siquiera tienen ruta propia** — el 1 y el 3 son
ramas dentro de `setOrder`. Eso importa para la secuencia: no basta con migrar los dos
endpoints con nombre.

### Detalle de cada uno

**1 · Siembra al crear la orden** — `OrderMethods.cs:659` → `setNameToReference`
(`OrderMethods.cs:1273`)

```csharp
if (order.metodoEnvio == "instore_pickup")
    setNameToReference(order.incrementId, NombreClienteMavi, correo, telefono);
```

Llama al SP con `@ClaveVenta = ""`. La fila nace sin clave.

**2 · Primer código** — `OrdersController.cs:383` → `crearPrimerCodigoRecogerSuc`
(`CodigoRecogerSucursal.cs:87`)

Genera la clave, lee los datos del cliente con `GetDatosCte`, comprueba duplicados por
`IdEcommerce` y **inserta o actualiza según haya fila o no**. Después lee los artículos y
manda el correo.

**3 · Transferencia bancaria** — `OrderMethods.cs:695` →
`crearPrimerCodigoRecogerSucbanktransfer` (`CodigoRecogerSucursal.cs:198`)

```csharp
if (order.metodoEnvio == "instore_pickup" && order.Agente != null && order.metodoPago == "banktransfer")
```

Copia casi literal del anterior, añadida el 20-ago-2026 con el work item 8600. **No estaba
en ningún checklist hasta hoy.** Lleva `Console.WriteLine` de depuración dentro.

**4 · Regenerar** — `OrdersController.cs:406` → `NuevoCodigoRecogerSucursal`
(`CodigoRecogerSucursal.cs:349`) → `UpdatePickUpCode` (`:367`)

**5 · Consultar** — `OrdersController.cs:346` → `GetPickUpCode` (`CodigoRecogerSucursal.cs:56`)

Es **E-15**, ya migrado: `Methods\Order\StorePickupMethods.cs` en ServicioSAP, commit
`8cf2c52`. Sin cutover todavía.

**6 · Correo** — `RecogerEnSucursalCorreo` (`CodigoRecogerSucursal.cs:648`), que se alimenta
de `GetDatosCteCorreo` (`:582`)

Cambió el 24-ago: ganó el parámetro `idEcommerce` y el texto pasó de *"tu pedido está listo,
ya puedes pasar a recogerlo"* a *"comparte esta clave con el vendedor en sucursal"*.

---

## 3. Equivalencias — dónde va cada pieza

### Tablas

| Hoy, en Intelisis | Equivalente | Estado |
|---|---|---|
| `TrWDM0285_CteRecoge` | **`BpRecogePedidos`** en SIGMAVI | ✅ **Ya existe** — `MaviSAP: Tables\BpRecogePedidos.sql`, Miguel Angel Aguilar Marín, 28/04/2025 |
| `eCommerceDetPedidos` | **`EcommerceDetPedidos`** en SIGMAVI | ✅ **Ya existe** — `MaviSAP: Tables\CREATE TABLE EcommerceDetPedidos.sql`, y trae columna `RecogerEnSucursal BIT` |
| `Venta` | SAP, wrapper **SD36** | ✅ `SalesMethods.CheckDocumentExistsSD36Async` |
| `Cte` | SAP, wrapper **BP05** | ✅ `partner/client` |
| `VentaEntrega` | SAP, entrega | 🔴 **Sin wrapper identificado** — es de Dev 1 |

`BpRecogePedidos` tiene exactamente las columnas que el flujo usa: `IdEcommerce`, `Nombre`,
`Correo`, `Telefono`, `ClaveVenta`.

> ⚠️ **`Telefono` es `BIGINT` en SIGMAVI** y el legado le pasa `VarChar` tras limpiar los
> no-dígitos con `Regex.Replace(datosCte[3], @"[^0-9]", "")`. Quien migre los escritores
> tiene que conservar esa limpieza o el insert revienta.

### Procedimientos

| Hoy | Equivalente | Estado |
|---|---|---|
| `SpWDM0285_CteRecoge` — escribe la fila, 5 parámetros | ninguno | 🔴 **Falta.** No está en `MaviSAP\StoreProcedure`; hay que sacar su definición de Intelisis |
| consulta de datos para el correo | **`SpCodigoRecogeSucursal`** | ✅ **Ya existe** — `MaviSAP: StoreProcedure\SpCodigoRecogeSucursal.sql`, Miguel Marín, 16/05/2025 |

> 📌 **`SpCodigoRecogeSucursal` ya define el patrón de la migración.** No consulta Intelisis:
> recibe **tres JSON** —`@ClienteJson`, `@VentaJson`, `@VentaCteJson`— que el C# obtiene de
> las APIs de SAP, los abre con `OPENJSON` en tablas temporales y los cruza contra
> `EcommerceDetPedidos` y `BpRecogePedidos` de SIGMAVI. Devuelve nombre, movimiento, correo,
> `idOrden` y `ClaveVenta`.
>
> Es exactamente la regla de reparto de los mixtos: **Dev 1 y Dev 2 traen el dato de SAP,
> Dev 3 pone la tabla en SIGMAVI y el cruce.** El que escriba los procesos 1 a 4 debería
> copiar esta forma en vez de inventar otra.

### Consultas que hoy cruzan a Intelisis

| Método | Qué consulta | Después de migrar |
|---|---|---|
| `GetDatosCte` | `Venta` + `Cte` + `VentaEntrega` + `EcommerceDetPedidos` | SD36 + BP05 + entrega, y `EcommerceDetPedidos` local |
| `GetDatosCteCorreo` | `Venta` + `TrWDM0285_CteRecoge` | **`SpCodigoRecogeSucursal`**, ya resuelto |
| `OrderId` | `ecommercedetpedidos` | tabla local de SIGMAVI |
| artículos del correo | `eCommerceDetPedidos` | tabla local de SIGMAVI |
| `ValidaDuplicidadIdEcommerce` | cuenta filas de la tabla | `BpRecogePedidos` |
| `GetCodigoDuplicado` | cuenta claves repetidas | `BpRecogePedidos` |

### Lo que no depende de ninguna base

`GenerarIdRecogerEnSucursal` calcula la clave con un **CRC sobre `IdEcommerce` + la fecha
al segundo**, y reintenta si sale repetida. Se porta tal cual, sin cambios: no toca SAP ni
Intelisis, solo necesita poder consultar duplicados.

> 🔎 Tiene tres salidas de emergencia curiosas que conviene conservar por paridad: a partir
> del intento 3 recorta dos caracteres y pega aleatorios; pasado el 19 acepta la clave
> aunque esté duplicada; y si tras 20 vueltas sigue vacía, devuelve la constante
> **`F41LH4SH00`**.

---

## 4. Orden de migración propuesto

El flujo no se puede cortar por la mitad: mientras los escritores estén en Intelisis y el
lector en SIGMAVI, la tabla nueva está vacía y `GetPickUpCode` responde 404 a todo.

| Paso | Qué | Quién | Bloquea a |
|---|---|---|---|
| 1 | Sacar `SpWDM0285_CteRecoge` de Intelisis y recrearlo en SIGMAVI | Dev 3 | todo lo demás |
| 2 | Wrapper de `VentaEntrega` para el teléfono | Dev 1 | el proceso 2 |
| 3 | Migrar la siembra de `setOrder` (proceso 1) | Dev 2 | que la tabla tenga filas |
| 4 | Migrar `createStorepickupCode` (proceso 2) | Dev 2 | que haya claves |
| 5 | Migrar la rama banktransfer (proceso 3) | Dev 2 | — |
| 6 | Migrar `generateNewStorepickupCode` (proceso 4) | Dev 2 | — |
| 7 | **Probar E-15** contra datos reales | Dev 3 | el cutover |
| 8 | Cutover de E-15 en la DMZ | Dev 3 | despliegue |
| 9 | Migrar el correo (proceso 6) sobre `SpCodigoRecogeSucursal` | Dev 2 | — |

**El paso 1 es el que nadie tiene asignado** y es el que bloquea al resto.

Se puede adelantar el paso 7 insertando una fila a mano en `BpRecogePedidos`, que es lo
único que permite validar E-15 antes de septiembre.

---

## 5. Riesgos

🔴 **Aplicar el cutover de E-15 antes del paso 3 deja sin clave a todos los pedidos.** Hoy
la ruta de la DMZ devuelve la clave real leyendo Intelisis; en cuanto apunte a ServicioSAP
devolverá 404 hasta que los escritores crucen. Y ese 404 es el mismo que significa "no
existe", así que el cliente no distingue una cosa de otra.

🟠 **Ninguna de las rutas de escritura existe en la DMZ.** Ni `createStorepickupCode` ni
`generateNewStorepickupCode` aparecen en `APIMagentoDMZ`. Se llaman desde dentro de la LAN o
directamente desde Magento; hay que confirmar quién las invoca antes de moverlas, porque no
hay una capa intermedia donde hacer el cutover.

🟠 **Los procesos 1 y 3 no tienen ruta**, así que se migran junto con `setOrder`, que es la
partida más grande de Dev 2 — agendada para febrero de 2027 en el caso de
`createStorepickupCode`. Si esa fecha se mantiene, E-15 queda escrito y sin poder probarse
durante meses.

🟡 **La duplicidad se valida en C#, no en la base.** `BpRecogePedidos` no tiene índice único
sobre `IdEcommerce` ni sobre `ClaveVenta`; el legado cuenta filas antes de insertar. Con dos
peticiones simultáneas caben dos filas para el mismo pedido. Es deuda heredada, pero al
recrear la tabla hay ocasión de cerrarla.

🟡 **El proceso 3 es copiado del 2.** Dos implementaciones de la misma cosa que ya empezaron
a divergir. Al migrarlas conviene unificarlas en un método con el método de pago como
parámetro.
