---
tags: [auditoria, migracion, lan, dmz, servicio-sap, paridad]
proyecto: Migracion SAP
fuente_de_verdad: MAVIDMZSAPConexiones.csv
actualizado: 2026-09-08
---

# Auditoría integral LAN → DMZ → ServicioSAP

Comparativa de paridad de los tres proyectos y plantilla de verificación. Todo lo que aquí se afirma se sostiene en `archivo:línea` del código, no en documentación.

**Fuente de verdad de endpoints:** [[MAVIDMZSAPConexiones.csv]]
**Reglas arquitectónicas:** [[SKILL.md]]
**Comparativas de detalle ya existentes:** [[COMPARATIVA_SETORDER_LAN_VS_SAP]] · [[COMPARATIVA_BP_LAN_VS_SAP]]

---

## 0. Cómo se produjo y qué límites tiene

Tres agentes se repartieron los controladores; cada hallazgo de severidad alta o media pasó por un verificador adversarial independiente cuya instrucción era **refutarlo**, no confirmarlo.

| | |
|---|---|
Endpoints inventariados | 155 (rutas de LAN, DMZ y SAP; el CSV declara 136 filas) |
Hallazgos brutos | 90 |
Pasados por verificación | 42 |
**Confirmados** | **24** (23 por verificación adversarial + C24 verificado directamente) |
**Refutados y descartados** | **19** (45% de refutación) |
Sin verificar (tope de la corrida) | 29 |
Violaciones de estándares | 83 |
Accesos pendientes | 3 (§10) |

**Límites que hay que tener presentes al leer:**

- Los 29 hallazgos de la §5 **no pasaron por verificación**. Trátalos como sospechas, no como hechos.
- Nada se probó en ejecución. Se verificó que las rutas existen como atributos compilados, no que respondan.
- Quedan 3 accesos pendientes (§10). Uno de los cuatro originales se resolvió al confirmarse la URL base de S/4HANA, y otro era un **error de búsqueda de esta auditoría**: cuatro SPs declarados inaccesibles sí están en `SPsOrden\` (§10).
- La tasa de refutación del 45% es la medida honesta de cuánto ruido produce una auditoría de este tipo sin verificar. Los 19 refutados de la §4 están documentados **precisamente para que nadie los vuelva a reportar**.

---

## 1. Veredicto

**El puenteo funciona; la paridad de lógica no está cerrada, y el tracker sobreestima el avance.**

Tres afirmaciones, en orden de importancia:

1. **El cuello de botella no es el puente, es la lógica que falta en ServicioSAP.** De los 15 endpoints cuyo destino ya existe en SAP y a los que el DMZ no apunta, **solo 3 son conmutación limpia**; 10 necesitan lógica que no está y 2 son stubs que responderían éxito falso. Conectar no es el trabajo pendiente: completar sí.
2. **De los 23 endpoints declarados como conectados, 3 no lo están** y otros 2 responden con un contrato que el DMZ no sabe leer (C01, C06). El avance real está por debajo del declarado.
3. **La calidad no es homogénea.** Conviven endpoints con paridad real (`order/getGuide`, `customerService/obtenerQuejas`, `credit/GetCreditAmounts`) con stubs publicados que devuelven éxito sin hacer nada (`credit/ApplyPaymentNeko`, `credit/UpdateStatusPaymentNeko`).

### Estado real por endpoint

| Estado | Cantidad | Qué significa |
|---|---:|---|
Migrado | 10 | Lógica equivalente verificada |
Parcial | 31 | Existe y responde, pero le falta lógica de LAN |
Stub | 3 | Publicado, devuelve éxito, no hace nada |
NoMigrado | 36 | Requiere equivalencia y no existe |
Deprecado | 18 | Cerrado por decisión |
FueraDeAlcance | 41 | CrediLana, Android, tablas locales que se mantienen |
InternaSAP | 16 | Envoltura de OData de RSG, no se puentea por diseño |
| **Total** | **155** | |

### Declarado vs verificado

| | CSV declara | Verificado en código |
|---|---|---|
Conectado = Sí | 23 | **20** (3 falsos: L52, L53, L113) |
Generado = Sí | 40 | Inflado: 13 son `N/A (MAGENTO directo)`, sin trabajo SAP |
Filas | 136 | **133 rutas distintas** (3 pares duplicados) |
Avance sin deprecados | 48.37% | Por debajo, hasta reconciliar la §7 |

---

### Qué hay que conectar — la lista operativa

Cruzando las 88 rutas reales de ServicioSAP contra los 23 puentes que el DMZ ya hace y contra la columna `Ruta ServicioSAP` del CSV, salen **15 endpoints cuyo destino en ServicioSAP ya existe pero al que ningún puente del DMZ apunta.**

**El matiz que importa: que el endpoint exista no significa que se pueda conectar.** De los 15, solo 3 son conmutación limpia.

#### Grupo A · Conmutación limpia — cambiar `curl.Post` por `PostSAP` y listo

| Ruta DMZ | Destino en ServicioSAP | Dueño | Nota |
|---|---|---|---|
`customerService/GetEmpleadoByNomina` | `partner/successfactor/employee/{userId}` | Javier | Sin defecto conocido |
`customerService/LoginClienteCredito` | `customerService/LoginClienteCredito` | Javier | Validar la diferencia de contenido de C15 antes de conmutar |
`customerService/LoginClienteCreditoFechaN` | `customerService/LoginClienteCreditoFechaN` | Javier | Ídem |

Los dos de Login están marcados **Conectado=Sí en el CSV y no lo están** (§7). Son las tres victorias más rápidas disponibles.

#### Grupo B · El endpoint existe pero le falta lógica — arreglar antes de conmutar

Conectarlos hoy cambiaría el comportamiento que ve Magento:

| Ruta DMZ | Destino | Dueño | Qué le falta |
|---|---|---|---|
`customer/wallet/getMinimumCostToRedeem` | mismo nombre | Javier | C09: el cálculo por familia. Marcado Conectado=Sí y no lo está |
`order/creditStatus/{idSolicitud}` | `sale/filter/{filters}` | Javier | `sale/filter` es un passthrough crudo de `$filter`; no resuelve la cascada EN_ANALISIS/RECHAZADO/AUTORIZADO |
`order/getIntelisisStatuses` | `sale/filter/{filters}` | Javier | Falta el adaptador: filtro por facturas, entrada por lista de incrementIds, salida `InvoiceDataResponse` |
`order/getPosCancellations` | `order/cancelInvoice` | Javier | **El destino es la operación inversa**: uno lee cancelaciones, el otro anula facturas |
`product/obtenerImagen` | `ma/imagenes/optimizadas` | Javier | Verificar equivalencia de contrato |
`product/updateStock` | `product/stock` | Javier | Falta el cálculo de delta y el efecto `deleteReservations()` |
`product/updateStockMavi` | `product/stock` | Javier | Ídem |
`product/existenciasAlmacenArt` | `product/stock/filter/{filter}` | Javier | Falta `GetCambiosExistencias(uen)` |
`product/getStockByStore` | `product/stock/filter/{filter}` | Javier | Falta el equivalente de `SpVTASEcommerceStoreStock` (el SQL está en `SPsOrden\`) |
`product/updateConfigurableProduct` | `product/jerarquia/articulos` | Javier | Falta `BuildJsonAndSendConfigurable`: el push efectivo a Magento |

Las seis rutas de `product/*` apuntan a envolturas de OData de RSG. **Mapear una ruta de job de LAN a una lectura cruda de OData no es equivalencia:** falta la capa que transforma y empuja a Magento.

#### Grupo C · No conectar — son stubs que responderían éxito falso

| Ruta DMZ | Destino | Dueño | Riesgo |
|---|---|---|---|
`customerService/ApplyPaymentNeko` | `credit/ApplyPaymentNeko` | Marcos | C19: cuerpo `// TODO` + `return true`. Conectarlo haría que el sistema responda `{Success:true}` **sin registrar el pago** |
`customerService/UpdateStatusPaymentNeko` | `credit/UpdateStatusPaymentNeko` | Marcos | Ídem |

#### Además: un destino declarado que no existe

`company/wholesale-customer/{wholesaleAccount}` (fila L114, Javier) — la ruta declarada en el CSV **no existe** en ServicioSAP. La real es `wholesale-customer/{wholesaleAccount}` en `WholesaleCustomerController.cs:14`. Corregir el CSV antes de intentar conectarlo.

#### Resumen operativo

| Categoría | Rutas |
|---|---:|
Ya conectadas y funcionando | 16 |
Conectadas pero con contrato roto (C01, C06) | 2 |
**Listas para conmutar hoy** | **3** |
Existe el endpoint, falta lógica | 10 |
Existe el endpoint, es stub: no conectar | 2 |
Destino declarado inexistente | 1 |
Falta generar el endpoint (§8) | 36 |

---

## 2. Riesgos sistémicos

Lo que solo se ve agregando las tres lanes. **Esta sección vale más que la lista de hallazgos individuales.**

### R-01 · El login a SAP en el constructor de `Curl` — **decisión aceptada, no es hallazgo**
`Z:\DMZ\WebApiMagento\Helper\Curl.cs:56-90`

`public Curl()` ejecuta incondicionalmente `TokenSAP = webClient.UploadString(IpSAP + "login/auth", "POST", userSAP)` (línea 80), y cada controlador del DMZ instancia `Curl`. Un reporte preliminar lo levantó como riesgo de disponibilidad.

**El equipo confirmó que se queda así.** Mientras el proyecto no esté terminado, que el constructor autentique contra ServicioSAP en todas las rutas no representa un problema operativo, y **no hay que sacar el login del constructor**. El trabajo pendiente es conectar el DMZ a los endpoints de ServicioSAP, no refactorizar el puente. Se documenta aquí solo para que no se vuelva a levantar como defecto.

*Lo que sí se sigue de esta decisión:* R-02 y R-11 son consecuencias del mismo diseño aceptado. No son tareas, son **restricciones que conviene tener presentes** cuando se toque el `Curl` por otra razón.

### R-02 · El token de SAP se está enviando a Intelisis en 61 rutas
`Z:\DMZ\WebApiMagento\Helper\Curl.cs:60-71, :84`

El login contra LAN quedó dentro de un bloque comentado `/* CODIGO LEGACY COMENTADO PARA MIGRACION A SAP */` y la línea 84 lo sustituye por `Token = TokenSAP;`. `Post()` y `Get()`, que van a `URL_INTELISIS`, mandan un token emitido por ServicioSAP. Hoy funciona porque las llaves JWT coinciden entre proyectos del mismo host.

**No es una tarea, es una restricción:** el día que se separen las llaves JWT —que es lo recomendable por seguridad— se rompen 61 rutas de golpe. Hay que hacer las dos cosas en el mismo cambio, no una sin la otra.

*Pendiente de verificar:* si Intelisis valida realmente el header. Es una prueba de cinco minutos con Hoppscotch y decide si esto es una rotura latente o solo deuda.

### R-03 · Todos los puentes devuelven HTTP 200 cuando falla el transporte
`Curl.cs:110` (`Post`), `:265` (`Get`), `:134` (`PostSAP`), `:229` (`GetSAP`)

Los cuatro métodos hacen `catch (Exception e) { return e.ToString(); }` o devuelven `"WebException: " + e.Message + " Body: " + errorBody`. El controlador luego hace `return Ok(response)`. **Magento recibe 200 con el texto de la excepción en el cuerpo.** Ningún `catch` de controlador es alcanzable por esta vía. Es la causa raíz común de C01, C03 y C06.

### R-04 · Seis formas de respuesta distintas para 23 puentes
`Ok(string crudo)` en 8 rutas · `JObject.Parse` en otras · `Ok(JsonConvert.DeserializeObject(...))` en otras · más 48 `.Trim('"')` repartidos por los controladores. El 23 del baseline es correcto por coincidencia; la forma no lo es. **Cada endpoint nuevo agrega una variante más.** Conviene unificar antes de seguir migrando, no después.

### R-05 · La allowlist de certificados acepta cualquier certificado inválido del host de SAP
`Curl.cs:29-32, :39-53` · `Z:\ServicioSAP\...\Helpers\TokenGenerator.cs:151` · `Methods\Utils\RequestMethods.cs:58-59`

En el DMZ el callback devuelve `true` si el host está en `TrustedHosts`, sin validar la cadena. En ServicioSAP es peor: `ServerCertificateCustomValidationCallback = (…) => true` en `CreateClientS4()`, el cliente HTTP de **prácticamente todas** las llamadas a S/4HANA, y `ServerCertificateValidationCallback += (…) => true` en `RequestMethods.cs`, que además es global al `ServicePointManager`.

### R-06 · Configuración del DMZ en localhost — **esperado, es entorno de pruebas**
`Z:\DMZ\WebApiMagento\Web.config:16-17, :22-24`

`URL_INTELISIS = https://localhost:44399/` está activo y la URL real está comentada en la línea 16; igual `DOMINIO_LAN = localhost`. **El equipo confirmó que es correcto mientras se trabaja en pruebas.** No es un defecto.

**Sí es un prerrequisito de despliegue:** el día de la integración a Stage o PROD hay que cambiar esos valores. Queda anotado en la §11 como paso de pase a producción, no como corrección pendiente. Junto con R-12, forman la lista de lo que hay que tocar antes del pase — y R-12 es el que cuesta, porque no es una clave de configuración sino 64 líneas de código.

### R-07 · `order/validateCredit`: pendiente de desarrollo, bloqueado por las equivalencias del SP de Android
`DMZ OrdersController.cs:366-402` · `LAN OrdersController.cs:457-482` · `SAP OrderMethods.cs:659-697`

**Cómo funciona en LAN.** `validateCredit` recibe el quote de Magento y **llama literalmente al mismo método que `setOrder`**:

```csharp
// LAN/Controllers/OrdersController.cs:457-482
var om = new OrderMethods();
// SetPedido ya maneja CREDIT_METHOD:
//  - guarda datos en la tabla de crédito
//  - lanza el thread de LiberarCliente
//  - el thread llama CallMagentoAuthorizationCallback al terminar
string resultado = om.SetPedido(order);
return Ok(new { status = "PROCESANDO", cuenta = resultado });
```

Es decir: **no hay lógica propia de `validateCredit`.** Es `SetPedido` con una respuesta inmediata `PROCESANDO`, y la resolución real llega después por callback asíncrono a `order/authorizationResult`.

**Qué había en el DMZ.** El bloque comentado no era un puente a SAP: era un **proxy a LAN** que además usaba `HttpClient` a mano en lugar de los helpers de `Curl`. Su comentario dice *"Reemplazado por validación nativa de SAP a través de OData FI/FICA en ServicioSAP"* — pero **nada lo reemplazó**: la ruta simplemente desapareció y hoy Magento recibe 404.

**Qué hay en ServicioSAP.** Respondiendo la pregunta directa: **todas las piezas existen, pero ninguna está conectada.**

| Pieza | Estado | Ubicación |
|---|---|---|
Rama de crédito de `SetOrderAsync` | ✅ implementada | `OrderMethods.cs:1677-1699` |
`ProcessCreditPaymentAsync` (solicitud + artículos) | ✅ implementada | `OrderMethods.cs:613` |
`LiberadorCreditoMethods.LiberarCliente` | ✅ implementada | `Methods\Credit\LiberadorCreditoMethods.cs:48` |
`LiberateClientCredit` (envoltorio) | ⚠️ implementada, **cero llamadores** — código muerto | `OrderMethods.cs:1083` |
`CallMagentoAuthorizationCallbackAsync` | ⚠️ implementada, **solo se llama desde el bloque comentado** | `OrderMethods.cs:1100` |
`order/authorizationResult` en el DMZ → Magento | ✅ funcional | `DMZ OrdersController.cs:422-440` |

**La cadena se rompe en un único punto:** el bloque `OrderMethods.cs:663-697`, comentado con la nota *"PENDIENTE: Servicio de Liberador y Callback a Magento están incompletos en DMZ"*. Esa nota ya no aplica: el `authorizationResult` del DMZ **sí** está implementado y postea a `rest/V1/omnipro-credito/authorizationResult` de Magento.

#### ⚠️ El bloque comentado NO compila tal como está

Antes de descomentarlo hay que corregirlo. El código usa `await` dentro de una lambda **no** `async`:

```csharp
var liberadorThread = new System.Threading.Thread(() =>
{
    var resultado = liberador.LiberarCliente(...);
    await CallMagentoAuthorizationCallbackAsync(...);   // ← error de compilación
});
```

`await` en un delegado síncrono de `Thread` es error de compilación — **es probablemente la razón real por la que se comentó**, más allá de la nota. Además `Thread` + `async` es el patrón equivocado y viola la regla 12. La forma correcta:

```csharp
_ = Task.Run(async () =>
{
    try
    {
        var liberador = new ServicioSap.Methods.Credit.LiberadorCreditoMethods();
        var resultado = liberador.LiberarCliente(capturedCliente, capturedIdSol, capturedUen);
        await CallMagentoAuthorizationCallbackAsync(capturedEntityId, resultado.Status,
            capturedCliente, resultado.IdVenta > 0 ? resultado.IdVenta : capturedIdSol);
    }
    catch (Exception ex)
    {
        ServicioSap.Helpers.Logger.SAP("[LIBERADOR ERROR] ", $"entityId={capturedEntityId} {ex.Message}");
        await CallMagentoAuthorizationCallbackAsync(capturedEntityId, "RECHAZADO", capturedCliente, capturedIdSol);
    }
});
```

*(Nótese que el `LiberateClientCredit` de `:1083` ya es ese envoltorio y no tiene llamadores: conviene usarlo en lugar de instanciar el liberador otra vez.)*

#### Por qué está así: es desarrollo pendiente, no un descuido

> **Nota del equipo.** El proceso de validación de crédito **sigue pendiente de desarrollo**. El bloqueo real es que **faltan las equivalencias completas del SP de Android que ejecuta**: se tienen algunas, no el proceso entero. El liberador y `CallMagentoAuthorizationCallbackAsync` también quedan pendientes. **Ambos temas hay que revisarlos con Valentín.**

El SP está en el repositorio: `SPsOrden\SP_CREDITO_WEB_DATOS.sql` — 623 líneas, base **`ServicioAndroid`**. Su análisis explica por qué la equivalencia no es trivial:

| Operación (`@Op`) | ¿La usa ServicioSAP hoy? |
|---|---|
`Insert` | ✅ Sí — `CrearSolicitudCredito` (`OrderMethods.cs:748`) |
`InsertReferencia` | ❌ No — referencias y avales sin cubrir |
`Update` | ❌ No — el flujo de *"procesar dos solicitudes"* (cambio de 27-11-2020) |

**Escribe** en `CRED_SOLICITUD_WEB_DATOS_TEMP` y `TrWACW00041_RefSolCredWeb`.

**Y aquí está el nudo: el SP no es autocontenido.** Desde `ServicioAndroid` cruza por linked server hacia Intelisis:

| Lectura | Para qué |
|---|---|
`ERPMAVI.IntelisisTmp.dbo.CteTel` | Teléfonos del cliente y su estado de validación |
`ERPMAVI.IntelisisTmp.dbo.TablaStD` | Catálogo del **origen** de validación del teléfono |
`ERPMAVI.IntelisisTMP.dbo.CREDICCondicionArt` | Condiciones de crédito por artículo |
`TcAAEA00030_EnvioMensajes` | SMS — esta sí se mantiene, por la regla 4 de [[SKILL.md]] |

Aunque la base Android se conserve a propósito, **las tres lecturas a Intelisis dentro del SP sí necesitan equivalencia en SAP**, y son justo las que gobiernan la validación telefónica.

El changelog del propio SP lo confirma: los cambios de **18-11-2022 y 20-12-2022 son de Valentín Camacho** — *"Regla para validar nuevo teléfono"* e *"Inserta identificador para agrupar facturas de un pedido de multiplazo"* —, más los de David Chávez en 2023 sobre validar el teléfono contra `TablaStD` y las tablas de armado de SMS. **Ésa es la lógica cuyas equivalencias faltan por definir.**

#### Qué queda pendiente y de qué depende

| # | Pendiente | Bloqueado por |
|---|---|---|
1 | Equivalencias en SAP de `CteTel`, `TablaStD` y `CREDICCondicionArt` para la validación telefónica | **Revisar con Valentín** |
2 | Operaciones `InsertReferencia` (avales) y `Update` (dos solicitudes) del SP | Depende de #1 |
3 | Liberador de crédito y `CallMagentoAuthorizationCallbackAsync` | **Revisar con Valentín** |
4 | Descomentar y reapuntar la ruta del DMZ a `order/new` con `curl.PostSAP` | Depende de #3 |
5 | Adaptar el contrato: LAN devuelve `{status:"PROCESANDO", cuenta}` y `order/new` devuelve `{BP, SalesDocument, Message, Resultado}` | Depende de #4 |

**Lo único accionable sin esperar a nadie** es el error de compilación del bloque comentado: esté o no definida la equivalencia del SP, ese código no compila como está escrito y habrá que corregirlo igual.

**Nota de alcance:** el CSV L89 lo declara `Conectado=No, Generado=No` con la nota *"Mismo flujo que setOrder - Apuntar a order/new pero manteniendo ValidateCredit"*. **La fila está bien**: refleja correctamente que es trabajo pendiente. Lo que faltaba era el diagnóstico de por qué no basta con reapuntar el puente.

### R-08 · Controladores de SAP sin `[Authorize]` — ✅ **CORREGIDO en esta auditoría**
`Controllers\AbonosController.cs:7` y `Controllers\ProspectoController.cs:14`

`AbonosController` exponía 6 rutas sin ningún atributo de autorización, **dos de ellas puentes ya productivos** (`credit/getClienteFactura` y `credit/GetAccountDebts`), y comparte `[RoutePrefix("credit")]` con `CreditController`, que sí lo tenía — de ahí que pasara inadvertido. `ProspectoController` estaba igual, lo que hacía la inyección de C12 explotable sin credenciales.

**Se agregó `[Authorize]` a los dos controladores** a petición del equipo. Verificación posterior: el único controlador de ServicioSAP sin `[Authorize]` es ahora `LoginController`, que **debe** estar abierto (ver R-09).

### R-09 · El `TokenValidationHandler` no rechaza — **es intencional, y eso hace load-bearing al `[Authorize]`**
`Z:\ServicioSAP\...\Helpers\TokenValidationHandler.cs:39-43` (y los gemelos en LAN y DMZ)

Cuando la petición no trae header `Authorization`, el handler calcula `statusCode = HttpStatusCode.Unauthorized` y deja pasar la petición.

> **Nota del equipo:** es a propósito. Los endpoints de primera instancia —los que emiten el token— **no pueden exigir autorización, porque todavía no existe un token**. Por eso `LoginController` es `[AllowAnonymous]` en los tres proyectos y el handler no puede rechazar de forma global.

**La consecuencia sí hay que tenerla presente:** como el handler no rechaza, **la seguridad de cada ruta depende enteramente de que su controlador lleve `[Authorize]`**. Un controlador nuevo sin ese atributo queda público sin que nada lo advierta — que es exactamente lo que pasó con `AbonosController` y `ProspectoController` (R-08). Conviene que la revisión de cada controlador nuevo incluya ese chequeo (§11 E-10).

### R-10 · Un puente vivo que escribe a SAP es `[AllowAnonymous]` — **pendiente de decisión**
`Z:\DMZ\WebApiMagento\Controllers\CreditController.cs:14` (clase con `[Authorize]`) y `:448` (`[AllowAnonymous]` en la acción)

Inventario completo de `[AllowAnonymous]` en los tres proyectos:

| Ubicación | Alcance | Correcto |
|---|---|---|
`DMZ\Controllers\LoginController.cs:12` | Clase | ✅ Sí — emisor del token (R-09) |
`LAN\Controllers\LoginController.cs:12` | Clase | ✅ Sí — emisor del token |
`ServicioSAP\Controllers\LoginController.cs:14` | Clase | ✅ Sí — emisor del token |
**`DMZ\Controllers\CreditController.cs:448`** | **Acción `credit/guardardocumento`** | ❓ **No es login** |

**No está solamente en el login.** La cuarta ocurrencia está sobre la acción `GuardarDocumento`, que sobrescribe el `[Authorize]` de su propia clase. Es la fila L16 del CSV, Conectado=Sí y Generado=Sí, y hace `PostSAP` hacia ServicioSAP: cualquiera que alcance el DMZ puede subir un archivo arbitrario que termina como `VARBINARY` en `MAVI_DOC_CTE`.

**Alguien del equipo ya lo había notado.** El propio código de ServicioSAP lo documenta en `Controllers\CreditController.cs:90`:

> *"Ojo: esa ruta de la DMZ está marcada `[AllowAnonymous]`; la de ServicioSAP no, porque…"*

Es decir: el destino en ServicioSAP **sí** exige autenticación; el que está abierto es el puente del DMZ. Queda pendiente decidir si fue deliberado (¿lo llama algo que no puede autenticarse, como un upload directo desde el navegador?) o si se coló. **No se modificó nada** a la espera de esa decisión.

### R-12 · El nodo de entorno está fijo en `ENVIROMENT_DEV` — **esperado, y con destino conocido**
`Nodos.ENVIROMENT_DEV` × 64 · `Helpers\ConexionSAP\ConexionSapConfig.cs:7-20`

Los 64 puntos de llamada a S/4HANA resuelven contra `https://vhmvods4ci.sap.svrwes4h.com:44300/` mediante `Nodos.ENVIROMENT_DEV`, y no hay ninguna referencia en el código a otro nodo.

> **Nota del equipo:** está en `ENVIROMENT_DEV` **porque se está trabajando en pruebas**. Cuando corresponda se cambiará a su variable respectiva: **`ENVIROMENT_QA`** para el ambiente de calidad y **`ENVIROMENT`** para productivo. Los nodos existen en `Conexion.dll`; simplemente no se usan todavía.

**No es un defecto.** Lo único que queda como prerrequisito de pase (§11 F-04) es el **volumen del cambio**: son 64 líneas a tocar, no una clave de configuración. Vale la pena evaluar si conviene centralizar la resolución del nodo en un solo helper antes del pase, para que el cambio DEV→QA→PROD sea de un punto y no de 64.

### R-11 · Timeout de ~2.7 horas en los métodos de salida del DMZ
`webClient.Timeout = 9999999` aparece 8 veces en `Curl.cs` (:78, :103, :124, :161, :219, :256 y en `PostWithoutThrowingError`). Una llamada colgada retiene un hilo del pool de IIS durante horas.

**Restricción, no tarea** (misma familia que R-01 y R-02). Conviene tenerlo presente si algún día se ve al DMZ degradarse bajo carga: la causa estará aquí, no en el código de negocio.

---

## 3. Hallazgos confirmados

23 hallazgos que sobrevivieron a la refutación adversarial. Ordenados por severidad verificada.

### Severidad alta

> [!warning] `order/cancelOrder` — reverificado a fondo el 2026-09-08
> A petición del equipo se revalidó si esta ruta replica el flujo de cancelación de LAN. Se leyó el flujo completo de LAN, el contrato DMZ↔SAP, y un verificador adversarial intentó refutar C01 y C02 por cinco vías. **Resultado: C01 se confirma sin cambios, C02 se confirma con dos correcciones, y la respuesta a "¿equivale a LAN?" es NO.** El detalle está en la subsección siguiente.

**C01 · `order/cancelOrder` devuelve 500 incluso cuando SAP anula correctamente** — *Javier* — **CONFIRMADO**

El DMZ evalúa la respuesta como cadena: `'noexiste'` → BadRequest, y si no es exactamente `'ok'` (comparación `OrdinalIgnoreCase`) → 500. SAP devuelve `Ok(ReverseGoodsIssueResponse)`, un objeto JSON que empieza por `{`. `.Trim('"')` solo recorta comillas dobles de los extremos: no convierte nada. Ninguna comparación acierta, **en el 100% de las invocaciones**.

`DMZ OrdersController.cs:282,291,294-295,297` vs `SAP OrderController.cs:149-150`

**Por qué existe ese `.Trim('"')`:** porque LAN devolvía `Ok("Ok")` (`LAN OrdersController.cs:249`), es decir una **cadena JSON** `"Ok"`. Al recortar las comillas queda `Ok`, que sí pasaba la comparación. El puente se conmutó a SAP **sin portar el contrato de respuesta**.

*Nuance añadido por el verificador:* el DMZ además **degrada un 400 legítimo a 500**. Cuando SAP responde `BadRequest("Error, No se encontró el pedido…")`, `PostSAP` devuelve `"WebException: … Body: {…}"` (`Curl.cs:138-139`), que tampoco iguala `"noexiste"`. **La rama de 400 es inalcanzable por completo.**

*Y la distinción que agrava el hallazgo:* en el camino feliz la reversión **sí se ejecuta** en S/4HANA (`OrderMethods.cs:3086-3089`) **antes** de que el DMZ evalúe nada. Lo roto es el contrato con Magento, no el efecto en SAP — lo que significa que **éxito real y fallo son indistinguibles**, y cualquier reintento aguas arriba reintentará sobre una entrega ya anulada.

**C02 · Cancelar un pedido no despachado falla** — *Javier* — **CONFIRMADO, con dos correcciones**

`ReverseGoodsIssueAsync` es lineal y no tiene ninguna guarda tolerante: SD36 → `GetDeliveryDocumentAsync` → excepción. Un pedido sin entrega logística revienta y sale como 400 de SAP → 500 del DMZ, **sin cancelar nada**. LAN lo resolvía con `spAfectar VTAS/CANCELAR` sobre la Venta, sin necesitar entrega.

> [!warning] Corrección 1 — la línea citada estaba mal
> En el caso normal de negocio el fallo **no** se dispara en `:3056-3059`, sino antes, dentro de `GetDeliveryDocumentAsync`: cuando `d.results` viene vacío lanza en **`OrderMethods.cs:3148`** y su catch re-lanza sin envolver (`:3159`). La guarda de `:3056-3059` solo actúa en el caso más estrecho de `results` con elementos pero sin `DeliveryDocument`.

> [!warning] Corrección 2 — el remedio que se había propuesto era engañoso
> Se dijo que *"`FullCancelAsync` sí lo contempla"*. **Falso.** `FullCancelAsync` no cancela el pedido sin entrega: devuelve la cadena `"ok"` **sin ejecutar nada en SAP** (`:2908` cuando `GetDeliveryDocumentAsync` lanzó por results vacíos, `:2915` cuando el delivery vino en blanco). Contempla la **respuesta** que el DMZ espera, no la **cancelación**.
> **Enrutarlo tal cual convertiría un 500 honesto en un 200 mentiroso**: Magento marcaría como cancelado un pedido que sigue vivo en S/4HANA. Es peor que el estado actual.

Confirmado por grep: `FullCancelAsync` tiene **cero llamadores** — solo aparecen su declaración (`:2875`) y su propio `Console.WriteLine` de error (`:2962`).

#### ¿La ruta de SAP equivale al flujo de cancelación de LAN? **No**

Y la brecha no es de matiz. Difieren en el contrato, en el efecto y en el alcance funcional:

| | LAN | ServicioSAP |
|---|---|---|
**Contrato** | Siempre `Ok("Ok")` (`OrdersController.cs:249`) → el DMZ responde 200 | `Ok(objeto)` en éxito, `BadRequest` en fallo → el DMZ responde **500 siempre** |
**Efecto** | `spAfectar VTAS/CANCELAR` — **cancela el documento** (`OrderMethods.cs:1400-1414`) | Solo `ReverseGoodsIssue` — revierte el movimiento de mercancías de una entrega existente |
**Alcance** | Bifurca por `estaFacturado`: no facturado → cancelación dura; facturado → Reporte de Servicio + Solicitud de Devolución | Sin bifurcación. Solo pedidos **ya despachados** |

**1. El contrato está invertido.** Donde LAN siempre decía éxito, SAP siempre dice error.

**2. El efecto en el sistema destino es distinto, y deja un descuadre.** En todo `OrderMethods.cs` **no hay una sola referencia a `RejectionReason`, `DeliveryBlock`, ni un DELETE/PATCH sobre `A_SalesOrder`**: ningún camino de ServicioSAP marca el pedido de ventas como cancelado o rechazado. Tampoco cancela la factura — `PostCancelInvoiceAsync` solo se invoca desde `FullCancelAsync`, que es código muerto. **Tras un `cancelOrder` "exitoso" en SAP, el pedido y la factura siguen vivos y solo se revirtió el inventario.** Es un descuadre entre facturación e inventario que LAN no producía.

**3. El caso mayoritario ni siquiera entra.** El escenario que LAN resolvía por diseño —cancelar un pedido aún sin despachar— es exactamente el que SAP no soporta.

**4. Falta toda la rama de pedido facturado.** LAN genera Reporte(s) de Servicio (`SpINVRepServ`, uno por pieza), bitácora de garantías (`SpVTASEcommerceSolicitudGarantias`) y, si `producto[0].resolucion == "R"`, una Solicitud de Devolución `VTAS.SD` con su afectación contable. **Nada de eso existe en la ruta SAP.**

> [!tip] En resumen
> La ruta de SAP hace **algo distinto** (revertir PGI), sobre un **subconjunto distinto** de pedidos (solo los ya despachados), y lo reporta a Magento **al revés** (500 sobre éxito). El único punto de contacto con LAN es el nombre del endpoint.

#### Qué habría que hacer, en orden

1. **Completar la cancelación real del pedido en S/4HANA** — motivo de rechazo por posición o cancelación del documento. Es el paso de fondo: hoy ningún camino de ServicioSAP cancela un pedido de ventas.
2. **Después** enrutar `CancelOrder` a `FullCancelAsync` y devolver `Ok(cadena)` para que el cuerpo sea `"ok"` / `"noexiste"` y el `.Trim('"')` del DMZ funcione. **En este orden**: hacerlo antes convierte el 500 en un falso positivo.
3. **Definir el equivalente SAP de la rama facturada** (Reporte de Servicio + Solicitud de Devolución `VTAS.SD`). Si el negocio la necesita, `cancelOrder` no puede ser la única puerta.
4. **Dejar de usar cadenas mágicas como contrato** entre DMZ y ServicioSAP: propagar el status HTTP y un cuerpo tipado `{status, message}`. Mientras `Curl.cs:130-146` devuelva los errores como si fueran respuestas válidas, el DMZ no puede distinguir "no existe" de "SAP caído" (R-03).

#### El flujo de anulación: SD48 + SD46, y eso es todo

> [!warning] RETRACTACIÓN — una versión anterior afirmaba que faltaban SD47 y SD37
> Se dijo que el flujo de anulación tenía cuatro pasos (SD48 → SD46 → SD47 → SD37) y que
> `FullCancelAsync` lo ejecutaba incompleto. **Era falso.** Confirmado con el equipo:
> * **SD47 "Borrar Entrega" no existe.** En SAP una entrega **no se borra, se cancela** — y esa
>   cancelación *es* la reversión de la salida de mercancías (SD46). No hay un paso aparte.
> * **SD37 "Modificar estatus" no existe.** No hay ningún estatus del pedido que haya que modificar.
>
> **Conclusión corregida: la cadena de anulación es SD48 (anular factura) + SD46 (anular salida de
> mercancías), y `FullCancelAsync` la implementa completa.** No falta ninguna API por pedir.

| Paso | API | Estado |
|---|---|---|
1 | [[SD48]] Anular factura | ✅ `PostCancelInvoiceAsync` |
2 | [[SD46]] Anular salida de mercancías — *es* la cancelación de la entrega | ✅ `PostReverseGoodsIssueAsync` |

#### Cómo se produjo el error, para no repetirlo

> [!danger] Regla de evidencia: una API existe **solo si tiene ficha en `RSG\` con su URL OData**
> El error vino de tratar como catálogo de APIs lo que en el pptx son **etiquetas de diagrama**.
> Verificado contra el volcado crudo del original (`Arquitectura Sistema POS Credito MAVI-v060325.pptx`):
>
> * `SD37 @(50,43)` — caja suelta de un diagrama, junto a `Pedido @(108,43)` y `Oferta @(108,50)`,
>   con notas asteriscadas `*Modifica estatus` y `* Rechazar pedido`.
> * `SD47 @(92,39)` — etiqueta junto a `Entrega @(121,40)` bajo el título *Anulación Documentos Logísticos*.
> * `SD08 @(57,19)` — etiqueta junto a `Consulta de factura @(95,19)`.
>
> **El deck tiene solo 2 bloques de tabla en 178 diapositivas, y ninguno es un catálogo de APIs.**
> La "tabla catálogo de APIs" que se citaba era una **síntesis del resumen en Markdown**, no una tabla
> del original. Y la frecuencia no distingue: SD37 aparece 7 veces, SD01 7 veces y SD09 solo 2 — pero
> SD01 y SD09 sí tienen ficha con URL, y SD37/SD47/SD08 no.
>
> **Criterio a aplicar de aquí en adelante:** un código SDxx mencionado en un deck es un *concepto de
> proceso*. Solo es una API consumible si existe `RSG\sdXX_*.md` con su URL OData y su equivalencia
> de campos. No pedir "la ficha que falta" de algo que nunca fue una API.

#### Corrección al encuadre de la divergencia

Se dijo antes que ServicioSAP "hace algo distinto de LAN" en el caso facturado. **Matiz importante:** el ToBe de MAVI documenta **las dos políticas por separado** — un flujo de *anulación de ventas* (sección 4.6, diaps. 37-38) y un flujo de *devolución* (SD08 → SD09 → SD10 → SD05 → EX01 → SD34 → TZ01, diaps. 35-36).

Los hechos verificados siguen en pie: LAN aplica el flujo de **devolución** ante un pedido facturado, y `FullCancelAsync` aplica el de **anulación**. Pero SD48 y SD46 **no son un excedente**: son los dos primeros pasos de un flujo legítimo y documentado. Los dos errores reales son:

1. Aplicar el flujo de **anulación** donde LAN aplica el de **devolución**, y
2. ~~ejecutar ese flujo de anulación incompleto~~ — **retirado:** la cadena es SD48 + SD46 y está completa (ver la retractación arriba). Lo que queda por confirmar es si SD42 / SD34 / TZ01 son pasos reales o también etiquetas de diagrama; con el criterio de evidencia vigente, ninguno tiene ficha en `RSG\`.

> [!warning] Decisión de negocio pendiente, no deducible del código
> ¿Una cancelación de ecommerce sobre un pedido **ya facturado** debe seguir la política de LAN
> (no anular; abrir reporte de servicio y, si `resolucion=="R"`, devolución) o la de anulación dura
> del ToBe? **El RSG contempla ambas y no resuelve cuál aplica.**

#### Bifurcación incorrecta — defecto confirmado

LAN bifurca por **¿está facturado?** (`ServiceOrderMethods.cs:33-36`, consulta la factura directamente por `idecommerce`).
`FullCancelAsync` bifurca por **¿existe entrega?** (`OrderMethods.cs:2896-2931`).

**Un pedido con entrega y sin factura cae en la rama equivocada.** Además el predicado de SAP solo alcanza la factura *a través* de la entrega (`GetBillingDocumentByDeliveryAsync`), así que si la facturación va referida al pedido, da falso negativo. [[SD08]] resolvería esto correctamente.

*Nota:* ni `A_OutbDeliveryItem` ni `A_BillingDocumentItem` ni el filtro `ReferenceSDDocument` aparecen en **ningún** archivo del catálogo RSG. Funcionan por conocimiento del estándar SAP, no por especificación de MAVI. Conviene ratificarlos.

#### Defectos en la ruta de devolución — y `order/setreturn` YA ESTÁ EN PRODUCCIÓN

Al mapear la rama `resolucion=="R"` de LAN contra [[SD09]] aparecieron defectos que **no son de `cancelOrder`, sino de la ruta de devolución que ya está conectada**:

| Sev. | Defecto | Evidencia |
|---|---|---|
alta | **`store` no se traduce de dominio.** `OrderRMA.store` es `'1'`/`'2'`, pero `BuildSapOrderAsync` compara contra `'viu'`/`'muebles_america'` → **toda devolución cae al default SalesOrg 04 / Plant 2000 / SalesOff 2000**, centro equivocado | `BuilAdapterReturn` `:2045` vs `BuildSapOrderAsync` `:2098-2112` |
alta | **Campo colisionado.** `BuilAdapterReturn` escribe `condicion = art.motivoDevolucion` y `BuildSapOrderAsync` lo consume como **condición de pago**, lanzando *"La condición de pago QUEBRADO O MALTRATADO no existe"* | `:2060` → `:2126` → lanza en `:2138` |
alta | **`refDoc` apunta al pedido, no a la factura.** SD09 exige la FACTURA en `REF_DOC` y valida contra VBRK (error `ZSD002`), pero se manda `DocumentNumber` del pedido con `refDocCat="C"` | `ProcesarDevolucionSAPAsync:1545-1546` vs `sd09_devolucion.md` §3 |
media | `metodoPago` no se propaga → `DistrChan` siempre `'01'`: **una devolución de venta a crédito se crea en el canal de contado** | `:2087-2090` |
media | La compuerta `producto[0].resolucion == "R"` **no existe en ninguna de las dos rutas**. `order/setreturn` crea el ZDME sin mirarla; `BuilAdapterReturn` ni copia el campo | `OrderController.cs:66-93`; `:2041-2065` |
media | Si un SKU del RMA no hace match contra los items de SD36, el precio queda en **0** y el ZDME sale con `COND_VALUE 0` | `:1552-1568` |
media | `PurchNoC` incoherente: `FullCancelAsync` arma `ZSD_{tipo}_{id}` y `ProcesarDevolucionSAPAsync` hardcodea `ZSD_ZMER_{id}` → **consultan documentos distintos para la misma orden** | `:2882-2885` vs `:1520` |
baja | `to_series` va vacío y SD09 valida series contra VBRP/ZSDT_SERIES (error `ZSD003`). Bloqueado por falta de **fuente** del dato, no de API | `:2288`; `sd09_devolucion.md` §3 |

**Los seis primeros son construibles hoy**, sin depender de ninguna ficha técnica pendiente.

#### Lo que NO debe migrarse

`generateWorkstation` / `clearWorkstation` y todo el aparato de *estación* son aislamiento de concurrencia sobre tablas de staging de Intelisis (`VentaCteDLista`). **SAP no expone tablas de staging al cliente: se descarta, no se replica.**

El bloque `ventaCteD` de LAN tampoco es un "calendario de cobro": es **selección y aplicación de partidas abiertas** (compensación). Su lado de lectura lo cubre [[EX01]]; el de escritura (`D-CRED-04` / `N-CXC-02`) está nombrado en el deck pero sin ficha.

---

**C03 · `PostSAP`/`GetSAP` nunca lanzan: el DMZ responde 200 con el texto del error** — *Marcos*
Ver R-03. En `order/setOrder`, `responseSAP` trae `"WebException: … Body: …"`, no está vacío, falla el `JsonConvert` y el catch nunca se dispara.
`DMZ Curl.cs:130-146` y `:225-241` · consumo ciego en `OrdersController.cs:196-227, :317-321, :238`.

**C04 · `order/validateCredit` fue eliminado del DMZ, no reapuntado** — *Javier*
Ver R-07.

**C05 · `openpay_stores` se escribe en SAP pero nadie la consume: las referencias VIU expiradas nunca se cancelan** — *Javier*
`SetOrderAsync` escribe la fila (`OrderMethods.cs:435-459`, invocado en `:1670`) y continúa. En LAN, `CheckStoresStatus` (`OpenpayMethods.cs:169-206`) recorre las filas `in_progress`, consulta Openpay y, si la referencia expiró, cancela en Intelisis y empuja `canceled_intelisis` a Magento. **En ServicioSAP no existe ese consumidor.**

**C06 · `credit/getClienteFactura` devuelve 500 en toda llamada exitosa** — *Marcos*
El DMZ hace `JObject.Parse(response)` (`CreditController.cs:51-58`) pero `AbonosController.GetClienteFactura` devuelve `Ok(List<ZSplitDto>)`, un arreglo. `JObject.Parse` lanza sobre un arreglo y el catch genérico responde 500. El endpoint está marcado Conectado=Sí.

**C07 · `credit/getClienteFactura`: el contrato `SaldoFactura` se sustituyó por filas crudas de TZ01** — *Marcos*
LAN devuelve un objeto con cabecera de saldo (`saldoCapital`, `atraso`, `moratorios`, `adeudoTotal`, `liquidaConSolo`, `pagoPuntual`, `pagoParaEstarCorriente`, descuento, promoción), detalle de artículos y `costoEnvio` separado. SAP devuelve las filas de TZ01 sin esa cabecera.
`LAN FacturaMethods.cs:140-217` vs `SAP Models\SAP\Payment\Abonos\ZSplitDto.cs:6-80`.

**C08 · `credit/GetAccountDebts` marcado "EX01 - Migrado" pero SAP no replica ninguna regla de cobro** — *Marcos*
LAN construye la respuesta en tres pasos: SP `SPCXCCobrosClientesBBVA` → `FormatearDatos` (agrupa por CanalVenta 3/76/77/78/7/79 en CRÉDITO MA, DIMAS, DINERALIA, EMPRESARIO MA, CRÉDITO VIU, EMPRESARIO VIU) → `FiltrarPorFecha` (ordena por vencimiento y aplica la regla DIMAS de pago puntual). SAP hace una lectura cruda de EX01.
`LAN CustomerServiceMethods.cs:776-852, 1169-1212, 1510-1727` vs `SAP AbonoMethods.cs:19-51`.

**C09 · `getMinimumCostToRedeem` no replica el cálculo por familia** — *Javier*
Faltan dos fases: la exclusión de artículos cuya familia no está permitida y el recálculo multi-familia de `montoMaximoRedimibleGlobal`.
`SAP WalletMethods.cs:220-232` vs `LAN WalletCustomerMethods.cs:271-400`.

**C10 · `customer/wallet/details` ignora el campo `uen`** — *Marcos*
El controlador llama `GetCustomerWalletAsync(request.cliente)` y descarta `request.uen`. LAN discriminaba en dos puntos: el campo de serie (`SerieMonedero` para uen=1, `SerieMonederoVIU` en otro caso) y el saldo por uen.
`SAP WalletCustomerController.cs:26`, `WalletCustomerMethods.cs:62, :90` vs `LAN WalletCustomerMethods.cs:65`.

**C11 · `prospecto/recuperarcuenta` estaba expuesto sin autenticación** — *Javier* — ✅ **CORREGIDO**
`ProspectoController` no llevaba `[Authorize]` ni `[AllowAnonymous]` y el handler global no rechaza (R-09). **Se agregó `[Authorize]` en `ProspectoController.cs:14`** durante esta auditoría. Con eso C12 deja de ser explotable sin credenciales, aunque la inyección de filtro OData sigue pendiente de arreglo.

**C12 · Inyección de filtro OData en `prospecto/recuperarcuenta`** — *Javier*
`nombre`, `apellidoPaterno`, `apellidoMaterno` y `rfc` se interpolan crudos en `sapFilter` sin escapar la comilla simple (`ProspectoController.cs:46, :48-49`). Un `rfc` como `XAXX010101000' or RFC ne 'ZZZ` altera la expresión y devuelve el primer BP que empate. **Combinado con C11, es explotable sin credenciales.**

### Severidad media

**C13 · `credit/getClienteFactura` ignora el parámetro `cliente`: se pierde la validación de pertenencia** — *Marcos*
LAN valida contra `^C[0-9]{8}$` y pasa `@Cliente` + `@MovID` al SP, así que la factura solo se devuelve si pertenece a ese cliente. SAP recibe `{cliente}` y solo pasa `{factura}`.
`LAN CreditController.cs:75` y `FacturaMethods.cs:112-116` vs `SAP AbonosController.cs`.

**C14 · `credit/guardardocumento` en el DMZ es `[AllowAnonymous]`** — *Diego* · Ver R-10.

**C15 · `LoginClienteCredito` y `LoginClienteCreditoFechaN`: el CSV dice Conectado=Sí pero el DMZ llama a LAN** — *Javier*
Ambos están implementados en ServicioSAP sobre BP05_MA, pero el puente sigue usando `curl.Post`.
`DMZ CustomerServiceController.cs:218, :229` vs `SAP CustomerServiceMethods.cs:222-317`.

**C16 · El puente `customer/wallet/getCuentaC` apunta a una ruta y un verbo que no existen en LAN** — *Javier*
El DMZ hace `curl.Get("customer/getCuentaC/{ordenCompra}")`. La ruta real es `customer/wallet/getCuentaC/{idEcommerce}` y está declarada `[HttpPost]`. Mal por partida doble: falta el segmento `/wallet/` y usa GET contra un POST.
`DMZ WalletCustomerController.cs:64` vs `LAN WalletCustomerController.cs:10, :39-41`.

**C17 · El enmascarado del nombre en `recuperarcuenta` no coincide** — *Javier*
LAN conserva primera y **última** letra y deja intactas las palabras de dos letras (`JUAN → J**N`, `DE → DE`). SAP conserva solo la primera (`JUAN → J***`, `DE → D*`).
`SAP CustomerServiceMethods.cs:173-192` vs `LAN ProspectoController.cs:152-169`.

### Severidad baja

**C18 · `checkOpenpay`: condición invertida impide marcar `is_in_intelisis`** — *Javier*
`OpenpayMethods.SetPedido` evalúa `if (res != "Concluido" || !Regex.IsMatch(res, @"^C\d+$")) return false;`. La expresión es **siempre verdadera**: ninguna cadena puede ser a la vez `Concluido` y coincidir con `^C\d+$`. Siempre devuelve false, el UPDATE nunca corre y el bloque `:283-286` es código muerto. *Bug preexistente en LAN* (`OpenpayMethods.cs:277`), no introducido por la migración.

**C19 · `credit/ApplyPaymentNeko` y `credit/UpdateStatusPaymentNeko` son stubs que devuelven éxito** — *Marcos*
Ambos delegan en métodos cuyo cuerpo es un `// TODO` y un `return true` (`AbonoMethods.cs:94-98` y `:100-104`). Severidad baja **solo porque el DMZ todavía no los consume**. En el momento en que se conmute el puente —el siguiente paso natural, dado que `GetAccountDebts` ya apunta ahí— el sistema responderá `{Success:true}` sin registrar el pago.

**C20 · `obtenerQuejas` y `bbvaKeyAdvanced` ya están conectados, pero el CSV los declara No/No** — *Diego*
Con paridad verificada respecto a LAN. Corregir el CSV (§7).

**C21 · Filas con Conectado=Sí cuya columna "Ruta ServicioSAP" dice `To Do`** — *Diego / Javier* · Ver §7.

**C22 · `credit/getPlazos` degrada a 0 días en silencio** — *Javier*
Si `GetSapPaymentCode` no encuentra el `Zterm` o `Zdiasgracia` no parsea, `days` se queda en 0 y el plazo se agrega igual, sin log ni error. El catch general devuelve un `PlazosResponse` vacío con 200; LAN devolvía `{Error, Message}`.
`SAP CreditMethods.cs:42-51, :84-93, :109-114` vs `LAN CreditMethods.cs:2541-2560`.

**C23 · `customer/wallet/getMinimumCostToRedeem` marcado Conectado=Sí pero el DMZ llama a LAN** — *Javier*
`DMZ WalletCustomerController.cs:82` usa `curl.Post`. Fila 112 del CSV.

### Añadido tras resolverse el acceso a la cadena de conexión

**C24 · Las listas negra/blanca cambiaron de SP, de parámetro y de base de datos** — *Diego*

| | LAN | ServicioSAP |
|---|---|---|
Procedimiento | `SpVTASListaNBMagento` | **`SpListaNBMagento`** (sin `VTAS`) |
Base de datos | Intelisis (`sCadenaConexion`) | **SigMavi** (`obtenerConexionSigMaviAsync`) |
7º parámetro | `@NumCuenta` | **`@IdMagento`** |

`LAN CustomerMethods.cs:124,126,128` vs `SAP Methods\Customer\CustomerMethods.cs:26,28,33`.

El SP disponible en `SPsOrden\SpVTASListaNBMagento.sql:23-30` declara la firma con `@NumCuenta varchar(10)`, no `@IdMagento`. **Si la copia de SigMavi es un port directo, la llamada de ServicioSAP falla por nombre de parámetro inexistente.** Afecta a las tres rutas `customer/setCustomerList`, `getCustomerList` y `deleteCustomerList` (filas L33, L34, L35 del CSV, las tres marcadas Conectado=`SI`).

*Verificado directamente sobre el código en ambos proyectos; la consecuencia depende de la firma real del SP en SigMavi, que no está en el repositorio.* Es la comprobación de menor esfuerzo y mayor valor de toda la lista: un `sp_helptext SpListaNBMagento` en SigMavi la resuelve.

---

## 4. Hallazgos refutados — no volver a reportarlos

19 hallazgos que **no sobrevivieron** la verificación. Se documentan con su razón para que no reaparezcan en la próxima auditoría.

| Hallazgo descartado | Por qué no se sostiene |
|---|---|
`cancelOrder` pierde la rama de pedido facturado | La rama "facturado" de LAN no es código de `cancelOrder`: es idéntica a la de `returnOrder`, y sus piezas son SPs de Intelisis, fuera de alcance |
`returnOrder` solo crea el documento ZDME | Lo "faltante" son SPs y tablas transaccionales de Intelisis: es la decisión de alcance que las reglas del proyecto ordenan |
`BuilAdapterReturn` descarta `resolucion` y `dateTime` | LAN no usa `order.dateTime` sino `fechaA(int ID)`, que lee `FECHAEMISION` de la tabla |
La devolución busca el original con `ZMER` hardcodeado | `orderRequest.tipo` no existe en el `OrderRequest` de ServicioSAP; la premisa es falsa |
`afectar()` es código muerto | La evidencia es exacta, pero ya está cubierto como stub declarado; no es un hallazgo adicional |
Pickup: los escritores existen pero nadie los usa | Es una decisión de alcance documentada en `StorePickupMethods.cs:19-21`, no un stub olvidado |
`getIntelisisStatuses` declarado Generado=Sí sin adaptador | Lectura selectiva del CSV: la fila real dice `Conectado=No, Generado=Si` |
`creditStatus` declarado Generado=Sí sin implementación | La premisa es factualmente falsa contra la fila real del CSV |
La cadena de pago BBVA/Neko quedó partida | El ruteo partido es intencional según la fuente de verdad |
`credit/GetCreditAmounts` conectado pero su fuente nunca se llena | `CredilanaMethods.cs:14-36` está completamente implementado y probado; el contrato E-06 existe |
`credit/guardardocumento` deja los documentos inaccesibles | Malinterpreta lo que prueba la evidencia y atribuye el defecto al lugar equivocado |
Tres rutas del DMZ reenvían a endpoints que no existen en LAN | Las rutas existen; la evidencia es correcta pero la conclusión no |
`getMinimumCostToRedeem` descarta artículos sin campo `descuento` | Se citó un fragmento no representativo: LAN exige `descuento` en 10 de 11 lecturas |
Si el catálogo de AWS falla, se autoriza redimir sin tope | La cadena causal es imposible en el código: con catálogos vacíos no se suma el carrito |
Lista negra/blanca se descarta si el correo no existe como BP | La precondición **sí existía** en LAN, dentro del SP |
`partner/testnew` crea Business Partners arbitrarios | El controller lleva `[Authorize]` (`:14`) y la ruta productiva `partner/client` tiene la misma capacidad y la misma única validación. No hay escalada de privilegio |
Los 64 puntos OData con `ENVIROMENT_DEV` fijo | Califica como antipatrón el patrón que la regla 9 impone (base URL desde la DLL) |
El DMZ resuelve LAN contra localhost | Mal caracterizado: `DOMINIO_LAN` no rutea nada, solo alimenta `TrustedHosts`. El problema real de config es R-06 |
LAN y ServicioSAP comparten la misma llave JWT de prueba | La comparativa fue dev-config vs dev-config. El `Web STAGE LAN.config:12` usa otra llave, y el borde expuesto (DMZ) usa una tercera |

> **Nota sobre `testnew`.** En un reporte preliminar se calificó como hallazgo de seguridad alta. **Es incorrecto:** ambos endpoints están detrás de `[Authorize]` y no otorgan capacidad que la ruta productiva no dé ya. Siguen siendo higiene de código a eliminar antes de producción (§6, §8), no un agujero.

---

## 5. Hallazgos sin verificar

29 hallazgos que **no** pasaron por el verificador adversarial, por el tope de la corrida. Dado que la tasa de refutación fue del 45%, hay que asumir que **una fracción significativa de esta lista no se sostiene.** Verificar antes de actuar.

| Sev. | Hallazgo | Evidencia |
|---|---|---|
alta | En crédito de cliente nuevo, SAP devuelve el id de Magento donde Magento espera un BP | `SAP OrderMethods.cs:700, :1695-1700` |
alta | Revalidación de D-01..D-20: los 20 hallazgos siguen vigentes en el código actual | `OrderMethods.cs:390,633,655,697,…` |
media | `getPosCancellations` mapeado a una operación de sentido opuesto | CSV L81 · `LAN OrdersController.cs:109-132` |
media | El `Web.config` versionado del DMZ apunta a localhost | `DMZ Web.config:16-17, :22-24` |
media | El DMZ ya no autentica contra LAN: reutiliza el token de SAP | `Curl.cs:61-71, :80-84` |
media | `Curl.Post` devuelve la excepción como cuerpo y el DMZ la deserializa sin guarda | `Curl.cs:108-111` · `MercanciaController.cs` |
media | `magento/getOrderId` indexa arreglos anidados sin verificar longitud | `DMZ MagentoController.cs:182-185` |
media | LAN `returnOrder`: guarda de nulo inalcanzable | `LAN OrdersController.cs:256-258, :263` |
media | Indexaciones sin guarda en `cancelOrder` y `setOrderStatus` de LAN | `LAN OrdersController.cs:215, :319-339` |
media | El DMZ no replica la validación `Importe>0` de `InsertPaymentData` | `DMZ OrdersController.cs:51-65` |
media | Riesgo de dos bases SQLite distintas para guías y openpay | `LAN OrderMethods.cs:737, :758` vs `SAP SQLiteDb.cs:11,27` |
media | `sale/filter` recibe un filtro OData como segmento de ruta sin validar | `SAP SaleController.cs:56-73` |
media | `LiberadorCreditoMethods` perdió el log persistente | `SAP LiberadorCreditoMethods.cs:54,94,98,104` |
media | Los métodos de abonos apuntan a `ENVIROMENT_DEV` | `SAP AbonoMethods.cs:21,57,113` |
media | `recuperarcuenta` acepta peticiones que LAN rechazaba | `SAP ProspectoController.cs:21-24, :60` |
media | El DMZ devuelve `Ok("Correcto")` fijo en `setCustomerList`/`deleteCustomerList` | `DMZ CustomersController.cs:70-74, :106-110` |
media | `customer/getCustomerList` es `[HttpGet]` con modelo complejo sin `[FromUri]` | `DMZ CustomersController.cs:77-85` |
media | `company/wholesale-customer` devuelve nombre de persona en vez de razón social | `SAP BusinessPartnerMethods.cs` |
media | El DMZ decide "cliente no encontrado" con `Contains("null")` | `DMZ WholesaleCustomerController.cs:29-36` |
media | El regex del DMZ rechaza cuentas de mayoreo que no sean 8-10 dígitos | `DMZ WholesaleCustomerController.cs:20-23, :40` |
media | Fallback de canal arbitrario en `getMinimumCostToRedeem` | `SAP WalletMethods.cs:83-96, :131` |
media | Mapeo de estatus 04/05/81 cableado y sin documentar | `SAP WalletMethods.cs:179-214` |
media | Traversal de ruta en `product/obtenerImagen` y `product/uploadImage` | `SAP ProductImageMethods.cs:38` |
media | Filtro OData crudo desde la URL en `product/filter` y `product/stock/filter` | `SAP ProductMethods.cs` |
media | El `TokenValidationHandler` deja pasar peticiones sin `Authorization` en los 3 proyectos | `TokenValidationHandler.cs:38-42` (×3) |
media | `product/exportaart/{store}` solo implementado para `ma` | `SAP ProductController.cs:29-38` |
media | El cambio de SP y de base en las listas negra/blanca no está verificado | `SAP CustomerMethods.cs:26-48` |
media | Se pierde `deleteReservations` al migrar el delta de stock | `LAN ProductsController.cs:184-188` |
media | Cinco filas del CSV contradicen al código | CSV filas 35, 112, 113, 115, 116, 131 |

---

## 6. Violaciones de estándares

83 violaciones contra las reglas de [[SKILL.md]]. Solo las de mayor densidad.

> **Regla 16 retirada.** El uso de `curl.GetSAP` y los endpoints `[HttpGet]`/`[HttpPatch]` de ServicioSAP **ya son válidos** (confirmado por el equipo: `GetSAP` se creó a propósito por escalabilidad). La regla fue reescrita en `SKILL.md:56` y esas ocurrencias no se cuentan como violación.

### R12 · Async/await — 24 violaciones altas

| Archivo | Ocurrencias |
|---|---|
`Methods\MaterialManagement\ProductMethods.cs` | **34** `SendAsync(...).GetAwaiter().GetResult()` + `ReadAsStringAsync().GetAwaiter().GetResult()`. Mayor densidad del proyecto |
`Methods\BusinessPartner\BusinessPartnerMethods.cs:183-186` | Triple antipatrón: `Task.Run` + `.Wait()` + `.Result` |
`Methods\Order\OrderMethods.cs:1503,1510,1511,1585,1750` | `SetOrderAsync` es async pero llama a `GetTokenSap`, que bloquea |
`Controllers\OrderController.cs:126,149,171` | Tres endpoints bloquean el hilo de request aunque el destino ya es async |
`Helpers\TokenGenerator.cs:172,176` | `GetTokenSap` bloqueante, duplicado exacto de la versión async |
`Methods\Credit\LiberadorCreditoMethods.cs:77,85` | Dos llamadas HTTP con `WebClient.UploadString`, sin async |
`Methods\Abono\AbonoMethods.cs:100` | `async Task<bool>` sin ningún `await`: el cuerpo es un TODO |

### R8 · Trazabilidad — 24 violaciones

- `OrderMethods.cs`: **32 bloques `catch` que solo hacen `Console.WriteLine`**, incluidos `ValidarPedidoExistenteSAP` (:399), `SaveToValidateOpenpay` (:427), `SaveGuide` (:488). Bajo IIS eso se pierde.
- `SetOrderAsync` (:1622-1840) traza sus 17 fases con `Console.WriteLine`.
- **Cero trazas de ningún tipo** en: `DeliveryAddressMethods.cs`, `SalesMethods.cs` (incluye la validación de idempotencia de órdenes), `AbonoMethods.cs` (incluye el flujo de pagos), `MagentoAccountMethods.cs`.
- **14 de los 19 controladores** no tienen ninguna traza.
- `Helpers\Logger.cs:11,19`: escribe en `C:\inetpub\wwwroot\log\sap.log` hardcodeado y envuelve todo en un `catch { }` silencioso. Si falla el permiso, se pierden los logs sin aviso.

### R20 · Rutas OData hardcodeadas — 9 violaciones altas

Servicios escritos como literal en vez de leerse de `<appSettings>`, **y cuyas claves no existen en `Web.config`**: `ZAPI_ARTICULOS_SRV`, `ZCDS_DIM11_EXISTENCIA_CDS`, `ZAPI_JERARQUIA_ARTICULOS_SRV`, `ZB_DATOS_CLIENTE_CDS`, `ZAPI_BP01_PARTNER_SRV`, `ZAPI_BP05MA_SRV`, `ZSDT_CTE_ODATA_SRV`, `API_BUSINESS_PARTNER`, `ZSRV_SALESDOC_ADDRCHANGE_SRV`, `API_BILLING_DOCUMENT_SRV`, `API_OUTBOUND_DELIVERY_SRV`, `ZAPI_VENTAS_SRV`, `ZAPI_DOCVTAS_CHECK_CDS`, `ZAPI_PROPRELIST_SRV`, `ZFICRUD_COBREF_SRV`, `ZAPI_CTACLBSTP_SRV`, `ZAPI_CONDITIONCONTRACT_SRV`.

Varios archivos son internamente inconsistentes: `AbonoMethods.cs` lee del `Web.config` en :22 y :62 pero hardcodea en :116 y :156.

**Divergencia de mandante:** `SalesMethods.cs:26` es el único call site que apunta a `sap-client=100`; los otros 65 usan `110`.

### Conformidad de SD46 y SD48 con sus especificaciones RSG

Validado el 2026-09-08 contra `RSG\sd46_anulacion_salida_mercancias.md` y `RSG\sd48_anulacion_facturas.md`, con verificación adversarial. **Veredicto: PARCIAL en ambas — el transporte cumple, la lectura de la respuesta no.**

#### Lo que sí cumple (verificado línea a línea)

| Aspecto | SD46 | SD48 |
|---|---|---|
Nombre del servicio | `API_OUTBOUND_DELIVERY_SRV;v=2` ✅ con el sufijo | `API_BILLING_DOCUMENT_SRV` ✅ sin sufijo, como pide su spec |
Function import y verbo | `POST /ReverseGoodsIssue` ✅ | `POST /Cancel` ✅ |
Comillas simples en la query | ✅ | ✅ |
Casteo `datetime'…'` | ✅ formato `yyyy-MM-ddTHH:mm:ss` | n/a |
`sap-client` / idioma | ✅ `sap-langu=ES`, literal como la spec | ✅ `sap-client=110` |
CSRF + cookie `JSESSIONID` | ✅ | ✅ |

> [!info] El flujo CSRF funciona — hipótesis descartada
> Se sospechó que el `POST` perdería la cookie de sesión y daría 403 en ambas APIs. **Refutado con evidencia directa:** `Helpers\TokenGenerator.cs:149-150` crea el handler con `UseCookies = true` y un `CookieContainer`, y `CreateClientS4()` devuelve el `HttpClient` sobre ese handler. El GET de *fetch* y el POST comparten esa misma instancia, así que la cookie se conserva y se reenvía.

#### El defecto de fondo, común a las dos — severidad alta

**Nadie lee el nodo `RETURN`.** Ambas specs declaran que `RETURN.TYPE` (`S`/`E`/`W`/`I`) es lo que dictamina si la anulación tuvo éxito. El código solo evalúa `IsSuccessStatusCode`:

| API | Única condición de éxito | Consecuencia |
|---|---|---|
SD46 | `OrderMethods.cs:3092` | Un HTTP 200 con `TYPE='E'` se devuelve al POS como éxito |
SD48 | `OrderMethods.cs:163` | Idéntico, y en la ruta realmente enrutada (`order/cancelInvoice`) |

**Los modelos ya están escritos y sin usar:** `Models\SAP\Order\Response.cs:172-197` (SD46) y `:216-224` (`CancelInvoiceReturn.Type`, SD48). Es la misma familia de C01 y C03: **éxito y rechazo de negocio son indistinguibles**.

#### Defectos secundarios confirmados

| Sev. | Defecto | Evidencia |
|---|---|---|
media | El GET de *fetch* CSRF de SD46 no lleva `sap-client=110`, mientras el POST sí. Todas las demás rutas del proyecto sí lo incluyen en el fetch | `OrderMethods.cs:3063` vs `:3073`; contraste con `:138`, `:3010`, `:1499`, `:1746` |
media | `ActualGoodsMovementDate` cae en silencio a `DateTime.Now` si `order.dateTime` viene nulo o no parseable, y el controlador no lo valida | `OrderMethods.cs:3065-3069`; `OrderRequest.cs:61`; `OrderController.cs:139-142` |
media | `GetBillingDocumentByDeliveryAsync` se traga los errores HTTP y las excepciones, y devuelve `null` — un 401 o 500 se vuelve "no hay factura" | `OrderMethods.cs:3178` (if sin else), `:3200-3203`, `:3205` |
media | Selección ciega de `results[0]` al descubrir entrega y factura, sin `$top`, `$orderby` ni filtro de estado. Con entregas parciales o refacturaciones se anula una sola y se informa éxito | `OrderMethods.cs:3139-3146` y `:3186-3191` |
media | Mapeo incoherente entre los dos modelos: SD46 usa `[JsonPropertyName("DELIVERYDOCUMENT")]` en mayúsculas y SD48 `[JsonPropertyName("BillingDocument")]` en PascalCase, y la deserialización es *case-sensitive* | `Response.cs:178-179` vs `:207-208`; `OrderMethods.cs:168` y `:3098` sin `PropertyNameCaseInsensitive` |
baja | Código duplicado: `PostReverseGoodsIssueAsync` duplica el POST de `ReverseGoodsIssueAsync`, y ambos junto con `PostCancelInvoiceAsync` solo se alcanzan desde `FullCancelAsync`, que no tiene llamadores | grep `FullCancel` → solo `:2875` y `:2962` |
baja | Sin reintento ante un 403 con `x-csrf-token: Required` | `OrderMethods.cs:163-166` y `:3092-3094` |

#### Lo que se refutó y no debe re-reportarse

- **Auth `Basic` en vez del `Bearer` que menciona la spec** — el OAuth configurado (`Web.config:28-30`) apunta a un tenant de **CPI**, no a S/4HANA directo. `Basic` con `S4_USER`/`S4_PASS` es lo correcto para esta ruta. Queda como discrepancia documental de la spec, no como defecto.
- **`sap-langu` en vez de `sap-language` en SD46** — la spec lo escribe así literalmente (`sd46:62`). El código la sigue al carácter.
- **Falta el `GET A_BillingDocument('…')` previo de SD48** — la spec lo lista como entidad disponible, no como paso obligatorio, y la existencia ya se comprueba con la consulta a `A_BillingDocumentItem` (`:3168`).
- **Inyección OData en el `$filter` de entregas** — el valor interpolado no es entrada de usuario: viene de la respuesta de SD36 y pasa por `PadLeft(10,'0')`.

---

### R13 · Regla de la diagonal — **no determinable desde el repositorio**

La URL base la resuelve `Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL)`, un método de **`Conexion.dll`, que es binario**. El equipo confirmó que el valor **sí incluye la diagonal final**.

Con ese dato, la aritmética queda así:

| Forma | Call sites | Resultado |
|---|---:|---|
`base + "/SERVICIO/…"` | ~57 | doble diagonal `//` |
`base + "SERVICIO/…"` | 6 | ruta limpia |

La doble diagonal la tolera SAP Gateway — lo prueba el flujo de órdenes, que opera hoy con esa forma (`OrderMethods.cs:1746`). Así que **con la diagonal final ninguna de las dos formas rompe**, y R13 no sería un hallazgo.

> [!warning] Este punto se corrigió tres veces. Antes de re-auditarlo, leer esto
> Se concluyó sucesivamente que las 6 concatenaciones daban `UriFormatException`, luego que eran correctas, luego que daban 404. **Ninguna conclusión se pudo sostener con evidencia del repositorio**, porque la única fuente es un binario.
> **`conf.ini` NO es la fuente de configuración** — confirmado por el equipo. Contiene información pero no es de donde se lee. No usarlo como evidencia.
>
> **La pregunta que cierra el tema, y es de una línea:** ¿qué cadena exacta devuelve `obtenerUrl(ENVIROMENT_DEV, SERVICE_URL)`? Un `Console.WriteLine` o un breakpoint lo resuelve.
> Restricción conocida: las specs RSG describen las rutas como `/sap/opu/odata/sap/<SERVICIO>/`, y el código concatena solo `<SERVICIO>` — luego el valor devuelto **tiene que incluir el prefijo `/sap/opu/odata/sap`**, o ninguna llamada funcionaría. Confirmar si termina o no en `/`.

### R7/R9 · Secretos en el `Web.config` versionado
`Z:\ServicioSAP\...\Web.config:13,15,30,31,40,41,43,57,79,82` — contraseñas de BD (`password=pruebasweb`), `SAP_OAUTH_CLIENT_SECRET`, `JWT_SECRET_KEY`, `S4_USER`/`S4_PASS` (usuario `magalindo` y su contraseña), `SMB_IMPERSONATION_PASSWORD`, `PASSWORD_AUTENTICACION_LIBERADOR`.

### R18 · DTOs sin `[JsonProperty]` — 66 de 93 archivos
`Models\SAP\` tiene 93 archivos `.cs`; **66 no contienen ni una aparición de `JsonProperty`**. Incluye los DTOs centrales del módulo en migración: `Models\SAP\Order\Order.cs:15-81`, `ToItems.cs:9-31`, `BusinessPartner\Cte.cs:9-22`, `Partner.cs`.

### R17 · Lógica de negocio en controladores
`Controllers\ProspectoController.cs:33-60` es la violación más clara: quita acentos (regla heredada de Intelisis), normaliza, **construye el filtro OData** (:46) y decide el enmascarado. Todo eso debería vivir en `Methods\`.

### Datos de prueba que se escriben a producción

| Literal | Ubicación |
|---|---|
`"Tadeo"` en 5 campos del payload SD01 | `OrderMethods.cs:2190,2206,2262,2273,2404` |
`Zdire="Domicilio Conocido"`, `Zcolonia="Centro"`, `ZcodPostal="47504"` | `OrderMethods.cs:2777-2783` |
`Zdire="TEST"`, `Zcolonia="TEST"`, `ZcodPostal="47504"` | `BusinessPartnerMethods.cs:703-709` |
`Stcd1="XAXX010101000"` incondicional, sin fallback al request | `BusinessPartnerMethods.cs:519` |

*(El mismo campo `Stcd1` **sí** está bien resuelto en `OrderMethods.cs:2594`, lo que confirma que es un olvido y no una decisión.)*

### Endpoints de prueba expuestos
`Controllers\OrderController.cs:43-63` (`order/testnew`, acepta el DTO de SAP directo; su propio comentario dice *"DEBE SER ELIMINADO en producción"*) y `Controllers\BusinessPartnerController.cs:119-134` (`partner/testnew`, lee el cuerpo crudo con `ReadAsStringAsync`). Ninguno está en el CSV. Detrás de `[Authorize]` (ver §4), pero deben borrarse.

---

## 7. Desalineación del CSV — la corrección más accionable

17 filas de `MAVIDMZSAPConexiones.csv` contradicen al código.

### Declaradas conectadas pero el DMZ sigue apuntando a LAN — inflan el avance

| Fila | Endpoint | Dueño | Evidencia |
|---|---|---|---|
L52 | `customerService/LoginClienteCredito` | Javier | `DMZ CustomerServiceController.cs:213-219` usa `curl.Post` |
L53 | `customerService/LoginClienteCreditoFechaN` | Javier | `DMZ CustomerServiceController.cs:224-231` usa `curl.Post` |
L113 | `customer/wallet/getMinimumCostToRedeem` | Javier | `DMZ WalletCustomerController.cs:75-88` usa `curl.Post` |

### Declaradas pendientes pero ya están hechas — deprimen el avance

| Fila | Endpoint | Dueño | Realidad |
|---|---|---|---|
L36 | `customer/cashCustomerReport` | Diego | `DMZ CustomersController.cs:114-124` hace `PostSAP` y el destino existe |
L50 | `customerService/obtenerQuejas` | Diego | `DMZ :124` hace `PostSAP`; existe en `SAP CustomerServiceController.cs:20` |
L58 | `customerService/bbvaKeyAdvanced` | Diego | `DMZ :284` hace `GetSAP`; existe en `SAP :31` |
L85 | `order/GetPickUpCode` | Diego | Implementado de verdad en `SAP OrderController.cs:226-248` |
L38 / L39 | `ApplyPaymentNeko` / `UpdateStatusPaymentNeko` | Marcos | Generados en `AbonosController.cs:51, :71` — **aunque son stubs (C19)** |
L116 / L117 | `customer/getCuenta` / `setCuenta` | Diego | Existen en `SAP CustomersController.cs:93, :103` |

### Contradicciones internas

- **L16 y L29** (`credit/guardardocumento`, `credit/SaveImagesProductosMx`): Conectado=Sí y Generado=Sí, pero la columna "Ruta ServicioSAP" dice `To Do`. Las rutas existen (`SAP CreditController.cs:93, :118`).
- **L114** (`company/wholesale-customer/{wholesaleAccount}`): la ruta declarada **no existe**. La real es `WholesaleCustomerController.cs:14`.
- **L2** (`credit/getClienteFactura`): el destino real está en `AbonosController.cs:34`, no en `CreditController.cs`.
- **L33, L34, L35**: el valor de Conectado está escrito `SI` en mayúsculas, no `Si`. Son las 3 únicas filas así. **Cualquier `COUNTIF` exacto por `"Si"` las pierde** — eso explica que un conteo ingenuo devuelva 20 y el baseline diga 23.

### Filas duplicadas con dueño y destino contradictorios

| Ruta | Fila A | Fila B |
|---|---|---|
`product/updateStock` | L100 Diego, C=No G=Sí, SAP=`N/A (MAGENTO directo)` | L129 Javier, C=No G=No, SAP=`product/stock`, "(LAN-only)" |
`product/getStockByStore` | L101 Deprecado, C=N/A | L130 Javier, C=No G=No, SAP=`product/stock/filter/{filter}` |
`product/updatePrice` | L102 Diego, C=No G=Sí, SAP=`N/A (MAGENTO directo)` | L126 Javier, C=No G=No, SAP=`N/A`, LAN-only |

**Consecuencia contable:** el CSV tiene 136 filas pero **133 rutas distintas** (119 del DMZ + 14 realmente solo-LAN). Los totales del bloque resumen están **sobrecontados en 3**.

### Dos defectos estructurales del tracker

1. **`Generado=Sí` mide dos cosas distintas.** De los 40, **13 tienen Ruta SAP = `N/A (MAGENTO directo)`** con la nota "No requiere SAP": no se generó ningún endpoint, se marcaron Sí porque no hay trabajo SAP. Hay que separar "no aplica" de "generado" en columnas distintas.
2. **`AbonosController` no tiene filas propias.** Sus 6 rutas bajo `[RoutePrefix("credit")]` se atribuyen implícitamente a `CreditController`, donde no están.
3. **Los dos bloques de resumen al final no coinciden entre sí** (25.84% vs 16.91% conectado). Dejar solo uno.

---

## 8. Qué falta generar

### Órdenes y Ventas

| Endpoint | Qué construir | Dueño |
|---|---|---|
`order/ManagePaynetOrders` | Lectura de Venta por idEcommerce, filtro `Estatus='SINAFECTAR'`, acción AFECTAR/CANCELAR con usuario por tienda | Javier |
`order/InsertPaymentData` | Destino del INSERT `CXCCMensajeWebHookOpenPay` en SIGMAVI, con validación `Importe>0` en ambos lados | Diego |
`order/estimated-delivery/{ecommerceId}` | MovId de la factura, paquetería/guía/rastreo y link. No existe nada | Javier |
`order/creditStatus/{idSolicitud}` | Cascada `Solicitud Crédito` → `Análisis Crédito` → `Pedido` que resuelve EN_ANALISIS / RECHAZADO / AUTORIZADO | Javier |
`order/getIntelisisStatuses` | Adaptador de contrato sobre `sale/filter`: filtro por facturas, entrada por lista de incrementIds, salida `InvoiceDataResponse` | Javier |
`order/getPosCancellations` | La **consulta** de pedidos cancelados en POS. El CSV la mapea a `cancelInvoice`, que es la operación contraria | Javier |
`order/updateCreditOrderId` | Definir si se puede reescribir `PurchNoC`/`Zidecomm` de un documento ya creado *(nota del CSV: revisar con Alan)* | Marcos |
`order/validateCredit` | Reexponer la ruta (hoy 404) apuntando a `order/new`, conservando `{status: PROCESANDO, cuenta}` y el callback | Javier |
`order/createStorepickupCode` | Orquestador de pickup: INSERT en `BpRecogePedidos`, detalle de artículos, POST a `setOrderStatus` | Diego |
`order/checkOpenpay` | Reproceso de `openpay_cards` (cierra D-05) y conciliación de `openpay_stores` (cierra C05) | Javier |
`order/getOrderInfoAndSet` | Reproceso manual de una orden (`ReSetPedido`, `obtenerIdVenta`, `esCancelado` por `Zidecomm`) | Javier |
`order/getOrderId` | Decidir el destino de `eCommerceDetPedidos`, que ServicioSAP eliminó por diseño | Javier |
`cancelOrder` | Enrutar `FullCancelAsync` **o** hacer que la ruta devuelva el contrato de cadena que el DMZ evalúa | Javier |
`returnOrder` | Reporte de servicio por unidad, afectación del módulo ST y rama `resolucion=='R'` | Marcos |
Monedero y afectación contable | Hoy son un TODO y un método sin llamador | Marcos |

### Crédito y Servicio al Cliente

**Prioridad máxima:** `credit/SaveCredilanaInfo` o un job equivalente que llene `mavi_credilana_info` en la SQLite de ServicioSAP — `credit/GetCreditAmounts` **ya está conectado** y hoy lee de una tabla que ningún proceso llena.

| Endpoint | Dueño |
|---|---|
`credit/getClienteSaldo/{cliente}` — equivalente de `SPCXCSaldosClientesPendiente` con cabecera de saldo completa | Javier |
`credit/MonederoSaldoCredito` — serie por UEN y equivalente de `dbo.FnVTASCalcularSaldo` | Javier |
`credit/codigoPromocion` — SuccessFactors + BP05 + SIGMAVI | Javier |
`credit/ExistRFCAndPhoneCte` — sobre el filtro BP05, añadir SuccessFactor + SD36 + SD05 | Javier |
`credit/getCreditAccount/{pAccount}` — validar `ZtipoCliente = PROSPECTO` | Javier |
`credit/GetUnificationWalletStatus`, `CheckAccountsPreUnification`, `SetUnificationWalletData` — monedero unificado | Javier |
`credit/SolicitudMercancia` — INSERT a `CRED_SOLICITUD_WEB_DATOS_TEMP` leyendo el BP de SAP | Javier |
`credit/ApplyPaymentNeko` — reemplazar el stub: referencia sufijada, check de duplicados, early-exit | Marcos |
`credit/UpdateStatusPaymentNeko` — reemplazar el stub: UPDATE con ROWLOCK por `Referencia LIKE` | Marcos |
`customerService/ApplyPaymentAdvanced` — variante con `Origen='BBVA'` | Marcos |
`customerService/UpdateStatusPaymentAdvanced` — idempotencia + `FechaRastreoSTP` + mapeo `mp_response` | Marcos |
`customerService/nombreCliente` — unir `partner/client/ma/{clientId}` con el teléfono validado | Javier |
`customerService/validarCoberturaPorCP` — wrapper sobre `sepomex/validarcp` con la lógica de cobertura | Javier |
`customerService/obtenerVentanaConfirmacion` — BP05 + SD36 + ADDRCHANGE | Javier |
`customerService/obtenerCreditos` — **el más grande de la lane**: cadena Venta completa con los 4 pares fecha/estatus | Javier |
`customerService/ObtenerEstatusEmbarque` — bloqueado por ABAP; conservar el contrato booleano invertido de LAN | Javier |
`customerService/GetSTPAccount` y `ValidateSTPAccount` — apoyarse en `credit/GetClabeSTP/{bp}`, que ya existe pero no está en el CSV | Javier |
`customerService/GetSalesChannelsSTP` — `CteEnviarA` → `AS_GET_PartnerAddress` | Javier |

**Solo conmutar el puente (no hay que generar código SAP):** `LoginClienteCredito`, `LoginClienteCreditoFechaN`, `GetEmpleadoByNomina` — cambiar `curl.Post` por `PostSAP`.

### Clientes, BP y Productos

| Qué | Dueño |
|---|---|
`prospecto/rfc` — replicar `spRegistroSugerir` con `@Cual='RFC'`, incluido `QuitarAcentos` | Javier |
`customer/wallet/getCuentaC` — equivalente del SELECT sobre `Venta.ReferenciaOrdenCompra` | Javier |
`company/negotiable-quote/create` — `InsertTableVenta` + `InsertTableVentaD` + `getUnidadArt` | Javier |
Orquestación del job ImportApp de productos (`createBackup`, `deletePromociones`, `getProductWithWebsites`, atributos…) | Javier |
`BuildJsonAndSend` y `BuildJsonAndSendConfigurable` — **el push efectivo a Magento**. No existe nada equivalente | Javier |
`updateStockJson` y su cálculo de delta, más el efecto `mage.deleteReservations()` | Javier |
`GetCambiosExistencias(uen)` para `product/existenciasAlmacenArt` | Javier |
Equivalente de `SpVTASEcommerceStoreStock` para `getStockByStore` | Javier |
`updatePrices(opcion, store)` — los argumentos `(1,'2')`/`(1,'1')` están sin documentar | Javier |
Casos `viu` y `mavi` de `product/exportaart/{store}` — hoy devuelven "no implementado" | Javier |
El bloque de cálculo por familia de `getMinimumCostToRedeem` (cierra C09) | Javier |
Discriminación por `uen` en `customer/wallet/details` (cierra C10) | Marcos |
`status/getStatus` — definir la sonda de salud del nuevo stack; hoy hace ping a la BD de Intelisis y no dice nada de S/4HANA | Diego |
Mecanismo de selección de entorno: los 64 puntos de llamada tienen `ENVIROMENT_DEV` fijo | Marcos / Diego |
Separar la llave JWT de LAN de la de ServicioSAP y sacar los secretos del `Web.config` | Marcos / Diego |

---

## 9. Qué está sin terminar

Existe en el árbol pero incompleto: stubs, TODOs, bloques comentados.

### ServicioSAP

| Ubicación | Estado |
|---|---|
`Methods\Order\OrderMethods.cs:1450-1466` | `afectar()` — TODO Fase 3 **y sin ningún llamador** (código muerto) |
`Methods\Order\OrderMethods.cs:1296-1309` | `GenerarMonederoSAPAsync()` — TODO "PENDIENTE DEFINICIÓN DE SAP", solo `Console.WriteLine` |
`Methods\Order\OrderMethods.cs:1472-1486` | `RegisterPickupClientInfo()` — TODO Fase 3, mientras `StorePickupMethods.cs:50,70,91,126` **ya tiene los escritores** |
`Methods\Order\OrderMethods.cs:663-697` | Liberador de crédito y callback a Magento, comentados completos. **No compila como está** (`await` en lambda no-`async`). Pendiente de definición — revisar con Valentín (R-07) |
`Methods\Order\OrderMethods.cs:2875-2965` | `FullCancelAsync` — implementado y **no enrutado**; dos catch que perdonan fallos de anulación |
`Controllers\OrderController.cs:43-63` | `order/testnew` — su propio comentario dice "DEBE SER ELIMINADO en producción" |
`Methods\Abono\AbonoMethods.cs:94-98, :100-104` | Dos stubs con TODO y `return true` |
`Methods\Abono\AbonoMethods.cs:19-51` | `GetDocumentosNoCompensadosAsync` — lectura cruda de EX01, faltan las 7 reglas de negocio |
`Methods\Abono\AbonoMethods.cs:54-92` | `GetParcialidadesAsync` — solo por `Vbeln`, falta el filtro por cliente y el objeto `SaldoFactura` |
`Methods\Credit\CredilanaMethods.cs:14-36` | Lee `mavi_credilana_info`, tabla que ningún proceso llena |
`Methods\Credit\CreditMethods.cs:42-51, :84-93, :109-114` | `GetPlazosAsync` deja `Days=0` sin log; el catch devuelve vacío con 200 |
`Methods\Credit\DocumentMethods.cs:139-141, :162-168` | La rama "Actualizar" del SQL se portó pero es **inalcanzable** |
`Methods\Credit\DocumentMethods.cs:225-263` | `SaveImagesProductosMx` responde `true` **antes** de guardar (`Task.Run` + `Task.Delay(10000)`) |
`Methods\BusinessPartner\BusinessPartnerMethods.cs:115-142` | `EnableBpCombinationAsync` comentado (28 líneas): el BP nace solo en canal de contado |
`Methods\BusinessPartner\BusinessPartnerMethods.cs:704-708` | Literales `TEST` / `47504` / `001` / `14` |
`Methods\Wallet\WalletMethods.cs:56-60, :234-237` | Manejo de error reducido a `Console.WriteLine`, sin propagar |
`Controllers\AccountController.cs:15, :31` | `account/bonus` y `account/bonus/async` duplican el mismo caso; falta decidir cuál queda |
`Controllers\ProductController.cs:29-38` | `product/exportaart`: `viu` y `mavi` devuelven BadRequest "no implementado" |
`Controllers\ProductController.cs:63-67` | En `product/jerarquia/articulos` quedaron comentados `success` y `total` |

### DMZ

| Ubicación | Estado |
|---|---|
`Controllers\OrdersController.cs:118-127, 132-183, 185-213, 366-402` | **Cuatro** bloques "CÓDIGO LEGACY COMENTADO PARA MIGRACIÓN A SAP" en un solo controlador |
`Controllers\OrdersController.cs:313-314` | "PENDIENTE INTELISIS:" con la llamada a LAN comentada en `returnOrder` |
`Helpers\Curl.cs:61-71` | Login contra LAN comentado, sustituido por "Unificación de Token" (:83-84) |
`Web.config:16-19, 22-25` | `URL_INTELISIS` y `DOMINIO_LAN` con los valores reales comentados |
`Controllers\CreditController.cs:36, :62` | Dos `//TODO LOG` en los catch: ningún error se registra |
`Controllers\CustomerServiceController.cs:151` | La llamada `Logger.Credit` del catch de `GetAccountDebts` está comentada |
`Controllers\CustomerServiceController.cs:335-370` | Tres acciones que reenvían a endpoints inexistentes |
`Controllers\ProductsController.cs:63-66` | `product/getStockByStore` → `return Ok("stores")`. Stub |
`Controllers\CustomersController.cs:27`, `WalletCustomerController.cs:36` | Llamadas a LAN comentadas con "PENDIENTE INTELISIS": conmutación a medias |

### LAN — bugs preexistentes, no introducidos por la migración

| Ubicación | Estado |
|---|---|
`Metodos\OpenpayMethods.cs:277` | Condición invertida (`\|\|` donde va `&&`) que deja muerto el bloque :283-286 (C18) |
`Metodos\ServiceOrderMethods.cs:84-85` | Hardcode de prueba comentado (`//PRUEBA rMAProduct.motivoDevolucion = "QUEBRADO O MALTRATADO"`) |
`Controllers\OrdersController.cs:157` | `throw` comentado en `setOrder`: el catch devuelve `Ok(e.ToString())` con 200 |
`Controllers\OrdersController.cs:263-267` | Guarda de nulo inalcanzable en `returnOrder` que, si se alcanzara, lanzaría al indexar |
`Controllers\CreditController.cs:303` | `if (req.Equals("GeLeyendaCatDimas"))` compara el objeto request contra un string: la rama nunca entra |

---

## 10. Cadena de conexión a S/4HANA y accesos pendientes

### La cadena completa, ya resuelta

`Conexion.dll` es binario y no se puede leer. El equipo confirmó el host al que resuelve, pero **la cadena exacta que devuelve `obtenerUrl` sigue sin verificarse** (ver R13).

```
Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL)
  → https://vhmvods4ci.sap.svrwes4h.com:44300/…   (host confirmado por el equipo)

URL final = <base> + <SERVICIO_ODATA> + "/" + <EntitySet> + "?sap-client=110"
```

> [!warning] `conf.ini` no es la fuente de configuración
> El archivo `Z:\ServicioSAP\ServicioSap\conf.ini` contiene claves con nombres idénticos a los `Nodos`
> (`SERVICE_URL`, `usuarioServicio`, `contrasenaServicio`) y es fácil confundirlo con el origen real.
> **No lo es** — confirmado por el equipo. La configuración viva la resuelve `Conexion.dll`.
> No usar `conf.ini` como evidencia en ninguna auditoría.

### Cómo se resuelve cada cosa: la estructura real

| Qué se resuelve | Cómo | Usos |
|---|---|---|
Conexiones a **base de datos** (SigMavi, Android, AdminDoc) | `Conexion.dll` → `obtenerConexionSigMavi` / `obtenerConexionAndroid` / `obtenerConexionAdminDoc` (y sus variantes `Async`) | 44 |
**Base URL de SAP OData** | `Conexion.dll` → `Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL)` | 67 |
**Ruta del servicio OData** — desde `Web.config` | `ConfigurationManager.AppSettings["…"]` | **6** |
**Ruta del servicio OData** — literal en código | cadena escrita a mano tras `obtenerUrl` | ~61 |

Solo **tres claves** de servicio OData están declaradas en `<appSettings>`: `ZAPI_SALESORDER_SRV` (3 usos), `ZAPI_CAMPANA_BONIFICACION_SRV` (2) y `ZAPI_EX01_NOCOMP_SRV` (1). **Las demás rutas van hardcodeadas**, que es exactamente lo que reporta la violación de R20 en la §6.

**El puerto 44300 corresponde a la instancia 00 del SAP Gateway.** El mandante es `110` en 65 de los 66 call sites; el único divergente es `SalesMethods.cs:26`, con `sap-client=100`.

### Consecuencia 1: la regla 13 queda sin resolver

Depende por completo de si la cadena que devuelve `obtenerUrl` termina en `/`, y eso solo se sabe
ejecutando. Ver R13 para la aritmética de los dos escenarios y la pregunta que lo cierra.

### Consecuencia 2: el `Web.config` no es consistente consigo mismo

Las claves de `<appSettings>` no siguen un criterio único sobre la diagonal inicial:

| Clave | Valor | `/` inicial |
|---|---|---|
`ZAPI_SALESORDER_SRV` | `/ZAPI_SALESORDER_SRV/A_SALES_ORDERSet` | **Sí** |
`ZAPI_CAMPANA_BONIFICACION_SRV` | `ZAPI_CAMPANA_BONIFICACION_SRV/REQUESTSet` | No |
`ZAPI_EX01_NOCOMP_SRV` | `ZAPI_EX01_NOCOMP_SRV` | No |

Como el código concatena `baseUrl + servicePath` sin normalizar, **el resultado depende de qué clave se lea**,
y esa inconsistencia es real con independencia de cómo se resuelva R13. Obliga a que quien agregue una clave
nueva conozca de memoria una convención que no está escrita en ningún lado.
*Arreglo:* normalizar en un helper único con `baseUrl.TrimEnd('/') + "/" + servicePath.TrimStart('/')`
y unificar el criterio en todos los valores del `Web.config`.

### Accesos que siguen pendientes

Solo quedan **dos**, y ninguno bloquea el reporte:

1. **`SpListaNBMagento` en SigMavi** — el SP que ServicioSAP invoca no está en el repositorio ni en `SPsOrden\`. Ver C24: no es solo un archivo faltante, es que el nombre, el parámetro y la base de datos cambiaron respecto a LAN.
2. **`SP_MAVIDM0173RedimeOGeneraMONE`** — tampoco está. Es el efecto de generación de monedero que `customer/wallet/details` perdió (C10).
3. **Contrato del API de AWS `AI_GET_CatalogoConfiguracion`** — sigue sin verificarse el significado posicional de `Valor1..Valor4`, del que depende toda la resolución de canal y mínimos de `getMinimumCostToRedeem`.

### Corrección de cobertura de esta auditoría

Un reporte preliminar declaró seis SPs como "no están en el repositorio". **Era un error de búsqueda:** cuatro de los seis sí están en `Z:\.agents\skills\lan-sap-migration\SPsOrden\` y la lane no los buscó ahí:

| SP | Ubicación |
|---|---|
`SpVTASListaNBMagento.sql` | `SPsOrden\SpVTASListaNBMagento.sql` |
`spRegistroSugerir.sql` | `SPsOrden\spRegistroSugerir.sql` |
`SpVTASEcommerceStoreStock.sql` | `SPsOrden\SpVTASEcommerceStoreStock.sql` |
`FnVTASCalcularSaldo.sql` | `SPsOrden\FnVTASCalcularSaldo.sql` |

La paridad de esos cuatro flujos **sí se puede verificar contra el SQL real**, y está pendiente de hacerse. `SPsOrden\` tiene 38 archivos en total; cualquier auditoría futura debe consultarlo antes de declarar un SP inaccesible.

También se cerró la duda sobre `Z:\DMZ\WebApiMagento\Conn\Magento.cs`: **respeta la configuración**. Usa `AppSettings["URL_MAGENTO"]` como base (:16) y `AppSettings["TOKEN_MAGENTO"]` (:23), con `RestClient` sobre `baseUrl + url`. No hay URL hardcodeada. Las 22 rutas que respalda no tienen ese problema.

---

## 11. Plantilla de verificación

Una copia por release candidate. Una fila sin evidencia cuenta como no verificada.

### A · Bloqueantes antes del siguiente despliegue

| # | Verificación | Ref. | Dueño | OK | Evidencia |
|---|---|---|---|---|---|
A-01 | Un fallo de transporte produce un fallo HTTP, no un 200 con el texto del error. *No es refactor del `Curl`: es lo que hoy hace que C01 y C06 devuelvan mal* | R-03 | Diego | ☐ | |
A-02 | *(retirado — R-01 es decisión aceptada: el login se queda en el constructor)* | R-01 | — | n/a | |
A-03 | *(movido a la sección F — la config de localhost es correcta en pruebas)* | R-06 | — | n/a | |
A-04 | `AbonosController` tiene `[Authorize]` | R-08 | Marcos | ✅ | Aplicado en `AbonosController.cs:7` |
A-05 | `ProspectoController` tiene `[Authorize]` | C11 | Javier | ✅ | Aplicado en `ProspectoController.cs:14` |
A-06 | El filtro OData de `recuperarcuenta` escapa la comilla simple | C12 | Javier | ☐ | |
A-07 | Decidir si `credit/guardardocumento` debe seguir `[AllowAnonymous]` en el DMZ — es la única de las 4 ocurrencias que no es un login | R-10 | Diego | ☐ | |
A-08 | *(retirado — el handler permisivo es intencional: los emisores de token no pueden exigir autorización. Ver R-09)* | R-09 | — | n/a | |
A-09 | `order/testnew` y `partner/testnew` eliminados | §6 | Equipo | ☐ | |
A-10 | Ningún literal `TEST` / `Tadeo` / `47504` / `Domicilio Conocido` viaja a SAP | §6 | Marcos | ☐ | |
A-11 | Los certificados de SAP se validan de verdad | R-05 | Equipo | ☐ | |
A-12 | Secretos fuera del `Web.config` versionado | §6 | Marcos / Diego | ☐ | |

### B · Contratos de los 23 puentes

| # | Verificación | Ref. | OK |
|---|---|---|---|
B-01 | `order/cancelOrder` devuelve el contrato que el DMZ evalúa, y cancelar sin entrega funciona | C01, C02 | ☐ |
B-02 | `credit/getClienteFactura` devuelve un objeto, no un arreglo, y el DMZ lo parsea | C06 | ☐ |
B-03 | El contrato `SaldoFactura` completo está reconstruido | C07 | ☐ |
B-04 | Forma de respuesta **única** para los 23 puentes; los 48 `.Trim('"')` eliminados | R-04 | ☐ |
B-05 | `order/validateCredit` responde | C04, R-07 | ☐ |
B-06 | En crédito de cliente nuevo, Magento recibe el BP que espera | §5 | ☐ |

### C · Paridad de lógica

| # | Verificación | Ref. | OK |
|---|---|---|---|
C-01 | `GetAccountDebts` agrupa por CanalVenta y aplica la regla DIMAS | C08 | ☐ |
C-02 | `getMinimumCostToRedeem` excluye por familia y recalcula multi-familia | C09 | ☐ |
C-03 | `customer/wallet/details` discrimina por `uen` | C10 | ☐ |
C-04 | `getClienteFactura` valida que la factura pertenezca al cliente | C13 | ☐ |
C-05 | El enmascarado de nombre coincide con LAN | C17 | ☐ |
C-06 | `getPlazos` no degrada a 0 días en silencio | C22 | ☐ |
C-07 | Existe el consumidor de `openpay_stores` que cancela referencias expiradas | C05 | ☐ |
C-08 | `mavi_credilana_info` se llena por algún proceso | §8 | ☐ |
C-09 | Los 20 hallazgos D-01..D-20 de [[COMPARATIVA_SETORDER_LAN_VS_SAP]] revalidados | §5 | ☐ |
C-10 | Los 16 hallazgos BP-01..BP-16 de [[COMPARATIVA_BP_LAN_VS_SAP]] revalidados | — | ☐ |

### D · Saneamiento del tracker

| # | Verificación | Ref. | Dueño | OK |
|---|---|---|---|---|
D-01 | L52, L53, L113 corregidas a Conectado=No | §7 | Javier | ☐ |
D-02 | L36, L50, L58, L85, L116, L117 corregidas a Conectado/Generado=Sí | §7 | Diego | ☐ |
D-03 | L16 y L29: columna "Ruta ServicioSAP" con la ruta real, no `To Do` | §7 | Diego | ☐ |
D-04 | L114 corregida a la ruta real de `WholesaleCustomerController.cs:14` | §7 | Javier | ☐ |
D-05 | L33, L34, L35 con `Si` y no `SI` | §7 | Quien lleve el CSV | ☐ |
D-06 | Los 3 pares duplicados resueltos; totales recontados sobre 133 rutas | §7 | Quien lleve el CSV | ☐ |
D-07 | `Generado` y `No aplica a SAP` separados en columnas distintas | §7 | Quien lleve el CSV | ☐ |
D-08 | Las 6 rutas de `AbonosController` tienen fila propia | §7 | Marcos | ☐ |
D-09 | Un solo bloque de resumen, sin los dos porcentajes contradictorios | §7 | Quien lleve el CSV | ☐ |

### E · Estándares

| # | Verificación | Ref. | OK |
|---|---|---|---|
E-01 | Cero `.Result` / `.Wait()` / `.GetAwaiter().GetResult()` (empezar por los 34 de `ProductMethods.cs`) | §6 | ☐ |
E-02 | Cero `Console.WriteLine` como log de producción; `Logger` con ruta configurable y sin catch silencioso | §6 | ☐ |
E-03 | Las 17 rutas OData declaradas en `<appSettings>` y leídas de ahí | §6 | ☐ |
E-04 | Concatenación de URLs normalizada en un helper único y `Web.config` consistente sobre la diagonal | §10 | ☐ |
E-05 | `sap-client` unificado; resuelto el `100` de `SalesMethods.cs:26` | §6 | ☐ |
E-06 | Los 66 DTOs sin `[JsonProperty]` decorados | §6 | ☐ |
E-07 | `ProspectoController` sin lógica de negocio | §6 | ☐ |
E-08 | Selección de entorno configurable; `ENVIROMENT_DEV` no fijo | §8 | ☐ |
E-09 | Todo `.cs` registrado en `ServicioSap.csproj` | R19 | ☐ |
E-10 | **Todo controlador nuevo lleva `[Authorize]`.** El handler no rechaza por diseño (R-09), así que el atributo es lo único que protege la ruta | R-08 · R-09 | ☐ |

### F · Prerrequisitos del pase a Stage / PROD

No son defectos: son correctos en el entorno de pruebas actual. **Esta es la lista de lo que hay que tocar el día de la integración.**

| # | Verificación | Ref. | Dueño | OK |
|---|---|---|---|---|
F-01 | `URL_INTELISIS` productiva activa y el `localhost:44399` descomisionado | R-06 | Diego | ☐ |
F-02 | `DOMINIO_LAN` productivo activo | R-06 | Diego | ☐ |
F-03 | `URL_MAGENTO` apunta al Magento correcto (hoy `mcstage.viu.mx`) | R-06 | Diego | ☐ |
F-04 | **Mecanismo de selección de entorno resuelto.** Es el que cuesta: hoy no es una clave de configuración sino 64 líneas con `ENVIROMENT_DEV` fijo | R-12 | Marcos / Diego | ☐ |
F-05 | Confirmado si `vhmvods4ci.sap.svrwes4h.com:44300` es el host productivo o hay otro | §10 | Equipo | ☐ |
F-06 | Llaves JWT separadas entre LAN, DMZ y ServicioSAP — **junto con** el arreglo de R-02, no antes | R-02 | Equipo | ☐ |
F-07 | Secretos fuera del `Web.config` versionado | §6 | Marcos / Diego | ☐ |
F-08 | Endpoints `testnew` eliminados | §6 | Equipo | ☐ |

---

## 12. Dudas de lógica de negocio

Requieren decisión humana. **No se asumió ninguna.**

| # | Duda | Bloquea |
|---|---|---|
1 | ¿Intelisis valida el header `Authorization`? Prueba de 5 min con Hoppscotch | Decide si R-02 rompe 61 rutas o es solo deuda |
2 | ¿`order/getPosCancellations` sigue vivo? El cron `Mavi_PosCancellationSync` lo consume; el CSV lo mapea a la operación contraria | §8 Órdenes |
3 | ¿Se puede reescribir `PurchNoC`/`Zidecomm` de un documento ya creado? *(el CSV dice: revisar con Alan)* | `order/updateCreditOrderId` |
4 | ¿La habilitación del canal 02 (crédito) del BP se automatiza o queda como proceso manual interno? | `EnableBpCombinationAsync` |
5 | ¿`eCommerceDetPedidos` tiene destino en SAP, o `order/getOrderId` se deprecia? | `order/getOrderId` |
6 | ¿`credit/GetPhoneValidatedClientSecretName` requiere SAP? El CSV dice que no, pero su lógica consulta Intelisis | Clasificación de alcance |
7 | ¿Cuál es la sonda de salud del nuevo stack? Hoy `status/getStatus` hace ping a la BD de Intelisis | `status/getStatus` |
8 | ¿`account/bonus` o `account/bonus/async`? Duplican el mismo caso | Limpieza |
9 | ¿Qué significan los argumentos `(1,'2')` y `(1,'1')` de `updatePrices`? | `product/updatePrice` |
10 | ¿`SaveImagesProductosMx` debe seguir respondiendo antes de guardar? Deuda heredada consciente | `DocumentMethods.cs:225-263` |
11 | ¿El significado posicional de `Valor1..Valor4` del catálogo de AWS? | `getMinimumCostToRedeem` |
12 | ¿Los 13 endpoints `N/A (MAGENTO directo)` cuentan como avance de migración? | Cómo se reporta el % |
| 13 | ¿`SpListaNBMagento` existe en SigMavi con el parámetro `@IdMagento`, o su firma real es `@NumCuenta`? Un `sp_helptext` lo resuelve | C24 · las 3 rutas de listas negra/blanca |
| 18 | **Con Valentín:** equivalencias en SAP de `CteTel`, `TablaStD` y `CREDICCondicionArt` — la lógica de validación telefónica de `SP_CREDITO_WEB_DATOS` | R-07 · todo el flujo de crédito |
| 19 | **Con Valentín:** cómo queda el liberador de crédito y el `CallMagentoAuthorizationCallbackAsync` | R-07 · `order/validateCredit` |
| 20 | ¿Se migran las operaciones `InsertReferencia` (avales) y `Update` (dos solicitudes) del SP, o quedan fuera de alcance? | R-07 |
| 21 | ~~Solicitar la ficha de SD37~~ — **retirada:** SD37 no existe como API (ver la retractación en R-07) | — |
| 22 | ~~Solicitar la ficha de SD47 y SD08~~ — **retiradas:** son etiquetas de diagrama, no APIs | — |
| 23 | **Decisión de negocio:** ante un pedido ya facturado, ¿cancelación de ecommerce aplica la política de LAN (no anular, abrir reporte + devolución) o la anulación dura del ToBe? El RSG contempla ambas | `cancelOrder` completo |
| 24 | ¿El **Reporte de Servicio** (módulo ST) tiene destino en SAP? No aparece en ningún RSG ni en código | Rama facturada de `cancelOrder` |
| 14 | ¿Cómo se selecciona el entorno para el pase a producción? Hoy solo existe `ENVIROMENT_DEV` en el código | R-12 · los 64 puntos de llamada |
| 15 | ¿`https://vhmvods4ci.sap.svrwes4h.com:44300` es el host productivo, o hay otro para producción? | R-12 |
| 16 | ¿`SP_MAVIDM0173RedimeOGeneraMONE` sigue vigente como efecto de `wallet/details`, o se descarta? | C10 |
| 17 | ¿Por qué `SalesMethods.cs:26` usa `sap-client=100` cuando los otros 65 usan `110`? | E-05 |

---

## 13. Siguiente paso por responsable

### Diego — 57 rutas, 12.28% conectado declarado
1. **Corregir el CSV primero.** Tres de sus filas ya están conectadas y están deprimiendo su porcentaje: L36, L50, L58 (§7). Es trabajo ya hecho que no se le está contando.
2. **Que los fallos de transporte fallen** (R-03). No es refactorizar el `Curl` —el login se queda en el constructor por decisión del equipo—, es solo que `PostSAP`/`GetSAP` dejen de devolver el texto de la excepción como si fuera cuerpo de respuesta. Es la causa raíz de C01 y C06, dos puentes ya productivos que responden mal.
3. **Nada de config todavía:** los valores de localhost son correctos mientras se trabaja en pruebas (R-06). Su cambio queda agendado en la sección F para el día del pase a Stage.

### Javier — 44 rutas, 18.18% conectado declarado
1. **Cerrar sus 3 Conectado=Sí falsos** — es lo único que separa su avance real del declarado. Cambiar `curl.Post` por `PostSAP` en `CustomerServiceController.cs:217` y `:229`, y en `WalletCustomerController.cs:82`. Los destinos ya existen.
2. **Conectar `order/GetPickUpCode`**: el endpoint SAP ya está implementado en `OrderController.cs:226-248`. Solo falta cambiar el `curl.Post` de `OrdersController.cs:253`. Es la victoria más rápida disponible.
3. **Reponer `order/validateCredit`** (hoy 404, R-07).
4. **Desambiguar sus 3 filas "LAN-only" que chocan con filas de Diego**: L126, L129, L130 (§7).
5. Arreglar C11 y C12, que juntos son explotables sin credenciales.

### Marcos — 17 rutas, 47.06% conectado declarado
1. **`[Authorize]` en `AbonosController`** — ahí viven dos de sus puentes ya productivos (R-08).
2. **Declarar `AbonosController` en el CSV**: 6 rutas sin fila propia (§7).
3. **Reemplazar los stubs de pago** `ApplyPaymentNeko` y `UpdateStatusPaymentNeko` **antes** de que alguien conmute el puente (C19).
4. Reconstruir el contrato `SaldoFactura` (C07) y las reglas de cobro de `GetAccountDebts` (C08).

### Equipo
1. **Unificar la forma de respuesta de los 23 puentes antes de seguir migrando** (R-04). Cada endpoint nuevo agrega una variante.
2. **Borrar los endpoints de prueba** antes del pase a producción.
3. **Sanear el tracker** (§7): 133 rutas distintas, no 136; separar "no aplica" de "generado".

---

## 14. Cambios aplicados al skill durante esta auditoría

**`SKILL.md:56` — regla 16 reescrita.** Se retiró la prohibición de `curl.GetSAP` y la obligación de que todo endpoint de ServicioSAP fuera `[HttpPost]`. `GetSAP` se creó a propósito por escalabilidad para lecturas sin cuerpo. La regla ahora dice que se elige el verbo según la semántica del endpoint y que lo prohibido es abrir conexiones HTTP a mano en los controladores del DMZ. Se conservó el número 16 para no renumerar las reglas 17-20, que se citan por número en otros documentos.

**Archivos retirados como fuente de verdad:** `MIGRATION_STATUS_MASTER_v2.csv`, `ENDPOINTS_DMZ_VS_SAP.csv` y `_EXCLUIDOS_Intelisis.md`. Los reemplaza [[MAVIDMZSAPConexiones.csv]].

#migracion #SAP #auditoria #dotnet
