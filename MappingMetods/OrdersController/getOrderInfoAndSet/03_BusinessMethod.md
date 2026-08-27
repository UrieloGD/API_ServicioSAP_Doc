# Mapeo del Método: `Magento.getOrderInfoAndSet()` — Lógica de Negocio

**Endpoint:** `GET /order/getOrderInfoAndSet/{incrementId}`
**Archivo:** `APIMagento/WebApiMagento/Conn/Magento.cs`
**Método:** `public string getOrderInfoAndSet(string incrementId)` — Líneas **361–411**
**Capa:** LAN (Nexo) — **sin capa DMZ** ([[01_DMZ_Controller]])
**Rol en el flujo:** **Reintentar la creación de un pedido en Intelisis** que no llegó a registrarse. Es la herramienta de recuperación de `setOrder`: intenta primero reconstruir el pedido desde el **archivo de log** de la LAN y, si no lo encuentra, lo vuelve a pedir a Magento a través de la DMZ.

> Cadena de flujo completa: [[01_DMZ_Controller]] *(no existe; el flujo sale hacia la DMZ, no entra por ella)* → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## Contrato de Entrada

**No hay modelo de request:** un único parámetro de ruta.

| Parámetro | Tipo | Origen | Uso |
|---|---|---|---|
| `incrementId` | string | ruta `{incrementId}` | (a) subcadena de búsqueda en `setOrder.log`; (b) segmento de URL hacia la DMZ; (c) `@IdEcommerce` en `Venta` |

**Sin validación en ninguna capa.** Ver [[02_LAN_Controller]] obs. 6.

**Retorno:** `string` de texto libre con **al menos siete significados** — ver [[02_LAN_Controller]] obs. 2.

---

## Flujo de Ejecución Detallado

```csharp
public string getOrderInfoAndSet(string incrementId)
{
    try
    {
        OrderMethods om = new OrderMethods();
        string resLog = om.ReSetPedido(incrementId);

        if (resLog != "no existe")
            return resLog;                                   // ── RAMA 1

        string response = curl.Get("order/jsonOrders/" + incrementId);
        response = response.Replace(@"\\u00e1", "a") /* …14 reemplazos… */
                           .Replace(":\"0\"", ":0")
                           .Replace(":null,", ":0,")
                           .Trim('"');

        JsonOrder jsonOrder = JsonConvert.DeserializeObject<JsonOrder>(response);
        if (!jsonOrder.success)
            return jsonOrder.message;

        OrderRequest orderIntelisis = JsonConvert.DeserializeObject<OrderRequest>(jsonOrder.json_order[0]);

        if (om.obtenerIdVenta(incrementId) != 0)
        {
            if (om.esCancelado(incrementId) == 0)
                return "No cumple las condiciones";
        }

        return om.SetPedido(orderIntelisis);                 // ── RAMA 2
    }
    catch (Exception ex)
    {
        return "Ocurrió un error: " + ex.Message;
    }
}
```

### RAMA 1 — Reconstruir desde el archivo de log (`ReSetPedido`)

`OrderMethods.ReSetPedido` — **`OrderMethods.cs:1668–1690`**:

```csharp
string[] orderLines = File.ReadAllLines(@"C:\inetpub\wwwroot\log\setOrder.log");
string line = orderLines.Where(l => l.Contains(incrementId) && l.Contains("] INFO [")).FirstOrDefault();
if (line == null) return "no existe";
line = line.Remove(0, line.IndexOf("{"));
OrderRequest order = JsonConvert.DeserializeObject<OrderRequest>(line);
if (obtenerIdVenta(incrementId) != 0) { if (esCancelado(incrementId) == 0) return "No cumple las condiciones"; }
order.forzarOrder = "1";
return SetPedido(order);
```

🚩 **Este es el hallazgo estructural del endpoint: el archivo de log es la fuente de datos.**

1. **`File.ReadAllLines`** carga **el archivo completo en memoria**. `setOrder.log` es el log de todos los pedidos del sistema (`Helper/Logger.cs:19–21`), escrito por `OrdersController.Set` en cada alta (`OrdersController.cs:144`). En producción es un archivo de crecimiento ilimitado — no hay rotación en `Logger.cs`.
2. **Búsqueda por subcadena** (`l.Contains(incrementId)`), no por campo. Un `incrementId` que sea prefijo de otro (`"3000012"` dentro de `"30000123"`) **puede casar con la línea equivocada**, y `FirstOrDefault()` toma la primera coincidencia del archivo — es decir, **la más antigua**, no la más reciente. Si un pedido se intentó varias veces, se reconstruye con la versión **más vieja** del payload.
3. **Parsing por posición:** `line.Remove(0, line.IndexOf("{"))` corta desde la primera llave. Si el mensaje de log contuviera una `{` antes del JSON, el parse revienta.
4. **Guarda de duplicado:** si ya existe un `Venta` para ese `IDEcommerce` **y no está cancelado**, aborta con `"No cumple las condiciones"`. Ver observación 4.
5. **`order.forzarOrder = "1"`** — 🚩 fuerza el camino alterno. En `SetPedido` (`OrderMethods.cs:558–561`) eso **cambia el Stored Procedure destino**:
   ```csharp
   string sp = "SP_eCommerceNuevoPed";
   if (order.forzarOrder.ToString() == "1") sp = "SPVTASPedidosMagento";
   ```
   Además desactiva la guarda de pedido existente en la línea 537 (`obtenerIdVenta(...) > 0 && order.forzarOrder == "0"`). Ver observación 5.

Si `ReSetPedido` devuelve cualquier cosa distinta de `"no existe"`, el flujo **termina ahí** y ese texto es la respuesta HTTP 200.

### RAMA 2 — Recuperar el pedido desde Magento

Se ejecuta **solo** si el pedido no aparece en el log.

**2.a — Salida a la DMZ** (línea 371):
```csharp
string response = curl.Get("order/jsonOrders/" + incrementId);
```
`curl` es el campo de la clase inicializado en el constructor (`Conn/Magento.cs:17–20`) y apunta a `URL_DMZ` (`Helper/Curl.cs:21`). Destino: `APIMagentoDMZ/.../OrdersController.cs:343–355` → `Magento.GetJsonOrder` (`APIMagentoDMZ/.../Conn/Magento.cs:233–236`) → `rest/V1/jsonOrders/{incrementId}` de Magento.
- `incrementId` **concatenado sin escapar** en la URL.
- `Curl.Get` **no lanza**: convierte la excepción en cuerpo (`Helper/Curl.cs:130–133`). Un fallo de red produce un texto de excepción que llega al `DeserializeObject` de la línea 393 → `JsonReaderException` → capturada por el `catch` general → `"Ocurrió un error: ..."` con **HTTP 200**.

**2.b — Saneo del texto por reemplazo literal** (líneas 373–391) — 16 `.Replace()` encadenados:

| Grupo | Reemplazos | Efecto |
|---|---|---|
| Acentos | `\\u00e1`→`a`, `\\u00e9`→`e`, `\\u00ed`→`i`, `\\u00f3`→`o`, `\\u00fa`→`u`, `\\u00f1`→`n` y sus mayúsculas | 🚩 **destruye los acentos y la ñ**: "PEÑA" → "PENA", "GARCÍA" → "GARCIA" |
| Diéresis | `\\u00fc`→`ü`, `\\u00dc`→`Ü` | conserva |
| Tipos | `:"0"` → `:0`, `:null,` → `:0,` | 🚩 reescribe el JSON antes de parsearlo |
| Comillas | `.Trim('"')` | desenvuelve |

Ver observación 2.

**2.c — Doble deserialización** (líneas 393–398):
```csharp
JsonOrder jsonOrder = JsonConvert.DeserializeObject<JsonOrder>(response);
if (!jsonOrder.success) return jsonOrder.message;
OrderRequest orderIntelisis = JsonConvert.DeserializeObject<OrderRequest>(jsonOrder.json_order[0]);
```
`JsonOrder` (`Models/OrderRequest.cs:81–86`): `{ bool success; string message; List<string> json_order; }` — el pedido viene como **string JSON anidado dentro del JSON**.
🚩 `jsonOrder.json_order[0]` **sin comprobar `null` ni `Count`**: si `success == true` pero la lista viene vacía → `ArgumentOutOfRangeException` / `NullReferenceException` → `catch` → `"Ocurrió un error: ..."` con HTTP 200.

**2.d — Guarda de duplicado** (líneas 400–404): misma lógica que en `ReSetPedido`.
- `obtenerIdVenta` (`OrderMethods.cs:1582–1623`): `select id from venta with(nolock) where idecommerce = @IdEcommerce` — parametrizado. **Sin `TOP`**: itera todas las filas y se queda con la última.
- `esCancelado` (`OrderMethods.cs:1625–1666`): mismo `SELECT` + `and Estatus = 'CANCELADO'`.
- **Regla:** si el pedido existe y **no** está cancelado → aborta. Si existe **y está cancelado** → continúa y lo vuelve a crear.
- Ambos métodos capturan su excepción con `Console.WriteLine` (líneas 1619 y 1662) y **devuelven `0`**, que significa "no existe" → **un fallo de BD hace que la guarda se rinda y el pedido se cree igual**. Ver observación 4.

**2.e — Creación del pedido:** `om.SetPedido(orderIntelisis)` — **sin `forzarOrder = "1"`** en esta rama, a diferencia de la rama 1. Ver observación 5.

### `SetPedido` — resumen de lo que dispara

`OrderMethods.SetPedido` (`OrderMethods.cs:532–713`) es el corazón del alta de pedidos y **se documenta en detalle en `setOrder`**. Aquí se registra únicamente su superficie de datos, porque este endpoint la hereda entera:

| Paso en `SetPedido` | Línea | Recurso tocado |
|---|---|---|
| `AgruparCantidadPorSKU` + `ToArray` | 534–535 | — (en memoria) |
| `obtenerIdVenta` (guarda `PedidoExistente`) | 537 | `Venta` (Select) |
| desvío OpenPay / OpenPay Stores | 541–551 | `OpenpayMethods` (fuera de este flujo salvo que el pedido sea OpenPay) |
| `detallePedido("Limpiar")` | 578 | SP `SpVTASeCommerceDetPedidos` → **Delete** en `eCommerceDetPedidos` |
| `detallePedido("Insertar")` × N | 595 | SP `SpVTASeCommerceDetPedidos` → **Insert** (+ `Art`, `VTASCRegionSku`, `VTASCCodigoPostalRegionCelular`, `eCommerceExist`, `VTASDEcommerceExportaArtExistencia`) |
| `SaveGuide` | 602 | **SQLite** `C:\inetpub\wwwroot\api\data.db` → `servicio_guias` (Insert) |
| **rama crédito** (`metodoPago == "omnipro_pago_credito"`) | 605–646 | ver [[03_BusinessMethod\|validateCredit]] — **SP `SP_CREDITO_WEB_DATOS` (fuente NO disponible)**, `TcAAEA00030_EnvioMensajes`, `CteTel`, API Liberador |
| `setNameToReference` (si `instore_pickup`) | 655 | SP `SpWDM0285_CteRecoge` → **Insert** en `TrWDM0285_CteRecoge` con `ClaveVenta = ""` |
| `crearPedido` | 658 | SP **`SP_eCommerceNuevoPed`** o **`SPVTASPedidosMagento`** → alta en `Venta` / `VentaD` |
| `UpdateIdEcommerceEnVenta` (si el id empieza con `CRED`) | 666 | `Venta` (**Update**, parametrizado) |
| `GetCreatedAccount` | 680, 712 | `Venta` (Select, **SQL concatenado**) |
| `DatosEntregaInsert` | 682 | `DM0312DatosEntrega` (**Insert, SQL concatenado — inyección**) |
| `GenerarMonedero` (solo OpenPay/PayPal) | 695 | `Venta` (Select concatenado) + SP `xpVerificarMovMonederoMAVI`, `SP_DM0312TarjetaSerieMovMAVI`, `spGenerarMovMonederoMAVI` |
| `afectar` (solo OpenPay/PayPal) | 696 | SP **`spAfectar`** |

> **`SetPedido` traga sus propias excepciones** (`catch` en la línea 708–711, solo `Logger.SetOrder("Error ", ex.Message)`), por lo que devuelve `sRespuestaPedido` con el valor que tuviera — típicamente `string.Empty` — y el endpoint responde **HTTP 200 con cuerpo vacío**.

### ⚠️ `spAfectar` — árbol de decisión de la migración

`spAfectar` **sí aparece en este flujo**, pero **solo cuando el método de pago es OpenPay o PayPal** (`OrderMethods.cs:670–672, 696` → `afectar`, `OrderMethods.cs:1520–1580`). Fuente disponible: `SPsOrden/spAfectar.sql` (435 líneas).

**Decisión aplicable: se ignora y se elimina en la migración.** SAP asume el manejo de inventario de forma nativa: la afectación de existencias que hoy ejecuta `spAfectar` sobre Intelisis deja de tener sentido cuando el documento de ventas vive en S/4HANA. **Se documenta que hoy existe** y se registra en el CSV, pero **no debe portarse**.

⚠️ Nótese que `spAfectar` también se invoca desde `OrderMethods.ExecuteSP` (`OrderMethods.cs:161–177`) para el endpoint `ManagePaynetOrders`, con acciones `"AFECTAR"` / `"CANCELAR"` y usuarios hardcodeados (`VENTP02031` / `VENTP01422`). Misma decisión.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

**Conexiones utilizadas:**

| Cadena | Servidor / Base | Usada por |
|---|---|---|
| `sCadenaConexion` | `MAVICUBOS.grupomavi.com` / `IntelisisTmp` | `obtenerIdVenta`, `esCancelado`, todo `SetPedido` salvo la rama crédito |
| `sCadenaConexionAndriod` | `mavicbosandroid.grupomavi.com` / `ServicioAndroid` | **solo rama crédito**: `SP_CREDITO_WEB_DATOS`, `ObtenerNumeroTablaSms` |

*(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` líneas 26 y 28.)*

**Persistencia no-SQL Server:**

| Recurso | Ruta | Operación |
|---|---|---|
| **Archivo de log** | `C:\inetpub\wwwroot\log\setOrder.log` | **Lectura completa** (`File.ReadAllLines`) — ¡es una fuente de datos! |
| **SQLite** | `C:\inetpub\wwwroot\api\data.db` → `servicio_guias` | Insert (`SaveGuide`, `OrderMethods.cs:715–734`) |

**Servicios externos (Regla #3 y #4):**

| Destino | Ruta | Vía | Cuándo |
|---|---|---|---|
| Magento (recuperar el pedido) | `order/jsonOrders/{id}` → `rest/V1/jsonOrders/{id}` | LAN → DMZ → Magento REST | solo rama 2 |
| API Liberador de crédito | `AUTENTICACION_URL_LIBERADOR` / `VETA_URL_LIBERADOR` | HTTP directo desde LAN | solo si el pedido es de crédito |
| Magento (callback de autorización) | `order/authorizationResult` | LAN → DMZ → Magento REST | solo si el pedido es de crédito |

**Stored Procedures alcanzables desde este endpoint:**

| SP | ¿Fuente en `SPsOrden/`? |
|---|---|
| `SpVTASeCommerceDetPedidos` | ✅ disponible |
| `SP_eCommerceNuevoPed` | ✅ disponible |
| `SPVTASPedidosMagento` | ✅ disponible |
| `SpWDM0285_CteRecoge` | ✅ disponible |
| `spAfectar` | ✅ disponible (**se elimina en la migración**) |
| `xpVerificarMovMonederoMAVI` | ✅ disponible |
| `SP_DM0312TarjetaSerieMovMAVI` | ✅ disponible |
| `spGenerarMovMonederoMAVI` | ✅ disponible |
| `SpVTASVentaCupon` | ✅ disponible |
| `SpCREDIDatosSolicitudCreditoArt` | ✅ disponible |
| `SpVTASInsertArtSolCreditoLinea` | ✅ disponible |
| **`SP_CREDITO_WEB_DATOS`** | ❌ **FALTANTE** — ver `_SPS_FALTANTES.txt` |

---

## Ejemplo de Respuesta (Response)

Todos los desenlaces salen con **HTTP 200** y cuerpo de texto plano.

**Caso exitoso** (pedido creado, cuenta del cliente):
```
"C00012345"
```

**Caso "ya existe y no está cancelado"** — el más frecuente en operación normal:
```
"No cumple las condiciones"
```

**Caso "el SP rechazó el pedido"**:
```
"PrecioIncorrecto"
```
o `"Incorrecto"` (valor inicial de `crearPedido`, `OrderMethods.cs:1087`).

**Caso "Magento no devolvió el pedido"** — se emite el mensaje crudo de Magento:
```
"Order not found"
```

**Caso sin datos / excepción tragada por `SetPedido`** — **cuerpo vacío con HTTP 200**:
```
""
```

**Caso de error** (log ilegible, DMZ caída, JSON inválido, `json_order` vacío):
```
"Ocurrió un error: Could not find file 'C:\inetpub\wwwroot\log\setOrder.log'."
```
o
```
"Ocurrió un error: Unexpected character encountered while parsing value..."
```

> **Siete desenlaces, un solo código de estado, y el cuerpo vacío significa "excepción tragada dentro de `SetPedido`" — el peor caso posible en un endpoint que crea pedidos.**

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **🔴 Un archivo de log usado como fuente de datos transaccional — hallazgo estructural.** `ReSetPedido` (`OrderMethods.cs:1670`) lee `C:\inetpub\wwwroot\log\setOrder.log` completo con `File.ReadAllLines` y reconstruye el `OrderRequest` desde ahí. Consecuencias:
   - **Sin rotación:** `Logger.cs` no implementa rotación; el archivo crece indefinidamente. Cada invocación carga **todo** el historial de pedidos en memoria del proceso de IIS.
   - **Búsqueda por subcadena** (`Contains`): riesgo de casar con un `incrementId` que sea prefijo de otro.
   - **`FirstOrDefault()` toma la coincidencia más antigua**, no la más reciente: si el pedido se intentó varias veces con payloads distintos, se reconstruye con el **primero**.
   - **Sin `try/catch` propio ni bloqueo de archivo:** si el `Logger` está escribiendo, puede producirse `IOException` (fichero en uso).
   - **Al migrar a SAP este mecanismo deja de funcionar por completo**: los pedidos que fluyan a SAP no dejarán su payload en `setOrder.log` de la LAN. **La herramienta de recuperación desaparece sin sustituto.**

2. **🚩 Los 16 `.Replace()` corrompen datos del cliente** (líneas 373–391):
   - **Los acentos y la ñ se destruyen**: `\\u00f1` → `n` convierte "PEÑA" en "PENA". Es un nombre de cliente que se va a grabar en `Venta`/`Cte`. Nótese la incoherencia interna: la diéresis **sí** se conserva (`ü`), los acentos no. El mismo bloque está copiado literalmente en `getAttributes` (`Conn/Magento.cs:35–48`) y `getGeneralAttributes` (`93–106`) — es un patrón replicado por todo el archivo.
   - **`.Replace(":\"0\"", ":0")` y `.Replace(":null,", ":0,")` reescriben el JSON antes de parsearlo.** Cualquier campo de texto cuyo valor sea literalmente `"0"` se convierte en el número `0`, y **cualquier `null` se convierte en `0`** — incluidos campos donde `null` y `0` significan cosas distintas (descuentos, ids opcionales). Es una transformación semántica ciega aplicada por búsqueda de texto.
   - Debe sustituirse por deserialización correcta con `JsonSerializerSettings` y encoding UTF-8 bien negociado.

3. **`jsonOrder.json_order[0]` sin validar** (línea 398). Si `success == true` y la lista viene vacía o `null`, excepción → `"Ocurrió un error: ..."` con HTTP 200.

4. **Las guardas anti-duplicado se rinden ante un fallo de BD.** `obtenerIdVenta` y `esCancelado` capturan su excepción con `Console.WriteLine` (líneas 1619 y 1662 — que en IIS no va a ningún lado) y **devuelven `0`**, valor que el llamador interpreta como "el pedido no existe". Es decir: **si la BD falla justo en la comprobación, la guarda desaparece y el pedido se crea de todas formas.** En un endpoint cuyo propósito es reintentar, esto es un camino directo a pedidos duplicados en `Venta`.
   Agravante: `obtenerIdVenta` no usa `TOP` y se queda con la **última** fila del `while` (línea 1613), sin `ORDER BY`.

5. **Las dos ramas no se comportan igual — divergencia interna.**

   | | RAMA 1 (`ReSetPedido`) | RAMA 2 (Magento) |
   |---|---|---|
   | Origen del `OrderRequest` | `setOrder.log` | Magento REST vía DMZ |
   | `forzarOrder` | **`"1"` (forzado)** | el que traiga Magento (normalmente `"0"`) |
   | SP destino en `crearPedido` | **`SPVTASPedidosMagento`** | `SP_eCommerceNuevoPed` |
   | Guarda `PedidoExistente` de `SetPedido:537` | **desactivada** (`forzarOrder != "0"`) | activa |
   | Saneo de acentos | no aplica (viene del log ya saneado) | 16 `.Replace()` destructivos |

   **El mismo endpoint crea el pedido con dos procedimientos almacenados distintos según de dónde recuperó los datos.** Y en la rama 1, la guarda de pedido existente de `SetPedido` queda desactivada — la única protección es la comprobación previa de `ReSetPedido`, que se rinde ante un fallo de BD (observación 4).

6. **`[HttpGet]` que crea un pedido en el ERP.** Ver [[02_LAN_Controller]] obs. 1. Combinado con la observación 5, un `GET` accidental puede crear un pedido usando el SP que **salta las validaciones de precio**.

7. **`incrementId` concatenado sin escapar en la URL** (línea 371). Sin `Uri.EscapeDataString` y sin validación previa.

8. **`catch (Exception ex)` que devuelve `ex.Message` como payload** (líneas 407–410). Expone rutas del sistema de archivos (`C:\inetpub\wwwroot\log\setOrder.log`), y en caso de `SqlException`, servidor y base. Además unifica todos los fallos —red, disco, JSON, BD— en un solo texto con HTTP 200.

9. **Cero trazabilidad en todo el flujo propio.** Ni el controller ([[02_LAN_Controller]] obs. 4) ni este método loguean nada. La única traza es la que produce `SetPedido` internamente (`Logger.SetOrder`), que **escribe en el mismo archivo que `ReSetPedido` lee** — un bucle de retroalimentación entre el log y la fuente de datos que conviene tener presente.

10. **Salto de red en el constructor.** `new Magento()` → `new Curl()` → autenticación HTTP contra la DMZ. En la rama 1 ese trabajo es completamente innecesario. Ver [[02_LAN_Controller]] obs. 5.

11. **Hereda toda la deuda de `SetPedido`**, que es sustancial: inyección SQL en `GetCreatedAccount` (876) y `DatosEntregaInsert` (907), `SqlConnection` a nivel de campo en `detallePedido`, dependencia de SQLite local, y un `catch` general que traga la excepción y devuelve cuerpo vacío. Se documenta en `setOrder`.

12. **`spAfectar` presente hoy, se elimina en la migración** (ver arriba). Se alcanza solo por la vía OpenPay/PayPal.

13. **Método síncrono** que encadena: lectura completa de un archivo → HTTP a la DMZ → HTTP a Magento → N ejecuciones de SP. Sin timeout real (`Curl.Timeout = 9999999`). Migrar a `async/await` (Regla #12).

---

## Destino SAP — PENDIENTE DE DEFINICIÓN (conflicto documental abierto)

| Fuente | Clasificación asignada |
|---|---|
| `_EXCLUIDOS_Intelisis.md` (línea 120) | 🟡 **MIXTO** — `Magento (vía DMZ) + IntelisisTmp`, "en radar", `Conn/Magento.cs:371` |
| `_EXCLUIDOS_Intelisis.md` (línea 213) | listado entre los **26 🟡 MIXTO** de `OrdersController` |
| `_INVENTARIO_NoIntelisis.csv` (línea 69) | `Mixto` — "Curl.Get a Magento + SetPedido" |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` (línea 98) | `OrdersController (LAN-only)` — **`Out of scope`**, destino `MAGENTO` |
| `MIGRATION_STATUS_MASTER_v2.csv` (línea 122) | **`Out of scope`** — destino `MAGENTO`, `No DMZ route - LAN-only endpoint`. *"No tiene ruta en DMZ, no lo consulta magento pero lo puede consultar otra aplicación, se desconoce."* |

**Conflicto documental abierto:** `_EXCLUIDOS_Intelisis.md` lo mantiene 🟡 MIXTO / en radar; el master y `_ENDPOINTS_NoSAP` lo cierran como `Out of scope` con destino `MAGENTO`.

**La clasificación `MAGENTO` es engañosa y hay que corregirla.** Es cierto que el pedido se *recupera* de Magento, pero el **efecto** del endpoint es crear un pedido en Intelisis: ejecuta `SP_eCommerceNuevoPed`/`SPVTASPedidosMagento`, escribe en `Venta`, `VentaD`, `eCommerceDetPedidos`, `DM0312DatosEntrega`, `TrWDM0285_CteRecoge` y SQLite, y puede invocar `spAfectar` y toda la cadena de crédito. **Es el endpoint con mayor superficie de escritura sobre Intelisis de los siete analizados.** Etiquetarlo `MAGENTO` sugiere que sobrevive intacto a la migración, y es exactamente lo contrario. Regla #10: no se asigna servicio OData.

### Elementos sin equivalente identificado

- **`setOrder.log` como fuente de datos** (observación 1). **No hay equivalente ni sustituto planteado en ninguna fuente.** Es el bloqueante conceptual del endpoint: al migrar, el mecanismo de recuperación deja de funcionar.
- **`SP_eCommerceNuevoPed` / `SPVTASPedidosMagento`** — el alta de pedido completa. Su destino es el mismo que el de `setOrder`, que ya está en curso hacia SAP (`order/new`, ver `APIMagentoDMZ/.../OrdersController.cs:196`). **Este endpoint debe seguir a `setOrder`, no decidirse aparte.**
- **`SP_CREDITO_WEB_DATOS`** — alcanzable si el pedido recuperado es de crédito. **Fuente no disponible** (ver `_SPS_FALTANTES.txt`).
- **`eCommerceDetPedidos`, `DM0312DatosEntrega`, `TrWDM0285_CteRecoge`** — tablas propias MAVI sin equivalente SAP; candidatas a `SigMavi` (Regla #1).
- **SQLite `data.db` / `servicio_guias`** — persistencia local del servidor. Fuera de SAP por definición.

### Puntos a cerrar con el Líder Técnico

1. **Corregir la clasificación `MAGENTO` del master** (líneas 98 de `_ENDPOINTS_NoSAP` y 122 del master). El endpoint escribe masivamente en Intelisis; la etiqueta actual subestima su impacto.
2. **Resolver la contradicción de alcance:** 🟡 MIXTO (`_EXCLUIDOS`) vs `Out of scope` (master + `_ENDPOINTS_NoSAP`).
3. **Decidir el mecanismo de reintento en el mundo SAP.** Es la pregunta de fondo: si `setOrder` migra a `order/new` → ServicioSAP, **¿cómo se reintenta un pedido que falló?** Hoy la respuesta es "lee el log". Hace falta un diseño explícito (cola de reintentos, outbox, tabla de pedidos pendientes), y no aparece en ninguna fuente.
4. **Vincular la decisión de este endpoint a la de `setOrder`.** No tiene sentido migrarlos por separado: este es una reejecución de aquel.
5. **Eliminar la dependencia de `setOrder.log`** (observación 1) — independientemente de la migración, es frágil hoy: sin rotación, con búsqueda por subcadena y tomando la coincidencia más antigua.
6. **Cambiar el verbo a `POST`** (observación 6) y añadir trazabilidad de auditoría: hoy nadie registra que un pedido fue recreado manualmente.
7. **Reparar las guardas anti-duplicado** (observación 4): que un fallo de BD haga que la comprobación se rinda es un camino a pedidos duplicados en `Venta`.
8. **Decidir qué pasa con la doble ruta de SP** (observación 5): que el mismo endpoint use `SPVTASPedidosMagento` o `SP_eCommerceNuevoPed` según de dónde leyó los datos no es un comportamiento defendible.
9. **`spAfectar`:** confirmar la decisión de **eliminarlo** (SAP asume el inventario nativamente) y verificar que ningún otro flujo dependa de sus efectos colaterales.

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por el punto 3 — el mecanismo de reintento post-SAP es un vacío de diseño, no solo una decisión pendiente.

---

## Referencias cruzadas

- **Endpoint que este método reejecuta:** `POST order/setOrder` → `OrderMethods.SetPedido` (`OrderMethods.cs:532`). **Documentar y decidir en conjunto.**
- **Dependencia en la DMZ (no es proxy):** `GET order/jsonOrders/{incrementId}` (`APIMagentoDMZ/.../OrdersController.cs:343–355`) → `Magento.GetJsonOrder` (`APIMagentoDMZ/.../Conn/Magento.cs:233`) → `rest/V1/jsonOrders`. **Sin contraparte en LAN.**
- **Ruta DMZ con nombre parecido que NO es su par:** `GET order/getOrderInfo/{incrementId}` (`APIMagentoDMZ/.../OrdersController.cs:335–341`) — endpoint distinto, ver [[01_DMZ_Controller]].
- **Método hermano de reconstrucción:** [[03_BusinessMethod|getOrderId]] → `OrderMethods.InsertDetPedido` (`OrderMethods.cs:453`) — repara solo el **detalle** (`eCommerceDetPedidos`); este repara el **pedido completo**. Ambos son LAN-only, sin consumidor conocido y sin `Logger`.
- **Rama de crédito compartida:** [[03_BusinessMethod|validateCredit]] → `CreditMethods.ProductosCreditoWeb_SaveData` (`CreditMethods.cs:94`) — alcanzable desde aquí si el pedido recuperado es de crédito.
- **Helpers de guarda:** `OrderMethods.obtenerIdVenta` (1582), `OrderMethods.esCancelado` (1625), `OrderMethods.ReSetPedido` (1668).
- **Escritores que `SetPedido` dispara:** `setNameToReference` (1253, → [[03_BusinessMethod|createStorepickupCode]]), `DatosEntregaInsert` (898), `GenerarMonedero` (1406), `afectar` (1520), `SaveGuide` (715).
- **SPs con fuente disponible:** `SPsOrden/SP_eCommerceNuevoPed.sql`, `SPVTASPedidosMagento.sql`, `SpVTASeCommerceDetPedidos.sql`, `SpWDM0285_CteRecoge.sql`, `spAfectar.sql`, `xpVerificarMovMonederoMAVI.sql`, `SP_DM0312TarjetaSerieMovMAVI.sql`, `spGenerarMovMonederoMAVI.sql`, `SpVTASVentaCupon.sql`, `SpCREDIDatosSolicitudCreditoArt.sql`, `SpVTASInsertArtSolCreditoLinea.sql`
- **SP faltante:** [[_SPS_FALTANTES]] → `SP_CREDITO_WEB_DATOS`
- **Frontend:** **sin consumidor identificado** en `MAGENTO_WEB_ADOBE/`. El master lo confirma: *"no lo consulta magento"*.
- Tablas: [[Venta]], [[VentaD]], [[eCommerceDetPedidos]], [[DM0312DatosEntrega]], [[TrWDM0285_CteRecoge]], [[servicio_guias]]
- Inventario de alcance: [[_EXCLUIDOS_Intelisis]], [[_INVENTARIO_NoIntelisis]], [[_ENDPOINTS_NoSAP]], [[MIGRATION_STATUS_MASTER_v2]]

---

#migracion #SAP #analisis_bd #dotnet #OrdersController #getOrderInfoAndSet #bloqueante
