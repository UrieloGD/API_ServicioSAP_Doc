# BRIEFING — Migración de 18 endpoints de APIMagento a ServicioSAP

> **Documento de contexto autocontenido.** Contiene todo lo necesario para ejecutar la migración sin depender de análisis previos. Todas las rutas de archivo y números de línea fueron verificados contra el código; los objetos de base de datos fueron verificados por consulta directa al servidor.

---

## PARTE 0 — Contexto del sistema

### Proyectos involucrados

| Proyecto | Ruta | Rol |
|---|---|---|
| **APIMagento** (LAN) | `C:\Users\dsvalle\source\repos\APIMagento\WebApiMagento` | API interna. 106 rutas. Origen de la migración. .NET Framework 4.8, ASP.NET Web API 2 |
| **APIMagentoDMZ** | `C:\Users\dsvalle\source\repos\APIMagentoDMZ\WebApiMagento` | Proxy entre Magento y la LAN. 120 rutas. Solo reenvía |
| **ServicioSAP** | `C:\Users\dsvalle\source\repos\ServicioSAP\ServicioSap\ServicioSap` | **Destino de la migración.** 47 rutas. .NET Framework 4.7.2 |

### Flujo de datos

```
Magento  →  APIMagentoDMZ  →  APIMagento (LAN)  →  Intelisis / otras BD
                          ↘  ServicioSAP        →  SAP S/4 (OData) + otras BD
```

La DMZ decide el destino con dos métodos de `Helper/Curl.cs`:
- `curl.Post(url, json)` / `curl.Get(url)` → `URL_INTELISIS` (APIMagento)
- `curl.PostSAP(url, json)` / `curl.GetSAP(url)` → `URL_SAP` (ServicioSAP)

**Migrar un endpoint significa**: reimplementarlo en ServicioSAP y cambiar en la DMZ la llamada de `Post` a `PostSAP`.

### Bases de datos del ecosistema

| Servidor | Base | ¿Es Intelisis? | Se mantiene tras la migración |
|---|---|---|---|
| `MAVICUBOS.grupomavi.com` | `IntelisisTmp` | **SÍ** | ❌ Se apaga |
| `MAVICUBOS.grupomavi.com` | `Comercializadora` | No | ❌ Se apaga |
| `mavicbosandroid.grupomavi.com` | `ServicioAndroid` | No | ✅ **Sin cambios** |
| `mavicbosandroid.grupomavi.com` | `AdminDoc` | No | ✅ **Sin cambios** |
| `mavicbosandroid.grupomavi.com` | `SIGMAVI` | No | ✅ **Sin cambios** |
| SQLite local | `data.db` | No | ✅ **Sin cambios** |

⚠️ **Dato crítico verificado**: el servidor `MAVICBOSANDROID` tiene un **linked server `ERPMAVI` → `MAVICUBOS`**. Varios stored procedures que viven en `ServicioAndroid` alcanzan Intelisis con nombres de 4 partes (`ERPMAVI.IntelisisTMP.dbo.<tabla>`). **No basta con mirar la cadena de conexión: hay que revisar el cuerpo del SP.** Los 18 endpoints de este documento ya fueron verificados en ese sentido.

---

## PARTE 1 — Infraestructura de ServicioSAP

### 1.1 Convenciones del proyecto

```
ServicioSap/
├── Controllers/          → namespace ServicioSap.Controllers    [RoutePrefix("x")] + [Authorize]
├── Methods/<Area>/       → namespace ServicioSap.Methods.<Area>  lógica de negocio
├── Models/<Area>/        → namespace ServicioSap.Models.<Area>   DTOs
├── Helpers/              → namespace ServicioSap.Helpers         infraestructura
└── Web.config            → appSettings + connectionStrings
```

Controladores existentes y sus prefijos: `login`, `order`, `partner`, `partneraddress`, `customer/wallet`, `credit` (en `AbonosController`), `account`, `sale`, `product`, `ecommerce`, `etiquetas`, `ma/imagenes`, `test`.

### 1.2 Helpers de conexión YA EXISTENTES — usar estos, no crear nuevos

| Helper | Archivo:línea | Devuelve |
|---|---|---|
| `conexionSQL.obtenerConexionAndroid()` | `Helpers/ConexionDB/ConexionSQL.cs:40` | `SqlConnection` a `MAVICBOSANDROID`/`ServicioAndroid` **ya abierta** |
| `conexionSQL.obtenerConexionAndroidAsync()` | `Helpers/ConexionDB/ConexionSQL.cs:100` | idem, async |
| `conexionSQL.obtenerConexionSigMavi()` | `Helpers/ConexionDB/ConexionSQL.cs:11` | `SqlConnection` a `SIGMAVI` **ya abierta** |
| `conexionSQL.obtenerConexionSigMaviAsync()` | `Helpers/ConexionDB/ConexionSQL.cs:72` | idem, async |
| `SQLiteDb` | `Helpers/ConexionDB/SQLiteDb.cs` | `Set(query)`, `Get(query)`, `Get(query, campos)` + versiones async |

`SQLiteDb` tiene **exactamente la misma API** que `Conn/DB.cs` de APIMagento. Los métodos que usan SQLite se portan cambiando solo el nombre de la clase.

### 1.3 Tabla de equivalencia de conexiones

| En APIMagento | En ServicioSAP |
|---|---|
| `new Connection().sCadenaConexionAndriod` + `new SqlConnection(...)` + `.Open()` | `new conexionSQL().obtenerConexionAndroid()` |
| `new Connection().sCadenaConexionSigMavi` + `new SqlConnection(...)` + `.Open()` | `new conexionSQL().obtenerConexionSigMavi()` |
| `new Connection().sCadenaConexionAdminDoc` | ⚠️ **CREAR** — ver H1 |
| `new DB()` (SQLite) | `new SQLiteDb()` |
| `new Curl()` | ⚠️ **CREAR** — ver H3 |
| `con.userImages` / `domainImages` / `passImages` | ⚠️ **CREAR** — ver H2 |
| `new Connection().sCadenaConexion` | ❌ **Es Intelisis. No debe existir en ServicioSAP** |

### 1.4 Métodos que YA fueron migrados a ServicioSAP — reutilizar

| Método | Archivo:línea | Nota |
|---|---|---|
| `CreditMethods.SendSmsNewNumber` | `Methods/Credit/CreditMethods.cs:12` | Completo. **Solo falta el controller que lo exponga** |
| `CreditMethods.IsValidated` | `Methods/Credit/CreditMethods.cs:116` | Completo |
| `OrderMethods.SaveGuide` | `Methods/Order/OrderMethods.cs:389` | Privado. Falta el `Get` correspondiente |
| `OrderMethods.CallMagentoAuthorizationCallback` | `Methods/Order/OrderMethods.cs:998` | Patrón de llamada HTTP a la DMZ, reutilizable para H3 |
| `OrderMethods.CallSetCAccountCallback` | `Methods/Order/OrderMethods.cs:1090` | idem |

### 1.5 Paquetes disponibles

`RestSharp 106.15.0` · `System.Data.SQLite 1.0.113` · `Newtonsoft.Json`
⚠️ Verificar que `System.Drawing` esté referenciado en el `.csproj` (lo necesita el endpoint 07).

---

## PARTE 2 — Habilitadores a construir ANTES de migrar

### H1 · Conexión a AdminDoc
**Necesario para**: endpoints 06 y 07.

1. `Web.config`, dentro de `<connectionStrings>` (ya existe el nodo, línea 12):
```xml
<add name="ADMINDOC"
     connectionString="server=mavicbosandroid.grupomavi.com;uid=usrintranet;password=pruebasweb;database=AdminDoc"
     providerName="System.Data.SqlClient" />
```
2. En `Helpers/ConexionDB/ConexionSQL.cs`, agregar `obtenerConexionAdminDoc()` y `obtenerConexionAdminDocAsync()`. **Copiar literalmente el cuerpo de `obtenerConexionAndroid()` (línea 40) y cambiar la clave `"MAVICBOSANDROID"` por `"ADMINDOC"`.**

### H2 · Impersonación Windows para shares SMB
**Necesario para**: endpoints 10 y 11.

Copiar la clase `Impersonation` completa desde `APIMagento/Metodos/ProductImage/Methods.cs:410-446` a un archivo nuevo `Helpers/Impersonation.cs`. Incluye dos `DllImport`: `LogonUser` (advapi32.dll) y `CloseHandle` (kernel32.dll).

Las credenciales están hardcodeadas en `APIMagento/Conn/Connection.cs:33-35`. Llevarlas a `Web.config`:
```xml
<add key="SMB_DOMAIN" value="GRUPOMAVI" />
<add key="SMB_USER"   value="auxsvrwea05qai" />
<add key="SMB_PASS"   value="W3bS3rv3r05qai" />
```

### H3 · Cliente HTTP hacia la DMZ
**Necesario para**: endpoints 12, 14, 15.

Crear `Helpers/DmzClient.cs` con `Post(url, json)` y `Get(url)`. Debe autenticarse contra `URL_DMZ` + `USER_DMZ` (ambas ya existen en `Web.config`, líneas 54-55). El patrón exacto ya está implementado en `Methods/Order/OrderMethods.cs:998-1088` — extraerlo y generalizarlo.

Referencia del original: `APIMagento/Helper/Curl.cs`.

### H4 · Corregir la ruta de SQLite
**Necesario para**: endpoints 04, 05, 14, 15.

`Helpers/ConexionDB/SQLiteDb.cs:11-12` apunta hoy a una ruta de desarrollo:
```csharp
private const string DefaultPath = @"C:\AntigravityRoute";        // ← incorrecto
//private const string DefaultPath = @"C:\inetpub\wwwroot\api\";  // ← el real
```
Llevar la ruta a `Web.config` (`<add key="SQLITE_PATH" value="C:\inetpub\wwwroot\api\" />`) y leerla desde ahí. El archivo `data.db` (~51 MB) se copia tal cual al servidor de ServicioSAP.

---

## PARTE 3 — Los 14 endpoints SIN Intelisis

**Regla general**: *lift-and-shift*. Se copia el cuerpo del método tal cual y se cambia únicamente la obtención de la conexión. **La lógica de negocio no se modifica.**

> ⚠️ **CORRECCIÓN — conteo actualizado.** El endpoint 02 (`credit/SolicitudMercancia`) se reclasificó: su SQL inline lee de Intelisis por linked server (ver detalle abajo). **El reparto real es 14 sin Intelisis y 4 con Intelisis** (02, 16, 17, 18), no 15/3.
>
> Se hizo un barrido completo del proyecto buscando referencias inline al linked server y **este es el único caso**:
> ```
> grep -rniE "ERPMAVI|IntelisisTMP|MAVIPROD" --include=*.cs
> → Conn/Connection.cs:26,27      (cadenas de conexión, esperado)
> → Metodos/CreditMethods.cs:656  ← único inline
> ```

### Tabla resumen

| # | Endpoint origen | Método origen (archivo:línea) | Backend | Habilitador |
|---|---|---|---|---|
| 01 | `POST credit/SendSmsNewNumber` | `CreditMethods.cs:1992` | ServicioAndroid | — |
| 02 | `POST credit/SolicitudMercancia` | `CreditMethods.cs:610` | ServicioAndroid **+ Intelisis** | ver PARTE 4 |
| 03 | `POST customerService/obtenerQuejas` | `CustomerServiceMethods.cs:714` | ServicioAndroid | — |
| 04 | `POST order/getGuide` | `OrderMethods.cs:736` | SQLite | H4 |
| 05 | `POST credit/GetCreditAmounts` | `CredyPrestamoMethods.cs:833` | SQLite | H4 |
| 06 | `POST credit/guardardocumento` | `CreditMethods.cs:2605` | AdminDoc | H1 |
| 07 | `POST credit/SaveImagesProductosMx` | `CreditMethods.cs:971` | AdminDoc + FS | H1 |
| 08 | `GET customerService/bbvaKeyAdvanced` | `CustomerServiceMethods.cs:1124` | SOAP externo | — |
| 09 | `GET status/getStatus` | `StatusController.cs:12` (inline) | Ninguno | — |
| 10 | `POST product/obtenerImagen` | `ProductImage/Methods.cs:388` | SMB | H2 |
| 11 | `POST customer/cashCustomerReport` | `CustomerMethods.cs:194` | SMB | H2 |
| 12 | `POST customer/getCuenta` · `setCuenta` | `Conn/Magento.cs:309` · `:319` | DMZ→Magento | H3 |
| 14 | `POST product/updateProductJsonOnly` | `ProductMethods.cs:1839` | SQLite + DMZ | H3, H4 |
| 15 | `POST product/updateConfigurableProduct` | `ProductMethods.cs:1407` | SQLite + DMZ | H3, H4 |

---

### 01 · `POST credit/SendSmsNewNumber`

- **Origen**: `Controllers/CreditController.cs:549` → `Metodos/CreditMethods.cs:1992`
- **Backend**: `ServicioAndroid` — INSERT a `TcAAEA00030_EnvioMensajes`; llama a `GetIdRef` (`:2036`) e `InsertCodigoVerificacion` (`:2068`), ambos sobre `VTASDCodigoVerificacioneCommerce`
- **Estado**: **el método YA está migrado** en `Methods/Credit/CreditMethods.cs:12`
- **Trabajo**: crear el controller que lo exponga. Es el endpoint de menor esfuerzo del lote — usarlo como piloto para validar el patrón completo
- **Contrato**: recibe `SendSmsNewNumberRequest`, devuelve `Dictionary<string,int>` con la clave `"result"` (`-1` = error, `>=0` = filas afectadas)

### 02 · `POST credit/SolicitudMercancia` — ⚠️ RECLASIFICADO, ver PARTE 4 §19

Este endpoint **sí toca Intelisis**. Se mantiene aquí la referencia para no romper la numeración; el detalle completo está en la PARTE 4, sección 19.

### 03 · `POST customerService/obtenerQuejas`

- **Origen**: `Controllers/CustomerServiceController.cs:87` → `Metodos/CustomerServiceMethods.cs:714`
- **Backend**: `ServicioAndroid` — `SELECT id, AliasQueja FROM actes_catalogo_queja WHERE queja != '' AND Estatus = 1 AND ISNULL(AliasQueja,'') <> '' ORDER BY AliasQueja`
- **Verificado**: tabla real, sin triggers
- **Trabajo**: crear `Controllers/CustomerServiceController.cs` y `Methods/CustomerService/CustomerServiceMethods.cs` (ninguno existe aún en ServicioSAP)
- **Contrato**: devuelve JSON con lista de `{ id: int, intencion: string }`
- ⚠️ La DMZ llama este endpoint con `GET` en la rama `dbAndroid` y con `POST` en `SAP-DMZ`. **Unificar el verbo antes de migrar.**

### 04 · `POST order/getGuide`

- **Origen**: `Controllers/OrdersController.cs:165` → `Metodos/OrderMethods.cs:736`
- **Backend**: SQLite, tabla `servicio_guias` (columnas `id`, `idecommerce`, `fullname`)
- **Estado**: `SaveGuide` (escritura) ya existe en `Methods/Order/OrderMethods.cs:389`. Falta la lectura
- **Trabajo**: agregar `GetGuide` a `OrderMethods` y exponerlo en el `OrderController` existente
- **Contrato**: recibe `GuidesRequest { IdEcommerce }`, devuelve `GuideResponse { IdEcommerce, FullName }` o `null`

### 05 · `POST credit/GetCreditAmounts`

- **Origen**: `Controllers/CreditController.cs:315` → `Metodos/Credit/CredYPrestamo/CredyPrestamoMethods.cs:833`
- **Backend**: SQLite, tabla `mavi_credilana_info` (columnas `id`, `field`, `data`, `uen`, `update_time`)
- **Trabajo**: portar los 5 métodos de `CredyPrestamoMethods.cs`: `SaveCredilanaInfo` (`:777`), `GetCredilanaInfo<T>` (`:833`), `ExistFieldCredilanaInfo` (`:852`), `UpdateCredilanaInfo` (`:879`), `InsertCredilanaInfo` (`:896`). Sustituir `SQLiteConnection` directo por `SQLiteDb`
- **Campos consultados**: `montos_cte_nuevo`, `montos_cte_nuevo_apertura`, `montos_cte_casa`
- ⚠️ **Ver PARTE 5**: esta tabla la alimenta un proceso que lee de Intelisis

### 06 · `POST credit/guardardocumento`

- **Origen**: `Controllers/CreditController.cs:592` → `Metodos/CreditMethods.cs:2605`
- **Backend**: `AdminDoc` — `INSERT`/`UPDATE` sobre `MAVI_DOC_CTE`
- **Verificado**: los 4 triggers de esa tabla (`TrgDBACambioFoto`, `TrgDBANuevaFoto`, `TrgDBAActualizaFotoCte`, `TrgDBANuevaFotoCte`) son locales, no tocan Intelisis
- **Trabajo**: portar tal cual usando H1. El método mapea `TipoDoc` → `IdFoto`/`Formato` con un `switch` de 10 casos: replicarlo sin cambios

### 07 · `POST credit/SaveImagesProductosMx`

- **Origen**: `Controllers/CreditController.cs:272` → `Metodos/CreditMethods.cs:971`
- **Backend**: `AdminDoc` + filesystem
- **Trabajo**: portar 5 métodos encadenados:
  - `SaveImagesProductosMx` (`:971`) — orquestador, corre en `Task.Run` con `Task.Delay(10000)`
  - `SaveSelfieImageForCredit` (`:994`) — INSERT a `MAVI_DOC_CTE` con `TIPO_DOC=14`, `IDAPLICACION=7`
  - `SaveCompressedFile` (`:1017`) — escribe en `C:\inetpub\wwwroot\api\images\credit` (llevar a `Web.config`)
  - `CompressBytesFromBase64Image` (`:1041`) — compresión JPEG iterativa hasta 1 MB
  - `GetEncoder` (`:1078`)
- ⚠️ Requiere `System.Drawing`

### 08 · `GET customerService/bbvaKeyAdvanced`

- **Origen**: `Controllers/CustomerServiceController.cs:159` → `Metodos/CustomerServiceMethods.cs:1124`
- **Backend**: SOAP externo. `POST` a `MULTIPAGOS_APIKEY_URL` con `SOAPAction: "http://WSeCommerceMX.asmx/GetMasterSeguridad"`, header `<Acso><codigoent>{CODIGO_ENT}</codigoent></Acso>`
- **Config a copiar** (desde `APIMagento/Web.config:41-42`):
```xml
<add key="MULTIPAGOS_APIKEY_URL" value="http://172.16.215.51:3024/WSeCommerceMX.asmx?wsdl" />
<add key="CODIGO_ENT" value="e41b237f6ff928a5f22dfdb0f113a6f0" />
```
- **Trabajo**: portar tal cual. RestSharp ya está disponible
- ⚠️ No confundir con `bbvaKeyNeko`, que **sí** consulta Intelisis (`master.dbo.dbacseguridad`) y **no** forma parte de este lote

### 09 · `GET status/getStatus`

- **Origen**: `Controllers/StatusController.cs:12` (lógica inline, sin método de negocio)
- **Comportamiento actual**: `Ping` ICMP a `172.16.202.2` — que es el servidor de Intelisis
- ⚠️ **NO portar tal cual.** Rehacerlo como health-check de ServicioSAP: verificar OData S/4, `MAVICBOSANDROID` y SQLite
- **Contrato actual**: devuelve `true`, o el string `"No se tiene conexion con la base de datos"`. Coordinar con Magento si se cambia

### 10 · `POST product/obtenerImagen`

- **Origen**: `Controllers/ProductsController.cs:216` → `Metodos/ProductImage/Methods.cs:388`
- **Backend**: copia de archivo con impersonación
  - Origen: `\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\{original}`
  - Destino: `C:\inetpub\wwwroot\api\images\{magento}`
- **Trabajo**: portar usando H2. Ambas rutas a `Web.config`
- ⚠️ **Validar primero** que la cuenta del app pool de ServicioSAP alcance por red `172.16.202.4`

### 11 · `POST customer/cashCustomerReport`

- **Origen**: `Controllers/CustomersController.cs:109` → `Metodos/CustomerMethods.cs:194`
- **Backend**: Base64 → archivo en `C:\inetpub\wwwroot\files\` → copia a `\\172.16.200.2\mavica\ecom\BaseWhatsapp\STAGE\`
- **Trabajo**: portar usando H2
- **Contrato**: devuelve `ApiResponse { status, message }` con 200/400/500
- ⚠️ Misma validación de red que el 10, contra `172.16.200.2`

### 12 · `POST customer/getCuenta` y `POST customer/setCuenta`

- **Origen**: `Controllers/CustomersController.cs:91` y `:100` → `Conn/Magento.cs:309` y `:319`
- **Backend**: passthrough. `POST` a la DMZ en `magento/getCuenta` y `magento/setCuenta`
- **Trabajo**: portar usando H3. Ambos serializan `CustomerIntelisis` con `NullValueHandling.Ignore` y limpian la respuesta con `.Replace("\\\"", "\"").Replace("\\\\\"", "\"").Trim('"')` — **conservar ese post-procesado**

### 14 · `POST product/updateProductJsonOnly`

- **Origen**: `Controllers/ProductsController.cs:120` → `Metodos/ProductMethods.cs:1839` (`BuildJsonAndSend`, ~420 líneas)
- Se invoca 3 veces: `BuildJsonAndSend("viu")`, `("muebles_america")`, `("mavi")`
- **Backend**: SQLite + `POST` a la DMZ
- **Llamadas internas reales** (verificadas sobre el rango 1839-2258, no inferidas):

| Método | Línea | Veces | Tablas SQLite |
|---|---|---|---|
| `isInMagento` | 385 | 3 | `product_in_stores` |
| `runDelta` | 116 | 1 | ⚠️ **ninguna — lanza `python.exe`** |
| `getParentAndAddTipo` | 43 | 1 | `products` |
| `GetWebsites` | 435 | 1 | `products` |
| `TagsMethods.GetTags` | `TagsMethods.cs:161` | 1 | `tags` |
| `GetCategoryId` | 218 | 1 | `categories` |
| `GetAttributeValueId` | 312 | 1 | `attribute_options` |
| `GetAttributeSetId` | 199 | 1 | `attribute_sets` |

⚠️ **`runDelta` es una dependencia de infraestructura oculta.** Ejecuta como proceso externo:
```
C:\Users\auxsvrwea05qai\AppData\Local\Programs\Python\Python310\python.exe
C:\inetpub\tasks\delta\main.py  {type} {old-data.db} {data.db} {store} {product_type}
```
Compara la copia anterior de `data.db` contra la actual para detectar qué productos cambiaron. **El servidor de ServicioSAP necesita Python 3.10 y el script `main.py`, o hay que reimplementar el delta en C#.** No estaba documentado en ninguna parte.

- ⚠️ **Decisión de arquitectura previa**: ServicioSAP ya expone ~30 endpoints `product/*` y `ecommerce/listado` que leen el catálogo desde SAP. Si el objetivo final es que el catálogo salga de SAP y no de la tabla de paso, portar este método tal cual puede ser trabajo desechable. **Confirmar antes de empezar.**

### 15 · `POST product/updateConfigurableProduct`

- **Origen**: `Controllers/ProductsController.cs:145`
- **Encadena 4 llamadas**:
  1. `Magento.deleteChildren()` — `Conn/Magento.cs:253` — `DELETE FROM children` en SQLite
  2. `Magento.getChildren(store)` — `Conn/Magento.cs:260` — GET a la DMZ + INSERT a `children`; se invoca con `"all"`, `"viu"`, `"muebles_america"`
  3. `ProductMethods.BuildJsonAndSendConfigurable("viu")` — `ProductMethods.cs:1407` (~430 líneas)
  4. `ProductMethods.BuildJsonAndSendConfigurable("muebles_america")`
- **Llamadas internas reales de `BuildJsonAndSendConfigurable`** (verificadas sobre el rango 1407-1838):

| Método | Línea | Veces | Tablas SQLite |
|---|---|---|---|
| `isInMagento` | 385 | 3 | `product_in_stores` |
| `GetAttributeValueId` | 312 | 3 | `attribute_options` |
| `runDelta` | 116 | 1 | ⚠️ lanza `python.exe` |
| `TagsMethods.GetTags` | `TagsMethods.cs:161` | 1 | `tags` |
| `GetFiltrableColor` | 280 | 1 | `attribute_options` |
| `GetChildTag` | 63 | 1 | `products`, `tags` |
| `GetChild` | 348 | 1 | `children` |
| `GetCategoryId` | 218 | 1 | `categories` |
| `GetAttributeSetId` | 199 | 1 | `attribute_sets` |
| `GetAttributeId` | 335 | 1 | `attributes` |
| `GetAndSavePrice` | 361 | 1 | `products` |

> Los endpoints 14 y 15 **no comparten el mismo conjunto**: solo coinciden en `isInMagento`, `runDelta`, `GetTags`, `GetCategoryId`, `GetAttributeValueId` y `GetAttributeSetId`. Los auxiliares restantes de `ProductMethods` (`GetImages`, `GetStores`, `ExistAttribute`, `GetWarranty`, `IsMayoristaOrElite`) los usan otros métodos que **no** forman parte de estos 18 endpoints (`BuildJsonAndSendWithImage`, `BuildCSV`, `updateStockJson`). **No hay que portarlos para estos dos endpoints.**

- Misma advertencia de arquitectura

---

## PARTE 4 — Los 4 endpoints CON Intelisis

### 19 · `POST credit/SolicitudMercancia` — el caso simple

A diferencia de los otros tres, este **no ejecuta ningún SP de negocio**: es un solo `SELECT` sobre `Cte`. Es el más fácil de resolver de los cuatro.

- **Origen**: `Controllers/CreditController.cs:560` → `Metodos/CreditMethods.cs:610`
- **Conexión**: abre contra `sCadenaConexionAndriod`, pero la consulta cruza a Intelisis por linked server

**El SQL** (`CreditMethods.cs:617-659`) es un `INSERT ... SELECT` que lee de Intelisis y escribe en ServicioAndroid:

```sql
INSERT INTO CRED_SOLICITUD_WEB_DATOS_TEMP ( ...31 columnas... )
SELECT Cliente, PersonalApellidoPaterno, PersonalApellidoMaterno, PersonalNombres,
       CONVERT(VARCHAR(10), FechaNacimiento, 120), RFC, Sexo, eMail1,
       Direccion, DireccionNumero, DireccionNumeroInt, EntreCalles,
       CodigoPostal, Delegacion, Estado, LEFT(Colonia, 30), Poblacion,
       'ADTE00001',                                              -- articulo fijo
       @Uen,
       CASE WHEN @Uen = 1 THEN '12 M MA P INM' ELSE '12 M VIU P INM' END,
       GETDATE(), 7,                                             -- estatus fijo
       CASE WHEN @Uen = 1 THEN 504 ELSE 505 END,                 -- sucursal
       'APP MERCANCIAS', ...lada/telefono partidos..., 1, 1, ..., 'APP MERCANCIA'
FROM ERPMAVI.IntelisisTMP.dbo.Cte WITH (NOLOCK)   -- ← ÚNICA referencia a Intelisis
WHERE Cliente = @Cliente;

SELECT SCOPE_IDENTITY();
```

| Objeto | BD | Operación | Columnas |
|---|---|---|---|
| `ERPMAVI.IntelisisTMP.dbo.Cte` | **Intelisis** | SELECT | `Cliente`, `PersonalApellidoPaterno`, `PersonalApellidoMaterno`, `PersonalNombres`, `FechaNacimiento`, `RFC`, `Sexo`, `eMail1`, `Direccion`, `DireccionNumero`, `DireccionNumeroInt`, `EntreCalles`, `CodigoPostal`, `Delegacion`, `Estado`, `Colonia`, `Poblacion` |
| `CRED_SOLICITUD_WEB_DATOS_TEMP` | ServicioAndroid | INSERT | 31 columnas |

**Reglas de negocio embebidas en el SQL** — replicarlas al portar:
- `articulo` siempre `'ADTE00001'` · `estatus` siempre `7` · `origen` `'APP MERCANCIAS'` · `IdMagento` `'APP MERCANCIA'` · `ValidacionTelefono` y `Confirmado` en `1`
- `condicion`: `'12 M MA P INM'` si uen=1, `'12 M VIU P INM'` si uen=2
- `Sucursal`: `504` si uen=1, `505` si uen=2
- **Partición de lada**: si los 2 primeros dígitos son `33`, `55` u `81` → lada de 2 y teléfono de 8; en cualquier otro caso → lada de 3 y teléfono de 7
- `Colonia` se trunca a 30 caracteres

**Cómo migrarlo**: sustituir el `SELECT` sobre `Cte` por una llamada a `GET partner/client/{clientId}` (`BusinessPartnerMethods.GetClientAsync`, ya existe en ServicioSAP), mapear los campos del BP a las 17 columnas, y ejecutar el `INSERT` contra `ServicioAndroid` con valores en memoria. **No requiere ningún objeto nuevo en SAP.**

**Response**: string plano con el `idSolicitud` (`"48213"`), o `"0"` si el cliente no existe en `Cte` o el INSERT no afectó filas.

---

Estos **no** son lift-and-shift. Tienen una rama que llega a `IntelisisTmp` en `MAVICUBOS` y requieren decisión previa.

### 16 · `POST credit/CreditoWeb_FormDatos`

**Estructura de la lógica** (`Controllers/CreditController.cs:145`):

```
op ∈ {GetAnioMes, EstadosMA, EstadosVIU, DelegacionMA, DelegacionVIU, GetAtencionClientes}
   └→ CredyPrestamoMethods.GetCredilanaInfo<T>()  → SQLite     ✅ migrable tal cual
cualquier otro op
   └→ CreditMethods.CreditoWeb_FormDatos()        → Intelisis  ❌ requiere equivalente
```

**Stored procedure de la rama Intelisis** (`Metodos/CreditMethods.cs:684`):

```sql
SP_CREDITO_WEB_VALORES_FORM @Op, @Val, @Uen, @File, '', '', ''
```

| Parámetro | Tipo | Valor |
|---|---|---|
| `@Op` | `VARCHAR(MAX)` | operación solicitada |
| `@Val` | `VARCHAR(MAX)` | valor de búsqueda |
| `@Uen` | `INT` | 1 = Muebles América · 2 = VIU |
| `@File` | `VARBINARY` | siempre `new byte[1]` |
| 3 posicionales | — | siempre `''` |

**Valores de `@Op` encontrados en el código**:

| `op` | Invocado desde | ¿Tiene caché SQLite? |
|---|---|---|
| `GetAnioMes` | `CreditController.cs:151` | Sí — `antiguedad_domiciliaria` |
| `EstadosMA` | `CreditController.cs:154` | Sí — `estados_ma` |
| `EstadosVIU` | `CreditController.cs:157` | Sí — `estados_viu` |
| `DelegacionMA` | `CreditController.cs:160` | Sí — `municipios_ma_{estado}` |
| `DelegacionVIU` | `CreditController.cs:163` | Sí — `municipios_viu_{estado}` |
| `GetAtencionClientes` | `CreditController.cs:166` | Sí — `atencion_clientes_*` |
| `Bonificacion` | `CredyPrestamoMethods.cs:646` | **No** |

> Todos los `op` conocidos tienen caché **excepto `Bonificacion`**. Es probable que el fallback esté muerto; confirmar con logs de producción antes de invertir en el equivalente SAP.

**Objetos que referencia el SP** — obtenido de `sys.sql_expression_dependencies` en `MAVICUBOS`.

⚠️ **88 referencias.** Esto **no es un catálogo de formulario**: el SP ejecuta transacciones de negocio (`spAfectar`), mueve monedero, consulta buró de crédito y escribe en `Venta`/`VentaD`. El nombre es engañoso.

| Grupo funcional | Objetos |
|---|---|
| **Cliente / prospecto** | `Cte` · `CteCto` · `CteCtoDireccion` · `CteEnviarA` · `CteTel` · `ClienteExpressMavi` · `MaviCteCtoEmpleo` · `MaviCteCtoViveEnCalidad` · `Parentesco` · `fnClientesNuevosCasaMAVI` |
| **Solicitud de crédito web** | `CRED_SOLICITUD_WEB_DATOS_TEMP` · `CRED_SOLICITUD_WEB_VISTAS` · `CREDIDSolicitudWebDatosAdicionalesTemp` · `CREDIDSolicitudWebDatosPrimerGuardado` · `TrWACW00041_RefSolCredWeb` · `VTASDArtCreditoWeb` · `VTASDCreditoLiberador` |
| **Bonificación** | `MaviBonificacionArt` · `MaviBonificacionCanalVta` · `MaviBonificacionCondicion` · `MaviBonificacionConf` · `MaviBonificacionConVencimiento` · `MaviBonificacionLinea` · `MaviBonificacionMov` · `MaviBonificacionSucursal` · `MaviBonificacionUEN` · `FN_BonificacionPP` |
| **Precios y CAT** | `fnProprePrecio` · `fnProprePrecioID` · `PropreListaDFinal` · `FN_RM0847TasaInternaRetorno` · `RM0847InfoCat` · `VTASCCondicionesCredVtaLinea` |
| **Monedero** | `SP_MAVIDM0173RedimeOGeneraMONE` · `spGenerarMovMonederoMAVI` · `spRedimirMovMonederoMAVI` · `SP_InsertaTarjetaMonVirtual` · `Sp_DM0312TarjetaSerieMovMavi` |
| **Buró de crédito** | `SHM_BURO_CTE` · `SHM_BURO_CTED` · `SP_DM0257ListaNegra` |
| **Venta / afectación** | `Venta` · `VentaD` · `spAfectar` · `MovSituacion` · `MOVBITACORA` · `spModificarAlmacenPedidos` · `VTASCVentaCupon` · `eCommerceDetPedidos` · `ecomerceexportaart` |
| **Artículo / inventario** | `Art` · `ArtDisponible` · `ArtLinea` |
| **Catálogos y geografía** | `CodigoPostal` · `ZonaImp` · `Sucursal` · `SucursalOtrosDatos` · `Agente` · `EmpresaGral` · `TablaStD` |
| **Dimas / empresario** | `DM0244_CLAVES` · `DM0264RedDimas` · `CREDIDEmpresario` · `CREDIDCODIGORECOMENDADOR` · `VTASHSeguimientoDIMANuevo` |
| **STP / dispersión** | `CREDICConfiguracionSTP` · `CREDIDCuentaCLABEDispersion` · `CREDICMenudeoParametros` |
| **SMS y correo** | `TcAAEA00030_EnvioMensajes` · `TcAAEA00030_Mensajes` · `FN_DM0138ValidaCorreo` · `MAVIDM0138HistInsertCorreo` |
| **Entrega y seguimiento** | `DM0312DatosEntrega` · `SP_DM0312InsertaEventos` · `MAVIClaveSeguimiento` · `SP_MaviDM0312PuntoVentaInformacionArticulos` |
| **Documentos y usuarios** | `MAVI_DOC_CTE` · `PA_USUARIOS_ANDROID` · `Personal` |
| **Utilería** | `fnSplitV2` · `FnVTASCalcularSaldo` |
| **Llama a otro SP del lote** | ⚠️ `SpCREDICredilana` |

> Los nombres `c`, `ce`, `cea`, `ct`, `mc` que devuelve la consulta son **alias de tabla no resueltos**, no objetos reales. Descontándolos quedan **83 objetos**.

**Tres consecuencias directas**:
1. `SP_CREDITO_WEB_VALORES_FORM` **llama a `SpCREDICredilana`** — los endpoints 16 y 17 están acoplados y no se pueden migrar por separado.
2. El SP **escribe en tablas que hoy viven en `ServicioAndroid` y `AdminDoc`** (`CRED_SOLICITUD_WEB_DATOS_TEMP`, `TcAAEA00030_EnvioMensajes`, `TrWACW00041_RefSolCredWeb`, `PA_USUARIOS_ANDROID`, `MAVI_DOC_CTE`) usando el linked server en sentido inverso al documentado en la PARTE 0.
3. La estimación de 5 días para este bloque es **optimista**. Reimplementar esto en SAP no es portar un catálogo.

---

### 17 · `POST credit/CreditoWeb_Informacion`

**Estructura** (`Controllers/CreditController.cs:289`): misma forma que el 16.

**Stored procedure** (`Metodos/CreditMethods.cs:1207`):

```sql
SPCREDICredilana @Op, null, null, null, null, @Val, @Uen
```

Firma completa, deducida de `CredyPrestamoMethods.cs:604` que llama al mismo SP con los 7 parámetros nombrados:

| Pos | Parámetro | Tipo | Valor aquí |
|---|---|---|---|
| 1 | `@Op` | `VARCHAR(MAX)` | operación |
| 2 | `@Cliente` | `VARCHAR(MAX)` | `null` |
| 3 | `@Nombre` | `VARCHAR(MAX)` | `null` |
| 4 | `@ApellidoPaterno` | `VARCHAR(MAX)` | `null` |
| 5 | `@ApellidoMaterno` | `VARCHAR(MAX)` | `null` |
| 6 | `@Val` | `VARCHAR(MAX)` | valor de búsqueda |
| 7 | `@Uen` | `INT` | 1 · 2 |

**Valores de `@Op` encontrados**:

| `op` | Invocado desde | ¿Tiene caché SQLite? |
|---|---|---|
| `banco` + `@Val=BINESBANCARIOS` | `CreditController.cs:296` | Sí — `bancos_bines` |
| `banco` + `@Val=INSTITUCIONESUC` | `CreditController.cs:299` | Sí — `bancos_instituciones` |
| `GeLeyendaCatDimas` | `CreditController.cs:303` | Sí — `leyenda_dimas` |
| `Artc` | `CredyPrestamoMethods.cs:662` | **No** |
| `Condicion` | `CredyPrestamoMethods.cs:665` | **No** |
| `CteInfo` | `CreditMethods.cs:1193` | **No** |
| `ActTelCredilana` | `CredyPrestamoMethods.cs:566` | **No** |
| `QuitarTelValidado` | `CredyPrestamoMethods.cs:567` | **No** |
| `GetSeguroVidaInfo` | `CredyPrestamoMethods.cs:612` | **No** (código muerto) |

> A diferencia del 16, aquí hay **6 operaciones sin caché**. Este endpoint sí necesita un equivalente real en SAP.

**Query inline adicional cuando `op = "CteInfo"`** (`CreditMethods.cs:1249-1260`):

```sql
SELECT * FROM (
  SELECT TOP 1
    dbo.FnVTASMuestraCuatro(CuentaCLABE) ClabeCuenta,
    STP.Participante AS Banco,
    ValidacionTD
  FROM CREDIDCuentaCLABEDispersion AS CREDI WITH (NOLOCK)
  JOIN CREDICConfiguracionSTP AS STP WITH (NOLOCK)
    ON STP.Clave = CREDI.InstitucionBancaria
  WHERE Cliente = @Client
  ORDER BY FechaCapturaModificacion DESC
) AS Ultimo
WHERE Ultimo.ValidacionTD = 4;
```

| Objeto | Tipo | Columnas |
|---|---|---|
| `CREDIDCuentaCLABEDispersion` | Tabla | `CuentaCLABE`, `InstitucionBancaria`, `Cliente`, `ValidacionTD`, `FechaCapturaModificacion` |
| `CREDICConfiguracionSTP` | Tabla | `Clave`, `Participante` |
| `dbo.FnVTASMuestraCuatro` | Función escalar | Enmascara la CLABE dejando 4 dígitos |

**Dependencia — `NombreCliente(cliente, uen)`** (`CreditMethods.cs:1809`), se ejecuta antes cuando `op = "CteInfo"`:

```sql
-- 1) Bloqueo de empleados
SELECT dbo.FNVTASValidarEmpleado(@Cliente) AS Personal

-- 2) Nombre del cliente
SELECT TOP 1 ISNULL(PersonalNombres,''), ISNULL(PersonalApellidoPaterno,''), ISNULL(PersonalApellidoMaterno,'')
FROM Cte WITH(NOLOCK)
JOIN CteEnviarA ON CteEnviarA.Cliente = cte.Cliente
WHERE Cte.Cliente = @ClientIntelisis
  AND CteEnviarA.ID IN (3, 76)          -- UEN=1;  IN (7) si UEN=2
  AND CteEnviarA.Categoria = 'CREDITO MENUDEO'
  AND Cte.Estatus = 'ALTA'
```

| Objeto | Tipo | Columnas |
|---|---|---|
| `dbo.FNVTASValidarEmpleado` | Función escalar | Si devuelve valor, bloquea la compra a crédito |
| `Cte` | Tabla | `PersonalNombres`, `PersonalApellidoPaterno`, `PersonalApellidoMaterno`, `Cliente`, `Estatus` |
| `CteEnviarA` | Tabla | `Cliente`, `ID`, `Categoria` |

**Objetos que referencia `SpCREDICredilana`** — obtenido de `sys.sql_expression_dependencies` en `MAVICUBOS`. **31 referencias.**

| Grupo funcional | Objetos |
|---|---|
| **Cliente** | `Cte` · `CteEnviarA` · `CteTel` · `FNVTASValidarEmpleado` |
| **Seguro de vida** | `CREDIDSeguroDeVida` · `CREDIDSeguroDeVidaBeneficiario` |
| **Solicitud de crédito web** | `CRED_SOLICITUD_WEB_DATOS_TEMP` · `CREDIDSolicitudWebDatosPrimerGuardado` · `VTASDCreditoLiberador` |
| **Bonificación** | `MaviBonificacionArt` · `MaviBonificacionCondicion` · `MaviBonificacionConf` · `MaviBonificacionLinea` · `MaviBonificacionMoV` · `MaviBonificacionSucursal` |
| **Precios y CAT** | `fnProprePrecio` · `fnProprePrecioID` · `PropreListaDFinal` · `RM0847InfoCat` · `Condicion` |
| **Venta / afectación** | `Venta` · `VentaD` · `spAfectar` · `CxC` |
| **STP / dispersión** | `CREDICConfiguracionSTP` · `CREDICMenudeoParametros` · `FnVTASMuestraCuatro` |
| **Catálogos** | `Art` · `Sucursal` · `TablaStD` |
| **SMS** | `TcAAea00030_EnvioMensajes` |

> `SpCREDICredilana` **también ejecuta `spAfectar`**: no es de solo lectura, afecta documentos de venta. Y comparte con el endpoint 16 el bloque de bonificación, precios y `TcAAea00030_EnvioMensajes`.

---

### 18 · `POST credit/ExistRFCAndPhoneCte`

⚠️ **Todo el SQL de abajo es hoy inalcanzable.** `CURPValidation` (`CreditMethods.cs:1423`) y `RFCValidation` (`:1494`) tienen un `return` incondicional en su primera línea (`:1426` y `:1496`). El endpoint responde siempre "puede continuar" sin consultar nada.

**Tres opciones — hay que elegir antes de migrar**:

| Opción | Implicación |
|---|---|
| **A. Migrar tal cual** | Se mueve el `return` fijo. Comportamiento idéntico al actual. Deuda técnica documentada. **Recomendada para no bloquear el lote** |
| **B. Eliminar la ruta** | Requiere coordinar con Magento |
| **C. Reimplementar en SAP** | Es desarrollo nuevo, no migración |

**Inventario del código muerto, por si se elige C**:

`CURPValidation` — 3 consultas:

```sql
-- a) BD Comercializadora  (además está comentada dentro del método)
SELECT * FROM Personal WITH(NOLOCK) WHERE registro = @CURP AND Estatus = 'ALTA'

-- b) BD IntelisisTmp
SELECT Curp FROM cte WITH(NOLOCK) WHERE Cliente LIKE 'C%' AND CURP = @CURP;

-- c) BD IntelisisTmp — solicitudes pendientes
SELECT M.* FROM Cte C
JOIN Venta V ON V.Cliente = C.Cliente
JOIN MOVBITACORA M ON V.ID = M.ID
WHERE C.Cliente LIKE 'P%' AND C.Curp = @CURP
ORDER BY M.Fecha DESC;
```

`RFCValidation` — 3 consultas:

```sql
-- a) Existencia por RFC
SELECT Cliente FROM Cte WITH (NOLOCK) WHERE SUBSTRING(Rfc, 1, 10) = @Rfc;

-- b) RFC + teléfono
SELECT C.Cliente FROM Cte AS C WITH (NOLOCK)
LEFT JOIN CTETEl AS CT WITH (NOLOCK) ON CT.Cliente = C.Cliente
WHERE SUBSTRING(C.Rfc, 1, 10) = @Rfc AND CONCAT(CT.Lada, CT.Telefono) = @Phone;

-- c) RFC + canal de venta   (@Chanel = 3 si UEN=1, 7 si UEN=2)
SELECT C.Cliente FROM Cte AS C WITH (NOLOCK)
LEFT JOIN CteEnviarA AS CE WITH(NOLOCK) ON CE.Cliente = C.Cliente
WHERE SUBSTRING(C.Rfc, 1, 10) = @Rfc AND CE.ID = @Chanel;
```

| Objeto | BD | Columnas |
|---|---|---|
| `Cte` | IntelisisTmp | `Cliente`, `Curp`, `Rfc` |
| `CteTel` | IntelisisTmp | `Cliente`, `Lada`, `Telefono` |
| `CteEnviarA` | IntelisisTmp | `Cliente`, `ID` |
| `Venta` | IntelisisTmp | `Cliente`, `ID` |
| `MOVBITACORA` | IntelisisTmp | `ID`, `Fecha` |
| `Personal` | Comercializadora | `registro`, `Estatus` |

---

## PARTE 5 — El alimentador del caché SQLite

**No es uno de los 18 endpoints, pero condiciona a tres de ellos** (05, 16 y 17).

La tabla SQLite `mavi_credilana_info` **no se llena sola**. La alimenta `CredyPrestamoMethods.LoadCredilanaInfo()` (`CredyPrestamoMethods.cs:675`), expuesta como `POST credit/SaveCredilanaInfo` y disparada por un cron.

Ese método lee de Intelisis:

```sql
SELECT * FROM dbo.FnVTASListaCredilanas(@uen)   -- CredyPrestamoMethods.cs:303
```

| Objeto | Tipo | Salida por posición (según el consumo en `:317-374`) |
|---|---|---|
| `dbo.FnVTASListaCredilanas` | Función tabular | `[1]` artículo · `[2]` monto · `[3]` total · `[4]` total pago puntual · `[5]` bonificación · `[6]` tasa · `[7]` CAT · `[8]` tasa SPP · `[9]` CAT SPP · `[10]` condición |

**Objetos que referencia `FnVTASListaCredilanas`** — 9 referencias. Es el más acotado de los tres y el mejor candidato a reimplementarse en SAP:

| Grupo | Objetos |
|---|---|
| Artículo | `Art` |
| Bonificación | `MaviBonificacionArt` · `MaviBonificacionCondicion` · `MaviBonificacionConf` · `MaviBonificacionMoV` · `MaviBonificacionSucursal` |
| Precios y CAT | `PropreListaDFinal` · `FN_RM0847TasaInternaRetorno` |
| Catálogo | `TablaStD` |

> No toca `Venta`, no llama a `spAfectar` y no escribe nada: **es una función de solo lectura**. Reimplementarla en SAP es acotado y desbloquea el alimentador del caché sin depender de los dos SPs grandes.

Además invoca `SP_CREDITO_WEB_VALORES_FORM` y `SPCREDICredilana` (los SPs de los endpoints 16 y 17).

**Si se migran los endpoints sin resolver esto, devuelven datos congelados a la fecha del último `SaveCredilanaInfo`.**

Opciones:
- **a)** Construir el equivalente en SAP y portar `LoadCredilanaInfo`
- **b)** Mantener el cron alimentador en APIMagento durante la convivencia, escribiendo al mismo `data.db`
- **c)** Mover el catálogo a tablas de SAP y eliminar el caché SQLite

---

## PARTE 6 — Información faltante

### Estado del inventario de objetos

✅ **Resuelto.** Las dependencias de los 3 objetos principales ya se extrajeron de `MAVICUBOS` con `sys.sql_expression_dependencies` y están documentadas en las PARTES 4 y 5.

| Objeto | Referencias | Documentado en |
|---|---|---|
| `SP_CREDITO_WEB_VALORES_FORM` | 88 (83 reales) | PARTE 4, endpoint 16 |
| `SpCREDICredilana` | 31 | PARTE 4, endpoint 17 |
| `dbo.FnVTASListaCredilanas` | 9 | PARTE 5 |

### Lo que sigue pendiente

**1. El cuerpo de los dos SPs grandes.** La lista de dependencias dice *qué* tocan, no *cómo*. Para reimplementar en SAP hace falta la lógica: qué hace cada `@Op`, en qué orden, con qué reglas de negocio.

```sql
SELECT o.name, m.definition
FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id
WHERE o.name IN ('SP_CREDITO_WEB_VALORES_FORM','SPCREDICredilana');
```

**2. Las funciones escalares** `FnVTASMuestraCuatro` y `FNVTASValidarEmpleado` — son pequeñas y probablemente triviales de replicar en C#, pero su cuerpo no se ha visto.

**3. Los objetos sin equivalente identificado en SAP**, que aparecen en las dependencias y no tienen candidato en la PARTE 7:
`MaviBonificacion*` (9 tablas) · `PropreListaDFinal` · `fnProprePrecio` / `fnProprePrecioID` · `RM0847InfoCat` · `FN_RM0847TasaInternaRetorno` · `SHM_BURO_CTE` / `SHM_BURO_CTED` · `CREDIDSeguroDeVida*` · `spAfectar`

### Medición pendiente en producción

Volumen real de invocación de los `op` **sin caché**:
- `SP_CREDITO_WEB_VALORES_FORM`: `Bonificacion` y cualquier `op` no listado
- `SPCREDICredilana`: `Artc`, `Condicion`, `CteInfo`, `ActTelCredilana`, `QuitarTelValidado`

Si el volumen es cero, los endpoints 16 y 17 se reducen a eliminar la rama del fallback.

⚠️ **Esta medición pasó a ser la decisión más importante del proyecto.** Con 83 y 31 objetos referenciados, y con ambos SPs ejecutando `spAfectar`, reimplementarlos en SAP es un proyecto en sí mismo, no una migración. La diferencia entre "el fallback está muerto" y "el fallback se usa" es la diferencia entre borrar 20 líneas y rediseñar el motor de crédito web.

---

## PARTE 7 — Candidatos de equivalencia ya disponibles en ServicioSAP

| Tabla de Intelisis | Endpoint de ServicioSAP que podría sustituirla |
|---|---|
| `Cte` | `GET partner/client/{clientId}` — `BusinessPartnerMethods.GetClientAsync` |
| `Cte` (búsqueda) | `GET partner/client/filter/{sapFilter}` — `GetFilterClientsAsync` |
| `CteTel` | `PATCH partneraddress/partner/phone` |
| `CteEnviarA` | `GET/POST partneraddress/partner/{bpId}` |
| `Venta` | `GET sale/filter/{filters}` — `SalesMethods.GetFilterDocumentsAsync` |
| `MOVBITACORA` | **Sin equivalente identificado** |
| `CREDIDCuentaCLABEDispersion` | **Sin equivalente identificado** |
| `CREDICConfiguracionSTP` | **Sin equivalente identificado** |
| `Personal` (Comercializadora) | SIGMAVI ya tiene el sinónimo `Personal → ERPMAVI.Comercializadora.dbo.Personal` |

---

## PARTE 8 — Reglas y trampas conocidas

1. **`obtenerConexionAndroid()` y `obtenerConexionSigMavi()` devuelven la conexión YA ABIERTA.** El código de APIMagento hace `cnn.Open()` explícito. **Al portar hay que quitar esos `Open()`** o el segundo lanzará `InvalidOperationException`. Es el error más probable al copiar y pegar.

2. **Colisión de prefijos de ruta**: `[RoutePrefix("credit")]` ya lo usa `AbonosController` en ServicioSAP, con las rutas `GetAccountDebts`, `getClienteFactura/{cliente}/{factura}`, `ApplyPaymentNeko`, `UpdateStatusPaymentNeko`. Attribute routing permite varios controladores con el mismo prefijo mientras las rutas no se repitan — verificar antes de agregar.

3. **Escritura concurrente a `data.db`**: si APIMagento y ServicioSAP escriben el mismo archivo, SQLite bloquea. Definir un único escritor.

4. **Manejo de errores**: varios métodos de APIMagento se tragan las excepciones y devuelven `200` con un texto de error en el body. Al portar, **replicar ese comportamiento** o corregirlo de forma consciente y coordinada con el equipo de Magento.

5. **No introducir `sCadenaConexion`** (Intelisis) en ServicioSAP bajo ninguna circunstancia.

6. **Verbos HTTP**: confirmar el verbo con el que la DMZ invoca cada ruta antes de definirlo en ServicioSAP. Hay al menos una inconsistencia conocida (`obtenerQuejas`).

---

## PARTE 9 — Checklist de cierre por endpoint

- [ ] Responde con el **mismo contrato JSON** que APIMagento (comparar lado a lado con el mismo request)
- [ ] `[Authorize]` y validación JWT funcionan igual
- [ ] Mismos códigos HTTP ante error
- [ ] El log escribe donde se espera
- [ ] La DMZ apunta a SAP (`Post` → `PostSAP`) y responde igual de extremo a extremo
- [ ] Si es una ruta interna (endpoints 10, 12, 14, 15), el cron o tarea programada quedó repuntado
- [ ] La ruta vieja en APIMagento queda marcada como obsoleta, sin borrar, hasta cerrar la convivencia

---

## PARTE 10 — Diccionario de métodos

Una entrada por cada método involucrado en los 18 endpoints. Con esto se puede portar sin abrir el código original.

Notación: `[s]` static · `[p]` private · `[pr]` protected.

### `Metodos/CreditMethods.cs`

| Método | Línea | Firma | Devuelve | Qué hace | BD |
|---|---|---|---|---|---|
| `SendSmsNewNumber` `[s]` | 1992 | `(SendSmsNewNumberRequest)` | `Dictionary<string,int>` | Limpia el teléfono, obtiene o crea el IdRef y encola el SMS | Android: `TcAAEA00030_EnvioMensajes` |
| `GetIdRef` `[s][p]` | 2036 | `(string cliente, string idCarrito)` | `string` | `MAX(IdCodigoVerificacioneCommerce)` del par cliente/carrito. `""` si falla | Android: `VTASDCodigoVerificacioneCommerce` |
| `InsertCodigoVerificacion` `[s][p]` | 2068 | `(string cliente, string idCarrito)` | `string` | Crea el código `LEFT(NEWID(),8)` con expiración a 2 min y devuelve el IdRef nuevo | Android: `VTASDCodigoVerificacioneCommerce` |
| `SolicitudMercancia` | 610 | `(SolicitudMercanciaRequest)` | `string` | Copia el cliente de Intelisis a la tabla temporal de solicitud. Ver PARTE 4 §19 | **Intelisis** `Cte` + Android `CRED_SOLICITUD_WEB_DATOS_TEMP` |
| `GuardarDocumento` | 2605 | `(BodyImagenBase64)` | `object` | Mapea `TipoDoc`→`IdFoto`/`Formato`, decodifica Base64 y hace INSERT o UPDATE según sea cliente o token | AdminDoc: `MAVI_DOC_CTE` |
| `SaveImagesProductosMx` | 971 | `(SaveImagesRequest)` | `bool` | Lanza `Task.Run` con 10 s de delay y **retorna `true` de inmediato**. Orquesta los 3 métodos de abajo | — |
| `SaveSelfieImageForCredit` | 994 | `(SaveImagesRequest)` | `bool` | INSERT de la selfie con `TIPO_DOC='14'`, `IDAPLICACION=7` | AdminDoc: `MAVI_DOC_CTE` |
| `SaveCompressedFile` `[p]` | 1017 | `(Image img, int index)` | `bool` | Escribe el archivo comprimido en `images\credit\{Name}_{index}.{mime}` | — (filesystem) |
| `CompressBytesFromBase64Image` `[p]` | 1041 | `(string base64, string mime, long maxBytes=1MB)` | `byte[]` | Baja la calidad JPEG de 90 en pasos de 10 hasta pesar ≤ 1 MB o llegar a 20 | — |
| `GetEncoder` `[s][p]` | 1078 | `(string mime)` | `ImageCodecInfo` | Resuelve el códec; normaliza `jpg`/`jpeg` a `image/jpeg` | — |
| `ExistRFCAndPhoneCte` | 1414 | `(ExistRFCAndPhoneCteRequest)` | `ValidationTypeError` | Encadena CURP y RFC. **Hoy siempre "puede continuar"** | — (neutralizado) |
| `CURPValidation` `[p]` | 1423 | `(ExistRFCAndPhoneCteRequest)` | `ValidationTypeError` | ⚠️ `return` incondicional en :1426. SQL inalcanzable | *(Intelisis si se reactiva)* |
| `RFCValidation` `[p]` | 1494 | `(ExistRFCAndPhoneCteRequest)` | `ValidationTypeError` | ⚠️ `return` incondicional en :1496. SQL inalcanzable | *(Intelisis si se reactiva)* |
| `CreditoWeb_FormDatos` | 677 | `(string op, string search, int uen)` | `List<List<string>>` | Ejecuta `SP_CREDITO_WEB_VALORES_FORM` y aplana el `DataSet` a arrays posicionales | **Intelisis** |
| `CreditoWeb_Informacion` | 1191 | `(string op, string search, int uen)` | `List<List<string>>` | Si `op="CteInfo"` valida con `NombreCliente`; ejecuta `SPCREDICredilana`; si `op="CteInfo"` sobrescribe posiciones 2 y 3 con la CLABE | **Intelisis** |
| `NombreCliente` `[s][p]` | 1809 | `(string cliente, int uen)` | `string` | Bloquea empleados con `FNVTASValidarEmpleado`; devuelve JSON con nombres enmascarados o `"false"` | **Intelisis**: `Cte`, `CteEnviarA` |
| `HideNames` `[s][p]` | 1923 | `(string name)` | `string` | Enmascara dejando primera y última letra de cada palabra | — |

### `Metodos/Credit/CredYPrestamo/CredyPrestamoMethods.cs`

| Método | Línea | Firma | Devuelve | Qué hace | BD |
|---|---|---|---|---|---|
| `GetCredilanaInfo<T>` | 833 | `(string field, int uen)` | `T` | `SELECT data` del caché y deserializa al tipo pedido. **Lanza si no hay fila** (`ExecuteScalar` nulo) | SQLite: `mavi_credilana_info` |
| `SaveCredilanaInfo` | 777 | `(SaveCredilanaInfoRequest)` | `bool` | Crea tabla y trigger si no existen; decide entre update e insert | SQLite: `mavi_credilana_info` |
| `ExistFieldCredilanaInfo` | 852 | `(SQLiteConnection, string table, string field, int uen)` | `int` | Devuelve el `id` existente o `0` | SQLite |
| `UpdateCredilanaInfo` | 879 | `(SQLiteConnection, request, int? id, string table)` | `bool` | UPDATE por id | SQLite |
| `InsertCredilanaInfo` | 896 | `(SQLiteConnection, request, string table)` | `bool` | INSERT nuevo | SQLite |

### `Metodos/CustomerServiceMethods.cs`

| Método | Línea | Firma | Devuelve | Qué hace | BD |
|---|---|---|---|---|---|
| `obtenerQuejas` | 714 | `()` | `string` (JSON) | Lista de quejas activas con alias no vacío, ordenada por alias. En error devuelve `ex.Message` | Android: `ACTES_CATALOGO_QUEJA` |
| `GetBBVAKeyAdvanced` `[s]` | 1124 | `()` | `string` | POST SOAP a `WSeCommerceMX`, extrae `GetMasterSeguridadResult` del XML | — (servicio externo) |

### `Metodos/OrderMethods.cs`

| Método | Línea | Firma | Devuelve | Qué hace | BD |
|---|---|---|---|---|---|
| `GetGuide` | 736 | `(GuidesRequest)` | `GuideResponse` \| `null` | Busca la guía por `idecommerce` | SQLite: `servicio_guias` |
| `SaveGuide` | 715 | `(string idEcommerce, string fullName)` | `bool` | `INSERT OR IGNORE`. Ya migrado a ServicioSAP (`OrderMethods.cs:389`) | SQLite: `servicio_guias` |

### `Metodos/CustomerMethods.cs`

| Método | Línea | Firma | Devuelve | Qué hace | BD |
|---|---|---|---|---|---|
| `CreateCashReport` | 194 | `(CustomerReportRequest)` | `ApiResponse` | Valida campos, escribe el Base64 a disco y lo copia al share bajo impersonación | — (filesystem + SMB) |

### `Metodos/ProductImage/Methods.cs`

| Método | Línea | Firma | Devuelve | Qué hace | BD |
|---|---|---|---|---|---|
| `getImages` | 388 | `(string magento, string original)` | `string` | Copia la imagen del share al disco local bajo impersonación. **Devuelve `"Ok"` aunque el origen no exista** | — (SMB) |
| `Impersonation` ctor | 421 | `(string user, string domain, string pass)` | — | `LogonUser` tipo 2 + `WindowsIdentity.Impersonate()` | — |
| `Impersonation.Dispose` | 437 | `()` | — | `Undo()` y libera el contexto | — |
| `LogonUser` `[s][p]` | 413 | `DllImport advapi32.dll` | `bool` | P/Invoke | — |
| `CloseHandle` `[s][p]` | 417 | `DllImport kernel32.dll` | `bool` | P/Invoke | — |

### `Conn/Magento.cs`

| Método | Línea | Firma | Devuelve | Qué hace | BD |
|---|---|---|---|---|---|
| `getCuenta` | 309 | `(CustomerIntelisis)` | `string` | POST a `magento/getCuenta` en la DMZ. Post-procesa con `.Replace("\\\"","\"")...Trim('"')` | — |
| `setCuenta` | 319 | `(CustomerIntelisis)` | `string` | Igual contra `magento/setCuenta` | — |
| `deleteChildren` | 253 | `()` | `void` | Vacía la tabla y reinicia el autoincrement | SQLite: `children` |
| `getChildren` | 260 | `(string store)` | `void` | Pagina de 1000 contra `magento/children/{page}/1000/{store}` e inserta | SQLite: `children` |

### `Metodos/ProductMethods.cs`

| Método | Línea | Firma | Devuelve | Qué hace | BD |
|---|---|---|---|---|---|
| `BuildJsonAndSend` | 1839 | `(string uen)` | `void` | ~420 líneas. Arma el JSON de productos simples y lo envía por lotes a la DMZ | SQLite + DMZ |
| `BuildJsonAndSendConfigurable` | 1407 | `(string uen)` | `void` | ~430 líneas. Igual para configurables y sus variaciones | SQLite + DMZ |
| `runDelta` `[p]` | 116 | `(string type, string store, string product_type)` | `string` | ⚠️ **Lanza `python.exe main.py`** comparando `old-data.db` contra `data.db` para detectar cambios. Devuelve stdout o el texto del error | — (proceso externo) |
| `isInMagento` `[p]` | 385 | `(string sku, string store)` | `bool` | ¿El SKU existe en la tienda? | SQLite: `product_in_stores` |
| `getParentAndAddTipo` `[p]` | 43 | `(string sku, string store)` | `string` | Busca el padre configurable y extrae el atributo `tipo` | SQLite: `products` |
| `GetWebsites` `[p]` | 435 | `(string sku)` | `List<List<string>>` | Sitios donde vive el SKU | SQLite: `products` |
| `GetCategoryId` `[p]` | 218 | `(string name, int level, int pos, string parentId="")` | `string` | Resuelve el id de categoría por nombre, nivel y padre | SQLite: `categories` |
| `GetAttributeValueId` `[p]` | 312 | `(string code, string label)` | `string` | Id de la opción de atributo por etiqueta | SQLite: `attribute_options` |
| `GetAttributeSetId` `[p]` | 199 | `(string name)` | `string` | Id del set de atributos por nombre | SQLite: `attribute_sets` |
| `GetFiltrableColor` `[p]` | 280 | `(string sku, string color, string website)` | `string` | Normaliza el color a un valor filtrable | SQLite: `attribute_options` |
| `GetChildTag` `[p]` | 63 | `(string parentSku, string store)` | `List<List<string>>` | Toma la etiqueta del primer hijo que tenga una | SQLite: `products`, `tags` |
| `GetChild` `[p]` | 348 | `(string sku)` | `string` | Product id del hijo | SQLite: `children` |
| `GetAttributeId` `[p]` | 335 | `(string code)` | `string` | Id del atributo por código | SQLite: `attributes` |
| `GetAndSavePrice` `[p]` | 361 | `(string sku, string uen, List<string> children)` | `List<List<string>>` | Precio del configurable a partir de sus hijos | SQLite: `products` |

> **Auxiliares que NO usan los endpoints 14 y 15**, aunque estén en el mismo archivo: `GetImages` (:164), `GetStores` (:176), `ExistAttribute` (:267), `GetWarranty` (:398), `IsMayoristaOrElite` (:457). Los llaman `BuildJsonAndSendWithImage`, `BuildCSV` y `updateStockJson`, que no forman parte de este lote. **No portarlos.**

### `Metodos/TagsMethods.cs`

| Método | Línea | Firma | Devuelve | Qué hace | BD |
|---|---|---|---|---|---|
| `GetTags` | 161 | `(string uen)` | `List<List<string>>` | Etiquetas de la tienda. Mapea `viu`→`VIU`, `muebles_america`→`MUEBLES AMERICA`, `mavi`→`MAVI` | SQLite: `tags` |

### `Helper/Curl.cs` — sustituir por el `DmzClient` de H3

| Método | Línea | Firma | Devuelve | Qué hace |
|---|---|---|---|---|
| `Curl` ctor | 25 | `()` | — | `POST login/authenticate` a la DMZ y guarda el token. **Se ejecuta en cada `new Curl()`** |
| `Post` | 79 | `(string url, string json="")` | `string` | POST con `Authorization`. En excepción devuelve `e.Message` como si fuera respuesta |
| `Get` | 112 | `(string url)` | `string` | GET con normalización `FormC`. En excepción devuelve `e.ToString()` |

### Grafo de llamadas resumido

```
01 SendSmsNewNumber ──> GetIdRef
                    └─> InsertCodigoVerificacion ──> GetIdRef

02 SolicitudMercancia  (sin llamadas internas)
03 obtenerQuejas       (sin llamadas internas)
04 GetGuide            (sin llamadas internas)
05 GetCredilanaInfo    (sin llamadas internas)
06 GuardarDocumento    (sin llamadas internas)

07 SaveImagesProductosMx ──> SaveCompressedFile ──> CompressBytesFromBase64Image ──> GetEncoder
                         └─> SaveSelfieImageForCredit ──> CompressBytesFromBase64Image

08 GetBBVAKeyAdvanced  (sin llamadas internas)
09 getStatus           (inline en el controlador)
10 getImages           ──> Impersonation(ctor/Dispose)
11 CreateCashReport    ──> Impersonation(ctor/Dispose)
12 getCuenta/setCuenta ──> Curl.Post

14 BuildJsonAndSend    ──> isInMagento ×3, runDelta, getParentAndAddTipo, GetWebsites,
                           GetTags, GetCategoryId, GetAttributeValueId, GetAttributeSetId

15 deleteChildren, getChildren ×3
   BuildJsonAndSendConfigurable ──> isInMagento ×3, GetAttributeValueId ×3, runDelta,
                                    GetTags, GetFiltrableColor, GetChildTag, GetChild,
                                    GetCategoryId, GetAttributeSetId, GetAttributeId,
                                    GetAndSavePrice

16 CreditoWeb_FormDatos   ──> [SQLite] GetCredilanaInfo  |  [Intelisis] SP_CREDITO_WEB_VALORES_FORM
17 CreditoWeb_Informacion ──> [SQLite] GetCredilanaInfo  |  [Intelisis] NombreCliente ──> HideNames
                                                                        SPCREDICredilana
18 ExistRFCAndPhoneCte ──> CURPValidation, RFCValidation   (ambos neutralizados)
```

---

## ANEXO — Rutas internas vs. expuestas por la DMZ

De los 18, **13 los consume la DMZ** y **5 son internos** (los dispara un cron sobre la LAN):

| Tipo | Endpoints |
|---|---|
| **Vía DMZ** (cambiar `Post` → `PostSAP`) | 01, 02, 03, 04, 05, 06, 07, 08, 09, 11, 16, 17, 18 |
| **Internos** (repuntar el cron) | 10, 12 (getCuenta), 12 (setCuenta), 14, 15 |
