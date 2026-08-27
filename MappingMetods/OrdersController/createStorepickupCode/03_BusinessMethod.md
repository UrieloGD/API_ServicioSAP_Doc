# Mapeo del Método: `CodigoRecogerSucursal.crearPrimerCodigoRecogerSuc()` — Lógica de Negocio

**Endpoint:** `POST /order/createStorepickupCode/{idEcommerce}/{idOrder}`
**Archivo:** `APIMagento/WebApiMagento/Metodos/StorePickup/CodigoRecogerSucursal.cs`
**Método:** `public void crearPrimerCodigoRecogerSuc(string idEcommerce, string idOrder)` — Líneas **88–196**
**Capa:** LAN (Nexo) — **sin capa DMZ** ([[01_DMZ_Controller]])
**Rol en el flujo:** Generar y persistir la **clave de recogida en sucursal** (PIN) de un pedido, cambiar el estado del pedido en Magento a `store_pickup` y disparar el correo "tu pedido está listo".

> Cadena de flujo completa: [[01_DMZ_Controller]] *(no existe)* → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

**No hay modelo de request**: dos parámetros de ruta, ambos `string`, sin validación de formato.

| Parámetro | Tipo | Origen | Semántica | Se usa en |
|---|---|---|---|---|
| `idEcommerce` | string | ruta `{idEcommerce}` | `Venta.IDEcommerce` / `eCommerceDetPedidos.IdPedido` | generación del código, SP de inserción, `UPDATE`, y las dos consultas |
| `idOrder` | string | ruta `{idOrder}` | `eCommerceDetPedidos.idOrden` (entity_id de Magento) | `GetDatosCte`, consulta de artículos, y **`order_id` del payload a Magento** |

**Retorno:** `void`. El código generado **no se devuelve** — hay que pedirlo después con [[03_BusinessMethod|GetPickUpCode]].

---

## Flujo de Ejecución Detallado

El método es un procedimiento de **7 pasos con 4 conexiones SQL independientes, 2 llamadas HTTP salientes y 1 envío SMTP** (indirecto). No hay transacción que los abarque.

### Paso 1 — Generar el código (línea 93)

```csharp
string nuevoCodigo = GenerarIdRecogerEnSucursal(idEcommerce);
```

`GenerarIdRecogerEnSucursal` (**líneas 301–341**) calcula un **CRC** sobre `IdEcommerce + timestamp` y reintenta hasta encontrar uno no duplicado:

```csharp
ICRC _crc = CRCFactory.Instance.Create();
codigo = _crc.ComputeHash(IdEcommerce + DateTime.Now.ToString("dd-MM-yyy HH:mm:ss")).AsHexString().ToUpper();
while (!codigoUnico) { duplicado = GetCodigoDuplicado(codigo); ... }
```

| Rama del `while` | Condición | Acción |
|---|---|---|
| éxito | `duplicado < 1 && codigo != ""` | acepta el código |
| **rendición** | `loop > 19 && codigo != ""` | **acepta el código aunque esté duplicado** |
| último recurso | `loop > 20 && codigo == ""` | asigna la constante literal **`"F41LH4SH00"`** |
| mutación | `loop++ > 2` | corta 2 caracteres y concatena `GetRandomString()` (2 chars alfanuméricos) |
| reintento | resto | recalcula el CRC con un nuevo `DateTime.Now` |

`GetCodigoDuplicado` (**343–387**) hace `SELECT COUNT(IdEcommerce) ... WHERE ClaveVenta = @ClaveVenta` sobre `TrWDM0285_CteRecoge` — **una conexión SQL nueva por cada iteración del loop** (hasta 20+).

> `CRCFactory.Instance.Create()` sin argumentos usa el perfil por defecto de `System.Data.HashFunction.CRC` (**CRC-32**), no un algoritmo criptográfico. Ver observación 2.

### Paso 2 — Recuperar los datos del cliente (línea 94)

```csharp
string[] datosCte = GetDatosCte(idEcommerce, idOrder);
datosCte[3] = Regex.Replace(datosCte[3], @"[^0-9]", "");
```

`GetDatosCte` (**404–479**) — segunda conexión, `SELECT TOP 1` con **triple `JOIN`**:

```sql
SELECT TOP 1 v.UEN, Email1, Nombre, ve.Telefono
FROM Venta v WITH (NOLOCK)
INNER JOIN Cte c WITH (NOLOCK)            ON v.Cliente = c.Cliente
INNER JOIN VentaEntrega ve WITH(NOLOCK)   ON v.ID = ve.ID
INNER JOIN EcommerceDetPedidos det WITH(NOLOCK) ON det.RefPedidoIntelisis = v.ID
WHERE det.idpedido = @IDEcommerce AND Mov = 'Pedido' AND det.idOrden = @IDOrden
```

| Tabla | Rol en el JOIN | Campo proyectado |
|---|---|---|
| `Venta` (`v`) | base; filtro `Mov = 'Pedido'` | `UEN` |
| `Cte` (`c`) | `v.Cliente = c.Cliente` | `Email1`, `Nombre` |
| `VentaEntrega` (`ve`) | `v.ID = ve.ID` | `Telefono` |
| `eCommerceDetPedidos` (`det`) | `det.RefPedidoIntelisis = v.ID` | — (solo filtros `idpedido`, `idOrden`) |

Devuelve `string[4] = { uen, correo, nombre, telefono }`. **Si la query no devuelve filas, retorna un array de cuatro cadenas vacías sin señalarlo** (el `catch` de la línea 465 solo hace `Console.WriteLine`).
`datosCte[3]` (teléfono) se limpia de no-dígitos porque el parámetro del SP destino es `bigint` — ver paso 4.

### Paso 3 — Decidir INSERT vs UPDATE (líneas 98–145)

```csharp
int duplicado = ValidaDuplicidadIdEcommerce(idEcommerce);
if (duplicado == 0) { /* INSERT vía SP */ } else { UpdatePickUpCode(idEcommerce, nuevoCodigo); }
```

`ValidaDuplicidadIdEcommerce` (**209–253**) — tercera conexión: `SELECT COUNT(Nombre) AS duplicado FROM TrWDM0285_CteRecoge WITH (NOLOCK) WHERE IdEcommerce = @IdEcommerce`.

> ⚠️ **Esta bifurcación está de facto rota: la rama `INSERT` casi nunca se ejecuta.** Ver observación 1.

**Rama `INSERT`** (líneas 100–140) — SP `SpWDM0285_CteRecoge`, `CommandType.StoredProcedure`, `CommandTimeout = 60000` (~16 h):

| Parámetro C# | `SqlDbType` | Valor | Tipo real en el SP |
|---|---|---|---|
| `@Idecommerce` | VarChar | `idEcommerce` | `varchar(20)` |
| `@Nombre` | VarChar | `datosCte[2]` (`Cte.Nombre`) | `varchar(100)` |
| `@Correo` | VarChar | `datosCte[1]` (`Cte.Email1`) | `varchar(60)` |
| `@Telefono` | **VarChar** | `datosCte[3]` (dígitos) | **`bigint`** ← conversión implícita |
| `@ClaveVenta` | VarChar | `nuevoCodigo` | `varchar(10)` |

Fuente disponible: `SPsOrden/SpWDM0285_CteRecoge.sql`. Es un `INSERT` puro sin lógica:
```sql
INSERT INTO TrWDM0285_CteRecoge (IdEcommerce, Nombre, Correo, Telefono, ClaveVenta)
  VALUES (@IdEcommerce, @Nombre, @Correo, @Telefono, @ClaveVenta)
```
El resultado se vuelca en un `DataTable dt` con `dt.Load(dtReader)` — **el SP no devuelve resultset**, así que `dt` queda vacío. Ese mismo `dt` se reutiliza en el paso 5.

**Rama `UPDATE`** — `UpdatePickUpCode` (**271–299**), cuarta conexión:
```sql
UPDATE TrWDM0285_CteRecoge WITH (ROWLOCK) SET ClaveVenta = @ClaveVenta WHERE idEcommerce = @idEcommerce
```
`CommandTimeout = 999999`. Devuelve `bool`, y **aquí su valor se descarta** (línea 144). Sin `using` en el `SqlCommand`.

### Paso 4 — Leer los artículos del pedido (líneas 147–170)

Quinta conexión:
```sql
SELECT [Articulo], [Cantidad] FROM [eCommerceDetPedidos] WITH(NOLOCK)
WHERE idorden = @Id AND idPedido = @idEcommerce
```
Parámetros `@id` = `idOrder`, `@idEcommerce`. Resultado cargado en el **mismo `DataTable dt`** del paso 3 (`dt.Load`) — ver observación 5.

### Paso 5 — Construir el payload de estado (líneas 172–188)

```csharp
OrderPickup order = new OrderPickup();
order.orders[0].order_id = idOrder;
order.orders[0].status  = "store_pickup";
order.orders[0].comment = "Puede recoger producto en la tienda: " + nuevoCodigo;
order.orders[0].source_code = "mavi_cd";
foreach (DataRow item in dt.Rows)
    order.orders[0].products.Add(new SkusPickup { sku = ..., qty = ... });
```

Clases auxiliares declaradas **en el mismo archivo**: `OrderPickup` (729–738), `OrderDetailsPickup` (740–751), `SkusPickup` (753–757).

**Tres constantes hardcodeadas** que salen hacia Magento sin derivarse de ningún dato: `"store_pickup"`, `"mavi_cd"` y el texto del comentario. Ver observación 6.

> 🔓 **El PIN viaja en el campo `comment` del pedido de Magento**, es decir, queda visible en el historial de comentarios del pedido y en el panel de administración. Ver observación 7.

### Paso 6 — Cambiar el estado en Magento (líneas 190–192)

```csharp
Curl curl = new Curl();
curl.Post("order/setOrderStatus", JsonConvert.SerializeObject(order));
```
`Curl` en LAN apunta a **`URL_DMZ`** (`APIMagento/WebApiMagento/Helper/Curl.cs:21`), es decir: LAN → DMZ → `Magento.setOrderStatus` → `rest/V1/omnipro-orderstatus/order` (`APIMagentoDMZ/WebApiMagento/Conn/Magento.cs:125`).
**El retorno se descarta por completo.** Si Magento rechaza el cambio, nadie se entera.

### Paso 7 — Disparar el correo (línea 195)

```csharp
this.SendNotifyPickUpOrder(idOrder);
```
`SendNotifyPickUpOrder` (**198–207**) → `curl.Post("order/sendStorePickupEmail", JsonConvert.SerializeObject(new OrderIdsRequest { OrderId = idOrder }))` → DMZ `OrdersController.cs:241–250` → `Magento.sendPickupReadyEmail` → `rest/V1/storepickupready/send-pickup-email`.
**Retorno descartado igualmente.**

> ⚠️ **Divergencia de modelos entre LAN y DMZ:** `OrderIdsRequest` declara la propiedad `OrderId` en LAN (`Models/OrderRequest.cs:111`) y **`orderId`** en DMZ (`APIMagentoDMZ/.../OrderRequest.cs:95`). Hoy funciona porque `Newtonsoft.Json` deserializa sin distinguir mayúsculas por defecto, pero es una bomba de relojería: cualquier cambio a `System.Text.Json` (case-sensitive por defecto en .NET) o a un serializador estricto rompe el envío del correo **en silencio**.

**Nótese que el correo de Magento activa el plugin que llama a [[03_BusinessMethod|GetPickUpCode]]** (`MAGENTO_WEB_ADOBE/app/code/Mavi/StorePickupReadyTemplate/Plugin/TransportBuilderPlugin.php:52`) para volver a leer el PIN de la BD. **El código se genera aquí, se manda a Magento en el `comment`, y aun así Magento vuelve a preguntarlo por otro endpoint.**

### Código presente en la clase pero NO ejecutado por este flujo

`RecogerEnSucursalCorreo` (**547–672**) construye el HTML del correo y llama a `EnviarCorreo` (**674–724**) por SMTP directo. **Ningún método del archivo lo invoca** — el correo real lo manda Magento (paso 7). Es código muerto. Ver observación 9 (contiene credenciales SMTP en claro).

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | SP | Acción | Origen en el flujo |
|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | `TrWDM0285_CteRecoge` | N/A (Inline SQL) | Select (`COUNT`) | `GetCodigoDuplicado` (343) — **hasta 20+ veces por request** |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `TrWDM0285_CteRecoge` | N/A (Inline SQL) | Select (`COUNT`) | `ValidaDuplicidadIdEcommerce` (209) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `TrWDM0285_CteRecoge` | **`SpWDM0285_CteRecoge`** | Insert | rama `duplicado == 0` (129) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `TrWDM0285_CteRecoge` | N/A (Inline SQL) | Update | `UpdatePickUpCode` (276) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `Venta` | N/A (Inline SQL) | Select | `GetDatosCte` (420) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `Cte` | N/A (Inline SQL) | Select | `GetDatosCte` (426) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `VentaEntrega` | N/A (Inline SQL) | Select | `GetDatosCte` (428) |
| IntelisisTmp | MAVICUBOS.grupomavi.com | `eCommerceDetPedidos` | N/A (Inline SQL) | Select | `GetDatosCte` (430) **y** consulta de artículos (151) |

**Conexión única usada:** `sCadenaConexion` → `server=MAVICUBOS.grupomavi.com; database=IntelisisTmp`. *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 26.)*

**Stored Procedure:** `SpWDM0285_CteRecoge` — **fuente disponible** en `SPsOrden/SpWDM0285_CteRecoge.sql` (autor Marco Antonio Valdovinos, 29/09/2017, desarrollo DM0285; parámetro `@ClaveVenta` añadido por Norberto Reyes el 27/05/2019). **No se requiere `_SPS_FALTANTES.txt` para este endpoint.**

**Servicios externos (Regla #3 y #4 — documentados aparte del payload SAP):**

| Destino | Ruta | Vía | Retorno |
|---|---|---|---|
| Magento (cambio de estado) | `order/setOrderStatus` → `rest/V1/omnipro-orderstatus/order` | LAN → DMZ → Magento REST | **descartado** |
| Magento (correo) | `order/sendStorePickupEmail` → `rest/V1/storepickupready/send-pickup-email` | LAN → DMZ → Magento REST | **descartado** |

---

## Ejemplo de Respuesta (Response)

**Caso exitoso** — **HTTP 200**, texto plano:
```
"ok"
```

**Caso "sin datos"** (el pedido no existe, `GetDatosCte` devuelve cuatro vacíos, el `UPDATE` afecta 0 filas, Magento rechaza el cambio de estado) — **HTTP 200**, mismo cuerpo:
```
"ok"
```
> **No hay respuesta distinta para el fracaso.** Es el defecto central del endpoint: el éxito y el fracaso silencioso son idénticos en el cable ([[02_LAN_Controller]] obs. 1).

**Caso de error** (excepción que escapa a los `catch` internos: `Regex.Replace` sobre `null`, `IndexOutOfRangeException`, `SqlException` en el `INSERT`/`UPDATE`) — **HTTP 400** con el texto crudo:
```
"Value cannot be null. Parameter name: input"
```

> **Tres desenlaces, dos respuestas.** Y la que más importa — "no generé el código" — se presenta como éxito.

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **La rama `INSERT` está muerta en la práctica — hallazgo estructural.** `SetPedido` llama a `setNameToReference` cuando `metodoEnvio == "instore_pickup"` (`OrderMethods.cs:653–656`), y ese método (`OrderMethods.cs:1253–1296`) **ya insertó** una fila en `TrWDM0285_CteRecoge` mediante el mismo SP `SpWDM0285_CteRecoge`, con `@ClaveVenta = ""` (línea 1276) y comentado en el código como *"Parche para que funcione validación en SP_eCommerceNuevoPed"*. Cuando `createStorepickupCode` corre después, `ValidaDuplicidadIdEcommerce` devuelve `1` y el flujo **siempre** cae en `UpdatePickUpCode`. Consecuencias:
   - El nombre del método (`crearPrimerCodigoRecogerSuc`, "crear el **primer** código") es engañoso: nunca crea la fila.
   - `GetDatosCte` (paso 2) se ejecuta **para nada** en ese camino: sus tres campos (`Nombre`, `Correo`, `Telefono`) solo se usan como parámetros del `INSERT` que no ocurre. Son ~60 líneas y una consulta de 4 tablas ejecutadas y descartadas en cada llamada.
   - La fila insertada por `setNameToReference` lleva `Nombre`, `Correo` y `Telefono` **distintos** a los que este método habría puesto (`setNameToReference` recibe `NombreClienteMavi` compuesto y `order.infoCliente["correo"]`; aquí se leerían de `Cte`/`VentaEntrega`). **Los datos de contacto del PIN quedan fijados por el otro camino.**
   > Verificar en producción con un `SELECT COUNT(*)` de filas con `ClaveVenta = ''` antes de rediseñar.

2. **Dos generadores del mismo PIN, con la misma debilidad.** `GenerarIdRecogerEnSucursal` (línea 301) se invoca tanto desde aquí (línea 93) como desde `NuevoCodigoRecogerSucursal` (línea 257) — ver [[03_BusinessMethod|generateNewStorepickupCode]]. La lógica **no está duplicada** (buena señal), pero el algoritmo sí es problemático:
   - **CRC-32 no es un generador de secretos.** Es una función de detección de errores, rápida y **reversible en la práctica**: la entrada es `IdEcommerce + "dd-MM-yyy HH:mm:ss"`. Conocido el `IdEcommerce` (que el cliente ve en su correo), el espacio de búsqueda es el segundo exacto de generación — trivialmente enumerable. **Un PIN que autoriza la entrega física de mercancía debe generarse con un CSPRNG.**
   - **`GetRandomString` (línea 389) usa `new Random()` sin semilla** dentro de la función — dos llamadas en el mismo tick del reloj devuelven la misma cadena. Es el patrón clásico de colisión de `System.Random`.
   - **La rama de rendición acepta un código duplicado.** Con `loop > 19`, el `while` sale con `codigoUnico = true` **sin verificar unicidad** (líneas 320–323). Dos pedidos pueden terminar con el mismo PIN.
   - **La constante literal `"F41LH4SH00"`** (línea 326) es un PIN fijo, conocido y en el código fuente. Su rama es teóricamente inalcanzable (requiere `loop > 20` **y** `codigo == ""`, y `codigo` nunca se vacía), pero su sola presencia es inaceptable en un control de acceso.
   - Formato del hash: `"dd-MM-yyy"` — **tres `y`, no cuatro**. Es un formato personalizado de .NET que produce el año con al menos 3 dígitos (`2026`). Probablemente un typo de `yyyy` sin consecuencia funcional, pero delata que el formato nunca se revisó.

3. **`idOrder` no se valida en ninguna capa y viaja a Magento como `order_id`.** Un valor basura produce: `GetDatosCte` sin filas → array vacío; consulta de artículos sin filas → `products: []`; y un `POST` a Magento con `order_id` inválido. Todo eso responde `"ok"`.

4. **20+ conexiones SQL por request en el peor caso.** `GetCodigoDuplicado` abre y cierra una `SqlConnection` **por iteración** del `while` de generación. Sumadas a las otras cuatro del flujo, un solo request puede abrir 25 conexiones para escribir una fila. Debe resolverse con una única conexión reutilizada (o mejor: unicidad garantizada por índice y `INSERT` con reintento).

5. **`DataTable dt` reutilizado entre pasos.** El mismo `dt` recibe primero el resultset (vacío) del SP y después el de la consulta de artículos, ambos con `dt.Load()`. `DataTable.Load` **fusiona** en vez de reemplazar; funciona hoy porque el primer `Load` no aporta filas ni esquema, pero es frágil: basta que el SP empiece a devolver algo para que el `foreach` del paso 5 itere filas espurias y se envíen SKUs inventados a Magento.

6. **Constantes de negocio hardcodeadas hacia Magento.** `status = "store_pickup"`, `source_code = "mavi_cd"` y el texto `"Puede recoger producto en la tienda: "` están escritos en el código. `"mavi_cd"` es un **código de fuente de inventario de Magento MSI fijo**: todo pedido de recogida se marca como surtido desde el CD, sin importar la sucursal real. Regla #7 (sin hardcodeo) y probablemente un error funcional.

7. **🔓 El PIN se publica en el `comment` del pedido de Magento** (línea 176). Queda en el historial del pedido, visible en el panel de administración y potencialmente en el "Mi cuenta" del cliente. Combinado con la observación 2 (PIN débil) y con que [[03_BusinessMethod|GetPickUpCode]] lo devuelve a cualquiera con el `IdEcommerce`, el control de retiro en tienda no ofrece garantía real.

8. **Sin transacción ni compensación.** Los siete pasos son independientes. Escenarios reales: el `UPDATE` graba el código nuevo y falla la llamada a Magento → el cliente nunca recibe el correo pero el PIN viejo ya no sirve; o el estado cambia a `store_pickup` y falla el correo → pedido marcado como listo sin aviso. **Sin compensación, sin reintento, sin log del fallo.** Al migrar debe modelarse como un flujo con outbox/reintento.

9. **🔴 Credenciales SMTP en texto plano en el código fuente** — `CodigoRecogerSucursal.cs:662–667`, dentro de `RecogerEnSucursalCorreo`. Usuario, contraseña y servidor de correo están literales en un array `string[]`. *(No se transcriben aquí; ver el archivo.)* Violación directa de la Regla #7 y de cualquier política de secretos. **Atenuante:** ese método es **código muerto** (ningún llamador en toda la solución). **Agravante:** el secreto sigue en el repositorio y presumiblemente sigue siendo válido. **Acción inmediata, independiente de la migración: rotar la credencial y eliminar el bloque muerto (líneas 547–724).**

10. **Excepciones tragadas con `Console.WriteLine`.** `ValidaDuplicidadIdEcommerce` (247), `GetCodigoDuplicado` (381) y `GetDatosCte` (465) capturan y escriben en consola — que en IIS **no va a ningún lado**. `UpdatePickUpCode` (296) devuelve `false` y nadie lo lee. Regla #8: ninguno usa `Logger`.

11. **`CommandTimeout` sin criterio.** `60000` (~16 h) en el SP (línea 133), `999999` (~11 días) en el `UPDATE` (línea 289), y **sin fijar** (30 s) en las consultas de lectura. Tres valores distintos en el mismo archivo.

12. **`WITH(NOLOCK)` en todas las lecturas, incluidas las de control de unicidad.** `GetCodigoDuplicado` y `ValidaDuplicidadIdEcommerce` usan lectura sucia para decidir si un código ya existe y si hay que insertar o actualizar. **Es exactamente el caso en que `NOLOCK` no debe usarse:** dos requests concurrentes pueden ver `duplicado = 0` a la vez y ambos intentar el `INSERT`.

13. **Divergencia de modelos LAN/DMZ en `OrderIdsRequest`** (`OrderId` vs `orderId`) — ver paso 7. Deuda latente.

14. **Método síncrono con tres saltos de red en cadena** y `Curl.Timeout = 9999999`. Migrar a `async/await` (Regla #12) es requisito operativo.

15. **`crearPrimerCodigoRecogerSuc` es `void`.** No hay forma de saber qué pasó. Al migrar debe devolver al menos `{ pickupCode, created|updated, notified }`.

---

## Destino SAP — PENDIENTE DE DEFINICIÓN (conflicto documental abierto)

| Fuente | Clasificación asignada |
|---|---|
| `_EXCLUIDOS_Intelisis.md` (línea 117) | 🟡 **MIXTO** — `IntelisisTmp + Magento + SMTP`, "en radar", `CodigoRecogerSucursal.cs:126` |
| `_EXCLUIDOS_Intelisis.md` (línea 213) | listado entre los **26 🟡 MIXTO** de `OrdersController` |
| `_INVENTARIO_NoIntelisis.csv` (línea 66) | `Mixto` — "Curl a DMZ + envio de correo" |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` (línea 95) | `OrdersController (LAN-only)` — **`Out of scope`**, alcance `No` |
| `MIGRATION_STATUS_MASTER_v2.csv` (línea 119) | **`Out of scope`** — destino `Unknown`/`Unknown`, DMZ = `No DMZ route - LAN-only endpoint`. Nota: *"No tiene ruta en DMZ, no lo consulta magento pero lo puede consultar otra aplicación, se desconoce."* |

**Conflicto documental abierto:** `_EXCLUIDOS_Intelisis.md` lo clasifica 🟡 **MIXTO / en radar** (es decir, *se rompe parcialmente al apagar Intelisis y hay que vigilarlo*), mientras `_ENDPOINTS_NoSAP.csv` y `MIGRATION_STATUS_MASTER_v2.csv` lo dan por **`Out of scope`**. Las dos clasificaciones son incompatibles: "en radar" implica seguimiento; "out of scope" implica que nadie lo mira.

**La clasificación 🟡 MIXTO es la técnicamente correcta**, y la evidencia lo respalda: el método toca `IntelisisTmp` (4 tablas + 1 SP) **y** dispara dos llamadas a Magento vía DMZ. Al apagar Intelisis, el flujo se rompe entero. Conforme a la **Regla #10**, no se asigna servicio OData.

### Elementos sin equivalente identificado

- **`TrWDM0285_CteRecoge`** — tabla propia MAVI (desarrollo `DM0285`). Sin equivalente SAP. Candidata a `SigMavi` (Regla #1), decisión no tomada.
- **`SpWDM0285_CteRecoge`** — `INSERT` puro; desaparece con la tabla.
- **`eCommerceDetPedidos`** — tabla puente Magento↔Intelisis, propia de MAVI. Se lee aquí dos veces (`GetDatosCte` y consulta de artículos). También la escribe [[03_BusinessMethod|getOrderId]]. **Mismo gap de domicilio.**
- **`VentaEntrega.Telefono`** — mismo gap ya documentado en [[03_BusinessMethod|obtenerVentanaConfirmacion]] (*"FALTA LA api para obtener venta-entrega"*). En este flujo su impacto es menor: solo alimenta el `INSERT` que no ocurre (observación 1).
- **El proceso del PIN en sí** — bloqueo de negocio declarado en el master para [[03_BusinessMethod|GetPickUpCode]] (*"Business has not defined the clave venta PIN process"*). Aplica igual aquí, y aquí es peor: este es el punto donde el PIN **se crea**.

### Puntos a cerrar con el Líder Técnico

1. **Resolver la contradicción de alcance:** 🟡 MIXTO (`_EXCLUIDOS`) vs `Out of scope` (`master` + `_ENDPOINTS_NoSAP`). Con evidencia de que toca 4 tablas de Intelisis, `Out of scope` parece un error de catalogación.
2. **Identificar el consumidor real del endpoint** ([[01_DMZ_Controller]]). Sin ruta DMZ y sin llamador conocido, es un servicio huérfano que, si alguien lo usa desde la LAN, se rompe silenciosamente al migrar. Es un dato **obtenible de los logs de IIS**, no una decisión.
3. **Decidir si el PIN sigue existiendo** y, en caso afirmativo, rediseñarlo: CSPRNG, unicidad por índice, vigencia, un solo uso, y **no publicarlo en el `comment` de Magento** (observaciones 2 y 7).
4. **Unificar los tres escritores de `TrWDM0285_CteRecoge`** (observación 1): hoy `setNameToReference` deja muerta la rama `INSERT` de este método. Migrar el bug tal cual sería un error.
5. **Definir el domicilio de `TrWDM0285_CteRecoge` y `eCommerceDetPedidos`:** ¿`SigMavi`? ¿Magento? Ninguna parece corresponder a SAP.
6. **Definir la semántica transaccional** del flujo de 7 pasos (observación 8): qué se compensa si falla Magento después de grabar el código.
7. **🔴 Acción inmediata fuera del alcance de la migración:** rotar la credencial SMTP expuesta en `CodigoRecogerSucursal.cs:662–667` y eliminar el bloque muerto 547–724.
8. **Corregir `source_code = "mavi_cd"`** o confirmar que todos los pedidos de recogida efectivamente se surten del CD (observación 6).

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por el consumidor desconocido (punto 2) y la credencial expuesta (punto 7).

---

## Referencias cruzadas

- **Hermanos de la misma funcionalidad (los tres forman una sola pieza):**
  - [[03_BusinessMethod|GetPickUpCode]] → `CodigoRecogerSucursal.GetPickUpCode` (`CodigoRecogerSucursal.cs:57`) — **lee** el código que este método escribe. Único de los tres con proxy DMZ.
  - [[03_BusinessMethod|generateNewStorepickupCode]] → `CodigoRecogerSucursal.NuevoCodigoRecogerSucursal` (`CodigoRecogerSucursal.cs:255`) — **regenera** el código. Comparte `GenerarIdRecogerEnSucursal` y `UpdatePickUpCode` con este método; **la lógica de notificación diverge** (aquí síncrona con cambio de estado; allá en un `Task` sin `await` y sin cambio de estado).
- **Escritor oculto que rompe la rama `INSERT`:** `OrderMethods.setNameToReference` (`OrderMethods.cs:1253–1296`), invocado desde `SetPedido` (`OrderMethods.cs:655`). Usa **el mismo SP** con `@ClaveVenta = ""`.
- **Helpers internos:** `GenerarIdRecogerEnSucursal` (301), `GetCodigoDuplicado` (343), `GetRandomString` (389), `ValidaDuplicidadIdEcommerce` (209), `UpdatePickUpCode` (271), `GetDatosCte` (404), `SendNotifyPickUpOrder` (198).
- **Código muerto en la misma clase:** `GetDatosCteCorreo` (481–545), `RecogerEnSucursalCorreo` (547–672), `EnviarCorreo` (674–724) — sin llamadores; contiene las credenciales SMTP.
- **SP con fuente disponible:** `SPsOrden/SpWDM0285_CteRecoge.sql`
- **Endpoints DMZ invocados de salida:** `order/setOrderStatus` (`APIMagentoDMZ/.../OrdersController.cs:324–333`) y `order/sendStorePickupEmail` (`APIMagentoDMZ/.../OrdersController.cs:241–250`).
- **Frontend:** **sin consumidor identificado.** El módulo `Mavi/StorePickupReadyTemplate` de `MAGENTO_WEB_ADOBE` consume `GetPickUpCode`, no este endpoint. El master lo confirma: *"no lo consulta magento"*.
- Tablas: [[TrWDM0285_CteRecoge]], [[eCommerceDetPedidos]], [[Venta]], [[Cte]], [[VentaEntrega]]
- Inventario de alcance: [[_EXCLUIDOS_Intelisis]], [[_INVENTARIO_NoIntelisis]], [[_ENDPOINTS_NoSAP]], [[MIGRATION_STATUS_MASTER_v2]]

---

#migracion #SAP #analisis_bd #dotnet #OrdersController #createStorepickupCode #storepickup #bloqueante
