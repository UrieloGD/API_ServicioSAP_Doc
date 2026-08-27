# Mapeo del Método: `OrderMethods.InsertDetPedido()` — Lógica de Negocio

**Endpoint:** `POST /order/getOrderId/{idEcommerce}`
**Archivo:** `APIMagento/WebApiMagento/Metodos/OrderMethods.cs`
**Método:** `public void InsertDetPedido(string incrementId, string orderId)` — Líneas **453–483**
**Capa:** LAN (Nexo) — **sin proxy DMZ** ([[01_DMZ_Controller]])
**Rol en el flujo:** Reconstruir el detalle del pedido en la tabla puente `eCommerceDetPedidos` a partir de lo ya registrado en Intelisis (`Venta` + `VentaD`), asociándolo al `entity_id` de Magento obtenido en el paso anterior. Es un **método de reparación**: borra el detalle previo y lo vuelve a insertar línea por línea.

> Cadena de flujo completa: [[01_DMZ_Controller]] *(no es proxy: es la dependencia que provee el `orderId`)* → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

**No hay modelo de request.** El método recibe dos `string` producidos por el controller:

| Parámetro | Tipo | Origen | Semántica |
|---|---|---|---|
| `incrementId` | string | ruta `{idEcommerce}` | `Venta.IDEcommerce` / `eCommerceDetPedidos.IdPedido` |
| `orderId` | string | **respuesta de la DMZ** (`magento/getOrderId/…`) | `entity_id` de Magento → `eCommerceDetPedidos.idOrden` |

> ⚠️ `orderId` **no está validado en ninguna capa**: es el texto crudo que devolvió `curl.Get`, tras `.Replace().Trim()`. Si `Curl` convirtió una excepción en cuerpo de respuesta y el filtro del controller no la detectó ([[02_LAN_Controller]] obs. 1), lo que llega aquí es un stack trace — y termina insertado en la BD.

**Retorno:** `void`. Sin indicador de éxito, sin conteo de filas.

---

## Flujo de Ejecución Detallado

```csharp
public void InsertDetPedido(string incrementId, string orderId)
{
    detallePedido("Limpiar", 1, "", incrementId, "", "1.0", "1.0", "1", "1.0", "1", "1", 0);

    Connection con = new Connection();
    SqlConnection conexion = new SqlConnection(con.sCadenaConexion);
    conexion.Open();
    SqlCommand select = new SqlCommand("SELECT vd.* FROM Venta v WITH(NOLOCK) INNER JOIN VentaD vd WITH(NOLOCK) ON v.ID = vd.ID WHERE v.IDEcommerce = '" + incrementId + "' and v.mov = 'pedido'", conexion);
    select.CommandTimeout = 9999999;

    SqlDataReader tabla = select.ExecuteReader();

    string store = "";
    while (tabla.Read())
    {
        if (tabla["Articulo"].ToString() == "SEGU00001")
            continue;
        switch (tabla["UEN"].ToString())
        {
            case "1": store = "muebles_america"; break;
            case "2": store = "viu"; break;
        }
        detallePedido("Insertar", 1, store, incrementId, tabla["Articulo"].ToString(), tabla["Precio"].ToString(), "1.0", tabla["Cantidad"].ToString(), "1.0", orderId, "1", 0);
    }
}
```

### Paso 1 — Borrar el detalle previo (línea 455)

```csharp
detallePedido("Limpiar", 1, "", incrementId, "", "1.0", "1.0", "1", "1.0", "1", "1", 0);
```

Invoca el SP `SpVTASeCommerceDetPedidos` con `@Opc = 'Limpiar'`. En el SP (`SPsOrden/SpVTASeCommerceDetPedidos.sql` líneas **155–162**):

```sql
IF @Opc = 'Limpiar'
BEGIN
  DELETE FROM eCommerceDetPedidos WHERE IdPedido = @IdMag AND RefPedidoIntelisis IS NULL
  SELECT 'concluido' Result
END
```

- **`DELETE` acotado a `RefPedidoIntelisis IS NULL`**: solo borra las líneas que aún no fueron enlazadas a un pedido de Intelisis. Es la única protección del flujo, y es del lado del SP, no del C#.
- Se pasa `sUen = ""` → `iUen = 0` en `detallePedido` (líneas 951–962, ningún `case` coincide). Irrelevante para `'Limpiar'`, que no usa `@UEN`.
- El resto de parámetros son de relleno (`"1.0"`, `"1"`) y el SP los ignora en esta rama.

### Paso 2 — Leer el detalle desde Intelisis (líneas 457–463)

```sql
SELECT vd.*
FROM Venta v WITH(NOLOCK)
INNER JOIN VentaD vd WITH(NOLOCK) ON v.ID = vd.ID
WHERE v.IDEcommerce = '<incrementId>' and v.mov = 'pedido'
```

**Conexión:** `new Connection()` → `sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp`. *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)*

| Tabla | Rol | Campos consumidos por el C# |
|---|---|---|
| `Venta` (`v`) | filtro por `IDEcommerce` y `Mov` | — (solo `ID` para el JOIN) |
| `VentaD` (`vd`) | detalle | `Articulo`, `Precio`, `Cantidad`, `UEN` |

- 🔴 **`incrementId` concatenado directamente en el SQL** — **inyección SQL**. Ver observación 1.
- `SELECT vd.*` — trae todas las columnas de `VentaD` para usar cuatro. Ver observación 5.
- `WITH(NOLOCK)` en ambas tablas → lectura sucia sobre datos transaccionales.
- **`v.mov = 'pedido'` en minúsculas** — funciona por la *collation* case-insensitive de SQL Server, pero es inconsistente con el resto del proyecto (`Mov = 'Pedido'` en `CodigoRecogerSucursal.cs:432`, `Mov = 'Pedido'` en `OrderMethods.cs:136`). **Excluye `'Pedido VIU'`** si ese movimiento existe — mismo riesgo señalado en [[03_BusinessMethod|getPosCancellations]] obs. 1.
- **`CommandTimeout = 9999999`** (~115 días). Sin timeout efectivo.
- 🔴 **Ni `using`, ni `Close()`, ni `try/finally`.** La conexión y el reader se abren en la línea 459/463 y **nunca se cierran**. Ver observación 3.

### Paso 3 — Reinsertar línea por línea (líneas 466–482)

Por cada fila de `VentaD`:

**3.a — Filtro hardcodeado de artículo (líneas 468–469):**
```csharp
if (tabla["Articulo"].ToString() == "SEGU00001") continue;
```
`SEGU00001` es el SKU del **seguro / costo de envío**: en `SetPedido` se agrega como línea con `articulos.Add(order.costoEnvio + ",SEGU00001")` (`OrderMethods.cs:613`) y en `CreditMethods.CreditoWeb_InsertArticulo` recibe tratamiento especial (`CreditMethods.cs:900–904`). Aquí se **excluye del detalle reconstruido**: el pedido reparado pierde su línea de envío/seguro. Catálogo de negocio embebido en el código (Regla #7).

**3.b — Traducción `UEN` → nombre de tienda (líneas 470–479):**

| `VentaD.UEN` | `store` |
|---|---|
| `"1"` | `muebles_america` |
| `"2"` | `viu` |
| **otro** | **conserva el valor de la iteración anterior** |

🚩 La variable `store` se declara **fuera** del `while` (línea 465) y el `switch` **no tiene `default`**. Si una fila trae `UEN = 3` (`mavi`, que `detallePedido` sí reconoce en su propio `switch`, línea 959) o `NULL`, `store` **mantiene el valor de la fila anterior** y el artículo se inserta con la UEN equivocada. Si es la **primera** fila, `store` es `""` → `iUen = 0` en `detallePedido` → se inserta `UEN = 0` en `eCommerceDetPedidos`. Ver observación 2.

**3.c — Llamada al SP de inserción (línea 481):**
```csharp
detallePedido("Insertar", 1, store, incrementId, tabla["Articulo"].ToString(),
              tabla["Precio"].ToString(), "1.0", tabla["Cantidad"].ToString(),
              "1.0", orderId, "1", 0);
```

Mapeo real de argumentos contra la firma `detallePedido(sOpcion, partidas, sUen, sIdEcommerce, sArticulo, sPrecioArticulo, sPrecioEspecial, sCantidadArticulos, sDescuento, idOrden, codigoPostal, recogerSucursal)` (`OrderMethods.cs:943`):

| Parámetro del SP | Valor enviado | Origen | 🚩 |
|---|---|---|---|
| `@Opc` | `"Insertar"` | constante | |
| `@UEN` | `iUen` derivado de `store` | `VentaD.UEN` | ver 3.b |
| `@IdMag` | `incrementId` | ruta | |
| `@Art` | `VentaD.Articulo` | BD | |
| `@Precio` | `VentaD.Precio` | BD | |
| `@Preciosesp` | **`"1.0"`** | **constante** | 🚩 precio especial falso |
| `@Cantidad` | `VentaD.Cantidad` | BD | |
| `@Descto` | **`"1.0"`** | **constante** | 🚩 **descuento de 1.0 inventado en cada línea** |
| `@idOrden` | `orderId` | respuesta de Magento | sin validar |
| `@Cp` | **`"1"`** | **constante** | 🚩 código postal falso |
| `@RecSuc` | `0` | constante | 🚩 anula la marca de recogida en sucursal |

**Cuatro de los once parámetros son constantes inventadas.** Ver observación 4.

### El SP `SpVTASeCommerceDetPedidos`, rama `'Insertar'`

Fuente disponible: `SPsOrden/SpVTASeCommerceDetPedidos.sql`, líneas **12–154**. La rama no es un `INSERT` simple:

1. Lee `Art.Familia` del artículo (líneas 16–19).
2. **Si `Familia = 'TELEFONIA'`** (líneas 21–146) ejecuta una lógica de sustitución de SKU por región:
   - Consulta `VTASCRegionSku` (`SkuRegion5`, `SkuRegion6`) para el artículo.
   - Consulta `VTASCCodigoPostalRegionCelular` con **`@Cp`** para decidir la región.
   - Valida existencia en `eCommerceExist` + `VTASDEcommerceExportaArtExistencia` antes de cambiar el SKU.
   - Usa la tabla temporal `#RegionSKUDetPedidos`.
3. Inserta en `eCommerceDetPedidos (UEN, IdPedido, Articulo, Precio, PrecioEspecial, Descuento, Cantidad, idOrden, RecogerEnSucursal)` y devuelve `SELECT 'concluido' Result`.

🔴 **Como el C# envía `@Cp = "1"` (constante), la búsqueda en `VTASCCodigoPostalRegionCelular` nunca encuentra coincidencia** y toda la lógica de sustitución regional de SKU de telefonía cae por la rama `ELSE` (líneas 93–128). Ver observación 4.

### Manejo de errores

- `detallePedido` captura **solo `SqlException`** (línea 1052) y la loguea con `Logger.SetOrder("INFO [" + sIdEcommerce + "] ", ex.Message)` — **con nivel `"INFO"`, no `"ERROR"`**. Un fallo de inserción queda enterrado entre los mensajes informativos de `setOrder.log`.
- `InsertDetPedido` **no tiene `try/catch` propio**. Cualquier excepción que no sea `SqlException` (un `InvalidOperationException` por conexión no cerrada, un `NullReferenceException`) sube al controller, que **tampoco** la maneja ([[02_LAN_Controller]] obs. 4) → **HTTP 500**.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | SP | Acción | Origen |
|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | `eCommerceDetPedidos` | `SpVTASeCommerceDetPedidos` (`@Opc='Limpiar'`) | **Delete** | `InsertDetPedido:455` |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `Venta` | N/A (Inline SQL **concatenado**) | Select | `InsertDetPedido:460` |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `VentaD` | N/A (Inline SQL **concatenado**) | Select | `InsertDetPedido:460` |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `eCommerceDetPedidos` | `SpVTASeCommerceDetPedidos` (`@Opc='Insertar'`) | **Insert** | `InsertDetPedido:481` — **N veces** |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `Art` | `SpVTASeCommerceDetPedidos` | Select | SP, líneas 16–19 |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `VTASCRegionSku` | `SpVTASeCommerceDetPedidos` | Select | SP, líneas 36–49 (solo `TELEFONIA`) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `VTASCCodigoPostalRegionCelular` | `SpVTASeCommerceDetPedidos` | Select | SP, líneas 51–55 — **nunca coincide** (`@Cp = "1"`) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `eCommerceExist` | `SpVTASeCommerceDetPedidos` | Select | SP, líneas 68, 106 |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `VTASDEcommerceExportaArtExistencia` | `SpVTASeCommerceDetPedidos` | Select | SP, líneas 69, 107 |

**Tabla temporal (tempdb):** `#RegionSKUDetPedidos`.

**Stored Procedure:** `SpVTASeCommerceDetPedidos` — **fuente disponible** en `SPsOrden/SpVTASeCommerceDetPedidos.sql`. **No aplica `_SPS_FALTANTES.txt` para este endpoint.**

**Servicios externos (Regla #3 y #4):**

| Destino | Ruta | Vía | Ocurre en |
|---|---|---|---|
| Magento (resolver `entity_id`) | `magento/getOrderId/{incrementId}` → `rest/V1/orders?…` | LAN → DMZ → Magento REST | **controller**, no aquí ([[02_LAN_Controller]] paso 3) |

---

## Ejemplo de Respuesta (Response)

El método de negocio es `void`; lo que se ve en el cable lo produce el controller.

**Caso exitoso** — **HTTP 200**, texto plano con el `entity_id` de Magento:
```
"123456"
```
Efecto lateral invisible en la respuesta: se borraron y reinsertaron N filas en `eCommerceDetPedidos`.

**Caso sin datos / error de red** — **HTTP 200**, cuerpo `"0"`. Cubre cuatro situaciones distintas ([[02_LAN_Controller]] obs. 3): pedido inexistente en Magento, respuesta `"0"`, `WebException`, o `idEcommerce` inválido. **No se ejecuta ninguna escritura.**

**Caso peor (silencioso)** — **HTTP 200** con el `entity_id`, pero:
- el pedido no existe en `Venta` → el `SELECT` no devuelve filas → **el `DELETE` del paso 1 ya se ejecutó** y no se reinserta nada. **El detalle del pedido queda vacío y el endpoint responde éxito.**
- o el `INSERT` falló con `SqlException` → capturado dentro de `detallePedido` y logueado como `"INFO"`. Mismo resultado visible.

**Caso de error no capturado** — **HTTP 500** sin log (`InvalidOperationException` por agotamiento del pool de conexiones, ver observación 3).

> **Cuatro desenlaces, dos respuestas, y el más destructivo — "borré el detalle y no reinserté nada" — se presenta como éxito.**

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **🔴 Inyección SQL en `incrementId` — hallazgo más grave.** Línea **460**:
   ```csharp
   new SqlCommand("SELECT vd.* FROM Venta v WITH(NOLOCK) INNER JOIN VentaD vd WITH(NOLOCK) ON v.ID = vd.ID WHERE v.IDEcommerce = '" + incrementId + "' and v.mov = 'pedido'", conexion)
   ```
   `incrementId` viene **directamente del segmento de ruta**, sin validación en ninguna de las dos capas ([[02_LAN_Controller]] paso 2). Un valor como `x' OR 1=1--` altera la consulta. El endpoint está tras `[Authorize]`, lo que reduce —no elimina— la exposición.
   **No es un caso aislado:** el mismo patrón `String.Format`/concatenación aparece en `OrderMethods.IsValidated` (774), `ObtenerNumeroTablaSms` (807), `UpdateSetNoValidated` (842, 852), `GetCreatedAccount` (876), `DatosEntregaInsert` (907) y `CreditMethods.IsInTableStd` (1975). **Es un patrón sistemático del archivo, no un descuido puntual**, y debe abordarse como tal en la migración.

2. **`store` declarada fuera del loop, `switch` sin `default` — contaminación entre filas.** Líneas 465–479. Una fila con `UEN` distinto de `1` o `2` hereda la tienda de la fila anterior; si es la primera, se inserta `UEN = 0`. `detallePedido` sí contempla `mavi` → `3` (línea 959), pero este `switch` no lo mapea, así que **un pedido de la UEN `mavi` se reinsertaría con la UEN equivocada**.

3. **🔴 Fuga de conexión garantizada.** Líneas 458–463: `SqlConnection` y `SqlDataReader` se abren **sin `using`, sin `Close()` y sin `try/finally`**. El método termina y **nunca los libera**. Con `CommandTimeout = 9999999` y sin cierre, cada invocación retiene una conexión del pool hasta que el GC ejecute el finalizador — que en `SqlConnection` **no devuelve la conexión al pool de forma determinista**. Bajo uso repetido, agota el pool → `InvalidOperationException: Timeout expired. The timeout period elapsed prior to obtaining a connection from the pool`, que **tumba otros endpoints del mismo `AppPool`, no solo este**. Es inconsistente con el propio archivo: `GetPosCancellations` (240), `GetIntelisisStatuses` (298) y `detallePedido` (975) **sí** usan `using`.

4. **Cuatro parámetros de negocio inventados en cada inserción** (paso 3.c). Los efectos no son cosméticos:
   - **`@Descto = "1.0"`** — se graba un descuento de 1.0 en **todas** las líneas reconstruidas, sin importar el descuento real que tenía el pedido. **Corrupción de datos financieros.**
   - **`@Preciosesp = "1.0"`** — precio especial falso.
   - **`@Cp = "1"`** — código postal falso. **Rompe la lógica regional de telefonía del SP:** `VTASCCodigoPostalRegionCelular` nunca coincide, así que la sustitución de SKU por región (`SkuRegion5`/`SkuRegion6`) **nunca aplica el camino correcto**. Un artículo de telefonía reconstruido puede quedar con el SKU de la región equivocada.
   - **`@RecSuc = 0`** — se anula la marca de recogida en sucursal. **Un pedido `instore_pickup` reconstruido pierde esa condición en el detalle.**

   El `orderId` real de Magento sí se propaga correctamente (`@idOrden`), que es el objetivo del endpoint; pero el resto del detalle **se degrada en cada reconstrucción**.

5. **`SELECT vd.*` para consumir cuatro columnas.** Trae todo `VentaD` (tabla ancha de detalle de ventas) por red para leer `Articulo`, `Precio`, `Cantidad` y `UEN`. Debe proyectarse explícitamente.

6. **`DELETE` sin transacción antes de un `INSERT` que puede no ocurrir.** El paso 1 borra el detalle **antes** de saber si hay algo que reinsertar. Si el `SELECT` no devuelve filas (pedido inexistente, `Mov` distinto de `'pedido'`, `IDEcommerce` con espacios), **el detalle queda vacío y el endpoint responde éxito**. La única salvaguarda es la cláusula `RefPedidoIntelisis IS NULL` del SP, que protege las líneas ya enlazadas — pero no las que aún no lo están.

7. **`v.mov = 'pedido'` en minúsculas y sin `'Pedido VIU'`.** Depende de la *collation* case-insensitive y del supuesto no verificado de que solo existe un tipo de movimiento de pedido. Mismo gap que [[03_BusinessMethod|getPosCancellations]] obs. 1.

8. **`SEGU00001` hardcodeado** (línea 468). El SKU de seguro/envío se excluye del detalle reconstruido. Catálogo de negocio embebido; además significa que **el detalle reconstruido difiere del original** (que sí lleva esa línea, `OrderMethods.cs:613`).

9. **N llamadas al SP, una por artículo, cada una abriendo su propia conexión.** `detallePedido` hace `using (var vConexion = new SqlConnection(...))` en cada invocación (línea 975): un pedido de 10 artículos = 10 conexiones + 1 del `Limpiar` + 1 fugada del `SELECT`. Debe resolverse con una operación por lotes (TVP o `MERGE`).

10. **Errores de inserción logueados con nivel `"INFO"`.** `detallePedido` línea 1054: `Logger.SetOrder("INFO [" + sIdEcommerce + "] ", ex.Message)` dentro de un `catch (SqlException)`. Un fallo de escritura queda camuflado como informativo en `setOrder.log`. Regla #8.

11. **Solo se captura `SqlException`.** Un `InvalidOperationException` (conexión en mal estado) o un `FormatException` (`int.Parse` de `@Cantidad` en `detallePedido` línea 968–970 si `VentaD.Cantidad` viene con formato inesperado) **no se capturan** y suben hasta el 500.

12. **`CommandTimeout = 9999999`** (línea 461) y `60000` en `detallePedido` (línea 1020). Sin timeout real; una query bloqueada retiene el hilo de IIS indefinidamente.

13. **`orderId` sin validar llega a la BD.** Ver el contrato de entrada y [[02_LAN_Controller]] obs. 1: si la detección de error por subcadena falla, el texto de una excepción .NET se escribe en `eCommerceDetPedidos.idOrden`.

14. **`InsertDetPedido` es `void`.** Ni conteo de filas borradas/insertadas, ni indicador de éxito. Al migrar debe devolver `{ deleted, inserted, skipped }`.

15. **Método síncrono:** migrar a `async/await` (Regla #12). Prohibido `.Result` / `.Wait()`.

---

## Destino SAP — PENDIENTE DE DEFINICIÓN (conflicto documental abierto)

| Fuente | Clasificación asignada |
|---|---|
| `_EXCLUIDOS_Intelisis.md` (línea 119) | 🟡 **MIXTO** — `Magento (vía DMZ) + IntelisisTmp`, "en radar", `OrderMethods.cs:458` |
| `_EXCLUIDOS_Intelisis.md` (línea 213) | listado entre los **26 🟡 MIXTO** de `OrdersController` |
| `_INVENTARIO_NoIntelisis.csv` (línea 68) | `Mixto` — "Curl.Get a Magento + INSERT en Intelisis" |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` (línea 97) | `OrdersController (LAN-only)` — **`Out of scope`**, alcance `No` |
| `MIGRATION_STATUS_MASTER_v2.csv` (línea 121) | **`Out of scope`** — `No DMZ route - LAN-only endpoint`. *"No tiene ruta en DMZ, no lo consulta magento pero lo puede consultar otra aplicación, se desconoce."* |
| `MIGRATION_STATUS_MASTER_v2.csv` (línea 72) — **fila de la dependencia DMZ** | `MagentoController / magento/getOrderId/{incrementId}` → `MAGENTO`, **`Planed Dev 1`**, *"Never reaches Intelisis"* |

**Conflicto documental abierto** en dos ejes:

1. **De alcance:** `_EXCLUIDOS_Intelisis.md` lo mantiene 🟡 MIXTO / en radar; el master y `_ENDPOINTS_NoSAP` lo dan por `Out of scope`. **MIXTO es la clasificación correcta**: el método escribe en `eCommerceDetPedidos` de Intelisis vía SP y lee `Venta`/`VentaD`.
2. **De granularidad:** el master trata la ruta LAN y su dependencia DMZ como **dos endpoints independientes** con clasificaciones distintas (`Out of scope` vs `Planed Dev 1`). Como son **eslabones de la misma cadena** ([[01_DMZ_Controller]]), migrar uno sin el otro deja el flujo roto por la mitad.

Conforme a la **Regla #10**, no se asigna servicio OData.

### Elementos sin equivalente identificado

- **`eCommerceDetPedidos`** — tabla puente Magento↔Intelisis, propia de MAVI. La escriben este endpoint, `SetPedido` (`OrderMethods.cs:578, 595`) y `crearPrimerCodigoRecogerSuc` la lee. **Sin equivalente SAP**; candidata a `SigMavi` (Regla #1). Decisión no tomada en ninguna fuente.
- **`SpVTASeCommerceDetPedidos`** — el SP no es un simple `INSERT`: contiene la **lógica regional de sustitución de SKU de telefonía** (`VTASCRegionSku`, `VTASCCodigoPostalRegionCelular`, validación de existencia contra `eCommerceExist`). Esa regla de negocio **no está documentada fuera del SP** y debe replicarse explícitamente o declararse obsoleta.
- **`VTASCRegionSku`, `VTASCCodigoPostalRegionCelular`, `eCommerceExist`, `VTASDEcommerceExportaArtExistencia`** — catálogos MAVI. Regla #1: confirmar si migran a `SigMavi` o se reemplazan.
- **`Venta.IDEcommerce`** — mismo gap de mapeo del resto del controlador (¿`PurchNoC`? ¿`PurchNoS`?).
- **`VentaD`** — el detalle del documento de ventas sí tiene equivalente conceptual en SAP (posiciones del documento), pero el mapeo campo a campo (`Precio`, `Cantidad`, `UEN`, `Descuento`) **no está definido**.

### Puntos a cerrar con el Líder Técnico

1. **Resolver la contradicción de alcance:** 🟡 MIXTO (`_EXCLUIDOS`) vs `Out of scope` (master + `_ENDPOINTS_NoSAP`).
2. **Tratar la cadena completa como una unidad.** El master clasifica `order/getOrderId` (`Out of scope`) y `magento/getOrderId` (`Planed Dev 1`) por separado. Decidir de forma conjunta: ¿el `entity_id` se sigue resolviendo contra Magento, o pasa a resolverse contra SAP?
3. **Decidir si el endpoint sobrevive.** Es un reparador manual de `eCommerceDetPedidos`. Si esa tabla desaparece o migra a `SigMavi`, el endpoint puede eliminarse. **Antes hay que identificar al consumidor** ([[01_DMZ_Controller]]) — y como este endpoint **no loguea nada** ([[02_LAN_Controller]] obs. 5), hay que ir a los logs de IIS.
4. **🔴 Corregir la inyección SQL de la línea 460 y la fuga de conexión de las líneas 458–463 — independientemente de la migración.** Son defectos activos en producción, no deuda futura. La fuga afecta a **todo el `AppPool`**, no solo a este endpoint.
5. **Decidir qué pasa con los cuatro parámetros inventados** (observación 4). Si el endpoint sobrevive, `@Descto`, `@Preciosesp`, `@Cp` y `@RecSuc` deben salir de los datos reales, no de constantes. Hoy **cada reconstrucción degrada el detalle del pedido**.
6. **Documentar o retirar la lógica regional de telefonía** del SP. Hoy está efectivamente muerta en este camino por `@Cp = "1"`.
7. **Confirmar el catálogo `Mov`** (`'pedido'` vs `'Pedido VIU'`) — observación 7.

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por el punto 4 (defectos activos: inyección y fuga de conexiones) y el punto 2 (la cadena LAN↔DMZ debe decidirse junta).

---

## Referencias cruzadas

- **Dependencia obligatoria (no es proxy):** `MagentoController.GetOrderId` en `APIMagentoDMZ/WebApiMagento/Controllers/MagentoController.cs:77–87` → `Magento.getOrderId` (`APIMagentoDMZ/.../Conn/Magento.cs:120–122`) → Magento REST `rest/V1/orders`. Ver [[01_DMZ_Controller]].
- **Helper compartido:** `OrderMethods.detallePedido` (`OrderMethods.cs:943–1059`) — envuelve el SP `SpVTASeCommerceDetPedidos`. **También lo usa `SetPedido`** (`OrderMethods.cs:578` con `'Limpiar'` y `595` con `'Insertar'`), con los parámetros **reales** del pedido en vez de las constantes de este flujo. Es la comparación que evidencia la observación 4.
- **Endpoint hermano que reconstruye un pedido completo (no solo el detalle):** [[03_BusinessMethod|getOrderInfoAndSet]] → `Magento.getOrderInfoAndSet` (`Conn/Magento.cs:361`) → `OrderMethods.ReSetPedido` / `SetPedido`. Ambos son "reparadores" sin ruta DMZ y sin consumidor conocido.
- **Lector de la tabla que este método escribe:** `CodigoRecogerSucursal.OrderId` (`CodigoRecogerSucursal.cs:24`) y `crearPrimerCodigoRecogerSuc` (`CodigoRecogerSucursal.cs:151`) — ver [[03_BusinessMethod|generateNewStorepickupCode]] y [[03_BusinessMethod|createStorepickupCode]].
- **SP con fuente disponible:** `SPsOrden/SpVTASeCommerceDetPedidos.sql`
- **Patrón de inyección SQL replicado en el mismo archivo:** `IsValidated` (774), `ObtenerNumeroTablaSms` (807), `UpdateSetNoValidated` (842, 852), `GetCreatedAccount` (876), `DatosEntregaInsert` (907).
- **Frontend:** **sin consumidor identificado.** La búsqueda de `getOrderId` en `MAGENTO_WEB_ADOBE/` solo devuelve métodos PHP homónimos de Magento (`Mavi/CreditoCheckout/Block/Onepage/Success.php:220`, `Mavi/EstimatedDelivery/Api/Data/OrderDeliveryInterface.php:13`, etc.), **ninguno relacionado con este endpoint**. El master lo confirma: *"no lo consulta magento"*.
- Tablas: [[eCommerceDetPedidos]], [[Venta]], [[VentaD]], [[Art]], [[VTASCRegionSku]], [[VTASCCodigoPostalRegionCelular]], [[eCommerceExist]]
- Inventario de alcance: [[_EXCLUIDOS_Intelisis]], [[_INVENTARIO_NoIntelisis]], [[_ENDPOINTS_NoSAP]], [[MIGRATION_STATUS_MASTER_v2]]

---

#migracion #SAP #analisis_bd #dotnet #OrdersController #getOrderId #bloqueante
