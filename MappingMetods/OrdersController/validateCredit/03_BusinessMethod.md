# Mapeo del Método: `OrderMethods.SetPedido()` — rama de crédito — Lógica de Negocio

**Endpoint:** `POST /order/validateCredit`
**Archivo:** `APIMagento/WebApiMagento/Metodos/OrderMethods.cs`
**Método:** `public string SetPedido(OrderRequest order, bool liberado = false)` — Líneas **532–713**; **rama de crédito: líneas 605–646**
**Método delegado principal:** `CreditMethods.ProductosCreditoWeb_SaveData(...)` — `APIMagento/WebApiMagento/Metodos/CreditMethods.cs` líneas **94–262**
**Capa:** LAN (Nexo) — **proxy DMZ comentado** ([[01_DMZ_Controller]])
**Rol en el flujo:** Registrar una **solicitud de crédito** derivada de un carrito de Magento, disparar el análisis crediticio contra la API del Liberador y notificar el resultado a Magento por callback asíncrono.

> Cadena de flujo completa: [[01_DMZ_Controller]] *(comentado)* → [[02_LAN_Controller]] → **03_BusinessMethod** (este documento).

---

## ⚖️ Regla #15 (CrediLana) — determinación de alcance

**Veredicto: el flujo NO es exclusivo de CrediLana. Es crédito propio MAVI sobre el ERP heredado (Intelisis). Se documenta completo.**

Evidencia de la verificación:

| Indicio | Resultado |
|---|---|
| SP invocado en la ruta | **`SP_CREDITO_WEB_DATOS`** (`CreditMethods.cs:121`) — el SP de CrediLana es **`SPCREDICredilana`**, y se usa solo en `CreditoWeb_Informacion` (1207), `CreditoWeb_Solicitud` (1295) y `CreditoWeb_SolicitudPrimerGuardado` (1348), **ninguno alcanzable desde este endpoint** |
| Módulo `Metodos/Credit/CredYPrestamo/` (CrediLana / Cred y Préstamo) | **no se toca**: `CredyPrestamoMethods.LiberarCliente` (`CredyPrestamoMethods.cs:575` → `Liberador.cs:33`) es una clase **distinta** de la que usa este flujo (`LiberadorCreditoMethods.LiberarCliente`, `LiberadorCreditoMethods.cs:40`) |
| Marcador explícito en el código | `ProductosCreditoWeb_SaveData` envía **`@articulo = ""`** (`CreditMethods.cs:170`). El método hermano de CrediLana comenta esa misma convención al revés: `data[33] = ""; //para diferenciarla de credilanas articulo en blanco` (`CreditMethods.cs:471`). **El artículo en blanco es precisamente el discriminante que distingue el crédito propio del de CrediLana.** |
| Clasificación en las fuentes maestras | `_EXCLUIDOS_Intelisis.md:113` lo lista como 🟡 MIXTO con destinos `IntelisisTmp + SQLite + ServicioAndroid` — **sin mención a CrediLana** |

**Conclusión:** aplica el desarrollo completo del ERP heredado. Los métodos de CrediLana (`SPCREDICredilana`, `Metodos/Credit/CredYPrestamo/`, `SaveCredilanaInfo`) quedan **FUERA DE ALCANCE** de este documento y **no se desarrollan** aquí.

---

## Contrato de Entrada

Modelo `OrderRequest` — `APIMagento/WebApiMagento/Models/OrderRequest.cs` líneas **6–29**. Es el mismo modelo de `order/setOrder`.

| Campo | Tipo | Uso en la rama de crédito |
|---|---|---|
| `metodoPago` | string | **Discriminante.** Debe valer `"omnipro_pago_credito"` (`OrderMethods.cs:30`) para entrar en la rama |
| `entityId` | string | quote id de Magento; se captura para el callback (`CreditMethods.cs:210`) |
| `incrementId` | string | `@idMagento` del SP; y `data[2]` |
| `storeId` | string | `"viu"` → UEN 2; cualquier otro → UEN 1 |
| `total` | string | comparado contra `checkSaldo(cuenta)` |
| `articulos` | `List<Dictionary<string,string>>` | `sku`, `cantidad`, `precio`, `precioEspecial`, `descuento`, `condicion` |
| `costoEnvio` | string | si `≠ "0"` y `≠ ""` se agrega como línea `SEGU00001` |
| `infoCliente` | `Dictionary<string,string>` | **`cuenta`** (obligatoria de facto), `correo`, `codigoPostal`, `direccion`, `numExt`, `numInt`, `municipio`, `colonia`, `estado`, `telefono`, `telefonoClienteMavi`, `nombreClienteMavi`, `apellidoPaternoClienteMavi`, `apellidoMaternoClienteMavi`, y opcionales `codigo_promotor`, `entreCalles`, `OrigenIdMagento`, `origen` |
| `sucursalDestino` | int | `@sucursalDestino` |
| `RedimirMonedero` | float | `@RedimirMonedero` |
| `utmSource` | string | `@utmSource` |

🚩 **Accesos directos al diccionario sin `ContainsKey`:** `order.infoCliente["cuenta"]` (líneas 615, 616, 623, 645), `["correo"]` (626), `["codigoPostal"]` (595, 635), `["nombreClienteMavi"]`, `["apellidoPaternoClienteMavi"]`, `["apellidoMaternoClienteMavi"]` (599–601). Cualquiera ausente lanza `KeyNotFoundException` → capturada por el `catch` de `SetPedido` (708) → devuelve `""` → **HTTP 200 con `cuenta: ""`**. Nótese la inconsistencia: `codigo_promotor`, `entreCalles`, `OrigenIdMagento` y `origen` **sí** se protegen con `ContainsKey` (líneas 629, 637, 640, 642).

---

## Flujo de Ejecución Detallado

### Fase A — Preparación común (líneas 534–602, compartida con `order/setOrder`)

1. **`AgruparCantidadPorSKU(order)`** (485–525): consolida artículos repetidos sumando cantidades y descuentos. Toma `precio`, `precioEspecial` y `condicion` de la **primera** ocurrencia del SKU.
2. **`ToArray(order)`** (339–438): aplana el `OrderRequest` a un `string[39]` posicional. Índices relevantes para el crédito:

   | Índice | Contenido | Usado como |
   |---|---|---|
   | 14 | `infoCliente["direccion"]` | `@direccion` |
   | 15 | `infoCliente["numExt"]` | `@exterior` |
   | 16 | `infoCliente["numInt"]` | `@interior` |
   | 17 | `infoCliente["codigoPostal"]` | `@codigo_postal` |
   | 18 | `infoCliente["municipio"]` | `@delegacion` **y** `@poblacion` |
   | 19 | `infoCliente["colonia"]` | `@colonia` |
   | 20 | `infoCliente["estado"]` | `@estado` |
   | 21 | `ValidateOnlyNumbers(infoCliente["telefono"])` | lada + teléfono (particular y celular) |
   | 31 | `order.metodoEnvio` | `@MetodoEnvio` |

   🚩 **Array posicional de 39 elementos sin constantes nombradas en el consumidor.** `SetPedido` usa el `enum Venta` (`Models/Enums.cs`) para indexar, pero `ProductosCreditoWeb_SaveData` usa **literales numéricos** (`datosped[14]`, `datosped[21]`, `datosped[31]`). Cualquier campo añadido a `ToArray` desplaza todo y rompe el crédito en silencio.

3. **Guarda de pedido existente (537):** `if (obtenerIdVenta(idEcommerce) > 0 && order.forzarOrder == "0") return "PedidoExistente";` — consulta `Venta`.
   ⚠️ `obtenerIdVenta` captura su excepción con `Console.WriteLine` y devuelve `0` (`OrderMethods.cs:1617–1620`) → **un fallo de BD desactiva la guarda**.
   ⚠️ Además, `ToArray` **puede haber cambiado `forzarOrder` a `"1"`** si algún artículo trae `precioEspecial != "0"` (líneas 376–377, 393–394), desactivando también la guarda.
4. **Desvíos de pago (541–551):** OpenPay / OpenPay Stores. No aplican en la rama de crédito.
5. **`detallePedido("Limpiar", …)`** (578) → SP `SpVTASeCommerceDetPedidos` → **`DELETE`** en `eCommerceDetPedidos` (`WHERE IdPedido = @IdMag AND RefPedidoIntelisis IS NULL`).
6. **`detallePedido("Insertar", …)` × N** (580–597) → SP `SpVTASeCommerceDetPedidos` → **`INSERT`** por artículo, con `precio > 0` y `cantidad > 0`. Aquí **sí** se envían los valores reales (`@Cp = order.infoCliente["codigoPostal"]`, `@RecSuc = recogeSucursal`), a diferencia de [[03_BusinessMethod|getOrderId]], que envía constantes. El SP aplica su lógica regional de SKU de telefonía (`VTASCRegionSku`, `VTASCCodigoPostalRegionCelular`, `eCommerceExist`, `Art`).
7. **`SaveGuide`** (602, def. 715–734) → **SQLite** `C:\inetpub\wwwroot\api\data.db`, tabla `servicio_guias`: `INSERT OR IGNORE (idecommerce, fullname)` con el nombre compuesto `APELLIDOP APELLIDOM NOMBRE` en mayúsculas.

### Fase B — Rama de crédito (líneas 605–646)

```csharp
if (order.metodoPago == CREDIT_METHOD)
{
    List<string> articulos = new List<string>();
    foreach (var articulo in order.articulos)
        articulos.Add(articulo["cantidad"] + "," + articulo["sku"]);
    if (order.costoEnvio != "0" && order.costoEnvio != "")
        articulos.Add(order.costoEnvio + ",SEGU00001");

    var numeroDelSms   = ObtenerNumeroTablaSms(order.infoCliente["cuenta"]);
    var numeroValidado = IsValidated(order.infoCliente["cuenta"]);
    var isValidated    = numeroValidado == numeroDelSms;

    var cm = new CreditMethods();
    cm.ProductosCreditoWeb_SaveData(new string[] { … }, articulos.ToArray(), sDatosPedido, …);

    return order.infoCliente["cuenta"];   // ← RETORNO ANTICIPADO
}
```

**8.a — Serialización de artículos a `"cantidad,sku"`** (607–613). El costo de envío se agrega como el SKU **`SEGU00001`** hardcodeado. Cadenas separadas por coma que después se parten con `Split(',')` (`CreditMethods.cs:894`) — formato frágil: cualquier coma en un SKU rompe el parseo.

**8.b — Verificación del teléfono validado por SMS** (615–617):

| Helper | Archivo:línea | Conexión | Consulta |
|---|---|---|---|
| `ObtenerNumeroTablaSms` | `OrderMethods.cs:799–832` | **`sCadenaConexionAndriod`** → `ServicioAndroid` | `SELECT TOP 1 Telefono FROM TcAAEA00030_EnvioMensajes WITH(NOLOCK) WHERE IdRegistro IN (SELECT IdCodigoVerificacioneCommerce FROM VTASDCodigoVerificacioneCommerce CV WITH(NOLOCK) WHERE CV.Cliente = '{0}') ORDER BY Id DESC` |
| `IsValidated` | `OrderMethods.cs:766–797` | `sCadenaConexion` → `IntelisisTmp` | `SELECT TOP 1 CONCAT(ct.Lada, ct.Telefono) as Tel FROM CteTel ct WITH(NOLOCK) WHERE ct.Cliente = '{0}' AND ct.Tipo = 'Movil' AND ct.ValidacionTel = 1 ORDER BY Fecha DESC` |

🔴 **Ambas usan `String.Format` con concatenación directa de `cuenta` → inyección SQL.** Y ambas devuelven `""` en caso de excepción, lo que hace que `isValidated` sea `true` por coincidencia de dos cadenas vacías → **un fallo de BD marca el teléfono como validado**. Ver observación 2.

**8.c — `CreditMethods.ProductosCreditoWeb_SaveData`** (`CreditMethods.cs:94–262`) — el núcleo del flujo:

**Conexión:** `sCadenaConexionAndriod` → `server=mavicbosandroid.grupomavi.com; database=ServicioAndroid`. *(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` línea 28.)*
⚠️ Según `_EXCLUIDOS_Intelisis.md` (§ *"Los que alcanzan Intelisis por linked server `ERPMAVI`"*), **`SP_CREDITO_WEB_DATOS` cruza a Intelisis por linked server y toca `CREDICCondicionArt`, `TablaStD` y `CteTel`** — no se detecta mirando la cadena de conexión. **No verificable sin el fuente del SP** (Regla #5).

- **`datosped[21] = Regex.Replace(datosped[21], @"[^0-9]", "")`** (línea 113) — limpia el teléfono.
- **Validación de elegibilidad (124–133):**
  ```csharp
  if (checkCliente(data[0])) {
      if (decimal.Parse(data[4]) > checkSaldo(data[0])) res = "insuficiente";
      else res = "OK";
  } else return "sin cuenta";
  ```
  🚩 **`res = "insuficiente"` NO detiene el flujo.** Se asigna la cadena y **la ejecución continúa**: se inserta la solicitud, se lanza el hilo del Liberador y se devuelve `"insuficiente"` al final. La validación de saldo es **puramente informativa**. Ver observación 1.

  | Helper | Archivo:línea | SP | Conexión |
  |---|---|---|---|
  | `checkCliente` | `CreditMethods.cs:726–765` | `SpCREDIDatosSolicitudCreditoArt` (`@Op='CheckCliente'`, `@retValue` como `ReturnValue`) | `sCadenaConexion` / IntelisisTmp |
  | `checkSaldo` | `CreditMethods.cs:767–804` | `SpCREDIDatosSolicitudCreditoArt` (`@Op='GetSaldo'`) | **`sCadenaConexionAndriod`** / ServicioAndroid |
  | `getClientInfo` | `CreditMethods.cs:805+` | `SpCREDIDatosSolicitudCreditoArt` (`@Op='GetInfo'`) | `sCadenaConexion` / IntelisisTmp |

  🚩 `checkCliente` y `checkSaldo` invocan **el mismo SP contra bases distintas**. Y ambos tienen `catch (Exception ex) { }` **vacío** (líneas 745–749 y 799–803): un fallo devuelve `false` / `0` sin dejar rastro.
  🚩 `checkSaldo` ejecuta **`cmd.ExecuteScalar()` dos veces** (líneas 793 y 795): la primera descarta el resultado, la segunda lo parsea. **El SP se ejecuta dos veces por invocación.**

- **Descomposición de la lada (139–148):** lista hardcodeada `{ "33", "55", "81" }` → lada de 2 dígitos; el resto → 3 dígitos. 🚩 `telAux.Substring(0, 2)` **lanza si el teléfono tiene menos de 2 caracteres** → `catch` → `"err"`.
- **36 parámetros al SP `SP_CREDITO_WEB_DATOS`** (150–188) — tipados con `SqlDbType`, **parametrizados correctamente**. Detalles notables:
  - `@delegacion` y `@poblacion` reciben **el mismo valor** (`datosped[18]`, municipio).
  - `@lada_celular`/`@telefono_celular` reciben **el mismo valor** que los de teléfono particular.
  - `@articulo = ""` — el discriminante frente a CrediLana (ver § Regla #15).
  - `@sucursal` = **505** (UEN 2 / VIU) o **504** (UEN 1) — constantes hardcodeadas.
  - `@ValidacionTelefono` = `1` si `(!isValidated) || !IsInTableStd(cliente)`, si no `0`.
    `IsInTableStd` (`CreditMethods.cs:1968–1990`) — 🔴 **otra concatenación con `String.Format`**: consulta `tablastd` ⋈ `ctetel` con `TablaSt = 'ORIGEN VALIDACION NUMERO CTE'`.
- **Lectura del retorno (190–197):** `IdSolicitud = dr[0].ToString()` — **por índice, sin nombre de columna**, en un `while` sobre lo que debería ser una sola fila.
- **Si `IdSolicitud != ""` (199–242):**
  - **`CreditoWeb_InsertArticulo(articulos, IdSolicitud, condicion, cp)`** (`CreditMethods.cs:870–920`) → SP **`SpVTASInsertArtSolCreditoLinea`** (`@IdCredito, @Cantidad, @Articulo, @Condicion, @Orden, @SeguCost, @Cp`), una ejecución por artículo vía `SqlDataAdapter.Fill`. `SEGU00001` recibe tratamiento especial: su cantidad va a `@SeguCost` (float) y `@Cantidad = 1`. 🚩 El filtro `if (prevArt != articulosTemp[1])` **solo compara con el artículo inmediatamente anterior**: SKUs repetidos no adyacentes se insertan dos veces. 🚩 Sin `using` en `SqlCommand` ni `SqlConnection` (campo de clase `cnn`).
  - **`CodigoPromocion(data[6], "Elimina", data[2])`** si hay código de promotor → SP **`SpVTASVentaCupon`** (`@opcion, @Codigo, @IdEcommerce`) sobre `sCadenaConexion`.
  - **Lanzamiento del hilo del Liberador (208–241)** — solo si `cuenta` empieza con `"C"`:
    ```csharp
    var liberadorThread = new System.Threading.Thread(() =>
    {
        try {
            var liberador = new LiberadorCreditoMethods();
            LiberadorResult resultado = liberador.LiberarCliente(capturedCliente, capturedIdSol, capturedUen);
            OrderMethods.CallMagentoAuthorizationCallback(entityId: capturedEntityId, status: resultado.Status,
                cuenta: capturedCliente, idSolicitud: resultado.IdVenta > 0 ? resultado.IdVenta : capturedIdSol);
        } catch (Exception ex) {
            Logger.SetOrder("ERROR LiberadorThread", $"entityId={capturedEntityId} {ex.Message}");
            OrderMethods.CallMagentoAuthorizationCallback(entityId: capturedEntityId, status: "RECHAZADO",
                cuenta: capturedCliente, idSolicitud: capturedIdSol);
        }
    });
    liberadorThread.IsBackground = true;
    liberadorThread.Start();
    ```
    ✅ **Tiene `try/catch` interno y notifica `RECHAZADO` en el peor caso** — es más robusto que el `Task` de [[03_BusinessMethod|generateNewStorepickupCode]]. ⚠️ Pero `IsBackground = true` significa que **un reciclado del `AppPool` de IIS lo mata sin ejecutar el `catch`**, y entonces **el callback nunca llega**. Ver observación 3.
    🚩 **La condición `data[0].ToUpper().StartsWith("C")`** es el patrón de cuenta de Intelisis. La DMZ ya lo declaró obsoleto: *"SAP retornará identificadores puramente numéricos (BP), por lo que ya no evaluamos la letra 'C'"* (`APIMagentoDMZ/.../OrdersController.cs:169`). **Con cuentas SAP, el hilo del Liberador nunca se lanzaría.**

**8.d — Retorno anticipado (645):** `return order.infoCliente["cuenta"];`
🚩 **Devuelve la cuenta que venía en el request, no la respuesta del SP.** El valor de `res` (`"OK"`, `"insuficiente"`, `"sin cuenta"`, `"err"`) que `ProductosCreditoWeb_SaveData` calculó **se descarta por completo**. Ver observación 1.

Este `return` corta la ejecución de `SetPedido`: **`crearPedido`, `DatosEntregaInsert`, `GenerarMonedero`, `afectar` y `UpdateIdEcommerceEnVenta` NO se ejecutan** en la rama de crédito.

### Fase C — El hilo del Liberador y el callback

**`LiberadorCreditoMethods.LiberarCliente`** — `Metodos/LiberadorCreditoMethods.cs:40–101`:
- Autentica con `POST` a `AUTENTICACION_URL_LIBERADOR` enviando `{ Password }` desde `PASSWORD_AUTENTICACION_LIBERADOR` (app settings — ✅ sin hardcodeo, Regla #7).
- `POST` a `VETA_URL_LIBERADOR` con `{ Cliente, Id, UEN }`.
- Interpreta `ResponseData.idVenta`:

  | Resultado | `Status` devuelto |
  |---|---|
  | `idVenta > 0` | `"EN_ANALISIS"` (pedido creado en Intelisis, aún no liberado) |
  | `idVenta == 0` | `"EN_ANALISIS"` |
  | excepción | `"RECHAZADO"` |

  🚩 **`"AUTORIZADO"` está declarado en el comentario de `LiberadorResult` (línea 11) pero nunca se devuelve.** El método solo produce `EN_ANALISIS` o `RECHAZADO`. La autorización real la detecta Magento consultando `GET order/creditStatus/{idSolicitud}` hasta que `Venta.Situacion = 'Liberado'` (comentario en las líneas 78–80).
- Usa `WebClient` **sin `Timeout` configurado** (el default de `WebClient` es 100 s, pero la clase `WebClientCustom` de `Helper/Curl.cs` no se usa aquí).

**`OrderMethods.CallMagentoAuthorizationCallback`** — `OrderMethods.cs:1731–1813`:
- Lee `URL_DMZ` y `USER_DMZ` de app settings; `USER_DMZ` se deserializa como `{ Username, Password }`.
- **Reintenta 3 veces** con backoff lineal (`Thread.Sleep(2000 * attempt)`).
- Autentica contra `{URL_DMZ}login/authenticate` y hace `POST` a `{URL_DMZ}order/authorizationResult` con `{ entityId, status, cuenta, idSolicitud }`.
- 🔴 **`ServerCertificateCustomValidationCallback = (…) => true`** (líneas 1747–1748): **acepta cualquier certificado TLS.** Mismo patrón en `Helper/Curl.cs:27`.
- 🔴 **Usa `.Result` sobre `PostAsync` y `ReadAsStringAsync`** (líneas 1766, 1771, 1775, 1789, 1792) — **explícitamente prohibido por la Regla #12**.
- Si los 3 intentos fallan: `Logger.SetOrder("ERROR CallMagentoCallback DEFINITIVO", …)` y **se pierde la notificación sin ningún mecanismo de recuperación**.

---

## Interacciones con Base de Datos

Ver CSV exclusivo: [[03_BusinessMethod_DB.csv]]

**Conexiones utilizadas:**

| Cadena | Servidor / Base | Usada por |
|---|---|---|
| `sCadenaConexion` | `MAVICUBOS.grupomavi.com` / `IntelisisTmp` | `obtenerIdVenta`, `detallePedido`, `IsValidated`, `checkCliente`, `getClientInfo`, `CreditoWeb_InsertArticulo`, `CodigoPromocion`, `IsInTableStd` |
| `sCadenaConexionAndriod` | `mavicbosandroid.grupomavi.com` / `ServicioAndroid` | `ObtenerNumeroTablaSms`, `checkSaldo`, **`SP_CREDITO_WEB_DATOS`** |

*(Credenciales omitidas intencionalmente — ver `Conn/Connection.cs` líneas 26 y 28.)*

**Persistencia no-SQL Server:**

| Recurso | Ruta | Operación |
|---|---|---|
| **SQLite** | `C:\inetpub\wwwroot\api\data.db` → `servicio_guias` | Insert (`SaveGuide`, `OrderMethods.cs:715–734`) |

**Servicios externos (Regla #3 y #4 — documentados aparte del payload SAP):**

| Destino | Endpoint | Vía | Cuándo |
|---|---|---|---|
| **API Liberador de crédito** | `AUTENTICACION_URL_LIBERADOR` + `VETA_URL_LIBERADOR` | `WebClient` directo desde LAN, **en hilo de fondo** | siempre que la cuenta empiece con `"C"` |
| **Magento (callback)** | `{URL_DMZ}order/authorizationResult` → `rest/V1/omnipro-credito/authorizationResult` | `HttpClient` LAN → DMZ → Magento | al terminar el Liberador |

**Stored Procedures del flujo:**

| SP | Base | ¿Fuente en `SPsOrden/`? |
|---|---|---|
| `SpVTASeCommerceDetPedidos` | IntelisisTmp | ✅ disponible |
| `SpCREDIDatosSolicitudCreditoArt` | IntelisisTmp / ServicioAndroid | ✅ disponible |
| `SpVTASInsertArtSolCreditoLinea` | IntelisisTmp | ✅ disponible |
| `SpVTASVentaCupon` | IntelisisTmp | ✅ disponible |
| **`SP_CREDITO_WEB_DATOS`** | ServicioAndroid (→ Intelisis vía linked server `ERPMAVI`) | ❌ **FALTANTE** — ver [[_SPS_FALTANTES]] |

**`spAfectar` NO se alcanza por esta ruta.** El `return` anticipado de la línea 645 corta antes de `afectar` (línea 696), que además solo se ejecuta para OpenPay/PayPal. Se registra la verificación por si se busca en el árbol de decisión: **si apareciera, la decisión sería ignorarlo y eliminarlo** (SAP asume el inventario nativamente), documentando que hoy existe. Aquí no aplica.

---

## Ejemplo de Respuesta (Response)

**Caso exitoso** — **HTTP 200**:
```json
{ "status": "PROCESANDO", "cuenta": "C00012345" }
```
El resultado real llega después por callback a `rest/V1/omnipro-credito/authorizationResult` con `{ entityId, status: "EN_ANALISIS"|"RECHAZADO", cuenta, idSolicitud }`.

**Caso "sin datos" / rechazo de negocio** — **HTTP 200**, cuerpo **idéntico en forma**:
```json
{ "status": "PROCESANDO", "cuenta": "C00012345" }
```
> ⚠️ Aunque `checkCliente` haya devuelto `false` (`"sin cuenta"`), o el saldo sea insuficiente, **el endpoint devuelve la cuenta que venía en el request** (línea 645). El rechazo **no es visible en la respuesta**. Solo se detecta por el callback… **que en el caso `"sin cuenta"` nunca se dispara**, porque `ProductosCreditoWeb_SaveData` retorna antes de crear el hilo (`CreditMethods.cs:257`). **Magento se queda esperando indefinidamente.**

**Caso de excepción tragada por `SetPedido`** — **HTTP 200**:
```json
{ "status": "PROCESANDO", "cuenta": "" }
```
El `catch` de `SetPedido` (708–711) loguea y deja `sRespuestaPedido` vacío; el retorno de la línea 712 llama a `GetCreatedAccount`, que también devuelve `""`.

**Caso de error no capturado** (body `null`, `KeyNotFoundException` fuera del `try`) — **HTTP 500** con detalle de la excepción ([[02_LAN_Controller]] obs. 6).

> **Cuatro desenlaces, un solo `status`. El más grave —"sin cuenta", donde el callback nunca llegará— es indistinguible del éxito.**

---

## Observaciones técnicas detectadas (deuda para la migración)

1. **🔴 El resultado de la validación crediticia se descarta — hallazgo principal.** Dos defectos encadenados:
   - `ProductosCreditoWeb_SaveData` calcula `res` (`"OK"` / `"insuficiente"` / `"sin cuenta"` / `"err"`) y lo devuelve, pero **`SetPedido` ignora el valor de retorno** (línea 620 lo invoca como sentencia) y devuelve `order.infoCliente["cuenta"]` (línea 645).
   - Peor: **`res = "insuficiente"` no detiene nada** (`CreditMethods.cs:128`). Se asigna la cadena y el flujo continúa: se inserta la solicitud, se insertan los artículos y **se lanza el hilo del Liberador para un cliente cuyo saldo no alcanza**.

   **Consecuencia:** la comprobación de saldo (`checkSaldo`, que ejecuta un SP dos veces) es puramente decorativa. La decisión real la toma la API del Liberador. **Debe confirmarse con negocio si eso es intencional** (el Liberador es la autoridad y el `checkSaldo` local es un pre-chequeo cosmético) **o si es un bug** (Regla #10, no se asume).

2. **🔴 Inyección SQL en tres helpers del flujo.** Todos concatenan `cuenta` con `String.Format`:
   - `OrderMethods.IsValidated` — línea **774**
   - `OrderMethods.ObtenerNumeroTablaSms` — línea **807**
   - `CreditMethods.IsInTableStd` — línea **1975**

   Agravante: **los tres devuelven un valor benigno en caso de excepción** (`""` / `false`), lo que hace que un fallo de BD se convierta en `isValidated = true` (dos cadenas vacías son iguales) — es decir, **un error de base de datos marca el teléfono del cliente como validado por SMS**. Ver también `GetCreatedAccount` (876) y `DatosEntregaInsert` (907), del mismo archivo.

3. **🔴 El hilo de fondo puede perder el callback sin dejar rastro recuperable.** `liberadorThread.IsBackground = true` (`CreditMethods.cs:239`): si el `AppPool` de IIS se recicla —por inactividad, por límite de memoria, por despliegue— **el hilo se aborta sin ejecutar su `catch`**, y Magento nunca recibe la notificación. No hay tabla de pendientes, ni reintento posterior, ni proceso de barrido. La única mitigación es que Magento consulte `GET order/creditStatus/{idSolicitud}` por su cuenta, pero **el `idSolicitud` solo se le comunica en el callback que se perdió**. Es un punto ciego estructural.
   Sumado: `CallMagentoAuthorizationCallback` reintenta 3 veces y, si falla, solo escribe `"ERROR CallMagentoCallback DEFINITIVO"` en el log.

4. **🔴 `.Result` sobre `HttpClient` en `CallMagentoAuthorizationCallback`** (líneas 1766, 1771, 1775, 1789, 1792). **Prohibido explícitamente por la Regla #12.** Aunque aquí corre en un hilo dedicado (no en el del request), el patrón es un riesgo de *deadlock* y debe eliminarse.

5. **🔴 Validación TLS deshabilitada.** `ServerCertificateCustomValidationCallback = (…) => true` (`OrderMethods.cs:1747–1748`) y `ServerCertificateValidationCallback = delegate { return true; }` (`Helper/Curl.cs:27`). El callback transporta `cuenta` e `idSolicitud` de un cliente de crédito **sin verificar el certificado del destino**.

6. **`"AUTORIZADO"` es un estado muerto.** Declarado en `LiberadorResult` (`LiberadorCreditoMethods.cs:11`) y nunca producido. Magento tiene que hacer *polling* de `creditStatus` para detectar la liberación. Al migrar, el contrato de estados debe redefinirse desde cero.

7. **`StartsWith("C")` como discriminante de cuenta** (`CreditMethods.cs:208`) — la DMZ ya lo declaró obsoleto para SAP (*"SAP retornará identificadores puramente numéricos (BP)"*, `APIMagentoDMZ/.../OrdersController.cs:169`). **Con cuentas SAP el hilo del Liberador no se lanzaría y el flujo de crédito quedaría colgado en silencio.** Es una incompatibilidad concreta, ya identificada en el otro lado del puente.

8. **`catch` vacíos en `checkCliente` y `checkSaldo`** (`CreditMethods.cs:745–749`, `799–803`): `catch (Exception ex) { }` literal, sin `Logger`, sin `Console`. Un fallo devuelve `false` / `0` de forma indistinguible de un rechazo legítimo. Regla #8.

9. **`checkSaldo` ejecuta el SP dos veces** (`CreditMethods.cs:793` y `795`): `cmd.ExecuteScalar();` descartado seguido de `decimal.Parse(cmd.ExecuteScalar().ToString())`. Duplica el costo y, si el SP tuviera efectos secundarios, los duplica también.

10. **`checkCliente` y `checkSaldo` invocan el mismo SP contra bases distintas** (`sCadenaConexion` vs `sCadenaConexionAndriod`, líneas 733 y 774). O hay dos copias del SP en dos servidores, o una de las dos está mal apuntada. **Requiere verificación** (Regla #10).

11. **Array posicional `string[39]` con literales numéricos.** `ProductosCreditoWeb_SaveData` indexa `datosped[14]`, `[15]`, `[16]`, `[17]`, `[18]`, `[19]`, `[20]`, `[21]`, `[31]` sin constantes. Añadir un campo a `ToArray` (`OrderMethods.cs:339`) desplaza todo y **rompe el crédito sin error de compilación**.

12. **Accesos a `infoCliente` sin `ContainsKey`** (líneas 615, 616, 623, 626, 635, 645, 599–601) → `KeyNotFoundException` → `""` con HTTP 200. Inconsistente con los cuatro campos que sí se protegen.

13. **Duplicación de datos en el SP:** `@delegacion` y `@poblacion` reciben el mismo `datosped[18]`; `@lada_celular`/`@telefono_celular` duplican los de teléfono particular. **El "teléfono celular" registrado en la solicitud de crédito es en realidad el teléfono de envío del pedido.**

14. **Constantes de negocio hardcodeadas:** `@sucursal` = 504/505 según UEN (`CreditMethods.cs:175`), ladas de 2 dígitos `{ "33","55","81" }` (139), SKU `SEGU00001` (613, 900), `@origen` por defecto `"PRODUCTOS MX"` (642), `CREDIT_METHOD = "omnipro_pago_credito"` (30). Regla #7.

15. **`Substring` sin validar longitud** (`CreditMethods.cs:141, 146`): un teléfono de menos de 2 caracteres lanza → `catch` → `"err"` → que además se descarta (observación 1).

16. **`CreditoWeb_InsertArticulo` compara solo con el artículo anterior** (`CreditMethods.cs:896`): SKUs repetidos no adyacentes se insertan dos veces. Mitigado en la práctica por `AgruparCantidadPorSKU`, pero la protección es frágil y depende de otro método.

17. **Sin `using` en `CreditMethods`:** `cnn` es un campo de clase reasignado en varios métodos (`CreditMethods.cs:117, 873`), `SqlCommand` sin `using` (879), `SqlDataAdapter` sin liberar (914). Mismo patrón que `FacturaMethods` ya documentado en [[03_BusinessMethod|getClienteSaldo]].

18. **`WITH(NOLOCK)`** en `IsValidated`, `ObtenerNumeroTablaSms`, `IsInTableStd` y `obtenerIdVenta` — lectura sucia sobre datos de validación de identidad del cliente.

19. **`CommandTimeout` sin criterio:** `99999` (`IsValidated`:777, `IsInTableStd`:1978), `9999999` (`ObtenerNumeroTablaSms`:812), `60` (`checkCliente`:751, `checkSaldo`:792), `120` (`CodigoPromocion`:756), `60000` (`detallePedido`:1020). Seis valores distintos en el mismo flujo.

20. **Cuerpo del SP `SP_CREDITO_WEB_DATOS` no analizado por falta del fuente** (Regla #5). Es el corazón del flujo: recibe 36 parámetros y devuelve el `IdSolicitud`. Según `_EXCLUIDOS_Intelisis.md` cruza a Intelisis por linked server `ERPMAVI` y toca `CREDICCondicionArt`, `TablaStD` y `CteTel`, **pero eso no es verificable sin el script.** Ver [[_SPS_FALTANTES]].

21. **Método síncrono con hilo de fondo no gestionado.** Migrar a `async/await` + una cola de trabajo persistente (Regla #12).

---

## Destino SAP — PENDIENTE DE DEFINICIÓN (conflicto documental abierto)

| Fuente | Clasificación asignada |
|---|---|
| `_EXCLUIDOS_Intelisis.md` (línea 113) | 🟡 **MIXTO** — `IntelisisTmp + SQLite + ServicioAndroid`, "en radar", `OrderMethods.cs:458` |
| `_EXCLUIDOS_Intelisis.md` (línea 213) | listado entre los **26 🟡 MIXTO** de `OrdersController` |
| `_INVENTARIO_NoIntelisis.csv` (línea 71) | `Mixto` — *"Mismo flujo que setOrder"* |
| `MIGRATION_STATUS_MASTER_v2.csv` (línea 89) | **`In Progress`** — LAN `OrdersController.cs:457`, DMZ `OrdersController.cs:370`, destino **`SAP (credit release, async callback)`**. Nota: *"Callback flow implemented in OrderMethods via VETA_URL_LIBERADOR / URL_DMZ; **DMZ route not repointed**."* |
| `_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv` | **sin fila** para este endpoint |
| **Código de la DMZ** (`APIMagentoDMZ/.../OrdersController.cs:366–368`) | *"Reemplazado por validación nativa de SAP a través de **OData FI/FICA** en ServicioSAP. La validación local de LAN queda obsoleta."* |

**Conflicto documental abierto en tres direcciones:**

1. `_EXCLUIDOS_Intelisis.md` lo mantiene 🟡 MIXTO / en radar.
2. El master dice `In Progress` con destino *"SAP (credit release, async callback)"* — es decir, **el flujo asíncrono se conserva** y lo que cambia es el motor de decisión.
3. **El código de la DMZ dice algo distinto:** que la validación de crédito la asume SAP **de forma nativa vía OData FI/FICA** y que *"la validación local de LAN queda obsoleta"* — lo que implica que el flujo asíncrono con Liberador **desaparece**, no que se re-apunte.

**Las opciones 2 y 3 son incompatibles.** O el callback asíncrono sobrevive con SAP como origen del veredicto, o el crédito se resuelve dentro de `order/new` y todo este circuito se elimina. **La nota del master lo reconoce a medias:** *"DMZ route not repointed"* — pero la ruta no está *sin re-apuntar*, está **comentada** ([[01_DMZ_Controller]]).

Conforme a la **Regla #10**, no se asigna servicio OData en este documento.

### Elementos sin equivalente identificado

- **`SP_CREDITO_WEB_DATOS`** — 36 parámetros, fuente no disponible, cruza a Intelisis por linked server. **Bloqueante duro:** sin el script no se puede saber qué tablas escribe ni qué reglas aplica. Ver [[_SPS_FALTANTES]].
- **API Liberador (`VETA_URL_LIBERADOR`)** — **servicio externo a Intelisis y a SAP**. La documentación no aclara si es un sistema propio de MAVI que sobrevive, si lo reemplaza FI/FICA, o si es CrediLana. **Es la pregunta más importante del endpoint** y no está respondida en ninguna fuente.
- **`TcAAEA00030_EnvioMensajes` / `VTASDCodigoVerificacioneCommerce`** (ServicioAndroid) — validación de teléfono por SMS. Base y flujo ajenos a Intelisis; Regla #1: confirmar si migran a `SigMavi`.
- **`CteTel`** — teléfonos del cliente. Según `bp05_maestro` §5, `Cte` y `CteTel` deben reemplazarse por `A_BusinessPartner` / la vista CDS, pero **la marca `ValidacionTel` (validado por SMS) no tiene equivalente identificado**.
- **`eCommerceDetPedidos`, `TablaStD`, `CREDICCondicionArt`** — tablas propias MAVI, sin equivalente SAP.
- **SQLite `data.db` / `servicio_guias`** — persistencia local; fuera de SAP por definición.
- **`Venta.Situacion = 'Liberado'`** — el estado que Magento consulta vía `creditStatus`. Sin equivalente definido en el modelo de documento de ventas SAP.

### Puntos a cerrar con el Líder Técnico

1. **Resolver la contradicción de fondo entre el master y el código de la DMZ:** ¿el flujo asíncrono de crédito **sobrevive** con SAP como motor (`In Progress`, *"credit release, async callback"*), o **desaparece** porque `order/new` valida el crédito nativamente vía OData FI/FICA (comentario de `APIMagentoDMZ/.../OrdersController.cs:367`)? **Todo lo demás depende de esta decisión.**
2. **Definir qué es la API Liberador y si sobrevive.** Es un servicio externo con credenciales propias (`AUTENTICACION_URL_LIBERADOR` / `PASSWORD_AUTENTICACION_LIBERADOR`) que hoy es la autoridad real del veredicto crediticio. **No está clasificado en ninguna de las cuatro fuentes maestras.**
3. **🔴 Obtener el fuente de `SP_CREDITO_WEB_DATOS`** (ronda 2). Sin él, la lógica de registro de la solicitud es una caja negra y **no puede diseñarse el reemplazo**.
4. **Aclarar la semántica de `"insuficiente"`** (observación 1): ¿el `checkSaldo` local debe bloquear la solicitud, o es correcto que solo decida el Liberador? Es una regla de negocio, no una decisión técnica.
5. **Rediseñar el mecanismo de notificación** (observación 3). El hilo `IsBackground` que puede morir con el `AppPool`, sin tabla de pendientes ni barrido, es inaceptable para un flujo que decide si un cliente compra a crédito. Requiere outbox persistente + reintento.
6. **Sustituir `StartsWith("C")`** (observación 7) — incompatibilidad ya identificada con las cuentas BP numéricas de SAP. **Es un bloqueo concreto para el corte.**
7. **Redefinir el contrato de estados** (observación 6): hoy `"AUTORIZADO"` no se emite nunca y Magento hace *polling* de `creditStatus`. En el diseño nuevo debe haber un conjunto de estados cerrado y real.
8. **Decidir si `validateCredit` y `setOrder` se unifican** ([[02_LAN_Controller]] obs. 4). Hoy son dos puertas al mismo `SetPedido` con contratos de respuesta distintos.
9. **🔴 Acciones inmediatas, independientes de la migración:** corregir las tres inyecciones SQL (observación 2), eliminar los `.Result` (observación 4) y restaurar la validación TLS (observación 5). Son defectos activos en producción.
10. **Confirmar si `SpCREDIDatosSolicitudCreditoArt` existe en las dos bases** (observación 10) o si `checkSaldo` apunta al servidor equivocado.

> Sugerencia: agendar sesión `/grill-me` para cerrar estos puntos, empezando por el punto 1 (la contradicción master↔código es la que bloquea todo lo demás) y el punto 2 (la API Liberador es un actor no clasificado en el inventario).

---

## Referencias cruzadas

- **Endpoint gemelo que comparte el 100 % de la lógica:** `POST order/setOrder` → `OrderMethods.SetPedido` (`OrderMethods.cs:532`). **Documentar y decidir en conjunto.** Su proxy DMZ (`APIMagentoDMZ/.../OrdersController.cs:107–228`) **ya migró a `curl.PostSAP("order/new", …)`**.
- **Endpoints que completan el circuito asíncrono:**
  - `GET order/creditStatus/{idSolicitud}` → `OrderMethods.GetCreditStatus` (`OrderMethods.cs:1847`) — LAN `OrdersController.cs:484–504`, DMZ `APIMagentoDMZ/.../OrdersController.cs:460–482` (**activo**). Carpeta existente: `MappingMetods/OrdersController/idSolicitud/`.
  - `POST order/updateCreditOrderId` → `OrderMethods.UpdateCreditOrderId` (`OrderMethods.cs:1978`) — LAN `OrdersController.cs:506–533`, DMZ `404–419` (**activo**).
  - `POST order/authorizationResult` — **solo DMZ** (`APIMagentoDMZ/.../OrdersController.cs:421–458`); es el destino del callback de LAN.
- **Método delegado principal:** `CreditMethods.ProductosCreditoWeb_SaveData` (`CreditMethods.cs:94–262`).
- **Helpers de crédito:** `checkCliente` (726), `checkSaldo` (767), `getClientInfo` (805), `CreditoWeb_InsertArticulo` (870), `CodigoPromocion` (392), `IsInTableStd` (1968).
- **Helpers de validación de teléfono:** `OrderMethods.IsValidated` (766), `OrderMethods.ObtenerNumeroTablaSms` (799) — ambos con inyección SQL.
- **Servicio externo:** `LiberadorCreditoMethods.LiberarCliente` (`Metodos/LiberadorCreditoMethods.cs:40–101`).
- **Callback:** `OrderMethods.CallMagentoAuthorizationCallback` (`OrderMethods.cs:1731–1813`).
- **Endpoint desde el que también se alcanza esta rama:** [[03_BusinessMethod|getOrderInfoAndSet]] — si el pedido recuperado es de crédito, `SetPedido` entra por aquí.
- **🚫 FUERA DE ALCANCE (Regla #15 — CrediLana, no se desarrolla):** `CreditMethods.CreditoWeb_Informacion` (1191), `CreditoWeb_Solicitud` (1290), `CreditoWeb_SolicitudPrimerGuardado` (1343) — SP `SPCREDICredilana`; y todo el módulo `Metodos/Credit/CredYPrestamo/` (`CredyPrestamoMethods.cs`, `Liberador.cs`, `maviCrypto.cs`).
- **SP faltante:** [[_SPS_FALTANTES]] → `SP_CREDITO_WEB_DATOS`
- **SPs con fuente disponible:** `SPsOrden/SpCREDIDatosSolicitudCreditoArt.sql`, `SpVTASInsertArtSolCreditoLinea.sql`, `SpVTASVentaCupon.sql`, `SpVTASeCommerceDetPedidos.sql`
- **Frontend:** el módulo consumidor del circuito de crédito es `MAGENTO_WEB_ADOBE/app/code/Mavi/CreditoCheckout/` (el callback llega a `rest/V1/omnipro-credito/authorizationResult`). **No se identificó la llamada saliente a `order/validateCredit`** en el árbol de `MAGENTO_WEB_ADOBE/` — coherente con que su ruta DMZ esté comentada ([[01_DMZ_Controller]]).
- Tablas: [[Venta]], [[eCommerceDetPedidos]], [[CteTel]], [[TcAAEA00030_EnvioMensajes]], [[VTASDCodigoVerificacioneCommerce]], [[TablaStD]], [[servicio_guias]]
- Inventario de alcance: [[_EXCLUIDOS_Intelisis]], [[_INVENTARIO_NoIntelisis]], [[MIGRATION_STATUS_MASTER_v2]]

---

#migracion #SAP #analisis_bd #dotnet #OrdersController #validateCredit #credito #bloqueante
