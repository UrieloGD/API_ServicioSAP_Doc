---
tags: [flujo, migracion, ola-8, catalogo, sqlite]
partida: E-16…E-45
actualizado: 2026-09-08
---

# Flujo completo de la Ola 8 — reubicación de llamadores

Mapa de punta a punta: dónde arranca el flujo, por dónde pasa, qué base y qué tabla toca en
cada paso, y dónde termina. Levantado leyendo `APIMagento` y `APIMagentoDMZ` el 7-sep-2026.

> **La Ola 8 no porta rutas.** Las 30 rutas de la DMZ (`E-16`…`E-45`) se quedan donde están.
> Lo que desaparece al apagar APIMagento es **quién las llama**. Este documento existe para
> saber exactamente qué hay que reconstruir y qué arrastra cada pieza.

## Las dos entradas

Todo el bloque de catálogo cuelga de **dos rutas de APIMagento**, no de una. Ninguna la
invoca un usuario: las agenda la LAN.

| Entrada | Archivo | Qué dispara |
|---|---|---|
| **A** · `product/updateProduct` | `Controllers\ProductsController.cs:18` | 6 de las 7 cargas de catálogo + toda la importación de productos |
| **B** · `product/updateConfigurableProduct` | `Controllers\ProductsController.cs:144` | La carga de `children` + los configurables |

Hay además **tres llamadores sueltos** que no cuelgan de ninguna de las dos, y que se
disparan desde rutas de órdenes o de stock.

---

## Entrada A — `product/updateProduct`

Diecisiete pasos en secuencia, dentro de un solo `try`. Los marcados 🟦 son los llamadores
que reconstruye Dev 3; los 🟥 son de la herramienta de importación y hoy van a Intelisis.

| # | Paso | ID | Destino | Base · tabla |
|---|---|---|---|---|
| 1 | `pm.createBackup()` | 🟥 | LAN | **IntelisisTmp** — respaldo |
| 2 | `mage.deletePromociones()` | 🟦 E-24 | DMZ → Magento | *ninguna* — vacía las categorías `OUTLET` en Magento |
| 3 | `mage.getProductWithWebsites()` | 🟦 E-22 | DMZ → Magento | **SQLite** · `product_in_stores` (borra y recarga) |
| 4 | `mage.getAttributes()` | 🟦 E-16 | DMZ → Magento | **SQLite** · `attribute_options` (borra y recarga) |
| 5 | `mage.getGeneralAttributes()` | 🟦 E-17 | DMZ → Magento | **SQLite** · `attributes` (borra y recarga) |
| 6 | `mage.getAttributeSets()` | 🟦 E-18 | DMZ → Magento | **SQLite** · `attribute_sets` (borra y recarga) |
| 7 | `mage.getCategories()` | 🟦 E-20 | DMZ → Magento | **SQLite** · `categories` (borra y recarga) |
| 8 | `mage.sendAttributesToIntelisis()` | 🟦 E-19 | DMZ → Magento **+ MySQL + Intelisis** | ver abajo ⚠️ |
| 9 | `pm.agruparconfigurables()` | 🟥 | LAN | **IntelisisTmp** · `SpVTASAgruparConfigurables` |
| 10 | `pm.DeleteProducts()` | 🟥 | local | **SQLite** · `products`, `product_history` |
| 11 | `pm.exporta_art(viu / muebles_america / mavi)` | 🟥 | LAN | **IntelisisTmp** — lectura del catálogo |
| 12 | `pm.ejecutarSp("truncate …")` | 🟥 | LAN | **IntelisisTmp** · `VTASDEcommerceExportaArtExistencia` |
| 13 | `pm.BuildJsonAndSendWithImage()` | 🟥 | DMZ → Magento | `product/uploadImage` (E-37) + share SMB |
| 14 | `tm.generaEtiqueta()` | 🟥 | LAN | **IntelisisTmp** — etiquetas |
| 15 | `pm.BuildJsonAndSend(×3)` | 🟥 | DMZ → Magento | `product/updateProduct/{store}` (E-31) |
| 16 | `pm.BuildCSV(×3)` | 🟥 | local | filesystem — CSV de salida |

**Los pasos 2 a 8 son la parte de Dev 3.** Están intercalados entre trabajo de Intelisis, así
que reubicar el llamador **obliga a partir esta ruta en dos**: el bloque de catálogo se va a
ServicioSAP y el resto se queda con la herramienta de importación.

### ⚠️ El paso 8 tiene tres destinos, no uno

`sendAttributesToIntelisis` (`Conn\Magento.cs:162`) hace más de lo que dice el nombre y más
de lo que decía el checklist:

| Tramo | Qué hace | Base |
|---|---|---|
| 1 | Lee `attribute_sets` de SQLite, pide `magento/attributeSetChildren/{id}` por cada set, cruza contra `attribute_options` y escribe una fila por atributo | **SQLite** · `atributos_de_magento` |
| 2 | `TRUNCATE` + `INSERT` de las dos tablas anteriores | 🔴 **MySQL** `172.16.202.29` · base `aplicaciones_web` · `atributosdemagento`, `atribmgtovalorlista` |
| 3 | `exec SpWDM0285_AtributosdeMagento 'ActAtrib'` | 🟠 **IntelisisTmp** en MAVICUBOS |

Los tramos 2 y 3 viven en `Metodos\AttributeMethods.cs:18`, no en `Magento.cs`, que es por qué
pasaron desapercibidos.

**MySQL no aparece en la regla de destinos del 5-ago.** No está ni entre las cuatro bases que
se quedan ni entre las que necesitan equivalencia — sencillamente no se contempló.

> ⏸️ **Decisión del 7-sep (magalindo): se pospone, no se resuelve.** Las tablas
> `TcWDM0285_*` que alimenta esta cadena las consume `SPexportaArt`, cuya **migración a C#
> está incompleta** — la validación de atributos todavía no está en `EcommerceMethods.cs`, no
> se quitó a propósito. Así que los tramos 2 y 3 **no se dan de baja**: quedan pendientes
> hasta que se cierre la exportación de artículos, partida de Dev 2 (Sprint 9, 4-18 dic).
> El destino de MySQL se decide entonces, no ahora.

Este paso además **lee un archivo del disco**: `ignoreAttributes.txt`, con la lista de
atributos que se saltan. En el legado está en `C:\inetpub\wwwroot\api\`; en ServicioSAP la
ruta es configurable con `IGNORE_ATTRIBUTES_PATH`, y **el archivo hay que copiarlo al
servidor** o el paso revienta al arrancar.

---

## Entrada B — `product/updateConfigurableProduct`

| # | Paso | ID | Destino | Base · tabla |
|---|---|---|---|---|
| 1 | `mage.deleteChildren()` | 🟦 E-21 | local | **SQLite** · `children` — vacía |
| 2 | `mage.getChildren("all")` | 🟦 E-21 | DMZ → Magento | **SQLite** · `children` — acumula |
| 3 | `mage.getChildren("viu")` | 🟦 E-21 | DMZ → Magento | **SQLite** · `children` — acumula |
| 4 | `mage.getChildren("muebles_america")` | 🟦 E-21 | DMZ → Magento | **SQLite** · `children` — acumula |
| 5 | `pm.BuildJsonAndSendConfigurable(×2)` | 🟥 | DMZ → Magento | `product/updateConfigurableProduct/{store}` (E-32) |

El vaciado va **una sola vez** y las tres tiendas se acumulan encima. Es la única carga de
las siete que funciona así; las otras seis borran y recargan dentro del mismo método.

---

## Los tres llamadores sueltos

No cuelgan de las dos entradas anteriores.

| ID | Llamador en la LAN | Ruta que lo expone | Qué toca |
|---|---|---|---|
| **E-25** `deleteReservations` | `Conn\Magento.cs:285` | `product/updateStock` (`ProductsController.cs:179`) | Magento REST `mavi-truncate-inventoryreservation`. Ninguna base propia |
| **E-23** `getOrderId` | `OrdersController.cs:417` | `order/getOrderId/{idEcommerce}` | 🟠 tras la respuesta llama `InsertDetPedido` → lee `Venta`/`VentaD` y ejecuta `SpVTASeCommerceDetPedidos` en **IntelisisTmp** |
| **E-30** `SetCAccount` | `Conn\Magento.cs:413` | lo invoca `OpenpayMethods.cs:285` | Magento REST `monedero/contado/setCAccount`. Ninguna base propia |

> 🟠 **E-23 arrastra Intelisis.** El reenvío en sí es limpio, pero su llamador escribe el
> detalle del pedido en IntelisisTmp. Reubicarlo sin resolver esa equivalencia deja el flujo a
> medias.

---

## Órdenes — E-28 y E-29

| ID | Ruta de la DMZ | Quién la llama hoy |
|---|---|---|
| **E-28** `order/setOrderStatus` | Magento REST `omnipro-orderstatus/order` | **Cinco sitios**: `OrdersController.cs:338`, tres puntos de `OpenpayMethods` (130, 145, 189) y `CodigoRecogerSucursal.cs:192` |
| **E-29** `order/jsonOrders/{incrementId}` | Magento REST `jsonOrders/{id}` | `Magento.getOrderInfoAndSet` (`Conn\Magento.cs:361`), expuesto en `order/getOrderInfoAndSet/{incrementId}` |

**E-28 se reconstruye como un único helper compartido**, decisión del 12-ago: cinco copias de
la misma petición son lo que termina divergiendo. Lo entrega Dev 3 y lo consume Dev 2.

**E-29 se reconstruye del lado de Dev 2**: su llamador está dentro de `getOrderInfoAndSet`,
que además ejecuta `ReSetPedido` y `SetPedido` contra IntelisisTmp. No es nuestro.

---

## Resumen por base

Qué toca la ola completa, sumando los dos flujos.

### SQLite — `data.db` · **la única base que Dev 3 escribe en esta ola**

| Tabla | Quién la escribe | Operación |
|---|---|---|
| `attribute_options` | E-16 | borra + recarga |
| `attributes` | E-17 | borra + recarga |
| `attribute_sets` | E-18 | borra + recarga |
| `atributos_de_magento` | E-19 | borra + recarga |
| `categories` | E-20 | borra + recarga |
| `children` | E-21 | vacía una vez, acumula 3 tiendas |
| ~~`no_imagen_product`~~ | 🗑️ descartado | ya no se carga |
| `product_in_stores` | E-22 | borra + recarga |
| `products`, `product_history` | 🟥 importador | borra / resetea deltas |

Las siete primeras **existen y vienen pobladas** en el `data.db` del 1-sep-2026. No hay que
crearlas — decisión del 2-sep, se descartó el script que las generaba.

Todas se leen después: `atributos_de_magento` y `attribute_options` las consume el propio
E-19; el resto las lee la herramienta de importación al armar los JSON de producto.

### Magento — vía DMZ, sin base propia

Las siete cargas leen de Magento REST y no escriben nada allá. **Tres sí escriben**: E-24
vacía las categorías `OUTLET`, E-25 vacía las reservas de inventario y E-30 fija
la cuenta de contado.

### 🔴 MySQL `aplicaciones_web` — `172.16.202.29`

Solo la toca E-19, tramo 2. **Destino no contemplado por ninguna regla del proyecto.**

### 🟠 IntelisisTmp en MAVICUBOS

La tocan E-19 (tramo 3) y el llamador de E-23, más todo el bloque 🟥 del importador
(`createBackup`, `agruparconfigurables`, `exporta_art`, `ejecutarSp`, `generaEtiqueta`).

---

## Hallazgos

🔴 **E-19 no era solo SQLite.** El checklist afirmaba que *"`sendAttributesToIntelisis` no
escribe en Intelisis, escribe en SQLite"*. Es cierto para el primer tramo y falso para los
otros dos. La mitad de SQLite ya está portada; los tramos de MySQL e Intelisis quedan
pendientes de destino.

🗑️ **`getNoImageProduct` — dada de baja el 7 sep, sin ID.** Ninguna ruta ni método la invoca en
APIMagento: está solo su definición en `Conn\Magento.cs:290`. Sin llamador que copiar no hay
forma de saber con qué tienda se llamaba, y el resultado depende enteramente de eso —`all`
devuelve 1 producto, `viu` 1 704, `muebles_america` 1 784, `mavi` 14—. Las 831 filas de
`no_imagen_product` en la base del servidor no coinciden con ninguna, así que vienen de un
estado anterior del catálogo. Se llegó a escribir y probar antes de retirarla.

⏳ **Las dos entradas mezclan alcances, y su agenda queda para después.** `product/updateProduct`
intercala los seis llamadores de Dev 3 con diez pasos de Intelisis en un solo `try`. Al
partirla hay que decidir **quién agenda cada mitad** y en qué orden — hoy el orden lo
garantiza que sea una sola llamada secuencial, y el importador lee las tablas de SQLite que
llenan nuestras cargas.

> **Decisión del 7 sep:** lo que apunta a estos métodos se migra en una partida posterior. El
> disparador actual no está en ninguno de los tres repos y desaparece con la LAN, así que esta
> ola entrega los llamadores reconstruidos pero **no su agenda**.

🟡 **Cada `INSERT` abre su propia conexión SQLite.** Es el patrón del legado (`Conn\DB.cs`
abre y cierra por llamada). Con 446 filas son 13 segundos medidos; `atributos_de_magento`
tiene 24 076.

🟡 **Los `INSERT` se arman concatenando, sin escapar.** Como `Set` se traga las excepciones,
una etiqueta con apóstrofo se pierde en silencio. El legado lo hace igual — deuda heredada.

---

## Dónde termina

El flujo **no termina en una base**: termina en Magento.

Las siete cargas dejan el catálogo de Magento espejado en SQLite. Esa copia local es lo que la
herramienta de importación consulta para armar los JSON de producto que luego **devuelve a
Magento** por `product/updateProduct/{store}`, `updateConfigurableProduct/{store}`,
`updateStock`, `updatePrice` y `uploadImage`.

Es decir: el ciclo sale de Magento, pasa por SQLite, se cruza con el catálogo de Intelisis y
vuelve a Magento. **La Ola 8 es la mitad de ida.** La de vuelta son las ocho rutas de 8.4, que
pasan sin cambio porque las atiende la herramienta de importación.
