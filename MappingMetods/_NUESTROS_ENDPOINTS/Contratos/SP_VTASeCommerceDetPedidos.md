---
tags: [sp, intelisis, mapeo, migracion, ola-8, sd36]
partida: E-23
actualizado: 2026-09-08
---

# `SpVTASeCommerceDetPedidos` — mapeo de lógica

Procedimiento de **IntelisisTmp** que guarda el detalle de los pedidos hechos en Magento.
Es lo que bloquea **E-23** (`getOrderId`): el reenvío en sí es limpio, pero su llamador
`InsertDetPedido` termina aquí.

| | |
|---|---|
| Base | `IntelisisTmp` en MAVICUBOS 🟠 |
| Desarrollo | DM0336 · creado 12-01-2019 por Marco Antonio Valdovinos |
| Última modificación | 28-10-2021 · Valentín Camacho — validar existencia al cambiar SKU por región |
| Tabla principal | `eCommerceDetPedidos` — **equivalencia SD36** |
| Servidor vinculado | ninguno |

## Firma

```sql
@Opc varchar(18), @UEN int, @IdMag varchar(50), @Art varchar(20),
@Precio float, @Preciosesp float, @Cantidad int, @Descto float,
@idOrden varchar(20) = NULL, @Cp varchar(5) = NULL, @RecSuc bit = NULL
```

Tres ramas según `@Opc`: **`Insertar`**, **`Limpiar`** y **`PrecioIncorrecto`**.

> ⚠️ **`@Cantidad` cambia de significado según la rama.** En `Insertar` son unidades del
> artículo; en `PrecioIncorrecto` es el **número de pagos**, y así lo dice un comentario
> dentro del propio SP. Sobrecarga de parámetro que hay que respetar al portarlo.

## Quién lo llama

| Llamador | Rama | Notas |
|---|---|---|
| `OrderMethods.InsertDetPedido` (:456, :482) | `Limpiar` y luego `Insertar` por línea | Lo dispara **E-23** `order/getOrderId`. Lee `Venta`+`VentaD` para armar las líneas |
| `OrderMethods.SetPedido` (:582, :599) | `Limpiar` y luego `Insertar` por línea | Partida de Dev 2 |
| `OrderMethods` (:1324) | `PrecioIncorrecto` | Pasa `numpagos` en el hueco de `@Cantidad` |

> 🔴 **E-23 nunca ejercita la lógica de región.** `InsertDetPedido` pasa `codigoPostal = "1"`
> y `recogerSucursal = 0` fijos (`OrderMethods.cs:482`). Un CP de un carácter no está en
> `VTASCCodigoPostalRegionCelular`, así que **siempre** cae por la rama "no es región
> celular". Solo `SetPedido` manda el CP real. Al portar E-23 hay que decidir si se conserva
> ese placeholder o se corrige.

> Se salta el artículo `SEGU00001` — el seguro — antes de insertar.

---

## Rama `Insertar`

Inserta una línea en `eCommerceDetPedidos`. Todo el peso está en decidir **qué SKU** se
guarda cuando el artículo es de telefonía.

### Tablas

| Nombre | Tipo | Campos | Para qué |
|---|---|---|---|
| `Art` | PERMANENTE | `Familia` | Decide si aplica la lógica de región: solo si `Familia = 'TELEFONIA'` |
| `#RegionSKUDetPedidos` | **TEMPORAL** (`CREATE TABLE`) | `Region5`, `Region6` | El par de SKUs equivalentes del artículo |
| `VTASCRegionSku` | PERMANENTE | `SkuRegion5`, `SkuRegion6` | Catálogo de pares región 5 ↔ región 6 |
| `VTASCCodigoPostalRegionCelular` | PERMANENTE | `CodigoPostal`, `Estatus` | Dice si el CP de entrega pertenece a la región celular |
| `eCommerceExist` | PERMANENTE | `articulo`, `existencia` | Existencia base del SKU destino |
| `VTASDEcommerceExportaArtExistencia` | PERMANENTE | `Articulo`, `TotalArticulos` | Existencia que **pisa** a la anterior cuando trae valor |
| `eCommerceDetPedidos` | PERMANENTE — **escribe** | `UEN`, `IdPedido`, `Articulo`, `Precio`, `PrecioEspecial`, `Descuento`, `Cantidad`, `idOrden`, `RecogerEnSucursal` | El detalle del pedido |

### La regla del cambio de SKU por región

Solo para `Familia = 'TELEFONIA'` y solo si el artículo aparece en `VTASCRegionSku`. En
cualquier otro caso se inserta `@Art` tal cual.

| CP en `VTASCCodigoPostalRegionCelular` | `@Art` es… | Qué hace |
|---|---|---|
| **Sí** (Estatus = 1) | el SKU de **región 5** | Mira la existencia del SKU de **región 6**: si es > 0 **lo cambia**, si no conserva `@Art` |
| **Sí** | el SKU de **región 6** | Lo conserva — ya es el correcto |
| **No** | el SKU de **región 6** | Mira la existencia del SKU de **región 5**: si es > 0 **lo cambia**, si no conserva `@Art` |
| **No** | el SKU de **región 5** | Lo conserva |

En una frase: **empareja el SKU con la región del domicilio de entrega, pero solo si el SKU
destino tiene existencia.** Esa condición de existencia es la modificación del 28-10-2021;
antes cambiaba a ciegas y se vendía lo que no había.

La existencia se resuelve así, dando prioridad a la tabla de exportación:

```sql
CASE WHEN ISNULL(ex.TotalArticulos, '') = '' THEN e.existencia ELSE ex.TotalArticulos END
```

### Salida

`SELECT 'concluido' Result` — el mismo texto tanto si hubo cambio de SKU como si no. **El
llamador no se entera de que le cambiaron el artículo.**

---

## Rama `Limpiar`

```sql
DELETE FROM eCommerceDetPedidos
WHERE IdPedido = @IdMag AND RefPedidoIntelisis IS NULL
```

Borra las líneas del pedido **que todavía no se ligaron a Intelisis**. La condición
`RefPedidoIntelisis IS NULL` es la que protege lo ya procesado.

Se llama siempre antes de reinsertar, así que el par `Limpiar` + `Insertar` funciona como un
reemplazo del detalle completo.

Devuelve `'concluido'`.

---

## Rama `PrecioIncorrecto`

No escribe: **devuelve un informe** de las líneas cuyo precio no cuadra con el catálogo
exportado, o cuyo artículo ya no existe.

### Tablas

| Nombre | Tipo | Campos | Para qué |
|---|---|---|---|
| `#DetalleeCommerceDetPedidos` | **TEMPORAL** (`CREATE TABLE`) | `ID` (IDENTITY, sin uso), `Articulo`, `Precio`, `PrecioEspecial`, `Cantidad` | Copia del detalle del pedido |
| `eCommerceDetPedidos` | PERMANENTE — lee | `idpedido` | Origen de la copia |
| `ecomerceexportaart` | PERMANENTE — lee | `sku`, `price`, `special_price`, `price_installments`, `product_websites`, `product_online` | El precio publicado en Magento |

### La regla

Por cada línea calcula el **precio esperado**:

| Condición | Precio esperado |
|---|---|
| `@Cantidad > 1` (más de un pago) | `price_installments` |
| Un solo pago y `special_price > 0` | `special_price` |
| Un solo pago sin oferta | `price` |

Y devuelve las líneas donde **`precio < precio esperado`** o donde el SKU no apareció en
`ecomerceexportaart` (marcadas con `Artinexistente = 1`).

Es decir: detecta que el cliente esté pagando **menos** de lo publicado. Un precio por encima
no se reporta.

> 🔴 **La UEN se traduce con `REPLACE` anidados**, no con un `CASE`:
> ```sql
> SET @Nombreuen = REPLACE(REPLACE(@UEN, '1', 'muebles_america'), '2', 'viu')
> ```
> Funciona para 1 y 2 y **falla en silencio para todo lo demás**. Con UEN 3 (`mavi`) el valor
> queda en `'3'`, no empata con ningún `product_websites`, y **todas las líneas salen como
> artículo inexistente**. Cualquier UEN de dos dígitos produciría además una cadena absurda.

---

## Inventario de tablas

**Temporales — 3**

| Tabla | Rama | Cómo se crea |
|---|---|---|
| `#RegionSKUDetPedidos` | `Insertar` | `CREATE TABLE` + `INSERT` |
| `#DetalleeCommerceDetPedidos` | `PrecioIncorrecto` | `CREATE TABLE` + `INSERT` |
| — | `Limpiar` | ninguna |

Las dos se comprueban y se eliminan al entrar y al salir, con el patrón
`IF EXISTS (… OBJECT_ID('Tempdb.dbo.#X') …) DROP TABLE`.

**Permanentes — 7**

| Tabla | Lee | Escribe |
|---|---|---|
| `eCommerceDetPedidos` | ✅ | ✅ `INSERT` y `DELETE` |
| `Art` | ✅ | |
| `VTASCRegionSku` | ✅ | |
| `VTASCCodigoPostalRegionCelular` | ✅ | |
| `eCommerceExist` | ✅ | |
| `VTASDEcommerceExportaArtExistencia` | ✅ | |
| `ecomerceexportaart` | ✅ | |

**La única que escribe es `eCommerceDetPedidos`.** Las otras seis son consulta.

## Qué hay que resolver para portarlo

🟠 **Las siete tablas viven en IntelisisTmp** y ninguna tiene equivalencia definida todavía.
`eCommerceDetPedidos` ya está identificada como **SD36**; las otras seis no.

De ellas, cuatro son de la lógica de región —`VTASCRegionSku`,
`VTASCCodigoPostalRegionCelular`, `eCommerceExist`, `VTASDEcommerceExportaArtExistencia`— y
**podrían no hacer falta para E-23**, porque su llamador pasa el CP fijo en `"1"` y nunca
entra por esa rama. Confirmarlo antes de arrastrar cuatro tablas que quizá nadie use por este
camino.

🟡 **`ecomerceexportaart` es la tabla que llena `SPexportaArt`**, cuya migración a C# está en
curso y **incompleta** (decisión de magalindo, 7-sep). La rama `PrecioIncorrecto` depende de
ella, así que hereda esa misma espera.

🟡 **Deuda que conviene no replicar:**

- La traducción de UEN con `REPLACE` anidados, que rompe con `mavi`.
- `@Cantidad` significando dos cosas distintas según la rama.
- El `'concluido'` que oculta que se cambió el SKU del cliente.
- Las subconsultas de existencia son **escalares sin `TOP 1`**: si `eCommerceExist` llegara a
  tener dos filas del mismo artículo, el SP revienta.
- `SET ANSI_NULLS OFF` y `SET QUOTED_IDENTIFIER OFF` en la cabecera, ambos en desuso.
