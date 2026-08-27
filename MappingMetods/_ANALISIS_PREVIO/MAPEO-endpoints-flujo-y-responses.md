# Mapeo funcional de los 18 endpoints
### URL · cadena de métodos · flujo interno · objetos de BD · ejemplo de response

Complemento del `BRIEFING-migracion-18-endpoints.md`. Todos los responses fueron derivados del código, no inventados.

---

## ⚠️ CORRECCIÓN — `credit/SolicitudMercancia` SÍ toca Intelisis

Durante la elaboración de este mapeo se detectó que `CreditMethods.SolicitudMercancia` (`CreditMethods.cs:656`) contiene una referencia **inline** al linked server:

```sql
FROM ERPMAVI.IntelisisTMP.dbo.Cte WITH (NOLOCK)
```

El método abre conexión contra `ServicioAndroid`, pero el `INSERT ... SELECT` **lee los datos del cliente desde Intelisis**. Se hizo un barrido completo del proyecto y **este es el único caso** de referencia inline al linked server:

```
grep -rniE "ERPMAVI|IntelisisTMP|MAVIPROD" --include=*.cs
→ Conn/Connection.cs:26,27   (cadenas de conexión, esperado)
→ Metodos/CreditMethods.cs:656   ← único caso inline
```

**Conteo corregido: 17 endpoints sin Intelisis, 4 con Intelisis** (16, 17, 18 y SolicitudMercancia).

Diferencia importante: SolicitudMercancia hace **un solo `SELECT` sobre `Cte`**, no ejecuta SPs de negocio. Es sustituible por una llamada a `GET partner/client/{clientId}`, que ServicioSAP ya expone. Su complejidad no se parece a la de los endpoints 16 y 17.

---

## Convención de lectura

Cada endpoint documenta:

| Campo | Significado |
|---|---|
| **URL DMZ** | Lo que llama Magento |
| **URL LAN** | Lo que la DMZ reenvía |
| **Cadena de métodos** | Orden real de invocación, con `archivo:línea` |
| **Conexión** | Cadena de conexión que se abre |
| **Objetos de BD** | Tablas, SPs y funciones que se tocan |
| **Request** | Modelo y ejemplo |
| **Response** | Forma exacta que devuelve el controlador |

---

# GRUPO A · ServicioAndroid

## 01 · `credit/SendSmsNewNumber`

| | |
|---|---|
| **URL DMZ** | `POST /credit/SendSmsNewNumber` → `CreditController.cs:303` |
| **URL LAN** | `POST /credit/SendSmsNewNumber` → `CreditController.cs:549` |
| **Conexión** | `sCadenaConexionAndriod` → `MAVICBOSANDROID` / `ServicioAndroid` |

### Cadena de métodos
```
CreditController.GetSmsNoNip                  (DMZ CreditController.cs:303)
└─ CreditMethods.SendSmsNewNumber             (CreditMethods.cs:1992)  [static]
   ├─ CreditMethods.GetIdRef                  (CreditMethods.cs:2036)  [static]
   └─ CreditMethods.InsertCodigoVerificacion  (CreditMethods.cs:2068)  [static]
      └─ CreditMethods.GetIdRef               (recursivo)
```

### Flujo
1. Normaliza `NumeroTelefono` con `Regex.Replace(..., "[^0-9]", "")`
2. `GetIdRef` → busca `MAX(IdCodigoVerificacioneCommerce)` para el par cliente/carrito
3. Si devuelve `"0"` → `InsertCodigoVerificacion` crea el registro con código `LEFT(NEWID(),8)` y expiración a 2 minutos, y vuelve a pedir el IdRef
4. Si sigue sin IdRef → retorna `-1` sin insertar nada
5. Determina `idMensaje` (`60` si no es crédito, `23` si lo es) e `Identificador` (`DM0312` / `DM0363`)
6. `INSERT` en `TcAAEA00030_EnvioMensajes`
7. Retorna `RecordsAffected`

### Objetos de BD
| Objeto | Operación | Columnas |
|---|---|---|
| `VTASDCodigoVerificacioneCommerce` | SELECT | `IdCodigoVerificacioneCommerce`, `Cliente`, `IdCarrito` |
| `VTASDCodigoVerificacioneCommerce` | INSERT | `Cliente`, `Codigo`, `IdCarrito`, `FechaRegristro`, `FechaExpira`, `Estatus` |
| `TcAAEA00030_EnvioMensajes` | INSERT | `IdRegistro`, `IdMensaje`, `Cliente`, `FechaEnvio`, `EstatusEnvio`, `ClienteF`, `Tipo`, `IntentoRespuesta`, `IntentoEnvio`, `Modem`, `Identificador`, `Telefono` |

### Request — `SendSmsNewNumberRequest`
```json
{ "Cliente": "C00123456", "NumeroTelefono": "3312345678", "IdCarrito": "98765", "EsCredito": true }
```

### Response
```json
{ "result": 1 }
```
`result`: `1` = SMS encolado · `-1` = error o sin IdRef · `0` = no se insertó

---

## 02 · `credit/SolicitudMercancia` ⚠️ *toca Intelisis*

| | |
|---|---|
| **URL DMZ** | `POST /credit/SolicitudMercancia` → `CreditController.cs:319` |
| **URL LAN** | `POST /credit/SolicitudMercancia` → `CreditController.cs:560` |
| **Conexión** | `sCadenaConexionAndriod` **+ linked server `ERPMAVI` → `MAVICUBOS`** |

### Cadena de métodos
```
CreditController.SolicitudMercancia   (LAN CreditController.cs:560)
└─ CreditMethods.SolicitudMercancia   (CreditMethods.cs:610)
```

### Flujo
1. Limpia `Telefono` dejando solo dígitos
2. Ejecuta un `INSERT ... SELECT` que **lee de Intelisis y escribe en ServicioAndroid**
3. Valores fijos que inyecta la consulta: `articulo='ADTE00001'`, `estatus=7`, `origen='APP MERCANCIAS'`, `IdMagento='APP MERCANCIA'`, `ValidacionTelefono=1`, `Confirmado=1`
4. Derivados por UEN: `condicion` = `'12 M MA P INM'` (uen 1) o `'12 M VIU P INM'` (uen 2) · `Sucursal` = `504` o `505`
5. Parte la lada: si los 2 primeros dígitos son `33`, `55` u `81` → lada de 2 y teléfono de 8; si no, lada de 3 y teléfono de 7
6. `SELECT SCOPE_IDENTITY()` y lo retorna

### Objetos de BD
| Objeto | BD | Operación |
|---|---|---|
| `ERPMAVI.IntelisisTMP.dbo.Cte` | **Intelisis** | SELECT — `Cliente`, `PersonalApellidoPaterno`, `PersonalApellidoMaterno`, `PersonalNombres`, `FechaNacimiento`, `RFC`, `Sexo`, `eMail1`, `Direccion`, `DireccionNumero`, `DireccionNumeroInt`, `EntreCalles`, `CodigoPostal`, `Delegacion`, `Estado`, `Colonia`, `Poblacion` |
| `CRED_SOLICITUD_WEB_DATOS_TEMP` | ServicioAndroid | INSERT — 31 columnas |

### Sustitución en SAP
El `SELECT` es equivalente a `GET partner/client/{clientId}` (`BusinessPartnerMethods.GetClientAsync`). Se reescribe como: obtener el BP desde SAP → construir el `INSERT` con esos valores en memoria.

### Request — `SolicitudMercanciaRequest`
```json
{ "Cliente": "C00123456", "Telefono": "3312345678", "Uen": 1 }
```

### Response
```json
"48213"
```
String plano con el `idSolicitud`. `"0"` si el cliente no existe en `Cte`.

---

## 03 · `customerService/obtenerQuejas`

| | |
|---|---|
| **URL DMZ** | `POST /customerService/obtenerQuejas` → `CustomerServiceController.cs:116` ⚠️ *`GET` en rama `dbAndroid`* |
| **URL LAN** | `POST /customerService/obtenerQuejas` → `CustomerServiceController.cs:87` |
| **Conexión** | `sCadenaConexionAndriod` |

### Cadena de métodos
```
CustomerServiceController.obtenerQuejas   (LAN CustomerServiceController.cs:87)
└─ CustomerServiceMethods.obtenerQuejas   (CustomerServiceMethods.cs:714)
```

### Flujo
1. `SELECT id, AliasQueja FROM actes_catalogo_queja WHERE queja != '' AND Estatus = 1 AND ISNULL(AliasQueja,'') <> '' ORDER BY AliasQueja`
2. Arma una lista de objetos anónimos `{ id, intencion }`
3. Serializa con `JsonConvert.SerializeObject`
4. El controlador deserializa y lo devuelve como objeto

### Objetos de BD
| Objeto | Operación | Columnas |
|---|---|---|
| `ACTES_CATALOGO_QUEJA` | SELECT | `id`, `AliasQueja`, `queja`, `Estatus` |

### Request
Sin body.

### Response
```json
[
  { "id": 12, "intencion": "ATENCION EN TIENDA" },
  { "id": 45, "intencion": "ENTREGA TARDIA" },
  { "id": 92, "intencion": "INFORMACION GENERAL" }
]
```
En error devuelve el `ex.Message` como string plano.

---

# GRUPO B · SQLite

## 04 · `order/getGuide`

| | |
|---|---|
| **URL DMZ** | `POST /order/getGuide` → `OrdersController.cs:200` |
| **URL LAN** | `POST /order/getGuide` → `OrdersController.cs:165` |
| **Conexión** | SQLite `C:\inetpub\wwwroot\api\data.db` |

### Cadena de métodos
```
OrdersController.GetGuideWithName   (LAN OrdersController.cs:165)
└─ OrderMethods.GetGuide            (OrderMethods.cs:736)
```

### Flujo
1. El controlador valida que `IdEcommerce` no sea `""` → si lo es, `404`
2. `SELECT idecommerce, fullname FROM servicio_guias WHERE idecommerce = @idecommerce`
3. Si no hay fila → `null` → el controlador responde `404`
4. La escritura la hace `OrderMethods.SaveGuide` (`:715`) desde el flujo de `SetPedido`

### Objetos de BD
| Objeto | Operación | Columnas |
|---|---|---|
| `servicio_guias` (SQLite) | SELECT | `id`, `idecommerce`, `fullname` |

### Request — `GuidesRequest`
```json
{ "IdEcommerce": "2000012345" }
```

### Response
```json
{ "IdEcommerce": "2000012345", "FullName": "JUAN PEREZ LOPEZ" }
```
`404 Not Found` si no existe la guía.

---

## 05 · `credit/GetCreditAmounts`

| | |
|---|---|
| **URL DMZ** | `POST /credit/GetCreditAmounts` → `CreditController.cs:347` |
| **URL LAN** | `POST /credit/GetCreditAmounts` → `CreditController.cs:315` |
| **Conexión** | SQLite `data.db` |

### Cadena de métodos
```
CreditController.GetCreditAmounts              (LAN CreditController.cs:315)
└─ CredyPrestamoMethods.GetCredilanaInfo<T>    (CredyPrestamoMethods.cs:833)
```

### Flujo
1. Según `articulo` y `tipo` elige el `field` a leer:
   - `articulo="nuevo"` + `tipo="CREDITO"` → `montos_cte_nuevo`
   - `articulo="nuevo"` + otro tipo → `montos_cte_nuevo_apertura`
   - `articulo="casa"` → `montos_cte_casa`
2. `SELECT data FROM mavi_credilana_info WHERE field=@field AND uen=@uen`
3. Deserializa el JSON almacenado a `CteNuevoResponseModel`
4. Si `articulo` no es ninguno de los dos → `400 BadRequest`

### Objetos de BD
| Objeto | Operación | Columnas |
|---|---|---|
| `mavi_credilana_info` (SQLite) | SELECT | `id`, `field`, `data`, `uen`, `update_time` |

> ⚠️ La tabla la alimenta `LoadCredilanaInfo` leyendo de Intelisis. Ver PARTE 5 del briefing.

### Request — `ArticuloUenRequest`
```json
{ "articulo": "nuevo", "uen": 1, "tipo": "CREDITO" }
```

### Response — `CteNuevoResponseModel`
```json
{
  "hasta_un_maximo_de_prestamo": 15000.00,
  "hasta_una_bonificacion_de": 25,
  "articulos": [
    {
      "articulo": "CRED00500",
      "monto": 5000.00,
      "total_sin_bonificacion": 8250.00,
      "total_con_bonificacion": 6187.50,
      "meses": 12,
      "semanas": 52,
      "condicion": "12 M MA P INM",
      "bonificacion": 25,
      "abono_sin_bonificacion": 159.00,
      "tipo_de_abono": "SEMANAL",
      "abono_con_bonificacion": 119.00,
      "tasa_con_bonificacion": 65.00,
      "cat_con_bonificacion": 89.50,
      "interes_con_bonificacion": 1187.50,
      "tasa_sin_bonificacion": 65.00,
      "cat_sin_bonificacion": 120.30,
      "interes_sin_bonificacion": 3250.00
    }
  ]
}
```
`tipo_de_abono` es `"SEMANAL"` si `uen=1`, `"MENSUAL"` si `uen=2`.

---

# GRUPO C · AdminDoc

## 06 · `credit/guardardocumento`

| | |
|---|---|
| **URL DMZ** | `POST /credit/guardardocumento` → `CreditController.cs:443` — **`multipart/form-data`, `[AllowAnonymous]`** |
| **URL LAN** | `POST /credit/guardardocumento` → `CreditController.cs:592` — **`application/json`** |
| **Conexión** | `sCadenaConexionAdminDoc` → `MAVICBOSANDROID` / `AdminDoc` |

### Cadena de métodos
```
CreditController.GuardarDocumento     (DMZ CreditController.cs:443)
└─ [conversión multipart → BodyImagenBase64]
   └─ CreditController.GuardarDocumento  (LAN CreditController.cs:592)
      └─ CreditMethods.GuardarDocumento  (CreditMethods.cs:2605)
```

> La DMZ recibe `multipart`, extrae el archivo, lo convierte a Base64 y arma el `BodyImagenBase64` que envía a la LAN como JSON.

### Flujo
1. `switch (TipoDoc)` asigna `IdFoto` y `Formato`:

| TipoDoc | IdFoto | Formato |
|---|---|---|
| 13 | 10 | PDF |
| 14 | 1 | IMG |
| 19 | 2 | *(sin cambio)* |
| 23 | 10 | IMG |
| 80 · 170 | 6 | IMG |
| 99·100·101·102·103 | 0 | PDF |
| 104 | 4 | *(sin cambio)* |
| 166 | 10 | PDF |
| *default* | — | IMG |

2. `Convert.FromBase64String(FileInputBase64)` → `byte[]`
3. Determina si es cliente: primera letra `C` o `P` **y** longitud ≤ 11
4. Ejecuta SQL con 3 ramas según `@Opcion`:
   - `Cliente` → `INSERT` con `CLAVE=@Cliente`, `IDAPLICACION=24`
   - `Token` → `INSERT` con `DIR=@Cliente`
   - `Actualizar` → `UPDATE ... SET CLAVE=@Cliente, DIR=NULL WHERE DIR=@GuidCliente`
5. Cada rama termina en `SELECT 1`

### Objetos de BD
| Objeto | Operación | Columnas |
|---|---|---|
| `MAVI_DOC_CTE` | INSERT / UPDATE | `TIPO_DOC`, `CLAVE`, `DIR`, `AVAL`, `FECHA`, `DOCUMENTO` (varbinary), `ESTATUS`, `ID_EXTERNO`, `IDAPLICACION`, `FORMATO`, `ID_FOTO`, `UsuarioCarga` |

> 4 triggers en la tabla (`TrgDBACambioFoto`, `TrgDBANuevaFoto`, `TrgDBAActualizaFotoCte`, `TrgDBANuevaFotoCte`). **Verificado: todos locales, no tocan Intelisis.**

### Request — `BodyImagenBase64`
```json
{
  "Cliente": "C00123456", "TipoDoc": 14, "IdFoto": 0, "Formato": null,
  "UsuarioCarga": "WEB", "idVenta": "1234567", "Aval": "", "MovMovid": "",
  "FileInputBase64": "/9j/4AAQSkZJRgABAQEA..."
}
```

### Response
```json
{ "Success": true, "Message": "Información almacenada correctamente" }
```
Si falla: `{ "Success": false, "Message": "" }`. Si lanza excepción: `500` (el método hace `throw`).

---

## 07 · `credit/SaveImagesProductosMx`

| | |
|---|---|
| **URL DMZ** | `POST /credit/SaveImagesProductosMx` → `CreditController.cs:212` |
| **URL LAN** | `POST /credit/SaveImagesProductosMx` → `CreditController.cs:272` |
| **Conexión** | `sCadenaConexionAdminDoc` + filesystem local |

### Cadena de métodos
```
CreditController.SaveImagesProductosMx        (LAN CreditController.cs:272)
└─ CreditMethods.SaveImagesProductosMx        (CreditMethods.cs:971)   ← lanza Task.Run y retorna de inmediato
   └─ [Task.Delay(10000)]
      ├─ CreditMethods.SaveCompressedFile           (CreditMethods.cs:1017)   × N imágenes INE
      │  └─ CreditMethods.CompressBytesFromBase64Image (CreditMethods.cs:1041)
      │     └─ CreditMethods.GetEncoder             (CreditMethods.cs:1078)
      ├─ CreditMethods.SaveSelfieImageForCredit     (CreditMethods.cs:994)
      │  └─ CreditMethods.CompressBytesFromBase64Image
      └─ CreditMethods.SaveCompressedFile           (selfie)
```

### Flujo
1. **Responde `true` inmediatamente**; todo el trabajo va en `Task.Run` con `Task.Delay(10000)`
2. Por cada imagen del array `Ine`: normaliza el mime (`jpeg` se mantiene, cualquier otro pasa a `jpg`) y llama a `SaveCompressedFile` con índice incremental
3. Fuerza `Selfie.Mime = "jpg"`
4. `SaveSelfieImageForCredit` → `INSERT` a `MAVI_DOC_CTE` con `TIPO_DOC='14'`, `IDAPLICACION=7`, `FORMATO='IMG'`
5. `SaveCompressedFile` escribe en `C:\inetpub\wwwroot\api\images\credit\{Name}_{index}.{mime}`
6. `CompressBytesFromBase64Image`: baja la calidad JPEG de 90 en pasos de 10 hasta que el resultado pese ≤ 1 MB o llegue a 20

### Objetos de BD
| Objeto | Operación | Columnas |
|---|---|---|
| `MAVI_DOC_CTE` | INSERT | `TIPO_DOC`, `CLAVE`, `DIR`, `FECHA`, `DOCUMENTO`, `ESTATUS`, `IDAPLICACION`, `FORMATO` |

### Request — `SaveImagesRequest`
```json
{
  "Account": "C00123456",
  "Ine": [
    { "Name": "INE_FRONTAL", "Data": "/9j/4AAQ...", "Mime": "jpeg" },
    { "Name": "INE_REVERSO", "Data": "/9j/4AAQ...", "Mime": "png" }
  ],
  "Selfie": { "Name": "SELFIE", "Data": "/9j/4AAQ...", "Mime": "jpg" },
  "PruebaDeVida": null
}
```

### Response
```json
true
```
En excepción: `"false"` (string, resultado de `JsonConvert.SerializeObject(false)`).

> ⚠️ **El response no refleja el resultado real.** Se responde antes de procesar; si la compresión o el INSERT fallan, el cliente ya recibió `true`.

---

# GRUPO D · Servicios externos y sin BD

## 08 · `customerService/bbvaKeyAdvanced`

| | |
|---|---|
| **URL DMZ** | `POST /customerService/bbvaKeyAdvanced` → `CustomerServiceController.cs:267` |
| **URL LAN** | `GET /customerService/bbvaKeyAdvanced` → `CustomerServiceController.cs:159` |
| **Conexión** | SOAP externo — `MULTIPAGOS_APIKEY_URL` = `http://172.16.215.51:3024/WSeCommerceMX.asmx` |

### Cadena de métodos
```
CustomerServiceController.GetBBVAKeyAdvanced   (LAN CustomerServiceController.cs:159)
└─ CustomerServiceMethods.GetBBVAKeyAdvanced   (CustomerServiceMethods.cs:1124)  [static]
```

### Flujo
1. Arma el sobre SOAP con `<Acso><codigoent>{CODIGO_ENT}</codigoent></Acso>` en el header
2. `POST` con RestSharp · headers `Content-Type: text/xml; charset=utf-8` y `SOAPAction: "http://WSeCommerceMX.asmx/GetMasterSeguridad"`
3. Si el status no es 200 → devuelve `"Ocurrio un error"`
4. Parsea el XML y extrae `GetMasterSeguridadResult`
5. El controlador valida que la respuesta no contenga `"null"`; si lo contiene → `400`

### Objetos de BD
Ninguno. Es 100% servicio externo.

### Request
Sin body.

### Response
```json
"A3F5D9E1C7B24086AF31D2E5C904B7A8"
```
String plano con la llave. `400 BadRequest` con `"BBVA key not found."` si viene `null`.

---

## 09 · `status/getStatus`

| | |
|---|---|
| **URL DMZ** | `POST /status/getStatus` → `StatusController.cs:12` |
| **URL LAN** | `GET /status/getStatus` → `StatusController.cs:12` |
| **Conexión** | Ninguna — `Ping` ICMP a `172.16.202.2` |

### Cadena de métodos
```
StatusController.GetStatus   (LAN StatusController.cs:12)   ← lógica inline, sin método de negocio
```

### Flujo
1. `new Ping().Send("172.16.202.2")`
2. `pingable = reply.Status == IPStatus.Success`
3. Captura `PingException` y la descarta
4. Si no responde → texto de error; si responde → `true`

### Objetos de BD
Ninguno. ⚠️ `172.16.202.2` es el servidor de Intelisis — tras la migración este health-check apunta al lugar equivocado.

### Request
Sin body.

### Response
```json
true
```
o bien:
```json
"No se tiene conexion con la base de datos"
```

---

# GRUPO E · Filesystem y SMB

## 10 · `product/obtenerImagen` *(interno — no pasa por la DMZ)*

| | |
|---|---|
| **URL LAN** | `POST /product/obtenerImagen` → `ProductsController.cs:216` |
| **Conexión** | Impersonación Windows + SMB |

### Cadena de métodos
```
ProductsController.obtenerImagen        (LAN ProductsController.cs:216)
└─ ProductImage.Methods.getImages       (ProductImage/Methods.cs:388)
   └─ Impersonation (ctor / Dispose)    (ProductImage/Methods.cs:421, 437)
      └─ LogonUser (advapi32.dll)       (ProductImage/Methods.cs:413)
```

### Flujo
1. Abre contexto de impersonación con `GRUPOMAVI\auxsvrwea05qai`
2. `File.Exists(@"\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\{original}")`
3. Si existe → `File.Copy` a `C:\inetpub\wwwroot\api\images\{magento}`
4. Si no existe **no hace nada y aun así devuelve `"Ok"`**
5. `Dispose` revierte la impersonación

### Objetos de BD
Ninguno.

### Request — `ImageProduct`
```json
{ "magentoName": "ADTE00001_1.jpg", "originalName": "ADTE00001_FRONTAL.jpg" }
```

### Response
```json
"Ok"
```
En excepción devuelve el `ex.Message` como string.

> ⚠️ `"Ok"` no garantiza que el archivo se haya copiado — solo que no hubo excepción.

---

## 11 · `customer/cashCustomerReport`

| | |
|---|---|
| **URL DMZ** | `POST /customer/cashCustomerReport` → `CustomersController.cs:108` |
| **URL LAN** | `POST /customer/cashCustomerReport` → `CustomersController.cs:109` |
| **Conexión** | Filesystem + SMB con impersonación |

### Cadena de métodos
```
CustomersController.CreateCashReport   (LAN CustomersController.cs:109)
└─ CustomerMethods.CreateCashReport    (CustomerMethods.cs:194)
   └─ ProductImage.Impersonation       (ProductImage/Methods.cs:421)
```

### Flujo
1. Valida que `fileContent` y `fileName` no estén vacíos → si lo están, `status 400`
2. `Directory.CreateDirectory(@"C:\inetpub\wwwroot\files\")`
3. `Convert.FromBase64String(fileContent)` → `File.WriteAllBytes`
4. Bajo impersonación: `File.Copy` a `\\172.16.200.2\mavica\ecom\BaseWhatsapp\STAGE\{fileName}` con `overwrite: true`
5. Cualquier excepción → `status 500` con el mensaje

### Objetos de BD
Ninguno.

### Request — `CustomerReportRequest`
```json
{ "fileName": "reporte_contado_20260730.xlsx", "fileContent": "UEsDBBQABgAIAAAAIQ..." }
```

### Response — `ApiResponse`
```json
{ "status": 200, "message": "Se ha generado la descarga del Reporte." }
```
| status | message |
|---|---|
| 200 | `"Se ha generado la descarga del Reporte."` |
| 400 | `"Petición incorrecta, verifica los campos."` |
| 500 | `"Error al crear el reporte: {ex.Message}"` |

---

# GRUPO F · Passthrough a Magento vía DMZ

## 12 · `customer/getCuenta` *(interno)*

| | |
|---|---|
| **URL LAN** | `POST /customer/getCuenta` → `CustomersController.cs:91` |
| **Conexión** | HTTP a la DMZ (`URL_DMZ`) → `magento/getCuenta` → Magento REST |

### Cadena de métodos
```
CustomersController.GetCuenta   (LAN CustomersController.cs:91)
└─ Magento.getCuenta            (Conn/Magento.cs:309)
   └─ Curl.Post                 (Helper/Curl.cs:79)
      └─ Curl (ctor)            (Helper/Curl.cs:25)   ← autentica contra URL_DMZ + USER_DMZ
```

### Flujo
1. El ctor de `Curl` hace `POST login/authenticate` a la DMZ y guarda el token
2. Serializa `CustomerIntelisis` con `NullValueHandling.Ignore`
3. `POST magento/getCuenta` con `Authorization: {token}`
4. **Post-procesa la respuesta**: `.Replace("\\\"", "\"").Replace("\\\\\"", "\"").Trim('"')` — conservar al portar

### Objetos de BD
Ninguno del lado LAN.

### Request — `CustomerIntelisis`
```json
{ "nuevaCuenta": "C00123456", "correoCuenta": "cliente@correo.com", "idCliente": "8842" }
```

### Response
```json
"C00123456"
```
String plano devuelto por Magento.

## 13 · `customer/setCuenta` *(interno)*
Idéntico al 12, con `Magento.setCuenta` (`Conn/Magento.cs:319`) y ruta `magento/setCuenta`.

---

## 14 · `product/updateProductJsonOnly` *(interno)*

| | |
|---|---|
| **URL LAN** | `POST /product/updateProductJsonOnly` → `ProductsController.cs:120` |
| **Conexión** | SQLite `data.db` + HTTP a la DMZ |

### Cadena de métodos
```
ProductsController.updateProductsJsonOnly       (LAN ProductsController.cs:120)
└─ ProductMethods.BuildJsonAndSend("viu")       (ProductMethods.cs:1839)
   ├─ TagsMethods.GetTags                       (TagsMethods.cs:161)      → SQLite tags
   ├─ ProductMethods.getParentAndAddTipo        (ProductMethods.cs:43)    → SQLite products
   ├─ ProductMethods.GetChildTag                (ProductMethods.cs:63)    → SQLite products, tags
   ├─ ProductMethods.GetImages                  (ProductMethods.cs:164)   → SQLite product_images
   ├─ ProductMethods.GetStores                  (ProductMethods.cs:176)   → SQLite products
   ├─ ProductMethods.GetAttributeSetId          (ProductMethods.cs:199)   → SQLite attribute_sets
   ├─ ProductMethods.GetCategoryId              (ProductMethods.cs:218)   → SQLite categories
   ├─ ProductMethods.ExistAttribute             (ProductMethods.cs:267)   → SQLite attributes
   ├─ ProductMethods.GetFiltrableColor          (ProductMethods.cs:280)   → SQLite attribute_options
   ├─ ProductMethods.GetAttributeValueId        (ProductMethods.cs:312)   → SQLite attribute_options
   ├─ ProductMethods.GetAttributeId             (ProductMethods.cs:335)   → SQLite attributes
   ├─ ProductMethods.GetChild                   (ProductMethods.cs:348)   → SQLite children
   ├─ ProductMethods.GetAndSavePrice            (ProductMethods.cs:361)   → SQLite products
   ├─ ProductMethods.isInMagento                (ProductMethods.cs:385)   → SQLite product_in_stores
   ├─ ProductMethods.GetWarranty                (ProductMethods.cs:398)   → SQLite warranties
   ├─ ProductMethods.GetWebsites                (ProductMethods.cs:435)   → SQLite products
   ├─ ProductMethods.IsMayoristaOrElite         (ProductMethods.cs:457)   → SQLite products
   └─ Curl.Post("product/updateProduct/{store}")                          → DMZ → Magento
└─ ProductMethods.BuildJsonAndSend("muebles_america")
└─ ProductMethods.BuildJsonAndSend("mavi")
```

### Flujo
1. Se ejecuta 3 veces, una por tienda
2. Lee la tabla `products` de SQLite (poblada previamente por `exporta_art`, que **sí lee de Intelisis**)
3. Por cada SKU arma el JSON de Magento resolviendo atributos, categorías, precios, garantías y etiquetas contra SQLite
4. Envía por lotes a `product/updateProduct/{store}` en la DMZ
5. Registra cada lote con `Logger.ProductImport`

### Objetos de BD
Solo SQLite: `products` · `product_images` · `product_in_stores` · `attribute_sets` · `attributes` · `attribute_options` · `categories` · `children` · `warranties` · `tags`

### Request
Sin body.

### Response
```json
"ok"
```
String fijo. **No refleja si el envío a Magento tuvo éxito** — los errores solo quedan en el log.

---

## 15 · `product/updateConfigurableProduct` *(interno)*

| | |
|---|---|
| **URL LAN** | `POST /product/updateConfigurableProduct` → `ProductsController.cs:145` |
| **Conexión** | SQLite + HTTP a la DMZ |

### Cadena de métodos
```
ProductsController.updateConfigurableProducts        (LAN ProductsController.cs:145)
├─ Magento.deleteChildren                            (Conn/Magento.cs:253)  → DELETE SQLite children
├─ Magento.getChildren("all")                        (Conn/Magento.cs:260)  → GET DMZ + INSERT children
├─ Magento.getChildren("viu")
├─ Magento.getChildren("muebles_america")
├─ ProductMethods.BuildJsonAndSendConfigurable("viu")             (ProductMethods.cs:1407)
└─ ProductMethods.BuildJsonAndSendConfigurable("muebles_america")
```
`BuildJsonAndSendConfigurable` usa los mismos 17 auxiliares del endpoint 14.

### Flujo
1. Vacía la tabla `children` en SQLite
2. Por cada store pagina contra `magento/children/{page}/1000/{store}` en la DMZ y va insertando en `children`
3. Arma el JSON de productos configurables con sus variaciones
4. Envía a `product/updateConfigurableProduct/{store}` y `product/updateConfigurableProductLink/{sku}`

### Objetos de BD
Solo SQLite, mismos que el 14 más `children` (DELETE + INSERT).

### Request
Sin body.

### Response
```json
"ok"
```

---

# GRUPO G · Con Intelisis

## 16 · `credit/CreditoWeb_FormDatos`

| | |
|---|---|
| **URL DMZ** | `POST /credit/CreditoWeb_FormDatos` → `CreditController.cs:142` |
| **URL LAN** | `POST /credit/CreditoWeb_FormDatos` → `CreditController.cs:145` |
| **Conexión** | **Bifurcada** — SQLite o `sCadenaConexion` (Intelisis) |

### Cadena de métodos
```
CreditController.CreditoWeb_FormDatos              (LAN CreditController.cs:145)
├─ [si op ∈ los 6 con caché]
│  └─ CredyPrestamoMethods.GetCredilanaInfo<List<List<string>>>   (CredyPrestamoMethods.cs:833)  → SQLite
└─ [cualquier otro op]
   └─ CreditMethods.CreditoWeb_FormDatos           (CreditMethods.cs:677)  → Intelisis
      └─ SP_CREDITO_WEB_VALORES_FORM
```

### Ruteo por `op`
| `op` | Destino | Field SQLite |
|---|---|---|
| `GetAnioMes` | SQLite | `antiguedad_domiciliaria` |
| `EstadosMA` | SQLite | `estados_ma` |
| `EstadosVIU` | SQLite | `estados_viu` |
| `DelegacionMA` | SQLite | `municipios_ma_{search.ToLower()}` |
| `DelegacionVIU` | SQLite | `municipios_viu_{search.ToLower()}` |
| `GetAtencionClientes` + `search="CREDILANA MX"` | SQLite | `atencion_clientes_credilana` |
| `GetAtencionClientes` + `search="APERTURA CUENTA"` | SQLite | `atencion_clientes_apertura` |
| `Bonificacion` y cualquier otro | **Intelisis** | — |

### Objetos de BD
**Rama SQLite**: `mavi_credilana_info`
**Rama Intelisis**: `SP_CREDITO_WEB_VALORES_FORM` — 83 objetos referenciados, documentados en el briefing (PARTE 4). Ejecuta `spAfectar`, mueve monedero, consulta buró.

### Request — `FormDatos`
```json
{ "op": "EstadosMA", "search": "", "uen": 1 }
```

### Response
Array de arrays de strings. Cada fila interna es un registro y cada elemento una columna, **sin nombres**:
```json
[
  ["AGUASCALIENTES"],
  ["BAJA CALIFORNIA"],
  ["CAMPECHE"],
  ["CHIAPAS"]
]
```
Para `GetAnioMes`:
```json
[["1"],["2"],["3"],["4"],["5"]]
```
Para `GetAtencionClientes`:
```json
[["CREDILANA MX", "8007700700", "L-V 9:00 a 18:00"]]
```

> ⚠️ El contrato no tiene nombres de campo. El consumidor depende del **orden posicional**, que lo define el SP. Al migrar hay que preservarlo exactamente.

---

## 17 · `credit/CreditoWeb_Informacion`

| | |
|---|---|
| **URL DMZ** | `POST /credit/CreditoWeb_Informacion` → `CreditController.cs:335` |
| **URL LAN** | `POST /credit/CreditoWeb_Informacion` → `CreditController.cs:289` |
| **Conexión** | **Bifurcada** — SQLite o Intelisis |

### Cadena de métodos
```
CreditController.CreditoWeb_Informacion            (LAN CreditController.cs:289)
├─ [op="banco" + search="BINESBANCARIOS"]      → GetCredilanaInfo → SQLite  bancos_bines
├─ [op="banco" + search="INSTITUCIONESUC"]     → GetCredilanaInfo → SQLite  bancos_instituciones
├─ [op="GeLeyendaCatDimas"]                    → GetCredilanaInfo → SQLite  leyenda_dimas
└─ [cualquier otro op]
   └─ CreditMethods.CreditoWeb_Informacion      (CreditMethods.cs:1191)
      ├─ [si op="CteInfo"]
      │  └─ CreditMethods.NombreCliente         (CreditMethods.cs:1809)
      │     ├─ FNVTASValidarEmpleado            → si devuelve valor, aborta con "false"
      │     └─ SELECT sobre Cte + CteEnviarA
      │        └─ CreditMethods.HideNames       (CreditMethods.cs:1923)
      ├─ SPCREDICredilana
      └─ [si op="CteInfo"] query inline sobre CREDIDCuentaCLABEDispersion
```

### Flujo cuando `op = "CteInfo"`
1. `NombreCliente(search, uen)`:
   - `SELECT dbo.FNVTASValidarEmpleado(@Cliente)` — si devuelve algo, es empleado → retorna `"false"` y el método corta con lista vacía
   - Consulta `Cte` + `CteEnviarA` filtrando `ID IN (3,76)` si uen=1 o `IN (7)` si uen=2, `Categoria='CREDITO MENUDEO'`, `Estatus='ALTA'`
   - Enmascara nombres con `HideNames`
2. Ejecuta `SPCREDICredilana`
3. Query inline: busca la última CLABE de dispersión con `ValidacionTD=4`; si no hay, pone `"****"` en la posición 2 y vacío en la 3

### Objetos de BD
**Rama SQLite**: `mavi_credilana_info`
**Rama Intelisis**:
| Objeto | Tipo |
|---|---|
| `SPCREDICredilana` | SP — 31 objetos referenciados, ejecuta `spAfectar` |
| `CREDIDCuentaCLABEDispersion` | Tabla — `CuentaCLABE`, `InstitucionBancaria`, `Cliente`, `ValidacionTD`, `FechaCapturaModificacion` |
| `CREDICConfiguracionSTP` | Tabla — `Clave`, `Participante` |
| `dbo.FnVTASMuestraCuatro` | Función escalar |
| `dbo.FNVTASValidarEmpleado` | Función escalar |
| `Cte` | Tabla — `PersonalNombres`, `PersonalApellidoPaterno`, `PersonalApellidoMaterno`, `Cliente`, `Estatus` |
| `CteEnviarA` | Tabla — `Cliente`, `ID`, `Categoria` |

### Request — `FormDatos`
```json
{ "op": "banco", "search": "BINESBANCARIOS", "uen": 0 }
```

### Response
Array de arrays. Para `banco`:
```json
[
  ["012", "BBVA MEXICO"],
  ["014", "SANTANDER"],
  ["021", "HSBC"],
  ["072", "BANORTE"]
]
```
Para `CteInfo` (posiciones 2 y 3 sobrescritas por el query inline):
```json
[["JU** PE***", "C00123456", "****1234", "BBVA MEXICO"]]
```
Si es empleado o no hay coincidencia:
```json
[]
```

---

## 18 · `credit/ExistRFCAndPhoneCte`

| | |
|---|---|
| **URL DMZ** | `POST /credit/ExistRFCAndPhoneCte` → `CreditController.cs:383` |
| **URL LAN** | `POST /credit/ExistRFCAndPhoneCte` → `CreditController.cs:376` |
| **Conexión** | **Ninguna hoy** — neutralizada |

### Cadena de métodos
```
CreditController.ExistRFCAndPhoneCte      (LAN CreditController.cs:376)
└─ CreditMethods.ExistRFCAndPhoneCte      (CreditMethods.cs:1414)
   ├─ CreditMethods.CURPValidation        (CreditMethods.cs:1423)  ← return incondicional en :1426
   └─ CreditMethods.RFCValidation         (CreditMethods.cs:1494)  ← return incondicional en :1496
```

### Flujo real hoy
1. `CURPValidation` retorna en su primera línea `{ Error = false, Message = "No se encontraron solicitudes pendientes." }`
2. Como `Error == false`, se ejecuta `RFCValidation`
3. `RFCValidation` retorna en su primera línea `{ Error = false, Message = "Puede continuar con la solicitud." }`
4. **Nunca se abre ninguna conexión.** Todo el SQL posterior es inalcanzable

### Objetos de BD si se reactivara
| Objeto | BD | Consultas |
|---|---|---|
| `Cte` | IntelisisTmp | 4 (CURP, RFC, RFC+tel, RFC+canal) |
| `CteTel` | IntelisisTmp | 1 |
| `CteEnviarA` | IntelisisTmp | 1 |
| `Venta` | IntelisisTmp | 1 |
| `MOVBITACORA` | IntelisisTmp | 1 |
| `Personal` | Comercializadora | 1 — *además está comentada* |

### Request — `ExistRFCAndPhoneCteRequest`
```json
{ "Rfc": "PELJ850312", "Phone": "3312345678", "Curp": "PELJ850312HJCRPN04", "Uen": 1 }
```

### Response — `ValidationTypeError`
```json
{ "Error": false, "Message": "Puede continuar con la solicitud." }
```
**Siempre responde esto.** Mensajes que devolvería si estuviera activa:

| Error | Message |
|---|---|
| `true` | `"Ya existe un registro con esta CURP."` |
| `true` | `"Hay una solicitud pendiente dentro del plazo establecido."` |
| `true` | `"Ya existe una cuenta o prospecto con estos datos."` |
| `true` | `"Ocurrio un error con el servidor, intentalo más tarde."` |
| `false` | `"No se encontro registros con el RFC {rfc}."` |
| `false` | `"No existen coincidencias con el RFC: {rfc} y el Telefono: {phone}."` |

---

# ANEXO · Resumen de conexiones por endpoint

| # | Endpoint | ServicioAndroid | AdminDoc | SQLite | SMB | HTTP ext. | **Intelisis** |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 01 | `credit/SendSmsNewNumber` | ✔ | | | | | |
| 02 | `credit/SolicitudMercancia` | ✔ | | | | | **✔** |
| 03 | `customerService/obtenerQuejas` | ✔ | | | | | |
| 04 | `order/getGuide` | | | ✔ | | | |
| 05 | `credit/GetCreditAmounts` | | | ✔ | | | |
| 06 | `credit/guardardocumento` | | ✔ | | | | |
| 07 | `credit/SaveImagesProductosMx` | | ✔ | | ✔ | | |
| 08 | `customerService/bbvaKeyAdvanced` | | | | | ✔ | |
| 09 | `status/getStatus` | | | | | | |
| 10 | `product/obtenerImagen` | | | | ✔ | | |
| 11 | `customer/cashCustomerReport` | | | | ✔ | | |
| 12 | `customer/getCuenta` | | | | | ✔ | |
| 13 | `customer/setCuenta` | | | | | ✔ | |
| 14 | `product/updateProductJsonOnly` | | | ✔ | | ✔ | |
| 15 | `product/updateConfigurableProduct` | | | ✔ | | ✔ | |
| 16 | `credit/CreditoWeb_FormDatos` | | | ✔ | | | **✔** |
| 17 | `credit/CreditoWeb_Informacion` | | | ✔ | | | **✔** |
| 18 | `credit/ExistRFCAndPhoneCte` | | | | | | *(inalcanzable)* |

# ANEXO · Responses que no reflejan el resultado real

Al migrar hay que decidir si se replica el comportamiento o se corrige — **coordinar con el equipo de Magento en cualquiera de los dos casos**.

| Endpoint | Problema |
|---|---|
| `credit/SaveImagesProductosMx` | Responde `true` antes de procesar; el trabajo real corre en `Task.Run` con 10 s de delay |
| `product/obtenerImagen` | Devuelve `"Ok"` aunque el archivo origen no exista |
| `product/updateProductJsonOnly` | Devuelve `"ok"` fijo, sin importar si Magento aceptó los productos |
| `product/updateConfigurableProduct` | Igual que el anterior |
| `customerService/obtenerQuejas` | En error devuelve el `ex.Message` como string, con status 200 |
| `credit/ExistRFCAndPhoneCte` | Siempre "puede continuar": la validación está neutralizada |
| `credit/SolicitudMercancia` | Devuelve `"0"` tanto si el cliente no existe como si el INSERT no afectó filas |
