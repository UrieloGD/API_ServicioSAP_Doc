---
tags: [migracion, sap, credito, fable, plan-final]
fecha: 2026-09-30
estado: vigente
alcance: crédito web de LAN (order/setOrder con metodoPago 'omnipro_pago_credito') migrado a ServicioSAP order/new con paridad exacta
sustituye_como_lectura_principal: PLAN_EJECUCION_SP_CREDITO_A_CODIGO §9 y §26 (borrador), MATRIZ §0, CAMBIOS §1 y §5
---
# Crédito web LAN → ServicioSAP — análisis completo y plan final
> 2026-10-01: cómo funciona ServicioSAP hoy está en [[Business Rules Ecommerce]] (fuente única). Este documento queda como análisis y plan; si contradice a esa fuente, gana la fuente.

> [!abstract] En una línea
> La **cabecera** de la solicitud ya guarda lo mismo que LAN + SP para un BP existente (E1-E5, sin commit y sin E2E). Faltan las **compuertas "sin fila"**, el **precio y costo de las líneas**, el **cupón**, el **liberador y el aviso a Magento** y las rutas **creditStatus / updateCreditOrderId**. Este documento reúne todas las reglas, todas las decisiones y el plan que Fable 5.1 ejecuta, sesión por sesión.

---

## 0. Cómo leer este documento
> **2026-10-01 — Reglas del crédito web:** cómo aplica hoy ServicioSAP las reglas del crédito web (rama `omnipro_pago_credito` de `order/new`, `order/getCondicion` y el liberador apagado; reglas `RCRE`, `RCND`, `RLIB` y `RCOM` de su sección 02) vive desde hoy en [[Business Rules Ecommerce#Órdenes a crédito (rama omnipro_pago_credito de order/new)|Business Rules Ecommerce §"Órdenes a crédito"]], la fuente única de cómo funciona ServicioSAP. Este documento conserva las **decisiones** (§4: DU1-DU19 y las que se registren en §4.5) y las **tareas** (§6); las reglas G1-G5 de §3 quedan como el análisis de LAN contra el que se mide la paridad. Si algo de aquí contradice a esa sección sobre cómo funciona el código, gana esa sección (y, sobre las dos, el código). Actividad: ACT-39 de [[ACTIVIDADES_PENDIENTES_CREDITO_WEB_2026-10-01]].

> **2026-10-01:** la plantilla de actividades pendientes para entregar al equipo (responsables, dependencias, estado y criterio de terminado) está en [[ACTIVIDADES_PENDIENTES_CREDITO_WEB_2026-10-01]].

**Es la lectura principal del crédito web desde el 2026-09-30.** Se puede leer solo: trae las reglas de LAN, el estado del código, las decisiones, el plan y el tutorial de Fable. Los demás documentos quedan como **historia y detalle**. Si uno de ellos contradice a este, manda este; si este contradice al código del share, **manda el código** (§7 lista las contradicciones conocidas).

| Documento | Qué sigue aportando | Qué deja de ser |
|---|---|---|
| [[MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP]] | Detalle y evidencia por regla (G1-G5, 149 filas) | Ya no es el conteo vigente: el conteo está en §1 y las reglas nuevas en §3 |
| [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]] | Decisiones D1-D10 (= DU1-DU10 aquí), cambios E1-E5 (E5 en §3.6) y la tabla de las 59 columnas (§4) | Ya no es la lista de pendientes: los pendientes están en §6 |
| [[PLAN_EJECUCION_SP_CREDITO_A_CODIGO]] | Historia §0-§25 (runbook, preguntas Q1-Q22, bugs, plan de pruebas de §24) | La §9 y el borrador de §26 del 2026-09-29 ya no son plan vigente; su §26 apunta aquí |
| [[GUIA_MIGRACION_FABLE]] y `SKILL.md` | Reglas de construcción y de criterio. **Siguen siendo obligatorias** | — |
| [[PLAN_FABLE_POR_CONTROLADOR]] | Paquetes por controlador; el crédito de 7a, 7c y 9 viene aquí | — |
| [[FLUJO_CREDITO_LAN_VS_SAP]], [[FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO]], [[ANALISIS_SP_CREDITO_WEB_DATOS]], [[CAPTURAS_REALES_APIS]], [[COMPARATIVA_SETORDER_LAN_VS_SAP]] | Análisis y capturas originales | Tienen afirmaciones desactualizadas (§7.2) |

**Orden sugerido:** §1 (veredicto) → §6.0 (decisión final del plan) → §6.1 (tablero) → la tarea que toque. Para trabajar con Fable: §8.

**Rutas y abreviaturas.** Rutas relativas a `\\172.16.214.58\sap`.
- **ServicioSAP** — SS = `ServicioSAP/ServicioSap/ServicioSap/`. OM = SS/Methods/Order/OrderMethods.cs · SCW = SS/Methods/Credit/SolicitudCreditoWebMethods.cs · SCM = SS/Models/SAP/Credit/SolicitudCreditoWebModels.cs · FLP = SS/Methods/SalesDistribution/FinalListProperMethods.cs · ICR = SS/Models/SAP/Order/InfoClienteRequest.cs · OC = SS/Controllers/OrderController.cs · BPM = SS/Methods/BusinessPartner/BusinessPartnerMethods.cs · PM = SS/Methods/MaterialManagement/ProductMethods.cs · ECM = SS/Methods/Ecommerce/EcommerceMethods.cs · LIB = SS/Methods/Credit/LiberadorCreditoMethods.cs · PCC = SS/Helpers/PaymentConditionCatalog.cs.
- **LAN** (`LAN/WebApiMagento/`) — LOM = Metodos/OrderMethods.cs · LCM = Metodos/CreditMethods.cs · LOC = Controllers/OrdersController.cs · LLIB = Metodos/LiberadorCreditoMethods.cs.
- **SPs** (`.agents/skills/lan-sap-migration/SPsOrden/`) — SPD = SP_CREDITO_WEB_DATOS.sql · SPC = SpCREDIDatosSolicitudCreditoArt.sql · SPL = SpVTASInsertArtSolCreditoLinea.sql · SVC = spVerCosto.sql · SDP = SpVTASeCommerceDetPedidos.sql · SCU = SpVTASVentaCupon.sql · CTN = SP_eCommerceCtenuevo.sql.
- **Magento** (`Magento248/Magento248/app/code/`) — MOM = Omnipro/PlaceOrder/Model/OrderManagement.php · MCO = Mavi/CreditoCheckout/Model/CreditoOrderManagement.php · MPC = Mavi/CreditoCheckout/Cron/PollCreditStatus.php.
- **DMZ** = `DMZ/WebApiMagento/` (HEAD `09cb341`, rama `ConexionSAP`, limpio). DMZ@c63c0ab = el DMZ de la era LAN (git `c63c0ab`).
- **Documentos** (`MappingMetods/` salvo que se diga) — PLAN, MATRIZ, CAMBIOS, GUIA, FLUJO_CREDITO = FLUJO_CREDITO_LAN_VS_SAP.md, FLUJO_SP = FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO.md, CAP = CAPTURAS_REALES_APIS.md, CSV = `MAVI - DMZ-SAP.csv` (modificado por otra persona el 2026-09-30), INVLOGS = INVENTARIO_LOGS_SERVICIOSAP.csv, PLAN_FABLE, DEV2 = `../Checklists/CHECKLIST_DEV2_ROADMAP.md`, DEV3 = `../Checklists/CHECKLIST_DEV3_NOSAP_NOINTELISIS.md`, CHECKLIST_DEV1 = `../Checklists/CHECKLIST_DEV1_WRAPPERS_SAP.md` (los tres en `lan-sap-migration/Checklists/`, fuera de `MappingMetods/`), GANTT = `_NUESTROS_ENDPOINTS/PLAN_MAESTRO_GANTT_POR_DEV.md`, BAJA = `_NUESTROS_ENDPOINTS/Contratos/BAJA_getOrderId.md`, SKILL = `.agents/skills/lan-sap-migration/SKILL.md`.

**Ids que se parecen (no confundir):**
- **DU1-DU10** = decisiones del usuario del 2026-09-28/29. En CAMBIOS §2 y MATRIZ §0.4 se llaman D1-D10.
- **D1-D10 de diseño** = decisiones de diseño del 2026-09-18 ([[FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO]] §1). Aquí siempre se escriben "D1 de diseño".
- **R1/09-26 … R8/09-26** = decisiones del 2026-09-26 (`_IMPLEMENTACION_SP_CREDITO/workflow_credit_parity_2026-09-26.js:28-35`). **R1, R2, R3, R4** sin sufijo = tareas de este plan.
- **Q1-Q22** = preguntas de PLAN §23.4 y §24.3. **G1-xx … G5-xx** = reglas de la MATRIZ (y las nuevas de §3). **E1-E5** = cambios hechos. **P1-P20** = tareas DECISION. **T1a/T1b, T2a-T2d** = tareas de otros equipos. **V1-V4** = verificación. **S1-S4** = sesiones de Fable.

**Líneas de código.** Las de ServicioSAP son las del working copy del 2026-09-29 12:44 (OM 3364 líneas, SCW 670), vueltas a comprobar el 2026-09-30. Las de PLAN, GUIA, MATRIZ y CAMBIOS valen para esos archivos **después** de los apuntadores del 2026-09-30 (se escribieron sin mover líneas, salvo CAMBIOS a partir de §3.6: ahí se cita por sección).

---
## 1. Veredicto

**Todavía no hay paridad completa.** La parte que escribe la cabecera ya es igual a LAN; lo que va después de la cabecera, no.

| Área | Estado hoy | Qué falta | Qué lo bloquea |
|---|---|---|---|
| Quién recibe solicitud | **IGUAL**: solo un BP existente; cuenta vacía o inexistente → `sin cuenta`, sin fila (E1, DU6; OM:642-650) | — | — |
| Cabecera `CRED_SOLICITUD_WEB_DATOS_TEMP` (59 columnas) | **IGUAL** con un BP existente y el payload que manda Magento: 37 EQ, 11 EQ-FUENTE, 9 PENDIENTE, 2 BORDE, **0 DIF** (CAMBIOS §4) | Compuertas "sin fila" (P1), DIMAS MX (P4), MAYÚSCULAS (P5), `Namemiddle` (P6), limpieza de código muerto (R4) | Decisiones del usuario |
| Validación telefónica | **IGUAL** con DU2-DU4; el código ya da NULL en "no encontrado" como el SP (R2-V) | R1 (`Length > 0`), R3 (clave BP), atajo de SCW:393-396 (R2-b), prospecto por `ZtipoCliente` (P16) | Captura R2-V (la corre el usuario) |
| Líneas `VTASdArtCreditoWeb` | **PARCIAL**: SEGU00001, `Orden` con huecos, SKU repetido, CEILING y condición de la cabecera iguales | Filtro de la fila SD29 (P7), varias filas y costo NULL (P8), condición sin equivalente (P2), TELEFONIA (P10, diferida), staging (P9) | Capturas SD29 y DDL; Q17 del negocio |
| Cupón del promotor | **DIF** (G5-07, G5-08, G5-27) | Alcance: el usuario dijo "deprecado" el 2026-09-26 sin elegir opción (P3) | ¿Alguien lee `SIGMavi.VentasCupones`? |
| Liberador + aviso a Magento | **FALTA**: el bloque está comentado (OM:685-721) y el aviso manda llaves snake_case (OM:1251-1257) | T1a (LISTO), T1b | Valentín (T1) |
| creditStatus, updateCreditOrderId, reenvío | **FALTA**: ServicioSAP no tiene esas rutas; el DMZ las manda a `URL_INTELISIS` (DMZ OrdersController.cs:411, :467) | T2a-T2d | Área de crédito, Alan, dueño del DMZ, Dev 2 |
| Contrato HTTP y bitácora | **DIF aceptado** por R4/09-26: 200 con objeto o `Error, …` | P12, P13 | Decisión del usuario |
| Pruebas | **Ninguna E2E**. Compila con `csc`; falta MSBuild | V1 (MSBuild), V2-V4 | Binario servido y aprobaciones del usuario. El permiso INSERT de `usrintranet` solo se comprueba en V2 paso 0 (DU1: no es bloqueo) |

**Conteo de las 143 reglas originales (MATRIZ §0.2, 2026-09-29):** EQ 46 · EQ-R 41 · DIF 6 · FALTA 10 · N/A 12 · PENDIENTE 28 · DEP 0.
Con las 6 filas "NUEVA 2026-09-29" (149 filas): EQ 46 · EQ-R 42 · PENDIENTE 31 · N/A 12 · FALTA 10 · DIF 8.
Las 11 reglas "NUEVA 2026-09-30" de §3 **no** entran en estos conteos (entre ellas: PENDIENTE 7 · EQ-R 2 · DIF 1 · FALTA 1).

> **Sensibilidad 41/28 contra 37/32:** CAMBIOS §1 cuenta G1-05, G1-19, G2-10 y G5-04 como PENDIENTE (son compuertas "sin fila"); la MATRIZ las deja EQ-R porque R5/09-26 y Q11 ya las decidieron. Son los mismos datos; este documento usa 41/28 y trata esas 4 dentro de P1.

---

## 2. El proceso de crédito de LAN, paso a paso, contra ServicioSAP

Reconstruido solo desde el código de LAN y los SP (38 pasos); Magento y el DMZ de la era LAN solo marcan dónde empieza y termina. Estados: **IGUAL**, **IGUAL-FUENTE-SAP** (mismo valor con la fuente SAP decidida), **PENDIENTE** (espera una decisión o un equipo), **FALTA**, **N/A**, **DEPRECADO**.

**Conexiones de LAN.** IntelisisTmp: `checkCliente`, `getClientInfo`, SP de líneas, SP de cupón, SP de staging, `IsValidated` y las consultas a `Venta`. ServicioAndroid: `SP_CREDITO_WEB_DATOS`, `checkSaldo` y la lectura de SMS. Una solicitud se reparte en dos bases sin transacción ni compensación (LCM:117, :401, :872; SPL:208, :243): cualquier falla deja escrituras parciales, y por DU5 el port las reproduce, no agrega rollback (GUIA §1.9).

| Paso | LAN hace | ServicioSAP | Estado | MATRIZ |
|---|---|---|---|---|
| 00 | **Magento** (contexto). `requestCreditOrder` arma `creditIncrementId = 'CRED' + quoteId`, guarda la fila PENDIENTE y llama `registerCreditQuote` (MCO:44-56). El body lleva `entityId = quoteId`, `incrementId = 'CRED{quoteId}'`, `cuotas` = condición del primer artículo, `costoEnvio` decimal, `cuenta = getCuentaIntelisis()`, `origen` solo si viene, `codigo_promotor`, `forzarOrder '0'`, `utmSource` (MOM:628-855, :861-864). No manda `sucursalDestino` | Mismo request a `order/new`. Por DU2, `cuenta` será el BP numérico (hoy MOM:719 aún manda la cuenta Intelisis: lo corrige Magento) | N/A (contexto) | G1-13, G2-30, G2-32 |
| 01 | **DMZ era LAN.** Sin llave `cuenta` → 400 `Cuenta invalida` sin llamar a LAN; `''` → 500; `PedidoExistente` → 409; `sin cuenta` → 422; respuesta que no empieza con `C` → 500; excepción → 500; éxito → 200 con la cuenta (DMZ@c63c0ab OrdersController.cs:107-196) | DMZ actual pasa todo con 200 (DMZ OrdersController.cs:191-227, `PostSAP` :196, que devuelve sus errores como texto, Curl.cs:130-146); solo un login fallido a `URL_SAP` en el constructor de `Curl` da 500 (:193 → :200-205) | PENDIENTE (P12) | G5-25, G1-09 |
| 02 | **Controlador.** Body null → 400 (LOC:141-142); registra el JSON completo `INFO` en setOrder.log (LOC:144); llama `SetPedido` (LOC:151); registra la respuesta (LOC:152); excepción → 200 con `e.ToString()` (LOC:154-157); éxito → `Ok(cuenta)` (LOC:160) | OC `SetOrder`:16-48: null → 400 (:20-23); excepción → 200 `"Error, " + e.Message` y log `[ORDER NEW ERROR]` (:37-46). **No registra el request entrante** | IGUAL (400) · PENDIENTE (cuerpo P12; bitácora P13, G5-32) | G1-02, G5-16, G5-20 |
| 03 | **Agrupar por SKU** fuera del try: suma cantidad (`int.Parse`) y descuento (`float.Parse`), conserva precio, precioEspecial y condición del primero (LOM:486-526, :535). Llave faltante o texto → excepción, sin fila | OM:1742 `AgruparCantidadPorSKU` (OM:87) | IGUAL · compuertas PENDIENTE (P1) | G4-01, G1-07 |
| 04 | **ToArray** fuera del try: 39 posiciones (LOM:340-440); guarda `forzarOrderOriginal` antes (LOM:536-538); `precioEspecial ≠ "0"` cambia `forzarOrder` a `'1'` (LOM:377-378). Llave faltante o teléfono null truenan fuera del try | OM:1746-1747 (`forzarOrderOriginal`, `ToArray` OM:198); convierte null en `''` | IGUAL-FUENTE-SAP · compuertas PENDIENTE (P1) | G1-06, G1-07, G1-25 |
| 05 | **Duplicado.** `PedidoExistente` si `obtenerIdVenta(incrementId) > 0` y (`forzarOrderOriginal == "0"` o PayPal) (LOM:541-542, :1602-1643). Solo se activa cuando una Venta ya lleva ese `IDEcommerce` | OM:1758-1765: SD36 por `PurchNoC`, que **nunca** encuentra una orden de crédito | PENDIENTE (T2c) | G5-01, G5-02, G1-06 |
| 06 | **Resto del preludio.** Openpay no aplica; `forzarOrder.ToString()` (LOM:557-565; null truena); `recogeSucursal`; `sDatosPedido[35] (Agente) = ''` (LOM:572): el `Agente` de Magento nunca llega a la solicitud | Igual en efecto (`@Agente` NULL en la fila) | IGUAL · G5-17 PENDIENTE (inalcanzable) | G5-17, G2-33 |
| 07 | **Staging: limpiar** `eCommerceDetPedidos` por `IdPedido 'CRED…'` sin `RefPedidoIntelisis` (LOM:582; SDP:155-162) | No existe (OM:527 "DetallePedido() ELIMINADO"; R7/09-26) | PENDIENTE (P9, recomendado N/A) | G5-21, G4-02 |
| 08 | **Staging: insertar** cada partida con precio > 0 y cantidad > 0 (LOM:584-601, :963-1079); `SqlException` tragada (LOM:1072-1075); `codigoPostal` null truena → `''` | No existe | PENDIENTE (P9) | G4-02, G5-22, G1-25, G1-08 |
| 09 | **TELEFONIA dentro del staging** (Region5/Region6 por CP y existencia; SDP:4, :9-153) | No existe | FALTA (P9/P10, diferida por Q17) | G4-03, G5-23 |
| 10 | **Guía.** Nombre en MAYÚSCULAS con Trim (LOM:603-605; null truena → `''`); `SaveGuide` SQLite `INSERT OR IGNORE`, resultado ignorado (LOM:606, :735-754) | OM:1793 `SaveGuideAsync` (OM:533-553, traga el error) | IGUAL (R5/09-26) | G5-04, G1-05 |
| 11 | **Rama de crédito**: `metodoPago == "omnipro_pago_credito"` exacto (LOM:31, :609); no crea documento de venta ni entrega (LOM:652-726) | OM:1791 `if (orderRequest.metodoPago == CREDIT_METHOD)`; sale en :1808-1813 | IGUAL | G1-01, G5-13 |
| 12 | **Lista de artículos** `"cantidad,sku"` sin filtro de precio (LOM:611-615); `costoEnvio` (texto) ≠ `"0"` y ≠ `""` agrega SEGU00001 (LOM:616-617) | OM:1795-1801; `costoEnvio > 0` decimal | IGUAL · IGUAL-FUENTE-SAP (G4-06) | G4-05, G4-06, G4-09 |
| 13 | **Número del último SMS** por `VTASDCodigoVerificacioneCommerce` con la cuenta cruda; error → `''` + log (LOM:619, :819-852) | OM:1803 → `ObtenerNumeroTablaSmsAsync` (OM:589-613); error solo a Console | IGUAL · log PENDIENTE (P13) | G3-03 |
| 14 | **Teléfono validado** `TOP 1 CONCAT(Lada,Telefono)` Movil validado más reciente, sin Trim; error → `''` (LOM:620, :786-817) | OM:1804 → `IsValidatedAsync` (OM:621-633) vía `A_GET_TelefonoValidado`; hoy con `Trim` (OM:626) | IGUAL-FUENTE-SAP (DU4) · R1 | G3-04, G3-05 |
| 15 | **Llamada a `ProductosCreditoWeb_SaveData`** con cuenta, uen (`storeId == "viu"`), incrementId, correo, total, condición, promotor, etc.; teléfono a validar = SMS si `Length > 0`, si no el validado (LOM:623-647) | OM:1806 → `ProcessCreditPaymentAsync` (OM:638-730) → `CrearSolicitudCreditoAsync` (OM:751-813) | IGUAL (E2) · G3-08 DIF → R1 | G2-04, G2-20, G2-22, G2-30, G2-32, G3-08 |
| 16 | **Respuesta**: `SetPedido` devuelve siempre `infoCliente["cuenta"]` (LOM:649); excepción dentro del try → `''` (LOM:728-732) | OM:1808-1813 → OC:27-35 `{BP, SalesDocument, Message, Resultado:"Concluido"}`; error → 200 `Error, …` | PENDIENTE (P12) | G1-24, G5-14, G5-16 |
| 17 | **Preludio de SaveData**: `uen`; condición cruda, `getCondicion` comentado (LCM:109-113); abre ServicioAndroid; no valida crédito activo, bloqueo, línea, NIP, plazo ni total (LCM:94-137) | uen OM:754-755; condición cruda OM:793; **valida y traduce la condición antes de las líneas** (OM:845-850) | IGUAL · G1-14 EQ-R (P2) | G1-14, G2-22 |
| 18 | **`checkCliente`**: `COUNT(cliente) FROM CTE` (SPC:37-51); error o null = no existe → `sin cuenta`, sin fila ni log (LCM:124, :255-258, :725-763) | OM:646-650 (E1): `CheckClientCreditAsync` (OM:732-745, ZB_DATOS_CLIENTE) + log `[CREDITO SIN CUENTA]` + `throw` | IGUAL-FUENTE-SAP · log PENDIENTE (P13) | G1-10, G1-11, G1-12 |
| 19 | **Saldo** (informativo): `decimal.Parse(total)` fuera del try; `checkSaldo` corre dos veces un SP que no devuelve nada → 0 → nunca frena (LCM:126-133, :766-802; SPC:80-122) | No se porta | N/A · G1-18 PENDIENTE · límite de crédito P17 | G1-15, G1-16, G1-17, G1-18 |
| 20 | **Datos del maestro** `GetInfo` TOP 1 de 19 columnas de CTE (SPC:53-78); `DBNull` → `''`; fecha NULL o sin fila → `err`, sin cabecera (LCM:137, :804-868, :246-252) | SCW `ObtenerMaestroAsync` (SCW:374-384, BP05MA) + `ArmarFila` (SCW:236-310); `Birthdt` vacío → `1900-01-02` (SCW:244, :555) | IGUAL-FUENTE-SAP (E4) · P5, P6, R4 | G1-19, G2-05, G2-10, G2-14 |
| 21 | **Partir teléfonos**: ladas de 2 dígitos {33, 55, 81}; el de envío va a particular y celular; el número a validar se parte igual; teléfono corto → `ArgumentOutOfRange` → `err` (LCM:139-148, :179-182, :187-188) | OM:652-657 (respaldos `'0'`) | IGUAL · corto PENDIENTE (P1 G-c) | G2-28, G2-29, G3-08, G3-09, G1-20 |
| 22 | **38 parámetros al SP** con el ancho de cada parámetro (LCM:150-188; SPD:92-159); un valor C# null no se manda (default NULL) | SCW `InsertarSolicitudAsync` (SCW:162-234): 57 parámetros con el ancho del SP, `@cliente` 10 | IGUAL (Q1, DU5) | G2-06 … G2-36, G3-06 |
| 23 | **Defaults del SP y DIMAS MX**: `@fecha = GETDATE()` (SPD:170); con `@origen = 'DIMAS MX'`, condición y artículo de `CREDICCondicionArt` (SPD:174-183) | SCW:38-39 (E3) · DIMAS MX no portado | IGUAL (E3) · DEPRECADO (P4-A recomendado) | G2-34, G2-03 |
| 24 | **Validación telefónica del SP**: `@ValidacionOrigen` (catálogo ⋈ CteTel), `@TelefonoValidado` (Movil validado más reciente, VARCHAR(10)), `@TelefonoAValidar` (último SMS por `Cliente`); IF de tres valores; prospecto `'P'` → 0 (SPD:185-221). Falla del linked server → `err`, sin cabecera | SCW `ConstruirContextoAsync` (SCW:386-406) + cálculo SCW:317-333; prospecto = `ZtipoCliente 'Prospecto'` (SCW:538-548); si no hay teléfono validado se salta las otras tres lecturas (SCW:393-396) | IGUAL-FUENTE-SAP (DU3, DU4) · G3-19/G3-20 R2 · P16 | G3-07 … G3-19 |
| 25 | **INSERT de 59 columnas y folio** `SCOPE_IDENTITY()`; `confirmado` 1, `ISNULL(@RedimirMonedero,0.00)`, sin transacción (SPD:223-348) | SCW:35-160 (E3), textualmente igual | IGUAL | G2-01, G2-31, G2-33, G2-34, G2-19 |
| 26 | **Leer el folio**: sin folio no hay líneas, promotor ni liberador; INSERT fallido → `err`, responde la cuenta (LCM:190-199, :243-252) | SCW `InsertAsync` (SCW:18-33); OM:660-662 lanza si `idSolicitud <= 0` | IGUAL · cuerpo PENDIENTE (P12) | G2-38, G2-39 |
| 27 | **Líneas** `SpVTASInsertArtSolCreditoLinea` por entrada; salta el SKU igual al anterior; SEGU00001 cantidad 1 y `float.Parse(costoEnvio)`; `Orden` sube solo al mandar; excepción → `err`, cabecera y líneas previas quedan (LCM:201, :869-919) | OM `InsertCreditArticlesAsync` (OM:827-995): INSERT directo con la conexión Android (OM:857-885, INSERT :871-873) | IGUAL · G4-12 FALTA (P10) | G4-05 … G4-14, G4-26, G4-27 |
| 28 | **TELEFONIA en el SP de líneas** (SPL:43-165) | No existe | FALTA (P10, Q17 diferida) | G4-15 … G4-19, G4-28 |
| 29 | **SEGU00001**: Abono 12, costo por `spVerCosto`, precio `@SeguCost FLOAT` (SPL:179-217) | OM:904-909 (Abono 12; precio decimal exacto; costo 0) | IGUAL (G4-20) · PENDIENTE (P8 c/d) | G4-09, G4-20, G4-29 |
| 30 | **Precio y Abono** de `PropreListaDFinal ⋈ VTASCCondicionesCredVtaLinea` por condición traducida y SKU, CEILING si hay descuento; sin fila → hueco en `Orden`; n filas → n líneas con el mismo `Orden` (SPL:219-263) | OM:916-975 con SD29 (E5: filtro `Articulo + OrgVtas + Condicion`, FLP:91-96); `FirstOrDefault` (OM:941-944); hueco (OM:946-950) | IGUAL (CEILING, hueco) · PENDIENTE (P7, P8 b) · G4-24 DIF (P2) | G4-21 … G4-25, G4-39 |
| 31 | **Costo** `spVerCosto` 96/MAVI/PESOS, NULL sin método de costeo (SVC:10-193) | `costoArticulo = 0m` (OM:902) | PENDIENTE (P8 c) | G4-29 … G4-37 |
| 32 | **Cupón del promotor** si `codigo_promotor.Length > 0` y las líneas salieron bien: `Elimina` (TOP 1 libre más reciente) + `NUEVO` siempre, en una llamada (LCM:203-206, :392-463; SCU:51-165) | OM:671-675 → `HandlePromoCodeAsync` (OM:1030-1172), con otra validación y otro orden | PENDIENTE (P3; el usuario lo dio por deprecado) | G5-06, G5-07, G5-08, G5-26, G5-27 |
| 33 | **Liberador en hilo de fondo** solo si la cuenta empieza con `C` (LCM:208-241): token, `POST {Cliente, Id, UEN}`, `idVenta > 0` → EN_ANALISIS con ese id, `0` → EN_ANALISIS 0, excepción → RECHAZADO; nunca AUTORIZADO (LLIB:40-101) | Bloque comentado OM:685-721 (no compila); `LiberateClientCredit` OM:1177-1189 | PENDIENTE (T1b, bloqueado) | G1-21, G1-22, G1-23, G5-09, G5-10 |
| 34 | **Aviso a Magento** `{entityId, status, cuenta, idSolicitud}` a `URL_DMZ + order/authorizationResult`, Bearer, 30 s, 3 intentos, log DEFINITIVO (LCM:221-237; LOM:1751-1833); el DMZ lo pasa a Magento (DMZ@c63c0ab:370-406) | `CallMagentoAuthorizationCallbackAsync` (OM:1194-1282) sin llamador, con llaves snake_case y handler que acepta cualquier certificado | PENDIENTE (T1a LISTO, T1b) | G5-11, G5-12 |
| 35 | **Fin de SaveData**: devuelve `OK`/`insuficiente`, que `SetPedido` descarta; Magento desactiva el quote y responde PROCESANDO (LCM:243; MCO:58-76) | OM:723 `return cuentaBp` | IGUAL · cuerpo PENDIENTE (P12) | G1-24, G5-14, G5-25 |
| 36 | **creditStatus**: cron de Magento cada 5 min (MPC:85-129); LAN lee `Venta` por `ID` con `Mov='Solicitud Credito'`, luego `Analisis Credito` CANCELADO, luego el último `Pedido` → AUTORIZADO/EN_ANALISIS/RECHAZADO; excepción → EN_ANALISIS (LOC:484-504; LOM:1867-1996) | No existe; DMZ `curl.Get` a `URL_INTELISIS` (DMZ OrdersController.cs:460-482, :467) | PENDIENTE (T2a, bloqueado) | G5-18 |
| 37 | **updateCreditOrderId** y reenvío: 3 UPDATE sin transacción (Venta y `eCommerceDetPedidos`), suma de filas o −1 (LOM:1998-2061); responde `{success:true, rowsUpdated}` (LOC:506-533); el reenvío de la orden real responde `PedidoExistente` (LOM:541-542) | No existe; DMZ `curl.Post` a `URL_INTELISIS` (DMZ OrdersController.cs:404-419, :411) | PENDIENTE (T2b, T2c) | G5-19, G5-24, G5-01 |

---

## 3. Todas las reglas

Una fila por regla. **Estado actual** después de E1-E5 (código del 2026-09-29 12:44); **qué falta** para cerrarla; **bloqueado por** = tarea de §6 o dueño. Estados: EQ, EQ-R (igual con riesgo o por decisión), DIF, FALTA, N/A, PENDIENTE. Evidencia completa por regla: [[MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP]] §3. Las filas marcadas **NUEVA 2026-09-30** salieron de la relectura de hoy y no están en la MATRIZ.

### 3.1 G1 — Elegibilidad

| Id | Regla (LAN) | Estado actual | Qué falta | Bloqueado por |
|---|---|---|---|---|
| G1-01 | Crédito solo con `metodoPago == 'omnipro_pago_credito'` exacto; sale antes de crear documento (LOM:31, :609, :649) | EQ | — | — |
| G1-02 | Body null → HTTP 400 (LOC:141-142) | EQ (OC:20-23) | — | — |
| G1-03 | `validateCredit` corría el mismo `SetPedido` y respondía `{status:'PROCESANDO', cuenta}` (LOC:455-482) | N/A: nadie la llama; el DMZ la tiene comentada (DMZ OrdersController.cs:366-402) | Avisar a Javier/Dev 2 (CSV fila 89) | Coordinación |
| G1-04 | Reproceso `getOrderInfoAndSet` / `ReSetPedido` (LOC:437-442; LOM:1688-1708) | FALTA | Conservar o retirar | P11 |
| G1-05 | Agrupación, `PedidoExistente`, staging y guía antes de la rama; falla de staging o guía → sin solicitud, `''` (LOM:535-542, :576-606, :728-732) | EQ-R (R5/09-26, R7/09-26) · sensibilidad PENDIENTE | Compuerta G-b solo si se revierte R5 | P1, P9 |
| G1-06 | `PedidoExistente` con el `forzarOrder` original (LOM:538-542) | EQ-R (R6/09-26; OM:1746) | SD36 nunca ve el crédito | T2c |
| G1-07 | Llaves de `infoCliente`, campos del artículo y `forzarOrder` obligatorios; texto en número → sin fila (LOM:406-423, :442-445, :494-496, :562) | PENDIENTE | Compuertas G-a/G-e | P1 |
| G1-08 | Sin artículos → sin solicitud (LOM:579, :588, :632) | PENDIENTE | G-a5 | P1 |
| G1-09 | Invitado (sin llave `cuenta`) → sin solicitud, `''` (LOM:619) | EQ-R (E1/DU6; OM:646-650) | Cuerpo de la respuesta | P12 |
| G1-10 | Cuenta vacía o null → `sin cuenta`, sin insert; `SetPedido` igual responde la cuenta (LCM:124, :255-258; SPC:39-50) | EQ-R (E1) | Log nuevo `[CREDITO SIN CUENTA]` (OM:648) | P13, P12 |
| G1-11 | El crédito no crea clientes ni prospectos (LCM:94-262; SPD:16) | EQ | — | — |
| G1-12 | La cuenta existe si el maestro tiene fila; un error cuenta como "no existe" (LCM:725-763; SPC:37-51) | EQ-R: ZB_DATOS_CLIENTE (OM:732-745) + BP05MA; una caída de SAP también da `sin cuenta` (OM:740-744) | — (igual que el catch vacío de LAN) | — |
| G1-13 | La cuenta se valida como la manda Magento (LOM:627) | EQ-R (DU2) | — (Magento manda el BP por configuración de su lado; MOM:719 no es bloqueo de ServicioSAP, DU2) | — |
| G1-14 | No valida crédito activo, bloqueo, línea, NIP, plazo ni total; la condición se toma sin validar (LCM:110-111, :124-137) | EQ-R | ServicioSAP valida la condición antes de las líneas (OM:845-850) | P2 |
| G1-15 | El saldo nunca frena: `checkSaldo` da 0 y se descarta (LCM:126-133, :766-802) | EQ | Choca con la decisión del 2026-09-11 "sí debe frenar" | P17 |
| G1-16 | `checkSaldo` corre el SP dos veces (LCM:772, :788, :790) | N/A | — | — |
| G1-17 | (Referencia) crédito disponible = max(0, CRMCantidad − saldo) (SPC:84-121) | N/A | — | — |
| G1-18 | Total no numérico o null → sin solicitud (LCM:117-119, :126) | PENDIENTE (inalcanzable: Magento manda número) | G-e | P1 |
| G1-19 | Datos personales del maestro; sin fila, fecha NULL o error → `err`, sin solicitud (LCM:137, :804-868, :835, :246-252) | EQ-R (Q11: 1900-01-02, SCW:244) · sensibilidad PENDIENTE | G-d; ramas muertas | P1, R4 |
| G1-20 | Teléfono de envío y número a validar con lada; si no, `err` (LCM:113, :139-148) | PENDIENTE (alcanzable con un teléfono muy corto) | G-c | P1 |
| G1-21 | Prospecto (`P`): `ValidacionTelefono` 0 y sin liberador (SPD:216; LCM:208) | EQ-R: prospecto = `ZtipoCliente 'Prospecto'` (SCW:538-548) | Confirmar el mapeo (G3-21) | P16 |
| G1-22 | Cuenta `C`: después de cabecera, líneas y cupón, liberador + aviso en segundo plano (LCM:199-241) | PENDIENTE | T1a (listo), T1b | T1b (Valentín) |
| G1-23 | Cuenta existente de otro prefijo: solicitud y líneas, sin liberador (LCM:208) | EQ-R (DU2) | La exclusión de prospectos de T1b puede ir más allá de LAN | T1b, P16 |
| G1-24 | Magento recibe `PedidoExistente`, texto de excepción, `''` o la cuenta; éxito y falla no se distinguen (LOM:541-542, :649, :728-732) | EQ-R (R4/09-26) | Contrato | P12 |
| G1-25 | NUEVA 2026-09-29. Llave presente con valor null (codigoPostal, entityId, incrementId, los tres nombres, telefono, telefonoClienteMavi) aborta antes de escribir (LOM:599, :603-605, :1006, :1027, :414, :423, :444-445) | PENDIENTE | G-a | P1 |

### 3.2 G2 — Cabecera

| Id | Regla (LAN) | Estado actual | Qué falta | Bloqueado por |
|---|---|---|---|---|
| G2-01 | Un solo INSERT a `CRED_SOLICITUD_WEB_DATOS_TEMP` (Android); folio = `SCOPE_IDENTITY`; sin transacción con las líneas (SPD:223-348) | EQ (E3; SCW:38-160 = SPD:223-344) | — | — |
| G2-02 | Ramas `Update` e `InsertReferencia` del SP fuera de este flujo (PLAN §17, :1255-1270) | N/A (usuario, 2026-09-24) | Credilana y M-13 de Dev 3 las usan (§7, C12) | — |
| G2-03 | DIMAS MX: la cabecera toma `Condicion` y `Articulo` de `CREDICCondicionArt` (SPD:174-183) | PENDIENTE (alcanzable por DU7) | Cerrar como deprecado | P4 |
| G2-04 | `Origen` = `infoCliente.origen` o `PRODUCTOS MX` (LOM:646) | EQ (E2; ICR:74, OM:798) · BORDE null explícito | — | — |
| G2-05 | Sin maestro no hay solicitud (LCM:124, :152, :246-258) | EQ-R (E1) | Guarda explícita | R4 |
| G2-06 | `apellidoP` del maestro (NameLast), 30 (LCM:152, :832) | EQ-R (SCW:240) | MAYÚSCULAS; rama muerta | P5, R4 |
| G2-07 | `apellidoM` del maestro (NameLst2), 30 (LCM:153, :833) | EQ-R (SCW:241) | Igual que G2-06 | P5, R4 |
| G2-08 | `nombre` = todos los nombres de pila (`PersonalNombres`), 25 (LCM:154, :834) | EQ-R (solo NameFirst) | `Namemiddle`; MAYÚSCULAS | P6, P5 |
| G2-09 | `nombre2` siempre NULL (LCM:155; SPD:97) | EQ | — | — |
| G2-10 | `fechaNacimiento` del maestro; NULL → `err` (LCM:835, :156) | EQ-R (Q11) · sensibilidad PENDIENTE | G-d; formato `/Date(-62135596800000)/` (G2-40) | P1 |
| G2-11 | `rfc` del maestro (Stcd1), 13 (LCM:157, :836) | EQ-R (SCW:245) | MAYÚSCULAS | P5 |
| G2-12 | `sexo` del maestro, 9 por el parámetro (LCM:158, :837; SPD:100) | EQ-R (E4; SexoLegado SCW:567-589, `''` → `''`) | Capitalización (§7, C5) | P5 |
| G2-13 | `estadoCivil` del maestro; `vive_en_calidad` NULL (LCM:169, :847; SPD:113-114) | EQ-R (E4; EstadoCivilLegado SCW:591-606) | `Marst` fijo al crear el BP | P14 |
| G2-14 | Un valor null del maestro se guarda `''` (LCM:831-849) | EQ-R | Limpieza | R4 |
| G2-15 | `email` del checkout (null → NULL) (LOM:630; LCM:159) | EQ (E2; OM:779) | — | — |
| G2-16 | Dirección del checkout, cortada a los anchos del SP (LOM:407-413; LCM:160-168) | EQ-R (E2) | `CodigoPostal ?? ""` (OM:785) | P1 (A4) |
| G2-17 | `delegacion` y `poblacion` = municipio (25 y 30) (LCM:165-166) | EQ (E2) | — | — |
| G2-18 | `entreCalles` del checkout si `Length > 0`; si no, del maestro; null explícito truena (LOM:641; LCM:163) | EQ-R (Magento manda `?? ''`) | MAYÚSCULAS del valor del BP | P5 |
| G2-19 | `articulo` `''` en la cabecera (LCM:170) | EQ (OM:791) | DIMAS MX | P4 |
| G2-20 | UEN 2 si `storeId == 'viu'` exacto; si no, 1 (LOM:628) | EQ (E2; OM:755) | — | — |
| G2-21 | `sucursal` 505 VIU / 504 MA (LCM:175) | EQ (OM:796) | — | — |
| G2-22 | `condicion` = la del primer SKU agrupado, sin traducir ni validar (LOM:632; LCM:172) | EQ (E2; null → NULL) | Q5 contra DU5 | P2 |
| G2-23 | Sin artículos → sin solicitud (lado cabecera) (LOM:632) | PENDIENTE | G-a5 | P1 |
| G2-24 | `cliente` = `CTE.Cliente` del maestro, 9 (LCM:173, :831; SPD:130) | EQ-R (Size 10 por DU2) | Búsquedas con `maestro.Partner` | R3 |
| G2-25 | `utmSource` tal cual; null → NULL; 100 (LOM:637; LCM:174) | EQ (E2) | — | — |
| G2-26 | `idMagento` = incrementId (12); `ClienteMagento` NULL (LOM:629; LCM:177) | EQ | `IdMagento ?? "0"` (OM:799) | P1 (A5) |
| G2-27 | `MetodoEnvio` cortado a 12 (`tablerate_be`) (LOM:424; SPD:51, :147) | EQ (Q1) | — | — |
| G2-28 | Teléfonos particular y celular = el de envío partido en lada de 2 dígitos (33/55/81) o de 3 (LOM:414; LCM:139-143, :179-182) | EQ | — | — |
| G2-29 | Teléfono vacío o corto → `err`, sin fila (LCM:141-143, :246-252) | PENDIENTE | G-c | P1 |
| G2-30 | `SucursalDestino` del pedido (int, 0 si falta) (LOM:638; LCM:183) | EQ | — | — |
| G2-31 | `RedimirMonedero` solo se registra, con `ISNULL(…,0.00)` (LCM:184; SPD:336) | EQ (E3) | — | — |
| G2-32 | `OrigenIdMagento` = valor, o `''` si falta la llave (NULL con null explícito) (LOM:644) | EQ · BORDE null explícito (OM:807) | — | — |
| G2-33 | Lo que LAN no manda queda NULL (defaults del SP); `estatus` 0 (SPD:97-159) | EQ (20 NULL, CAMBIOS §4.3) | — | — |
| G2-34 | `fecha` = `GETDATE()` en SQL; `confirmado` = 1 (SPD:162, :170, :326-327) | EQ (E3/DU8) | — | — |
| G2-35 | `total` no se guarda (LCM:126-133) | EQ | — | — |
| G2-36 | Cada valor se corta al ancho del parámetro del SP (SPD:92-159) | EQ-R (Q1; `@cliente` 10) | — | — |
| G2-37 | No se valida el formato de ningún campo (SPD:223-344) | EQ | — | — |
| G2-38 | Sin folio: sin líneas, promotor ni liberador; LAN responde la cuenta (SPD:346-348; LCM:190-243) | EQ-R | Cuerpo | P12 |
| G2-39 | INSERT fallido: sin líneas ni cupón, `err` en el log Credit, responde la cuenta (LCM:190, :246-252; LOM:649) | EQ-R (200 `Error, …`) | Cuerpo | P12 |
| **G2-40** | **NUEVA 2026-09-30.** El default `1900-01-02` de Q11 aplica solo si `Birthdt` llega vacío. Si BP05MA manda la fecha vacía como `/Date(-62135596800000)/`, `FechaSap` la convierte en `0001-01-01` (SCW:244, :613-635) | PENDIENTE | Captura BP05MA de un BP sin `Birthdt`; si llega así, tratar ese valor como vacío (cambio en `FechaSap`, requiere visto bueno §1.9b) | V2 paso b), P1 (G-d) |

### 3.3 G3 — Validación telefónica

| Id | Regla (LAN) | Estado actual | Qué falta | Bloqueado por |
|---|---|---|---|---|
| G3-01 | El alta no manda SMS ni valida NIP; solo lee (LOM:609-650) | EQ | — | — |
| G3-02 | Las filas de SMS se crean antes del checkout (`getSms`, `SendSmsNewNumber`) (LCM:21-48, :1991-2033) | EQ-R | El DMZ aún manda `getSms`/`validateSms` a `URL_INTELISIS` (DMZ CreditController.cs:76, :107) | DMZ / Dev |
| G3-03 | Número del último SMS (C#, `IdRegistro IN … ORDER BY Id DESC`) (LOM:819-852) | EQ (OM:589-613) | LAN registraba el error en archivo (LOM:849) | P13 |
| G3-04 | Teléfono validado (C#): el móvil validado más reciente de CteTel (LOM:786-817) | EQ-R (DU4) | Trim en OM:626 | R1 |
| G3-05 | `isValidated` = validado == SMS (valor muerto; el SP lo pisa) (LOM:621) | N/A | — | — |
| G3-06 | `ValidacionTelefono` C# por `IsInTableStd` (muerto; el SP lo pisa) (LCM:185, :1967-1989) | N/A | — | — |
| G3-07 | El SP siempre recalcula `ValidacionTelefono` (SPD:210-221) | EQ | — | — |
| G3-08 | Número a validar: SMS si `Length > 0`, si no el validado, si no el teléfono limpio (LOM:642; LCM:145) | DIF (`IsNullOrWhiteSpace` + Trim, OM:626, :654) | Cambio de 2 líneas | R1 |
| G3-09 | `LadaValidar` y `TelefonoValidar`; corto o no numérico → `err` (INT en el SP) (LCM:145-148, :187-188; SPD:155-156) | PENDIENTE | G-c/A3 | P1 |
| G3-10 | `ValidacionOrigen` con el catálogo `ORIGEN VALIDACION NUMERO CTE` ⋈ CteTel (SPD:185-191) | EQ-R (DU3, 23 valores) | Qué `ZappOrig` escribirán los BP de e-commerce (sin definir, PLAN:1144-1150) | Negocio / datos SAP |
| G3-11 | `TelefonoValidado` = móvil validado más reciente, VARCHAR(10) (SPD:193-202) | EQ-R (DU4; regla efectiva en G3-22) | — | — |
| G3-12 | `TelefonoAValidar` = último SMS por `Cliente` (SPD:204-208) | EQ (SCW:335-372) | Log nuevo SCW:368 | P13 |
| G3-13 | IF de tres valores (NULL → UNKNOWN → ELSE) (SPD:4, :210-221) | EQ | — | — |
| G3-14 | Sin fila de SMS → UNKNOWN → 0; `''` → 1 (SPD:204-221) | EQ | — | — |
| G3-15 | Un prospecto nunca va a validación (SPD:216) | EQ-R | — | P16 |
| G3-16 | Si una fuente falla: `err`, sin cabecera, LAN responde la cuenta (SPD:187-198; LCM:246-252) | DIF solo en el cuerpo: sin fila en los dos (R2-V por código) | Contrato | P12 |
| G3-17 | La validación no bloquea ni modifica teléfonos | EQ | — | — |
| G3-18 | El SP consulta con `CTE.Cliente` del maestro (LCM:173; SPD:130, :189, :199, :207) | EQ-R (DU2) | Usar `maestro.Partner` | R3 |
| G3-19 | NUEVA 2026-09-29. Si una fuente no encuentra nada, el SP recibe NULL y **sí** inserta (SPD:186-221) | PENDIENTE (EQ en código: las tres lecturas dan NULL, §6.3.1 R2; se cierra EQ con R2-V) | Captura R2-V | R2-V |
| **G3-20** | **NUEVA 2026-09-30.** El SP hace **siempre** las tres lecturas (origen, validado, SMS) (SPD:186-208). ServicioSAP se salta CteTelSet, catálogo y SMS cuando no hay teléfono validado (SCW:393-396). Mismo valor si las lecturas salen bien; distinto solo si una falla (LAN: sin fila; ServicioSAP: fila) | DIF (solo en error) | Registrar como diferencia o quitar el `return` temprano | R2 (sub-decisión R2-b) |
| **G3-21** | **NUEVA 2026-09-30.** Prospecto = primer carácter de `@cliente` `'P'` (SPD:216). Con DU2 la cuenta es numérica; ServicioSAP usa `To_Cte.ZtipoCliente == 'Prospecto'` sin distinguir mayúsculas (SCW:538-548, :552). Nadie lo registró como decisión; también define el disparo de T1b | EQ-R por equivalencia SAP (sin registro) | Confirmación del usuario | P16 |
| **G3-22** | **NUEVA 2026-09-30.** Regla efectiva de `A_GET_TelefonoValidado`: `max()` sobre **todos** los teléfonos de CteTelSet (cualquier tipo, validado o no), por `(Zfecha, ZfechaCap, ZidcteTel)` como cadenas; devuelve ese y su `Zvaltel` (businesspartner-dev `A_GET_TelefonoValidado.py:5-36`); ServicioSAP da null si ese no está validado (SCW:514-523). El SP daba el móvil validado más reciente (SPD:194-202). Un `Zfecha` null se vuelve `'00000000'` y gana el `max()` (`AS_GET_ZQBP_EditarCliente_CteTel.py:60-62`) | EQ-R por DU4 (aceptado) | Solo documentar | — |
| **G3-23** | **NUEVA 2026-09-30.** El SP comparaba `CONCAT(Lada,Telefono)` contra el `Telefono` crudo de la tabla SMS. ServicioSAP compara `ZtelCte` (puede traer `+52`, CAP:55) contra el SMS, los dos cortados a 10 (OM:626, SCW:391) | PENDIENTE (sin evidencia del formato) | Captura de un BP con `ZtelCte` con prefijo | V2 |

### 3.4 G4 — Líneas

| Id | Regla (LAN) | Estado actual | Qué falta | Bloqueado por |
|---|---|---|---|---|
| G4-01 | Agrupar por SKU (LOM:486-526, :535) | EQ (OM:1742) | — | — |
| G4-02 | El staging `eCommerceDetPedidos` también corre para crédito (LOM:568-601, :963-1079) | FALTA (contradice G5-21 a G5-23 N/A) | Confirmar R7/09-26 | P9 |
| G4-03 | Sustitución TELEFONIA dentro del staging (SDP:12-146) | FALTA | — | P9, P10 |
| G4-04 | Cadenas del staging separadas por comas (LOM:948-961) | N/A | — | — |
| G4-05 | Cada SKU es una línea `cantidad,SKU`; no se usan los precios de Magento (LOM:611-615; LCM:893) | EQ | — | — |
| G4-06 | SEGU00001 solo si `costoEnvio` (texto) ≠ `'0'` y ≠ `''` (LOM:616-617) | EQ-R (decimal > 0, OM:1800; Q22 recomienda cerrar) | — | — |
| G4-07 | Líneas a `VTASdArtCreditoWeb` (Android), una fila por línea (LCM:869-914; SPL:208, :243) | EQ-R (INSERT directo OM:871-873) | Comprobar el permiso INSERT de `usrintranet` en V2 paso 0 (comprobación, no bloqueo: DU1) | — |
| G4-08 | Se salta un SKU igual al anterior (LCM:876, :895-897) | EQ | — | — |
| G4-09 | SEGU00001: cantidad 1, precio `float.Parse` (precisión simple) (LCM:899-908) | PENDIENTE | Tipo de la columna `precio` | P8 (d) |
| G4-10 | `Orden` 1, 2, 3… con huecos (LCM:875, :911, :915) | EQ | — | — |
| G4-11 | Todas las líneas con la condición de la cabecera (LCM:910; SPL:31, :261) | EQ | — | — |
| G4-12 | El CP solo decide la región; un CP NULL hace fallar cada línea (LOM:639; LCM:912; SPL:34) | FALTA | — | P10 (Q17) |
| G4-13 | Sin transacción: una línea fallida deja escrituras parciales, sin promotor ni liberador; responde la cuenta (LCM:869-919, :246-252) | EQ-R (se conserva el catch, PLAN:2093-2099) | — | — |
| G4-14 | Líneas solo si hay folio (LCM:199-201) | EQ | — | — |
| G4-15 | Sustitución de SKU por región (familia TELEFONIA, par Region5/Region6) (SPL:43-165) | FALTA | Q17 diferida por el negocio (2026-09-26) | P10 |
| G4-16 | CP activo: R5 → R6 si R6 tiene existencia (SPL:85-125) | FALTA | — | P10 |
| G4-17 | CP inactivo o vacío: R6 → R5 si R5 tiene existencia (SPL:127-159) | FALTA | — | P10 |
| G4-18 | Existencia global de e-commerce, no por centro (SPL:98-118, :135-155) | FALTA | — | P10 |
| G4-19 | Casos borde del par (artRegion NULL, error 512) son defectos que no se copian (SPL:62-93, :98-146) | FALTA (por recomendación) | — | P10 |
| G4-20 | SEGU00001: cantidad 1, precio del envío, Abono 12 (SPL:179-217) | EQ | — | — |
| G4-21 | Precio y Abono de la lista final por condición traducida y SKU, sin filtro de UEN (SPL:243-262) | PENDIENTE. E5 filtra SD29 por `Articulo + OrgVtas + Condicion` con el `$filter` codificado (FLP:82-135, OM:997-1025); sin probar contra SAP. La fuente SD29 **ya está decidida** (usuario 2026-09-11) | Captura SD29 y elección de la fila | P7, P8 (b) |
| G4-22 | Descuento de categoría con CEILING (SPL:248-256) | EQ | — | — |
| G4-23 | Sin precio no se inserta la línea y queda hueco en `Orden` (SPL:243-262) | EQ | — | — |
| G4-24 | Condición sin equivalente: 0 líneas de artículo, pero SEGU00001, cupón y liberador sí (SPL:179-262; LCM:203-241) | DIF (hoy lanza antes del ciclo, OM:847-850) | Q5 contra DU5 | P2 |
| G4-25 | Varias filas de precio → varias líneas con el mismo `Orden` (`INSERT…SELECT` sin TOP) (SPL:243-262) | PENDIENTE (`FirstOrDefault`, OM:941-944) | Historial LAN | P7, P8 (b) |
| G4-26 | Cantidad agrupada; precio unitario (LCM:899-908) | EQ | — | — |
| G4-27 | `IdArtCreditoWeb` = folio (LCM:898) | EQ | — | — |
| G4-28 | `articulo` = SKU final o SEGU00001, VARCHAR(20) (SPL:212, :247) | EQ-R (Size 20) | Sustitución TELEFONIA | P10 |
| G4-29 | `costo` por `spVerCosto` (sucursal 96, MAVI, PESOS) o NULL (SPL:187-241; SVC:10-193) | PENDIENTE (hoy 0, OM:902) | — | P8 (c) |
| G4-30 | Gancho `xpVerCosto` dentro de `spVerCosto` (SVC:63-70) | PENDIENTE | — | P8 (c) |
| G4-31 | Artículos SERVICIO o JUEGO usan `SugerirCostoArtServicio` (SVC:73-88) | PENDIENTE | — | P8 (c) |
| G4-32 | Nunca usa proveedor ni subcuenta (SVC:64-66) | N/A | — | — |
| G4-33 | Sin método de costeo → `costo` NULL (SVC:72, :120, :191) | PENDIENTE | — | P8 (c) |
| G4-34 | Base: Art y ArtCosto de la sucursal 96 (SVC:150-163) | PENDIENTE | — | P8 (c) |
| G4-35 | Desglose del precio con impuesto incluido (SVC:62, :165-171) | PENDIENTE | — | P8 (c) |
| G4-36 | Fórmula según el método de costeo (SVC:172-179) | PENDIENTE | — | P8 (c) |
| G4-37 | Moneda, factor de unidad y redondeo (SVC:180-192) | PENDIENTE | — | P8 (c) |
| G4-38 | No hay condición por artículo (SPD:176-182; LCM:910) | EQ | — | — |
| G4-39 | Ni el precio de Magento ni la existencia se validan en crédito (LOM:723-726) | EQ | — | — |
| **G4-40** | **NUEVA 2026-09-30.** LAN publicaba `credit_price_5_dif`, así que Magento puede ofrecer `05 M MA P DIF` / `05 M VIU P DIF`. El catálogo de respaldo solo tiene `05 … P INM` (PCC:40-43). Si SIGMavi tampoco la resuelve, `GetCondicionAsync` da `''` y hoy la orden queda con cabecera sin líneas (`Concluido`) | PENDIENTE (PLAN:2197-2203) | ¿Se vende a crédito web? ¿Código SD29? | P18 (negocio) |

### 3.5 G5 — Posterior al alta

| Id | Regla (LAN) | Estado actual | Qué falta | Bloqueado por |
|---|---|---|---|---|
| G5-01 | La idempotencia usa el `forzarOrder` original (LOM:538-542, :1602-1643) | EQ-R (R6/09-26) | SD36 nunca ve el crédito | T2c |
| G5-02 | Los reenvíos crean otra solicitud hasta que existe la venta (SPD:172-223; LCM:208-240) | PENDIENTE | — | T2c, T1b |
| G5-03 | Reproceso desde setOrder.log (LOM:1688-1710; LOC:436-443) | FALTA (OC no registra el request) | — | P11 |
| G5-04 | La guía se guarda una vez por orden; si falla, sin solicitud y `''` (LOM:603-606, :735-754) | EQ-R (R5/09-26) · sensibilidad PENDIENTE | El Trim del nombre completo (OM:415, PLAN:1504) no tiene tarea: se revisa con P1 | P1 (G-b) |
| G5-05 | `getGuide` responde 404 o 500 (LOC:163-183) | EQ-R (otro data.db, Web.config:59) | — | — |
| G5-06 | Promotor `Elimina` si hay código y las líneas salieron bien (LCM:199-206, :392-463) | EQ | Alcance (cupones deprecados, §4.4) | P3 |
| G5-07 | Cupón usado: TOP 1 libre más reciente, sin validación (SCU:115-128) | DIF (DU9: misma tabla) | Cupones deprecados por el usuario (§4.4): alcance en P3 | P3 |
| G5-08 | Siempre se regenera una fila de cupón nueva (SCU:130-164) | DIF | Cupones deprecados (§4.4): alcance en P3 | P3 |
| G5-09 | Liberador solo para cuenta `C`, con folio y líneas correctas (LCM:199-241) | PENDIENTE | — | T1b |
| G5-10 | Resultado del liberador: EN_ANALISIS o RECHAZADO, nunca AUTORIZADO (LLIB:40-101) | PENDIENTE | Logs a archivo (T1a), disparo (T1b) | T1a, T1b |
| G5-11 | Contenido del aviso al DMZ: `{entityId, status, cuenta, idSolicitud}` (LCM:219-237; LOM:1803) | PENDIENTE (hoy snake_case, OM:1251-1257) | — | T1a |
| G5-12 | Transporte del aviso: handler que acepta cualquier certificado creado pero no usado; 3 intentos; 30 s (LOM:1751-1833) | PENDIENTE | — | T1a |
| G5-13 | El crédito termina en la solicitud (LOM:649) | EQ | — | — |
| G5-14 | Respuesta de `setOrder` (LOM:624-649, :728-732) | EQ-R (R4/09-26) | — | P12 |
| G5-15 | `validateCredit` (LOC:455-482) | N/A (nadie la llama) | Avisar a Dev 2 (CSV fila 89) | Coordinación |
| G5-16 | Los errores responden `''` o el texto de la excepción (LOM:728-732; LOC:154-157) | EQ-R (R4/09-26). Bug B8: `Logger.cs:26-31` crea el directorio fuera del try | — | P12 |
| G5-17 | Sin `forzarOrder`, LAN truena (sin fila) (LOM:562) | PENDIENTE (inalcanzable: Magento manda `'0'`) | G-a2 | P1 |
| G5-18 | `creditStatus`: AUTORIZADO / EN_ANALISIS / RECHAZADO desde la cadena `Venta` de Intelisis (LOC:484-504; LOM:1867-1996) | PENDIENTE | Dónde vive la decisión; plan de Dev 2 con SD36 (§7, C8) | T2a |
| G5-19 | `updateCreditOrderId` renombra `CRED…` al increment real en `Venta` y `eCommerceDetPedidos`; responde `{success:true, rowsUpdated}` (LOC:506-533; LOM:1998-2061) | PENDIENTE | Qué renombrar en la era SAP | T2b |
| G5-20 | La bitácora de LAN es el máximo que se registra (regla del usuario) (LOC:144, :152; LCM:205, :250; LOM:730) | DIF: `[CREDITO SIN CUENTA]` (OM:648), `[CREDITO SD29 FILTRO]` (OM:1021), SCW:368 | — | P13 |
| G5-21 | Staging: limpieza (LOM:582; SDP:155-162) | N/A por R7/09-26 (contradice G4-02) | — | P9 |
| G5-22 | Staging: insert (LOM:584-601; SDP:12-154) | N/A por R7/09-26 | — | P9 |
| G5-23 | Sustitución de región dentro del staging (SDP:16-146) | N/A por R7/09-26 | — | P9 |
| G5-24 | NUEVA 2026-09-29. Después de autorizar, Magento reenvía la orden real a `setOrder`; LAN responde `PedidoExistente` porque `updateCreditOrderId` ya renombró `Venta.IdEcommerce` (MPC:178, :254-287; LOM:2007-2017, :538-542) | PENDIENTE | T2c-A o T2c-B | T2c |
| G5-25 | NUEVA 2026-09-29. El DMZ de la era LAN daba códigos HTTP propios al crédito (400 `Cuenta invalida`, 409, 422, 500, 200) (DMZ@c63c0ab OrdersController.cs:116-195). **Corrección 2026-09-30:** el 422 de `sin cuenta` nunca se alcanzó en crédito, porque `SetPedido` descarta el `sin cuenta` y responde la cuenta (LCM:255-258; LOM:624, :649) | DIF | Contrato | P12 |
| G5-26 | NUEVA 2026-09-29. `codigo_promotor` presente y null → LAN falla después de cabecera y líneas, sin cupón ni liberador; un código de solo espacios sí corre `Elimina` (LOM:633; LCM:203) | EQ-R | Aceptar la diferencia en el disparo | U2 (T1b) |
| G5-27 | NUEVA 2026-09-29. Quema y regeneración en una sola llamada del SP. **Corrección 2026-09-30 de anchos:** `@Codigo` es VARCHAR(30) en la quema (SCU:52, :118-128); solo la fila regenerada va a 10, porque `Elimina` pasa `@Agente = @codigo` y `@Agente` es VARCHAR(10) (SCU:54, :130-159); `@IdEcommerce` VARCHAR(20) (SCU:53) | DIF | Cupones deprecados (§4.4): alcance en P3 | P3 |
| **G5-28** | **NUEVA 2026-09-30.** El `idSolicitud` del aviso mezcla dos tipos de id: con `idVenta = 0` LAN manda el `IdSolicitud` de Android (LCM:210-226; LLIB:88-93), Magento lo guarda en `id_solicitud` (MCO:135-142) y `creditStatus` lo lee como `Venta.ID` de Intelisis con `Mov='Solicitud Credito'` (LOM:1876-1892): normalmente no hay fila y la orden se queda EN_ANALISIS para siempre (MPC:110-116). Con `idVenta > 0` depende de qué `Venta.ID` devuelve el liberador | PENDIENTE | Pregunta a Valentín (Q-T1-3) y que T2a use el mismo tipo de id que el aviso | T1b, T2a |
| **G5-29** | **NUEVA 2026-09-30.** `updateCreditOrderId` atrapa su propia excepción y devuelve −1 (LOM:2056-2060); el controlador responde igual `{success:true, rowsUpdated:-1}` (LOC:521-526), así que un renombre fallido parece éxito y el reenvío crea otra solicitud | PENDIENTE | Replicar (paridad) o responder error | T2b |
| **G5-30** | **NUEVA 2026-09-30.** `updateCreditOrderId` no renombra `CRED_SOLICITUD_WEB_DATOS_TEMP.idMagento` (SPD:268, :329), el `IdEcommerce` del cupón quemado (SCU:126-128) ni la guía SQLite (LOM:745). El reenvío responde `PedidoExistente` antes de `SaveGuide` (LOM:541-542, :606): nunca se guarda guía con el increment real y `getGuide(real)` da null (LOM:756-784) | PENDIENTE | Decidir destinos de T2b (Q-T2-5) | T2b |
| **G5-31** | **NUEVA 2026-09-30.** El comentario de Magento dice que `GetPendingCreditOrders` reintentará el aviso (MPC:293-299). Ese método no existe en LAN, ServicioSAP ni DMZ (grep 2026-09-30): no hay reintento | PENDIENTE | T2b/T2c no deben contar con un reintento | T2b, T2c |
| **G5-32** | **NUEVA 2026-09-30.** LAN registraba en setOrder.log cada request y respuesta de `setOrder` (LOC:144, :152) y también `creditStatus` y `updateCreditOrderId` (LOC:484-533). OC solo registra errores (OC:45); sin el request registrado, el reproceso tampoco es posible | FALTA | Decidir si se agregan los INFO de LAN (con P13 y P11) | P13, P11 |

---

## 4. Decisiones del usuario, hechos nuevos y lo deprecado

### 4.1 Decisiones DU1-DU10 (usuario, 2026-09-28/29)

Fuente: CAMBIOS §2 (CAMBIOS:99-108, filas D1-D10) y MATRIZ §0.4 (MATRIZ:66-75). **No se vuelven a abrir.**

| Id | Decisión | Qué implica | Reglas | Estado |
|---|---|---|---|---|
| **DU1** | Las conexiones SQL del `Web.config` (`MAVICBOSANDROID`, `ADMINDOC`, login `usrintranet`) son correctas; `Conexion.dll` es para S/4HANA; los valores de ambiente son de Dev y **nunca son bloqueo** | No se marcan credenciales, URLs ni cadenas como riesgo. Abierto: SIGMavi también sale del DLL (ConexionSQL.cs:19, :79) | G2-01, G4-07, G5-10, G5-12 | Vigente; lo abierto es P15 |
| **DU2** | Magento manda en `infoCliente.cuenta` solo el BP numérico; las cuentas `C…` nunca llegan a ServicioSAP. Una regla de LAN con prefijo `C` se lee como "BP existente" | **No se mapean cuentas `C…`.** MOM:719 es configuración de Magento | G1-13, G1-22, G1-23, G2-24, G3-18, G5-09 | Vigente (precisa R1/09-26) |
| **DU3** | Catálogo AWS `ORIGEN VALIDACION NUMERO CTE` dado de alta con 23 valores (`MappingMetods/CatalogoConfiguracion.csv`) | Cierra Q3 | G3-10 | Vigente; el `ZappOrig` de e-commerce sigue sin definir |
| **DU4** | `A_GET_TelefonoValidado` devuelve el teléfono validado más reciente: aceptado | Cierra el Q4 residual. Regla efectiva exacta en G3-22 | G3-04, G3-11 | Vigente |
| **DU5** | **Paridad de valores:** cada columna guarda exactamente lo que guardaban LAN + SP (NULL, `''`, default del SP, literal, `ISNULL`, `GETDATE`), con el equivalente SAP como fuente | Criterio de P1, P2 y P8 (c) | Todo G2; G1-25; G4-33 | Vigente |
| **DU6** | Crédito solo para un BP existente; cuenta vacía o inexistente → `sin cuenta`, sin fila; sin rutas de cliente nuevo ni invitado | Reemplaza R2/09-26 | G1-09, G1-10, G1-12, G2-05 | Hecho (E1) |
| **DU7** | `origen` como LAN/SP: `infoCliente.origen` si viene; si no, `PRODUCTOS MX` | Cierra Q15; DIMAS MX se vuelve alcanzable | G2-03, G2-04 | Hecho (E2) |
| **DU8** | `fecha` se arma en SQL (`DECLARE @fecha; GETDATE()`); el INSERT es textualmente el del SP (literal 1, `ISNULL(@RedimirMonedero,0.00)`) | Reemplaza "fecha = DateTime.Now" (PLAN:708) | G2-01, G2-31, G2-34 | Hecho (E3) |
| **DU9** | `SIGMavi.VentasCupones` = `IntelisisTmp.VTASCVentaCupon` renombrada; solo cambian las reglas | Gana sobre DEV3 ("VentaCupon") | G5-06, G5-07, G5-08 | Vigente |
| **DU10** | `Marst` según SAP GUI: 1 Soltero, 2 Casado, 3 Viudo, 4 Divorciado, 5 Separado, 6 Pareja de hecho. `Gender` según `BusinessPartnerMethods.MapGender` (1 masculino, 2 femenino, otro 3; vacío → 1 en el alta; BPM:777-797). **No volver a preguntar** | Cierra Q14 | G2-12, G2-13 | Hecho (E4) |

### 4.2 Decisiones anteriores que siguen vigentes

| Cuándo / quién | Decisión | Fuente | Estado hoy |
|---|---|---|---|
| Usuario, 2026-09-11 | El precio del crédito sale de SD29 por SKU ("la fuente correcta ahora que el SP desaparece"), filtrado por `OrgVtas`; Abono de SD29 | FLUJO_CREDITO:214-222, :347; GUIA:281 (§1.9e) | **Vigente**: cierra P8 (a) |
| Usuario/negocio, 2026-09-11 | La solicitud nace al enviar la orden; el liberador solo notifica. Abierto: si además se crea un documento SAP | FLUJO_CREDITO:391-412; GUIA:538 | Vigente; lo abierto es Q-T2-4 |
| Usuario, 2026-09-11 | "El crédito disponible **sí debe frenar** el pedido"; bloqueado porque `to_Cte.ZlimCred` llega en 0.000 | FLUJO_CREDITO:280-298; GUIA:539 | **Nunca revocado**; los documentos posteriores dan por hecha la paridad sin respuesta del usuario → P17 |
| Usuario, 2026-09-11 | Credilana fuera de alcance (SKILL regla 15) | GUIA:209-218; SKILL:55 | Vigente |
| Diseño, 2026-09-18 | D1 de diseño (solo ServicioSAP es destino), D5 (equivalencias = ODatas de ServicioSAP), D7 (APIs intermedias `*.mavi.fun`), D10 (sin PUT, solo PATCH), D8.1 (`CodigoRecomendador` queda sin valor). D2, D6 y D9 de diseño los superó el recorte del 2026-09-24 | FLUJO_SP:28-39, :903 | Parcial |
| Usuario, 2026-09-21 | `ZtipoCliente` ∈ {Nuevo, Prospecto}; `Prospecto` = aún prospecto. `Zprospecto` no discrimina | CAP:37-38 | Vigente (base de P16) |
| Usuario, 2026-09-21 | `tarjeta`, `tarjetaDigitos`, `creditoHipoteca` "se quedan como están" (NULL) | PLAN:245 | Vigente |
| Usuario, 2026-09-22 | El SP desaparece: no se llama; su lógica pasa a C#; el `.sql` es solo especificación. Código sin comentarios de reglas, las reglas viven en los documentos | PLAN:492-494, :639, :664 | Vigente |
| Usuario, 2026-09-22 | Regla de fuentes: tabla de ServicioAndroid → SQL Android; tabla de Intelisis → su equivalente SIGMavi; tabla con OData → esa OData; los literales legados se respetan | PLAN:764 | Vigente (TablaStD → AWS, 09-23) |
| Usuario, 2026-09-22 | `CREDICCondicionArt` deprecada, con un solo registro; no va a SIGMavi | PLAN:943, :2111 | Base de P4-A |
| Usuario, 2026-09-23 | La diferencia de puerto 20400/44300 es "meramente informativa"; un puerto visto en una captura nunca es arquitectura de ServicioSAP; solo `obtenerUrl` decide | PLAN:1098-1108 | **Vigente**: R2-V ya no se plantea por puertos |
| Usuario, 2026-09-23 | TablaStD = catálogo configurable de AWS. `CteXpressFrontSAP` es un valor de registro en piso, no el que escribirá e-commerce; el `ZappOrig` de e-commerce "todavía está pendiente de definir" | PLAN:1138-1150 | Vigente |
| Usuario, 2026-09-23 | `to_Cte.ZlimCred` = línea de crédito total autorizada (no `Zcrmcantidad`) | PLAN:1194-1198 | Vigente |
| Usuario, 2026-09-23 | Abono es un configurable del producto; un artículo mal configurado es error operativo y se procesa como llega. Sin guardas nuevas | CAP:217-219; FLUJO_CREDITO:342-349 | Vigente |
| Usuario, 2026-09-24 | "Quita esos bloques que no influyen": solo `@Op='Insert'`; `InsertarSolicitudAsync` propaga errores; "no hay logs que LAN no tenga" | PLAN:1255-1283 | Vigente (DIMAS MX reabierto por DU7) |
| Usuario, 2026-09-24 | Un solo `MapGender` (BPM); se borró la copia de OM | PLAN:1293, :2157-2163 | Vigente (DU10) |
| Usuario, 2026-09-25 | Trabajar directo en el working tree, **sin ramas ni commits** | PLAN:1677 | Vigente |
| Usuario, 2026-09-25 | "La lógica de negocio tiene que ser igual a LAN; `SetOrderAsync` tiene que ser como `SetPedido`" | PLAN:1767 | Vigente |
| R1/09-26 | Magento aún manda la cuenta `C…` (transitorio); las pruebas usan un BP | workflow_credit_parity_2026-09-26.js:28 | Precisada por DU2 |
| R2/09-26 | Cuenta vacía + `cliente` de Magento = cliente nuevo que inserta | …:29 | **Reemplazada por DU6** |
| R3/09-26 | Liberador, aviso y `UpdateIdEcommerceEnVenta` bloqueados por otro equipo; los arreglos propios se preparan antes | …:30 | Vigente → T1a / T1b |
| R4/09-26 | Los errores se relanzan; el controlador registra y responde 200 `Error, …`; todo error visible con log + excepción | …:31; PLAN:1753 | Vigente (base de P12-A; tensión con P13) |
| R5/09-26 | Guardar la guía se acepta como está; tragar su falla es aceptable | …:32; PLAN:1756 | Vigente (P1 no pone compuerta G-b) |
| R6/09-26 | `forzarOrder` original antes de `ToArray` | …:33 | Hecho |
| R7/09-26 | Cambios de fuente intencionales: SD36 por `PurchNoC`, sin selección de SP, sin staging `detallePedido`, datos del cliente de BP05MA, TablaStD = AWS, APIs intermedias, solo PATCH, solo `@Op='Insert'`, código recomendador deprecado, `ValidacionTelefono` rediseñado para SAP | …:34 | Vigente (staging re-preguntado en P9) |
| R8/09-26 | Brechas de contado A/B/C fuera del alcance del crédito | …:35; PLAN:1794-1799 | Vigente |
| Q1 (2026-09-26) | "Hazlo igual que LAN": cada VarChar con el ancho del parámetro del SP, `@cliente` 10 | PLAN:1911-1920, :1931 | Aplicado |
| Q4 (2026-09-26) | La validación del teléfono no está en el BP: es `A_GET_TelefonoValidado`; COFETEL y ZvalTel son dos validaciones distintas | PLAN:1932 | Aplicado |
| Q5 (2026-09-26) | "Sin condición de pago → cortar al inicio, antes de consumir APIs" | PLAN:1933, :1503 | Decidida, no aplicada; choca con DU5 → P2 |
| Q8 (2026-09-26) | "Los cupones de promotor están deprecados — ¿efectos si se quitan?"; opciones A/B sin elección escrita | PLAN:1934; FLUJO_CREDITO:198 | Abierta → P3 |
| Q11 (2026-09-26) | "Como LAN si tienen respaldo": sin `Birthdt` → `1900-01-02` (CTN:140); no se copia el crash | PLAN:1936 | Aplicado (SCW:244, :555) |
| Q13 (2026-09-26) | `ClienteMagento` no hace falta; queda NULL | PLAN:1937 | Cerrada |
| Q17 (2026-09-26) | Sustitución TELEFONIA "es algo por hacer, pero no está definido" → diferida | PLAN:1939 | Diferida → P10 |
| Q20 (2026-09-26) | "Si LAN lo hace como regla de negocio, se replica"; LAN no valida el formato de la cuenta | PLAN:1940 | Vigente |
| Gender (2026-09-26) | 1 masculino, 2 femenino; vacío → 1 al crear el BP (se puede cambiar después) | PLAN:1941, :2269 | Vigente en el alta. Efecto no previsto: un BP creado desde una orden sin sexo queda con Gender 1 y su fila de crédito dirá `Masculino` donde LAN guardaba `''` (PLAN:2159) → se anota en P14; los códigos de `Gender` no se vuelven a preguntar (DU10) |

### 4.3 Hechos nuevos que usa el plan

- **Familia del producto** (equivalente de `Art.Familia`): configuraciones-api `AS_GET_FamiliaLineaFilter?Class=<SFxxxLyyy>`; `Class` = código de familia/línea, `Kschl` = descripción. Ya existen `ProductMethods.GetFamiliasLineaByClassAsync` (PM:354-414), el patrón de prefijo de `EcommerceMethods.EsFamilia` (ECM:109-128) y `Product.Family` (JSON `FAMILIA`, Product.cs:29-31). Lo usa P10.
- **SD29**: las filas de un SKU se distinguen por `Condicion` (códigos ACEF, 12IA, 12IV…; la descripción va en `Descripcion`) y `OrgVtas` (04 MA, 05 VIU). La captura también muestra varios `CDistr`, `Sucursal` 0504/0505 contra 0/0000 y `Vigente` true/false; las filas legadas (OrgVtas 1/2/3) traen descripciones (CAP:210-225). Lo usa P7.
- **`order/new` escribe directo** la cabecera (SCW) y las líneas `VTASdArtCreditoWeb` (OM:857-885) con la conexión Android del `Web.config`; ya no se llama ningún SP. El INSERT de líneas ahora va con el login `usrintranet`, que LAN nunca usó para esa tabla (LAN la escribía por el linked server desde el SP): hay que confirmar el permiso (V2 paso 0).
- **DMZ** (HEAD `09cb341`, limpio): `validateCredit` comentado (OrdersController.cs:366-402); `creditStatus` (:460-482, `curl.Get` :467) y `updateCreditOrderId` (:404-419, `curl.Post` :411) van a `URL_INTELISIS`; el constructor de `Curl` ya solo hace login a `URL_SAP` y usa ese token para todo (Curl.cs:73-85), así que esas dos rutas mandan el JWT de ServicioSAP a `URL_INTELISIS`. `authorizationResult` (:421-458) va directo a Magento.
- **`MAVI - DMZ-SAP.csv` del 2026-09-30** (cambiado por otra persona): contra `MAVIDMZSAPConexiones.csv` (la versión del 2026-09-10) cambian 22 filas, todas ajenas al crédito: las 13 de `MagentoController` (`magento/getOrderId` y `noImagenProduct` pasan a `Deprecado`), `customerService/obtenerCreditos`, `obtenerQuejas` y `bbvaKeyAdvanced`, `customer/cashCustomerReport`, `customer/getCuenta`/`setCuenta`, `product/obtenerImagen` y `order/createStorepickupCode`/`generateNewStorepickupCode` (ahora Conectado/Generado `Si`), más los totales. **Ninguna fila de crédito cambió**; siguen atrasadas contra el código (fila 82 `creditStatus` → `sale/filter` SD36; fila 89 `validateCredit` → `order/new`; fila 7 `codigoPromocion` To Do; filas 5-6 `getSms`/`validateSms` To Do aunque ServicioSAP ya los tiene). Por GUIA §3 (GUIA:347-348) el CSV es informativo, nunca tablero.

### 4.4 Lo deprecado

| Qué | Quién lo dijo y cuándo | Fuente | Efecto en el plan |
|---|---|---|---|
| Cupones de promotor | Usuario, 2026-09-26 ("están deprecados — ¿efectos si se quitan?"), sin elegir opción | PLAN:1934; FLUJO_CREDITO:198 | P3 (recomendado A: quitar la quema del crédito). Ojo: el CSV fila 7 y CHECKLIST_DEV1:27 todavía planean `credit/codigoPromocion` |
| DIMAS MX y `CREDICCondicionArt` | Usuario, 2026-09-22 ("deprecada, un solo registro") y recorte del 2026-09-24 | PLAN:943, :2111, :1255-1283 | P4 (recomendado A: cerrar sin código) |
| `CodigoRecomendador` | R7/09-26 ("deprecado y retirado"); D8.1 de diseño: la columna queda sin valor | workflow_credit_parity_2026-09-26.js:34; FLUJO_SP:903 | Columna NULL (CAMBIOS §4.2); CSV fila 8 también lo marca DEPRECADO |

### 4.5 Decisiones registradas después del 2026-09-30

> Aquí se agregan las respuestas del usuario a §6.3 (DU11, DU12…). Cada fila: id, fecha, pregunta (P#), opción elegida con las palabras del usuario, quién la implementa (sesión) y estado. La misma fila va a CAMBIOS §2. Ver §8 (f).

| Id | Fecha | Pregunta | Opción elegida (palabras del usuario) | Sesión | Estado |
|---|---|---|---|---|---|
| DU11 | 2026-09-30 | T1 / T2 (liberador, `creditStatus`, `updateCreditOrderId`) | "el validador está en desarrollo, necesitamos esperar hasta que terminen": el liberador lo está desarrollando el otro equipo. T1b y T2a-T2d esperan a que lo terminen; mientras tanto se avanza con todo lo demás (S1, decisiones §6.3, V2/V3 sin liberador). T1a (portar el aviso, sin llamador) sí puede hacerse ya | S3 (cuando el liberador esté listo) | Esperando al otro equipo |
| DU12 | 2026-09-30 | P5 (MAYÚSCULAS) | "si LAN usa mayúsculas se replica; si LAN no lo usa, no se replica y solo se pone el valor en el campo". Analizado: el flujo de crédito de LAN **no convierte a mayúsculas** en ningún paso — `SpCREDIDatosSolicitudCreditoArt` `GetInfo` lee las columnas de `CTE` tal cual (SPsOrden\SpCREDIDatosSolicitudCreditoArt.sql:55-76, sin `UPPER`), `getClientInfo` las copia con `.ToString()` (LAN CreditMethods.cs:831-847), `SaveData` las pasa sin cambio (:152-169) y `SP_CREDITO_WEB_DATOS` no tiene `UPPER`/`LOWER`. Las mayúsculas del historial venían de cómo estaba guardado el cliente en `CTE`, no del proceso de crédito. → **P5 cerrada como B**: se guarda el valor del BP tal cual (el código actual ya lo hace; sin cambio) | — | Cerrada |
| DU13 | 2026-09-30 | P6 (`nombre`) | "P6 ok, aplica" → **A**: `nombre` = partes no vacías de `NameFirst` + `Namemiddle` unidas con un espacio (corte 25 por el parámetro); `nombre2` sigue NULL como LAN. Investigación previa: LAN guardaba `CTE.PersonalNombres` (todos los nombres de pila juntos) y nunca llenaba `nombre2` en este camino | Aplicado 2026-09-30 (SCW `ArmarFila`) | Hecho, compila |
| DU14 | 2026-09-30 (texto corregido 2026-10-01) | P8 (`costo`) | "P8 ok, aplica" → **c1**: `VTASdArtCreditoWeb.costo` = NULL como **diferencia aceptada** (SAP no tiene fuente de costo), no como paridad. LAN casi siempre guardaba el costo que calculaba `spVerCosto` 96/MAVI/PESOS según `Art.TipoCosteo` (SPsOrden\spVerCosto.sql:150-179); NULL solo en artículos sin método de costeo (:72, :120) y 0 cuando el método no encontraba costo (sin renglón en `ArtCosto` para la sucursal 96, :162, :182); siempre devuelve un renglón (:192). SD29 no sirve: es precio de venta y no tiene campo de costo. Única candidata, sin validar: DM01 `ZAPI_ARTICULOS_SRV` `COSTOPROMEDIOPCP` (`Product.AverageCost`). Nadie lee la columna en LAN/DMZ/ServicioSAP; se revisa si el liberador o MAVICUBOS la leen (Q-T1-4 / Q18). (b) y (d) quedan como están | Aplicado 2026-09-30 (OM `InsertCreditArticlesAsync`) | Hecho, compila |
| DU15 | 2026-09-30 | P2 (condición sin equivalente) | "continue like LAN" → **A (DU5)**: condición sin equivalente = 0 líneas de producto, SEGU00001 sí se inserta y el flujo sigue; condición nula = ninguna línea (LAN fallaba por `@Condicion` sin valor). Q5 (corte temprano) descartada | Aplicado 2026-09-30 (OM `InsertCreditArticlesAsync`, `ProcessCreditPaymentAsync`) | Hecho, compila |
| DU16 | 2026-09-30 | P3 (cupón) | "cupón está deprecado, no lo necesitamos" → **A**: se quitó la quema del cupón del flujo de crédito; `HandlePromoCodeAsync` se conserva para `GET order/validatecupon` | Aplicado 2026-09-30 (OM `ProcessCreditPaymentAsync`) | Hecho, compila |
| DU17 | 2026-09-30 | P13 (logs) | "sí, quitar los logs que LAN no tenía" → **D**: quitado `[CREDITO SIN CUENTA]` y el log de `ObtenerTelefonoAValidar` (SCW); agregado a archivo el error de `ObtenerNumeroTablaSms` que LAN sí registraba (LAN OrderMethods.cs:849). Se conserva `[CREDITO SD29 FILTRO]` (único rastro del respaldo de E5) salvo que el usuario diga quitarlo | Aplicado 2026-09-30 | Hecho, compila |
| DU18 | 2026-09-30 | P14 (`Marst` fijo al crear el BP) | "Magento en Intelisis ponía '', pero en SAP es un campo obligatorio; por eso ponemos Soltero (1) por defecto" → **B**: `Marst` no puede ir vacío; se conserva el valor por defecto y se acepta la diferencia: la fila de crédito de esos BP dice `Soltero` donde LAN guardaba `''`. Alineación (usuario 2026-09-30, "sí, cambia a 1 en los dos"): el alta desde la orden (`BuildBpClientFromOrder`, OM:2688) pasó de `"2"` (Casado) a `"1"` (Soltero), igual que `setCustomer` (BPM:486) | Aplicado 2026-09-30 (OM `BuildBpClientFromOrder`) | Hecho, compila |
| DU19 | 2026-09-30 | P15 (conexión a SIGMavi) | "SIGMavi viene del DLL, no del Web.config; está bien mantenerlo así con `obtenerConexionSigMaviAsync`" → **A**: SIGMavi sigue por `Conexion.Data.getconexion(settings.Server, "SIGMavi")` (ConexionSQL.cs:19, :79) con el alias de servidor de `Web.config:159-161`. Las demás bases (Android, AdminDoc) siguen por `Web.config`. Nota para QA/Prod (no es bloqueo, DU1): el DLL solo reconoce los alias `DEVMAVI` y `QAIMAVI`; para Prod hace falta un alias que el DLL conozca | — | Cerrada |
| DU20 | 2026-10-01 | T2b (`updateCreditOrderId`) | Hecho informado por el usuario (correo del 18/09/2026 del Líder Técnico Ecommerce al equipo SAP): se pidió un **OData para actualizar `ZIdEcommerce` del nodo `ZSDT_VBAK`** para el flujo de orden de crédito. Responde Q-T2-4/Q-T2-5 en la era SAP: el cambio de `CRED{quoteId}` al número real se hace en el `ZIdEcommerce` del documento de ventas, con ese OData nuevo. **En espera de SAP**; al llegar, pedir su ficha/URL (GUIA §2.1) y construir T2b. T2b también espera al liberador (DU11) | S3 | Esperando a SAP |

---

## 5. Estado del código

**Working copy** de ServicioSAP, rama `SpExportaEcommerce`, HEAD `2cf425f` (2026-09-28 10:54), **sin commit**. `git diff --stat`: 4 archivos (OM, SCW, FLP, ICR), **126 inserciones y 44 borrados**. Compila con Roslyn (221 `.cs`, exit 0, DLL de verificación de las 12:44:11). **Falta MSBuild** (V1 paso 2) y **no hay E2E**. EOL de los 6 archivos de crédito: `i/lf w/crlf`. BOM: OM, SCW, SCM y LIB **sin** BOM; FLP, ICR, OC, BPM y PM **con** BOM. El `bin\ServicioSap.dll` del share es del 2026-09-29 16:14:46 y no se sabe de qué fuente salió (alguien compiló sobre `bin/obj` del share).

### 5.1 E1-E5, líneas verificadas el 2026-09-30

| Id | Qué hace | Dónde (líneas actuales) | Cómo re-verificar |
|---|---|---|---|
| **E1** | Compuerta "sin cuenta": crédito solo para BP existente; cuenta en blanco o no encontrada → log `[CREDITO SIN CUENTA]` y `throw "sin cuenta"`, sin fila; se quitaron cliente nuevo e invitado; devuelve `cuentaBp` | OM:642 `cuentaBp`; :644-645 comentario; :646 compuerta (`IsNullOrWhiteSpace` o `!CheckClientCreditAsync`); :648 log; :649 throw; :685-686 nota `PENDIENTE (T18)`; :687-721 bloque del liberador comentado; :723 `return cuentaBp`. `CheckClientCreditAsync` OM:732-745 da false ante **cualquier** excepción (OM:740-744) | Hunks `@@ -640,20 +640,13 @@`, `@@ -689,11 +682,9 @@`, `@@ -729,7 +720,7 @@`. `grep "esClienteNuevo\|esInvitado"` = 0; `idClienteMagento` solo en OM:690 (comentado); `CrearSolicitudCreditoAsync(`: definición :751, un llamador :660 |
| **E2** | Cabecera con los valores del pedido como LAN: sin `?? ""` en email, dirección, exterior, interior, delegación, población, estado, colonia, condición, utmSource y MetodoEnvio; `Origen = info.origen ?? "PRODUCTOS MX"`; `uen = storeId == "viu" ? 2 : 1` | OM:754-755 (uen); :779 Email, :780-782, :786-789, :793 Condicion, :795 UtmSource, :800 MetodoEnvio; :797-798 Origen; ICR:69-74 (propiedad :74). Quedan a propósito `?? ""` en :784, :785, :794, :807 y `?? "0"` en :799 | Hunks OM `@@ -760,7 +751,8 @@`, `@@ -781,26 +773,31 @@`; ICR `@@ -66,6 +66,13 @@`. En OM:776-800, `?? ""` en código solo en :784, :785 y :794 (y en el **comentario** de :778); `?? "0"` solo en :799 |
| **E3** | INSERT textualmente el del SP: `DECLARE @fecha DATETIME; SELECT @fecha = GETDATE();`, literal `1` en `confirmado`, `ISNULL(@RedimirMonedero, 0.00)`; sin parámetros `@fecha`/`@confirmado` | SCW:35-37 comentario; :38-39 DECLARE; :40 INSERT; :142 `@fecha`; :143 literal 1; :152 ISNULL; :160 `SCOPE_IDENTITY`; 57 `Parameters.Add` en :171-228 (comentario :212). Queda `fila.Confirmado = 1` en SCW:287 (lo quita R4) | Hunks SCW `@@ -32,7 +32,12 @@`, `@@ -135,7 +140,7 @@`, `@@ -144,7 +149,7 @@`, `@@ -204,8 +209,7 @@`, `@@ -280,8 +284,6 @@`. SCW:40-160 contra SPD:223-344 sin espacios ni mayúsculas: mismo texto, 59 columnas y 59 valores. `grep 'Add("@fecha"\|@confirmado'` = 0 (`@fecha_nacimiento` :175 es correcto) |
| **E4** | `sexo` y `estadoCivil` desde el BP: `SexoLegado` (`''` → `''`, 1 Masculino, 2 Femenino, otro `NO ESPECIFICADO`, Size 9 → `NO ESPECI`); `EstadoCivilLegado(Marst)` 1-6, otro o vacío `''` (Size 11 → `Pareja de h`) | SCW:246, :261; `SexoLegado` :567-589 (:573-576, :578-581, :583-586, :588); `EstadoCivilLegado` :591-606 (casos :598-603, default :604); Size 9 en :177, 11 en :190 | Hunks SCW `@@ -254,7 +258,7 @@`, `@@ -566,9 +568,14 @@`, `@@ -581,6 +588,23 @@`. Sin MAYÚSCULAS (P5) |
| **E5** | Precio SD29 del crédito filtrado en el servicio por `Articulo + OrgVtas + Condicion`, `$filter` completo en `Uri.EscapeDataString` y apóstrofo duplicado (también en la consulta solo por SKU: arregla los SKU con `+` en todo el proyecto). `ObtenerPreciosCreditoAsync`: condición traducida, luego la de Magento; si algo lanza, log `[CREDITO SD29 FILTRO]` y consulta solo por SKU. Se conservan los filtros en memoria. **Sin probar contra SAP** | FLP:82-85 (`GetFinalListProperBySkuAsync`), :91-96 (`GetFinalListProperBySkuOrgCondicionAsync`), :100-103 (`LiteralOData`), :105-135 (`ConsultarPropreListAsync`, URL :108-110); OM:919 (llamada), :997-1002 resumen, :1003-1025 método (log :1021, respaldo :1022-1023); filtros en memoria OM:929-944; contado OM:1982 | Hunks FLP `@@ -80,9 +80,34 @@`; OM `@@ -919,8 +916,7 @@`, `@@ -998,6 +994,36 @@`. `GetFinalListProperBySkuOrgCondicionAsync` solo en FLP:91 y OM:1007/:1013; `ObtenerPreciosCreditoAsync` solo en OM:919 y :1003. Detalle en CAMBIOS §3.6. **Pendiente:** registrar la autorización del usuario para los 4 métodos nuevos (GUIA §1.9b) → P20 |

**Comandos de re-verificación** (PowerShell; solo lectura):
```powershell
$g = 'git -c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP" -C "\\172.16.214.58\sap\ServicioSAP"'
Invoke-Expression "$g status --short"          # 4 archivos M
Invoke-Expression "$g diff --stat"             # 126 inserciones, 44 borrados
Invoke-Expression "$g log -1 --format='%h %ci'" # 2cf425f
Invoke-Expression "$g ls-files --eol -- ServicioSap/ServicioSap/Methods/Order/OrderMethods.cs ServicioSap/ServicioSap/Methods/Credit/SolicitudCreditoWebMethods.cs"   # i/lf w/crlf
Select-String -Path "\\172.16.214.58\sap\ServicioSAP\ServicioSap\ServicioSap\Methods\Order\OrderMethods.cs" -Pattern 'CREDITO SIN CUENTA','ObtenerPreciosCreditoAsync' | Select-Object LineNumber, Line
```

**Lo que E1-E5 dejaron sin tocar a propósito** (no se "arregla" fuera de su tarea): OM:784 `EntreCalles ?? ""` (reproduce LCM:163 con el respaldo de SCW:252); OM:785 `CodigoPostal ?? ""`, OM:799 `IdMagento ?? "0"` y los `'0'` del teléfono OM:654-657 (compuertas de P1); OM:794 `Cliente = info.cuenta ?? ""` (llave del maestro); OM:807 `OrigenIdMagento ?? ""` (BORDE); OM:770-775, :790, SCW:287, SCM:220 y :222 (los limpia R4); OM:941-944 `FirstOrDefault` y `costo` 0 en OM:902 (P7, P8); OM:685-721 (T1b); los logs sin equivalente en LAN (P13); la capitalización del BP (P5).

### 5.2 Paridad de las 59 columnas (resumen)

De las 59 columnas de `CRED_SOLICITUD_WEB_DATOS_TEMP`: **37 EQ · 11 EQ-FUENTE · 9 PENDIENTE · 2 BORDE · 0 DIF**. Tabla completa con el valor esperado por columna: [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]] §4.2 (recuento en §4.3).
- **PENDIENTE (9):** filas 5 `fechaNacimiento` (G-d, G2-40), 15 `codigoPostal`, 27-30 teléfonos (G-c), 34 `articulo` y 36 `condicion` (DIMAS MX, P4), 45 `idMagento` (A5).
- **BORDE (2):** filas 41 `origen` y 54 `OrigenIdMagento`: solo difieren con un `null` explícito que Magento no manda.
- **Los 20 defaults NULL del SP** coinciden: filas 4, 13, 14, 21-26, 31-33, 39, 44, 46, 49, 50 y 57-59.
- **Diferencias de formato dentro de EQ-FUENTE:** MAYÚSCULAS (filas 1, 2, 3, 7, 12, 20 → P5), `ZtelCte` sin reducir a dígitos (filas 53, 55, 56 → G3-23) y `Namemiddle` (fila 3 → P6).

---

## 6. PLAN DE IMPLEMENTACIÓN FINAL

Basado en el borrador del 2026-09-29 (plan_s26), con las correcciones de citas del 2026-09-30 aplicadas, R2 reescrita con el resultado de R2-V, P8 (a) cerrada por la decisión del 2026-09-11 y cinco decisiones nuevas (P16-P20).

**Estados:** **HECHO** (en el working copy, sin commit) · **LISTO** (se aplica sin preguntar) · **DECISION** (espera la respuesta del usuario) · **BLOQUEADO_EQUIPO** (espera a otro equipo) · **VERIFICACION** (prueba o lectura; no edita código).

### 6.0 Decisión final del plan

> [!success] Decisión final del plan (2026-09-30)
> Es la opción **recomendada** de cada punto. Ninguna se implementa hasta que el usuario la confirme en el chat (salvo las LISTO); las opciones "sin código" solo tocan documentación.
>
> | Punto | Decisión final recomendada | ¿Código? |
> |---|---|---|
> | R4, R3, R1, T1a | Aplicar en S1, en ese orden | Sí (LISTO) |
> | R2 | **A**: sin cambio de código; cerrar G3-19 como EQ cuando pase R2-V. **R2-b (i)**: registrar el atajo de SCW:393-396 como diferencia aceptada (solo cambia en error) | No |
> | P1 | **A1 + A3 + A4 + A5**, G-b **sin** compuerta (se mantiene R5/09-26), G-d **A-d1** (se mantiene Q11), G-e **A-e1** (inalcanzable) | Sí |
> | P2 | **A** (DU5: condición sin equivalente escribe SEGU00001 y sigue) | Sí |
> | P3 | **A** (quitar la quema del crédito) si nadie lee `VentasCupones`; si alguien lo lee, **C** (port literal). Coordinar `credit/codigoPromocion` con Magento y Javier | Sí |
> | P4 | **A** (DIMAS MX deprecado, sin código) | No |
> | P5 | **C**: MAYÚSCULAS solo en los campos cuyo historial LAN esté en mayúsculas (SELECT previo); `sexo` conserva el dominio del gerente salvo que el historial diga otra cosa | Según historial |
> | P6 | **A** (`NameFirst + ' ' + Namemiddle`) después de la captura BP05MA | Sí |
> | P7 | Captura primero; si quedan varias filas por Sucursal o Vigente, **C**; **D** solo con el código de `CDistr` del equipo SD | Según captura |
> | P8 | (a) **cerrada**: SD29 (2026-09-11); (b) **b2** si el historial LAN no tiene duplicados, si no **b1**; (c) **c1** (`costo` NULL); (d) **d1** si `VTASdArtCreditoWeb.precio` es FLOAT, si no cerrar G4-09 | Sí (c1; b/d según datos) |
> | P9 | **A** (confirmar R7/09-26: sin staging), salvo que Valentín diga que el liberador lo lee | No |
> | P10 | **A** (diferir hasta que el negocio defina Q17) | No |
> | P11 | **A** (retirar la herramienta de reproceso) | No |
> | P12 | **A** (mantener R4/09-26); **no** se pide al DMZ restaurar códigos HTTP (GUIA §1.5) | No |
> | P13 | **D**: quitar `[CREDITO SIN CUENTA]` (OM:648) y el log de SCW:368 (el error ya queda en `[ORDER NEW ERROR]`, OC:45); **conservar** `[CREDITO SD29 FILTRO]` (único rastro de un error tragado, R4/09-26); agregar el log a archivo del error de SMS que LAN sí tenía | Sí |
> | P14 | **A** si BP01 acepta `Marst` vacío; si no, **B** | Según prueba |
> | P15 | **A** (DLL) en el paquete de crédito; **B** como tarea aparte antes de QA/Prod | No |
> | P16 | **A** (confirmar prospecto = `ZtipoCliente 'Prospecto'`) | No |
> | P17 | **A** (paridad LAN: el saldo no frena) hasta que exista una fuente real; la decisión del 2026-09-11 queda **diferida**, no revocada | No |
> | P18 | **A** (sin cambio hasta que el negocio confirme si `05 … P DIF` se vende a crédito web y su código SD29) | No |
> | P19 | **A** (T1b llama al liberador síncrono dentro de la tarea de fondo, como el `Thread` de LAN; excepción registrada a la regla 12) | No |
> | P20 | **A** (ratificar E5 tal como está y registrarlo en CAMBIOS §3.6) | No |
> | U1 / U2 / T2c | U1 **sí** (interruptor en `false`); U2 **aceptar** la diferencia; T2c **B** (por carrito) | — |
>
> **Orden de sesiones:** **S1** (LISTO + V1 + cuestionario) → el usuario contesta §6.3 y corre las lecturas previas (R2-V, permisos, SELECT, capturas) → **S2** (decisiones del usuario) → el usuario corre V2 y V3 → **S3** (cuando respondan Valentín, crédito, Alan, DMZ y Dev 2) → **S4** (E2E V4). Una sesión de Fable por S, nunca el plan entero (§8).

### 6.1 Tablero de tareas

| Id | Título | Estado | Depende de | Reglas |
|---|---|---|---|---|
| E1 | Compuerta "sin cuenta" (solo BP existente) | HECHO | — | G1-09, G1-10, G1-12, G1-13, G1-23, G2-05, G2-38 |
| E2 | Cabecera con los valores del pedido (sin `?? ""`, origen, uen) | HECHO | — | G2-04, G2-15 … G2-17, G2-20 … G2-22, G2-25, G2-27 |
| E3 | INSERT igual al del SP | HECHO | — | G2-01, G2-31, G2-33, G2-34, G2-36 |
| E4 | `sexo` y `estadoCivil` desde el BP | HECHO | — | G2-12, G2-13, G2-14 |
| E5 | SD29 del crédito filtrado y `$filter` codificado | HECHO (sin probar contra SAP; ratificar en P20) | — | G4-21 … G4-23, G4-25 |
| R4 | Limpieza de `ArmarFila` y `CrearSolicitudCreditoAsync` + guarda sin maestro | LISTO | E1, E3, E4; antes de R3 | G2-05 … G2-07, G2-10, G2-11, G2-14, G2-18, G2-24, G1-19 |
| R3 | Búsquedas de la validación telefónica con `maestro.Partner` | LISTO | R4 | G3-18, G2-24 |
| R1 | Teléfono a validar como LAN: `Length > 0`, sin Trim | LISTO | E1 | G3-08, G3-03, G3-04 |
| T1a | Aviso a Magento y logs del liberador con paridad LAN (sin llamador) | LISTO | — | G5-10, G5-11, G5-12, G5-20 |
| R2-V | Capturas de "no encontrado" y de CteTelSet por `obtenerUrl` | VERIFICACION (la corre el usuario) | — | G3-19, G3-10, G3-11, G3-16 |
| R2 | Errores en las búsquedas de teléfono + atajo SCW:393-396 | DECISION (recom. A + R2-b i) | R2-V | G3-16, G3-19, G3-20, G2-39 |
| P1 | Compuertas "sin fila" de LAN | DECISION | P12, R1, P2, P13 | G1-05, G1-07, G1-08, G1-18 … G1-20, G1-25, G2-10, G2-16, G2-23, G2-26, G2-29, G3-09, G5-04, G5-17 |
| P2 | Condición sin equivalente: Q5 o DU5 | DECISION | P1, P3, T1, P7/P8 | G4-24, G2-22, G1-14, G4-11, G4-23 |
| P3 | Cupón del promotor | DECISION | Lectores de `VentasCupones`, P15, P2, T1 | G5-06 … G5-08, G5-26, G5-27 |
| P4 | DIMAS MX | DECISION | — | G2-03, G2-19, G4-38 |
| P5 | MAYÚSCULAS en los datos del maestro | DECISION | SELECT de historial, P6, R4 | G2-06 … G2-08, G2-11 … G2-13, G2-18 |
| P6 | `nombre = NameFirst + Namemiddle` (Q19) | DECISION | Captura BP05MA, P5 | G2-08 |
| P7 | SD29: filtros extra (Sucursal, Vigente, CDistr) | DECISION | Captura SD29 | G4-21, G4-25 |
| P8 | Líneas: varias filas, costo, precisión SEGU00001 ((a) cerrada) | DECISION | P7, DDL, Q6 | G4-09, G4-20, G4-21, G4-25, G4-29 … G4-37 |
| P9 | Staging `eCommerceDetPedidos` | DECISION | Valentín, dueño SIGMavi, P10, P1 | G4-02 … G4-04, G5-21 … G5-23 |
| P10 | Sustitución TELEFONIA (Q17) | DECISION | Q17 y 4 datos, P7/P8, P15 | G4-03, G4-12, G4-15 … G4-19, G4-28 |
| P11 | Herramienta de reproceso | DECISION | Soporte, T2 | G1-04, G5-03, G5-32 |
| P12 | Contrato de respuesta HTTP | DECISION | DMZ y Magento | G1-24, G2-38, G2-39, G3-16, G5-14, G5-16, G5-25 |
| P13 | Logs que LAN no tenía (y los INFO que sí tenía) | DECISION | P1, P2, R2, P12 | G5-20, G5-32, G3-12 |
| P14 | `Marst` fijo al crear el BP | DECISION | Prueba BP01 en DEV | G2-13 |
| P15 | Conexión a SIGMavi | DECISION | Infraestructura | DU1 (abierto) |
| P16 | NUEVA. Prospecto = `ZtipoCliente 'Prospecto'` | DECISION | — | G3-21, G1-21, G1-23, G3-15 |
| P17 | NUEVA. Límite de crédito (decisión del 2026-09-11 contra paridad) | DECISION | Fuente de `ZlimCred` | G1-15 |
| P18 | NUEVA. Condición `05 … P DIF` sin entrada en el catálogo | DECISION (negocio) | Negocio / SD | G4-40 |
| P19 | NUEVA. Liberador síncrono (`WebClient`) contra SKILL regla 12 | DECISION | — | G5-09, G5-10 |
| P20 | NUEVA. Ratificar E5 (4 métodos nuevos, GUIA §1.9b) | DECISION | — | G4-21 |
| T1b | Encender liberador + aviso en segundo plano | BLOQUEADO_EQUIPO (Valentín) | T1a, Q-T1-*, U1, U2, P2, P16, P19 | G1-22, G1-23, G5-02, G5-09, G5-10, G5-26, G5-28 |
| T2a | Ruta `order/creditStatus/{idSolicitud}` | BLOQUEADO_EQUIPO (crédito + Valentín + Dev 2) | Q-T2-1 … 3, T1b | G5-18, G5-24, G5-28 |
| T2b | Ruta `order/updateCreditOrderId` | BLOQUEADO_EQUIPO (Alan, crédito, Dev 2/Marcos) | Q-T2-4, Q-T2-5, P9, T2a | G5-19, G5-29, G5-30, G5-31 |
| T2c | Control de duplicados del reenvío | BLOQUEADO_EQUIPO | Q-T2-4, T2c-A/B | G5-24, G5-01, G5-02, G1-06 |
| T2d | DMZ: `creditStatus` y `updateCreditOrderId` a `GetSAP`/`PostSAP` | BLOQUEADO_EQUIPO (dueño DMZ) | T2a, T2b desplegadas | G5-18, G5-19 |
| V1 | Compilación (csc rápido + MSBuild) con control de CRLF | VERIFICACION | Después de cada tarea de código | — |
| V2 | Kit de prueba positiva (MA; VIU y `+` opcionales) | VERIFICACION (la corre el usuario) | V1, BP de prueba, visto bueno | CAMBIOS §4.2 filas 1-59 |
| V3 | Pruebas negativas | VERIFICACION | V1, V2 paso b) | G1-09, G1-10, G1-12, G2-05, G5-20, G4-24 |
| V4 | E2E completo Magento → DMZ → ServicioSAP → liberador → cron | VERIFICACION | T1a … T2d desplegadas, V2, V3 | G5-02, G5-09 … G5-12, G5-18, G5-19, G5-24, G5-25 |

**Reglas duras para toda tarea:**
- **Replicar, no mejorar (GUIA §1.9).** Uno a uno con LAN + SP. Prohibido crear variables, parámetros, constantes o métodos que la tarea no nombre (§1.9b). Si replicar exige algo que la tarea no trae, se para y se pregunta.
- **DU5.** Cada columna guarda exactamente lo que guardaban LAN + SP.
- **Solo lo decidido.** Una DECISION se implementa solo con la opción que el usuario elija **en el chat**, tal como está escrita aquí. Una BLOQUEADO_EQUIPO no se implementa en parcial ni se le inventa destino.
- **No se reabre lo cerrado:** DU1 (conexiones y valores de Dev no son bloqueo), DU2 (no se mapean cuentas `C…`), DU10 (la tabla de códigos de `Marst` y los códigos de `Gender` no se preguntan; el `Marst` fijo del alta de BP sigue abierto en P14).
- **Pruebas:** toda escritura necesita el visto bueno explícito del usuario (ServicioAndroid, SIGMavi, SQLite, alta BP01, POST al liberador). Los GET y SELECT los corre el usuario. Fable no arranca el servicio ni ejecuta SQL contra servidores remotos.
- **Compilar no es probar.** Una tarea de código cierra con MSBuild en verde (V1) y, cuando toque, con la E2E de la regla 25 del SKILL (request y response exactos).
- **CRLF y BOM.** Después de **cada** Edit se restaura CRLF y se comprueba `git ls-files --eol` (V1 paso 0). Cada archivo conserva su BOM (o su falta de BOM). Lo mismo vale para los `.md` del vault (sin BOM, CRLF).
- **git sobre el UNC** siempre con `-c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP"` (DMZ: `…/SAP/DMZ`). **Sin commit** salvo que el usuario lo pida; si lo pide, E5 va en un commit propio (GUIA §1.8b).
- **Secretos:** nunca se imprimen (valores del `Web.config`, `USER_DMZ`, tokens, contraseñas). Al leer el `Web.config` se redactan `value="…"` y `connectionString="…"`.
- **El código del share manda** sobre los documentos. Desde OM:997 las citas de OM en MATRIZ y CAMBIOS (§0-§5) están corridas 29-30 líneas por E5.

**Choques entre tareas (implementar juntas o en orden):** P1 + P2 juntas (OM:665-666, `InsertCreditArticlesAsync` :836-850 y OM:1791-1793). P13 después de P1, P2 y R2 (toca OM:648, :1021 y SCW:368). P5 + P6 juntas, después de R4 (SCW:240-261). P7 → P8 → P10 en ese orden (el mismo ciclo OM:886-984). P3 es independiente (OM:671-675, :1030-1172). P14 va aparte (alta de BP de contado y `setCustomer`).

### 6.2 Tareas LISTO

Orden: **R4 → R3 → R1 → T1a**. R4 y R3 tocan SCW (R3 usa `maestro.Partner` después de la guarda de R4); R1 toca otra zona de OM; T1a es independiente y no tiene llamador. Después de cada una: CRLF + V1 paso 1. Al terminar las cuatro: V1 paso 2 (MSBuild).

#### 6.2.1 R4 — Limpieza de `ArmarFila` y `CrearSolicitudCreditoAsync`: datos personales solo del BP, con guarda sin maestro

- **Regla LAN.** LAN nunca toma de Magento nombres, fecha, RFC, sexo, estado civil ni cliente: todo sale del maestro (LCM:137, :152-158, :169, :173; `getClientInfo` LCM:804-868). Sin maestro no hay fila: cuenta vacía → `sin cuenta` (LCM:124, :255-258); maestro sin fila o con error → excepción → `err` (LCM:246-252). `entreCalles` es el del pedido si `Length > 0`; si no, el del maestro (LCM:163).
- **Destino.** SCW `InsertAsync`:18-33 (la guarda va después de :25, antes de :27) y `ArmarFila`:236-310 (:240-242, :244-246, :252, :261, :281, :287); SCM:220 y :222 (clase `SolicitudCreditoWebRow`, SCM:136); OM `CrearSolicitudCreditoAsync`:770-775 y :790.
- **Cambio.**
  1. SCW, justo después de :25 (`BusinessPartnerMa maestro = await ObtenerMaestroAsync(req.Cliente)…`):
     ```csharp
                 if (maestro == null)
                 {
                     // LAN checkCliente: cuenta vacia => 'sin cuenta', sin fila (CreditMethods.cs:124, :255-258).
                     throw new Exception("sin cuenta");
                 }
     ```
     No cambia el comportamiento: `ObtenerMaestroAsync` solo devuelve null con la cuenta en blanco (SCW:376-379), que E1 ya corta; `GetClientMaAsync` lanza en cualquier otro caso (BPM:316-330, envuelto en :336-339).
  2. SCW `ArmarFila`:
     - :240 → `fila.ApellidoP = maestro.NameLast ?? "";`
     - :241 → `fila.ApellidoM = maestro.NameLst2 ?? "";`
     - :242 → `fila.Nombre = maestro.NameFirst ?? "";`
     - :244 → `fila.FechaNacimiento = FechaSap(maestro.Birthdt) ?? FechaNacimientoPorDefecto;`
     - :245 → `fila.Rfc = maestro.To_CteCliente?.Stcd1 ?? "";`
     - :246 → `fila.Sexo = SexoLegado(maestro.Gender);`
     - :252 → `fila.EntreCalles = !string.IsNullOrEmpty(req.EntreCalles) ? req.EntreCalles : (maestro.To_Cte?.ZentCalles ?? "");`
     - :261 → `fila.EstadoCivil = EstadoCivilLegado(maestro.Marst);`
     - :281 → `fila.Cliente = maestro.Partner ?? "";`
     - :287 → borrar `fila.Confirmado = 1;` y la línea en blanco :288.
  3. SCM: borrar `public DateTime Fecha { get; set; }` (:220) y `public int Confirmado { get; set; } = 1;` (:222). No tienen otros usos (en el proyecto, `.Confirmado` solo aparece en SCW:287 y `Fecha` no tiene usos; comprobar con grep antes de borrar).
  4. OM: borrar :770-775 (`ApellidoP = …`, `ApellidoM = …`, `Nombre = …`, `FechaNacimiento = null,`, `Rfc = "",`, `Sexo = "",`) y :790 (`EstadoCivil = "",`).
- **No tocar.** `Articulo = ""` (OM:791), literal de LCM:170. No se borran propiedades de `SolicitudCreditoInsertRequest`. Fuera de alcance: `Namemiddle` (P6) y MAYÚSCULAS (P5).
- **Antes de editar:** confirmar que `ArmarFila` sigue en SCW:236-310 y que las líneas citadas dicen lo esperado (si el código cambió, manda el código y se reporta).
- **Aceptación.** (1) V1 pasos 1 y 2. (2) En SCW: `grep -n "maestro != null\|maestro?\."` = 0; `grep -n "req\.ApellidoP\|req\.ApellidoM\|req\.Nombre\b\|req\.Rfc\|req\.Sexo\|req\.EstadoCivil\|req\.FechaNacimiento"` = 0; en el proyecto `grep -rn "\.Confirmado"` = 0. (3) Revisión: con `maestro != null`, cada asignación nueva da el mismo valor que la anterior; el diff solo quita ramas muertas y agrega la guarda. (4) SCW, SCM y OM en `w/crlf`, sin BOM. (5) E2E opcional: el payload de V2 antes y después deja las 59 columnas iguales salvo `id` y `fecha`.
- **Reglas.** G2-05, G2-06, G2-07, G2-10, G2-11, G2-14, G2-18, G2-24, G1-19 (G2-08 en parte).

#### 6.2.2 R3 — Búsquedas de la validación telefónica con el BP del maestro

- **Regla LAN.** LCM:173 pasa `@cliente = datosCliente[0]`, que es `CTE.Cliente` leído del maestro (LCM:831). El SP hace sus tres lecturas con ese `@cliente` (SPD:130, :189, :199, :207). Las lecturas previas en C# (LOM:619-620: SMS y validado) usan la cuenta cruda del pedido; esas **no** cambian.
- **Destino.** SCW:27. La fila ya guarda `maestro.Partner` en `ArmarFila`:281. Las tres lecturas que reciben el valor: SCW:391, :398, :403.
- **Cambio.** SCW:27
  - Antes: `ContextoValidacionTelefono contexto = await ConstruirContextoAsync(req.Cliente, maestro).ConfigureAwait(false);`
  - Después: `ContextoValidacionTelefono contexto = await ConstruirContextoAsync(maestro.Partner, maestro).ConfigureAwait(false);`
- **No tocar.** `ObtenerMaestroAsync(req.Cliente)` (SCW:25) sigue con la cuenta cruda, como `getClientInfo(data[0])` (LCM:137). OM:1803-1804 siguen con `sDatosPedido[36]` (cuenta cruda, OM:288), como LAN. No recortar a 9: `@cliente` es VarChar 10 por DU2 (SCW:207). Mientras `cuenta == Partner` (BP de 10 dígitos, p. ej. `<<BP_PRUEBA>>`) no cambia nada en la práctica. Borde: si BP05MA devolviera `Partner` null, `GetTelefonoValidadoAsync` da null sin llamar (SCW:484-487) y `ValidacionTelefono` sale 1 para un no prospecto.
- **Aceptación.** (1) Diff de 1 línea en SCW con CRLF. (2) Las tres lecturas (:391, :398, :403) reciben el mismo valor que se guarda en `cliente` (:281). (3) V1. (4) E2E con V2, caso "BP con teléfono validado y fila SMS": `ValidacionTelefono` es el esperado.
- **Reglas.** G3-18, G2-24.

#### 6.2.3 R1 — Número a validar como LAN: `Length > 0`, sin `Trim` (G3-08)

- **Regla LAN.** LOM:619-620 leen `numeroDelSms` y `numeroValidado` con la cuenta cruda. LOM:642 pasa `(numeroDelSms.Length > 0) ? numeroDelSms : numeroValidado`, y LCM:145 hace `telAux = numeroDelSms.Length > 0 ? numeroDelSms : datosped[21]`, con `datosped[21] = ValidateOnlyNumbers(telefono)` (LOM:414; LCM:113). `IsValidated` (LOM:786-817) devuelve `CONCAT(Lada,Telefono)` **sin Trim**, o `''` si no hay o si falla. Con `Length > 0`, una cadena de solo espacios **sí** cuenta.
- **Destino.** OM `IsValidatedAsync`:621-633 (línea :626; único llamador :1804) y OM `ProcessCreditPaymentAsync`:654.
- **Cambio.**
  - OM:626 — Antes: `return telefono?.Trim() ?? "";` — Después: `return telefono ?? "";`
  - OM:654 — Antes: `var telAux = !string.IsNullOrWhiteSpace(numeroDelSms) ? numeroDelSms : (!string.IsNullOrWhiteSpace(numeroValidado) ? numeroValidado : ValidateOnlyNumbers(order.infoCliente?.telefono ?? "0"));`
  - OM:654 — Después: `var telAux = !string.IsNullOrEmpty(numeroDelSms) ? numeroDelSms : (!string.IsNullOrEmpty(numeroValidado) ? numeroValidado : ValidateOnlyNumbers(order.infoCliente?.telefono ?? "0"));`
- **No tocar.** El `?? "0"` (compuerta P1); OM:655-657 (teléfono corto: P1); el `Trim` de `GetValidatedPhoneNumberAsync` en el `CreditMethods.cs` de ServicioSAP (:355-359, usado por `getSms` en :279): es otro flujo.
- **Aceptación.** (1) Diff en OM de exactamente 2 líneas (:626 y :654), con CRLF. (2) `grep -n "IsNullOrWhiteSpace(numeroDelSms)\|IsNullOrWhiteSpace(numeroValidado)"` en OM = 0. (3) Tabla (sms, validado, telefono) → telAux: (`''`, `''`, `'33 1234 5678'`) → `'3312345678'`; (`'8112345678'`, `'5512345678'`, x) → `'8112345678'`; (`' '`, `'5512345678'`, x) → `' '` (antes `'5512345678'`; luego cae en la compuerta de teléfono corto de P1, como LAN); (`''`, `' 5512345678'`, x) → `' 5512345678'` sin recortar; (`''`, `''`, null) → `'0'` (sin cambio; P1). (4) V1.
- **Reglas.** G3-08 (DIF → EQ), G3-03, G3-04; CAMBIOS §4.2 filas 55-56.

#### 6.2.4 T1a — Aviso a Magento y logs del liberador con paridad LAN (hoy sin llamador)

- **Por qué es LISTO.** El método no tiene llamador hasta T1b: en ejecución no cambia nada. Hoy manda `{entity_id, status, customer_account, credit_request_id}` (OM:1251-1257) y el DMZ espera `CreditAuthorizationRequest {entityId, status, cuenta, int idSolicitud}` (DMZ Models/CreditRequest.cs:212-218). Además usa un handler que acepta cualquier certificado (OM:1217-1218, usado en :1225), que LAN creaba pero no usaba.
- **Regla LAN.** LOM:1751-1833 `CallMagentoAuthorizationCallback`: URLs `URL_DMZ + "login/authenticate"` y `+ "order/authorizationResult"` (:1754-1755); `USER_DMZ` con `JsonConvert.DeserializeAnonymousType {Username, Password}` (:1757-1760); 3 intentos (:1762); el handler se crea (:1766) pero `new HttpClient()` va **sin** handler (:1775); TLS 1.2/1.1/1.0 (:1771-1773); timeout 30 s (:1777); log `[n] Token OK` (:1796-1797); Bearer (:1800-1801); payload `JsonConvert.SerializeObject(new { entityId, status, cuenta, idSolicitud })` (:1803); log `dmz=` y `body=` (:1813-1814); éxito → `return` (:1816); falla → `Logger.SetOrder("ERROR CallMagentoCallback [n/3]", … Inner … Inner2)` (:1823-1824) y `Sleep(2000*attempt)` (:1826-1827); tras 3 fallos, `ERROR CallMagentoCallback DEFINITIVO` (:1831-1832). LLIB:81-84, :89-92 y :98 escriben a archivo con `Logger.LiberadorCredito("Info [id] " / "Error [id] ")`.
- **Destino.** OM `CallMagentoAuthorizationCallbackAsync`:1194-1282 (URLs :1197-1199; `USER_DMZ` :1202-1211 con `JsonSerializer.Deserialize<object>` en :1206 y respaldo vacío en :1210; `for` :1213; handler :1217-1218; TLS :1220-1223; `new HttpClient(handler)` :1225; Timeout :1227; login :1230-1233; `Console.WriteLine` :1244, :1267, :1276; Bearer :1247-1248; payload :1251-1257, serializado en :1259-1262; `Task.Delay` :1278-1279; falta el log DEFINITIVO antes de :1282). LIB `LiberarCliente`:48-107 (`Console.WriteLine` :54, :94, :98, :104; LIB ya importa Newtonsoft en :1). OM `LiberateClientCredit`:1177-1189 (`Console` :1186).
- **Cambio.**
  1. **Payload** (OM:1250-1262): reemplazar el anónimo snake_case y `JsonSerializer.Serialize` por
     ```csharp
     string payload = Newtonsoft.Json.JsonConvert.SerializeObject(new { entityId, status, cuenta, idSolicitud });
     var content = new StringContent(payload, Encoding.UTF8, "application/json");
     ```
     Nombre completo `Newtonsoft.Json.JsonConvert`, como el precedente OM:2621 (también OM:1117). **No** agregar `using Newtonsoft.Json;`: OM:24 importa `System.Text.Json` y `JsonSerializer` quedaría ambiguo.
  2. **Transporte:** borrar OM:1217-1218 (handler) y dejar OM:1225 como `using (var client = new HttpClient())`, igual que LOM:1775. Se conservan el `ServicePointManager` TLS (OM:1220-1223) y el timeout de 30 s.
  3. **USER_DMZ** (OM:1202-1211 y :1231): si la llave trae valor, `var userDmz = Newtonsoft.Json.JsonConvert.DeserializeAnonymousType(userDmzConfig, new { Username = "", Password = "" });` y el login con `Newtonsoft.Json.JsonConvert.SerializeObject(userDmz)` (LOM:1757-1760). Se conserva el respaldo actual de credenciales vacías cuando falta la llave, anotado como diferencia (LAN lanzaba `ArgumentNullException`). **Nunca** se registran `USER_DMZ` ni el token.
  4. **Logs** (OM:1244, :1267, :1276 y después del `for`): `Console.WriteLine` → `ServicioSap.Helpers.Logger.SAP` con las etiquetas de LAN:
     ```csharp
     ServicioSap.Helpers.Logger.SAP("CallMagentoCallback ", $"[{attempt}] Token OK — entityId={entityId} status={status}");
     ServicioSap.Helpers.Logger.SAP("CallMagentoCallback ", $"[{attempt}] entityId={entityId} status={status} dmz={response.StatusCode} body={body}");
     ServicioSap.Helpers.Logger.SAP($"ERROR CallMagentoCallback [{attempt}/3] ", $"entityId={entityId} {ex.GetType().Name}: {ex.Message} | Inner: {ex.InnerException?.Message} | Inner2: {ex.InnerException?.InnerException?.Message}");
     // al salir del for, antes de :1282:
     ServicioSap.Helpers.Logger.SAP("ERROR CallMagentoCallback DEFINITIVO ", $"entityId={entityId} status={status} — 3 intentos fallidos");
     ```
  5. **LIB** (`Console.WriteLine` → `ServicioSap.Helpers.Logger.SAP`, como `Logger.LiberadorCredito` de LAN): :94 → `($"LiberadorCredito Info [{id}] ", $"{cliente} EN_ANALISIS (Pedido creado idVenta={result.idVenta}, esperando Liberado)")`; :98 → `($"LiberadorCredito Info [{id}] ", $"{cliente} EN_ANALISIS idVenta=0")`; :104 → `($"LiberadorCredito Error [{id}] ", $"{ex.GetType().Name} - {ex.Message}")`; :54 → `("LiberadorCredito Error ", "Faltan appSettings del liberador")` (solo nombres, nunca valores).
  6. OM:1186: `Console` → `ServicioSap.Helpers.Logger.SAP("ERROR LiberateClientCredit ", ex.Message);`
- **No tocar.** `CallSetCAccountCallbackAsync` (OM:1287+): tiene el mismo handler (:1308-1309) pero queda fuera; solo se reporta.
- **Aceptación.** (1) V1 paso 1 sin `: error `. (2) **Corrección 2026-09-30:** `grep -n 'entity_id\|customer_account\|credit_request_id'` restringido a OM:1194-1285 = 0; en todo OM el único resultado que queda es OM:510 (el INSERT de `openpay_stores`, ajeno a T1a). En OM:1194-1285 no quedan `HttpClientHandler` ni `Console.WriteLine`; LIB no tiene `Console.WriteLine`. (3) Revisión de forma: `JsonConvert` serializa `new { entityId="1", status="EN_ANALISIS", cuenta="X", idSolicitud=5 }` como `{"entityId":"1","status":"EN_ANALISIS","cuenta":"X","idSolicitud":5}`. (4) `git ls-files --eol` = `w/crlf` en OM y LIB; `git diff --stat` solo muestra estos rangos. Sin commit. (5) La prueba en ejecución llega con T1b/V4.
- **Reglas.** G5-10, G5-11, G5-12, G5-20.

### 6.3 Tareas DECISION

> [!question] Cuestionario para el usuario — se manda en un solo mensaje al final de S1
> | # | Pregunta | Recomendación (decisión final) |
> |---|---|---|
> | R2 | Con un error real (no "no encontrado") en una lectura de teléfono, LAN no escribía fila y ServicioSAP tampoco. ¿Se deja así (A)? Y el atajo de SCW:393-396: ¿se registra como diferencia aceptada (i) o se quita para que las tres lecturas corran siempre (ii)? | A + (i), después de R2-V |
> | P1 | ¿Se copian las compuertas "sin fila" de LAN? Por grupo: G-a, G-b, G-c, G-d, G-e | A1 + A3 + A4 + A5; G-b no; A-d1; A-e1 |
> | P2 | Condición sin equivalente: ¿DU5 (escribir SEGU00001 y seguir) o Q5 (cortar antes)? | A (DU5) |
> | P3 | Cupón del promotor: ¿quitar la quema (A), quitar todo (B) o portar `Elimina` (C)? ¿Alguien lee `SIGMavi.VentasCupones`? ¿Qué pasa con `credit/codigoPromocion` en Magento? | A si nadie lo lee; si no, C |
> | P4 | ¿DIMAS MX está deprecado? | A |
> | P5 | ¿MAYÚSCULAS en apellidos, nombre, rfc, sexo, estadoCivil y entreCalles del BP? (antes, 3 SELECT) | C (por campo, según historial) |
> | P6 | ¿`nombre = NameFirst + ' ' + Namemiddle`? | A, tras captura |
> | P7 | ¿Qué fila de SD29 es la de crédito web (Sucursal, Vigente, CDistr)? | Captura; C si quedan varias |
> | P8 | (b) ¿varias filas por SKU? (c) ¿`costo` NULL? (d) ¿precisión float de SEGU00001? — (a) ya está decidida (SD29, 2026-09-11) | b según historial; c1; d1 si FLOAT |
> | P9 | ¿Se confirma R7/09-26 (sin staging) para crédito? | A |
> | P10 | ¿Se activa ya TELEFONIA (Q17)? | A (diferir) |
> | P11 | ¿Se conserva la herramienta de reproceso? | A (retirar) |
> | P12 | ¿Qué contrato HTTP devuelve el crédito? | A (R4/09-26) |
> | P13 | Logs: tu regla del 2026-09-24 ("no hay logs que LAN no tenga") y la del 2026-09-25 ("todo error visible con log + excepción") chocan. ¿Cuáles se quitan y cuáles de LAN se agregan? | D |
> | P14 | ¿`Marst` vacío al crear el BP? | A si BP01 lo acepta; si no, B |
> | P15 | ¿SIGMavi por DLL o por `Web.config`? | A en crédito; B aparte |
> | P16 | ¿Prospecto = `ZtipoCliente 'Prospecto'` (en lugar del prefijo `P` del SP)? | A (sí) |
> | P17 | El 2026-09-11 dijiste que el crédito disponible "sí debe frenar". No hay fuente (`ZlimCred` llega en 0). ¿Paridad LAN (no frena) hasta tener fuente? | A |
> | P18 | ¿`05 M MA/VIU P DIF` se vende a crédito web? Si sí, ¿cuál es su código SD29? | A hasta saberlo |
> | P19 | ¿El liberador (hoy `WebClient` síncrono) se llama tal cual dentro de la tarea de fondo de T1b? | A |
> | P20 | ¿Ratificas E5 (4 métodos nuevos y un log) tal como está? | A |
> | U1 | ¿Se acepta el interruptor `CREDITO_LIBERADOR_ACTIVO` (no existe en LAN)? | Sí, en `false` |
> | U2 | ¿Se acepta que con `codigo_promotor` null sí se dispare el liberador (G5-26)? | Sí |
> | T2c | Duplicados del reenvío: ¿por `idMagento` (A) o por carrito (B)? | B |

**Cómo se cierra cada DECISION:**
1. El usuario contesta en el chat. Solo esa respuesta autoriza la opción, con los métodos, parámetros o constantes que la opción nombra (GUIA §1.9b).
2. Se implementa la opción tal como está escrita; replicar, no mejorar.
3. Opciones sin código (solo documentación): R2-A, R2-b (i), P1-B, P2-C, P4-A, P5-B, P6-B, P7-A, P8 (b2, c2, d2 = lo actual), P9-A, P10-A, P11-A, P12-A, P13-B, P14-B, P15-A, P16-A, P17-A, P18-A, P19-A, P20-A.
4. Al cerrar: se registra como DU11, DU12… en §4.5 de este documento y en CAMBIOS §2; se actualiza el estado en §3 de este documento y en MATRIZ §3; las columnas afectadas en CAMBIOS §4.2; el tablero §6.1.

#### 6.3.1 R2 — Errores en las búsquedas de teléfono (reescrita con el resultado de R2-V)

- **Pregunta.** Cuando una lectura de la validación telefónica **falla de verdad** (no responde, no-2xx, error SQL, falta `URL_BP_API`), ¿se deja sin fila como LAN, o se toma como "no encontrado" (NULL) y se inserta?
- **Regla LAN.** En SPD, un SELECT sin filas deja la variable NULL y el SP inserta igual (SPD:164-166, :210-221, :223). El SP no tiene TRY/CATCH ni transacción: si una lectura falla (linked server caído), sube la `SqlException`, LAN la atrapa en LCM:246-252, registra `ERROR` y devuelve `err`: sin fila, sin líneas, sin cupón, sin liberador; `SetPedido` igual responde la cuenta (LOM:624, :649). El `@ValidacionTelefono` que LAN calcula en C# (`IsInTableStd`, LCM:185, :1967-1989) lo pisa el SP (SPD:210-221): no se replica. **Regla: no encontrado → NULL e inserta; error → sin fila.**
- **Resultado R2-V (verificado en código el 2026-09-30):**
  - `A_GET_TelefonoValidado` (businesspartner-dev `apps/api/routes/A_GET_TelefonoValidado.py:17-36`): sin teléfonos responde 200 `[{"ZtelCte":null,"ZvalTel":0}]` (.py:22-28); si SAP falla responde **500** (`AS_GET_ZQBP_EditarCliente_CteTel.py:55-67`), no lo disfraza de "no encontrado". En SCW (`GetTelefonoValidadoAsync`:482-525): cliente en blanco → null sin llamar (:484-487); falta `URL_BP_API` → throw (:491-494); no-2xx → throw (:503-507); cuerpo vacío o `[]` → null (:509-519); `ZvalTel` 0/false → null (:521-523).
  - CteTelSet (`GetCteTelAsync`:408-447, misma base que BP05MA: SCW:417-419 y BPM:301): no-2xx o cuerpo vacío → throw (:431-435); XML/HTML → throw (:437-440); `results []` → lista vacía → `ValidacionOrigen` null (:444, :451-454). Catálogo AWS (PM:708-735): no-2xx o vacío → throw; `[]` → null (SCW:456-459).
  - TcAAEA00030 (`ObtenerTelefonoAValidarAsync`:335-372): sin fila → null (:357-360); error SQL → log `[CREDIT ObtenerTelefonoAValidar ERROR]` (:368) y throw (:370). La lectura de OM (`ObtenerNumeroTablaSmsAsync`:589-613) da `''` en los dos casos, como LAN (LOM:819-852).
  - **Conclusión:** "no encontrado" ya da NULL como el SP y un error real ya lanza antes del INSERT (sin fila), como el SP + `err` de LAN. Solo difieren el cuerpo HTTP (P12: LAN respondía la cuenta; ServicioSAP 200 `Error, Error en SetOrder: …`, OM:725-729 → OM:1956-1960 → OC:37-46) y el log de SCW:368 (P13).
- **Diferencia nueva (G3-20):** `ConstruirContextoAsync` regresa antes cuando `TelefonoValidado` es null (SCW:393-396) y no llama CteTelSet (:398), catálogo (:400) ni SMS (:403). El SP siempre hacía las tres lecturas (en otro orden: origen → validado → SMS). Con lecturas correctas el valor es el mismo (`@TelefonoValidado IS NULL` ya hace verdadero el IF, SPD:210-216; ServicioSAP da `EsProspecto ? 0 : 1`, SCW:327-330). Solo cambia en error: sin teléfono validado, una falla de esas tres lecturas abortaba el SP (sin fila) y ServicioSAP escribe la fila (más permisivo que LAN, GUIA §1.9). El corte viene de PLAN §15.4 (PLAN:1175-1188).
- **Opción A (recomendada, paridad exacta).** Sin cambio de código. Tras R2-V, G3-19 se cierra como EQ ("no encontrado = NULL; error = sin fila").
- **Opción B (rechazada: va más allá de LAN).** Envolver cada llamada de `ConstruirContextoAsync` en un `try/catch` que deje null. Escondería un CteTelSet mal configurado y dejaría en silencio `ValidacionTelefono = 1` para todo BP no prospecto.
- **Sub-decisión R2-b** (atajo): **(i)** registrar como diferencia aceptada (recomendada: mismo valor siempre que las lecturas salen bien); **(ii)** quitar el `return` de SCW:393-396 para que las tres lecturas corran siempre (port literal; más llamadas y más puntos de falla). Cambio de (ii): borrar SCW:393-396; nada más.
- **R2-V (VERIFICACION, la corre el usuario; pega el JSON sin credenciales en CAP).** Ya no se plantea por puertos (el usuario, 2026-09-23: un puerto de captura nunca es arquitectura; solo `obtenerUrl` decide, PLAN:1098-1108). Es la evidencia E2E de la regla 25, porque la llamada directa de ServicioSAP a CteTelSet nunca se ha capturado:
  1. `GET {SERVICE_URL}/ZQBP_EDITARCLIENTE_SRV/CteTelSet?$filter=Partner eq '<<BP_CON_TEL_VALIDADO>>'&sap-client=110&$format=json` con la base que resuelve `obtenerUrl` (la misma de BP05MA). Esperado: 200 JSON con `d.results`.
  2. El mismo GET con `<<BP_SIN_TELEFONOS>>`. Esperado: 200 con `results []`.
  3. `GET {URL_BP_API}/A_GET_TelefonoValidado?sCliente=<<BP_SIN_TELEFONOS>>`. Esperado: 200 `[{"ZtelCte":null,"ZvalTel":0}]`.
  4. Un BP con móvil validado cuyo `ZappOrig` sea uno de los 23 `Valor1` (DU3), y `GET AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=ORIGEN VALIDACION NUMERO CTE` → 23 filas. Esperado: `ValidacionOrigen` no null.
  5. Anotar el resultado en CAP.
- **Reglas.** G3-16, G3-19, G3-20, G2-39.

#### 6.3.2 P1 — Compuertas "sin fila" de LAN

- **Pregunta.** En los casos G-a a G-e LAN no escribía fila y ServicioSAP sí (con `''`, `'0'`, 0 o `1900-01-02`). ¿Se copian (ServicioSAP lanza antes del INSERT) o se aceptan las filas? Por grupo.
- **Depende de.** P12 (cuerpo de cada compuerta); R1 antes de A3; P2 (misma zona, juntas); P13.
- **Regla LAN** (respuesta de LAN entre paréntesis):
  - **G-a1** `infoCliente`, `telefono` o `telefonoClienteMavi` null: `ToArray` LOM:346, :414, :423 → `ValidateOnlyNumbers(null)` truena en LOM:444-445, fuera del try → LOC:154-157 (200 `e.ToString()`); sin guía.
  - **G-a2** `forzarOrder` null: LOM:562 fuera del try → LOC:154-157.
  - **G-a3** `incrementId` null: LOM:582 → `detallePedido` LOM:1006 `.Trim()`; su catch solo atrapa `SqlException` (LOM:1072) → catch de `SetPedido` LOM:728-732 (200 `''`).
  - **G-a4** `storeId` null: LOM:971 `.Trim()` (`''`).
  - **G-a5** `articulos` vacío: `float.Parse('')` (LOM:579-588) (`''`).
  - **G-a6** con al menos una partida de precio > 0 y cantidad > 0: `entityId` null (LOM:599) o `codigoPostal` null (LOM:1027) (`''`).
  - **G-a7** `apellidoPaternoClienteMavi`, `apellidoMaternoClienteMavi` o `nombreClienteMavi` null: LOM:603-605 (`''`).
  - **G-b** `SaveGuide` lanza (SQLite) en LOM:606 → LOM:728-732 (`''`).
  - **G-c** teléfono: `Substring` truena si `Length < 2`, o `< 3` cuando los 2 primeros dígitos no son 33/55/81 (LCM:139-148); lada no convertible a INT truena en el SP (`@LadaValidar INT`, SPD:155; LCM:187). Catch LCM:246-252 → `err`; `SetPedido` responde la cuenta; la guía **sí** quedó escrita.
  - **G-d** `CTE.FechaNacimiento` NULL: LCM:835 → catch LCM:860-865 → `datosCliente[4]` LCM:156 → `err` (guía escrita).
  - **G-e** texto en cantidad/descuento (LOM:495-496), en precio (LOM:590-596) o en total (LCM:126).
  - **Residual** `codigoPostal` null **sin** partida válida: LAN escribe la cabecera (`codigo_postal` NULL, SPD:108) y truena la 1ª línea (`@Cp` null no se manda, LCM:878, :912) → sin líneas ni cupón.
- **Alcanzable desde Magento** (MOM:653-753): `articulos` vacío (MOM:683), `codigoPostal` null (MOM:735), `nombreClienteMavi` o `apellidoPaterno` null (MOM:744-745), teléfono corto (MOM:731-733). Inalcanzables: `telefono`/`telefonoClienteMavi` null, `forzarOrder`, `incrementId`, `storeId`, `entityId`, `apellidoMaterno` (`?? ''`), G-e.
- **Destino.** OM `SetOrderAsync`:1791-1793; `SaveGuideAsync`:533-553 (traga en :548-552); `ProcessCreditPaymentAsync`:652-657 y :665; `CrearSolicitudCreditoAsync`:757-758, :761-766, :785, :799; `InsertCreditArticlesAsync`:827-836; SCW `ArmarFila`:244. Hoy `ToArray` y `ConstruirNombreClienteMavi` (OM:407-413) convierten null en `''`.
- **Opción A — paridad exacta:**
  - **A1 (G-a).** Método nuevo en OM, junto a `ProcessCreditPaymentAsync`: `private void ValidarCompuertasSinFilaCredito(OrderRequest order)`, llamado como primera instrucción dentro de `if (orderRequest.metodoPago == CREDIT_METHOD)` (OM:1791, antes de `SaveGuideAsync` :1793):
    ```csharp
    var info = order.infoCliente;
    if (info == null) throw new Exception("Compuerta LAN: infoCliente null");
    if (info.telefono == null) throw new Exception("Compuerta LAN: telefono null");
    if (info.telefonoClienteMavi == null) throw new Exception("Compuerta LAN: telefonoClienteMavi null");
    if (order.forzarOrder == null) throw new Exception("Compuerta LAN: forzarOrder null");
    if (order.incrementId == null) throw new Exception("Compuerta LAN: incrementId null");
    if (order.storeId == null) throw new Exception("Compuerta LAN: storeId null");
    if (order.articulos.Count == 0) throw new Exception("Compuerta LAN: articulos vacio");
    bool hayPartida = order.articulos.Any(a => (a.precioEspecial == 0 ? a.precio : a.precioEspecial) > 0 && a.cantidad > 0);
    if (hayPartida && order.entityId == null) throw new Exception("Compuerta LAN: entityId null");
    if (hayPartida && info.codigoPostal == null) throw new Exception("Compuerta LAN: codigoPostal null");
    if (info.apellidoPaternoClienteMavi == null || info.apellidoMaternoClienteMavi == null || info.nombreClienteMavi == null) throw new Exception("Compuerta LAN: nombre null");
    ```
  - **A2 (G-b).** OM:1793 → `if (!await SaveGuideAsync(…)) throw new Exception("Compuerta LAN: SaveGuide fallo");` (revierte R5/09-26).
  - **A3 (G-c = Q10 A).** En `ProcessCreditPaymentAsync`, reemplazar OM:653-657 (después de la compuerta "sin cuenta" :646-650): `telPedido = ValidateOnlyNumbers(order.infoCliente.telefono)`; si `telPedido.Length < 2`, o `< 3` cuando `telPedido.Substring(0, 2)` no está en {33, 55, 81} → `throw new Exception("Compuerta LAN: telefono invalido")`; `telAux` = SMS si `Length > 0`, si no el validado si `Length > 0`, si no `telPedido` (con R1); la misma verificación sobre `telAux`; `ladaValidar = telAux.Substring(0, largo)`, `telefonoValidar = telAux.Substring(largo)` (LCM:146-148). En `CrearSolicitudCreditoAsync` OM:757-758: `if (!int.TryParse(ladaValidar, out lada)) throw new Exception("Compuerta LAN: lada no numerica");` (LCM:187 → SPD:155).
  - **A4 (residual).** OM:665 sin `?? ""`; en `InsertCreditArticlesAsync` después de OM:836: `if (codigoPostal == null) throw new Exception("Compuerta LAN: codigoPostal null en lineas");` (lo atrapa OM:677-683: cabecera sin líneas ni cupón, como LAN); OM:785 → `CodigoPostal = info.codigoPostal,`.
  - **A5.** OM:799 → `IdMagento = order.incrementId,` (DU5).
  - **G-d.** A-d1: mantener Q11 sin compuerta. A-d2: en `ArmarFila` antes de :244, `if (FechaSap(maestro.Birthdt) == null) throw new Exception("Compuerta LAN: BP sin fecha de nacimiento");`. Relacionado: G2-40 (formato `/Date(-62135596800000)/`).
  - **G-e.** A-e1: inalcanzable por el modelo tipado (OrderRequest.cs:13, ArticuloRequest.cs:7-13). A-e2: en `OC.SetOrder`, con `metodoPago == "omnipro_pago_credito"`, responder el error si `ModelState` tiene errores en `total` o en los campos numéricos de `articulos`.
- **Opción B — aceptar las filas.** Sin código; G1-07, G1-08, G1-18, G1-20, G1-25, G2-23, G2-29, G3-09 y G5-17 pasan a EQ-R por decisión.
- **Opción C — solo lo alcanzable desde Magento.** A1 (artículos, CP, nombres) + A3 + A4 + A5; B para G-b y G-e.
- **Respuesta HTTP.** La define P12 (hoy 200 `Error, Error en SetOrder: Compuerta LAN: …`).
- **Decisión final del plan:** **A con A1 + A3 + A4 + A5, G-b sin compuerta (R5/09-26), A-d1 y A-e1.** Razón de A-d1: los BP que crea ServicioSAP desde una orden no llevan `Birthdt` (`BuildBpClientFromOrder` OM:2635-2957, sin `Birthdt`) y su equivalente de LAN, el CTE web, tenía `1900-01-02` (CTN:140) y sí tenía fila.
- **Aceptación.** V1 y CRLF. Con visto bueno para escribir en ServicioAndroid: POST de crédito con un BP existente y, un caso por petición, `nombreClienteMavi` null, `codigoPostal` null (con partida de precio > 0), `articulos []` y `telefono '5'` → `SELECT COUNT(*) FROM CRED_SOLICITUD_WEB_DATOS_TEMP WHERE idMagento = '<incrementId>'` = 0. En los casos G-a no hay guía SQLite; en G-c sí (como LAN). El caso positivo escribe 1 fila con los mismos 59 valores que antes.
- **Reglas.** G1-05, G1-07, G1-08, G1-18, G1-19, G1-20, G1-25, G2-10, G2-16, G2-23, G2-26, G2-29, G3-09, G5-04, G5-17.

#### 6.3.3 P2 — Condición sin equivalente: corte temprano (Q5) contra paridad de valores (DU5)

- **Pregunta.** Q5 (2026-09-26) dice "sin condición → cortar al inicio"; DU5 (2026-09-28) dice paridad de valores. Con una condición sin equivalente, LAN sí escribía cabecera + SEGU00001, quemaba el cupón y lanzaba el liberador. ¿Cuál gana?
- **Regla LAN.** LOM:632 pasa la condición sin validar (`getCondicion` comentado, LCM:110-111) a la cabecera (LCM:172) y a cada línea (LCM:910). SPL:258-262 hace el JOIN por condición: sin equivalente, cada artículo inserta 0 filas pero consume su `Orden` (LCM:911, :915); SEGU00001 sí se inserta (SPL:179-217 no usa la condición); luego cupón (LCM:203-206) y liberador (LCM:208-241); responde la cuenta. Con `condicion` null: `@Condicion` null no se manda → `SqlException` en la 1ª línea → `err`: cabecera con `condicion` NULL, 0 líneas, sin SEGU00001, sin cupón ni liberador.
- **Destino.** OM:666 (`condicion ?? ""`); `InsertCreditArticlesAsync`:845 (`GetCondicionAsync`), :847-850 (throw antes del ciclo), rama no-SEGU :910-950 (hueco `orden++` :946-950); `SetOrderAsync`:1747-1758 (sitio de B); `GetCondicionAsync`:3331-3363.
- **Opción A — DU5 (paridad LAN):** OM:666 → `string condicion = order.articulos?.FirstOrDefault()?.condicion;`; antes de OM:845 `if (condicion == null) throw new Exception("Condicion null");` (la atrapa OM:677-683); OM:847-850: quitar el throw y dejar `bool condicionSinEquivalente = string.IsNullOrWhiteSpace(condicionSap);`; en la rama no-SEGU, después de fijar la cantidad (OM:912) y antes de OM:916: `if (condicionSinEquivalente) { orden++; continue; }`. SEGU00001 (OM:904-909) se inserta; siguen cupón (según P3) y liberador (T1).
- **Opción B — Q5 (corte temprano):** bloque en `SetOrderAsync` después de `ToArray` (OM:1747) y antes de SD36 (OM:1758), solo con crédito: condición null o vacía → throw; `condicionSap = await GetCondicionAsync(condicion, orderRequest.storeId, "")`; vacía → throw. Parámetro nuevo `string condicionSap` en `ProcessCreditPaymentAsync` (OM:638) y en `InsertCreditArticlesAsync` (OM:827); borrar OM:845-850. Sin guía ni fila; 200 `Error, …`.
- **Opción C — dejar como está:** cabecera sin líneas (ni SEGU00001) y sin cupón, `Concluido`.
- **Decisión final del plan:** **A.**
- **Aceptación.** V1. Con visto bueno: `condicion '99 M MA P NOEX'`, 2 SKU y `costoEnvio 150` → en `VTASdArtCreditoWeb` 1 sola fila `SEGU00001`, cantidad 1, precio 150, Abono 12, `Orden 3`; respuesta `Concluido`. `condicion` null → cabecera con NULL y 0 líneas. Condición válida → las mismas líneas que hoy.
- **Reglas.** G4-24, G2-22, G1-14, G4-11, G4-23; G4-40 (P18) cae en este mismo camino.

#### 6.3.4 P3 — Cupón del promotor en el crédito (Q8)

- **Pregunta.** El usuario dijo el 2026-09-26 que los cupones de promotor están deprecados, sin elegir opción. ¿Se quita la quema del crédito (A), toda la funcionalidad (B) o se porta `Elimina` literal (C)? Antes de A o B: ¿algún proceso de comisiones o reporte lee `SIGMavi.VentasCupones` (`IdEcommerce`, `FechaUtilizacion`)?
- **Contexto que la pregunta debe mencionar:** el CSV fila 7 aún tiene `credit/codigoPromocion` como "To Do, Requiere desarrollo" (Javier) y CHECKLIST_DEV1:27 planea el wrapper de SuccessFactors; si el DMZ apunta `URL_INTELISIS` a ServicioSAP, `credit/codigoPromocion` no tiene ruta allí y la casilla de promotor de Magento (que espera un `OK` exacto) se rompe (PLAN:2256).
- **Regla LAN.** LCM:203-206: si `data[6].Length > 0` → `CodigoPromocion(código, 'Elimina', incrementId)` → `SpVTASVentaCupon` en IntelisisTmp. `Elimina` (SCU:115-136): `UPDATE TOP (1)` de la fila libre más reciente (`WHERE Codigo = @codigo AND FechaUtilizacion IS NULL ORDER BY IdVentaCupon DESC`, `@codigo` VARCHAR(30)) con `FechaUtilizacion = GETDATE()` e `IdEcommerce` (VARCHAR(20)); luego **siempre** `NUEVO` (SCU:137-165): `Sucursal` por Agente ⋈ Sucursal (NULL si no hay) e INSERT (`Codigo = Agente = @Agente` VARCHAR(10), `FechaEnvio = GETDATE()`, `Cliente` NULL). Sin validación previa; errores → `err` y el flujo sigue (LCM:424-428). DU9: `SIGMavi.VentasCupones` es la misma tabla renombrada (`Cliente` → `BP`, `Sucursal` → `Centro`).
- **Destino.** OM:671-675 (llamada); `HandlePromoCodeAsync` OM:1030-1172 (validación previa :1037-1085; rama `Elimina` :1092-1163 con UPDATE sin TOP :1097, `AS_GET_ZQBP_AGENTE` :1107-1124 con throw si falta `URL_BP_API` en :1109, después del UPDATE; `GetSucursalAsync` :1126-1142; INSERT :1144-1160); OC `ValidateCupon`:102-120; `Models/SAP/Order/CouponModels.cs` (csproj:394, sin uso).
- **Opción A — quitar solo la quema.** Borrar OM:671-675; conservar el `try/catch` de líneas OM:667-683. `HandlePromoCodeAsync` queda para `validatecupon` (OC:113).
- **Opción B — A + borrar la funcionalidad:** `HandlePromoCodeAsync`, la ruta `order/validatecupon` (OC:102-120) y `CouponModels.cs` con su línea del csproj (:394), solo cuando Magento retire la casilla.
- **Opción C — port literal:** OM:671-672 → `string codigoPromotor = order.infoCliente?.codigo_promotor; if (codigoPromotor != null && codigoPromotor.Length > 0)`; con `operacion == "Elimina"`, sin la validación de OM:1037-1085: (1) sucursal primero (`AS_GET_ZQBP_AGENTE` → `Werks` → `GetSucursalAsync`; error, `URL_BP_API` vacía o sin fila → `Centro` NULL, sin throw); (2) un solo lote en SIGMavi:
  ```sql
  WITH Cupon AS (SELECT TOP (1) * FROM VentasCupones WITH(NOLOCK) WHERE Codigo = @Codigo AND FechaUtilizacion IS NULL ORDER BY <IdVentaCupon> DESC)
  UPDATE Cupon SET FechaUtilizacion = GETDATE(), IdEcommerce = @IdEcommerce;
  INSERT INTO VentasCupones (Codigo, Agente, FechaEnvio, BP, Centro) VALUES (@Agente, @Agente, GETDATE(), NULL, @Centro);
  ```
  con `@Codigo VarChar 30`, `@IdEcommerce VarChar 20`, `@Agente VarChar 10` y `@Centro Int` o `DBNull` (SCU:52-54, :118-159). Requisito: nombre real de la columna identidad y anchos de `VentasCupones` (`INFORMATION_SCHEMA.COLUMNS`, lo corre el usuario).
- **Análisis previo:** `_IMPLEMENTACION_SP_CREDITO/promo_removal_2026-09-26.json` (resumido en PLAN:1934): con A no cambian el flujo, la respuesta ni la bitácora (el resultado se descartaba y los errores se tragan); el único efecto es de datos: `VentasCupones` deja de registrar el promotor de las órdenes de crédito web. No se encontró ningún lector en los repositorios; comisiones o reportes fuera de ellos no se pudieron revisar. Aquella recomendación fue "A ahora, B cuando Magento quite la casilla", y quedó esperando el visto bueno.
- **Decisión final del plan:** **A** si nadie lee `VentasCupones`; si alguien lo lee, **C**. En cualquier caso, avisar a Magento y a Javier sobre `credit/codigoPromocion`.
- **Aceptación.** V1. A: orden de crédito con `codigo_promotor` → `VentasCupones` sin cambios. C (con visto bueno): con 2 filas libres solo la de Id mayor queda quemada con `IdEcommerce = <incrementId>`, más 1 fila nueva `Codigo = Agente = LEFT(código,10)`, `BP` NULL; con 0 filas libres igual se inserta 1 nueva.
- **Reglas.** G5-06, G5-07, G5-08, G5-26, G5-27.

#### 6.3.5 P4 — DIMAS MX

- **Pregunta.** ¿DIMAS MX está deprecado? El usuario lo dijo de `CREDICCondicionArt` (PLAN:943, :2111); con DU7 una orden con `origen 'DIMAS MX'` ya llega.
- **Regla LAN.** SPD:174-183: con `@origen = 'DIMAS MX'` la **cabecera** toma `Condicion` y `Codigo` de `CREDICCondicionArt` (fila de `MAX(IdCondicionArt)`), a VARCHAR(20); las líneas siguen con la condición de Magento (LCM:910).
- **Destino.** OM:791 (`Articulo = ""`), :793 (`Condicion`), :798 (`Origen`); SCW:204, :206.
- **Opción A — cerrar como deprecado, sin código.** La fila DIMAS MX guarda la condición de Magento y `articulo ''`; MATRIZ G2-03 → N/A por decisión; CAMBIOS §4.2 filas 34 y 36 → EQ por decisión.
- **Opción B — rechazo explícito:** antes de OM:768, `if (info.origen == "DIMAS MX") throw new Exception("Origen DIMAS MX deprecado");` (se aparta de LAN).
- **Opción C — portar** la lectura de `CREDICCondicionArt` (base por confirmar) y, si hay fila, `solicitud.Condicion` y `solicitud.Articulo` antes de OM:812.
- **Decisión final del plan:** **A.**
- **Reglas.** G2-03, G2-19, G4-38.

#### 6.3.6 P5 — MAYÚSCULAS en los datos del maestro

- **Pregunta.** ¿Se guardan en MAYÚSCULAS `apellidoP`, `apellidoM`, `nombre`, `rfc`, `sexo`, `estadoCivil` y el `entreCalles` del BP, como el CTE de LAN?
- **Paso previo** (solo lectura, lo corre el usuario en ServicioAndroid):
  ```sql
  SELECT sexo, COUNT(*) FROM CRED_SOLICITUD_WEB_DATOS_TEMP GROUP BY sexo;
  SELECT estadoCivil, COUNT(*) FROM CRED_SOLICITUD_WEB_DATOS_TEMP GROUP BY estadoCivil;
  SELECT COUNT(*) FROM CRED_SOLICITUD_WEB_DATOS_TEMP WHERE apellidoP COLLATE Latin1_General_CS_AS <> UPPER(apellidoP) OR nombre COLLATE Latin1_General_CS_AS <> UPPER(nombre);
  ```
- **Regla LAN.** Los valores salían del CTE (LCM:152-158, :163, :169). Los CTE web se daban de alta en MAYÚSCULAS: nombres (CTN:116-118, :178-180), `EntreCalles` (CTN:122), `RFC` (CTN:129) y `Sexo` (CTN:132). **Pero:** el dominio de `CTE.Sexo` que dio el gerente es `Femenino`, `Masculino`, `NO ESPECIFICADO` (PLAN:1320, base de `SexoLegado`), y los clientes web creados desde una orden tenían `@SexoCte` NULL (PLAN:2159). `EstadoCivil` no lo llenaba el alta web (`''`).
- **Destino.** SCW `ArmarFila`:240-242, :245, :246, :252, :261; `SexoLegado`:578-586; `EstadoCivilLegado`:598-603.
- **Opción A — todo en mayúsculas:** `.ToUpperInvariant()` sobre NameLast, NameLst2, NameFirst (ya compuesto por P6), Stcd1 y ZentCalles; `SexoLegado` → `"MASCULINO"`/`"FEMENINO"`; `EstadoCivilLegado` → `"SOLTERO"` … `"PAREJA DE HECHO"` (Size 11 → `"PAREJA DE H"`). El `entreCalles` que manda Magento no se toca.
- **Opción B — conservar la capitalización del BP** (EQ-FUENTE con diferencia de formato aceptada).
- **Opción C — A solo en los campos cuyo historial LAN esté en mayúsculas.**
- **Decisión final del plan:** **C**, con el resultado de los 3 SELECT; `sexo` queda con el dominio del gerente salvo que el historial diga otra cosa.
- **Aceptación.** V1. BP `NameLast 'Pérez'` → `apellidoP 'PÉREZ'` en los campos elegidos; sin cambios en NULL/`''` ni en anchos.
- **Reglas.** G2-06, G2-07, G2-08, G2-11, G2-12, G2-13, G2-18.

#### 6.3.7 P6 — `nombre = NameFirst + Namemiddle` (Q19)

- **Regla LAN.** LCM:154 `@nombre = CTE.PersonalNombres` (todos los nombres de pila; LCM:834), recortado a 25 (SPD:96).
- **Destino.** SCW `ArmarFila`:242; `Namemiddle` ya está mapeado (`Models/SAP/BusinessPartner/BP05MA/BusinessPartnerMa.cs:51`); `@nombre` Size 25 (SCW:173).
- **Opción A.** SCW:242 → `fila.Nombre = string.IsNullOrWhiteSpace(maestro.Namemiddle) ? (maestro.NameFirst ?? "") : ((maestro.NameFirst ?? "") + " " + maestro.Namemiddle);` (forma posterior a R4). **Opción B.** Solo `NameFirst` (actual). **Opción C.** `PrimerNombre + SegundoNombre` de ZB_DATOS_CLIENTE (una llamada más).
- **Decisión final del plan:** **A**, después de una captura BP05MA de un cliente con dos nombres. Los BP que crea ServicioSAP no cambian (`Namemiddle ""`, OM:2671, BPM:481).
- **Reglas.** G2-08.

#### 6.3.8 P7 — SD29: filtros extra para elegir la fila de crédito

- **Pregunta.** Con `Articulo + OrgVtas + Condicion`, SD29 todavía puede traer varias filas (`CDistr` `''`/01/02/04; `Sucursal` 0504/0505 contra 0/0000; `Vigente` true/false; CAP:212-225). ¿Cuál es la fila de crédito web?
- **Paso previo.** Captura (GUIA §2.3) de `ZAPI_PROPRELIST_SRV/PropreListSet?$filter=Articulo eq '<<SKU_CREDITO>>' and OrgVtas eq '05' and Condicion eq '12IV'` para 2 o 3 SKU.
- **Regla LAN.** SPL:243-262: sin filtro de sucursal, lista, canal, vigencia ni UEN.
- **Destino.** FLP:91-96 y respaldo OM:1022-1023; OM:929-944; `FinalListProper.cs` (no mapea `Vigente`; `Branch` = Sucursal :11-12; `DitributionChannel` = CDistr :27-28; usa System.Text.Json, :1); `DeterminarPlant` OM:353-361.
- **Opción A.** Sin filtro extra (LAN no filtraba); la multiplicidad la resuelve P8. **Opción B — sucursal:** `string plantCredito = DeterminarPlant(order);` junto a OM:840 y `.Where(pr => string.Equals((pr.Branch ?? "").Trim(), plantCredito, StringComparison.Ordinal))` en OM:929-931. **Opción C — B + vigencia:** en FinalListProper.cs después de :47 `[JsonPropertyName("Vigente")] public bool? Vigente { get; set; }` (convención del archivo, System.Text.Json; excepción anotada a la regla 18 del SKILL) y `.Where(pr => pr.Vigente != false)`. **Opción D — C + `CDistr`**, con el valor que confirme SD: GUIA §1.7 documenta DistrChan 01 Contado / 02 Crédito como regla del proyecto, pero que SD29 use el mismo código en `CDistr` hay que capturarlo. Los filtros van en memoria para cubrir también el respaldo por SKU.
- **Decisión final del plan:** captura; si quedan varias filas por Sucursal o Vigente, **C**; **D** solo con evidencia de SD.
- **Aceptación.** V1. Con la captura, cada SKU de prueba queda con 1 candidato y la línea toma `Precio` y `Abono` de ese candidato (CEILING si hay descuento). Un SKU con `+` sigue encontrando precio (E5).
- **Reglas.** G4-21, G4-25.

#### 6.3.9 P8 — Líneas: varias filas por SKU, costo y precisión de SEGU00001

- **(a) Fuente del precio: CERRADA.** SD29 por SKU, decisión del usuario del 2026-09-11 (FLUJO_CREDITO:215; GUIA:281). Solo queda **Q6** como verificación: que `CondicionesCredVtaLinea` de SIGMavi traduce a los códigos de SD29 (`INFORMATION_SCHEMA.COLUMNS` + `TOP 20`, lo corre el usuario).
- **Regla LAN.** `Precio` y `Abono` de `PropreListaDFinal` (SPL:243-262), CEILING con descuento; varias filas → una línea por fila con el mismo `Orden`. `costo` = `spVerCosto` (SPL:187-206, :221-241); NULL sin método de costeo (SVC:120, :191). SEGU00001: `precio = float.Parse(costoEnvio)`, precisión simple (LCM:901), a `@SeguCost FLOAT`.
- **Destino.** OM `InsertCreditArticlesAsync`:900-909 (SEGU00001; `costoArticulo = 0m` :902), :941-967 (`FirstOrDefault`), :976-981 (`pPrecio`, `pAbono`, `pCosto` e INSERT; los tres parámetros son `SqlDbType.Float`, OM:881, :883, :884).
- **(b) Varias filas.** b1, abanico de LAN: reemplazar el `FirstOrDefault` de OM:941-944 por
  ```csharp
  var filas = candidatos.Where(pr => string.Equals(pr.Condition, condicionSap, StringComparison.OrdinalIgnoreCase)).ToList();
  if (filas.Count == 0) filas = candidatos.Where(pr => string.Equals(pr.Condition, condicion, StringComparison.OrdinalIgnoreCase)).ToList();
  if (filas.Count == 0) { orden++; continue; }
  ```
  y el INSERT (OM:976-981) una vez por fila con el mismo `Orden`, `orden++` una sola vez al final. b2: una fila (actual). Se decide con el historial: `SELECT IdArtCreditoWeb, Orden, COUNT(*) FROM VTASdArtCreditoWeb GROUP BY IdArtCreditoWeb, Orden HAVING COUNT(*) > 1`.
- **(c) costo.** c1: NULL (quitar `costoArticulo` de OM:902 y `pCosto.Value = DBNull.Value;` en OM:978). c2: 0 (actual). c3: DM01 `COSTOPROMEDIOPCP` (equivalencia sin verificar, PLAN §21.3).
- **(d) Precisión de SEGU00001.** d1: solo para SEGU00001, `pPrecio.Value = (double)(float)precioArticulo;` (149.99 → 149.990005493164). d2: exacto (actual). Solo importa si la columna es FLOAT: `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'VTASdArtCreditoWeb'`.
- **Decisión final del plan:** b según historial (b2 si no hay duplicados); **c1**; **d1** si `precio` es FLOAT, si no cerrar G4-09 como EQ.
- **Aceptación.** V1. Con visto bueno: `costoEnvio 149.99` → `precio` SEGU00001 = 149.990005493164 (si FLOAT); `costo` NULL en líneas nuevas; con b1, un SKU con 2 filas → 2 líneas con el mismo `Orden`.
- **Reglas.** G4-09, G4-20, G4-21, G4-25, G4-29 … G4-37.

#### 6.3.10 P9 — Staging `eCommerceDetPedidos`

- **Pregunta.** ¿Se confirma R7/09-26 (sin staging) para crédito, o se porta? Pregunta a Valentín: ¿el liberador lee `eCommerceDetPedidos` por `IdPedido 'CRED…'`?
- **Regla LAN.** Limpiar (LOM:582) e Insertar por partida con precio > 0 y cantidad > 0 (LOM:584-601) → `SpVTASeCommerceDetPedidos` (SDP:12-162). Lectores en LAN: `UpdateCreditOrderId` (LOM:2019-2046), `CodigoRecogerSucursal` (Metodos/StorePickup/CodigoRecogerSucursal.cs:30, :151, :531), `Provider.GetIdPedidoByOrden` (Metodos/Order/Provider.cs:112) y `PrecioIncorrecto` (SDP:164-231).
- **Evidencia a favor de A:** el 2026-09-21 Dev 2/Dev 3 confirmaron que el único lector de `idOrden` era el flujo de recoger en sucursal, que Dev 2 migró el 10-11 de septiembre sin la tabla (commits `b8f4358`, `8107ede`): "esa tabla se queda sin ningún lector" (DEV2:150-151; DEV3:218). ServicioSAP no tiene referencias a `eCommerceDetPedidos` (grep 0). La fila 119 del CSV aún dice "EcommerceDetPedidos (Pendiente de creacion)" para `createStorepickupCode`, pero desde el 2026-09-30 esa ruta figura Conectado/Generado `Si` en ServicioSAP, lo que cuadra con la migración de Dev 2 sin la tabla.
- **Opción A — confirmar R7/09-26:** sin código; G4-02 → N/A como G5-21 a G5-23; T2b no toca la tabla.
- **Opción B — portar para crédito:** método privado nuevo `DetallePedidoCreditoAsync(OrderRequest order)` junto a OM:527, llamado en la rama de crédito después de P1 y antes de `SaveGuideAsync` (OM:1793): Limpiar (`DELETE … WHERE IdPedido = @IdMag AND RefPedidoIntelisis IS NULL`) e Insertar por partida con precio > 0 y cantidad > 0 (UEN muebles_america 1, viu 2, mavi 3, otro 0; `IdPedido = incrementId.Trim()`; `idOrden = entityId.Trim()`; `RecogerEnSucursal = (metodoEnvio == "instore_pickup")`), atrapando solo `SqlException`. Bloqueo: base y nombre de la tabla en la era SAP y conexión (P15).
- **Decisión final del plan:** **A**, salvo que Valentín confirme que el liberador lee la tabla.
- **Reglas.** G4-02, G4-03, G4-04, G5-21, G5-22, G5-23.

#### 6.3.11 P10 — Sustitución TELEFONIA (Region5/Region6) (Q17)

- **Pregunta.** Q17 está diferida por el negocio. ¿Se activa ya? Si sí, hacen falta: (1) la clase SAP de TELEFONIA (`SFxxxL000`; `SF034L000` **no** es, BAJA:403-406) o su descripción exacta; (2) nombres y columnas reales en SIGMavi de las tablas de pares y CP (candidatos `RegionesArticulos` y `CodigosPostalesRegionesCelulares`, BAJA:392-393; un `SELECT TOP 1` de cada una); (3) existencia global (LAN) o solo del centro 0504/0505; (4) datos: los SKU `TELC…` de los pares no existen en DM01 DEV (BAJA:408-410).
- **Regla LAN** (SPL:43-165): solo con `Art.Familia = 'TELEFONIA'` busca el par en `VTASCRegionSku`; CP activo (`VTASCCodigoPostalRegionCelular`, `Estatus = 1`) → R5 → R6 si R6 tiene existencia; CP no activo, vacío o NULL → R6 → R5 si R5 tiene existencia; existencia global (`VTASDEcommerceExportaArtExistencia` o `eCommerceExist`); `@artRegion` se usa en costo, precio y `articulo`; SEGU00001 no.
- **Destino.** OM `InsertCreditArticlesAsync` rama no-SEGU :910-921 (`pArticulo` :897; caché y precio :916-921); PM `GetProductsBySkuAsync`:66-94 (`$filter` sin escapar :69); PM `GetStockAsync`:206-244 (sin escapar :212); PM `GetFamiliasLineaByClassAsync`:354-414; PM `GetFamiliasLineasAsync`:316-346; ECM `EsFamilia`:109-128; `Product.Family`; `ConexionSQL.obtenerConexionSigMaviAsync`:72-98.
- **Opción A — diferir (actual).** **Opción B — portar:** método privado `ResolverArticuloRegionCreditoAsync(string articulo, string codigoPostal)` antes de OM:916: familia por `GetProductsBySkuAsync` (escapando el `$filter` como E5); ¿es TELEFONIA? por descripción (F1, `EsFamilia` pasa a `internal static`) o por código (F2, con la clase que dé el usuario, validada con `GetFamiliasLineaByClassAsync`); par con una sola lectura ordenada; CP activo; existencia global con `GetStockAsync` sin plant (sumando `UnrestrictedUseStock`); `artRegion` reemplaza a `articulo` en caché, precio y `pArticulo`. Defectos del SP que **no** se copian (G4-19): pares duplicados en la tabla temporal, siete `TOP 1` sin `ORDER BY`, `@artRegion` NULL que no escribe la línea, error 512 de la subconsulta, `TotalArticulos 0` tratado como vacío.
- **Decisión final del plan:** **A** hasta que el negocio defina Q17 y existan los cuatro datos; al activarse, **B con F2** y existencia global.
- **Reglas.** G4-03, G4-12, G4-15 … G4-19, G4-28.

#### 6.3.12 P11 — Herramienta de reproceso `getOrderInfoAndSet` / `ReSetPedido`

- **Regla LAN.** `GET order/getOrderInfoAndSet/{incrementId}` (LOC:436-443) → `Magento.getOrderInfoAndSet` (LAN Conn/Magento.cs:361-411) → `ReSetPedido` (LOM:1688-1710): busca el request en setOrder.log (lo escribe LOC:144); si no, pide el JSON a DMZ `order/jsonOrders`; si ya hay Venta no cancelada → `No cumple las condiciones`; fuerza `forzarOrder = '1'` y llama `SetPedido`. Magento y el DMZ no la llaman: es de soporte.
- **Destino.** No existe; OC no registra el request (G5-32). GANTT:262 la agenda del 01/03/2027 al 18/03/2027.
- **Opción A — retirar** (sin código; G1-04 y G5-03 → N/A; marcar GANTT:262). **Opción B — conservar** en el paquete 7e: ruta nueva en OC que toma el JSON de DMZ `order/jsonOrders`. **Ojo:** para crédito Magento guarda el JSON con `IncrementId 'CRED-' + quoteId` (con guion, MOM:762-766) y la orden lleva `'CRED' + quoteId` sin guion (MOM:658, :861-864): la búsqueda por el incrementId de crédito no encontraría el JSON.
- **Decisión final del plan:** **A.**
- **Reglas.** G1-04, G5-03, G5-32.

#### 6.3.13 P12 — Contrato de respuesta HTTP del crédito

- **Regla LAN.** Éxito → 200 con la cuenta (LOM:649; LOC:160); falla dentro del try → 200 `''` (LOM:728-732); falla antes del try → 200 `e.ToString()` (LOC:154-157); `PedidoExistente` → 200. DMZ era LAN (DMZ@c63c0ab OrdersController.cs:116-195): sin llave `cuenta` → 400; `''` → 500; `PedidoExistente` → 409; respuesta que no empieza con `C` → 500; éxito → 200. **El 422 de `sin cuenta` nunca se alcanzó en crédito** (§3, G5-25): lo que recibían los clientes era cuenta `C…` desconocida → 200 con la cuenta; cuenta `''` → 500; cuenta null → 500 `Respuesta inesperada`. Magento solo trata `=== false` como fallo (MCO:51-56).
- **Destino.** OC `SetOrder`:27-47; OM `SetOrderAsync`:1808-1813 y :1956-1960; DMZ OrdersController.cs:191-227.
- **Opción A — mantener R4/09-26** (sin código): G1-24, G5-14 y G5-16 EQ-R; G3-16 y G5-25 diferencia aceptada.
- **Opción B — cuerpo de LAN para crédito, solo en ServicioSAP:** en OC:27-47, con crédito: éxito → `Ok(newOrder.Zctefinal)`; `sin cuenta` → `Ok(order.infoCliente?.cuenta)`; otra falla → `Ok("")`. **Sin** pedir al DMZ que restaure sus códigos: GUIA §1.5 dice que el DMZ no decide status codes y ese cambio ya se revirtió una vez (GUIA:170, :511, :729).
- **Opción C — error estructurado** (no es LAN): falla → `Ok(new { BP = "", SalesDocument = (string)null, Message = e.Message, Resultado = "Error" })`.
- **Decisión final del plan:** **A.**
- **Nota para V4.** `registerOrder` de Magento toma el cuerpo como un BP de 10 caracteres para `setCAccount` (MOM:596-605); ServicioSAP responde un objeto JSON, así que `setCAccount` no corre: anotarlo.
- **Reglas.** G1-24, G2-38, G2-39, G3-16, G5-14, G5-16, G5-25.

#### 6.3.14 P13 — Logs del crédito

- **Pregunta.** Hay dos reglas del usuario que chocan: 2026-09-24 "no hay logs que LAN no tenga" (PLAN:1276; G5-20) y 2026-09-25 "todo error visible con log + excepción" (R4/09-26, PLAN:1753; SKILL regla 8). ¿Qué logs se quitan y cuáles de LAN se agregan?
- **Regla LAN.** Bitácora de LAN en crédito: request y respuesta INFO (LOC:144, :152, setOrder.log); error de `SetPedido` (LOM:730); `IsValidated` (LOM:814); SMS (LOM:849); SaveData (LCM:250); cupón (LCM:205, :394, :426); hilo del liberador (LCM:230) y liberador (LLIB:81-98); `creditStatus` y `updateCreditOrderId` (LOC:484-533). `checkCliente` no registra nada (LCM:757-760).
- **Destino.** Sin equivalente en LAN: OM:648 `[CREDITO SIN CUENTA]`, OM:1021 `[CREDITO SD29 FILTRO]`, SCW:368 `[CREDIT ObtenerTelefonoAValidar ERROR]`. LAN registraba y ServicioSAP solo escribe a Console: OM `ObtenerNumeroTablaSmsAsync`:608-612. Con equivalente (se conservan): OM:630, OM:679-681, OC:45. INVLOGS (2026-09-24, columna Decisión vacía) propone quitar logs INFO que T1a conserva: su criterio ("solo excepciones") no es la regla del usuario.
- **Opción A — estricto LAN:** borrar OM:648, el `Logger.SAP` de OM:1021 y el de SCW:368 (los `throw` y el respaldo se quedan); agregar en el catch de OM:608-612 `ServicioSap.Helpers.Logger.SAP("Error ObtenerNumeroSms() => ", ex.Message);` (LAN lo escribía, LOM:847-850).
- **Opción B — conservar todos** (EQ-R por decisión).
- **Opción C — A, pero conservando `[CREDITO SIN CUENTA]`** mientras Magento termina DU2 (ayuda de soporte).
- **Opción D (nueva, recomendada) — A, pero conservando `[CREDITO SD29 FILTRO]`:** OM:648 y SCW:368 se van porque su error ya queda registrado por OC:45 `[ORDER NEW ERROR]` (se cumplen las dos reglas); OM:1021 se queda porque es el único rastro de un error que el respaldo traga (regla del 2026-09-25); se agrega el log de SMS de LAN.
- **Aparte (G5-32):** los INFO de request/respuesta de LAN (LOC:144, :152) no existen en ServicioSAP; agregarlos es paridad de bitácora, no un log de más. Se pregunta junto con P11.
- **Decisión final del plan:** **D.**
- **Aceptación.** V1. `grep` sin `[CREDITO SIN CUENTA]` ni `[CREDIT ObtenerTelefonoAValidar ERROR]`; orden con cuenta inexistente → sap.log solo con `[ORDER NEW ERROR]`; falla forzada de la lectura de SMS → `Error ObtenerNumeroSms() => `.
- **Reglas.** G5-20, G5-32, G3-12.

#### 6.3.15 P14 — `Marst` fijo al crear el BP

- **Pregunta.** Los BP que crea ServicioSAP llevan `Marst '2'` desde la orden (`BuildBpClientFromOrder` OM:2635-2957, `Marst` en :2676, llamado desde `CreatePartnerNumberFromOrderAsync` OM:2618) y `'1'` desde `setCustomer` (`BuildClientFromCustomerRequest` BPM:415-765, `Marst` en :486). Por DU10, su fila de crédito dirá `Casado` o `Soltero` donde LAN guardaba `''` (el alta web no llenaba `EstadoCivil`; LCM:847). ¿Se manda `Marst` vacío? Efecto parecido con `Gender`: sin sexo, el alta pone `'1'` (PLAN:1941) y la fila dirá `Masculino` donde LAN tenía `''`. Eso solo se anota: el `'1'` por defecto es decisión del usuario del 2026-09-26 y los códigos de `Gender` no se vuelven a preguntar (DU10). P14 decide solo `Marst`.
- **Opción A.** `Marst = ""` en OM:2676 y BPM:486, tras una prueba BP01 en DEV (crea un BP: visto bueno). **Opción B.** Dejar los fijos y aceptar la diferencia. **Opción C.** Del request: descartada (Magento no lo manda).
- **Decisión final del plan:** **A** si BP01 acepta `Marst` vacío; si no, **B**. Es transversal (alta de contado y `setCustomer`): va aparte y con E2E de las dos rutas.
- **Reglas.** G2-13.

#### 6.3.16 P15 — Conexión a SIGMavi

- **Pregunta.** DU1 dejó abierto que SIGMavi sale de `Conexion.dll` (ConexionSQL.cs:19, :79). ¿Se queda o pasa a una cadena del `Web.config`?
- **Regla LAN.** LAN leía SIGMAVI con su propia cadena (LAN Conn/Connection.cs:30), no con el DLL; el cupón iba a IntelisisTmp (LCM:401).
- **Opción A — conservar el DLL** (sin código). **Opción B — `Web.config`:** cadena nueva (valor de infraestructura, nunca se imprime) y `obtenerConexionSigMavi`/`…Async` (ConexionSQL.cs:11-38, :72-98) al patrón de `obtenerConexionAndroidAsync` (:100-129). Transversal (exportación ecommerce, catálogos, condiciones, cupones). Dato: el DLL solo conoce DEVMAVI y QAIMAVI.
- **Decisión final del plan:** **A** en el paquete de crédito (no es bloqueo por DU1); **B** como tarea aparte antes de QA/Prod.

#### 6.3.17 P16 — NUEVA. Prospecto = `ZtipoCliente 'Prospecto'`

- **Pregunta.** El SP detecta prospecto por el prefijo `'P'` de `@cliente` (SPD:216). Con DU2 la cuenta es numérica: un port literal nunca detectaría un prospecto. ServicioSAP usa `To_Cte.ZtipoCliente == 'Prospecto'` (SCW:538-548, constante :552; usado en :329 y :389), según lo que dijo el usuario el 2026-09-21 (CAP:37-38). ¿Se confirma? Define también el disparo de T1b (`!esProspecto`), donde la exclusión de prospectos puede ir más allá de LAN (LAN no disparaba el liberador para ninguna cuenta que no empezara con `C`).
- **Opción A — confirmar** (sin código). **Opción B —** otro discriminador que dé el usuario.
- **Decisión final del plan:** **A.**
- **Reglas.** G3-21, G1-21, G1-23, G3-15.

#### 6.3.18 P17 — NUEVA. Límite de crédito

- **Pregunta.** El 2026-09-11 el usuario dijo "el crédito disponible **sí debe frenar** el pedido", bloqueado porque `to_Cte.ZlimCred` llega en 0.000 (FLUJO_CREDITO:280-298; GUIA:539). Después, PLAN §16.5 ofreció opciones sin respuesta, y PLAN §23.4 Q21 y §24.7 dieron por hecha la paridad (PLAN:1242-1251, :2205-2211). LAN nunca frenó (G1-15). El comentario del DMZ sobre `validateCredit` dice que hay "validación nativa de SAP a través de OData FI/FICA en ServicioSAP", y no existe (DMZ OrdersController.cs:366-368).
- **Opción A — paridad LAN** (no frena) hasta que exista una fuente real; la decisión del 2026-09-11 queda diferida. **Opción B —** frenar cuando `ZlimCred` traiga datos (requiere definir el cálculo y la fuente del saldo; hoy no hay).
- **Decisión final del plan:** **A**, registrada explícitamente.

#### 6.3.19 P18 — NUEVA. Condición `05 M MA/VIU P DIF`

- **Pregunta.** PCC solo tiene `05 … P INM` (PCC:40-43). Si Magento ofrece `05 … P DIF` y SIGMavi no la resuelve, la orden queda con cabecera sin líneas (G4-40). ¿Se vende a crédito web? ¿Cuál es su código SD29?
- **Opción A —** sin cambio hasta que el negocio responda. **Opción B —** agregar la entrada al catálogo con el código que dé el negocio (dato nuevo: requiere el visto bueno de §1.9b).
- **Decisión final del plan:** **A.**

#### 6.3.20 P19 — NUEVA. Liberador síncrono contra la regla 12 del SKILL

- **Pregunta.** `LiberadorCreditoMethods.LiberarCliente` usa `WebClient.UploadString` síncrono sin timeout (LIB:48-107). T1b lo llama dentro de `Task.Run`. La regla 12 del SKILL y GUIA §1.6 piden async (y prohíben `.Result`/`.Wait`, que aquí no se usan). LAN también era síncrono, en un `Thread` de fondo (LCM:215-240).
- **Opción A —** llamarlo tal cual en la tarea de fondo, como LAN, con la excepción anotada. **Opción B —** hacerlo async (método o parámetros nuevos: requiere autorización §1.9b).
- **Decisión final del plan:** **A** (no bloquea la respuesta; replica el `Thread` de LAN).

#### 6.3.21 P20 — NUEVA. Ratificar E5

- **Pregunta.** E5 agregó `GetFinalListProperBySkuOrgCondicionAsync` (público), `LiteralOData`, `ConsultarPropreListAsync` (FLP:91-135) y `ObtenerPreciosCreditoAsync` (OM:1003-1025), más el log `[CREDITO SD29 FILTRO]`. GUIA §1.9b prohíbe crear variables, parámetros o constantes sin consultar (los 4 métodos nuevos traen parámetros nuevos) y §1.9e dice que el precio se consulta con `GetFinalListProperBySkuAsync`. El registro de E5 (CAMBIOS §3.6) no traía la autorización.
- **Opción A — ratificar** E5 tal como está (arregla los SKU con `+` en crédito y en contado, OM:1982, y reduce candidatos). **Opción B —** revertir a la consulta solo por SKU, conservando solo el escape del `$filter` en FLP.
- **Decisión final del plan:** **A**, registrada en CAMBIOS §3.6 y §4.5 de este documento.

### 6.4 Tareas BLOQUEADO_EQUIPO

**Preguntas por dueño** (Fable las deja redactadas en S1; el usuario las manda):

| Dueño | Preguntas | Desbloquea |
|---|---|---|
| **Valentín** (liberador; llaves `AUTENTICACION_URL_LIBERADOR`, `PASSWORD_AUTENTICACION_LIBERADOR`, `VETA_URL_LIBERADOR` en el `Web.config` de ServicioSAP :40-42) | **Q-T1-1** ¿`POST /api/venta` acepta `Cliente` = BP SAP de 10 dígitos? (Por DU2, ServicioSAP no mapea cuentas `C…`: si el liberador exige la cuenta Intelisis, el ajuste es del lado del liberador y T1b no se enciende, §6.4.1 f) · **Q-T1-2** ¿Sigue creando la Venta en Intelisis (`Solicitud Credito` → `Analisis Credito` → `Pedido`) o ya crea algo en SAP? ¿Quién crea el pedido de crédito? · **Q-T1-3** ¿La respuesta sigue siendo `{id, cliente, uen, idVenta}` (LLIB:32-38)? ¿Qué es `idVenta` hoy (¿el `Venta.ID` de la `Solicitud Credito` o el del `Pedido`?) y cuándo viene en 0? (G5-28) · **Q-T1-4** `Id` = `CRED_SOLICITUD_WEB_DATOS_TEMP.id`: ¿qué columnas lee de esa fila y de `VTASdArtCreditoWeb` (nombre, sexo y su capitalización, estadoCivil, rfc, origen, costo)? ¿Distingue `costo` NULL de 0? ¿Alguien más las lee (p. ej. MAVICUBOS `SP_CREDITO_WEB_VALORES_FORM`; LAN `SaveCoordsInNewTable`, CreditMethods.cs:2433-2450, lee `cliente`, que ahora trae un BP de 10)? · **Q-T1-5** ¿UEN 1 = MA y 2 = VIU? · **Q-T1-6** ¿Autenticación igual (`{Password}` y token crudo, sin `Bearer`)? · **Q-T1-7** ¿Es idempotente con el mismo `Id`? · **Q-T1-8** ¿Cuánto tarda? (`WebClient` sin timeout) · **P9:** ¿lee `eCommerceDetPedidos` por `IdPedido 'CRED…'`? | T1b, P9, P5, P8 |
| **Área de crédito, con Valentín** | **Q-T2-1** ¿Dónde vive la decisión de crédito después de Intelisis? (A) Venta de Intelisis mientras exista (ServicioSAP no tiene conexión a Intelisis; habría que agregarla, SKILL regla 1 pide consultar); (B) columna `estatus` de `CRED_SOLICITUD_WEB_DATOS_TEMP` (hoy 0; la rama `Update` del SP la actualizaba, SPD:354-366: ¿quién la escribe y con qué códigos?); (C) un pedido SAP creado al autorizar, consultado con SD36 por `PurchNoC`; (D) una API del equipo de crédito o del liberador (URL en AppSettings) · **Q-T2-2** ¿Qué id consulta Magento? El aviso manda `IdVenta` si es > 0 y, si no, el `IdSolicitud` de Android (LCM:224); Magento lo guarda en `id_solicitud` (MCO:139). T2a tiene que usar el mismo tipo de id (G5-28) · **Q-T2-3** ¿Cómo se mapea la fuente a AUTORIZADO / EN_ANALISIS / RECHAZADO (reglas de LOM:1867-1996)? · **Q-T2-5** ¿Qué se renombra de `CRED{quoteId}` al increment real? (a) Venta de Intelisis; (b) `CRED_SOLICITUD_WEB_DATOS_TEMP.idMagento` (LAN nunca la tocaba; solo si T2c-A); (c) `PurchNoC`/`Zidecomm` en SAP (Alan); (d) `eCommerceDetPedidos`, solo si P9-B. Y: ¿un renombre fallido responde `success:true, rowsUpdated:-1` como LAN (G5-29)? | T2a, T2b |
| **Alan / SAP SD** | **Q-T2-4** Después de AUTORIZADO, ¿quién crea el pedido SAP (SD01)? ¿Se puede reescribir `PurchNoC`/`Zidecomm`? (GUIA §8.1: `isCredito`/DistrChan 02 y plantas 0504/0505 hoy son código muerto; "cuando el crédito fluya, BP-08 pasa de latente a rotura") · **P7-D:** valor de `CDistr` para crédito en SD29 | T2b, T2c, P7 |
| **Dev 2 / Javier** (dueños en el CSV y GANTT) | `creditStatus` está planeado como `sale/filter` SD36 con 01/02/03 (DEV2:165; CSV fila 82), pero Magento lee `{status}` con AUTORIZADO/EN_ANALISIS/RECHAZADO (MPC:364-378) y el crédito no crea documento SD36: coordinar antes de T2a · `validateCredit` es N/A (CSV fila 89, DEV2:161, :167) · `credit/codigoPromocion` (CSV fila 7) con P3 · Dueño de `updateCreditOrderId`: el borrador decía Alan; DEV3:423 dice que pasó a Dev 2 el 12 de agosto; el CSV fila 83 dice Marcos ("revisarlo con Alan"). GANTT: `creditStatus` 12-24/11/2026 (:249), `updateCreditOrderId` 19-22/03/2027 (:213), `getOrderInfoAndSet` 01-18/03/2027 (:262) | T2a, T2b, P3, P11 |
| **Magento** | DU2 cerrada: Magento manda en `cuenta` el BP numérico; `getCuentaIntelisis()` (MOM:719) lo resuelve su actualización y **no** es bloqueo de ServicioSAP. Para V4 solo se confirma que el cliente de prueba ya tiene el BP como cuenta · `credit/codigoPromocion` (P3) · `05 … P DIF` (P18) | V4, P3, P18 |
| **Dueño del DMZ** | Despliegue de T2d. Con P12-A no se le pide nada más | T2d |
| **DBA de ServicioAndroid** | Comprobación de permisos de `usrintranet` (V2 paso 0; no es bloqueo por DU1); escrituras y limpieza de filas de prueba, con aprobación del usuario | V2, V3, V4 |

**Decisiones del usuario atadas a estas tareas:** U1 (interruptor), U2 (G5-26), T2c-A/B, P2, P16, P19, P12 y P13.

#### 6.4.1 T1b — Encender el liberador y el aviso en segundo plano (diseño listo)

- **Depende de.** T1a; Q-T1-1 … Q-T1-8; U1, U2, P2, P16, P19.
- **Regla LAN.** LCM:199-241, dentro del try y con folio: líneas (:201; si fallan, no hay liberador); cupón (:203-206); solo si `data[0].ToUpper().StartsWith("C")` (:208) un `Thread` de fondo (:215-240) con `LiberarCliente(cliente, IdSolicitud, uen)` y luego `CallMagentoAuthorizationCallback(entityId, status, cliente, IdVenta > 0 ? IdVenta : IdSolicitud)` (:219-226); si falla, log `ERROR LiberadorThread` y aviso `RECHAZADO` con `IdSolicitud` (:228-237). La respuesta no espera (LOM:649). DU2: `C…` = BP existente que no es prospecto.
- **Destino (citas corregidas el 2026-09-30).** OM `ProcessCreditPaymentAsync`:638-730; el disparo va dentro del try de líneas (:667-676), después del cupón (:671-675), **no** en el catch (:677-683). El bloque comentado :685-721 se borra: no compila por `idClienteMagento` (:690, eliminado por E1) y por `await` dentro de un lambda que no es async (:700, :710); el `ToUpper` de :692 **sí** compila, pero es un problema de paridad (LAN compara `storeId == "viu"` exacto). Relacionados: `CrearSolicitudCreditoAsync`:751-813 (return :812, llamada :660); SCW `InsertAsync`:18-33 (contexto :27; `ctx.EsProspecto = EsProspecto(bp)` en :389; `EsProspecto` :538-548; `CatalogoOrigenValidacion` :550 y `TipoClienteProspecto` :552); `LiberateClientCredit`:1177-1189; `Web.config`:40-42 (no imprimir valores).
- **Diseño** (se aplica cuando Q-T1-1 = "acepta el BP"):
  - a) SCW: `public bool EsProspecto { get; private set; }`; en `InsertAsync` después de :27: `EsProspecto = contexto.EsProspecto;`.
  - b) OM:751 → `private async Task<(int IdSolicitud, bool EsProspecto)> CrearSolicitudCreditoAsync(...)`; en :812 `var scw = new SolicitudCreditoWebMethods(); int id = await scw.InsertAsync(solicitud).ConfigureAwait(false); return (id, scw.EsProspecto);`; en :660 `var (idSolicitud, esProspecto) = await CrearSolicitudCreditoAsync(...).ConfigureAwait(false);`.
  - c) OM, dentro del try, después de :675:
    ```csharp
    if (!esProspecto && LiberadorActivo())
    {
        string capturedEntityId = order.entityId;      // quoteId (MOM:657)
        string capturedCliente = cuentaBp;
        int capturedIdSol = idSolicitud;
        int capturedUen = order.storeId == "viu" ? 2 : 1; // = OM:755, LOM:628
        _ = Task.Run(async () =>
        {
            try
            {
                LiberadorResult resultado = LiberateClientCredit(capturedCliente, capturedIdSol, capturedUen);
                await CallMagentoAuthorizationCallbackAsync(capturedEntityId, resultado.Status, capturedCliente, resultado.IdVenta > 0 ? resultado.IdVenta : capturedIdSol).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                ServicioSap.Helpers.Logger.SAP("ERROR LiberadorThread ", $"entityId={capturedEntityId} {ex.Message}");
                await CallMagentoAuthorizationCallbackAsync(capturedEntityId, "RECHAZADO", capturedCliente, capturedIdSol).ConfigureAwait(false);
            }
        });
    }
    ```
    `Task.Run` tiene precedente en SS/Methods/Credit/DocumentMethods.cs:229; es lo más cercano al `Thread` de LAN (P19-A).
  - d) `private static bool LiberadorActivo() => string.Equals(ConfigurationManager.AppSettings["CREDITO_LIBERADOR_ACTIVO"], "true", StringComparison.OrdinalIgnoreCase);`; si U1 = sí, en `Web.config` después de :42 `<add key="CREDITO_LIBERADOR_ACTIVO" value="false" />`.
  - e) Cambiar la nota `PENDIENTE (T18)` de :685-686 por la referencia a LCM:208-240. La respuesta no cambia (`return cuentaBp`, :723).
  - f) Si Q-T1-1 = no acepta el BP: **no** encender; se abre otra pregunta.
- **Aceptación.** V1. Interruptor en `false`: V2 igual que antes, sin líneas `LiberadorCredito`. En `true`, solo en la instancia de prueba y con aprobación (el POST crea datos en el sistema del liberador): `order/new` responde 200 `Concluido` sin esperar; sap.log `LiberadorCredito Info [<id>]`, `CallMagentoCallback [1] Token OK` y `dmz=OK`; Magento `omnipro_credito_pending` pasa a `EN_ANALISIS` con `cuenta` = BP e `id_solicitud` (MCO:135-149). Sin commit.
- **Reglas.** G1-22, G1-23, G5-09, G5-10, G5-26, G5-02, G4-24, G5-28.

#### 6.4.2 T2a — Ruta `order/creditStatus/{idSolicitud}`

- **Depende de.** Q-T2-1 … Q-T2-3; T1b (el id sale del aviso); coordinación con Dev 2.
- **Regla LAN.** LOC:484-504: `idSolicitud <= 0` → `BadRequest("idSolicitud debe ser mayor a 0")`; registra solo si `status != "EN_ANALISIS"`; `Json(new { status })`; excepción → log e `InternalServerError`. LOM:1867-1996: `ID=@IdSolicitud AND Mov='Solicitud Credito'` (sin fila → EN_ANALISIS; CANCELADO → RECHAZADO; `IDEcommerce` vacío → EN_ANALISIS); `Analisis Credito` CANCELADO → RECHAZADO; último `Pedido` por `IDEcommerce` (sin fila → EN_ANALISIS; `Situacion='Rechazado'` o CANCELADO → RECHAZADO; cualquier otra `Situacion` → AUTORIZADO, no solo `Liberado`); excepción → EN_ANALISIS. MPC corre cada 5 minutos, toma filas EN_ANALISIS con `id_solicitud` (:69-74) y reintenta sin tope una respuesta no-2xx (:118-128, :364-378).
- **Destino.** OC: ruta nueva después de `GetCondicion` (:308-329), antes del cierre (:331). OM: `GetCreditStatusAsync(int idSolicitud)` junto a `LiberateClientCredit` (:1177); si la fuente es Android, el método de lectura va en SCW. Sin `.cs` nuevos.
- **Diseño común:**
  ```csharp
  [HttpGet][Route("creditStatus/{idSolicitud}")]
  public async Task<IHttpActionResult> GetCreditStatus(int idSolicitud)
  {
      if (idSolicitud <= 0) return BadRequest("idSolicitud debe ser mayor a 0");
      try
      {
          string status = await new OrderMethods().GetCreditStatusAsync(idSolicitud);
          if (status != "EN_ANALISIS") ServicioSap.Helpers.Logger.SAP("GetCreditStatus ", $"idSolicitud={idSolicitud} status={status}");
          return Json(new { status });
      }
      catch (Exception e) { ServicioSap.Helpers.Logger.SAP("ERROR GetCreditStatus Controller ", e.Message); return InternalServerError(e); }
  }
  ```
  `GetCreditStatusAsync` nunca lanza; solo devuelve AUTORIZADO, EN_ANALISIS o RECHAZADO; sin dato → EN_ANALISIS; en el catch registra y devuelve EN_ANALISIS. Fuente según Q-T2-1: (B) `SELECT TOP 1 estatus FROM CRED_SOLICITUD_WEB_DATOS_TEMP WITH (NOLOCK) WHERE id = @id` con la tabla de códigos del área de crédito; (A) las 3 consultas de LOM:1876-1981 con una conexión nueva (regla 27); (C) `idMagento` → `PurchNoC` → `ValidarPedidoExistenteSAPAsync`; (D) GET a la API del dueño (URL en AppSettings).
- **Aceptación.** V1. `GET order/creditStatus/0` → 400; id inexistente → 200 `{"status":"EN_ANALISIS"}`; fuente caída → 200 EN_ANALISIS + `ERROR GetCreditStatus`; solicitud marcada → AUTORIZADO o RECHAZADO. El cuerpo trae exactamente la llave `status`. Request y response documentados.
- **Reglas.** G5-18, G5-24, G5-28.

#### 6.4.3 T2b — Ruta `order/updateCreditOrderId`

- **Depende de.** Q-T2-4, Q-T2-5; P9; T2a.
- **Regla LAN.** LOC:506-533: request null o `CreditIncrementId`/`IncrementId` vacíos → `BadRequest("Parámetros inválidos")`; log con los 3 campos; `Ok(new { success = true, rowsUpdated = rows })`; excepción → `InternalServerError` (inalcanzable para SQL, G5-29). LOM:1998-2061: `UPDATE Venta SET IdEcommerce=@NuevoId WHERE IdEcommerce=@IdAntiguo` (:2007); `UPDATE eCommerceDetPedidos SET IdPedido=…` (:2020); si `entityId > 0`, `UPDATE eCommerceDetPedidos SET IdOrden=@EntityId WHERE IdPedido=@IncrementId` (:2034-2036); log (:2048); suma de filas (:2053); excepción → −1 (:2058-2059). Modelo LAN `UpdateCreditOrderIdRequest {CreditIncrementId, IncrementId, int EntityId}` (LAN Models/OrderRequest.cs:204-209). Magento: `notifyIntelisisOrderId` POST con `{CreditIncrementId, IncrementId, EntityId}` (MPC:273-301); si falla, solo lo registra, y **no hay reintento** (G5-31). No se renombran `idMagento`, cupón ni guía (G5-30).
- **Destino.** SS/Models/SAP/Order/OrderRequest.cs (clase nueva en el mismo archivo); OC: ruta junto a T2a; OM: `UpdateCreditOrderIdAsync(string creditIncrementId, string incrementId, int entityId = 0)`.
- **Diseño común:**
  ```csharp
  public class UpdateCreditOrderIdRequest { public string CreditIncrementId { get; set; } public string IncrementId { get; set; } public int EntityId { get; set; } }

  [HttpPost][Route("updateCreditOrderId")]
  public async Task<IHttpActionResult> UpdateCreditOrderId([FromBody] UpdateCreditOrderIdRequest request)
  {
      if (request == null || string.IsNullOrEmpty(request.CreditIncrementId) || string.IsNullOrEmpty(request.IncrementId)) return BadRequest("Parámetros inválidos");
      ServicioSap.Helpers.Logger.SAP("UpdateCreditOrderId ", $"creditIncrementId={request.CreditIncrementId} incrementId={request.IncrementId} entityId={request.EntityId}");
      try { int rows = await new OrderMethods().UpdateCreditOrderIdAsync(request.CreditIncrementId, request.IncrementId, request.EntityId); return Ok(new { success = true, rowsUpdated = rows }); }
      catch (Exception ex) { ServicioSap.Helpers.Logger.SAP("ERROR UpdateCreditOrderId ", ex.Message); return InternalServerError(ex); }
  }
  ```
  `UpdateCreditOrderIdAsync` ejecuta solo los destinos que confirme Q-T2-5, con parámetros del ancho de la columna (`idMagento` 12); devuelve la suma o −1 (paridad LAN, salvo que Q-T2-5 diga otra cosa). **Mientras Q-T2-5 no se conteste no hay implementación parcial.**
- **Aceptación.** V1. `POST order/updateCreditOrderId` con `{}` → 400; con `{"CreditIncrementId":"CRED9909291","IncrementId":"TSTF0929R01","EntityId":990929}` sobre una fila de prueba → 200 `{"success":true,"rowsUpdated":n}`; destino inaccesible → 200 `rowsUpdated:-1` + log (paridad LAN).
- **Reglas.** G5-19, G5-29, G5-30, G5-31, G4-02, G5-21, G5-22, G5-24.

#### 6.4.4 T2c — Control de duplicados del reenvío

- **Depende de.** Q-T2-4 (si la respuesta es "ServicioSAP crea el pedido SAP en el reenvío", este diseño no aplica); elección T2c-A/B.
- **Regla LAN.** LOM:533-542: `obtenerIdVenta(IdEcommerce) > 0 && (forzarOrderOriginal == "0" || PAYPAL)` → `PedidoExistente` antes de la guía y de la rama de crédito; `obtenerIdVenta` con error → 0 y sigue (LOM:1602-1643). Tras el renombre de `Venta.IdEcommerce` (LOM:2007) el reenvío responde `PedidoExistente`. Reenvíos de Magento: Registry cron → `registerOrders` → `registerOrder` con `synced` 0/null (MOM:219-230, :988-996) y `forzarOrder '0'`; también MCO:173 con un aviso AUTORIZADO.
- **Destino.** OM `SetOrderAsync`, al inicio de la rama de crédito (OM:1791), antes de `SaveGuideAsync` (:1793). SD36 (:1758-1765) nunca encuentra crédito. El helper nuevo va en SCW.
- **Opciones.** **T2c-A**, espejo de LAN: buscar `idMagento = incrementId`; solo funciona si T2b renombra `idMagento`, que LAN no tocaba. **T2c-B**, por carrito, sin escribir: si `incrementId` **no** empieza con `"CRED"` y existe una fila con `idMagento = "CRED" + infoCliente.idCarrito` (Magento arma `'CRED'+quoteId`, MOM:658, :861-864, y en el reenvío manda `idCarrito = quoteId`, MOM:569). Diferencia: si `updateCreditOrderId` falla, LAN habría creado otra solicitud y T2c-B no.
- **Diseño:** SCW `ExisteSolicitudPorIdMagentoAsync(string idMagento)` (`SELECT TOP 1 id … WHERE idMagento = @idMagento`, VarChar 12; con error, log `[CREDITO DUPLICADO ERROR]` y `false`, como LOM:1637-1642); en OM, primera instrucción de la rama: `if (forzarOrderOriginal == "0" && !string.IsNullOrEmpty(clave) && await … ) return new OrderResponse { Resultado = "PedidoExistente", Zidecomm = incrementId };` con `clave` = `incrementId` (A) o `(incrementId ?? "").StartsWith("CRED") ? null : "CRED" + orderRequest.infoCliente?.idCarrito` (B). El log nuevo entra en P13. Si P1-A1 también se aplica, el orden es: compuertas P1 → guarda T2c → `SaveGuideAsync` (confirmar con el usuario).
- **Decisión final del plan:** **T2c-B.**
- **Aceptación.** Con aprobación para escribir: V2 con `incrementId 'CRED9909291'`, `idCarrito '9909291'`, `forzarOrder '0'` → `Concluido` y 1 fila; el mismo payload con `incrementId 'TSTF0929R01'` → 200 `{"BP":null,"SalesDocument":null,"Message":"","Resultado":"PedidoExistente"}` y 0 filas nuevas; con `forzarOrder '1'` → crea la fila (igual que LAN).
- **Reglas.** G5-24, G5-01, G5-02, G1-06.

#### 6.4.5 T2d — DMZ: `creditStatus` y `updateCreditOrderId` a `GetSAP`/`PostSAP`

- **Depende de.** T2a y T2b desplegadas en la instancia de `URL_SAP`. El despliegue lo hace el dueño del DMZ.
- **Regla.** Hoy van con `curl.Get`/`curl.Post` (Curl.cs:245-265, `DownloadString(Ip+url)` :257; Curl.cs:93-113, `UploadString(Ip+url)` :106; `Ip = URL_INTELISIS` :22). **Corrección 2026-09-30:** el constructor de `Curl` (Curl.cs:57-91) ya no hace login a LAN (bloque comentado :61-71): hace login solo a `URL_SAP` (:80), pone `Token = TokenSAP` (:84) y lanza si ese login falla (:86-90). SKILL regla 16 pide `PostSAP`/`GetSAP` (Curl.cs:115-148, :210-243; `IpSAP = URL_SAP` :23). El DMZ es solo puente (GUIA §1.5).
- **Destino.** DMZ OrdersController.cs: `UpdateCreditOrderId`:404-419 (`curl.Post` :411); `CreditStatus`:460-482 (`curl.Get` :467). `authorizationResult` (:421-458) no cambia.
- **Cambio.** :411 → `curl.PostSAP("order/updateCreditOrderId", JsonConvert.SerializeObject(request))`; :467 → `curl.GetSAP("order/creditStatus/" + idSolicitud)`. Nada más. Restaurar CRLF.
- **Compilar el DMZ.** Rápido con `\\172.16.214.58\sap\DMZ\WebApiMagento\bin\roslyn\csc.exe`; cierre con MSBuild de `\\172.16.214.58\sap\DMZ\WebApiMagento\WebApiMagento.csproj` con `/p:VSToolsPath= /p:CscToolPath=\\172.16.214.58\sap\DMZ\packages\Microsoft.CodeDom.Providers.DotNetCompilerPlatform.3.6.0\tools\Roslyn472 /p:CscToolExe=csc.exe /p:OutDir=<SCRATCH>\dmz\bin\ /p:IntermediateOutputPath=<SCRATCH>\dmz\obj\`.
- **Aceptación.** MSBuild del DMZ exit 0; `ls-files --eol` `w/crlf`; `git diff` de 2 líneas; por el DMZ `GET order/creditStatus/<id>` → 200 `{"status":…}` y `POST order/updateCreditOrderId` → 200 `{"success":true,"rowsUpdated":n}`. Sin commit.
- **Reglas.** G5-18, G5-19.

### 6.5 Kit de verificación V1-V4 (solo datos de ejemplo)

Los valores entre `<< >>` son marcadores: el usuario pone los reales en Hoppscotch o SQL y **nunca** se escriben en el vault. Ningún dato personal real.

#### 6.5.1 V1 — Compilación con control de CRLF (después de cada tarea de código)

**Paso 0 — después de CADA Edit** (los archivos están en `i/lf w/crlf` y la herramienta Edit escribe LF):
```powershell
$p='<ruta>'; $b=[IO.File]::ReadAllBytes($p); $bom=($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF); $t=([IO.File]::ReadAllText($p) -replace "`r`n","`n") -replace "`n","`r`n"; [IO.File]::WriteAllText($p,$t,(New-Object System.Text.UTF8Encoding($bom)))
```
o con Python (conserva el BOM porque trabaja en bytes):
```bash
python -c "import sys;p=sys.argv[1];b=open(p,'rb').read();open(p,'wb').write(b.replace(b'\r\n',b'\n').replace(b'\n',b'\r\n'))" "<ruta>"
```
Comprobar: `git -c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP" -C "\\172.16.214.58\sap\ServicioSAP" ls-files --eol -- <ruta relativa>` → `w/crlf` (nunca `w/lf` ni `w/mixed`). Si `git diff --stat` muestra un archivo cambiado entero, se dañó el EOL.

**Paso 1 — chequeo rápido:**
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "\\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\_IMPLEMENTACION_SP_CREDITO\build\quick_build.ps1"
```
`quick_build.ps1` (2026-09-30) arma el `build.rsp` desde `ServicioSap.csproj` en cada corrida (`/nologo /target:library /nowarn:1591,0168,0219,0414,0649,1998,4014 /langversion:latest`, un `/r:` por DLL de `SS\bin\` y de Framework64, y todos los `.cs` del `.csproj`) y compila con el Roslyn del proyecto; la salida va a `C:\temp\ServicioSapBuild` (parametro `-Out`), nunca al share. Probado el 2026-09-30: 221 fuentes, `exit=0`. Sirve en cualquier sesion. Si una tarea crea un `.cs`, basta registrarlo en `ServicioSap.csproj` (regla 19): el script lo toma solo.

**Paso 2 — cierre con MSBuild (sin tocar `bin\` ni `obj\` del share):**
```powershell
$roslyn = "\\172.16.214.58\sap\ServicioSAP\ServicioSap\packages\Microsoft.CodeDom.Providers.DotNetCompilerPlatform.2.0.1\tools\RoslynLatest"
$o = "<SCRATCH>\msbuild"
& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe" \\172.16.214.58\sap\ServicioSAP\ServicioSap\ServicioSap\ServicioSap.csproj /t:Build /p:Configuration=Debug /p:VSToolsPath= /p:CscToolPath=$roslyn /p:CscToolExe=csc.exe /p:OutDir=$o\bin\ /p:IntermediateOutputPath=$o\obj\ /nologo /verbosity:minimal /m
```
Después, comprobar que `bin\ServicioSap.dll` y `obj\Debug` del share no cambiaron de fecha; si `obj\` cambió, repetir con `/p:BaseIntermediateOutputPath=$o\obj\`. GUIA §9b muestra rutas `Z:\`: en esta máquina se usa el UNC.

**Criterios:** (1) paso 1 exit 0 y sin `: error `; (2) paso 2 `$LASTEXITCODE = 0`, línea `ServicioSap -> …\ServicioSap.dll`, sin `: error ` (avisos aceptados: `ToolsVersion 15.0`, `MSB3644`); (3) `w/crlf` en cada archivo tocado y el BOM de cada uno como estaba; (4) `git status` solo con lo esperado, sin commit; (5) antes de V2, el usuario confirma qué binario corre.

#### 6.5.2 V2 — Prueba positiva (la corre el usuario; Fable prepara y compara)

- **Depende de.** V1 con el build servido; BP de prueba `<<BP_PRUEBA>>` que existe en el mandante 110, no es prospecto y no tiene teléfono validado; visto bueno para escribir en ServicioAndroid.
- **Paso 0 — permisos** (solo lectura, conectado como `usrintranet` en ServicioAndroid): el INSERT de líneas es directo con ese login y LAN nunca lo usó para esa tabla.
  ```sql
  SELECT SUSER_NAME(), DB_NAME(), USER_NAME();
  SELECT t.n, HAS_PERMS_BY_NAME('dbo.'+t.n,'OBJECT','SELECT') sel, HAS_PERMS_BY_NAME('dbo.'+t.n,'OBJECT','INSERT') ins
  FROM (VALUES('CRED_SOLICITUD_WEB_DATOS_TEMP'),('VTASdArtCreditoWeb')) t(n);
  ```
  Sin INSERT en `VTASdArtCreditoWeb`, la cabecera se escribe, las líneas fallan en silencio (`[CREDITO ARTICULOS ERROR]`) y la respuesta sigue siendo `Concluido`.
- **Previos (solo lectura):**
  - a) `POST <<SAP>>/login/auth`: el usuario pone sus credenciales y guarda solo el token en `<<jwt_token>>`.
  - b) `GET <<SAP>>/partner/client/<<BP_PRUEBA>>` y `GET <<SAP>>/partner/client/ma/<<BP_PRUEBA>>`: anotar `NameLast`, `NameLst2`, `NameFirst`, `Namemiddle`, `Birthdt` (y **cómo llega** si está vacío: G2-40), `To_CteCliente.Stcd1`, `Gender`, `Marst`, `ZentCalles`, `ZtipoCliente`.
  - c) `GET <<SAP>>/order/getCondicion/muebles_america/12%20M%20MA%20P%20INM`. Esperado: la condición de SIGMavi o `12IA` (PCC:61). **Ojo:** esta ruta pública usa el respaldo de contado `ACEF` (OM:3331; OC:308-329) y el crédito pasa `''`: no sirve para juzgar condiciones desconocidas (`'CONDICION PRUEBA'` da ACEF ahí).
  - d) Captura SD29 de `<<SKU_MA>>`: `/ZAPI_PROPRELIST_SRV/PropreListSet?sap-client=110&$format=json&$filter=Articulo eq '<<SKU_MA>>'`; tomar la fila `OrgVtas '04'` con la condición de c): `Price`, `Installment`, `CategoryDiscount`.
  - e) `SELECT COUNT(*) FROM CRED_SOLICITUD_WEB_DATOS_TEMP WITH (NOLOCK) WHERE idMagento='TSTF0929001';` → 0.
  - f) Datos de SMS: `getSms`/`validateSms` del DMZ todavía van a `URL_INTELISIS` (DMZ CreditController.cs:76, :107); las filas de TcAAEA00030 las escribe quien atienda `getSms`. Elegir el BP y el SMS de prueba sabiendo eso.
- **Request** (Hoppscotch): `POST <<SAP>>/order/new`, Bearer `<<jwt_token>>`, datos ficticios:
  ```json
  {"entityId":"990929001","incrementId":"TSTF0929001","storeId":"muebles_america","status":"credit_payment_review","subTotal":"8198","total":"8198","cuotas":"12 M MA P INM","impuesto":"0","metodoPago":"omnipro_pago_credito","costoEnvio":"0","metodoEnvio":"tablerate_bestway","articulos":[{"sku":"<<SKU_MA>>","cantidad":"1","precio":"8198.0000","precioEspecial":"0","descuento":"0","condicion":"12 M MA P INM"}],"infoCliente":{"nombre":"Prueba Fable","cliente":"990001","codigo_promotor":"","cuenta":"<<BP_PRUEBA>>","OrigenIdMagento":"","telefono":"5500000000","direccion":"Calle Ficticia 123 ","codigoPostal":"45200","municipio":"ZAPOPAN","estado":"Jalisco","pais":"MX","correo":"prueba.fable@example.invalid","colonia":"COLONIA PRUEBA","referencia":"","numExt":"123","numInt":"","nombreClienteMavi":"Prueba","apellidoPaternoClienteMavi":"Fable","apellidoMaternoClienteMavi":"Test","telefonoClienteMavi":"5500000000","entreCalles":"","razonSocial":"","idCarrito":"990929001"},"codigoRecogerSucursal":"","sucursalDestino":0,"forzarOrder":"0","state":null,"RedimirMonedero":0.0,"Agente":"","utmSource":"WEBSITE"}
  ```
- **SELECT de verificación** (ServicioAndroid, solo lectura):
  - **Q1:** todas las columnas de `CRED_SOLICITUD_WEB_DATOS_TEMP` `WHERE idMagento='TSTF0929001' ORDER BY id DESC` (lista completa de columnas en CAMBIOS §4.2).
  - **Q2** (NULL contra `''`): `SELECT id, ISNULL('['+email+']','<NULL>') email, ISNULL('['+direccion+']','<NULL>') direccion, ISNULL('['+exterior+']','<NULL>') exterior, ISNULL('['+interior+']','<NULL>') interior, ISNULL('['+entreCalles+']','<NULL>') entreCalles, ISNULL('['+rfc+']','<NULL>') rfc, ISNULL('['+sexo+']','<NULL>') sexo, ISNULL('['+estadoCivil+']','<NULL>') estadoCivil, ISNULL('['+articulo+']','<NULL>') articulo, ISNULL('['+condicion+']','<NULL>') condicion, ISNULL('['+utmSource+']','<NULL>') utmSource, ISNULL('['+origen+']','<NULL>') origen, ISNULL('['+MetodoEnvio+']','<NULL>') MetodoEnvio, ISNULL('['+OrigenIdMagento+']','<NULL>') OrigenIdMagento, ISNULL('['+nombre2+']','<NULL>') nombre2, DATEDIFF(SECOND, fecha, GETDATE()) seg_desde_alta FROM CRED_SOLICITUD_WEB_DATOS_TEMP WITH (NOLOCK) WHERE idMagento='TSTF0929001';`
  - **Q3:** `SELECT IdArtCreditoWeb, Orden, articulo, cantidad, precio, Abono, costo FROM VTASdArtCreditoWeb WITH (NOLOCK) WHERE IdArtCreditoWeb = (SELECT MAX(id) FROM CRED_SOLICITUD_WEB_DATOS_TEMP WITH (NOLOCK) WHERE idMagento='TSTF0929001') ORDER BY Orden;`
- **Valores esperados.**
  - **Respuesta:** 200 `{"BP":"<<BP_PRUEBA>>","SalesDocument":null,"Message":"","Resultado":"Concluido"}`. Sin `[CREDITO SIN CUENTA]` ni `[CREDITO ARTICULOS ERROR]` en sap.log; si aparece `[CREDITO SD29 FILTRO]`, se anota (falló el filtro compuesto y se usó el respaldo).
  - **Q1/Q2: 1 fila** con los valores de CAMBIOS §4.2 (B.* = datos del BP de b)): `apellidoP` = `LEFT(B.NameLast,30)` (**no** `'Fable'`); `apellidoM`, `nombre` (25), `fechaNacimiento` = `B.Birthdt` o `1900-01-02` (o `0001-01-01` si G2-40 se confirma); `rfc`; `sexo` (1 Masculino, 2 Femenino, vacío `''`, otro `NO ESPECI`); `entreCalles` = `LEFT(B.ZentCalles,80)`; `estadoCivil` según `Marst`; `cliente` = `<<BP_PRUEBA>>`. Del payload: `email [prueba.fable@example.invalid]`, `direccion [Calle Ficticia 123 ]` (con espacio final), `exterior [123]`, `interior []` (no NULL), `codigoPostal 45200`, `delegacion` y `poblacion ZAPOPAN`, `estado Jalisco`, `colonia`, `condicion 12 M MA P INM`, `utmSource WEBSITE`, `idMagento TSTF0929001`, `MetodoEnvio tablerate_be`, `OrigenIdMagento []`. Teléfonos 55 / `00000000`. Fijos: `articulo []`, `uen 1`, `sucursal 504`, `origen PRODUCTOS MX`, `fecha` = `GETDATE()` del SQL, `confirmado 1`, `estatus 0`, `SucursalDestino 0`, `RedimirMonedero 0.00`. `ValidacionTelefono 1` (BP sin teléfono validado y no prospecto); `LadaValidar 55`, `TelefonoValidar 00000000` salvo SMS o teléfono validado. NULL: filas 4, 13, 14, 21-26, 31-33, 39, 44, 46, 49, 50 y 57-59.
  - **Q3: 1 línea:** `Orden 1`, `articulo <<SKU_MA>>`, `cantidad 1`, `precio` = `Price` de SD29 y `Abono` = `Installment` (CEILING si hay descuento), `costo 0` (NULL tras P8-c1). Sin SEGU00001 (`costoEnvio 0`).
- **V2b (opcional, VIU):** `incrementId 'TSTF0929002'`, `storeId 'viu'`, condición `12 M VIU P INM`, `costoEnvio '150'`, `<<SKU_VIU>>`: `uen 2`, `sucursal 505`, `Orden 1` producto y `Orden 2` SEGU00001 (cantidad 1, precio 150, Abono 12).
- **V2c (opcional, E5):** un SKU con `+` en VIU (`<<SKU_CON_MAS>>`): prueba el escape del `$filter`.
- **Limpieza:** solo el usuario o el DBA, con aprobación: primero `VTASdArtCreditoWeb` de las filas `TSTF%`, luego `CRED_SOLICITUD_WEB_DATOS_TEMP`.
- Cualquier diferencia se reporta al usuario, no se ajusta por deducción. Los pares request/response y los IDs se documentan en `Resources/master_test_plan.md` sin datos personales (reglas 14 y 25).

#### 6.5.3 V3 — Pruebas negativas

- **Depende de.** V1; V2 paso b) en verde (una caída de SAP también da `sin cuenta`); N4 depende de P2.
- **Casos** (payload de V2, cambiando solo lo indicado): **N1** `incrementId 'TSTF0929011'`, `cuenta ''` · **N2** `'TSTF0929012'`, `cuenta '0000000000'` · **N3** (opcional) `'TSTF0929013'`, `cuenta 'C00000000'` (prueba que no hay mapeo `C`, DU2) · **N4** `'TSTF0929014'`, BP válido, `condicion '99 M MA P NOEX'`, `costoEnvio '150'` · **N5** (opcional) como N4 con `condicion ''`. SELECT por caso: `COUNT(*) … WHERE idMagento='<incrementId>'`; en N4 y N5 también Q1 y Q3.
- **Esperado.** N1-N3: 200 `"Error, Error en SetOrder: sin cuenta"`; sap.log `[CREDITO SIN CUENTA]` (si P13 no lo quitó) y `[ORDER NEW ERROR]`; `COUNT = 0`; la guía SQLite y las lecturas de SMS y teléfono sí ocurren (van antes de la compuerta, OM:1793-1804). N4 con el código actual: `Concluido`, cabecera con esa condición y 0 líneas (tampoco SEGU00001), `[CREDITO ARTICULOS ERROR]`. N4 con P2-A: solo SEGU00001 `Orden 2`, cantidad 1, precio 150, Abono 12. N4 con P2-B: 200 `Error, …` y `COUNT = 0`. N5: igual que N4 con `''`.
- **Reglas.** G1-09, G1-10, G1-12, G2-05, G5-20, G4-24, G2-22.

#### 6.5.4 V4 — E2E completo

- **Depende de.** T1a, T1b (encendido en la instancia de prueba), T2a-T2d desplegados; V2 y V3 en verde; cliente de prueba con su BP como `cuenta` (DU2); URLs de ambiente apuntando a instancias vivas (DU1: no son bloqueo); aprobaciones del usuario y de Valentín.
- **Pasos:** (1) checkout a crédito en Magento stage: `omnipro_credito_pending` PENDIENTE con `credit_increment_id 'CRED{quoteId}'`; ServicioSAP responde `Concluido`. (2) Q1 y Q3 con `idMagento 'CRED{quoteId}'`. (3) sap.log `LiberadorCredito Info [<id>]`, `CallMagentoCallback [1] Token OK`, `dmz=OK`; DMZ `AuthorizationResult … Magento=OK`. (4) Magento `EN_ANALISIS` con `cuenta` = BP e `id_solicitud` del tipo acordado (Q-T2-2). (5) Cron de 5 minutos: `creditStatus` → `EN_ANALISIS`. (6) El dueño autoriza: `AUTORIZADO`, `placeOrder`, `notifyIntelisisOrderId` con 200 y `UpdateCreditOrderId` con `rowsUpdated`. (7) Registry cron: `order/new` con el increment real → `PedidoExistente` (T2c), sin fila ni cupón nuevos. (8) Otra compra rechazada: `RECHAZADO`. (9) Opcional: liberador inalcanzable → `LiberadorCredito Error`, aviso `RECHAZADO`, Magento reactiva el quote (MCO:192-205). Anotar la nota de `setCAccount` (P12).
- **Aceptación.** Cada salto con evidencia (log y fila) y el par request/response exacto en `Resources/master_test_plan.md`, sin datos personales. Sin solicitudes duplicadas. Sin `ERROR CallMagentoCallback DEFINITIVO` en el camino feliz.

### 6.6 Sesiones S1-S4

**Antes de S1 (el usuario):** nada que publicar: este documento y los apuntadores ya están en el vault (2026-09-30). **No correr** `apply_s26.py` del scratchpad: queda obsoleto (metería el borrador viejo en PLAN §26). Guardar el diff base (§8 a).

**S1 — LISTO + build (Fable solo; no espera a nadie).**
1. Leer §0, §5, §6.0-§6.2 y §6.5.1. Verificar el estado: `git status` (4 archivos), `git diff --stat` (+126/−44), HEAD `2cf425f` y los grep de §5.1. Si algo no cuadra, parar y reportar.
2. Aplicar **R4 → R3 → R1 → T1a**, cada una con CRLF (V1 paso 0) y chequeo rápido (V1 paso 1).
3. MSBuild de cierre (V1 paso 2).
4. Redactar para el usuario, en un solo mensaje, el cuestionario de §6.3 y las preguntas por dueño de §6.4, más las lecturas previas que corre él: R2-V, V2 paso 0 (permisos), SELECT de P5, captura SD29 (P7), DDL e historial (P8), captura BP05MA (P6, G2-40), `INFORMATION_SCHEMA` de `VentasCupones` (P3-C), Q6.
5. Actualizar el tablero §6.1 (R1, R3, R4, T1a → HECHO con fecha), §3 (G3-08, G3-18, G2-24, G5-11, G5-12…) y CAMBIOS §3 (una subsección por tarea con Antes/Después). Sin commit.
6. Reportar `git status`, `git diff --stat`, `git diff`, salida de V1 y `ls-files --eol`.

**Entre S1 y S2 (el usuario):** contesta el cuestionario, corre las lecturas previas y, si el binario está confirmado, V2 (MA) y V3 N1/N2/N4.

**S2 — decisiones del usuario.**
1. Registrar cada respuesta como DU11, DU12… (§4.5 y CAMBIOS §2).
2. Implementar solo lo elegido, en este orden: P1 + P2 → P3 → R2 (si ii) → P13 → P5 + P6 → P7 → P8 → P10 (si se activa) → P14 (aparte, con la prueba BP01) → P15-B (tarea aparte). Las opciones sin código solo tocan documentación.
3. V1 después de cada una; MSBuild al final.
4. Ajustar los valores esperados de V2 y V3 a lo decidido (CAMBIOS §4.2) y pedir al usuario que los corra.

**S3 — después de los otros equipos (Q-T1-*, Q-T2-*).** T1b (si Q-T1-1 = acepta el BP), T2a, T2b, T2c y, con ServicioSAP desplegado, T2d en el DMZ (compilar el DMZ). V1 y MSBuild; pruebas de ruta; T1b con el interruptor en `false` y luego `true` en la instancia de prueba.

**S4 — E2E.** V4 completo, con las aprobaciones del usuario y de Valentín. Fable prepara requests, SELECT y valores esperados; el usuario ejecuta y pega; Fable compara y documenta.

### 6.7 Criterio de cierre del proceso de crédito

- [ ] Toda tarea de §6.1 está HECHO, cerrada por decisión documentada o anotada como bloqueada con su dueño.
- [ ] MSBuild en verde; `w/crlf` en todo archivo tocado; `git status` solo con lo esperado; commit solo si el usuario lo pidió (E5 en commit propio).
- [ ] V2 y V3 pasan con los valores de CAMBIOS §4.2 ajustados a las decisiones; V4 completa sin duplicados ni `DEFINITIVO` en el camino feliz.
- [ ] Cada prueba documentada con request y response exactos en `Resources/master_test_plan.md`, sin datos personales.
- [ ] §3, §4.5 y §6.1 de este documento, MATRIZ §3 y CAMBIOS §2, §3 y §4.2 al día.

**Fuera de este plan** (se reportan, no se arreglan aquí):
- `CallSetCAccountCallbackAsync` (OM:1287+) acepta cualquier certificado (:1308-1309).
- `credit/SendSmsNewNumber` arma el INSERT con `string.Format` (inyección SQL heredada de LAN).
- `LinkMagentoAccountAsync` sin `sap-client=110` (BPM:842-843) y Q9 (falla del PATCH `ZidMagento`).
- `GetProductsBySkuAsync` (PM:69) y `GetStockAsync` (PM:212) sin escapar el SKU (solo se corrige si se porta P10).
- El código del promotor va sin escapar en dos URLs internas (`get_personalById?user_id=`, `AS_GET_ZQBP_AGENTE?Zagente=`); desaparece del crédito con P3-A.
- Bug B8: `Logger.cs:26-31` crea el directorio fuera del try y Logger se llama desde bloques catch.
- `credit/GetCreditAmounts` lee `mavi_credilana_info`, que nadie llena (PLAN_FABLE:170): afecta el checkout de crédito, no `order/new`. Sin dueño.
- Otros llamadores de los SP de crédito fuera de `order/new`: `credit/CreditoWeb_SaveData_Articulos` y `CreditoWeb_SaveFirstData` (apertura de cuenta ProductosMX, siguen en LAN; CSV fila 21 "ANDROID - No requiere SAP"; GANTT feb-mar 2027) y la rama `Update` de Credilana.

---

## 7. Contradicciones y documentos desactualizados

### 7.1 Contradicciones y qué gana

| # | Contradicción | Fuentes | Qué gana |
|---|---|---|---|
| C1 | El vault nunca recibió los borradores del 2026-09-29: PLAN sin §26, CAMBIOS sin §3.6 y con "3 archivos", GUIA:570 sin corregir, PLAN_FABLE 7c con "falta la URL del liberador" y `validateCredit` pendiente; `apply_s26.py` no corrió | PLAN:15; CAMBIOS:65, :116; GUIA:570; PLAN_FABLE:146 | **Resuelto el 2026-09-30** con este documento y los apuntadores; `apply_s26.py` queda obsoleto |
| C2 | El borrador R2-V (y la nota de G3-19 en la MATRIZ) volvía a revisar el puerto 20400 contra 44300 | plan_s26:296; MATRIZ:270; PLAN:1098-1108 | **La aclaración del usuario del 2026-09-23**: el puerto es informativo. R2-V queda solo como evidencia E2E de CteTelSet por `obtenerUrl` |
| C3 | El borrador P8 (a) volvía a preguntar si SD29 es la fuente del precio; MATRIZ G4-21 lo re-calificó "decisión abierta" | plan_s26:463; MATRIZ:296; FLUJO_CREDITO:215; GUIA:281 | **La decisión del usuario del 2026-09-11** (SD29 por SKU). Solo queda Q6 |
| C4 | Límite de crédito: el 2026-09-11 "sí debe frenar"; PLAN Q21 y §24.7 dieron por hecha la paridad sin respuesta; el comentario del DMZ promete una validación FI/FICA que no existe | FLUJO_CREDITO:280-298; GUIA:539; PLAN:1242-1251, :2205-2211; DMZ OrdersController.cs:366-368 | **Necesita respuesta explícita:** P17 |
| C5 | MAYÚSCULAS: CAMBIOS fila 7 y PLAN §24.3 dicen que LAN guardaba `sexo` en mayúsculas (CTN:132); el dominio del gerente es `Femenino`/`Masculino`/`NO ESPECIFICADO` y los clientes web desde orden tenían `@SexoCte` NULL | CAMBIOS §4.2 fila 7; PLAN:1320, :2149-2159 | **El historial** (SELECT de P5) decide por campo: P5-C |
| C6 | Logs: "no hay logs que LAN no tenga" (2026-09-24) contra "todo error visible con log + excepción" (2026-09-25); INVLOGS propone quitar INFO que T1a conserva | PLAN:1276, :1753; SKILL:48; INVLOGS filas 59-63, 101-103 | **Las dos reglas del usuario**, reconciliadas en P13-D. INVLOGS no es regla del usuario |
| C7 | El borrador P12-B pedía al DMZ restaurar los códigos 400/409/422/500 | plan_s26:542; GUIA:166-170, :511, :729 | **GUIA §1.5** (el DMZ no decide status codes; ya se revirtió una vez). Además, el 422 de `sin cuenta` nunca se alcanzó en crédito |
| C8 | `creditStatus`: Dev 2 y el CSV lo mapean a `sale/filter` SD36 con 01/02/03; LAN y Magento usan `{status}` AUTORIZADO/EN_ANALISIS/RECHAZADO y el crédito no crea documento SD36 | DEV2:165; `_NUESTROS_ENDPOINTS/CHECKLIST_DEV2_ENDPOINTS_SAP.md:55`; CSV fila 82; GUIA:83; LOC:484-504; MPC:364-378 | **El contrato de LAN/Magento.** Coordinar con Dev 2 y Javier antes de T2a |
| C9 | `validateCredit`: el CSV fila 89, DEV2 S4-03 y PLAN_FABLE 7c lo planean; el DMZ lo tiene comentado, Magento no lo llama y ServicioSAP no lo tiene | CSV fila 89; DEV2:161, :167; PLAN_FABLE:146; DMZ OrdersController.cs:366-402 | **El código:** N/A, no se migra |
| C10 | Cupones: deprecados por el usuario (2026-09-26), pero el CSV fila 7 mantiene `credit/codigoPromocion` "Requiere desarrollo", CHECKLIST_DEV1:27 planea su wrapper y DEV3 E-46 lo da por construido | PLAN:1934, :2256; CSV fila 7; CHECKLIST_DEV1:27; DEV3:311-315 | **El usuario** para la quema en crédito (P3); la ruta de validación la deciden Magento y Javier |
| C11 | Nombre de la tabla de cupones: DEV3 dice "el nombre acordado es VentaCupon"; DU9 dice `VentasCupones` | DEV3:315-317; CAMBIOS:107 | **DU9** |
| C12 | PLAN §17 quitó la rama `Update` "sin llamador en LAN"; FLUJO_SP §4.2 dice que está viva (Credilana) y DEV3 avisa que el SP tiene tres consumidores | PLAN:1257-1266; FLUJO_SP:704-715; DEV3:434-439 | **El alcance** (Credilana fuera; solo `order/new`). Si Dev 3 porta M-13 necesitará lo recortado |
| C13 | El borrador P7-D decía que "02 = crédito" (OM:821-823) no tenía evidencia | plan_s26:451; GUIA:227; FLUJO_CREDITO:210 | **GUIA §1.7** documenta DistrChan 02 = Crédito; falta capturar el código de `CDistr` en SD29 |
| C14 | E5 creó 4 métodos y un log sin autorización registrada | GUIA:275, :281; FLP:82-135; OM:997-1025 | **Pendiente de ratificar:** P20 |
| C15 | T1b llama un `WebClient` síncrono; SKILL regla 12 y GUIA §1.6 piden async | SKILL:52; GUIA:172-178; LIB:48-107 | **Decisión del usuario:** P19 |
| C16 | P7-C propone `[JsonPropertyName]`; SKILL regla 18 pide Newtonsoft `[JsonProperty]` | SKILL:58; FinalListProper.cs:1; FLUJO_SP:1331 | **La convención del archivo** (System.Text.Json), con la excepción anotada |
| C17 | Conteos 41/28 (MATRIZ, PLAN §25.4) contra 37/32 (CAMBIOS §1) | MATRIZ:25-52; CAMBIOS:67-86 | **MATRIZ §0 (41/28)** con la sensibilidad escrita en §1 |
| C18 | DU4 dice "el validado más reciente"; la API toma el más reciente de cualquier tipo y su bandera | A_GET_TelefonoValidado.py:5-36; SCW:514-523 | **DU4 aceptado**; la regla efectiva queda escrita en G3-22 |
| C19 | Prospecto: prefijo `P` del SP contra `ZtipoCliente` de ServicioSAP, sin registro | SPD:216; SCW:538-552; CSV fila 11 (`PROSPECTO` en mayúsculas; la comparación no distingue) | **Confirmación del usuario:** P16 |
| C20 | FLUJO_CREDITO §3.1 muestra la respuesta de `validateCredit` como si fuera la de `setOrder`; §2 paso 5 dice que `updateCreditOrderId` responde "3 (entero)" | FLUJO_CREDITO §2, §3.1; LOC:151-160, :455-482, :526; LOM:2053 | **El código de LAN:** `setOrder` responde `Ok(cuenta)`; `updateCreditOrderId`, `{success, rowsUpdated}` |
| C21 | G5-27 dice que `Codigo` y `Agente` son VARCHAR(10) | MATRIZ G5-27; SCU:51-57, :115-159 | **SCU:** `@Codigo` 30 en la quema; 10 solo en la fila regenerada |
| C22 | G5-25 lista `sin cuenta` → 422 como comportamiento de la era LAN para crédito | MATRIZ G5-25; LCM:255-258; LOM:624, :649 | **El código:** nunca se alcanzó en crédito |
| C23 | Magento promete un reintento `GetPendingCreditOrders` | MPC:293-299 | **El código:** no existe (G5-31) |
| C24 | Citas del borrador plan_s26 | plan_s26:59, :95, :250, :354, :567, :611, :736 | **Corregidas aquí:** §5.1 (E2), §6.2.4 (T1a), §6.3.2 (P1), §6.3.15 (P14), §6.4.1 (T1b), §6.4.5 (T2d), §4.3 (DMZ) |
| C25 | MATRIZ §0.1 dice que hasta que Magento mande el BP toda orden real termina en `sin cuenta` | MATRIZ:23; MOM:719 | **DU2:** es configuración de Magento, no bloqueo de ServicioSAP |
| C26 | Dueño de `updateCreditOrderId`: Alan (borrador), Dev 2 (DEV3:423), Marcos (CSV fila 83) | plan_s26:134; DEV3:423; CSV fila 83 | **Sin resolver:** §6.4 los lista a todos; coordinar antes de T2b |

### 7.2 Afirmaciones desactualizadas (no usar)

| Afirmación vieja | Dónde | Qué vale hoy |
|---|---|---|
| El SKU del `$filter` de SD29 va sin escapar (bug B1) | MATRIZ G4-21; CAMBIOS §5.3 B1; PLAN §18.5 #5, §23.5, §24.4, §25.5 #15 | Arreglado por E5 (FLP:82-110), sin probar contra SAP |
| `origen` fijo `PRODUCTOS MX`; Magento nunca manda `origen`; DIMAS MX inalcanzable | PLAN §9.2, §11.3, §17, §19.3; FLUJO_CREDITO §6, §10; ANALISIS §4; FLUJO_SP §8-F; GUIA §8.2 | DU7/E2: Magento lo manda desde `additional_information` (MOM:705-708) |
| `fecha = DateTime.Now` | PLAN §10.4 #12 (:708) | DU8/E3 |
| "Sin Size a propósito" / "insertar como venga" | PLAN §10.4 #10 (:704), §18.3 decisión 13 (:1324), §22.3, §22.8 | Q1: ancho del parámetro del SP |
| `sexo = ''` para `Gender` vacío (primera versión) | PLAN §23.8, §23.4 Q1 | DU5/E4 (`SexoLegado`) |
| `PreferirMaestro` (respaldo a datos de la orden) | PLAN §12.3 (:920) | Código muerto por DU6; lo limpia R4 |
| Cliente nuevo / invitado / BP genérico de invitado / liberador para cliente nuevo | PLAN §22.5, §24.3 Q12; COMPARATIVA_SETORDER D-13, E-09, 12e; FLUJO_CREDITO §4.6; PLAN_FABLE:231 | DU6/E1 |
| Fuente del teléfono: BP05MA `to_CteTel`, CteTelSet directo, "la API ya filtra Movil", "CteTel integrada en SAP BP" | FLUJO_CREDITO §4.4; FLUJO_SP §4.1, §3.0c; PLAN §15.1, §22.4 A; Resources/lan_tables_to_sap_master.md:13 | Q4/DU4: `A_GET_TelefonoValidado` (regla efectiva G3-22) |
| "Error → 400 con el mensaje"; `CreditIncrementId 'credit_12100049999'`; `updateCreditOrderId` responde el entero 3 | FLUJO_CREDITO §7 (:371); Resources/Flujo_Orden_Credito.md:98, :106 | 200 `Error, …` (OC:45-46); `'CRED'+quoteId`; `{success, rowsUpdated}` |
| `Zcrmcantidad` como línea de crédito | FLUJO_SP §3.0b #3 (:197-204), §3.0f (:525) | `ZlimCred` (usuario 2026-09-23) |
| Archivos maestros de Resources como fuente del SP | Resources/implementation_plan_master.md, lan_tables_to_sap_master.md, master_migration_summary_unified.md | Excluidos por el usuario para este SP (FLUJO_SP:1355-1360) |
| Citas de OM desde :997 en MATRIZ §0.3/§0.6 y CAMBIOS (§0-§5); callback en OM:1222-1228 y :1188-1196 | MATRIZ:330-331; CAMBIOS §3.1, §5.2 | Corridas +29/30 por E5 (p. ej. `SaveGuideAsync` :1764 → :1793; `[ORDER GetCondicion ERROR]` :3329 → :3359; callback :1194-1282) |
| "3 archivos, +69/−41" | CAMBIOS:65, :116, §3.5; PLAN §25 (:2304); MATRIZ §0.3 | 4 archivos, +126/−44 |
| La §9 es el plan vigente | PLAN:15 | Este documento |
| Rutas `Z:\` y MSBuild de VS 18 | GUIA §9b; PLAN §5 | UNC `\\172.16.214.58\sap` y MSBuild de Framework64 (V1) |
| `VTASdArtCreditoWeb` "sigue en LAN" | GUIA:570 | Lo escribe ServicioSAP `order/new` (corregido en GUIA el 2026-09-30) |
| El CSV como tablero de avance | CSV filas de crédito | Informativo (GUIA §3); atrasado contra el código |

---

## 8. TUTORIAL: cómo usar Fable 5.1 con este plan

Fable 5.1 (Claude Fable 5.1) es el modelo de acceso general más capaz de Anthropic, pensado para razonamiento difícil y trabajo largo y agéntico. Sus turnos pueden tardar muchos minutos en tareas difíciles: déjalo trabajar. Rinde mejor con el objetivo, las reglas y los criterios de aceptación claros que con instrucciones paso a paso; por eso los prompts de abajo apuntan a secciones de este documento en lugar de repetirlas.

### (a) Prerrequisitos

1. **El share responde.** En PowerShell: `Test-Path "\\172.16.214.58\sap\ServicioSAP"` → `True`.
2. **Estado de git** (solo lectura):
   ```powershell
   git -c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP" -C "\\172.16.214.58\sap\ServicioSAP" status --short
   git -c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP" -C "\\172.16.214.58\sap\ServicioSAP" diff --stat
   ```
   Esperado: 4 archivos `M` (OM, SCW, FLP, ICR), 126 inserciones y 44 borrados, rama `SpExportaEcommerce`, HEAD `2cf425f`. Si no cuadra, no empieces: pregunta primero.
3. **Guarda el diff base** para ver después solo lo que agregó Fable:
   ```powershell
   New-Item -ItemType Directory -Force C:\temp | Out-Null
   git -c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP" -C "\\172.16.214.58\sap\ServicioSAP" diff | Out-File -Encoding utf8 C:\temp\credito_base_2026-09-30.diff
   ```
4. **Este documento** existe en `\\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md`; ábrelo en Obsidian y revisa §6.0 y §6.1.
5. **No corras** `apply_s26.py` (obsoleto).

### (b) Abrir la sesión con Fable 5.1

1. En la app de escritorio de Claude, abre **Claude Code** y crea una **sesión nueva**.
2. Elige como carpeta de trabajo `C:\BackEndEcommerce` (así se cargan tus reglas de memoria: DU1, DU2, Marst/Gender, etc.).
3. En el **selector de modelo** elige **Fable 5.1** y en el esfuerzo elige **xhigh** (el recomendado para código y trabajo agéntico largo) o **High** si prefieres turnos más cortos. Si tu versión lo permite, también puedes cambiar el modelo con el comando `/model` dentro de la sesión.
4. Deja el modo de permisos que **pide confirmación** antes de editar archivos y ejecutar comandos: así ves cada cambio en el share antes de que ocurra.

### (c) Una sesión por etapa

- **Una sesión = una S** (S1, S2, S3 o S4). Nunca le des el plan entero: se pierde el criterio a la mitad y empieza a inventar equivalencias (PLAN_FABLE, "Para qué existe este documento").
- Cada sesión termina actualizando §6.1 (tablero) y, si hubo decisiones, §4.5. Así la siguiente sesión arranca leyendo el estado real.
- Si una sesión se alarga mucho, que termine la tarea en curso, actualice el tablero y reporte; sigue en una sesión nueva con el mismo prompt de la S.

### (d) Prompts de arranque (listos para pegar)

**S1 — tareas LISTO + build**
```text
Esta sesión es S1 del crédito web LAN → ServicioSAP, y solo S1.

Lee completos, en este orden:
1. \\172.16.214.58\sap\.agents\skills\lan-sap-migration\SKILL.md
2. \\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\GUIA_MIGRACION_FABLE.md §0-§2, §1.9 y §9b
3. \\172.16.214.58\sap\.agents\skills\lan-sap-migration\MappingMetods\CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md §0, §5, §6.0, §6.1, §6.2, §6.5.1, §6.6 (S1) y §8 (h)

Objetivo: aplicar R4 → R3 → R1 → T1a exactamente como están en §6.2, compilar (V1) y dejar redactadas las preguntas.

Reglas:
- Primero verifica el estado (§6.6 S1 paso 1). Si git status, el diff (4 archivos, +126/−44) o una línea citada no cuadra, detente y repórtame.
- Replicar, no mejorar (GUIA §1.9): ninguna variable, parámetro, constante o método que la tarea no nombre. Si falta algo, para y pregunta.
- DU5: cada columna guarda exactamente lo que guardaban LAN + SP.
- No toques tareas DECISION ni BLOQUEADO_EQUIPO. Si una tarea LISTO te lleva a una, detente.
- Después de cada Edit: restaura CRLF conservando el BOM de cada archivo (§6.5.1 paso 0) y comprueba git ls-files --eol = w/crlf.
- Chequeo rápido después de cada tarea y MSBuild al final (§6.5.1 pasos 1 y 2), sin escribir en bin\ ni obj\ del share.
- No hagas commit. No arranques el servicio, no ejecutes SQL ni llames endpoints: prepara los comandos y yo los corro.
- Nunca imprimas secretos. No mapees cuentas C… (DU2). No marques credenciales ni URLs de Dev como riesgo (DU1).
- El código del share manda sobre los documentos.

Al terminar:
1. Actualiza §6.1 del documento (R1, R3, R4, T1a → HECHO con fecha), las filas de §3 que cambian, y agrega en CAMBIOS §3 una subsección por tarea (Antes/Después con archivo:línea). Los .md quedan sin BOM y con CRLF.
2. Redáctame en un solo mensaje el cuestionario de §6.3, las preguntas por dueño de §6.4 y la lista de lecturas previas que tengo que correr yo (§6.6 S1 paso 4).
3. Repórtame git status, git diff --stat, el git diff de los archivos tocados, la salida de V1 pasos 1 y 2 y git ls-files --eol.
```

**S2 — decisiones del usuario**
```text
Esta sesión es S2 del crédito web LAN → ServicioSAP, y solo S2.

Lee SKILL.md, GUIA_MIGRACION_FABLE.md §0-§2, §1.9 y §9b, y de CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md: §0, §4.5, §5, §6.0, §6.1, §6.3 (solo las tareas que respondo abajo), §6.5 y §6.6 (S2).

Mis respuestas al cuestionario de §6.3 (textuales):
<pega aquí tus respuestas, una por línea: "P1 = …", "P2 = …", …>

Objetivo: registrar cada respuesta y aplicar solo las opciones que elegí, tal como están escritas en §6.3, en el orden de §6.6 S2.

Reglas:
- Registra cada respuesta como DU11, DU12… en §4.5 y en CAMBIOS §2, con mis palabras, antes de tocar código.
- Si una respuesta no coincide con ninguna opción escrita, o una opción necesita algo que no está escrito, detente y pregúntame.
- Replicar, no mejorar (GUIA §1.9); DU5; no toques tareas BLOQUEADO_EQUIPO.
- Respeta los choques de §6.1 (P1+P2 juntas; P13 después de P1, P2 y R2; P5+P6 después de R4; P7 → P8 → P10).
- CRLF + BOM después de cada Edit; chequeo rápido después de cada tarea; MSBuild al final.
- Sin commit; no ejecutes SQL ni endpoints; nada de secretos; no mapees cuentas C…; no marques valores de Dev como riesgo.

Al terminar:
1. Actualiza §6.1, §3, CAMBIOS §3 y §4.2 (columnas afectadas) y MATRIZ §3 (estado de las reglas).
2. Ajusta los valores esperados de V2 y V3 a lo decidido y dame los requests y SELECT listos para correr.
3. Repórtame git status, git diff --stat, el git diff, V1 y ls-files --eol.
```

**S3 — tareas de otros equipos**
```text
Esta sesión es S3 del crédito web LAN → ServicioSAP, y solo S3.

Lee SKILL.md, GUIA_MIGRACION_FABLE.md §0-§2, §1.5, §1.9 y §9b, y de CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md: §0, §4.5, §6.0, §6.1, §6.4, §6.5 y §6.6 (S3).

Respuestas de los otros equipos (textuales, con quién y fecha):
<pega aquí: Q-T1-1 … Q-T1-8 (Valentín), Q-T2-1 … Q-T2-5 (crédito / Alan), coordinación con Dev 2 sobre creditStatus>

Objetivo: implementar solo las tareas de §6.4 que esas respuestas desbloquean (T1b, T2a, T2b, T2c y, si ServicioSAP ya está desplegado, T2d en el DMZ), con el diseño de §6.4.

Reglas:
- Registra las respuestas en §6.4 (con quién y cuándo) antes de tocar código.
- Si una respuesta deja una tarea a medias o sin destino claro, no la implementes en parcial: detente y pregúntame.
- Si una respuesta contradice el diseño (por ejemplo, Q-T1-1 = no acepta el BP), no enciendas nada y dime qué pregunta nueva hace falta.
- T1b queda con el interruptor en false. El DMZ es solo puente (GUIA §1.5): solo cambia curl.Get/Post por GetSAP/PostSAP.
- CRLF + BOM después de cada Edit; V1 (y la compilación del DMZ de §6.4.5 si lo tocas); sin commit; no ejecutes SQL ni endpoints; nada de secretos.

Al terminar: actualiza §6.1 y §3, agrega en CAMBIOS §3 una subsección por tarea, dame las pruebas de ruta listas para correr y repórtame git status, git diff (ServicioSAP y DMZ), V1 y ls-files --eol.
```

**S4 — E2E**
```text
Esta sesión es S4 del crédito web LAN → ServicioSAP: la prueba de punta a punta V4.

Lee SKILL.md (reglas 14 y 25), y de CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md: §0, §6.1, §6.5.2, §6.5.3 y §6.5.4.

Objetivo: guiarme en V4 paso por paso. Tú preparas cada request, SELECT y valor esperado; yo los ejecuto y te pego el resultado; tú comparas y documentas.

Reglas:
- No ejecutes nada contra servidores: ni SQL, ni endpoints, ni el liberador. Cada escritura la apruebo yo antes.
- Usa solo marcadores (<<BP_PRUEBA>>, <<SKU_MA>>…) en lo que escribas en el vault; nada de datos personales ni secretos.
- Si un valor no coincide con lo esperado, repórtamelo con la evidencia; no lo ajustes por deducción.
- Documenta cada par request/response y cada ID en Resources/master_test_plan.md, sin datos personales.

Al terminar: marca V4 en §6.1 (HECHO o con el paso que falló) y revisa el criterio de cierre de §6.7.
```

### (e) Cómo revisar el trabajo de Fable

1. **Ver qué cambió:**
   ```powershell
   $g = 'git -c "safe.directory=%(prefix)///172.16.214.58/SAP/ServicioSAP" -C "\\172.16.214.58\sap\ServicioSAP"'
   Invoke-Expression "$g status --short"
   Invoke-Expression "$g diff --stat"
   Invoke-Expression "$g diff" | Out-File -Encoding utf8 C:\temp\credito_despues_S1.diff
   Invoke-Expression "$g ls-files --eol -- ServicioSap/ServicioSap/Methods/Order/OrderMethods.cs ServicioSap/ServicioSap/Methods/Credit/SolicitudCreditoWebMethods.cs ServicioSap/ServicioSap/Models/SAP/Credit/SolicitudCreditoWebModels.cs ServicioSap/ServicioSap/Methods/Credit/LiberadorCreditoMethods.cs"
   ```
   Compara `C:\temp\credito_despues_S1.diff` con `C:\temp\credito_base_2026-09-30.diff` (por ejemplo con VS Code: `code --diff C:\temp\credito_base_2026-09-30.diff C:\temp\credito_despues_S1.diff`).
2. **Qué revisar contra LAN:** por cada hunk, abre la línea de LAN o del SP que cita la tarea (§6.2/§6.3) y confirma que hace lo mismo; que el diff tiene exactamente las líneas que la tarea dice (R3 = 1 línea, R1 = 2 líneas); que no apareció ningún método, parámetro, variable o log que la tarea no nombre; que `ls-files --eol` da `w/crlf` y `git diff --stat` no muestra archivos cambiados enteros; que MSBuild terminó en verde; y que no hay commit.
3. **Llevarlo a una sesión revisora.** Abre otra sesión (Fable 5.1 u otro modelo) y pega:
   ```text
   Revisa el trabajo de la sesión S1 del crédito web. Lee CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md §6.2 y GUIA_MIGRACION_FABLE.md §1.9.
   Compara C:\temp\credito_base_2026-09-30.diff contra el git diff actual de \\172.16.214.58\sap\ServicioSAP (usa -c safe.directory).
   Para cada tarea (R4, R3, R1, T1a) dime: si el cambio es exactamente el de la spec, si coincide con la línea de LAN/SP citada, si se agregó algo no pedido, y si el EOL quedó w/crlf. Solo lectura: no edites nada.
   ```

### (f) Cómo registrar una decisión para que la vea la siguiente sesión

1. Contesta en el chat con el id y la opción: por ejemplo `P2 = A`, `P3 = A (nadie lee VentasCupones, confirmado con <persona>)`.
2. Pide a Fable que la registre **antes** de tocar código: una fila DU11 (DU12…) en §4.5 de este documento con fecha, tu texto, la sesión que la implementa y el estado; la misma fila en CAMBIOS §2; y el estado de la tarea en §6.1.
3. Si decides fuera de una sesión, edita tú §4.5 en Obsidian con el mismo formato. La siguiente sesión la toma de ahí.
4. Una decisión solo vale si está escrita por ti o citada con tus palabras. Lo que diga un documento, un CSV o un comentario de código no es decisión.

### (g) Si Fable propone una "mejora"

Recházala. GUIA §1.9: replicar es uno a uno; está prohibido crear variables, parámetros o constantes sin consultarlo y, si replicar exige algo que no existe (un método nuevo, por ejemplo), se pregunta antes de construirlo (§1.9b), y los vacíos y `0` del legado se respetan (§1.8c). Respuesta sugerida:
```text
No. Por GUIA §1.9 esto se replica igual que LAN + SP, sin mejoras. Deja el código como dice la tarea. Si crees que es un defecto real, anótalo en §6.7 "Fuera de este plan" con archivo:línea y sigue.
```
Solo si tú quieres cambiar el comportamiento, se convierte en una DECISION nueva (con opciones) y se registra en §4.5 antes de implementarla.

### (h) Errores comunes

| Error | Cómo se ve | Cómo evitarlo |
|---|---|---|
| Finales de línea LF | `git diff --stat` muestra un archivo cambiado entero; `ls-files --eol` da `w/lf` o `w/mixed` | Restaurar CRLF después de **cada** Edit (§6.5.1 paso 0); también en los `.md` |
| Perder o agregar BOM | Diff en la primera línea | El script de PowerShell detecta y conserva el BOM; OM, SCW, SCM y LIB sin BOM; FLP, ICR, OC, BPM y PM con BOM |
| Editar documentos en vez de código | El tablero dice HECHO pero `git diff` no cambió | Revisar siempre el `git diff`; el documento se actualiza **después** del código |
| Saltarse MSBuild | "Compila con csc" y falla en el servidor (archivo sin registrar en el `.csproj`) | Cerrar cada sesión con V1 paso 2 |
| Mapear cuentas `C…` | Aparece un `StartsWith("C")` o una traducción de cuenta | DU2: la cuenta es el BP numérico; nunca se mapea |
| Marcar credenciales o URLs como riesgo | Reportes de "credenciales en el Web.config" o "URL de Dev" | DU1: son de Dev y no son bloqueo; nunca imprimir sus valores |
| Imprimir secretos | Valores del `Web.config`, `USER_DMZ` o tokens en el chat o en el vault | Redactar `value="…"` y `connectionString="…"` |
| Implementar una DECISION sin respuesta | Código de P1-P20 sin fila en §4.5 | Solo con tu respuesta escrita |
| Implementar en parcial una tarea bloqueada | Rutas `creditStatus` "de prueba" o destinos inventados | T1b/T2* solo con las respuestas de los equipos |
| Hacer commit | `git log` con un commit nuevo | Sin commit salvo que tú lo pidas; E5 en commit propio |
| Compilar en `bin\`/`obj\` del share | Cambia la fecha de `bin\ServicioSap.dll` | `OutDir` e `IntermediateOutputPath` fuera del share |
| Ejecutar SQL o endpoints | Filas nuevas o llamadas sin tu visto bueno | Fable prepara; tú ejecutas |
| Confiar en un documento contra el código | Citas que no cuadran | Releer la línea; manda el código (§7) |
| Usar la ruta pública `getCondicion` para una condición desconocida | Da `ACEF` | El crédito pasa `''` como respaldo (V2 c) |

---

## 9. Enlaces a los documentos fuente

- Reglas y criterio (obligatorios): `SKILL.md` · [[GUIA_MIGRACION_FABLE]] (§0-§2, §1.5, §1.7-§1.9, §8.2, §8.3, §9b)
- Reglas por regla y conteos: [[MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP]]
- Decisiones DU1-DU10, cambios E1-E5 y las 59 columnas: [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]] (§2, §3, §3.6, §4)
- Historia y preguntas Q1-Q22: [[PLAN_EJECUCION_SP_CREDITO_A_CODIGO]] (§9-§25; su §26 apunta aquí)
- Diseño del SP y decisiones de diseño D1-D10: [[FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO]] · [[ANALISIS_SP_CREDITO_WEB_DATOS]]
- Flujo LAN contra SAP: [[FLUJO_CREDITO_LAN_VS_SAP]] · [[COMPARATIVA_SETORDER_LAN_VS_SAP]]
- Capturas reales: [[CAPTURAS_REALES_APIS]]
- Paquetes de Fable: [[PLAN_FABLE_POR_CONTROLADOR]] (7a, 7c, 9)
- Otros del vault: `MappingMetods/MAVI - DMZ-SAP.csv` (informativo) · `MappingMetods/CatalogoConfiguracion.csv` (DU3) · `MappingMetods/INVENTARIO_LOGS_SERVICIOSAP.csv` · `MappingMetods/_IMPLEMENTACION_SP_CREDITO/` (R1-R8/09-26) · `Checklists/CHECKLIST_DEV2_ROADMAP.md` · `Checklists/CHECKLIST_DEV3_NOSAP_NOINTELISIS.md` · `Resources/magento_payloads.md` · `Resources/master_test_plan.md` (evidencia E2E) · `SPsOrden/` (SPD, SPC, SPL, SVC, SDP, SCU, CTN)
- Código: `LAN/WebApiMagento` · `ServicioSAP/ServicioSap/ServicioSap` (rama `SpExportaEcommerce`) · `DMZ/WebApiMagento` (rama `ConexionSAP`) · `Magento248/Magento248/app/code`

#migracion #SAP #credito #fable #plan-final
