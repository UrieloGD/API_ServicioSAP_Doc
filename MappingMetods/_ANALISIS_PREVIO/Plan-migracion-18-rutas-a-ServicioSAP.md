# Plan de migración — 18 rutas de APIMagento → ServicioSAP

**Principio rector**: *lift-and-shift*. Las conexiones se mueven tal cual (MAVICBOSANDROID, SIGMAVI/DEVMAVI, SQLite) y la lógica de negocio no cambia. Lo único que se reescribe es la capa de acceso a la conexión, para usar los helpers que ServicioSAP ya tiene.

Origen: `APIMagento\WebApiMagento`
Destino: `ServicioSAP\ServicioSap\ServicioSap`

---

## 1. Inventario de infraestructura

### 1.1 Ya existe en ServicioSAP — reutilizar

| Pieza | Ubicación | Equivale a (en APIMagento) |
|---|---|---|
| `conexionSQL.obtenerConexionAndroid()` / `…Async()` | `Helpers/ConexionDB/ConexionSQL.cs:40,100` | `Connection.sCadenaConexionAndriod` |
| `conexionSQL.obtenerConexionSigMavi()` / `…Async()` | `Helpers/ConexionDB/ConexionSQL.cs:11,72` | `Connection.sCadenaConexionSigMavi` |
| `SQLiteDb` — `Set()`, `Get(query)`, `Get(query,campos)` + async | `Helpers/ConexionDB/SQLiteDb.cs` | `Conn/DB.cs` (API **idéntica**) |
| Connection string `MAVICBOSANDROID` | `Web.config:13` | — |
| JWT: `TokenGenerator`, `TokenValidationHandler`, `HashService` | `Helpers/` | Mismos archivos |
| Logger | `Helpers/Logger.cs`, `Helpers/Logger/GeneradorLog.cs` | `Helper/Logger.cs` |
| Paquetes `System.Data.SQLite`, `RestSharp` | `packages.config` | Mismos |
| Patrón HTTP hacia DMZ | `Methods/Order/OrderMethods.cs:998` (`CallMagentoAuthorizationCallback`) | `Helper/Curl.cs` |
| `CreditMethods.SendSmsNewNumber` | `Methods/Credit/CreditMethods.cs:12` | **Ya migrado**, sin controller |
| `CreditMethods.IsValidated` | `Methods/Credit/CreditMethods.cs:116` | Ya migrado |
| `OrderMethods.SaveGuide` (privado) | `Methods/Order/OrderMethods.cs:389` | Ya migrado, falta el `Get` |

### 1.2 Falta crear en ServicioSAP

| # | Pieza | Necesaria para | Esfuerzo |
|---|---|---|---|
| H1 | `conexionSQL.obtenerConexionAdminDoc()` + Async | 2 rutas (grupo C) | Bajo — copiar el patrón de `obtenerConexionAndroid` y agregar la connection string |
| H2 | Clase `Impersonation` (P/Invoke `LogonUser`) + credenciales de share | 2 rutas (grupo D) | Bajo — copiar `ProductImage/Methods.cs:410-446` tal cual |
| H3 | Helper HTTP hacia DMZ (equivalente a `Curl`) | 4 rutas (grupo E) | Medio — extraer y generalizar el patrón que ya está en `OrderMethods:998` |
| H4 | Corregir `SQLiteDb.DefaultPath` | Todo el grupo A | Trivial — hoy apunta a `C:\AntigravityRoute`, debe ser `C:\inetpub\wwwroot\api\` |

---

## 2. FASE 0 — Habilitadores (bloqueante)

Sin esto no arranca nada. Estimado: **1–2 días**.

### H4 · Corregir la ruta de SQLite
`Helpers/ConexionDB/SQLiteDb.cs:11-12`
```csharp
// Actual (dev)
private const string DefaultPath = @"C:\AntigravityRoute";
//private const string DefaultPath = @"C:\inetpub\wwwroot\api\";
```
Llevar la ruta a `Web.config` (`<add key="SQLITE_PATH" .../>`) para no tener que recompilar entre ambientes. El archivo `data.db` (51 MB) se copia tal cual al servidor de ServicioSAP.

### H1 · Conexión AdminDoc
1. `Web.config` → agregar:
```xml
<add name="ADMINDOC" connectionString="server=mavicbosandroid.grupomavi.com;uid=usrintranet;password=pruebasweb;database=AdminDoc" providerName="System.Data.SqlClient" />
```
2. `Helpers/ConexionDB/ConexionSQL.cs` → agregar `obtenerConexionAdminDoc()` y `obtenerConexionAdminDocAsync()`, copiando literalmente el cuerpo de `obtenerConexionAndroid()` y cambiando la clave a `"ADMINDOC"`.

### H2 · Impersonación para shares SMB
Copiar la clase `Impersonation` de `APIMagento/Metodos/ProductImage/Methods.cs:410-446` a un archivo nuevo `Helpers/Impersonation.cs`. Las credenciales (`GRUPOMAVI` / `auxsvrwea05qai` / `W3bS3rv3r05qai`), que hoy están hardcodeadas en `Conn/Connection.cs:33-35`, van a `Web.config`.

### H3 · Helper HTTP hacia la DMZ
Crear `Helpers/DmzClient.cs` con `Post(url, json)` y `Get(url)`, autenticando contra `URL_DMZ` + `USER_DMZ` (ambas ya existen en `Web.config:54-55`). Refactorizar `OrderMethods.CallMagentoAuthorizationCallback` y `CallSetCAccountCallback` para que lo usen, en vez de duplicar el `HttpClient`.

> ⚠️ **Diferencia de comportamiento**: `obtenerConexionAndroid()` devuelve la conexión **ya abierta**. El código de APIMagento hace `cnn.Open()` explícito. Al portar, quitar esos `Open()` o el segundo lanzará `InvalidOperationException`.

---

## 3. FASE 1 — Grupo A: SQLite (4 rutas)

**Conexión**: SQLite `data.db` · sin cambios · lógica idéntica.

| Ruta origen | Método origen | Destino en ServicioSAP |
|---|---|---|
| `POST credit/GetCreditAmounts` | `CredyPrestamoMethods.GetCredilanaInfo<T>` (`:833`) | `Controllers/CreditWebController.cs` → `Methods/Credit/CredilanaInfoMethods.cs` |
| `POST credit/CreditoWeb_FormDatos` ⚠️ | `CredyPrestamoMethods.GetCredilanaInfo<T>` | ídem |
| `POST credit/CreditoWeb_Informacion` ⚠️ | `CredyPrestamoMethods.GetCredilanaInfo<T>` | ídem |
| `POST order/getGuide` | `OrderMethods.GetGuide` (`:736`) | `Controllers/OrderController.cs` (ya existe) |

### Trabajo
1. Crear `Methods/Credit/CredilanaInfoMethods.cs` portando de `CredyPrestamoMethods.cs`: `SaveCredilanaInfo`, `GetCredilanaInfo<T>`, `ExistFieldCredilanaInfo`, `UpdateCredilanaInfo`, `InsertCredilanaInfo` (líneas 777-910). Sustituir `SQLiteConnection` directo por `SQLiteDb`.
2. Crear `Controllers/CreditWebController.cs` con `[RoutePrefix("credit")]` y las 3 rutas. **Ojo con la colisión**: `AbonosController` ya usa ese prefijo. Attribute routing lo permite mientras las rutas no se repitan; verificar que ninguna choque con `GetAccountDebts`, `getClienteFactura`, `ApplyPaymentNeko`, `UpdateStatusPaymentNeko`.
3. Agregar `[HttpGet] [Route("guide/{idEcommerce}")]` a `OrderController` que exponga un nuevo `OrderMethods.GetGuide` (el `SaveGuide` ya está en `:389`; replicar el `SELECT`).

### ⚠️ Dependencia crítica del grupo A
La tabla SQLite `mavi_credilana_info` **no se alimenta sola**. La llena `CredyPrestamoMethods.LoadCredilanaInfo()` (`:675`), que lee de Intelisis:
- `FnVTASListaCredilanas` (función de Intelisis)
- `CreditMethods.CreditoWeb_FormDatos` → SP `SP_CREDITO_WEB_VALORES_FORM`
- `CreditMethods.CreditoWeb_Informacion` → Intelisis

**Mover las 3 rutas sin resolver el alimentador deja el caché congelado.** Ver Fase 6.

---

## 4. FASE 2 — Grupo B: ServicioAndroid (3 rutas)

**Conexión**: `MAVICBOSANDROID` / `ServicioAndroid` · sin cambios · lógica idéntica.

| Ruta origen | Método origen | Objeto SQL | Destino |
|---|---|---|---|
| `POST credit/SendSmsNewNumber` | `CreditMethods.SendSmsNewNumber` (`:1992`) | `TcAAEA00030_EnvioMensajes`, `VTASDCodigoVerificacioneCommerce` | **Ya migrado** — solo falta el controller |
| `POST credit/SolicitudMercancia` | `CreditMethods.SolicitudMercancia` (`:610`) | `CRED_SOLICITUD_WEB_DATOS_TEMP` | `Methods/Credit/CreditMethods.cs` |
| `POST customerService/obtenerQuejas` | `CustomerServiceMethods.obtenerQuejas` (`:714`) | `ACTES_CATALOGO_QUEJA` | `Controllers/CustomerServiceController.cs` (nuevo) + `Methods/CustomerService/CustomerServiceMethods.cs` (nuevo) |

### Trabajo
1. `Controllers/CreditWebController.cs` → agregar `POST credit/SendSmsNewNumber`, que ya solo invoca el método existente. **Esta es la de menor esfuerzo de las 18.**
2. Portar `SolicitudMercancia` a `Methods/Credit/CreditMethods.cs`. Es un `INSERT` raw a una tabla real, sin triggers (verificado en BD). Sustituir la apertura de conexión por `obtenerConexionAndroid()`.
3. Crear `CustomerServiceController` + `CustomerServiceMethods` con `obtenerQuejas`. `SELECT` simple sobre tabla real.

**Riesgo**: bajo. Las 5 tablas raw de ServicioAndroid se verificaron: existen, son `USER_TABLE`, sin sinónimos y sin triggers hacia Intelisis.

---

## 5. FASE 3 — Grupo C: AdminDoc (2 rutas) · requiere H1

**Conexión**: `MAVICBOSANDROID` / `AdminDoc` · sin cambios · lógica idéntica.

| Ruta origen | Método origen | Objeto SQL | Destino |
|---|---|---|---|
| `POST credit/guardardocumento` | `CreditMethods.GuardarDocumento` (`:2605`) | `MAVI_DOC_CTE` (INSERT/UPDATE) | `Methods/Documentos/DocumentoMethods.cs` (nuevo) |
| `POST credit/SaveImagesProductosMx` | `CreditMethods.SaveImagesProductosMx` (`:971`) + `SaveSelfieImageForCredit` (`:994`) + `SaveCompressedFile` (`:1017`) + `CompressBytesFromBase64Image` (`:1041`) + `GetEncoder` (`:1078`) | `MAVI_DOC_CTE` + filesystem | ídem |

### Trabajo
1. Portar los 5 métodos tal cual. Requieren referencia a `System.Drawing` (compresión JPEG) — verificar que esté en el `.csproj` de ServicioSAP.
2. `SaveCompressedFile` escribe en `C:\inetpub\wwwroot\api\images\credit`. Llevar esa ruta a `Web.config`.
3. Los 4 triggers de `MAVI_DOC_CTE` se verificaron: son locales, no tocan Intelisis. No hay que hacer nada con ellos.

---

## 6. FASE 4 — Grupo D: Filesystem y SMB (2 rutas) · requiere H2

| Ruta origen | Método origen | Recurso | Destino |
|---|---|---|---|
| `POST product/obtenerImagen` | `ProductImage.Methods.getImages` (`:388`) | `\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\` → `C:\inetpub\wwwroot\api\images\` | `Methods/ImagenManagement/ImagenMethods.cs` (ya existe) |
| `POST customer/cashCustomerReport` | `CustomerMethods.CreateCashReport` (`:194`) | Base64 → archivo → `\\172.16.200.2\mavica\ecom\BaseWhatsapp\STAGE\` | `Methods/Reportes/ReporteMethods.cs` (nuevo) |

### Trabajo
1. Verificar que la cuenta de servicio del *app pool* de ServicioSAP tenga visibilidad de red a `172.16.202.4` y `172.16.200.2`. **Es el punto de falla más probable de toda la migración**: si ServicioSAP corre en otro servidor o con otra identidad, la impersonación puede funcionar y el share no ser alcanzable.
2. Portar ambos métodos usando el `Impersonation` de H2.
3. Todas las rutas de share y destino, a `Web.config`.

---

## 7. FASE 5 — Grupo E: Magento vía DMZ (4 rutas) · requiere H3

Estas 4 no consultan ninguna BD de negocio: son *passthrough* hacia Magento a través de la DMZ.

| Ruta origen | Método origen | Destino |
|---|---|---|
| `POST customer/getCuenta` | `Conn/Magento.cs:309` | `Methods/Magento/MagentoClient.cs` (nuevo) |
| `POST customer/setCuenta` | `Conn/Magento.cs:319` | ídem |
| `POST product/updateProductJsonOnly` | `ProductMethods.BuildJsonAndSend` (`:1839`) | `Methods/MaterialManagement/ProductExportMethods.cs` (nuevo) |
| `POST product/updateConfigurableProduct` | `Magento.deleteChildren` (`:253`) + `Magento.getChildren` (`:260`) + `ProductMethods.BuildJsonAndSendConfigurable` (`:1407`) | ídem |

### Trabajo
1. `getCuenta`/`setCuenta`: triviales, un POST al DMZ con el helper H3.
2. `BuildJsonAndSend` (~420 líneas) y `BuildJsonAndSendConfigurable` (~430 líneas) son los métodos más grandes del lote. Leen ~18 helpers privados de SQLite (`GetAttributeSetId`, `GetCategoryId`, `GetFiltrableColor`, `GetWarranty`, `GetWebsites`, …), que también hay que portar. **Estimado real: 3–5 días solo este par.**
3. Estas 2 rutas son **internas** (las dispara un cron, no Magento). Al migrarlas hay que repuntar el cron.

> **Alternativa a evaluar**: ServicioSAP ya expone ~30 endpoints `product/*` y `ecommerce/listado` que leen el catálogo desde SAP. Si el objetivo final es que el catálogo salga de SAP y no de la tabla de paso, portar `BuildJsonAndSend` tal cual puede ser trabajo desechable. **Decisión de arquitectura previa a la Fase 5.**

---

## 8. FASE 6 — Las 3 rutas con retorno a Intelisis

Aquí el *lift-and-shift* no alcanza: hay una rama que sí toca Intelisis y hay que decidir qué hacer con ella.

### 8.1 `POST credit/CreditoWeb_FormDatos`

```
op ∈ {GetAnioMes, EstadosMA, EstadosVIU, DelegacionMA, DelegacionVIU, GetAtencionClientes}
   └→ SQLite mavi_credilana_info          ✅ se mueve tal cual (Fase 1)
cualquier otro op
   └→ CreditMethods.CreditoWeb_FormDatos  ❌ SP_CREDITO_WEB_VALORES_FORM en Intelisis
```

**Acciones**:
1. Inventariar en producción qué valores de `op` llegan realmente (log de 30 días). Es probable que el fallback esté muerto.
2. Si el fallback se usa → construir el equivalente en SAP y exponerlo como `GET credit/catalogos/{tipo}` (ya está en el backlog de migración, Ola 3).
3. Si no se usa → eliminar la rama y dejar la ruta 100% SQLite.

### 8.2 `POST credit/CreditoWeb_Informacion`

Misma estructura: `banco/BINESBANCARIOS`, `banco/INSTITUCIONESUC` y `GeLeyendaCatDimas` salen de SQLite; el resto (`Artc`, `Condicion`, …) cae a Intelisis. Mismo tratamiento en 3 pasos.

### 8.3 `POST credit/ExistRFCAndPhoneCte`

Hoy **no consulta nada**: `CURPValidation` (`:1423`) y `RFCValidation` (`:1494`) tienen un `return` incondicional en su primera línea y todo el SQL posterior es inalcanzable.

**Tres opciones — hay que elegir antes de migrar**:

| Opción | Implicación |
|---|---|
| **A. Migrar tal cual** (recomendada para no bloquear) | Se mueve el `return` fijo. La ruta responde igual que hoy. Deuda técnica explícita y documentada |
| **B. Eliminar la ruta** | Requiere coordinar con Magento para que deje de llamarla |
| **C. Reimplementar la validación en SAP** | El código muerto consulta `Cte` (CURP y RFC), `Venta` + `MOVBITACORA`, y `Personal` en la BD `Comercializadora`. Es desarrollo nuevo, no migración |

### 8.4 El alimentador del caché SQLite

`LoadCredilanaInfo()` es lo que da valor a las 3 rutas del grupo A. Lee de Intelisis vía `FnVTASListaCredilanas` y los dos métodos de arriba.

**Sin resolverlo, las rutas migradas devuelven datos congelados a la fecha del último `credit/SaveCredilanaInfo`.**

Opciones: (a) construir el equivalente en SAP y portar `LoadCredilanaInfo`; (b) mantener el cron alimentador en APIMagento durante la convivencia, escribiendo al mismo `data.db`; (c) mover el catálogo a tablas de SAP y eliminar el caché SQLite.

---

## 9. FASE 7 — Grupo F y G: sin BD (3 rutas)

| Ruta | Tratamiento |
|---|---|
| `GET customerService/bbvaKeyAdvanced` | SOAP a `WSeCommerceMX`. Se mueve tal cual. `MULTIPAGOS_APIKEY_URL` y `CODIGO_ENT` van a `Web.config`. RestSharp ya está |
| `GET status/getStatus` | **No migrar tal cual.** Hoy hace ping a `172.16.202.2` (servidor de Intelisis). Rehacerlo como health-check de ServicioSAP: OData S/4 + MAVICBOSANDROID + SQLite |
| `POST credit/ExistRFCAndPhoneCte` | Según lo que se decida en 8.3 |

---

## 10. Cambios en la DMZ

De las 18 rutas, **13 las consume la DMZ** y **5 son internas**.

### 10.1 Las 13 vía DMZ — cambiar `Post` por `PostSAP`

| Controlador DMZ | Endpoints a repuntar |
|---|---|
| `CreditController` | `SendSmsNewNumber`, `SolicitudMercancia`, `GetCreditAmounts`, `CreditoWeb_FormDatos`, `CreditoWeb_Informacion`, `SaveImagesProductosMx`, `guardardocumento`, `ExistRFCAndPhoneCte` |
| `CustomerServiceController` | `obtenerQuejas`, `bbvaKeyAdvanced` |
| `OrdersController` | `getGuide` |
| `CustomersController` | `cashCustomerReport` |
| `StatusController` | `getStatus` |

Cambio mecánico, una línea por endpoint. **Verificar el verbo**: la DMZ llama `obtenerQuejas` con `Get` en `dbAndroid` y con `Post` en `SAP-DMZ` — hay que unificar.

### 10.2 Las 5 internas — repuntar el disparador

`customer/getCuenta`, `customer/setCuenta`, `product/updateProductJsonOnly`, `product/updateConfigurableProduct`, `product/obtenerImagen`. No pasan por la DMZ: hay que cambiar el cron o la tarea programada que las invoca.

---

## 11. Orden de ejecución y estimación

| Fase | Contenido | Rutas | Estimado | Depende de |
|---|---|---|---|---|
| **0** | Habilitadores H1–H4 | — | 1–2 d | — |
| **1** | Grupo B: ServicioAndroid | 3 | 1–2 d | H nada (ya existe la conexión) |
| **2** | Grupo A: SQLite | 4 | 2–3 d | H4 |
| **3** | Grupo C: AdminDoc | 2 | 1–2 d | H1 |
| **4** | Grupo F: SOAP + health-check | 2 | 1 d | — |
| **5** | Grupo D: SMB e impersonación | 2 | 2–3 d | H2 + validación de red |
| **6** | Decisiones de arquitectura (8.1–8.4) | 3 | — | Reunión, no código |
| **7** | Grupo E: export de catálogo a Magento | 4 | 3–5 d | H3 + decisión de 7 |
| **8** | Repuntar DMZ y crones | — | 1 d | Todas |
| | **TOTAL** | **18** | **12–19 días** | |

**Recomendación de arranque**: Fase 1 primero. Son 3 rutas, la conexión ya existe, una de ellas (`SendSmsNewNumber`) solo necesita un controller, y sirve para validar el patrón de portado completo (controller → method → `obtenerConexionAndroid`) antes de tocar nada más complejo.

---

## 12. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | **Conexión ya abierta**: `obtenerConexionAndroid()` devuelve la conexión abierta; el código de APIMagento hace `Open()` explícito → `InvalidOperationException` | Revisar cada método portado y quitar los `Open()` redundantes |
| 2 | **Alcance de red a los shares SMB** desde el servidor de ServicioSAP | Validar en Fase 0 con una prueba de copia, antes de escribir código |
| 3 | **Ruta de `data.db`** apuntando a `C:\AntigravityRoute` (dev) | H4 — a `Web.config` |
| 4 | **Convivencia del `data.db`**: si APIMagento y ServicioSAP escriben el mismo archivo, SQLite bloquea | Definir un único escritor; el otro solo lee |
| 5 | **Colisión de rutas** en `[RoutePrefix("credit")]`, ya usado por `AbonosController` | Revisar el ruteo antes de agregar endpoints |
| 6 | **Caché Credilana congelado** si no se resuelve el alimentador | Fase 6.4, decisión previa |
| 7 | **Trabajo desechable** en `BuildJsonAndSend*` si el catálogo va a salir de SAP | Decidir arquitectura antes de la Fase 7 |
| 8 | **`System.Drawing`** no referenciado en ServicioSAP | Verificar en Fase 0 |

---

## 13. Checklist de validación por ruta

Para cada una de las 18, antes de dar por cerrada la migración:

- [ ] Responde con el **mismo contrato JSON** que APIMagento (comparar respuestas lado a lado con el mismo request)
- [ ] El `[Authorize]` y el JWT funcionan igual
- [ ] Los errores devuelven el mismo código HTTP (varios métodos de APIMagento se tragan excepciones y devuelven 200 con texto — replicar ese comportamiento o corregirlo de forma consciente y coordinada con Magento)
- [ ] El log escribe en el archivo esperado
- [ ] La DMZ apunta a SAP y responde igual de extremo a extremo
- [ ] La ruta vieja en APIMagento queda marcada como obsoleta (no borrarla hasta cerrar la convivencia)
