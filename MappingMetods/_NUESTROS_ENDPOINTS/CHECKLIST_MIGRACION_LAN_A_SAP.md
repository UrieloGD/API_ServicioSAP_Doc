---
tags: [checklist, migracion, plan, sigmavi, mixtos]
fuente: "_PLAN_MIGRACION_FECHAS.md"
actualizado: 2026-08-25
agente: Nexo (con asistencia de Claude)
---

# Checklist — Migración LAN → SAP

Lista de control del plan de migración. La serie vigente es **H-01…H-04**, **E-01…E-50** y **M-01…M-15**: 69 entradas. **No todas son partidas de desarrollo:** 31 de ellas, `E-16`…`E-46`, son las rutas de reapunte de la Ola 8, y ahí lo que se reconstruye son los llamadores, no las rutas. Descontadas ésas, quedan **38 partidas medibles** — las que se promedian en [[ESTADO_PRUEBAS_Y_AVANCE]]. Se va marcando aquí conforme se completa cada una. Alcance: todo lo que **no es Intelisis** (ServicioAndroid, SQLite, SIGMAVI, DMZ/SMB); los mixtos (Intelisis + otros) quedan documentados pero pendientes de decisión de arquitectura. La única pieza que toca SAP directamente (E-47) se deja preparada para que el equipo de SAP la conecte.

**Leyenda:** `[x]` hecho · `[ ]` pendiente · 🔒 bloqueado · ⏳ en definición · 🟠 destino de conexión sin definir

> Este documento lleva **qué falta**. El avance por endpoint, el resultado de las pruebas y el informe de puntos a revisar viven en [[ESTADO_PRUEBAS_Y_AVANCE]]; los contratos de request/response, en [[Contratos/README|Contratos]].

## Regla de destinos de conexión (5 ago)

La nueva API **no va a seguir apuntando a IntelisisTmp**. Criterio acordado:

- **Se quedan como están:** `ServicioAndroid`, `AdminDoc`, `SIGMAVI` y `SQLite`. Las partidas que solo usan estas cuatro no están afectadas, aunque la cadena de conexión diga `mavicbos`.
- **Hay que buscarles equivalencia** (en SAP o en alguna de las cuatro anteriores): lo que hoy va a `IntelisisTmp` en `MAVICUBOS.grupomavi.com`, o al linked server `ERPMAVI.IntelisisTMP`.

Las partidas afectadas quedan marcadas 🟠. No se escriben ni se prueban contra el origen viejo mientras el destino no esté definido: probar contra IntelisisTmp da un verde que no significa nada.

En la práctica esto recae sobre los mixtos `M-11`…`M-08` y sobre las partidas que hoy cruzan a Intelisis (`E-47`, `E-48`, `E-49`), que ya estaban fuera de la ruta principal.

---

## Ola 0 — Habilitadores (4–7 ago)

- [x] **H-01** `conexionSQL.obtenerConexionAdminDoc()` — hecho en `Helpers\ConexionDB\ConexionSQL.cs` (+ variante `obtenerConexionAdminDocAsync()`). Portado de APIMagento (`Conn\Connection.cs: sCadenaConexionAdminDoc`, mismo server que `ServicioAndroid`, base `AdminDoc`); cadena agregada como `ADMINDOC` en `Web.config`. Confirmado el 5 ago: `AdminDoc` se queda donde está, no requiere equivalencia.
- [x] **H-02** Clase `Impersonation` (P/Invoke) — hecha en `Helpers\Impersonation\Impersonation.cs`. Portada de APIMagento (`Metodos\ProductImage\Methods.cs`): mismo `LOGON32_LOGON_INTERACTIVE`, credenciales reales portadas al `Web.config` (`SMB_IMPERSONATION_*`).
- [x] **H-03** Helper HTTP hacia la DMZ — hecho como clase `Curl` en `Helpers\ConexionDMZ\Curl.cs`. Mismo nombre y firma pública (`Post`/`Get`) que el `Curl` de APIMagento; por dentro usa el patrón Bearer + reintentos que ya funcionaba en `OrderMethods.cs` (ahora refactorizado para usar esta clase en vez de duplicar la lógica).
- [x] **H-04** Fix `SQLiteDb.DefaultPath` — hecho en `Helpers\ConexionDB\SQLiteDb.cs`. Ya no apunta al placeholder roto `C:\AntigravityRoute`; lee `SQLITE_DB_PATH` del `Web.config`. Verificado el 6 ago: ruta, cadena de conexión, ensamblados y proveedor SQLite operativo. La apertura de la base real se valida en QA — el archivo vive en el servidor.

> **Ola 0 cerrada como desarrollo (6 ago).** Los cuatro habilitadores están escritos, compilando y verificados en todo lo que se puede comprobar fuera del servidor. Dos quedan con **validación diferida a QA** por depender de recursos que solo existen ahí: **H-02** (la cuenta de impersonación) y **H-04** (el archivo `data.db`). H-01 y H-03 se verificaron end-to-end.

---

## Ola 1 — Piloto (10 ago)

- [x] **E-01** `credit/SendSmsNewNumber` — **desarrollo al 100 %**, contrato y ambas ramas verificados el 6 ago contra la base real. ⚠️ **La generación del SMS no funcionó** (canal caído desde el 5-ago 23:04, falla igual para el legado): queda como pendiente de prueba a futuro. El cutover en la DMZ está **commiteado y subido (`c7d1d29`), pero sin desplegar**, así que en producción el tráfico sigue yendo al legado. Ver [[ESTADO_PRUEBAS_Y_AVANCE]] y [[E-01_SendSmsNewNumber]].

## Ola 2 — SIGMAVI listas blanca/negra (11–13 ago)

- [x] **E-02** `customer/setCustomerList` — **90 %**. Alta verificada end-to-end el 10 ago contra SIGMAVI y SAP. Cutover commiteado y subido a `dbAndroid`, sin desplegar. Ver [[E-02_setCustomerList]].
- [x] **E-03** `customer/getCustomerList` — **90 %**. Los tres valores de respuesta verificados con datos reales. Cutover commiteado y subido a `dbAndroid`, sin desplegar. Ver [[E-03_getCustomerList]].
- [x] **E-04** `customer/deleteCustomerList` — **90 %**. Borrado efectivo verificado el 10 ago. Cutover commiteado y subido a `dbAndroid`, sin desplegar. Ver [[E-04_deleteCustomerList]].

> **Cutover de la Ola 2 aplicado el 10 ago** en `APIMagentoDMZ\Controllers\CustomersController.cs`: las tres rutas pasan de `curl.Post` a `curl.PostSAP`. Compila en 0 errores y esta commiteado y subido (`740669e`), pero **sin desplegar**, asi que en produccion el trafico todavia va al legado.

> Los objetos de base (`ListaNegra`, `ListaBlanca`, `SpListaNBMagento`) **ya están desplegados en DEVMAVI** y verificados el 10 ago. Los scripts viven en el repo **MaviSAP**, rama `SpVTASListaNBMagento`.

## Ola 3 — SQLite (14–17 ago)

- [ ] **E-05** `order/getGuide` — **80 %**. Los 7 casos verificados el 19 ago sobre base simulada. Cutover commiteado y subido a `dbAndroid`, sin desplegar. Falta la validación contra la base real del servidor. Ver [[E-05_getGuide]].
- [ ] **E-06** `credit/GetCreditAmounts` — **80 %**. Los 9 casos y las 3 ramas de campo verificados el 19 ago sobre base simulada. Cutover commiteado y subido a `dbAndroid`, sin desplegar. Falta el e2e real, que depende de que M-03 llene `mavi_credilana_info`. Ver [[E-06_GetCreditAmounts]].

> **Script de tablas:** `ServicioSap\ServicioSap\Scripts\SQLite\01_CrearTablas_Ola3.sql` crea `mavi_credilana_info` y su trigger. **`servicio_guias` va comentada** por decisión del 19 ago, replicando cómo vive en el legado (`OrderMethods.cs:18-24`, donde el DDL es un comentario y la tabla se dio de alta a mano). Ejecutar el script **no** la crea.

> **Cinco divergencias contra el legado** se detectaron y corrigieron durante la corrida del 19 ago, todas en rutas de error. La más grave: E-06 respondía **200 con cuerpo `null`** donde el legado da 500. Detalle en [[ESTADO_PRUEBAS_Y_AVANCE]].

## Ola 4 — AdminDoc (18–19 ago)

- [x] **E-07** `credit/guardardocumento` — **100 %**. Los 9 casos verificados el 20 ago contra AdminDoc real, con las filas comprobadas por SELECT y borradas después. Cutover commiteado (`d933e44`); **pendiente de despliegue**. Ver [[E-07_guardardocumento]].
- [x] **E-08** `credit/SaveImagesProductosMx` — **100 %**. Los 3 casos verificados el 20 ago: archivos en disco y fila de la selfie en AdminDoc. Cutover commiteado (`d933e44`); **pendiente de despliegue y de confirmar que el app pool pueda escribir en la carpeta de imágenes**. Ver [[E-08_SaveImagesProductosMx]]. Los límites de `httpRuntime`/`requestLimits` para envíos Base64 ya estaban en el `Web.config`.

> **Adaptación al formato de cuenta (20 ago).** E-07 decidía en qué columna guardar el documento preguntando si la cuenta empieza por `C` o `P`. Con el BP esa condición sería siempre falsa y los documentos caerían en `DIR` en vez de `CLAVE`, donde `SpMaviConsultaDoc` no los encontraría. La condición pasa a ser `StartsWith("15") && Length <= 10`.

> **E-08 nunca estuvo bloqueado por H-02.** El comentario que lo daba por dependiente de la impersonación era falso: el legado escribe en una ruta **local**, no en un share SMB. Corregido.

> **Ruta de imágenes de E-08:** ServicioSAP usa su propia carpeta, configurable con `IMAGES_CREDIT_PATH` (hoy `C:\inetpub\wwwroot\sap\images\credit`), igual que se hizo con `data.db`.

## Ola 5 — ServicioAndroid y SOAP externo (20–25 ago)

- [ ] **E-09** `customerService/obtenerQuejas` — ServicioAndroid. **90 %**: escrito el 21 ago en `Methods\CustomerService\CustomerServiceMethods.cs`, compila en 0 errores, cutover commiteado el 24 ago (`c695b2e` en APIMagentoDMZ) y subido el 31. Los 5 casos verificados el 23 ago contra servicios reales; ficha lista. Falta desplegar.
- [ ] **E-10** `customerService/bbvaKeyAdvanced` — SOAP `WSeCommerceMX`. **90 %**: escrito el 21 ago, misma clase, cutover commiteado el 24 ago y subido el 31 (mismo commit que E-09). No toca base: es una llamada SOAP a `MULTIPAGOS_APIKEY_URL`, ya portada al `Web.config` junto con `CODIGO_ENT`. Falta probar y ficha. ✅ Verbo en paridad: la DMZ lo llama con `curl.GetSAP(...)`, entregado por Dev 1 el 21 ago.

> **Falsa alarma resuelta:** `obtenerQuejas` nombra su conexión `intelisisConn`, pero la cadena que usa es `sCadenaConexionAndriod` → **ServicioAndroid** en mavicbosandroid (APIMagento: `Conn\Connection.cs:28`). No es IntelisisTmp; **no necesita equivalencia**. Engaña el nombre de la variable, no la conexión.

> ✅ **Verbo de `obtenerQuejas` resuelto el 21 ago, en el cutover.** La LAN lo declara `[HttpPost]` y la DMZ lo llamaba con `curl.Get(...)` desde el 28-jul, mandando GET a una ruta que solo acepta POST. El cutover lo alinea: la DMZ **conserva su `[HttpPost]` público** —el cliente final no nota nada— y pasa a llamar con `curl.PostSAP(...)`, que es el verbo del legado. Las dos rutas de ServicioSAP quedan solo como `[HttpPost]`.

> ✅ **`GetSAP` entregado por Dev 1 el 21 ago** (`4dabaa9`, `APIMagentoDMZ\Helper\Curl.cs:210`) — el gemelo de `PostSAP` con verbo GET, usando `TokenSAP` e `IpSAP`. Con eso **las dos partidas quedan en paridad de verbo con el legado**:
>
> | | Verbo en la LAN | Llamada de la DMZ | Ruta en ServicioSAP |
> |---|---|---|---|
> | **E-09** | `[HttpPost]` | `curl.PostSAP(...)` | `[HttpPost]` ✅ |
> | **E-10** | `[HttpGet]` | `curl.GetSAP(...)` | `[HttpGet]` ✅ |
>
> Las rutas públicas de la DMZ siguen siendo `[HttpPost]` en ambas, así que el contrato hacia el cliente final no cambió en ningún momento.
- 🗑️ ~~`credit/ExistRFCAndPhoneCte`~~ — **descartado el 11 ago, sin ID.** Sus dos métodos de validación tienen un `return` incondicional en la primera línea: no consulta nada y siempre responde lo mismo. La validación real iría contra Intelisis.
- 🗑️ ~~`status/getStatus`~~ — **descartado el 11 ago, sin ID.** Ping ICMP al servidor de Intelisis; no informa sobre la salud de ServicioSAP.

## Ola 6 — SMB y DMZ (26–28 ago)

> **Código commiteado el 26 ago y subido el 31**: `4315c50` en `dbAndroid` de ServicioSAP, con las cuatro partidas, sus modelos y las cuatro claves nuevas del `Web.config`. El cutover de E-13 va en `e403065` de APIMagentoDMZ. Los porcentajes no se mueven por esto: commitear no es una casilla de la rúbrica, y lo que falta en cada partida sigue siendo lo mismo que el 25 ago.

- [ ] **E-11** `customer/getCuenta` — DMZ → Magento. **90 %**: escrito y probado el 25 ago contra la cadena completa, con APIMagentoDMZ levantada en local. Sin cutover: no hay ruta suya en la DMZ. Falta desplegar.
- [ ] **E-12** `customer/setCuenta` — DMZ → Magento. **80 %**: escrito y probada la rama de error el 25 ago. ⚠️ **La escritura real no se ejecutó**: graba `customer_credit_account` en un cliente de Magento y no había un id de prueba acordado.

> **Lo que hace Magento del otro lado**, verificado el 25 ago en `Mavi\CuentaMavi\Model\CuentaManagement.php`: las dos rutas operan sobre el atributo **`customer_credit_account`**. `getCuenta` busca por correo en las websites **1 y 5** y devuelve un elemento por coincidencia —puede devolver dos—, con el campo llamado `cuenta_intelisis`. `setCuenta` carga por id y graba.
>
> **Cada operación usa un subconjunto distinto del modelo:** `getCuenta` solo mira `correoCuenta`; `setCuenta` solo `idCliente` y `nuevaCuenta`. El resto se ignora en silencio.
- [ ] **E-13** `customer/cashCustomerReport` — filesystem + SMB. **80 %**: escrito el 25 ago; validación y escritura local verificadas, cutover commiteado el 26 ago (`e403065`) y subido el 31. Fuente real: `CustomerMethods.CreateCashReport` en APIMagento, ya usa `Impersonation` (H-02) para escribir en `\\172.16.200.2\mavica\ecom\BaseWhatsapp\STAGE\`. **Se puede escribir ya**: la clase `Impersonation` está lista y el llamador le pasa las credenciales (`SMB_IMPERSONATION_*`, orden `usuario, dominio, password`). La copia al share no es verificable desde desarrollo; se valida en QA junto con H-02.
- [ ] **E-14** `product/obtenerImagen` — filesystem + SMB. **55 %**: escrito el 25 ago, **con la diagonal del legado corregida**. Sin cutover: no existe ruta suya en la DMZ. 🔴 Bloqueado por H-02.

## Ola 7 — SIGMAVI sin dependencia de SAP

- [ ] **E-15** `order/GetPickUpCode` — **35 %**: escrito el 31 ago en `Methods\Order\StorePickupMethods.cs`, commiteado y subido en `8cf2c52`,, compila en 0 errores, asíncrono. Solo la lectura; los tres escritores se quedan en el legado. Sin pruebas, sin cutover y sin ficha. No lee nada de SAP.

> 📌 **La tabla ya existe en SIGMAVI: `BpRecogePedidos`**, no `TrWDM0285_CteRecoge`. Mismas columnas, `MaviSAP: Tables\BpRecogePedidos.sql`, de abril de 2025. **No hay que crearla.**

> ⏳ **Sin probar:** la tabla está vacía porque los escritores siguen en Intelisis, y dos de ellos son partidas de Dev 2 con fecha 10-11 sep y feb 2027.
- 🗑️ ~~`recommender/setRecommenderList`~~ — **descartado el 31 ago, sin ID.** Obsoleto en la LAN, no se migra. Pierde su identificador; los posteriores se reindexan una posición. Al revisarlo se vio además que su método abre `sCadenaConexion`, que es **IntelisisTmp en MAVICUBOS** (`Conn\Connection.cs:26`), no SIGMAVI como decía esta línea.

> ⚠️ No confundir con `order/createStorepickupCode`, que vive en el mismo archivo del legado pero **sí** cruza a `Venta` y `Cte`. Ése es de Dev 2.

## Ola 8 — Reubicación de llamadores hacia la DMZ

31 rutas de la DMZ, **E-16 a E-31**. No se portan: lo que se reubica son sus llamadores, que hoy viven en APIMagento. Doce se reconstruyen —ocho de catálogo hacia SQLite, tres reenvíos y un helper compartido para `order/setOrderStatus`—, ocho pasan sin cambio porque las atiende la herramienta de importación, seis solo se verifican y cuatro se dan de baja.

> El desglose por identificador está en [[CHECKLIST_DEV3_NOSAP_NOINTELISIS#Ola 8 — Reubicación de llamadores hacia la DMZ|el checklist de Dev 3]].

## Ola 9 — Mixtos SAP

- [ ] **E-47** `credit/SolicitudMercancia` — lee el Business Partner de SAP e inserta en `CRED_SOLICITUD_WEB_DATOS_TEMP` de `ServicioAndroid`. Requiere el helper de conversión de cuenta `C%` → BP.
- [ ] **E-48** `credit/codigoPromocion` — tabla `VentaCupon` en SIGMAVI. **Ya construido** como `HandlePromoCode`; falta alinear el nombre de la tabla, que hoy es `VentasCupones`.
- [ ] **E-49** `credit/getPlazos` — tabla `CondicionesCredVtaLinea` en SIGMAVI + condiciones contra TZ01.
- [ ] **E-50** `customerService/obtenerTipoGarantia` — tabla `DM0415` en SIGMAVI, poblada exportando desde Intelisis, + artículo contra DM01. Estructura pendiente de **Valentin y Humberto**.

> Regla de reparto: Dev 3 construye la tabla en SIGMAVI, el método y la conexión a nuestras bases; **las conexiones a SAP que no existan se anotan y se entregan a Dev 2**.

## Olas 10–12 — Endpoints mixtos de Intelisis — fechas son marcador de posición

### Ola 10 — bifurcados SQLite/Intelisis

- [ ] **M-01** `credit/CreditoWeb_FormDatos` — `SP_CREDITO_WEB_VALORES_FORM`
- [ ] **M-02** `credit/CreditoWeb_Informacion` — `SPCREDICredilana`
- [ ] **M-03** `credit/SaveCredilanaInfo` — `FnVTASListaCredilanas`

### Ola 11 — otros mixtos

- [ ] **M-06** `credit/getSms` — `VTASCodigoSMSEcommerce`
- [ ] **M-13** `credit/CreditoWeb_SaveData_Articulos`
- [ ] **M-07** `credit/CreditoWeb_Seguro` — `SpCREDICredilanaSeguroDeVida` + API Liberador
- [ ] **➡️** `credit/GetPhoneValidatedClientSecretName`
- [ ] **M-08** `credit/SaveHaztenTransaction` — SIGMAVI + Android + `RM0855ACoordenadasProspecto`
- [ ] **M-04** `credit/CreditoWeb_Solicitud` — `SPCREDICredilana`, el mismo SP que M-02
- [ ] **M-05** `credit/CreditoWeb_SolicitudPrimerGuardado` — hermano de M-14
- [ ] **M-09** `order/ManagePaynetOrders` — depende de `spAfectar`, declarado muerto
- [ ] **M-10** `order/insertPaymentData` — `CXCCMensajeWebHookOpenPay`
- [ ] **➡️** `order/updateCreditOrderId` — `eCommerceDetPedidos`, `Venta`
- [ ] **🗑️** `credit/codigoRecomendadoWithUen` — `CREDIDCodigoRecomendador`; el archivo maestro lo marca fuera de alcance, confirmar
### Ola 12 — cruzan por linked server `ERPMAVI`

- [ ] **M-11** `credit/validateSms` — `SPVTASCodigoSeguridadeCommerce`
- [ ] **M-12** `credit/CreditoWeb_SaveData` — `SP_CREDITO_WEB_DATOS`
- [ ] **M-14** `credit/CreditoWeb_SaveFirstData` — `SpCREDISolicitudWebPrimerGuardado`
- [ ] **M-15** `customerService/bitacoraAtencionClientes` — `SP_ACTES_REGISTRO`


---

## Riesgos abiertos

> El detalle de cada hallazgo, con los datos que lo sostienen, está en [[ESTADO_PRUEBAS_Y_AVANCE]].

### Nuevos (5 ago)



- [ ] 🔴 **El cutover no desacopla la DMZ del legado.** `Curl..ctor()` autentica contra la LAN incondicionalmente y fuera de un `try`, así que un endpoint conmutado a `PostSAP` sigue muriendo con 500 si APIMagento no responde. Corregir **antes** de conmutar en producción.
- [ ] 🟡 **El whitelist de certificados de la DMZ es código muerto** — `EnableTrustedHosts()` compara hosts pelados contra `DOMINIO_LAN`/`DOMINIO_SAP`, que guardan URLs completas. Poner hosts pelados.
- [ ] 🔴 **El canal de SMS está caído desde el 5-ago 23:04** (verificado el 6 ago sobre la base real). Nada ha salido desde entonces; el tráfico de la LAN de esta mañana terminó en `EstatusEnvio 3` tras 4 intentos. **Afecta a producción, no solo a la migración.** Bloquea cerrar E-01. Escalar a quien opere el servicio de módem.
- [ ] 🟡 **Una conexión a `mavicbosandroid.grupomavi.com` puede resolver a una copia obsoleta sin avisar.** El 5 ago las pruebas corrieron contra una copia (reloj en 2025-11-10, `MAX(Id)` 7 973); el 6 ago la misma cadena da la base real (reloj correcto, `MAX(Id)` 7 135 742). Antes de dar por buena cualquier prueba contra ese host, comprobar `GETDATE()` y `MAX(Id)`.
- [ ] 🟡 **H-02: validar la impersonación en QA.** En desarrollo `LogonUser` falla con `Win32 1326` y la cuenta `GRUPOMAVI\auxsvrwea05qai` no aparece en el dominio — la misma que APIMagento lleva hardcodeada. Como la prueba real solo se puede hacer desde el servidor, se decidió (6 ago) dar el código por bueno y validarlo en **QA**. Si ahí vuelve a fallar, credenciales, rutas y diagnóstico en [[H-02_IMPERSONACION_SHARES]].
- [ ] 🟡 **H-04: validar la apertura de `data.db` en QA.** La ruta configurada es correcta; el archivo reside en el servidor, así que desde desarrollo solo se pudo verificar código, cadena de conexión, ensamblados y que el proveedor SQLite opera. Ya no bloquea escribir la Ola 3.
- [ ] 🔴 **Comprobar si `servicio_guias` existe en `C:\inetpub\wwwroot\sap\data.db`.** `SaveGuide` lleva escribiendo ahí con tres capas de silencio; si la tabla no está, cada guía se pierde sin rastro y E-05 responde 500 siempre. **El script de la Ola 3 la trae comentada por decisión del 19 ago, así que ejecutarlo no la crea.** Un `SELECT name FROM sqlite_master WHERE name='servicio_guias'` resuelve la duda en un minuto.
- [ ] 🟡 **SQLite crea `data.db` vacío al abrirlo si no existe.** Que el servicio levante y conteste no prueba que las tablas estén ahí — la ausencia se manifiesta solo como 500 en tiempo de consulta.
- [ ] 🟡 **`tipo` se compara con `==` exacto en E-06.** Un `"credito"` en minúsculas cae en la rama de apertura y devuelve montos menores, con 200 y sin aviso. El legado hace lo mismo; corregirlo exige tocar los dos lados.
- [ ] 🔴 **E-08 responde `true` antes de trabajar.** Verificado el 20 ago: contesta en 179 ms y guarda 10 segundos después, en un `Task` suelto. Un reciclado del app pool en esa ventana se lleva el lote sin rastro, y el `true` sale igual. Mitigado con `sap.log`; corregirlo de verdad cambia el contrato.
- [ ] 🟡 **Confirmar en el servidor que la carpeta de imágenes de E-08 exista y sea escribible.** El código la crea si falta, pero si el app pool no tiene permiso, las imágenes se pierden en silencio. En desarrollo no se pudo crear `C:\inetpub\wwwroot\sap`.
- [ ] 🟡 **Averiguar quién consume `C:\inetpub\wwwroot\api\images\credit`** antes de desplegar E-08. Nada en los dos repos legados vuelve a leer esa carpeta, así que cualquier consumidor está fuera de ellos y dejaría de encontrar los archivos nuevos.
- [ ] 🟡 **`CLAVE` de `MAVI_DOC_CTE` es `varchar(10)` y un BP mide 10.** Sin margen: un identificador más largo empezaría a fallar con truncamiento.
- [ ] 🟡 **`AVAL` es `bit` pero el parámetro va como `VarChar`** en E-07. Cualquier valor no numérico tumba el INSERT con 500. Deuda heredada, verificada idéntica en APIMagento.
- [ ] Decidir si se corrigen los dos huecos heredados de E-01 (sin validación de campos; reutilización de `IdRef` sin mirar expiración). Corregirlos exige tocar también la DMZ.
- [ ] Decidir si se corrige el **404 inalcanzable de `order/getGuide`**: el `throw` está dentro del `try` y el `catch` lo convierte en 500, así que "sin guía" y "consulta rota" son indistinguibles. El legado es idéntico.

> ✅ **Cerrado (10 ago):** el campo de correo para validar contra SAP es `Mail`, ya configurado y verificado end-to-end.

> ✅ **Cerrado (10 ago):** los objetos de la Ola 2 ya estan desplegados en DEVMAVI (`ListaNegra`, `ListaBlanca`, `SpListaNBMagento`).

> ✅ **Cerrados (5 ago):** alcance de red a los shares SMB (`172.16.200.2` y `172.16.202.4` responden en el puerto 445) · **H-03**, que no estaba fallado sino sin probar: con APIMagentoDMZ levantada en local, el helper autentica y obtiene un JWT válido.

### Del plan original

- [ ] Estructura de `DM0415`, garantías — **Valentin y Humberto** (corregido el 12 ago) — bloquea E-50
- [x] ~~Definición de monedero (Valentin)~~ — ya no nos bloquea: reasignado a Dev 2 el 12 ago
- [x] ~~Validar alcance de red a los shares SMB (`\\172.16.200.2`, `\\172.16.202.4`) antes de integrar E-13~~ — cerrado el 5 ago, ambos responden en el puerto 445
- [ ] Medir en producción el uso real de los `op` sin caché (afecta el tamaño de la Ola 10)
- [ ] Decisión de arquitectura sobre los mixtos del grupo A (Ola 12)

## Progreso

**10 / 38** partidas marcadas como completadas (H-01, H-02, H-03, H-04, E-01, E-02, E-03, E-04, E-07, E-08). `[x]` aquí significa **desarrollo terminado**; varias tienen validaciones diferidas anotadas en su línea: H-02 y H-04 esperan QA, E-01 espera el canal de SMS, y las cuatro partidas de endpoints esperan el despliegue del cutover.

El contador solo cuenta partidas cerradas, así que esconde el trabajo a medias. El avance ponderado real es **44,7 %** sobre 38 partidas; el desglose por endpoint, con el criterio de cálculo y el estado de pruebas de cada uno, está en [[ESTADO_PRUEBAS_Y_AVANCE]].

> 🔴 **Ese 44,7 % sustituye al 49,0 % del 25 ago, y no es un retroceso.** El denominador de los mixtos estaba mal —decía 12 y son **15**, contados uno a uno en la tabla—, lo que inflaba el promedio. Corregido eso, entró además E-15 al 35 %, por debajo de la media. El trabajo hecho es el mismo; lo que cambió es sobre cuántas partidas se promedia.

**La Ola 4 es la primera que cierra completa**: E-07 y E-08 al 100 %, con pruebas contra AdminDoc real y cutover commiteado. Lo que les queda ya no depende del equipo de desarrollo — es despliegue, y en E-08 confirmar los permisos de la carpeta de imágenes.

La Ola 3 sigue a medias: E-05 y E-06 al **80 %**, probados y documentados, con el cutover escrito, pero sin validar contra la base real del servidor.

La Ola 5 quedó probada el 23 ago contra servicios reales: E-09 y E-10 al **90 %**, con ficha y cutover. Solo les falta el despliegue.

La Ola 6 quedó escrita y probada el 25 ago, y **commiteada el 26 ago y subida el 31**. Cierra en un rango amplio: E-11 al **90 %**, E-12 y E-13 al **80 %**, E-14 al **55 %**. Ninguna avanza más sin resolver dos cosas que no dependen del código — un id de cliente de Magento para probar la escritura de E-12, y H-02 para E-13 y E-14.

La Ola 7 arrancó el 31 ago con E-15 al **35 %** —escrito y compilando, sin probar— tras descartar `setRecommenderList`. Es la primera partida cuyo bloqueo no es de entorno ni de arquitectura, sino de secuencia: lee una tabla que otro desarrollador todavía no llena.

Todos los cutovers de las olas 1 a 6 están **commiteados y subidos** a `dbAndroid` de APIMagentoDMZ, pero **ninguno desplegado**: en producción el tráfico sigue yendo al legado. E-15 aún no lleva cutover.

> 🔴 **Orden de despliegue: ServicioSAP primero, la DMZ después.** El constructor de `Curl` en la DMZ autentica contra la LAN de forma incondicional y fuera de un `try`, así que toda ruta ya migrada sigue dependiendo de que APIMagento responda aunque los datos ya no vayan para allá.

E-01 queda marcada como desarrollo terminado. Lo que falta para que esté **en producción** es desplegar el cutover de la DMZ y confirmar la entrega del SMS.
