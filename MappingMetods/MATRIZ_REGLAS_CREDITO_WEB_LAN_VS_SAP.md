# ¿ServicioSAP cumple las reglas de negocio del crédito web de LAN?
> 2026-10-01: cómo funciona ServicioSAP hoy está en [[Business Rules Ecommerce]] (fuente única). Este documento queda como análisis; si contradice a esa fuente, gana la fuente.

**2026-09-30 — Lectura principal:** [[CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL]] (análisis completo, las reglas G1-G5 con su estado actual más 11 reglas nuevas del 2026-09-30, y el plan final). Esta matriz queda como detalle y evidencia por regla.
## 0. Re-evaluación 2026-09-29 (código actual)
> Re-evaluación del 2026-09-29 contra la copia de trabajo de ServicioSAP: rama SpExportaEcommerce, cambios sin commit del 2026-09-28/29, compilados con Roslyn (221 archivos, exit 0). Un workflow volvió a calificar las 143 reglas contra el código actual, no contra las conclusiones de esta matriz. Otro revisó la paridad de valor de las 59 columnas de CRED_SOLICITUD_WEB_DATOS_TEMP (default del SP contra ServicioSAP). Un crítico recorrió el flujo buscando reglas que faltaban. Después de esas revisiones se aplicaron tres arreglos más (0.3), y los conteos de abajo ya los incluyen. Los cambios de código, uno por uno, están en [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]]. Las secciones 1 a 5 son la versión del 2026-09-24 y se conservan como historia; en la sección 3 cada fila tiene ahora las columnas "Estado 2026-09-29" y "Nota 2026-09-29". Contexto: [[PLAN_EJECUCION_SP_CREDITO_A_CODIGO]] §22-§24 y [[FLUJO_CREDITO_LAN_VS_SAP]].

### 0.1 Veredicto
**Todavía no. La cabecera ya es igual a LAN; las líneas y lo posterior al alta todavía no.**

- **Cabecera (CRED_SOLICITUD_WEB_DATOS_TEMP): igual.** Para un BP existente y un payload normal de Magento se guardan los mismos valores que LAN + SP.
  - El INSERT es textualmente el del SP: DECLARE @fecha con GETDATE(), 59 columnas y 59 valores, confirmado con el literal 1 e ISNULL(@RedimirMonedero, 0.00) (SCW:38-160 contra SPD:223-344).
  - Los 57 parámetros tienen el tipo y el ancho del SP, salvo @cliente en 10 por el BP numérico (SCW:171-228).
  - Revisión por columna, ya con los 3 arreglos de 0.3: 37 iguales, 11 con cambio de fuente aceptado, 9 pendientes de decisiones abiertas (compuertas sin fila, incluida fechaNacimiento sin Birthdt, y DIMAS MX) y 2 casos límite de null explícito que Magento no manda (origen y OrigenIdMagento); ninguna distinta. Tabla completa en [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]] §4.
- **Quién recibe solicitud: igual (D6).** Solo un BP existente. Cuenta vacía o no encontrada → 'sin cuenta' y ninguna fila (OM:646-650), como checkCliente (LCM:124, :255-258).
- **Validación telefónica: igual con tus decisiones.** El IF de tres valores del SP, la excepción del prospecto, las fuentes SMS, validado y origen, y el recorte a VARCHAR(10). Quedan G3-08 (valores con espacios) y G3-16 (respuesta cuando falla una fuente).
- **Líneas: todavía no.**
  - Faltan la sustitución TELEFONIA por región (Q17, diferida por el negocio) y el staging eCommerceDetPedidos.
  - Están pendientes la fuente del precio (SD29 o PropreListaDFinal), varias filas de precio por SKU, el costo (spVerCosto) y la precisión float del SEGU00001.
  - G4-24 (condición sin equivalente) sigue distinta: tu decisión Q5 no está aplicada.
- **Posterior al alta: todavía no.** Liberador y callback, creditStatus, updateCreditOrderId, cierre de la ventana de reenvíos y reproceso esperan a otros equipos o a tu decisión. Las reglas del cupón del promotor siguen distintas (G5-07, G5-08, G5-27).
- **Compuertas sin fila: abiertas.** En G1-07, G1-08, G1-18, G1-20, G1-25, G2-23, G2-29, G3-09 y G5-17, LAN no escribía fila y ServicioSAP sí. Con el payload actual de Magento solo pueden pasar el teléfono muy corto (G1-20) y el codigoPostal null (G1-25).
- **Transición:** Magento248 todavía manda getCuentaIntelisis() en cuenta (MOM:719). Hasta que Magento mande el BP (D2), toda orden real de crédito termina en 'sin cuenta' y sin fila (G1-13).

### 0.2 Conteo nuevo (las 143 reglas originales)

De las 143 reglas, **67 cambiaron de estado** desde el 2026-09-24.

| Estado | 2026-09-24 | 2026-09-29 | Cambio |
|---|---|---|---|
| EQ | 51 | **46** | −5 |
| EQ-R | 13 | **41** | +28 |
| DIF | 37 | **6** | −31 |
| FALTA | 26 | **10** | −16 |
| N/A | 8 | **12** | +4 |
| DEP | 8 | **0** | −8 |
| PENDIENTE (nuevo) | — | **28** | +28 |
| **Total** | **143** | **143** | |

| Grupo | Total | EQ | EQ-R | DIF | FALTA | N/A | DEP | PENDIENTE |
|---|---|---|---|---|---|---|---|---|
| G1 Elegibilidad | 24 | 6 → **4** | 2 → **11** | 10 → **0** | 2 → **1** | 2 → **3** | 2 → **0** | — → **5** |
| G2 Cabecera | 39 | 22 → **20** | 3 → **15** | 11 → **0** | 1 → **0** | 2 → **1** | 0 | — → **3** |
| G3 Validación telefónica | 18 | 7 | 2 → **6** | 5 → **2** | 0 | 2 | 2 → **0** | — → **1** |
| G4 Líneas | 39 | 14 → **13** | 4 | 3 → **1** | 16 → **8** | 2 | 0 | — → **11** |
| G5 Posterior al alta | 23 | 2 | 2 → **5** | 8 → **3** | 7 → **1** | 0 → **4** | 4 → **0** | — → **8** |
| **Total** | **143** | 51 → **46** | 13 → **41** | 37 → **6** | 26 → **10** | 8 → **12** | 8 → **0** | — → **28** |

- **PENDIENTE es un estado nuevo:** la diferencia o el faltante espera una decisión abierta (0.5), tuya o de otro equipo. No se cuenta como DIF ni como FALTA.
- **DEP desaparece:** lo que dependía de otro equipo quedó EQ-R por tus decisiones D2 y D3 (G1-13, G3-10, G3-18) o PENDIENTE (liberador y aviso a Magento).
- **Sensibilidad:** el crítico pide calificar como PENDIENTE (compuerta sin fila) G1-05 y G5-04 (falla al guardar la guía) y G1-19 y G2-10 (BP sin fecha de nacimiento). Si se acepta, EQ-R baja a 37 y PENDIENTE sube a 32. Aquí quedan EQ-R porque R5 y Q11 ya las decidieron, pero entran en la decisión abierta de compuertas sin fila (0.5 #1).
- **Reglas nuevas (no entran en las 143): 6.** Del crítico: G1-25 y G5-24 (PENDIENTE), G5-25 y G5-27 (DIF) y G5-26 (EQ-R). De la revisión por columna: G3-19 (PENDIENTE). Con ellas, las 149 filas quedan en EQ 46, EQ-R 42, PENDIENTE 31, N/A 12, FALTA 10 y DIF 8.

### 0.3 Arreglos aplicados después de la re-evaluación (ya contados)

1. **G2-13 estadoCivil (FALTA → EQ-R).** EstadoCivilLegado (SCW:594-606) da la denominación de SAP del Marst del BP: 1 Soltero, 2 Casado, 3 Viudo, 4 Divorciado, 5 Separado y 6 'Pareja de hecho', que el parámetro de 11 recorta a 'Pareja de h'. Otro código o vacío → ''. Se usa en ArmarFila (SCW:261).
2. **G2-12 sexo (DIF → EQ-R).** SexoLegado (SCW:567-589): Gender vacío → '' (como LAN), 1 Masculino, 2 Femenino y cualquier otro 'NO ESPECIFICADO', que @sexo de 9 recorta a 'NO ESPECI'. Los códigos siguen BusinessPartnerMethods.MapGender (BPM:777-797), por decisión tuya.
3. **uen y sucursal (G2-20, G2-21).** uen = storeId == "viu" ? 2 : 1, con comparación exacta como LOM:628 (OM:755); la sucursal 505/504 sale de ahí (OM:796). Corrige las filas uen y sucursal de la revisión por columna.

Los demás cambios del 2026-09-28/29 ya estaban en el código que se re-calificó: la compuerta 'sin cuenta' y el retiro de la ruta de cliente nuevo (OM:642-650), el retiro de ?? "" en 11 campos (OM:779-800), el origen (ICR:74, OM:798) y el INSERT igual al del SP (SCW:38-160). Nada está en commit. Detalle en [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]].

### 0.4 Decisiones tuyas del 2026-09-28/29

| Id | Decisión (del usuario, 2026-09-28/29) | Reglas |
|---|---|---|
| D1 | Las cadenas de conexión de Web.config (MAVICBOSANDROID, ADMINDOC) son la fuente correcta para las bases SQL; Conexion.dll es para S4. Abierto: SIGMavi hoy también sale de Conexion.dll. Los valores de ambiente (credenciales, URL_DMZ, URL_INTELISIS del DMZ) son de Dev y cambiarán en QA y Prod: no son bloqueo. | G2-01, G3-02, G4-07, G5-12 |
| D2 | Magento mandará solo el BP numérico de SAP en infoCliente.cuenta. Las cuentas 'C…' de Intelisis nunca llegan a ServicioSAP (es configuración y datos del lado de Magento). Las reglas con prefijo 'C' se leen como "BP existente". | G1-13, G1-23, G2-24, G3-18, G5-09 |
| D3 | El catálogo AWS 'ORIGEN VALIDACION NUMERO CTE' ya está dado de alta con 23 valores Valor1 (lista en MappingMetods/CatalogoConfiguracion.csv). Abierto: si se agregan orígenes de la era SAP, como 'CteXpressFrontSAP'. | G3-10 |
| D4 | A_GET_TelefonoValidado (API businesspartner) ya devuelve el teléfono validado más reciente: aceptado. | G3-04, G3-11 |
| D5 | Paridad de valores: ServicioSAP guarda exactamente lo que guardaban LAN + SP en cada columna (null contra '' contra default, literal, ISNULL o GETDATE del SP), con el equivalente de SAP como fuente. | Todo G2; G1-25 |
| D6 | Crédito solo para un BP existente: cuenta vacía o no encontrada → 'sin cuenta' y ninguna fila, como checkCliente de LAN. Se quitaron las rutas de cliente nuevo e invitado. Reemplaza a R2. | G1-09, G1-10, G2-05 |
| D7 | origen exactamente como LAN y el SP: infoCliente.origen de Magento si viene; si no, 'PRODUCTOS MX'. | G2-03, G2-04 |
| D8 | fecha la arma el SQL como el SP (DECLARE @fecha; SELECT @fecha = GETDATE()). El INSERT de ServicioSAP es textualmente el del SP: 59 columnas y valores, literal 1 en confirmado e ISNULL(@RedimirMonedero,0.00). | G2-01, G2-31, G2-34 |
| D9 | SIGMavi.VentasCupones es la misma tabla que IntelisisTmp.VTASCVentaCupon, renombrada; solo cambian las reglas. | G5-07, G5-08 |
| D10 | La tabla de códigos Marst viene de SAP GUI (ver 0.3) y Gender sigue MapGender. | G2-12, G2-13 |

Detalle y evidencia de cada una en [[CAMBIOS_PARIDAD_CREDITO_2026-09-29]] §2. Siguen vigentes las decisiones anteriores: R1-R8 (MappingMetods/_IMPLEMENTACION_SP_CREDITO/workflow_credit_parity_2026-09-26.js:28-35) y Q1-Q22 (PLAN §23.4 y §23.9). Estos D1-D10 no son las decisiones de diseño D1-D10 del 2026-09-18 ([[FLUJO_SP_CREDITO_WEB_DATOS_A_CODIGO]] §1) ni los "D1-D4" de workflow_credit_parity_2026-09-26.js, que hoy son Q1, Q4, Q12 y Q20.

### 0.5 Decisiones abiertas (pendientes)

| # | Pendiente | Quién | Reglas |
|---|---|---|---|
| 1 | **Compuertas sin fila:** LAN no escribía fila con nombres, codigoPostal, incrementId, storeId, telefono, cantidad, entityId o telefonoClienteMavi nulos, sin fecha de nacimiento, si fallaba el guardado de la guía o con articulos vacío. ¿Se copia? | Tú | G1-07, G1-08, G1-18, G1-20, G1-25, G2-23, G2-29, G3-09, G5-17; también G1-05, G5-04, G1-19 y G2-10 (0.2) |
| 2 | **Cupones (Q8):** alcance, solo la quema en crédito o toda la funcionalidad. ¿Comisiones lee VentasCupones? | Tú | G5-07, G5-08, G5-26, G5-27 |
| 3 | **¿DIMAS MX está deprecado?** PLAN:943 y :2111 dicen que sí. | Tú y dueño de IntelisisTmp | G2-03 |
| 4 | **Mayúsculas:** ¿se guardan en MAYÚSCULAS nombres, sexo y estadoCivil, como el CTE de LAN? | Tú | G2-06, G2-07, G2-08, G2-12, G2-13 |
| 5 | **Precio de las líneas:** SD29 o PropreListaDFinal; varias filas de precio por SKU (Q16); costo con spVerCosto (Q18); precisión float del SEGU00001. | Tú (el costo, con el dueño del liberador) | G4-09, G4-21, G4-25, G4-29 a G4-37 (salvo G4-32) |
| 6 | **Staging eCommerceDetPedidos.** | Tú y dueño de SIGMAVI | G4-02, G4-03 (y la contradicción con G5-21 a G5-23) |
| 7 | **Sustitución TELEFONIA** (Q17, diferida por el negocio). | Negocio | G4-12, G4-15 a G4-19 |
| 8 | **Herramienta de reproceso.** | Tú y soporte | G1-04, G5-03 |
| 9 | **Contrato de respuesta HTTP del crédito.** | Tú, Magento y DMZ | G3-16, G5-25 (y G1-24, G5-14 y G5-16 si R4 no se da por cerrada) |
| 10 | **Logs más allá de LAN**, incluido el nuevo [CREDITO SIN CUENTA] (OM:648). | Tú (Q20) | G5-20, G3-12 |
| 11 | **Limpieza de ArmarFila** (los respaldos con datos de Magento ya son código muerto) y nombre = NameFirst + ' ' + Namemiddle (Q19). | Tú | G2-08 |
| 12 | **Errores en la búsqueda de teléfono:** ¿cuentan como "no encontrado"? El SP insertaba igual. | Tú | G3-16, G3-19 |
| 13 | **Búsquedas con el número de BP** (maestro.Partner) en vez de la cuenta cruda. | Tú | G3-18, G2-24 |
| 14 | **Liberador y callback.** | Dueño del liberador (otro equipo) | G1-22, G5-02, G5-09 a G5-12, G5-24, G5-26 |
| 15 | **creditStatus y updateCreditOrderId:** dónde vive la decisión de crédito. | Crédito y dueño del liberador (otros equipos) | G5-18, G5-19, G5-24 |
| 16 | **Abiertos dentro de D1 y D3:** SIGMavi por Conexion.dll; orígenes de la era SAP en el catálogo. | Tú | G5-07, G3-10 |

### 0.6 Cómo leer la sección 3 ahora

- **Columnas nuevas:** "Estado 2026-09-29" (si cambió: estado anterior → **nuevo**) y "Nota 2026-09-29" (por qué cambió o qué falta). Las columnas originales no se tocaron.
- **Filas nuevas:** al final de cada grupo, con "NUEVA 2026-09-29" en la columna Estado original.
- **Citas de las columnas nuevas:** código actual. OM = OrderMethods.cs del 2026-09-29 11:17 (3336 líneas); SCW = SolicitudCreditoWebMethods.cs del 2026-09-29 11:02 (670 líneas). La re-calificación usó una versión anterior (OM de las 09:44 y SCW de las 10:33): desde su OM:754 el código actual está una línea más abajo, y en SCW 22 líneas más abajo desde su :585.
- **Abreviaturas nuevas** (además de las de la sección 2):
  - MOM = Magento248/Magento248/app/code/Omnipro/PlaceOrder/Model/OrderManagement.php
  - MCO = Magento248/Magento248/app/code/Mavi/CreditoCheckout/Model/CreditoOrderManagement.php
  - ICR = SS/Models/SAP/Order/InfoClienteRequest.cs
  - GANTT = .agents/skills/lan-sap-migration/MappingMetods/_NUESTROS_ENDPOINTS/PLAN_MAESTRO_GANTT_POR_DEV.md
  - R1-R8 = decisiones del 2026-09-26; Q1-Q22 = PLAN §23.4 y §23.9; D1-D10 = 0.4

#migracion #SAP #analisis_bd #dotnet

---

> Generada el 2026-09-24 con un workflow de 9 agentes (w3ifpbc31): 3 enumeraron las reglas del legado (codigo LAN, SP y columnas destino), 5 compararon por grupo contra el codigo actual de ServicioSAP (con los arreglos de §20) y 1 sintetizo. Verificado a mano: la quema de cupones (SpVTASVentaCupon.sql:118-128 contra OrderMethods.cs:1095). Resumen y contexto: PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md §22.

## 1. Veredicto

> **Histórico (2026-09-24).** El veredicto y los conteos de esta sección los reemplaza la sección 0 (re-evaluación 2026-09-29). Se conserva como estaba.

**Todavía no.** Comparé 143 reglas en 5 grupos: **51 son equivalentes, 13 equivalentes con riesgo, 37 diferentes, 26 faltan, 8 no aplican y 8 dependen de otro equipo.** Algunas reglas aparecen en dos grupos vistas desde ángulos distintos; en la sección 4 ya están juntas.

Lo que está bien portado:
- **El alta de la cabecera:** mismas 59 columnas y en el mismo orden que el SP.
- **La validación telefónica:** el IF del SP con su lógica de tres valores.
- **El precio y el Abono de las líneas.**

Lo que significa para el negocio hoy:
- **Ningún cliente de casa llega a tener solicitud.** Magento manda la cuenta C… de Intelisis, que no existe como BP.
- **Riesgo de que falle todo alta real.** Si la columna MetodoEnvio mide 12, todo INSERT real falla, porque ya no se recorta 'tablerate_bestway' (17 caracteres).
- **Cuando sí se crea la solicitud, ServicioSAP actúa distinto a LAN:** acepta órdenes que LAN rechazaba y responde a Magento con otro contrato.
- **Nada de lo posterior al alta funciona todavía:** liberador, aviso a Magento, estatus y cambio de folio.

## 2. Resumen por grupo

> **Histórico (2026-09-24).** La sección 0.2 reemplaza estos conteos. Se conserva como estaba.

| Grupo | Total | EQ | EQ-R | DIF | FALTA | N/A | DEP |
|---|---|---|---|---|---|---|---|
| G1 Elegibilidad | 24 | 6 | 2 | 10 | 2 | 2 | 2 |
| G2 Cabecera | 39 | 22 | 3 | 11 | 1 | 2 | 0 |
| G3 Validación telefónica | 18 | 7 | 2 | 5 | 0 | 2 | 2 |
| G4 Líneas | 39 | 14 | 4 | 3 | 16 | 2 | 0 |
| G5 Posterior al alta | 23 | 2 | 2 | 8 | 7 | 0 | 4 |
| **Total** | **143** | **51** | **13** | **37** | **26** | **8** | **8** |

Estados: EQ = equivalente · EQ-R = equivalente con riesgo · DIF = diferente · FALTA = no existe en ServicioSAP · N/A = no aplica · DEP = depende de otro equipo. "Dec." en una nota quiere decir que viene de una decisión tuya.

Dos grupos se contradecían. Abrí el código y quedaron así:
- **validateCredit** (G1-03 decía DEP y G5-15 decía FALTA): queda en **FALTA**. La ruta no existe en ServicioSAP y está calendarizada (GANTT:233). Lo que decide Magento o el DMZ es si se sigue llamando.
- **Total o cantidad no numéricos** (G2-35 decía que "no llega al flujo" y G4-01 que "falta validarlo"): **sí llegan al flujo**. OrderController es Web API 2 (OC:8, :14) y en SS no hay ninguna revisión de ModelState. El formateador JSON deja el valor por defecto (0) y la orden sigue, como dicen G1-07 y G1-18. Es el comportamiento estándar de Web API 2; no lo probé con una petición.

La tercera contradicción era de interpretación. G2-10 y G2-29 dudaban de si "un dato mal configurado se procesa como viene" permitía insertar. Tu regla es "hacer lo que LAN hace con el dato", y LAN no insertaba.

Rutas, todas relativas al share:
- SS = ServicioSAP/ServicioSap/ServicioSap/
- OM = SS/Methods/Order/OrderMethods.cs (versión del 24/09/2026 18:19, 3359 líneas)
- SCW = SS/Methods/Credit/SolicitudCreditoWebMethods.cs
- OC = SS/Controllers/OrderController.cs
- BPM = SS/Methods/BusinessPartner/BusinessPartnerMethods.cs
- LOM = LAN/WebApiMagento/Metodos/OrderMethods.cs
- LCM = LAN/WebApiMagento/Metodos/CreditMethods.cs
- LOC = LAN/WebApiMagento/Controllers/OrdersController.cs
- DMZ = DMZ/WebApiMagento/Controllers/OrdersController.cs
- En .agents/skills/lan-sap-migration/SPsOrden/: SPD = SP_CREDITO_WEB_DATOS.sql, SPC = SpCREDIDatosSolicitudCreditoArt.sql, SPL = SpVTASInsertArtSolCreditoLinea.sql, SVC = spVerCosto.sql, SDP = SpVTASeCommerceDetPedidos.sql, SCU = SpVTASVentaCupon.sql
- PLAN = .agents/skills/lan-sap-migration/MappingMetods/PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md
- GANTT = PLAN_MAESTRO_GANTT_POR_DEV.md

## 3. Detalle por grupo

> **2026-09-29:** cada tabla tiene ahora las columnas "Estado 2026-09-29" (si cambió: estado anterior → **nuevo**) y "Nota 2026-09-29". Las columnas originales no se tocaron y sus citas son de la versión del 2026-09-24; las citas de las columnas nuevas son del código actual (0.6). Las reglas nuevas van al final de su grupo, con "NUEVA 2026-09-29" en la columna Estado.

### G1 Elegibilidad

| Id | Regla | Legado | ServicioSAP | Estado | Nota | Estado 2026-09-29 | Nota 2026-09-29 |
|---|---|---|---|---|---|---|---|
| G1-01 | Crédito solo si metodoPago == 'omnipro_pago_credito' (distingue mayúsculas). Regresa antes de crear o afectar la venta | LOM:31, :609, :649 (antes de :662 y :705-721) | OM:44, :1785. Return en :1802-1807, antes de :1848, :1873 y :1938 | EQ | Ninguna orden de crédito crea documento de venta | **EQ** | Sin cambio. El return del crédito está ahora en OM:1779-1784, antes de FASE 4-6. |
| G1-02 | Cuerpo nulo → 400 | LOC:141-142 | OC:17-23 (order/new). El DMZ también responde 400 (DMZ:111-112) y reenvía (:196) | EQ | Solo cambia el nombre de la ruta; el DMZ lo traduce | **EQ** | Sin cambio. |
| G1-03 | validateCredit: mismo SetPedido, responde {status:"PROCESANDO", cuenta}; 500 si lanza fuera del try | LOC:455-482 | No existe la ruta. Proxy del DMZ comentado (DMZ:366-402) | FALTA | Si Magento la llama, hoy recibe 404. GANTT:233 (31/08-01/09/2026, ya vencida). = G5-15 | FALTA → **N/A** | Cambió: validateCredit no tiene llamador. Magento248 no la usa (solo validateCreditPrice, que es otra cosa) y el proxy del DMZ está comentado (DMZ:366-402). La línea de GANTT:232 se puede quitar. = G5-15 |
| G1-04 | Reproceso getOrderInfoAndSet: relee la orden y, si no hay venta no cancelada, fuerza forzarOrder="1" | LOC:437-442; LAN/WebApiMagento/Conn/Magento.cs:361-411; LOM:1688-1708 | No existe | FALTA | = G5-03 | **FALTA** | Sin cambio. Nadie la llama (ni Magento ni el DMZ): es herramienta de soporte. Decisión abierta: conservarla o quitarla (GANTT:262). = G5-03 |
| G1-05 | Antes de la rama van agrupación, PedidoExistente, staging y guía. Si falla el staging o la guía (dentro del try), no hay solicitud y responde "" | LOM:535-542; try :576-606; catch :728-732 | Sin staging (OM:527-528). Guía en :1787, con el error tragado (:548-552) | DIF | Guía antes de la rama = arreglo #16 (dec.). La falla de guía ya no aborta (PLAN §20.3). Staging en G4-02 | DIF → **EQ-R** | Cambió por decisiones: sin staging (R7) y guardado de guía aceptado (R5). SaveGuideAsync (OM:1764) traga el error (OM:548-552) y el flujo sigue. El crítico lo califica PENDIENTE: si falla la guía, LAN no escribía fila y SS sí (compuerta sin fila, 0.5 #1). = G5-04 |
| G1-06 | PedidoExistente con el forzarOrder ORIGINAL "0", o PayPal | LOM:538, :541-542. ToArray lo cambia en :377-378, :394-395 | OM:1752 usa el valor ya cambiado por ToArray (:236-237, :253-254). SD36 por PurchNoC (:1749-1750) | DIF | Con precioEspecial ≠ 0 se salta la revisión. SD36 = dec. = G5-01 | DIF → **EQ-R** | Cambió: forzarOrderOriginal se guarda antes de ToArray y se usa en la revisión (OM:1717-1718, :1729; arreglo del 2026-09-25, R6). Fuente SD36 por PurchNoC (R7). Riesgo: para crédito SD36 no encuentra nada mientras no exista documento SAP (ver G5-24). |
| G1-07 | En la práctica son obligatorias las claves de infoCliente, los campos de artículos y forzarOrder. Si falta uno o viene texto en un número, no se procesa | LOM:406-423, :442-445, :494-496, :562 (fuera del try) → LOC:154-157 / :477-481 | Modelo tipado con ?? "" (OM:265-288). Web API 2 deja 0 o null y ModelState no se revisa en SS | DIF | Crea la solicitud con vacíos o ceros | DIF → **PENDIENTE** | Compuerta sin fila abierta (0.5 #1): llaves faltantes, texto en un número o forzarOrder null. LAN no escribía fila; SS sí (ahora con NULL en la cabecera). Inalcanzable con el payload actual (MOM:686-753). Si se decide paridad: lanzar antes de OM:660 y revisar ModelState en OC:18. |
| G1-08 | Orden sin artículos: no hay solicitud | LOM:579, :588, :632 → :728-732 | Pasa (OM:89-90). Cabecera con Condicion "" (:824) y respuesta "Concluido" | DIF | Cabecera sin líneas. = G2-23 | DIF → **PENDIENTE** | Compuerta sin fila abierta. articulos vacío: cabecera con Condicion NULL (OM:793) y respuesta 'Concluido'. Una lista null ya truena sin fila (OM:222), como LAN. Magento no manda cotizaciones sin artículos. = G2-23 |
| G1-09 | Invitado (sin clave 'cuenta'): no hay solicitud y responde "" | LOM:619 → :728-732 | Invitado = cuenta Y cliente vacíos (OM:673-676). Responde "Error, …" (OC:37-46) | DIF | Sin cuenta pero con 'cliente' (Magento siempre lo manda) cae en G1-10 y sí se crea la solicitud | DIF → **EQ-R** | Cambió (D6): cuenta vacía o nula → 'sin cuenta' sin fila (OM:646-650); desapareció el invitado con cliente '0'. Solo cambia el cuerpo ('Error, Error en SetOrder: sin cuenta', HTTP 200, R4); Magento no lee el cuerpo (MCO:51-64). |
| G1-10 | Cuenta vacía o nula: no se inserta ('sin cuenta') y responde la cuenta | LCM:124 → :255-258; SPC:39-50 | esClienteNuevo se salta la compuerta (OM:672, :679-684). Inserta con cliente "" y datos de Magento (SCW:369-374) y responde el id de Magento (:759) | DIF | Sin decisión tuya (PLAN §18.5 #6) | DIF → **EQ-R** | Cambió (D6): cuenta vacía, BP inexistente o error de SAP → 'sin cuenta' antes del único INSERT (OM:646-650, :660). Se quitó la ruta de cliente nuevo: CrearSolicitudCreditoAsync tiene un solo llamador. Log nuevo [CREDITO SIN CUENTA] (OM:648, ver G5-20). Respuesta distinta con HTTP 200 (R4). |
| G1-11 | El flujo no da de alta clientes ni prospectos | LCM:94-262; SPD:16 | La rama no llama CreatePartnerNumberFromOrderAsync (OM:1833, solo contado) | EQ | | **EQ** | Sin cambio. |
| G1-12 | La cuenta existe si hay fila en el maestro; un error cuenta como inexistente | LCM:725-763; SPC:37-51 | CheckClientCreditAsync (OM:768-781) lee ZB_DATOS_CLIENTE_CDS (BPM:27-69) y luego BP05MA (SCW:25) | EQ-R | Dos fuentes y dos modos de fallo. Se puede dejar una sola con GetClientMaAsync. El mensaje "no tiene crédito activo" solo comprueba que exista | **EQ-R** | Sin cambio. Existencia en ZB_DATOS_CLIENTE (OM:732-745) y datos en BP05MA; las dos cortan sin fila. El log no distingue una falla de SAP de un BP inexistente (solo Console, OM:742). |
| G1-13 | Se valida la cuenta tal como la manda Magento (C########) | LOM:627; magento_payloads.md:26, :55 | La busca como BP (OM:669, :681; BPM:30) | DEP | Con el payload real, todo cliente de casa termina en "Error … no tiene crédito activo". Pendiente de Magento | DEP → **EQ-R** | Cambió (D2): Magento mandará el BP numérico y SS lo busca tal cual. Transición: Magento248 todavía manda getCuentaIntelisis() (MOM:719); hasta esa liberación toda orden real de crédito termina en 'sin cuenta' sin fila. |
| G1-14 | No se valida crédito activo, bloqueo, línea, NIP, plazo ni total, y la condición se toma sin validar | LCM:110-111 (getCondicion comentado), :124-137 | OM:774 solo exige que exista el BP. La condición se valida después de la cabecera (:875-880) | EQ | Los comentarios de :663, :678 y :682 dicen "saldo" y "crédito activo", pero no lo validan | EQ → **EQ-R** | Cambió de lectura, no de código: la condición se traduce y valida antes de las líneas con GetCondicionAsync (OM:845-850, :3302-3334), por decisión; LAN la pasaba sin validar. Moverla antes de la cabecera (Q5) está en G2-22 y G4-24. |
| G1-15 | El saldo nunca bloquea: checkSaldo siempre da 0 y el resultado se descarta | LCM:126-133, :766-802; SPC:80-122; LOM:624, :649 | No consulta saldo (OM:665-766) | EQ | Verificado. Dec. (PLAN §16) | **EQ** | Sin cambio. |
| G1-16 | checkSaldo va a la base Android y ejecuta el SP dos veces | LCM:772, :788, :790 | No existe | N/A | Dec. (PLAN §16) | **N/A** | Sin cambio. |
| G1-17 | (Referencia) Crédito disponible = máx(0, CRMCantidad − saldo) | SPC:84-121 | No existe | N/A | Sería funcionalidad nueva (PLAN §16.5) | **N/A** | Sin cambio. |
| G1-18 | Total no numérico o nulo: no hay solicitud y responde "" | LCM:117-119, :126 (fuera del try interno) → LOM:728-732 | total decimal queda en 0 (SS/Models/SAP/Order/OrderRequest.cs:13) y la rama no lo usa | DIF | Crea la solicitud. Con la base Android caída, los dos se quedan sin solicitud | DIF → **PENDIENTE** | Compuerta sin fila abierta. Inalcanzable desde Magento, que manda float (MOM:688). El modelo tipado no ve el texto original: la paridad exigiría revisar ModelState en OC:18. Recomendación: registrarlo como inalcanzable. |
| G1-19 | Datos personales del maestro. Sin fila, con fecha nula o con error → 'err', sin solicitud | LCM:137, :804-868, :835, :246-252 | Sin BP en BP05MA lanza (BPM:316-330). Fecha nula se inserta NULL (SCW:237, :167) | DIF | Un BP sin fecha genera solicitud. = G2-10 | DIF → **EQ-R** | Cambió: sin fila de BP05MA o con error de SAP no hay fila, como el 'err' de LAN. Birthdt nulo → 1900-01-02 (Q11; SCW:244, :555), el valor que LAN daba a sus clientes web. El crítico lo califica PENDIENTE: un CTE con fecha NULL no generaba fila en LAN (LCM:835, :860-865). = G2-10 |
| G1-20 | El teléfono de entrega y el número a validar tienen que traer la lada; si no, 'err' | LCM:113, :139-148 | Pone "0" o "" y sigue (OM:688-691, :796-801) | DIF | Esos "0" son defaults, contra tu regla. = G2-29 y G3-09 | DIF → **PENDIENTE** | Compuerta sin fila abierta (Q10). Teléfono más corto que su lada → '0'/'0' (OM:654-657) y lada 0 con número '' (OM:761-766), y se inserta. Sí puede pasar con un teléfono de envío muy corto (Magento solo quita lo que no es dígito, MOM:731-733). = G2-29, G3-09 |
| G1-21 | Prospecto ('P'): ValidacionTelefono en 0 y sin liberador | SPD:210-221 (:216); LCM:208 | EsProspecto = ZtipoCliente "Prospecto" (SCW:312-328, :532-546) | EQ-R | Dec. (PLAN §11.3). Depende de que ZtipoCliente venga lleno | **EQ-R** | Sin cambio. Con D6 un prospecto además tiene que ser BP existente. Depende de que ZtipoCliente venga lleno (SCW:538-548). |
| G1-22 | Cuenta 'C…': después de cabecera, líneas y promotor, lanza liberador y callback en segundo plano | LCM:199-241 (:208, :215-240) | Comentado (OM:719-757), colgado de esClienteNuevo (:720) y con cliente = id de Magento (:726) | DEP | Ninguna orden se libera. = G5-09 | DEP → **PENDIENTE** | Bloqueado por el contrato del liberador (otro equipo, 0.5 #14). El bloque comentado no compilaría: idClienteMagento ya no existe (OM:690), hay await dentro de un lambda que no es async (OM:700, :710) y queda después del catch de líneas. Al encenderlo: cliente = cuentaBp, dentro del try después del promotor, con Task.Run o lambda async. = G5-09 |
| G1-23 | Cuenta existente con otro prefijo: solicitud y líneas, sin liberador | LCM:208 (sin else) | OM:694, :701-717; liberador apagado | EQ | Coincide solo porque el liberador está apagado | EQ → **EQ-R** | Con D2 todo BP existente equivale a la clase 'C'; la única población de 'otro prefijo' que queda son los prospectos. Se cumple solo porque el liberador está apagado: al encenderlo (G1-22) tiene que saltarse los prospectos (SCW:538-548). |
| G1-24 | Qué recibe Magento: "PedidoExistente", el texto de la excepción, "" o la cuenta (no distingue éxito de fallo) | LOM:541-542, :649, :728-732; LOC:151-160, :470-475 | Objeto {BP, SalesDocument, Message, Resultado} (OC:27-35) o "Error, …" con 200 (:37-47) | DIF | Cambia el contrato (PLAN §19.2 #1). = G5-14 | DIF → **EQ-R** | Cambió por R4: objeto {BP, SalesDocument, Message, Resultado} o 'Error, …' con HTTP 200 (OC:27-47); Magento solo mira '=== false' y el estatus (MCO:51-64; MOM:771-845). Riesgo: Logger.cs:28-31 puede convertir el catch en 500. La capa del DMZ va aparte en G5-25. |
| G1-25 | Una llave presente pero null aborta LAN antes de escribir fila: codigoPostal, entityId, incrementId, apellidoPaterno, apellidoMaterno o nombreClienteMavi, telefono y telefonoClienteMavi | codigoPostal: LOM:599 → detallePedido LOM:1027 (.Trim(); el catch solo atrapa SqlException, LOM:1072) → LOM:728-732, cuando algún artículo tiene precio y cantidad > 0 (LOM:596). entityId LOM:599; incrementId LOM:1006; nombres LOM:603-605; telefono y telefonoClienteMavi con ValidateOnlyNumbers(null) LOM:414, :423, :444-445 → LOC:154-157 | Convierte cada null en un valor y escribe la cabecera: ToArray con ?? "" (OM:265-288), ConstruirNombreClienteMavi (OM:411-413), telefono ?? "" (OM:761), CodigoPostal ?? "" (OM:785), IdMagento ?? "0" (OM:799). También OrigenIdMagento ?? "" (OM:807): LAN guardaba '' sin la llave y NULL con null explícito (LOM:644) | NUEVA 2026-09-29 | — | **PENDIENTE** | **NUEVA 2026-09-29** (crítico). G1-07 solo cubre llaves faltantes y texto en números, y G2-18 solo entreCalles. Compuerta sin fila abierta (0.5 #1). Magento normalmente manda cadenas (MOM:657-658, :726, :731-748), pero getPostCode() (MOM:735) puede venir null. Si se acepta: cortar antes de OM:660 con la respuesta de LAN y quitar ?? "0" y ?? "" en OM:785, :799 y :807 para que un null quede NULL (D5). |

### G2 Cabecera

| Id | Regla | Legado | ServicioSAP | Estado | Nota | Estado 2026-09-29 | Nota 2026-09-29 |
|---|---|---|---|---|---|---|---|
| G2-01 | Un solo alta (Insert) en CRED_SOLICITUD_WEB_DATOS_TEMP (Android). Folio = SCOPE_IDENTITY; sin transacción con las líneas | LCM:117-122, :150-151, :190-197; SPD:223-348 | QueryInsert con las mismas 59 columnas y orden (SCW:35-155 contra SPD:224-282), por conexión directa (SCW:157-227) | EQ-R | Dec. Riesgos: permiso de INSERT (antes bastaba EXECUTE), 4 lecturas remotas antes del alta y ya sin recorte de anchos | EQ-R → **EQ** | Cambió (D8): el lote hace DECLARE @fecha/GETDATE() y un INSERT idéntico al del SP, 59 de 59 columnas y valores (SCW:38-160 contra SPD:223-344). Los 57 parámetros tienen el tipo y el ancho del SP, salvo @cliente en 10 (SCW:171-228). Permiso de INSERT y conexiones quedan fuera de la calificación (D1). |
| G2-02 | (Retirado) Ramas Update e InsertReferencia | SPD:351-368, :370-603 (sin llamador) | No existe (SCW:18-33) | N/A | Dec. | **N/A** | Sin cambio. |
| G2-03 | DIMAS MX toma condición y artículo de CREDICCondicionArt | SPD:174-183 | No existe; Origen fijo (OM:828) | N/A | Dec. (tabla deprecada) | N/A → **PENDIENTE** | Cambió porque origen ya pasa tal cual (D7, OM:798): un 'DIMAS MX' se guardaría con la condición cruda y articulo '', sin el reemplazo desde CREDICCondicionArt (SPD:174-183). Decisión abierta: ¿DIMAS MX está deprecado? (PLAN:943 y :2111 dicen que sí). Si lo está, registrarlo y rechazarlo o ignorarlo de forma explícita. |
| G2-04 | Origen = infoCliente.origen, o 'PRODUCTOS MX' | LOM:646 | Literal (OM:828); InfoClienteRequest no declara 'origen' | EQ | Dec. Igual con los payloads reales | **EQ** | Sigue EQ, ahora con la regla de LAN (D7): InfoClienteRequest.origen (ICR:74) y Origen = info.origen ?? 'PRODUCTOS MX' (OM:798), Size 20. Solo difiere un null explícito, que Magento no manda (MOM:705-708). |
| G2-05 | Si el maestro no se puede leer, no hay solicitud | LCM:124, :152, :246-258, :860-867 | GetClientMaAsync lanza (BPM:316-339). Con cuenta vacía se inserta con datos de Magento (SCW:233-239, :369-374) | DIF | = G1-10. Además responde "Error, …" en vez de la cuenta | DIF → **EQ-R** | Cambió (D6): cuenta vacía o BP inexistente → 'sin cuenta' antes de escribir; si falla BP05MA, el error sube y no hay fila. Ya no existe la inserción con datos de Magento y cliente ''. EQ-R por la fuente BP (ZB_DATOS_CLIENTE y BP05MA) y por la respuesta (R4). |
| G2-06 | apellidoP del maestro | LCM:152, :832 | NameLast (SCW:233) | EQ | Dec. BP05MA | EQ → **EQ-R** | Mismo valor (NameLast ?? '', Size 30, SCW:240). EQ-R solo porque descansa en tu decisión de leer el maestro del BP. Abierto (0.5 #4): el CTE de LAN guardaba MAYÚSCULAS (SP_eCommerceCtenuevo.sql:117) y los BP de ServicioSAP guardan lo que manda Magento. |
| G2-07 | apellidoM del maestro | LCM:153, :833 | NameLst2 (SCW:234) | EQ | Dec. BP05MA | EQ → **EQ-R** | Igual que G2-06: NameLst2 ?? '' (SCW:241), confirmado con una captura real. Mayúsculas abiertas. |
| G2-08 | nombre = todos los nombres de pila | LCM:154, :834 | NameFirst (SCW:235); Namemiddle no se usa | EQ-R | En BP migrados con Namemiddle se pierde el segundo nombre | **EQ-R** | Sin cambio. Decisión abierta (0.5 #11): nombre = NameFirst + ' ' + Namemiddle (Q19) y limpieza de ArmarFila. |
| G2-09 | nombre2 siempre NULL | LCM:155 (comentado); SPD:97 | No se asigna → DBNull (SCW:236, :307-310) | EQ | | **EQ** | Sin cambio. |
| G2-10 | fechaNacimiento del maestro; nula → 'err' | LCM:835, :156 | FechaSap(Birthdt) ?? null → NULL (SCW:237, :575-600) | DIF | = G1-19. Tampoco reconoce el formato 'yyyyMMdd' | DIF → **EQ-R** | Cambió (Q11): FechaSap(Birthdt) ?? 1900-01-02 (SCW:244, :555, :613-638). FechaSap lee '/Date(ms)/', así que el formato 'yyyyMMdd' ya no importa. El crítico lo califica PENDIENTE: un cliente con fecha NULL no generaba fila en LAN (compuerta sin fila, 0.5 #1). = G1-19 |
| G2-11 | rfc del maestro | LCM:157, :836 | Stcd1 (SCW:238) | EQ | Dec. BP05MA | EQ → **EQ-R** | Mismo valor (Stcd1 ?? '', Size 13, SCW:245). EQ-R solo por la decisión del maestro BP. |
| G2-12 | sexo del maestro, recortado a 9 | LCM:158, :837; SPD:100 | SexoLegado (SCW:239, :558-573): 1 Masculino, 2 Femenino, cualquier otro NO ESPECIFICADO | DIF | Dec. 'NO ESPECIFICADO' ya no queda en 'NO ESPECI'. Gender vacío da 'NO ESPECIFICADO' donde LAN guardaba ''. Que 1 sea masculino viene de MapGender (BPM:777-796), sin comprobar en BP reales | DIF → **EQ-R** | Cambió con un arreglo posterior a la re-evaluación (0.3, D10). SexoLegado (SCW:567-589): Gender vacío → '' como LAN; 1 Masculino; 2 Femenino; otro código 'NO ESPECIFICADO', que @sexo de 9 recorta a 'NO ESPECI' como el SP. Códigos según MapGender (BPM:777-797), por decisión tuya. Riesgos: un BP real trae Gender '9' → 'NO ESPECI'; LAN guardaba MAYÚSCULAS (0.5 #4). |
| G2-13 | estadoCivil del maestro; vive_en_calidad NULL | LCM:169, :847; SPD:113-114 | EstadoCivil = "" fijo (OM:821); Marst no se lee | FALTA | Siempre ''. Falta la tabla de códigos Marst (PLAN §18.8) | FALTA → **EQ-R** | Cambió con un arreglo posterior a la re-evaluación (0.3, D10). EstadoCivilLegado(Marst) en ArmarFila (SCW:261, :594-606): 1 Soltero, 2 Casado, 3 Viudo, 4 Divorciado, 5 Separado, 6 'Pareja de hecho' → 'Pareja de h' por el Size 11; otro o vacío → ''. vive_en_calidad sigue NULL. Riesgo: los BP creados desde órdenes llevan Marst '2' fijo (OM:2647) y los de setCustomer '1' (BPM:486), así que saldrán 'Casado' o 'Soltero' sin que el cliente lo haya dicho. Mayúsculas abiertas. EstadoCivil = '' en OM:790 queda como código muerto. |
| G2-14 | Un nulo del maestro se guarda como '' | LCM:831-849 | ?? "" (SCW:233-245, :274) | EQ | | EQ → **EQ-R** | Sin cambio de código. Las excepciones se califican aparte: sexo (G2-12), fecha (G2-10) y estadoCivil (G2-13). EQ-R por la decisión del maestro BP. |
| G2-15 | email del checkout | LOM:630; LCM:159 | OM:811 | EQ | Un correo null: LAN guarda NULL, SAP '' | **EQ** | Se cierra la nota: ya no se usa ?? '' (OM:779); null → NULL y '' → '', como LAN (D5). |
| G2-16 | Dirección de envío del checkout | LOM:407-413; LCM:160-168 | OM:812-820 → SCW:242-252 | EQ | Sin recorte (G2-36) | EQ → **EQ-R** | direccion, numExt, numInt, estado y colonia ya pasan tal cual (OM:780-782, :788-789) con los anchos del SP. Queda CodigoPostal ?? '' (OM:785): con un codigoPostal null (Magento manda getPostCode() sin ?? '') SS guarda '' donde LAN tronaba y no escribía fila (G1-25). |
| G2-17 | Delegación y población = municipio | LCM:165-166 | OM:817-818 | EQ | | **EQ** | Se quitó ?? '' en municipio (OM:786-787): null → NULL, como LAN. |
| G2-18 | entreCalles del checkout o del maestro; con null truena | LOM:641; LCM:163 | ?? "" (OM:815), respaldo ZentCalles (SCW:245) | DIF | Solo con 'entreCalles': null. LAN no crea la solicitud y SAP sí | DIF → **EQ-R** | El caso null no llega desde Magento, que manda address_reference ?? '' (MOM:748). Riesgo: los BP creados por ServicioSAP llevan ZentCalles = '' fijo (BPM:585, OM:2744), mientras el CTE de LAN tenía UPPER(EntreCalles). Queda EntreCalles ?? '' (OM:784). |
| G2-19 | articulo '' en la cabecera | LCM:170 | OM:822 | EQ | | **EQ** | Sin cambio. El reemplazo de DIMAS MX se califica en G2-03. |
| G2-20 | UEN 2 si storeId == 'viu'; si no, 1 | LOM:628 | OM:790 (sin distinguir mayúsculas) | EQ | 'VIU' da 2 en SAP y 1 en LAN | **EQ** | Cerrado con un arreglo posterior (0.3): uen = storeId == "viu" ? 2 : 1, comparación exacta como LOM:628 (OM:755). 'VIU' ya da 1, igual que LAN. |
| G2-21 | sucursal 505 VIU / 504 MA | LCM:175 | OM:827 | EQ | | **EQ** | Corregido junto con uen (0.3): 505/504 sale de la misma uen (OM:796). |
| G2-22 | condicion del primer SKU agrupado, sin traducir ni validar | LOM:632; LCM:110-111, :172 | OM:824; la validación va después (:875-880) | EQ | Dec. sin defaults. Ver G4-24 | **EQ** | Se quitó ?? '': una condición null queda NULL (OM:793). Tu decisión Q5 (cortar antes de la cabecera si falta o no existe) está registrada pero no aplicada; ver G4-24. |
| G2-23 | Sin artículos no hay solicitud | LOM:632 → :728-732 | FirstOrDefault no lanza (OM:824) y se inserta | DIF | = G1-08 | DIF → **PENDIENTE** | Compuerta sin fila abierta. = G1-08. Si se decide paridad: lanzar antes de CrearSolicitudCreditoAsync con articulos null o vacío (se puede juntar con la revisión temprana de Q5). |
| G2-24 | cliente = CTE.Cliente recortado a 9 | LCM:173, :831; SPD:130 | Partner (SCW:274); las consultas usan req.Cliente (:385-397) | EQ-R | Dec. Un Partner de 10 no se recorta. La cuenta C… no pasa (G1-13) | **EQ-R** | Sin cambio de estado. @cliente con Size 10 (SCW:207) por el BP numérico (D2) y la columna varchar(10) (PLAN:1696). Riesgo: las búsquedas usan la cuenta cruda y la fila guarda maestro.Partner (decisión abierta 0.5 #13, ver G3-18). |
| G2-25 | utmSource tal cual; nulo → NULL | LOM:637; LCM:174 | ?? "" (OM:826) | DIF | Afecta cualquier consulta con IS NULL | DIF → **EQ** | Cambió: se quitó ?? '' (OM:795); null → NULL, Size 100 como el SP. |
| G2-26 | idMagento = incrementId; ClienteMagento NULL | LOM:629; LCM:177 | OM:829; SCW:285-286 | EQ | | **EQ** | Sin cambio. IdMagento ?? '0' (OM:799) solo actúa con incrementId null, que Magento no manda; en LAN eso no escribía fila (G1-25). |
| G2-27 | MetodoEnvio recortado a 12 | LOM:424; LCM:178; SPD:51, :147 | OM:830 → SCW:209 (sin Size) | DIF | Dec. Los 10 payloads reales traen 17 caracteres. Si la columna mide 12, falla todo INSERT (PLAN §18.3) | DIF → **EQ** | Cambió: @MetodoEnvio con Size 12 (SCW:216) recorta como el SP ('tablerate_bestway' → 'tablerate_be'); desaparece el riesgo del error 8152. null → NULL. |
| G2-28 | Teléfonos particular y celular = el de envío partido en lada de 2 o 3 | LOM:414; LCM:113, :139-143, :179-182 | OM:795-801, :831-834 | EQ | | **EQ** | Sin cambio. Los teléfonos cortos están en G2-29. |
| G2-29 | Teléfono vacío o corto → 'err' | LCM:141-143, :246-252 | Guardas (OM:797-801) → lada 0, número '' | DIF | = G1-20 | DIF → **PENDIENTE** | Compuerta sin fila abierta (Q10). Si se decide paridad: lanzar 'teléfono inválido' antes de CrearSolicitudCreditoAsync y quitar los '0' y '' de OM:654-657 y :761-766. = G1-20 |
| G2-30 | SucursalDestino | LOM:638; LCM:183 | OM:835 | EQ | | **EQ** | Sin cambio. |
| G2-31 | RedimirMonedero: solo se registra | LCM:184; SPD:336 | OM:836; SCW:293 | EQ | | **EQ** | El INSERT ahora envuelve el valor en ISNULL(@RedimirMonedero, 0.00), como el SP (SCW:152, D8). |
| G2-32 | OrigenIdMagento, o '' | LOM:644 | OM:837 | EQ | | **EQ** | Sin cambio. Solo difiere un null explícito (LAN guardaba NULL; SS guarda '' por OM:807); Magento siempre manda original_order_id ?? '' (MOM:726). |
| G2-33 | Los campos no enviados quedan NULL; estatus 0 | LCM:150-188; SPD:97-159 | OM:803-840; SCW:307-310 | EQ | Dec. rama Insert | **EQ** | Sin cambio. Los 20 parámetros que LAN no mandaba van como DBNull (revisión por columna). |
| G2-34 | fecha = momento del alta; confirmado 1 | SPD:170, :326-327 | DateTime.Now y Confirmado 1 (SCW:280, :282) | EQ | Dec. Usa el reloj del servidor de aplicación | **EQ** | Cambió la forma, no el estado (D8): @fecha = GETDATE() en el servidor SQL dentro del lote (SCW:38-39) y confirmado literal 1 (SCW:143). Ya no se usa DateTime.Now del servidor de aplicación. |
| G2-35 | El total no se guarda; solo servía al saldo | LCM:126-133 | No lo lee (OM:787-843) | EQ | Dec. Corrijo al grupo: un total inválido sí entra como 0 (G1-18) | **EQ** | Sin cambio. El total inválido está en G1-18. |
| G2-36 | Anchos: el SP recortaba cada valor al ancho de su parámetro | LCM:150-188; SPD:92-159 | VarChar sin Size en INSERT de texto (SCW:163-221) | DIF | Dec. Casos reales: MetodoEnvio 17 contra 12, dirección 51 contra 30, Partner 10 contra 9, sexo 15 contra 9 | DIF → **EQ-R** | Cambió: los 57 parámetros tienen el tipo y el ancho del SP (SCW:171-228); solo @cliente mide 10 en vez de 9, por el BP numérico. Los valores largos reales (MetodoEnvio 17, sexo 15, dirección 51) se recortan como en LAN. |
| G2-37 | No se valida el formato de ningún dato | SPD:223-344 | SCW:229-305 | EQ | Dec. | **EQ** | Sin cambio. |
| G2-38 | Sin folio no hay líneas, promotor ni liberador, y responde la cuenta | SPD:346-348; LCM:190-243 | Lanza (OM:695-696) → "Error, …" | DIF | Solo cambia la respuesta | DIF → **EQ-R** | Mismo efecto de negocio: sin folio no hay líneas ni promotor (OM:660-662). Solo cambia la respuesta (R4). |
| G2-39 | INSERT fallido: sin líneas ni cupón, 'err' con log en Credit, y responde la cuenta | LCM:190, :246-252; LOM:649 | Sube a OM:1950-1954 y responde "Error, …" (OC:37-46) | DIF | Por G2-27 puede volverse el camino normal | DIF → **EQ-R** | Mismo efecto: una excepción del alta o de sus lecturas previas no deja líneas ni cupón, y responde 200 'Error, …' (R4). Desaparece el riesgo de MetodoEnvio (G2-27). |

### G3 Validación telefónica

| Id | Regla | Legado | ServicioSAP | Estado | Nota | Estado 2026-09-29 | Nota 2026-09-29 |
|---|---|---|---|---|---|---|---|
| G3-01 | El alta no envía SMS ni valida el NIP; solo lee | LOM:609-650, :619-620 | OM:1785-1808, :1797-1798 | EQ | | **EQ** | Sin cambio. |
| G3-02 | Las filas de SMS nacen antes del checkout (getSms y SendSmsNewNumber) | LCM:21-48, :1991-2033, :2224-2262 | SendSmsNewNumber está portado (SS/Methods/Credit/CreditMethods.cs:117-230). getSms y validateSms siguen en LAN (DMZ/WebApiMagento/Controllers/CreditController.cs:68-107) | EQ-R | El SMS del NIP lleva el validado de Intelisis y SAP compara contra el de SAP. Si no están sincronizados, sale 1 | **EQ-R** | Sin cambio de estado. getSms, validateSms y SendSmsNewNumber ya están portados a ServicioSAP y usan A_GET_TelefonoValidado. Riesgos: el DMZ todavía manda getSms y validateSms a URL_INTELISIS (DMZ CreditController.cs:76, :107), valor de ambiente (D1); falta confirmar que SpAAea00030_ArmadoSMS acepta filas con BP. |
| G3-03 | Número del último SMS (C#) | LOM:819-852 | OM:589-613 | EQ | Arreglo #8 | **EQ** | Sin cambio. El log de error solo va a Console (OM:610). |
| G3-04 | Teléfono validado (C#): móvil ValidacionTel=1 más reciente, de CteTel | LOM:786-817 | BP05MA to_CteTel con filtros de ZappOrig y ZtelCte, sin orden por fecha (OM:631-660) | DIF | Cambia el respaldo cuando no hay SMS. Sin decisión (PLAN §17.4) | DIF → **EQ-R** | Cambió (D4): IsValidatedAsync usa A_GET_TelefonoValidado (OM:621-633, cambio del 09-26 por Q4), aceptado como el validado más reciente. Diferencia menor: Trim (OM:626). Riesgo: la copia del API en el share toma el más reciente de cualquier tipo (A_GET_TelefonoValidado.py:30-36) y el formato de ZtelCte ('+52') no está confirmado. |
| G3-05 | isValidated = validado == SMS | LOM:621; LCM:185 | No existe | N/A | Valor muerto: el SP lo sobrescribe | **N/A** | Sin cambio. |
| G3-06 | ValidacionTelefono del C# con IsInTableStd | LCM:185, :1967-1989 | No existe | N/A | Lo sobrescribe el SP | **N/A** | Sin cambio. |
| G3-07 | El SP recalcula ValidacionTelefono siempre | SPD:210-221 | SCW:27-28, :295, :215 | EQ | Dec. | **EQ** | Sin cambio. El INSERT nuevo deja @ValidacionTelefono en la misma posición. |
| G3-08 | Respaldo: SMS si Length > 0, luego validado, luego checkout limpio | LOM:642; LCM:145 | IsNullOrWhiteSpace (OM:688) | DIF | Cambia con valores de puros espacios y por G3-04 | **DIF** | Sin cambio. Arreglo de dos tokens: Length > 0 (!string.IsNullOrEmpty) en OM:654 y quitar el Trim de OM:626. El '0' con telefono null es compuerta sin fila (G3-09). |
| G3-09 | LadaValidar y TelefonoValidar; corto o no numérico → 'err' | LCM:145-148, :187-188; SPD:155-156 | "0" (OM:689-691) y TryParse que da 0 (:792-793) | DIF | Esos defaults van contra tu regla (PLAN §20.3). = G1-20 | DIF → **PENDIENTE** | Compuerta sin fila abierta. El ancho ya es el del SP (TelefonoValidar VarChar 10, LadaValidar Int). Si se decide paridad: quitar los '0' de OM:656-657 y el TryParse de OM:758, y lanzar como LCM:141-148. = G1-20, G2-29 |
| G3-10 | ValidacionOrigen con el catálogo ORIGEN VALIDACION NUMERO CTE | SPD:185-191 | CteTelSet y AWS VALOR1 (SCW:381-473; SS/Methods/MaterialManagement/ProductMethods.cs:708-735) | DEP | Lógica fiel (dec.). El catálogo no está dado de alta en AWS y ZappOrig no está definido | DEP → **EQ-R** | Cambió (D3): el catálogo tiene 23 valores y BusinessPhone trae ZappOrig y Zvaltel. La lógica es la del SP. Riesgo: nadie comparó los ZappOrig reales de SAP contra los 23 Valor1. Abierto: agregar orígenes de la era SAP, como 'CteXpressFrontSAP'. |
| G3-11 | TelefonoValidado = móvil validado más reciente, VARCHAR(10) | SPD:193-202 | El primero con ZvalTel, sin filtrar Tipo ni ordenar (SCW:476-519) | DIF | Fuente = dec. El contrato de referencia (businesspartner-dev/apps/api/routes/A_GET_TelefonoValidado.py:17-35) toma el más reciente de cualquier tipo. Confirmar con el dueño del API | DIF → **EQ-R** | Cambió (D4): se acepta que el API devuelve el móvil validado más reciente; recorte a 10 (SCW:608-611). Mismo riesgo que G3-04 si el API desplegado se porta como la copia del share. |
| G3-12 | TelefonoAValidar = último SMS por Cliente | SPD:204-208 | SCW:330-367 | EQ | El Logger.SAP de :363 es un log nuevo, contra tu regla | **EQ** | Sin cambio. El Logger.SAP de SCW:368 es un log nuevo (G5-20). |
| G3-13 | IF de tres valores | SPD:4, :210-221 | SCW:312-328, :602-630 | EQ | La tabla de verdad coincide | **EQ** | Sin cambio. Tabla de verdad en SCW:317-333 y :640-668. |
| G3-14 | Sin SMS → UNKNOWN → 0; '' → 1 | SPD:204-221 | SCW:354, :602-630 | EQ | | **EQ** | Sin cambio. |
| G3-15 | Un prospecto nunca se manda a validar | SPD:216 | SCW:532-546 | EQ-R | Dec. Los BP de ecommerce nacen con ZtipoCliente "" (OM:2841) | **EQ-R** | Sin cambio. Con D6 ya no llegan el cliente null ni el BP nuevo (ZtipoCliente ''). 'Prospecto' se compara como literal, sin comprobarlo en BP reales. |
| G3-16 | Si falla una fuente: 'err' sin cabecera, y responde la cuenta | SPD:187-198; LCM:246-252; LOM:625-649 | Cinco fuentes remotas; responde "Error, …" (OC:37-46) | DIF | Fuentes = dec. Cambian la respuesta y el número de modos de fallo | **DIF** | Sin cambio. Cuando una fuente falla, los dos se quedan sin fila; cambia la respuesta (R4 cubre el HTTP 200, pero el contrato de respuesta del crédito sigue abierto, 0.5 #9). Además SS lanza cuando una fuente responde no-2xx o vacío (SCW:366-371, :431-440, :489-507), donde el SP, sin filas, solo obtenía NULL e insertaba (G3-19). |
| G3-17 | La validación no bloquea ni modifica teléfonos | LCM:145-190; LOM:854-886 (sin llamadores) | SCW:27-32 | EQ | | **EQ** | Sin cambio. |
| G3-18 | El SP consulta con CTE.Cliente del maestro | LCM:173; SPD:130, :189, :199, :207 | req.Cliente = cuenta (OM:825; SCW:25, :385-397) | DEP | Con la cuenta C… falla BP05MA. Cuando Magento mande el BP, getSms tiene que usar la misma clave | DEP → **EQ-R** | Cambió (D2): la cuenta será el BP numérico. Riesgo: SS consulta con la cuenta cruda (SCW:25, :27) y guarda maestro.Partner (SCW:281); decisión abierta: usar el número de BP en las búsquedas (0.5 #13). getSms y order/new tienen que mandar la misma cadena. |
| G3-19 | Si una fuente de la validación no encuentra el dato, el SP recibía NULL y de todos modos insertaba la cabecera (ValidacionTelefono 1 o 0) | SPD:186-208 (lecturas que sin filas dejan la variable en NULL), :210-221 | GetTelefonoValidadoAsync lanza si falta URL_BP_API o la respuesta no es 2xx (SCW:489-507); GetCteTelAsync lanza con no-2xx, cuerpo vacío o XML (SCW:431-440); ObtenerTelefonoAValidarAsync relanza (SCW:366-371). Cualquiera aborta InsertAsync (SCW:25-32) y ProcessCreditPaymentAsync relanza (OM:725-728): no hay fila | NUEVA 2026-09-29 | — | **PENDIENTE** | **NUEVA 2026-09-29** (revisión por columna, no del crítico). Decisión abierta (0.5 #12): contar los errores de búsqueda de teléfono como 'no encontrado', porque el SP insertaba igual. Riesgo sin verificar: CteTelSet se capturó en el puerto 20400 y BP05MA en el 44300 (CAPTURAS_REALES_APIS.md:9, :76), pero SCW:417 arma CteTelSet sobre el mismo SERVICE_URL que BP05MA (BPM:301). Si ese servicio no está en el puerto de BP05, ningún BP con teléfono validado tendría fila. |

### G4 Líneas

| Id | Regla | Legado | ServicioSAP | Estado | Nota | Estado 2026-09-29 | Nota 2026-09-29 |
|---|---|---|---|---|---|---|---|
| G4-01 | Agrupar por SKU | LOM:486-526, :535 | OM:87-106, :1740 | EQ | Un dato inválido entra como 0 (G1-07) | **EQ** | Sin cambio. |
| G4-02 | Staging en eCommerceDetPedidos también en crédito | LOM:568-601, :963-1079; SDP:135-162 | No existe (OM:527-528) | FALTA | Lo leían updateCreditOrderId y recoger en sucursal. = G5-21 y G5-22 | **FALTA** | Sin cambio. Decisión abierta (tuya y del dueño de SIGMAVI): portar Limpiar e Insertar, o confirmar que ya nadie lee eCommerceDetPedidos. Contradice G5-21 a G5-23 (N/A por R7): se resuelve con la misma decisión. |
| G4-03 | Sustitución TELEFONIA en el staging | SDP:12-146 | No existe. ValidarRegionCelulares es de contado (OM:2086-2140) | FALTA | = G5-23 | **FALTA** | Sin cambio. Depende de G4-02 y de Q17 (diferida por el negocio). |
| G4-04 | Staging separado por comas | LOM:948-961, :1081-1104 | No hay staging; las líneas se arman igual (OM:1792, :917) | N/A | | **N/A** | Sin cambio. |
| G4-05 | Cada SKU es una línea 'cantidad,SKU'; los precios de Magento no llegan | LOM:611-615; LCM:893 | OM:1789-1793, :917 | EQ | | **EQ** | Sin cambio. |
| G4-06 | SEGU00001 si costoEnvio (texto) ≠ '0' y ≠ '' | LOM:616-617; LCM:901 | decimal > 0 (OM:1794-1795) | DIF | Cambia con '0.00', null o negativo (PLAN §20.3) | DIF → **EQ-R** | Cambió: Magento manda costoEnvio con number_format(…, 2) como float, nunca null ni negativo (MOM:1002-1005), y los payloads reales traen '0' y '150'. Solo diferiría un '0.0' (Q22 recomienda aceptarlo). |
| G4-07 | Líneas en VTASdArtCreditoWeb (Android), una fila por línea | LCM:869-914; SPL:208, :243 | OM:888, :901-913, :1008 | EQ-R | Dec. Un SKU de más de 20 ya no se recorta | **EQ-R** | Sin cambio de estado. @Articulo ya tiene Size 20 (OM:880): se cerró el riesgo de ancho. Conexión directa decidida (D1). |
| G4-08 | Un SKU repetido seguido se descarta | LCM:876, :895-897 | OM:899, :922-924 | EQ | | **EQ** | Sin cambio. |
| G4-09 | SEGU00001 = envío: cantidad 1, precio = costo | LCM:899-908 | OM:933-941 | EQ | | EQ → **PENDIENTE** | Cambió: LAN pasaba el envío por float.Parse (precisión simple) a un Float, y 149.99 llegaba como 149.990005493164; SS manda 149.99 exacto (OM:904-908). Con montos enteros ('150') es igual. Decisión abierta: precisión del SEGU00001; falta el tipo DDL de VTASdArtCreditoWeb.precio (PLAN §23.8). |
| G4-10 | Orden 1, 2, 3… con huecos | LCM:875, :911, :915 | OM:898, :927, :976, :1010 | EQ | Dec. | **EQ** | Sin cambio. |
| G4-11 | Todas las líneas con la condición de la cabecera | LCM:910; SPL:31, :261 | OM:700, :703, :969-972 | EQ | | **EQ** | Sin cambio. Con condición null la cabecera guarda NULL y ninguno de los dos escribe líneas. |
| G4-12 | El CP solo decide la región; nulo hace fallar cada línea | LOM:639; LCM:912; SPL:34 | Se recibe y no se usa (OM:699, :857-1023) | FALTA | Se iguala al portar la región | **FALTA** | Sin cambio. Se porta con G4-15 (Q17 diferida); en ese momento decidir si un CP null detiene las líneas como en LAN. |
| G4-13 | Sin transacción: una línea que falla deja escritura parcial, sin promotor ni liberador, y responde la cuenta | LCM:869-919, :246-252 | OM:1015-1019, :711-717, :759 | EQ-R | Dec. Logger.SAP puede lanzar (SS/Helpers/Logger.cs:26-31) | **EQ-R** | Sin cambio. |
| G4-14 | Líneas solo si hay folio | LCM:199-201 | OM:695-696, :703 | EQ | La respuesta cambia (G2-38) | **EQ** | Sin cambio. |
| G4-15 | Sustitución de SKU por región (TELEFONIA con par) | SPL:43-165 | No existe; escribe el SKU de Magento (OM:926) | FALTA | En celulares con par cambian SKU, precio y Abono (PLAN §21.4) | **FALTA** | Sin cambio. Q17 diferida por el negocio (PLAN §23.9). |
| G4-16 | CP activo: R5 → R6 si hay existencia | SPL:85-125 | No existe | FALTA | | **FALTA** | Sin cambio. Parte de G4-15. |
| G4-17 | CP inactivo o vacío: R6 → R5 si hay existencia | SPL:127-159 | No existe | FALTA | | **FALTA** | Sin cambio. Parte de G4-15. |
| G4-18 | Existencia para la sustitución | SPL:98-118, :135-155 | No existe | FALTA | Fuente por validar (PLAN §21.4) | **FALTA** | Sin cambio. Parte de G4-15; falta una fuente de existencia en SAP. |
| G4-19 | Casos límite del par (NULL, error 512) | SPL:62-93, :98-146 | No existe | FALTA | Son defectos; PLAN §21.2 recomienda no replicarlos | **FALTA** | Sin cambio. PLAN §21.2 recomienda no copiar estos defectos. |
| G4-20 | SEGU00001: cantidad 1, precio de envío, Abono 12 | SPL:179-217 | OM:933-937 | EQ | | **EQ** | Sin cambio. La precisión está en G4-09 y el costo en G4-29. |
| G4-21 | Precio y Abono de la lista final por condición traducida y SKU, sin UEN | SPL:243-262 | Traducción con TiendaVirtual y respaldo en memoria (OM:3325-3356; PaymentConditionCatalog.cs:122). SD29 por SKU filtrado por OrgVtas (OM:946-984) | EQ-R | SD29 = dec. Filtro OrgVtas, respaldos, SKU sin escapar en $filter e importe no numérico que se vuelve 0 no son decisión | EQ-R → **PENDIENTE** | Cambió: la fuente del precio (SD29 o PropreListaDFinal) es decisión abierta, junto con Q6 (esquema de CondicionesCredVtaLinea en SIGMAVI). Defecto aparte: el SKU va sin escapar en el $filter de SD29 (FinalListProperMethods.cs:85); un SKU con '+' (DIB+00104) puede quedarse sin precio y sin línea, sin aviso. |
| G4-22 | Descuento por categoría con CEILING | SPL:248-256 | OM:988-993 | EQ | Dec. | **EQ** | Sin cambio. |
| G4-23 | Sin precio: la línea no se inserta y queda hueco | SPL:243-262 | OM:973-977 | EQ | Dec. | **EQ** | Sin cambio. |
| G4-24 | Condición sin equivalente: 0 líneas de artículo, pero SEGU00001, promotor y liberador sí | SPL:179-262; LCM:203-241 | Lanza antes del ciclo (OM:875-880): ni líneas ni SEGU00001 ni cupón, y responde Concluido | DIF | Dec. sin defaults. Abierto si debe detenerse antes de la cabecera (PLAN §18.5 #7) | **DIF** | Sin cambio. Tu decisión Q5 (cortar al inicio, antes de consumir APIs) no está aplicada: hoy lanza en OM:847-850, el catch se la traga (OM:677-683), queda la cabecera sin líneas, sin SEGU00001 ni promotor, y responde 'Concluido'. |
| G4-25 | Varias filas de precio → varias líneas con el mismo Orden | SPL:243-262 | FirstOrDefault (OM:969-972) | DIF | Confirmar que la llave de SD29 es única | DIF → **PENDIENTE** | Cambió: es la decisión abierta Q16 (qué fila de SD29 precia la línea), junto con la fuente del precio (G4-21). Hace falta una captura real de SD29. |
| G4-26 | Cantidad agrupada; precio unitario | LCM:899-908 | OM:936, :941, :982-984 | EQ | | **EQ** | Sin cambio. |
| G4-27 | IdArtCreditoWeb = folio | LCM:898 | OM:925 | EQ | | **EQ** | Sin cambio. |
| G4-28 | articulo = SKU final o SEGU00001 (VARCHAR 20) | SPL:212, :247; LCM:909 | OM:926, :909 | EQ-R | Dec. En celulares queda el SKU sin sustituir | **EQ-R** | Sin cambio de estado. El ancho ya coincide (Size 20, y el precio se busca con el SKU recortado, OM:916). Solo queda la sustitución de celulares (G4-15). |
| G4-29 | costo por spVerCosto (sucursal 96, MAVI, pesos) o NULL | SPL:187-241; SVC:10-193 | 0 siempre (OM:931, :1006) | FALTA | PLAN §21.3: no portarlo sin un lector demostrado | FALTA → **PENDIENTE** | Cambió: el costo es decisión abierta (Q18, con el dueño del liberador). Si no se porta, decidir entre 0 y NULL: LAN guardaba NULL sin método de costeo y SS manda 0 (OM:902, :979). |
| G4-30 | Gancho xpVerCosto | SVC:63-70 | No | FALTA | | FALTA → **PENDIENTE** | Cambió: lo cubre la decisión de costo (G4-29, Q18). |
| G4-31 | SERVICIO o JUEGO usan SugerirCostoArtServicio | SVC:73-88 | No | FALTA | | FALTA → **PENDIENTE** | Cambió: lo cubre la decisión de costo (G4-29, Q18). |
| G4-32 | Nunca usa proveedor ni subcuenta | SVC:64-66, :89-148 | No | N/A | Inalcanzable también en LAN | **N/A** | Sin cambio. |
| G4-33 | Sin método de costeo, costo NULL | SVC:72, :120, :191 | 0, nunca NULL | FALTA | | FALTA → **PENDIENTE** | Cambió: lo cubre la decisión de costo (G4-29). Si no se porta, NULL (lo que LAN guardaba sin método de costeo) contra 0. |
| G4-34 | Base de Art y ArtCosto de la sucursal 96 | SVC:150-163 | No | FALTA | | FALTA → **PENDIENTE** | Cambió: lo cubre la decisión de costo (G4-29); necesita una fuente SAP acordada para Art y ArtCosto de la sucursal 96. |
| G4-35 | Desglose del precio con impuesto incluido | SVC:62, :165-171 | No | FALTA | | FALTA → **PENDIENTE** | Cambió: lo cubre la decisión de costo (G4-29, Q18). |
| G4-36 | Fórmula según el método de costeo | SVC:172-179 | No | FALTA | | FALTA → **PENDIENTE** | Cambió: lo cubre la decisión de costo (G4-29, Q18). |
| G4-37 | Moneda, factor de unidad y redondeo | SVC:180-192 | No | FALTA | | FALTA → **PENDIENTE** | Cambió: lo cubre la decisión de costo (G4-29, Q18). |
| G4-38 | No hay condición por artículo | SPD:176-182; LCM:910 | OM:700, :703 | EQ | Dec. | **EQ** | Sin cambio. Con D7 el origen puede ser 'DIMAS MX', pero eso solo toca la cabecera (G2-03). |
| G4-39 | No valida el precio de Magento ni la existencia | LOM:723-726 | Regresa (OM:1802-1807) antes de :1820 y :1823 | EQ | | **EQ** | Sin cambio. |

### G5 Posterior al alta

| Id | Regla | Legado | ServicioSAP | Estado | Nota | Estado 2026-09-29 | Nota 2026-09-29 |
|---|---|---|---|---|---|---|---|
| G5-01 | Idempotencia con el forzarOrder original | LOM:538, :541-542, :1602-1643 | OM:1752 con el valor ya cambiado; SD36 (:452-464) | DIF | = G1-06. Además solo encuentra el PurchNoC con el docType exacto | DIF → **EQ-R** | Cambió: forzarOrderOriginal antes de ToArray (OM:1717, :1729; arreglo del 2026-09-25, R6) y SD36 por PurchNoC (R7). Riesgo: para crédito SD36 nunca encuentra nada (no hay documento SAP) y solo busca el docType exacto (ZMER por defecto). Ver G5-24. |
| G5-02 | Los reenvíos crean otra solicitud hasta que exista la venta | SPD:172-223; LCM:208-240 | SCW:18-155; OM:694-709; liberador apagado | EQ-R | En SAP la ventana no se cierra nunca: cada reintento quema otro cupón | EQ-R → **PENDIENTE** | Bloqueado por el contrato del liberador y por dónde vive la decisión de crédito (0.5 #14, #15). En SAP la ventana de reenvíos no se cierra: cada reintento crea otra fila y quema otro cupón (OM:660, :674). Magento ya bloquea el reenvío de la cotización (MOM:634-640). |
| G5-03 | Reproceso desde setOrder.log | LOM:1688-1710; LOC:436-443 | No existe; OC no guarda la petición | FALTA | GANTT:263 (01/03-18/03/2027) | **FALTA** | Sin cambio. Además SS no registra la petición entrante (OC solo registra errores, OC:45), así que no hay de dónde reprocesar. Decisión abierta: conservar o quitar la herramienta (GANTT:262). = G1-04 |
| G5-04 | Guía una vez por orden; si falla, no hay solicitud y responde "" | LOM:603-606, :735-754 | Error tragado (OM:533-553; SS/Helpers/ConexionDB/SQLiteDb.cs:158-176); Trim del total (OM:407-416) | DIF | PLAN §20.3 | DIF → **EQ-R** | Cambió por R5 (guardado de guía aceptado). Riesgos: Trim del nombre completo (OM:415) y un nombre null, que en LAN detenía todo. El crítico lo califica PENDIENTE (compuerta sin fila por guía fallida). = G1-05 |
| G5-05 | getGuide (404 o 500) | LOC:163-183; LOM:756-784 | OC:215-238; OM:563-579 | EQ-R | Lee otro data.db: las guías de LAN no aparecen | **EQ-R** | Sin cambio. Lee otro data.db (Web.config:59): las guías que guardó LAN no aparecen. |
| G5-06 | Promotor: 'Elimina' si hay código y las líneas salieron bien | LCM:199-206, :392-463 | OM:701-710 | EQ | Arreglo #11 | **EQ** | Sin cambio. Con D6 solo corre para un BP existente, como LAN. |
| G5-07 | Cupón usado: TOP 1 más reciente, sin validar | SCU:115-128 | Valida con SuccessFactors y AWS; UPDATE sin TOP 1 (OM:1038-1102, :1095) | DIF | Quema todos los cupones libres del código | **DIF** | Sin cambio. Con D9 la tabla es la misma (VentasCupones = VTASCVentaCupon renombrada); solo difieren las reglas: SS valida con SuccessFactors y AWS antes de quemar (OM:1027-1056, :1064) y su UPDATE no tiene TOP 1 (OM:1068), así que quema todos los cupones libres del código. Decisión abierta: alcance de Q8 (0.5 #2). |
| G5-08 | Cupón nuevo siempre | SCU:130-164 | Solo si el código es válido (OM:1091, :1104-1158) | DIF | Si no valida, el promotor pierde su siguiente cupón | **DIF** | Sin cambio. Solo regenera dentro de la compuerta cuponValido (OM:1064, :1077-1131); si falta URL_BP_API lanza después del UPDATE (OM:1079-1080) y el cupón se quema sin regenerarse. Ver G5-27. |
| G5-09 | Liberador: cuenta 'C', con folio y líneas bien | LCM:199-241 | Comentado (OM:719-757) | DEP | Condición invertida, cliente = id de Magento y await dentro de un lambda que no es async (:736, :746) | DEP → **PENDIENTE** | Bloqueado por el contrato del liberador (otro equipo). Con D6 todo lo que llega aquí es BP existente, la misma población que la regla 'C' de LAN bajo D2. Las correcciones antes de encenderlo están en G1-22. |
| G5-10 | Resultado del liberador | LAN/WebApiMagento/Metodos/LiberadorCreditoMethods.cs:40-101 | SS/Methods/Credit/LiberadorCreditoMethods.cs:41-107 | DEP | Port equivalente, sin llamador | DEP → **PENDIENTE** | Port equivalente, sin llamador. Bloqueado por el contrato del liberador. Al encenderlo, registrar en archivo como LAN (Logger.LiberadorCredito), no en Console. |
| G5-11 | Contenido del aviso a Magento | LCM:219-237; LOM:1803 | Llaves entity_id, customer_account y credit_request_id (OM:1249-1255) | DEP | El DMZ espera entityId, cuenta e idSolicitud (DMZ/WebApiMagento/Models/CreditRequest.cs:214-217): solo llegaría status | DEP → **PENDIENTE** | Bloqueado por el contrato del liberador. Corrección conocida: renombrar las llaves a entityId, status, cuenta e idSolicitud (OM:1222-1228). |
| G5-12 | Transporte del aviso | LOM:1751-1833 (el handler no se usa) | OM:1192-1280 (el handler sí se usa y acepta cualquier certificado) | DEP | Falta la URL de authorizationResult del DMZ | DEP → **PENDIENTE** | Bloqueado por el contrato del liberador. Antes de encenderlo: HttpClient sin el handler que acepta cualquier certificado (OM:1188-1189, :1196) y logs en archivo como LOM:1796-1832. La ruta authorizationResult del DMZ existe; URL_DMZ es valor de ambiente (D1). |
| G5-13 | El crédito termina en la solicitud | LOM:649 | OM:1802-1807 | EQ | | **EQ** | Sin cambio. Return en OM:1779-1784. |
| G5-14 | Respuesta de setOrder | LOM:624-649, :728-732 | OC:27-47 | DIF | = G1-24 | DIF → **EQ-R** | Cambió por R4: 200 con {BP = cuenta, SalesDocument null, Message '', Resultado 'Concluido'}; con D6 un BP inexistente responde 200 'Error, Error en SetOrder: sin cuenta'. Magento solo lee el estatus y '=== false'. Riesgo: algún lector futuro del cuerpo. Capa del DMZ en G5-25. |
| G5-15 | validateCredit | LOC:455-482 | No existe | FALTA | = G1-03 | FALTA → **N/A** | Cambió: sin llamador (Magento no la usa y el proxy del DMZ está comentado como reemplazado por la validación nativa de SAP). = G1-03 |
| G5-16 | Errores: "" o el texto de la excepción | LOM:728-732; LOC:154-157 | "Error, …" (OM:1950-1954; OC:37-47) | DIF | Logger puede convertirlo en 500 | DIF → **EQ-R** | Cambió por R4. Riesgos: Logger.SAP llama CreateDirectory fuera del try (Logger.cs:26-31) y el catch puede terminar en 500; los casos que LAN respondía con la cuenta ('sin cuenta', sin folio) ahora responden 'Error, …'. |
| G5-17 | Sin forzarOrder truena | LOM:562 | Con null no revisa y crea la solicitud (OM:1752) | DIF | | DIF → **PENDIENTE** | Compuerta sin fila abierta. Inalcanzable hoy: Magento siempre manda '0' (MOM:38, :752). Para paridad: lanzar antes de OM:1764 si forzarOrder es null. |
| G5-18 | creditStatus | LOC:484-504; LOM:1867-1996 | No existe; el DMZ lo manda a LAN (DMZ:460-482) | FALTA | GANTT:250. Para solicitudes de SAP, LAN responderá EN_ANALISIS siempre | FALTA → **PENDIENTE** | Bloqueado: dónde vive la decisión de crédito (Venta de Intelisis o SAP) y el contrato del liberador (0.5 #15). El DMZ todavía lo manda a URL_INTELISIS y el cron de Magento lo consulta (PollCreditStatus.php:93-97). GANTT:249. |
| G5-19 | updateCreditOrderId | LOC:506-533; LOM:1998-2061 | No existe; el DMZ lo manda a LAN (DMZ:404-419) | FALTA | GANTT:214 | FALTA → **PENDIENTE** | Misma decisión que G5-18, más el contrato del liberador (UpdateIdEcommerceEnVenta, R3). GANTT:213. |
| G5-20 | Bitácora de LAN = lo máximo que se puede registrar | LOC:144, :152; LCM:205, :250; LOM:730 | Dos archivos (SS/Helpers/Logger.cs:11, :26-38) y dos logs nuevos (OM:3353; SCW:363) | DIF | Va contra tu regla de no añadir logs | **DIF** | Sin cambio de estado, con un log más: [CREDITO SIN CUENTA] (OM:648), nuevo con D6. Siguen [CREDIT ObtenerTelefonoAValidar ERROR] (SCW:368), [ORDER GetCondicion ERROR] (OM:3330) y la copia local (Logger.cs:26-41). Decisión abierta: logs más allá de LAN (Q20, 0.5 #10). |
| G5-21 | Detalle ecommerce: limpieza | LOM:582; SDP:155-162 | No existe | FALTA | Tabla de SIGMAVI por confirmar | FALTA → **N/A** | Cambió por R7 (sin staging detallePedido). Contradice G4-02 (FALTA): se resuelve con la misma decisión sobre eCommerceDetPedidos. |
| G5-22 | Detalle ecommerce: inserción | LOM:584-601; SDP:12-154 | No existe | FALTA | | FALTA → **N/A** | Cambió por R7, igual que G5-21. |
| G5-23 | Región en el detalle ecommerce | SDP:16-146 | No existe | FALTA | No portar el caso Articulo '' | FALTA → **N/A** | Cambió por R7. La sustitución TELEFONIA general está diferida (Q17) y vive en G4. |
| G5-24 | Después de autorizar el crédito, Magento vuelve a mandar la orden real a setOrder. LAN responde 'PedidoExistente' porque updateCreditOrderId ya renombró Venta.IdEcommerce, y no se crea otra solicitud | Magento248: Mavi/CreditoCheckout/Cron/PollCreditStatus.php:178 (placeOrder), :254-264 y :273-287 (updateCreditOrderId CRED → real); Omnipro/PlaceOrder/Observer/PlaceOrderObserver.php:33-39; OrderManagement.php:988-993 vía Cron/Order/Registry.php:32, con forzarOrder '0' (:570). LAN: LOM:2007-2017 y :538-542 | Solo revisa SD36 por ZSD_ZMER_{incrementId} (OM:1725-1737) y el crédito nunca crea ese documento. La orden reenviada entraría a ProcessCreditPaymentAsync (OM:1762-1785): segunda cabecera, segundas líneas y otro cupón (OM:671-675) | NUEVA 2026-09-29 | — | **PENDIENTE** | **NUEVA 2026-09-29** (crítico). G5-01, G5-02 y G5-19 cubren solo partes. Hoy no puede pasar porque SS no tiene creditStatus ni updateCreditOrderId. Bloqueo: dónde vive la decisión de crédito (G5-18, G5-19). Arreglo propuesto al portarlos: una revisión de duplicado propia del crédito, sin SD36 (incrementId ya ligado a una solicitud por idMagento en CRED_SOLICITUD_WEB_DATOS_TEMP o por el mapeo CRED → real), con el forzarOrder original '0'. |
| G5-25 | El DMZ de la era LAN daba al crédito sus propias respuestas HTTP: sin llave 'cuenta' → 400 'Cuenta invalida' (no llamaba a LAN); LAN '' → 500; 'PedidoExistente' → 409; 'sin cuenta' → 422; respuesta que no empieza con 'C' → 500; excepción → 500; éxito → 200 con la cuenta. El crédito nunca se mandaba a SAP | DMZ git c63c0ab (2026-06-08, última versión de la era LAN; feature 10523) WebApiMagento/Controllers/OrdersController.cs:116-121, :131, :136-142, :146-149, :152-157, :161-165, :175, :195 | En el DMZ actual (HEAD eb28c7c) todo eso está comentado (OrdersController.cs:116-127, :132-183, :185-213): toda orden va a order/new (:196) y se devuelve con Ok (:214-227); el único 500 es cuando la llamada misma lanza (:200-204). OC:37-46 responde 200 'Error, …' ante cualquier falla | NUEVA 2026-09-29 | — | **DIF** | **NUEVA 2026-09-29** (crítico). G1-24 y G5-14 solo describen las cadenas de LAN, no la capa del DMZ con la que habla Magento. Efecto en Magento pequeño: CreditoOrderManagement.php:51-76 trata igual cualquier respuesta distinta de false. Cambia el monitoreo y cualquier otro cliente que lea el estatus. Decisión abierta (0.5 #9): restaurar el mapeo (400, 409, 422, 500 y 200 con el BP en vez de StartsWith('C'), por D2) o registrar que Magento ignora el estatus. |
| G5-26 | codigo_promotor presente pero null: LAN falla después de escribir cabecera y líneas, sin cupón y sin liberador. Un código de puros espacios sí corre 'Elimina' | LOM:633; LCM:190-197 (cabecera), :201 (líneas), :203 (data[6].Length con null) → LCM:246-252 ('err' y Logger.Credit); LCM:208-241 no corre. Con ' ': SCU:115-136 y el NUEVO inserta un cupón con código ' ' | ?? "" e IsNullOrWhiteSpace (OM:671-675): en ninguno de los dos casos se toca el cupón | NUEVA 2026-09-29 | — | **EQ-R** | **NUEVA 2026-09-29** (crítico). Hoy la base queda igual que en LAN porque el liberador está apagado; diferirá al portarlo. Magento manda getCodePromoter(), '' o cadena (MOM:710-718), así que es poco probable. Al encender G5-09: no lanzar el liberador si codigo_promotor llegó null, o registrarlo como diferencia aceptada. |
| G5-27 | Quema y regeneración del cupón del promotor: anchos (Codigo y Agente VARCHAR(10), IdEcommerce VARCHAR(20)) y las dos operaciones en una sola llamada al SP | SCU:53-54 (@IdEcommerce VARCHAR(20), @Agente VARCHAR(10)), :118-128 (quema), :130-136 (regeneración en la misma llamada), :146-159 | UPDATE con AddWithValue de largo completo (OM:1068-1073); luego AS_GET_ZQBP_AGENTE por HTTP (OM:1079-1095) y GetSucursalAsync (OM:1097-1113), y hasta el final el INSERT con el código completo (OM:1115-1131). Si falta URL_BP_API (OM:1080) o falla una llamada, el catch (OM:1138-1142) regresa 'err' con el cupón ya quemado | NUEVA 2026-09-29 | — | **DIF** | **NUEVA 2026-09-29** (crítico). G5-07 y G5-08 cubren TOP 1, la validación previa y 'regenerar siempre', pero no los anchos ni este modo de falla: el cupón se gasta y el promotor no recibe uno nuevo. Arreglo: Size 10 en Codigo y Agente y 20 en IdEcommerce (o confirmar que los códigos no pasan de 10), buscar la sucursal antes del UPDATE y hacer UPDATE e INSERT en un lote o transacción. Entra en la decisión de cupones (Q8, 0.5 #2). |

## 4. Lo que no es equivalente y no viene de una decisión tuya (por impacto)

> **Nota 2026-09-29: la sección 0 reemplaza los conteos y estados de esta sección.** La lista se conserva como estaba el 2026-09-24. Cómo quedó cada punto:
> - 4.1 #1 Crea solicitudes que LAN no creaba: la cuenta vacía (G1-10, G2-05) quedó resuelta por D6 y entreCalles null (G2-18) ya no llega desde Magento; el resto son compuertas sin fila, pendientes de tu decisión (0.5 #1).
> - 4.1 #2 Contrato de respuesta: el HTTP 200 está decidido (R4); el contrato del crédito, incluida la capa del DMZ (G5-25), sigue abierto (0.5 #9).
> - 4.1 #3 Duplicados: forzarOrder original resuelto (R6, 2026-09-25). La ventana de reenvíos (G5-02) y el reenvío de la orden autorizada (G5-24) esperan al liberador.
> - 4.1 #4 Cupón: la tabla es la misma (D9); las reglas siguen DIF (G5-07, G5-08, G5-27) y el alcance de Q8 está abierto.
> - 4.1 #5 Endpoints posteriores: validateCredit ya no aplica (G1-03, G5-15); getOrderInfoAndSet sigue FALTA; creditStatus y updateCreditOrderId son PENDIENTE de otros equipos.
> - 4.1 #6 TELEFONIA: sigue FALTA (Q17 diferida por el negocio).
> - 4.1 #7 Detalle ecommerce: G4-02 sigue FALTA y G5-21 a G5-23 son N/A por R7; la contradicción se resuelve con una sola decisión.
> - 4.1 #8 Guía: aceptada (R5); el crítico pide tratar la falla como compuerta sin fila.
> - 4.1 #9 Estado civil: resuelto (D10, G2-13).
> - 4.1 #10 Teléfono a validar: G3-04 y G3-11 aceptados (D4) y getSms ya está portado (G3-02); G3-08 sigue DIF.
> - 4.1 #11 y #12 Precio y costo de las líneas: PENDIENTE (fuente del precio, varias filas, precisión, Q18); costoEnvio (G4-06) pasó a EQ-R.
> - 4.1 #13 Logs: sigue DIF (G5-20), con un log más ([CREDITO SIN CUENTA]).
> - 4.1 #14 Menores: utmSource (G2-25) y 'VIU' (G2-20) resueltos; Namemiddle (G2-08) abierto; las dos fuentes de existencia (G1-12) siguen EQ-R.
> - 4.2 #1 Cuenta C…: resuelto por D2 (Magento mandará el BP); la transición depende de MOM:719.
> - 4.2 #2 Liberador y aviso a Magento: siguen bloqueados (PENDIENTE).
> - 4.2 #3 Catálogo AWS: dado de alta con 23 valores (D3).
> - 4.2 #4 Base Android: las conexiones de Web.config son la fuente correcta y los valores de ambiente no son bloqueo (D1).

**4.1 Lo tiene que resolver ServicioSAP**

1. **Crea solicitudes que LAN no creaba.**
   - Casos:
     - cuenta vacía con 'cliente' (G1-10, G2-05);
     - payload incompleto o con texto en un número, y forzarOrder null (G1-07, G5-17);
     - orden sin artículos (G1-08, G2-23);
     - total inválido (G1-18);
     - BP sin fecha de nacimiento (G1-19, G2-10);
     - teléfono más corto que la lada (G1-20, G2-29, G3-09);
     - entreCalles null (G2-18).
   - Hace falta: cortar antes de OM:694 en cada caso, como LAN, y quitar los "0" de OM:689-691, :797-801 y :792-793.
   - Para la cuenta vacía (G1-10) falta tu decisión (PLAN §18.5 #6).
2. **Cambió el contrato de respuesta a Magento** (G1-24, G5-14, G1-09, G2-38, G2-39, G3-16, G5-16).
   - Antes era una cadena: la cuenta, "" o "PedidoExistente". Ahora es un objeto o "Error, …" (OC:27-47).
   - Además, si no se puede crear la carpeta Logs (SS/Helpers/Logger.cs:28-31), el catch termina en 500.
   - Hace falta: acordarlo con Magento y el DMZ (PLAN §19.2 #1), o devolver lo mismo que LAN.
3. **Duplicados.** Con precioEspecial ≠ 0 no se revisa el pedido existente (G1-06, G5-01).
   - Hace falta: guardar forzarOrder antes de ToArray (OM:1741) y usarlo en :1752.
   - Aparte, sin liberador cada reintento crea otra solicitud y quema otro cupón (G5-02).
4. **Cupón del promotor.**
   - Se queman todos los cupones libres del código en lugar del TOP 1 (OM:1095).
   - Solo se regenera el cupón si el código pasa la validación de SuccessFactors y AWS (OM:1091) (G5-07, G5-08).
   - Hace falta: TOP 1 del más reciente, sin validación previa en 'Elimina', y regenerar siempre.
   - Sigue sin confirmar que VentasCupones equivalga a VTASCVentaCupon (PLAN §18.8).
5. **Endpoints posteriores al alta que no existen:**
   - validateCredit (GANTT:233, ya vencido);
   - getOrderInfoAndSet (GANTT:263);
   - creditStatus (GANTT:250);
   - updateCreditOrderId (GANTT:214).

   Casos: G1-03, G1-04, G5-03, G5-15, G5-18 y G5-19.
6. **Sustitución de SKU por región TELEFONIA** (G4-12, G4-15 a G4-19). Los celulares con par se guardan con el SKU, el precio y el Abono del SKU pedido.
   - Faltan la familia en DM01, las tablas de par y de CP en SIGMAVI y una fuente de existencia (PLAN §21.4).
7. **Detalle de pedido ecommerce** (G4-02, G4-03, G5-21 a G5-23). La orden de crédito no deja partidas.
   - Hace falta: definir la tabla en SIGMAVI o confirmar que ya nadie la lee.
8. **Guía de envío.**
   - Una falla del guardado es silenciosa, y hay Trim del nombre completo (G5-04).
   - Lee otro data.db (G5-05).
   - Pendiente en PLAN §20.3.
9. **Estado civil siempre vacío** (G2-13). Hay que leer Marst de BP05MA y falta su tabla de códigos.
10. **Teléfono a validar cuando no hay SMS.**
    - Filtros y orden de IsValidatedAsync (G3-04).
    - IsNullOrWhiteSpace en lugar de Length > 0 (G3-08).
    - Falta confirmar si A_GET_TelefonoValidado filtra móvil y validado más reciente (G3-11).
    - getSms sigue leyendo la CteTel de Intelisis (G3-02).
11. **Riesgos en el precio de las líneas.**
    - Filtro por OrgVtas, respaldos a PaymentConditionCatalog y al texto crudo de Magento, SKU sin escapar en $filter e importe no numérico que se vuelve 0 (G4-21).
    - FirstOrDefault donde LAN insertaba varias filas (G4-25).
    - costoEnvio '0.00', null o negativo (G4-06).
12. **Costo de las líneas siempre en 0** (G4-29 a G4-37). PLAN §21.3 recomienda esperar a que haya un lector demostrado de la columna.
13. **Logs y Console.WriteLine que LAN no tiene** (G5-20, G3-12):
    - [ORDER GetCondicion ERROR] (OM:3353);
    - [CREDIT ObtenerTelefonoAValidar ERROR] (SCW:363);
    - cada línea se escribe en dos archivos (Logger.cs:11, :36);
    - Console.WriteLine nuevos en OM:716, :961-963, :1000, :1022, :1754 y :1801.
14. **Menores:**
    - utmSource null se guarda '' (G2-25);
    - se pierde el segundo nombre (Namemiddle) (G2-08);
    - la existencia se revisa en dos fuentes, BP05 y BP05MA (G1-12);
    - storeId 'VIU' en mayúsculas da UEN 2 (G2-20).

**4.2 Bloqueado por otros equipos**

1. **Magento manda la cuenta C… de Intelisis** (G1-13, G2-24, G3-18). Hoy ningún cliente de casa tiene solicitud. Magento tiene que mandar el BP, o hay que definir quién traduce la cuenta.
2. **Liberador y aviso a Magento** (G1-22, G5-09 a G5-12). Antes de encenderlos hay que corregir en ServicioSAP:
   - la condición (OM:720);
   - el cliente que se manda (:726);
   - que queden dentro del try de líneas;
   - el await dentro de un lambda que no es async (:736, :746);
   - las llaves del payload (OM:1249-1255);
   - la aceptación de cualquier certificado.

   Del DMZ falta la URL de authorizationResult y el disparador que reemplace StartsWith("C") (PLAN §18.8).
3. **Catálogo AWS ORIGEN VALIDACION NUMERO CTE** sin dar de alta, y ZappOrig sin definir (G3-10).
4. **Base Android:** falta confirmar si es QA y si el usuario tiene permiso de INSERT directo (G2-01, G4-07).

## 5. Diferencias que vienen de decisiones tuyas (solo registro)

> **Nota 2026-09-29: la sección 0 reemplaza los conteos de esta sección.** La lista se conserva como estaba el 2026-09-24. Cambios desde entonces:
> - "Anchos sin Size" ya no aplica: los parámetros tienen el ancho del SP (Q1, G2-36) y MetodoEnvio se recorta a 12 (G2-27).
> - "Origen fijo 'PRODUCTOS MX'" se reemplazó por D7 (origen de Magento si viene).
> - "Fecha del servidor de aplicación" se reemplazó por D8 (GETDATE() en el servidor SQL, como el SP).
> - "Sexo desde Gender" se ajustó con D10: Gender vacío → '' como LAN, y 'NO ESPECIFICADO' se recorta a 'NO ESPECI' como el SP.
> - Las decisiones nuevas del 2026-09-28/29 (D1-D10) están en 0.4.

- **Anchos sin Size** (G2-36, G2-27, G2-12, G2-24, G3-09, G4-07, G4-28). **Es el de mayor riesgo:** los payloads reales traen MetodoEnvio de 17 caracteres y la bitácora del SP dice varchar(12) (SPD:51). Si el DDL lo confirma, falla todo alta real (PLAN §18.3).
- **Condición de pago inexistente se detiene** (G4-24, G2-22, G5-06). Quedan sin líneas ni SEGU00001, el cupón sin quemar, la cabecera ya escrita y la respuesta "Concluido". Sigue abierto si debe detenerse antes de la cabecera (PLAN §18.5 #7).
- **Solo la rama Insert:** sin Update, InsertReferencia ni DIMAS MX; CredICondicionArt deprecada (G2-02, G2-03, G4-38).
- **Origen fijo "PRODUCTOS MX"** (G2-04).
- **Base Android por conexión directa, sin linked server ni transacción** (G2-01, G4-07, G4-13).
- **Tablas de Intelisis en SIGMAVI:** condiciones (G4-21), cupones (G5-07, G5-08) y detalle ecommerce (G5-21 a G5-23).
- **Datos de SAP por OData:** maestro en BP05MA (G2-06, G2-07, G2-11, G2-14, G1-19), SD36 para pedido existente (G1-06, G5-01) y sucursal del agente (G5-08).
- **Teléfono validado con A_GET_TelefonoValidado; catálogo en AWS VALOR1; CteTelSet** (G3-10, G3-11). Son más modos de fallo por HTTP (G3-16).
- **Prospecto por ZtipoCliente** (G1-21, G3-15).
- **Sexo desde Gender** (G2-12). 'NO ESPECIFICADO' ya no se recorta y un Gender vacío da 'NO ESPECIFICADO'. Que 1 sea masculino y 2 femenino viene de MapGender, sin comprobar en BP reales.
- **Precio y Abono de SD29 por SKU; un dato mal configurado se procesa como viene** (G4-21, G4-22, G2-37).
- **checkSaldo no se replica** (G1-15 a G1-17, G2-35). Verificado: en LAN no cambiaba ningún resultado.
- **Fecha del servidor de aplicación** (G2-34).
- **Guía guardada antes de la rama**, arreglo #16 (G1-05).
- **Sin logs:** una línea sin precio no se inserta pero Orden avanza, igual que LAN (G4-10, G4-23).