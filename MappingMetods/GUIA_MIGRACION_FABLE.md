---
tags: [migracion, sap, fable, guia-desarrollo]
fecha: 2026-09-10
estado: vigente
---

# Guía de migración LAN → DMZ → ServicioSAP

> [!abstract] Para qué sirve este documento
> Es la **referencia de desarrollo** para migrar el backend de e-commerce de MAVI a S/4HANA, pensada para ser consumida directamente por Fable 5.1. Unifica los tres proyectos:
>
> | Proyecto | Rol | Destino |
> |---|---|---|
> | **LAN** (`WebApiMagento`) | legacy | **se apaga** |
> | **ServicioSAP** (`ServicioSap`) | reemplazo de LAN, adaptado | crece |
> | **DMZ** (`WebApiMagento`) | puente entre Magento y el backend | se mantiene, se repunta |
>
> La auditoría con la evidencia cruda vive en [[AUDITORIA_INTEGRAL_LAN_DMZ_SAP]]. Este documento es el **qué hacer**; ese es el **por qué**.

> [!warning] Cómo leer este documento
> Cada afirmación lleva su nivel de respaldo. **No trates una `⚠️ por validar` como si fuera un hecho.**
>
> - ✅ **verificado en código** — hay `archivo:línea` que lo prueba
> - 📄 **respaldado por ficha RSG** — la ficha lo declara a nivel de contrato OData
> - 🔬 **verificado con response real** de SAP
> - ⚠️ **por validar** — falta consumir la OData o falta una decisión de negocio
> - ❌ **refutado** — se reportó y se cayó; no volver a levantarlo

---

## 1. Reglas no negociables

Estas reglas ya costaron errores en el análisis. Romperlas produce código que no compila, que apunta al sistema equivocado o que rompe a Magento.

### 1.1 Resolución de URLs por tipo de destino ✅

**El destino lo determina el resolvedor que usa el código, no la naturaleza del dato.**

| Constante | Destino real | Se resuelve con |
|---|---|---|
| S/4HANA OData | `https://vhmvods4ci.sap.svrwes4h.com:44300/sap/opu/odata/sap` | `Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL)` |
| `URL_ANDROID_API` | `https://android-api.mavi.fun` | `ConfigurationManager.AppSettings` |
| `URL_BP_API` | `https://businesspartner-api.mavi.fun` | `ConfigurationManager.AppSettings` |
| `URL_SALES_DISTRIBUTION_API` | `https://salesanddistribution-api.mavi.fun` | `ConfigurationManager.AppSettings` |
| `VETA_URL_LIBERADOR` | `http://172.16.215.51:3026/api/venta` | `ConfigurationManager.AppSettings` |
| `AwsBaseUrl` | `https://54wblyc2h6.execute-api.us-east-1.amazonaws.com/` | `ConfigurationManager.AppSettings` |
| `SQLITE_DB_PATH` | `C:\inetpub\wwwroot\sap\` | `ConfigurationManager.AppSettings` |
| `IMAGES_CREDIT_PATH` | `C:\inetpub\wwwroot\sap\images\credit` | `ConfigurationManager.AppSettings` |
| Servidor IIS | `172.16.215.64` (on-premise) | — |
| Mandante | **110** (QA) | `sap-client=110` |

- **Web.config es la fuente correcta** para todo lo que no es S/4HANA. Es diseño, no deuda.
- **S/4HANA es la excepción**: sale de `obtenerUrl` (`ConexionSap.dll`), nunca de `conf.ini` ni del Web.config.
- **`obtenerUrl` NO devuelve barra final.** Termina en `.../sap/opu/odata/sap`, así que **la barra la aporta el path del servicio**: `obtenerUrl(...) + "/ZAPI_XXX_SRV/EntitySet?..."`.
- **OData v4**: `.Replace("/odata/sap", "/odata4/sap")`. Nunca escribir el prefijo a mano.
- **Prohibido**: URLs de **CPI** (`*.hana.ondemand.com`) y de **ABAP/Gateway directo** (`host:8000`). Aparecen en las fichas RSG porque son el modelo de integración del **POS** (`POS → BAS → CPI → CAR → S/4HANA`), que no es el nuestro. Las APIs `*.mavi.fun`, AWS y el liberador **no son CPI**: son destinos legítimos.

> [!tip] Dos URLs de AWS que son la misma API
> `54wblyc2h6/AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=` (la del código) y `nibj6m7t0l/AI_GET_CCatalogo?nombre_catalogo=` (la que sale en la documentación) **devuelven lo mismo**. No son dos servicios ni hay uno obsoleto. Resolver siempre por `AwsBaseUrl`.

### 1.2 Autenticación por destino ✅

| Destino | Cabecera | Cómo |
|---|---|---|
| S/4HANA | `Authorization: Basic` | `TokenGenerator.CreateClientS4()` |
| APIs MAVI / AWS | ninguna hoy | `TokenGenerator.CreateClientExternal()` |
| DMZ / Magento / liberador | `Authorization: Bearer` | token propio |

**Un `Bearer` apuntando a una URL de S4 es un defecto**, no una variante. Y **jamás** usar `CreateClientS4()` para hablar con AWS o con una API MAVI: filtra las credenciales del usuario de servicio de SAP a un tercero.

### 1.3 Paths de servicio en Web.config ✅

Cinco servicios tienen su path externalizado para no exponer la URL en el código: `ZAPI_SALESORDER_SRV`, `ZAPI_CAMPANA_BONIFICACION_SRV`, `ZAPI_EX01_NOCOMP_SRV`, `ZAPI_TZ01_ZSPLIT_MERC`, `ZAPI_CONDPAGO`.

**Al leerlos, normaliza la barra inicial** — las cinco llaves no comparten convención:

```csharp
string servicePath = ConfigurationManager.AppSettings["ZAPI_SALESORDER_SRV"];
if (!string.IsNullOrEmpty(servicePath) && !servicePath.StartsWith("/"))
    servicePath = "/" + servicePath;
```

Si necesitas la **raíz del servicio** (por ejemplo para el *fetch* de CSRF), **derívala del mismo valor**, no la escribas a mano:

```csharp
string serviceRoot = servicePath.Substring(0, servicePath.LastIndexOf('/') + 1);
```

### 1.4 Nomenclatura trazable DMZ → ServicioSAP ✅

- **Orquestador** (el que invoca el controlador) → **se nombra igual que la ruta que el DMZ consume**: `order/cancelOrder` → `CancelOrderAsync`.
- **Pasos internos** → se nombran por la operación SAP: `PostCancelInvoiceAsync` (SD48), `PostReverseGoodsIssueAsync` (SD46).
- **Prohibido** que el orquestador lleve un nombre técnico de SAP que no exista como concepto en el DMZ.
- **Prohibido** reutilizar un orquestador para dos rutas con un flag de modo.

### 1.5 El DMZ es un puente, no una capa de validación ✅

**El DMZ recibe y devuelve lo que ServicioSAP ya estructuró.** No interpreta, no traduce tipos, no decide status codes.

Corolario: **ServicioSAP devuelve el resultado de negocio en el cuerpo con HTTP 200**, no en el status code. `Curl.PostSAP` no propaga el status — y eso es correcto bajo este diseño, porque nunca lo necesita.

### 1.6 Asincronía ✅

- Cero `async void`. Cero `.GetAwaiter().GetResult()`, `.Result`, `.Wait()`.
- **`Methods/` y `Helpers/`** (librería): **siempre** `.ConfigureAwait(false)`.
- **`Controllers/`** (acciones Web API): **nunca** — la acción puede necesitar `HttpContext` después del `await`.
- Acceso a datos con **ADO.NET clásico** y sus pares async (`OpenAsync`, `ExecuteReaderAsync`, `ReadAsync`). **Entity Framework está prohibido.**
- Conexiones **solo** desde `Helpers/ConexionDB/ConexionSQL.cs` y `SQLiteDb.cs`.

### 1.6a Un `HttpClient` por petición a SAP — es diseño, NO deuda ✅

> [!danger] No "optimizar" esto con un cliente estático compartido
> Parece un antipatrón (53 de 56 call sites de `CreateClientS4()` no liberan el cliente) y **no lo es**. Cambiarlo rompe el modelo de seguridad de SAP.

El token **CSRF de S/4HANA es único por petición**, y está **ligado a la cookie de sesión** del `CookieContainer` de ese cliente. El patrón obligatorio es:

```csharp
var apiService = TokenGenerator.CreateClientS4();   // handler + CookieContainer NUEVOS
var csrfToken  = await TokenGenerator.GetTokenSapAsync(apiService, serviceUrl).ConfigureAwait(false);
request.Headers.Add("X-CSRF-Token", csrfToken);     // la escritura usa ESE token, en ESE cliente
```

`CreateClientS4()` crea `new HttpClientHandler { UseCookies = true, CookieContainer = new CookieContainer() }` **a propósito**: el contenedor nuevo por llamada es lo que hace que el token pertenezca **exclusivamente** a esa petición.

**Compartir el cliente compartiría el contenedor de cookies**, y el token dejaría de ser exclusivo. **No se puede reutilizar un token entre peticiones.** Por eso está así en **todas** las llamadas a SAP, y así debe quedarse.

### 1.6b Fuera de alcance: la APP mercancías ✅

Todo lo que corresponde a la **APP mercancías** pertenece a **otro proyecto** y **no se toma en cuenta**. Si se requiere migrar algo de esa parte, se notificará explícitamente.

**Ojo con la ambigüedad**: la exclusión es de la **app**, no de la palabra "mercancías". Siguen **dentro** de alcance, porque son conceptos de documento de SAP:

- `zsb_ntz01_zsplit_merc` / `z_srvb_tz01_zsplit` — parcialidades de **mercaderías** (fuente de saldos, §6.2)
- **SD46** — anulación de salida de **mercancías**
- `Zconcepto = "Pedido de mercancias"` en el cuerpo del pedido

Caso concreto identificado de la app: la ruta del DMZ **`mercancias/getSaldoVencido`**, que hoy sigue apuntando a LAN. **No migrar.**

### 1.7 Descomposición de la UEN ✅ 📄

La UEN de LAN se descompone en **dos** conceptos, no tres:

| Concepto | Campo SAP | Valores |
|---|---|---|
| Organización de ventas | `SalesOrg` / `Vkorg` | `04` = MA · `05` = VIU |
| Canal de distribución | `DistrChan` / `Vtweg` | `01` = Contado · `02` = Crédito |

**`Division` / `Spart` es un TERCER concepto (Sector) que NO se deriva de la UEN.** Vale **`"00"`** — lo dicen `sd01:70` y `sd09:29`, y el propio alta de BP del proyecto usa `SpartKnvv="00"`.

> [!note] Sobre los ejemplos de body/response
> Los payloads de ejemplo traen `"SalesOrg": "01"` y `Vkorg: "01"`. Son **datos reales de QA para basarse en la forma**, no la especificación de esos campos. Los valores van dinámicos según la organización correcta.

---

## 2. Qué es evidencia válida

> [!danger] Esta sección existe porque cada regla de aquí corresponde a un error real cometido durante el análisis
> Si Fable las respeta, no repite esos errores.

### 2.1 Una API SAP existe solo si hay ficha con URL OData

No basta que un código `SDxx` aparezca en un diagrama. La presentación de arquitectura del POS es un **atlas de diagramas**: los `SDxx` sobre las flechas son **etiquetas de diagrama con coordenadas**, no un catálogo de APIs. `SD37`, `SD47` y `SD08` se reportaron como "APIs que solo les falta ficha" y **no existen**.

**Regla**: una API existe si hay `RSG/<código>_*.md` con nombre de servicio y EntitySet. Si no, es `SIN FICHA` y la equivalencia es **no confirmada**.

### 2.2 Nunca justifiques un mapeo con internals de tablas SAP ❌

De una ficha lo único válido es el **nivel de contrato OData**: nombre del servicio, EntitySet, **nombres de campo** y **payload de ejemplo de la respuesta**.

Las tablas y campos internos (`BSEG`, `DMBTR`, `ZUONR`, `SHKZG`, `VBAK`, `KNVV`) y las fórmulas de cómo SAP calcula un valor por detrás **no nos corresponden**. Consumimos el dato **como llega de la OData**.

**Corolario operativo**: si la pregunta es *"¿este campo OData equivale a este campo de LAN?"* y no se contesta comparando **nombres de campo o el payload de ejemplo**, entonces **no es análisis: es prueba E2E**. Se consume, se compara contra LAN, y **si difieren se reporta al usuario para que valide el dato real**.

### 2.3 El response real manda sobre la ficha 🔬

Las fichas están incompletas. Caso probado: se reportó que `ZDIAS_VENC` **no existe** porque no aparecía en la ficha de NTZ01. **Existe** — llega en el response real como `ZdiasVenc`, con valores de 179 a −158.

**Regla**: la ficha sirve para saber qué servicio llamar. Para saber qué campos hay, **manda el response**.

### 2.4 Los SP son fuente de análisis, no especificación ❌

Un SP legacy es **una implementación** de una necesidad, no la lista de cosas a construir. Ahora que la comunicación es con SAP, **buena parte de la aritmética del SP ya la resuelve SAP**.

**Método correcto**:
1. Partir de **lo que el consumidor realmente lee** (no de lo que el SP calcula — hay columnas muertas).
2. Ver qué **ya entrega la OData**.
3. Solo entonces, identificar lo que genuinamente falta.

Caso probado: el SP calcula moratorios con `Fn_MaviCalculaMoratorios`. **SAP ya devuelve `Zmoratorio`** en el response de NTZ01. La función no se necesita.

### 2.5 Nunca citar un resumen generado como evidencia primaria ❌

Los `.md` de resumen que produce el análisis **no son fuente**. Citarlos como prueba produjo la afirmación falsa de que SD37/SD47/SD08 eran APIs reales. Fuente = código, ficha RSG, o response real.

---

## 3. Estado real de la integración

Derivado del código el **2026-09-10**, no de ningún CSV de seguimiento.

| Métrica | Valor |
|---|---|
| Rutas expuestas por el DMZ | **119** |
| Rutas expuestas por ServicioSAP | **92** en 19 controladores |
| Puentes DMZ → **ServicioSAP** (`PostSAP`/`GetSAP`/`PatchSAP`) | **23** |
| Llamadas DMZ → **LAN** (`Post`/`Get`) | **67** ← el trabajo que falta |
| Destinos roto (ruta inexistente) | **0** |

> [!info] Sobre `MAVIDMZSAPConexiones.csv`
> Es **referencia informativa** del universo de endpoints que el proyecto debe tener conectados. **No es un tracker de progreso y no se modifica.** El progreso real se deriva del código.

### 3.1 Paridad de respuestas: cómo se mide qué tan bien está mapeado cada endpoint

La medida es: **¿el DMZ recibe de ServicioSAP la misma respuesta que recibía de LAN?**

**15 en paridad · 8 rotos · de 23 puenteados.**

Los 8 rotos, por gravedad:

| Ruta | Qué pasa | Estado |
|---|---|---|
| `credit/getClienteFactura` | SAP devuelve `List<ZSplitDto>` (array); el DMZ hace `JObject.Parse`, que exige `{`. Un `[...]` — **incluso `[]`** — lanza. **500 siempre** | ✅ diagnóstico confirmado |
| `order/setOrder` → `order/new` | SAP reporta `Resultado="PedidoExistente"` con **HTTP 200**; LAN daba **409 Conflict**. Magento no distingue el duplicado | ✅ |
| `order/returnOrder` → `order/setreturn` | Devuelve objeto donde LAN devolvía `"Concluido"` | ✅ |
| `customer/setCustomer` → `partner/client` | Devuelve el `Client` completo; LAN devolvía **la cuenta** | ✅ |
| `customerService/GetAccountDebts` | LAN devolvía un `Hashtable` indexado por canal | ✅ |
| `customer/wallet/details` | tres defectos verificados | ✅ |
| `prospecto/recuperarcuenta` | la forma coincide; el campo `nombre` difiere (enmascarado) | ✅ |
| `credit/getPlazos` | roto **solo en la rama de error**; el éxito es idéntico | ✅ |

**Refutados — no volver a reportarlos** ❌: `customer/setCustomerList` y `customer/deleteCustomerList` **están en paridad**. SAP devuelve el mismo `"true"`/`""` que LAN, y el `Ok("Correcto")` fijo del DMZ descarta ese valor **igual desde los dos orígenes**. Es pérdida de información preexistente de LAN, no regresión de la migración.

### 3.2 Causa raíz común de los 8 rotos

> **Nadie fue dueño de la capa de traducción, y el TIPO de la respuesta nunca se trató como parte del contrato.**

ServicioSAP se escribió como API nueva que devuelve **formas nativas de SAP** (objetos anónimos, listas OData, nombres de campo SAP) mientras el DMZ se dejó como proxy. Los 8 son la misma falla en cuatro variantes, y la dominante es **escalar → objeto**.

**El arreglo es sistémico, no ocho parches**: cada controlador de ServicioSAP debe devolver **el vocabulario cerrado que el DMZ ya sabe leer**, con el resultado de negocio en el cuerpo y HTTP 200.

---

## 4. Cómo migrar un endpoint (procedimiento)

1. **Identificar el contrato del consumidor.** Abrir el método de LAN y ver **qué campos lee de verdad** el que arma la respuesta. Hay columnas muertas: en `credit/getClienteFactura`, el SP devuelve `Mov` y `FacturaMethods` **nunca la lee**.
2. **Determinar qué OData da cada campo.** Ficha RSG para saber el servicio; **response real** para saber los campos.
3. **Separar DATO de CÁLCULO.** Lo que SAP ya devuelve se consume. Lo que es aritmética pura se implementa en C#.
4. **Nombrar el orquestador como la ruta del DMZ** (§1.4).
5. **Devolver el mismo tipo y forma que devolvía LAN** (§3.2), con HTTP 200.
6. **Prueba E2E obligatoria**: documentar request enviado y response exacto recibido. Si un valor difiere del de LAN, **reportarlo para validar el dato real** — no ajustarlo por deducción.

---

## 5. Servicios OData en uso

Los que el código ya invoca, con su ficha cuando existe:

| Servicio | Ficha | Para qué |
|---|---|---|
| `ZAPI_SALESORDER_SRV` | 📄 sd01 | crear pedido (`A_SALES_ORDERSet`) |
| `ZAPI_DOCVTAS_CHECK_CDS` | 📄 sd36 | consultar documentos de venta |
| `ZAPI_EX01_NOCOMP_SRV` | 📄 ex01 | documentos no compensados (`DocNoCompSet`) |
| `zsb_ntz01_zsplit_merc` | 📄 ntz01 | parcialidades mercaderías (`zsplits`, **OData4**) |
| `z_srvb_tz01_zsplit` | 📄 tz01 | parcialidades Credilana (**OData4**) |
| `API_OUTBOUND_DELIVERY_SRV` | 📄 sd46 | anular salida de mercancías |
| `API_BILLING_DOCUMENT_SRV` | 📄 sd48 | anular factura |
| `ZAPI_ARTICULOS_SRV` | 📄 dm01 | artículos (`Articulos`) |
| `ZCDS_DIM11_EXISTENCIA_CDS` | 📄 dim11 | existencias |
| `ZAPI_BP01_PARTNER_SRV` | 📄 bp01/bp02 | alta y modificación de BP |
| `ZB_DATOS_CLIENTE_CDS` | 📄 bp05 | consulta de cliente |
| `ZAPI_PROPRELIST_SRV` | 📄 sd29 | lista de precios |
| `ZAPI_CAMPANA_BONIFICACION_SRV` | 📄 sd33 | bonificaciones |
| `ZAPI_SUCURSALES_SRV` | 📄 dm07 | sucursales |
| `ZAPI_ZMMT_ETIQUETA_SRV` | 📄 dm05 | etiquetas |
| `ZAPI_CONDITIONCONTRACT_SRV` | 📄 sd18 | contratos de condición |
| `ZAPI_SD52_PARTNER_SRV` | ⚠️ sin ficha | **consulta** de canal de venta del cliente |
| `ZAPI_VENTAS_SRV` | ⚠️ sin ficha | "PV02 Ventas" |
| `ZAPI_CTACLBSTP_SRV` | ⚠️ sin ficha | cuentas por cobrar / abonos |
| `ZAPI_BP05MA_SRV` | ⚠️ sin ficha | variante MA de BP05 |
| `Z_SRVB_MM_ART` | ⚠️ sin ficha | CRUD de `ArticuloSEO` |
| `ZFICRUD_COBREF_SRV` | ⚠️ sin ficha | cobros referenciados |
| `API_BUSINESS_PARTNER` | estándar SAP | BP estándar |

> [!warning] SD52 tiene dos endpoints distintos, no uno
> **Consulta** de canal de venta → `ZAPI_SD52_PARTNER_SRV/ZSD52_PARTNER_SRVSet` en **S/4HANA**.
> **Edición (POST)** del canal → `URL_ANDROID_API/AS_GET_ZQSD_EditarCliente_CanalVenta`.
> El método de consulta apuntaba al endpoint de edición y deserializaba con envoltorio OData `d.results` sin serlo. Corregido el 2026-09-10.

---

## 6. Caso trabajado: `credit/getClienteFactura`

Sirve como plantilla del procedimiento de §4.

### 6.1 Contrato del consumidor ✅

`FacturaMethods.cs` llena **16 escalares + una lista**. Esto es el requisito real, no las 20 columnas del SP:

| Campo | Origen en LAN |
|---|---|
| `facturaId` | columna `MovID` |
| `clienteIntelisis`, `importeVenta`, `saldoCapital`, `atraso`, `moratorios`, `adeudoTotal` | columnas homónimas |
| `liquidaConSolo` | columna `LiquidaCon` |
| `pagoPuntual`, `pagoNormal` | columnas homónimas |
| `pagoParaEstarCorriente` | columna `PagoCorriente` |
| `subtotal` | columna `Subtotal2` |
| `descuento` | columna `Descuento` |
| `promocion` | `CodigoPromo`, o `"0"` si viene vacía (**siempre viene vacía**) |
| `costoEnvio` | el `Subtotal` del renglón donde `Articulo == 'SEGU00001'`, o `"0"` |
| `total` | **calculado en C#**: `subtotal + costoEnvio − descuento − promocion` |
| `articulos[]` | `sku`, `cantidad`, `descripcion`, `precio` por renglón |

Además: validación del cliente por regex **`^[C]{1}[0-9]{8}$}`**, y dos respuestas centinela **literales con HTTP 200**: `"No tiene facturas"` y `"El cliente es incorrecto"`.

> [!note] Columnas muertas del SP — no migrar
> `Mov` (el consumidor nunca la lee) y `@TotIVA`. Y LAN **sobreescribe `subtotal`** con una segunda consulta después del SP.

### 6.2 Qué ya entrega SAP 🔬

Verificado contra response real de `zsb_ntz01_zsplit_merc/zsplits` para `Vbeln eq '9000006302'` (12 parcialidades):

| Campo del consumidor | Fuente SAP | Valor observado |
|---|---|---|
| `saldoCapital` | `SUM(Zsaldo)` | 172.00 |
| `moratorios` | `SUM(Zmoratorio)` | **354.32 — SAP ya lo calcula** |
| `adeudoTotal` | `saldoCapital + moratorios` | 526.32 |
| `atraso` | `SUM(Zsaldo donde ZdiasVenc>0) + moratorios` | 354.32 |
| `pagoNormal` | `ZmontoSplit` | 500.00 |
| `importeVenta` | `Ztotal` | 6000.00 (cuadra con `SUM(ZmontoSplit)`) |
| `pagoParaEstarCorriente` | calculable con `ZdiasVenc` + `Zsaldo` | — |

Campos útiles del response que la ficha no documenta: `ZdiasVenc`, `Zcobros`, `Zabonos`, `ZultPagoIm`, `Zremanente`, `ZcobroPp`, `ZbonPp`, `Zzterm`.

### 6.3 Discrepancia abierta ⚠️

Para el **mismo documento** `9000006302`, las dos ODatas dan saldos distintos:

| Fuente | Saldo |
|---|---|
| **EX01** (`Belnr 9000006302`, `Blart RV`) | **3,036.00** |
| **NTZ01 zsplits** (`SUM(Zsaldo)`) | **172.00** |

Hay que **elegir la fuente** de `saldoCapital`, y la elección cambia el número que ve Magento. Pendiente de validar con el usuario. Observación secundaria: `SUM(Zcobros)` = 6,020 contra `Ztotal` = 6,000.

### 6.4 Lo que sigue faltando ⚠️

`liquidaConSolo` y `pagoPuntual`. Bloqueadas por **`FN_MAVIRM0906CalculaBonifCC`**, que invocan las dos funciones disponibles (`FNCXCPagoLiquidaBBVA.sql:179,206` y `FnMavi1erVencimPendPagoPP.sql:36`) y no está en el repositorio.

---

## 7. Correcciones aplicadas el 2026-09-10

Todas verificadas con compilación limpia (Roslyn, 210 fuentes, **0 errores**).

| Cambio | Archivo | Por qué |
|---|---|---|
| Dependencia **CPI viva** eliminada | `FinalListProperMethods.cs:19` | pedía OAuth a CPI y mandaba `Bearer` a S4, que usa `Basic` |
| `TokenGenerator.CreateSapToken()` borrada | `TokenGenerator.cs` | único consumidor de CPI |
| `GetTokenSap` bloqueante borrada | `TokenGenerator.cs` | 0 llamadores tras el refactor |
| **6 barras faltantes** | `ProductMethods.cs:1118,1119,1152,1153,1186,1187` | el CRUD de `ArticuloSEO` **nunca funcionó**: 404 en el fetch de CSRF |
| **Fuga de credenciales S4 a AWS** | `ProductMethods.cs:291,614` | usaban `CreateClientS4()` contra AWS API Gateway |
| `CreateClientExternal()` añadida | `TokenGenerator.cs` | cliente sin `Authorization` para destinos no-S4 |
| odata4 unificado | `AbonoMethods.cs:57` | reescribía el prefijo a mano en vez de `.Replace` |
| SD52 repuntado a S/4HANA | `BusinessPartnerMethods.cs:380` | consultaba por el endpoint de edición de Android |
| `Zformaenvio` mapeado | `OrderMethods.cs:2241` | estaba fijo en `""`; ahora lleva `order.metodoEnvio` |
| `DIVISION` `"01"` → `"00"` | `OrderMethods.cs:2119` | `sd01:70`, `sd09:29` |
| `sap-client=100` → `110` | `SalesMethods.cs:29` | único call site divergente de 66 |
| **Refactor async completo** | 9 archivos + 11 controladores | **50 sitios** de sync-over-async → **0** |
| Paths de config normalizados | `OrderMethods`, `CreditMethods`, `AccountMethods` | la barra inicial era carga estructural en direcciones opuestas |
| `[Authorize]` añadido | `AbonosController.cs:7`, `ProspectoController.cs:14` | solo `LoginController` debe quedar abierto |
| 5 llaves muertas con secretos borradas | `Web.config` + `bin/*.dll.config` | `S4_USER`, `S4_PASS`, `SAP_OAUTH_*` — 0 lectores |

**Revertido**: el `setOrder` del DMZ volvió a passthrough. Meter traducción de status codes ahí violaba §1.5.

---

## 8. Pendientes

### 8.1 Deuda técnica verificada ⚠️

| Tema | Magnitud | Nota |
|---|---|---|
| `ConfigureAwait(false)` incompleto | 64 `await` en librería sin él, +1 en un controlador que no debería tenerlo | Higiene, no bug. 338 usos correctos |
| Clases-dios | `OrderMethods.cs` >3,200 líneas · `ProductMethods.cs` >1,200 | |
| Duplicados funcionales | `GetBonus`/`GetBonusAsync`, `GetEtiquetas`/`GetEtiquetasAsync` | misma URL, mismo body |
| TLS sin validar | `TokenGenerator.cs` acepta cualquier certificado | es el canal por donde viaja el `Basic` de S4 |
| `JWT_SECRET_KEY` compartida | LAN y ServicioSAP usan **la misma llave**, mismo issuer y audience | **NO separarlas por su cuenta — ver §8.5.** Un token del legacy es válido en el servicio nuevo, pero 61 rutas del DMZ dependen de esa coincidencia |
| Path traversal | `cashCustomerReport`, `obtenerImagen` | nombre de archivo del body a `Path.Combine` sin sanear; el segundo corre bajo impersonación SMB |
| `isCredito` es código muerto | `SetOrderAsync` hace early-return en crédito (`:1679`) **antes** de `DeterminarPlant` y `BuildSapOrderAsync` | `DistrChan` nunca vale `'02'`; plantas `0504`/`0505` nunca se alcanzan. Cuando el crédito fluya, **BP-08 pasa de latente a rotura** |
| Devolución hereda mal la organización | `OrderRMA.store` es `'1'`/`'2'` y en LAN **1=VIU, 2=MA — invertido** respecto al UEN | debe heredar `SalesOrg`/`DistrChan` del documento original vía SD36, no del request |

### 8.2 Decisiones de negocio abiertas ⚠️

- **Pedido facturado que se cancela**: ¿política de LAN (no se cancela; reporte de servicio + devolución solo si `resolucion=="R"`) o la cadena SD48 + SD46? Bloquea la bifurcación de `cancelOrder`.
- **`saldoCapital`**: ¿EX01 o NTZ01 zsplits? (§6.3)
- `idStatus = 03`
- `validateCredit` / liberador — pendiente con Valentín
- Destino de las tablas propias de MAVI cuando Intelisis se apague: `VTASCListaNegra` / `VTASCListaBlanca` (probablemente **SigMavi**). El monedero es **Wallet**; `VentasCanalMAVI` → **SD52**; `TablaRangoStD` → **catálogo configurable de AWS**.
- ¿Se borran `order/testnew` y `partner/testnew`?

### 8.3 Fuentes que faltan en el repositorio ⚠️

> [!important] Criterio: solo se pide lo que un proceso de **ServicioSAP** consume hoy
> No se pide por aparecer en el grafo de dependencias de los `.sql`. Una función solo se necesita si su cadena termina en una ruta **puenteada a ServicioSAP**. Si la ruta sigue yendo a LAN, la petición es prematura.

**Necesarias ahora — 4**, con su cadena verificada:

| Fuente | Cadena | Ruta | Puenteada |
|---|---|---|---|
| `FN_MAVIRM0906CalculaBonifCC` | `FNCXCPagoLiquidaBBVA:179,206` / `FnMavi1erVencimPendPagoPP:36` → `SPCXCSaldosClientesPDetalle` → `FacturaMethods` | `credit/getClienteFactura` | ✅ |
| `FnDiasVencidosMavi` | `SP_MAVIDM0173RedimeOGeneraMONE` → `WalletCustomerMethods.GetSerieMonedero` → `WalletCustomerController:23` | `customer/wallet/details` | ✅ |
| `fnMovFinalSegunFamilia_MAVI` | idem | `customer/wallet/details` | ✅ |
| `spInvReCalcEncabezadoSimple` | idem | `customer/wallet/details` | ✅ |

**No se piden — cuelgan de rutas que siguen en LAN o de procesos ya reemplazados:**

| Fuente | Por qué no |
|---|---|
| `FN_MAVIRM0906CobxPol` | `credit/getClienteSaldo/` sigue en LAN |
| `TcAAea00030_EnvioMensajes` | `credit/codigoRecomendado` sigue en LAN |
| `VTASdArtCreditoWeb` | `credit/CreditoWeb_SaveData_Articulos` sigue en LAN |
| `fnSplit`, `fnQuitarAcentos`, `FnTINomenclaturaCamelCase`, `FN_eCommerceUrlkey` | exportación de catálogo, no puenteada |
| `Fn_MaviDM0173CalcPorcMonedero`, `SP_InsertaTarjetaMonVirtual`, `spRedimirMovMonederoMAVI` | creación de pedido **de LAN**, reemplazada por `order/new` |

Las **159 referencias faltantes** restantes son el **motor de Intelisis** (`spAfectar` y sus SPs de módulo, los `xp*`, los internos de `spInv`/`spCont`/`spCx`). Mueren con Intelisis. **No se piden.**

**25 raíces completas ausentes** — SPs que el C# invoca directamente y de los que no hay fuente. Cada uno es un endpoint sin analizar; **pedirlos por endpoint cuando toque migrarlo**, no en bloque:

`SpVTASSolicitudDevolucion` · `SPVTASEstadoDeCuentaClienteWeb` · `SpVTASEcommercePrecio` · `SpVTASEcommerceExistencia` · `SpVTASECommerceDisponibilidadArt` · `SpVTASEcommerceExportaArtMABundle` · `...MAVIBundle` · `...VIUBundle` · `SpVTASAgruparConfigurables` · `SPVTASHComparadorCategorias` · `SPVTASexportaGarantiaampliada` · `SPCXCCobrosClientesBBVA` · `SpCXCCalcAbonoCobXPol` · `SPCREDICredilana` · `SpCREDICredilanaSeguroDeVida` · `SpCREDIValidarTelefono` · `SP_CREDITO_WEB_VALORES_FORM` · `SP_ACTES_REGISTRO` · `SP_GeneraConsecutivoCteMavi` · `SP_eCommerceCtenuevo` · `SP_eCommerceartexistencia` · `SPCOMSCompraArtVirtual` · `SP_DM0312TarjetaSerieMovMAVI` · `spVentaCteD` · `spVentaCteDAceptar` · `SpWDM0285_AtributosdeMagento`

### 8.4 Fichas RSG que faltan ⚠️

`ZAPI_SD52_PARTNER_SRV` · `ZAPI_VENTAS_SRV` · `ZAPI_CTACLBSTP_SRV` · `ZAPI_BP05MA_SRV` · `Z_SRVB_MM_ART` · `ZFICRUD_COBREF_SRV`

---

### 8.5 Restricciones y hallazgos arrastrados de la auditoría ⚠️

> [!danger] §8.5.1 — El acoplamiento JWT ↔ DMZ: no tocar uno sin el otro
> **`R-02`** · `DMZ\Helper\Curl.cs:60-71, :84`
>
> El login del DMZ contra LAN quedó dentro de un bloque comentado y la línea 84 lo sustituye por `Token = TokenSAP;`. Entonces `Post()` y `Get()`, que van a `URL_INTELISIS`, **mandan a Intelisis un token emitido por ServicioSAP**. Funciona **solo porque las llaves JWT coinciden entre los proyectos**.
>
> **Consecuencia directa**: separar la `JWT_SECRET_KEY` —que es lo correcto por seguridad— **rompe 61 rutas de golpe**. Las dos cosas van en el **mismo cambio**, nunca una sin la otra.
>
> *Prueba pendiente de 5 minutos*: verificar con Hoppscotch si Intelisis realmente valida ese header. Eso decide si es rotura latente o solo deuda.

**`R-09` · El `TokenValidationHandler` no rechaza — es intencional, y hace *load-bearing* al `[Authorize]`**
Cuando la petición no trae `Authorization`, el handler calcula `Unauthorized` y **deja pasar**. Es a propósito: los endpoints que emiten el token no pueden exigirlo.
**Consecuencia**: la seguridad de cada ruta depende **enteramente** de que su controlador lleve `[Authorize]`. **Un controlador nuevo sin ese atributo queda público y nada lo advierte** — pasó con `AbonosController` y `ProspectoController`. Revisar ese atributo en **cada** controlador nuevo.

**`R-10` / `C14` · Un puente vivo que escribe a SAP es `[AllowAnonymous]` — pendiente de decisión**
`DMZ\Controllers\CreditController.cs:448` (`credit/guardardocumento`) sobrescribe el `[Authorize]` de su clase y hace `PostSAP`. Cualquiera que alcance el DMZ puede subir un archivo arbitrario que termina como `VARBINARY` en `MAVI_DOC_CTE`. El destino en ServicioSAP **sí** exige autenticación; el abierto es el puente. **No se modificó**, a la espera de decisión.

**`R-11` · Timeout de ~2.7 horas en las salidas del DMZ**
`webClient.Timeout = 9999999` × 8 en `Curl.cs`. Una llamada colgada retiene un hilo del pool de IIS durante horas. **Restricción, no tarea**: si el DMZ se degrada bajo carga, la causa está aquí.

**`R-04` · Seis formas de respuesta distintas para 23 puentes**
`Ok(string crudo)` en 8 rutas · `JObject.Parse` en otras · `Ok(JsonConvert.DeserializeObject(...))` en otras · 48 `.Trim('"')` repartidos. Es la manifestación de la causa raíz de §3.2. **Unificar antes de seguir migrando, no después.**

**Hallazgos funcionales pendientes, con archivo:línea:**

| ID | Hallazgo | Evidencia |
|---|---|---|
| `C05` | `openpay_stores` se escribe en SAP pero **nadie la consume**: las referencias VIU expiradas nunca se cancelan | `OrderMethods.cs:435-459` (escribe, invocado en `:1670`) vs LAN `OpenpayMethods.CheckStoresStatus:169-206` |
| `C09` | `getMinimumCostToRedeem` no replica el cálculo por familia: faltan la exclusión de familias no permitidas y el recálculo multi-familia de `montoMaximoRedimibleGlobal` | `SAP WalletMethods.cs:220-232` vs `LAN WalletCustomerMethods.cs:271-400` |
| `C10` | `customer/wallet/details` **ignora el campo `uen`**; LAN discriminaba la serie de monedero por UEN | `SAP WalletCustomerController.cs:26`, `WalletCustomerMethods.cs:62,:90` vs `LAN:65` |
| `C12` | **Inyección de filtro OData** en `prospecto/recuperarcuenta`: `nombre`, `apellidoPaterno`, `apellidoMaterno` y `rfc` se interpolan crudos sin escapar la comilla simple | `ProspectoController.cs:46, :48-49` |
| `C16` | El puente `customer/wallet/getCuentaC` apunta a **una ruta y un verbo que no existen** en LAN | — |
| `C18` | `checkOpenpay`: condición **siempre verdadera** (`res != "Concluido" \|\| !Regex.IsMatch(res, @"^C\d+$")`) impide marcar `is_in_intelisis` | `OpenpayMethods.SetPedido` |
| `C19` | `credit/ApplyPaymentNeko` y `credit/UpdateStatusPaymentNeko` son **stubs que devuelven éxito** | `AbonoMethods.cs:94-104`. Severidad baja **solo** porque el DMZ aún no los consume |
| `C08` | `credit/GetAccountDebts`: SAP **no replica ninguna regla de cobro**. LAN agrupa por CanalVenta (3/76/77/78/7/79 → CRÉDITO MA, DIMAS, DINERALIA, EMPRESARIO…) en tres pasos | `LAN CustomerServiceMethods.cs:776-852, 1169-1212, 1510-1727` vs `SAP AbonoMethods.cs:19-51` |

### 8.6 Prerrequisitos de pase a Stage/PROD — no son defectos ✅

El equipo confirmó que estos valores son **correctos mientras se trabaja en pruebas**. No corregir ahora; sí tocarlos el día del pase.

| Qué | Dónde | Costo del cambio |
|---|---|---|
| `URL_INTELISIS = localhost` y `DOMINIO_LAN = localhost` (**`R-06`**) | `DMZ\Web.config:16-17, :22-24` — la URL real está comentada en `:16` | 1 llave |
| `URL_DMZ = localhost:44302` | `ServicioSAP\Web.config` | 1 llave |
| Nodo fijo en `ENVIROMENT_DEV` (**`R-12`**) | `Nodos.ENVIROMENT_DEV` × **64** call sites | **64 líneas.** Los nodos `ENVIROMENT_QA` y `ENVIROMENT` ya existen en `Conexion.dll`; no se usan todavía |

> [!tip] Vale la pena centralizar el nodo antes del pase
> Que el cambio DEV→QA→PROD sea de **un punto y no de 64**. Es la única de las tres que tiene costo real.

### 8.7 Hallazgos de la auditoría que quedaron RETIRADOS ❌

No volver a levantarlos, y **corregir la auditoría** donde todavía los declare vigentes:

| ID | Por qué se retiró |
|---|---|
| `R-03` / `C03` | *"Todos los puentes devuelven 200 cuando falla el transporte"* — la auditoría lo declara **causa raíz común de C01, C03 y C06**. **No lo es**: bajo el diseño de §1.5 el resultado de negocio viaja en el cuerpo con HTTP 200, y el puente nunca necesita el status. Confirmado por el usuario el 2026-09-10 |
| `R-01` | El login a SAP en el constructor de `Curl` — decisión aceptada, no es hallazgo |
| `R-06`, `R-12` | No son defectos: son prerrequisitos de pase (§8.6) |
| `C15`, `C20`, `C21`, `C23` | Dependían de la desalineación del CSV. El CSV es **informativo** y no se modifica (§3) |


## 9. Fuentes retiradas — no usar

| Archivo | Motivo |
|---|---|
| `ENDPOINTS_DMZ_VS_SAP.csv` | retirado por el usuario |
| `migration_status_master_v2` | desactualizado |
| `_EXCLUIDOS_Intelisis.md` | ignorar |
| `conf.ini` | **nunca** tomarlo; el que vale es `ConexionSap.dll` |
| `Web STAGE LAN.config` | respaldo no usado |
| Tablas de SAP en las fichas RSG | solo para leer reglas de negocio (§2.2) |
| Endpoints RSG con URL OData interna de SAP | son internos de SAP, no requieren puente DMZ |

---

## 10. Bitácora de errores del análisis

Se documentan para que no se repitan. Cada uno produjo una regla en §2.

1. **Se citó un resumen autogenerado como evidencia primaria** → afirmó que SD37/SD47/SD08 eran APIs reales. Son etiquetas de diagrama. → §2.1, §2.5
2. **Se razonó un mapeo desde internals de tablas SAP** (`DMBTR` agrupado por `ZUONR`) para negar que `DocNoCompSet.Saldo` equivalga a `SaldoCapital`. Razonamiento inválido. → §2.2
3. **Se declaró inexistente un campo que sí existe** (`ZdiasVenc`) por no estar en la ficha. → §2.3
4. **Se trató un SP como especificación** y se pidieron funciones para reconstruir aritmética que SAP ya resuelve. → §2.4
5. **Se metió lógica de traducción en el DMZ**, violando su rol de puente. Revertido. → §1.5
6. **Se reportó `Curl.PostSAP` como bloqueante** por no propagar el status code. No lo es: el resultado de negocio viaja en el cuerpo. Retirado.
7. **Se marcaron como defecto APIs MAVI que consumen datos "de SAP"**. El destino lo determina el resolvedor. → §1.1
8. **Se editó `MAVIDMZSAPConexiones.csv`**, que es informativo. Revertido, con pérdida del texto original de 3 celdas de `Notas`.
9. **Un workflow reportó "0 refutadas" de 89** por un defecto de post-procesamiento propio. Las reales eran **33**. Verificar siempre el journal antes de reportar un resultado limpio.
