---
tags: [serviciosap, reglas-de-negocio, ecommerce, fuente-unica]
fecha: 2026-10-01
estado: vigente
alcance: solo ServicioSAP (Controllers, Methods, Models, Helpers, nombres de llaves de Web.config y ServicioSap.csproj) en \\172.16.214.58\sap\ServicioSAP\ServicioSap\ServicioSap
---

# Business Rules Ecommerce — cómo funciona ServicioSAP

> [!important] Fuente única de verdad
> Este documento es la **fuente única de verdad** de cómo se comporta ServicioSAP: qué rutas expone, quién las llama, qué hace cada una paso a paso, con qué reglas de negocio, contra qué datos y con qué configuración.
> Los demás documentos de `MappingMetods` (análisis, comparativas LAN contra SAP, planes, actividades, capturas, manuales y bitácoras) son **análisis, historia o planes**: explican por qué se decidió algo o qué falta hacer, y cuando hablen de cómo funciona hoy el servicio deben remitir aquí.
> Si el código y este documento no coinciden, **manda el código** (la copia de trabajo de `\\172.16.214.58\sap\ServicioSAP\ServicioSap\ServicioSap`) y este documento se corrige **en el mismo cambio** en que se detectó la diferencia.

**ServicioSAP en pocas palabras.** Es una API web (ASP.NET Web API 2 sobre .NET Framework 4.7.2, `ServicioSap.csproj:17`) con 110 rutas en 20 controladores (`Controllers\*.cs`; tabla en [[#Mapa de rutas]]). El DMZ, el puente que usa Magento, le pide leer y escribir en SAP S/4HANA (servicios OData; `Helpers/TokenGenerator.cs:60-171`), en las bases SQL de MAVI: SIGMavi, ServicioAndroid y AdminDoc (`Helpers/ConexionDB/ConexionSQL.cs:9-195`), en una base SQLite local (`Helpers/ConexionDB/SQLiteDb.cs:9-271`) y en APIs de MAVI y de AWS (`Helpers/TokenGenerator.cs:92-111`). Todas las rutas piden un token JWT salvo `login/auth` (RTR-2 y RTR-16 en la sección 08). La regla que guía el crédito es la **paridad de valores con LAN**: se guarda lo mismo que guardaba el sistema anterior, tomando el dato de su equivalente en SAP (DU5; RTR-69).

## Índice

- [[#Cómo leer este documento]]
- [[#Cómo mantener este documento]]
- [[#Glosario]]
- [[#Mapa de rutas]]: las 110 rutas, con su controlador, su archivo:línea y la sección que las documenta.
- Secciones por área:
  1. [[#Órdenes (contado, devoluciones, cancelaciones, guías, recoger en sucursal, Openpay/PayPal)|01 · Órdenes de contado y posventa]] (12 rutas, 96 reglas): pedido de contado (`order/new`), devoluciones, cancelaciones, guías, recoger en sucursal, Openpay y PayPal.
  2. [[#Órdenes a crédito (rama omnipro_pago_credito de order/new)|02 · Órdenes a crédito]] (rama de crédito de la ruta 1 y bloque del liberador; 93 reglas): rama de crédito de `order/new` (solicitud de crédito web), `order/getCondicion` y el liberador apagado.
  3. [[#Crédito (CreditController SMS, plazos, documentos, montos, Credilana, etc.)|03 · Crédito (CreditController)]] (8 rutas, 77 reglas): NIP por SMS, plazos, condiciones de pago SD40, montos de Credilana y expediente documental.
  4. [[#Clientes y Business Partner (BP, direcciones, prospectos, mayoreo, cuentas)|04 · Clientes y Business Partner]] (29 rutas, 112 reglas): alta, cambio y consulta de BP, direcciones, listas de correos, prospectos, mayoreo, bonificaciones, sucursales y `login/auth`.
  5. [[#Atención a clientes (CustomerServiceController)|05 · Atención a clientes]] (6 rutas, 60 reglas): quejas, llave BBVA, validación del cliente, entrada al área de crédito e historial de créditos.
  6. [[#Productos, catálogo, imágenes, etiquetas y exportación a e-commerce|06 · Productos y catálogo]] (42 rutas, 132 reglas): maestro de artículos, existencias, catálogos de apoyo, exportación para Magento, cargas de catálogo, imágenes, SEO y etiquetas.
  7. [[#Ventas, monedero, abonos, SEPOMEX y listas de precios|07 · Ventas, monedero y abonos]] (13 rutas, 66 reglas): documentos de venta (SD36, PV02), MovBita, abonos y cobranza, monedero, SEPOMEX y listas de precios SD29.
  8. [[#Transversal autenticación, conexiones, configuración, logs, llamadas a SAP, compilación|08 · Transversal]] (mecanismo de `login/auth`, ruta 41, y todo lo común; 69 reglas): arranque, JWT, llamadas a S/4HANA y a otras APIs, SQL Server, SQLite, carpetas de red, correo, logs, configuración y compilación.
- [[#Pendientes globales]]: todos los "Pendientes conocidos" de las secciones, juntos.

## Cómo leer este documento

- **Una sección por área.** Cada sección empieza con un resumen, los términos que usa y una tabla de sus rutas. Después viene un bloque por ruta, con este orden: **Para qué sirve**, **Quién la llama**, **Entrada**, **Cómo funciona (paso a paso)**, **Reglas de negocio**, **Fuentes de datos**, **Salida y errores**, **Configuración usada** y **Pendientes conocidos**. Los bloques sin ruta (métodos de apoyo) y los bloques de referencia de la 08 usan una versión más corta. Cada sección cierra con sus "Reglas comunes del área".
- **Citas `archivo:línea`.** Las rutas de archivo son relativas a la carpeta del proyecto, `\\172.16.214.58\sap\ServicioSAP\ServicioSap\ServicioSap\`. Cada sección explica al inicio cómo abrevia los nombres (p. ej. `OrderMethods.cs` = `Methods\Order\OrderMethods.cs`). Una cita que empieza con `:` (p. ej. `:1805`) es del mismo archivo que la cita anterior. Los números de línea son los de la copia de trabajo del 2026-10-01.
- **Quién la llama.** Es informativo y sale del código del DMZ (`DMZ\WebApiMagento\`) o del tracker `MAVI - DMZ-SAP.csv`. Cuando se cita el tracker como "fila N" o "línea N", N es el número de línea del archivo (el encabezado es la línea 1). El tracker es informativo, no es tablero (GUIA §8.7).
- **Ids de regla.** Cada regla tiene un id `R<área>-<n>` (p. ej. `RCRE-11`). Los prefijos están en [[#Cómo mantener este documento]]. Los `RCOM-n` ("reglas comunes") existen por separado en las secciones 01, 02 y 07: se citan junto con su sección (p. ej. "RCOM-2 de la 07").
- **Ids que vienen de otros documentos.**

| Id | Qué es | Dónde está |
|---|---|---|
| `DU1`-`DU19` | Decisiones del usuario. No se vuelven a abrir | `CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md` §4 (DU1-DU10 en §4.1, DU11-DU19 en §4.5) |
| `ACT-nn` | Actividades pendientes, con responsable y criterio de terminado | `ACTIVIDADES_PENDIENTES_CREDITO_WEB_2026-10-01.md` |
| `P1`-`P20`, `T1a`-`T2d`, `R1`-`R4`, `V1`-`V4` | Preguntas, tareas y pruebas del plan de crédito | `CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md` §6 |
| `G1-nn`-`G5-nn` | Reglas de LAN del crédito web, por grupo | `CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md` §3 y `MATRIZ_REGLAS_CREDITO_WEB_LAN_VS_SAP.md` |
| `E1`-`E5` | Cambios de paridad del crédito ya aplicados | `CAMBIOS_PARIDAD_CREDITO_2026-09-29.md` y `CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md` §5.1 |
| `Q1`-`Q22` | Preguntas del plan del SP de crédito (p. ej. Q9, "NIP SMS igual que LAN") | `PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md` |
| `C01`-`C19` | Hallazgos de la auditoría LAN, DMZ y SAP | `AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md` |
| `E-nn`, `H-nn` | Partidas del checklist de lo que no es SAP ni Intelisis | `Checklists\CHECKLIST_DEV3_NOSAP_NOINTELISIS.md` |
| `R-nn` (con guion) | Riesgos de la guía de migración (p. ej. R-02, R-12) | `GUIA_MIGRACION_FABLE.md` |
| `PT-1`-`PT-14` | Pendientes transversales | Sección 08, "Pendientes transversales (resumen)" |

- **Documentos de contexto.** Se citan con su nombre corto. Todos están bajo `\\172.16.214.58\sap\.agents\skills\lan-sap-migration\`:

| Nombre corto | Ubicación |
|---|---|
| GUIA, `GUIA_MIGRACION_FABLE.md` | `MappingMetods\GUIA_MIGRACION_FABLE.md` |
| SKILL, `SKILL.md` | `SKILL.md` |
| Tracker, CSV, `MAVI - DMZ-SAP.csv` | `MappingMetods\MAVI - DMZ-SAP.csv` |
| `MIGRATION_STATUS_MASTER_v2.csv` | `MappingMetods\MIGRATION_STATUS_MASTER_v2.csv` |
| `CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md` | `MappingMetods\` |
| `CAMBIOS_PARIDAD_CREDITO_2026-09-29.md` | `MappingMetods\` |
| `ACTIVIDADES_PENDIENTES_CREDITO_WEB_2026-10-01.md` | `MappingMetods\` |
| `AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md` | `MappingMetods\` |
| `CAPTURAS_REALES_APIS.md`, `COMPARATIVA_SETORDER_LAN_VS_SAP.md` | `MappingMetods\` |
| SPEC_NIP_SMS | `MappingMetods\SPEC_NIP_SMS_SERVICIOSAP.md` |
| `Manual Tecnico Servicio SAP 01092026.md` | `MappingMetods\` |
| `Post_ObtenerCreditos_Mapping.md`, `Post_ValidarCliente_Mapping.md`, `LoginClienteCredito/03_BusinessMethod.md`, `LoginClienteCreditoFechaN/03_BusinessMethod.md` | `MappingMetods\CustomerServiceController\` |
| `CHECKLIST_DEV2_ROADMAP.md`, `CHECKLIST_DEV3_NOSAP_NOINTELISIS.md` | `Checklists\` |
| `master_migration_log.md` | `INTEGRACION JAVIER\` |
| `quick_build.ps1` | `MappingMetods\_IMPLEMENTACION_SP_CREDITO\build\` |
| Fichas OData (`RSG\sd09_devolucion.md`, `RSG\sd36_consultar_documentos.md`, `RSG\dm05_etiquetas.md`, etc.) | `RSG\` |

## Cómo mantener este documento

1. **Mismo cambio, mismo PR.** Todo cambio de código en ServicioSAP actualiza, en el mismo PR (o en la misma entrega, si no hay PR), el bloque de la ruta que toca: pasos, reglas, fuentes de datos, salida y errores, configuración, pendientes y las citas `archivo:línea` que se hayan movido. Un PR que cambia comportamiento sin tocar este documento no está terminado.
2. **Ruta nueva o borrada.** Una ruta nueva lleva su bloque, con las nueve partes, en la sección de su área, más su fila en [[#Mapa de rutas]] y los conteos del [[#Índice]]. Si se borra una ruta, se quitan su bloque y su fila, y sus ids de regla no se reutilizan.
3. **Los ids de regla nunca se reutilizan ni se renumeran.** Una regla nueva toma el siguiente número libre de su prefijo (tabla de abajo). Si una regla deja de existir, su línea se queda con el id y la marca *retirada (fecha)*, para que las referencias viejas no apunten a otra regla. Los `RCOM-n` de las secciones 01, 02 y 07 siguen cada uno la numeración de su sección.
4. **Toda afirmación lleva `archivo:línea`.** Si algo se sabe por un documento o una captura y no por el código, se dice y se cita esa fuente.
5. **Nunca secretos ni datos personales.** De Web.config solo se escriben los nombres de las llaves, nunca sus valores. Tampoco se escriben contraseñas, tokens, URLs con credenciales ni datos reales de clientes; los ejemplos usan datos inventados. Los valores de ambiente de Dev (Web.config y `Conexion.dll`) son correctos y no se marcan como riesgo (DU1).
6. **Pendientes.** El campo "Pendientes conocidos" de cada bloque es la copia maestra. [[#Pendientes globales]] los reúne por sección. Cuando un pendiente se abre o se cierra, se cambia en los dos lugares en el mismo cambio.
7. **Decisiones nuevas.** Una decisión nueva del usuario se registra en `CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md` §4.5 (DU20 en adelante), y aquí se cita su id en la regla que cambia.
8. **Formato del archivo.** UTF-8 sin BOM y fin de línea CRLF.

**Prefijos de reglas en uso** (705 reglas en total; el conteo de cada sección está en el [[#Índice]])

| Prefijo | Sección | Dónde se define (primer bloque) | Reglas | Siguiente id libre |
|---|---|---|---|---|
| `RORD` | 01 | `POST order/new` | 38 | `RORD-39` |
| `RTST` | 01 | `POST order/testnew` | 2 | `RTST-3` |
| `RDEV` | 01 | `POST order/setreturn` | 8 | `RDEV-9` |
| `RCUP` | 01 | `GET order/validatecupon/{codigo}` | 5 | `RCUP-6` |
| `RDOC` | 01 | `GET order/checkDocument/{purchNoC}` | 2 | `RDOC-3` |
| `RCAN` | 01 | `POST order/cancelOrder` | 9 | `RCAN-10` |
| `RFAC` | 01 | `POST order/cancelInvoice` | 3 | `RFAC-4` |
| `RGUI` | 01 | `POST order/getGuide` | 3 | `RGUI-4` |
| `RRSN` | 01 | `GET order/generateNewStorepickupCode/{idEcommerce}` | 6 | `RRSN-7` |
| `RRSC` | 01 | `GET order/createStorepickupCode/{idEcommerce}/{idOrder}` | 5 | `RRSC-6` |
| `RRSL` | 01 | `POST order/GetPickUpCode` | 2 | `RRSL-3` |
| `RCON` | 01 | `GET order/getCondicion/{storeId}/{condicionMagento}` | 4 | `RCON-5` |
| `RCOM` | 01 (también en 02, 07) | `Reglas comunes del área` | 9 | `RCOM-10` |
| `RCRE` | 02 | `POST order/new — rama de crédito` | 72 | `RCRE-73` |
| `RCND` | 02 | `GET order/getCondicion/{storeId}/{condicionMagento}` | 5 | `RCND-6` |
| `RLIB` | 02 | `(sin ruta) Liberador de crédito y aviso a Magento` | 9 | `RLIB-10` |
| `RCOM` | 02 (también en 01, 07) | `Reglas comunes del área` | 7 | `RCOM-8` |
| `RCR` | 03 | `POST /credit/SendSmsNewNumber` y 8 bloques más | 77 | `RCR-78` |
| `RBP` | 04 | `GET /partner/client/{clientId}` y 10 bloques más | 49 | `RBP-50` |
| `RDIR` | 04 | `GET /partneraddress/partner/{bpId}` y 5 bloques más | 12 | `RDIR-13` |
| `RCLI` | 04 | `POST /customer/setCustomerList` y 5 bloques más | 20 | `RCLI-21` |
| `RPRO` | 04 | `POST /prospecto/recuperarcuenta` | 7 | `RPRO-8` |
| `RMAY` | 04 | `POST /company/wholesale-customer` | 3 | `RMAY-4` |
| `RCTA` | 04 | `POST /account/bonus/async` y 1 bloque más | 6 | `RCTA-7` |
| `RLOG` | 04 | `POST /login/auth` | 4 | `RLOG-5` |
| `RBPC` | 04 | `Reglas comunes del área` | 11 | `RBPC-12` |
| `RCS` | 05 | `POST /customerService/obtenerQuejas` y 6 bloques más | 60 | `RCS-61` |
| `RPR` | 06 | `GET /product/exportaart/{store}` y 42 bloques más | 132 | `RPR-133` |
| `RVTA` | 07 | `POST /sale/transaction` y 3 bloques más | 10 | `RVTA-11` |
| `RMOV` | 07 | `GET /movbita/events/{vbeln}` | 3 | `RMOV-4` |
| `RABO` | 07 | `POST /credit/GetAccountDebts` y 5 bloques más | 12 | `RABO-13` |
| `RMON` | 07 | `POST /customer/wallet/details` y 1 bloque más | 18 | `RMON-19` |
| `RSEP` | 07 | `GET /sepomex/validarcp` | 3 | `RSEP-4` |
| `RPRE` | 07 | `Apoyo: listas de precios SD29 (FinalListProperMethods, sin ruta propia)` | 5 | `RPRE-6` |
| `RUTL` | 07 | `Apoyo: utilidades (StoreGlobalMethods y RequestMethods, sin ruta propia)` | 6 | `RUTL-7` |
| `RCOM` | 07 (también en 01, 02) | `Reglas comunes del área` | 9 | `RCOM-10` |
| `RTR` | 08 | `Arranque del servicio y canal de cada petición` y 14 bloques más | 69 | `RTR-70` |

---

## Glosario

Términos que se repiten en todo el documento. Cada sección tiene además sus "Términos usados" con el detalle que necesita.

| Término | Qué significa | Dónde se ve |
|---|---|---|
| ACEF, 12IA, 12DA | Condiciones de precio de la lista SD29: contado Muebles América, crédito 12 meses inmediato y crédito 12 meses diferido | `EcommerceMethods.cs:24-26` (06) |
| AdminDoc (`ADMINDOC`) | Base SQL del expediente digital del cliente (tabla `MAVI_DOC_CTE`). Se abre con la cadena `ADMINDOC` del Web.config | `Helpers/ConexionDB/ConexionSQL.cs:140-142` (08); DU1 |
| API businesspartner (`URL_BP_API`) | API de MAVI, fuera de S/4HANA, para el teléfono validado del cliente (`A_GET_TelefonoValidado`) y para habilitar un BP en otra área de ventas (`AC_POST_HabilitaCombinacionBP`) | `SolicitudCreditoWebMethods.cs:492-495` (03); `BusinessPartnerMethods.cs:210` (04) |
| API de configuraciones (`URL_CONFIGURACIONES_API`) | API de MAVI de familias y líneas: `AS_GET_FamiliaLineaFilter?Class=`, donde `Class` es el código de familia o línea y `Kschl` su descripción | `ProductMethods.cs:368-378` (06) |
| Área de ventas | Combinación de organización de ventas (`Vkorg`: 04 Muebles América, 05 VIU), canal de distribución (`Vtweg`: 01 contado, 02 crédito) y sector (`Spart`, siempre 00) | `BusinessPartnerMethods.cs:437-444`, `:200` (04); `OrderMethods.cs:2187-2189` (01) |
| Autenticación Basic | Forma en que ServicioSAP entra a S/4HANA: el usuario y la contraseña de servicio que da `Conexion.dll`, codificados en Base64 en la cabecera `Authorization: Basic`. Las APIs que no son S/4HANA usan otro cliente HTTP | `Helpers/TokenGenerator.cs:60-82`, `:113-133`, `:108` (08) |
| AWS, catálogos de configuración (`AwsBaseUrl`) | Catálogos configurables de MAVI que sustituyen tablas legadas (p. ej. `ORIGEN VALIDACION NUMERO CTE`, mínimo para redimir monedero). Se piden a `AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=…` | `ProductMethods.cs:711` (02); `WalletMethods.cs:76-79` (07) |
| BP (Business Partner) | El cliente en SAP. Su número es la "cuenta". Magento manda siempre el BP numérico y ServicioSAP no traduce cuentas que empiezan con "C" | DU2; RBPC-9 (04); `OrderMethods.cs:642-647` (02) |
| BP01 / BP02 | Servicio OData `ZAPI_BP01_PARTNER_SRV`, entidad `BPartnerSet`: alta (POST con `Partner` vacío) y cambio de un BP | `BusinessPartnerMethods.cs:74-156` (01, 04) |
| BP05 | Vista CDS `ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE`: los datos del cliente en una fila plana | `BusinessPartnerMethods.cs:27-69` (01, 04) |
| BP05MA | Servicio OData `ZAPI_BP05MA_SRV`, entidad `BusinessPartnerSet`: la ficha ampliada del cliente con 12 navegaciones (teléfonos, domicilios, datos comerciales, tabla Z `Cte`…) | `BusinessPartnerMethods.cs:297-302` (04) |
| Canal de distribución | 01 contado, 02 crédito. En `order/new` es 02 solo para crédito | `OrderMethods.cs:2187-2189` (01) |
| CDS (vista) | Vista de datos de S/4HANA (*Core Data Services*) publicada como servicio OData; su nombre termina en `_CDS` (p. ej. BP05 y SD36) | `BusinessPartnerMethods.cs:30` (04); `SalesMethods.cs:132-166` (07) |
| Condición de pago | Código SAP de 4 caracteres (`Zterm`, p. ej. `12DA`) con sus días de gracia. El texto de Magento (p. ej. `12 M MA P INM`) se traduce en SIGMavi (`CondicionesCredVtaLinea`), con un catálogo en código como respaldo | `OrderMethods.cs:3320-3338` (01); `Helpers/PaymentConditionCatalog.cs:122` (08) |
| `Conexion.dll` | Biblioteca interna de MAVI que entrega la URL base de S/4HANA, el usuario de servicio y la conexión a SIGMavi (`obtenerConexionSigMaviAsync`) | `ServicioSap.csproj:48-50`; `Helpers/TokenGenerator.cs:60-82` (08); DU19 |
| Credilana | Producto de crédito de MAVI. ServicioSAP solo da su tabla de montos y pagos, guardada en SQLite (`mavi_credilana_info`) | `Methods/Credit/CredilanaMethods.cs:17` (08); `credit/GetCreditAmounts` (03) |
| CSRF (token) | Ficha de un solo uso que SAP Gateway exige antes de escribir (POST, PATCH, DELETE). Se pide con un GET con la cabecera `X-CSRF-Token: fetch` | `TokenGenerator.cs:135-171` (01, 08) |
| CteTelSet | Teléfonos del cliente en SAP (servicio `ZQBP_EDITARCLIENTE_SRV`). Da el origen de la validación del teléfono (`ZappOrig`) | `SolicitudCreditoWebMethods.cs:413-415` (02) |
| DIM11 | Servicio `ZCDS_DIM11_EXISTENCIA_CDS`: existencias por material, centro y almacén | `ProductMethods.cs:206-244` (01, 06) |
| DM01, DM02, DM03, DM05, DM07 | Servicios OData de artículos (`ZAPI_ARTICULOS_SRV`), jerarquía, relacionados (cross-sell, up-sell, sustitutos), etiquetas (`ZAPI_ZMMT_ETIQUETA_SRV`) y sucursales (`ZAPI_SUCURSALES_SRV`) | `ProductMethods.cs:38` (06); `AccountMethods.cs:189-198` (04) |
| DMZ | El puente (`DMZ\WebApiMagento\`) entre Magento y ServicioSAP. Pide un token a `login/auth` y llama las rutas. ServicioSAP también le pide cosas a Magento a través del DMZ | DMZ `WebApiMagento/Helper/Curl.cs:80`; `Helpers/ConexionDMZ/Curl.cs:71`, `:111` (08) |
| DU (decisión del usuario) | Decisión ya tomada por el usuario (DU1-DU19); no se vuelve a abrir | `CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md` §4 |
| EX01 | Servicio `ZAPI_EX01_NOCOMP_SRV`: documentos contables no compensados del cliente (lo que debe) | `AbonoMethods.cs:22` (07) |
| Folio, `idSolicitud` | Número que la base asigna a la cabecera de la solicitud de crédito (`SCOPE_IDENTITY()`) | `SolicitudCreditoWebMethods.cs:35-157` (02) |
| Guía | Nombre que va en la guía de envío del pedido; se guarda en SQLite | `OrderMethods.cs:533-579` (01) |
| `incrementId` | Número del pedido en Magento. Forma el folio del pedido en SAP (`PurchNoC`) | `OrderMethods.cs:1738-1739` (01) |
| Intelisis | El sistema anterior (ERP) de MAVI. Sus tablas se sustituyen por SIGMavi, por SAP o por catálogos de AWS | 02 "Términos"; DU9 |
| JWT | Token firmado que entrega `login/auth`; las demás rutas lo piden en `Authorization: Bearer` | `Helpers/TokenGenerator.cs:31-57`; `Helpers/TokenValidationHandler.cs:18-90` (08) |
| LAN | El sistema anterior que ServicioSAP reemplaza. El crédito guarda los mismos valores que guardaba LAN (paridad) | DU5; RTR-69 (08) |
| Liberador | Servicio externo que pone una solicitud de crédito en análisis y cuyo resultado se avisa a Magento. El código existe pero está apagado: nadie lo llama | `LiberadorCreditoMethods.cs:48-107`; `OrderMethods.cs:677-711` (02); DU11 |
| Magento, MA, VIU | Magento es la tienda en línea. MA es Muebles América (organización 04, UEN 1) y VIU es la otra tienda (organización 05, UEN 2) | `OrderMethods.cs:340-351` (01) |
| Mandante (`sap-client`) | Número de "cliente" dentro del sistema SAP; el código fija 110 en casi todas las URLs (valor de Dev, no es bloqueo) | RBPC-4 (04); PT-2 (08); DU1 |
| Marst, Gender (`MapGender`) | Estado civil y sexo del BP. `Marst`: 1 Soltero, 2 Casado, 3 Viudo, 4 Divorciado, 5 Separado, 6 Pareja de hecho; las dos altas de BP mandan 1 porque SAP lo exige y la web no lo captura (DU18). `Gender`: 1 masculino, 2 femenino, 3 otro, calculado con `MapGender`. La solicitud de crédito guarda el texto de cada código | `BusinessPartnerMethods.cs:482`, `:486`, `:777-798`; `OrderMethods.cs:2655`, `:2659` (04); `SolicitudCreditoWebMethods.cs:563-597` (02) |
| `MAVICBOSANDROID` | Cadena de conexión del Web.config a la base ServicioAndroid | `Web.config:13`; `ConexionSQL.cs:100-129` (02) |
| Monedero electrónico | Saldo a favor del cliente. Se lee del contrato de condiciones de SAP (SD18, `ZAPI_CONDITIONCONTRACT_SRV`) | `WalletCustomerMethods.cs:62-65` (07) |
| MovBita | Bitácora de eventos de un documento de venta (tabla Z `ZSDT_MOVBITA`), leída por `URL_SALES_DISTRIBUTION_API` | `MovBitaMethods.cs:23` (07) |
| Neko | Flujo de pago con referencia bancaria. Sus dos rutas son stubs que responden éxito sin hacer nada | `AbonoMethods.cs:95-99` (07) |
| NIP, código SMS | Los 6 dígitos que recibe el cliente para confirmar su teléfono en el checkout de crédito. ServicioSAP solo los deja en la cola `TcAAEA00030_EnvioMensajes` | `CreditMethods.cs:140-150`, `:361-377` (03) |
| OData | Protocolo REST con que SAP publica sus datos. Las listas llegan en `d.results` (V2) o en `value` (V4); un *entity set* es una colección de registros | 07 "Términos"; 08 "Términos" |
| OData, opciones de consulta | Parámetros que se agregan a la URL OData: `$filter` (condición, p. ej. `Articulo eq '…'`), `$expand` (trae las navegaciones relacionadas), `$top` (máximo de filas) y `$format=json`. Los valores de texto van entre apóstrofos | `BusinessPartnerMethods.cs:30`, `:299-302` (04); `FinalListProperMethods.cs:87-104` (07) |
| `omnipro_pago_credito` | Método de pago de Magento para comprar a crédito. Con ese valor exacto, `order/new` no crea pedido en SAP: registra una solicitud de crédito web | `OrderMethods.cs:44`, `:1774-1797` (02) |
| Openpay | Pasarela de pago: `openpay_cards` (tarjeta, se guarda para validación y no va a SAP) y `openpay_stores` (pago en tienda, sí va a SAP) | `OrderMethods.cs:1752-1769` (01) |
| Organización de ventas | 04 Muebles América, 05 VIU, 04 por omisión | `OrderMethods.cs:340-351` (01) |
| Prospecto | BP que aún no es cliente: `To_Cte.ZtipoCliente` = `Prospecto`. Para un prospecto, `ValidacionTelefono` siempre vale 0 | `SolicitudCreditoWebMethods.cs:534-548` (02, 03) |
| `PurchNoC` | Folio con que ServicioSAP encuentra un pedido de e-commerce en SAP: `ZSD_{clase de documento}_{incrementId}` | `OrderMethods.cs:2279`, `:1738-1739` (01) |
| PV02 | Transacción de venta tipo POS (`BAPITRANSACTION`) | `SalesMethods.cs:19-22` (07) |
| RFC, CURP | RFC: clave fiscal mexicana; en el BP es `Stcd1`. El alta de la tienda manda siempre el RFC genérico de público en general `XAXX010101000` y el alta desde una orden lo usa cuando no llega RFC. CURP: clave de identidad de la persona; la solicitud de crédito la deja NULL | `BusinessPartnerMethods.cs:516`; `OrderMethods.cs:2688` (01, 04); `SolicitudCreditoWebMethods.cs:243`, `:303` (02) |
| S/4HANA | El ERP de SAP donde viven clientes (BP), pedidos, precios y existencias. ServicioSAP lo llama por OData con la URL y el usuario de servicio que entrega `Conexion.dll` (ambiente Dev, DU1) | `Helpers/TokenGenerator.cs:60-82`, `:113-133`; p. ej. `FinalListProperMethods.cs:102` (08) |
| SD01, SD09 | Crear pedido de venta y crear devolución, ambos con `ZAPI_SALESORDER_SRV` (entidad `A_SALES_ORDERSet`) | `OrderMethods.cs:1841`, `:1663-1685` (01) |
| SD18 | Contrato de condiciones; de ahí sale el monedero | `WalletCustomerMethods.cs:62-65` (07) |
| SD29 | Servicio `ZAPI_PROPRELIST_SRV/PropreListSet`: lista de precios finales. Las filas de un SKU se distinguen por `OrgVtas` y `Condicion`; también trae el abono del crédito | `FinalListProperMethods.cs:82-92`, `:99-129` (01, 07) |
| SD33 | Campañas de bonificación (`ZAPI_CAMPANA_BONIFICACION_SRV`) | `AccountMethods.cs:32`, `:44-52` (04) |
| SD36 | Servicio `ZAPI_DOCVTAS_CHECK_CDS`: consulta de documentos de venta. Sirve para no duplicar pedidos | `SalesMethods.cs:132-166` (01, 07) |
| SD40 | Catálogo de condiciones de pago (OData V4, llave `ZAPI_CONDPAGO`) | `CreditMethods.cs:472` (03) |
| SD46, SD48 | Anular la salida de mercancía y anular la factura (cancelación de un pedido surtido) | `OrderMethods.cs:3031-3056` (01) |
| SD52 | Áreas de ventas en que está dado de alta un cliente (`ZAPI_SD52_PARTNER_SRV`) | `BusinessPartnerMethods.cs:384-392` (04) |
| SEGU00001 | Artículo que representa el costo de envío dentro de la solicitud de crédito | `OrderMethods.cs:1778-1784`, `:887-892` (02) |
| SEO | Textos del artículo para buscadores web (nombre largo, meta palabras y meta descripciones 1 a 3, descripciones largas de VIU y MAVI), guardados en SAP en `Z_SRVB_MM_ART/ArticuloDetalles` | `ProductMethods.cs:1185-1187`; `Models/SAP/SEO/ArticuloSEO.cs:5-38` (06) |
| SEPOMEX | Catálogo de códigos postales del Servicio Postal Mexicano, leído por `URL_SALES_DISTRIBUTION_API` | `SepomexMethods.cs:31-36` (07) |
| ServicioAndroid | Base SQL de MAVI (cadena `MAVICBOSANDROID`) donde ServicioSAP escribe la solicitud de crédito web, deja la cola de SMS y lee el catálogo de quejas | `ConexionSQL.cs:100-129` (02); `CustomerServiceMethods.cs:29-32` (05) |
| SIGMavi | Base SQL Server de apoyo que sustituye tablas de Intelisis (p. ej. `VentasCupones`, `CondicionesCredVtaLinea`, listas de correos). Su conexión sale de `Conexion.dll`, no del Web.config | `ConexionSQL.cs:72-98`; DU19, DU9 |
| SIP (tablas `SIP…`) | Tablas de SIGMavi que deciden qué artículos puede publicar el e-commerce: `SIPProductos` (estado de propiedades y foto de cada artículo, y si es exclusivo de SELP) y `SIPExcluirProductos` (exclusiones por código, marca o prefijo del SKU) | `ProductMethods.cs:425-438`, `:518-542` (06) |
| Solicitud de crédito web | Lo que crea una compra a crédito en lugar de un pedido SAP: una cabecera en `CRED_SOLICITUD_WEB_DATOS_TEMP` y una línea por artículo en `VTASdArtCreditoWeb` (base ServicioAndroid) | `OrderMethods.cs:1774-1797`, `:842-869` (02) |
| SP (procedimiento almacenado) | Programa guardado dentro de SQL Server. El crédito de LAN escribía con los SP `SP_CREDITO_WEB_DATOS` y `SpVTASInsertArtSolCreditoLinea`; ServicioSAP logra el mismo efecto con INSERT directos. El único SP que ServicioSAP ejecuta es `SpListaNBMagento` (listas negra y blanca de correos, en SIGMavi) | `SolicitudCreditoWebMethods.cs:35-157`; `OrderMethods.cs:856-858` (02); `CustomerMethods.cs:26-28` (04) |
| SQLite (`data.db`) | Base local de archivo del servidor: guías, pedidos Openpay, cargas del catálogo de Magento y montos de Credilana | `SQLiteDb.cs:11-21` (01, 08) |
| STP, CLABE | CLABE es la clave bancaria de 18 dígitos; STP es el sistema de transferencias con que el cliente paga por transferencia | `ClabeSTPResponse.cs:18-33` (07) |
| SuccessFactors | Sistema de recursos humanos; ServicioSAP lo consulta por la API Android (`URL_ANDROID_API`) | `BusinessPartnerMethods.cs:342-374` (01, 04) |
| TZ01 | Parcialidades de una factura de mercancía (tabla `ZME_SPLITS`, OData V4) | `AbonoMethods.cs:53-54`, `:64` (07) |
| UEN | Unidad de negocio: 1 Muebles América, 2 VIU | `OrderMethods.cs:744`; `EcommerceMethods.cs:27` (07) |
| Web.config | Configuración del sitio. En este documento solo se nombran sus llaves, nunca sus valores | 08 "Configuración" |
| `ZidMagento` | Id de la cuenta de Magento guardado en el BP (servicio `ZSDT_CTE_ODATA_SRV`) | `BusinessPartnerMethods.cs:842`, `:845-846` (04) |
| ZMER | Clase de documento del pedido de mercancía; es la clase por omisión de `order/new` | `OrderMethods.cs:2173-2175` (01) |

---

## Mapa de rutas

Tabla maestra de rutas, traída de la sección 08 sin cambios. Al ensamblar (2026-10-01) se contaron 110 atributos `[Route(...)]` activos en los 20 archivos de `Controllers\`, el mismo total de la tabla. Por verbo: GET 49, POST 55, PATCH 5, DELETE 1.

Ir a cada sección: [[#Órdenes (contado, devoluciones, cancelaciones, guías, recoger en sucursal, Openpay/PayPal)|01 Órdenes de contado y posventa]] · [[#Órdenes a crédito (rama omnipro_pago_credito de order/new)|02 Órdenes a crédito]] · [[#Crédito (CreditController SMS, plazos, documentos, montos, Credilana, etc.)|03 Crédito (CreditController)]] · [[#Clientes y Business Partner (BP, direcciones, prospectos, mayoreo, cuentas)|04 Clientes y Business Partner]] · [[#Atención a clientes (CustomerServiceController)|05 Atención a clientes]] · [[#Productos, catálogo, imágenes, etiquetas y exportación a e-commerce|06 Productos y catálogo]] · [[#Ventas, monedero, abonos, SEPOMEX y listas de precios|07 Ventas, monedero y abonos]] · [[#Transversal autenticación, conexiones, configuración, logs, llamadas a SAP, compilación|08 Transversal]].

Las 110 rutas que declaran los 20 controladores, con la sección de este documento que documenta cada una. Secciones: **01** Órdenes (contado, devoluciones, cancelaciones, guías, recoger en sucursal, Openpay/PayPal) · **02** Órdenes a crédito (rama omnipro_pago_credito de order/new) · **03** Crédito (CreditController) · **04** Clientes y Business Partner · **05** Atención a clientes (CustomerServiceController) · **06** Productos, catálogo, imágenes, etiquetas y exportación a e-commerce · **07** Ventas, monedero, abonos, SEPOMEX y listas de precios · **08** Transversal.

La columna del DMZ sale del CSV de seguimiento (`MAVI - DMZ-SAP.csv`, filas con "Conectado = Si"); es informativa y no se verificó contra el código del DMZ, salvo `login/auth`. En seis filas del CSV la columna de ServicioSAP sigue en "To Do" (`credit/guardardocumento`, `credit/SaveImagesProductosMx`, `customer/cashCustomerReport`, `customerService/obtenerCreditos`, `customerService/obtenerQuejas`, `customerService/bbvaKeyAdvanced`); ahí la ruta del DMZ se asoció por nombre. Todas las rutas exigen JWT salvo `login/auth` (RTR-16). Las rutas de `AbonosController` comparten el prefijo `credit/` con `CreditController` (`Controllers/AbonosController.cs:8`, `Controllers/CreditController.cs:10`), pero se documentan en la 07.

| # | Verbo | Ruta | Controller.Método | Archivo:línea | Sección que la documenta | Ruta DMZ conectada según el CSV (informativo) |
|---|---|---|---|---|---|---|
| 1 | POST | `order/new` | OrderController.SetOrder | Controllers/OrderController.cs:18 | 01 Órdenes; rama de crédito en 02 Órdenes a crédito | `order/setOrder` |
| 2 | POST | `order/testnew` | OrderController.TestSetOrder | Controllers/OrderController.cs:54 | 01 Órdenes | — |
| 3 | POST | `order/setreturn` | OrderController.SetReturn | Controllers/OrderController.cs:74 | 01 Órdenes | `order/returnOrder` |
| 4 | GET | `order/validatecupon/{codigo}` | OrderController.ValidateCupon | Controllers/OrderController.cs:104 | 01 Órdenes | — |
| 5 | GET | `order/checkDocument/{purchNoC}` | OrderController.CheckDocumentExistsSD36 | Controllers/OrderController.cs:124 | 01 Órdenes | — |
| 6 | POST | `order/cancelOrder` | OrderController.CancelOrder | Controllers/OrderController.cs:145 | 01 Órdenes | `order/cancelOrder` |
| 7 | POST | `order/cancelInvoice` | OrderController.CancelInvoice | Controllers/OrderController.cs:178 | 01 Órdenes | — |
| 8 | POST | `order/getGuide` | OrderController.GetGuideWithName | Controllers/OrderController.cs:217 | 01 Órdenes | `order/getGuide` |
| 9 | GET | `order/generateNewStorepickupCode/{idEcommerce}` | OrderController.GenerateNewStorepickupCode | Controllers/OrderController.cs:242 | 01 Órdenes | `order/generateNewStorepickupCode/{idE}` (el CSV anota POST en ServicioSAP) |
| 10 | GET | `order/createStorepickupCode/{idEcommerce}/{idOrder}` | OrderController.CreateStorepickupCode | Controllers/OrderController.cs:262 | 01 Órdenes | `order/createStorepickupCode/{idE}/{idO}` (el CSV anota POST en ServicioSAP) |
| 11 | POST | `order/GetPickUpCode` | OrderController.GetPickUpCode | Controllers/OrderController.cs:284 | 01 Órdenes | — |
| 12 | GET | `order/getCondicion/{storeId}/{condicionMagento}` | OrderController.GetCondicion | Controllers/OrderController.cs:311 | 01 Órdenes | — |
| 13 | POST | `credit/SendSmsNewNumber` | CreditController.SendSmsNewNumber | Controllers/CreditController.cs:18 | 03 Crédito | `credit/SendSmsNewNumber` |
| 14 | POST | `credit/getSms` | CreditController.GetSms | Controllers/CreditController.cs:31 | 03 Crédito | — |
| 15 | POST | `credit/validateSms` | CreditController.ValidateSms | Controllers/CreditController.cs:54 | 03 Crédito | — |
| 16 | GET | `credit/getPlazos` | CreditController.GetPlazos | Controllers/CreditController.cs:75 | 03 Crédito | `credit/getPlazos` |
| 17 | POST | `credit/GetCreditAmounts` | CreditController.GetCreditAmounts | Controllers/CreditController.cs:100 | 03 Crédito | `credit/GetCreditAmounts` |
| 18 | POST | `credit/guardardocumento` | CreditController.GuardarDocumento | Controllers/CreditController.cs:141 | 03 Crédito | `credit/guardardocumento` |
| 19 | POST | `credit/SaveImagesProductosMx` | CreditController.SaveImagesProductosMx | Controllers/CreditController.cs:166 | 03 Crédito | `credit/SaveImagesProductosMx` |
| 20 | GET | `credit/condicionespago` | CreditController.GetCondicionesPago | Controllers/CreditController.cs:181 | 03 Crédito | — |
| 21 | POST | `account/bonus/async` | AccountController.GetBonusAsync | Controllers/AccountController.cs:15 | 04 Clientes y BP | — |
| 22 | POST | `account/bonus` | AccountController.GetBonus | Controllers/AccountController.cs:31 | 04 Clientes y BP | — |
| 23 | GET | `account/sucursal/{id}` | AccountController.GetSucursal | Controllers/AccountController.cs:47 | 04 Clientes y BP | — |
| 24 | GET | `partner/client/{clientId}` | BusinessPartnerController.GetClient | Controllers/BusinessPartnerController.cs:20 | 04 Clientes y BP | — |
| 25 | POST | `partner/client` | BusinessPartnerController.CreateClient | Controllers/BusinessPartnerController.cs:36 | 04 Clientes y BP | `customer/setCustomer` |
| 26 | PATCH | `partner/client` | BusinessPartnerController.UpdateClient | Controllers/BusinessPartnerController.cs:70 | 04 Clientes y BP | — |
| 27 | PATCH | `partner/client/unircuenta` | BusinessPartnerController.UnirCuenta | Controllers/BusinessPartnerController.cs:91 | 04 Clientes y BP | `customerService/unirCuenta` |
| 28 | POST | `partner/enablechanelorg` | BusinessPartnerController.EnableChannelOrg | Controllers/BusinessPartnerController.cs:112 | 04 Clientes y BP | — |
| 29 | POST | `partner/testnew` | BusinessPartnerController.TestCreateClient | Controllers/BusinessPartnerController.cs:133 | 04 Clientes y BP | — |
| 30 | GET | `partner/client/filter/{sapFilter}` | BusinessPartnerController.GetFilterClients | Controllers/BusinessPartnerController.cs:150 | 04 Clientes y BP | `customerService/validarCliente` |
| 31 | GET | `partner/client/ma/{clientId}` | BusinessPartnerController.GetClientMa | Controllers/BusinessPartnerController.cs:166 | 04 Clientes y BP | — |
| 32 | GET | `partner/successfactor/employee/{userId}` | BusinessPartnerController.GetSuccessFactorEmployee | Controllers/BusinessPartnerController.cs:182 | 04 Clientes y BP | — |
| 33 | GET | `partner/ventadist/client/{clientId}` | BusinessPartnerController.GetCustomerSalesChannels | Controllers/BusinessPartnerController.cs:198 | 04 Clientes y BP | — |
| 34 | GET | `partner/ConsultaAnexos/{valorAnexo}` | BusinessPartnerController.GetConsultaAnexos | Controllers/BusinessPartnerController.cs:213 | 04 Clientes y BP | — |
| 35 | POST | `customer/setCustomerList` | CustomersController.SetCustomerEmailage | Controllers/CustomersController.cs:17 | 04 Clientes y BP | `customer/setCustomerList` |
| 36 | POST | `customer/getCustomerList` | CustomersController.GetCustomerEmailage | Controllers/CustomersController.cs:59 | 04 Clientes y BP | `customer/getCustomerList` |
| 37 | POST | `customer/deleteCustomerList` | CustomersController.DeleteCustomerEmailage | Controllers/CustomersController.cs:81 | 04 Clientes y BP | `customer/deleteCustomerList` |
| 38 | POST | `customer/getCuenta` | CustomersController.GetCuenta | Controllers/CustomersController.cs:94 | 04 Clientes y BP | — |
| 39 | POST | `customer/setCuenta` | CustomersController.SetCuenta | Controllers/CustomersController.cs:104 | 04 Clientes y BP | — |
| 40 | POST | `customer/cashCustomerReport` | CustomersController.CreateCashReport | Controllers/CustomersController.cs:114 | 04 Clientes y BP | `customer/cashCustomerReport` |
| 41 | POST | `login/auth` | LoginController.Authenticate | Controllers/LoginController.cs:21 | 04 Clientes y BP; mecanismo JWT en 08 Transversal | Constructor del `Curl` del DMZ (DMZ `WebApiMagento/Helper/Curl.cs:80`); el CSV marca `login/authenticate` como Deprecado |
| 42 | GET | `partneraddress/partner/{bpId}` | PartnerAddressController.GetBusinessPartnerAddress | Controllers/PartnerAddressController.cs:22 | 04 Clientes y BP | — |
| 43 | POST | `partneraddress/partner/{bpId}` | PartnerAddressController.CreateBusinessPartnerAddress | Controllers/PartnerAddressController.cs:42 | 04 Clientes y BP | — |
| 44 | PATCH | `partneraddress/partner/{bpId}/address/{addressId}` | PartnerAddressController.UpdateBusinessPartnerAddress | Controllers/PartnerAddressController.cs:62 | 04 Clientes y BP | — |
| 45 | PATCH | `partneraddress/partner/phone` | PartnerAddressController.UpdateAddressPhoneNumber | Controllers/PartnerAddressController.cs:82 | 04 Clientes y BP | — |
| 46 | GET | `partneraddress/salesdoc/{sdDoc}/role/{partnRole}` | PartnerAddressController.GetSalesDocumentAddress | Controllers/PartnerAddressController.cs:102 | 04 Clientes y BP | — |
| 47 | POST | `partneraddress/salesdoc` | PartnerAddressController.ChangeSalesDocumentAddress | Controllers/PartnerAddressController.cs:122 | 04 Clientes y BP | — |
| 48 | POST | `prospecto/recuperarcuenta` | ProspectoController.RecuperarCuenta | Controllers/ProspectoController.cs:20 | 04 Clientes y BP | `prospecto/recuperarcuenta` |
| 49 | POST | `company/wholesale-customer` | WholesaleCustomerController.GetWholesaleCustomerAsync | Controllers/WholesaleCustomerController.cs:15 | 04 Clientes y BP | — (el CSV registra `GET company/wholesale-customer/{wholesaleAccount}`, que no coincide con esta ruta) |
| 50 | POST | `customerService/obtenerQuejas` | CustomerServiceController.obtenerQuejas | Controllers/CustomerServiceController.cs:21 | 05 Atención a clientes | `customerService/obtenerQuejas` |
| 51 | GET | `customerService/bbvaKeyAdvanced` | CustomerServiceController.GetBBVAKeyAdvanced | Controllers/CustomerServiceController.cs:32 | 05 Atención a clientes | `customerService/bbvaKeyAdvanced` |
| 52 | POST | `customerService/validarCliente` | CustomerServiceController.validarCliente | Controllers/CustomerServiceController.cs:48 | 05 Atención a clientes | — |
| 53 | POST | `customerService/LoginClienteCredito` | CustomerServiceController.LoginClienteCredito | Controllers/CustomerServiceController.cs:69 | 05 Atención a clientes | `customerService/LoginClienteCredito` (el CSV anota GET en ServicioSAP) |
| 54 | POST | `customerService/LoginClienteCreditoFechaN` | CustomerServiceController.LoginClienteCreditoFechaN | Controllers/CustomerServiceController.cs:90 | 05 Atención a clientes | `customerService/LoginClienteCreditoFechaN` (el CSV anota GET en ServicioSAP) |
| 55 | POST | `customerService/obtenerCreditos` | CustomerServiceController.ObtenerCreditos | Controllers/CustomerServiceController.cs:119 | 05 Atención a clientes | `customerService/obtenerCreditos` |
| 56 | POST | `catalog/cargaCompleta` | CatalogController.CargaCompleta | Controllers/CatalogController.cs:29 | 06 Productos y catálogo | — |
| 57 | POST | `catalog/deletePromociones` | CatalogController.DeletePromociones | Controllers/CatalogController.cs:56 | 06 Productos y catálogo | — |
| 58 | POST | `catalog/deleteReservations` | CatalogController.DeleteReservations | Controllers/CatalogController.cs:72 | 06 Productos y catálogo | — |
| 59 | POST | `catalog/attributes` | CatalogController.Attributes | Controllers/CatalogController.cs:88 | 06 Productos y catálogo | — |
| 60 | POST | `catalog/generalAttributes` | CatalogController.GeneralAttributes | Controllers/CatalogController.cs:104 | 06 Productos y catálogo | — |
| 61 | POST | `catalog/attributeSets` | CatalogController.AttributeSets | Controllers/CatalogController.cs:120 | 06 Productos y catálogo | — |
| 62 | POST | `catalog/attributeSetChildren` | CatalogController.AttributeSetChildren | Controllers/CatalogController.cs:136 | 06 Productos y catálogo | — |
| 63 | POST | `catalog/categories` | CatalogController.Categories | Controllers/CatalogController.cs:152 | 06 Productos y catálogo | — |
| 64 | POST | `catalog/children` | CatalogController.Children | Controllers/CatalogController.cs:170 | 06 Productos y catálogo | — |
| 65 | POST | `catalog/children/{store}` | CatalogController.Children | Controllers/CatalogController.cs:191 | 06 Productos y catálogo | — |
| 66 | POST | `catalog/productWithWebsites` | CatalogController.ProductWithWebsites | Controllers/CatalogController.cs:207 | 06 Productos y catálogo | — |
| 67 | GET | `ecommerce/listado` | EcommerceController.GetListadoArticulosAsync | Controllers/EcommerceController.cs:14 | 06 Productos y catálogo | — |
| 68 | GET | `etiquetas` | EtiquetasController.GetEtiquetas | Controllers/EtiquetasController.cs:13 | 06 Productos y catálogo | — |
| 69 | GET | `ma/imagenes/optimizadas` | ImagenController.GetArticulosConImagen | Controllers/ImagenController.cs:22 | 06 Productos y catálogo | `product/obtenerImagen` |
| 70 | GET | `ma/imagenes/optimizadas/refresh` | ImagenController.GetArticulosConImagenRefresh | Controllers/ImagenController.cs:43 | 06 Productos y catálogo | — |
| 71 | POST | `ma/imagenes/cache/clear` | ImagenController.ClearCache | Controllers/ImagenController.cs:64 | 06 Productos y catálogo | — |
| 72 | GET | `product/exportaart/{store}` | ProductController.EcommerceExportaArt | Controllers/ProductController.cs:23 | 06 Productos y catálogo | — |
| 73 | GET | `product/products` | ProductController.GetProducts | Controllers/ProductController.cs:51 | 06 Productos y catálogo | — |
| 74 | GET | `product/productbysku/{sku}` | ProductController.GetProductsBySku | Controllers/ProductController.cs:67 | 06 Productos y catálogo | — |
| 75 | GET | `product/filter/{filter}` | ProductController.GetFilterProducts | Controllers/ProductController.cs:83 | 06 Productos y catálogo | — |
| 76 | GET | `product/stock/filter/{filter}` | ProductController.GetFilterProductsStock | Controllers/ProductController.cs:99 | 06 Productos y catálogo | — |
| 77 | GET | `product/stock` | ProductController.GetStock | Controllers/ProductController.cs:115 | 06 Productos y catálogo | — |
| 78 | GET | `product/stock/serial` | ProductController.GetSerialStock | Controllers/ProductController.cs:131 | 06 Productos y catálogo | — |
| 79 | GET | `product/exclusiones/ma` | ProductController.GetExclusionesMA | Controllers/ProductController.cs:147 | 06 Productos y catálogo | — |
| 80 | GET | `product/exclusiones/familialinea/ma` | ProductController.GetExclusionesFamiliaLineaMA | Controllers/ProductController.cs:163 | 06 Productos y catálogo | — |
| 81 | GET | `product/articulos/sip/validos` | ProductController.GetArticulosSipValidos | Controllers/ProductController.cs:179 | 06 Productos y catálogo | — |
| 82 | GET | `product/familias/validas/ma` | ProductController.GetFamiliasValidasMA | Controllers/ProductController.cs:194 | 06 Productos y catálogo | — |
| 83 | GET | `product/familiaslinea/{clase}` | ProductController.GetFamiliasLineaByClass | Controllers/ProductController.cs:214 | 06 Productos y catálogo | — |
| 84 | GET | `product/articulos/ie/mayorista` | ProductController.GetArticulosIEMayorista | Controllers/ProductController.cs:230 | 06 Productos y catálogo | — |
| 85 | GET | `product/catalogo/{nombreCatalogo}` | ProductController.GetConfiguracionCatalogo | Controllers/ProductController.cs:246 | 06 Productos y catálogo | — |
| 86 | GET | `product/almacenes/config` | ProductController.GetAlmacenesConfig | Controllers/ProductController.cs:268 | 06 Productos y catálogo | — |
| 87 | GET | `product/reglas/existencia` | ProductController.GetReglasExistencia | Controllers/ProductController.cs:291 | 06 Productos y catálogo | — |
| 88 | GET | `product/jerarquia/articulos` | ProductController.GetJerarquiaArticulos | Controllers/ProductController.cs:312 | 06 Productos y catálogo | — |
| 89 | GET | `product/carrusel/categorias` | ProductController.GetCarruselCategorias | Controllers/ProductController.cs:333 | 06 Productos y catálogo | — |
| 90 | GET | `product/crosssell` | ProductController.GetCrossSell | Controllers/ProductController.cs:354 | 06 Productos y catálogo | — |
| 91 | GET | `product/upsell` | ProductController.GetUpsell | Controllers/ProductController.cs:370 | 06 Productos y catálogo | — |
| 92 | GET | `product/sustitutos` | ProductController.GetSustitutos | Controllers/ProductController.cs:386 | 06 Productos y catálogo | — |
| 93 | GET | `product/seo` | ProductController.GetArticulosSEO | Controllers/ProductController.cs:402 | 06 Productos y catálogo | — |
| 94 | POST | `product/seo` | ProductController.CreateArticuloSEO | Controllers/ProductController.cs:418 | 06 Productos y catálogo | — |
| 95 | PATCH | `product/seo/{material}` | ProductController.UpdateArticuloSEO | Controllers/ProductController.cs:436 | 06 Productos y catálogo | — |
| 96 | DELETE | `product/seo/{material}` | ProductController.DeleteArticuloSEO | Controllers/ProductController.cs:454 | 06 Productos y catálogo | — |
| 97 | POST | `product/obtenerImagen` | ProductController.ObtenerImagen | Controllers/ProductController.cs:474 | 06 Productos y catálogo | — |
| 98 | POST | `credit/GetAccountDebts` | AbonosController.GetAccountDebts | Controllers/AbonosController.cs:20 | 07 Ventas, monedero, abonos | `customerService/GetAccountDebts` |
| 99 | POST | `credit/getClienteFactura/{cliente}/{factura}` | AbonosController.GetClienteFactura | Controllers/AbonosController.cs:36 | 07 Ventas, monedero, abonos | `credit/getClienteFactura/{cliente}/{factura}` |
| 100 | POST | `credit/ApplyPaymentNeko` | AbonosController.ApplyPaymentNeko | Controllers/AbonosController.cs:53 | 07 Ventas, monedero, abonos | — |
| 101 | POST | `credit/UpdateStatusPaymentNeko` | AbonosController.UpdateStatusPaymentNeko | Controllers/AbonosController.cs:73 | 07 Ventas, monedero, abonos | — |
| 102 | GET | `credit/GetCobrosReferenciados/{bp}` | AbonosController.GetCobrosReferenciados | Controllers/AbonosController.cs:87 | 07 Ventas, monedero, abonos | — |
| 103 | GET | `credit/GetClabeSTP/{bp}` | AbonosController.GetClabeSTP | Controllers/AbonosController.cs:101 | 07 Ventas, monedero, abonos | — |
| 104 | GET | `movbita/events/{vbeln}` | MovBitaController.GetMovBitaEvents | Controllers/MovBitaController.cs:14 | 07 Ventas, monedero, abonos | — |
| 105 | POST | `sale/transaction` | SaleController.InsertTransaction | Controllers/SaleController.cs:20 | 07 Ventas, monedero, abonos | — |
| 106 | GET | `sale/{documentId}` | SaleController.GetDocumentById | Controllers/SaleController.cs:39 | 07 Ventas, monedero, abonos | — |
| 107 | GET | `sale/filter/{filters}` | SaleController.GetFilterDocuments | Controllers/SaleController.cs:58 | 07 Ventas, monedero, abonos | — |
| 108 | GET | `sepomex/validarcp` | SepomexController.GetCodigosPostales | Controllers/SepomexController.cs:14 | 07 Ventas, monedero, abonos | — |
| 109 | POST | `customer/wallet/details` | WalletCustomerController.GetCustomerWallet | Controllers/WalletCustomerController.cs:18 | 07 Ventas, monedero, abonos | `customer/wallet/details` |
| 110 | POST | `customer/wallet/getMinimumCostToRedeem` | WalletCustomerController.GetMinimumCostToRedeem | Controllers/WalletCustomerController.cs:59 | 07 Ventas, monedero, abonos | `customer/wallet/getMinimumCostToRedeem` |

Conteo por sección: 01 → 12 rutas · 03 → 8 · 04 → 29 · 05 → 6 · 06 → 42 · 07 → 13 · total 110. La 02 documenta la rama de crédito de `order/new` (fila 1) y la 08 el mecanismo de `login/auth` (fila 41).

Rutas de prueba expuestas (con JWT): `order/testnew` (`Controllers/OrderController.cs:50-54`, con aviso en el código de que debe eliminarse en producción, `:52-53`) y `partner/testnew` (`Controllers/BusinessPartnerController.cs:119-121`). Si se borran o no es una decisión abierta (GUIA §8.2).

---

## Órdenes (contado, devoluciones, cancelaciones, guías, recoger en sucursal, Openpay/PayPal)

> Todas las rutas de archivo son relativas a `\\172.16.214.58\sap\ServicioSAP\ServicioSap\ServicioSap\`. Las citas usan el nombre corto del archivo: `OrderController.cs` = `Controllers\OrderController.cs`, `OrderMethods.cs` = `Methods\Order\OrderMethods.cs`, `StorePickupMethods.cs` = `Methods\Order\StorePickupMethods.cs`; los modelos están en `Models\SAP\Order\`. El detalle de la rama de **crédito** (`metodoPago = omnipro_pago_credito`) está en la sección [[#Órdenes a crédito (rama omnipro_pago_credito de order/new)|02 · Órdenes a crédito]]; aquí solo se indica dónde se separa.

### Resumen del área

Esta área recibe los pedidos de las tiendas en línea (Muebles América y VIU) y los convierte en documentos de SAP S/4HANA. En la práctica hace seis cosas:

1. **Crear el pedido de contado** en SAP (`POST order/new`): revisa que no esté duplicado, ajusta el precio al mínimo de la lista de precios, revisa existencias, encuentra o da de alta al cliente en SAP, envía el pedido y después liga la dirección de entrega y avisa a la DMZ qué cliente quedó en el pedido (`OrderMethods.cs:1713-1944`).
2. **Atender los métodos de pago especiales**: Openpay con tarjeta se guarda para validación posterior y no va a SAP en ese momento; Openpay en tiendas sí va a SAP y además deja un registro local; PayPal siempre revisa duplicados (`OrderMethods.cs:1741-1769`).
3. **Devoluciones**: crea en SAP un pedido de devolución ligado al pedido original (`POST order/setreturn`, `OrderMethods.cs:1600-1711`).
4. **Cancelaciones**: anula la factura y revierte la salida de mercancía del pedido (`POST order/cancelOrder`, `OrderMethods.cs:2961-3066`), o solo anula la factura (`POST order/cancelInvoice`, `OrderMethods.cs:114-189`).
5. **Guías y recoger en sucursal**: guarda y consulta el nombre que va en la guía de envío (`OrderMethods.cs:533-579`), y genera, consulta y avisa la clave para recoger el pedido en tienda (`StorePickupMethods.cs:27-358`).
6. **Utilidades**: validar un cupón o código de promotor, consultar un documento de ventas en SAP y traducir una condición de pago de Magento a la de SAP (`OrderController.cs:102-140`, `:309-329`).

**Términos usados**

- **BP (Business Partner)**: el cliente dado de alta en SAP. Magento manda en `infoCliente.cuenta` el número de BP (decisión DU2; no se convierten cuentas que empiecen con "C").
- **OData**: el tipo de servicio web por el que se lee y escribe en SAP. Un "entity set" es la tabla expuesta por ese servicio.
- **PurchNoC (folio del pedido en SAP)**: identificador con el que ServicioSAP encuentra un pedido de ecommerce dentro de SAP: `ZSD_{clase de documento}_{incrementId}`, por ejemplo `ZSD_ZMER_2000012345` (`OrderMethods.cs:2279`).
- **Token CSRF**: un código que SAP exige antes de cada escritura (POST); se pide con una llamada previa (`TokenGenerator.cs:135-171`).
- **Fichas SAP usadas**: SD01 (crear pedido), SD09 (devolución), SD29 (lista de precios), SD36 (consultar documentos de venta), SD46 (anular salida de mercancía), SD48 (anular factura), DIM11 (existencias), BP01 (alta de BP), BP05 (datos del BP).
- **SIGMavi**: base de datos SQL de MAVI; se conecta por `Conexion.dll` (decisión DU19, `ConexionSQL.cs:72-98`).
- **SQLite (`data.db`)**: archivo de base de datos local del servidor donde ServicioSAP guarda guías y pedidos Openpay (`SQLiteDb.cs:11-21`).
- **UEN**: unidad de negocio: 1 = Muebles América, 2 = VIU.

**De la tienda a la estructura de SAP** (se calcula a partir de `storeId`; `OrderMethods.cs:340-351`, `:363-385`)

| `storeId` contiene | Org. de ventas (SalesOrg) | Centro (Plant) contado | Centro crédito | Oficina (SalesOff) |
|---|---|---|---|---|
| `viu` (sin importar mayúsculas) | 05 | 0041 | 0505 | 0041 |
| `muebles_america` | 04 | 0090 | 0504 | 0090 |
| cualquier otro valor | 04 | 2000 | 2000 | 2000 |
| vacío o nulo | error "No lleva id de tienda" | | | |

La org. de ventas respeta `salesOrg` si viniera en el cuerpo, pero Magento no la manda (`OrderMethods.cs:329-343`). El canal de distribución (DistrChan) es "02" para crédito y "01" para todo lo demás (`OrderMethods.cs:2187-2189`).

**Métodos de pago** (constantes en `OrderMethods.cs:43-47`)

| `metodoPago` | Qué es | ¿Crea pedido en SAP en `order/new`? | Cliente (BP) del pedido |
|---|---|---|---|
| `banktransfer` | Transferencia o depósito | Sí | `cuenta`; si no viene y viene `cliente`, crea un BP; si no, BP fijo de invitado (`OrderMethods.cs:2585-2599`) |
| `paypal_express` | PayPal | Sí; siempre revisa duplicado | `cuenta`; si no viene, crea un BP (`OrderMethods.cs:2558-2566`) |
| `openpay_cards` | Tarjeta vía Openpay | No: se guarda en SQLite para validación y termina (`OrderMethods.cs:1754-1763`) | — |
| `openpay_stores` | Pago en tienda con referencia Openpay | Sí, y además deja una fila en SQLite (`OrderMethods.cs:1765-1769`) | `cuenta` obligatoria (`OrderMethods.cs:2577-2583`) |
| `omnipro_pago_credito` | Crédito | No: crea una solicitud de crédito (sección Crédito web) | `cuenta` obligatoria |
| cualquier otro | — | Sí | `cuenta`; si no viene, crea un BP |

---

### POST order/new  (OrderController.SetOrder, OrderController.cs:16-48)

- **Para qué sirve:** Recibe un pedido de la tienda en línea y, según el método de pago, lo crea en SAP como pedido de venta (SD01), lo deja guardado para validación (Openpay tarjeta) o crea una solicitud de crédito (`OrderMethods.cs:1713-1944`).
- **Quién la llama:** DMZ `order/setOrder` (tracker `MAVI - DMZ-SAP.csv` línea 77, "SD01 - Migrado"). El tracker planea apuntar también `order/validateCredit` aquí (línea 89, no conectada); la lista de actividades la da por N/A (ACT-35 punto 1).
- **Entrada:** `OrderRequest` (`OrderRequest.cs:5-54`). Campos que usa el flujo de contado:
  - `incrementId` (string): folio del pedido; forma el PurchNoC y se guarda como id de ecommerce (`OrderMethods.cs:1731`, `:2279`, `:2329`). No se valida que venga.
  - `storeId` (string): obligatorio en la práctica; vacío detiene el pedido con "No lleva id de tienda" (`OrderMethods.cs:365-368`).
  - `metodoPago` (string): elige el camino (tabla de arriba).
  - `articulos` (lista de `ArticuloRequest`, `ArticuloRequest.cs:3-16`): `sku` (string), `precio` (decimal), `precioEspecial` (decimal), `cantidad` (int), `descuento` (decimal), `condicion` (string, condición de pago que manda Magento). No se valida que venga: si llega nula el flujo truena al armar el arreglo (`OrderMethods.cs:222`) y responde "Error, …".
  - `infoCliente` (`InfoClienteRequest.cs:3-82`): `cuenta` (BP), `cliente`, `nombre`, `nombreClienteMavi`, `apellidoPaternoClienteMavi`, `apellidoMaternoClienteMavi`, `direccion`, `numExt`, `numInt`, `codigoPostal`, `municipio`, `colonia`, `estado`, `pais`, `referencia`, `entreCalles`, `telefono`, `telefonoClienteMavi`, `correo`, `rfc`, `sexo`, `fiscalRegimen`, `usoCfdi` (todos string, opcionales) e `idMagento` (int). El código tolera que falte (`OrderMethods.cs:2541-2543`).
  - `forzarOrder` (string "0"/"1"): "0" activa la revisión de duplicado (`OrderMethods.cs:1741`).
  - `metodoEnvio` (string): `instore_pickup` = recoger en sucursal (`OrderMethods.cs:58`).
  - `entityId`, `utmSource`, `Agente` (string), `RedimirMonedero` (float): opcionales, se copian al pedido.
  - `docType`, `salesOrg`, `pmnttrms`, `usuarioPos`, `refDoc`, `refDocCat` (string): opcionales; si no vienen se usan valores por defecto (`OrderRequest.cs:25-34`). `distrChan`, `division` y `salesOff` también existen en el modelo, pero el armado del pedido los ignora y siempre los calcula (`OrderRequest.cs:28-30`; `OrderMethods.cs:2189`, `:2194-2196`, `:2210`).
  - `subTotal`, `total`, `impuesto`, `costoEnvio`, `cuotas`, `codigoRecogerSucursal`, `sucursalDestino`, `status`, `state`: no viajan al pedido de contado en SAP (solo se copian al arreglo interno `ToArray`, `OrderMethods.cs:198-292`, o los usa la rama de crédito).
- **Cómo funciona (paso a paso):**
  1. Cuerpo nulo: responde 400 (`OrderController.cs:20-23`). Si no, llama `SetOrderAsync(order, "Insert")` (`OrderController.cs:27`).
  2. Junta los artículos repetidos por SKU (`OrderMethods.cs:1725`, `:87-107`).
  3. Guarda el `forzarOrder` original y arma el arreglo posicional `sDatosPedido` (`OrderMethods.cs:1729-1730`).
  4. Revisión de duplicado (idempotencia: no crear dos veces el mismo pedido): arma el PurchNoC y, si aplica, lo busca en SD36; si ya existe responde "PedidoExistente" sin tocar SAP (`OrderMethods.cs:1737-1749`).
  5. Openpay tarjeta: guarda el pedido en SQLite y termina (`OrderMethods.cs:1754-1763`).
  6. Openpay tiendas: guarda una fila en SQLite y continúa (`OrderMethods.cs:1765-1769`).
  7. Crédito: guarda la guía, crea la solicitud de crédito y termina sin pedido SAP (`OrderMethods.cs:1774-1797`; detalle en Crédito web).
  8. Validaciones previas a SAP: nombre para la guía, "código postal" y centro (`OrderMethods.cs:1804-1806`); precio mínimo con SD29 (`:1809`); existencias con DIM11, que puede terminar el flujo (`:1812-1816`); región de celulares (`:1819`).
  9. Resuelve el BP del pedido; puede dar de alta un BP nuevo en SAP (`OrderMethods.cs:1822`, `:2535-2616`).
  10. Guarda la guía (nombre del cliente) en SQLite (`OrderMethods.cs:1828`).
  11. Arma el pedido SAP y lo envía por POST con token CSRF (`OrderMethods.cs:1837-1863`).
  12. Revisa la respuesta: código no exitoso, vacía o HTML es error; toma el nodo `d` (`OrderMethods.cs:1867-1880`).
  13. Después de SAP: consulta el BP en BP05 (`:1889-1900`), registro de recoger en sucursal (`:1903-1911`), dirección de entrega (`:1914`), monedero (`:1918-1928`) y aviso `setCAccount` a la DMZ (`:1930-1934`).
  14. El controlador arma una respuesta corta (`OrderController.cs:28-35`).
- **Reglas de negocio:**
  - *Preparación*
    - RORD-1: Los artículos con el mismo SKU se juntan en una sola línea: cantidades y descuentos se suman; precio, precio especial y condición se toman de la primera aparición (`OrderMethods.cs:92-103`).
    - RORD-2: Si algún artículo trae `precioEspecial` distinto de 0 y `forzarOrder` es "0", el armado del arreglo lo cambia a "1"; por eso la revisión de duplicado usa el valor original (`OrderMethods.cs:236-237`, `:253-254`, `:1726-1729`).
  - *Duplicados*
    - RORD-3: PurchNoC = `ZSD_{docType o "ZMER"}_{incrementId}` (`OrderMethods.cs:1738-1739`).
    - RORD-4: Se revisa el duplicado en SD36 solo si `forzarOrder` original es "0" o el pago es PayPal; con `forzarOrder` "1" no se revisa, salvo PayPal (`OrderMethods.cs:1741`).
    - RORD-5: Si SD36 falla, se asume que el pedido no existe y se sigue (`OrderMethods.cs:459-463`).
  - *Openpay*
    - RORD-6: `openpay_cards` no crea pedido SAP: guarda el pedido completo como JSON en la tabla SQLite `openpay_orders` con `status = 'processing'` e `is_in_intelisis = '0'`, y responde "Concluido"; solo responde "Error al guardar" si no pudo abrir la base (`OrderMethods.cs:470-492`, `:1754-1763`). Un error al insertar se ignora y aun así responde "Concluido" (`SQLiteDb.cs:158-176`).
    - RORD-7: `openpay_stores` guarda en `openpay_stores` el `increment_id`, `entity_id`, `status = 'in_progress'`, la fecha actual con formato `yyyy-MM-ddTHH:mm:sszzz` (el "+" se cambia por "-") y `mage_response` nulo; el resultado se ignora y el pedido sigue a SAP (`OrderMethods.cs:497-521`, `:1765-1769`).
  - *Crédito*
    - RORD-8: `omnipro_pago_credito` guarda la guía, arma la lista "cantidad,sku" más `SEGU00001` con el costo de envío si es mayor a 0, crea la solicitud y responde "Concluido" con `BP = cuenta`; no envía pedido a SAP (`OrderMethods.cs:1774-1797`). Reglas completas en Crédito web.
  - *Validaciones previas a SAP*
    - RORD-9: Precio mínimo: por cada SKU se consulta SD29 solo por artículo y se toma la primera fila; si el precio del pedido es menor, se sube al de SD29; nunca se baja (`OrderMethods.cs:1962-1999`). Lista vacía, precio no numérico o error se ignoran y el pedido sigue (`:1967-1982`, `:2004-2008`). El SKU se escapa para que "+", "&", "#" o espacios lleguen intactos (`FinalListProperMethods.cs:94-104`).
    - RORD-10: Existencias: por cada SKU se consulta DIM11 en el centro del pedido y se toma la primera fila (`UnrestrictedUseStock` = existencia de libre utilización) (`OrderMethods.cs:2025-2029`). Sin fila, valor no numérico, existencia menor que la cantidad o error detienen el pedido con `Resultado = "Error"` y el motivo en `Zobservaciones` (`:2031-2052`, `:2062-2067`).
    - RORD-11: Región de celulares: un SKU que contenga "-R5" o "-R6" se reescribe a "-R{región esperada}" cuando no coincide; la región esperada es el primer carácter del dato recibido o "5" si viene vacío; al reescribirlo, todo el SKU queda en mayúsculas; nunca detiene el pedido (`OrderMethods.cs:2085-2124`, `:2135-2139`). Ver Pendientes: hoy recibe el estado, no el código postal.
  - *Cliente (BP) del pedido*
    - RORD-12: `openpay_stores` exige `cuenta`; sin ella el pedido falla con "VIU contado requiere cuenta logeada en el body." (también para tiendas MA) (`OrderMethods.cs:2550-2551`, `:2577-2583`). El mismo método tiene la regla de crédito ("Credito MA requiere cuenta logeada en el body.", `:2546-2547`, `:2569-2575`), pero `order/new` nunca la alcanza porque el crédito termina antes (`:1774-1797`); ahí la falta de cuenta da "sin cuenta" (`:642-646`; ver Crédito web).
    - RORD-13: `banktransfer`: usa `cuenta`; si no viene y viene `cliente`, da de alta un BP; si tampoco, usa el BP fijo de invitado `1500003857` (`OrderMethods.cs:41`, `:2554-2555`, `:2585-2599`).
    - RORD-14: Cualquier otro método (PayPal incluido): usa `cuenta`; si no viene, da de alta un BP siempre (`OrderMethods.cs:2558-2566`).
    - RORD-15: La cuenta se usa tal como llega (BP numérico, DU2), solo recortando espacios (`OrderMethods.cs:2558-2560`, `:2587-2589`).
    - RORD-16: Alta de BP: se envía a BP01; si SAP no devuelve número de BP, el pedido se detiene con error (`OrderMethods.cs:2601-2616`). Valores que pone `BuildBpClientFromOrder` (`OrderMethods.cs:2618-2940`):
      - Nombre = `nombreClienteMavi` o, si falta, `nombre`; apellidos paterno y materno (`:2622-2626`, `:2650-2652`).
      - Sexo (`Gender`, 1 = masculino, 2 = femenino): vacío → "1"; si no, `MapGender`: H/HOMBRE/MASCULINO/1 → 1, M/MUJER/FEMENINO/2 → 2, otro → 3 (`:2655`; `BusinessPartnerMethods.cs:777-798`).
      - Estado civil (`Marst`) = "1" Soltero: SAP lo exige y la web no lo captura, igual que el alta de clientes (decisión DU18) (`:2659`).
      - Nacionalidad = país en mayúsculas o "MX"; país de la dirección "MX"; región fija "JAL" (`:2630`, `:2660`, `:2673-2674`).
      - Teléfono = `telefonoClienteMavi` o, si falta, `telefono`; se registra como MOVIL (`:2942-2949`, `:2837-2838`).
      - RFC: si no viene, el RFC genérico de público en general `XAXX010101000` (`:2688`).
      - Área de ventas: org. 04/05 según la tienda, canal "01", sector "00"; `NameOrg1` = "viu" o "muebles_america" (`:2633-2634`, `:2646`, `:2704-2706`, `:2740-2742`).
      - Constantes: grupo `CLIE`, cuenta `0110`, sociedad `5510`, moneda `MXN`, `Perrl` "AM" (obligatorio para SAP), `Kvgr4` "SI", rol `WE`, impuesto `TMX1`/`1` (`:2640`, `:2691`, `:2695`, `:2721`, `:2752`, `:2728`, `:2743`, `:2738-2739`).
      - `Zusuariopos` = nómina del agente tal como llega en `Agente`, sin convertir; `ZidMagento` = `idMagento` (`:2767-2772`, `:2785`).
  - *Guía*
    - RORD-17: Se guarda en SQLite `servicio_guias` el `incrementId` y el nombre "APELLIDO PATERNO APELLIDO MATERNO NOMBRE" en mayúsculas; si ya existe no se sobrescribe (`INSERT OR IGNORE`) y un error no detiene el pedido (`OrderMethods.cs:407-416`, `:533-553`, `:1828`).
  - *Cabecera del pedido SAP* (`BuildSapOrderAsync`, `OrderMethods.cs:2170-2396`)
    - RORD-18: Clase de documento = `docType` o "ZMER" (pedido de mercancía); `Zidecomm` y `Zreferencia` = `incrementId`; `Zorigen` = clase; `Zorigenid` = `entityId` (`:2173-2175`, `:2297`, `:2309-2310`, `:2329`).
    - RORD-19: Sector (Division) = "01". Con "00", como dice la ficha, SAP rechazó el pedido con "No existe el área de ventas 04 01 00"; está pendiente de aclarar con SAP (`:2199-2210`).
    - RORD-20: Condición de pago (`Pmnttrms`): se toma la `condicion` del primer artículo que la traiga, en mayúsculas, y se traduce con `GetCondicionAsync` (tabla SIGMavi, luego catálogo en memoria, luego "ACEF" = contado MA). Sin condición queda `pmnttrms` del cuerpo o vacío (`:2211`, `:2214-2236`). El error "La condición de pago … no existe" solo saldría si la tabla devolviera "0000", porque el respaldo siempre da "ACEF" (`:2231-2234`, `:3345`).
    - RORD-21: Textos: `Zconcepto` "Pedido de mercancias", `Zobservaciones` "Pedido generado desde {utmSource}", `Zsituacion` "Creación", `CustGrp2` "C02", `Zformaenvio` = `metodoEnvio` sin recortar (campo de 50 caracteres) (`:2294-2306`).
    - RORD-22: Fechas: `PurchDate`, `PriceDate` y `DocDate` = ahora con formato `yyyy-MM-ddTHH:mm:ss`; `Zsituacionfecha`, `Zaudat`, `Zfechaconcl`, `Zfechacancel`, `Zfechaentreg` y `Zfechaenvcred` = ahora con formato `yyyyMMddHHmmss` (`:2176-2178`, `:2280-2288`, `:2300`, `:2311-2314`, `:2325`; `StoreGlobalMethods.cs:52-67`).
    - RORD-23: Monedero: `Zredimepos` = "1" si `RedimirMonedero` > 0, si no "0"; `Zredimepuntos` = el monto (`:2322`, `:2333`).
    - RORD-24: Interlocutores (`to_partners`): `AG` (solicitante) = BP resuelto; `Z1` (agente) = `Agente` recortado, o vacío si no viene; `Zctefinal` = BP (`:2336-2354`). Los agentes en S/4HANA no llevan ceros a la izquierda (`:69-71`).
    - RORD-25: Valores fijos: `Zafectacomision` "0", `Zband402` "0", `Zembarqueestado` "EmbarqueEstado", `Zliberado` "1234", `Zartq` "1", `Zpagodie`/`Zrepdescto`/`Zvtadimanuevo`/`Zprerastreo`/`Ztransferenstp` "0", `PurchNoS` vacío (`:2289`, `:2315-2335`).
    - RORD-26: Movimiento (`to_movtpo`): módulo "VENTA", estatus "Pendiente", situación "Pedido de mercancias", centro del pedido. Bitácora (`to_movbita`): módulo "VENTA", evento "Pedido de mercancias", cita cliente/aval "1", fecha y hora actuales (`:2355-2388`).
  - *Posiciones del pedido SAP* (`OrderMethods.cs:2399-2522`)
    - RORD-27: Una posición por artículo con precio y cantidad mayores a 0; los demás se omiten, pero el contador avanza igual, así que la numeración puede tener huecos. Número de posición de 6 dígitos (`:2404-2413`).
    - RORD-28: Tipo de posición "ZMRM" (mercancía), unidad "PI", centro del pedido, almacén fijo "001V", `Zdescrextra` = `condicion`, `Zusudescto` = `usuarioPos`; los campos de promoción y descuento van en "" o "0" porque no aplican a ecommerce (`:2407`, `:2419-2447`).
    - RORD-29: El precio que va a SAP es `precio` (ya ajustado por SD29). `precioEspecial` no se usa como precio: solo viaja en `to_autoincr.Zkbetr2` (`:2409`, `:2416`, `:2512`).
    - RORD-30: Condición de precio `ZPCP` (precio neto con IVA) = precio × cantidad con 2 decimales (`:2450`, `:2484-2492`). Si la clase es `ZMN-` (redención de monedero): `ZVTA` = total y `ZMON` = monto de monedero en negativo; si es `ZMN+` (generación): `ZVTA` = total y `ZMON` = `precioEspecial` (`:2451-2483`).
    - RORD-31: Texto `ZOBS` (idioma "S") con la `condicion`; `to_autoincr` con el precio sin decimales y el precio especial; `to_series` con número de serie vacío (`:2494-2520`).
    - RORD-32: `descuento`, `subTotal`, `total`, `impuesto` y `costoEnvio` no se envían a SAP en contado (`BuildSapOrderAsync` no los lee, `:2170-2524`).
  - *Después de crear el pedido*
    - RORD-33: Dirección de entrega (no aplica a `instore_pickup`): busca las direcciones del BP y reutiliza la que tenga el mismo código postal y cuya calle contenga la `direccion` del pedido, sin distinguir mayúsculas; si no hay, crea una nueva con país (o "MX" si viene nulo), municipio, CP, calle, número exterior e interior, estado, colonia, entre calles, referencia, vigencia desde hoy y, si viene `telefono` (no `telefonoClienteMavi`), ese teléfono como principal tipo "1"; luego la liga al pedido con rol `WE` (destinatario de mercancía) (`OrderMethods.cs:1396-1507`). Cualquier error se ignora y el pedido queda creado (`:1436-1439`, `:1516-1520`).
    - RORD-34: Recoger en sucursal: solo escribe un mensaje en consola si `telefonoClienteMavi` es numérico; la clave se genera aparte con `order/createStorepickupCode` (`OrderMethods.cs:1903-1911`, `:1549-1563`).
    - RORD-35: Monedero: solo para `openpay_cards` o `paypal_express`; como `openpay_cards` ya salió antes, en la práctica solo PayPal, y hoy no hace nada (`OrderMethods.cs:1918-1928`, `:1373-1386`).
    - RORD-36: Aviso `setCAccount`: si `Zctefinal` de la respuesta no está vacío ni es "0", se manda a la DMZ `order/setCAccount` con `{incrementId, cAccount}`; 3 intentos con esperas de 2 y 4 segundos; los fallos se registran y no cambian la respuesta (`OrderMethods.cs:1930-1934`, `:1270-1333`). También se dispara cuando el pedido quedó con el BP fijo de invitado.
    - RORD-37: Se consulta el BP en BP05 después de crear el pedido, pero el resultado solo se escribe en consola (`OrderMethods.cs:1889-1900`).
  - *Comparación del método de pago*
    - RORD-38: Para elegir el camino (duplicado PayPal, Openpay, crédito, monedero) `metodoPago` se compara exacto: mayúsculas y espacios cuentan (`OrderMethods.cs:1741`, `:1754`, `:1765`, `:1774`, `:1918`). Para resolver el BP y el canal se compara sin distinguir mayúsculas (y, en el BP, recortando espacios) (`:2540-2555`, `:2187-2189`). Un valor como "PayPal_Express" no revisaría duplicado ni pasaría por el monedero.
- **Fuentes de datos:**
  - SAP SD36 `ZAPI_DOCVTAS_CHECK_CDS/ZAPI_DOCVTAS_CHECK`, `$filter=PurchNoC eq '…'`, `$expand=to_salesdoc_items,to_zsdt_vbak,to_zsdt_vbap` (lectura, `SalesMethods.cs:132-166`).
  - SAP SD29 `ZAPI_PROPRELIST_SRV/PropreListSet`, `$filter=Articulo eq '…'` (lectura, `FinalListProperMethods.cs:82-85`, `:99-129`).
  - SAP DIM11 `ZCDS_DIM11_EXISTENCIA_CDS/zcds_dim11_existencia`, `$filter=Material eq '…' and Plant eq '…'` (lectura, `ProductMethods.cs:206-244`).
  - SAP BP01 `ZAPI_BP01_PARTNER_SRV/BPartnerSet` (escritura POST, `BusinessPartnerMethods.cs:74-156`).
  - SAP SD01 servicio de pedidos en la llave `ZAPI_SALESORDER_SRV` (entidad `A_SALES_ORDERSet` según la ficha RSG sd01) (escritura POST, `OrderMethods.cs:1840-1863`).
  - SAP BP05 `ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE`, `$filter=BusinessPartner eq '…'`, `$top=1` (lectura, `BusinessPartnerMethods.cs:27-69`).
  - SAP `API_BUSINESS_PARTNER` `A_BusinessPartner('{bp}')/to_BusinessPartnerAddress` (lectura y alta de dirección, `DeliveryAddressMethods.cs:29-106`).
  - SAP `ZSRV_SALESDOC_ADDRCHANGE_SRV/ChangeDeliveryAddressSet` (escritura POST, `DeliveryAddressMethods.cs:242-277`).
  - SIGMavi `CondicionesCredVtaLinea` (lectura) y catálogo en memoria `PaymentConditionCatalog` (`OrderMethods.cs:3314-3346`; `PaymentConditionCatalog.cs:8-138`).
  - SQLite `data.db`: `openpay_orders`, `openpay_stores`, `servicio_guias` (escritura, `OrderMethods.cs:480-482`, `:509-511`, `:541-543`).
  - DMZ: `login/authenticate` y `order/setCAccount` (POST, `OrderMethods.cs:1272-1315`).
  - La rama de crédito usa además MAVICBOSANDROID y `URL_BP_API` (ver Crédito web).
- **Salida y errores:**

  | Caso | HTTP | Cuerpo |
  |---|---|---|
  | Cuerpo nulo | 400 | vacío (`OrderController.cs:20-23`) |
  | Pedido creado | 200 | `{BP: Zctefinal, SalesDocument: to_result.Salesdocument sin ceros a la izquierda (o PurchNoS si no viene), Message: primer mensaje de to_return o "", Resultado: el que traiga SAP}` (`OrderController.cs:28-35`). ServicioSAP no llena `Resultado` en el camino exitoso; si SAP no lo manda llega nulo (`Response.cs:14`). |
  | Duplicado | 200 | `Resultado = "PedidoExistente"`, `BP` y `SalesDocument` nulos, `Message` "" (`OrderMethods.cs:1744-1748`) |
  | Openpay tarjeta | 200 | `Resultado = "Concluido"` o "Error al guardar" (`OrderMethods.cs:1758-1762`) |
  | Crédito | 200 | `Resultado = "Concluido"`, `BP = cuenta` (`OrderMethods.cs:1791-1796`) |
  | Sin existencias | 200 | `Resultado = "Error"`, `Message` = motivo (`OrderMethods.cs:1813-1816`, `OrderController.cs:32`) |
  | Cualquier excepción | 200 | una cadena (no un objeto): `"Error, Error en SetOrder: {mensaje}"`. Se conserva HTTP 200 a propósito, como el sistema anterior, para no romper el flujo de Magento; se usa el mensaje y no el stack trace (`OrderController.cs:37-47`, `OrderMethods.cs:1939-1943`) |

  Registro en archivo (`Logger.SAP`): `[ORDER NEW ERROR]` con incrementId y excepción completa (`OrderController.cs:45`); `[SAP ORDER REQUEST]`, `[SAP ORDER RESPONSE]`, `[SAP ORDER ERROR]` (`OrderMethods.cs:1860`, `:1865`, `:1869`); `[SAP BP AUTO-CREATION]` y `[SAP BP AUTO-CREATION ERROR]` (`:2605`, `:2611`); `[SAP WEBHOOK DMZ]` y `[SAP WEBHOOK DMZ ERROR]` (`:1319`, `:1329`). Se ignoran sin detener el pedido: errores de precio SD29, región, SQLite, dirección de entrega, BP05, monedero y aviso a la DMZ.
- **Configuración usada:** `ZAPI_SALESORDER_SRV` (`OrderMethods.cs:1841`, `Web.config:45`), `URL_DMZ` y `USER_DMZ` (`OrderMethods.cs:1272-1276`, `Web.config:55-56`), `SQLITE_DB_PATH` (`SQLiteDb.cs:18-21`, `Web.config:59`), `Server` de applicationSettings para SIGMavi (`ConexionSQL.cs:75-79`, `Web.config:159`). La URL y el usuario de S/4HANA salen de `Conexion.dll` (nodo Dev), no del Web.config (`OrderMethods.cs:1840`, `TokenGenerator.cs:60-82`).
- **Pendientes conocidos:**
  - El "código postal" de la validación de región toma `sDatosPedido[20]`, que es el **estado**; el código postal es el índice 17 (`OrderMethods.cs:1805` contra `:269`, `:272`). Con un estado como "Jalisco", un SKU "-R5" se reescribiría a "-RJ".
  - La región de celulares se valida después de las existencias: un SKU reescrito no pasa por DIM11 (`OrderMethods.cs:1812-1819`).
  - El registro de recoger en sucursal pasa `sDatosPedido[16]` (número interior) como correo (`OrderMethods.cs:1908` contra `:268`); hoy es un stub sin efecto (`:1553-1555`).
  - `ValidarOrdenCompleta` y `ValidateOrderRequest` existen pero no se llaman: no hay validación previa de artículos ni de cliente (`OrderMethods.cs:387-405`, `:2526-2533`).
  - La dirección se liga usando `PurchNoS` de la respuesta, y el pedido lo envía vacío; si SAP no lo devuelve lleno, la dirección no se liga (solo queda un aviso en consola) (`OrderMethods.cs:1487-1506`, `:2289`).
  - Monedero sin definir en SAP (TODO, `OrderMethods.cs:1377-1379`); la afectación `spAfectar` no está implementada ni se llama (`:1527-1543`).
  - Agente `Z1` genérico de ecommerce pendiente de solicitar a MAVI; hoy va vacío si no viene (`OrderMethods.cs:62-72`).
  - Validación de la condición contra SD40 comentada, en revisión (`OrderMethods.cs:2238-2274`).
  - Nadie en ServicioSAP lee `openpay_orders` ni `openpay_stores` (solo se escriben, `OrderMethods.cs:480-482`, `:509-511`): los pedidos Openpay tarjeta no llegan a SAP por esta vía. En el tracker siguen pendientes `order/checkOpenpay` y `order/ManagePaynetOrders` (CSV líneas 123 y 86); ver auditoría C05.
  - La fila de `openpay_stores` se escribe antes de existencias y BP; si después falla, queda la fila sin pedido SAP (`OrderMethods.cs:1765-1769` antes de `:1812-1822`).
  - El BP se da de alta antes del POST del pedido: si SAP rechaza el pedido, el BP queda creado y un reintento sin `cuenta` crea otro (`OrderMethods.cs:2601-2616` antes de `:1862`).
  - Valores de prueba fijos en el pedido: un nombre de usuario literal en `Name`, `Zsituacionusuario` y `Bname` (`OrderMethods.cs:2285`, `:2301`, `:2366`, `:2377`, `:2508`), `Zliberado` "1234" (`:2326`), `Bstkd_e`/`Ihrez_e` (`:2376-2378`); en el alta de BP `Altkn` "1234567890" y región "JAL" (`:2703`, `:2674`).
  - El precio especial no se usa como precio del pedido (RORD-29): validar con negocio (`OrderMethods.cs:2409`).
  - El filtro de DIM11 no se codifica, a diferencia de SD29 (`ProductMethods.cs:211-219`): un SKU con "+" podría no encontrarse. Por verificar en la prueba de regresión de contado ACT-25, que contempla (como opcional) un SKU con "+".
  - Prueba de regresión de contado (SD29 y `Marst` "1" en el alta de BP) pendiente: ACT-25.

---

### POST order/testnew  (OrderController.TestSetOrder, OrderController.cs:50-70)

- **Para qué sirve:** Herramienta de pruebas: manda a SAP un pedido ya armado en formato SAP, sin ninguna validación ni regla (`OrderMethods.cs:1569-1598`).
- **Quién la llama:** Nadie en el flujo de negocio; no está en el tracker. El código advierte que es solo para pruebas locales y debe eliminarse en producción (`OrderController.cs:52-53`).
- **Entrada:** `Order` (`Order.cs:13-83`): cabecera SD01 (`DocType`, `PurchNoC`, `SalesOrg`, `DistrChan`, `Division`, `Pmnttrms`, campos `Z…`) y listas `to_items`, `to_partners`, `to_conditions`, `to_text`, `to_movtpo`, `to_movbita`, `to_autoincr`, `to_series`. Todo opcional para el código.
- **Cómo funciona (paso a paso):**
  1. Cuerpo nulo: 400 (`OrderController.cs:56-59`).
  2. Serializa el pedido omitiendo los campos nulos (`OrderMethods.cs:1571-1572`).
  3. Arma la URL del servicio de pedidos y pide el token CSRF (`OrderMethods.cs:1574-1587`).
  4. Hace el POST y devuelve el texto de la respuesta tal cual (`OrderMethods.cs:1589-1597`).
- **Reglas de negocio:**
  - RTST-1: No aplica ninguna regla del flujo `order/new` (sin duplicados, precios, existencias ni BP) (`OrderMethods.cs:1569-1598`).
  - RTST-2: La respuesta de SAP se devuelve aunque SAP haya respondido con error (`OrderMethods.cs:1594-1597`).
- **Fuentes de datos:** SAP SD01 (llave `ZAPI_SALESORDER_SRV`), escritura POST (`OrderMethods.cs:1575-1595`).
- **Salida y errores:** 200 `{ResponseContent: "<texto crudo de SAP>"}` (`OrderController.cs:64`); excepción (por ejemplo, falla del token CSRF) → 400 `"Error, {mensaje}"` (`OrderController.cs:66-69`).
- **Configuración usada:** `ZAPI_SALESORDER_SRV` (`OrderMethods.cs:1575`).
- **Pendientes conocidos:** Eliminar antes de producción: permite escribir en SAP cualquier pedido sin validación (`OrderController.cs:52-53`).

---

### POST order/setreturn  (OrderController.SetReturn, OrderController.cs:72-100)

- **Para qué sirve:** Crea en SAP un pedido de devolución de mercancía (clase ZDME) ligado al pedido original del ecommerce (`OrderMethods.cs:1600-1711`).
- **Quién la llama:** DMZ `order/returnOrder` (tracker línea 79, "SD09 - Migrado").
- **Entrada:** `OrderRMA` (`OrderRequest.cs:57-69`): `incrementId` (string, folio del pedido original), `store` (string), `motivoCancelacion` (string), `tipo` (string), `dateTime` (string, no se usa aquí) y `producto` (arreglo de `RMAProduct`, `OrderRequest.cs:71-78`: `sku` string, `qty` int, `motivoDevolucion` string; `resolucion` y `rma_item_id` llegan pero no se usan).
- **Cómo funciona (paso a paso):**
  1. Cuerpo nulo: 400 (`OrderController.cs:76-79`).
  2. Convierte el `OrderRMA` en `OrderRequest` (`BuilAdapterReturn`, `OrderMethods.cs:2144-2169`): `storeId = store`, `utmSource = motivoCancelacion`, `forzarOrder = tipo`; por producto: `sku`, `cantidad = qty`, `condicion = motivoDevolucion`; `infoCliente` vacío.
  3. `SetOrderAsync(…, "return")` va directo a la devolución, sin revisión de duplicado, precios, existencias ni BP (`OrderMethods.cs:1717-1720`).
  4. Busca el pedido original en SD36 con `ZSD_ZMER_{incrementId}`; si no existe, error (`OrderMethods.cs:1605-1613`).
  5. Toma el cliente (BP) y el número del pedido original; sin cliente, error (`OrderMethods.cs:1615-1622`).
  6. Copia al pedido: `cuenta` = BP del original, `refDoc` = número del pedido original, `refDocCat` = "C", `pmnttrms` = condición del original (`OrderMethods.cs:1627-1631`).
  7. Toma el precio unitario de cada SKU de las posiciones del original y recalcula `subTotal` = `total` = Σ precio × cantidad (`OrderMethods.cs:1634-1655`).
  8. Arma el pedido con `BuildSapOrderAsync` en modo devolución (`OrderMethods.cs:1658`) y lo envía por POST con token CSRF (`:1661-1685`).
  9. Revisa la respuesta (no exitosa, vacía o HTML = error) y toma el nodo `d` (`OrderMethods.cs:1690-1710`).
  10. El controlador arma la respuesta corta (`OrderController.cs:86-94`).
- **Reglas de negocio:**
  - RDEV-1: El pedido original siempre se busca como `ZSD_ZMER_{incrementId}`, sin importar `tipo` (`OrderMethods.cs:1605`).
  - RDEV-2: El cliente de la devolución es el BP del pedido original; Magento no lo manda (`OrderMethods.cs:1616`, `:1628`, `:1658`).
  - RDEV-3: Precio de cada posición = `UnitPrice` del original para el mismo material, comparando sin ceros a la izquierda; si no hay coincidencia el precio queda en 0 y la posición se omite del pedido (`OrderMethods.cs:1639-1649`, `:2412-2413`).
  - RDEV-4: Cabecera de devolución: clase `ZDME`, PurchNoC `ZSD_ZDME_{incrementId}`, `CustGrp2` "C03", `Zconcepto` "Devolución", `Zobservaciones` = `motivoCancelacion`, `Zafectacomision` "1", `Zband402` "1", `Zaudat` y `Zembarqueestado` vacíos; movimiento y bitácora con "Devolución" (`OrderMethods.cs:2173-2175`, `:2279`, `:2294-2298`, `:2311`, `:2315`, `:2317`, `:2324`, `:2364`, `:2380`).
  - RDEV-5: Posiciones: tipo "ZSCM"; cada una referencia al pedido original (`RefDoc`, `RefDocCa` "C", `RefDocIt` = número de posición) (`OrderMethods.cs:2407`, `:2433-2435`).
  - RDEV-6: Condición de pago: como el motivo de devolución viaja en `condicion`, se traduce como si fuera condición de pago; al no encontrarse cae en "ACEF" y reemplaza la condición del pedido original. Solo con motivo vacío se conserva la del original (`OrderMethods.cs:2163`, `:2214-2236`, `:3345`). El motivo también va en `Zdescrextra` y en el texto `ZOBS` (`:2437`, `:2499`).
  - RDEV-7: Org. de ventas, centro y oficina salen de `store`: si no contiene "viu" ni "muebles_america" quedan 04 / 2000 / 2000; vacío detiene con "No lleva id de tienda" (`OrderMethods.cs:2149`, `:2193-2194`, `:363-385`).
  - RDEV-8: Canal siempre "01" porque `metodoPago` no se copia; `Zformaenvio` vacío porque `metodoEnvio` no se copia (`OrderMethods.cs:2187-2189`, `:2302-2306`).
- **Fuentes de datos:** SAP SD36 `ZAPI_DOCVTAS_CHECK` por PurchNoC (lectura, `SalesMethods.cs:132-166`); SIGMavi `CondicionesCredVtaLinea` (lectura, `OrderMethods.cs:3320-3338`); SAP servicio de pedidos `ZAPI_SALESORDER_SRV` (escritura POST, `OrderMethods.cs:1663-1685`; la ficha sd09 usa la misma entidad `A_SALES_ORDERSet`).
- **Salida y errores:** 200 `{BP, SalesDocument, Message, Resultado, Status}` con `Status` = `Resultado` o "Concluido" si viene nulo (`OrderController.cs:86-94`). Cualquier error (pedido original inexistente, sin cliente, error o HTML de SAP) → 400 `"Error, Error en SetOrder: {mensaje}"` (`OrderController.cs:96-99`, `OrderMethods.cs:1939-1943`). Registro: `[SAP RMA REQUEST]`, `[SAP RMA RESPONSE]`, `[SAP RMA ERROR]` (`OrderMethods.cs:1683`, `:1688`, `:1692`).
- **Configuración usada:** `ZAPI_SALESORDER_SRV` (`OrderMethods.cs:1664`), `Server` para SIGMavi (`ConexionSQL.cs:79`).
- **Pendientes conocidos** (detectados en `AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md`, sección "Defectos en la ruta de devolución"):
  - La ficha SD09 exige la **factura** en `REF_DOC` y SAP la valida; se manda el número del pedido con categoría "C" (`OrderMethods.cs:1617`, `:1629-1630`; ficha `RSG\sd09_devolucion.md:36`, `:74`).
  - Según la auditoría, `store` llega como "1"/"2" y no se traduce, por lo que caería en org. 04 / centro 2000 (RDEV-7).
  - Una devolución de una venta a crédito se crea en canal "01" (RDEV-8).
  - El campo `resolucion` del producto no se revisa (`OrderMethods.cs:2157-2166`).
  - `to_series` va vacío y SD09 valida series (`OrderMethods.cs:2515-2520`).
  - El precio se lee con `decimal.TryParse` sin cultura fija (`OrderMethods.cs:1644`).
  - El pedido original se busca siempre como ZMER, mientras que la cancelación usa `tipo` (`OrderMethods.cs:1605` contra `:2969-2970`).

---

### GET order/validatecupon/{codigo}  (OrderController.ValidateCupon, OrderController.cs:102-120)

- **Para qué sirve:** Indica si un código es un cupón vigente o un código de promotor válido (`OrderMethods.cs:1013-1155`).
- **Quién la llama:** Ninguna ruta DMZ apunta aquí en el tracker; la más cercana es `credit/codigoPromocion` (línea 7, "To Do", sin ruta de ServicioSAP), que ACT-35 pide retirar. Los cupones están deprecados: la quema del cupón se quitó del crédito (DU16) y este método se conserva solo para esta ruta.
- **Entrada:** `codigo` (string, en la ruta). Obligatorio.
- **Cómo funciona (paso a paso):**
  1. Código vacío o en blanco: 400 "Código vacío" (`OrderController.cs:106-109`).
  2. Llama `HandlePromoCodeAsync(codigo, null, "ValidarCupon")` (`OrderController.cs:113`).
  3. Busca en SIGMavi un cupón con ese código que no se haya usado (`OrderMethods.cs:1023-1036`).
  4. Si no lo encuentra, busca un empleado con ese id en SuccessFactors y compara su departamento y puesto con el catálogo "Código de promotor" (`OrderMethods.cs:1038-1068`).
  5. Responde "OK" o "NO_VALIDO" (`OrderMethods.cs:1070-1073`).
- **Reglas de negocio:**
  - RCUP-1: Cupón válido = existe en `VentasCupones` con `FechaUtilizacion` nula (`OrderMethods.cs:1026-1034`).
  - RCUP-2: Promotor válido = el primer empleado devuelto tiene (departamento, puesto) igual a (`Valor1`, `Valor2`) de alguna fila del catálogo, sin distinguir mayúsculas (`OrderMethods.cs:1046-1061`).
  - RCUP-3: Un error al consultar SuccessFactors o el catálogo "Código de promotor" se ignora (solo va a consola) y el código queda como no válido (`OrderMethods.cs:1042-1067`).
  - RCUP-4: Un error de SIGMavi (conexión o consulta de `VentasCupones`) devuelve "err" (`OrderMethods.cs:1024-1036`, `:1150-1154`).
  - RCUP-5: Solo valida: no marca el cupón como usado ni genera uno nuevo. La rama "Elimina" (quema y regeneración, `OrderMethods.cs:1075-1146`) no tiene llamador; la única llamada es esta ruta con "ValidarCupon" (`OrderController.cs:113`).
- **Fuentes de datos:** SIGMavi `VentasCupones` (antes `VTASCVentaCupon`, renombrada; DU9) (lectura, `OrderMethods.cs:1024-1035`); API Android `employees/get_personalById?user_id={codigo}&status=0&centro=` (lectura, `BusinessPartnerMethods.cs:342-374`); API de configuraciones en AWS `AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=Código de promotor` (lectura, `ProductMethods.cs:708-735`).
- **Salida y errores:** 200 `{status: "OK" | "NO_VALIDO" | "err"}` (`OrderController.cs:114`); 400 "Código vacío" o `"Error, {mensaje}"` si algo falla fuera del método (`OrderController.cs:116-119`).
- **Configuración usada:** `URL_ANDROID_API` (`BusinessPartnerMethods.cs:344`, `Web.config:28`), `AwsBaseUrl` (`ProductMethods.cs:28`, `Web.config:27`), `Server` para SIGMavi (`ConexionSQL.cs:79`). La rama sin uso leería `URL_BP_API` (`OrderMethods.cs:1091`).
- **Pendientes conocidos:** Cupones deprecados: avisar a Magento para retirar la casilla de promotor (ACT-35 punto 2). Código muerto de la rama "Elimina" (`OrderMethods.cs:1075-1146`). El código se pega en la URL de SuccessFactors sin codificar (`BusinessPartnerMethods.cs:350`).

---

### GET order/checkDocument/{purchNoC}  (OrderController.CheckDocumentExistsSD36, OrderController.cs:122-140)

- **Para qué sirve:** Consulta en SAP los documentos de venta que tienen ese folio PurchNoC (`SalesMethods.cs:132-166`).
- **Quién la llama:** No aparece en el tracker (consulta de apoyo).
- **Entrada:** `purchNoC` (string, en la ruta): el folio completo, por ejemplo `ZSD_ZMER_{incrementId}`; se usa tal cual. Obligatorio.
- **Cómo funciona (paso a paso):**
  1. Vacío o en blanco: 400 (`OrderController.cs:126-129`).
  2. Consulta SD36 filtrando por `PurchNoC` y expandiendo posiciones y tablas Z (`SalesMethods.cs:136-139`).
  3. Devuelve la lista (`OrderController.cs:133-134`).
- **Reglas de negocio:**
  - RDOC-1: Filtro exacto por `PurchNoC`; el filtro se codifica para la URL, pero un apóstrofo no se duplica (`SalesMethods.cs:136-138`).
  - RDOC-2: Una respuesta no exitosa o vacía de SAP es error (`SalesMethods.cs:151-154`).
- **Fuentes de datos:** SAP SD36 `ZAPI_DOCVTAS_CHECK_CDS/ZAPI_DOCVTAS_CHECK`, `$expand=to_salesdoc_items,to_zsdt_vbak,to_zsdt_vbap` (lectura, `SalesMethods.cs:139`).
- **Salida y errores:** 200 con un arreglo de documentos `SaleD` (vacío si no hay) (`OrderController.cs:134`). Los campos salen con los nombres de C# y no con los de SAP: por ejemplo `DocumentNumber`, `SalesOrganization` y `PaymentCondition` en lugar de `DocNumber`, `SalesOrg` y `Pmnttrms`, porque los nombres de SAP solo se usan al leer (`SaleD.cs:17-18`, `:38-39`, `:52-53`; el proyecto no configura otro formato de salida, `WebApiConfig.cs:11-23`); 400 "El parámetro purchNoC es requerido." o `"Error, Ocurrio un error al intentar obtener el documento por PurchNoC de SAP SD36: …"` (`OrderController.cs:128`, `:136-139`; `SalesMethods.cs:162-165`).
- **Configuración usada:** ninguna llave; la URL sale de `Conexion.dll` (`SalesMethods.cs:139`).
- **Pendientes conocidos:** ninguno en el código.

---

### POST order/cancelOrder  (OrderController.CancelOrder, OrderController.cs:143-174)

- **Para qué sirve:** Cancela un pedido ya surtido: anula su factura (SD48) y revierte la salida de mercancía de su entrega (SD46) (`OrderMethods.cs:2961-3066`).
- **Quién la llama:** DMZ `order/cancelOrder` (tracker línea 78, "SD46 - Endpoint SAP existe faltan escenarios delivery").
- **Entrada:** `OrderRMA` (`OrderRequest.cs:57-69`): `incrementId` (string, obligatorio; puede venir ya como `ZSD_…`), `tipo` (string, clase de documento; por defecto "ZMER"), `dateTime` (string, fecha del movimiento de mercancía; opcional). `store`, `motivoCancelacion` y `producto` no se usan.
- **Cómo funciona (paso a paso):**
  1. Sin cuerpo o sin `incrementId`: 400 "La orden y su incrementId son requeridos." (`OrderController.cs:147-150`).
  2. Arma el PurchNoC (`OrderMethods.cs:2966-2971`).
  3. Busca el pedido en SD36; si no existe responde "noexiste" (`OrderMethods.cs:2974-2980`).
  4. Busca la entrega del pedido; si no tiene, falla de forma explícita sin cancelar nada (`OrderMethods.cs:2984-3017`).
  5. Busca la factura de la entrega; si no la encuentra sigue sin ella (`OrderMethods.cs:3020-3028`).
  6. Si hay factura, la anula (SD48); si la anulación falla, sigue (`OrderMethods.cs:3031-3044`).
  7. Revierte la salida de mercancía (SD46); si falla, error (`OrderMethods.cs:3047-3056`).
  8. Responde "ok" (`OrderMethods.cs:3059`, `OrderController.cs:167-168`).
- **Reglas de negocio:**
  - RCAN-1: PurchNoC: si `incrementId` ya empieza con "ZSD_" se usa tal cual; si no, `ZSD_{tipo o "ZMER"}_{incrementId}` (`OrderMethods.cs:2966-2971`).
  - RCAN-2: Pedido inexistente en SAP → "noexiste" (HTTP 200) (`OrderMethods.cs:2976-2980`).
  - RCAN-3: Pedido sin entrega → error "El pedido {número} no tiene entrega y la anulacion del pedido de ventas (ZIDSTATUS=03) aun no esta implementada. No se cancelo nada en SAP." (texto literal, sin acentos) y registro `[CANCEL ORDER SIN ENTREGA]`. Cuenta como "sin entrega" tanto que la consulta de entregas no traiga filas como que no traiga el número de entrega; cualquier otro error de SAP (por ejemplo 401 o 500) se propaga tal cual (`OrderMethods.cs:3001-3007`, `:3247-3262`). Antes se respondía "ok" sin hacer nada, lo que hacía que Magento marcara cancelado un pedido vivo (auditoría C02) (`OrderMethods.cs:2989-3017`).
  - RCAN-4: Se usa la primera entrega que referencia al pedido; el número de pedido se rellena con ceros a 10 dígitos (`OrderMethods.cs:3215-3245`).
  - RCAN-5: Se usa la primera factura que referencia a la entrega; si la búsqueda falla se trata como "sin factura" (`OrderMethods.cs:3268-3305`).
  - RCAN-6: La factura se anula antes de revertir la mercancía; un error al anularla (por ejemplo, ya estaba anulada) se ignora (`OrderMethods.cs:3031-3044`).
  - RCAN-7: La fecha del movimiento es `dateTime` si se puede leer como fecha; si no, la fecha y hora actuales, con formato `yyyy-MM-ddTHH:mm:ss` (`OrderMethods.cs:3073-3080`).
  - RCAN-8: El contrato de respuesta es una cadena ("ok" / "noexiste"), igual que el sistema anterior: la DMZ recorta comillas y compara el texto. Devolver un objeto provocaba 500 en todas las cancelaciones (auditoría C01) (`OrderController.cs:155-160`).
  - RCAN-9: Se usa la cadena completa SD48 + SD46 en lugar de solo revertir la mercancía (`OrderController.cs:161-166`).
- **Fuentes de datos:** SAP SD36 `ZAPI_DOCVTAS_CHECK` (lectura, `SalesMethods.cs:132-166`); SAP `API_OUTBOUND_DELIVERY_SRV;v=2` `A_OutbDeliveryItem`, `$filter=ReferenceSDDocument eq '{pedido}'`, `$select=DeliveryDocument` (lectura, `OrderMethods.cs:3213-3216`); SAP `API_BILLING_DOCUMENT_SRV` `A_BillingDocumentItem`, `$filter=ReferenceSDDocument eq '{entrega}'`, `$select=BillingDocument` (lectura, `OrderMethods.cs:3267-3269`); SD48 `API_BILLING_DOCUMENT_SRV/Cancel?BillingDocument='…'` (escritura POST, `OrderMethods.cs:3105-3129`); SD46 `API_OUTBOUND_DELIVERY_SRV;v=2/ReverseGoodsIssue?DeliveryDocument='…'&ActualGoodsMovementDate=datetime'…'` (escritura POST, `OrderMethods.cs:3068-3103`).
- **Salida y errores:** 200 `"ok"` | 200 `"noexiste"` | 400 "La orden y su incrementId son requeridos." | 400 `"Error, {mensaje}"` (sin entrega, error de SAP al buscar la entrega o al revertir la mercancía) (`OrderController.cs:147-150`, `:167-173`). Registro `[CANCEL ORDER SIN ENTREGA]` (`OrderMethods.cs:3003`, `:3014`); el resto de los avisos solo va a consola.
- **Configuración usada:** ninguna llave; las URLs salen de `Conexion.dll` (`OrderMethods.cs:3070`, `:3107`, `:3213`, `:3267`).
- **Pendientes conocidos:**
  - Cancelar un pedido aún sin entrega requiere marcar el pedido con `ZIDSTATUS = 03` (Anulado), y la API para hacerlo está pendiente de definir con SAP (`OrderMethods.cs:2995-3000`).
  - Si la anulación de la factura falla pero la reversión de mercancía sale bien, responde "ok" con la factura viva (`OrderMethods.cs:3038-3043`, `:3059`).
  - Si se anuló la factura y luego falla SD46, responde error con la factura ya anulada (`OrderMethods.cs:3036`, `:3051-3056`).
  - Decisión de negocio pendiente: qué hacer con un pedido ya facturado (anulación o devolución) (auditoría C02).

---

### POST order/cancelInvoice  (OrderController.CancelInvoice, OrderController.cs:176-195)

- **Para qué sirve:** Anula solo la factura (SD48) de un pedido, sin tocar la mercancía (`OrderMethods.cs:114-189`).
- **Quién la llama:** DMZ `order/getPosCancellations` (tracker línea 81: no conectada, "SD48 - DEPRECADO pero endpoint SAP existe").
- **Entrada:** `OrderRMA`: `incrementId` (string, obligatorio) y `tipo` (string, opcional; por defecto "ZMER").
- **Cómo funciona (paso a paso):**
  1. Sin cuerpo o sin `incrementId`: 400 (`OrderController.cs:180-183`).
  2. Arma el PurchNoC igual que la cancelación (`OrderMethods.cs:117-122`).
  3. Busca el pedido en SD36; si no existe, error (`OrderMethods.cs:125-130`).
  4. Busca la entrega; si no hay, error (`OrderMethods.cs:134-138`).
  5. Busca la factura de la entrega; si no hay, error (`OrderMethods.cs:153-157`).
  6. Pide token CSRF y hace POST a `Cancel` (`OrderMethods.cs:160-178`).
  7. Devuelve la respuesta de SAP (`OrderMethods.cs:180-181`).
- **Reglas de negocio:**
  - RFAC-1: Mismo PurchNoC que la cancelación: `ZSD_{tipo o "ZMER"}_{incrementId}` si no viene con prefijo (`OrderMethods.cs:117-122`).
  - RFAC-2: La factura se encuentra solo a través de la entrega; un pedido sin entrega no se puede anular por aquí (`OrderMethods.cs:134-138`, `:153-157`).
  - RFAC-3: Una respuesta no exitosa de SAP es error (`OrderMethods.cs:175-178`).
- **Fuentes de datos:** SD36 (lectura); `A_OutbDeliveryItem` (lectura); `A_BillingDocumentItem` (lectura); SD48 `API_BILLING_DOCUMENT_SRV/Cancel` (escritura POST) (`OrderMethods.cs:125`, `:134`, `:153`, `:160`).
- **Salida y errores:** 200 `{d: {BillingDocument, RETURN: {Type, Id, Message}}}`: SAP manda `TYPE`, `ID` y `MESSAGE`, pero ServicioSAP responde con los nombres de C# (`Response.cs:199-224`; sin formato de salida configurado, `WebApiConfig.cs:11-23`). ServicioSAP no revisa `RETURN.Type`: un rechazo de negocio que SAP devuelva con estado HTTP exitoso también llega como 200 (`OrderMethods.cs:175-181`); 400 "La orden y su incrementId son requeridos." o `"Error, {mensaje}"` (pedido, entrega o factura no encontrados, o error de SAP) (`OrderController.cs:180-194`).
- **Configuración usada:** ninguna llave (`Conexion.dll`, `OrderMethods.cs:149`).
- **Pendientes conocidos:** Marcada como deprecada en el tracker, aunque el endpoint existe (CSV línea 81).

---

### POST order/getGuide  (OrderController.GetGuideWithName, OrderController.cs:215-238)

- **Para qué sirve:** Devuelve el nombre del cliente que va en la guía de envío de un pedido (`OrderMethods.cs:563-579`).
- **Quién la llama:** DMZ `order/getGuide` (tracker línea 88, "Migrado").
- **Entrada:** `GuidesRequest` (`GuideModels.cs:6-9`): `IdEcommerce` (string, el `incrementId`).
- **Cómo funciona (paso a paso):**
  1. Cuerpo nulo: 400 (`OrderController.cs:219-220`).
  2. `IdEcommerce` = "" (cadena vacía): 404 (`OrderController.cs:222-223`).
  3. Lee en SQLite `servicio_guias` con consulta parametrizada (`OrderMethods.cs:565-569`).
  4. Sin fila: el método devuelve nulo y el controlador lanza 404, que el `catch` convierte en 500 (`OrderController.cs:229-237`).
  5. Con fila: responde `{IdEcommerce, FullName}` (`OrderMethods.cs:573-578`, `OrderController.cs:232`).
- **Reglas de negocio:**
  - RGUI-1: Se busca por `idecommerce` exacto y se toma la primera fila (`OrderMethods.cs:566`, `:573`).
  - RGUI-2: El dato lo escribe `order/new` (contado y crédito) con el nombre en mayúsculas (`OrderMethods.cs:1776`, `:1828`).
  - RGUI-3: Se conservan a propósito tres rarezas del sistema anterior: responde con `Json(…)`; "no encontrada" y "falló la consulta" salen ambas como 500; `IdEcommerce` nulo no se valida y revienta fuera del `try` con 500 (`OrderController.cs:201-210`).
- **Fuentes de datos:** SQLite `data.db`, tabla `servicio_guias` (lectura parametrizada, que sí propaga errores) (`OrderMethods.cs:565-569`; `SQLiteDb.cs:240-269`).
- **Salida y errores:** 200 `{IdEcommerce, FullName}`; 400 cuerpo nulo; 404 `IdEcommerce` vacío; 500 `IdEcommerce` nulo, guía no encontrada o error de SQLite (`OrderController.cs:219-237`).
- **Configuración usada:** `SQLITE_DB_PATH` (`SQLiteDb.cs:18-21`).
- **Pendientes conocidos:** ninguno en el código; las rarezas de estado HTTP son intencionales (RGUI-3).

---

### GET order/generateNewStorepickupCode/{idEcommerce}  (OrderController.GenerateNewStorepickupCode, OrderController.cs:240-258)

- **Para qué sirve:** Genera una clave nueva para recoger en sucursal un pedido que ya tiene registro, la guarda y la manda por correo al cliente (`StorePickupMethods.cs:185-254`).
- **Quién la llama:** Ruta LAN-only `order/generateNewStorepickupCode/{idE}` (tracker línea 120, marcada "DEPRECADO"; el tracker la anota como POST, el código acepta GET).
- **Entrada:** `idEcommerce` (string, en la ruta). Obligatorio.
- **Cómo funciona (paso a paso):**
  1. Vacío o en blanco: 404 (`OrderController.cs:244-245`).
  2. Si el pedido no tiene fila en `BpRecogePedidos`, responde que no pertenece a recoger en sucursal (`StorePickupMethods.cs:187-191`).
  3. Genera la clave (`StorePickupMethods.cs:193`, `:128-167`) y la guarda; si no se pudo guardar, se detiene sin mandar correo (`:194-199`).
  4. Lee correo y nombre del registro (`StorePickupMethods.cs:202-219`).
  5. Si hay correo: busca el pedido en SD36 para saber la tienda y manda el correo de la marca (`StorePickupMethods.cs:221-251`).
  6. Responde la clave (`StorePickupMethods.cs:253`).
- **Reglas de negocio:**
  - RRSN-1: Solo aplica a pedidos que ya están en `BpRecogePedidos` (`StorePickupMethods.cs:187-191`, `:52-69`).
  - RRSN-2: Clave = hash CRC en hexadecimal mayúsculas del `idEcommerce` más la fecha y hora al segundo; se reintenta mientras ya exista en otro pedido. Los tres primeros reintentos recalculan el hash; a partir del cuarto agrega 2 caracteres aleatorios (A-Z, 0-9), quitando antes los 2 últimos si la clave mide más de 8; pasadas 20 vueltas acepta la clave aunque esté repetida; la constante `F41LH4SH00` solo se usaría si la clave quedara vacía (`StorePickupMethods.cs:122-182`).
  - RRSN-3: La clave nueva sustituye a la anterior; un error al guardar devuelve "Falla al guardar código en DB, se detuvo envío de correo" (`StorePickupMethods.cs:93-120`, `:194-199`).
  - RRSN-4: Sin correo registrado no se manda correo, pero la clave sí cambia (`StorePickupMethods.cs:221`).
  - RRSN-5: Tienda del correo: org. de ventas 05 → VIU (UEN 2), 04 → Muebles América (UEN 1); si SD36 no encuentra el pedido o no trae org., responde error y no manda correo (la clave ya quedó cambiada) (`StorePickupMethods.cs:226-247`).
  - RRSN-6: El correo lleva nombre, número de pedido y clave, con el logotipo y enlaces de la marca; se envía al cliente y también al buzón de venta en línea de la marca (ambos como destinatarios); si el envío falla se ignora (`MailHelper.cs:28-61`, `:72-75`, `:135-141`, `:149-157`).
- **Fuentes de datos:** SIGMavi `BpRecogePedidos` (lectura y `UPDATE` de `ClaveVenta`) (`StorePickupMethods.cs:52-120`, `:202-219`); SAP SD36 buscando `PurchNoC` = `idEcommerce` tal cual (lectura, `StorePickupMethods.cs:226`); servidor de correo SMTP (puerto 587) (`MailHelper.cs:122-160`).
- **Salida y errores:** Siempre una cadena con JSON dentro (no un objeto): `{"estado":"Código generado correctamente", "clave":"…"}`, `{"estado":"La orden enviada no pertenece a Recoge en Sucursal"}`, `{"estado":"Falla al guardar código en DB, …"}`, `{"estado":"Error: No se encontró la orden en SAP SD36 …"}` o `{"estado":"Error al consultar SD36: …"}`, todas con 200 (`OrderController.cs:250-251`). 404 si falta `idEcommerce`; otra excepción → registro `[ORDER generateNewStorepickupCode ERROR]` y 400 `"Error, {mensaje}"` (`OrderController.cs:253-257`).
- **Configuración usada:** `Server` para SIGMavi (`ConexionSQL.cs:79`). Los datos del servidor de correo están escritos en el código, no en el Web.config (`MailHelper.cs:113-117`).
- **Pendientes conocidos:**
  - SD36 se consulta con el `idEcommerce` sin el prefijo `ZSD_ZMER_` que usa `order/new` (`StorePickupMethods.cs:226` contra `OrderMethods.cs:2279`): si llega solo el número, no encontrará el pedido.
  - Credenciales SMTP en el código, marcadas FIXME para moverlas al Web.config (`MailHelper.cs:113-117`). El envío va sin SSL: la línea `EnableSsl` está comentada como en el sistema anterior (`MailHelper.cs:147`).
  - Ruta marcada como deprecada en el tracker (CSV línea 120).

---

### GET order/createStorepickupCode/{idEcommerce}/{idOrder}  (OrderController.CreateStorepickupCode, OrderController.cs:260-278)

- **Para qué sirve:** Crea (o renueva) la clave para recoger en sucursal, guarda los datos de contacto del cliente y avisa a Magento que el pedido ya puede recogerse (`StorePickupMethods.cs:256-358`).
- **Quién la llama:** Ruta LAN-only `order/createStorepickupCode/{idE}/{idO}` (tracker línea 119; el tracker la anota como POST, el código acepta GET).
- **Entrada:** `idEcommerce` (string, folio del pedido) e `idOrder` (string, id de la orden en Magento), ambos en la ruta y obligatorios.
- **Cómo funciona (paso a paso):**
  1. Falta alguno: 400 "Faltan parámetros" (`OrderController.cs:264-265`).
  2. Revisa si ya hay registro y genera la clave (misma regla que RRSN-2) (`StorePickupMethods.cs:258-259`).
  3. Busca el pedido en SD36 y el cliente en BP05 para obtener correo, teléfono y nombre; si falla, sigue con datos vacíos (`StorePickupMethods.cs:262-291`).
  4. Inserta o actualiza la fila en `BpRecogePedidos` (`StorePickupMethods.cs:293-325`).
  5. Avisa a Magento por la DMZ: cambia el estatus del pedido y pide el correo de "listo para recoger" (`StorePickupMethods.cs:327-350`).
  6. Responde la clave (`StorePickupMethods.cs:357`).
- **Reglas de negocio:**
  - RRSC-1: Datos de contacto desde SAP: correo = `Mail`; teléfono = `TelefonoMovil`, o `Telefono` solo si aquel viene nulo (un móvil vacío no cae al otro); nombre = `Nombre` o, si viene nulo, "PrimerNombre PrimerApellido" (`StorePickupMethods.cs:272-274`).
  - RRSC-2: Si falla SD36 o BP05 se registra `[ORDER CreateCodeAndNotifyAsync SAP Extractor ERROR]` y se guarda la fila con datos vacíos (`StorePickupMethods.cs:288-291`). Si SD36 no encuentra el pedido o no trae cliente, también se guardan vacíos, sin registro (`:266`).
  - RRSC-3: Sin registro previo se inserta (IdEcommerce, Nombre, Correo, Telefono, ClaveVenta); con registro se actualizan los cuatro datos (`StorePickupMethods.cs:296-324`).
  - RRSC-4: Aviso a Magento: `order/setOrderStatus` con `{orders:[{order_id: idOrder, status: "store_pickup", comment: "Puede recoger producto en la tienda: {clave}", source_code: "mavi_cd", products: []}]}` y después `order/sendStorePickupEmail` con `{orderId: idOrder}` (`StorePickupMethods.cs:331-349`). El correo lo envía Magento, no ServicioSAP.
  - RRSC-5: Si la DMZ falla tras sus 3 intentos, la clave queda guardada, se registra `[ORDER CreateCodeAndNotifyAsync Magento ERROR]` y se responde "Código generado correctamente, pero falló la notificación a Magento: …" (sin la clave) (`StorePickupMethods.cs:351-355`; `Curl.cs:71-105`). Si falla el primer aviso, el segundo (correo) no se intenta (`StorePickupMethods.cs:346-349`).
- **Fuentes de datos:** SAP SD36 con `PurchNoC` = `idEcommerce` tal cual (lectura, `StorePickupMethods.cs:264`); SAP BP05 `ZB_DATOS_CLIENTE` (lectura, `StorePickupMethods.cs:269`); SIGMavi `BpRecogePedidos` (`INSERT`/`UPDATE`, `StorePickupMethods.cs:293-325`); DMZ `order/setOrderStatus` y `order/sendStorePickupEmail` (POST, `StorePickupMethods.cs:346`, `:349`).
- **Salida y errores:** 200 con una cadena JSON `{"estado":"Código generado correctamente", "clave":"…"}` o la variante de falla de notificación (`OrderController.cs:270-271`); 400 "Faltan parámetros"; error de SIGMavi u otra excepción → registro `[ORDER createStorepickupCode ERROR]` y 500 (`OrderController.cs:273-277`).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ` (`Curl.cs:21-22`), `Server` para SIGMavi (`ConexionSQL.cs:79`).
- **Pendientes conocidos:**
  - Igual que la ruta anterior, SD36 se consulta sin el prefijo `ZSD_ZMER_` (`StorePickupMethods.cs:264`).
  - La consulta de direcciones del BP cuando faltan correo o teléfono descarta su resultado (`StorePickupMethods.cs:276-284`).
  - El tracker anota POST y el código es GET (CSV línea 119).
  - El tracker pide además la tabla de detalle de pedidos de ecommerce, pendiente de crear (CSV línea 119).

---

### POST order/GetPickUpCode  (OrderController.GetPickUpCode, OrderController.cs:282-306)

- **Para qué sirve:** Devuelve la clave con la que el cliente recoge su pedido en sucursal (`StorePickupMethods.cs:27-49`).
- **Quién la llama:** DMZ `order/GetPickUpCode` (tracker línea 85, anotada "To Do", no conectada).
- **Entrada:** `StoreReadyPickupRequest` (`StorePickupModels.cs:4-7`): `IdEcommerce` (string).
- **Cómo funciona (paso a paso):**
  1. `IdEcommerce` nulo: 404 (`OrderController.cs:288-289`).
  2. Lee `ClaveVenta` en SIGMavi `BpRecogePedidos` (`StorePickupMethods.cs:33-45`).
  3. Sin fila (clave vacía): 404 (`OrderController.cs:294-295`).
  4. Con clave: responde `{PickupCode}` (`OrderController.cs:297-300`).
- **Reglas de negocio:**
  - RRSL-1: Se toma la primera fila del pedido (`StorePickupMethods.cs:42-45`).
  - RRSL-2: La tabla `BpRecogePedidos` de SIGMavi sustituye a la tabla del sistema anterior con las mismas columnas (`StorePickupMethods.cs:14-19`).
- **Fuentes de datos:** SIGMavi `BpRecogePedidos` (lectura, `StorePickupMethods.cs:29-48`).
- **Salida y errores:** 200 `{PickupCode: "…"}`; 404 sin `IdEcommerce` o sin clave; cuerpo nulo o error de SIGMavi → 400 con el mensaje de la excepción (`OrderController.cs:286-305`).
- **Configuración usada:** `Server` para SIGMavi (`ConexionSQL.cs:79`).
- **Pendientes conocidos:** En el tracker sigue como "To Do" aunque la ruta ya existe (CSV línea 85).

---

### GET order/getCondicion/{storeId}/{condicionMagento}  (OrderController.GetCondicion, OrderController.cs:309-329)

- **Para qué sirve:** Traduce la condición de pago que manda Magento (por ejemplo "12 M MA P INM") al código de SAP de 4 caracteres (por ejemplo "12IA") (`OrderMethods.cs:3314-3346`).
- **Quién la llama:** No aparece en el tracker. La misma traducción se usa al armar cada pedido (RORD-20) y en el crédito.
- **Entrada:** `storeId` (string, "viu" o "muebles_america") y `condicionMagento` (string), ambos en la ruta y obligatorios.
- **Cómo funciona (paso a paso):**
  1. Falta alguno: 400 (`OrderController.cs:313-317`).
  2. Busca la condición en SIGMavi por condición de Magento y tienda (`OrderMethods.cs:3320-3337`).
  3. Si no hay fila o falla la consulta, usa el catálogo en memoria (`OrderMethods.cs:3340-3345`).
  4. Responde el código (`OrderController.cs:321-322`).
- **Reglas de negocio:**
  - RCON-1: Primero SIGMavi: `SELECT TOP 1 Condicion FROM CondicionesCredVtaLinea WHERE CondicionMagento = @CondicionMagento AND REPLACE(TiendaVirtual, ' ', '_') = @StoreId` (`OrderMethods.cs:3322-3324`). `TiendaVirtual` guarda "VIU" o "Muebles America"; la comparación con "viu"/"muebles_america" depende de que la base no distinga mayúsculas (`OrderMethods.cs:3312-3313`).
  - RCON-2: Respaldo: catálogo en memoria `PaymentConditionCatalog` (sin distinguir mayúsculas, recortando espacios) (`PaymentConditionCatalog.cs:8-138`).
  - RCON-3: Si tampoco está en el catálogo, responde "ACEF" (contado MA); esta ruta nunca responde vacío (`OrderMethods.cs:3314`, `:3345`).
  - RCON-4: Un error de SIGMavi se registra como `[ORDER GetCondicion ERROR]` y se usa el catálogo (`OrderMethods.cs:3340-3343`).
- **Fuentes de datos:** SIGMavi `CondicionesCredVtaLinea` (lectura); catálogo en memoria (`OrderMethods.cs:3318-3345`).
- **Salida y errores:** 200 con el código como cadena JSON (por ejemplo `"12IA"`); 400 "El parámetro condicionMagento es requerido." / "El parámetro storeId es requerido." / `"Error, {mensaje}"` (registro `[ORDER getCondicion ERROR]`) (`OrderController.cs:313-328`).
- **Configuración usada:** `Server` para SIGMavi (`ConexionSQL.cs:79`).
- **Pendientes conocidos:** ninguno en el código.

---

### Reglas comunes del área

- RCOM-1: **Autenticación.** Todas las rutas de `order/…` exigen un token JWT (`[Authorize]`, `OrderController.cs:12`). El manejador global `TokenValidationHandler` (`WebApiConfig.cs:17`) valida el token cuando llega la cabecera `Authorization`: si es inválido o vencido responde 401, y ante otro error, 500. Si la cabecera no llega, deja pasar la petición y es el atributo `[Authorize]` el que responde 401 (`TokenValidationHandler.cs:39-79`). Las llaves `JWT_SECRET_KEY`, `JWT_AUDIENCE_TOKEN` y `JWT_ISSUER_TOKEN` configuran esa validación (`TokenValidationHandler.cs:47-49`, `Web.config:31-33`).
- RCOM-2: **Conexión a S/4HANA.** URL base y usuario de servicio salen de `Conexion.dll` con el nodo de desarrollo (los valores de ambiente son de Dev por decisión del equipo); autenticación Basic, `sap-client=110`, sin validar el certificado del servidor; cada POST pide antes un token CSRF (`TokenGenerator.cs:60-82`, `:113-171`).
- RCOM-3: **Bases SQL.** SIGMavi se abre con `Conexion.dll` y el alias `Server` del Web.config (DU19, `ConexionSQL.cs:72-98`, `Web.config:159`); la base Android usa la cadena `MAVICBOSANDROID` del Web.config (DU1, `ConexionSQL.cs:100-129`; solo la usa la rama de crédito).
- RCOM-4: **SQLite.** Archivo `data.db` en `SQLITE_DB_PATH` o, si falta, en la carpeta por defecto del sitio (`SQLiteDb.cs:11-21`). Las escrituras ignoran errores (`SQLiteDb.cs:158-176`); la lectura parametrizada sí los propaga (`:240-269`). Las inserciones se arman como texto con las comillas simples duplicadas (`OrderMethods.cs:324-327`).
- RCOM-5: **Folio PurchNoC.** Un pedido de ecommerce se identifica en SAP como `ZSD_{clase}_{incrementId}`: `order/new` lo escribe (`OrderMethods.cs:2279`); duplicados, cancelaciones y devoluciones lo buscan en SD36 (`:1739`, `:2966-2971`, `:117-122`, `:1605`).
- RCOM-6: **Llamadas a la DMZ.** `Curl` usa `URL_DMZ` y `USER_DMZ`: pide token en `login/authenticate`, lo manda como Bearer, espera hasta 30 segundos, hace 3 intentos con esperas de 2 y 4 segundos y no valida el certificado (`Curl.cs:19-105`). El aviso `setCAccount` de `order/new` repite esa lógica en su propio método (`OrderMethods.cs:1270-1333`).
- RCOM-7: **Bitácora.** `Logger.SAP` escribe en el archivo de log del servidor (si existe la carpeta) y en `Logs\sap.log` de la aplicación (`Logger.cs:8-45`). Los mensajes de `Console.WriteLine` no se guardan en ningún archivo.
- RCOM-8: **Traducción de condición de pago.** Un solo método, `GetCondicionAsync`, sirve a `getCondicion`, al armado de pedidos y devoluciones y al crédito (`OrderMethods.cs:3314-3346`).
- RCOM-9: **Respuesta de SAP al crear pedidos.** El nodo `to_return` se acepta tanto como arreglo directo como objeto con `results` (`Response.cs:122-170`).

### Código del área sin ruta (de apoyo o pendiente)

- `OrderStatusMethods.SetOrderStatusAsync` (E-28): arma `{"orders":[…]}` sin campos nulos y lo manda a la DMZ `order/setOrderStatus`, con registro `[ORDER setOrderStatus]`; tiene una variante corta (id, estatus, comentario) pensada para Openpay; hoy nadie llama a ninguna de las dos (`OrderStatusMethods.cs:20-63`). `createStorepickupCode` arma su propio cuerpo (`StorePickupMethods.cs:331-346`).
- `MagentoOrderMethods.SetCAccountAsync` (E-30): manda `{incrementId, cAccount}` a la DMZ `order/setCAccount` y, si falla, registra `[ORDER setCAccount ERROR]` y devuelve el texto del error en vez de lanzarlo; hoy nadie lo llama (`MagentoOrderMethods.cs:19-39`). `order/new` usa `CallSetCAccountCallbackAsync` (`OrderMethods.cs:1270-1333`).
- `ReverseGoodsIssueAsync`: solo SD46 y exige entrega; sustituido por `FullCancelAsync` en `cancelOrder` (`OrderMethods.cs:3135-3208`, `OrderController.cs:161-166`).
- Sin llamador: `ValidarOrdenCompleta`/`ValidateOrderRequest` (`OrderMethods.cs:387-405`, `:2526-2533`), `LogOrderCreatedInSap` (`:1343-1356`), `afectar` (`:1527-1543`), `TotalArticulos`, `ObtenerTotalDescuentos`, `SepararDatos`, `EscapeSapFilterValue` (`:298-302`, `:422-440`, `:2951-2954`). `LiberateClientCredit` y `CallMagentoAuthorizationCallbackAsync` pertenecen al crédito (pendiente T18; ver Crédito web) (`:1160-1265`).

---

## Órdenes a crédito (rama omnipro_pago_credito de order/new)

**Qué hace en el negocio.** Cuando un cliente compra en la tienda web "a crédito" (método de pago `omnipro_pago_credito`), ServicioSAP **no crea un pedido en SAP**. Lo que hace es registrar una **solicitud de crédito web** en la base ServicioAndroid (conexión `MAVICBOSANDROID` del `Web.config`): una fila de cabecera en `CRED_SOLICITUD_WEB_DATOS_TEMP` (59 columnas, el mismo INSERT que hacía el SP de LAN `SP_CREDITO_WEB_DATOS`) y una fila por artículo en `VTASdArtCreditoWeb`, con el precio y el abono que da SAP (SD29). Después, el área de crédito analiza la solicitud. El envío al "liberador" (servicio que pone la solicitud en análisis) y el aviso del resultado a Magento existen en el código pero están apagados, porque el liberador lo está desarrollando otro equipo (decisión DU11). La regla que guía todo el flujo es la **paridad de valores con LAN**: cada columna guarda lo mismo que guardaban LAN y sus SP, usando como fuente el equivalente en SAP (DU5).

**Términos que se usan en esta sección.**
- **BP** (Business Partner): el cliente en SAP. Magento manda en `infoCliente.cuenta` el número de BP (DU2).
- **OData**: servicio REST de SAP S/4HANA. Aquí se usan BP05 (`ZB_DATOS_CLIENTE_CDS`), BP05MA (`ZAPI_BP05MA_SRV`), CteTelSet (`ZQBP_EDITARCLIENTE_SRV`), SD29 (`ZAPI_PROPRELIST_SRV`, lista de precios) y SD36 (`ZAPI_DOCVTAS_CHECK_CDS`, documentos de venta).
- **Folio** o `idSolicitud`: el número que la base asigna a la cabecera (`SCOPE_IDENTITY`).
- **UEN**: unidad de negocio; 1 = Muebles América (MA), 2 = VIU.
- **Organización de ventas**: 04 = MA, 05 = VIU.
- **SEGU00001**: artículo que representa el costo de envío dentro de la solicitud.
- **CEILING**: redondeo hacia arriba al entero siguiente.
- **SIGMavi**: base SQL que sustituye a las tablas de Intelisis; su conexión sale de `Conexion.dll` (DU19).
- **LAN**: el sistema anterior que este código reemplaza.

**Archivos citados** (rutas relativas a `\\172.16.214.58\sap\ServicioSAP\ServicioSap\ServicioSap\`):

| Nombre corto | Ruta |
|---|---|
| OrderController.cs | `Controllers/OrderController.cs` |
| OrderMethods.cs | `Methods/Order/OrderMethods.cs` |
| SolicitudCreditoWebMethods.cs | `Methods/Credit/SolicitudCreditoWebMethods.cs` |
| SolicitudCreditoWebModels.cs | `Models/SAP/Credit/SolicitudCreditoWebModels.cs` |
| LiberadorCreditoMethods.cs | `Methods/Credit/LiberadorCreditoMethods.cs` |
| FinalListProperMethods.cs | `Methods/SalesDistribution/FinalListProperMethods.cs` |
| FinalListProper.cs | `Models/SAP/SalesDistribution/FinalListProper.cs` |
| PaymentConditionCatalog.cs | `Helpers/PaymentConditionCatalog.cs` |
| InfoClienteRequest.cs / ArticuloRequest.cs | `Models/SAP/Order/` |
| Models/SAP/Order/OrderRequest.cs, Models/SAP/Order/Response.cs | (se citan con ruta porque hay otro archivo con el mismo nombre) |
| BusinessPartnerMethods.cs | `Methods/BusinessPartner/BusinessPartnerMethods.cs` |
| BusinessPartnerMa.cs / BusinessEntitiesMa.cs | `Models/SAP/BusinessPartner/BP05MA/` |
| ProductMethods.cs | `Methods/MaterialManagement/ProductMethods.cs` |
| SalesMethods.cs | `Methods/SalesDistribution/SalesMethods.cs` |
| ConexionSQL.cs / SQLiteDb.cs | `Helpers/ConexionDB/` |
| TokenGenerator.cs / TokenValidationHandler.cs / Logger.cs | `Helpers/` |
| 01_CrearTablas_Ola3.sql | `Scripts/SQLite/` (se cita con ruta) |

---

### POST order/new — rama de crédito  (OrderController.SetOrder → OrderMethods.SetOrderAsync, OrderController.cs:16-48; OrderMethods.cs:1774-1797)

- **Para qué sirve:** dar de alta la solicitud de crédito web de una orden pagada con `omnipro_pago_credito`: cabecera de 59 columnas y líneas de artículo con precio y abono de SAP. No crea documento de venta en SAP (OrderMethods.cs:1791-1796).
- **Quién la llama:** el DMZ, ruta `order/setOrder` (POST) → `order/new` (`MAVI - DMZ-SAP.csv`, fila 77, "SD01 - Migrado"). La ruta del DMZ `order/validateCredit` está planeada hacia la misma ruta (fila 89), pero el CSV la marca sin conectar (`Conectado` = No).
- **Entrada:** `OrderRequest` (Models/SAP/Order/OrderRequest.cs:5-54) en el cuerpo JSON. Lo que usa la rama de crédito:
  - `metodoPago` (texto; debe ser exactamente `omnipro_pago_credito`, Models/SAP/Order/OrderRequest.cs:19).
  - `incrementId` (texto; se guarda como `idMagento`, :8), `storeId` (texto; `viu` o `muebles_america`, :9), `costoEnvio` (decimal, :21), `metodoEnvio` (texto, :23), `utmSource` (texto, :53), `sucursalDestino` (entero, 0 si no viene, :42), `RedimirMonedero` (float, :49), `forzarOrder` (texto, solo para la revisión de duplicados, :44), `docType` (opcional, :26), `salesOrg` (opcional; Magento no lo manda, OrderMethods.cs:332-336).
  - `articulos[]` (lista; si llega nula la orden falla, ver RCRE-4): `sku` (ArticuloRequest.cs:5), `cantidad` (entero, :11), `condicion` (texto, condición de pago de Magento, :15). Los precios de Magento no se usan en crédito.
  - `infoCliente` (opcional para el código, pero sin `cuenta` no hay solicitud): `cuenta` (BP, InfoClienteRequest.cs:9), `telefono` (:11), `correo` (:35), `direccion`, `numExt`, `numInt`, `codigoPostal` (:19), `municipio` (:21), `colonia`, `estado`, `entreCalles` (:29), `nombreClienteMavi`, `apellidoPaternoClienteMavi`, `apellidoMaternoClienteMavi` (:37-41, solo para la guía), `origen` (opcional, :69), `OrigenIdMagento` (opcional, :67). `codigo_promotor` (:56) se recibe pero ya no se usa (DU16).
- **Cómo funciona (paso a paso):**
  1. El controlador exige un token JWT válido (`[Authorize]`, OrderController.cs:12). Si el cuerpo llega nulo responde 400 (OrderController.cs:20-23); si no, llama `SetOrderAsync(order, "Insert")` (OrderController.cs:27).
  2. Agrupa los artículos por SKU (OrderMethods.cs:1725, :87-107).
  3. Guarda el `forzarOrder` original y arma el arreglo de datos de la orden; la posición 36 es la `cuenta` (OrderMethods.cs:1729-1730, :198-292, :288).
  4. Si el `forzarOrder` original es `"0"`, busca en SAP (SD36) si ya existe el documento `ZSD_{docType o ZMER}_{incrementId}`; si existe, responde `PedidoExistente` (OrderMethods.cs:1737-1749).
  5. Las ramas de Openpay no aplican (OrderMethods.cs:1754-1769). Con `metodoPago == "omnipro_pago_credito"` entra a la rama de crédito (OrderMethods.cs:44, :1774).
  6. Guarda la guía de envío en SQLite con el nombre del cliente (OrderMethods.cs:1776, :533-553, :407-416).
  7. Arma la lista de líneas `"cantidad,sku"` y, si hay costo de envío, agrega `"costoEnvio,SEGU00001"` (OrderMethods.cs:1778-1784).
  8. Lee el número del último SMS enviado al cliente (OrderMethods.cs:1786, :589-613) y su teléfono validado (OrderMethods.cs:1787, :621-633).
  9. `ProcessCreditPaymentAsync` (OrderMethods.cs:1789, :638-720):
     1. Revisa que la cuenta sea un BP existente; si no, lanza `sin cuenta` (OrderMethods.cs:642-647, :722-735).
     2. Elige el número a validar y lo parte en lada y número (OrderMethods.cs:650-654).
     3. `CrearSolicitudCreditoAsync` arma la solicitud con los datos del pedido (OrderMethods.cs:657, :741-797) y llama `SolicitudCreditoWebMethods.InsertAsync` (OrderMethods.cs:796), que:
        - lee el maestro del cliente en BP05MA (SolicitudCreditoWebMethods.cs:25, :370-380);
        - calcula `ValidacionTelefono` (SolicitudCreditoWebMethods.cs:27-28, :382-402, :315-331);
        - arma la fila con datos del BP y del pedido (`ArmarFila`, SolicitudCreditoWebMethods.cs:30, :232-308);
        - hace el INSERT de 59 columnas y devuelve el folio (SolicitudCreditoWebMethods.cs:32, :159-230).
     4. Sin folio, lanza error (OrderMethods.cs:658-659).
     5. Inserta las líneas de artículo (OrderMethods.cs:662-666, :811-984). Si fallan, solo se registra el error y la orden sigue (OrderMethods.cs:669-675).
     6. El envío al liberador y el aviso a Magento están comentados (OrderMethods.cs:677-711).
     7. Devuelve la cuenta tal como llegó (OrderMethods.cs:713).
  10. `SetOrderAsync` responde `Resultado = "Concluido"`, `Zctefinal = cuenta`, `Zidecomm = incrementId`, sin ir a SAP (OrderMethods.cs:1791-1796).
  11. El controlador responde `{BP, SalesDocument, Message, Resultado}` (OrderController.cs:28-35).

- **Reglas de negocio:**

  *Entrada y elegibilidad*
  - RCRE-1: La rama solo se activa con `metodoPago` igual a `omnipro_pago_credito`, con mayúsculas y minúsculas exactas (OrderMethods.cs:44, :1774). Con otra capitalización la orden no entra aquí y sigue el flujo de contado hacia SAP, donde otras partes sí la tratan como crédito sin distinguir mayúsculas (OrderMethods.cs:2188, :2546).
  - RCRE-2: El crédito no crea documento de venta ni entrega en SAP: termina en la solicitud (OrderMethods.cs:1791-1796).
  - RCRE-3: Los artículos se agrupan por SKU (texto exacto): se suman cantidad y descuento; precio, precio especial y condición son los del primer artículo del grupo. Las líneas quedan en el orden en que aparece cada SKU por primera vez (OrderMethods.cs:87-107).
  - RCRE-4: Si `articulos` llega nulo, la orden falla al armar el arreglo, antes de escribir nada (OrderMethods.cs:222).
  - RCRE-5: Revisión de duplicados: solo con el `forzarOrder` original en `"0"` se consulta SD36 por `PurchNoC = ZSD_{docType o ZMER}_{incrementId}`; si hay documento → `PedidoExistente` (OrderMethods.cs:1729, :1737-1749). Un `precioEspecial` distinto de 0 cambia el `forzarOrder` del propio pedido de `"0"` a `"1"` mientras se arma el arreglo, pero la revisión usa el valor guardado antes (OrderMethods.cs:236-237, :253-254). Si SD36 falla se toma como "no existe" (OrderMethods.cs:459-463).
  - RCRE-6: La guía de envío (incrementId + nombre) se guarda antes de validar la cuenta. Es `INSERT OR IGNORE`: solo se guarda la primera vez por incrementId, gracias al `UNIQUE` de `idecommerce` que define el script de la tabla (Scripts/SQLite/01_CrearTablas_Ola3.sql:25-33); si falla, se ignora (OrderMethods.cs:1776, :541-551). El nombre es `APELLIDOP APELLIDOM NOMBRE` en mayúsculas y sin espacios sobrantes al inicio o al final (OrderMethods.cs:407-416).
  - RCRE-7: Solo un BP existente recibe solicitud (DU6). La cuenta es `infoCliente.cuenta` tal como llega; vacía o con solo espacios → `sin cuenta`. Si BP05 (`ZB_DATOS_CLIENTE`) no la encuentra o falla → `sin cuenta`. No se crean clientes, prospectos ni invitados (OrderMethods.cs:642-647, :722-735; BusinessPartnerMethods.cs:30, :56-59).
  - RCRE-8: Con `sin cuenta` no se escribe cabecera ni líneas, pero la guía SQLite del paso 6 ya quedó guardada (OrderMethods.cs:1776, :644-647). El error no tiene log propio, como en LAN; queda en `[ORDER NEW ERROR]` (OrderController.cs:45; DU17).
  - RCRE-9: No se valida saldo, línea de crédito, NIP, plazo ni total del pedido, igual que LAN (OrderMethods.cs:638-720 no tiene esa revisión).
  - RCRE-10: En crédito no se validan precios contra SD29 ni existencias: la rama sale antes de esas validaciones (OrderMethods.cs:1774-1797 frente a :1809-1816).
  - RCRE-11: El cupón del promotor ya no se quema en el crédito (DU16). `HandlePromoCodeAsync` solo se conserva para `GET order/validatecupon` (OrderController.cs:113).
  - RCRE-12: El `Agente` que manda Magento no llega a la solicitud: la columna queda NULL (OrderMethods.cs:757-794 no lo asigna; SolicitudCreditoWebMethods.cs:293).

  *Teléfonos*
  - RCRE-13: Número del último SMS: `TOP 1 Telefono` de `TcAAEA00030_EnvioMensajes` cuyo `IdRegistro` está entre los `IdCodigoVerificacioneCommerce` de `VTASDCodigoVerificacioneCommerce` de la cuenta, el más reciente por `Id` (OrderMethods.cs:597-602). Si falla: valor `""` y log `[ORDER ObtenerNumeroSms ERROR]`, porque LAN sí registraba este error (OrderMethods.cs:608-611; DU17).
  - RCRE-14: Teléfono validado: `A_GET_TelefonoValidado` con la cuenta, quitando espacios al inicio y al final; si falla: `""` y log `[ORDER IsValidated ERROR]` (OrderMethods.cs:621-633).
  - RCRE-15: Número a validar: el del último SMS si no está en blanco; si no, el validado; si no, los dígitos del teléfono de envío (o `"0"` si no viene) (OrderMethods.cs:651). LAN usaba "longitud > 0" sin quitar espacios (pendiente R1).
  - RCRE-16: Lada: 2 dígitos si el número empieza con 33, 55 u 81; si no, 3. Si el número es más corto que la lada, lada `"0"` y número `"0"` (OrderMethods.cs:650-654). La lada se convierte a entero; si no es numérica queda 0 (OrderMethods.cs:746-747).
  - RCRE-17: Teléfono particular y celular de la solicitud = el teléfono de envío (solo dígitos) partido con la misma regla de lada; si es corto, lada 0 y número `""` (OrderMethods.cs:749-755, :785-788).

  *Cabecera `CRED_SOLICITUD_WEB_DATOS_TEMP`*
  - RCRE-18: Un solo INSERT, textualmente el del SP `SP_CREDITO_WEB_DATOS` (operación `Insert`): mismas 59 columnas, mismo orden y mismos valores. `fecha` la arma el propio SQL con `GETDATE()`, `confirmado` va fijo en 1 y `RedimirMonedero` lleva `ISNULL(…, 0.00)`, como en el SP. Devuelve el folio con `SCOPE_IDENTITY()` (SolicitudCreditoWebMethods.cs:35-157; DU8). Ya no se llama ningún SP.
  - RCRE-19: `fecha` y `confirmado` no son parámetros: los resuelve el SQL (SolicitudCreditoWebMethods.cs:35-36, :139-140).
  - RCRE-20: Cada texto se corta al ancho del parámetro que tenía el SP (`Size` del parámetro), salvo `cliente`, que mide 10 por el BP (en el SP medía 9) (SolicitudCreditoWebMethods.cs:165-167, :168-224).
  - RCRE-21: Un `null` se guarda como NULL y un `""` como `''`: los campos del pedido se pasan tal cual, sin convertir `null` en `""`, como LAN, donde un null no se enviaba al SP y quedaba su DEFAULT NULL (SolicitudCreditoWebMethods.cs:310-313; OrderMethods.cs:765-774; DU5).
  - RCRE-22: Los datos personales salen del BP (BP05MA), no de lo que teclea el cliente: apellidos, nombre, fecha de nacimiento, RFC, sexo, estado civil y cliente se toman del maestro y reemplazan lo que arma el pedido (SolicitudCreditoWebMethods.cs:236-244, :259, :279; OrderMethods.cs:759-764, :775, :779). El texto del BP se guarda tal cual, sin pasar a mayúsculas, porque LAN tampoco convertía (DU12).
  - RCRE-23: `nombre` = `NameFirst` + `Namemiddle` del BP (solo las partes con texto, sin espacios sobrantes, unidas por un espacio). LAN guardaba todos los nombres de pila juntos (`CTE.PersonalNombres`). `nombre2` queda siempre NULL, como en LAN (SolicitudCreditoWebMethods.cs:238-241; DU13).
  - RCRE-24: `fechaNacimiento` = `Birthdt` del BP (formato `/Date(ms)/` o fecha legible); vacío o ilegible → `1900-01-02`, el valor por defecto que LAN daba a los clientes web (SolicitudCreditoWebMethods.cs:242, :551, :604-629).
  - RCRE-25: `sexo` con los mismos códigos de `MapGender`: `1` → `Masculino`, `2` → `Femenino`, vacío → `''` (como LAN, donde un `CTE.Sexo` NULL llegaba como `''`), otro → `NO ESPECIFICADO`, que el ancho 9 deja en `NO ESPECI` (SolicitudCreditoWebMethods.cs:174, :244, :563-583).
  - RCRE-26: `estadoCivil` = denominación SAP de `Marst`: 1 Soltero, 2 Casado, 3 Viudo, 4 Divorciado, 5 Separado, 6 Pareja de hecho; otro o vacío → `''` (en LAN venía de `CTE.EstadoCivil` y un NULL llegaba como `''`). El ancho 11 recorta igual que el SP: `Pareja de h` (SolicitudCreditoWebMethods.cs:187, :259, :585-597). Los BP que crea ServicioSAP llevan `Marst` 1 por defecto porque SAP lo exige y la web no lo captura, así que su solicitud dice `Soltero` donde LAN guardaba `''` (OrderMethods.cs:2659; BusinessPartnerMethods.cs:486; DU18).
  - RCRE-27: `entreCalles` = la del checkout si no está vacía (un valor de solo espacios cuenta como dato y se guarda); ausente o `""` → `ZentCalles` del BP (`''` si el BP no lo trae), como LAN tomaba el dato del maestro (OrderMethods.cs:769; SolicitudCreditoWebMethods.cs:250).
  - RCRE-28: `uen` = 2 solo si `storeId` es exactamente `viu`; cualquier otro valor, incluido `VIU`, da 1. `sucursal` = 505 con uen 2, si no 504 (OrderMethods.cs:744, :781).
  - RCRE-29: `condicion` = la del primer artículo después de agrupar, sin traducir; si es nula se guarda NULL (OrderMethods.cs:778).
  - RCRE-30: `origen` = `infoCliente.origen` si viene (aunque sea `""`); si no, `PRODUCTOS MX`, igual que LAN (OrderMethods.cs:782; InfoClienteRequest.cs:69; DU7). Magento solo lo agrega cuando el pago trae ese dato.
  - RCRE-31: `idMagento` = `incrementId` (nulo → `"0"`); `ClienteMagento` NULL; `OrigenIdMagento` = el valor recibido o `""` (OrderMethods.cs:783, :791; SolicitudCreditoWebMethods.cs:289).
  - RCRE-32: `articulo` va siempre `''` en la cabecera; DIMAS MX está deprecado y no se porta (OrderMethods.cs:776).
  - RCRE-33: `estatus` = 0 y `SucursalDestino` = el del pedido (0 si no viene) (SolicitudCreditoWebModels.cs:113; OrderMethods.cs:789).
  - RCRE-34: `RedimirMonedero` = el valor del pedido convertido a decimal; solo se registra (OrderMethods.cs:790; SolicitudCreditoWebMethods.cs:296).
  - RCRE-35: Quedan NULL, como los DEFAULT del SP: `nombre2`, antigüedad, `viveEnCalidad`, sueldo, `tarjeta`, `tarjetaDigitos`, créditos hipotecario y automotriz, extensiones de archivo, `die`, `codigo`, `ClienteMagento`, `CodigoRecomendador` (deprecado), `Agente`, `CURP`, `FechaCita` y `HoraCita` (SolicitudCreditoWebMethods.cs:241, :251-252, :260-265, :272-274, :281, :287, :289, :292-293, :303-305).
  - RCRE-36: Sin folio (resultado nulo o ≤ 0) → error `No se pudo generar la solicitud de crédito.` y no se insertan líneas (SolicitudCreditoWebMethods.cs:228; OrderMethods.cs:658-659).

  *Validación telefónica (columna `ValidacionTelefono`)*
  - RCRE-37: Prospecto = BP con `To_Cte.ZtipoCliente` igual a `Prospecto` (sin distinguir mayúsculas) (SolicitudCreditoWebMethods.cs:534-548; BusinessEntitiesMa.cs:334).
  - RCRE-38: Teléfono validado = primer registro de `A_GET_TelefonoValidado` con `ZvalTel` verdadero (booleano o número distinto de 0), campo `ZtelCte`, cortado a 10 caracteres (SolicitudCreditoWebMethods.cs:387, :478-521, :553-561).
  - RCRE-39: Si no hay teléfono validado no se consultan CteTelSet, el catálogo ni el SMS (SolicitudCreditoWebMethods.cs:389-392).
  - RCRE-40: Origen de la validación = `ZappOrig` del primer teléfono de CteTelSet con `Zvaltel` verdadero cuyo `ZappOrig` está en el catálogo AWS `ORIGEN VALIDACION NUMERO CTE` (comparación sin mayúsculas y sin espacios sobrantes) (SolicitudCreditoWebMethods.cs:394-398, :445-476, :523-532, :546).
  - RCRE-41: Teléfono a validar = último `Telefono` de `TcAAEA00030_EnvioMensajes` por `Cliente` (el más reciente por `Id`), cortado a 10 (SolicitudCreditoWebMethods.cs:333-361, :399).
  - RCRE-42: `ValidacionTelefono` = 1 cuando no hay teléfono validado, o no hay origen válido, o el validado es distinto del último SMS (sin mayúsculas ni espacios finales); un prospecto siempre da 0. Si hay teléfono validado y origen válido pero no hay fila de SMS, la comparación queda "desconocida" y el resultado es 0, como el IF de tres valores del SP (SolicitudCreditoWebMethods.cs:315-331, :631-659).
  - RCRE-43: Un error en cualquiera de estas lecturas (maestro BP05MA, `A_GET_TelefonoValidado`, `URL_BP_API` vacía, CteTelSet, catálogo AWS o SMS) detiene la cabecera. No tienen log propio porque LAN no lo tenía: el error sube y queda en `[ORDER NEW ERROR]` (SolicitudCreditoWebMethods.cs:25, :364-367, :427-436, :487-490, :499-503; BusinessPartnerMethods.cs:315-329, :336-339; ProductMethods.cs:731-734; DU17).
  - RCRE-44: Las tres búsquedas usan la cuenta tal como llegó, no el `Partner` del BP; hoy es el mismo valor (SolicitudCreditoWebMethods.cs:25, :27; OrderMethods.cs:779).

  *Condición de pago de las líneas*
  - RCRE-45: Condición nula → no se escribe ninguna línea, tampoco SEGU00001; la cabecera queda. Es paridad con LAN, donde el SP de líneas fallaba por `@Condicion` sin valor (OrderMethods.cs:663, :829-830, :669-675; DU15).
  - RCRE-46: La condición de Magento (por ejemplo `12 M MA P INM`) se traduce con `GetCondicionAsync`: primero SIGMavi `CondicionesCredVtaLinea`, luego el catálogo en memoria; si no se conoce, el resultado es `""` (OrderMethods.cs:832, :3314-3346; PaymentConditionCatalog.cs:122-138).
  - RCRE-47: Condición sin equivalente → 0 líneas de producto (cada producto deja un hueco en `Orden`), pero SEGU00001 sí se inserta y la orden responde `Concluido`, como LAN (OrderMethods.cs:833-835, :895-899; DU15). Una condición vacía (`""`, que no es nula) cae en este caso, porque el catálogo devuelve el respaldo `""` (PaymentConditionCatalog.cs:124-127).

  *Líneas `VTASdArtCreditoWeb`*
  - RCRE-48: Cada SKU agrupado es una línea `cantidad,sku`; si `costoEnvio > 0` se agrega SEGU00001 con el importe del envío escrito en cultura invariante (punto decimal) (OrderMethods.cs:1778-1784).
  - RCRE-49: Columnas: `IdArtCreditoWeb` = folio, `cantidad`, `articulo`, `precio`, `Orden`, `Abono`, `costo`; INSERT directo con la conexión Android (OrderMethods.cs:842-869).
  - RCRE-50: Un artículo igual al anterior se salta sin consumir `Orden` (OrderMethods.cs:878-880).
  - RCRE-51: `Orden` empieza en 1 y sube con cada entrada procesada, también con las que no se insertan; por eso puede tener huecos (OrderMethods.cs:853, :897, :937, :971).
  - RCRE-52: SEGU00001: cantidad 1, precio = costo de envío, `Abono` 12 fijo (regla legada) (OrderMethods.cs:887-892).
  - RCRE-53: `articulo` es VARCHAR(20): un SKU de más de 20 caracteres se corta, y con ese SKU cortado se consulta SD29 (OrderMethods.cs:865, :905).
  - RCRE-54: `costo` = NULL en todas las líneas (OrderMethods.cs:967; DU14). Es una **diferencia aceptada**, no paridad: LAN guardaba el costo de inventario que calculaba `spVerCosto` (sucursal 96, MAVI, pesos, según `Art.TipoCosteo`), 0 si el método no encontraba costo y NULL solo para artículos sin método de costeo. En SAP no hay fuente equivalente (SD29 es precio de venta, sin campo de costo; la única candidata sin validar es DM01 `COSTOPROMEDIOPCP`). Ningún código de LAN, DMZ ni ServicioSAP lee esta columna.
  - RCRE-55: Sin fila de precio para la organización y la condición → la línea no se inserta y queda hueco en `Orden` (OrderMethods.cs:935-939).
  - RCRE-56: Con fila pero precio ≤ 0 (por ejemplo un importe vacío o no numérico, que vale 0) → la línea sí se inserta con ese precio; solo se avisa en consola (OrderMethods.cs:958-962, :965-971).
  - RCRE-57: Si SD29 trae descuento de categoría > 0: precio y abono = CEILING(importe − importe × descuento / 100). Sin descuento, el importe va tal cual (OrderMethods.cs:949-955).
  - RCRE-58: No hay transacción: cabecera y líneas usan conexiones distintas. Un error a la mitad deja la cabecera y las líneas ya insertadas (OrderMethods.cs:842, :976-980; SolicitudCreditoWebMethods.cs:161-162).
  - RCRE-59: Un error en las líneas se registra como `[CREDITO ARTICULOS ERROR]` con folio, incrementId y cuenta, y la respuesta sigue siendo `Concluido` (OrderMethods.cs:669-675).
  - RCRE-60: No hay sustitución de SKU por región (TELEFONIA R5/R6) en crédito; el código postal llega al método de líneas pero no se usa (OrderMethods.cs:662, :811).
  - RCRE-61: Si la lista de líneas queda vacía (pedido con `articulos` vacío y sin costo de envío), no se escribe ninguna línea, no hay log de archivo y la orden responde `Concluido`. Esta revisión va antes que la de condición nula (OrderMethods.cs:813-817, :829).
  - RCRE-62: Cada línea viaja como texto `cantidad,sku` y se separa por comas: un SKU que trajera una coma se tomaría solo hasta la coma (OrderMethods.cs:1781, :873-876).

  *Precio y abono desde SD29*
  - RCRE-63: Organización de ventas: `salesOrg` del pedido si viene; si no, 05 cuando `storeId` contiene `viu` (sin distinguir mayúsculas) y 04 en cualquier otro caso (OrderMethods.cs:340-351, :824).
  - RCRE-64: Consulta SD29 `PropreListSet` con `$filter` por `Articulo`, `OrgVtas` y `Condicion` traducida; si no hay filas y la condición de Magento es distinta, repite con la de Magento (OrderMethods.cs:986-998; FinalListProperMethods.cs:87-92).
  - RCRE-65: Si la consulta filtrada lanza error: log `[CREDITO SD29 FILTRO]` y nueva consulta solo por `Articulo` (OrderMethods.cs:1002-1006).
  - RCRE-66: El resultado se guarda por SKU (el SKU cortado a 20, sin distinguir mayúsculas) durante la orden para no repetir la consulta (OrderMethods.cs:838, :906-910).
  - RCRE-67: Filtro en memoria (red de seguridad): solo filas con `OrgVtas` exactamente igual a la organización (las filas 1, 2 y 3 son de mayoreo o pisos y nunca aplican a e-commerce); luego la primera con `Condicion` igual a la traducida o, si no hay, igual a la de Magento (sin distinguir mayúsculas) (OrderMethods.cs:912-933; FinalListProper.cs:30-35).
  - RCRE-68: Si hay varias filas válidas se usa solo la primera (OrderMethods.cs:930-933).
  - RCRE-69: Precio = `Precio`, abono = `Abono` (parcialidad) de SD29. Los importes se leen en cultura invariante; un texto no numérico vale 0 (OrderMethods.cs:308-316, :943-945; FinalListProper.cs:17-25, :46-47).
  - RCRE-70: En el `$filter` cada valor lleva el apóstrofo duplicado y el filtro completo se codifica, así un SKU con `+`, `&`, `#` o espacio llega intacto a SAP (FinalListProperMethods.cs:94-97, :102-104).

  *Respuesta*
  - RCRE-71: Éxito → HTTP 200 con `{BP: cuenta tal como llegó, SalesDocument: null, Message: "", Resultado: "Concluido"}` (OrderMethods.cs:713, :1791-1796; OrderController.cs:28-35; Models/SAP/Order/Response.cs:26, :67-68).
  - RCRE-72: Cualquier excepción → HTTP 200 con el texto `Error, Error en SetOrder: <mensaje>` y log `[ORDER NEW ERROR]` con el incrementId. Ante una excepción nunca se devuelve un status de error, como LAN, porque Magento dejaría de consultar el estado del crédito; se usa el mensaje y no el stack (OrderController.cs:37-47; OrderMethods.cs:1939-1943).

  **Tabla de las 59 columnas de la cabecera** (orden del INSERT, SolicitudCreditoWebMethods.cs:37-96; "BP" = BP05MA):

  | n | Columna | Qué se guarda | Ancho / tipo | Dónde |
  |---|---|---|---|---|
  | 1 | apellidoP | BP `NameLast` (null → `''`) | 30 | SolicitudCreditoWebMethods.cs:168, :236 |
  | 2 | apellidoM | BP `NameLst2` (null → `''`) | 30 | SolicitudCreditoWebMethods.cs:169, :237 |
  | 3 | nombre | BP `NameFirst` + `Namemiddle` (RCRE-23) | 25 | SolicitudCreditoWebMethods.cs:170, :238-240 |
  | 4 | nombre2 | NULL siempre | 30 | SolicitudCreditoWebMethods.cs:171, :241 |
  | 5 | fechaNacimiento | BP `Birthdt` o `1900-01-02` (RCRE-24) | Date | SolicitudCreditoWebMethods.cs:172, :242 |
  | 6 | rfc | BP `To_CteCliente.Stcd1` (null → `''`) | 13 | SolicitudCreditoWebMethods.cs:173, :243; BusinessEntitiesMa.cs:220 |
  | 7 | sexo | `SexoLegado(Gender)` (RCRE-25) | 9 | SolicitudCreditoWebMethods.cs:174, :244 |
  | 8 | email | `infoCliente.correo` tal cual | 50 | OrderMethods.cs:765; SolicitudCreditoWebMethods.cs:175 |
  | 9 | direccion | `infoCliente.direccion` | 30 | OrderMethods.cs:766; SolicitudCreditoWebMethods.cs:176 |
  | 10 | exterior | `infoCliente.numExt` | 8 | OrderMethods.cs:767; SolicitudCreditoWebMethods.cs:177 |
  | 11 | interior | `infoCliente.numInt` | 8 | OrderMethods.cs:768; SolicitudCreditoWebMethods.cs:178 |
  | 12 | entreCalles | checkout o BP `ZentCalles` (RCRE-27) | 80 | OrderMethods.cs:769; SolicitudCreditoWebMethods.cs:179, :250 |
  | 13 | antiguedadAnios | NULL | Int | SolicitudCreditoWebMethods.cs:180, :251 |
  | 14 | antiguedadMeses | NULL | Int | SolicitudCreditoWebMethods.cs:181, :252 |
  | 15 | codigoPostal | `infoCliente.codigoPostal` (null → `''`) | 6 | OrderMethods.cs:770; SolicitudCreditoWebMethods.cs:182 |
  | 16 | delegacion | `infoCliente.municipio` | 25 | OrderMethods.cs:771; SolicitudCreditoWebMethods.cs:183 |
  | 17 | poblacion | `infoCliente.municipio` | 30 | OrderMethods.cs:772; SolicitudCreditoWebMethods.cs:184 |
  | 18 | estado | `infoCliente.estado` | 30 | OrderMethods.cs:773; SolicitudCreditoWebMethods.cs:185 |
  | 19 | colonia | `infoCliente.colonia` | 30 | OrderMethods.cs:774; SolicitudCreditoWebMethods.cs:186 |
  | 20 | estadoCivil | `EstadoCivilLegado(Marst)` (RCRE-26) | 11 | SolicitudCreditoWebMethods.cs:187, :259 |
  | 21 | viveEnCalidad | NULL | 11 | SolicitudCreditoWebMethods.cs:188, :260 |
  | 22 | sueldo | NULL | Money | SolicitudCreditoWebMethods.cs:189, :261 |
  | 23 | tarjeta | NULL | 1 | SolicitudCreditoWebMethods.cs:190, :262 |
  | 24 | tarjetaDigitos | NULL | Int | SolicitudCreditoWebMethods.cs:191, :263 |
  | 25 | creditoHipoteca | NULL | 1 | SolicitudCreditoWebMethods.cs:192, :264 |
  | 26 | creditoAutomotriz | NULL | 1 | SolicitudCreditoWebMethods.cs:193, :265 |
  | 27 | ladaParticular | lada del teléfono de envío (RCRE-17) | Int | OrderMethods.cs:785; SolicitudCreditoWebMethods.cs:194 |
  | 28 | telefonoParticular | número del teléfono de envío | 10 | OrderMethods.cs:786; SolicitudCreditoWebMethods.cs:195 |
  | 29 | ladaCelular | igual que 27 | Int | OrderMethods.cs:787; SolicitudCreditoWebMethods.cs:196 |
  | 30 | telefonoCelular | igual que 28 | 10 | OrderMethods.cs:788; SolicitudCreditoWebMethods.cs:197 |
  | 31-33 | extencionArchivo_1 a _3 | NULL | 5 | SolicitudCreditoWebMethods.cs:198-200, :272-274 |
  | 34 | articulo | `''` siempre | 20 | OrderMethods.cs:776; SolicitudCreditoWebMethods.cs:201 |
  | 35 | uen | 2 si `storeId == "viu"`, si no 1 | Int | OrderMethods.cs:744, :777; SolicitudCreditoWebMethods.cs:202 |
  | 36 | condicion | condición del primer artículo, sin traducir | 20 | OrderMethods.cs:778; SolicitudCreditoWebMethods.cs:203 |
  | 37 | cliente | BP `Partner` | 10 | SolicitudCreditoWebMethods.cs:204, :279 |
  | 38 | utmSource | `utmSource` del pedido | 100 | OrderMethods.cs:780; SolicitudCreditoWebMethods.cs:205 |
  | 39 | die | NULL | Bit | SolicitudCreditoWebMethods.cs:206, :281 |
  | 40 | sucursal | 505 (uen 2) o 504 | Int | OrderMethods.cs:781; SolicitudCreditoWebMethods.cs:207 |
  | 41 | origen | `origen` o `PRODUCTOS MX` | 20 | OrderMethods.cs:782; SolicitudCreditoWebMethods.cs:208 |
  | 42 | fecha | `GETDATE()` del servidor SQL | DATETIME | SolicitudCreditoWebMethods.cs:35-36, :139 |
  | 43 | confirmado | 1 (literal) | — | SolicitudCreditoWebMethods.cs:140 |
  | 44 | codigo | NULL | 40 | SolicitudCreditoWebMethods.cs:209, :287 |
  | 45 | idMagento | `incrementId` (null → `"0"`) | 12 | OrderMethods.cs:783; SolicitudCreditoWebMethods.cs:210 |
  | 46 | ClienteMagento | NULL | 12 | SolicitudCreditoWebMethods.cs:211, :289 |
  | 47 | MetodoEnvio | `metodoEnvio` del pedido | 12 | OrderMethods.cs:784; SolicitudCreditoWebMethods.cs:212 |
  | 48 | estatus | 0 | Int | SolicitudCreditoWebModels.cs:113; SolicitudCreditoWebMethods.cs:213 |
  | 49 | CodigoRecomendador | NULL (deprecado) | 15 | SolicitudCreditoWebMethods.cs:214, :292 |
  | 50 | Agente | NULL | 10 | SolicitudCreditoWebMethods.cs:215, :293 |
  | 51 | SucursalDestino | `sucursalDestino` del pedido (0 si falta) | Int | OrderMethods.cs:789; SolicitudCreditoWebMethods.cs:216 |
  | 52 | RedimirMonedero | valor del pedido; `ISNULL(…, 0.00)` | Money | OrderMethods.cs:790; SolicitudCreditoWebMethods.cs:149, :217 |
  | 53 | ValidacionTelefono | RCRE-42 | Bit | SolicitudCreditoWebMethods.cs:218, :298 |
  | 54 | OrigenIdMagento | valor recibido o `""` | 20 | OrderMethods.cs:791; SolicitudCreditoWebMethods.cs:219 |
  | 55 | LadaValidar | lada del número a validar (RCRE-15, RCRE-16) | Int | OrderMethods.cs:792; SolicitudCreditoWebMethods.cs:220 |
  | 56 | TelefonoValidar | resto del número a validar | 10 | OrderMethods.cs:793; SolicitudCreditoWebMethods.cs:221 |
  | 57 | CURP | NULL | 20 | SolicitudCreditoWebMethods.cs:222, :303 |
  | 58 | FechaCita | NULL | Date | SolicitudCreditoWebMethods.cs:223, :304 |
  | 59 | HoraCita | NULL | 100 | SolicitudCreditoWebMethods.cs:224, :305 |

- **Fuentes de datos:**
  - SQLite `data.db`, tabla `servicio_guias`: escritura `INSERT OR IGNORE` (OrderMethods.cs:540-544; SQLiteDb.cs:11-28).
  - OData SD36 `ZAPI_DOCVTAS_CHECK_CDS/ZAPI_DOCVTAS_CHECK`, `$filter=PurchNoC eq 'ZSD_…'`: lectura, solo con `forzarOrder` original `"0"` (OrderMethods.cs:1741; SalesMethods.cs:136-139).
  - SQL ServicioAndroid (`MAVICBOSANDROID`): lectura de `TcAAEA00030_EnvioMensajes` + `VTASDCodigoVerificacioneCommerce` (OrderMethods.cs:597-600); lectura de `TcAAEA00030_EnvioMensajes` por `Cliente` (SolicitudCreditoWebMethods.cs:341-344); escritura en `CRED_SOLICITUD_WEB_DATOS_TEMP` (SolicitudCreditoWebMethods.cs:37-157) y en `VTASdArtCreditoWeb` (OrderMethods.cs:856-858).
  - API businesspartner (`URL_BP_API`), `A_GET_TelefonoValidado?sCliente=<cuenta>`: lectura; se llama dos veces por orden, una en el paso 8 y otra al calcular `ValidacionTelefono` (OrderMethods.cs:625; SolicitudCreditoWebMethods.cs:387, :492).
  - OData BP05 `ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE`, `$filter=BusinessPartner eq '<cuenta>'&$top=1`: lectura, ¿existe el BP? (BusinessPartnerMethods.cs:30).
  - OData BP05MA `ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='<cuenta>',Client='110')` con `$expand` de 12 navegaciones (`to_Cte`, `to_CteCliente`, `to_CteTel`…): lectura del maestro (BusinessPartnerMethods.cs:299-302).
  - OData `ZQBP_EDITARCLIENTE_SRV/CteTelSet`, `$filter=Partner eq '<cuenta>'`: lectura, solo si hay teléfono validado (SolicitudCreditoWebMethods.cs:413-415).
  - API configuraciones de AWS (`AwsBaseUrl`), `AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=ORIGEN VALIDACION NUMERO CTE`: lectura, solo si hay teléfono validado (ProductMethods.cs:711; SolicitudCreditoWebMethods.cs:526, :546).
  - SIGMavi (conexión de `Conexion.dll`, DU19), tabla `CondicionesCredVtaLinea`: lectura (OrderMethods.cs:3320-3324).
  - Catálogo en memoria `PaymentConditionCatalog` (PaymentConditionCatalog.cs:8-114).
  - OData SD29 `ZAPI_PROPRELIST_SRV/PropreListSet`, `$filter=Articulo eq … and OrgVtas eq … and Condicion eq …` (respaldo: solo `Articulo eq …`): lectura (FinalListProperMethods.cs:82-92, :102-104).
  - Todas las OData van a la URL de S/4HANA que da `Conexion.dll` (ambiente Dev) con `sap-client=110` y autenticación Basic de `CreateClientS4` (TokenGenerator.cs:70-71, :113-133).
- **Salida y errores:**

  | Caso | Qué queda escrito | Respuesta HTTP |
  |---|---|---|
  | Sin token JWT válido | Nada | 401 (`[Authorize]`, OrderController.cs:12) |
  | Cuerpo nulo | Nada | 400 (OrderController.cs:20-23) |
  | `articulos` nulo | Nada | 200 `Error, Error en SetOrder: …` (OrderMethods.cs:222, :1939-1943) |
  | Duplicado en SD36 | Nada | 200 `{BP: null, SalesDocument: null, Message: "", Resultado: "PedidoExistente"}` (OrderMethods.cs:1744-1748; OrderController.cs:28-35) |
  | Cuenta vacía, BP inexistente o BP05 caído | Solo la guía SQLite | 200 `Error, Error en SetOrder: sin cuenta` (OrderMethods.cs:644-647) |
  | Falla BP05MA, teléfono validado, CteTelSet, catálogo AWS, SMS o el INSERT de cabecera | Solo la guía SQLite | 200 `Error, Error en SetOrder: <mensaje>` (SolicitudCreditoWebMethods.cs:18-33) |
  | INSERT sin folio | Solo la guía SQLite | 200 `Error, Error en SetOrder: No se pudo generar la solicitud de crédito.` (OrderMethods.cs:658-659) |
  | Condición nula, SD29 caído (también en la consulta de respaldo por SKU) o error SQL en líneas | Guía + cabecera + líneas previas al error | 200 `Concluido`; log `[CREDITO ARTICULOS ERROR]` (OrderMethods.cs:669-675) |
  | Condición sin equivalente | Guía + cabecera + solo SEGU00001 | 200 `Concluido` (OrderMethods.cs:895-899) |
  | Éxito | Guía + cabecera + líneas | 200 `{BP: <cuenta>, SalesDocument: null, Message: "", Resultado: "Concluido"}` (OrderController.cs:28-35) |

  Errores que se tragan: guía SQLite (solo consola, OrderMethods.cs:548-552); SD36 (consola, OrderMethods.cs:459-463); último SMS y teléfono validado del paso 8 (log y `""`, OrderMethods.cs:608-611, :628-631); existencia del BP (consola, se vuelve `sin cuenta`, OrderMethods.cs:730-734); traducción de condición en SIGMavi (log `[ORDER GetCondicion ERROR]` y catálogo, OrderMethods.cs:3340-3345); SD29 filtrado (log `[CREDITO SD29 FILTRO]` y consulta por SKU, OrderMethods.cs:1002-1006); líneas (log `[CREDITO ARTICULOS ERROR]`, OrderMethods.cs:669-675). Los logs van a `sap.log` vía `Logger.SAP` (Logger.cs:8-44); lo escrito con `Console.WriteLine` no se conserva en el servidor.
- **Configuración usada:** `connectionStrings/MAVICBOSANDROID` (ConexionSQL.cs:106); `appSettings`: `URL_BP_API` (SolicitudCreditoWebMethods.cs:485), `AwsBaseUrl` (ProductMethods.cs:28), `SQLITE_DB_PATH` (SQLiteDb.cs:18-21), `JWT_SECRET_KEY`, `JWT_AUDIENCE_TOKEN`, `JWT_ISSUER_TOKEN` (TokenValidationHandler.cs:47-49); `applicationSettings/Server` (alias del servidor SIGMavi para `Conexion.dll`, ConexionSQL.cs:75-79; Web.config:157-163). URL y credenciales de S/4HANA salen de `Conexion.dll`, no del `Web.config` (TokenGenerator.cs:70-71).
- **Pendientes conocidos:**
  - Liberador y aviso a Magento apagados: bloque comentado en OrderMethods.cs:677-711, que tal como está no compila (usa `idClienteMagento`, que no existe, y `await` dentro de una lambda que no es async). En LAN se disparaban solo para clientes existentes (cuentas `C…`, hoy = BP existente por DU2). Espera al otro equipo (DU11; T1b, ACT-28). Ver el bloque "(sin ruta) Liberador de crédito y aviso a Magento".
  - `creditStatus` y `updateCreditOrderId` no existen en ServicioSAP (DU11; T2a ACT-29, T2b ACT-30). SD36 nunca encuentra una solicitud de crédito, así que cada reenvío de la orden crea otra solicitud (T2c, ACT-31).
  - Compuertas "sin fila" de LAN: con código postal, nombres, teléfono o `incrementId` nulos, o un teléfono demasiado corto, LAN no escribía la solicitud; aquí se escribe con `''`, `'0'`, 0 o `1900-01-02`. Falta decidir también si se acepta el `Trim` final del nombre de la guía, que LAN no hacía (P1, ACT-12; OrderMethods.cs:415, :651-654, :770, :783).
  - R1: número a validar con "en blanco" y quitando espacios; LAN usaba "longitud > 0" sin quitar espacios (ACT-08; OrderMethods.cs:626, :651).
  - R3: búsquedas telefónicas con la cuenta cruda en vez de `maestro.Partner` (ACT-07; SolicitudCreditoWebMethods.cs:27).
  - R4: limpieza de ramas `maestro != null` que ya no pueden fallar, de `fila.Confirmado` sin uso y de valores del pedido que se pisan (ACT-06; SolicitudCreditoWebMethods.cs:236-244, :285; OrderMethods.cs:759-764, :775).
  - Fecha vacía del BP en formato `/Date(-62135596800000)/` se guardaría como `0001-01-01` (G2-40, ACT-20; SolicitudCreditoWebMethods.cs:604-629).
  - `ZtelCte` puede traer prefijo (`+52`) y no se reduce a dígitos, lo que movería `LadaValidar`, `TelefonoValidar` y `ValidacionTelefono` (G3-23, ACT-18; OrderMethods.cs:626; SolicitudCreditoWebMethods.cs:387).
  - Sin teléfono validado se saltan tres lecturas que el SP siempre hacía; solo cambia el resultado cuando una lectura falla (G3-20, R2, ACT-13; SolicitudCreditoWebMethods.cs:389-392).
  - Qué fila de SD29 es la de crédito cuando hay varias (sucursal, vigencia, canal) y si se inserta una línea por fila como LAN (P7, P8 b; ACT-14; OrderMethods.cs:930-933). Precisión del precio de SEGU00001 (P8 d, ACT-14).
  - Prospecto por `ZtipoCliente` en lugar del prefijo `P` de LAN, por confirmar (P16, ACT-13). El límite de crédito no frena, como LAN (P17, ACT-13).
  - `05 M MA P DIF` / `05 M VIU P DIF` no están en el catálogo de respaldo: si SIGMavi tampoco las resuelve, la solicitud queda solo con SEGU00001 (P18, ACT-36; PaymentConditionCatalog.cs:40-43). Lo mismo pasa si SIGMavi falla y el catálogo no conoce la condición (ACT-16).
  - Sustitución TELEFONIA (R5/R6) y copia a `eCommerceDetPedidos` no se portan (P10, P9; ACT-13).
  - Bitácora: una caída de BP05 se ve igual que un BP inexistente y solo va a consola; el request entrante no se registra (ACT-15; G5-32; OrderMethods.cs:730-734; OrderController.cs:45).
  - Permiso INSERT del usuario de `MAVICBOSANDROID` en `VTASdArtCreditoWeb` sin confirmar: sin él la cabecera se guarda, las líneas fallan y la respuesta es `Concluido` (ACT-19; OrderMethods.cs:669-675).
  - Contrato de respuesta HTTP del crédito por confirmar (P12, ACT-13).
  - Restos en el código (ACT-17): comentario XML desactualizado sobre el origen del precio (OrderMethods.cs:803-810), `if (proper != null)` siempre verdadero (OrderMethods.cs:941), parámetro `codigoPostal` sin uso (OrderMethods.cs:811), `catch { throw; }` vacío (SolicitudCreditoWebMethods.cs:364-367), `LiberateClientCredit` sin llamador (OrderMethods.cs:1160-1172).
  - Sin actividad registrada: `uen` compara `storeId` exacto (`viu`) y la organización de SD29 busca `viu` sin distinguir mayúsculas; un `storeId` `VIU` daría uen 1 y sucursal 504 con precios de la organización 05 (OrderMethods.cs:744, :347-348). La capitalización de `metodoPago` también se trata distinto entre ramas (RCRE-1).

---

### GET order/getCondicion/{storeId}/{condicionMagento}  (OrderController.GetCondicion, OrderController.cs:309-329)

- **Para qué sirve:** traducir la condición de pago que manda Magento (texto como `12 M MA P INM`) al código interno de la condición (`12IA`). Usa el mismo `GetCondicionAsync` que las líneas de crédito (OrderMethods.cs:832) y que la condición de pago del pedido de contado (OrderMethods.cs:2229).
- **Quién la llama:** no aparece en `MAVI - DMZ-SAP.csv`; no se encontró llamador en ServicioSAP.
- **Entrada:** `storeId` (texto en la ruta, requerido; `muebles_america` o `viu`) y `condicionMagento` (texto en la ruta, requerido) (OrderController.cs:310-311).
- **Cómo funciona (paso a paso):**
  1. Exige token JWT (`[Authorize]`, OrderController.cs:12).
  2. Valida que los dos parámetros traigan texto (OrderController.cs:313-317).
  3. Llama `GetCondicionAsync(condicionMagento, storeId)` con respaldo `ACEF` (OrderController.cs:321; OrderMethods.cs:3314).
  4. Busca en SIGMavi `CondicionesCredVtaLinea` (OrderMethods.cs:3318-3337).
  5. Si no hay resultado o falla, usa el catálogo en memoria (OrderMethods.cs:3345; PaymentConditionCatalog.cs:122-138).
  6. Responde el código como texto (OrderController.cs:322).
- **Reglas de negocio:**
  - RCND-1: `storeId` y `condicionMagento` son obligatorios; vacío o solo espacios → 400 con el mensaje del parámetro que falta (OrderController.cs:313-317).
  - RCND-2: SIGMavi: `SELECT TOP 1 Condicion FROM CondicionesCredVtaLinea WHERE CondicionMagento = @CondicionMagento AND REPLACE(TiendaVirtual, ' ', '_') = @StoreId`; así `Muebles America` se compara con `muebles_america`. No hay `ORDER BY`: con varias filas, la base elige una (OrderMethods.cs:3322-3329).
  - RCND-3: Resultado vacío o error de SIGMavi → catálogo en memoria; el error se registra como `[ORDER GetCondicion ERROR]` (OrderMethods.cs:3336, :3340-3345).
  - RCND-4: El catálogo compara la descripción sin espacios sobrantes y sin distinguir mayúsculas, y acepta la forma corta de Magento y la descripción larga de SD29 (por ejemplo `12 M MA P INM` y `Credito MA Pisos 12M P INM` → `12IA`) (PaymentConditionCatalog.cs:8, :61-62, :129-134).
  - RCND-5: Condición desconocida o vacía → `ACEF` (contado MA) en esta ruta, sin importar la tienda. En las líneas de crédito el respaldo es `""` (RCRE-46) (OrderController.cs:321; OrderMethods.cs:3314; PaymentConditionCatalog.cs:124-127, :137).
- **Fuentes de datos:** SIGMavi (conexión de `Conexion.dll` con el alias de `applicationSettings/Server`, DU19), tabla `CondicionesCredVtaLinea`: lectura (OrderMethods.cs:3320-3324; ConexionSQL.cs:72-98). Catálogo en memoria `PaymentConditionCatalog` (PaymentConditionCatalog.cs:8-114).
- **Salida y errores:** 200 con el código como cadena JSON (OrderController.cs:322); 400 por parámetro faltante (OrderController.cs:313-317); 400 `Error, …` con log `[ORDER getCondicion ERROR]` si algo inesperado lanza (OrderController.cs:324-328). En la práctica `GetCondicionAsync` atrapa sus propios errores y responde con el catálogo (OrderMethods.cs:3340-3345).
- **Configuración usada:** `applicationSettings/Server` (ConexionSQL.cs:75-79); `JWT_SECRET_KEY`, `JWT_AUDIENCE_TOKEN`, `JWT_ISSUER_TOKEN` (TokenValidationHandler.cs:47-49).
- **Pendientes conocidos:** el respaldo `ACEF` no distingue VIU (el catálogo sugiere `VCEF` para VIU en su comentario, PaymentConditionCatalog.cs:120); el catálogo no tiene `05 M MA/VIU P DIF` (P18, ACT-36); el log `[ORDER GetCondicion ERROR]` no existía en LAN para crédito (ACT-15).

---

### (sin ruta) Liberador de crédito y aviso a Magento  (LiberadorCreditoMethods.LiberarCliente, LiberadorCreditoMethods.cs:48-107; OrderMethods.CallMagentoAuthorizationCallbackAsync, OrderMethods.cs:1177-1265)

- **Para qué sirve:** después de crear la solicitud, enviarla al **liberador** (servicio externo que la pone en análisis de crédito) y avisar a Magento el estado (`EN_ANALISIS` o `RECHAZADO`). Hoy está **apagado**: el código existe pero nadie lo llama.
- **Quién la llama:** nadie. La única referencia es el bloque comentado de `ProcessCreditPaymentAsync` (OrderMethods.cs:677-711). `LiberateClientCredit` (OrderMethods.cs:1160-1172) tampoco tiene llamador. El aviso va a la ruta del DMZ `order/authorizationResult`, que el DMZ pasa directo a Magento (`MAVI - DMZ-SAP.csv`, fila 90).
- **Entrada:** liberador: `cliente` (cuenta), `id` (folio de la solicitud), `uen` (1 MA, 2 VIU) (LiberadorCreditoMethods.cs:48). Aviso: `entityId`, `status`, `cuenta`, `idSolicitud` (OrderMethods.cs:1177).
- **Cómo funciona (paso a paso):**
  1. Liberador: lee sus tres llaves de configuración (LiberadorCreditoMethods.cs:41-46); si falta alguna, responde `RECHAZADO` (:50-56).
  2. Pide un token con la contraseña configurada (LiberadorCreditoMethods.cs:58-61, :77-80).
  3. Envía `{Cliente, Id, UEN}` con el token en `Authorization` (LiberadorCreditoMethods.cs:63-68, :82-88).
  4. Lee `idVenta` de la respuesta y arma el resultado (LiberadorCreditoMethods.cs:90-99).
  5. Aviso: obtiene un token del DMZ (OrderMethods.cs:1180-1194, :1213-1226) y envía el estado (OrderMethods.cs:1230-1247), con reintentos (OrderMethods.cs:1196, :1257-1263).
- **Reglas de negocio:**
  - RLIB-1: Si falta cualquiera de las tres llaves del liberador → `RECHAZADO` con `IdVenta` 0, sin llamar al servicio (LiberadorCreditoMethods.cs:50-56).
  - RLIB-2: El token del login se manda sin comillas y sin prefijo `Bearer` en `Authorization` (LiberadorCreditoMethods.cs:77-82).
  - RLIB-3: `idVenta > 0` → `EN_ANALISIS` con ese `idVenta`; si no → `EN_ANALISIS` con 0. Nunca devuelve `AUTORIZADO` (LiberadorCreditoMethods.cs:9-13, :92-99).
  - RLIB-4: Cualquier error del liberador → `RECHAZADO` con 0; solo se escribe en consola. La llamada es síncrona (LiberadorCreditoMethods.cs:72, :102-106).
  - RLIB-5: Aviso: token en `URL_DMZ + "login/authenticate"` con el usuario JSON de `USER_DMZ`; sin esa llave manda usuario y contraseña vacíos (OrderMethods.cs:1180-1194, :1213-1226).
  - RLIB-6: Envía `POST URL_DMZ + "order/authorizationResult"` con `Bearer` y cuerpo `{entity_id, status, customer_account, credit_request_id}` (OrderMethods.cs:1182, :1230-1247).
  - RLIB-7: Hasta 3 intentos de 30 s, con esperas de 2 s y 4 s; tras el tercer fallo termina sin lanzar error (solo consola) (OrderMethods.cs:1196, :1210, :1252, :1257-1263).
  - RLIB-8: Acepta cualquier certificado del servidor y fija TLS 1.0, 1.1 y 1.2 para todo el proceso (OrderMethods.cs:1200-1206).
  - RLIB-9: En LAN el liberador corría en segundo plano después de cabecera y líneas, solo para clientes existentes, y el aviso llevaba `idVenta` si era mayor que 0 o el folio si no (bloque de referencia, OrderMethods.cs:677-711).
- **Fuentes de datos:** servicio liberador externo (login y venta; URLs de configuración, LiberadorCreditoMethods.cs:43-44); DMZ `login/authenticate` y `order/authorizationResult` (OrderMethods.cs:1181-1182). No lee ni escribe bases.
- **Salida y errores:** `LiberadorResult {Status, IdVenta}` (LiberadorCreditoMethods.cs:9-13); el aviso no devuelve nada y se traga sus errores (OrderMethods.cs:1257-1263).
- **Configuración usada:** `AUTENTICACION_URL_LIBERADOR`, `VETA_URL_LIBERADOR`, `PASSWORD_AUTENTICACION_LIBERADOR` (LiberadorCreditoMethods.cs:43-45); `URL_DMZ`, `USER_DMZ` (OrderMethods.cs:1180, :1185).
- **Pendientes conocidos:**
  - Encender liberador y aviso cuando el otro equipo termine el liberador (DU11; T1b, ACT-28). Al encenderlo hay que usar la cuenta BP como cliente (el bloque usa `idClienteMagento`), ubicarlo dentro del `try` de líneas y omitir prospectos (ACT-28).
  - El cuerpo del aviso usa llaves en snake_case que el DMZ no reconoce; LAN mandaba `{entityId, status, cuenta, idSolicitud}` (T1a, ACT-09; OrderMethods.cs:1234-1240).
  - El bloque comentado calcula `uen` comparando `storeId` en mayúsculas con `VIU`, distinto de la cabecera, que compara `viu` exacto (OrderMethods.cs:682 frente a :744).
  - El liberador es síncrono (`WebClient`, sin tiempo límite propio). La decisión del plan es llamarlo dentro de una tarea de fondo (P19), con un interruptor `CREDITO_LIBERADOR_ACTIVO` en false que todavía no existe en el código ni en el `Web.config` (U1; ACT-13, ACT-28; LiberadorCreditoMethods.cs:72-88).
  - Las rutas `order/creditStatus/{idSolicitud}` y `order/updateCreditOrderId` no existen en ServicioSAP (DU11; T2a ACT-29, T2b ACT-30). El CSV planea `creditStatus` como `sale/filter` (SD36, fila 82), pero SD36 no ve solicitudes de crédito. Falta definir qué id manda el aviso y cuál consulta `creditStatus` (G5-28).

---

### Reglas comunes del área

- RCOM-1: Paridad de valores con LAN: cada columna guarda lo que guardaban LAN y sus SP (NULL, `''`, default, literal, `ISNULL`, `GETDATE`), con el equivalente SAP como fuente (DU5; SolicitudCreditoWebMethods.cs:35-157, :310-313).
- RCOM-2: Bases: ServicioAndroid por `connectionStrings/MAVICBOSANDROID` del `Web.config` (ConexionSQL.cs:100-129); SIGMavi por `Conexion.dll` con `obtenerConexionSigMaviAsync` (ConexionSQL.cs:72-98; DU19); S/4HANA con la URL de `Conexion.dll` en ambiente Dev y autenticación Basic (TokenGenerator.cs:70-71, :113-133). Los valores de ambiente son de Dev y no se tratan como riesgo (DU1).
- RCOM-3: La cuenta que manda Magento es el BP numérico; no se mapean cuentas `C…` (DU2; OrderMethods.cs:642).
- RCOM-4: Los errores de la solicitud suben hasta el controlador, que siempre responde 200 (`Error, …` o el objeto) y registra `[ORDER NEW ERROR]` (OrderController.cs:37-47; OrderMethods.cs:715-719, :1939-1943).
- RCOM-5: No se agregan logs que LAN no tenía; se conserva `[CREDITO SD29 FILTRO]` como único rastro del respaldo de SD29 (DU17; OrderMethods.cs:1004).
- RCOM-6: Cupones de promotor, DIMAS MX y `CodigoRecomendador` están deprecados en este flujo (DU16; OrderMethods.cs:776; SolicitudCreditoWebMethods.cs:292).
- RCOM-7: Una solicitud se reparte en escrituras separadas (SQLite, cabecera y líneas) sin transacción ni compensación; una falla deja escrituras parciales, igual que en LAN (OrderMethods.cs:1776, :842; SolicitudCreditoWebMethods.cs:161-162).

---

## Crédito (CreditController: SMS, plazos, documentos, montos, Credilana, etc.)

Esta área atiende los pasos del checkout de crédito y del expediente del cliente que no son el alta de la orden (`order/new`, documentado en su propia sección). Hace cinco cosas:

- **Verificación por SMS (NIP):** crea o reutiliza un código de 6 dígitos por cliente y carrito, lo deja en la cola de SMS y después lo compara con lo que tecleó el cliente (`getSms`, `validateSms`, `SendSmsNewNumber`). Las filas que escribe las lee después `order/new` para decidir la validación del teléfono (ver RCR-62).
- **Plazos:** días de gracia de los planes de 12 meses diferido e inmediato, por tienda (Muebles América y VIU) (`getPlazos`).
- **Condiciones de pago:** el catálogo SD40 de SAP tal cual (`condicionespago`).
- **Montos de Credilana:** una tabla de montos y pagos guardada en caché en SQLite (`GetCreditAmounts`).
- **Expediente documental:** guarda documentos e imágenes del cliente en la tabla `MAVI_DOC_CTE` y en disco (`guardardocumento`, `SaveImagesProductosMx`).

Todas las rutas cuelgan del prefijo `credit` y piden token de sesión (CreditController.cs:9-10; ver RCR-56). `AbonosController` también usa el prefijo `credit` (AbonosController.cs:8), pero sus rutas se documentan en su propia sección. `LiberadorCreditoMethods` vive en `Methods\Credit`, pero no tiene ruta en este controlador y hoy no se ejecuta: solo aparece en el flujo de la orden, dentro de un bloque comentado (OrderMethods.cs:678-710) y en `LiberateClientCredit` (OrderMethods.cs:1160-1165), un método que nadie llama. Encenderlo espera al otro equipo (decisión DU11, actividad ACT-28).

Las rutas de archivo son relativas a `ServicioSap\ServicioSap\`: controlador en `Controllers\`, métodos en `Methods\Credit\` (salvo `BusinessPartnerMethods.cs` en `Methods\BusinessPartner\` y `OrderMethods.cs` en `Methods\Order\`), modelos en `Models\SAP\Credit\`, y `ConexionSQL.cs`, `SQLiteDb.cs`, `TokenGenerator.cs`, `TokenValidationHandler.cs`, `PaymentConditionCatalog.cs` y `Logger.cs` en `Helpers\` (o `Helpers\ConexionDB\`), y `WebApiConfig.cs` en `App_Start\`. "DMZ" se refiere a `DMZ\WebApiMagento\Controllers\CreditController.cs` y solo se usa para decir quién llama cada ruta. Los archivos del área están dados de alta en el proyecto (ServicioSap.csproj:221, :255-259, :343, :365-366, :373-375).

**Términos usados en esta sección**

- **BP (Business Partner):** el cliente en SAP; su número es la "cuenta" (10 dígitos, p. ej. `C00000020` pasó a `1500000020`, DocumentMethods.cs:124). Magento manda siempre el BP numérico y aquí no se traducen cuentas `C…` (decisión DU2).
- **OData:** la forma en que SAP S/4HANA publica sus datos por HTTP. Una *entity set* es una colección de registros; `$filter` filtra y `sap-client=110` es el mandante.
- **SD40:** servicio OData v4 de condiciones de pago; su ruta está en la llave `ZAPI_CONDPAGO` (CreditMethods.cs:472).
- **Zterm:** código SAP de 4 caracteres de una condición de pago (p. ej. `12DA`). **Zdiasgracia:** días de gracia de esa condición.
- **NIP / código SMS:** los 6 dígitos que recibe el cliente por SMS para confirmar su teléfono en el checkout de crédito.
- **Cola de SMS:** la tabla `TcAAEA00030_EnvioMensajes` de la base Android. ServicioSAP solo inserta filas ahí; no llama a ningún proveedor de SMS (CreditMethods.cs:140-150, :361-377). Un proceso externo (despachador) lee la tabla y manda el mensaje (SPEC_NIP_SMS §6).
- **UEN:** unidad de negocio, un entero que llega en la petición.
- **MAVI_DOC_CTE:** tabla del expediente documental del cliente, en la base AdminDoc.
- **SQLite `data.db`:** base local de archivo del propio servidor (SQLiteDb.cs:11-21).

| Ruta | Verbo | Qué resuelve | Fuente principal |
|---|---|---|---|
| `credit/SendSmsNewNumber` | POST | Encola el código del carrito hacia un número nuevo | SQL `MAVICBOSANDROID` |
| `credit/getSms` | POST | Crea o reutiliza el código y lo encola al teléfono validado | SQL `MAVICBOSANDROID` + OData BP + API businesspartner |
| `credit/validateSms` | POST | Compara el código tecleado | SQL `MAVICBOSANDROID` |
| `credit/getPlazos` | GET | Días de gracia de los planes de 12 meses por tienda | SIGMavi + SD40 |
| `credit/GetCreditAmounts` | POST | Montos de Credilana por tipo de cliente y UEN | SQLite `data.db` |
| `credit/guardardocumento` | POST | Guarda un documento del expediente | SQL `ADMINDOC` |
| `credit/SaveImagesProductosMx` | POST | Guarda INE y selfie del expediente | SQL `ADMINDOC` + disco |
| `credit/condicionespago` | GET | Catálogo de condiciones de pago | SD40 |

---

### POST /credit/SendSmsNewNumber  (CreditController.SendSmsNewNumber, CreditController.cs:16-24)

- **Para qué sirve:** cuando el cliente captura un número de teléfono nuevo, deja en la cola un SMS con el código de verificación de su carrito hacia ese número.
- **Quién la llama:** la ruta `POST credit/SendSmsNewNumber` de la DMZ, que ya reenvía a ServicioSAP con `curl.PostSAP` (DMZ:302-308).
- **Entrada:** `SendSmsNewNumberRequest` (SendSmsNewNumberRequest.cs:5-11):
  - `Cliente` (texto): la cuenta BP. No se valida.
  - `NumeroTelefono` (texto): en la práctica obligatorio; si llega nulo la ruta responde 500 (ver "Salida y errores").
  - `IdCarrito` (texto): id del carrito de Magento.
  - `EsCredito` (booleano): si no llega vale `false`.
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo es nulo responde 400 `"Datos incompletos."` (CreditController.cs:20-21).
  2. Deja en `NumeroTelefono` solo los dígitos (CreditMethods.cs:122).
  3. Abre la base Android (CreditMethods.cs:126).
  4. Busca el último id de código de verificación de ese cliente y carrito (CreditMethods.cs:128, :161-194).
  5. Si no hay (`"0"`) o la lectura falló (`""`), crea un código nuevo y vuelve a leer su id (CreditMethods.cs:129-132, :196-233).
  6. Si el id sigue vacío responde `{"result": -1}` (CreditMethods.cs:135).
  7. Elige el mensaje según `EsCredito` (CreditMethods.cs:137-138).
  8. Inserta la fila en la cola de SMS con el número limpio (CreditMethods.cs:140-149).
  9. Responde `{"result": <filas insertadas>}` (CreditMethods.cs:150).
- **Reglas de negocio:**
  - RCR-1: El teléfono se reduce a dígitos; no se revisa su longitud ni su tipo (CreditMethods.cs:122).
  - RCR-2: No se revisa que el BP exista ni se liga la cuenta de Magento; eso solo lo hace `getSms` (CreditMethods.cs:120-159).
  - RCR-3: Si el carrito ya tiene código, se reutiliza su último id; no se genera código nuevo ni se mueve su vencimiento (CreditMethods.cs:128-132).
  - RCR-4: Un código nuevo son 6 dígitos con ceros a la izquierda, generados por SQL Server con `CHECKSUM(NEWID())`; vence a los 2 minutos (`FechaExpira`) y nace con `Estatus` 1 (CreditMethods.cs:202-209).
  - RCR-5: Crédito: `IdMensaje` 23 e `Identificador` `DM0363`. No crédito: `IdMensaje` 60 e `Identificador` `DM0312` (CreditMethods.cs:137-138).
  - RCR-6: La fila de la cola lleva `IdRegistro` = id del código, `FechaEnvio` = `GETDATE()`, `EstatusEnvio` 1, `ClienteF` NULL, `Tipo` 0, `IntentoRespuesta` 0, `IntentoEnvio` 0, `Modem` NULL y `Telefono` = número limpio (CreditMethods.cs:140-144).
- **Fuentes de datos:**
  - SQL Android (`MAVICBOSANDROID`), `VTASDCodigoVerificacioneCommerce`: lee el `MAX(IdCodigoVerificacioneCommerce)` por `Cliente` + `IdCarrito` e inserta el código nuevo (CreditMethods.cs:168-170, :206-209).
  - SQL Android, `TcAAEA00030_EnvioMensajes`: inserta la fila de la cola (CreditMethods.cs:140-144).
- **Salida y errores:**
  - 200 `{"result": 1}` cuando encoló el SMS (CreditMethods.cs:149-150).
  - 200 `{"result": -1}` si no consiguió id de código o hubo cualquier excepción dentro del método; se registra `[CREDIT SendSmsNewNumber ERROR]` (CreditMethods.cs:135, :154-158).
  - Los errores al leer o crear el código se registran (`[CREDIT GetIdRef ERROR]`, `[CREDIT InsertCodigoVerificacion ERROR]`) y se tragan (CreditMethods.cs:189-193, :228-232).
  - 400 `"Datos incompletos."` con cuerpo nulo (CreditController.cs:20-21).
  - `NumeroTelefono` nulo: la limpieza falla fuera del `try` y el controlador no la atrapa, así que responde 500 (CreditMethods.cs:122; CreditController.cs:23).
- **Configuración usada:** cadena de conexión `MAVICBOSANDROID` (Web.config:13; ConexionSQL.cs:106-108).
- **Pendientes conocidos:**
  - El INSERT de la cola se arma con `string.Format` y `Cliente` va sin escapar: inyección SQL heredada de LAN, listada como "fuera del plan" (CreditMethods.cs:140-144; CREDITO_WEB_ANALISIS §6.7).
  - El tiempo de espera del comando es 9999999 segundos (CreditMethods.cs:148).

### POST /credit/getSms  (CreditController.GetSms, CreditController.cs:29-48)

- **Para qué sirve:** genera o reutiliza el código NIP del carrito y lo deja en la cola de SMS hacia el teléfono validado del cliente en SAP. De paso guarda en el BP el id de cliente de Magento.
- **Quién la llama:** la ruta `POST credit/getSms` de la DMZ, que hoy todavía la manda a LAN con `curl.Post` (DMZ:68, :76). Cambiarla a ServicioSAP es la actividad ACT-34.
- **Entrada:** `NipRequest` (SmsNipModels.cs:7-12), todos los valores como texto:
  - `Cuenta`: la cuenta BP (obligatoria).
  - `IdCarritoCliente`: id del carrito; debe ser un entero de 32 bits.
  - `Cliente`: **id de cliente de Magento**, no el BP; `"0"` para invitado (SPEC_NIP_SMS §2). Debe ser entero; solo un valor mayor que 0 dispara el PATCH (CreditMethods.cs:271).
  - El `nipCliente: null` que agrega la DMZ se ignora (SmsNipModels.cs:6).
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo es nulo responde 400 sin cuerpo (CreditController.cs:33-34).
  2. Convierte `IdCarritoCliente` y `Cliente` a entero; si falla, registra y responde 500 (CreditController.cs:39, :41-45).
  3. Revisa que el BP exista; si no, responde `"0"` (CreditMethods.cs:266-269, :331-350).
  4. Si el id de Magento es mayor que 0, lo guarda en el BP con un PATCH (CreditMethods.cs:271-276).
  5. Lee el último id de código del carrito (`idRef`) y el teléfono validado (CreditMethods.cs:278-279).
  6. **Carrito sin código** (`idRef` = `"0"`): crea el código. Con teléfono validado lo encola y responde `"3"`; sin teléfono responde `"0"` y el código queda escrito (CreditMethods.cs:281-290, :320).
  7. **Carrito con código:** lee el último `EstatusEnvio` del cliente (CreditMethods.cs:291-294, :379-393):
     - `"1"`: responde `"3"` sin escribir nada (CreditMethods.cs:296-299).
     - `"2"` o `"3"`: copia el mismo código en una fila nueva, vuelve a leer `idRef` y, con teléfono, lo encola y responde `"3"`; sin teléfono responde `"0"` (CreditMethods.cs:300-312, :320).
     - Sin estatus (nunca se encoló) y con teléfono: encola con el `idRef` existente y responde `"3"` (CreditMethods.cs:313-317).
     - Cualquier otro caso: `"0"` (CreditMethods.cs:320).
  8. Registra `[CREDIT GetSms INFO] <cuenta> <resultado>` y responde el resultado como texto (CreditMethods.cs:240-244).
- **Reglas de negocio:**
  - RCR-7: La existencia del BP se revisa **antes** del PATCH. En LAN el UPDATE iba primero, pero sobre un cliente inexistente no hacía nada; un PATCH sobre un BP inexistente falla. El resultado es el mismo: `"0"` (CreditMethods.cs:263-269).
  - RCR-8: Una cuenta vacía o con caracteres que no sean letras o dígitos no se consulta en SAP y responde `"0"` (el filtro OData no escapa el valor) (CreditMethods.cs:336-339). Una cuenta nula responde `"-1"` (CreditMethods.cs:333-334, :322-326).
  - RCR-9: "BP no existe" se reconoce por el texto `No se encontraron clientes` del método de consulta; cualquier otro error de SAP responde `"-1"` (CreditMethods.cs:346-349; BusinessPartnerMethods.cs:56-58, :65-67).
  - RCR-10: Con id de Magento > 0 se hace el PATCH `ZidMagento`; si falla, la ruta responde `"-1"` y no se encola ningún SMS (CreditMethods.cs:271-276, :322-326; BusinessPartnerMethods.cs:867-870).
  - RCR-11: El teléfono validado es el que entrega `GetTelefonoValidadoAsync` (ver RCR-63 a RCR-68), recortado de espacios y solo si mide exactamente 10 caracteres; si no, se trata como "sin teléfono" (CreditMethods.cs:355-359).
  - RCR-12: `idRef` = `"0"` significa que el carrito no tiene código: la consulta es `ISNULL(MAX(...), '')` y sin filas da 0 (CreditMethods.cs:168-170). Si la lectura falla devuelve `""` y el flujo sigue por la rama "carrito con código", igual que LAN (CreditMethods.cs:189-193, :281).
  - RCR-13: El estatus se busca por cliente en **todos** sus carritos y solo para `IdMensaje` 23; gana la fila más reciente (`ORDER BY Id DESC`) (CreditMethods.cs:383).
  - RCR-14: El código trata el estatus 1 como "todavía en cola, no reenviar" y 2 o 3 como "ya procesado, se puede reenviar" (CreditMethods.cs:296-312).
  - RCR-15: Reenviar es insertar otra fila con el **mismo** código, vencimiento a 2 minutos y `Estatus` 1 (CreditMethods.cs:412-418). El código se toma sin `ORDER BY` (CreditMethods.cs:399). En el flujo normal todas las filas de un carrito llevan el mismo código, porque solo se crea uno nuevo cuando el carrito no tiene ninguno (CreditMethods.cs:281-283). La excepción es `SendSmsNewNumber`: si falla la lectura del id, crea otro código para el mismo carrito (CreditMethods.cs:129-131), y entonces el reenvío copia cualquiera de los dos.
  - RCR-16: La fila de la cola de `getSms` siempre es `IdMensaje` 23, `Identificador` `DM0363`, `EstatusEnvio` 1 y `Telefono` = teléfono validado (CreditMethods.cs:365-372).
  - RCR-17: El valor `"1"` nunca se devuelve: sin teléfono validado la respuesta es `"0"`, igual que un BP inexistente (CreditMethods.cs:257-327).
  - RCR-18: El log INFO solo lleva la cuenta y el resultado; nunca el código ni el teléfono (CreditMethods.cs:242).
- **Fuentes de datos:**
  - OData S/4 `ZB_DATOS_CLIENTE_CDS`, entity set `ZB_DATOS_CLIENTE`, `$filter=BusinessPartner eq '<cuenta>'`, `$top=1`, `sap-client=110`, `$format=json`: lectura. Una respuesta vacía, con error o en HTML cuenta como error de SAP (BusinessPartnerMethods.cs:30, :43-51).
  - OData S/4 `ZSDT_CTE_ODATA_SRV`, `ZSDT_CTE_ENTITYSet(ZclienteBp='<cuenta>')`: PATCH con cuerpo `{ZidMagento}` y token CSRF (BusinessPartnerMethods.cs:842-860).
  - API businesspartner `A_GET_TelefonoValidado?sCliente=<cuenta>`: lectura (SolicitudCreditoWebMethods.cs:485-492).
  - SQL Android, `VTASDCodigoVerificacioneCommerce`: lee el último id y el código; inserta códigos nuevos y copias de reenvío (CreditMethods.cs:168-170, :204-209, :399, :417-418).
  - SQL Android, `TcAAEA00030_EnvioMensajes`: lee el último estatus e inserta la fila de la cola (CreditMethods.cs:365-366, :383).
- **Salida y errores:**
  - 200 con texto: `"3"` SMS encolado o uno anterior sigue en cola; `"0"` BP inexistente, sin teléfono validado de 10 dígitos o estatus no previsto; `"-1"` error en cualquier paso, registrado como `[CREDIT VTASCodigoSMSEcommerce ERROR]` (CreditMethods.cs:322-326). La DMZ traduce estos códigos (CreditController.cs:26-28).
  - `"err"` solo sale si algo falla fuera de ese bloque (CreditMethods.cs:246-250); en la práctica casi no ocurre, porque el bloque interno ya atrapa todo.
  - 400 sin cuerpo con cuerpo nulo; 500 sin cuerpo si `IdCarritoCliente` o `Cliente` no son enteros, registrado como `[CREDIT GetSms ERROR]` (CreditController.cs:33-34, :41-45).
  - El PATCH deja en el log su cuerpo (`[SAP ZidMagento PATCH REQUEST]`, solo el id de Magento) y la respuesta de SAP (`[SAP ZidMagento PATCH RESPONSE]`) (BusinessPartnerMethods.cs:853-854, :864-865).
- **Configuración usada:** `MAVICBOSANDROID` (Web.config:13); `URL_BP_API` (Web.config:29; si falta, la ruta responde `"-1"`, SolicitudCreditoWebMethods.cs:487-490). La URL base de S/4 y sus credenciales salen de `Conexion.dll` (BusinessPartnerMethods.cs:30; TokenGenerator.cs:70-71).
- **Pendientes conocidos:**
  - La DMZ todavía apunta a LAN (DMZ:76): ACT-34. El CSV de rutas (filas 5-6) la marca "To Do" aunque ServicioSAP ya la tiene.
  - La URL del PATCH `ZidMagento` no lleva `sap-client=110` (BusinessPartnerMethods.cs:842-843); el PATCH no se ha visto correr en los logs (CREDITO_WEB_ANALISIS §6.7; SPEC_NIP_SMS §5, pregunta 2).
  - No hay evidencia de que el despachador de SMS procese filas con cuenta BP; la primera prueba positiva lo confirma (SPEC_NIP_SMS §6).
  - Se conservan a propósito los defectos de LAN (decisión Q9, "igual que LAN"): sin límite de intentos en el servidor (lo cuenta Magento) y código generado con `CHECKSUM(NEWID())`, que no es criptográfico (CreditMethods.cs:204).

### POST /credit/validateSms  (CreditController.ValidateSms, CreditController.cs:52-71)

- **Para qué sirve:** confirma si el código que tecleó el cliente corresponde a su cuenta y a su carrito.
- **Quién la llama:** la ruta `POST credit/validateSms` de la DMZ, que hoy todavía la manda a LAN (DMZ:99, :107): ACT-34.
- **Entrada:** `ClaveRequest` (SmsNipModels.cs:14-19), valores de texto: `Cuenta` (BP), `ClaveSms` (código tecleado), `IdCarritoCliente` (entero de 32 bits).
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo es nulo responde 400 sin cuerpo (CreditController.cs:56-57).
  2. Convierte `IdCarritoCliente` a entero; si falla, registra y responde 500 (CreditController.cs:62, :64-68).
  3. Busca una fila de código con esa cuenta, carrito y código (CreditMethods.cs:440-452).
  4. Responde `"5"` si la encuentra y `"6"` si no (CreditMethods.cs:454).
- **Reglas de negocio:**
  - RCR-19: Coincidencia exacta de `Cliente` + `IdCarrito` + `Codigo`, con los anchos del SP de LAN: `Cliente` texto de 15, `IdCarrito` entero y `Codigo` texto de 35; un valor más largo se recorta en silencio (CreditMethods.cs:447-449).
  - RCR-20: No revisa `FechaExpira` ni `Estatus`, no cuenta intentos y no marca el código como usado: el código sigue sirviendo después de validarse y después de los 2 minutos (CreditMethods.cs:431-434, :442-443). Es paridad con LAN (decisión Q9).
  - RCR-21: Sirve cualquier fila del carrito, incluidas las copias de reenvío, que llevan el mismo código (CreditMethods.cs:442-443; RCR-15).
  - RCR-22: Tiempo de espera de la consulta: 60 segundos (CreditMethods.cs:450).
- **Fuentes de datos:** SQL Android, `VTASDCodigoVerificacioneCommerce`: lectura `SELECT TOP 1 IdCodigoVerificacioneCommerce` (CreditMethods.cs:442-443).
- **Salida y errores:**
  - 200 `"5"` (coincide) o `"6"` (no coincide) (CreditMethods.cs:454).
  - Ante una excepción (por ejemplo, `Cuenta` o `ClaveSms` nulos dejan un parámetro sin valor) responde **200 con el texto de la excepción** y la registra como `[CREDIT ValidateSms ERROR]` (CreditMethods.cs:458-462). La DMZ trata cualquier valor distinto de 5 o 6 como error.
  - 400 sin cuerpo con cuerpo nulo; 500 sin cuerpo si `IdCarritoCliente` no es entero (CreditController.cs:56-57, :64-68).
- **Configuración usada:** `MAVICBOSANDROID` (Web.config:13).
- **Pendientes conocidos:**
  - La DMZ todavía apunta a LAN (ACT-34).
  - Devolver el texto de la excepción al llamador es comportamiento de LAN que se conservó (CreditMethods.cs:461).
  - Un `IdCarritoCliente` mayor que 2,147,483,647 no cabe en un entero de 32 bits y la ruta responde 500 (CreditController.cs:62, :64-67). Igual que LAN; el riesgo con los ids que arma Magento está en SPEC_NIP_SMS §6.

### GET /credit/getPlazos  (CreditController.GetPlazos, CreditController.cs:73-86)

- **Para qué sirve:** dice, por tienda (Muebles América y VIU), cuántos días de gracia tiene el plan de 12 meses diferido y el de 12 meses inmediato.
- **Quién la llama:** la ruta `GET credit/getPlazos` de la DMZ, con `curl.GetSAP` (DMZ:432, :439).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. Trae todas las condiciones de pago de SD40, sin filtro (CreditMethods.cs:21; ver `condicionespago`).
  2. Abre SIGMavi (CreditMethods.cs:24-25).
  3. **Diferidos:** lee `CondicionPropre` y `TiendaVirtual` de `CondicionesCredVtaLinea` con `Mensualidades = 12` y `CondicionPropre LIKE '%DIF%'` (CreditMethods.cs:28-31).
  4. Recorre las filas y toma solo la primera de cada tienda (CreditMethods.cs:39-64):
     - traduce `CondicionPropre` a Zterm con el catálogo fijo (CreditMethods.cs:45);
     - busca esa Zterm en SD40 (CreditMethods.cs:46);
     - toma `Zdiasgracia` como entero (CreditMethods.cs:47-54);
     - agrega `{Days, StoreCode}` (CreditMethods.cs:55-59).
  5. **Inmediatos:** lo mismo con `CondicionPropre LIKE '%INM%'` (CreditMethods.cs:70-109).
- **Reglas de negocio:**
  - RCR-23: Solo planes de 12 mensualidades (CreditMethods.cs:30, :72).
  - RCR-24: Diferido = la condición contiene `DIF`; inmediato = contiene `INM` (CreditMethods.cs:31, :73).
  - RCR-25: Solo cuentan las tiendas `MUEBLES AMERICA` y `VIU` (se comparan en mayúsculas) y va una entrada por tienda: la primera fila que devuelva SQL. La consulta no tiene `ORDER BY` (CreditMethods.cs:28-31, :41-42, :61-63).
  - RCR-26: `CondicionPropre` se traduce a Zterm con `PaymentConditionCatalog` (sin distinguir mayúsculas y quitando espacios de los extremos); sin equivalencia queda `""` (PaymentConditionCatalog.cs:8, :122-138; CreditMethods.cs:45). Ejemplos: `12 M MA P DIF` → `12DA`, `12 M VIU P INM` → `12IV` (PaymentConditionCatalog.cs:57, :64).
  - RCR-27: `Days` = `Zdiasgracia` de la primera condición SD40 con esa Zterm, sin filtrar por sociedad ni organización de ventas. Si no hay condición o el valor no es entero, `Days` = 0 (CreditMethods.cs:46-54).
  - RCR-28: `StoreCode` = nombre de la tienda con los espacios cambiados por `_`: `MUEBLES_AMERICA` o `VIU` (CreditMethods.cs:58, :100).
  - RCR-29: Una tienda sin fila en SIGMavi no aparece en la lista (CreditMethods.cs:42).
- **Fuentes de datos:**
  - SD40 (OData v4, ruta en `ZAPI_CONDPAGO`): lectura de todas las condiciones (CreditMethods.cs:21, :465-517).
  - SIGMavi, tabla `CondicionesCredVtaLinea`: lectura (CreditMethods.cs:28-31, :70-73).
- **Salida y errores:**
  - 200 `{"Diferidos": [{"Days": n, "StoreCode": "..."}], "Inmediatos": [...]}` (CreditAmountModels.cs:49-65).
  - Cualquier error se registra como `[CREDIT GetPlazos ERROR]` y la ruta responde 200 con lo que alcanzó a llenar: si falla SD40, las dos listas van vacías (CreditMethods.cs:112-117). Por eso el 500 del controlador (CreditController.cs:82-85) en la práctica no ocurre.
- **Configuración usada:** `ZAPI_CONDPAGO` (Web.config:88). SIGMavi sale de `Conexion.dll` con el alias de servidor `Server` de `applicationSettings` (Web.config:157-161; ConexionSQL.cs:75, :79), por decisión DU19. La URL de S/4 sale de `Conexion.dll` (CreditMethods.cs:469).
- **Pendientes conocidos:**
  - DU19: `Conexion.dll` solo reconoce ciertos alias de servidor; para Prod hace falta uno que el DLL conozca (CREDITO_WEB_ANALISIS §4.5; actividad ACT-37). No es bloqueo (DU1).
  - Sin `ORDER BY`, la fila elegida por tienda puede cambiar si SIGMavi tiene varias (CreditMethods.cs:28-31).

### POST /credit/GetCreditAmounts  (CreditController.GetCreditAmounts, CreditController.cs:98-130)

- **Para qué sirve:** devuelve los montos de Credilana (préstamo máximo, bonificación máxima y la tabla de pagos por artículo) para un tipo de cliente y una UEN. Los lee de una caché local. Es la partida E-06 (CreditController.cs:88).
- **Quién la llama:** la ruta `POST credit/GetCreditAmounts` de la DMZ, con `curl.PostSAP` (DMZ:346, :352).
- **Entrada:** `ArticuloUenRequest` (CreditAmountModels.cs:10-15):
  - `articulo` (texto, obligatorio): `"nuevo"` o `"casa"`.
  - `uen` (entero): si no llega vale 0.
  - `tipo` (texto): solo importa con `"nuevo"`.
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo es nulo responde 400 `"Datos incompletos."` (CreditController.cs:102-103).
  2. Elige el campo de la caché según `articulo` y `tipo` (CreditController.cs:108-120).
  3. Lee `data` de `mavi_credilana_info` con ese campo y esa UEN (CredilanaMethods.cs:16-24).
  4. Si no hay fila o `data` está vacío, falla (CredilanaMethods.cs:25-33).
  5. Convierte el JSON guardado al modelo de respuesta y lo devuelve (CredilanaMethods.cs:35).
  6. Con cualquier otro `articulo` responde 400 (CreditController.cs:129).
- **Reglas de negocio:**
  - RCR-30: `"nuevo"` + `tipo` `"CREDITO"` → campo `montos_cte_nuevo` (CreditController.cs:108-111).
  - RCR-31: `"nuevo"` + cualquier otro `tipo` (incluido vacío o nulo) → `montos_cte_nuevo_apertura` (CreditController.cs:113-114).
  - RCR-32: `"casa"` → `montos_cte_casa`; el `tipo` se ignora (CreditController.cs:117-119).
  - RCR-33: Las comparaciones son exactas y distinguen mayúsculas: `"Nuevo"` o `"credito"` no entran (CreditController.cs:108, :110, :117).
  - RCR-34: Un `articulo` nulo provoca un error dentro del `try` y responde 500 (CreditController.cs:106-108, :122-127).
  - RCR-35: La búsqueda es exacta por (`field`, `uen`); si hay varias filas se usa la primera (CredilanaMethods.cs:17, :30).
  - RCR-36: Las tres ramas usan el mismo modelo, también `"casa"`; un campo del JSON que no esté en el modelo se pierde (CreditAmountModels.cs:38-46).
- **Fuentes de datos:** SQLite `data.db`, tabla `mavi_credilana_info` (columnas `field`, `data`, `uen`): lectura (CredilanaMethods.cs:17; SQLiteDb.cs:240-269). La tabla se define en `Scripts\SQLite\01_CrearTablas_Ola3.sql:53-69`.
- **Salida y errores:**
  - 200 `{"hasta_un_maximo_de_prestamo": decimal, "hasta_una_bonificacion_de": entero, "articulos": [...]}`. Cada artículo trae `articulo`, `monto`, `total_sin_bonificacion`, `total_con_bonificacion`, `meses`, `semanas`, `condicion`, `bonificacion`, `abono_sin_bonificacion`, `tipo_de_abono`, `abono_con_bonificacion`, `tasa_con_bonificacion`, `cat_con_bonificacion`, `interes_con_bonificacion`, `tasa_sin_bonificacion`, `cat_sin_bonificacion` e `interes_sin_bonificacion` (CreditAmountModels.cs:17-46). Los nombres van en minúsculas porque así viajan en el JSON (CreditAmountModels.cs:6-9).
  - 400 `"Datos incompletos."` con cuerpo nulo; 400 sin cuerpo con un `articulo` no previsto (CreditController.cs:102-103, :129).
  - 500 sin cuerpo si falta la fila, `data` está vacío, falta la base o la tabla, o `articulo` es nulo; se registra `[CREDIT GetCreditAmounts ERROR] articulo=… tipo=… uen=…` (CreditController.cs:122-127; CredilanaMethods.cs:25-33). A diferencia de otras consultas de `SQLiteDb`, esta no se traga el error (SQLiteDb.cs:236-239, :264-267). Si falta el archivo `data.db`, la conexión no pide que exista (SQLiteDb.cs:27), así que SQLite lo crea vacío y la consulta falla por tabla inexistente.
- **Configuración usada:** `SQLITE_DB_PATH` (Web.config:59); si no tiene valor se usa la ruta por defecto del sitio (SQLiteDb.cs:16-21). En el equipo del desarrollador `Web.local.config` puede sobrescribir la llave (Web.config:17-20).
- **Pendientes conocidos:**
  - Nadie llena `mavi_credilana_info` desde ServicioSAP. La cargaba `credit/SaveCredilanaInfo` (M-07), que solo existe en LAN (CredilanaMethods.cs:26-28; 01_CrearTablas_Ola3.sql:44-45; CSV fila 118). Mientras no se llene, la ruta responde 500. Está listado "sin dueño" (CREDITO_WEB_ANALISIS §6.7).
  - Credilana está fuera del alcance de la migración (decisión del 2026-09-11, CREDITO_WEB_ANALISIS §4.2).

### POST /credit/guardardocumento  (CreditController.GuardarDocumento, CreditController.cs:139-156)

- **Para qué sirve:** guarda un documento del expediente del cliente (PDF o imagen) en la tabla `MAVI_DOC_CTE`. Es la partida E-07 (CreditController.cs:132).
- **Quién la llama:** la ruta `POST credit/guardardocumento` de la DMZ. La DMZ recibe `multipart/form-data`, lo convierte a este JSON y lo reenvía con `curl.PostSAP` (DMZ:450, :493; CreditController.cs:135-136).
- **Entrada:** `BodyImagenBase64` (DocumentModels.cs:13-34):
  - `Cliente` (texto): BP, o cualquier otro identificador (ver RCR-38).
  - `TipoDoc` (entero): tipo de documento; decide `IdFoto` y `Formato`.
  - `IdFoto` (entero) y `Formato` (texto): casi siempre se sobrescriben (RCR-37).
  - `UsuarioCarga`, `idVenta`, `Aval` (texto): opcionales; si no llegan se guardan NULL.
  - `FileInputBase64` (texto): el archivo en Base64.
  - `MovMovid`: campo muerto; se recibe y nunca se lee (DocumentModels.cs:29-31).
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo es nulo responde 400 `"Invalid JSON payload"` (CreditController.cs:143-144).
  2. Fija `IdFoto` y `Formato` según `TipoDoc` (DocumentMethods.cs:64-108).
  3. Registra el inicio con cliente, tipo y longitud del Base64, sin el contenido (DocumentMethods.cs:112-114).
  4. Convierte el Base64 a bytes (DocumentMethods.cs:116).
  5. Elige la rama `Cliente` o `Token` (DocumentMethods.cs:133-134).
  6. Abre AdminDoc y ejecuta el INSERT de esa rama (DocumentMethods.cs:137-183).
  7. Si el SQL devuelve la fila `SELECT 1`, marca éxito y lo registra (DocumentMethods.cs:184-200).
- **Reglas de negocio:**
  - RCR-37: Tabla de `TipoDoc`, copiada literal de LAN (DocumentMethods.cs:62-108):

    | `TipoDoc` | `IdFoto` | `Formato` |
    |---|---|---|
    | 13 | 10 | `PDF` |
    | 14 | 1 | `IMG` |
    | 19 | 2 | el que llegó |
    | 23 | 10 | `IMG` |
    | 104 | 4 | el que llegó |
    | 80 y 170 | 6 | `IMG` |
    | 99, 100, 101, 102, 103 | 0 | `PDF` |
    | 166 | 10 | `PDF` |
    | cualquier otro | el que llegó | `IMG` |

  - RCR-38: Rama `Cliente` si la cuenta empieza con `15` y mide 10 caracteres o menos; cualquier otro valor, incluido nulo, va por la rama `Token` (DocumentMethods.cs:133-134). Es la adaptación al BP decidida el 20-ago-2026: LAN preguntaba por cuentas `C`/`P` de hasta 11 caracteres, y con el BP esa condición nunca se cumpliría. La consulta de documentos (`SpMaviConsultaDoc`) busca por `CLAVE` con la cuenta de 10 caracteres (DocumentMethods.cs:118-132).
  - RCR-39: Rama `Cliente`: `CLAVE` = cuenta, `DIR` = `''`, y guarda `ID_EXTERNO` (= `idVenta`) e `ID_FOTO` (DocumentMethods.cs:142-151, :177).
  - RCR-40: Rama `Token`: `CLAVE` = `''` y `DIR` = el valor recibido; no guarda `ID_EXTERNO` ni `ID_FOTO` (DocumentMethods.cs:152-161).
  - RCR-41: En las dos ramas: `TIPO_DOC` = `TipoDoc`, `AVAL`, `FECHA` = `GETDATE()`, `DOCUMENTO` = bytes, `ESTATUS` 1, `IDAPLICACION` 24, `FORMATO` y `UsuarioCarga` (DocumentMethods.cs:144-148, :154-158).
  - RCR-42: La rama `Actualizar` del SQL (pasar documentos de `DIR` a `CLAVE`) no se alcanza: `@Opcion` solo vale `Cliente` o `Token` y `@GuidCliente` va fijo en `""`. Se dejó para no divergir del original (DocumentMethods.cs:139-141, :162-168, :173, :181).
  - RCR-43: Un `FileInputBase64` nulo guarda un documento de 0 bytes; un Base64 inválido falla con 500 (DocumentMethods.cs:116, :205-211).
- **Fuentes de datos:** SQL AdminDoc (`ADMINDOC`), tabla `MAVI_DOC_CTE`: INSERT (DocumentMethods.cs:137, :142-161).
- **Salida y errores:**
  - 200 `{"Success": true, "Message": "Información almacenada correctamente"}` (DocumentMethods.cs:188-192).
  - 200 `{"Success": false, "Message": ""}` si el INSERT no devolvió fila; no lanza error (DocumentMethods.cs:55-60, :213).
  - 400 `"Invalid JSON payload"` con cuerpo nulo (CreditController.cs:143-144).
  - 500 ante una excepción: se registra `[CREDIT guardardocumento ERROR]`, se relanza como en LAN y el controlador responde `InternalServerError(ex)` (DocumentMethods.cs:205-211; CreditController.cs:152-155). Con `customErrors` en `Off` el cuerpo incluye el mensaje y la traza (Web.config:94).
- **Configuración usada:** cadena de conexión `ADMINDOC` (Web.config:15; ConexionSQL.cs:171-173).
- **Pendientes conocidos:**
  - La ruta de la DMZ es anónima (`[AllowAnonymous]`), pero la de ServicioSAP exige token porque la DMZ se autentica (CreditController.cs:137-138). El CSV la marca "Migrar lógica a SAP" (fila 16), dato solo informativo.
  - La rama `Cliente` del SQL usa `@AVAL`, pero el parámetro se declara `@Aval` (DocumentMethods.cs:148, :179). Funciona mientras la intercalación (collation) de SQL Server no distinga mayúsculas; con una que sí las distinga, esa rama fallaría. El SQL viene literal de LAN (DocumentMethods.cs:139-141).

### POST /credit/SaveImagesProductosMx  (CreditController.SaveImagesProductosMx, CreditController.cs:164-178)

- **Para qué sirve:** guarda las fotos del expediente de crédito: las de la INE en disco y la selfie en disco y en `MAVI_DOC_CTE`. Es la partida E-08 (CreditController.cs:158).
- **Quién la llama:** la ruta `POST credit/SaveImagesProductosMx` de la DMZ, con `curl.PostSAP` (DMZ:211, :221).
- **Entrada:** `SaveImagesRequest` (DocumentModels.cs:37-48):
  - `Account` (texto): la cuenta; va directo a `CLAVE`.
  - `Ine` (arreglo de imágenes) y `Selfie` (imagen): en la práctica obligatorios (RCR-49).
  - `PruebaDeVida` (arreglo): se recibe y nunca se usa (DocumentModels.cs:45-47).
  - Cada imagen (`ImagenBase64`, DocumentModels.cs:53-59): `Name` (nombre base del archivo), `Data` (Base64) y `Mime`.
- **Cómo funciona (paso a paso):**
  1. Programa el trabajo en segundo plano y responde `true` en el acto (DocumentMethods.cs:229, :263).
  2. El trabajo espera 10 segundos (DocumentMethods.cs:231).
  3. Por cada imagen de la INE, con índice desde 1: normaliza el `Mime`, comprime y escribe el archivo (DocumentMethods.cs:235, :242-247).
  4. Selfie: pone `Mime` = `jpg`, la inserta en `MAVI_DOC_CTE` y la escribe en disco con el índice siguiente (DocumentMethods.cs:249-251).
  5. Si algo truena en el lote, lo registra como `[CREDIT SaveImagesProductosMx ERROR] Account=…` (DocumentMethods.cs:253-260).
- **Reglas de negocio:**
  - RCR-44: Un 200 con `true` **no** significa que las imágenes se guardaron; solo que el trabajo quedó programado. Es el comportamiento de LAN (CreditController.cs:161-163; DocumentMethods.cs:263).
  - RCR-45: INE: `Mime` `jpeg` se queda; cualquier otro valor pasa a `jpg` (DocumentMethods.cs:244-245).
  - RCR-46: Nombre del archivo: `{Name}_{n}.{Mime}`. La INE usa n = 1, 2, …; la selfie, el número que sigue (DocumentMethods.cs:235, :246, :251, :327). Si el archivo ya existe se sobrescribe (DocumentMethods.cs:331).
  - RCR-47: Compresión: siempre JPEG sobre fondo blanco. La calidad empieza en 90 y baja de 10 en 10 hasta 20, hasta que el archivo pese 1,000,000 bytes o menos; si ni así baja, se guarda el último intento (DocumentMethods.cs:350-389). El comentario de DocumentMethods.cs:347 dice "de 90 en 90", pero el código baja de 10 en 10 (DocumentMethods.cs:383).
  - RCR-48: Selfie en `MAVI_DOC_CTE`: `TIPO_DOC` `'14'`, `CLAVE` = `Account`, `DIR` NULL, `FECHA` = `GETDATE()`, `ESTATUS` 1, `IDAPLICACION` 7 y `FORMATO` `'IMG'`, sin la lógica de ramas de `guardardocumento` (DocumentMethods.cs:272-294).
  - RCR-49: No hay validación de nulos, a propósito: si `Ine` o `Selfie` llegan nulos, el lote se aborta ahí (con `Ine` nulo tampoco se guarda la selfie), como en LAN (DocumentMethods.cs:237-242). Un cuerpo nulo también responde `true` y solo deja log (DocumentMethods.cs:253-260).
  - RCR-50: Una imagen con `Data` nulo se salta; si falla una imagen o el INSERT de la selfie, se registra (`[CREDIT SaveCompressedFile ERROR]`, `[CREDIT SaveSelfieImageForCredit ERROR]`) y el lote sigue (DocumentMethods.cs:300-305, :317-318, :339-344).
  - RCR-51: Carpeta: `IMAGES_CREDIT_PATH`, o la ruta por defecto de ServicioSAP si no tiene valor (decisión del 19-ago-2026). Se crea si no existe. Es disco local del servidor, sin impersonación (DocumentMethods.cs:30-49, :324-325).
  - RCR-52: `PruebaDeVida` no se guarda ni en disco ni en base (DocumentModels.cs:45-47).
- **Fuentes de datos:** SQL AdminDoc, `MAVI_DOC_CTE`: INSERT de la selfie (DocumentMethods.cs:284-296). Sistema de archivos local: escritura de las imágenes (DocumentMethods.cs:324-335).
- **Salida y errores:**
  - 200 `true` en cuanto se programa el trabajo (DocumentMethods.cs:263).
  - 200 `false` (booleano) si falla al programarlo (DocumentMethods.cs:265-269). Si la excepción llega al controlador, responde 200 con el **texto** `"false"`, no con un booleano (CreditController.cs:173-177).
  - Los errores posteriores solo quedan en el log (DocumentMethods.cs:253-260).
- **Configuración usada:** `ADMINDOC` (Web.config:15) e `IMAGES_CREDIT_PATH` (Web.config:62).
- **Pendientes conocidos:**
  - El trabajo corre en una tarea suelta que nadie espera (DocumentMethods.cs:229); si el proceso del sitio se detiene antes de que termine, se pierde.
  - `Name` se usa tal cual para armar la ruta del archivo, sin limpiarlo (DocumentMethods.cs:327).

### GET /credit/condicionespago  (CreditController.GetCondicionesPago, CreditController.cs:179-193)

- **Para qué sirve:** devuelve el catálogo completo de condiciones de pago de SAP (SD40).
- **Quién la llama:** no aparece en la DMZ ni en el CSV de rutas. El mismo método lo usa `getPlazos` (CreditMethods.cs:21). La única llamada con filtro, desde la orden, está dentro de un bloque comentado (OrderMethods.cs:2238-2274).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. Toma la URL base de S/4 de `Conexion.dll` y cambia `/odata/sap` por `/odata4/sap`, porque SD40 es OData v4 (CreditMethods.cs:469-470).
  2. Lee la ruta del servicio de `ZAPI_CONDPAGO`; si falta, falla; si no empieza con `/`, se la agrega (CreditMethods.cs:472-479).
  3. Arma la URL con `sap-client=110` y `sap-language=ES` (CreditMethods.cs:481).
  4. Hace el GET con el cliente HTTP de S/4 (CreditMethods.cs:488-494).
  5. Cuerpo vacío → lista vacía; si no, devuelve el arreglo `value` (CreditMethods.cs:503-509).
- **Reglas de negocio:**
  - RCR-53: Mandante 110 e idioma español en cada consulta (CreditMethods.cs:481).
  - RCR-54: El método acepta un `$filter` opcional que se pega tal cual, sin codificar; esta ruta nunca lo manda (CreditMethods.cs:483-486; CreditController.cs:185).
  - RCR-55: Un cuerpo vacío de SAP se toma como "sin condiciones" y no como error (CreditMethods.cs:503-506).
- **Fuentes de datos:** OData v4 SD40 (ruta de servicio y entity set en `ZAPI_CONDPAGO`): lectura sin filtro (CreditMethods.cs:481).
- **Salida y errores:**
  - 200 arreglo de condiciones con `Bukrs`, `Zterm`, `Zgrupogral`, `Zgrupopropre`, `Ztipoventa`, `Ztipocondicion`, `Zproductounico`, `Zdima`, `Zplazoeje`, `Zplazo`, `Zdiasgracia`, `Zperiodicidad`, `Zestatus`, `Zdiferido`, `Vkorg`, `Vtweg` y `Zfechadif` (CondicionPagoResponse.cs:12-64).
  - Si SAP no responde con éxito o falta la llave, el método lanza `Error intentando obtener las condiciones de pago (SD40): …`; el controlador lo registra como `[CREDIT GetCondicionesPago ERROR]` y responde 500 con el detalle de la excepción (CreditMethods.cs:473-476, :498-501, :513-516; CreditController.cs:188-192; Web.config:94).
- **Configuración usada:** `ZAPI_CONDPAGO` (Web.config:88). La URL base y las credenciales de S/4 salen de `Conexion.dll` (CreditMethods.cs:469; TokenGenerator.cs:70-71).
- **Pendientes conocidos:** ninguno en el código de la ruta.

---

### Reglas comunes del área

- RCR-56: Todas las rutas piden un token JWT (el token de sesión que entrega el login) en el encabezado `Authorization`, con o sin el prefijo `Bearer `. Lo valida `TokenValidationHandler`, registrado para todo el sitio, con `JWT_SECRET_KEY`, `JWT_AUDIENCE_TOKEN` y `JWT_ISSUER_TOKEN` (CreditController.cs:9; WebApiConfig.cs:17; TokenValidationHandler.cs:24-29, :47-49; Web.config:31-33). Casos:
  - Sin encabezado, o con más de uno: el manejador deja pasar la petición sin usuario y el `[Authorize]` del controlador responde 401 (TokenValidationHandler.cs:24-27, :39-43; CreditController.cs:9).
  - Token con firma, emisor o audiencia inválidos, o vencido: 401 sin cuerpo. Un token sin fecha de vencimiento también se rechaza (TokenValidationHandler.cs:54-62, :70-73, :82-89).
  - Cualquier otro error al leer el token (por ejemplo, un texto que no es JWT): 500 sin cuerpo (TokenValidationHandler.cs:74-79).
- RCR-57: Conexiones. La base Android y AdminDoc salen de las cadenas `MAVICBOSANDROID` y `ADMINDOC` del `Web.config` (ConexionSQL.cs:106-108, :171-173), decisión DU1. SIGMavi sale de `Conexion.dll` con el alias `Server` (ConexionSQL.cs:75-79), decisión DU19. Todas vienen ya abiertas (ConexionSQL.cs:86-89, :117-120, :182-185). Los valores de ambiente son de Dev y no son bloqueo (DU1).
- RCR-58: Cliente HTTP de S/4: usuario técnico desde `Conexion.dll` (guardado en memoria después de la primera lectura), autenticación Basic, tiempo de espera de 60 segundos, respuesta JSON y el certificado del servidor no se valida (TokenGenerator.cs:60-81, :113-133). La URL base también sale de `Conexion.dll`, pero la pide cada método al armar su URL (CreditMethods.cs:469; BusinessPartnerMethods.cs:30, :842).
- RCR-59: La cuenta es siempre el BP numérico; no se traducen cuentas `C…` (DU2). Una cuenta `C…` no existe como BP y `getSms` responde `"0"` (CreditMethods.cs:331-350); en `guardardocumento` iría por la rama `Token` (DocumentMethods.cs:133-134).
- RCR-60: Paridad con LAN: los valores y los defectos del legado se conservan a propósito. Para SMS es la decisión Q9 ("igual que LAN"); para el expediente lo dicen los comentarios del código (DocumentMethods.cs:139-141, :237-242).
- RCR-61: Errores 500: `InternalServerError(ex)` (`getPlazos`, `guardardocumento`, `condicionespago`) devuelve el mensaje y la traza porque `customErrors` está en `Off` (CreditController.cs:84, :154, :191; Web.config:94). `HttpResponseException` (`getSms`, `validateSms`, `GetCreditAmounts`) responde sin cuerpo (CreditController.cs:44, :67, :126).
- RCR-62: Las filas de SMS que escribe esta área las lee después `order/new` (CreditMethods.cs:140-150, :361-377):
  - `ObtenerNumeroTablaSmsAsync`: el último `Telefono` cuya fila apunta a un código del cliente (OrderMethods.cs:589-613).
  - `ObtenerTelefonoAValidarAsync`: el último `Telefono` del cliente (SolicitudCreditoWebMethods.cs:333-368).
  - Ninguno filtra por `IdMensaje`, así que también cuentan las filas de `SendSmsNewNumber` (23 o 60) (OrderMethods.cs:598-600; SolicitudCreditoWebMethods.cs:341-344).
- Logs: `Logger.SAP` escribe en el log del servidor si su carpeta existe, siempre en `Logs\sap.log` del sitio y en la salida de depuración; los errores de escritura en archivo se tragan (Logger.cs:8-44). Bug B8: la carpeta local se crea fuera del `try`, y como `Logger` se llama desde bloques `catch`, una falla ahí saldría del `catch` (Logger.cs:26-31; CREDITO_WEB_ANALISIS §6.7).

#### Teléfono validado (`SolicitudCreditoWebMethods.GetTelefonoValidadoAsync`, SolicitudCreditoWebMethods.cs:478-521)

Lo usan `getSms` (CreditMethods.cs:357) y también `order/new` (OrderMethods.cs:625; SolicitudCreditoWebMethods.cs:387), así que los dos flujos ven el mismo teléfono.

- RCR-63: Con cuenta vacía o nula devuelve "sin teléfono" sin llamar a la API (SolicitudCreditoWebMethods.cs:480-483).
- RCR-64: `URL_BP_API` es obligatoria; si falta, lanza error (SolicitudCreditoWebMethods.cs:485-490).
- RCR-65: Llama `GET {URL_BP_API}/A_GET_TelefonoValidado?sCliente=<cuenta sin espacios, codificada>` con un cliente HTTP nuevo, sin autenticación (SolicitudCreditoWebMethods.cs:492-495).
- RCR-66: Si la API no responde con éxito, lanza error. Un cuerpo vacío o una lista vacía significan "sin teléfono" (SolicitudCreditoWebMethods.cs:499-515).
- RCR-67: Toma el **primer** renglón cuyo `ZvalTel` sea verdadero (`true` o un número distinto de 0) y devuelve su `ZtelCte` tal cual, sin reducirlo a dígitos (SolicitudCreditoWebMethods.cs:517-519, :553-561). Por la decisión DU4, la API ya devuelve primero el validado más reciente.
- RCR-68: Los nombres del JSON se leen exactos (`ZtelCte`, `ZvalTel`, con distinción de mayúsculas) (SolicitudCreditoWebModels.cs:6-13; SolicitudCreditoWebMethods.cs:510).

#### Reglas de `SolicitudCreditoWebMethods.InsertAsync` (las usa `order/new`; resumen de referencia)

La ruta que las dispara se documenta en la sección de órdenes (OrderMethods.cs:796). Aquí se resumen porque viven en `Methods\Credit`.

- RCR-69: El INSERT a `CRED_SOLICITUD_WEB_DATOS_TEMP` es el mismo del SP `SP_CREDITO_WEB_DATOS` (operación `Insert`): mismas columnas y mismo orden. La fecha se arma en SQL con `GETDATE()`, `confirmado` va fijo en 1 y `RedimirMonedero` con `ISNULL(…, 0.00)` (SolicitudCreditoWebMethods.cs:35-36, :139-140, :149), decisión DU8. Devuelve el id generado (SolicitudCreditoWebMethods.cs:157, :226-228).
- RCR-70: Cada texto se recorta al ancho del parámetro del SP, como hacía el SP en silencio. Excepción: `@cliente` mide 10 por el BP (SolicitudCreditoWebMethods.cs:165-224).
- RCR-71: Con BP en SAP, `nombre` = `NameFirst` + `Namemiddle` (las partes no vacías, recortadas y separadas por un espacio; el parámetro mide 25), decisión DU13. Es el equivalente SAP de lo que guardaba LAN: todos los nombres de pila juntos. `nombre2` es el del request; `order/new` no lo llena y queda NULL, como en LAN (SolicitudCreditoWebMethods.cs:170, :238-241; OrderMethods.cs:757-794).
- RCR-72: `sexo` sale del `Gender` del BP con los códigos de `MapGender`: `"1"` → `Masculino`, `"2"` → `Femenino`, vacío → `''` (como un sexo NULL de LAN) y cualquier otro → `NO ESPECIFICADO`, que el parámetro de 9 caracteres recorta (SolicitudCreditoWebMethods.cs:174, :244, :563-583), decisión DU10.
- RCR-73: `estado_civil` sale del `Marst` del BP con el nombre de SAP: 1 Soltero, 2 Casado, 3 Viudo, 4 Divorciado, 5 Separado, 6 Pareja de hecho; cualquier otro → `''` (en LAN el dato venía del estado civil del cliente en Intelisis y un NULL llegaba como `''`). El parámetro mide 11, así que "Pareja de hecho" queda "Pareja de h", igual que en el SP (SolicitudCreditoWebMethods.cs:187, :259, :585-597), decisión DU10. Un BP creado desde la orden llega con `Marst` 1 (Soltero) por defecto (DU18).
- RCR-74: Fecha de nacimiento: la del BP; si no hay, la del request; si tampoco, 1900-01-02, el valor por defecto de LAN (SolicitudCreditoWebMethods.cs:242, :550-551).
- RCR-75: Con BP: apellidos, RFC (`Stcd1`) y cuenta (`Partner`) salen del BP. Sin BP, del request. `entreCalles` usa el del request si viene y, si no, el `ZentCalles` del BP (SolicitudCreditoWebMethods.cs:236-243, :250, :279).
- RCR-76: Leer el BP no tiene log propio, porque LAN no lo tenía; si falla, el error sube y queda en `[ORDER NEW ERROR]` (SolicitudCreditoWebMethods.cs:370-380; OrderController.cs:45), decisión DU17.
- RCR-77: `ValidacionTelefono` = 1 si no hay teléfono validado, no hay origen de validación aceptado o el último teléfono de SMS es distinto del validado; pero vale 0 si el BP es `Prospecto`. En los demás casos vale 0, también cuando no hay fila de SMS: la comparación sigue la lógica de tres valores de SQL (SolicitudCreditoWebMethods.cs:315-331, :382-402, :534-544, :631-659).

---

## Clientes y Business Partner (BP, direcciones, prospectos, mayoreo, cuentas)

Esta área es la entrada de ServicioSAP al **maestro de clientes** de SAP S/4HANA. En SAP cada cliente es un **Business Partner (BP)**: un número de cliente con sus datos generales, su dirección, sus datos de ventas y las tablas Z propias de MAVI (`Cte`, `CteTel`, `CteCto`…). Lo que hacen las rutas del área:

- dar de alta y actualizar BP (el alta de un cliente nuevo de la tienda en línea);
- consultar al cliente, en forma plana (BP05) o ampliada (BP05MA);
- ligar la cuenta de Magento con el BP (campo `ZidMagento`);
- habilitar un BP en otra combinación de organización de ventas y canal (por ejemplo, el canal de crédito);
- leer y cambiar las direcciones del BP y la dirección de entrega de un pedido;
- administrar las listas blanca y negra de correos de la tienda en línea (base SIGMavi);
- recuperar la cuenta de un cliente con sus datos personales, y dar el nombre de un cliente de mayoreo;
- consultar campañas de bonificación y sucursales (prefijo `account`);
- emitir el token de sesión (JWT) que piden todas las demás rutas (prefijo `login`).

Las rutas de archivo son relativas a `ServicioSap\ServicioSap\`. "DMZ" es `DMZ\WebApiMagento\` y solo aparece en "Quién la llama". Documentos de contexto (en `.agents\skills\lan-sap-migration\`): "GUIA" es `MappingMetods\GUIA_MIGRACION_FABLE.md`; "SKILL.md" es el de esa carpeta; "Tracker" es `MappingMetods\MAVI - DMZ-SAP.csv` (informativo, GUIA §8.7); las decisiones DU están en `MappingMetods\CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md` §4 y las actividades ACT en `MappingMetods\ACTIVIDADES_PENDIENTES_CREDITO_WEB_2026-10-01.md`; las fichas BP01, SD33 y DM07 están en `RSG\`. Todos los archivos del área están dados de alta en el proyecto (ServicioSap.csproj:216, :219, :223, :224, :228, :230, :235, :241, :243, :247, :249-252, :254, :263-265, :267, :269, :334, :337-342, :345-364, :369, :381).

| Archivo | Ruta completa |
|---|---|
| BusinessPartnerController.cs, PartnerAddressController.cs, CustomersController.cs, ProspectoController.cs, WholesaleCustomerController.cs, AccountController.cs, LoginController.cs | `Controllers\` |
| BusinessPartnerMethods.cs, DeliveryAddressMethods.cs | `Methods\BusinessPartner\` |
| CustomerMethods.cs, MagentoAccountMethods.cs, CashReportMethods.cs | `Methods\Customer\` |
| AccountMethods.cs | `Methods\MaterialManagement\` |
| CustomerServiceMethods.cs (solo `QuitarAcentos` y `ocultarLetrasNombres`) | `Methods\CustomerService\` |
| Client.cs, Partner.cs, Cte.cs, CustomerRequest.cs, AddressModels.cs, BpCombinationRequest.cs, CanalVentaDist.cs, AnexosResponse.cs, UnirCuentaRequest.cs, RecuperarCuentaRequest.cs, RecuperarCuentaResult.cs, WholesaleCustomerRequest.cs | `Models\SAP\BusinessPartner\` |
| BusinessPartnerMa.cs, NavigationCollection.cs | `Models\SAP\BusinessPartner\BP05MA\` |
| Bonus.cs, BonusRequest.cs, BonusReturn.cs, BonusResponseSet.cs, BonusOK.cs, SucursalResponse.cs | `Models\SAP\Account\` |
| CuentaModels.cs | `Models\SAP\Customer\` |
| TokenGenerator.cs, TokenValidationHandler.cs, HashService.cs, Logger.cs, ConexionDB\ConexionSQL.cs, ConexionDMZ\Curl.cs | `Helpers\` |

**Términos usados en esta sección**

- **OData:** la forma en que SAP publica sus datos por HTTP. Una *entity set* es una colección de registros (como una tabla). `$filter` filtra, `$top` limita, `$expand` trae en la misma llamada los datos relacionados (las *navegaciones*, que empiezan con `to_`).
- **Mandante (`sap-client`):** la instancia lógica de SAP. El código fija `110` en casi todas las URLs (RBPC-4); los valores de ambiente son los de Dev y no son bloqueo (decisión DU1).
- **Token CSRF:** ficha que SAP exige para escribir. Se pide antes con un GET que lleva la cabecera `X-CSRF-Token: fetch`.
- **BP01/BP02:** servicio `ZAPI_BP01_PARTNER_SRV`, entidad `BPartnerSet`. Según la ficha RSG BP01, un POST con `Partner` vacío **crea** el BP y con `Partner` lleno lo **modifica**.
- **BP05:** vista CDS `ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE`, los datos del cliente en una sola fila plana.
- **BP05MA:** servicio `ZAPI_BP05MA_SRV`, la ficha ampliada del cliente con sus navegaciones (teléfonos, domicilios, datos comerciales, tabla Z `Cte`…).
- **Área de ventas:** combinación de organización de ventas (`Vkorg`: `04` Muebles América, `05` VIU; BusinessPartnerMethods.cs:437-444), canal de distribución (`Vtweg`: `01` contado, `02` crédito; BusinessPartnerMethods.cs:200) y sector (`Spart`, aquí siempre `00`).
- **Cuenta:** el número de BP. Magento siempre manda el BP numérico; aquí no se traducen cuentas `C…` (decisión DU2).

| Ruta | Verbo | Qué resuelve | Fuente principal |
|---|---|---|---|
| `partner/client/{clientId}` | GET | Datos planos de un cliente | OData BP05 |
| `partner/client` | POST | Alta de un cliente de la tienda en línea | OData BP01 |
| `partner/client` | PATCH | Actualización de un BP | OData BP01 |
| `partner/client/unircuenta` | PATCH | Liga el id de Magento al BP | OData `ZSDT_CTE_ODATA_SRV` |
| `partner/enablechanelorg` | POST | Habilita el BP en otra área de ventas | API businesspartner (`URL_BP_API`) |
| `partner/testnew` | POST | Prueba: reenvía un JSON crudo a BP01 | OData BP01 |
| `partner/client/filter/{sapFilter}` | GET | Búsqueda libre de clientes | OData BP05 |
| `partner/client/ma/{clientId}` | GET | Ficha ampliada del cliente | OData BP05MA |
| `partner/successfactor/employee/{userId}` | GET | Datos de un empleado | API Android (`URL_ANDROID_API`) |
| `partner/ventadist/client/{clientId}` | GET | Áreas de ventas del cliente | OData SD52 |
| `partner/ConsultaAnexos/{valorAnexo}` | GET | Catálogo de códigos (anexos) | OData `ZQBC_CODEMSTRD_SRV` |
| `partneraddress/partner/{bpId}` | GET | Direcciones del BP | OData `API_BUSINESS_PARTNER` |
| `partneraddress/partner/{bpId}` | POST | Agrega una dirección al BP | OData `API_BUSINESS_PARTNER` |
| `partneraddress/partner/{bpId}/address/{addressId}` | PATCH | Cambia una dirección del BP | OData `API_BUSINESS_PARTNER` |
| `partneraddress/partner/phone` | PATCH | Cambia un teléfono de una dirección | OData `API_BUSINESS_PARTNER` |
| `partneraddress/salesdoc/{sdDoc}/role/{partnRole}` | GET | Dirección de un interlocutor del pedido | OData `ZSRV_SALESDOC_ADDRCHANGE_SRV` |
| `partneraddress/salesdoc` | POST | Cambia la dirección de entrega del pedido | OData `ZSRV_SALESDOC_ADDRCHANGE_SRV` |
| `customer/setCustomerList` | POST | Agrega un correo a lista blanca o negra | OData BP05 + SQL SIGMavi |
| `customer/getCustomerList` | POST | Dice en qué lista está un correo | SQL SIGMavi |
| `customer/deleteCustomerList` | POST | Quita un correo de las listas | SQL SIGMavi |
| `customer/getCuenta` | POST | Consulta la cuenta del cliente en Magento | DMZ → Magento |
| `customer/setCuenta` | POST | Fija la cuenta del cliente en Magento | DMZ → Magento |
| `customer/cashCustomerReport` | POST | Deja un reporte en la carpeta compartida | Disco y carpeta de red |
| `prospecto/recuperarcuenta` | POST | Recupera el número de cuenta con datos personales | OData BP05 |
| `company/wholesale-customer` | POST | Nombre de un cliente de mayoreo | OData BP05MA |
| `account/bonus/async` | POST | Campañas de bonificación | OData SD33 |
| `account/bonus` | POST | Campañas de bonificación (gemela) | OData SD33 |
| `account/sucursal/{id}` | GET | Datos de una sucursal | OData DM07 |
| `login/auth` | POST | Emite el token JWT | Web.config |

---

### GET /partner/client/{clientId}  (BusinessPartnerController.GetClient, BusinessPartnerController.cs:18-32)

- **Para qué sirve:** devuelve los datos de un cliente desde la vista BP05 ("Exposición de datos BP a POS", BusinessPartnerMethods.cs:24-27).
- **Quién la llama:** no hay llamador activo en la DMZ (tracker fila 136, `mercancias/getLimiteMercancia`, marcada como deprecada). El método `GetClientAsync` sí se reutiliza dentro de ServicioSAP en órdenes, crédito y recoger en sucursal (OrderMethods.cs:727, :1894; CreditMethods.cs:343; StorePickupMethods.cs:269).
- **Entrada:** `clientId` (texto, en la ruta): el número de BP (BusinessPartnerController.cs:19-20).
- **Cómo funciona (paso a paso):**
  1. Arma la URL `ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE?$filter=BusinessPartner eq '{clientId}'&$top=1&sap-client=110&$format=json` (BusinessPartnerMethods.cs:30).
  2. Hace un GET con el cliente HTTP de S4 (BusinessPartnerMethods.cs:33-39).
  3. Si SAP no responde con éxito o el cuerpo viene vacío, lanza error; si el cuerpo es una página HTML, también (BusinessPartnerMethods.cs:43-51).
  4. Convierte `d.results` en una lista de `Partner`; si está vacía, lanza "No se encontraron clientes" (BusinessPartnerMethods.cs:53-59).
  5. Devuelve el primer registro (BusinessPartnerMethods.cs:61).
- **Reglas de negocio:**
  - RBP-1: Solo se pide y se devuelve un registro: `$top=1` y `partner[0]` (BusinessPartnerMethods.cs:30, :61).
  - RBP-2: Un cliente que no existe es un error ("No se encontraron clientes"), no una respuesta vacía (BusinessPartnerMethods.cs:56-59).
  - RBP-3: `clientId` se pega en el filtro sin escapar (BusinessPartnerMethods.cs:30). El flujo de crédito lo protege antes de llamar (solo letras y números, CreditMethods.cs:337-339); la ruta no.
  - RBP-4: Si SAP devuelve HTML (por ejemplo, una página de inicio de sesión) se trata como error (BusinessPartnerMethods.cs:48-51).
- **Fuentes de datos:** OData S4 `ZB_DATOS_CLIENTE_CDS`, entity set `ZB_DATOS_CLIENTE`, filtro `BusinessPartner eq '…'`, solo lectura (BusinessPartnerMethods.cs:30).
- **Salida y errores:**
  - 200 con un objeto `Partner`: datos del BP con nombres en español (`BusinessPartner`, `PrimerNombre`, `PrimerApellido`, `SegundoApellido`, `RFC`, `FechaNacimiento`, `TelefonoMovil`, `Mail`…) y campos de la tabla Z `Cte` (`ZlimCred`, `ZidMagento`…) (Partner.cs:8-273).
  - 400 `{"Message": "Error, Ocurrio un error al intentar obtener el listado de clientes: …"}` con el estado y el cuerpo de SAP, en cualquier error (BusinessPartnerController.cs:28-31; BusinessPartnerMethods.cs:65-68). No escribe log.
- **Configuración usada:** ninguna llave del Web.config; la URL y el usuario de S4 salen de Conexion.dll (ver RBPC-2).
- **Pendientes conocidos:** el mensaje de error dice "listado de clientes" aunque es una consulta individual (BusinessPartnerMethods.cs:67).

### POST /partner/client  (BusinessPartnerController.CreateClient, BusinessPartnerController.cs:34-56)

- **Para qué sirve:** devuelve el BP de un cliente de la tienda en línea: si su `idMagento` ya tiene un BP en SAP lo devuelve, y si no lo da de alta completando con los valores fijos de MAVI todo lo que la tienda no captura (orquestador `SetCustomerAsync`, BusinessPartnerMethods.cs:891-943).
- **Quién la llama:** la ruta `customer/setCustomer` de la DMZ (DMZ Controllers\CustomersController.cs:30; tracker fila 32).
- **Entrada:** `CustomerRequest` (CustomerRequest.cs:3-17), todo texto: `name`, `lastName` (apellido paterno), `lastName2` (apellido materno), `dateBirth`, `email`, `gender`, `phone`, `idMagento`, `storeCode`, `address`. El controlador solo exige que el cuerpo no sea nulo (BusinessPartnerController.cs:38-41); `idMagento` debe ser numérico: vacío, no numérico o desbordado hace fallar la ruta (RBP-15, cambio del 2026-10-05). `list` y `cp` existen en el modelo pero esta ruta no los usa (CustomerRequest.cs:14, :16).
- **Cómo funciona (paso a paso):**
  1. Cuerpo nulo → 400 (BusinessPartnerController.cs:38-41).
  2. El controlador llama al orquestador `SetCustomerAsync` (BusinessPartnerController.cs:48; BusinessPartnerMethods.cs:891-943), que primero arma con `BuildClientFromCustomerRequest` el objeto `Client` con los datos del cliente, saneados con `Sntz` (RBP-48), y los valores fijos (BusinessPartnerMethods.cs:384-735, :895; reglas RBP-5 a RBP-21 y RBP-48). Un `idMagento` inválido lanza aquí, antes de cualquier consulta a SAP (RBP-15).
  3. Si `ZidMagento` es mayor que 2, busca en BP05 (`ZB_DATOS_CLIENTE`) con `GetFilterClientsAsync("ZidMagento eq <id>")`, el número sin comillas (BusinessPartnerMethods.cs:898-906; RBP-21). Si alguna fila trae `BusinessPartner` no vacío, responde con ese número sin llamar a BP01 (con varios, el más alto por longitud y luego ordinal; BusinessPartnerMethods.cs:916-923). Si BP05 responde "No se encontraron clientes" o ninguna fila trae número, sigue al alta; cualquier otro error de la búsqueda sale al `catch` del controlador sin crear nada (BusinessPartnerMethods.cs:908-912).
  4. Si `ZidMagento` es 0, 1 o 2 (invitado), no busca y pasa al alta como siempre (BusinessPartnerMethods.cs:927; RBP-21).
  5. `SubmitClientInfoAsync` pide el token CSRF a `ZAPI_BP01_PARTNER_SRV/?sap-client=110&sap-language=ES` (BusinessPartnerMethods.cs:78, :81-82, :929).
  6. Convierte el objeto a JSON omitiendo los campos nulos y lo escribe en el log como `[SAP BP REQUEST]` (BusinessPartnerMethods.cs:84-89).
  7. Hace POST a `ZAPI_BP01_PARTNER_SRV/BPartnerSet?sap-client=110` y escribe la respuesta como `[SAP BP RESPONSE]` (BusinessPartnerMethods.cs:77, :91-100).
  8. Si SAP falla o responde vacío, escribe `[SAP BP ERROR]` y lanza error; si responde HTML, lanza error (BusinessPartnerMethods.cs:102-111).
  9. Convierte `d` en `Client` y lo devuelve al orquestador; ahí viene el número de BP nuevo en `Partner` y los mensajes de SAP en `toReturn` (BusinessPartnerMethods.cs:113-115, :117, :929).
  10. Si `result` es nulo o `Partner` viene nulo o vacío, el BP no se creó: el orquestador lanza una excepción con el motivo sacado de `toReturn` y el controlador responde 200 con la cadena `"Error, <motivo>"` (BusinessPartnerMethods.cs:930-941; BusinessPartnerController.cs:50-55; RBP-49). Si hay `Partner`, responde solo con el número de BP, sin espacios a los lados, como cadena JSON (BusinessPartnerMethods.cs:942; BusinessPartnerController.cs:48; RBP-47).
  11. Cualquier excepción dentro de la acción (HTTP no exitoso de SAP, token, `idMagento` inválido, error de la búsqueda en BP05) sale por el `catch` como 200 con la cadena `"Error, <mensaje>"`, la misma forma del paso 10 (BusinessPartnerController.cs:50-55; RBP-49). Desde el 2026-10-07; antes era 400.
- **Reglas de negocio:**
  - RBP-5: Nombre de persona física: `NameFirst` = `name`, `NameLast` = `lastName`, `NameLst2` = `lastName2`, cada uno pasado por `Sntz` (RBP-48), sin espacios a los lados y en MAYÚSCULAS (`ToUpperInvariant()`), como el `UPPER` del SP de LAN (`SPsOrden\SP_eCommerceCtenuevo.sql:115-118`); `Natpers = "X"` marca persona física (BusinessPartnerMethods.cs:394-396, :442, :447-449). El orden `name` = nombre y `lastName` = apellido paterno lo confirma el payload real de Magento (decisión CQ1 = B del 2026-10-05, `PLAN_FABLE_CONTROLADORES\01_CustomersController.md` §5, T1.1-04); mayúsculas sin E2E.
  - RBP-6: La organización de ventas sale de `storeCode` (BusinessPartnerMethods.cs:407-425): si contiene "viu" (sin importar mayúsculas) o es "2" → `05` y `NameOrg1 = "viu"`; si contiene "muebles_america", es "1" o viene vacío → `04` y `NameOrg1 = "muebles_america"`; cualquier otro valor → `04` como respaldo. La misma organización va a los datos de ventas y a los interlocutores (`VkorgKnvv`, `VkorgKnvp`) (BusinessPartnerMethods.cs:502, :538). LAN fallaba con un `storeCode` desconocido o en otra escritura; aquí sigue yendo a `04` porque el usuario no lo decidió (CQ5 del 2026-10-05, `01_CustomersController.md` T1.1-07).
  - RBP-7: El cliente nace solo en canal `01` (contado), sector `00` (BusinessPartnerMethods.cs:503-504, :539-540).
  - RBP-8: No se abre el canal de crédito al dar de alta: un alta en crédito no debe ser automática, debe pasar por el proceso interno de activación de la empresa. El bloque comentado que habilitaba el canal `02` en segundo plano se borró el 2026-10-05 como código muerto (CQ9, T1.1-10); la habilitación sigue disponible solo por `POST /partner/enablechanelorg` (BusinessPartnerMethods.cs:171-213).
  - RBP-9: Sexo con `MapGender` sobre `gender` pasado por `Sntz` (BusinessPartnerMethods.cs:405, :452, :737-758): vacío → `1`; `H`, `HOMBRE`, `MASCULINO` o `1` → `1` (masculino); `M`, `MUJER`, `FEMENINO` o `2` → `2` (femenino); cualquier otro → `3`. Ojo: `M` es Mujer. Son los mismos códigos del alta desde la orden (OrderMethods.cs:2696) y del crédito (decisión DU10, no se vuelve a preguntar).
  - RBP-10: Estado civil `Marst = "1"` (Soltero) fijo (BusinessPartnerMethods.cs:456): SAP lo exige y la tienda no lo captura. El alta desde la orden usa el mismo valor (OrderMethods.cs:2700). Decisión DU18. Tabla de códigos (DU10): 1 Soltero, 2 Casado, 3 Viudo, 4 Divorciado, 5 Separado, 6 Pareja de hecho.
  - RBP-11: Fecha de nacimiento `Birthdt` en formato `yyyyMMdd` si `DateTime.TryParse` la entiende con la cultura del servidor; si no, queda nula y no viaja (BusinessPartnerMethods.cs:398, :458, :760-773, :84-88). LAN la fijaba en `1900-01-02`; diferencia aceptada por el usuario (CQ4 = B del 2026-10-05, T1.1-06).
  - RBP-12: Teléfono: `phone` pasado por `Sntz` (RBP-48) y sin espacios a los lados va a `TelNumber`, `TelnrLong` y a la tabla Z de teléfonos (`toCteTel.ZtelCte`) con tipo `"MOVIL"`, sin validar (`ZvalTel = false`) y con origen `ZappOrig` vacío (BusinessPartnerMethods.cs:399, :476, :483, :627-642). LAN no guardaba el teléfono; diferencia aceptada por el usuario (CQ4 = B del 2026-10-05, T1.1-06).
  - RBP-13: Dirección: el texto completo de `address` (sin `Sntz`, como en LAN, que no lo usaba) va a `Street` y también a `NameCo` (BusinessPartnerMethods.cs:400, :461, :463). Número (`HouseNum1`), colonia (`City2`), municipio (`City1`) y CP (`PostCode1`) van vacíos; `Region = "JAL"` queda fija porque, según el comentario del código, este cuerpo no trae el CP y no se puede consultar SEPOMEX (BusinessPartnerMethods.cs:427-431, :462, :468-472). LAN dejaba la dirección vacía; diferencia aceptada por el usuario (CQ4 = B del 2026-10-05, T1.1-06).
  - RBP-14: Correo: `email` pasado por `Sntz` (RBP-48), sin espacios a los lados y en MAYÚSCULAS (`ToUpperInvariant()`), como el `UPPER(email)` del SP de LAN (`SPsOrden\SP_eCommerceCtenuevo.sql:133`), va a `SmtpAddr` (BusinessPartnerMethods.cs:397, :484). Cambio del 2026-10-05 (CQ1, T1.1-04), sin E2E.
  - RBP-15: `idMagento` pasa por `Sntz` (RBP-48) y se convierte con `int.Parse`, como LAN (`LAN Metodos\CustomerMethods.cs:74`): vacío o no numérico lanza `FormatException` y desbordado `OverflowException`; la excepción sale por el `catch` del controlador como 200 `"Error, <texto de la excepción>"` desde el 2026-10-07 (RC-12 A', RBP-49; antes 400; ver "Salida y errores") y no se crea el BP. Va a `toCte.ZidMagento` (BusinessPartnerMethods.cs:401, :404, :579). Cambio del 2026-10-05 (CQ5, T1.1-07), sin E2E; antes lo inválido se convertía en `0` con `ParseMagentoId`, que se borró.
  - RBP-16: RFC genérico `Stcd1 = "XAXX010101000"` (público en general) con `Stkzn = "X"` (BusinessPartnerMethods.cs:485-486). El alta desde la orden usa el RFC del cliente cuando viene (OrderMethods.cs:2729).
  - RBP-17: Valores fijos del maestro (BusinessPartnerMethods.cs:435-549): grupo `BuGroup = "CLIE"`, conceptos de búsqueda `Sort1`/`Sort2 = "ABC"`, nacionalidad y país `MX` (`Natio`, `Country`, `Aland`), idioma `Langu = "S"`, grupo de cuentas `Ktokd = "0110"`, sociedad `Bukrs = "5510"`, cuenta anterior `Altkn = "1234567890"`, `Kalks = "1"`, `Awahr = "100"`, `Antlf = "0"`, `Lprio = "02"`, `Vsbed = "01"`, moneda `Waers = "MXN"`, `Ktgrd = "01"`, `Kvgr4 = "SI"`, `Parnr = "000000100"`, impuesto `Tatyp = "TMX1"` con `Taxkd = "1"`, función de interlocutor `Parvw = "WE"` (destinatario de mercancía), régimen fiscal `Fiscalregimen = ""` vacío (BusinessPartnerMethods.cs:548), como siempre se ha mandado a SAP. LAN escribía `'605'` en `Cte.FiscalRegimen` de Intelisis (`SPsOrden\SP_eCommerceCtenuevo.sql:109, :114`); el 2026-10-05 se probó `"605"` y el usuario lo revirtió el mismo día para no romper el flujo. Queda pendiente del dueño fiscal de SAP (con el RFC genérico `XAXX010101000`, CFDI 4.0 suele esperar el régimen 616): tarea T1.1-02, DECISION.
  - RBP-18: `Perrl = "AM"` va siempre: SAP lo volvió obligatorio sin aviso y el valor fijo esperado es "AM" (BusinessPartnerMethods.cs:550-551).
  - RBP-19: Las tablas Z se mandan en blanco: `toCte` con importes `"0.00"`, textos vacíos y enteros en 0, salvo `ZidMagento` (BusinessPartnerMethods.cs:552-626); contacto `toCteCto` con `ZidcteCto = "1"` y `ZidcteCtoTipo = "20"` (:643-668); dirección del contacto con `ZidcteCto = "1"` y `Zpais = "MX"` (:669-686); empleo vacío con `Zingresos = "0.00"` (:687-728); retorno vacío (:729-732). Las fechas de esas tablas van nulas y, por RBP-20, no viajan: `ZfechaIrreg`, `ZfecUltPag` (:613, :623), `Zfecha` del teléfono (:633), `ZfechaNac` del contacto (:653) y `Zantiguedad` del empleo (:694). El contacto tipo 20, que LAN no creaba, se conserva por decisión del usuario (CQ4 = B del 2026-10-05, T1.1-11).
  - RBP-20: Los campos nulos no viajan (`WhenWritingNull`); los booleanos y los enteros siempre viajan (BusinessPartnerMethods.cs:84-88).
  - RBP-21: `Partner = ""` hace que SAP cree un BP nuevo (BusinessPartnerMethods.cs:435; ficha BP01). Desde el 2026-10-07 (S5, T1.1-03) el alta solo ocurre cuando no hay BP con ese `ZidMagento`: con `idMagento` > 2, `SetCustomerAsync` consulta antes BP05 con `GetFilterClientsAsync("ZidMagento eq <id>")` (el número sin comillas porque `ZidMagento` es entero, Partner.cs:36; el filtro se arma en el llamador, decisión del usuario del 2026-10-07: "es posible que GetFilterClientsAsync ya tenga ese filtro dinamico, en ese caso solo estructuralo para el que necesitas") y, si ya existe un BP con número, devuelve ese número sin crear ni actualizar (decisión CQ2 = a: "si deberia existir uno con id magento y que tambien tenga bp entonces si se regresa la informacion si tiene bp"; con varios, el más alto por longitud y luego ordinal); solo "No se encontraron clientes" o filas sin número llevan al alta, y cualquier otro error de la búsqueda aborta sin crear (BusinessPartnerMethods.cs:898-926). Es la búsqueda que hacía el SP de LAN con id > 2 (`SPsOrden\SP_eCommerceCtenuevo.sql:62-68`). Con `idMagento` 0, 1 o 2 (invitado) no se busca y se crea como antes: LAN exigía además el correo y esa rama queda pendiente de la decisión CQ3 (BusinessPartnerMethods.cs:927; `01_CustomersController.md` §5). Un BP solo se encuentra si lleva ese `ZidMagento` (alta por esta ruta con id real, o ligado por `PATCH /partner/client/unircuenta`); los BP del alta desde la orden guardan el `idMagento` de la orden, que hoy llega en 0 (OrderMethods.cs:2827). La actualización del cliente existente que hacía el SP de LAN no se replica (CQ2 = a). Sin compilar ni E2E (pruebas S5-1..S5-7 del usuario, `01_S4b_S4c_S5_2026-10-07.md` §7).
  - RBP-47: La ruta devuelve solo el número de BP, sin espacios a los lados y como cadena JSON (p. ej. `"15000XXXXX"`): el del BP existente en BP05 (RBP-21) o el que trae `Partner` en la respuesta de BP01, no el objeto `Client` (BusinessPartnerMethods.cs:923, :942; BusinessPartnerController.cs:48). Es la misma forma que LAN, que devolvía la cuenta como cadena, con el número de BP en lugar de la cuenta `C…` (DU2; GUIA §3.1). Cambiado el 2026-10-05, sin E2E (tarea T1.1-01 de `PLAN_FABLE_CONTROLADORES\01_CustomersController.md`; decisión D-16 del 2026-10-05, `PLAN_EJECUCION_SP_CREDITO_A_CODIGO.md:2742`). `SubmitClientInfoAsync` sigue devolviendo el `Client` completo, que `PATCH /partner/client` sí responde entero (BusinessPartnerMethods.cs:117; BusinessPartnerController.cs:70-71).
  - RBP-48: Saneado heredado de LAN: antes de usarlos, `idMagento`, `name`, `lastName`, `lastName2`, `gender`, `email` y `phone` pasan por `SntzMethods.Sntz` (`Methods\Utils\SntzMethods.cs:14, :19-27`; registrado en `ServicioSap.csproj:279`), que quita los caracteres `& ' : < > " / % ( ) = ?` con la misma expresión regular que el `sntz` de LAN (`LAN Metodos\CustomerMethods.cs:184-192` y `Metodos\OrderMethods.cs:1367-1375`) y convierte nulo en `""`; se aplica antes de `Trim` (BusinessPartnerMethods.cs:391-405). `storeCode`, `address` y `dateBirth` no se sanean, como en LAN. Cambio del 2026-10-05 (CQ7, T1.1-05), sin E2E.
  - RBP-49: Guarda de `Partner` vacío: si BP01 responde 2xx pero `result` es nulo o `Partner` viene nulo o vacío, el BP no se creó y la ruta responde 200 con la cadena JSON `"Error, <motivo>"`. El motivo es el `Message` del primer `toReturn.results` con `Type == "E"`; si ninguno es `E`, el `Message` del primero; si la lista es nula o vacía, el literal `BP01 no devolvio un Partner valido` (desde el 2026-10-07 la guarda vive en el orquestador `SetCustomerAsync`, que lanza `Exception(motivo)`, y el `catch` del controlador la convierte en la cadena: BusinessPartnerMethods.cs:930-941; BusinessPartnerController.cs:50-55; `Client.to_return` se lee del nodo `toReturn`, Client.cs:136-137). Es la convención de `order/new` (OrderController.cs:46) y no rompe el flujo: Magento recibe 200 con el texto. Las excepciones (HTTP no exitoso de SAP, token, `idMagento` inválido) salen por el `catch` con la misma forma, 200 `"Error, " + e.Message` (BusinessPartnerController.cs:50-55), desde el 2026-10-07 (decisión RC-12 A' = "si manten lo que ya hace DMZ", T1.1-12 de `PLAN_FABLE_CONTROLADORES\01_CustomersController.md` §1.4 y `01_S4b_S4c_S5_2026-10-07.md` §5), sin compilar ni E2E (pruebas RC-12 1-4 del usuario); antes eran 400 `{"Message":"Error, …"}`, que el DMZ convertía en 200 con el texto `WebException: … (400) Bad Request. Body: …`, y Magento podía guardar ese texto como cuenta. El DMZ no cambia: las fallas fuera de la acción (401 de `[Authorize]`, 404 de IIS, ServicioSAP caído) siguen llegando a Magento como `WebException: …`, y un mensaje que contenga `Internal Server Error` sigue dando 400 vacío en el DMZ (DMZ Controllers\CustomersController.cs:34-35). Cambio de la guarda del 2026-10-05 (CQ6 y CQ8, T1.1-08 opción d y T1.1-01b, `01_CustomersController.md` §3.1.5), sin E2E; estuvo en el controlador como excepción explícita a SKILL 17 hasta el 2026-10-07, cuando S5 la movió al orquestador `SetCustomerAsync` con la misma salida (T1.1-01b y T1.1-03 de `01_CustomersController.md` §1.4). En `sap.log` no hay hoy ninguna respuesta 2xx con `Partner` vacío.
- **Fuentes de datos:** OData S4 BP05 `ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE`, lectura GET con `$filter=ZidMagento eq <id>` cuando `idMagento` > 2 (BusinessPartnerMethods.cs:218-260, :902-906; RBP-21); OData S4 `ZAPI_BP01_PARTNER_SRV`, entity set `BPartnerSet`, escritura POST con las navegaciones `toCte`, `toCteTel`, `toCteCto`, `toCteCtoDireccion`, `toCteCtoEmpleo` en el mismo cuerpo (Client.cs:131-137); más el GET del token CSRF a la raíz del servicio (BusinessPartnerMethods.cs:77-82).
- **Salida y errores:**
  - 200 con una cadena JSON que es el número de BP: el existente con ese `ZidMagento` en BP05 (RBP-21) o el nuevo que trae `Partner` en BP01, sin espacios a los lados, p. ej. `"15000XXXXX"` (BusinessPartnerMethods.cs:923, :942, :113-115, :117; BusinessPartnerController.cs:48; RBP-47). Hasta el 2026-10-05 devolvía el `Client` completo; LAN devolvía solo la cuenta (GUIA §3.1).
  - 200 con la cadena JSON `"Error, <motivo>"` si BP01 respondió 2xx sin `Partner` (nulo o vacío) o `result` es nulo; el motivo sale de `toReturn` o es el literal `BP01 no devolvio un Partner valido` (BusinessPartnerMethods.cs:930-941; BusinessPartnerController.cs:50-55; RBP-49). Hasta el 2026-10-05 salía `""` con `Partner` vacío, o el 400 de abajo con `Partner` nulo.
  - 400 `{"Message": "Uno o mas campos estan mal formulados"}` si el cuerpo es nulo (BusinessPartnerController.cs:40).
  - 200 con la cadena JSON `"Error, Ocurrio un error al intentar enviar la informacion del cliente: …"` en cualquier error HTTP de SAP o del token al crear (BusinessPartnerController.cs:50-55; BusinessPartnerMethods.cs:121-124), 200 con la cadena JSON `"Error, Ocurrio un error al intentar obtener el listado de clientes: …"` si falla la búsqueda en BP05 con `idMagento` > 2, sin crear BP (BusinessPartnerMethods.cs:256-259, :906-912; RBP-21), y 200 `"Error, <texto de FormatException u OverflowException>"` si `idMagento` viene vacío, no numérico o desbordado (RBP-15; BusinessPartnerMethods.cs:404). Hasta el 2026-10-07 eran 400 `{"Message": "Error, …"}` (RC-12 A', RBP-49).
  - El JSON enviado, la respuesta y el error quedan en `sap.log`, con los datos personales del cliente (BusinessPartnerMethods.cs:89, :100, :104).
- **Configuración usada:** ninguna llave del Web.config (S4 por Conexion.dll, RBPC-2).
- **Pendientes conocidos:** el `cp` del modelo no se aprovecha y la región queda fija en "JAL" (BusinessPartnerMethods.cs:427-431); falta definir qué `ZappOrig` llevan los BP de la tienda en línea (ACT-36); falta probar en DEV un alta con `Marst` 1 (ACT-25 lo prueba en el alta desde una orden de contado, que usa el mismo valor; `Marst` se decide en CREDITO P14); los cambios del 2026-10-05 están sin E2E y la E2E la hace el usuario (`01_CustomersController.md` T1.1-09, S6): la respuesta es el número de BP (RBP-47), el saneado `Sntz` (RBP-48), nombres y correo en MAYÚSCULAS (RBP-5, RBP-14), `idMagento` obligatorio (RBP-15) y la guarda de `Partner` vacío (RBP-49); el `catch` que responde 200 `"Error, <mensaje>"` cambió el 2026-10-07 (RC-12 A', T1.1-12) sin compilar ni E2E: pruebas RC-12 1-4 del usuario (`01_S4b_S4c_S5_2026-10-07.md` §5); `Fiscalregimen` sigue vacío, como siempre en SAP, y el `'605'` de LAN queda pendiente del dueño fiscal (RBP-17, T1.1-02); mientras no haya E2E, GUIA:363 sigue contando esta ruta entre las que no están en paridad con LAN; un `storeCode` desconocido, en otra escritura o `mavi` sigue yendo a la organización `04` (RBP-6) donde LAN fallaba, porque el usuario no lo decidió (CQ5 del 2026-10-05; `01_CustomersController.md` T1.1-07, 1.1-R4); la dirección, el teléfono, la fecha de nacimiento, `Region` y el contacto tipo 20 que LAN no guardaba se conservan por decisión del usuario (CQ4 = B, 2026-10-05; T1.1-06, T1.1-11); la búsqueda del BP existente antes de crear (RBP-21) se construyó el 2026-10-07 (S5, T1.1-03) sin compilar ni E2E: compila el usuario junto con S4c y corre S5-1..S5-7 (`01_S4b_S4c_S5_2026-10-07.md` §7); la rama de invitados (`idMagento` 0, 1 o 2) sigue creando sin buscar hasta la decisión CQ3, y el desempate con varios BP para el mismo `ZidMagento` (hoy el más alto) queda por confirmar con el usuario. El código muerto del builder (`nombreCompleto`, `nacimientoOdata` con `FormatDateSapOData`, `mappedVkorgKnvp`, el bloque comentado del canal `02` y `ParseMagentoId`) se borró el 2026-10-05 (CQ9, T1.1-10).

### PATCH /partner/client  (BusinessPartnerController.UpdateClient, BusinessPartnerController.cs:68-87)

- **Para qué sirve:** actualiza un BP existente mandando a BP01 el objeto `Client` tal como llega.
- **Quién la llama:** no se encontró llamador en la DMZ ni en el tracker.
- **Entrada:** `Client` (Client.cs:13-138). `Partner` es obligatorio y no puede venir vacío (BusinessPartnerController.cs:60-63); el resto es opcional.
- **Cómo funciona (paso a paso):**
  1. Cuerpo nulo o `Partner` vacío → 400 (BusinessPartnerController.cs:60-63).
  2. Llama a `SubmitClientInfoAsync` con el objeto sin cambios (BusinessPartnerController.cs:68): pide el token CSRF, hace POST a `BPartnerSet` y registra petición y respuesta, igual que el alta (BusinessPartnerMethods.cs:74-156).
  3. Como `Partner` viene lleno, SAP modifica en lugar de crear (ficha BP01).
- **Reglas de negocio:**
  - RBP-22: Hacia SAP el verbo es POST aunque la ruta sea PATCH (BusinessPartnerMethods.cs:90).
  - RBP-23: No hay valores por defecto ni mapeos: viaja lo que manda el llamador (BusinessPartnerController.cs:68).
  - RBP-24: Los textos nulos no viajan, pero los booleanos (`Xsexm`, `Xblck`, `NotReleased`, `PersAddr`, `Stkzu`, `Xverr`, `Xzver`, `Loevm`) y los enteros de `Cte` (`ZantigMeses`, `ZantigAnios`, `ZidMagento`…) no pueden ser nulos: si el llamador no los manda, viajan como `false` o `0` (Client.cs:33, :39-40, :61, :67, :76, :79, :110; Cte.cs:11-12, :34; BusinessPartnerMethods.cs:83-87).
- **Fuentes de datos:** las mismas del alta: OData `ZAPI_BP01_PARTNER_SRV/BPartnerSet`, escritura POST, más el token CSRF.
- **Salida y errores:** 200 con el `Client` devuelto por SAP; 400 `{"Message": "Uno o mas campos estan mal formulados"}`; 400 `{"Message": "Error, Ocurrio un error al intentar enviar la informacion del cliente: …"}` (BusinessPartnerController.cs:62, :69-74). Petición y respuesta quedan en `sap.log` (BusinessPartnerMethods.cs:88, :99).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** por RBP-24, una actualización parcial manda en `false`/`0` los campos que no se enviaron; no se verificó qué hace SAP con ellos.

### PATCH /partner/client/unircuenta  (BusinessPartnerController.UnirCuenta, BusinessPartnerController.cs:89-108)

- **Para qué sirve:** liga la cuenta de Magento con el BP: escribe el id numérico del cliente de Magento en `ZidMagento` de la tabla Z de clientes.
- **Quién la llama:** la ruta `customerService/unirCuenta` de la DMZ (DMZ Controllers\CustomerServiceController.cs:60; tracker fila 43). El flujo de crédito usa el mismo método (CreditMethods.cs:274).
- **Entrada:** `UnirCuentaRequest` (UnirCuentaRequest.cs:5-9): `partner_id` (texto, obligatorio, el BP) e `id_magento` (entero, obligatorio, mayor que 0) (BusinessPartnerController.cs:81-84).
- **Cómo funciona (paso a paso):**
  1. Valida los dos campos; el método vuelve a validarlos (BusinessPartnerController.cs:81-84; BusinessPartnerMethods.cs:837-840).
  2. Pide el token CSRF a `ZSDT_CTE_ODATA_SRV/` (BusinessPartnerMethods.cs:842, :845-846).
  3. Hace PATCH a `ZSDT_CTE_ENTITYSet(ZclienteBp='{partner_id}')` con el cuerpo `{"ZidMagento": <id>}`; registra petición y respuesta (BusinessPartnerMethods.cs:843, :848-865).
  4. Si SAP falla, lanza error con el estado y el cuerpo; si no, devuelve "Cuenta vinculada exitosamente en SAP" (BusinessPartnerMethods.cs:867-872).
- **Reglas de negocio:**
  - RBP-25: Solo se escribe `ZidMagento`; el resto de la tabla `Cte` no se toca (BusinessPartnerMethods.cs:848-851).
  - RBP-26: `partner_id` vacío o `id_magento` menor o igual a 0 se rechazan (BusinessPartnerController.cs:81-84).
  - RBP-27: No se lee antes el valor actual: el id anterior se sobrescribe y no se revisa si el BP existe; si no existe, el error lo da SAP (BusinessPartnerMethods.cs:848-870).
- **Fuentes de datos:** OData S4 `ZSDT_CTE_ODATA_SRV`, entity set `ZSDT_CTE_ENTITYSet` (tabla `ZSDT_CTE`), escritura PATCH por la llave `ZclienteBp` (BusinessPartnerMethods.cs:842-843).
- **Salida y errores:** 200 `{"message": "Cuenta vinculada exitosamente en SAP"}` (BusinessPartnerController.cs:90); 400 `{"Message": "El partner_id y el id_magento son obligatorios"}` (:83); 400 `{"Message": "Error al unir cuenta: …"}` (:92-95). Petición y respuesta van a `sap.log` como `[SAP ZidMagento PATCH …]` (BusinessPartnerMethods.cs:854, :865).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** las URLs del PATCH y del token no llevan `sap-client`, así que usan el mandante por defecto del sistema (BusinessPartnerMethods.cs:842-843).

### POST /partner/enablechanelorg  (BusinessPartnerController.EnableChannelOrg, BusinessPartnerController.cs:110-129)

- **Para qué sirve:** habilita un BP existente en otra área de ventas (datos de ventas KNVV), por ejemplo abrir el canal `02` (crédito) a un cliente que solo tenía `01` (contado) (BusinessPartnerMethods.cs:199-202).
- **Quién la llama:** no se encontró llamador. El alta lo llamaba en segundo plano y ese bloque está comentado (RBP-8).
- **Entrada:** `BpCombinationRequest` (BpCombinationRequest.cs:6-22): `Bp` obligatorio (BusinessPartnerController.cs:102-105); `Vkorg`, `Vtweg`, `Spart`, `Waers`, `Versg`, `Vsbed`, `Zterm`, `Ktgrd`, `Kvgr4`, `Perrl` y `ReturnSet` opcionales, se mandan tal cual. Como referencia, el bloque comentado usaba `Spart "00"`, `Waers "MXN"`, `Versg "1"`, `Vsbed "01"`, `Ktgrd "01"`, `Perrl "AM"` (BusinessPartnerMethods.cs:124-138).
- **Cómo funciona (paso a paso):**
  1. Valida `Bp` (BusinessPartnerController.cs:102-105).
  2. Lee `URL_BP_API`; si no está, lanza error (BusinessPartnerMethods.cs:204-208).
  3. Hace POST a `{URL_BP_API}/AC_POST_HabilitaCombinacionBP` con el JSON sin nulos; `ReturnSet` sale con el nombre `RETURNSet` (BusinessPartnerMethods.cs:210, :214-226; BpCombinationRequest.cs:20-21).
  4. Si falla, lanza error con estado y cuerpo; si no, devuelve el texto de la respuesta sin tocarlo (BusinessPartnerMethods.cs:228-235).
- **Reglas de negocio:**
  - RBP-28: La ruta no pone valores por defecto: el llamador decide la combinación completa (BusinessPartnerController.cs:110).
  - RBP-29: Va por la API de MAVI de businesspartner y no directo a S4; es lo correcto para la habilitación del área de ventas (BusinessPartnerMethods.cs:204, :210; SKILL.md:110).
  - RBP-30: La llamada no lleva las credenciales de S4 (cliente HTTP propio, BusinessPartnerMethods.cs:214-216).
- **Fuentes de datos:** API businesspartner (`URL_BP_API`), operación `AC_POST_HabilitaCombinacionBP`, escritura (BusinessPartnerMethods.cs:210).
- **Salida y errores:** 200 con la respuesta de la API como cadena (BusinessPartnerController.cs:111); 400 `{"Message": "El payload es invalido o falta el BP."}` (:104); 400 `{"Message": "Error: Ocurrio un error al intentar habilitar la combinacion del BP: …"}` (:113-116; BusinessPartnerMethods.cs:240-243). No escribe log.
- **Configuración usada:** `URL_BP_API`.
- **Pendientes conocidos:** al recibir, la ruta lee `ReturnSet` con su nombre C#, no `RETURNSet` (RBPC-7); crea un cliente HTTP por petición en lugar de usar el cliente externo compartido (BusinessPartnerMethods.cs:214; TokenGenerator.cs:98-111).

### POST /partner/testnew  (BusinessPartnerController.TestCreateClient, BusinessPartnerController.cs:131-146)

- **Para qué sirve:** ruta de prueba: manda a BP01 el JSON del cuerpo tal cual, sin validar ni completar.
- **Quién la llama:** nadie. Está en la lista de "¿se borra?" (GUIA §8.2).
- **Entrada:** cualquier JSON, leído como texto crudo (BusinessPartnerController.cs:123).
- **Cómo funciona (paso a paso):**
  1. Pide el token CSRF a la raíz de BP01 (BusinessPartnerMethods.cs:161, :165-166).
  2. Hace POST a `BPartnerSet` con el cuerpo sin cambios (BusinessPartnerMethods.cs:160, :168-183).
  3. Si SAP falla, lanza error; si no, devuelve el texto de SAP (BusinessPartnerMethods.cs:185-190).
- **Reglas de negocio:**
  - RBP-31: Sin validación, sin valores por defecto y sin log (BusinessPartnerMethods.cs:158-197).
  - RBP-32: Puede crear o modificar BP reales en el ambiente al que apunte (BusinessPartnerMethods.cs:160).
- **Fuentes de datos:** OData `ZAPI_BP01_PARTNER_SRV/BPartnerSet`, escritura POST.
- **Salida y errores:** 200 `{"ResponseContent": "<respuesta cruda de SAP>"}` (BusinessPartnerController.cs:128); 400 `{"Message": "Error, Error TestCreateClientRaw: …"}` (:130-133; BusinessPartnerMethods.cs:193-196).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** decidir si se borra (GUIA §8.2).

### GET /partner/client/filter/{sapFilter}  (BusinessPartnerController.GetFilterClients, BusinessPartnerController.cs:148-162)

- **Para qué sirve:** búsqueda libre de clientes en BP05 con una expresión `$filter` de OData que arma el llamador.
- **Quién la llama:** sin llamador directo en la DMZ (el tracker fila 44 la asocia a `customerService/validarCliente`, pero la DMZ llama a la ruta de ServicioSAP del mismo nombre, DMZ Controllers\CustomerServiceController.cs:77). El método se reutiliza en las listas de correos (CustomerMethods.cs:89) y en `prospecto/recuperarcuenta` (ProspectoController.cs:49).
- **Entrada:** `sapFilter` (texto en la ruta, codificado para URL): una expresión OData, por ejemplo `Mail eq '…'` (BusinessPartnerController.cs:137-138).
- **Cómo funciona (paso a paso):**
  1. Arma `ZB_DATOS_CLIENTE?$filter={sapFilter}&sap-client=110&$format=json` (BusinessPartnerMethods.cs:252).
  2. Hace el GET y aplica las mismas validaciones de estado, cuerpo vacío y HTML que la consulta individual (BusinessPartnerMethods.cs:255-273).
  3. Si no hay coincidencias, lanza "No se encontraron clientes" (BusinessPartnerMethods.cs:277-281).
  4. Devuelve todas las coincidencias (BusinessPartnerMethods.cs:283).
- **Reglas de negocio:**
  - RBP-33: El filtro se pega sin validar ni escapar: el llamador controla la consulta completa (BusinessPartnerMethods.cs:252).
  - RBP-34: No hay `$top`: salen todas las coincidencias (BusinessPartnerMethods.cs:252).
  - RBP-35: Cero coincidencias es un error, no una lista vacía (BusinessPartnerMethods.cs:278-281).
- **Fuentes de datos:** OData S4 `ZB_DATOS_CLIENTE_CDS/ZB_DATOS_CLIENTE` (BP05), solo lectura.
- **Salida y errores:** 200 con una lista de `Partner` (Partner.cs:8-273); 400 `{"Message": "Error, Ocurrio un error al intentar obtener el listado de clientes: …"}`, que incluye el caso "No se encontraron clientes" (BusinessPartnerController.cs:146-149; BusinessPartnerMethods.cs:287-290).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** quien arme el filtro con datos del usuario debe escapar la comilla simple; ver GUIA C12 y RPRO-7. Como el filtro viaja dentro de la ruta y el Web.config no cambia la lista de caracteres prohibidos en rutas (Web.config:93), ASP.NET rechaza con 400, antes de llegar al controlador, un filtro con `:`, `*`, `%`, `&`, `<`, `>` o `\`; por ejemplo, uno con fecha (`datetime'…T00:00:00'`). Una `/` dentro del filtro rompe la ruta. Las llamadas internas (listas de correos, recuperar cuenta) no pasan por la ruta y no tienen este límite.

### GET /partner/client/ma/{clientId}  (BusinessPartnerController.GetClientMa, BusinessPartnerController.cs:164-178)

- **Para qué sirve:** devuelve la ficha ampliada del cliente (BP05MA) con 12 navegaciones: teléfonos, domicilios, sociedad, dirección personal, contactos, datos de cliente, datos comerciales, tabla Z `Cte`, personas de contacto, datos bancarios, funciones de interlocutor e impuestos (BusinessPartnerMethods.cs:299).
- **Quién la llama:** el tracker fila 45 la asigna a `customerService/nombreCliente` (no conectada). El método lo usan atención a clientes, crédito y mayoreo (CustomerServiceMethods.cs:201, :228, :260, :344; SolicitudCreditoWebMethods.cs:379; BusinessPartnerMethods.cs:916).
- **Entrada:** `clientId` (texto, en la ruta): el BP (BusinessPartnerController.cs:153-154).
- **Cómo funciona (paso a paso):**
  1. Arma `ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='{clientId}',Client='110')?$expand=<12 navegaciones>&sap-client=110&$format=json` (BusinessPartnerMethods.cs:297-302).
  2. Hace el GET; estado de error, cuerpo vacío o HTML → error (BusinessPartnerMethods.cs:306-324).
  3. Si `d` viene vacío, lanza "No se encontro informacion del cliente en BP05MA" (BusinessPartnerMethods.cs:326-330).
  4. Devuelve `d` (BusinessPartnerMethods.cs:332).
- **Reglas de negocio:**
  - RBP-36: El mandante `110` es parte de la llave del registro, no solo de la URL (BusinessPartnerMethods.cs:297, :302).
  - RBP-37: Solo lectura (BusinessPartnerMethods.cs:293-296).
  - RBP-38: Si SAP responde con error (por ejemplo, un BP que no existe) sale como 400 con el estado y el cuerpo de SAP; si responde con éxito pero sin `d`, el mensaje es "No se encontro informacion del cliente en BP05MA" (BusinessPartnerMethods.cs:316-319, :327-330).
- **Fuentes de datos:** OData S4 `ZAPI_BP05MA_SRV`, entity set `BusinessPartnerSet`, lectura por llave con `$expand` de `to_CteTel`, `to_CteDomicilio`, `to_CteSociedad`, `to_CtePersonalAdr`, `to_CteContacto`, `to_CteCliente`, `to_CteDatosComerciales`, `to_Cte`, `to_CtePersonaContacto`, `to_CteDatosBancarios`, `to_CteFuncInterlocutor`, `to_CteImpuestos` (BusinessPartnerMethods.cs:299-302).
- **Salida y errores:** 200 con `BusinessPartnerMa` (BusinessPartnerMa.cs:11-163). La respuesta sale con los nombres C# (`To_CteTel`, `Results`…), no con los de SAP (`to_CteTel`, `results`) (RBPC-7). 400 `{"Message": "Error, Ocurrio un error al intentar obtener el cliente BP05MA: …"}` (BusinessPartnerController.cs:162-165; BusinessPartnerMethods.cs:336-339).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** ninguno en el código.

### GET /partner/successfactor/employee/{userId}  (BusinessPartnerController.GetSuccessFactorEmployee, BusinessPartnerController.cs:180-194)

- **Para qué sirve:** consulta en SuccessFactors (el sistema de recursos humanos) los datos de un empleado por su número de usuario o nómina.
- **Quién la llama:** el tracker fila 59 la asigna a `customerService/GetEmpleadoByNomina` (no conectada). El método lo usan las órdenes para validar si un código promocional es de un empleado (`HandlePromoCodeAsync`, OrderMethods.cs:1013, :1044).
- **Entrada:** `userId` (texto, en la ruta) (BusinessPartnerController.cs:169-170).
- **Cómo funciona (paso a paso):**
  1. Lee `URL_ANDROID_API`; si no está, lanza error (BusinessPartnerMethods.cs:344-348).
  2. Hace GET a `{URL_ANDROID_API}/employees/get_personalById?user_id={userId}&status=0&centro=` (BusinessPartnerMethods.cs:350, :352-356).
  3. Con éxito, convierte la respuesta en una lista de `SuccessFactorEmployee`; con otro estado, lanza error (BusinessPartnerMethods.cs:358-367).
- **Reglas de negocio:**
  - RBP-39: Parámetros fijos `status=0` y `centro` vacío (BusinessPartnerMethods.cs:350).
  - RBP-40: `userId` se pega sin escapar (BusinessPartnerMethods.cs:350).
  - RBP-41: Va por la API Android de MAVI; es lo correcto para SuccessFactors (SKILL.md:110). No lleva credenciales de S4 (BusinessPartnerMethods.cs:352).
- **Fuentes de datos:** API Android (`URL_ANDROID_API`), operación `employees/get_personalById`, lectura.
- **Salida y errores:** 200 con la lista de empleados (SuccessFactorEmployee.cs:5-108), con nombres C# en la respuesta (`PersonIdExternal`, `FirstName`…, RBPC-7); 400 `{"Message": "Error, Error intentando obtener el empleado en SuccessFactors: …"}` (BusinessPartnerController.cs:178-181; BusinessPartnerMethods.cs:369-372).
- **Configuración usada:** `URL_ANDROID_API`.
- **Pendientes conocidos:** devuelve datos personales del empleado (correo, teléfonos, dirección, fecha de nacimiento) a quien tenga token (SuccessFactorEmployee.cs:40-104); crea un cliente HTTP por petición, sin tiempo de espera propio (BusinessPartnerMethods.cs:352).

### GET /partner/ventadist/client/{clientId}  (BusinessPartnerController.GetCustomerSalesChannels, BusinessPartnerController.cs:196-210)

- **Para qué sirve:** lista las áreas de ventas (organización, canal y sector, con descripciones) en las que está dado de alta un cliente (SD52). Es el reemplazo de la tabla `VentasCanalMAVI` (GUIA:547).
- **Quién la llama:** no se encontró llamador.
- **Entrada:** `clientId` (texto, en la ruta) (BusinessPartnerController.cs:185-186).
- **Cómo funciona (paso a paso):**
  1. Arma el filtro `Bp eq '{clientId}'` codificado para URL (BusinessPartnerMethods.cs:385).
  2. Hace GET a `ZAPI_SD52_PARTNER_SRV/ZSD52_PARTNER_SRVSet?$format=json&$filter=…&sap-client=110` (BusinessPartnerMethods.cs:384-392).
  3. Con éxito, convierte `d.results` en lista de `CanalVentaDist`; si no hay, lista vacía (BusinessPartnerMethods.cs:395-401). Con error, lanza (:403-406).
- **Reglas de negocio:**
  - RBP-42: La consulta va directo a S4 por instrucción del usuario: el endpoint de Android con el mismo nombre es el de **edición** (POST), no el de consulta (BusinessPartnerMethods.cs:379-383; SKILL.md:110).
  - RBP-43: Sin coincidencias es lista vacía, no error (BusinessPartnerMethods.cs:401).
  - RBP-44: Es la única consulta del área que codifica el valor del filtro (BusinessPartnerMethods.cs:385).
- **Fuentes de datos:** OData S4 `ZAPI_SD52_PARTNER_SRV`, entity set `ZSD52_PARTNER_SRVSet`, filtro `Bp eq '…'`, lectura.
- **Salida y errores:** 200 con la lista `CanalVentaDist` (`Mandt`, `Cliente`, `OrgVentas`, `OrgVentasDesc`, `CanalDist`, `CanalDistDesc`, `Sector`, `SectorDesc`) (CanalVentaDist.cs:5-30); 400 `{"Message": "Error, Error intentando obtener los canales de venta: …"}` (BusinessPartnerController.cs:194-197; BusinessPartnerMethods.cs:408-411).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** la **edición** del canal de venta (POST por `URL_ANDROID_API`) no está implementada (BusinessPartnerMethods.cs:383).

### GET /partner/ConsultaAnexos/{valorAnexo}  (BusinessPartnerController.GetConsultaAnexos, BusinessPartnerController.cs:211-225)

- **Para qué sirve:** lee del catálogo general de códigos de SAP (code master) los valores de un programa o "anexo".
- **Quién la llama:** no se encontró llamador.
- **Entrada:** `valorAnexo` (texto, en la ruta): el código de programa `ZcodeProgram` (BusinessPartnerController.cs:200-201).
- **Cómo funciona (paso a paso):**
  1. Hace GET a `ZQBC_CODEMSTRD_SRV/WACODEMSTRDSet?$filter=ZcodeProgram eq '{valorAnexo}'&$format=json&sap-client=110` (BusinessPartnerMethods.cs:881-886).
  2. Estado de error → lanza; cuerpo vacío → lista vacía (BusinessPartnerMethods.cs:889-897).
  3. Convierte `d.results` en lista de `AnexosResult` (BusinessPartnerMethods.cs:899-900).
  4. Cualquier error se registra como `[BusinessPartnerMethods GetConsultaAnexosAsync ERROR]` y se relanza (BusinessPartnerMethods.cs:902-906).
- **Reglas de negocio:**
  - RBP-45: El código se pega sin escapar (BusinessPartnerMethods.cs:882).
  - RBP-46: Sin filas es lista vacía, no error (BusinessPartnerMethods.cs:894-900).
- **Fuentes de datos:** OData S4 `ZQBC_CODEMSTRD_SRV`, entity set `WACODEMSTRDSet`, filtro `ZcodeProgram eq '…'`, lectura.
- **Salida y errores:** 200 con la lista `AnexosResult` (`Mandt`, `ZcodeId`, `ZcodeProgram`, `ZcodeValue`, `ZcodeData`, `ZcodeCmnt`, `ZcodeFlag`, usuario y fechas de alta y cambio) (AnexosResponse.cs:18-55); 400 `{"Message": "Error al consultar anexo, Error al consultar anexos en SAP: …"}` (BusinessPartnerController.cs:209-212).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** el cliente HTTP de S4 no se libera al terminar (BusinessPartnerMethods.cs:884).

### GET /partneraddress/partner/{bpId}  (PartnerAddressController.GetBusinessPartnerAddress, PartnerAddressController.cs:20-38)

- **Para qué sirve:** lista las direcciones del BP con sus teléfonos, desde la API estándar de Business Partner de SAP.
- **Quién la llama:** sin llamador en la DMZ. El método lo usan las órdenes (antes de dar de alta la dirección de entrega) y recoger en sucursal (OrderMethods.cs:1411; StorePickupMethods.cs:281).
- **Entrada:** `bpId` (texto, en la ruta, obligatorio) (PartnerAddressController.cs:24-27).
- **Cómo funciona (paso a paso):**
  1. Valida `bpId` (PartnerAddressController.cs:24-27).
  2. Hace GET a `API_BUSINESS_PARTNER/A_BusinessPartner('{bpId}')/to_BusinessPartnerAddress?$select=…&$expand=to_PhoneNumber` (DeliveryAddressMethods.cs:31-42).
  3. Estado de error → lanza (DeliveryAddressMethods.cs:46-49).
  4. Devuelve `d.results` tal cual; si no viene, `null` (DeliveryAddressMethods.cs:51-57).
- **Reglas de negocio:**
  - RDIR-1: Campos que se piden: `AddressID`, `AddressUUID`, `StreetName`, `HouseNumber`, `HouseNumberSupplementText`, `PostalCode`, `CityName`, `Country`, `Region`, `District`, `StreetPrefixName`, `StreetSuffixName`, `Person`, `AdditionalStreetPrefixName`, `AdditionalStreetSuffixName` y los teléfonos (DeliveryAddressMethods.cs:32).
  - RDIR-2: La URL no lleva `sap-client` ni `$format`: usa el mandante por defecto y pide JSON por la cabecera `Accept` (DeliveryAddressMethods.cs:32, :40).
  - RDIR-3: `bpId` se pega sin escapar (DeliveryAddressMethods.cs:32).
- **Fuentes de datos:** OData S4 `API_BUSINESS_PARTNER`, navegación `A_BusinessPartner('…')/to_BusinessPartnerAddress` con `to_PhoneNumber`, lectura.
- **Salida y errores:** 200 con el arreglo de direcciones de SAP; 200 con `null` si SAP no trae `d.results` (DeliveryAddressMethods.cs:57); 400 `{"Message": "El id del partner no puede ser nulo o vacío."}`; 400 `{"Message": "Error, Ocurrio un error al intentar obtener la direccion del BP: …"}` (PartnerAddressController.cs:26, :34-37; DeliveryAddressMethods.cs:61-64).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** ver RDIR-2.

### POST /partneraddress/partner/{bpId}  (PartnerAddressController.CreateBusinessPartnerAddress, PartnerAddressController.cs:40-58)

- **Para qué sirve:** agrega una dirección nueva a un BP existente.
- **Quién la llama:** sin llamador en la DMZ. El método lo usan las órdenes para registrar la dirección de entrega (OrderMethods.cs:1475).
- **Entrada:** `bpId` (ruta, obligatorio) y `BPAddressCreate` (cuerpo, obligatorio) (PartnerAddressController.cs:44-47; AddressModels.cs:49-66): `Country`, `CityName`, `PostalCode`, `StreetName`, `HouseNumber`, `HouseNumberSupplementText`, `Region`, `StreetPrefixName`, `StreetSuffixName`, `AdditionalStreetSuffixName`, `District`, `ValidityStartDate` (texto, opcionales) y `to_PhoneNumber` (objeto libre, opcional).
- **Cómo funciona (paso a paso):**
  1. Valida ruta y cuerpo (PartnerAddressController.cs:44-47).
  2. Pide el token CSRF a `API_BUSINESS_PARTNER/?sap-client=110` (DeliveryAddressMethods.cs:73-80).
  3. Convierte el cuerpo a JSON sin nulos y hace POST a `A_BusinessPartner('{bpId}')/to_BusinessPartnerAddress` (DeliveryAddressMethods.cs:75, :82-89).
  4. Estado de error → lanza; si no, devuelve la respuesta de SAP (DeliveryAddressMethods.cs:93-98).
- **Reglas de negocio:**
  - RDIR-4: Los campos nulos no viajan (DeliveryAddressMethods.cs:19-22, :82).
  - RDIR-5: `to_PhoneNumber` pasa sin revisar su forma (AddressModels.cs:64-65).
  - RDIR-6: No se valida CP, estado ni colonia; el código no consulta SEPOMEX (DeliveryAddressMethods.cs:71-106).
- **Fuentes de datos:** OData S4 `API_BUSINESS_PARTNER`, navegación `A_BusinessPartner('…')/to_BusinessPartnerAddress`, escritura POST, más el token CSRF.
- **Salida y errores:** 200 con la respuesta de SAP sin cambios: el envoltorio OData `{"d": {…}}` con la dirección creada y su `AddressID` (así la lee la orden, OrderMethods.cs:1479-1480); 400 `{"Message": "Datos mal formulados."}`; 400 `{"Message": "Error, Ocurrio un error al intentar crear la direccion del BP: …"}` (PartnerAddressController.cs:46, :54-57; DeliveryAddressMethods.cs:102-105).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** el modelo de alta no tiene `AdditionalStreetPrefixName`, que sí existe en el de cambio (AddressModels.cs:49-66, :81); el POST no lleva `sap-client`, aunque el token se pide con 110 (DeliveryAddressMethods.cs:74-75).

### PATCH /partneraddress/partner/{bpId}/address/{addressId}  (PartnerAddressController.UpdateBusinessPartnerAddress, PartnerAddressController.cs:60-78)

- **Para qué sirve:** cambia los datos de una dirección del BP.
- **Quién la llama:** no se encontró llamador.
- **Entrada:** `bpId` y `addressId` (ruta, obligatorios) y `BPAddressData` (cuerpo, obligatorio) (PartnerAddressController.cs:64-67; AddressModels.cs:68-83): `ValidityStartDate`, `CityName`, `Country`, `District`, `HouseNumber`, `HouseNumberSupplementText`, `PostalCode`, `Region`, `StreetName`, `StreetPrefixName`, `StreetSuffixName`, `AdditionalStreetPrefixName`, `AdditionalStreetSuffixName`, todos texto opcional.
- **Cómo funciona (paso a paso):**
  1. Valida ruta y cuerpo (PartnerAddressController.cs:64-67).
  2. Pide el token CSRF (DeliveryAddressMethods.cs:115, :120-121).
  3. Hace PATCH a `A_BusinessPartnerAddress(BusinessPartner='{bpId}',AddressID='{addressId}')` con el JSON sin nulos (DeliveryAddressMethods.cs:116, :123-130).
  4. Estado de error → lanza; respuesta vacía (lo normal en un PATCH) → `{"message": "OK"}` (DeliveryAddressMethods.cs:134-139).
- **Reglas de negocio:**
  - RDIR-7: Solo se mandan los campos con valor: es un cambio parcial real (todos los campos del modelo son texto) (DeliveryAddressMethods.cs:19-22, :123; AddressModels.cs:68-83).
- **Fuentes de datos:** OData S4 `API_BUSINESS_PARTNER`, entity set `A_BusinessPartnerAddress`, escritura PATCH por llave, más el token CSRF.
- **Salida y errores:** 200 con la respuesta de SAP o `{"message": "OK"}`; 400 `{"Message": "Datos mal formulados."}`; 400 `{"Message": "Error, Ocurrio un error al intentar actualizar la direccion del BP: …"}` (PartnerAddressController.cs:66, :74-77; DeliveryAddressMethods.cs:143-146).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** el PATCH no lleva `sap-client` (DeliveryAddressMethods.cs:116).

### PATCH /partneraddress/partner/phone  (PartnerAddressController.UpdateAddressPhoneNumber, PartnerAddressController.cs:80-98)

- **Para qué sirve:** cambia un teléfono de una dirección del BP.
- **Quién la llama:** el tracker fila 137 la asocia a `mercancias/ValidarTelefono`, marcada como deprecada.
- **Entrada:** parámetros de URL `addressId`, `person` y `ordinalNumber` (texto, obligatorios) y `PhoneNumberItem` en el cuerpo (obligatorio) (PartnerAddressController.cs:82-87; AddressModels.cs:31-39): `PhoneNumber`, `DestinationLocationCountry`, `IsDefaultPhoneNumber` (booleano), `PhoneNumberExtension`, `PhoneNumberType`, `AddressCommunicationRemarkText`.
- **Cómo funciona (paso a paso):**
  1. Valida los tres parámetros y el cuerpo (PartnerAddressController.cs:84-87).
  2. Pide el token CSRF (DeliveryAddressMethods.cs:156, :161-162).
  3. Hace PATCH a `A_AddressPhoneNumber(AddressID='…',Person='…',OrdinalNumber='…')` (DeliveryAddressMethods.cs:157, :164-171).
  4. Estado de error → lanza; respuesta vacía → `{"message": "Actualizado con éxito"}` (DeliveryAddressMethods.cs:175-180).
- **Reglas de negocio:**
  - RDIR-8: `IsDefaultPhoneNumber` no puede ser nulo: si no se manda, viaja `false` (AddressModels.cs:35; DeliveryAddressMethods.cs:19-22).
  - RDIR-9: Solo cambia el teléfono estándar de la dirección; no toca la tabla Z de teléfonos `CteTel` ni su marca de validado (DeliveryAddressMethods.cs:153-188).
- **Fuentes de datos:** OData S4 `API_BUSINESS_PARTNER`, entity set `A_AddressPhoneNumber`, escritura PATCH por llave, más el token CSRF.
- **Salida y errores:** 200 con la respuesta de SAP o `{"message": "Actualizado con éxito"}`; 400 `{"Message": "Uno o más campos (addressId, person, ordinalNumber o payload) están mal formulados."}`; 400 `{"Message": "Error, Ocurrio un error al intentar actualizar el telefono de la direccion: …"}` (PartnerAddressController.cs:86, :94-97; DeliveryAddressMethods.cs:184-187).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** por RDIR-8, un cambio que no mande `IsDefaultPhoneNumber` le quita al teléfono la marca de predeterminado.

### GET /partneraddress/salesdoc/{sdDoc}/role/{partnRole}  (PartnerAddressController.GetSalesDocumentAddress, PartnerAddressController.cs:100-118)

- **Para qué sirve:** devuelve la dirección de un interlocutor de un documento de ventas (pedido), por ejemplo la del destinatario de mercancía (`WE`).
- **Quién la llama:** el tracker fila 55 menciona esta consulta para `customerService/GetSalesChannelsSTP` (pendiente).
- **Entrada:** `sdDoc` (número de documento) y `partnRole` (rol), texto, en la ruta, obligatorios (PartnerAddressController.cs:104-107).
- **Cómo funciona (paso a paso):**
  1. Valida los parámetros (PartnerAddressController.cs:104-107).
  2. Hace GET a `ZSRV_SALESDOC_ADDRCHANGE_SRV/SD_PartnAddrsSet?$filter=SdDoc eq '{sdDoc}'&$format=json&sap-client=110` (DeliveryAddressMethods.cs:196-207).
  3. Recorre `d.results` y devuelve el primer registro cuyo `PartnRole` sea igual a `partnRole`; si no hay, `null` (DeliveryAddressMethods.cs:216-228).
- **Reglas de negocio:**
  - RDIR-10: El filtro por rol se hace en memoria y la comparación es exacta, mayúsculas incluidas (DeliveryAddressMethods.cs:221).
  - RDIR-11: `sdDoc` se manda como llega: el código no agrega ceros a la izquierda ni escapa (DeliveryAddressMethods.cs:197).
- **Fuentes de datos:** OData S4 `ZSRV_SALESDOC_ADDRCHANGE_SRV`, entity set `SD_PartnAddrsSet`, filtro `SdDoc eq '…'`, lectura.
- **Salida y errores:** 200 con el registro de dirección o `null`; 400 `{"Message": "Los parámetros no pueden estar vacíos."}`; 400 `{"Message": "Error, Ocurrio un error al obtener direccion de entrega del documento de ventas: …"}` (PartnerAddressController.cs:106, :114-117; DeliveryAddressMethods.cs:232-235).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** ninguno en el código.

### POST /partneraddress/salesdoc  (PartnerAddressController.ChangeSalesDocumentAddress, PartnerAddressController.cs:120-138)

- **Para qué sirve:** cambia la dirección de entrega de un documento de ventas.
- **Quién la llama:** sin llamador en la DMZ. El método lo usan las órdenes después de dar de alta la dirección del BP (OrderMethods.cs:1500).
- **Entrada:** `SalesDocAddressRequest` (AddressModels.cs:7-13): `SalesDocument` y `PartnerNumber` obligatorios (PartnerAddressController.cs:124-127); `AddressNumber` y `PartnerRole` opcionales.
- **Cómo funciona (paso a paso):**
  1. Valida los obligatorios (PartnerAddressController.cs:124-127).
  2. Pide el token CSRF a `ZSRV_SALESDOC_ADDRCHANGE_SRV/?sap-client=110` (DeliveryAddressMethods.cs:245, :250-251).
  3. Hace POST a `ChangeDeliveryAddressSet?sap-client=110&sap-language=es` con el JSON sin nulos (DeliveryAddressMethods.cs:246, :253-260).
  4. Estado de error → lanza; si no, devuelve la respuesta de SAP (DeliveryAddressMethods.cs:264-269).
- **Reglas de negocio:**
  - RDIR-12: `AddressNumber` y `PartnerRole` nulos no viajan; SAP decide qué hacer sin ellos (DeliveryAddressMethods.cs:19-22, :253).
- **Fuentes de datos:** OData S4 `ZSRV_SALESDOC_ADDRCHANGE_SRV`, entity set `ChangeDeliveryAddressSet`, escritura POST, más el token CSRF.
- **Salida y errores:** 200 con la respuesta de SAP; 400 `{"Message": "Los datos del documento de ventas están mal formulados."}`; 400 `{"Message": "Error, Ocurrio un error al cambiar la direccion del documento de ventas: …"}` (PartnerAddressController.cs:126, :134-137; DeliveryAddressMethods.cs:273-276).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** ninguno en el código.

### POST /customer/setCustomerList  (CustomersController.SetCustomerEmailage, CustomersController.cs:15-55)

- **Para qué sirve:** agrega el correo de un cliente a la lista blanca o a la lista negra de correos de la tienda en línea (CustomerMethods.cs:11).
- **Quién la llama:** la ruta `customer/setCustomerList` de la DMZ (DMZ Controllers\CustomersController.cs:70; tracker fila 33).
- **Entrada:** `CustomerRequest` (CustomerRequest.cs:3-17). Obligatorios, no nulos: `name`, `email`, `idMagento`, `list` y `address`; un texto vacío sí pasa (CustomersController.cs:22-29). `list` solo acepta `"white"` o `"black"` (:32-42).
- **Cómo funciona (paso a paso):**
  1. Cuerpo nulo o campo nulo → 400 "Datos incompletos" (CustomersController.cs:19-29).
  2. Traduce la lista: `white` → `Blanca`, `black` → `Negra`; otro valor → 400 "Lista invalida" (CustomersController.cs:32-42).
  3. Llama a `blackwhitelistAsync("Insertar", …)` (CustomersController.cs:46-47).
  4. Antes de insertar, busca en BP05 un cliente con ese correo, hasta en dos intentos: el correo sin espacios a los lados y, solo si BP05 no encuentra nada, saneado y en MAYÚSCULAS (RCLI-2); cada valor va con la comilla duplicada y codificado para la URL (RCLI-3). Si no hay, devuelve `""` sin insertar (CustomerMethods.cs:21-24, :76-116).
  5. Ejecuta `exec SpListaNBMagento @Tipo, @Correo, @Lista, @NumPedido, @Nombre, @DireccionEntrega, @IdMagento, @FechaRegistro` en SIGMavi (CustomerMethods.cs:26-48).
  6. Si el SP devuelve alguna fila, la respuesta es `"true"`; si no, `""` (CustomerMethods.cs:52-61).
- **Reglas de negocio:**
  - RCLI-1: Solo se inserta si el correo pertenece a un BP en SAP (CustomerMethods.cs:21-24).
  - RCLI-2: El campo de correo en BP05 se toma de la llave `SAP_BP_CAMPO_EMAIL`; como no está en el Web.config, se usa `Mail` (CustomerMethods.cs:80-81). Con ese campo se arman hasta dos filtros `<campo> eq '<valor>'`, en orden (decisión DEC-17 A del 2026-10-07, CQ14 de `PLAN_FABLE_CONTROLADORES\01_CustomersController.md` §5, T1.2-03; `01_S4b_S4c_S5_2026-10-07.md` §R y §6): primero el correo tal como lo manda Magento, sin espacios a los lados (`Trim()`), que es como quedó guardado en los BP anteriores al 2026-10-05; solo si BP05 responde "No se encontraron clientes", el correo pasado por `Sntz` (RBP-48), sin espacios y en MAYÚSCULAS, que es lo que guarda el alta desde el 2026-10-05 (RBP-14; BusinessPartnerMethods.cs:397, :484); el segundo intento se omite si es igual al primero (CustomerMethods.cs:83-108). Así un espacio final o la escritura en minúsculas ya no impiden la inserción, como con la collation de LAN (`SPsOrden\SpVTASListaNBMagento.sql:74-78, :103-107`). Cambio del 2026-10-07 sin compilar ni E2E (pruebas E1-E5, E6a y E6b del usuario). No se sabe aún si el `eq` de BP05 distingue mayúsculas (DF-4/DF-5 pendientes); el borrado de la llave es J4-07, sin respuesta.
  - RCLI-3: La comilla simple de cada valor se duplica y el valor se codifica para la URL con `Uri.EscapeDataString` antes de armar el filtro OData, así que `+`, `&`, `#`, `%` y `@` viajan como `%2B`, `%26`, `%23`, `%25` y `%40` y el filtro llega entero a SAP (CustomerMethods.cs:96, en cada intento de RCLI-2). La codificación es del 2026-10-05 (decisión CQ13, `PLAN_FABLE_CONTROLADORES\01_CustomersController.md` §5, T1.2-02), sin E2E: la hace el usuario (S6). Antes solo se duplicaba la comilla y un correo con `#`, `&` o `%` rompía el filtro, así que no se insertaba.
  - RCLI-4: `@NumPedido` va siempre en `"0"` y `@FechaRegistro` es la hora del servidor (CustomerMethods.cs:42, :46-47).
  - RCLI-5: Si falla la consulta a SAP, se toma como "el correo no existe" y se registra `[CUSTOMER ValidarClienteEnSap]` (CustomerMethods.cs:110-115); un error que no sea "No se encontraron clientes" corta en el intento en que ocurre, sin pasar al segundo (CustomerMethods.cs:102-107). Como BP05 responde "No se encontraron clientes" con un error cuando no hay coincidencias (RBP-35), un correo que no es de ningún BP también deja esa línea en el log, una sola vez, después del último intento de RCLI-2 y con el último filtro probado, codificado desde el 2026-10-05 (RCLI-3) (CustomerMethods.cs:96, :112-113; BusinessPartnerMethods.cs:247-250, :256-259).
  - RCLI-6: Si falla el SQL, se registra `[CUSTOMER blackwhitelist ERROR]` y el error se relanza (CustomerMethods.cs:64-69); en esta ruta lo atrapa el controlador, que lo registra como `[CUSTOMER setCustomerList ERROR]` y responde 200 sin cuerpo (CustomersController.cs:50-54), igual que LAN. Cambio del 2026-10-05 (decisión CQ12 = A, `PLAN_FABLE_CONTROLADORES\01_CustomersController.md` §5, T1.L-02), sin E2E. Antes el método se tragaba el error y la respuesta era `""`.
  - RCLI-7: El tiempo de espera del comando es de 999 999 segundos (CustomerMethods.cs:50).
- **Fuentes de datos:**
  - OData S4 BP05 (`ZB_DATOS_CLIENTE`), filtro `Mail eq '…'`, lectura, una o dos veces (RCLI-2) (CustomerMethods.cs:92-100).
  - SQL Server SIGMavi, SP `SpListaNBMagento` con `@Tipo = 'Insertar'`, escritura. La conexión sale de Conexion.dll con `obtenerConexionSigMaviAsync` y el alias de servidor del setting `Server` (CustomerMethods.cs:32-33; ConexionSQL.cs:72-98; decisión DU19).
- **Salida y errores:** 200 con `"true"` o `""`; 400 `{"Message": "Datos incompletos"}` o `{"Message": "Lista invalida"}`; un error de SQL (RCLI-6) o inesperado se registra como `[CUSTOMER setCustomerList ERROR]` y responde 200 sin cuerpo (CustomersController.cs:50-54).
- **Configuración usada:** `SAP_BP_CAMPO_EMAIL` (opcional, hoy ausente); setting `Server` (Web.config:159-161).
- **Pendientes conocidos:** en paridad con LAN; no volver a reportarlo (GUIA:369). Falta confirmar el destino final de las listas cuando se apague Intelisis, probablemente SIGMavi (GUIA:547). La codificación del correo en el filtro (RCLI-3) y la rama de error (RCLI-6) cambiaron el 2026-10-05 sin E2E, y la doble búsqueda del correo (RCLI-2) el 2026-10-07 sin compilar ni E2E; la E2E la hace el usuario (`PLAN_FABLE_CONTROLADORES\01_CustomersController.md` T1.2-01, T1.2-02, T1.2-03, S6; pruebas E1-E6b de `01_S4b_S4c_S5_2026-10-07.md` §6).

### POST /customer/getCustomerList  (CustomersController.GetCustomerEmailage, CustomersController.cs:57-77)

- **Para qué sirve:** dice si un correo está en la lista negra, en la blanca o en ninguna.
- **Quién la llama:** la ruta `customer/getCustomerList` de la DMZ (DMZ Controllers\CustomersController.cs:88; tracker fila 34).
- **Entrada:** `CustomerRequest`; solo se usa `email`, obligatorio (CustomersController.cs:61-62).
- **Cómo funciona (paso a paso):**
  1. Sin cuerpo o sin correo → 400 (CustomersController.cs:61-62).
  2. Consulta la lista `Negra` con el SP; si responde `"true"` → `"black"` (CustomersController.cs:64-69).
  3. Si no, consulta la lista `Blanca`; `"true"` → `"white"`, si no → `"No esta en listas"` (CustomersController.cs:70-74).
- **Reglas de negocio:**
  - RCLI-8: La lista negra gana: se consulta primero (CustomersController.cs:64-69).
  - RCLI-9: La consulta no revisa que el correo sea de un BP; eso solo pasa al insertar (CustomerMethods.cs:21).
  - RCLI-10: Un error de SQL se registra como `[CUSTOMER blackwhitelist ERROR]` y se relanza (CustomerMethods.cs:64-69); el controlador no lo atrapa, así que la respuesta es 500, igual que LAN (CustomersController.cs:59-77). Cambio del 2026-10-05 (decisión CQ12 = A, `PLAN_FABLE_CONTROLADORES\01_CustomersController.md` §5, T1.L-02), sin E2E. Antes el error se tragaba y se leía como "no está": la respuesta podía ser `"No esta en listas"` aunque la base hubiera fallado, y un correo en lista negra pasaba como limpio con SIGMavi caído.
- **Fuentes de datos:** SQL Server SIGMavi, SP `SpListaNBMagento` con `@Tipo = 'Consultar'` y `@Lista` `Negra` o `Blanca`, lectura (CustomerMethods.cs:26, :32-38).
- **Salida y errores:** 200 con `"black"`, `"white"` o `"No esta en listas"`; 400 `{"Message": "Datos incompletos"}` (CustomersController.cs:62, :76); 500 si falla SQL (RCLI-10).
- **Configuración usada:** setting `Server` (Web.config:159-161).
- **Pendientes conocidos:** la rama de error (RCLI-10) cambió el 2026-10-05 sin E2E; la E2E la hace el usuario (`PLAN_FABLE_CONTROLADORES\01_CustomersController.md` T1.3-01, S6).

### POST /customer/deleteCustomerList  (CustomersController.DeleteCustomerEmailage, CustomersController.cs:79-88)

- **Para qué sirve:** quita un correo de las listas.
- **Quién la llama:** la ruta `customer/deleteCustomerList` de la DMZ (DMZ Controllers\CustomersController.cs:106; tracker fila 35).
- **Entrada:** `CustomerRequest`; solo `email`, obligatorio (CustomersController.cs:83-84).
- **Cómo funciona (paso a paso):**
  1. Sin cuerpo o sin correo → 400 (CustomersController.cs:83-84).
  2. Ejecuta el SP con `@Tipo = 'Eliminar'` y `@Lista` vacío (CustomersController.cs:86; CustomerMethods.cs:16-17, :26, :36-38).
  3. Si el SP devuelve filas → `"true"`; si no → `""` (CustomerMethods.cs:52-61).
- **Reglas de negocio:**
  - RCLI-11: No se indica lista: `@Lista` va vacío (CustomersController.cs:86; CustomerMethods.cs:16, :38).
  - RCLI-12: Un error de SQL se registra como `[CUSTOMER blackwhitelist ERROR]` y se relanza (CustomerMethods.cs:64-69); el controlador no lo atrapa, así que la respuesta es 500, igual que LAN (CustomersController.cs:81-88). Cambio del 2026-10-05 (decisión CQ12 = A, `PLAN_FABLE_CONTROLADORES\01_CustomersController.md` §5, T1.L-02), sin E2E. Antes la respuesta era `""`.
- **Fuentes de datos:** SQL Server SIGMavi, SP `SpListaNBMagento`, escritura.
- **Salida y errores:** 200 con `"true"` o `""`; 400 `{"Message": "Datos incompletos"}` (CustomersController.cs:84, :87); 500 si falla SQL (RCLI-12).
- **Configuración usada:** setting `Server` (Web.config:159-161).
- **Pendientes conocidos:** en paridad con LAN (GUIA:369); la rama de error (RCLI-12) cambió el 2026-10-05 sin E2E; la E2E la hace el usuario (`PLAN_FABLE_CONTROLADORES\01_CustomersController.md` T1.4-01, S6).

### POST /customer/getCuenta  (CustomersController.GetCuenta, CustomersController.cs:92-98)

- **Para qué sirve:** consulta en Magento la cuenta asociada a un cliente, pasando por la DMZ (CustomersController.cs:90-91).
- **Quién la llama:** el tracker fila 116 la marca como ruta solo de LAN, sin ruta en la DMZ.
- **Entrada:** `CustomerIntelisis` (CuentaModels.cs:14-19): `nuevaCuenta`, `correoCuenta`, `idCliente`, texto, opcionales. No hay validación (CustomersController.cs:94-97).
- **Cómo funciona (paso a paso):**
  1. Convierte el cuerpo a JSON sin nulos (MagentoAccountMethods.cs:17-18, :24-25).
  2. `Curl.PostAsync("magento/getCuenta", …)`: se autentica en la DMZ (`login/authenticate`, con `USER_DMZ`), manda el JSON con token Bearer y, si algo falla, reintenta hasta 3 veces en total (inicia sesión de nuevo en cada intento), esperando 2 s tras el primer fallo y 4 s tras el segundo; cada llamada tiene 30 s de espera y acepta cualquier certificado (Curl.cs:19-28, :32-35, :48-65, :71-105).
  3. A la respuesta le cambia `\"` por `"` y le quita las comillas exteriores (MagentoAccountMethods.cs:27, :40-45).
- **Reglas de negocio:**
  - RCLI-13: Un campo nulo no viaja a Magento, como en el legado (CuentaModels.cs:12-13; MagentoAccountMethods.cs:17-18).
  - RCLI-14: Reintento automático: hasta 3 llamadas antes de dar error (Curl.cs:75-104).
- **Fuentes de datos:** DMZ `magento/getCuenta`, que llega a Magento REST `rest/V1/mavi-cuenta/getCuenta` (MagentoAccountMethods.cs:14).
- **Salida y errores:** 200 con el texto que responde Magento; si fallan los 3 intentos, la excepción no se atrapa y sale 500 con su detalle (CustomersController.cs:94-98; Curl.cs:104; Web.config:94).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`.
- **Pendientes conocidos:** sin ruta en la DMZ (tracker fila 116).

### POST /customer/setCuenta  (CustomersController.SetCuenta, CustomersController.cs:102-108)

- **Para qué sirve:** fija en Magento la cuenta del cliente; gemela de `getCuenta` (CustomersController.cs:100-101).
- **Quién la llama:** el tracker fila 117 la marca como ruta solo de LAN, sin ruta en la DMZ.
- **Entrada:** `CustomerIntelisis` (`nuevaCuenta`, `correoCuenta`, `idCliente`), sin validación (CuentaModels.cs:14-19; CustomersController.cs:104-107).
- **Cómo funciona (paso a paso):** igual que `getCuenta`, pero contra `magento/setCuenta` (MagentoAccountMethods.cs:31-38; Curl.cs:71-105).
- **Reglas de negocio:**
  - RCLI-15: Los nulos no viajan (MagentoAccountMethods.cs:17-18, :35).
  - RCLI-16: Por los reintentos, si la primera llamada sí llegó pero su respuesta falló, la escritura se puede repetir (Curl.cs:75-101).
- **Fuentes de datos:** DMZ `magento/setCuenta`, que llega a Magento REST.
- **Salida y errores:** 200 con el texto de Magento; 500 con detalle si fallan los 3 intentos (CustomersController.cs:107; Curl.cs:104).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`.
- **Pendientes conocidos:** sin ruta en la DMZ (tracker fila 117).

### POST /customer/cashCustomerReport  (CustomersController.CreateCashReport, CustomersController.cs:112-118)

- **Para qué sirve:** recibe en Base64 el reporte de clientes de contado y lo deja en la carpeta compartida de WhatsApp (CashReportMethods.cs:11-15).
- **Quién la llama:** la ruta `customer/cashCustomerReport` de la DMZ (DMZ Controllers\CustomersController.cs:120).
- **Entrada:** `CustomerReportRequest` (CuentaModels.cs:22-26): `fileName` y `fileContent` (Base64), obligatorios (CashReportMethods.cs:49-54).
- **Cómo funciona (paso a paso):**
  1. Cuerpo nulo o campo vacío → respuesta con `status` 400 (CashReportMethods.cs:49-54).
  2. Crea la carpeta local si no existe (CashReportMethods.cs:58).
  3. Decodifica el Base64 y escribe el archivo en la carpeta local (CashReportMethods.cs:60-68).
  4. Suplanta la cuenta de servicio de red y copia el archivo a la carpeta compartida (CashReportMethods.cs:70-76).
  5. Responde con `status` 200 (CashReportMethods.cs:78).
- **Reglas de negocio:**
  - RCLI-17: Las carpetas salen del Web.config; si las llaves faltan, se usa una ruta fija en el código (CashReportMethods.cs:19-40).
  - RCLI-18: Si el archivo ya existe se sobrescribe, en local y en la carpeta compartida (CashReportMethods.cs:64, :75).
  - RCLI-19: El resultado va en el campo `status` del cuerpo; el HTTP siempre es 200 (CuentaModels.cs:28-37; CustomersController.cs:117).
  - RCLI-20: `fileName` se usa tal cual para armar las rutas, sin limpiarlo (CashReportMethods.cs:61, :75).
- **Fuentes de datos:** disco local del servidor y carpeta compartida SMB, escritura.
- **Salida y errores:** 200 `{"status": 200, "message": "Se ha generado la descarga del Reporte."}`; 200 `{"status": 400, "message": "Petición incorrecta, verifica los campos."}`; 200 `{"status": 500, "message": "Error al crear el reporte: …"}` y log `[CUSTOMER cashCustomerReport ERROR]` (CashReportMethods.cs:53, :78, :80-86).
- **Configuración usada:** `CASH_REPORT_LOCAL_PATH`, `CASH_REPORT_SHARE_PATH`, `SMB_IMPERSONATION_USER`, `SMB_IMPERSONATION_DOMAIN`, `SMB_IMPERSONATION_PASSWORD`.
- **Pendientes conocidos:** la ruta de respaldo del código apunta a una carpeta STAGE, igual que el legado (CashReportMethods.cs:21-22); el tracker fila 36 aún la marca "To Do" aunque la ruta existe; ver RCLI-20.

### POST /prospecto/recuperarcuenta  (ProspectoController.RecuperarCuenta, ProspectoController.cs:18-73)

- **Para qué sirve:** permite a un cliente recuperar su número de cuenta (BP) dando nombre, apellidos, fecha de nacimiento y RFC. Devuelve el nombre con asteriscos para que lo reconozca sin exponerlo.
- **Quién la llama:** la ruta `prospecto/recuperarcuenta` de la DMZ (DMZ Controllers\ProspectoController.cs:42; tracker fila 106).
- **Entrada:** `RecuperarCuentaRequest` (RecuperarCuentaRequest.cs:8-15): `rfc` y `fechaNacimiento` obligatorios (ProspectoController.cs:22); `nombre`, `apellidoPaterno`, `apellidoMaterno` opcionales (nulo → `""`) (:34-36).
- **Cómo funciona (paso a paso):**
  1. Sin cuerpo, sin RFC o sin fecha → 200 con estatus 4 "Request vacío o incompleto" (ProspectoController.cs:22-25).
  2. Quita los acentos a nombre y apellidos, como hacía Intelisis (ProspectoController.cs:32-36; CustomerServiceMethods.cs:155-172).
  3. Si `DateTime.TryParse` entiende la fecha, la pasa a `yyyy-MM-ddT00:00:00`; si no, la deja como llegó (ProspectoController.cs:37-43).
  4. Arma el filtro BP05: `PrimerNombre eq '…' and PrimerApellido eq '…' and SegundoApellido eq '…' and FechaNacimiento eq datetime'…' and RFC eq '…'` (ProspectoController.cs:45-47).
  5. Busca con `GetFilterClientsAsync` y toma el primero (ProspectoController.cs:49-50).
  6. Si hay coincidencia, oculta letras de "PrimerNombre PrimerApellido SegundoApellido" y responde estatus 1 con la cuenta (ProspectoController.cs:52-58).
  7. Sin coincidencia → estatus 4 "Datos inválidos"; otro error → log `ERROR recuperarcuenta SAP` y estatus 0 "Error interno" (ProspectoController.cs:60-71).
- **Reglas de negocio:**
  - RPRO-1: Los cinco datos deben coincidir exactamente (`eq`), apellido materno incluido; el código no cambia mayúsculas ni recorta espacios (ProspectoController.cs:47).
  - RPRO-2: Quitar acentos también convierte la Ñ en N (ProspectoController.cs:34-36; CustomerServiceMethods.cs:160-171).
  - RPRO-3: Ocultar letras (regla de Intelisis): de cada palabra queda la primera letra y las demás letras `a-z`/`A-Z` se cambian por `*`; las letras con acento y la Ñ no se ocultan (ProspectoController.cs:54-55; CustomerServiceMethods.cs:174-193).
  - RPRO-4: Si hay varias coincidencias se toma la primera que devuelva SAP, sin orden definido (ProspectoController.cs:50).
  - RPRO-5: Estatus: 1 encontrado, 4 datos incompletos o inválidos, 0 error interno; el HTTP siempre es 200 (ProspectoController.cs:24, :57, :61, :67, :71).
  - RPRO-6: "No se encontraron clientes" (cero coincidencias en BP05) se traduce a estatus 4 (ProspectoController.cs:65-68; BusinessPartnerMethods.cs:280).
  - RPRO-7: Los valores se pegan en el filtro sin escapar la comilla simple (ProspectoController.cs:47; GUIA C12).
- **Fuentes de datos:** OData S4 BP05 (`ZB_DATOS_CLIENTE`), filtro por los cinco campos, lectura (ProspectoController.cs:47-49).
- **Salida y errores:** 200 siempre, con `RecuperarCuentaResult` `{ "cuenta", "nombre", "estatus" }` (RecuperarCuentaResult.cs:8-22): cuenta y nombre oculto con estatus 1; cuenta vacía y mensaje con estatus 4 o 0.
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:**
  - Un cliente sin segundo apellido no puede recuperar su cuenta: el filtro solo lo encuentra con `SegundoApellido eq ''`, el nombre armado termina en una palabra vacía, `Substring(0, 1)` falla y la respuesta es estatus 0 "Error interno" (ProspectoController.cs:47, :55, :63-71; CustomerServiceMethods.cs:179-186). Pasa lo mismo si algún nombre trae doble espacio.
  - Inyección de filtro OData (GUIA C12; RPRO-7).
  - La fecha se interpreta con la cultura del servidor (ProspectoController.cs:40).
  - La GUIA la cuenta entre las rutas sin paridad con LAN: la forma de la respuesta coincide, pero el campo `nombre` (enmascarado) difiere (GUIA:366).

### POST /company/wholesale-customer  (WholesaleCustomerController.GetWholesaleCustomerAsync, WholesaleCustomerController.cs:13-33)

- **Para qué sirve:** devuelve el nombre del cliente de mayoreo (empresa) a partir de su cuenta BP (S2-03, BusinessPartnerMethods.cs:909-912).
- **Quién la llama:** la ruta `GET company/wholesale-customer/{wholesaleAccount}` de la DMZ, que antes exige de 8 a 10 dígitos (DMZ Controllers\WholesaleCustomerController.cs:17, :21-27; tracker fila 114).
- **Entrada:** `WholesaleCustomerRequest` con `wholesaleAccount` (texto, obligatorio) (WholesaleCustomerRequest.cs:5-8; WholesaleCustomerController.cs:17-20).
- **Cómo funciona (paso a paso):**
  1. Sin cuenta → 400 (WholesaleCustomerController.cs:17-20).
  2. Lee la ficha BP05MA (BusinessPartnerMethods.cs:916).
  3. Nombre = partes no vacías de `NameFirst`, `Namemiddle`, `NameLast`, `NameLst2` unidas con espacio (BusinessPartnerMethods.cs:919).
  4. Si queda vacío, usa la razón social `NameOrg1` a `NameOrg4` (BusinessPartnerMethods.cs:920-923).
  5. Si sigue vacío, usa `Name1Text`; si nada, el texto `"null"` (BusinessPartnerMethods.cs:925-930).
- **Reglas de negocio:**
  - RMAY-1: Orden de preferencia: nombre de persona física, luego razón social, luego `Name1Text` (BusinessPartnerMethods.cs:919-928).
  - RMAY-2: "No encontrado" se responde como el texto `"null"` con HTTP 200, no como error (BusinessPartnerMethods.cs:917, :930, :934-937).
  - RMAY-3: Solo cuenta como "no encontrado" un error cuyo mensaje contenga "No se encontro informacion" o "404"; cualquier otro error sube (BusinessPartnerMethods.cs:932-939).
- **Fuentes de datos:** OData S4 `ZAPI_BP05MA_SRV/BusinessPartnerSet`, lectura (vía `GetClientMaAsync`, BusinessPartnerMethods.cs:297-340).
- **Salida y errores:** 200 con el nombre como cadena, o `"null"`; 400 `{"Message": "Wholesale account was not provided."}` (WholesaleCustomerController.cs:19); 500 con el detalle de la excepción en cualquier otro error (WholesaleCustomerController.cs:29-32; Web.config:94).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** el mensaje de error de BP05MA lleva el estado como palabra (`NotFound`), no como "404" (BusinessPartnerMethods.cs:318). Hay que verificar: un BP que no existe podría salir como 500 en lugar de `"null"`, salvo que el cuerpo de SAP traiga el texto "404".

### POST /account/bonus/async  (AccountController.GetBonusAsync, AccountController.cs:13-27)

- **Para qué sirve:** consulta en SAP las campañas de bonificación (SD33) que aplican según organización de ventas, canal, condición, sucursal, artículo y movimiento.
- **Quién la llama:** no se encontró llamador en la DMZ ni en el tracker.
- **Entrada:** `BonusRequest` (BonusRequest.cs:3-11): `Vkorg`, `Vtweg`, `Zcondicion`, `Zsucursal`, `Zarticulo`, `Zmovimiento`, texto, opcionales (los nulos viajan como `null`, AccountMethods.cs:105-113, :118). Según la ficha SD33, `Zcondicion`, `Zsucursal` y `Zarticulo` aceptan `*` y listas. El cuerpo sí es necesario: no se valida, y si llega nulo el código falla al leer `bonusRequest.Vkorg` y responde 400 con ese error (AccountMethods.cs:107, :140-143).
- **Cómo funciona (paso a paso):**
  1. URL = base de S4 + la ruta de la llave `ZAPI_CAMPANA_BONIFICACION_SRV` (se le antepone `/` si no lo trae) + `?sap-client=110` (AccountMethods.cs:24-28, :95-98).
  2. Pide el token CSRF a la raíz fija `/ZAPI_CAMPANA_BONIFICACION_SRV/?sap-client=110&sap-language=ES` (AccountMethods.cs:100-103, :115-116).
  3. Arma un `Bonus` con los 6 filtros; los demás campos van con su valor por defecto: `0`, `""`, `RESPONSESet: []` y `RETURN` vacío (AccountMethods.cs:105-113; Bonus.cs:8-21; BonusReturn.cs:3-10).
  4. Hace POST; estado de error, cuerpo vacío o HTML → error (AccountMethods.cs:118-134).
  5. Lee `d.RESPONSESet.results` y arma la respuesta con un mensaje (AccountMethods.cs:136, :153-178).
- **Reglas de negocio:**
  - RCTA-1: El cuerpo lleva `RESPONSESet` vacío y `RETURN` vacío para que SAP los llene, como pide la ficha SD33 (Bonus.cs:20-21; AccountMethods.cs:118).
  - RCTA-2: El mensaje lo pone ServicioSAP según haya o no resultados; no usa el `RETURN` de SAP (AccountMethods.cs:173-175).
  - RCTA-3: Si falta `d`, `RESPONSESet` o `results`, es error (AccountMethods.cs:159-166).
  - RCTA-4: Cada resultado se lee con el modelo `Bonus`, que solo tiene los campos de filtro (folio, estatus, fechas, organización, canal, sector, condición, sucursal, artículo, movimiento, línea) (AccountMethods.cs:168; Bonus.cs:8-19).
- **Fuentes de datos:** OData S4 `ZAPI_CAMPANA_BONIFICACION_SRV` (entidad según la llave; en la ficha SD33 es `REQUESTSet`), POST, más el token CSRF.
- **Salida y errores:** 200 `{ "Message": "…", "Data": [ … ] }` (Bonus.cs:26-30); cada elemento de `Data` trae los campos de `Bonus`, incluidos `RESPONSESet` vacío y `RETURN` vacío (Bonus.cs:20-21). El mensaje es "Se han encontrado promociones según los criterios ingresados" o "No se ha encontrado ninguna bonificación válida…" (AccountMethods.cs:173-175); 400 `{"Message": "Error (Async), Error al obtener bonificaciones desde SAP: …"}` (AccountController.cs:23-26; AccountMethods.cs:140-143).
- **Configuración usada:** `ZAPI_CAMPANA_BONIFICACION_SRV`.
- **Pendientes conocidos:** por RCTA-4 se pierden los datos propios de cada campaña que trae SAP (nombre `Znombon`, porcentajes `Zporcbon1`…, plazos, cascada, exclusiones). Los modelos que sí los tienen, `BonusResponseSet` y `BonusOK`, existen y no se usan (BonusResponseSet.cs:3-59; BonusOK.cs:5-162).

### POST /account/bonus  (AccountController.GetBonus, AccountController.cs:29-43)

- **Para qué sirve:** la misma consulta de bonificaciones que `account/bonus/async`.
- **Quién la llama:** no se encontró llamador.
- **Entrada:** `BonusRequest`, igual que la gemela (BonusRequest.cs:3-11).
- **Cómo funciona (paso a paso):** mismos pasos y misma URL (AccountMethods.cs:40-89). Diferencias: no libera la petición ni la respuesta HTTP al terminar (AccountMethods.cs:69-75) y el texto de error dice "(Sync)".
- **Reglas de negocio:** las mismas RCTA-1 a RCTA-4 (AccountMethods.cs:54-62, :77-83, :153-178).
- **Fuentes de datos:** OData S4 `ZAPI_CAMPANA_BONIFICACION_SRV`, POST.
- **Salida y errores:** 200 `{ "Message", "Data" }`; 400 `{"Message": "Error (Sync), Error al obtener bonificaciones desde SAP: …"}` (AccountController.cs:37-42; AccountMethods.cs:85-88).
- **Configuración usada:** `ZAPI_CAMPANA_BONIFICACION_SRV`.
- **Pendientes conocidos:** ruta duplicada de `account/bonus/async`; el nombre "Sync" es histórico, las dos son asíncronas (AccountMethods.cs:40, :91). Mismo pendiente de RCTA-4.

### GET /account/sucursal/{id}  (AccountController.GetSucursal, AccountController.cs:45-59)

- **Para qué sirve:** devuelve los datos maestros de una sucursal (DM07).
- **Quién la llama:** no se encontró llamador en la DMZ ni en el tracker. El método lo usan las órdenes al validar un código promocional de empleado (`HandlePromoCodeAsync`, OrderMethods.cs:1013, :1115).
- **Entrada:** `id` (texto, en la ruta): el código de sucursal (AccountController.cs:46-47).
- **Cómo funciona (paso a paso):**
  1. Hace GET a `ZAPI_SUCURSALES_SRV/SucursalesSet?$format=json&sap-client=110&$filter=Sucursal eq '{id}'` (AccountMethods.cs:189-198).
  2. Estado de error → lanza; cuerpo vacío → lista vacía (AccountMethods.cs:202-210).
  3. Devuelve `d.results` (AccountMethods.cs:212-213).
- **Reglas de negocio:**
  - RCTA-5: El código se pega sin escapar ni rellenar con ceros (AccountMethods.cs:190).
  - RCTA-6: Sin coincidencias es lista vacía (AccountMethods.cs:213).
- **Fuentes de datos:** OData S4 `ZAPI_SUCURSALES_SRV`, entity set `SucursalesSet`, filtro `Sucursal eq '…'`, lectura.
- **Salida y errores:** 200 con la lista `SucursalResult` (`Sucursal`, `Nombre`, `Direccion`, `Colonia`, `Poblacion`, `Estado`, `CodigoPostal`, `Telefonos`, `Estatus`, `OrganizacionVenta`, `CentroCostos`, `CentroBeneficio`, `Tipo`…) (SucursalResponse.cs:18-115); 400 `{"Message": "Error al obtener sucursal, Error intentando obtener la información de sucursal: …"}` (AccountController.cs:55-58; AccountMethods.cs:217-220).
- **Configuración usada:** ninguna llave del Web.config.
- **Pendientes conocidos:** ninguno en el código.

### POST /login/auth  (LoginController.Authenticate, LoginController.cs:19-42)

- **Para qué sirve:** emite el token de sesión (JWT) que piden todas las demás rutas de ServicioSAP.
- **Quién la llama:** la DMZ pide este token antes de llamar a ServicioSAP (DMZ Helper\Curl.cs:80; tracker fila 63).
- **Entrada:** `Login` con `Username` y `Password` (texto) (Login.cs:8-12).
- **Cómo funciona (paso a paso):**
  1. Cuerpo nulo → 400 (LoginController.cs:23-26).
  2. Calcula el hash de la contraseña y del usuario con su sal y los compara con los del Web.config (LoginController.cs:28-33; HashService.cs:37-41).
  3. Si los dos coinciden, genera el JWT y responde 200 (LoginController.cs:35-36).
  4. Si no, 401 (LoginController.cs:38-41).
- **Reglas de negocio:**
  - RLOG-1: Usuario y contraseña se comparan por hash PBKDF2 (`Rfc2898DeriveBytes`, 10 101 iteraciones, 24 bytes), con una comparación que tarda lo mismo acierte o no (HashService.cs:8-10, :18-25, :43-50).
  - RLOG-2: Hay un solo usuario técnico: los hashes y sales viven en el Web.config (LoginController.cs:30, :32).
  - RLOG-3: El token se firma con HMAC-SHA256, lleva el usuario como `Name`, emisor y audiencia del Web.config, y vence a los `JWT_EXPIRE_MINUTES` minutos (TokenGenerator.cs:31-57).
  - RLOG-4: Es la única ruta del área sin `[Authorize]` (`[AllowAnonymous]`, LoginController.cs:14).
- **Fuentes de datos:** solo el Web.config.
- **Salida y errores:** 200 con el JWT como cadena; 400 sin cuerpo; 401 si no coincide; 500 si `Password` viene nulo, o si la contraseña es correcta y `Username` viene nulo, porque el cálculo del hash no acepta nulo; la contraseña se revisa primero y, si no coincide, el usuario ya no se revisa (LoginController.cs:25, :28-36, :40; HashService.cs:20).
- **Configuración usada:** `USER_HASH`, `USER_SALT`, `PASS_HASH`, `PASS_SALT`, `JWT_SECRET_KEY`, `JWT_AUDIENCE_TOKEN`, `JWT_ISSUER_TOKEN`, `JWT_EXPIRE_MINUTES`.
- **Pendientes conocidos:** el tracker fila 63 la lista como "Deprecado", pero la DMZ sí la usa para obtener el token (DMZ Helper\Curl.cs:80).

### Reglas comunes del área

- RBPC-1: **Sesión.** Todas las rutas piden token (`[Authorize]`: BusinessPartnerController.cs:14, PartnerAddressController.cs:9, CustomersController.cs:11, ProspectoController.cs:14, WholesaleCustomerController.cs:9, AccountController.cs:9), salvo `login/auth` (RLOG-4). El token lo revisa `TokenValidationHandler` en todas las peticiones (WebApiConfig.cs:17): sin cabecera `Authorization` la petición sigue y `[Authorize]` responde 401; con token inválido o vencido responde 401; con otro fallo, 500 (TokenValidationHandler.cs:39-43, :54-79, :82-89). Una cabecera `Authorization` inválida también corta `login/auth`.
- RBPC-2: **Conexión a S4.** La URL base y el usuario de servicio salen de Conexion.dll con el nodo `ENVIROMENT_DEV` (por ejemplo BusinessPartnerMethods.cs:30; TokenGenerator.cs:60-82); los valores de ambiente son de Dev y no son bloqueo (DU1); el nodo fijo es un prerrequisito de pase, no un defecto (GUIA §8.6). La autenticación es Basic, guardada en memoria; cada llamada crea un cliente HTTP con cookies (para la sesión del token CSRF), 60 s de espera, y acepta cualquier certificado (TokenGenerator.cs:113-133). Un cliente nuevo por petición es diseño, no deuda: el token CSRF queda ligado a la cookie de ese cliente (GUIA §1.6a).
- RBPC-3: **Escrituras a S4.** Antes de cada escritura se pide el token CSRF; un token vacío o `Required` es error (TokenGenerator.cs:135-171).
- RBPC-4: **Mandante.** Casi todas las URLs llevan `sap-client=110` fijo; no lo llevan las de `API_BUSINESS_PARTNER` (DeliveryAddressMethods.cs:32, :75, :116, :157) ni la de `ZSDT_CTE` (BusinessPartnerMethods.cs:842-843).
- RBPC-5: **Errores.** Los métodos envuelven el error con contexto (estado y cuerpo de SAP) y lo relanzan; los controladores lo devuelven como 400 `{"Message": "…"}`. Excepciones: `prospecto/recuperarcuenta` y `cashCustomerReport` siempre dan 200 con el resultado en el cuerpo (RPRO-5, RCLI-19); `partner/client` POST responde 200 con la cadena `"Error, …"` cuando BP01 responde 2xx sin `Partner` (RBP-49; cambio del 2026-10-05); en las listas de correos el error de SQL se relanza (RCLI-6, RCLI-10, RCLI-12; cambio del 2026-10-05): `setCustomerList` lo atrapa en el controlador y responde 200 sin cuerpo, `getCustomerList` y `deleteCustomerList` dan 500; `company/wholesale-customer` da 500 (RMAY-3); `getCuenta`/`setCuenta` no atrapan nada y dan 500 (CustomersController.cs:94-107). Con `customErrors` apagado, los 500 llevan el detalle de la excepción (Web.config:94).
- RBPC-6: **Filtros OData.** Los valores se pegan en las URLs sin escapar (BusinessPartnerMethods.cs:30, :252, :302, :350, :843, :882; DeliveryAddressMethods.cs:32, :75, :116, :157, :197; AccountMethods.cs:190; ProspectoController.cs:47). Solo SD52 codifica el valor (BusinessPartnerMethods.cs:385) y las listas de correos duplican la comilla y codifican el valor con `Uri.EscapeDataString` (CustomerMethods.cs:82-83; la codificación es del 2026-10-05, RCLI-3). El crédito filtra la cuenta a letras y números antes de consultar (CreditMethods.cs:337-339).
- RBPC-7: **Nombres de campos en la respuesta.** Hacia SAP se usa System.Text.Json (BP01, BP05, BP05MA, SD52, SD33) o Newtonsoft (direcciones, anexos, sucursales). Hacia el llamador, Web API usa su formateador por defecto (Newtonsoft; WebApiConfig.cs:11-23 no lo cambia), que ignora los atributos `[JsonPropertyName]`. Por eso salen los nombres C#: `to_return` en `Client` (Client.cs:136-137), `To_CteTel` con `Results` en BP05MA (BusinessPartnerMa.cs:128-162; NavigationCollection.cs:8-9), `PersonIdExternal` en SuccessFactors (SuccessFactorEmployee.cs:7-8). Al recibir pasa lo mismo: `Client.to_return` y `BpCombinationRequest.ReturnSet` se leen con su nombre C#.
- RBPC-8: **Dos lugares crean BP.** El alta de la tienda (`BuildClientFromCustomerRequest`, BusinessPartnerMethods.cs:415) y el alta desde una orden (`BuildBpClientFromOrder`, OrderMethods.cs:2618). Comparten `MapGender` y `Marst = "1"` (OrderMethods.cs:2655, :2659; RBP-9, RBP-10) y mandan los dos por `SubmitClientInfoAsync` (OrderMethods.cs:2607).
- RBPC-9: **Cuenta = BP numérico.** Las rutas reciben el número de BP tal cual; no se traducen cuentas `C…` (DU2).
- RBPC-10: **Bases de datos.** La única base SQL del área es SIGMavi y se abre con Conexion.dll (`obtenerConexionSigMaviAsync`) y el setting `Server` (ConexionSQL.cs:72-98; Web.config:159-161; DU19). Las cadenas `MAVICBOSANDROID` y `ADMINDOC` del Web.config no se usan en esta área.
- RBPC-11: **Log.** `Logger.SAP` escribe cada línea en tres lugares: el archivo fijo `C:\inetpub\wwwroot\log\sap.log` si esa carpeta existe, `Logs\sap.log` dentro de la carpeta del sitio y la salida de depuración (Logger.cs:11-23, :26-41, :44). Los errores al escribir se ignoran, pero la creación de la carpeta `Logs` está fuera del `try`: si el sitio no puede crearla, el error sube al método que estaba registrando (Logger.cs:28-31). En esta área registran: alta y cambio de BP (con los datos personales del cliente), unir cuenta, error de anexos, listas de correos, reporte de contado y error de recuperar cuenta (BusinessPartnerMethods.cs:88, :99, :103, :854, :865, :904; CustomerMethods.cs:66, :94; CustomersController.cs:52; CashReportMethods.cs:82; ProspectoController.cs:70). Las demás consultas no registran nada.

---

## Atención a clientes (CustomerServiceController)

Esta área atiende las pantallas de autoservicio del cliente en la tienda en línea. Tiene seis rutas:

- una da la lista de motivos de queja;
- una entrega la llave de seguridad que pide el pago con BBVA;
- una confirma que un número de cliente SAP pertenece a una cuenta de Magento y devuelve su nombre con asteriscos;
- dos permiten entrar al área de crédito con el número de cliente: una solo con el número y otra que además pide la fecha de nacimiento;
- una devuelve el historial de compras a crédito de los últimos dos años.

Todas las rutas cuelgan del prefijo `customerService` (CustomerServiceController.cs:9) y piden un token de sesión (CustomerServiceController.cs:8; ver RCS-50).

Las rutas de archivo son relativas a `ServicioSap\ServicioSap\`. "DMZ" se refiere a `DMZ\WebApiMagento\Controllers\CustomerServiceController.cs` y solo aparece en "Quién la llama". Los seis archivos del área están dados de alta en el proyecto (ServicioSap.csproj:213, :222, :267, :355, :370, :371).

**Términos usados en esta sección**

- **BP (Business Partner):** el cliente en SAP. Su número es la "cuenta" del cliente. Magento siempre manda el BP numérico y aquí no se traducen cuentas `C…` (decisión DU2).
- **OData:** la forma en que SAP publica sus datos por HTTP. Una *entity set* es una colección de registros. `$filter` filtra, `$expand` trae en la misma llamada los datos relacionados (las *navegaciones*, cuyo nombre empieza con `to_`). `sap-client=110` es el mandante (la "instancia" de datos de SAP), fijo en cada URL del código. Es un valor de Dev y no se considera bloqueo (decisión DU1).
- **BP05MA:** servicio OData `ZAPI_BP05MA_SRV`, la ficha ampliada del cliente: nombres, fecha de nacimiento, correos y extensión `to_Cte`.
- **SD36:** servicio OData `ZAPI_DOCVTAS_CHECK_CDS`, la consulta de documentos de venta.
- **DM01:** servicio OData `ZAPI_ARTICULOS_SRV`, el catálogo de artículos.
- **SOAP:** servicio web que se llama con un sobre XML.
- **`/Date(n)/`:** formato de fecha de OData v2. `n` son los milisegundos transcurridos desde el 1970-01-01 UTC.

| Ruta | Verbo | Qué resuelve | Fuente principal |
|---|---|---|---|
| `customerService/obtenerQuejas` | POST | Catálogo de motivos de queja | SQL `MAVICBOSANDROID` |
| `customerService/bbvaKeyAdvanced` | GET | Llave maestra de seguridad BBVA | SOAP de Multipagos |
| `customerService/validarCliente` | POST | Si el BP pertenece a la cuenta de Magento, devuelve el nombre con asteriscos | OData BP05MA |
| `customerService/LoginClienteCredito` | POST | Nombre y correo del cliente a partir de su número | OData BP05MA |
| `customerService/LoginClienteCreditoFechaN` | POST | Lo mismo, pero solo si la fecha de nacimiento coincide | OData BP05MA |
| `customerService/obtenerCreditos` | POST | Historial de compras a crédito de los últimos 2 años | OData BP05MA + SD36 + DM01 |

---

### POST /customerService/obtenerQuejas  (CustomerServiceController.obtenerQuejas, CustomerServiceController.cs:19-26)

- **Para qué sirve:** devuelve el catálogo de motivos de queja activos, con su id y el texto que ve el cliente, para llenar la lista de opciones de atención a clientes. Es la partida E-09 (CustomerServiceController.cs:12).
- **Quién la llama:** la ruta `POST customerService/obtenerQuejas` de la DMZ, con `curl.PostSAP` (DMZ:123-124, :128).
- **Entrada:** no lleva cuerpo ni parámetros (CustomerServiceController.cs:21).
- **Cómo funciona (paso a paso):**
  1. El controlador crea `CustomerServiceMethods` y llama a `obtenerQuejasAsync` (CustomerServiceController.cs:23-25).
  2. El método parte de una respuesta vacía `""` (CustomerServiceMethods.cs:41) y abre la conexión SQL `MAVICBOSANDROID` (CustomerServiceMethods.cs:44-45; ConexionSQL.cs:106-119). Si esa cadena no existe en el Web.config, se produce un error que lleva al paso 6 (ConexionSQL.cs:107-108).
  3. Ejecuta el `SELECT` del catálogo con un tiempo de espera de 9 999 999 segundos (CustomerServiceMethods.cs:47-58).
  4. Si hay filas, cada una se convierte en `{ id, intencion }` y la lista se serializa a texto JSON (CustomerServiceMethods.cs:62-74).
  5. Si no hay filas, la respuesta sigue siendo `""` (CustomerServiceMethods.cs:41, :62).
  6. Si hay un error, lo registra como `[CUSTOMERSERVICE obtenerQuejas ERROR]` y devuelve **el texto del error** en lugar de un JSON (CustomerServiceMethods.cs:80-84).
  7. El controlador convierte ese texto en objeto (`JsonConvert.DeserializeObject`) y responde 200. Si el texto no es JSON (caso de error), esa conversión falla y la respuesta es 500 (CustomerServiceController.cs:25).
- **Reglas de negocio:**
  - RCS-1: Solo salen quejas cuya columna `queja` tiene texto. La condición `queja != ''` también deja fuera las filas con `queja` nula, porque en SQL una comparación con NULL nunca se cumple (CustomerServiceMethods.cs:51).
  - RCS-2: Solo salen quejas activas, `Estatus = 1` (CustomerServiceMethods.cs:52).
  - RCS-3: Solo salen quejas con `AliasQueja` lleno (ni nulo ni vacío) (CustomerServiceMethods.cs:53).
  - RCS-4: La lista va en orden alfabético por `AliasQueja` (CustomerServiceMethods.cs:54).
  - RCS-5: El texto que ve el cliente es `AliasQueja` y viaja en el campo `intencion`. La columna `queja` no se devuelve (CustomerServiceMethods.cs:48-49, :69-70; QuejaModels.cs:8-10).
  - RCS-6: La lectura se hace sin bloquear la tabla (`WITH (NOLOCK)`) (CustomerServiceMethods.cs:50).
- **Fuentes de datos:** SQL Server con la cadena `MAVICBOSANDROID`, que apunta a la base ServicioAndroid y no a Intelisis (CustomerServiceMethods.cs:29-32). Se lee la tabla `actes_catalogo_queja`, columnas `id` y `AliasQueja` (CustomerServiceMethods.cs:47-54). No escribe nada.
- **Salida y errores:**
  - 200 con un arreglo `[{"id": 7, "intencion": "Texto del motivo"}]` (CustomerServiceController.cs:16; QuejaModels.cs:5-11).
  - 200 con `null` cuando no hay filas, porque el `""` deserializado da `null` (CustomerServiceController.cs:17; CustomerServiceMethods.cs:36).
  - 500 si falla la base: el texto del error no es JSON y la deserialización del controlador revienta, sin `try/catch` (CustomerServiceController.cs:18, :25; CustomerServiceMethods.cs:37-38, :83). El error queda en `sap.log` (CustomerServiceMethods.cs:82).
- **Configuración usada:** `connectionStrings/MAVICBOSANDROID` (Web.config:13) y las llaves JWT comunes (RCS-50).
- **Pendientes conocidos:**
  - En la práctica la consulta no tiene tiempo de espera: 9 999 999 s son unos 115 días (CustomerServiceMethods.cs:58).
  - El tracker CSV (`MAVI - DMZ-SAP.csv`, línea 50) ya marca la ruta como conectada, pero en "Ruta ServicioSAP" todavía dice "To Do / GET", aunque la ruta ya existe como POST (CustomerServiceController.cs:19-20). La auditoría lo registra como C21. El hallazgo C20, que decía que el CSV la tenía como no conectada, ya no aplica (AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:564-567).

---

### GET /customerService/bbvaKeyAdvanced  (CustomerServiceController.GetBBVAKeyAdvanced, CustomerServiceController.cs:30-44)

- **Para qué sirve:** pide al servicio SOAP de Multipagos (operación `GetMasterSeguridad`) la "llave maestra de seguridad" de BBVA que necesita el pago con BBVA, y la devuelve. Es la partida E-10 (CustomerServiceController.cs:28; CustomerServiceMethods.cs:96).
- **Quién la llama:** la ruta `POST customerService/bbvaKeyAdvanced` de la DMZ, que llega aquí como GET con `curl.GetSAP` (DMZ:283-284, :289).
- **Entrada:** no lleva cuerpo ni parámetros (CustomerServiceController.cs:32).
- **Cómo funciona (paso a paso):**
  1. El controlador llama directamente al método estático `GetBBVAKeyAdvancedAsync` (CustomerServiceController.cs:34).
  2. Arma el sobre SOAP. En la cabecera `Acso/codigoent` va el valor de `CODIGO_ENT` y en el cuerpo la operación `GetMasterSeguridad` (CustomerServiceMethods.cs:108-119).
  3. Hace un POST a `MULTIPAGOS_APIKEY_URL` con `Content-Type: text/xml` y la cabecera `SOAPAction` de `GetMasterSeguridad`, usando la librería RestSharp 106.15 en modo asíncrono (CustomerServiceMethods.cs:123-132; ServicioSap.csproj:84).
  4. Si el SOAP no responde HTTP 200, devuelve el texto literal `"Ocurrio un error"`. Esto incluye las fallas de red y los tiempos de espera agotados: esta versión de RestSharp no lanza un error en esos casos, sino que entrega una respuesta con estado 0 (CustomerServiceMethods.cs:134-137).
  5. Si responde 200, lee el XML y toma el texto del primer nodo `GetMasterSeguridadResult`. Si el nodo no viene, el resultado es `null` (CustomerServiceMethods.cs:104, :139-146).
  6. Si algo lanza un error (por ejemplo, un 200 cuyo cuerpo no es XML, o `MULTIPAGOS_APIKEY_URL` ausente del Web.config), lo registra como `[CUSTOMERSERVICE bbvaKeyAdvanced ERROR]` y lanza un error nuevo con el mismo mensaje (CustomerServiceMethods.cs:123, :139, :148-152).
  7. El controlador busca la palabra `"null"` en la respuesta. Si aparece, responde 400 `"BBVA key not found."`. Si no, responde 200 con el texto (CustomerServiceController.cs:36-43).
- **Reglas de negocio:**
  - RCS-7: El código de entidad (`CODIGO_ENT`) se manda en la cabecera SOAP `Acso/codigoent` (CustomerServiceMethods.cs:94, :112-114).
  - RCS-8: Solo cuenta como respuesta válida un HTTP 200 del SOAP. Cualquier otro estado, incluida la falta de respuesta por red, se convierte en el texto `"Ocurrio un error"` (CustomerServiceMethods.cs:134-137).
  - RCS-9: La llave es el texto del primer nodo `GetMasterSeguridadResult` del namespace `WSeCommerceMX.asmx` (CustomerServiceMethods.cs:140-144).
  - RCS-10: Si el texto devuelto contiene la palabra `null`, la ruta contesta 400 (CustomerServiceController.cs:36-39).
  - RCS-11: Esta ruta no usa base de datos ni SAP. Solo llama al SOAP externo (CustomerServiceMethods.cs:98-99).
- **Fuentes de datos:** el SOAP externo de Multipagos (`WSeCommerceMX`), operación `GetMasterSeguridad`, solo lectura (CustomerServiceMethods.cs:117, :127).
- **Salida y errores:**
  - 200 con la llave como texto JSON (CustomerServiceController.cs:42).
  - 200 con `"Ocurrio un error"` cuando el SOAP no responde 200 o no se le pudo alcanzar, porque ese texto no contiene `null`. Este caso no se registra en el log (CustomerServiceMethods.cs:134-137; CustomerServiceController.cs:36-42).
  - 400 con `"BBVA key not found."` cuando la respuesta contiene `null` (CustomerServiceController.cs:38).
  - 500 cuando el XML no trae el nodo: el método devuelve `null` y `response.Contains(...)` sobre `null` revienta en el controlador, que no tiene `try/catch` (CustomerServiceMethods.cs:146; CustomerServiceController.cs:36).
  - 500 cuando el cuerpo no es XML o falta la URL en el Web.config: el método vuelve a lanzar el error. El error queda en `sap.log` (CustomerServiceMethods.cs:150-151).
- **Configuración usada:** `MULTIPAGOS_APIKEY_URL` (Web.config:79) y `CODIGO_ENT` (Web.config:80), leídas una sola vez al cargar la clase (CustomerServiceMethods.cs:93-94). También las llaves JWT comunes (RCS-50).
- **Pendientes conocidos:**
  - Sin nodo de resultado, la ruta da 500 en lugar del 400 previsto: la condición busca el texto `"null"`, no un valor nulo (CustomerServiceController.cs:36; CustomerServiceMethods.cs:104).
  - Si el SOAP falla o no se le alcanza, la ruta responde 200 con el texto de error y no deja rastro en el log, así que quien la llama debe revisar el contenido (CustomerServiceMethods.cs:134-137).
  - El tracker CSV (línea 58) ya la marca como conectada, pero en "Ruta ServicioSAP" todavía dice "To Do / GET" (hallazgo C21; C20 ya no aplica) (AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:564-567).

---

### POST /customerService/validarCliente  (CustomerServiceController.validarCliente, CustomerServiceController.cs:46-66)

- **Para qué sirve:** confirma que un número de cliente SAP (BP) está ligado a una cuenta concreta de Magento. Si lo está, devuelve nombre y apellidos con asteriscos para que el cliente reconozca su cuenta sin que se vean sus datos completos.
- **Quién la llama:** la ruta `POST customerService/validarCliente` de la DMZ, con `curl.PostSAP` (DMZ:70-71, :77).
- **Entrada:** `ValidarClienteRequest`, que vive en `Models\SAP\BusinessPartner` y no en las carpetas de atención a clientes (ValidarClienteRequest.cs:8-12; ServicioSap.csproj:355):
  - `id_cliente_intelisis` (string, obligatorio): pese al nombre, es el número de BP en SAP (DU2) (CustomerServiceController.cs:50; CustomerServiceMethods.cs:201).
  - `id_cliente_magento` (string): el controlador no lo exige, pero sin él nunca hay coincidencia (CustomerServiceMethods.cs:204).
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo no llega o `id_cliente_intelisis` viene vacío, responde 400 `"Datos incompletos."` (CustomerServiceController.cs:50-51).
  2. El método parte de la respuesta `"false"` (CustomerServiceMethods.cs:197).
  3. Lee la ficha del BP en BP05MA con `GetClientMaAsync(id_cliente_intelisis)` (CustomerServiceMethods.cs:200-201; BusinessPartnerMethods.cs:297-302).
  4. Si el BP existe, trae `to_Cte` y su `ZidMagento` convertido a texto es igual a `id_cliente_magento`, arma `{nombres, apellido_paterno, apellido_materno}` con asteriscos (CustomerServiceMethods.cs:204-212).
  5. Cualquier error, incluido "el BP no existe" (que `GetClientMaAsync` reporta como error, BusinessPartnerMethods.cs:316-330), se registra como `ERROR validarCliente` y se conserva `"false"` (CustomerServiceMethods.cs:215-220).
  6. El controlador convierte el texto en objeto y responde 200 (CustomerServiceController.cs:56-59).
- **Reglas de negocio:**
  - RCS-12: El BP se busca tal como llega, sin quitar espacios (CustomerServiceMethods.cs:201).
  - RCS-13: La cuenta es válida solo si `to_Cte.ZidMagento`, que en SAP es un número entero, escrito como texto es idéntico a `id_cliente_magento`. Ceros a la izquierda o espacios hacen que no coincida (CustomerServiceMethods.cs:204; BusinessEntitiesMa.cs:288).
  - RCS-14: `nombres` = `NameFirst`, `apellido_paterno` = `NameLast` y `apellido_materno` = `NameLst2`, los tres con asteriscos. Un valor nulo se toma como vacío (CustomerServiceMethods.cs:208-210).
  - RCS-15: Regla de los asteriscos, palabra por palabra (separadas por espacio): se conserva el primer carácter y cada letra A-Z/a-z que sigue se cambia por `*`. Las vocales acentuadas, la Ñ, los números y los signos quedan visibles. Ejemplo: `JUAN PEREZ` → `J*** P****` (CustomerServiceMethods.cs:174-192).
  - RCS-16: Si no hay coincidencia o hubo cualquier error, la respuesta es `false` (CustomerServiceMethods.cs:197, :215-220).
- **Fuentes de datos:** OData BP05MA, `ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='{BP}',Client='110')`, con `$expand` de 12 navegaciones y `sap-client=110`, solo lectura (BusinessPartnerMethods.cs:299-302). Se usan `NameFirst`, `NameLast`, `NameLst2` y `to_Cte.ZidMagento` (BusinessPartnerMa.cs:47-49, :155-156).
- **Salida y errores:**
  - 200 con `{"nombres":"J***","apellido_paterno":"P****","apellido_materno":"L****"}` cuando el BP pertenece a la cuenta (CustomerServiceMethods.cs:206-212).
  - 200 con `false` cuando no coincide, el BP no existe o SAP falló (CustomerServiceMethods.cs:197, :220).
  - 400 con `"Datos incompletos."` (CustomerServiceController.cs:51).
  - 500 solo si falla el propio log (RCS-57): el controlador tiene `catch` (CustomerServiceController.cs:61-65), pero el método no deja escapar otros errores.
- **Configuración usada:** ninguna llave propia en el Web.config. La URL de S/4 y el usuario de servicio salen de `Conexion.dll` (BusinessPartnerMethods.cs:301; TokenGenerator.cs:70-71; DU1). Usa las llaves JWT comunes (RCS-50).
- **Pendientes conocidos:**
  - `nombres` lleva solo `NameFirst`. LAN devolvía `PersonalNombres`, es decir, todos los nombres de pila (Post_ValidarCliente_Mapping.md:18-21). Para la fila de crédito se decidió que el equivalente de `PersonalNombres` es `NameFirst` + `Namemiddle` (DU13), pero esa decisión no cubre esta ruta y aquí no se aplicó (CustomerServiceMethods.cs:208).
  - Si un nombre en SAP trae doble espacio o un espacio al final, queda una "palabra" vacía y `Substring(0,1)` revienta. La respuesta es entonces `false` aunque el BP sí pertenezca a la cuenta (CustomerServiceMethods.cs:179-185, :215).
  - Un BP sin cuenta de Magento trae `ZidMagento = 0`, porque SAP manda el campo como número (CAPTURAS_REALES_APIS.md:21, :41). Si llega `id_cliente_magento = "0"`, la comparación da verdadero y la ruta devuelve el nombre con asteriscos de cualquier BP sin cuenta de Magento. El código no descarta ese caso (CustomerServiceMethods.cs:204). Es una observación de lectura de código; no hay decisión registrada.
  - Un error de SAP responde 200 `false`, igual que "no vinculado", así que no se distinguen los dos casos. En LAN un error de base daba 500 (CustomerServiceMethods.cs:215-220; Post_ValidarCliente_Mapping.md:40-43).
  - En esta ruta la regla de asteriscos es la misma que usaba LAN (Post_ValidarCliente_Mapping.md:38). La auditoría C17 señala que no coincide con LAN en `prospecto/recuperarcuenta`, que reutiliza el mismo helper (AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:552-553; ProspectoController.cs:55).
  - El tracker CSV (línea 44) indica como ruta SAP `partner/client/filter/{sapFilter}` GET, pero la ruta real es esta (CustomerServiceController.cs:46-47; DMZ:77).

---

### POST /customerService/LoginClienteCredito  (CustomerServiceController.LoginClienteCredito, CustomerServiceController.cs:67-86)

- **Para qué sirve:** es el "login" sencillo del área de crédito. Con el número de cliente devuelve su nombre completo y su correo, siempre que el BP exista en SAP.
- **Quién la llama:** la ruta `POST customerService/LoginClienteCredito` de la DMZ, con `curl.PostSAP` (DMZ:212-213, :218).
- **Entrada:** `LoginClienteCreditoRequest` (LoginClienteCreditoRequest.cs:8-11), con `ClientNumber` (string, obligatorio): el BP numérico (DU2) (CustomerServiceController.cs:71).
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo no llega o `ClientNumber` viene vacío, responde 400 `"Datos incompletos."` (CustomerServiceController.cs:71-72).
  2. Lee la ficha del BP en BP05MA (CustomerServiceMethods.cs:227-228).
  3. Si el BP existe, arma el nombre completo y toma el correo (CustomerServiceMethods.cs:230-237).
  4. Devuelve `{nombreCliente, email}` como texto JSON (CustomerServiceMethods.cs:239-244).
  5. Si el BP no existe o hay cualquier error, lo registra como `ERROR LoginClienteCredito` y devuelve `false` (CustomerServiceMethods.cs:247-252).
  6. El controlador convierte el texto en objeto y responde 200 (CustomerServiceController.cs:77-79).
- **Reglas de negocio:**
  - RCS-17: Basta con que el BP exista. No se revisa si está bloqueado (`Xblck`), marcado para borrar (`Xdele`) ni si tiene crédito (CustomerServiceMethods.cs:230; BusinessPartnerMa.cs:23-24).
  - RCS-18: Nombre completo = las partes no vacías de `NameFirst`, `Namemiddle`, `NameLast` y `NameLst2`, en ese orden y separadas por un espacio (CustomerServiceMethods.cs:232-235).
  - RCS-19: Correo = campo `smtp_addr` del **primer** registro de `to_CtePersonalAdr`. Si no hay registro, va vacío (CustomerServiceMethods.cs:237; BusinessEntitiesMa.cs:154).
  - RCS-20: BP inexistente o error → `false` (CustomerServiceMethods.cs:247-252).
- **Fuentes de datos:** OData BP05MA, la misma llamada que en `validarCliente`, solo lectura (BusinessPartnerMethods.cs:297-302). Campos: nombres y `to_CtePersonalAdr.smtp_addr` (BusinessPartnerMa.cs:47-51, :137-138).
- **Salida y errores:**
  - 200 con `{"nombreCliente":"NOMBRE APELLIDO","email":"correo@dominio"}` (CustomerServiceMethods.cs:239-244).
  - 200 con `false` (CustomerServiceMethods.cs:252).
  - 400 con `"Datos incompletos."` (CustomerServiceController.cs:72).
  - 500 solo si falla el propio log (RCS-57). El controlador tiene `catch` (CustomerServiceController.cs:81-85), pero el método no deja escapar otros errores.
- **Configuración usada:** `Conexion.dll` para S/4 (DU1) y las llaves JWT comunes (RCS-50).
- **Pendientes conocidos:**
  - En LAN un error se volvía a lanzar y terminaba en error HTTP (LoginClienteCredito/03_BusinessMethod.md:21, :38). Aquí se responde `false`, así que una caída de SAP se ve igual que "cliente no existe" (CustomerServiceMethods.cs:247-252).
  - No se filtran BP bloqueados ni borrados (RCS-17). Es una observación de lectura de código; no hay decisión registrada.

---

### POST /customerService/LoginClienteCreditoFechaN  (CustomerServiceController.LoginClienteCreditoFechaN, CustomerServiceController.cs:88-107)

- **Para qué sirve:** funciona igual que `LoginClienteCredito`, pero solo devuelve los datos si la fecha de nacimiento enviada coincide con la del BP en SAP. Sirve como segundo dato de verificación.
- **Quién la llama:** la ruta `POST customerService/LoginClienteCreditoFechaN` de la DMZ, con `curl.PostSAP` (DMZ:223-224, :229).
- **Entrada:** `LoginClienteCreditoFechaNRequest` (LoginClienteCreditoRequest.cs:13-18):
  - `ClientNumber` (string, obligatorio).
  - `BirthDate` (string, obligatorio; se espera `yyyy-MM-dd`).
  - `StoreId` (int): se recibe pero no se usa.
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo no llega o `ClientNumber` o `BirthDate` vienen vacíos, responde 400 `"Datos incompletos."` (CustomerServiceController.cs:92-93).
  2. Lee la ficha del BP en BP05MA (CustomerServiceMethods.cs:259-260).
  3. Intenta leer `BirthDate` como fecha y, si puede, la reescribe como `yyyy-MM-dd` (CustomerServiceMethods.cs:265-270).
  4. Compara contra `Birthdt` del BP en este orden (CustomerServiceMethods.cs:272-292):
     - (a) el texto es idéntico a `BirthDate` o a la fecha normalizada;
     - (b) `Birthdt` se puede leer como fecha y da el mismo día;
     - (c) `Birthdt` viene como `/Date(ms)/`: se convierte desde el 1970-01-01 UTC y se compara el día.
  5. Si coincide, devuelve `{nombreCliente, email}` con las mismas reglas que `LoginClienteCredito` (CustomerServiceMethods.cs:294-309).
  6. Si la fecha no coincide, devuelve `false` sin registrar nada. Si el BP no existe o hay un error, lo registra como `ERROR LoginClienteCreditoFechaN` y también devuelve `false` (CustomerServiceMethods.cs:294, :312-317).
  7. El controlador convierte el texto en objeto y responde 200 (CustomerServiceController.cs:98-100).
- **Reglas de negocio:**
  - RCS-21: `ClientNumber` y `BirthDate` son obligatorios (CustomerServiceController.cs:92).
  - RCS-22: `StoreId` no influye en el resultado (LoginClienteCreditoRequest.cs:17; no se lee en CustomerServiceMethods.cs:255-318).
  - RCS-23: Se compara solo el día (`yyyy-MM-dd`), sin hora. La fecha enviada se interpreta con la configuración regional del servidor. Si no se puede leer como fecha, solo sirve la coincidencia exacta de texto (caso a) (CustomerServiceMethods.cs:267-276, :287).
  - RCS-24: Se aceptan tres formas de la fecha en SAP: texto idéntico, fecha legible u OData `/Date(ms)/` (CustomerServiceMethods.cs:272-292). En las capturas reales BP05MA la devuelve como `/Date(...)/` (CAPTURAS_REALES_APIS.md:70).
  - RCS-25: Si coincide, nombre y correo salen con las reglas RCS-18 y RCS-19 (CustomerServiceMethods.cs:296-301).
  - RCS-26: Fecha distinta, BP inexistente o error → `false` (CustomerServiceMethods.cs:312-317).
- **Fuentes de datos:** OData BP05MA, solo lectura (BusinessPartnerMethods.cs:297-302). Campos: `Birthdt`, nombres y `to_CtePersonalAdr.smtp_addr` (BusinessPartnerMa.cs:77, :137-138).
- **Salida y errores:**
  - 200 con `{"nombreCliente": "...", "email": "..."}` (CustomerServiceMethods.cs:303-308).
  - 200 con `false` (CustomerServiceMethods.cs:317).
  - 400 con `"Datos incompletos."` (CustomerServiceController.cs:93).
  - 500 solo si falla el propio log (RCS-57). El controlador tiene `catch` (CustomerServiceController.cs:102-106), pero el método no deja escapar otros errores.
- **Configuración usada:** `Conexion.dll` para S/4 (DU1) y las llaves JWT comunes (RCS-50).
- **Pendientes conocidos:**
  - **Nacidos antes de 1970:** OData manda esas fechas con milisegundos negativos (`/Date(-n)/`). La expresión `\d+` descarta el signo menos, calcula otra fecha y el cliente no logra entrar. Se corrige leyendo `-?\d+` (CustomerServiceMethods.cs:282-286).
  - La lectura de `BirthDate` depende de la configuración regional del servidor: `01/02/1990` puede leerse como 1 de febrero o como 2 de enero. LAN comparaba el texto `yyyy-MM-dd` exacto (CustomerServiceMethods.cs:267; LoginClienteCreditoFechaN/03_BusinessMethod.md:12-15).
  - `StoreId` no se usa (RCS-22).
  - Los errores responden `false`, igual que en `LoginClienteCredito` (CustomerServiceMethods.cs:312-317).

---

### POST /customerService/obtenerCreditos  (CustomerServiceController.ObtenerCreditos, CustomerServiceController.cs:117-141)

- **Para qué sirve:** devuelve el historial de compras a crédito del cliente de los últimos 2 años, con estatus, importes y artículos, para la sección "mis créditos". Reemplaza la consulta a Intelisis (`Venta`/`VentaD`) por SAP: ventas de SD36, nombres de artículo de DM01 y nombre del cliente de BP05MA (CustomerServiceController.cs:109-116; CustomerServiceMethods.cs:320-326).
- **Quién la llama:** la DMZ tiene la ruta `POST customerService/obtenerCreditos`, pero hoy la manda a LAN con `curl.Post` (DMZ:111-112, :118). Mientras eso no cambie, esta ruta de ServicioSAP no recibe tráfico de la DMZ.
- **Entrada:** `ObtenerCreditosRequest` (ObtenerCreditosModels.cs:6-10):
  - `cliente_id` (string, obligatorio): el BP.
  - `uen` (string): se recibe pero no se usa. La DMZ lo manda como número entero, que se acepta igual en un campo de texto (DMZ `Models\CustomerServiceRequest.cs:61`).
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo no llega o `cliente_id` viene vacío, responde 400 `"Datos incompletos."` (CustomerServiceController.cs:121-122).
  2. Quita los espacios de `cliente_id` (CustomerServiceMethods.cs:332-335).
  3. Lee el BP en BP05MA para obtener el nombre completo. Si falla, lo registra como `BP FETCH ERROR` y sigue con nombre vacío (CustomerServiceMethods.cs:340-353).
  4. Consulta en SD36 todos los documentos de venta del cliente (`Customer eq '{BP}'`) (CustomerServiceMethods.cs:356-357).
  5. Si no hay documentos, devuelve una lista vacía (CustomerServiceMethods.cs:359-362).
  6. Quita duplicados: agrupa por número de pedido de origen y deja uno por grupo según el tipo de documento (CustomerServiceMethods.cs:368-377).
  7. Junta los SKU distintos de todas las partidas y consulta DM01 una vez por SKU, uno tras otro, para obtener la descripción (CustomerServiceMethods.cs:380-405).
  8. Recorre cada documento: obtiene su fecha, descarta los de más de 2 años y los que no son de crédito (CustomerServiceMethods.cs:409-443).
  9. Para cada crédito arma el registro: id, fecha, cliente, estatus, artículos e importes (CustomerServiceMethods.cs:445-521).
  10. Cualquier error en los pasos 4 a 9 se registra como `[CUSTOMERSERVICE ObtenerCreditos ERROR]` y se devuelve lo acumulado hasta ese momento (CustomerServiceMethods.cs:526-530).
  11. Si la lista queda vacía, el controlador responde 200 con `""`. Si no, responde 200 con el arreglo (CustomerServiceController.cs:129-134).
- **Reglas de negocio:**
  - RCS-27: `cliente_id` se usa sin espacios al inicio ni al final (CustomerServiceMethods.cs:332-335).
  - RCS-28: El nombre del cliente es el de RCS-18. Si BP05MA falla, va vacío y el proceso continúa (CustomerServiceMethods.cs:340-353, :451).
  - RCS-29: SD36 se consulta solo por cliente, sin filtro de fecha ni límite de registros. El filtro de 2 años se aplica después, en memoria (CustomerServiceMethods.cs:356; SalesMethods.cs:174-175).
  - RCS-30: Sin documentos, la respuesta es `""` y no `[]`, igual que en el legado (CustomerServiceMethods.cs:359-362; CustomerServiceController.cs:129-132; Post_ObtenerCreditos_Mapping.md:137).
  - RCS-31: Llave para quitar duplicados: `PurchNoC`, o `DocNumber` si `PurchNoC` viene vacío (CustomerServiceMethods.cs:369).
  - RCS-32: Dentro de cada grupo se queda un documento por prioridad de tipo: `ZMER` > `ZPRE` > `ZSOC` > `ZANC` > `ZCON` > cualquier otro. Con la misma prioridad, gana el primero que trae SAP (CustomerServiceMethods.cs:370-376).
  - RCS-33: Cada SKU se consulta una sola vez en DM01 y se usa el primer artículo encontrado (CustomerServiceMethods.cs:388, :396-403).
  - RCS-34: Fecha del crédito = `PurchDate`, o `audat` si `PurchDate` viene vacía. Solo se entiende el formato `/Date(ms)/`. Un documento con otra forma de fecha, o sin fecha, se descarta (CustomerServiceMethods.cs:414-425).
  - RCS-35: Solo entran documentos con fecha igual o posterior a "hoy menos 2 años", en hora local del servidor (CustomerServiceMethods.cs:409, :425).
  - RCS-36: Un documento es de crédito si su canal de distribución `DistrChan` es `"02"`, el canal de crédito (CustomerServiceMethods.cs:428-431; COMPARATIVA_SETORDER_LAN_VS_SAP.md:277-278). Es el mismo valor que ServicioSAP pone al crear un pedido a crédito (OrderMethods.cs:2189, :2198, :2283)…
  - RCS-37: …o si algún registro de `to_zsdt_vbak` tiene `Zformapagotp` = `CREDITO`, sin importar mayúsculas ni espacios al inicio o al final. Si no cumple ninguna de las dos, el documento no sale (CustomerServiceMethods.cs:433-443). Los pedidos que crea ServicioSAP mandan `Zformapagotp` vacío (OrderMethods.cs:2316), así que para ellos solo cuenta RCS-36.
  - RCS-38: `id` del crédito = `PurchNoC`, o `DocNumber` si `PurchNoC` viene vacío (CustomerServiceMethods.cs:445, :449).
  - RCS-39: `fecha` sale como `yyyy-MM-dd` (CustomerServiceMethods.cs:450).
  - RCS-40: El estatus sale del `Zidstatus` del **primer** registro de `to_zsdt_vbak`: `01` → `pendiente`, `02` → `entregado`, `03` → `rechazado`. Cualquier otro valor, o la falta de `to_zsdt_vbak`, da `pendiente` (CustomerServiceMethods.cs:457-470, :513).
  - RCS-41: `point_redeemed` siempre es 0 (CustomerServiceMethods.cs:452).
  - RCS-42: Nombre del artículo: `DESCRIPCION1` de DM01 si el SKU existe ahí (vacío si DM01 la trae vacía). Si DM01 no tiene el SKU, se muestra el código del SKU (CustomerServiceMethods.cs:477-481, :506; Product.cs:13-15).
  - RCS-43: `cantidad` = `Cantidad` de la partida. Si viene en 0 o no es número, se usa 1 (CustomerServiceMethods.cs:483-485).
  - RCS-44: `precio` = `PrecioUnitario`. Si viene en 0 o no es número, se usa `Total` del documento entre el número de partidas, en partes iguales y sin tomar en cuenta la cantidad (CustomerServiceMethods.cs:487-498).
  - RCS-45: `Descuento` siempre es 0 (CustomerServiceMethods.cs:508).
  - RCS-46: `sku` = `Material`. Si es nulo, va vacío (CustomerServiceMethods.cs:505).
  - RCS-47: `total` = `Total` y `subtotal` = `ValorNeto` del documento. Si no son número, valen 0. No se redondean (CustomerServiceMethods.cs:515-519).
  - RCS-48: Los créditos salen en el orden en que los devuelve SD36; no se ordenan (CustomerServiceMethods.cs:368-377, :411).
  - RCS-49: Un error en SD36 o en cualquier consulta a DM01 corta todo el proceso. Como los créditos se arman después de esas consultas, la respuesta termina siendo `""` (CustomerServiceMethods.cs:396-404, :526-530; SalesMethods.cs:199-202; ProductMethods.cs:90-93).
- **Fuentes de datos (todas de lectura):**
  - **BP05MA:** `ZAPI_BP05MA_SRV/BusinessPartnerSet(Partner='{BP}',Client='110')`, para el nombre (BusinessPartnerMethods.cs:299-302).
  - **SD36:** `ZAPI_DOCVTAS_CHECK_CDS/ZAPI_DOCVTAS_CHECK?$expand=to_salesdoc_items,to_zsdt_vbak,to_zsdt_vbap&sap-client=110&$filter=Customer eq '{BP}'&$format=json`, con el filtro codificado para URL (SalesMethods.cs:171-175). Si SAP no responde con éxito o manda un cuerpo vacío, el método lanza un error (SalesMethods.cs:187-190, :199-202).
    - Del documento se usan `DocNumber`, `DocType`, `PurchNoC`, `PurchDate`, `audat`, `DistrChan`, `Total` y `ValorNeto` (SaleD.cs:17-42, :57, :66-67).
    - De las partidas, `Material`, `Cantidad` y `PrecioUnitario` (SaleDocumentItem.cs:16, :31-37).
    - De `to_zsdt_vbak`, `Zformapagotp` y `Zidstatus` (ObtenerCreditosModels.cs:44-53).
  - **DM01:** `ZAPI_ARTICULOS_SRV/Articulos?$format=json&sap-client=110&$top&$skip&$filter=ARTICULO eq '{sku}'`, una llamada por SKU, campo `DESCRIPCION1`. Aquí el filtro no se codifica para URL (ProductMethods.cs:66-69; Product.cs:13-15).
  - **Escritura lateral:** cada consulta a SD36 intenta guardar la respuesta cruda en un archivo fijo del equipo de un desarrollador (`c:\Users\<usuario>\source\repos\sap_raw_dump.json`). Si no puede, ignora el error (SalesMethods.cs:193).
- **Salida y errores:**
  - 200 con un arreglo de créditos (ObtenerCreditosModels.cs:12-42). Ejemplo con datos ficticios:
    ```json
    [{"id":"ZSD_ZMER_12345","fecha":"2026-05-14","total":12500.0,"subtotal":10775.86,
      "estatus":"pendiente","cliente":"NOMBRE APELLIDO","point_redeemed":0.0,
      "productos":[{"cantidad":1.0,"articulo":{"sku":"SKU0001","nombre":"DESCRIPCION","precio":12500.0,"Descuento":0.0}}]}]
    ```
  - 200 con `""` (cadena JSON vacía) cuando no hay créditos y también ante cualquier error en SD36 o DM01. El error queda en `sap.log` (CustomerServiceController.cs:129-132; CustomerServiceMethods.cs:526-529).
  - 400 con `"Datos incompletos."` (CustomerServiceController.cs:122).
  - 500 solo si falla el propio log (RCS-57). El controlador tiene `catch` (CustomerServiceController.cs:136-140), pero el método no deja escapar otros errores.
- **Configuración usada:** ninguna llave propia en el Web.config. S/4 se alcanza vía `Conexion.dll` (DU1). Usa las llaves JWT comunes (RCS-50).
- **Pendientes conocidos** (las diferencias con LAN salen de `Post_ObtenerCreditos_Mapping.md`):
  - **Conexión DMZ:** la DMZ todavía llama a LAN (DMZ:118). El CSV (línea 49) marca la ruta como conectada y la bitácora de migración dice que la DMZ ya usa `PostSAP` (master_migration_log.md:436), pero la copia actual no lo refleja.
  - **`uen` sin uso:** LAN filtraba por `UEN` (Post_ObtenerCreditos_Mapping.md:57); aquí el campo se ignora (ObtenerCreditosModels.cs:9).
  - **Estatus incompletos:** LAN también devolvía `en proceso` y `aceptado`. Los sacaba de la cadena de cuatro documentos (solicitud → análisis → pedido → factura), cada uno con su fecha y estatus. Aquí solo hay 3 estatus y salen de `Zidstatus` (CustomerServiceMethods.cs:463-469; Post_ObtenerCreditos_Mapping.md:70-75; AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:886). La bitácora habla de "concluido"/"anulado" (master_migration_log.md:431), pero el código usa `entregado`/`rechazado`.
  - **Fecha:** LAN tomaba la fecha más reciente de esa cadena (Post_ObtenerCreditos_Mapping.md:76); aquí se usa `PurchDate`/`audat` (CustomerServiceMethods.cs:414).
  - **Puntos redimidos:** `point_redeemed` vale 0 porque `TarjetaSerieMovMAVI` ya no existe (CHECKLIST_DEV2_ROADMAP.md:118) y no hay fuente SAP.
  - **Descuento:** vale 0. LAN lo calculaba como `PrecioAnterior - Precio` (Post_ObtenerCreditos_Mapping.md:34-38).
  - **`id`:** devuelve `PurchNoC` tal cual. En los pedidos web su formato es `ZSD_{tipo}_{idEcommerce}` (CHECKLIST_DEV2_ROADMAP.md:130); LAN devolvía `MovId` (Post_ObtenerCreditos_Mapping.md:79).
  - **Orden y redondeo:** LAN ordenaba por fecha descendente y redondeaba `subtotal` a 2 decimales (Post_ObtenerCreditos_Mapping.md:61, :77); aquí no se hace ninguna de las dos cosas (RCS-47, RCS-48).
  - **Errores ocultos:** cualquier error se convierte en `""` sin que el que llama se entere (RCS-49).
  - **Rendimiento:** SD36 trae todo el historial del cliente y después se hace una llamada a DM01 por cada SKU, una tras otra (CustomerServiceMethods.cs:396-404).
  - **Volcado de depuración:** hay que quitar la línea que escribe en disco la respuesta de SD36, que contiene datos de clientes (SalesMethods.cs:193).
  - **Código sin uso:** `to_zsdt_vbap` se pide en el `$expand` pero no se lee, y los modelos `VbapResponse`/`VbapResult` no se usan (SalesMethods.cs:175; ObtenerCreditosModels.cs:55-68).
  - **Filtro OData:** `cliente_id` y cada SKU se meten en el texto del filtro sin duplicar apóstrofos (CustomerServiceMethods.cs:356; ProductMethods.cs:69).
  - **Forma de `to_zsdt_vbak` sin confirmar:** el código espera una colección `{"results":[...]}` (ObtenerCreditosModels.cs:44-47; CustomerServiceMethods.cs:436-439, :461-462). La ficha SD36 la describe como un "objeto único" (RSG\sd36_consultar_documentos.md:47-48) y no hay captura real de esa navegación. Si SAP la manda como objeto, `results` queda vacío: ningún documento entraría por `Zformapagotp` (RCS-37) y todos saldrían como `pendiente` (RCS-40). La lectura usa System.Text.Json sin opciones, que distingue mayúsculas en los nombres de campo (CustomerServiceMethods.cs:436, :461). Falta comprobarlo con una respuesta real.
  - **Lectura de números:** cantidades e importes se leen con la configuración regional del servidor (CustomerServiceMethods.cs:484, :488, :492, :515-516).

---

### Reglas comunes del área

- RCS-50: Todas las rutas exigen un token JWT válido en `Authorization: Bearer`. La protección combina `[Authorize]` (CustomerServiceController.cs:8) y `TokenValidationHandler` (WebApiConfig.cs:17; TokenValidationHandler.cs:33-80):
  - sin token, o con dos cabeceras `Authorization`, el manejador deja pasar la petición y `[Authorize]` responde 401 (TokenValidationHandler.cs:24-27, :39-43);
  - el prefijo `Bearer ` es opcional: si no viene, se toma la cabecera completa como token (TokenValidationHandler.cs:29);
  - con token inválido o vencido, responde 401 (TokenValidationHandler.cs:70-73);
  - con otro error, por ejemplo un token mal formado, responde 500 (TokenValidationHandler.cs:74-79).

  Llaves: `JWT_SECRET_KEY`, `JWT_AUDIENCE_TOKEN` y `JWT_ISSUER_TOKEN` (Web.config:31-33).
- RCS-51: Ningún otro controlador de ServicioSAP usa el prefijo `customerService` (CustomerServiceController.cs:9).
- RCS-52: Patrón "doble JSON", heredado del legado: el método devuelve un texto JSON y el controlador lo vuelve a convertir en objeto antes de responder (CustomerServiceController.cs:25, :59, :79, :100). Si el texto no es JSON válido, la respuesta es 500 (ver `obtenerQuejas`).
- RCS-53: Los números de cliente que llegan (`id_cliente_intelisis`, `ClientNumber`, `cliente_id`) son BP numéricos de SAP y no se traducen (DU2) (CustomerServiceMethods.cs:201, :228, :260, :344).
- RCS-54: Las llamadas a S/4 usan un HttpClient nuevo en cada llamada, con autenticación Basic del usuario de servicio, cuyas credenciales salen de `Conexion.dll`. Tiene tiempo de espera de 60 s y la validación del certificado está desactivada (TokenGenerator.cs:60-82, :113-133). La URL base viene del nodo `SERVICE_URL` del ambiente DEV y cada método agrega `sap-client=110` (BusinessPartnerMethods.cs:301-302; SalesMethods.cs:175; ProductMethods.cs:69). Los valores son de Dev y no se consideran bloqueo (DU1).
- RCS-55: `GetClientMaAsync` trata como error tanto una respuesta no exitosa o vacía como una página HTML o un BP sin datos (BusinessPartnerMethods.cs:316-339). Por eso en esta área "BP inexistente" siempre pasa por la rama de error.
- RCS-56: Los métodos del área atrapan sus errores, los registran con `Logger.SAP` y devuelven un valor neutro: `"false"`, `false`, `""` o una lista vacía (CustomerServiceMethods.cs:215-220, :247-252, :312-317, :526-530). Las excepciones son `obtenerQuejas`, que devuelve el texto del error, y `bbvaKeyAdvanced`, que vuelve a lanzar el error.
- RCS-57: `Logger.SAP` escribe en `C:\inetpub\wwwroot\log\sap.log` si esa carpeta existe, en `Logs\sap.log` dentro de la carpeta de la aplicación y en la salida de depuración. Si no puede escribir en un archivo, no avisa (Logger.cs:8-45). La excepción es la creación de la carpeta `Logs`, que está fuera de `try`: si falla (por ejemplo, por permisos), el propio registro lanza un error que sale del `catch` del método y la ruta termina en 500 (Logger.cs:28-31).
- RCS-58: El nombre completo del cliente se arma igual en tres rutas: partes no vacías de `NameFirst`, `Namemiddle`, `NameLast` y `NameLst2` (CustomerServiceMethods.cs:232-235, :296-299, :347). `validarCliente` es la excepción y usa los campos por separado (RCS-14).
- RCS-59: Las fechas `/Date(ms)/` se convierten tomando solo los dígitos y sumándolos al 1970-01-01 UTC. El signo de las fechas anteriores a 1970 se pierde (CustomerServiceMethods.cs:282-286, :417-421).
- RCS-60: Los helpers `ocultarLetrasNombres` (asteriscos) y `QuitarAcentos` (quita acentos, diéresis y la tilde de la ñ) viven en esta clase y también los usa `ProspectoController` (`prospecto/recuperarcuenta`) (CustomerServiceMethods.cs:155-193; ProspectoController.cs:30, :34-36, :55). Ninguna ruta de este controlador usa `QuitarAcentos`.

---

## Productos, catálogo, imágenes, etiquetas y exportación a e-commerce

Esta área reúne todo lo que ServicioSAP sabe de un artículo para venderlo en línea. Hace siete cosas:

- consulta en SAP el maestro de artículos y las existencias por almacén y por número de serie;
- expone, una por una, las tablas y catálogos de apoyo con que se decide qué se publica: exclusiones, artículos con ficha y foto terminadas, familias válidas, propiedades IE/Mayorista/Outlet, almacenes, reglas de existencia, jerarquía y carruseles;
- arma la **exportación de artículos para la tienda Muebles América** (`product/exportaart/ma`). Es el reemplazo en código del SP legado de exportación: aplica los filtros, calcula precios, existencias, categorías, atributos, relacionados y posición, y devuelve una fila por SKU con las columnas del importador de Magento. **No escribe en Magento**: solo devuelve el listado;
- copia a SQLite el catálogo de Magento (atributos, sets, categorías, hijos de configurables y tiendas por producto), que lee a través de la DMZ, y dispara dos limpiezas en Magento;
- da la lista de artículos con imagen optimizada y copia un archivo de imagen desde el share de imágenes;
- consulta y mantiene en SAP los textos SEO del artículo (alta, cambio y baja);
- consulta las etiquetas promocionales de SAP.

Las rutas de archivo son relativas a `ServicioSap\ServicioSap\`. Para no repetir carpetas se cita solo el nombre del archivo; todos los nombres son únicos en el proyecto salvo `ArticuloIEMay.cs`, que existe en `Models\Ecommerce\` y en `Models\Database\` y se cita con su carpeta. Los archivos del área están dados de alta en el proyecto (ServicioSap.csproj:217, :225-227, :231, :239-243, :260, :266, :268, :270-271, :276, :281-282, :290-332, :367, :372, :376, :379, :385-386, :416, :425-429). `TiposMaterialSAP.json` se copia a la carpeta de salida al compilar (ServicioSap.csproj:451-453).

| Archivo | Carpeta |
|---|---|
| ProductController.cs, CatalogController.cs, ImagenController.cs, EtiquetasController.cs, EcommerceController.cs | `Controllers\` |
| ProductMethods.cs | `Methods\MaterialManagement\` |
| EcommerceMethods.cs | `Methods\Ecommerce\` |
| MagentoCatalogMethods.cs | `Methods\Catalog\` |
| ImagenMethods.cs | `Methods\ImagenManagement\` |
| ProductImageMethods.cs | `Methods\ProductImage\` |
| CatalogoMethods.cs | `Helpers\Catalog\` |
| CatalogoEstados.cs | `Helpers\CatalogState\` |
| TiposMaterialSAP.json | `Helpers\MaterialSAP\` |
| FinalListProperMethods.cs (precios, de otra área; se usa aquí) | `Methods\SalesDistribution\` |
| Curl.cs (cliente hacia la DMZ), SQLiteDb.cs, ConexionSQL.cs, TokenGenerator.cs, TokenValidationHandler.cs, Logger.cs, Impersonation.cs | `Helpers\...` |
| Settings.settings (alias del servidor SIGMavi por omisión) | `Properties\` |
| Modelos del área | `Models\Ecommerce\`, `Models\SAP\MaterialManagement\`, `Models\SAP\SEO\`, `Models\SAP\Etiquetas\`, `Models\SAP\JerArt\`, `Models\SAP\Catalog\`, `Models\SAP\ProductImage\`, `Models\SAP\SalesDistribution\` (FinalListProper.cs), `Models\Database\` |

**Términos usados en esta sección**

- **SKU / artículo / material:** el código del producto. SAP lo llama `ARTICULO` o `Material`.
- **Familia y línea:** los dos niveles de la jerarquía del artículo. En SIGMavi se llaman `ClassN2` (familia) y `ClassN3` (línea); en SAP la línea es el grupo de artículos (`MATKL`).
- **MA:** Muebles América, la tienda en línea que hoy exporta este código. **VIU** y **MAVI** son las otras tiendas.
- **OData:** la forma en que SAP publica sus datos por HTTP. Responde `{ "d": { "results": [...] } }`; `$filter` filtra y `$expand` trae datos relacionados en la misma llamada. `sap-client=110` es el mandante (número de "cliente" dentro de SAP) que el código fija en cada URL; es un valor de Dev, y por la decisión DU1 los valores de ambiente de Dev no se marcan como riesgo.
- **DM01:** servicio `ZAPI_ARTICULOS_SRV`, maestro de artículos. **DIM11:** servicio `ZCDS_DIM11_EXISTENCIA_CDS`, existencias por centro y almacén. **DM02:** `ZAPI_JERARQUIA_ARTICULOS_SRV`, jerarquía. **DM03:** `ZAPI_CROSSSELL_SRV`, `ZAPI_UPSELL_SRV` y `ZAPI_SUSTITUTOS_SRV`, relacionados. **DM05:** `ZAPI_ZMMT_ETIQUETA_SRV`, etiquetas. **SD29:** `ZAPI_PROPRELIST_SRV`, lista de precios finales (fichas en `RSG\`).
- **Condición de precio:** `ACEF` = contado MA; `12IA` = crédito 12 meses inmediato; `12DA` = crédito 12 meses diferido (EcommerceMethods.cs:24-26).
- **Token CSRF:** contraseña de un solo uso que SAP exige antes de crear, cambiar o borrar. Se pide con un GET previo.
- **SQLite:** base de datos en un solo archivo (`data.db`) que vive en el servidor de ServicioSAP.
- **SIGMavi:** base SQL Server de apoyo. La conexión sale de `Conexion.dll`, no de las cadenas de conexión del Web.config; solo el alias del servidor (`Server`) sale de `applicationSettings` (decisión DU19; ver RPR-121).

| Ruta | Verbo | Qué resuelve | Fuente principal |
|---|---|---|---|
| `product/exportaart/{store}` | GET | Exportación completa de artículos para la tienda | SAP + AWS + SIGMavi |
| `ecommerce/listado` | GET | Datos crudos con que arranca la exportación | SAP + AWS + SIGMavi |
| `product/products` | GET | Maestro completo de artículos | DM01 |
| `product/productbysku/{sku}` | GET | Un artículo del maestro | DM01 |
| `product/filter/{filter}` | GET | Maestro con filtro OData libre | DM01 |
| `product/stock/filter/{filter}` | GET | Existencias con filtro OData libre | DIM11 |
| `product/stock` | GET | Existencias por material, centro y almacén | DIM11 |
| `product/stock/serial` | GET | Existencias por número de serie | DIM11 |
| `product/exclusiones/ma` | GET | Productos, marcas y prefijos excluidos de MA | SIGMavi |
| `product/exclusiones/familialinea/ma` | GET | Familias y líneas excluidas de MA | SIGMavi |
| `product/articulos/sip/validos` | GET | Artículos con propiedades y foto terminadas | SIGMavi |
| `product/familias/validas/ma` | GET | Familias que se venden en MA | SIGMavi |
| `product/familiaslinea/{clase}` | GET | Familias y líneas de una clase | API de configuraciones |
| `product/articulos/ie/mayorista` | GET | Artículos IE, Mayorista y Outlet | SIGMavi |
| `product/catalogo/{nombreCatalogo}` | GET | Un catálogo de configuración | AWS |
| `product/almacenes/config` | GET | Almacenes principales, secundarios y de respaldo | AWS |
| `product/reglas/existencia` | GET | Reglas de existencia 1 a 7 | SIGMavi |
| `product/jerarquia/articulos` | GET | Jerarquía de artículos | DM02 |
| `product/carrusel/categorias` | GET | Categorías de carrusel por SKU | SIGMavi |
| `product/crosssell`, `product/upsell`, `product/sustitutos` | GET | Relacionados configurados en SAP | DM03 |
| `product/seo` | GET, POST | Consulta y alta de textos SEO | SAP `Z_SRVB_MM_ART` |
| `product/seo/{material}` | PATCH, DELETE | Cambio y baja de textos SEO | SAP `Z_SRVB_MM_ART` |
| `product/obtenerImagen` | POST | Copia una imagen del share a la carpeta local | Archivos (SMB) |
| `catalog/*` (11 rutas) | POST | Cargas de catálogo de Magento a SQLite y dos limpiezas en Magento | DMZ + SQLite |
| `ma/imagenes/optimizadas`, `.../refresh`, `ma/imagenes/cache/clear` | GET, POST | Artículos con imagen optimizada y su caché | SIGMavi |
| `etiquetas` | GET | Etiquetas promocionales | DM05 |

---

### GET /product/exportaart/{store}  (ProductController.EcommerceExportaArt, ProductController.cs:21-47)

- **Para qué sirve:** genera el listado de artículos que se publican en la tienda Muebles América, con todo lo que el importador de Magento necesita: nombre, precios de contado y crédito, oferta, existencia, categorías, atributos, relacionados y posición. Es la versión en C# del SP legado de exportación; los comentarios del código citan las tablas temporales del SP a las que equivale cada paso (por ejemplo EcommerceMethods.cs:135, :383, :663).
- **Quién la llama:** está prevista para sustituir lo que hoy hace el job LAN ImportApp con `product/updateProduct` y `product/updateProductJsonOnly` (CHECKLIST_DEV2_ROADMAP.md:250-251; MIGRATION_STATUS_MASTER_v2.csv:124). En MAVI - DMZ-SAP.csv:124-125 esas dos rutas figuran como jobs LAN sin ruta en la DMZ. Todavía no hay llamador conectado.
- **Entrada:** `store` en la ruta (texto, obligatorio): `ma`, `viu` o `mavi`. No lleva cuerpo.
- **Cómo funciona (paso a paso):**
  1. Según `store`: `ma` ejecuta el proceso completo; `viu` y `mavi` responden 400; cualquier otro valor responde 400 (ProductController.cs:27-41).
  2. **Fase 0, carga de datos.** Lee en serie, sin filtros por artículo: el maestro DM01 completo, las existencias DIM11 completas, la lista de precios SD29 de la UEN `1`, las exclusiones de MA, las exclusiones por familia y línea, las familias válidas de MA, los artículos SIP válidos, el árbol de familias y líneas de AWS, la jerarquía DM02 y los tipos de material válidos del JSON (EcommerceMethods.cs:48-75).
  3. **Fases 1-2, listado base.** Recorre cada artículo del maestro y lo descarta si no pasa los filtros RPR-1 a RPR-13; a los que pasan les calcula precio de contado, precio de crédito y existencia total (EcommerceMethods.cs:137-377).
  4. **Fase 3, IE / Mayorista / Outlet.** Cruza el listado con las propiedades de SIGMavi para saber qué artículos son IE (Elite Especial), Mayorista u Outlet (EcommerceMethods.cs:385-411).
  5. **Fases 4-6, reglas de existencia.** Lee los almacenes de AWS y las reglas 1 a 7 de SIGMavi, decide qué regla le toca a cada artículo y descarta los que no la cumplen (EcommerceMethods.cs:420-557).
  6. **Fase 7, imagen.** Deja solo los artículos con imagen optimizada (EcommerceMethods.cs:614-646).
  7. **Fase 9, carruseles.** Junta las categorías de carrusel de cada artículo (EcommerceMethods.cs:655-669).
  8. **Fase 10, precio final.** Calcula precio, precio especial y oferta (EcommerceMethods.cs:675-723).
  9. **Fase 11, atributos.** Junta las propiedades del artículo que tienen atributo en Magento y el set de atributos (EcommerceMethods.cs:729-808).
  10. **Fase 12, categorías.** Calcula las rutas de categoría de Magento, incluida la de SuperPromo (EcommerceMethods.cs:1303-1310, :814-1000).
  11. **Fase 13, relacionados.** Calcula upsell, crosssell y related (EcommerceMethods.cs:1028-1180).
  12. **Fase 15, posición.** Ordena los artículos para la vitrina (EcommerceMethods.cs:1186-1265).
  13. **Armado.** Construye una fila `ProductoEcommerceFinal` por artículo con valores fijos y calculados (EcommerceMethods.cs:1390-1527) y la devuelve dentro de `ResultadoFinal` (EcommerceMethods.cs:1318-1327).
- **Reglas de negocio:**
  - *Listado base (un artículo entra solo si cumple todo esto):*
  - RPR-1: Estatus SAP `04` (alta) o `05` (bloqueado); equivale a `Estatus IN ('ALTA','BLOQUEADO')` del SP (EcommerceMethods.cs:229-231).
  - RPR-2: Está en `SIPProductos` con `EstatusPropiedad = 'concluido'`, `EstatusFotografia = 'CONCLUIDO'` y `SoloSELP = 0`: propiedades y foto terminadas y no exclusivo de SELP (ProductMethods.cs:526-542; EcommerceMethods.cs:179-186, :233-235).
  - RPR-3: No está excluido en `SIPExcluirProductos` con `MA = 1`: por código exacto (`TipoExclusion` `CÓDIGO` o `CODIGO`), por marca (`MARCA` contra `MarcaE`) o por prefijo del SKU (`INICIALES`), sin distinguir mayúsculas (ProductMethods.cs:430-438; EcommerceMethods.cs:154-171, :237-244).
  - RPR-4: Tiene nombre corto: el `NOMBRECORTO` de SAP o, si viene vacío, `DESCRIPCION1` (EcommerceMethods.cs:246-252).
  - RPR-5: Tiene volumétrico (`VOLUMETRICO` no vacío) (EcommerceMethods.cs:254-256).
  - RPR-6: Su categoría SAP empieza con `V`; es la equivalencia actual de `CATEGORIA = 'VENTA'` (EcommerceMethods.cs:258-262).
  - RPR-7: Su tipo de material está marcado `ValidoEcommerce: true` en `TiposMaterialSAP.json`: FERT, FGTR, FOOD, FRIP, HAWA, KMAT, MODE, PLAN, VKHM y VOLL (TiposMaterialSAP.json:58, :70, :82, :88, :106, :148, :178, :208, :280, :286; CatalogoMethods.cs:44-47; EcommerceMethods.cs:264-267). Reemplaza el `Tipo NOT IN ('Servicio','Juego')` del SP. La comparación del código distingue mayúsculas (CatalogoMethods.cs:47).
  - RPR-8: El SKU no empieza con `VIST` (EcommerceMethods.cs:269-271).
  - RPR-9: Su par familia + línea no está en `ExcluirClassN2ClassN3` con `MA = 1` (ProductMethods.cs:479-487; EcommerceMethods.cs:273-279).
  - RPR-10: Su familia está en `ClassN2ValidasTdaVirtual` con `Pagina = 'MUEBLES AMERICA'` (ProductMethods.cs:580-588; EcommerceMethods.cs:173-177, :281-283).
  - RPR-11: Su línea existe como hija de alguna familia en el árbol de familias de AWS y esa clase tiene `ArtTipoDecoracion` `0` o `1` en la jerarquía DM02 (EcommerceMethods.cs:285-301).
  - RPR-12: Tiene precio de contado: filas de condición `ACEF` de cualquier sucursal; se toma el **menor** precio mayor que 0. Sin él, el artículo sale (EcommerceMethods.cs:192-195, :303-310, :1759-1774).
  - RPR-13: Tiene precio de crédito: primero condición `12IA` en sucursal `90`/`0090`; si no hay, condición `12DA` en sucursal `0`/`0000`; en cada caso el menor mayor que 0. Sin ninguno, el artículo sale (EcommerceMethods.cs:197-211, :312-326).
  - RPR-14: Existencia = suma del stock libre (`UnrestrictedUseStock`) de todas las filas DIM11 del material, sin importar centro ni almacén. Un valor que no sea entero cuenta 0 (EcommerceMethods.cs:328-337).
  - RPR-15: Limpieza de textos: en nombre corto y descripción las comillas dobles pasan a dos apóstrofos y las comas, saltos de línea y tabuladores a espacio; en el nombre largo `”` pasa a dos apóstrofos (EcommerceMethods.cs:342-345, :361, :1776-1788).
  - RPR-16: `List3 = 1` si el SKU tiene alguna fila de precio en la lista `3`/`0003`; se exporta como `ahorro_cotorro` (EcommerceMethods.cs:213-217, :366, :1512).
  - *IE / Mayorista / Outlet:*
  - RPR-17: IE = `IE` cuando la propiedad IE vale `ELITE ESPECIAL`; May = `MAYORISTA` cuando la propiedad MAYORISTA es distinta de `0`, y `OUTLET` cuando la propiedad OUTLET vale `SI` (ProductMethods.cs:661-679). Se agrupa con `MAX` por artículo, familia y línea, así que si un artículo es Mayorista y Outlet a la vez queda `OUTLET`, que va después en orden alfabético (ProductMethods.cs:654-655, :681; EcommerceMethods.cs:397-408).
  - *Reglas de existencia:*
  - RPR-18: Tipo de artículo: es calzado, mueble o motocicleta si la descripción de su familia en AWS contiene `CALZADO`, `MUEBLES` o `MOTOCICLETAS`, o si su clase empieza con los 5 primeros caracteres de la familia de ese nombre; moto también si su línea es hija de MOTOCICLETAS. Es "artículo Q" si su descripción contiene `-Q-` (EcommerceMethods.cs:79-128, :445-448, :475-481).
  - RPR-19: La regla se elige en este orden de prioridad; la primera que se cumple queda como `ReglaAplicada`: 7 Outlet; 3 Calzado (cualquier estatus); 5 Bloqueado con `-Q-`; 6 Bloqueado sin `-Q-`; 4 Alta mueble sin `-Q-`; 2 Alta moto sin `-Q-` y que no sea mueble; 1 Alta sin `-Q-` (todas las de bloqueado y alta excluyen calzado) (EcommerceMethods.cs:486-516).
  - RPR-20: Cómo se cumple una regla. Un almacén "cuenta" si su stock libre, sumado por clave de almacén (`StorageLoc`) sin mirar el centro, es mayor o igual a la `Cantidad` de su catálogo y al mínimo por almacén de la regla. La regla se cumple si **alguno** de los cuatro grupos (principales, secundarios, secundarios dos, respaldo) tiene al menos el número de almacenes que pide la regla (EcommerceMethods.cs:561-606, :1731-1758).
  - RPR-21: Un artículo sin filas en DIM11 nunca cumple una regla (EcommerceMethods.cs:566-567).
  - RPR-22: Un artículo Mayorista entra aunque no cumpla ninguna regla (EcommerceMethods.cs:518-520).
  - RPR-23: Si la existencia es 0 o menos y el artículo es IE o Mayorista, se publica con existencia 200 (EcommerceMethods.cs:522-526).
  - RPR-24: IE o Mayorista lo marcan como exclusivo web (`exclusivo_online = 1`) (EcommerceMethods.cs:545, :1513).
  - *Imagen:*
  - RPR-25: Solo quedan artículos con imagen optimizada (ver RPR-112) (EcommerceMethods.cs:621, :629-631). El cruce por SKU distingue mayúsculas, porque la lista de imágenes se arma sin comparador que las ignore (ImagenMethods.cs:28).
  - RPR-26: Si la consulta de imágenes viene vacía o falla, **no se filtra nada** y pasan todos (EcommerceMethods.cs:623-627, :641-645).
  - *Precio final:*
  - RPR-27: El precio sale de la fila `ACEF` de la sucursal `90`/`0090`; si no hay, de la `0`/`0000`. Se toma la primera fila, no la menor, y se redondea a entero (EcommerceMethods.cs:682-700). Aquí la condición y la sucursal se comparan exactas, sin quitar espacios (EcommerceMethods.cs:683, :692-693).
  - RPR-28: Si el precio de referencia (`Precioref`) es mayor que el precio, hay oferta: `price` = precio de referencia y `special_price` = precio (EcommerceMethods.cs:704-709).
  - RPR-29: Un artículo sin fila en sucursal 90 ni 0 se exporta con el precio de contado del listado (RPR-12), sin redondear, sin precio especial y sin oferta (EcommerceMethods.cs:695-697, :1453-1455).
  - *Atributos:*
  - RPR-30: Entran las propiedades de SIGMavi cuyo `AtributoMagento` no está vacío, cuyo set es de VKORG `MA` o `todas` y que no son la propiedad `IE`. El valor es el de la lista de valores posibles si el artículo tiene uno asignado (distinto de 0), si no el valor libre; las comas pasan a espacio y los valores vacíos se descartan (ProductMethods.cs:1028-1069).
  - RPR-31: Si una propiedad se repite, gana el primer valor. El set de atributos es el primer `NombreSet` no vacío; si no hay, `Default` (EcommerceMethods.cs:753-776, :782-795).
  - RPR-32: En familias que no son MUEBLES se agrega `MARCA` = `MarcaE` si no venía ya (EcommerceMethods.cs:797-804).
  - RPR-33: Los atributos salen como `atributo=valor` separados por coma (EcommerceMethods.cs:1434-1439).
  - *Categorías:*
  - RPR-34: Rutas mapeadas: `EcommerceRelCatMagento` por familia + línea. La línea de la tabla es el primer valor no vacío de `ClassN3Virtual`, `SNM` o `PNM`; la sublínea virtual es `TNM` o, si falta, `ClassN3Virtual` (ProductMethods.cs:884-911). Una ruta sin sublínea virtual aplica a toda la línea; con sublínea solo aplica si coincide con la del artículo (EcommerceMethods.cs:910-939).
  - RPR-35: La sublínea virtual del artículo es su `LineaE` si está entre las posibles; si no, su `Linea`; si solo hay una posible, esa (ProductMethods.cs:991-1011).
  - RPR-36: Si el artículo está en oferta, por cada ruta se agrega también su ruta padre (un nivel menos), solo cuando la ruta tiene al menos tres niveles después de `Default Category/` (EcommerceMethods.cs:941-950, :1002-1022).
  - RPR-37: SuperPromo: si alguna fila de precio del SKU tiene `Oferta = 'S'` y `Superpromo = 'S'`, se agrega `Default Category/PROMOCIONES/PROMOCIONES MA` (EcommerceMethods.cs:1303-1308, :958-964).
  - RPR-38: Carruseles: `Default Category/CARRUSELES/MA/<categoría>` de `SDSIPCarrusel` con `VKORG = '2'` (ProductMethods.cs:840-846; EcommerceMethods.cs:966-978).
  - RPR-39: Si no quedó ninguna ruta: `Default Category/MA/<familia>/<línea>` con las descripciones de AWS (si una descripción no existe se usa el código), o `Default Category/MA/<familia>` si no hay línea; los textos pasan por la limpieza de RPR-15 (EcommerceMethods.cs:980-994).
  - RPR-40: Orden y formato: primero las rutas mapeadas en orden alfabético, luego SuperPromo y luego los carruseles en orden alfabético; sin repetir; unidas con coma (EcommerceMethods.cs:952-956, :1430-1432).
  - *Relacionados:*
  - RPR-41: Precio visible = precio especial si hay oferta; si no, el precio final; si no, el de contado del listado (EcommerceMethods.cs:1055-1076).
  - RPR-42: Upsell, dentro de la misma familia + línea y solo si el grupo tiene al menos 2 artículos con precio visible mayor que 0: hasta 8 más caros en orden ascendente; si no hay, hasta 2 más baratos en orden descendente (EcommerceMethods.cs:1089-1150).
  - RPR-43: Si aún queda vacío, se usa el upsell de SAP (DM03, VKORG `02`), hasta 8 (EcommerceMethods.cs:1152-1157, :1545-1549).
  - RPR-44: Related y crosssell: crosssell de SAP (DM03, VKORG `01`), hasta 3; si no hay, sustitutos de SAP (VKORG `03`), hasta 3. `related_skus` y `crosssell_skus` llevan la misma lista (EcommerceMethods.cs:1161-1177, :1529-1543).
  - RPR-45: Todo relacionado debe estar en el propio listado exportado, ser distinto del SKU de origen y no repetirse (EcommerceMethods.cs:1696-1728).
  - *Posición:*
  - RPR-46: Primero los disponibles (existencia mayor que 0), luego el menor precio visible y luego el SKU; la posición va de 1 en adelante (EcommerceMethods.cs:1237-1262). Ya no se usan las tablas legacy de prioridad, temporada y ventas (EcommerceMethods.cs:1249-1250).
  - *Armado de la fila:*
  - RPR-47: Valores fijos: `product_type = simple`, `product_websites = muebles_america`, `product_online = 1`, `tax_class_name = IVA`, `url_key` = SKU, imágenes, variaciones y campos de bundle vacíos, `a = 1`, `IncluyeVineta = 0` (EcommerceMethods.cs:1472-1522).
  - RPR-48: `visibility = not visible individually` si el SKU empieza con `AMER`; si no, `catalog, search` (EcommerceMethods.cs:1485-1487).
  - RPR-49: `name` = nombre corto (o descripción), `description` = nombre largo, `meta_title` = nombre corto, `meta_keywords` y `meta_description` = `MetaPalabras1E` y `MetaDescripcion1E`, `weight` = volumétrico redondeado a 2 decimales, `qty` = existencia (EcommerceMethods.cs:1480-1510).
  - RPR-50: Crédito: `price_installments` = precio de crédito redondeado a entero; `price_twelve` = crédito / 12 y `price_eighteen` = crédito / 18, ambos redondeados a entero (EcommerceMethods.cs:1492-1494).
  - RPR-51: Con oferta y precio especial mayor que 0, la vigencia del especial va de ahora a ahora + 6 días; es el `GETDATE()` / `DATEADD(dd, 6, GETDATE())` del SP (EcommerceMethods.cs:1457-1464).
  - RPR-52: `descuento` = (precio − especial) / precio × 100, redondeado a entero, solo con oferta (EcommerceMethods.cs:1466-1470).
  - RPR-53: `Created_date` y `Ultimo_Cambio` = hora del servidor al exportar; `position` va vacío si el artículo no quedó en el ranking (EcommerceMethods.cs:1400, :1474, :1518, :1520).
- **Fuentes de datos (todas de lectura; el proceso no escribe en ningún lado):**
  - SAP OData DM01 `ZAPI_ARTICULOS_SRV` / `Articulos`, sin filtro (ProductMethods.cs:38).
  - SAP OData DIM11 `ZCDS_DIM11_EXISTENCIA_CDS` / `zcds_dim11_existencia`, sin filtro, con `$expand=to_lotes,to_series` (ProductMethods.cs:103).
  - SAP OData SD29 `ZAPI_PROPRELIST_SRV` / `PropreListSet` con `$filter=CDistr eq '1'` (EcommerceMethods.cs:27, :53; FinalListProperMethods.cs:52-55).
  - SAP OData DM02 `ZAPI_JERARQUIA_ARTICULOS_SRV` / `GET_ARTICULOSSet` (ProductMethods.cs:615).
  - SAP OData DM03 `ZAPI_CROSSSELL_SRV`, `ZAPI_UPSELL_SRV` y `ZAPI_SUSTITUTOS_SRV`, `HeaderSet(ARTICULO,VKORG)/HeaderReturn`, una llamada por SKU (ProductMethods.cs:1092, :1124, :1156; EcommerceMethods.cs:1605, :1640, :1675).
  - AWS `AS_GET_Familia_Linea` (árbol de familias y líneas) (ProductMethods.cs:319) y `AI_GET_CatalogoConfiguracion` para `DM0285ALMACENPRINCIPAL`, `DM0285ALMACENESSECUNDARIOS` y `DM0285ALMACENRESPALDO` (ProductMethods.cs:711, :745-766).
  - SIGMavi: `SIPExcluirProductos`, `ExcluirClassN2ClassN3`, `ClassN2ValidasTdaVirtual`, `SIPProductos`, `ReglasEcommerce`, `ecommerceactualizarimagenes` + `SCMArtImagen`, `SDSIPCarrusel` + `SCSIPCategorias`, `EcommerceRelCatMagento`, y `articulospropiedades` + `ClassN2Propiedades` + `CatalogoPropiedad` + `eCommerceSetPropiedades` + `CatalogoValoresPosibles` / `CatalogoValorePosibles` (ProductMethods.cs:430-438, :479-487, :526-542, :580-588, :649-681, :781-795, :840-846, :884-911, :1028-1056; ImagenMethods.cs:34-40).
  - Archivo `TiposMaterialSAP.json` (CatalogoMethods.cs:32-41).
- **Salida y errores:**
  - 200 con `{ "ResultadoFinal": [ ... ] }`, una fila `ProductoEcommerceFinal` por artículo (ProductController.cs:31-32; ResultadoProcesoEcommerce.cs:35-49; ProductoEcommerceFinal.cs:5-56).
  - **Cualquier error dentro del proceso se traga**: el `catch` está vacío y la respuesta es 200 con `ResultadoFinal: []` (EcommerceMethods.cs:1377-1381). Desde fuera, "no hay artículos" y "falló SAP" se ven igual.
  - `viu` → 400 `VIU no implementado`; `mavi` → 400 `MAVI no implementado`; otro valor → 400 `La tienda solicitada no es valida` (ProductController.cs:33-40). Otra excepción → 400 `Error, <mensaje>` (ProductController.cs:43-46).
  - No se escribe en el log de archivo. Los avisos de las fases 7 y 13 solo van a la consola (EcommerceMethods.cs:625, :636, :643, :1614, :1649, :1684).
- **Configuración usada:** `AwsBaseUrl` (ProductMethods.cs:28); la URL y las credenciales de S4 salen de `Conexion.dll` (ver RPR-119); la conexión a SIGMavi también, con el alias `Server` de `applicationSettings` (ver RPR-121).
- **Pendientes conocidos:**
  - `viu` y `mavi` no están implementados (ProductController.cs:33-38; AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:655).
  - Errores silenciados (EcommerceMethods.cs:1377-1381). Los contadores y las banderas `Exitoso` y `MensajeError` están comentados (EcommerceMethods.cs:1281, :1288, :1328-1331, :1379-1380; ResultadoProcesoEcommerce.cs:12-33).
  - Las fases 8 y 14 (productos configurables) no existen: la fase 8 no aparece en el código y la llamada de la fase 14 está comentada (EcommerceMethods.cs:1349-1350). Por eso todo sale como `simple` y sin `configurable_variations` (EcommerceMethods.cs:1477, :1501).
  - Las columnas de imagen salen vacías (EcommerceMethods.cs:1496-1498).
  - El grupo "secundarios dos" usa la misma lista de almacenes secundarios, porque no hay un catálogo propio (EcommerceMethods.cs:579-582, :597-599).
  - Si una regla tiene 0 en alguno de sus cuatro mínimos de almacenes, ese grupo se cumple solo y la regla pasa con que el artículo tenga una fila en DIM11 (EcommerceMethods.cs:589-605; los nulos de la tabla se leen como 0, ProductMethods.cs:785-792). Falta confirmarlo contra el SP.
  - Las existencias se suman con `int.TryParse`. Si DIM11 manda el stock con decimales (por ejemplo `"3.000"`), ese renglón cuenta 0 (EcommerceMethods.cs:335, :1748). El campo viene de `MARD-LABST`, una cantidad de SAP (RSG\dim11_existencias.md:29). Falta confirmar el formato real con una captura.
  - La consulta IE/Mayorista usa la tabla `CatalogoValorePosibles` (ProductMethods.cs:676) y la de atributos usa `CatalogoValoresPosibles` (ProductMethods.cs:1052). Son nombres distintos: hay que verificar cuál existe en SIGMavi; si una falla, el proceso entero responde vacío.
  - El precio de contado del listado (el menor de cualquier sucursal, RPR-12) y el precio final (sucursal 90 o 0, RPR-27) pueden no coincidir.
  - Los precios se filtran por `CDistr = '1'` (EcommerceMethods.cs:27; FinalListProperMethods.cs:55), pero no por organización de ventas; el modelo advierte que SD29 también trae filas legacy con OrgVtas `1`, `2` y `3` (FinalListProper.cs:30-35).
  - El upsell de SAP nunca se consulta para un artículo que está solo en su familia + línea, porque el grupo se salta antes (EcommerceMethods.cs:1110-1111).
  - Rendimiento: el proceso trae el catálogo, las existencias y los precios completos sin paginar y hace al menos una llamada de crosssell a SAP por SKU (EcommerceMethods.cs:1043-1044, :1587-1588). Cada llamada a S4 tiene 60 s de tiempo límite (TokenGenerator.cs:127).
  - Los relacionados de SAP se guardan en una caché estática que no caduca: los cambios en DM03 no se ven hasta reciclar el pool de IIS. Un error de SAP para un SKU se guarda como lista vacía (EcommerceMethods.cs:29-36, :1612-1623). Además, lo que se guarda ya viene recortado contra el listado de la corrida que lo cargó (EcommerceMethods.cs:1606-1610, :1641-1645, :1676-1680): un relacionado que no se exportaba en esa primera corrida no vuelve a aparecer en corridas posteriores aunque después sí se exporte.
  - El diccionario IE/Mayorista se arma sin distinguir mayúsculas, pero el agrupado previo sí las distingue y no quita espacios: dos filas que difieran solo en eso hacen fallar el proceso, que responde vacío (EcommerceMethods.cs:399, :434-438).

### GET /ecommerce/listado  (EcommerceController.GetListadoArticulosAsync, EcommerceController.cs:12-26)

- **Para qué sirve:** devuelve los datos crudos con que arranca la exportación (la Fase 0). Sirve para revisar qué trae cada fuente. A pesar del nombre, **no aplica ningún filtro**: no es el listado de artículos exportables.
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. Llama a `CargarContextoProcesoAsync` (EcommerceController.cs:16-20).
  2. Ese método hace las diez cargas de la Fase 0 en serie, en este orden: artículos, existencias, precios de la UEN `1`, exclusiones, exclusiones por familia y línea, familias válidas, SIP válidos, familias y líneas de AWS, jerarquía y tipos válidos (EcommerceMethods.cs:51-60).
  3. Devuelve todo junto (EcommerceMethods.cs:62-74).
- **Reglas de negocio:**
  - RPR-54: Los únicos recortes son los de cada consulta: precios solo de `CDistr = '1'`, exclusiones solo con `MA = 1`, familias solo de `MUEBLES AMERICA`, SIP solo con propiedades y foto concluidas (EcommerceMethods.cs:27, :53; ProductMethods.cs:438, :487, :540-542, :588).
- **Fuentes de datos:** las mismas de la Fase 0 de `product/exportaart` (ver arriba), todas de lectura.
- **Salida y errores:** 200 con `ContextoProcesoEcommerce`: `Productos`, `Existencias`, `TodosLosPrecios`, `ExclusionesProductos`, `ExclusionesFamLinea`, `FamiliasValidas`, `SipProductos`, `FamiliasLineas`, `JerarquiasArticulos`, `TiposValidosEcommerce` (ContextoProcesoEcommerce.cs:6-18). Si falla cualquier carga → 400 `Error, <mensaje>` (EcommerceController.cs:22-25), salvo las exclusiones por familia y línea, que si fallan devuelven lista vacía sin avisar (RPR-65).
- **Configuración usada:** `AwsBaseUrl`; `Conexion.dll` para S4 y SIGMavi.
- **Pendientes conocidos:** la respuesta es enorme (catálogo, existencias y precios completos) y no tiene paginación. El nombre de la ruta no corresponde a lo que devuelve.

### GET /product/products  (ProductController.GetProducts, ProductController.cs:49-63)

- **Para qué sirve:** devuelve el maestro completo de artículos de SAP.
- **Quién la llama:** prevista como sustituto de `product/updateProduct` (junto con `product/exportaart`), `product/updateProductJsonOnly` y `product/updatePrice` del job LAN ImportApp (CHECKLIST_DEV2_ROADMAP.md:250-252; MIGRATION_STATUS_MASTER_v2.csv:124-126). La exportación usa el mismo método (EcommerceMethods.cs:51).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. Arma la URL de DM01 con los parámetros `$top`, `$skip`, `$filter`, `$select` y `$orderBy` vacíos (ProductMethods.cs:38).
  2. Llama a S4 con el cliente autenticado (ProductMethods.cs:42-47).
  3. Si SAP no responde 2xx, o responde vacío, lanza error (ProductMethods.cs:50-51).
  4. Convierte `d.results` en la lista de artículos (ProductMethods.cs:53-55).
- **Reglas de negocio:**
  - RPR-55: Sin filtro ni paginación: trae todo el catálogo (ProductMethods.cs:38).
- **Fuentes de datos:** SAP OData DM01 `ZAPI_ARTICULOS_SRV` / `Articulos`, lectura.
- **Salida y errores:** 200 con la lista de artículos. Los campos salen con el nombre de SAP (`ARTICULO`, `DESCRIPCION1`, `NOMBRECORTO`, `CATEGORIA`, `FAMILIA`, `LINEA`, `TIPO`, `ESTATUS`, `MARCAE`, `NOMBRELARGOE`, `VOLUMETRICO`, `METAPALABRAS1E`…`MATERIALAUTORIZADOVENTA`) porque el modelo los fija así (Product.cs:7-156). Error → 400 `Error, Ocurrio un error al intentar obtener el listado de productos: Error SAP. StatusCode: … Content: …` (ProductController.cs:59-62; ProductMethods.cs:59-62).
- **Configuración usada:** `Conexion.dll` (RPR-119).
- **Pendientes conocidos:** la respuesta es todo el catálogo, sin paginación.

### GET /product/productbysku/{sku}  (ProductController.GetProductsBySku, ProductController.cs:65-79)

- **Para qué sirve:** devuelve un artículo del maestro de SAP por su SKU.
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** `sku` en la ruta (texto, obligatorio).
- **Cómo funciona (paso a paso):** igual que `product/products`, pero con `$filter=ARTICULO eq '<sku>'` (ProductMethods.cs:69-88).
- **Reglas de negocio:**
  - RPR-56: El SKU se compara exacto, tal como lo guarda SAP, y se pega al filtro sin escapar (ProductMethods.cs:69; ver RPR-124).
- **Fuentes de datos:** SAP OData DM01 `ZAPI_ARTICULOS_SRV` / `Articulos`, lectura.
- **Salida y errores:** 200 con una lista (vacía si no existe). Error → 400 `Error, …` (ProductController.cs:75-78; ProductMethods.cs:90-93).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** ninguno propio.

### GET /product/filter/{filter}  (ProductController.GetFilterProducts, ProductController.cs:81-95)

- **Para qué sirve:** consulta el maestro de artículos con un filtro OData que arma quien llama.
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** `filter` en la ruta (texto, obligatorio): una expresión OData, por ejemplo `LINEA eq 'L001'`.
- **Cómo funciona (paso a paso):** pega el texto en `$filter=` de DM01 y llama a S4 (ProductMethods.cs:137-158).
- **Reglas de negocio:**
  - RPR-57: El filtro pasa a SAP tal cual, sin validar (ProductMethods.cs:137).
- **Fuentes de datos:** SAP OData DM01 `ZAPI_ARTICULOS_SRV` / `Articulos`, lectura.
- **Salida y errores:** 200 con la lista de artículos. Error → 400 `Error, …` (ProductController.cs:91-94; ProductMethods.cs:160-163).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** filtro OData libre desde la URL (AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:653). Como va dentro de la ruta, no admite caracteres como `/`.

### GET /product/stock/filter/{filter}  (ProductController.GetFilterProductsStock, ProductController.cs:97-111)

- **Para qué sirve:** consulta existencias en SAP con un filtro OData que arma quien llama.
- **Quién la llama:** el tracker la da como sustituto de `product/getStockByStore` y `product/existenciasAlmacenArt` del job LAN ImportApp (MAVI - DMZ-SAP.csv:130-131).
- **Entrada:** `filter` en la ruta (texto, obligatorio), por ejemplo `Material eq 'X' and Plant eq '0007'`.
- **Cómo funciona (paso a paso):** pega el texto en `$filter=` de DIM11, con idioma ES, y llama a S4 (ProductMethods.cs:173-194).
- **Reglas de negocio:**
  - RPR-58: El filtro pasa a SAP tal cual, sin validar (ProductMethods.cs:173).
- **Fuentes de datos:** SAP OData DIM11 `ZCDS_DIM11_EXISTENCIA_CDS` / `zcds_dim11_existencia`, lectura.
- **Salida y errores:** 200 con filas `Material`, `Plant`, `StorageLoc`, `UnrestrictedUseStock`, `BlockedStock`, `BaseUnit`, `ProductName`, `ProductGroup`, `CrossPlantStatus` y `to_series`, que aquí sale en `null` porque esta consulta no pide las series (Stock.cs:8-20; ProductMethods.cs:173). Las cantidades salen como texto, tal como las manda SAP (Stock.cs:13-14). Error → 400 `Error, Ocurrio un error al intentar obtener el stock de productos: …` (ProductMethods.cs:196-199; ProductController.cs:107-110).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** mismo hallazgo de filtro libre que `product/filter` (AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:653).

### GET /product/stock  (ProductController.GetStock, ProductController.cs:113-127)

- **Para qué sirve:** consulta existencias por material, centro y almacén.
- **Quién la llama:** el tracker la da como sustituto de `product/updateStockMavi` y `product/updateStock` del job LAN ImportApp (MAVI - DMZ-SAP.csv:128-129).
- **Entrada:** en la query, todos opcionales: `material`, `plant` (centro), `storageLoc` (almacén) (ProductController.cs:115).
- **Cómo funciona (paso a paso):**
  1. Arma un filtro con los valores que lleguen, unidos con `and` (ProductMethods.cs:210-218).
  2. Llama a DIM11 con ese filtro (ProductMethods.cs:219-236).
- **Reglas de negocio:**
  - RPR-59: Sin parámetros no hay filtro y se traen todas las existencias (ProductMethods.cs:218).
- **Fuentes de datos:** SAP OData DIM11, lectura.
- **Salida y errores:** 200 con filas de existencia (Stock.cs:8-20). Error → 400 `Error, Ocurrio un error al obtener stock: …` (ProductController.cs:123-126; ProductMethods.cs:240-243).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** los valores se pegan al filtro sin escapar (RPR-124).

### GET /product/stock/serial  (ProductController.GetSerialStock, ProductController.cs:129-143)

- **Para qué sirve:** lista las piezas con número de serie que hay en existencia, con sus características (por ejemplo color o modelo).
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** en la query, todos opcionales: `material`, `plant`, `storageLoc`, `serialNumber` (ProductController.cs:131).
- **Cómo funciona (paso a paso):**
  1. Arma el filtro con material, centro y almacén y pide DIM11 con `$expand=to_series` (ProductMethods.cs:254-263).
  2. Salta las filas sin series (ProductMethods.cs:284-285).
  3. Si llegó `serialNumber`, deja solo esa serie (ProductMethods.cs:289-290).
  4. Devuelve una fila por serie con las cantidades de la fila de existencia (ProductMethods.cs:292-306).
- **Reglas de negocio:**
  - RPR-60: Solo aparecen materiales gestionados por serie (ProductMethods.cs:284-285).
  - RPR-61: El número de serie se filtra en memoria, comparación exacta (ProductMethods.cs:289-290).
  - RPR-62: `UnrestrictedUseStock` y `BlockedStock` son los del almacén, no los de la pieza. Si SAP no los manda (nulo) cuentan 0; un texto vacío o no numérico hace fallar la ruta (ProductMethods.cs:300-301).
- **Fuentes de datos:** SAP OData DIM11 con navegación `to_series`, lectura.
- **Salida y errores:** 200 con `Material`, `Plant`, `StorageLoc`, `SerialNumber`, `UnrestrictedUseStock`, `BlockedStock`, `BaseUnit`, `Characteristic`, `CharcValue` (SerialStockResponse.cs:3-14). Una cantidad que no sea número hace fallar la conversión → 400 `Error, Ocurrio un error al obtener stock por serie: …` (ProductMethods.cs:300, :311-314).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** ninguno propio.

### GET /product/exclusiones/ma  (ProductController.GetExclusionesMA, ProductController.cs:145-159)

- **Para qué sirve:** lista los códigos, marcas y prefijos de SKU que no se publican en Muebles América.
- **Quién la llama:** no está identificado en el código ni en el tracker. La exportación usa el mismo método (EcommerceMethods.cs:54).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** abre SIGMavi, lee `SIPExcluirProductos` con `MA = 1` y arma la lista (ProductMethods.cs:424-457).
- **Reglas de negocio:**
  - RPR-63: Solo filas con `MA = 1`; las banderas `MAVI`, `MA` y `VIU` nulas se leen como 0 (ProductMethods.cs:438, :452-454).
  - RPR-64: Si no se obtiene conexión, devuelve lista vacía (ProductMethods.cs:428).
- **Fuentes de datos:** SIGMavi `SIPExcluirProductos`, lectura.
- **Salida y errores:** 200 con `IdExcluirProducto`, `TipoExclusion`, `MAVI`, `MA`, `VIU` (SIPExcluirProducto.cs:5-12). Error de SQL → 400 `Error, …` (ProductMethods.cs:460-463; ProductController.cs:155-158).
- **Configuración usada:** `Conexion.dll` (SIGMavi).
- **Pendientes conocidos:** el error se relanza con `throw ex`, que pierde la pila original (ProductMethods.cs:462).

### GET /product/exclusiones/familialinea/ma  (ProductController.GetExclusionesFamiliaLineaMA, ProductController.cs:161-175)

- **Para qué sirve:** lista los pares familia + línea que no se publican en Muebles América.
- **Quién la llama:** no está identificado en el código ni en el tracker. La exportación usa el mismo método (EcommerceMethods.cs:55).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** lee `ExcluirClassN2ClassN3` con `MA = 1` (ProductMethods.cs:473-506).
- **Reglas de negocio:**
  - RPR-65: **Si la consulta falla, el error se escribe en consola y la ruta responde 200 con la lista vacía o incompleta** (ProductMethods.cs:509-512). En la exportación eso significa que no se excluye ninguna familia + línea.
- **Fuentes de datos:** SIGMavi `ExcluirClassN2ClassN3`, lectura.
- **Salida y errores:** 200 con `ClassN2`, `ClassN3`, `MAVI`, `MA`, `AMAZON` (ExcluirClassN2ClassN3.cs:5-12). Solo un error al abrir la conexión llega como 400 `Error, …` (ConexionSQL.cs:93-97; ProductController.cs:171-174).
- **Configuración usada:** `Conexion.dll` (SIGMavi).
- **Pendientes conocidos:** error silenciado (ProductMethods.cs:509-512).

### GET /product/articulos/sip/validos  (ProductController.GetArticulosSipValidos, ProductController.cs:177-190)

- **Para qué sirve:** lista los artículos cuya ficha (propiedades) y foto ya están terminadas, que son los únicos que pueden publicarse.
- **Quién la llama:** no está identificado en el código ni en el tracker. La exportación usa el mismo método (EcommerceMethods.cs:57).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** lee `SIPProductos` con los tres filtros de RPR-2 (ProductMethods.cs:520-566).
- **Reglas de negocio:**
  - RPR-66: `EstatusPropiedad = 'concluido'`, `EstatusFotografia = 'CONCLUIDO'` y `SoloSELP = 0` (ProductMethods.cs:540-542). Las banderas numéricas nulas se leen como 0 (ProductMethods.cs:553-560).
- **Fuentes de datos:** SIGMavi `SIPProductos`, lectura.
- **Salida y errores:** 200 con `Articulo`, `MATV`, `VIUTV`, `MAVITV`, `AMAZONTV`, `LeyendaImpresion`, `EstatusPropiedad`, `EstatusFotografia`, `SoloSELP`, `FotoDescargada`, `ImpresionEtiquetas` (SIPProducto.cs:5-18). Error → 400 `Error, …` (ProductController.cs:186-189).
- **Configuración usada:** `Conexion.dll` (SIGMavi).
- **Pendientes conocidos:** ninguno propio.

### GET /product/familias/validas/ma  (ProductController.GetFamiliasValidasMA, ProductController.cs:192-206)

- **Para qué sirve:** lista las familias que se venden en Muebles América, con su banner, nombre a mostrar y orden.
- **Quién la llama:** no está identificado en el código ni en el tracker. La exportación usa el mismo método (EcommerceMethods.cs:56).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** lee `ClassN2ValidasTdaVirtual` con `Pagina = 'MUEBLES AMERICA'` (ProductMethods.cs:575-606).
- **Reglas de negocio:**
  - RPR-67: Solo la página `MUEBLES AMERICA`; un `Orden` nulo se lee como 0 (ProductMethods.cs:588, :602).
- **Fuentes de datos:** SIGMavi `ClassN2ValidasTdaVirtual`, lectura.
- **Salida y errores:** 200 con `Pagina`, `ClassN2`, `Banner`, `NombreMostrar`, `Orden` (ClassN2ValidaTdaVirtual.cs:5-12). Error → 400 `Error, …` (ProductController.cs:202-205).
- **Configuración usada:** `Conexion.dll` (SIGMavi).
- **Pendientes conocidos:** ninguno propio.

### GET /product/familiaslinea/{clase}  (ProductController.GetFamiliasLineaByClass, ProductController.cs:208-226)

- **Para qué sirve:** devuelve las familias o líneas de una clase, con su descripción.
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** `clase` en la ruta (texto, obligatorio), por ejemplo `CE000C000` (ProductMethods.cs:353).
- **Cómo funciona (paso a paso):**
  1. Si `clase` viene vacía, o si falta la URL de la API de configuraciones, lanza error (ProductMethods.cs:358-366).
  2. Llama a `<URL_CONFIGURACIONES_API>/AS_GET_FamiliaLineaFilter?Class=<clase>` sin credenciales de S4 (ProductMethods.cs:368-378).
  3. Lee la respuesta en formato OData (`d.results`) y no en el formato `{ Parent: [...] }` del árbol de AWS (ProductMethods.cs:386-395).
  4. Por cada fila devuelve `Class` y, como descripción, el campo `Kschl` (ProductMethods.cs:400-406).
- **Reglas de negocio:**
  - RPR-68: `Class` es la familia o línea y `Kschl` es su descripción (ProductMethods.cs:400-406; FamiliaLineaResponse.cs:44-59).
  - RPR-69: La lista es plana: `Children` siempre va en `null`, porque no se llena (ProductMethods.cs:400-406).
  - RPR-70: Si `d.results` no es un arreglo, responde lista vacía (ProductMethods.cs:392-395).
- **Fuentes de datos:** API de configuraciones de MAVI `AS_GET_FamiliaLineaFilter`, lectura.
- **Salida y errores:** 200 con `[{ Class, Descripcion, Children: null }]`. Clase en blanco → 400 `Error, El parametro 'clase' es obligatorio para filtrar familias y lineas.`; URL no configurada → 400 `Error, URL_CONFIGURACIONES_API no configurada en AppSettings.` (las dos se lanzan antes del `try`, así que no llevan el prefijo del método; ProductMethods.cs:358-366). Respuesta no 2xx o error de red → 400 `Error, Ocurrio un error al intentar obtener las familias y lineas de la clase '<clase>': …` (ProductMethods.cs:381-384, :410-413; ProductController.cs:222-225).
- **Configuración usada:** `URL_CONFIGURACIONES_API` (ProductMethods.cs:29).
- **Pendientes conocidos:** ninguno propio.

### GET /product/articulos/ie/mayorista  (ProductController.GetArticulosIEMayorista, ProductController.cs:228-242)

- **Para qué sirve:** lista los artículos marcados como IE (Elite Especial), Mayorista u Outlet, con su familia y línea.
- **Quién la llama:** el tracker la marca como candidata para `company/wholesale-customer/{wholesaleAccount}` (MIGRATION_STATUS_MASTER_v2.csv:114). La exportación usa el mismo método (EcommerceMethods.cs:392).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** ejecuta en SIGMavi la consulta de propiedades IE, MAYORISTA y OUTLET y agrupa por artículo, familia y línea (ProductMethods.cs:644-699).
- **Reglas de negocio:**
  - RPR-71: Las mismas de RPR-17 (ProductMethods.cs:661-681).
- **Fuentes de datos:** SIGMavi `articulospropiedades`, `ClassN2Propiedades`, `CatalogoPropiedad`, `CatalogoValorePosibles`, lectura (ProductMethods.cs:673-676).
- **Salida y errores:** 200 con `Articulo`, `Familia`, `Linea`, `IE`, `May` (ArticuloIEMay.cs en `Models\Database\`, líneas 1-8). Error → 400 `Error, …` (ProductController.cs:238-241).
- **Configuración usada:** `Conexion.dll` (SIGMavi).
- **Pendientes conocidos:** nombre de tabla `CatalogoValorePosibles` por confirmar (ver Pendientes de `product/exportaart`).

### GET /product/catalogo/{nombreCatalogo}  (ProductController.GetConfiguracionCatalogo, ProductController.cs:244-264)

- **Para qué sirve:** devuelve las filas de un catálogo de configuración de AWS (tabla de valores con nombre).
- **Quién la llama:** no está identificado en el código ni en el tracker. La exportación usa el mismo método para los almacenes (ProductMethods.cs:745-761).
- **Entrada:** `nombreCatalogo` en la ruta (texto, obligatorio), por ejemplo `DM0285ALMACENPRINCIPAL`.
- **Cómo funciona (paso a paso):** llama a `<AwsBaseUrl>AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=<nombre>` sin credenciales de S4 y convierte la respuesta (ProductMethods.cs:711-729).
- **Reglas de negocio:**
  - RPR-72: Una respuesta nula se trata como lista vacía (ProductMethods.cs:729).
- **Fuentes de datos:** AWS `AI_GET_CatalogoConfiguracion`, lectura.
- **Salida y errores:** 200 con `{ success: true, catalogo, total, data: [ { IdConfiguracionCatalogos, NombreCatalogo, Uso, Valor1, Valor2, Valor3, Valor4 } ] }` (ProductController.cs:252-258; AlmacenesConfig.cs:65-87). Error → 400 `Error: Error catálogo <nombre>. URL: <url>. Detalle: …` (ProductMethods.cs:731-734; ProductController.cs:260-263).
- **Configuración usada:** `AwsBaseUrl` (ProductMethods.cs:28).
- **Pendientes conocidos:** el mensaje de error expone la URL completa de AWS al cliente (ProductMethods.cs:733).

### GET /product/almacenes/config  (ProductController.GetAlmacenesConfig, ProductController.cs:266-287)

- **Para qué sirve:** devuelve qué almacenes son principales, secundarios y de respaldo para las reglas de existencia, y cuántas piezas pide cada uno.
- **Quién la llama:** no está identificado en el código ni en el tracker. La exportación usa el mismo método (EcommerceMethods.cs:431).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** lee tres catálogos de AWS, uno por grupo, y de cada fila toma el almacén y la cantidad (ProductMethods.cs:740-769).
- **Reglas de negocio:**
  - RPR-73: Catálogos: `DM0285ALMACENPRINCIPAL`, `DM0285ALMACENESSECUNDARIOS` y `DM0285ALMACENRESPALDO` (ProductMethods.cs:745, :753, :761).
  - RPR-74: Almacén = `Valor1`; cantidad = `Valor2`, y si no es número entero, 1 (ProductMethods.cs:746-765).
- **Fuentes de datos:** AWS `AI_GET_CatalogoConfiguracion` (tres llamadas), lectura.
- **Salida y errores:** 200 con `{ success: true, principales, secundarios, respaldo, data: { AlmacenesPrincipales, AlmacenesSecundarios, AlmacenesRespaldo, Total… } }` (ProductController.cs:274-281; AlmacenesConfig.cs:9-35). Error → 400 `Error: …` (ProductController.cs:283-286).
- **Configuración usada:** `AwsBaseUrl`.
- **Pendientes conocidos:** no hay catálogo para "secundarios dos" (ver Pendientes de `product/exportaart`).

### GET /product/reglas/existencia  (ProductController.GetReglasExistencia, ProductController.cs:289-308)

- **Para qué sirve:** devuelve las siete reglas de existencia: cuántos almacenes de cada grupo y cuántas piezas por almacén pide cada una.
- **Quién la llama:** no está identificado en el código ni en el tracker. La exportación usa el mismo método (EcommerceMethods.cs:432).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** lee `ReglasEcommerce` de la 1 a la 7, en orden (ProductMethods.cs:776-819).
- **Reglas de negocio:**
  - RPR-75: Solo `IdReglasEcommerce` 1 a 7, ordenadas por id (ProductMethods.cs:794-795).
  - RPR-76: Los mínimos nulos se leen como 0 (ProductMethods.cs:785-792).
- **Fuentes de datos:** SIGMavi `ReglasEcommerce`, lectura.
- **Salida y errores:** 200 con `{ success: true, total, data: [ { IdRegla, Descripcion, AlmacenesPrincipales, AlmacenesSecundarios, AlmacenesSecundariosDos, AlmacenRespaldo, ArtPorAlmacenPrincipal, ArtPorAlmacenSecundario, ArtPorAlmacenSecundarioDos, ArtPorAlmacenRespaldo } ] }` (ProductController.cs:297-302; AlmacenesConfig.cs:40-52). Error → 400 `Error: Error al obtener reglas de existencia: …` (ProductMethods.cs:821-824).
- **Configuración usada:** `Conexion.dll` (SIGMavi).
- **Pendientes conocidos:** ver el efecto de un mínimo en 0 en los Pendientes de `product/exportaart`.

### GET /product/jerarquia/articulos  (ProductController.GetJerarquiaArticulos, ProductController.cs:310-329)

- **Para qué sirve:** devuelve la jerarquía de artículos de SAP: cada clase (familia o línea) con sus datos de negocio (clase maestra, tope de monedero, peso, artículo pequeño o de decoración, comprador y gerente).
- **Quién la llama:** el tracker la da como sustituto de `product/updateConfigurableProduct` del job LAN ImportApp (MAVI - DMZ-SAP.csv:127). La exportación usa el mismo método (EcommerceMethods.cs:59).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** llama a DM02 sin filtro, con idioma ES (ProductMethods.cs:615-632).
- **Reglas de negocio:**
  - RPR-77: Sin filtro: trae toda la jerarquía (ProductMethods.cs:615).
- **Fuentes de datos:** SAP OData DM02 `ZAPI_JERARQUIA_ARTICULOS_SRV` / `GET_ARTICULOSSet`, lectura.
- **Salida y errores:** 200 con `{ data: [ { Class, Descripcion, Maestra, MaestraDima, TopePorcMonedero, Peso, ArtTipoPeque, ArtTipoDecoracion, PerfilCom, NombreCom, PerfilGer, NombreGer } ] }` (ProductController.cs:318-323; JerarquiaArticulo.cs:3-40). Error → 400 `Error: …` (ProductController.cs:325-328).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** `success` y `total` están comentados en la respuesta, a diferencia de las rutas vecinas (ProductController.cs:320-321; AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:941).

### GET /product/carrusel/categorias  (ProductController.GetCarruselCategorias, ProductController.cs:331-350)

- **Para qué sirve:** devuelve, por SKU, las categorías de carrusel de Muebles América en que aparece.
- **Quién la llama:** no está identificado en el código ni en el tracker. La exportación usa el mismo método (EcommerceMethods.cs:660).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** lee `SDSIPCarrusel` con `VKORG = '2'` unida a `SCSIPCategorias` y agrupa por SKU (ProductMethods.cs:835-869).
- **Reglas de negocio:**
  - RPR-78: La ruta de categoría es `Default Category/CARRUSELES/MA/` + nombre de la categoría (ProductMethods.cs:843).
  - RPR-79: Solo filas con `VKORG = '2'`; los SKU vacíos se saltan y se les quitan espacios (ProductMethods.cs:846, :854-858).
- **Fuentes de datos:** SIGMavi `SDSIPCarrusel`, `SCSIPCategorias`, lectura.
- **Salida y errores:** 200 con `{ success: true, total: <número de SKU>, data: { "<sku>": ["<ruta>", …] } }` (ProductController.cs:339-344). Error → 400 `Error: …` (ProductController.cs:346-349).
- **Configuración usada:** `Conexion.dll` (SIGMavi).
- **Pendientes conocidos:** ninguno propio.

### GET /product/crosssell  (ProductController.GetCrossSell, ProductController.cs:352-366)

- **Para qué sirve:** devuelve los artículos que SAP sugiere vender junto con uno dado (venta cruzada).
- **Quién la llama:** no está identificado en el código ni en el tracker. La exportación usa el mismo método (EcommerceMethods.cs:1605).
- **Entrada:** en la query, `articulo` (texto; Web API la exige porque no tiene valor por omisión) y `vkorg` (texto, opcional, `01` por omisión) (ProductController.cs:354).
- **Cómo funciona (paso a paso):** llama a `ZAPI_CROSSSELL_SRV/HeaderSet(ARTICULO='<articulo>',VKORG='<vkorg>')/HeaderReturn` y convierte `d.results` (ProductMethods.cs:1092-1113).
- **Reglas de negocio:**
  - RPR-80: VKORG `01` por omisión (ProductController.cs:354; ProductMethods.cs:1089).
- **Fuentes de datos:** SAP OData DM03 `ZAPI_CROSSSELL_SRV`, lectura.
- **Salida y errores:** 200 con `[ { MatnrJer } ]`, un SKU relacionado por elemento (ArticuloCrossSell.cs:23-27). Error → 400 `Error, Ocurrio un error al intentar obtener crosssell del articulo <articulo>: …` (ProductMethods.cs:1115-1118).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** el artículo se pega a la llave sin escapar (RPR-124).

### GET /product/upsell  (ProductController.GetUpsell, ProductController.cs:368-382)

- **Para qué sirve:** devuelve los artículos de mayor gama que SAP sugiere en lugar de uno dado.
- **Quién la llama:** no está identificado en el código ni en el tracker. La exportación usa el mismo método (EcommerceMethods.cs:1640).
- **Entrada:** `articulo` (exigido por Web API) y `vkorg` (opcional, `02` por omisión) en la query (ProductController.cs:370).
- **Cómo funciona (paso a paso):** igual que crosssell, contra `ZAPI_UPSELL_SRV` (ProductMethods.cs:1124-1145).
- **Reglas de negocio:**
  - RPR-81: VKORG `02` por omisión (ProductController.cs:370).
- **Fuentes de datos:** SAP OData DM03 `ZAPI_UPSELL_SRV`, lectura.
- **Salida y errores:** 200 con `[ { MatnrJer } ]` (ArticuloUpsell.cs:23-27). Error → 400 `Error, …` (ProductMethods.cs:1147-1150).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** igual que crosssell.

### GET /product/sustitutos  (ProductController.GetSustitutos, ProductController.cs:384-398)

- **Para qué sirve:** devuelve los artículos que SAP propone como alternativa cuando uno no hay en existencia.
- **Quién la llama:** no está identificado en el código ni en el tracker. La exportación usa el mismo método (EcommerceMethods.cs:1675).
- **Entrada:** `articulo` (exigido por Web API) y `vkorg` (opcional, `03` por omisión) en la query (ProductController.cs:386).
- **Cómo funciona (paso a paso):** igual que crosssell, contra `ZAPI_SUSTITUTOS_SRV` (ProductMethods.cs:1156-1177).
- **Reglas de negocio:**
  - RPR-82: VKORG `03` por omisión (ProductController.cs:386).
- **Fuentes de datos:** SAP OData DM03 `ZAPI_SUSTITUTOS_SRV`, lectura.
- **Salida y errores:** 200 con `[ { MatnrJer } ]` (ArticuloSustitutos.cs:23-27). Error → 400 `Error, …` (ProductMethods.cs:1179-1182).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** igual que crosssell.

### GET /product/seo  (ProductController.GetArticulosSEO, ProductController.cs:400-414)

- **Para qué sirve:** consulta los textos SEO del artículo guardados en SAP: nombre largo, meta palabras y meta descripciones 1 a 3, descripciones largas de VIU y MAVI, y la marca de autorizado para venta.
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** en la query, opcionales: `material` o `matAutVta` (ProductController.cs:402).
- **Cómo funciona (paso a paso):**
  1. Arma la URL de `Z_SRVB_MM_ART/ArticuloDetalles` (ProductMethods.cs:1187).
  2. Si llegó `material` filtra por `Material`; si no, y llegó `matAutVta`, filtra por `MatautVta`; si no llegó ninguno, trae todo (ProductMethods.cs:1189-1192).
  3. Llama a S4 y devuelve `d.results` (ProductMethods.cs:1196-1210).
- **Reglas de negocio:**
  - RPR-83: `material` tiene prioridad sobre `matAutVta`; no se combinan (ProductMethods.cs:1189-1192).
- **Fuentes de datos:** SAP OData `Z_SRVB_MM_ART` / `ArticuloDetalles`, lectura. El servicio no tiene ficha en `RSG\` (GUIA_MIGRACION_FABLE.md:418); sus campos son los mismos textos SEO que DM01 entrega como `NOMBRELARGOE`, `METAPALABRAS1E`…`MATERIALAUTORIZADOVENTA` (Product.cs:105-154).
- **Salida y errores:** 200 con `[ { Material, NombreLargo, MetaPalabras1e, MetaDesc1e, MetaPalabras2e, MetaDesc2e, MetaPalabras3e, MetaDesc3e, Desclviu, DesclMavi, MatautVta } ]` (ArticuloSEO.cs:5-39). Error → 400 `Error, Ocurrio un error al intentar obtener articulos SEO: …` (ProductMethods.cs:1212-1215).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** sin parámetros trae todos los artículos, sin paginar.

### POST /product/seo  (ProductController.CreateArticuloSEO, ProductController.cs:416-432)

- **Para qué sirve:** da de alta en SAP los textos SEO de un artículo.
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** cuerpo JSON `ArticuloSEO` con `Material`, `NombreLargo`, `MetaPalabras1e`, `MetaDesc1e`, `MetaPalabras2e`, `MetaDesc2e`, `MetaPalabras3e`, `MetaDesc3e`, `Desclviu`, `DesclMavi`, `MatautVta`, todos texto. El código no valida ninguno (ArticuloSEO.cs:5-39; ProductMethods.cs:1218-1250).
- **Cómo funciona (paso a paso):**
  1. Pide el token CSRF con un GET a la raíz del servicio `Z_SRVB_MM_ART` (ProductMethods.cs:1221-1226).
  2. Manda el cuerpo tal cual, con POST, a `ArticuloDetalles` (ProductMethods.cs:1228-1235).
  3. Si SAP no responde 2xx, lanza error (ProductMethods.cs:1238-1241).
  4. Da por buena el alta solo si SAP respondió 201 o 200 (ProductMethods.cs:1243-1244).
- **Reglas de negocio:**
  - RPR-84: Toda escritura en SAP lleva antes el token CSRF (ProductMethods.cs:1226, :1233; ver RPR-120).
  - RPR-85: Los campos que no se envían viajan a SAP como `null` (ProductMethods.cs:1228).
- **Fuentes de datos:** SAP OData `Z_SRVB_MM_ART` / `ArticuloDetalles`, **escritura** (alta).
- **Salida y errores:** 201 sin cuerpo si SAP respondió 201 o 200 (ProductController.cs:424-425). Otro 2xx → 400 `No se pudo crear el articulo SEO` (ProductController.cs:426). Error de SAP o del token → 400 `Error, Ocurrio un error al intentar crear articulo SEO: …` (ProductMethods.cs:1246-1249).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** ninguno propio.

### PATCH /product/seo/{material}  (ProductController.UpdateArticuloSEO, ProductController.cs:434-450)

- **Para qué sirve:** cambia en SAP los textos SEO de un artículo.
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** `material` en la ruta (texto, obligatorio) y cuerpo JSON `ArticuloSEO` (igual que el alta).
- **Cómo funciona (paso a paso):** pide el token CSRF y manda el cuerpo con PATCH a `ArticuloDetalles('<material>')` (ProductMethods.cs:1254-1269). Da por bueno el cambio solo si SAP respondió 204 o 200 (ProductMethods.cs:1277-1278).
- **Reglas de negocio:**
  - RPR-86: La llave es el `material` de la ruta; el `Material` del cuerpo no se compara con ella (ProductMethods.cs:1254, :1262).
  - RPR-87: Los campos que no se envían viajan como `null` (ProductMethods.cs:1262).
- **Fuentes de datos:** SAP OData `Z_SRVB_MM_ART` / `ArticuloDetalles('<material>')`, **escritura** (cambio).
- **Salida y errores:** 204 sin cuerpo si SAP respondió 204 o 200 (ProductController.cs:442-443). Otro 2xx → 400 `No se pudo actualizar el articulo SEO` (ProductController.cs:444). Error → 400 `Error, Ocurrio un error al intentar actualizar articulo SEO: …` (ProductMethods.cs:1280-1283).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** falta confirmar si SAP vacía los campos que llegan en `null` en un PATCH.

### DELETE /product/seo/{material}  (ProductController.DeleteArticuloSEO, ProductController.cs:452-468)

- **Para qué sirve:** borra en SAP los textos SEO de un artículo.
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** `material` en la ruta (texto, obligatorio).
- **Cómo funciona (paso a paso):** pide el token CSRF y manda DELETE a `ArticuloDetalles('<material>')` (ProductMethods.cs:1288-1300). Da por buena la baja solo si SAP respondió 204 o 200 (ProductMethods.cs:1308-1309).
- **Reglas de negocio:**
  - RPR-88: Lleva token CSRF como toda escritura (ProductMethods.cs:1294, :1298).
- **Fuentes de datos:** SAP OData `Z_SRVB_MM_ART` / `ArticuloDetalles('<material>')`, **escritura** (baja).
- **Salida y errores:** 204 sin cuerpo (ProductController.cs:460-461). Otro 2xx → 400 `No se pudo eliminar el articulo SEO` (ProductController.cs:462). Error → 400 `Error, Ocurrio un error al intentar eliminar articulo SEO: …` (ProductMethods.cs:1311-1314).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** ninguno propio.

### POST /product/obtenerImagen  (ProductController.ObtenerImagen, ProductController.cs:470-478)

- **Para qué sirve:** copia un archivo de imagen del share de imágenes optimizadas a la carpeta local del servidor, con el nombre que usará Magento. Es la partida E-14, portada de APIMagento (ProductController.cs:470-471; ProductImageMethods.cs:10-11).
- **Quién la llama:** nadie todavía; no existe ruta suya en la DMZ (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:130). El tracker relaciona la ruta LAN `product/obtenerImagen` con `ma/imagenes/optimizadas` (MAVI - DMZ-SAP.csv:132).
- **Entrada:** cuerpo JSON `ImageProduct` con `magentoName` (nombre con que se guarda en la carpeta local) y `originalName` (nombre en el share), ambos texto (ImageProductModels.cs:5-12).
- **Cómo funciona (paso a paso):**
  1. Arma la ruta de origen (share + `originalName`) y la de destino (carpeta local + `magentoName`) (ProductImageMethods.cs:38-39).
  2. Se conecta al share con una cuenta de red de servicio (impersonación) (ProductImageMethods.cs:41-44).
  3. Si el archivo de origen existe, crea la carpeta destino si hace falta y copia el archivo, sobrescribiendo (ProductImageMethods.cs:46-56).
  4. Responde `"Ok"` (ProductImageMethods.cs:60).
- **Reglas de negocio:**
  - RPR-89: Si el archivo de origen no existe, no copia nada y **de todos modos responde `"Ok"`** (ProductImageMethods.cs:46, :60).
  - RPR-90: Si no hay carpeta configurada en Web.config, se usan rutas de respaldo fijas en el código (ProductImageMethods.cs:14-15, :16-32).
- **Fuentes de datos:** share de imágenes optimizadas (lectura) y carpeta local de imágenes (**escritura**).
- **Salida y errores:** siempre 200 con un texto: `"Ok"` o el mensaje del error, que además se registra como `[PRODUCT obtenerImagen ERROR]` (ProductImageMethods.cs:62-68; ProductController.cs:477). Si la impersonación falla, el texto es `LogonUser failed with error code: …` (Impersonation.cs:26-29). Si el cuerpo no llega, `images` queda nulo y el controlador falla al leerlo → 500 con el detalle del error (ProductController.cs:477; Web.config:94).
- **Configuración usada:** `IMAGES_PRODUCT_SHARE_PATH`, `IMAGES_PRODUCT_PATH`, `SMB_IMPERSONATION_USER`, `SMB_IMPERSONATION_DOMAIN`, `SMB_IMPERSONATION_PASSWORD` (ProductImageMethods.cs:20, :29, :42-44).
- **Pendientes conocidos:**
  - Avance 55 %, bloqueada por H-02 (la impersonación): desde desarrollo la conexión al share falla con `LogonUser failed with error code: 1326` (Windows no acepta el usuario o la contraseña), igual que en el legado, así que la copia no se pudo verificar; la validación quedó para QA (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:61, :130, :134).
  - Los nombres de archivo se combinan con la ruta sin validar, así que admiten `..\` (recorrido de rutas) (ProductImageMethods.cs:38-39; AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:652).
  - No hay `try` en el controlador ni validación de cuerpo nulo (ProductController.cs:474-478).

### POST /catalog/cargaCompleta  (CatalogController.CargaCompleta, CatalogController.cs:27-48)

- **Para qué sirve:** refresca de una sola vez el catálogo de Magento guardado en SQLite (tiendas por producto, opciones de atributos, atributos, sets, categorías y atributos por set), en el orden en que lo hace el legado. El importador de productos lee esas tablas (CatalogController.cs:18-26).
- **Quién la llama:** nadie todavía. En el legado no son rutas: las llaman por dentro `product/updateProduct` y `product/updateConfigurableProduct` de APIMagento, y quién las disparará queda pendiente (CatalogController.cs:8-13; CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:200).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. E-22 tiendas por producto (CatalogController.cs:34; ver `catalog/productWithWebsites`).
  2. E-16 opciones de atributos (CatalogController.cs:35; ver `catalog/attributes`).
  3. E-17 atributos generales (CatalogController.cs:36).
  4. E-18 sets de atributos (CatalogController.cs:37).
  5. E-20 categorías (CatalogController.cs:38).
  6. E-19 atributos por set (CatalogController.cs:39). Va al final porque lee lo que dejan E-16 y E-18 (CatalogController.cs:18-20).
- **Reglas de negocio:**
  - RPR-91: El orden importa; desordenadas no fallan, pero dejan la tabla de E-19 incompleta sin avisar (CatalogController.cs:18-20).
  - RPR-92: No incluye `deletePromociones`, porque vaciaría las categorías OUTLET sin nadie que las vuelva a llenar (CatalogController.cs:22-26).
  - RPR-93: Tampoco incluye la carga de hijos de configurables (E-21), que tiene ruta propia (`catalog/children`) (CatalogController.cs:34-39, :166-187).
  - RPR-94: Si un paso falla, los anteriores ya quedaron escritos y los siguientes no se ejecutan (CatalogController.cs:32-47).
- **Fuentes de datos:** las de cada carga (ver sus rutas): DMZ (lectura) y SQLite `data.db` (**escritura**).
- **Salida y errores:** 200 `true`. Error → se registra `[CATALOG cargaCompleta ERROR]` en el log y responde 500; con `customErrors` en `Off` la respuesta incluye el mensaje y la pila (CatalogController.cs:43-47; Web.config:94).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`, `SQLITE_DB_PATH`, `IGNORE_ATTRIBUTES_PATH`.
- **Pendientes conocidos:** falta definir quién la agenda (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:200). El tramo de E-19 que escribe en MySQL e Intelisis no está portado (ver `catalog/attributeSetChildren`).

### POST /catalog/deletePromociones  (CatalogController.DeletePromociones, CatalogController.cs:54-68)

- **Para qué sirve:** ⚠️ **escribe en Magento**: vacía las categorías cuyo nombre contiene OUTLET en las cuatro tiendas, quitándoles sus productos. El artículo no se borra; solo pierde la asignación a la categoría (CatalogController.cs:50-53; MagentoCatalogMethods.cs:212-215).
- **Quién la llama:** nadie todavía. En el legado es el paso previo a la importación, y son los pasos del importador los que vuelven a llenar esas categorías (CatalogController.cs:50-53). El código lo llama E-24 y el checklist E-23 (MagentoCatalogMethods.cs:210; CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:213).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** llama a la DMZ `magento/deletePromociones`, registra la respuesta y la devuelve (MagentoCatalogMethods.cs:219-224).
- **Reglas de negocio:**
  - RPR-95: No debe dispararse suelta sin coordinar con el importador (CatalogController.cs:50-53).
  - RPR-96: El legado descartaba la respuesta; aquí se devuelve y se registra (MagentoCatalogMethods.cs:217-218).
  - RPR-132: Si la DMZ falla, la llamada se repite hasta 3 veces como cualquier otra (RPR-123), aunque esta escribe en Magento (Curl.cs:111-144).
- **Fuentes de datos:** DMZ `magento/deletePromociones` (GET), que **escribe en Magento**.
- **Salida y errores:** 200 con el texto que devuelve la DMZ. Error → log `[CATALOG deletePromociones ERROR]` y 500 (CatalogController.cs:63-67).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`.
- **Pendientes conocidos:** escrita el 7 sep y nunca ejecutada, porque escribe en Magento (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:216).

### POST /catalog/deleteReservations  (CatalogController.DeleteReservations, CatalogController.cs:70-84)

- **Para qué sirve:** ⚠️ **escribe en Magento**: vacía las reservas de inventario de Magento (MagentoCatalogMethods.cs:228-231).
- **Quién la llama:** nadie todavía. En el legado la disparaba `product/updateStock`, no la importación de productos (MagentoCatalogMethods.cs:230-231). El código la llama E-25 y el checklist E-24 (MagentoCatalogMethods.cs:228; CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:214).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** llama a la DMZ `magento/deleteReservations`, registra la respuesta y la devuelve (MagentoCatalogMethods.cs:232-237).
- **Reglas de negocio:**
  - RPR-97: Va ligada a la actualización de existencias, no a la carga de catálogo (MagentoCatalogMethods.cs:230-231).
- **Fuentes de datos:** DMZ `magento/deleteReservations` (GET), que **escribe en Magento**.
- **Salida y errores:** 200 con el texto de la DMZ. Error → log `[CATALOG deleteReservations ERROR]` y 500 (CatalogController.cs:79-83).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`.
- **Pendientes conocidos:** escrita y nunca ejecutada (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:216).

### POST /catalog/attributes  (CatalogController.Attributes, CatalogController.cs:86-100)

- **Para qué sirve:** E-16. Guarda en SQLite las opciones de cada atributo de lista de Magento (por ejemplo los colores posibles) (MagentoCatalogMethods.cs:49-89).
- **Quién la llama:** nadie todavía; también corre dentro de `catalog/cargaCompleta` (CatalogController.cs:35).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. Pide a la DMZ `magento/attributes` (MagentoCatalogMethods.cs:53).
  2. Quita los escapes del texto y cambia los acentos escapados por la letra sin acento (MagentoCatalogMethods.cs:55-58, :356-373).
  3. Vacía la tabla `attribute_options` y reinicia su contador (MagentoCatalogMethods.cs:62-64).
  4. Inserta una fila por opción (MagentoCatalogMethods.cs:66-85).
- **Reglas de negocio:**
  - RPR-98: Se saltan los atributos sin opciones y las opciones con valor vacío (MagentoCatalogMethods.cs:68-74).
  - RPR-99: La etiqueta se recodifica igual que en el legado y los apóstrofos dobles pasan a comillas (MagentoCatalogMethods.cs:76-81).
  - RPR-100: Las vocales acentuadas escapadas (`á`, `é`, `í`, `ó`, `ú` y sus mayúsculas) pasan a la vocal sin acento, la `ñ` pasa a `n` y la `Ñ` a `N`; la `ü` y la `Ü` se conservan con diéresis (MagentoCatalogMethods.cs:354-373).
  - RPR-101: La tabla se vacía solo después de recibir y leer la respuesta de Magento: si la DMZ falla, la tabla queda como estaba (MagentoCatalogMethods.cs:53-64).
- **Fuentes de datos:** DMZ `magento/attributes` (lectura); SQLite `attribute_options` (**escritura**: borra todo e inserta).
- **Salida y errores:** 200 `true`. Error → log `[CATALOG attributes ERROR]` y 500 (CatalogController.cs:95-99). Una inserción que falle se pierde sin avisar (RPR-125).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`, `SQLITE_DB_PATH`.
- **Pendientes conocidos:** ver RPR-125.

### POST /catalog/generalAttributes  (CatalogController.GeneralAttributes, CatalogController.cs:102-116)

- **Para qué sirve:** E-17. Guarda en SQLite la lista de atributos de Magento (id y código) (MagentoCatalogMethods.cs:93-120).
- **Quién la llama:** nadie todavía; también corre dentro de `catalog/cargaCompleta` (CatalogController.cs:36).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** pide `magento/general/attributes`, limpia el texto, vacía `attributes` e inserta una fila por atributo (MagentoCatalogMethods.cs:97-116).
- **Reglas de negocio:**
  - RPR-102: Misma limpieza de acentos que E-16 (MagentoCatalogMethods.cs:99-102).
- **Fuentes de datos:** DMZ `magento/general/attributes` (lectura); SQLite `attributes` (**escritura**).
- **Salida y errores:** 200 `true`. Error → log `[CATALOG generalAttributes ERROR]` y 500 (CatalogController.cs:111-115).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`, `SQLITE_DB_PATH`.
- **Pendientes conocidos:** ninguno propio.

### POST /catalog/attributeSets  (CatalogController.AttributeSets, CatalogController.cs:118-132)

- **Para qué sirve:** E-18. Guarda en SQLite los sets de atributos de Magento (id y nombre) (MagentoCatalogMethods.cs:124-148).
- **Quién la llama:** nadie todavía; también corre dentro de `catalog/cargaCompleta` (CatalogController.cs:37).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** pide `magento/attributeSets`, limpia el texto, vacía `attribute_sets` e inserta una fila por set (MagentoCatalogMethods.cs:128-144).
- **Reglas de negocio:**
  - RPR-103: Aquí solo se quitan las comillas escapadas y los acentos; no se tocan las diagonales (MagentoCatalogMethods.cs:130).
- **Fuentes de datos:** DMZ `magento/attributeSets` (lectura); SQLite `attribute_sets` (**escritura**).
- **Salida y errores:** 200 `true`. Error → log `[CATALOG attributeSets ERROR]` y 500 (CatalogController.cs:127-131).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`, `SQLITE_DB_PATH`.
- **Pendientes conocidos:** ninguno propio.

### POST /catalog/attributeSetChildren  (CatalogController.AttributeSetChildren, CatalogController.cs:134-148)

- **Para qué sirve:** E-19. Por cada set de atributos guarda en SQLite qué atributos tiene y si cada uno es de lista (tiene opciones) o de texto libre (MagentoCatalogMethods.cs:152-206).
- **Quién la llama:** nadie todavía; también corre al final de `catalog/cargaCompleta` (CatalogController.cs:39).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. Vacía `atributos_de_magento` (MagentoCatalogMethods.cs:163-165).
  2. Lee del archivo `ignoreAttributes.txt` la lista de atributos que se saltan (MagentoCatalogMethods.cs:167-168).
  3. Lee de SQLite los sets que dejó E-18 (MagentoCatalogMethods.cs:170-171).
  4. Por cada set pide a la DMZ `magento/attributeSetChildren/<id>` y recorta la respuesta como el legado (MagentoCatalogMethods.cs:174-187).
  5. Por cada atributo no ignorado busca si tiene opciones en `attribute_options` (E-16) e inserta `si` o `no` (MagentoCatalogMethods.cs:189-201).
- **Reglas de negocio:**
  - RPR-104: Un atributo de la lista de ignorados no se guarda (MagentoCatalogMethods.cs:191-192).
  - RPR-105: `valor_de_lista = 'si'` si el atributo tiene alguna opción en `attribute_options`; si no, `'no'`. La búsqueda usa `LIKE` con el código del atributo, así que en SQLite no distingue mayúsculas y un `_` del código funciona como comodín (MagentoCatalogMethods.cs:194-197).
  - RPR-106: Depende de E-16 y E-18; sin ellas el resultado sale incompleto sin avisar (CatalogController.cs:18-20).
- **Fuentes de datos:** archivo `ignoreAttributes.txt` (lectura); SQLite `attribute_sets` y `attribute_options` (lectura); DMZ `magento/attributeSetChildren/{id}`, una llamada por set (lectura); SQLite `atributos_de_magento` (**escritura**).
- **Salida y errores:** 200 `true`. Error → log `[CATALOG attributeSetChildren ERROR]` y 500 (CatalogController.cs:143-147). **La tabla se vacía antes de leer el archivo y antes de llamar a la DMZ**: si falta el archivo o falla un set, la tabla queda vacía o a medias (MagentoCatalogMethods.cs:163-176). Si falla la lectura de `attribute_sets` en SQLite, el error se traga y se devuelve una lista vacía (SQLiteDb.cs:178-209): no se procesa ningún set y la ruta responde `true` con la tabla vacía.
- **Configuración usada:** `IGNORE_ATTRIBUTES_PATH` (con ruta de respaldo fija, MagentoCatalogMethods.cs:38-47), `URL_DMZ`, `USER_DMZ`, `SQLITE_DB_PATH`.
- **Pendientes conocidos:**
  - Solo está portado el tramo de SQLite. El legado termina escribiendo en MySQL (`aplicaciones_web`) y ejecutando `SpWDM0285_AtributosdeMagento` en IntelisisTmp; ese tramo espera a que se cierre la exportación de artículos (MagentoCatalogMethods.cs:157-160; CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:196).
  - `ignoreAttributes.txt` debe viajar con el despliegue: si el archivo falta, la carga muere al empezar (MagentoCatalogMethods.cs:167), y sin su lista de 114 atributos de sistema E-19 escribiría el triple de filas (163 atributos por set en vez de 54) (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:198).

### POST /catalog/categories  (CatalogController.Categories, CatalogController.cs:150-164)

- **Para qué sirve:** E-20. Guarda en SQLite el árbol de categorías de Magento (id, nombre, nivel y padre) (MagentoCatalogMethods.cs:241-265).
- **Quién la llama:** nadie todavía; también corre dentro de `catalog/cargaCompleta` (CatalogController.cs:38).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** pide `magento/categories`, limpia el texto, vacía `categories` e inserta una fila por categoría (MagentoCatalogMethods.cs:245-261).
- **Reglas de negocio:**
  - RPR-107: Misma limpieza de acentos que E-18 (MagentoCatalogMethods.cs:247).
- **Fuentes de datos:** DMZ `magento/categories` (lectura); SQLite `categories` (**escritura**).
- **Salida y errores:** 200 `true`. Error → log `[CATALOG categories ERROR]` y 500 (CatalogController.cs:159-163). Un nombre de categoría con apóstrofo rompe su inserción, que se pierde sin avisar (RPR-125).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`, `SQLITE_DB_PATH`.
- **Pendientes conocidos:** ver RPR-125.

### POST /catalog/children  (CatalogController.Children, CatalogController.cs:168-187)

- **Para qué sirve:** E-21. Guarda en SQLite los productos hijo (los que cuelgan de un configurable) de las tres tiendas. Replica la secuencia de `product/updateConfigurableProduct` del legado (CatalogController.cs:166-167).
- **Quién la llama:** nadie todavía (CatalogController.cs:8-13).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. Vacía `children` una sola vez (CatalogController.cs:175; MagentoCatalogMethods.cs:273-279).
  2. Carga las tiendas `all`, `viu` y `muebles_america`, en ese orden, sobre la misma tabla (CatalogController.cs:176-178).
  3. Cada tienda se pide por páginas de 1 000 hasta que llega una página vacía (MagentoCatalogMethods.cs:288-307).
- **Reglas de negocio:**
  - RPR-108: Las tres tiendas se acumulan en la misma tabla (MagentoCatalogMethods.cs:271-272).
  - RPR-109: Páginas de 1 000; se detiene con una página vacía o sin `items` (MagentoCatalogMethods.cs:290, :294-295, :307).
- **Fuentes de datos:** DMZ `magento/children/{page}/1000/{store}` (lectura); SQLite `children` (**escritura**).
- **Salida y errores:** 200 `true`. Error → log `[CATALOG children ERROR]` y 500; lo ya insertado se queda (CatalogController.cs:182-186).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`, `SQLITE_DB_PATH`.
- **Pendientes conocidos:** ninguno propio.

### POST /catalog/children/{store}  (CatalogController.Children(store), CatalogController.cs:189-203)

- **Para qué sirve:** carga los productos hijo de una sola tienda.
- **Quién la llama:** nadie todavía.
- **Entrada:** `store` en la ruta (texto, obligatorio): `all`, `viu` o `muebles_america`. El código no lo valida.
- **Cómo funciona (paso a paso):** igual que el paso 3 de `catalog/children`, para esa tienda (MagentoCatalogMethods.cs:281-311).
- **Reglas de negocio:**
  - RPR-110: **No vacía la tabla antes**: si se llama sola, duplica las filas que ya estaban (CatalogController.cs:196; MagentoCatalogMethods.cs:281-311).
- **Fuentes de datos:** DMZ `magento/children/{page}/1000/{store}` (lectura); SQLite `children` (**escritura**, solo inserta).
- **Salida y errores:** 200 `true`. Error → log `[CATALOG children ERROR]` y 500 (CatalogController.cs:198-202).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`, `SQLITE_DB_PATH`.
- **Pendientes conocidos:** ver RPR-110.

### POST /catalog/productWithWebsites  (CatalogController.ProductWithWebsites, CatalogController.cs:205-219)

- **Para qué sirve:** E-22. Guarda en SQLite en qué tiendas (sitios web de Magento) está publicado cada SKU (MagentoCatalogMethods.cs:315-350).
- **Quién la llama:** nadie todavía; también es el primer paso de `catalog/cargaCompleta` (CatalogController.cs:34).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. Vacía `product_in_stores` (MagentoCatalogMethods.cs:324-325).
  2. Pide los productos por páginas de 1 000 hasta una página vacía (MagentoCatalogMethods.cs:327-346).
  3. Guarda por SKU la lista de ids de sitio separada por comas (MagentoCatalogMethods.cs:338-339).
- **Reglas de negocio:**
  - RPR-111: `store` = ids de sitio web unidos con coma (MagentoCatalogMethods.cs:339).
- **Fuentes de datos:** DMZ `magento/productWithWebsites/{page}/1000` (lectura); SQLite `product_in_stores` (**escritura**).
- **Salida y errores:** 200 `true`. Error → log `[CATALOG productWithWebsites ERROR]` y 500. Como la tabla se vacía antes de pedir la primera página, un error deja la tabla vacía o a medias (CatalogController.cs:214-218; MagentoCatalogMethods.cs:324-329).
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`, `SQLITE_DB_PATH`.
- **Pendientes conocidos:** ninguno propio.

### GET /ma/imagenes/optimizadas  (ImagenController.GetArticulosConImagen, ImagenController.cs:20-39)

- **Para qué sirve:** dice cuántos artículos tienen imagen optimizada lista para la tienda y muestra los primeros 100.
- **Quién la llama:** el tracker la da como reemplazo de la ruta LAN `product/obtenerImagen` (MAVI - DMZ-SAP.csv:132), con la equivalencia de contrato por verificar (AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:111). La exportación usa el mismo método (EcommerceMethods.cs:621).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. Si hay lista en caché y no ha vencido, la usa (ImagenMethods.cs:24-25).
  2. Si no, consulta SIGMavi y guarda la lista en caché por 30 minutos (ImagenMethods.cs:27-59).
  3. Responde el total y los primeros 100 SKU (ImagenController.cs:28-33).
- **Reglas de negocio:**
  - RPR-112: Un artículo tiene imagen optimizada si en `ecommerceactualizarimagenes` hay una imagen con nombre `<SCMArtImagen.Imagen>_<SCMArtImagen.Valor>.JPG`, que no esté `ELIMINADO` y cuyo `Orden` en `SCMArtImagen` sea 1 (la imagen principal) (ImagenMethods.cs:34-40).
  - RPR-113: La caché dura 30 minutos y es compartida por todo el servicio, incluida la exportación (ImagenMethods.cs:14-16, :58-59).
  - RPR-114: `total` es el número completo; `data` trae solo 100, sin orden definido (ImagenController.cs:31-32).
- **Fuentes de datos:** SIGMavi `ecommerceactualizarimagenes`, `SCMArtImagen`, lectura (tiempo límite 120 s, ImagenMethods.cs:44).
- **Salida y errores:** 200 con `{ success: true, total, data: [ "<sku>", … ] }` (ImagenController.cs:28-33). Error → 400 `Error: Error al obtener artículos con imagen: …` (ImagenMethods.cs:61-64; ImagenController.cs:35-38).
- **Configuración usada:** `Conexion.dll` (SIGMavi).
- **Pendientes conocidos:** es la única consulta del área que abre SIGMavi en modo síncrono (ImagenMethods.cs:32). `ImagenMethods` tiene su propio filtro de imagen que nadie usa; la exportación usa el de `EcommerceMethods` (ImagenMethods.cs:72-83; EcommerceMethods.cs:1291).

### GET /ma/imagenes/optimizadas/refresh  (ImagenController.GetArticulosConImagenRefresh, ImagenController.cs:41-60)

- **Para qué sirve:** igual que la anterior, pero ignora la caché y vuelve a consultar SIGMavi.
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** llama a la misma consulta forzando la recarga y renueva la caché por 30 minutos (ImagenController.cs:47; ImagenMethods.cs:22-25, :58-59).
- **Reglas de negocio:**
  - RPR-115: La recarga también afecta a la siguiente exportación, porque la caché es compartida (ImagenMethods.cs:14-15).
- **Fuentes de datos:** SIGMavi, igual que la anterior.
- **Salida y errores:** iguales a la anterior (ImagenController.cs:49-59).
- **Configuración usada:** `Conexion.dll` (SIGMavi).
- **Pendientes conocidos:** ninguno propio.

### POST /ma/imagenes/cache/clear  (ImagenController.ClearCache, ImagenController.cs:62-75)

- **Para qué sirve:** borra la caché de artículos con imagen; la siguiente consulta irá a SIGMavi.
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):** vacía la lista y su vencimiento (ImagenMethods.cs:88-92).
- **Reglas de negocio:**
  - RPR-116: No consulta nada; solo invalida la caché compartida (ImagenMethods.cs:90-91).
- **Fuentes de datos:** ninguna.
- **Salida y errores:** 200 `{ success: true, message: "Cache limpiado" }`. Error → 400 `Error: …` (ImagenController.cs:69-74).
- **Configuración usada:** ninguna.
- **Pendientes conocidos:** ninguno propio.

### GET /etiquetas  (EtiquetasController.GetEtiquetas, EtiquetasController.cs:10-25)

- **Para qué sirve:** consulta en SAP una etiqueta promocional (texto como "Hot Sale", colores, vigencia, campaña, familia y línea) con la lista de SKU a los que aplica.
- **Quién la llama:** no está identificado en el código ni en el tracker.
- **Entrada:** `idEtiqueta` en la query (texto; el código lo declara opcional) (EtiquetasController.cs:13). El controlador no tiene prefijo: la ruta es `/etiquetas` (EtiquetasController.cs:8, :12).
- **Cómo funciona (paso a paso):** llama a DM05 `HEADERSet` con `$expand=itemSet` y `$filter=ZIDETIQUETA eq '<idEtiqueta>'`, idioma ES (ProductMethods.cs:1347-1367).
- **Reglas de negocio:**
  - RPR-117: El filtro por id se aplica siempre: sin `idEtiqueta` el filtro queda `ZIDETIQUETA eq ''` y no lista todas (ProductMethods.cs:1349).
  - RPR-118: Siempre trae los artículos de la etiqueta (`itemSet`) (ProductMethods.cs:1349).
- **Fuentes de datos:** SAP OData DM05 `ZAPI_ZMMT_ETIQUETA_SRV` / `HEADERSet` + `itemSet`, lectura.
- **Salida y errores:** 200 con `[ { ZIDETIQUETA, VKORG, ZCAMPANA, CLASS, MATKL, ZFECHAINICIO, ZFECHAFIN, ZTEXTOETIQUETA, ZCOLORTEXTOD, ZCOLORFONDOD, ZCOLORTEXTOH, ZCOLORFONDOH, ZCRITERIOS, ZCANTIDAD, ZPESOVOLUMETRICO, ZAGREGAREMOJI, ZEMOJI, itemSet: { results: [ { Matnr } ] } } ]` (Etiquetas.cs:17-101). Error → 400 `Error, Ocurrio un error al intentar obtener etiquetas: …` (ProductMethods.cs:1369-1372; EtiquetasController.cs:21-24).
- **Configuración usada:** `Conexion.dll`.
- **Pendientes conocidos:** solo está la consulta; DM05 también permite alta, cambio y baja (`RSG\dm05_etiquetas.md`). `GetEtiquetas` es un duplicado exacto sin llamadores, marcado para borrar (ProductMethods.cs:1316-1345).

---

### Reglas comunes del área

- RPR-119: **S4.** La URL base sale de `Conexion.dll` con el nodo `ENVIROMENT_DEV` + `SERVICE_URL`, que son los valores de Dev (decisión DU1), y todas las llamadas llevan `sap-client=110` (por ejemplo ProductMethods.cs:38, :1092). Las credenciales del usuario de servicio también salen de `Conexion.dll` (`usuarioServicio`, `contrasenaServicio`), se guardan en memoria y viajan como autenticación básica. El cliente acepta cualquier certificado y espera 60 s por respuesta (TokenGenerator.cs:60-82, :113-133).
- RPR-120: **Escritura en S4.** Antes de cada alta, cambio o baja se pide el token CSRF con un GET y `X-CSRF-Token: fetch`; un token vacío o `Required` es error (TokenGenerator.cs:135-171).
- RPR-121: **SIGMavi.** La conexión sale de `Conexion.dll` (`getconexion(<Server>, "SIGMavi")`), no de las cadenas de conexión del Web.config; decisión DU19 aceptada (ConexionSQL.cs:11-38, :72-98). El alias `Server` se lee de `applicationSettings` del Web.config (Web.config:157-163), con valor por omisión en `Properties\Settings.settings` (Settings.settings:5). Todas las consultas del área son texto fijo de solo lectura con `WITH(NOLOCK)`.
- RPR-122: **AWS y API de configuraciones.** Usan un cliente sin las credenciales de S4, para no mandarlas a un tercero (TokenGenerator.cs:93-111; ProductMethods.cs:323-324, :372-373, :715-716).
- RPR-123: **DMZ.** Cada intento se autentica con `login/authenticate` usando `USER_DMZ`; se hacen hasta 3 intentos con espera de 2 y 4 segundos, cada uno con 30 s de límite, y se acepta cualquier certificado (Curl.cs:19-24, :30-65, :111-144). Si falta `URL_DMZ`, el cliente falla al crearse (Curl.cs:26-27); como se crea junto con `MagentoCatalogMethods` (MagentoCatalogMethods.cs:33) antes del `try` de cada ruta `catalog/*` (por ejemplo CatalogController.cs:31-32), la respuesta es 500 y no queda registro en el log.
- RPR-124: **Filtros OData.** Los valores que llegan del cliente (SKU, material, centro, almacén, artículo, id de etiqueta y los filtros libres) se pegan en la URL sin escapar comillas. Un apóstrofo rompe la consulta y en `filter/{filter}` cabe cualquier expresión (ProductMethods.cs:69, :137, :173, :210-216, :1092, :1190-1192, :1349; AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:653). Lo mismo pasa con la llave del SEO (`ArticuloDetalles('<material>')`, ProductMethods.cs:1254, :1288) y con los parámetros que van a AWS y a la API de configuraciones (`NOMBRECATALOGO`, `Class`), que tampoco se codifican (ProductMethods.cs:368, :711).
- RPR-125: **SQLite.** La base es `data.db` en la carpeta `SQLITE_DB_PATH` (con ruta de respaldo fija) (SQLiteDb.cs:11-21). Las inserciones se arman concatenando texto y `SetAsync` **se traga cualquier error**: una fila que falle (por ejemplo un texto con apóstrofo) se pierde sin aviso (MagentoCatalogMethods.cs:80-83, :257-258; SQLiteDb.cs:158-176). Las tablas no se crean desde el código; llegan con el `data.db` (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:178).
- RPR-126: **Autenticación.** Todas las rutas piden un JWT `Bearer` emitido por `login/auth` (ProductController.cs:17; CatalogController.cs:14; ImagenController.cs:9; EcommerceController.cs:8; EtiquetasController.cs:10). Sin token → 401 (el manejador deja pasar la petición y la rechaza el atributo `[Authorize]`); token inválido o vencido → 401; otro error al validarlo (por ejemplo un texto que no es JWT) → 500 (TokenValidationHandler.cs:33-79). El token se valida con `JWT_SECRET_KEY`, `JWT_AUDIENCE_TOKEN` y `JWT_ISSUER_TOKEN` (TokenValidationHandler.cs:47-49).
- RPR-127: **Errores.** `product/*` (salvo `product/obtenerImagen`, RPR-89, y `product/exportaart`, que se traga los errores), `ecommerce/*`, `ma/imagenes/*` y `etiquetas` responden 400 con `Error, <mensaje>` o `Error: <mensaje>`, y el mensaje incluye el código y el cuerpo que devolvió SAP (por ejemplo ProductMethods.cs:50-51, :59-62). `catalog/*` responde 500 y escribe en el log. Solo `catalog/*` y `product/obtenerImagen` escriben en el log de archivo `sap.log` (CatalogController.cs:45; ProductImageMethods.cs:64). Las cargas de `catalog/*` también dejan una línea cuando terminan bien, con el número de filas o sets procesados, o con la respuesta de la DMZ en las dos limpiezas (MagentoCatalogMethods.cs:87, :118, :146, :204, :222, :235, :263, :309, :348). `Logger` escribe en la carpeta de logs del servidor si existe y además en `Logs\sap.log` dentro de la aplicación; los errores al escribir se ignoran sin aviso (Logger.cs:8-44, catch vacíos en :23 y :41).
- RPR-128: **Nombres en el JSON de salida.** Web API serializa con Newtonsoft: los modelos que fijan el nombre con `JsonProperty` salen con el nombre de SAP (`Product`, `Etiqueta`); los que solo lo fijan con `JsonPropertyName` salen con el nombre de la propiedad en C# (por ejemplo `MaestraDima` en la jerarquía, `IdConfiguracionCatalogos` en los catálogos) (Product.cs:9-10; Etiquetas.cs:19-20; JerarquiaArticulo.cs:14-15; AlmacenesConfig.cs:67-68).
- RPR-129: **Tipos de material.** El JSON se lee una sola vez por proceso y se guarda en memoria; si el archivo falta, la exportación responde vacía y `ecommerce/listado` responde 400 (CatalogoMethods.cs:19-53). `GetTiposMaterial`, `EsTipoValidoEcommerce`, `GetDescripcionTipo`, `GetTiposPorCategoria` y `RecargarCatalogo` no tienen llamadores (CatalogoMethods.cs:59-115).
- RPR-130: **`CatalogoEstados`** convierte el nombre de un estado de México a su clave de 3 letras (por ejemplo `Jalisco` → `JAL`) o valida una clave; si no la encuentra devuelve vacío. El nombre debe coincidir exacto, acentos incluidos, aunque sin distinguir mayúsculas. Hoy no lo usa ninguna ruta (CatalogoEstados.cs:9-61).
- RPR-131: **Modelos sin uso.** En `Models\Ecommerce\` hay clases definidas que ningún controlador ni método usa: `ArticuloConfigurable`, `ArticuloMarketing`, `ArticuloPromocion`, `CarruselCategoria`, `CategoriaArticulo`, `ConfiguracionConfigurable`, `ConfiguracionSet`, `DisponiblePorAlmacen`, `EcommerceActualizarImagen`, `EcommerceExportaArt`, `ArticuloImagen`, `ValidacionImagenResponse`, `FamiliaLineaCategoria`, `FamiliaValida`, `PrecioArticulo`, `PrecioEspecial`, `ProductoConfigurable`, `RelacionCandidato`, `SCMArtImagen`, `SIPCarrusel`, `SIPCategoria`, `SetPropiedad`, `SuperPromo` y `ConfiguracionAlmacenesResponse`. `Models\Ecommerce\ArticuloIEMay.cs` (campos `FamiliaIntelisis` y `LineaIntelisis`) tampoco se usa: el código usa la clase del mismo nombre de `Models\Database\ArticuloIEMay.cs` (campos `Familia` y `Linea`) (ArticuloIEMay.cs en `Models\Ecommerce\`, líneas 8-15; ProductMethods.cs:689-696).

---

## Ventas, monedero, abonos, SEPOMEX y listas de precios

**Qué hace esta área en el negocio.** Reúne las consultas de "después de la venta" y de cobranza del cliente, más algunos catálogos de apoyo:

- **Ventas (SD36 y PV02).** Consulta documentos de venta que ya existen en SAP, por número o con un filtro libre, y da de alta una "transacción de venta POS" (PV02). La consulta SD36 también la usan, como método de apoyo, rutas de otras áreas (`order/*` y `customerService/obtenerCreditos`).
- **MovBita.** Bitácora de eventos de un documento de venta (tabla Z `ZSDT_MOVBITA`): módulo, evento, observaciones de reanálisis, tipo de respuesta y cita con cliente o aval, según los campos del modelo (MovBitaResponse.cs:18-64).
- **Abonos y cobranza.** Qué debe el cliente (EX01, documentos no compensados), las parcialidades de una factura (TZ01), sus cobros referenciados y su cuenta CLABE STP. Dos rutas del flujo "Neko" son stubs: responden éxito sin hacer nada.
- **Monedero electrónico.** Número y saldo del monedero del cliente (SD18), y cuánto de una compra cuenta para redimir monedero (catálogos de AWS + artículos DM01).
- **SEPOMEX.** Catálogo de códigos postales (estado, municipio, colonias) del Servicio Postal Mexicano.
- **Listas de precios (SD29).** No tiene ruta propia. Son métodos de apoyo que usan el alta de pedidos, el crédito web y el listado e-commerce.

**Términos que se repiten.**
- *OData*: protocolo REST de SAP. `$filter` es el filtro de la consulta (por ejemplo `Bp eq '123'`), `$expand` trae tablas hijas y `$format=json` pide la respuesta en JSON. En OData V2 la lista viene en `d.results` y en OData V4 en `value`.
- *S4*: SAP S/4HANA. *Mandante* (`sap-client`): la "instancia lógica" de SAP; aquí siempre es `110` (Dev).
- *BP*: Business Partner, el número de cliente en SAP. *VBELN*: número de documento de venta o factura.
- *Conexion.dll*: librería interna que entrega la URL base de S4 y el usuario de servicio (`Conexion.Data.obtenerUrl`).
- *UEN*: unidad de negocio: 1 = Muebles América y 2 = VIU (EcommerceMethods.cs:27; OrderMethods.cs:744).

---

### POST /sale/transaction  (SaleController.InsertTransaction, SaleController.cs:18-35)
- **Para qué sirve:** Registra en SAP una transacción de venta tipo POS, el objeto "BAPITRANSACTION" del servicio "PV02 Ventas" (Transaction.cs:9-12; SalesMethods.cs:19-22).
- **Quién la llama:** No aparece en el tracker `MAVI - DMZ-SAP.csv`. No se conoce llamador.
- **Entrada:** cuerpo JSON `Transaction` (Transaction.cs:12-46), todo de tipo texto:
  - Cabecera (unos 29 campos): `Retailstoreid`, `Businessdaydate`, `Transactiontypecode`, `Workstationid`, `Transactionsequencenumber`, `Begindatetimestamp`, `Enddatetimestamp`, `Operatorid`, `Transactioncurrency`, `Partnerid`, `Customeridpos`, campos `Orig*` de la transacción original y `Logsys` (Transaction.cs:14-42).
  - `TransactionExtSet`: lista de extensiones `Fieldgroup` / `Fieldname` / `Fieldvalue` (TransactionExtSet.cs:8-13).
  - `RetailLineItemSet`: líneas de venta (`Itemid`, `Retailquantity`, `Salesamount`, `Normalsalesamount`, `Actualunitprice`, `Serialnumber`, `Promotionid`, `OrderChannel`, …) (RetailLineItem.cs:11-50).
  - `TenderSet`: formas de pago (`Tendertypecode`, `Tenderamount`, `Tendercurrency`, `Accountnumber`, `Referenceid`, …) (TenderSet.cs:8-23).
  - Solo se exige que el cuerpo exista. Ningún campo se valida (SaleController.cs:22-25).
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo no llega o no se puede leer, responde 400 (SaleController.cs:22-25).
  2. Arma la URL `…/ZAPI_VENTAS_SRV/Ventas?sap-client=110` con la base de Conexion.dll (SalesMethods.cs:28).
  3. Crea el cliente S4 con autenticación Basic (SalesMethods.cs:31).
  4. Serializa el `Transaction` tal como llegó, con System.Text.Json. Los nombres JSON son los de C# (`Retailstoreid`, `RetailLineItemSet`…). Después hace el POST (SalesMethods.cs:32-38).
  5. Si SAP no responde 2xx o la respuesta llega vacía, lanza error (SalesMethods.cs:42-45).
  6. Lee el nodo `d` de la respuesta y lo convierte a `Sale.Response` (SalesMethods.cs:46-49).
  7. El controlador ignora ese resultado y responde 200 con el mismo `Transaction` que recibió (SaleController.cs:28-29).
- **Reglas de negocio:**
  - RVTA-1: El cuerpo es obligatorio. Si es nulo, responde 400 sin mensaje (SaleController.cs:22-25).
  - RVTA-2: El mandante es fijo, `sap-client=110` (Dev). Antes este era el único punto del proyecto con 100 (SalesMethods.cs:25-28).
  - RVTA-3: El payload se reenvía sin transformación: no hay defaults, mapeos ni redondeos (SalesMethods.cs:35-36).
  - RVTA-4: Lo que SAP contesta no llega al llamador. `Sale.Response` solo tiene clases anidadas, sin propiedades, así que el número de documento o los mensajes que genere SAP se pierden. El 200 devuelve el eco de la entrada (Response.cs:8-63; SalesMethods.cs:48; SaleController.cs:28-29).
- **Fuentes de datos:** S4 OData `ZAPI_VENTAS_SRV`, entidad `Ventas`, POST (escritura) (SalesMethods.cs:28).
- **Salida y errores:**
  - 200: el `Transaction` recibido (SaleController.cs:29).
  - 400 sin cuerpo: la entrada es nula (SaleController.cs:24).
  - 400 `{"Message":"Error, Ocurrio un error al intentar insertar la venta: Error al realizar la peticion a SAP. Status: … Content: …"}`: cualquier fallo. El texto incluye el cuerpo de error de SAP (SalesMethods.cs:44, :55; SaleController.cs:31-34).
  - No escribe log.
- **Configuración usada:** ninguna llave propia. URL base y usuario de S4 vienen de Conexion.dll (`Nodos.SERVICE_URL`, `usuarioServicio`, `contrasenaServicio`) (SalesMethods.cs:28; TokenGenerator.cs:70-71). `DOMINIO_SAP` se lee por medio de `CreateClientS4` (TokenGenerator.cs:115; RequestMethods.cs:13-16).
- **Pendientes conocidos:**
  - El POST no pide token CSRF (`X-CSRF-Token`) antes de escribir (SalesMethods.cs:31-38). Otras escrituras del proyecto sí lo piden con `TokenGenerator.GetTokenSapAsync` (TokenGenerator.cs:135-171; por ejemplo BusinessPartnerMethods.cs:81 y DeliveryAddressMethods.cs:80). Sin ese token, SAP Gateway normalmente rechaza las escrituras.
  - Se descarta la respuesta de SAP (ver RVTA-4).

### GET /sale/{documentId}  (SaleController.GetDocumentById, SaleController.cs:37-54)
- **Para qué sirve:** Consulta en SAP un documento de venta y sus posiciones a partir de su número de documento (SD36 "Consultar Documentos de Ventas desde POS") (SalesMethods.cs:59-62).
- **Quién la llama:** No aparece en el tracker DMZ. El manual técnico la lista junto a SD36 (`Manual Tecnico Servicio SAP 01092026.md:117`).
- **Entrada:** `documentId` (texto, en la ruta, obligatorio). Se compara contra `DocNumber` (VBELN) (SalesMethods.cs:65).
- **Cómo funciona (paso a paso):**
  1. Si `documentId` está vacío o solo tiene espacios, responde 400 (SaleController.cs:41-44).
  2. Arma `…/ZAPI_DOCVTAS_CHECK_CDS/ZAPI_DOCVTAS_CHECK?$expand=to_salesdoc_items&$filter=DocNumber eq '{documentId}'&sap-client=110&$format=json` (SalesMethods.cs:65).
  3. Hace un GET con el cliente S4 (SalesMethods.cs:68-73).
  4. Si SAP no responde 2xx o el cuerpo llega vacío, lanza error (SalesMethods.cs:77-80).
  5. Convierte `d.results` en una lista `SaleD` (SalesMethods.cs:81-84).
- **Reglas de negocio:**
  - RVTA-5: El número se usa tal como llega. No se rellena con ceros ni se escapa el apóstrofo (SalesMethods.cs:65).
  - RVTA-6: Solo se expanden las posiciones estándar (`to_salesdoc_items`), no las tablas Z `to_zsdt_vbak` y `to_zsdt_vbap` (SalesMethods.cs:65).
- **Fuentes de datos:** S4 OData `ZAPI_DOCVTAS_CHECK_CDS`, entidad `ZAPI_DOCVTAS_CHECK`, filtro `DocNumber eq '…'`, expand `to_salesdoc_items`. Solo lectura (SalesMethods.cs:65).
- **Salida y errores:**
  - 200: arreglo de `SaleD` (cabecera: `DocumentNumber`, `DocumentType`, `PurchaseNumberC`, `SalesOrganization`, `DistributionChannel`, `Customer`, `Total`, `NetValue`…, y `ToSaleDocumentItems.results` con las posiciones) (SaleD.cs:12-82; SaleDocumentItem.cs:9-38). Los nombres de salida son los de C#; ver RCOM-7.
  - 400 sin cuerpo: el parámetro está vacío (SaleController.cs:43).
  - 400 `{"Message":"Error, Ocurrio un error al intentar obtener el listado de documentos: …"}`: SAP respondió con error, el cuerpo llegó vacío o falló la red. El texto incluye el cuerpo de error de SAP (SalesMethods.cs:77-79, :90; SaleController.cs:50-53).
- **Configuración usada:** ninguna llave propia. Usa Conexion.dll y `DOMINIO_SAP` (ver RCOM-2).
- **Pendientes conocidos:** Según la ficha SD36, si no hay coincidencias SAP no regresa la lista sino un mensaje de error `ZSD 002` (`RSG/sd36_consultar_documentos.md:53-55`). La ficha no dice con qué código HTTP llega: si llega como error HTTP, aquí sale como 400 (SalesMethods.cs:77-79); el código no lo distingue de un fallo real.

### GET /sale/filter/{filters}  (SaleController.GetFilterDocuments, SaleController.cs:56-73)
- **Para qué sirve:** Consulta documentos de venta SD36 con un filtro OData libre que arma el llamador (SalesMethods.cs:94-97).
- **Quién la llama:** El tracker la propone para `order/getIntelisisStatuses` y `order/creditStatus/{idSolicitud}` del DMZ, aún sin conectar (`MAVI - DMZ-SAP.csv:80`, `:82`).
- **Entrada:** `filters` (texto, en la ruta, obligatorio). Debe ser una expresión `$filter` válida para SAP, por ejemplo `PurchNoC eq 'X'` (SalesMethods.cs:100).
- **Cómo funciona (paso a paso):**
  1. Si `filters` está vacío, responde 400 (SaleController.cs:60-63).
  2. Inserta el filtro sin cambios en `…/ZAPI_DOCVTAS_CHECK?$expand=to_salesdoc_items&$filter={filters}&sap-client=110&$format=json` (SalesMethods.cs:100).
  3. Hace el GET, valida la respuesta y convierte `d.results` en `List<SaleD>`, igual que la ruta anterior (SalesMethods.cs:103-119).
- **Reglas de negocio:**
  - RVTA-7: El filtro lo controla por completo el llamador. No se valida ni se codifica (SalesMethods.cs:100).
  - RVTA-8: Según la ficha SD36, el filtro debe incluir al menos `PurchNoC` (folio POS) o un campo equivalente. Si no, SAP responde `ZSD 001` (`RSG/sd36_consultar_documentos.md:25`).
- **Fuentes de datos:** S4 OData `ZAPI_DOCVTAS_CHECK_CDS` / `ZAPI_DOCVTAS_CHECK`, expand `to_salesdoc_items`, filtro libre. Solo lectura (SalesMethods.cs:100).
- **Salida y errores:** iguales a `GET /sale/{documentId}` (SaleController.cs:66-72; SalesMethods.cs:112-126).
- **Configuración usada:** ninguna llave propia (ver RCOM-2).
- **Pendientes conocidos:** El filtro viaja dentro de la ruta. ASP.NET rechaza por defecto caracteres como `:` `%` `&` `*` `?` en la ruta, y Web.config no cambia ese límite (Web.config:93). Por eso un filtro con fechas (`datetime'…T…:…'`) o con `%` no llega al código. Un `/` dentro del filtro parte la ruta en más segmentos y la petición ya no coincide con esta ruta (SaleController.cs:57).

### GET /movbita/events/{vbeln}  (MovBitaController.GetMovBitaEvents, MovBitaController.cs:12-27)
- **Para qué sirve:** Devuelve los eventos de la bitácora MovBita de un documento de venta (MovBitaMethods.cs:13-23).
- **Quién la llama:** No aparece en el tracker DMZ. El manual técnico la registra como "Consulta Estatus Bita", probada con éxito (`Manual Tecnico Servicio SAP 01092026.md:115`, `:492-496`).
- **Entrada:** `vbeln` (texto, en la ruta). No se valida (MovBitaController.cs:14-19).
- **Cómo funciona (paso a paso):**
  1. Lee la llave `URL_SALES_DISTRIBUTION_API`. Si no existe, lanza error (MovBitaMethods.cs:17-21).
  2. Arma `{URL_SALES_DISTRIBUTION_API}/AI_GET_ZSDT_MOVBITA?Vbeln={vbeln}` (MovBitaMethods.cs:23).
  3. Hace un GET con un `HttpClient` nuevo, sin cabecera de autorización (MovBitaMethods.cs:25-28).
  4. Si la respuesta no es 2xx, lanza error. Si viene vacía, devuelve una lista vacía (MovBitaMethods.cs:30-38).
  5. Convierte `d.results` en `List<MovBitaResult>`. Si falta el nodo, devuelve una lista vacía (MovBitaMethods.cs:40-41).
- **Reglas de negocio:**
  - RMOV-1: Una respuesta vacía no es error: se devuelve `[]` (MovBitaMethods.cs:35-38).
  - RMOV-2: `vbeln` va sin codificar ni rellenar (MovBitaMethods.cs:23).
  - RMOV-3: La consulta va a la API de Sales & Distribution de MAVI, no a S4 directo. El usuario confirmó que así es correcto (2026-09-09, `SKILL.md:110`).
- **Fuentes de datos:** API externa `URL_SALES_DISTRIBUTION_API`, recurso `AI_GET_ZSDT_MOVBITA` (tabla Z `ZSDT_MOVBITA`), GET de solo lectura (MovBitaMethods.cs:23).
- **Salida y errores:**
  - 200: arreglo de `MovBitaResult` con los nombres de SAP: `Mandt`, `Vbeln`, `Bstkd`, `Werks`, `BstkdE`, `Bname`, `IhrezE`, `Zmodulo`, `Zeventos`, `Zobsreanalisis`, `Ztiporespuesta`, `Zcitacliente` (bool), `Zcitaaval` (bool), `Zhoracita`, `Zfechacita` (MovBitaResponse.cs:18-64).
  - 400 `"Error al obtener eventos MovBita: Error intentando obtener los eventos MovBita: …"`: falta la llave, la API respondió con error o hubo un fallo de red (MovBitaMethods.cs:44-47; MovBitaController.cs:23-26).
  - No escribe log.
- **Configuración usada:** `URL_SALES_DISTRIBUTION_API` (MovBitaMethods.cs:17).
- **Pendientes conocidos:** Se crea un `HttpClient` por llamada y no se le fija timeout (MovBitaMethods.cs:25).

### POST /credit/GetAccountDebts  (AbonosController.GetAccountDebts, AbonosController.cs:18-32)
- **Para qué sirve:** Lista los documentos contables abiertos del cliente (EX01, "documentos no compensados"): facturas sin liquidar, anticipos sin aplicar y pagos parciales (AbonoMethods.cs:18-19; `RSG/ex01_documentos_no_compensados.md:9-10`).
- **Quién la llama:** DMZ `customerService/GetAccountDebts` (`MAVI - DMZ-SAP.csv:37`). Las rutas `mercancias/getAbonos`, `getProximosPagos` y `getSaldoVencido` apuntaban aquí y están deprecadas (`MAVI - DMZ-SAP.csv:133-135`).
- **Entrada:** cuerpo JSON dinámico con `ClientNumber` (texto, el número de cliente BP). El nombre distingue mayúsculas: debe llegar exactamente `ClientNumber` (AbonosController.cs:20, :24).
- **Cómo funciona (paso a paso):**
  1. Lee `request.ClientNumber` (AbonosController.cs:24).
  2. Toma la URL base de Conexion.dll y la ruta del servicio de la llave `ZAPI_EX01_NOCOMP_SRV`. Si a la ruta le falta la `/` inicial, se la agrega (AbonoMethods.cs:21-24).
  3. Arma `{base}{ruta}/DocNoCompSet?$filter=(Kunnr eq '{cliente}')&sap-client=110&$format=json` (AbonoMethods.cs:26).
  4. Hace el GET con el cliente S4 (AbonoMethods.cs:28-31).
  5. Si la respuesta es 2xx, convierte `d.results` en `List<DocNoCompResponse>`. Si falta el nodo, devuelve lista vacía (AbonoMethods.cs:33-43).
  6. Si no es 2xx, lanza `Error de SAP: {status}. Detalle: {cuerpo}` (AbonoMethods.cs:45-49).
- **Reglas de negocio:**
  - RABO-1: El único filtro es el cliente (`Kunnr`). No se filtra por sociedad, fecha ni la bandera `Contable` (AbonoMethods.cs:26).
  - RABO-2: Se devuelven las filas de SAP sin agrupar ni calcular nada. El saldo (`Saldo`) ya viene calculado por SAP (DocNoCompResponse.cs:35-39; `RSG/ex01_documentos_no_compensados.md:61-64`).
  - RABO-3: Si el cuerpo no trae `ClientNumber`, el filtro queda `Kunnr eq ''` y no se avisa (AbonosController.cs:24; AbonoMethods.cs:26).
- **Fuentes de datos:** S4 OData `ZAPI_EX01_NOCOMP_SRV` (ruta configurable), entidad `DocNoCompSet`, filtro `Kunnr eq '…'`. Solo lectura (AbonoMethods.cs:22, :26).
- **Salida y errores:**
  - 200: arreglo `DocNoCompResponse` con los nombres de SAP: `Bukrs`, `Belnr`, `Gjahr`, `Buzei`, `Koart`, `Kunnr`, `Zuonr` (asignación), `Bldat`, `Blart`, `Dmbtr` (decimal), `Saldo` (decimal), `Contable`, `Bpcajero`, `Refpago`, `Prctr` (DocNoCompResponse.cs:6-52).
  - 500 `InternalServerError`: error de SAP, cuerpo nulo (no se puede leer `ClientNumber` de un nulo) o fallo de red. Como `customErrors` está en `Off`, la respuesta lleva el mensaje y la traza de la excepción (AbonosController.cs:28-31; Web.config:94).
  - No escribe log.
- **Configuración usada:** `ZAPI_EX01_NOCOMP_SRV` (AbonoMethods.cs:22). También Conexion.dll y `DOMINIO_SAP` (RCOM-2).
- **Pendientes conocidos:**
  - C08: LAN agrupaba por canal de venta (CRÉDITO MA, DIMAS, DINERALIA, EMPRESARIO…) y filtraba por fecha. Aquí se devuelve la lectura cruda de EX01 (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:518-520`).
  - Según la ficha EX01, las filas con `Contable = 1` no van en el estado de cuenta (`RSG/ex01_documentos_no_compensados.md:56-59`). El código no las quita, así que el llamador tiene que filtrarlas.
  - Si falta la llave `ZAPI_EX01_NOCOMP_SRV`, la URL queda sin servicio y falla con un error de SAP (AbonoMethods.cs:22-26).

### POST /credit/getClienteFactura/{cliente}/{factura}  (AbonosController.GetClienteFactura, AbonosController.cs:34-47)
- **Para qué sirve:** Devuelve las parcialidades (plazos) de una factura de mercancía desde la tabla `ZME_SPLITS` de TZ01: monto, vencimiento, saldo, abonos, bonificaciones y moratorios (AbonoMethods.cs:53-54; ZSplitDto.cs:6-160).
- **Quién la llama:** DMZ `credit/getClienteFactura/{cliente}/{factura}`. El DMZ expone la ruta como GET y la llama aquí como POST (`MAVI - DMZ-SAP.csv:2`).
- **Entrada:** `cliente` y `factura` (texto, en la ruta). Solo se usa `factura`. `cliente` se recibe y se ignora (AbonosController.cs:36, :40).
- **Cómo funciona (paso a paso):**
  1. Toma la URL base de Conexion.dll y cambia `/odata/sap` por `/odata4/sap`, porque TZ01 es un servicio OData V4 (AbonoMethods.cs:56-61).
  2. Lee la ruta del servicio de la llave `ZAPI_TZ01_ZSPLIT_MERC` y le agrega la `/` inicial si le falta (AbonoMethods.cs:64-66).
  3. Arma `{base}{ruta}/zsplits?sap-client=110&$format=json&$filter=Vbeln eq '{factura}'` (AbonoMethods.cs:68).
  4. Hace el GET con el cliente S4 (AbonoMethods.cs:70-73).
  5. Si la respuesta es 2xx, convierte `value` en `List<ZSplitDto>`. Si falta el nodo, devuelve lista vacía (AbonoMethods.cs:75-85).
  6. Si no es 2xx, lanza `Error de SAP: …` (AbonoMethods.cs:87-91).
- **Reglas de negocio:**
  - RABO-4: El filtro es solo por factura (`Vbeln`). El cliente no se usa para validar que la factura sea suya (AbonosController.cs:40; AbonoMethods.cs:68).
  - RABO-5: Solo consulta parcialidades de mercancías (`zsb_ntz01_zsplit_merc`). No consulta TZ01 de seguros ni de Credilana (AbonoMethods.cs:64; `RSG/tz01_zsplits_mercaderias.md:21-22`).
  - RABO-6: La base V4 se deriva de la base de Conexion.dll y no se escribe a mano. Así, si la DLL cambia el prefijo, esta ruta lo sigue (AbonoMethods.cs:56-61).
- **Fuentes de datos:** S4 OData V4 `zsb_ntz01_zsplit_merc` (ruta en `ZAPI_TZ01_ZSPLIT_MERC`), entidad `zsplits`, filtro `Vbeln eq '…'`. Solo lectura (AbonoMethods.cs:64, :68).
- **Salida y errores:**
  - 200: arreglo `ZSplitDto` con los nombres de SAP: `Fkart`, `Vbeln`, `Zsplit` (número de parcialidad), `ZmontoSplit`, `ZvencSplit`, `Zsaldo`, `Zabonos`, `ZbonPp`, `Zmoratorio`, `ZdiasVenc`, `Zanula`… (ZSplitDto.cs:8-159).
  - 500 `InternalServerError` con detalle de la excepción: error de SAP o de red (AbonosController.cs:43-46; Web.config:94).
- **Configuración usada:** `ZAPI_TZ01_ZSPLIT_MERC` (AbonoMethods.cs:64). También Conexion.dll y `DOMINIO_SAP` (RCOM-2).
- **Pendientes conocidos:**
  - C06: El DMZ hace `JObject.Parse` sobre la respuesta, pero aquí sale un arreglo, así que el DMZ responde 500 incluso cuando la consulta sale bien (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:511-512`).
  - C07: LAN devolvía un objeto `SaldoFactura` con cabecera de saldo (saldo capital, atraso, moratorios, liquida con, pago puntual…). Aquí salen las filas crudas de TZ01 (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:514-516`).

### POST /credit/ApplyPaymentNeko  (AbonosController.ApplyPaymentNeko, AbonosController.cs:51-69)
- **Para qué sirve:** Debería registrar una intención de pago (referencia bancaria) del flujo "Neko". Hoy es un stub que siempre responde éxito (AbonoMethods.cs:95-99).
- **Quién la llama:** DMZ `customerService/ApplyPaymentNeko`, marcada como no conectada. Del lado SAP existe la estructura `ZAPI_REFERENCIAS_BANCARIAS`, pero falta la lógica ABAP (`MAVI - DMZ-SAP.csv:38`).
- **Entrada:** cuerpo dinámico `{ clientNumber, reference, debts }`, con nombres en minúscula inicial a diferencia de `GetAccountDebts` (AbonosController.cs:57-60).
- **Cómo funciona (paso a paso):**
  1. Lee `clientNumber`, `reference` y `debts` del cuerpo (AbonosController.cs:58-60).
  2. Llama a `ApplyPaymentIntentNeko`, que no hace nada y devuelve `true` (AbonosController.cs:62; AbonoMethods.cs:95-99).
  3. Responde `{"Success": true}` (AbonosController.cs:63).
- **Reglas de negocio:**
  - RABO-7: Siempre responde éxito, sin escribir nada en S4 ni en una base local (AbonoMethods.cs:97-98).
- **Fuentes de datos:** ninguna.
- **Salida y errores:** 200 `{"Success":true}`. 500 si el cuerpo es nulo (no se pueden leer campos de un nulo) o si `clientNumber` o `reference` no se pueden convertir a texto, por ejemplo cuando llegan como objeto (AbonosController.cs:58-59, :65-68).
- **Configuración usada:** ninguna.
- **Pendientes conocidos:** C19, stub que responde éxito. Su severidad es baja solo porque el DMZ todavía no lo consume (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:561`). Hay un TODO de integrarlo con S/4HANA o con una base local (AbonoMethods.cs:97).

### POST /credit/UpdateStatusPaymentNeko  (AbonosController.UpdateStatusPaymentNeko, AbonosController.cs:71-84)
- **Para qué sirve:** Debería confirmar el pago de las deudas en TZ01 (con un PATCH). Hoy es un stub que siempre responde éxito (AbonoMethods.cs:101-108).
- **Quién la llama:** DMZ `customerService/UpdateStatusPaymentNeko`, no conectada (`MAVI - DMZ-SAP.csv:39`).
- **Entrada:** cuerpo dinámico libre. Se pasa completo al método y no se lee (AbonosController.cs:77; AbonoMethods.cs:104).
- **Cómo funciona (paso a paso):**
  1. Pasa el cuerpo a `UpdatePaymentStatusNekoAsync`, que devuelve `true` sin hacer nada (AbonoMethods.cs:104-107).
  2. Responde `{"Success": true}` (AbonosController.cs:78).
- **Reglas de negocio:**
  - RABO-8: Siempre responde éxito, aunque el cuerpo llegue vacío (AbonoMethods.cs:107).
- **Fuentes de datos:** ninguna. Lo que falta es el PATCH a TZ01 (AbonoMethods.cs:106).
- **Salida y errores:** 200 `{"Success":true}`. 500 solo ante una excepción inesperada (AbonosController.cs:80-83).
- **Configuración usada:** ninguna.
- **Pendientes conocidos:** C19 (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:561`). El TODO pide recorrer las deudas y hacer PATCH a TZ01 (AbonoMethods.cs:106). El método quedó sin `async` a propósito, para no generar la advertencia CS1998, y debe volver a ser `async` cuando se implemente (AbonoMethods.cs:101-103).

### GET /credit/GetCobrosReferenciados/{bp}  (AbonosController.GetCobrosReferenciados, AbonosController.cs:85-98)
- **Para qué sirve:** Lista los cobros referenciados de un cliente, es decir, sus referencias de pago registradas en SAP: referencia, documento de venta, clase de documento, monto, fechas de registro y conclusión, estatus y banco (CobroReferenciadoResponse.cs:18-32).
- **Quién la llama:** No aparece en el tracker DMZ. No se conoce llamador.
- **Entrada:** `bp` (texto, en la ruta, obligatorio) (AbonosController.cs:87).
- **Cómo funciona (paso a paso):**
  1. Si `bp` está vacío o solo tiene espacios, lanza "El BP es obligatorio…" (AbonoMethods.cs:112-115).
  2. Arma `{base}/ZFICRUD_COBREF_SRV/WACOBREFSet?$filter=Bp eq '{bp}'&$format=json&sap-client=110` (AbonoMethods.cs:117-120).
  3. Hace el GET con el cliente S4. Si la respuesta no es 2xx, lanza un error con el cuerpo de SAP (AbonoMethods.cs:124-136).
  4. Convierte `d.results` con System.Text.Json, ignorando nulos. Si no hay datos, devuelve lista vacía (AbonoMethods.cs:138-141).
- **Reglas de negocio:**
  - RABO-9: El filtro por BP es obligatorio para no traer la tabla completa (AbonoMethods.cs:112-115, :119-120).
  - RABO-10: No se filtra por estatus ni por fecha: salen todos los cobros del BP (AbonoMethods.cs:120).
- **Fuentes de datos:** S4 OData `ZFICRUD_COBREF_SRV`, entidad `WACOBREFSet`, filtro `Bp eq '…'`. Solo lectura (AbonoMethods.cs:120).
- **Salida y errores:**
  - 200: arreglo `CobroReferenciado` (`Mandt`, `Zidcobreftmp` (entero), `Zreferencia`, `Zusuario`, `Bp`, `Vbeln`, `Auart`, `Zmonto`, `Zfecharegistro`, `Zfechaconclusion`, `Zestatus`, `Zbanco`) (CobroReferenciadoResponse.cs:18-32).
  - 500 con detalle si SAP responde con error, falla la red o no se puede leer la respuesta. El mensaje empieza con "Error al consultar cobros referenciados para BP {bp}: …" (AbonoMethods.cs:145-148; AbonosController.cs:94-97).
  - 500 con el mensaje "El BP es obligatorio…" si `bp` solo trae espacios. Esta validación está antes del `try`, así que su mensaje no lleva el prefijo anterior (AbonoMethods.cs:112-115, :122).
- **Configuración usada:** ninguna llave propia (RCOM-2).
- **Pendientes conocidos:** ninguno en el código.

### GET /credit/GetClabeSTP/{bp}  (AbonosController.GetClabeSTP, AbonosController.cs:99-112)
- **Para qué sirve:** Devuelve las cuentas CLABE STP asignadas a un cliente. CLABE es la clave bancaria estandarizada de 18 dígitos y STP es el sistema de transferencias y pagos con el que el cliente puede pagar por transferencia (ClabeSTPResponse.cs:18-33).
- **Quién la llama:** No aparece en el tracker DMZ. Las rutas DMZ `customerService/GetSTPAccount` y `ValidateSTPAccount` siguen "To Do" y no apuntan aquí (`MAVI - DMZ-SAP.csv:54`, `:56`).
- **Entrada:** `bp` (texto, en la ruta, obligatorio) (AbonosController.cs:101).
- **Cómo funciona (paso a paso):**
  1. Si `bp` está vacío, lanza "El BP es obligatorio…" (AbonoMethods.cs:152-155).
  2. Arma `{base}/ZAPI_CTACLBSTP_SRV/WACTACLBSTPSet?$filter=Bp eq '{bp}'&$format=json&sap-client=110` (AbonoMethods.cs:157-160).
  3. Hace el GET con el cliente S4. Si la respuesta no es 2xx, lanza error (AbonoMethods.cs:164-176).
  4. Convierte `d.results` ignorando nulos. Si no hay datos, devuelve lista vacía (AbonoMethods.cs:178-181).
- **Reglas de negocio:**
  - RABO-11: El filtro por BP es obligatorio (AbonoMethods.cs:152-155).
  - RABO-12: Salen todas las cuentas del BP, asignadas o no. El campo `Zasignado` se entrega y no se filtra (AbonoMethods.cs:160; ClabeSTPResponse.cs:29).
- **Fuentes de datos:** S4 OData `ZAPI_CTACLBSTP_SRV`, entidad `WACTACLBSTPSet`, filtro `Bp eq '…'`. Solo lectura (AbonoMethods.cs:160).
- **Salida y errores:**
  - 200: arreglo `ClabeSTPReferencia` (`Mandt`, `Zidctasclbstp`, `Bp`, `Zcuentaclabestp`, fechas y horas de asignación, registro y cambio, usuarios, `Zasignado`), todo de tipo texto (ClabeSTPResponse.cs:18-33).
  - 500 con detalle: "Error al consultar CLABE STP para BP {bp}: …" si SAP responde con error, falla la red o no se puede leer la respuesta (AbonoMethods.cs:185-188; AbonosController.cs:108-111).
  - 500 con el mensaje "El BP es obligatorio…", sin ese prefijo, si `bp` solo trae espacios (AbonoMethods.cs:152-155, :162).
- **Configuración usada:** ninguna llave propia (RCOM-2).
- **Pendientes conocidos:** ninguno en el código.

### POST /customer/wallet/details  (WalletCustomerController.GetCustomerWallet, WalletCustomerController.cs:16-56)
- **Para qué sirve:** Devuelve el número de monedero electrónico del cliente, el titular y el saldo, desde el contrato de condiciones de SAP (SD18) (WalletCustomerController.cs:26-48; WalletCustomer.cs:9-12).
- **Quién la llama:** DMZ `customer/wallet/details` (`MAVI - DMZ-SAP.csv:111`).
- **Entrada:** `WalletCustomerRequest` con `cliente` (texto, obligatorio, número de cliente BP) y `uen` (entero, se recibe pero no se usa) (WalletCustomerRequest.cs:8-12; WalletCustomerController.cs:20-26).
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo es nulo o `cliente` está vacío, responde 400 "Datos incompletos." (WalletCustomerController.cs:20-21).
  2. Llama a `GetCustomerWalletAsync(cliente)`, que arma `…/ZAPI_CONDITIONCONTRACT_SRV/ConditionContractSet?sap-language=ES&sap-client=110&$inlinecount=allpages&$filter=Reference eq '{cliente}'` (WalletCustomerMethods.cs:62-65).
  3. Escribe en `sap.log` la URL (`[SAP WALLET REQUEST]`) y la respuesta completa de SAP (`[SAP WALLET RESPONSE]`) (WalletCustomerMethods.cs:74, :79).
  4. Si SAP responde 400 con el texto "No se encontraron registros", lo toma como "sin monedero" y devuelve lista vacía (WalletCustomerMethods.cs:83-86).
  5. Cualquier otro error se registra como `[SAP WALLET ERROR]` y se lanza (WalletCustomerMethods.cs:87-88).
  6. Convierte `d.results` en `List<WalletCustomer>` (WalletCustomerMethods.cs:91-95).
  7. El controlador arma los valores por defecto: `monedero` = "Por el momento no cuentas con monedero electrónico.", `titular` = "" y `saldo` = 0 (WalletCustomerController.cs:28-30).
  8. Si hay contratos, toma el primero. `monedero` = `Num` (si no está vacío), `titular` = `CustOwner` y `saldo` = `Zsaldo` convertido a decimal (WalletCustomerController.cs:32-41).
  9. Responde con el objeto `{monedero, titular, saldo}` ya convertido a texto JSON (WalletCustomerController.cs:43-50).
- **Reglas de negocio:**
  - RMON-1: `cliente` es obligatorio (WalletCustomerController.cs:20-21).
  - RMON-2: El contrato se busca con `Reference = cliente` (WalletCustomerMethods.cs:65).
  - RMON-3: "Sin registros" en SAP (400 con ese texto) no es error. Se responde 200 con el mensaje por defecto y saldo 0 (WalletCustomerMethods.cs:83-86; WalletCustomerController.cs:28-30).
  - RMON-4: Si hay varios contratos se usa el primero que devuelve SAP. No se filtra por tipo de contrato (virtual `ZMNV` o físico `ZMNF`), por inactivo (`Deact`), por vigencia (`DateTo`) ni por organización (WalletCustomerController.cs:34; `RSG/sd18_consultar_contrato.md:42`, `:51-52`).
  - RMON-5: Si `Num` viene vacío se conserva el mensaje por defecto como número de monedero (WalletCustomerController.cs:35).
  - RMON-6: `titular` toma `CustOwner`, que según la ficha SD18 es el código de BP del cliente, no su nombre (WalletCustomerController.cs:36; `RSG/sd18_consultar_contrato.md:44`).
  - RMON-7: Si `Zsaldo` no se puede convertir a número, el saldo queda en 0. No hay redondeo (WalletCustomerController.cs:37-40).
  - RMON-8: El saldo lo calcula SAP sumando los movimientos del contrato. El código solo lo lee (`RSG/sd18_consultar_contrato.md:57-67`).
- **Fuentes de datos:** S4 OData `ZAPI_CONDITIONCONTRACT_SRV`, entidad `ConditionContractSet`, filtro `Reference eq '…'`. Solo lectura (WalletCustomerMethods.cs:65).
- **Salida y errores:**
  - 200: el cuerpo es un string JSON que adentro contiene el objeto `{"monedero":"…","titular":"…","saldo":0}`, o sea, JSON doblemente codificado. El llamador tiene que deserializarlo dos veces (WalletCustomerController.cs:50).
  - 400 "Datos incompletos." (WalletCustomerController.cs:21).
  - 400 `"Error, Ocurrio un error al intentar obtener el contrato de condiciones: Error SAP (Async). StatusCode: …"` (WalletCustomerMethods.cs:88, :97-100; WalletCustomerController.cs:52-55).
  - Escribe en `sap.log` la URL, la respuesta completa (con BP y saldo) y los errores (WalletCustomerMethods.cs:74, :79, :87).
- **Configuración usada:** ninguna llave propia (RCOM-2). El log no usa llaves: va a los dos `sap.log` de `Logger.SAP`, uno en ruta fija y otro en la carpeta `Logs` de la aplicación (Logger.cs:11, :26-32; ver RCOM-8).
- **Pendientes conocidos:**
  - C10: `uen` se ignora. LAN distinguía la serie (`SerieMonedero` para UEN 1, `SerieMonederoVIU` para las demás) y el saldo por UEN (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:526-528`).
  - Sigue abierto si se conserva el efecto de LAN "generar monedero" (`SP_MAVIDM0173RedimeOGeneraMONE`), que esta ruta no hace (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:1027`, `:1168`).
  - La ficha SD18 describe `Reference` como "ID Monedero POS" (CHAR16), pero el código envía el número de cliente (`RSG/sd18_consultar_contrato.md:27`; WalletCustomerMethods.cs:65). Falta confirmar con SAP que se busca por cliente.
  - `WalletCustomerMethods.GetCustomerWallet` es una copia de `GetCustomerWalletAsync` sin el caso "No se encontraron registros". No tiene llamadores y el propio código la marca como "candidato a eliminar" (WalletCustomerMethods.cs:21-25, :44-48).
  - La guía cuenta esta ruta entre las 8 que no dan la misma respuesta que LAN, con "tres defectos verificados" (`GUIA_MIGRACION_FABLE.md:354`, `:365`).

### POST /customer/wallet/getMinimumCostToRedeem  (WalletCustomerController.GetMinimumCostToRedeem, WalletCustomerController.cs:57-74)
- **Para qué sirve:** Calcula qué parte de una compra cuenta para redimir monedero. Suma los artículos según su estatus (alta o bloqueado) y su familia, y compara cada suma contra los mínimos configurados por canal (WalletMethods.cs:63-68).
- **Quién la llama:** DMZ `customer/wallet/getMinimumCostToRedeem` (`MAVI - DMZ-SAP.csv:113`).
- **Entrada:** `MinimumCostToRedeemRequest` (MinimumCostToRedeemRequest.cs:5-20):
  - `categoria` (texto, obligatorio) (WalletCustomerController.cs:61-62).
  - `uen` (entero; si no llega vale 0).
  - `articulos`: lista de diccionarios de texto con las llaves exactas, en minúsculas, `sku`, `precio`, `cantidad` y `descuento` (WalletMethods.cs:163-166).
  - Los demás campos (`totalAlta`, `montoMinimoAlta`, `montoMaximoRedimibleGlobal`…) son de salida. Ojo: si el llamador los manda con valor, ese valor puede quedarse o acumularse (RMON-17).
- **Cómo funciona (paso a paso):**
  1. Si el cuerpo es nulo o `categoria` está vacía, responde 400 "Datos incompletos." (WalletCustomerController.cs:61-62).
  2. Reinicia los diccionarios `familiaMontoMinimoAlta` y `familiaMontoMinimoBloqueado` (WalletMethods.cs:71-72).
  3. Descarga tres catálogos de AWS: "MINIMO PARA REDIMIR MONEDERO", "FAMILIAS ESTATUS BLOQUEADO REDIMEN MONEDERO" y "VENTASCANALMAVI". Equivalen a las tablas legadas de Intelisis (WalletMethods.cs:76-79). Cada uno se pide a `{AwsBaseUrl}/AI_GET_CatalogoConfiguracion?NOMBRECATALOGO=…`, que acepta respuesta `{"value":[…]}` o `[…]` (WalletMethods.cs:35-52).
  4. Busca el canal: toma la primera fila de VENTASCANALMAVI cuyo `VALOR1` o `VALOR2` sea igual a `uen` y que tenga `categoria` en alguno de `VALOR1` a `VALOR4` (WalletMethods.cs:83-85). El id de canal es `VALOR3`; si está vacío o vale "0", usa `VALOR4`; si también, usa `IDCONFIGURACIONCATALOGOS` (WalletMethods.cs:87-96).
  5. Si encontró canal, toma los rangos de cada catálogo de mínimos cuyo `VALOR1` sea igual al id de canal. Por cada fila: familia = `VALOR3` (o "ALL" si está vacío) y monto = `VALOR2`. Llena el diccionario y deja en `montoMinimo*` y `familiaPermitida*` los valores de la última fila (WalletMethods.cs:99-129).
  6. Si no encontró canal, usa la primera fila cuyo `VALOR1` sea 2, 3, 6 o 7 (valores fijos en el código) (WalletMethods.cs:131-151).
  7. Por cada artículo que traiga las cuatro llaves: convierte precio, cantidad y descuento a `float`. Busca el SKU en DM01 (`ZAPI_ARTICULOS_SRV/Articulos`, filtro `ARTICULO eq '…'` con el SKU escapado) y toma la primera fila (WalletMethods.cs:161-175; ProductMethods.cs:134-137).
  8. Si el artículo existe en DM01: guarda `familia`, marca `procesado = "FALSE"` y calcula `subtotal = precio × cantidad − descuento` (WalletMethods.cs:177-185). Luego, según el estatus:
     - `04` → `estatus = "ALTA"`. Suma a `totalAlta` si la familia permitida es "ALL" o la familia está en el diccionario de alta, y entonces marca `procesado = "TRUE"` (WalletMethods.cs:187-196).
     - `05` → `estatus = "BLOQUEADO"`. Hace lo mismo con el diccionario de bloqueado (WalletMethods.cs:197-206).
     - `81` → `estatus = "BAJA"`. No suma (WalletMethods.cs:207-210).
     - Otro → guarda el estatus tal cual y no suma (WalletMethods.cs:211-214).
  9. Guarda `totalAlta` y `totalBloqueado` (WalletMethods.cs:220-221).
  10. `montoMaximoRedimibleGlobal` suma `totalAlta` si alcanza `montoMinimoAlta`, y suma `totalBloqueado` si alcanza `montoMinimoBloqueado` (WalletMethods.cs:224-232).
  11. Devuelve el mismo objeto de entrada, enriquecido (WalletMethods.cs:239; WalletCustomerController.cs:67-68).
- **Reglas de negocio:**
  - RMON-9: `categoria` es obligatoria (WalletCustomerController.cs:61-62).
  - RMON-10: El canal se resuelve con VENTASCANALMAVI por `uen` + `categoria`, con comparación exacta de texto (WalletMethods.cs:83-85).
  - RMON-11: El id de canal sale de `VALOR3`, luego de `VALOR4` y por último del id de la fila; "0" cuenta como vacío (WalletMethods.cs:90-95).
  - RMON-12: En el catálogo de mínimos, `VALOR1` es el canal (el "NumeroD" legado), `VALOR2` el monto mínimo y `VALOR3` la familia; familia vacía significa "ALL" (WalletMethods.cs:98-107).
  - RMON-13: Si no hay canal, los mínimos salen de la primera fila de los canales 2, 3, 6 o 7 (WalletMethods.cs:134-150).
  - RMON-14: El estatus DM01 decide la bolsa del artículo: `04` alta, `05` bloqueado y `81` baja, que no suma (WalletMethods.cs:187-210).
  - RMON-15: El subtotal es `precio × cantidad − descuento`, en `float`, sin redondeo. Un valor que no se pueda convertir cuenta como 0 (WalletMethods.cs:168-170, :185).
  - RMON-16: El mínimo que se compara es el de la última fila leída, no uno por familia. El comodín "ALL" solo aplica si la última fila es "ALL" (WalletMethods.cs:112-113, :190-191, :224-232).
  - RMON-17: `montoMaximoRedimibleGlobal` se suma con `+=` sobre lo que mandó el llamador, y no se reinicia. Lo mismo pasa con `montoMinimo*` cuando no hay filas de catálogo: queda el valor recibido, que por defecto es 0, y con 0 cualquier total califica (WalletMethods.cs:71-72, :226, :231).
  - RMON-18: Un artículo sin alguna de las cuatro llaves, o que no existe en DM01, se salta sin marcar (WalletMethods.cs:163-166, :177).
- **Fuentes de datos:**
  - API de AWS `AwsBaseUrl` → `AI_GET_CatalogoConfiguracion`, tres catálogos, solo lectura (WalletMethods.cs:35, :77-79).
  - S4 OData `ZAPI_ARTICULOS_SRV`, entidad `Articulos`, filtro `ARTICULO eq '…'`, una llamada por artículo (WalletMethods.cs:174; ProductMethods.cs:137).
- **Salida y errores:**
  - 200: el `MinimumCostToRedeemRequest` con `totalAlta`, `totalBloqueado`, `montoMinimoAlta`, `montoMinimoBloqueado`, `familiaPermitidaAlta` y `familiaPermitidaBloqueado`, los dos diccionarios, `montoMaximoRedimibleGlobal` y cada artículo con `familia`, `estatus` y `procesado` (WalletMethods.cs:182-213, :220-232).
  - 400 "Datos incompletos." (WalletCustomerController.cs:62).
  - Los errores se tragan. Si un catálogo lanza error (red, JSON inválido), se usa lista vacía y solo se escribe en consola (WalletMethods.cs:56-60). Si AWS responde con un código que no es 2xx, también se usa lista vacía y no se escribe nada (WalletMethods.cs:37, :60). Si falla cualquier otra cosa (por ejemplo DM01), se corta el cálculo, se escribe en consola y se responde 200 con lo que se alcanzó a llenar; los totales pueden quedar sin calcular (WalletMethods.cs:234-239). En la práctica, el `catch` del controlador no se alcanza (WalletCustomerController.cs:70-73).
- **Configuración usada:** `AwsBaseUrl`. Si la llave falta, se usa una URL de respaldo escrita en el código (WalletMethods.cs:19). También Conexion.dll y `DOMINIO_SAP` para DM01 (RCOM-2).
- **Pendientes conocidos:**
  - C09: no replica el cálculo por familia de LAN. Faltan la exclusión de familias no permitidas y el recálculo multifamilia de `montoMaximoRedimibleGlobal` (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:522-524`; `GUIA_MIGRACION_FABLE.md:615`).
  - Si DM01 no trae `FAMILIA` (queda nula) y la familia permitida no es "ALL", `ContainsKey(null)` lanza. El `catch` general lo traga y la respuesta sale sin totales (WalletMethods.cs:180, :191, :201, :234-237).
  - Cada llamada hace tres GET a AWS y un GET a DM01 por artículo, sin caché (WalletMethods.cs:77-79, :174).
  - El tracker la marca "Requiere desarrollo" (`MAVI - DMZ-SAP.csv:113`).

### GET /sepomex/validarcp  (SepomexController.GetCodigosPostales, SepomexController.cs:12-27)
- **Para qué sirve:** Consulta el catálogo SEPOMEX de códigos postales (estado, municipio y colonias) para validar direcciones y cobertura (SepomexMethods.cs:12-31; `Manual Tecnico Servicio SAP 01092026.md:303-310`).
- **Quién la llama:** Es candidata para la ruta DMZ `customerService/validarCoberturaPorCP`, que sigue "To Do" y sin conectar (`MAVI - DMZ-SAP.csv:47`).
- **Entrada:** parámetros opcionales de query (texto): `top`, `skip`, `filter`, `select` y `orderby`. Van sin `$`, porque Web API los enlaza por nombre (SepomexController.cs:14).
- **Cómo funciona (paso a paso):**
  1. Lee `URL_SALES_DISTRIBUTION_API`. Si no existe, lanza error (SepomexMethods.cs:16-20).
  2. Agrega a la consulta solo los parámetros que traen valor, como `$top`, `$skip`, `$filter`, `$select` y `$orderby` (SepomexMethods.cs:23-30).
  3. Hace un GET a `{URL}/AI_zdmt_sepomex{query}` con un `HttpClient` nuevo, sin autorización (SepomexMethods.cs:31-36).
  4. Si la respuesta no es 2xx, lanza error. Si viene vacía, devuelve `null` (SepomexMethods.cs:38-46).
  5. Devuelve `value` (V4), si no `d.results` (V2), y si no el JSON completo (SepomexMethods.cs:48-51).
- **Reglas de negocio:**
  - RSEP-1: No hay filtro obligatorio. Sin parámetros, la API se llama sin ningún filtro (SepomexMethods.cs:23-30).
  - RSEP-2: Los valores se pasan sin codificar, así que un `&`, `#` o `+` dentro del filtro rompe la consulta (SepomexMethods.cs:26, :31).
  - RSEP-3: La consulta va por la API de Sales & Distribution de MAVI, y el usuario confirmó que es correcto (`SKILL.md:110`).
- **Fuentes de datos:** API externa `URL_SALES_DISTRIBUTION_API`, recurso `AI_zdmt_sepomex`; según el manual, detrás está el servicio `ZAPI_ZDMT_SEPOMEX`. Solo lectura (SepomexMethods.cs:31; `Manual Tecnico Servicio SAP 01092026.md:129`).
- **Salida y errores:**
  - 200: el JSON de la API (arreglo de códigos postales), o `null` si llegó vacío (SepomexMethods.cs:45, :49-51).
  - 400 `"Error al obtener códigos postales: Error intentando obtener los codigos postales: …"`: falta la llave, la API respondió con error, o la respuesta no es un objeto JSON (por ejemplo, un arreglo en la raíz) (SepomexMethods.cs:48, :54-57; SepomexController.cs:23-26).
- **Configuración usada:** `URL_SALES_DISTRIBUTION_API` (SepomexMethods.cs:16).
- **Pendientes conocidos:** `HttpClient` nuevo por llamada y sin timeout propio (SepomexMethods.cs:33).

---

### Apoyo: SD36 para otras áreas (SalesMethods.CheckDocumentExistsSD36Async y GetCreditDocumentsAsync, sin ruta propia)
- **Para qué sirve:** Son dos consultas SD36 que usan otras rutas.
  - `CheckDocumentExistsSD36Async(purchNoC)` busca la venta por folio POS / id e-commerce (`PurchNoC`) para saber si un pedido ya existe (SalesMethods.cs:129-139).
  - `GetCreditDocumentsAsync(filter)` trae los documentos de crédito de un cliente (SalesMethods.cs:168-175).
- **Quién lo usa:** `GET /order/checkDocument/{purchNoC}` (OrderController.cs:122-134), el alta y el seguimiento de pedidos (OrderMethods.cs:125, :456, :1608, :2974, :3147), recoger en sucursal (StorePickupMethods.cs:226, :264) y `customerService/obtenerCreditos` con el filtro `Customer eq '{cliente_id}'` (CustomerServiceMethods.cs:356-357).
- **Cómo funciona:** igual que `GET /sale/{documentId}`, con dos diferencias: expande además las tablas Z `to_zsdt_vbak` y `to_zsdt_vbap`, y codifica el filtro completo con `Uri.EscapeDataString` (SalesMethods.cs:136-139, :174-175).
- **Reglas de negocio:**
  - RVTA-9: El filtro se codifica, pero no se duplica el apóstrofo del valor (SalesMethods.cs:136-138).
  - RVTA-10: Las tablas Z llegan como `JsonElement`, sin un modelo tipado (SaleD.cs:77-81).
- **Fuentes de datos:** S4 OData `ZAPI_DOCVTAS_CHECK_CDS` / `ZAPI_DOCVTAS_CHECK`, expand `to_salesdoc_items,to_zsdt_vbak,to_zsdt_vbap` (SalesMethods.cs:139, :175).
- **Salida y errores:** `List<SaleD>`, o una excepción con el mensaje "…documento por PurchNoC de SAP SD36…" o "…documentos de credito…" (SalesMethods.cs:162-165, :199-202).
- **Configuración usada:** ninguna llave propia (RCOM-2).
- **Pendientes conocidos:** `GetCreditDocumentsAsync` escribe un volcado de depuración en una ruta fija del equipo de un desarrollador (`c:\Users\<usuario>\source\repos\sap_raw_dump.json`) y traga el error si no puede (SalesMethods.cs:193). Hay que quitarlo.

### Apoyo: listas de precios SD29 (FinalListProperMethods, sin ruta propia)
- **Para qué sirve:** Lee la lista de precios finales de SAP (SD29, "PropreList"): precio, abono, oferta, precio de referencia, súper promoción y descuento por categoría de cada artículo, por condición, sucursal y organización de ventas (FinalListProper.cs:3-47).
- **Quién lo usa:**
  - El precio del crédito web, en `ObtenerPreciosCreditoAsync` (OrderMethods.cs:908, :986-1008).
  - La validación de precios contra la lista antes de enviar el pedido (OrderMethods.cs:1809, :1954-1970).
  - El listado e-commerce `GET /ecommerce/listado`, con UEN "1" (EcommerceMethods.cs:27, :53, :680; EcommerceController.cs:9-19).
- **Métodos y cómo funciona:**
  1. `GetFinalListProperBySkuAsync(sku)`: filtro `Articulo eq '{sku}'` (FinalListProperMethods.cs:82-85).
  2. `GetFinalListProperBySkuOrgCondicionAsync(sku, orgVtas, condicion)`: filtro `Articulo eq … and OrgVtas eq … and Condicion eq …`. Se usa para el crédito web. Las filas de un mismo SKU se distinguen por `OrgVtas` (04 MA, 05 VIU) y `Condicion` (ACEF, 12IA, 12IV…) (FinalListProperMethods.cs:87-92).
  3. Antes de armar el filtro, cada valor de texto pasa por `LiteralOData`, que duplica el apóstrofo y convierte un nulo en "" (FinalListProperMethods.cs:84, :90, :94-97). Después los dos llaman a `ConsultarPropreListAsync`, que codifica el filtro completo con `Uri.EscapeDataString`. Así, un SKU con `+`, `&`, `#` o espacio llega intacto a SAP (FinalListProperMethods.cs:99-104).
  4. `GetFinalListProperByUenAsync(uen)`: filtro `CDistr eq '{uen}'`, sin codificar (FinalListProperMethods.cs:52-55).
  5. `GetFinalListProperByUenAndBranchAsync(uen, branch)`: filtro `CDistr eq '0{uen}' and Sucursal eq '00{branch}'`, con ceros a la izquierda. Ningún código lo llama (FinalListProperMethods.cs:19-22).
  6. Todos hacen un GET con el cliente S4 (Basic). Si la respuesta no es 2xx o viene vacía, lanzan "Ocurrio un error al intentar obtener el listado de precios…" (FinalListProperMethods.cs:29-49, :59-79, :108-128).
- **Reglas de negocio:**
  - RPRE-1: SD29 es la fuente del precio y del abono del crédito web, por SKU (decisión del usuario del 2026-09-11, `CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md:338`). `Abono` se mapea a `Installment` porque SD29 sí lo devuelve; antes se ponía un valor fijo en el código (FinalListProper.cs:20-25).
  - RPRE-2: Para e-commerce solo aplican `OrgVtas` 04 (MA) y 05 (VIU). Las filas legadas 1, 2 y 3 (mayoreo, pisos) no corresponden (FinalListProper.cs:30-35). En el código, solo el crédito aplica este filtro (OrderMethods.cs:918-920). La validación de precios de contado toma la primera fila del SKU sin filtrar organización ni condición y, si el precio que mandó Magento es menor, lo sube al de SD29 (OrderMethods.cs:1965-1991). El listado e-commerce elige las filas en memoria por condición y sucursal: `ACEF` para contado, `12IA` con sucursal 90 y `12DA` con sucursal 0 para crédito (EcommerceMethods.cs:24-26, :192-211).
  - RPRE-3: Si el filtro compuesto falla, el crédito escribe `[CREDITO SD29 FILTRO]` en `sap.log` y repite la consulta solo por SKU (OrderMethods.cs:1002-1006). LAN no tenía este log; se conserva por decisión del usuario (DU17, `CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md:402`). Si con la condición traducida no hay filas, prueba con la condición que mandó Magento (OrderMethods.cs:993-998).
  - RPRE-4: La autenticación es Basic directa a S4 con `CreateClientS4`. Antes se pedía un Bearer al OAuth de CPI, que era el sistema de autenticación equivocado (FinalListProperMethods.cs:26-29).
  - RPRE-5: Aunque SAP ya filtre, el crédito vuelve a filtrar en memoria por `OrgVtas` y luego por condición (primero la traducida, después la de Magento) como red de seguridad. Además recorta el SKU a 20 caracteres y consulta SD29 una sola vez por SKU (OrderMethods.cs:904-910, :918-933).
- **Fuentes de datos:** S4 OData `ZAPI_PROPRELIST_SRV`, entidad `PropreListSet`, `sap-language=ES`, `sap-client=110`. Solo lectura (FinalListProperMethods.cs:22, :55, :102-104).
- **Configuración usada:** ninguna llave propia (RCOM-2).
- **Pendientes conocidos:**
  - E5, el filtro compuesto, sigue sin probar contra SAP. Además falta ratificar la autorización de los métodos nuevos (P20) (`CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md:420`, `:925`; `CAMBIOS_PARIDAD_CREDITO_2026-09-29.md:193`). Como la consulta por SKU también la usa el contado, falta probar que el contado no cambió (ACT-25, `ACTIVIDADES_PENDIENTES_CREDITO_WEB_2026-10-01.md:173`).
  - P7: ¿qué fila de SD29 es la de crédito web cuando aún quedan varias por `Sucursal`, `Vigente` o `CDistr`? (`CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md:803-809`; ACT-14, `ACTIVIDADES_PENDIENTES_CREDITO_WEB_2026-10-01.md:162`).
  - `GetFinalListProperByUenAndBranchAsync` no tiene llamadores (FinalListProperMethods.cs:19).

### Apoyo: utilidades (StoreGlobalMethods y RequestMethods, sin ruta propia)
- **Para qué sirve:** Son funciones comunes de fechas, mapeos de tienda y canal, y armado de peticiones a SAP.
- **Quién lo usa:** Solo se usan las tres funciones de fecha, desde el armado del pedido para SAP (`BuildSapOrderAsync`, OrderMethods.cs:2170, :2176-2178), y `EnableTrustedHosts`, en cada cliente S4 (TokenGenerator.cs:115). Las demás no tienen llamadores.
- **Reglas de negocio:**
  - RUTL-1: `FormatDateIso` da `yyyy-MM-ddTHH:mm:ss`, `FormatDateTimestamp` da `yyyyMMddHHmmss` y `FormatHoraTimestamp` da `HH:mm:ss`, con la hora local del servidor (StoreGlobalMethods.cs:52-67).
  - RUTL-2 (sin uso): `GetSalesOff(tienda, metodoPago)` arma la oficina de ventas como `"00" + punto + canal`. El punto es 1 para `muebles_america`, 2 para `viu` y 0 para cualquier otra. El canal es 2 (crédito o tarjeta) para `omnipro_pago_credito` y `openpay_cards`, y 1 para los demás (paypal, transferencia, tiendas). Las comparaciones no distinguen mayúsculas (StoreGlobalMethods.cs:9-45).
  - RUTL-3 (sin uso): `GetRefDocCat` asigna la categoría del documento de referencia: ZANC y ZSOC → "A"; ZMER, ZPRE y ZSEG → "B"; otro → "" (StoreGlobalMethods.cs:71-83).
  - RUTL-4 (sin uso): `GetTypePosition` asigna el tipo de posición por clase de documento: ZMN+ (aumento de monedero) → ZMN+, ZMER → ZMRE, ZMAY (mayoreo) → ZMYM, y ZSOC / ZANC (oferta) → "". Sin clase de documento devuelve "" (StoreGlobalMethods.cs:95-112).
  - RUTL-5: `EnableTrustedHosts` fuerza TLS 1.2 en todo el proceso y acepta certificados con error solo si el host es `DOMINIO_SAP` (RequestMethods.cs:13-38).
  - RUTL-6 (sin uso): `BuildSapRequest`, `BuildSapRequestS4` (este acepta cualquier certificado), `ValidateSapResponse` y `LogSapRequest`/`LogSapResponse` (que escriben a `Debug`) (RequestMethods.cs:42-110).
- **Configuración usada:** `DOMINIO_SAP` (RequestMethods.cs:15).
- **Pendientes conocidos:** Hay código sin uso que se puede borrar: `GetSalesOff`, `GetRefDocCat`, `GetTypePosition` y los `Build*`/`Validate*`/`Log*` de RequestMethods (StoreGlobalMethods.cs:9, :71, :95; RequestMethods.cs:42-110). `BuildSapRequestS4`, además, cambia la validación de certificados de todo el proceso si alguien lo llama (RequestMethods.cs:57-59).

---

### Reglas comunes del área
- **RCOM-1 Autenticación de entrada.** Los cinco controladores llevan `[Authorize]` (SaleController.cs:13; MovBitaController.cs:8; AbonosController.cs:7; WalletCustomerController.cs:12; SepomexController.cs:8). El `TokenValidationHandler` valida el JWT (emisor, audiencia, vigencia y firma, con las llaves `JWT_*`).
  - Sin cabecera `Authorization`, el handler deja pasar la petición y `[Authorize]` responde 401.
  - Con un token inválido o vencido, el handler responde 401 sin cuerpo.
  - Ante otro error de validación, responde 500 sin cuerpo (TokenValidationHandler.cs:20-31, :39-79; WebApiConfig.cs:16-17).
- **RCOM-2 Llamadas a S4.**
  - `CreateClientS4` usa autenticación Basic con el usuario de servicio que entrega Conexion.dll (`usuarioServicio` / `contrasenaServicio`), guardado en memoria tras la primera lectura (TokenGenerator.cs:60-82, :113-133).
  - Tiene timeout de 60 s y **no valida el certificado TLS** de S4 (TokenGenerator.cs:121, :127).
  - Se crea un `HttpClient` nuevo en cada llamada. Solo las consultas EX01 y TZ01 lo liberan con `using` (AbonoMethods.cs:28, :70).
  - La URL base sale de `Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL)` en todos los métodos del área que van a S4 (por ejemplo SalesMethods.cs:28; AbonoMethods.cs:21). MovBita, SEPOMEX y los catálogos del monedero no van a S4 (RCOM-4).
- **RCOM-3 Entorno fijo de Dev.** Nodo `ENVIROMENT_DEV` y `sap-client=110` fijos en el código. El equipo confirmó que el nodo de Dev es correcto mientras se trabaja en pruebas y que se cambia el día del pase a Stage/PROD (R-12, `GUIA_MIGRACION_FABLE.md:623-631`).
- **RCOM-4 APIs que no son S4.** MovBita y SEPOMEX van a `URL_SALES_DISTRIBUTION_API` y los catálogos del monedero a `AwsBaseUrl`. Las tres usan `new HttpClient()` sin cabecera de autorización (MovBitaMethods.cs:25; SepomexMethods.cs:33; WalletMethods.cs:32). Eso cumple la regla de no mandar a terceros las credenciales de S4 (TokenGenerator.cs:92-97), aunque no usan el cliente compartido `CreateClientExternal` (TokenGenerator.cs:108-111). Que estas consultas no vayan directo a S4 es una decisión confirmada (`SKILL.md:110`).
- **RCOM-5 Filtros OData.** Casi todos los valores se pegan en `$filter` o en la URL sin escapar el apóstrofo (por ejemplo SalesMethods.cs:65; AbonoMethods.cs:26, :68, :120, :160; WalletCustomerMethods.cs:65; MovBitaMethods.cs:23; FinalListProperMethods.cs:22, :55). Si un valor trae `'`, se rompe o cambia el filtro. Solo las consultas SD29 por SKU duplican el apóstrofo y codifican el filtro completo (FinalListProperMethods.cs:84, :90, :94-104). SD36 de apoyo y el SKU del monedero codifican, pero no duplican el apóstrofo (SalesMethods.cs:138; WalletMethods.cs:173).
- **RCOM-6 Forma de los errores.** No hay un formato único:
  - `BadRequest("Error, " + mensaje)` responde 400 con `{"Message":"…"}` en ventas y monedero (SaleController.cs:33; WalletCustomerController.cs:54). MovBita y SEPOMEX también responden 400, con su propio prefijo (MovBitaController.cs:25; SepomexController.cs:25).
  - `InternalServerError(ex)` responde 500 en abonos. Como `customErrors` está en `Off`, la respuesta incluye el mensaje, el tipo y la traza de la excepción (AbonosController.cs:30; Web.config:94).
  - Varios mensajes repiten el cuerpo de error de SAP (SalesMethods.cs:44; AbonoMethods.cs:48).
- **RCOM-7 Nombres en las respuestas.**
  - Web API escribe la salida con Newtonsoft. Los modelos que solo tienen `[JsonPropertyName]` de System.Text.Json salen con el nombre de C#, por ejemplo `SaleD.DocumentNumber` en lugar de `DocNumber` (SaleD.cs:17-18).
  - Los que tienen `[JsonProperty]` (MovBita, EX01, TZ01) salen con el nombre de SAP (MovBitaResponse.cs:20-21; DocNoCompResponse.cs:8-9; ZSplitDto.cs:8-9).
  - Los `JsonElement` de SD36 (`ToZsdtVbak` / `ToZsdtVbap`) son de System.Text.Json, y Newtonsoft no los escribe con su contenido (SaleD.cs:77-81).
- **RCOM-8 Logs.** Solo el detalle de monedero escribe en `sap.log` (WalletCustomerMethods.cs:74, :79, :87), además del respaldo de SD29 en el crédito (OrderMethods.cs:1004). `Logger.SAP` escribe cada línea en dos archivos `sap.log`:
  - uno en una ruta fija del servidor, solo si esa carpeta existe; si falla, se calla (Logger.cs:11-23);
  - otro en la carpeta `Logs` de la aplicación. Si esa carpeta no existe, la crea fuera del `try`, así que un error de permisos al crearla sí se propaga a quien llamó al log (Logger.cs:26-41).
  - También escribe en `Debug` (Logger.cs:44).
  - Los errores de los catálogos AWS y del cálculo del monedero solo van a la consola, que en IIS se pierde (WalletMethods.cs:58, :236).
- **RCOM-9 Prefijo `credit` compartido.** `AbonosController` usa el prefijo `credit`, igual que `CreditController`. Las rutas `credit/*` viven en dos controladores; los nombres no chocan hoy (AbonosController.cs:8; CreditController.cs:10, :17-180).

---

## Transversal: autenticación, conexiones, configuración, logs, llamadas a SAP, compilación

**Qué cubre esta sección.** ServicioSAP es una API web (ASP.NET Web API 2 sobre .NET Framework 4.7.2, `ServicioSap.csproj:17`) a la que el DMZ —el puente que usa Magento— le pide leer y escribir en SAP S/4HANA, en las bases SQL de MAVI y en otras APIs de MAVI. Aquí se explica lo que comparten **todas** las rutas: cómo arranca el servicio, cómo se protege con un token, cómo habla con SAP y con las demás fuentes, dónde deja sus logs, qué llaves de configuración usa y cómo se compila. La **tabla maestra con las 110 rutas** del servicio, con la sección de este documento que documenta cada una, está al inicio del documento, en [[#Mapa de rutas]].

**Términos que se usan aquí**

- **JWT (token)**: cadena firmada que entrega `login/auth`. Quien llama la manda en la cabecera `Authorization: Bearer <token>` en todas las demás rutas.
- **Basic**: forma de autenticarse ante S/4HANA: usuario y contraseña del usuario de servicio codificados en Base64 en la cabecera `Authorization`.
- **Token CSRF**: ficha de un solo uso que SAP Gateway exige antes de cualquier escritura (POST, PATCH, DELETE). Se pide con un GET que lleva la cabecera `X-CSRF-Token: fetch`.
- **OData**: el protocolo REST de SAP. Las listas llegan con la forma `{"d":{"results":[...]}}`.
- **`Conexion.dll`**: biblioteca interna de MAVI (`Helpers\ConexionSAP\Conexion.dll`, referenciada en `ServicioSap.csproj:48-50`) que entrega la URL base de S/4HANA, las credenciales del usuario de servicio y la conexión a SIGMavi. Los mensajes y comentarios del código la llaman "ConexionSap.dll" (`Helpers/TokenGenerator.cs:74`).
- **Mandante (`sap-client`)**: número de "cliente" dentro del sistema SAP. El código usa 110 en todas las URLs.
- **Web.config**: archivo de configuración del sitio. En este documento solo se nombran sus llaves, nunca sus valores.
- **App pool**: el proceso de IIS que ejecuta el servicio. Lo que se guarda "en memoria" vive hasta que el app pool se recicla.

**Cómo viaja una petición, de punta a punta**

1. El DMZ pide un token a `POST login/auth` con el usuario de servicio (DMZ `WebApiMagento/Helper/Curl.cs:80`).
2. Llama a la ruta que necesita con `Authorization: Bearer <token>`.
3. `TokenValidationHandler` revisa el token antes que nadie (`App_Start/WebApiConfig.cs:17`).
4. El `[Authorize]` del controlador deja pasar solo peticiones con identidad válida (p. ej. `Controllers/OrderController.cs:12`).
5. El controlador delega en una clase de `Methods\`, que habla con S/4HANA (Basic + CSRF), con SQL Server (`ConexionSQL`), con SQLite (`SQLiteDb`), con APIs de MAVI/AWS o con el DMZ (`Curl`).
6. La respuesta vuelve al DMZ; los errores quedan en `sap.log` (`Helpers/Logger.cs:11`, `:32`).

**Mapa rápido de componentes**

| Componente | Archivo | Para qué sirve |
|---|---|---|
| Arranque | `Global.asax:1`, `Global.asax.cs:14-18`, `App_Start/WebApiConfig.cs:11-23` | Registra rutas y el validador de tokens |
| Login y JWT | `Controllers/LoginController.cs:21`, `Helpers/TokenGenerator.cs:31-57`, `Helpers/HashService.cs:6-51` | Entrega y firma el token |
| Validación del JWT | `Helpers/TokenValidationHandler.cs:18-90` | Revisa el token de cada petición |
| Cliente S/4HANA | `Helpers/TokenGenerator.cs:60-171`, `Methods/Utils/RequestMethods.cs:18-38` | Basic, cookies, CSRF y TLS hacia SAP |
| Cliente externo | `Helpers/TokenGenerator.cs:92-111` | AWS y APIs `*.mavi.fun` sin credenciales de SAP |
| Cliente hacia el DMZ | `Helpers/ConexionDMZ/Curl.cs:12-146` | ServicioSAP pidiéndole algo a Magento vía DMZ |
| SQL Server | `Helpers/ConexionDB/ConexionSQL.cs:9-195` | SIGMavi, Android (MAVICBOSANDROID), AdminDoc |
| SQLite | `Helpers/ConexionDB/SQLiteDb.cs:9-271` | Base local `data.db` |
| Carpetas de red | `Helpers/Impersonation/Impersonation.cs:11-47` | Entrar a shares SMB con una cuenta de servicio |
| Correo | `Helpers/MailHelper.cs:8-161` | Aviso de "pedido listo para recoger" |
| Condiciones de pago | `Helpers/PaymentConditionCatalog.cs:6-139` | Texto de Magento → código SAP de condición |
| Tipos de material | `Helpers/Catalog/CatalogoMethods.cs:10-116`, `Helpers/MaterialSAP/TiposMaterialSAP.json` | Qué tipos de material SAP pueden ir al e-commerce |
| Estados de México | `Helpers/CatalogState/CatalogoEstados.cs:7-62` | Nombre de estado → clave de 3 letras (sin uso hoy) |
| Logs | `Helpers/Logger.cs:6-46`, `Helpers/Logger/GeneradorLog.cs:6-41` | Bitácora en archivo |

---

### Arranque del servicio y canal de cada petición  (WebApiApplication.Application_Start, Global.asax.cs:14)

- **Para qué sirve:** prepara el servicio cuando IIS lo levanta: activa las rutas declaradas en los controladores y mete el validador de tokens delante de todas las peticiones.
- **Quién la llama:** IIS al iniciar el sitio (`Global.asax:1`, que hereda de `ServicioSap.WebApiApplication`).
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. `Application_Start` registra las áreas MVC (no hay ninguna en el proyecto) (`Global.asax.cs:16`).
  2. Llama a `WebApiConfig.Register` (`Global.asax.cs:17`).
  3. `Register` activa las rutas por atributo (`[RoutePrefix]` + `[Route]`) (`App_Start/WebApiConfig.cs:16`).
  4. Agrega `TokenValidationHandler` como manejador de mensajes de todas las peticiones (`App_Start/WebApiConfig.cs:17`).
  5. Registra además la ruta convencional `api/{controller}/{id}` (`App_Start/WebApiConfig.cs:18-22`).
- **Reglas de negocio:**
  - **RTR-1** El mapa real de rutas es el de los atributos `[RoutePrefix]`/`[Route]` de los controladores; está completo en la tabla maestra ([[#Mapa de rutas]], al inicio del documento) (`App_Start/WebApiConfig.cs:16`).
  - **RTR-2** Toda petición pasa primero por `TokenValidationHandler`, sin excepción de ruta (`App_Start/WebApiConfig.cs:17`).
  - **RTR-3** La ruta convencional `api/{controller}/{id}` queda registrada pero no atiende ninguna acción: las 110 acciones tienen `[Route]`, y Web API 2 no expone por la ruta convencional las acciones con ruta por atributo (`App_Start/WebApiConfig.cs:18-22`).
  - **RTR-4** No hay filtros globales, manejador global de excepciones, CORS ni páginas de ayuda registrados: cada acción decide su respuesta (`App_Start/WebApiConfig.cs:11-23`, `Global.asax.cs:14-18`).
  - **RTR-5** IIS deja pasar todos los verbos (incluidos PATCH y DELETE) por el manejador sin extensión con `verb="*"` y quita los manejadores de OPTIONS y TRACE (`Web.config:104-109`).
  - **RTR-6** Una petición puede pesar hasta 50 MB, pensado para imágenes Base64 (selfies y comprobantes); los dos límites deben ir juntos o IIS corta en 30 MB con 404.13 (`Web.config:92-93`, `:100-101`).
  - **RTR-7** El detalle de los errores viaja a quien llama: `customErrors mode="Off"` y `httpErrors errorMode="Detailed"` (`Web.config:94`, `:97`).
- **Fuentes de datos:** ninguna.
- **Salida y errores:** no aplica. Si una acción deja escapar una excepción, Web API responde 500 y, por RTR-7, con el mensaje de la excepción.
- **Configuración usada:** `system.web/compilation`, `httpRuntime`, `customErrors`; `system.webServer/httpErrors`, `requestLimits`, `handlers` (`Web.config:90-110`).
- **Pendientes conocidos:** la ruta convencional sobra (RTR-3). `compilation debug="true"` (`Web.config:91`) solo se quita con la transformación de Release (`Web.Release.config:18`); la de Debug no cambia nada (`Web.Debug.config:5-30`, solo ejemplos comentados).

---

### POST login/auth  (LoginController.Authenticate, Controllers/LoginController.cs:21)

- **Para qué sirve:** entrega el token (JWT) que hay que mandar en todas las demás rutas. Hay **una sola cuenta de servicio**, cuyo usuario y contraseña viven en Web.config como hash. La ruta también aparece en la sección 04; aquí se explica el mecanismo.
- **Quién la llama:** el constructor del helper `Curl` del DMZ, antes de cualquier llamada puenteada (DMZ `WebApiMagento/Helper/Curl.cs:80`). En el CSV de seguimiento, la ruta del DMZ `login/authenticate` → `login/auth` figura como "Deprecado" (`MAVI - DMZ-SAP.csv:63`).
- **Entrada:** cuerpo JSON con el modelo `Login` (`Models/Login.cs:8-12`):
  - `Password` (string) y `Username` (string). El código no los marca como obligatorios. Si llegan vacíos (`""`), el hash no coincide y responde 401. Si **faltan** (null), el cálculo del hash lanza un error y responde 500: `Rfc2898DeriveBytes` no acepta texto nulo (`Helpers/HashService.cs:20`). La contraseña se revisa primero; el usuario solo se revisa si la contraseña coincidió (`Controllers/LoginController.cs:30-32`).
  - Si no llega cuerpo, responde 400 (`Controllers/LoginController.cs:23-26`).
- **Cómo funciona (paso a paso):**
  1. La petición pasa por `TokenValidationHandler`; si no trae cabecera `Authorization`, sigue sin identidad (`Helpers/TokenValidationHandler.cs:39-43`). El controlador es `[AllowAnonymous]`, así que no exige token (`Controllers/LoginController.cs:14`).
  2. Si el cuerpo es nulo, responde 400 (`Controllers/LoginController.cs:23-26`).
  3. Calcula el hash de `Password` con la sal `PASS_SALT` y lo compara con `PASS_HASH` (`Controllers/LoginController.cs:30`).
  4. Calcula el hash de `Username` con `USER_SALT` y lo compara con `USER_HASH` (`Controllers/LoginController.cs:32`). Las dos comparaciones deben dar verdadero (`:31`).
  5. Si coinciden, genera el JWT con el usuario recibido (`Controllers/LoginController.cs:35` → `Helpers/TokenGenerator.cs:31-57`) y lo devuelve (`Controllers/LoginController.cs:36`).
  6. Si no coinciden, responde 401 (`Controllers/LoginController.cs:40`).
- **Reglas de negocio:**
  - **RTR-8** Ni el usuario ni la contraseña se guardan en claro: Web.config solo tiene hash y sal (en Base64) de cada uno, y la validación recalcula el hash (`Controllers/LoginController.cs:30-32`, `Helpers/HashService.cs:37-41`).
  - **RTR-9** El hash es PBKDF2 (`Rfc2898DeriveBytes`, que en .NET Framework usa HMAC-SHA1) con 10,101 iteraciones y 24 bytes de salida (`Helpers/HashService.cs:8-10`, `:18-25`).
  - **RTR-10** La comparación de hashes tarda lo mismo coincidan o no (XOR de todos los bytes y del largo), para no revelar por tiempo cuánto coincidió (`Helpers/HashService.cs:43-50`).
  - **RTR-11** El token lleva un solo dato de identidad: `Name` = el `Username` recibido (`Helpers/TokenGenerator.cs:43`). No lleva roles: cualquier token válido abre todas las rutas protegidas.
  - **RTR-12** El token se firma con HMAC-SHA256 usando `JWT_SECRET_KEY` (convertida a bytes con la codificación ANSI del sistema, `Encoding.Default`) y lleva emisor `JWT_ISSUER_TOKEN` y audiencia `JWT_AUDIENCE_TOKEN` (`Helpers/TokenGenerator.cs:34-40`, `:47-53`).
  - **RTR-13** El token vale desde el momento en que se emite (UTC) hasta `JWT_EXPIRE_MINUTES` minutos después (`Helpers/TokenGenerator.cs:51-52`).
  - **RTR-14** No hay bloqueo por intentos fallidos ni registro de intentos en log (`Controllers/LoginController.cs:21-42` no llama a `Logger`).
- **Fuentes de datos:** ninguna externa; solo llaves de Web.config.
- **Salida y errores:**
  - 200: el token como cadena JSON (entre comillas) (`Controllers/LoginController.cs:36`).
  - 400 sin cuerpo: no llegó body (`Controllers/LoginController.cs:25`).
  - 401 sin cuerpo: usuario o contraseña no coinciden (`Controllers/LoginController.cs:40`).
  - 500: si falta `Username` o `Password` en el cuerpo (null), o si faltan las llaves de hash o sal o no son Base64 válido; `Rfc2898DeriveBytes` o `Convert.FromBase64String` lanzan y nadie lo captura (`Helpers/HashService.cs:20`, `:39-40`). Por RTR-7 el detalle viaja en la respuesta.
  - 401 o 500 **antes** de llegar aquí: si la petición trae una cabecera `Authorization` con un token vencido o inválido, el validador corta antes del controlador (ver RTR-18).
- **Configuración usada:** `USER_HASH`, `USER_SALT`, `PASS_HASH`, `PASS_SALT`, `JWT_SECRET_KEY`, `JWT_AUDIENCE_TOKEN`, `JWT_ISSUER_TOKEN`, `JWT_EXPIRE_MINUTES`.
- **Pendientes conocidos:**
  - `HashService.HashString` genera una sal aleatoria pero no la devuelve, así que no sirve para crear un par hash/sal nuevo; no tiene llamadores (`Helpers/HashService.cs:12-16`).
  - La clave JWT es la misma que usa LAN (mismo emisor y audiencia; se comprobó el 2026-10-01 comparando los dos Web.config sin mostrar valores): un token de LAN es válido aquí. Separarlas rompe las rutas del DMZ que dependen de esa coincidencia; solo se cambia junto con el DMZ (GUIA_MIGRACION_FABLE.md §8.1 y §8.5.1, R-02).

---

### Validación del token en cada petición  (TokenValidationHandler.SendAsync, Helpers/TokenValidationHandler.cs:33)

- **Para qué sirve:** revisa el JWT de cada petición y, si es válido, deja la identidad puesta para que el `[Authorize]` de los controladores la acepte.
- **Quién la llama:** Web API, en todas las peticiones (`App_Start/WebApiConfig.cs:17`).
- **Entrada:** cabecera `Authorization`, con o sin el prefijo `Bearer `.
- **Cómo funciona (paso a paso):**
  1. Busca la cabecera `Authorization`. Si no existe o viene repetida, la trata como "sin token" (`Helpers/TokenValidationHandler.cs:20-27`).
  2. Si el valor empieza exactamente con `Bearer ` le quita ese prefijo; si no, toma todo el texto como token (`Helpers/TokenValidationHandler.cs:28-29`).
  3. Sin token: deja seguir la petición sin identidad (`Helpers/TokenValidationHandler.cs:39-43`). Si el controlador tiene `[Authorize]`, Web API responde 401.
  4. Con token: lee `JWT_SECRET_KEY`, `JWT_AUDIENCE_TOKEN` y `JWT_ISSUER_TOKEN` y valida firma, emisor, audiencia y vigencia (`Helpers/TokenValidationHandler.cs:47-62`).
  5. Si es válido, pone la identidad en `Thread.CurrentPrincipal` y en `HttpContext.Current.User` y deja seguir (`Helpers/TokenValidationHandler.cs:65-68`).
  6. Si la validación falla (firma, emisor, audiencia o vencimiento), responde 401 sin cuerpo (`Helpers/TokenValidationHandler.cs:70-73`, `:79`).
  7. Cualquier otro error responde 500 sin cuerpo (`Helpers/TokenValidationHandler.cs:74-77`, `:79`).
- **Reglas de negocio:**
  - **RTR-15** Una petición sin cabecera `Authorization` no se rechaza aquí; el rechazo lo hace el `[Authorize]` de cada controlador (`Helpers/TokenValidationHandler.cs:39-43`). Es a propósito, para que `login/auth` funcione sin token (GUIA_MIGRACION_FABLE.md §8.5, R-09).
  - **RTR-16** Hoy 19 de los 20 controladores exigen token: 18 con `[Authorize]` en la clase (p. ej. `Controllers/AbonosController.cs:7`, `Controllers/CreditController.cs:9`, `Controllers/OrderController.cs:12`, `Controllers/ProductController.cs:17`) y `EtiquetasController` en su única acción (`Controllers/EtiquetasController.cs:10`). Solo `LoginController` es anónimo (`Controllers/LoginController.cs:14`). Un controlador nuevo sin `[Authorize]` queda público y nada lo avisa.
  - **RTR-17** La vigencia solo revisa la fecha de expiración y sin tolerancia de reloj: un segundo después de vencer, 401 (`Helpers/TokenValidationHandler.cs:82-89`; el validador por defecto se reemplaza en `:60`).
  - **RTR-18** Un token vencido o inválido se rechaza aunque la ruta sea `[AllowAnonymous]`, porque el validador corre antes que el controlador (`Helpers/TokenValidationHandler.cs:45-79`, `App_Start/WebApiConfig.cs:17`).
  - **RTR-19** Los rechazos del validador no traen cuerpo ni dejan rastro en el log (`Helpers/TokenValidationHandler.cs:70-79`).
- **Fuentes de datos:** ninguna.
- **Salida y errores:**
  - Token válido o ausente: la petición sigue al controlador.
  - 401 vacío: firma, emisor, audiencia o vigencia no válidos.
  - 500 vacío: errores que la biblioteca de JWT no clasifica como "validación", por ejemplo un texto que no es JWT o el prefijo escrito `bearer ` en minúsculas, que se queda dentro del token (`Helpers/TokenValidationHandler.cs:29`, `:74-77`).
- **Configuración usada:** `JWT_SECRET_KEY`, `JWT_AUDIENCE_TOKEN`, `JWT_ISSUER_TOKEN`.
- **Pendientes conocidos:** el token se valida dos veces por petición, una para cada destino de la identidad (`Helpers/TokenValidationHandler.cs:65-66`); la variable `statusCode` de `:41` se asigna y no se usa.

---

### Llamadas a S/4HANA: cliente Basic y token CSRF  (TokenGenerator.CreateClientS4 y GetTokenSapAsync, Helpers/TokenGenerator.cs:113 y :135)

- **Para qué sirve:** es la única forma en que el código habla con S/4HANA. Arma un cliente HTTP con las credenciales del usuario de servicio y, para escribir, consigue el token CSRF que SAP exige.
- **Quién la llama:** 59 llamadas a `CreateClientS4` en `Methods\` (Abono, BusinessPartner, DeliveryAddress, Credit, SolicitudCreditoWeb, Account, Product, Order, FinalListProper, Sales, WalletCustomer; p. ej. `Methods/MaterialManagement/ProductMethods.cs:42`). 19 de ellas también piden CSRF con `GetTokenSapAsync` (las escrituras; p. ej. `Methods/Order/OrderMethods.cs:1587`).
- **Entrada:** la URL completa que arma cada método.
- **Cómo funciona (paso a paso):**
  1. **URL.** Cada método toma la base de `Conexion.Data.obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL)` y le pega `/<SERVICIO>/<EntitySet>?...` (p. ej. `Methods/MaterialManagement/ProductMethods.cs:38`). Si el path del servicio vive en Web.config, se le asegura la `/` inicial (`Methods/Order/OrderMethods.cs:1574-1579`).
  2. **Cliente.** `CreateClientS4` fija TLS 1.2 y el validador global de certificados (`Helpers/TokenGenerator.cs:115` → `Methods/Utils/RequestMethods.cs:18-38`), crea un `HttpClientHandler` nuevo con su propio contenedor de cookies (`Helpers/TokenGenerator.cs:117-122`), pone `Authorization: Basic`, 60 s de espera y `Accept: application/json` (`:124-130`).
  3. **Credenciales.** `GetAuthS4` lee usuario y contraseña del usuario de servicio desde `Conexion.dll` la primera vez (`Helpers/TokenGenerator.cs:70-71`), los codifica en Base64 (`:76-78`) y los deja en memoria con un candado para que dos peticiones no los calculen a la vez (`:62-68`).
  4. **Lectura (GET).** El método manda la petición, revisa el código HTTP y lee `d.results` (lista) o `d` (un solo registro) (`Methods/MaterialManagement/ProductMethods.cs:44-55`, `Models/SapResponse.cs:9-17`, `Models/SapSingleResponse.cs:9-12`).
  5. **Escritura.** Antes de escribir, `GetTokenSapAsync` hace un GET a la raíz del servicio con `X-CSRF-Token: fetch` (`Helpers/TokenGenerator.cs:139-141`), toma el token de la cabecera de respuesta (`:151-155`) y el método lo manda en la escritura **con el mismo cliente** (`Methods/Order/OrderMethods.cs:1586-1594`).
- **Reglas de negocio:**
  - **RTR-20** A S/4HANA siempre se entra con Basic del usuario de servicio que entrega `Conexion.dll`; nunca con Bearer y nunca con credenciales de Web.config (`Helpers/TokenGenerator.cs:70-71`, `:128`; GUIA §1.2).
  - **RTR-21** Un `HttpClient` y un contenedor de cookies nuevos por cada petición a SAP: el token CSRF queda ligado a la cookie de sesión de ese cliente y no se reutiliza. Es diseño; no convertirlo en cliente compartido ni reportar que no se libera (`Helpers/TokenGenerator.cs:117-126`; SKILL regla 32).
  - **RTR-22** La base de S/4HANA sale solo de `obtenerUrl(Nodos.ENVIROMENT_DEV, Nodos.SERVICE_URL)` y no trae `/` final: el path del servicio debe empezar con `/` (66 llamadas; p. ej. `Methods/MaterialManagement/ProductMethods.cs:38`; GUIA §1.1).
  - **RTR-23** Los cinco paths de servicio que viven en Web.config (`ZAPI_SALESORDER_SRV`, `ZAPI_CAMPANA_BONIFICACION_SRV`, `ZAPI_EX01_NOCOMP_SRV`, `ZAPI_TZ01_ZSPLIT_MERC`, `ZAPI_CONDPAGO`) se aceptan con o sin `/` inicial (`Methods/Order/OrderMethods.cs:1577-1578`, `Methods/MaterialManagement/AccountMethods.cs:24-28`, `Methods/Abono/AbonoMethods.cs:23-24`, `:65-66`, `Methods/Credit/CreditMethods.cs:478-479`). Para `ZAPI_SALESORDER_SRV` la raíz con la que se pide el CSRF se deriva del mismo valor (`Methods/Order/OrderMethods.cs:1581-1582`). Para `ZAPI_CAMPANA_BONIFICACION_SRV` **no**: la escritura usa la llave, pero la raíz del CSRF está escrita a mano en el código (`Methods/MaterialManagement/AccountMethods.cs:48-51`, `:100-103`).
  - **RTR-24** Para OData v4 se cambia `/odata/sap` por `/odata4/sap` sobre la misma base; el prefijo nunca se escribe a mano (`Methods/Abono/AbonoMethods.cs:60-61`, `Methods/Credit/CreditMethods.cs:469-470`).
  - **RTR-25** El mandante va escrito en cada URL como `sap-client=110` (69 apariciones; p. ej. `Methods/SalesDistribution/SalesMethods.cs:28`, con la explicación en `:25-27`).
  - **RTR-26** Una escritura no se envía si el fetch del CSRF responde con error o si SAP no entrega token o entrega `Required` (`Helpers/TokenGenerator.cs:145-149`, `:157-161`).
  - **RTR-27** El certificado de S/4HANA no se valida: el cliente acepta cualquiera (`Helpers/TokenGenerator.cs:121`). El validador global que instala `EnableTrustedHosts` (acepta un certificado con errores solo si el host es `DOMINIO_SAP`) no decide aquí, porque el validador propio del cliente tiene prioridad; ese global aplica a las conexiones del proceso que no traen validador propio, como el cliente externo, RestSharp o `WebClient` (`Methods/Utils/RequestMethods.cs:22-37`).
  - **RTR-28** Las credenciales quedan en memoria hasta que se recicla el app pool; `ClearAuthS4` existe pero nadie la llama, así que un cambio de contraseña en SAP exige reciclar (`Helpers/TokenGenerator.cs:62-63`, `:84-90`).
- **Fuentes de datos:** S/4HANA OData (los servicios concretos se documentan en cada sección). Lectura de las credenciales en `Conexion.dll` (nodos `usuarioServicio`, `contrasenaServicio`).
- **Salida y errores:**
  - Sin credenciales en el DLL: excepción "No se pudieron obtener las credenciales S4..." (`Helpers/TokenGenerator.cs:73-74`).
  - Falla del CSRF: excepción "Error obteniendo CSRF Token SAP (Async): ..." con los mensajes internos (`Helpers/TokenGenerator.cs:167-170`).
  - Qué código HTTP recibe quien llamó a la ruta lo decide cada método y controlador (ver su sección).
- **Configuración usada:** `DOMINIO_SAP` (host de confianza para TLS, `Methods/Utils/RequestMethods.cs:13-16`); los cinco paths `ZAPI_*` de RTR-23. La base y las credenciales de S/4HANA **no** están en Web.config: salen de `Conexion.dll`.
- **Pendientes conocidos:**
  - Las 68 llamadas a `obtenerUrl` (66 URLs y 2 credenciales) usan fijo `Nodos.ENVIROMENT_DEV`, y `sap-client=110` está fijo en las URLs: hay que cambiarlo para QA/Prod; conviene centralizarlo antes (GUIA §8.6, R-12).
  - TLS sin validar hacia S/4HANA, que es por donde viaja el Basic (GUIA §8.1).
  - Código sin llamadores en `RequestMethods`: `BuildSapRequest` (`Methods/Utils/RequestMethods.cs:42-53`), `BuildSapRequestS4` (`:55-72`, que además suma con `+=` un validador que acepta todo, `:58-59`), `ValidateSapResponse` (`:77-88`), `LogSapRequest` y `LogSapResponse` (`:93-110`).
  - En `TokenGenerator`, los campos `ApiService` y `_csrfToken` nunca se asignan, así que `GetApiService` y `GetCsrfToken` siempre devuelven null (`Helpers/TokenGenerator.cs:29-30`, `:173-181`; MSBuild lo marca con CS0649).
  - `ConexionSapConfig` está comentada completa (`Helpers/ConexionSAP/ConexionSapConfig.cs:8-21`).
  - La raíz del CSRF de bonificación está escrita a mano como `/ZAPI_CAMPANA_BONIFICACION_SRV/` en lugar de derivarse de la llave (`Methods/MaterialManagement/AccountMethods.cs:50`, `:102`; SKILL regla 20). Si la llave cambia de valor, el CSRF se seguiría pidiendo a la ruta vieja.

---

### Llamadas a APIs que no son S/4HANA  (TokenGenerator.CreateClientExternal, Helpers/TokenGenerator.cs:108)

- **Para qué sirve:** hablar con AWS API Gateway y con las APIs de MAVI (`*.mavi.fun`) **sin** mandarles las credenciales de SAP.
- **Quién la llama:** `Methods/MaterialManagement/ProductMethods.cs:324`, `:373`, `:716`. Otros métodos crean su propio `new HttpClient()` por llamada: `Methods/BusinessPartner/BusinessPartnerMethods.cs:214`, `:352`; `Methods/Credit/SolicitudCreditoWebMethods.cs:494`; `Methods/Order/OrderMethods.cs:1094`; `Methods/SalesDistribution/MovBitaMethods.cs:25`; `Methods/Sepomex/SepomexMethods.cs:33`; `Methods/Wallet/WalletMethods.cs:32`. Multipagos usa RestSharp (`Methods/CustomerService/CustomerServiceMethods.cs:123`). El liberador de crédito usa un `WebClient` síncrono (`Methods/Credit/LiberadorCreditoMethods.cs:72-90`), pero hoy no tiene llamadas activas: su único llamador, `LiberateClientCredit` (`Methods/Order/OrderMethods.cs:1160-1166`), no se invoca, y el hilo que lo usaba está comentado (`:678-710`).
- **Entrada:** la URL que arma cada método a partir de su llave de Web.config.
- **Cómo funciona (paso a paso):**
  1. Al cargar la clase se crea un único cliente compartido: 60 s de espera, `Accept: application/json` y sin cabecera `Authorization` (`Helpers/TokenGenerator.cs:98-106`).
  2. `CreateClientExternal` devuelve siempre ese mismo cliente (`Helpers/TokenGenerator.cs:108-111`).
- **Reglas de negocio:**
  - **RTR-29** Nunca usar `CreateClientS4` para un destino que no es S/4HANA: le mandaría al tercero las credenciales del usuario de servicio de SAP (`Helpers/TokenGenerator.cs:92-97`; GUIA §1.2).
  - **RTR-30** El destino lo decide la forma de resolver la URL: `obtenerUrl` → S/4HANA; una llave de Web.config → esa otra API (`URL_BP_API`, `URL_ANDROID_API`, `URL_SALES_DISTRIBUTION_API`, `URL_CONFIGURACIONES_API`, `AwsBaseUrl`). Consumir por una API de MAVI un dato que "vive en SAP" no es defecto (GUIA §1.1; lectores en la tabla de configuración).
  - **RTR-31** Hacia APIs que no son S/4HANA el cliente sí puede ser único y compartido, porque no hay CSRF ni cookies de sesión; así no se agotan los puertos (`Helpers/TokenGenerator.cs:92-98`).
- **Fuentes de datos:** AWS (`AwsBaseUrl`), API de configuraciones (`URL_CONFIGURACIONES_API`), API de businesspartner (`URL_BP_API`), API de Android (`URL_ANDROID_API`), API de salesanddistribution (`URL_SALES_DISTRIBUTION_API`), Multipagos (`MULTIPAGOS_APIKEY_URL`), liberador de crédito (`AUTENTICACION_URL_LIBERADOR`, `VETA_URL_LIBERADOR`; sin llamadas activas).
- **Salida y errores:** los decide cada método.
- **Configuración usada:** `AwsBaseUrl`, `URL_CONFIGURACIONES_API`, `URL_BP_API`, `URL_ANDROID_API`, `URL_SALES_DISTRIBUTION_API`, `MULTIPAGOS_APIKEY_URL`, `CODIGO_ENT`, `AUTENTICACION_URL_LIBERADOR`, `VETA_URL_LIBERADOR`, `PASSWORD_AUTENTICACION_LIBERADOR`.
- **Pendientes conocidos:** los siete sitios con `new HttpClient()` por llamada no usan el cliente compartido (inconsistencia, no falla funcional). `WalletMethods` tiene un valor de respaldo fijo en código si falta `AwsBaseUrl` (`Methods/Wallet/WalletMethods.cs:19`). El liberador es código síncrono y hoy muerto (ver arriba); si se reactiva, bloquearía un hilo por llamada.

---

### Llamadas de ServicioSAP al DMZ  (Curl.PostAsync y Curl.GetAsync, Helpers/ConexionDMZ/Curl.cs:71 y :111)

- **Para qué sirve:** cuando ServicioSAP necesita algo de Magento (catálogo, cuentas, órdenes, estatus), se lo pide al DMZ con un token del propio DMZ.
- **Quién la llama:** `Methods/Catalog/MagentoCatalogMethods.cs:33`, `Methods/Customer/MagentoAccountMethods.cs:23` y `:33`, `Methods/Order/MagentoOrderMethods.cs:23`, `Methods/Order/OrderStatusMethods.cs:32`, `Methods/Order/StorePickupMethods.cs:329` (estatus `store_pickup` y correo de recolección, `:346`, `:349`).
- **Entrada:** ruta relativa del DMZ y, en POST, el JSON ya serializado (`Helpers/ConexionDMZ/Curl.cs:71`, `:111`).
- **Cómo funciona (paso a paso):**
  1. El constructor lee `URL_DMZ` (obligatoria) y `USER_DMZ` (JSON con usuario y contraseña del DMZ); por defecto 30 s de espera y 3 intentos (`Helpers/ConexionDMZ/Curl.cs:19-28`).
  2. En cada intento crea un cliente nuevo que acepta cualquier certificado y fija el protocolo global a TLS 1.2/1.1/1.0 (`Helpers/ConexionDMZ/Curl.cs:30-46`, `:79`).
  3. Pide token: `POST login/authenticate` con el JSON de `USER_DMZ`; si la llave está vacía manda usuario y contraseña vacíos (`Helpers/ConexionDMZ/Curl.cs:48-55`). Al token le quita las comillas (`:63`).
  4. Llama la ruta con `Authorization: Bearer <token>` (`Helpers/ConexionDMZ/Curl.cs:82-85`, `:122-124`).
  5. Si responde 2xx devuelve el cuerpo tal cual (`Helpers/ConexionDMZ/Curl.cs:90`, `:129`). Si no, cuenta como error y reintenta tras esperar 2 s × número de intento (`:92`, `:99-100`).
  6. Si se acaban los intentos lanza "DMZ falló tras N intentos (...)" (`Helpers/ConexionDMZ/Curl.cs:104`, `:143`).
- **Reglas de negocio:**
  - **RTR-32** Hacia el DMZ se usa Bearer con un token que se pide al DMZ en cada intento; nunca el Basic de SAP (`Helpers/ConexionDMZ/Curl.cs:81-82`; GUIA §1.2).
  - **RTR-33** Sin `URL_DMZ` el helper no se puede crear (`Helpers/ConexionDMZ/Curl.cs:26-27`).
  - **RTR-34** Hasta 3 intentos con espera creciente (2 s y luego 4 s) (`Helpers/ConexionDMZ/Curl.cs:19`, `:75`, `:99-100`).
  - **RTR-35** Solo existen las variantes asíncronas; las síncronas se retiraron porque bloqueaban hilos (`Helpers/ConexionDMZ/Curl.cs:67-70`, `:107-110`).
- **Fuentes de datos:** DMZ (Magento). Lectura o escritura según la ruta del DMZ que se llame.
- **Salida y errores:** cuerpo de la respuesta como texto; excepción al agotar intentos. Las trazas por intento van a consola (`Helpers/ConexionDMZ/Curl.cs:88`, `:98`, `:127`, `:137`), que en IIS no se guarda.
- **Configuración usada:** `URL_DMZ`, `USER_DMZ`.
- **Pendientes conocidos:** `OrderMethods` repite el login al DMZ por su cuenta en dos avisos a Magento en lugar de usar `Curl`: `order/authorizationResult` (`Methods/Order/OrderMethods.cs:1177-1215`), que hoy solo se invoca desde el bloque comentado `:678-710`, y `order/setCAccount` (`:1270`), que sí corre al crear una orden (`:1933`). TLS sin validar y protocolos antiguos habilitados para todo el proceso (`Helpers/ConexionDMZ/Curl.cs:34`, `:37-38`). En Dev `URL_DMZ` apunta a un equipo local; es correcto mientras se prueba y se cambia en el pase (GUIA §8.6).

---

### Conexiones a SQL Server  (conexionSQL, Helpers/ConexionDB/ConexionSQL.cs:9)

- **Para qué sirve:** es el único lugar del código donde se abren conexiones a SQL Server.
- **Quién la llama:**
  - **SIGMavi:** `Methods/Credit/CreditMethods.cs:25`, `Methods/Customer/CustomerMethods.cs:33`, `Methods/ImagenManagement/ImagenMethods.cs:32`, `Methods/MaterialManagement/ProductMethods.cs:426` (y otras 8 en el mismo archivo), `Methods/Order/OrderMethods.cs:1024`, `:1078`, `:1127`, `:3320`, `Methods/Order/StorePickupMethods.cs:31` (y otras 5 en el mismo archivo).
  - **Android (MAVICBOSANDROID):** `Methods/Credit/CreditMethods.cs:126` (y otras 7 en el mismo archivo), `Methods/Credit/SolicitudCreditoWebMethods.cs:162`, `:339`, `Methods/CustomerService/CustomerServiceMethods.cs:45`, `Methods/Order/OrderMethods.cs:594`, `:843`.
  - **AdminDoc:** `Methods/Credit/DocumentMethods.cs:137`, `:284`.
- **Entrada:** ninguna.
- **Cómo funciona (paso a paso):**
  1. **SIGMavi:** pide la conexión a `Conexion.dll` con el alias de servidor de la configuración `Server` y la base `"SIGMavi"` (`Helpers/ConexionDB/ConexionSQL.cs:15`, `:19`; versión async `:75`, `:79`).
  2. **Android:** toma la cadena `MAVICBOSANDROID` de Web.config; si falta, lanza error (`Helpers/ConexionDB/ConexionSQL.cs:47-49`; async `:106-108`).
  3. **AdminDoc:** toma la cadena `ADMINDOC` de Web.config (`Helpers/ConexionDB/ConexionSQL.cs:140-142`; async `:171-173`). Es la base del expediente digital del cliente (`MAVI_DOC_CTE`) (`:131-133`).
  4. En las tres pone como `ApplicationName` el nombre de la asamblea que llama, para reconocer el programa desde SQL Server, y abre la conexión (`Helpers/ConexionDB/ConexionSQL.cs:23-29`, `:55-61`, `:148-154`).
  5. Si algo falla, cierra la conexión si quedó abierta y lanza "Error en obtenerConexion<X>: ..." (`Helpers/ConexionDB/ConexionSQL.cs:33-37`, `:65-69`, `:158-162`).
- **Reglas de negocio:**
  - **RTR-36** Ningún otro archivo abre conexiones SQL: no hay `new SqlConnection` ni `new SQLiteConnection` fuera de `Helpers\ConexionDB\` (búsqueda en `*.cs`; SKILL regla 27).
  - **RTR-37** Android y AdminDoc salen de Web.config; SIGMavi sale de `Conexion.dll`. Es decisión del usuario (DU1 y DU19), no deuda (`Helpers/ConexionDB/ConexionSQL.cs:19`, `:47`, `:140`).
  - **RTR-38** La conexión se entrega **ya abierta**: quien la usa no debe volver a abrirla y la cierra con `using` (`Helpers/ConexionDB/ConexionSQL.cs:26-29`; p. ej. `Methods/Order/OrderMethods.cs:843`, `:847`; SKILL regla 4).
  - **RTR-39** Si `Conexion.dll` no devuelve conexión para SIGMavi, el método devuelve null sin error, y el llamador fallará al usarla (`Helpers/ConexionDB/ConexionSQL.cs:19-31`).
  - **RTR-40** El acceso a datos es ADO.NET clásico; Entity Framework está prohibido (SKILL regla 26).
- **Fuentes de datos:** SQL Server SIGMavi (por DLL), base del servidor de Android (`MAVICBOSANDROID`), base de expedientes (`ADMINDOC`). Las tablas y SP concretos se documentan en cada sección.
- **Salida y errores:** `SqlConnection` abierta, o excepción con el nombre del método.
- **Configuración usada:** `connectionStrings`: `MAVICBOSANDROID` (`Web.config:13`), `ADMINDOC` (`Web.config:15`, misma instancia y credenciales que Android con otra base, según `:14`); `applicationSettings`: `Server` (`Web.config:157-163`, `Properties/Settings.settings:5-6`).
- **Pendientes conocidos:**
  - `ImagenMethods` usa la variante síncrona `obtenerConexionSigMavi()` (`Methods/ImagenManagement/ImagenMethods.cs:32`).
  - El DLL solo reconoce los alias de servidor de Dev y QA; para Prod hace falta uno que el DLL conozca (DU19, `CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md` §4.5).
  - A verificar: en las variantes async, `Assembly.GetCallingAssembly()` se evalúa dentro de la máquina de estados de `async`, así que el `ApplicationName` que ve SQL Server podría no ser "ServicioSap" (`Helpers/ConexionDB/ConexionSQL.cs:84`, `:115`, `:180`).

---

### Base local SQLite  (SQLiteDb, Helpers/ConexionDB/SQLiteDb.cs:9)

- **Para qué sirve:** base local en el archivo `data.db` para datos de trabajo que no van a SAP: cargas de catálogo de Magento, órdenes de Openpay, guías de envío e información de Credilana.
- **Quién la llama (y qué tablas):**
  - Catálogo: `Methods/Catalog/MagentoCatalogMethods.cs` — `attribute_options` (`:80`), `attributes` (`:112`), `attribute_sets` (`:140`), `atributos_de_magento` (`:199`), `categories` (`:257`), `children` (`:299`), `product_in_stores` (`:338`).
  - Credilana: `Methods/Credit/CredilanaMethods.cs:17` — `mavi_credilana_info`.
  - Órdenes: `Methods/Order/OrderMethods.cs:481` — `openpay_orders`; `:510` — `openpay_stores`; `:542` (escritura) y `:566` (lectura) — `servicio_guias`.
- **Entrada:** texto SQL y, en dos variantes, un diccionario de parámetros.
- **Cómo funciona (paso a paso):**
  1. La carpeta es `SQLITE_DB_PATH`; si no está definida, una carpeta fija del sitio; el archivo siempre es `data.db` (`Helpers/ConexionDB/SQLiteDb.cs:11-21`).
  2. Cada operación abre la conexión, ejecuta y la cierra (`Helpers/ConexionDB/SQLiteDb.cs:25-38`, `:152-156`).
- **Reglas de negocio:**
  - **RTR-41** Las variantes sin parámetros (`Set`, `Get`, `SetAsync`, `GetAsync`) se tragan los errores de la consulta: una escritura fallida no avisa y una lectura fallida devuelve vacío (`Helpers/ConexionDB/SQLiteDb.cs:53-56`, `:85-88`, `:110-113`, `:171-174`, `:203-206`, `:228-231`). El error al **abrir** el archivo (por ejemplo, si la carpeta no existe) sí sube, porque la apertura está antes del `try` (`:42`, `:62`, `:95`, `:160`, `:180`, `:213`).
  - **RTR-42** Las variantes con parámetros sí dejan subir el error, para distinguir "sin resultados" de "falló la consulta" (`Helpers/ConexionDB/SQLiteDb.cs:118-121`, `:145-148`, `:236-239`, `:264-267`).
  - **RTR-43** La carpeta se lee una sola vez al cargar la clase; cambiar la llave exige reiniciar el sitio (`Helpers/ConexionDB/SQLiteDb.cs:18-21`).
  - **RTR-44** En el equipo de un desarrollador, `Web.local.config` puede sobrescribir `SQLITE_DB_PATH` sin tocar la ruta del servidor; si el archivo no existe se ignora (`Web.config:17-20`).
- **Fuentes de datos:** SQLite `data.db` (lectura y escritura).
- **Salida y errores:** filas como `DataTable` o lista de listas de texto; ver RTR-41 y RTR-42.
- **Configuración usada:** `SQLITE_DB_PATH`.
- **Pendientes conocidos:** SQLite se mantiene solo de forma temporal (SKILL regla 3). Las variantes sin parámetros reciben SQL armado concatenando texto (p. ej. `Methods/Catalog/MagentoCatalogMethods.cs:195`).

---

### Acceso a carpetas compartidas de red  (Impersonation, Helpers/Impersonation/Impersonation.cs:22)

- **Para qué sirve:** permite leer o escribir en carpetas compartidas (SMB) a las que la cuenta del app pool no tiene acceso, usando por un momento una cuenta de servicio de Windows.
- **Quién la llama:** `Methods/Customer/CashReportMethods.cs:70-76` (copia el reporte de clientes de contado al share) y `Methods/ProductImage/ProductImageMethods.cs:41-44` (lee imágenes de producto del share) (`Helpers/Impersonation/Impersonation.cs:7-10`).
- **Entrada:** usuario, dominio y contraseña de la cuenta de servicio.
- **Cómo funciona (paso a paso):**
  1. Inicia sesión de Windows con esa cuenta (inicio interactivo, proveedor por defecto) (`Helpers/Impersonation/Impersonation.cs:26`).
  2. Si falla, lanza `UnauthorizedAccessException` con el código de error de Windows (`Helpers/Impersonation/Impersonation.cs:27-30`).
  3. Toma la identidad y libera el token de Windows (`Helpers/Impersonation/Impersonation.cs:32-35`).
  4. Al cerrar el bloque `using`, regresa a la identidad original (`Helpers/Impersonation/Impersonation.cs:38-46`).
- **Reglas de negocio:**
  - **RTR-45** Solo el código dentro del bloque `using` corre con la cuenta de servicio; al salir se vuelve a la identidad del app pool (`Helpers/Impersonation/Impersonation.cs:38-46`, `Methods/Customer/CashReportMethods.cs:70-76`).
  - **RTR-46** Las credenciales de la cuenta salen solo de Web.config (`Methods/Customer/CashReportMethods.cs:71-73`, `Methods/ProductImage/ProductImageMethods.cs:42-44`).
- **Fuentes de datos:** carpetas compartidas de red del reporte de contado y de imágenes de producto (rutas en Web.config).
- **Salida y errores:** no devuelve nada; error de inicio de sesión como `UnauthorizedAccessException`.
- **Configuración usada:** `SMB_IMPERSONATION_DOMAIN`, `SMB_IMPERSONATION_USER`, `SMB_IMPERSONATION_PASSWORD`.
- **Pendientes conocidos:** los nombres de archivo que llegan en el cuerpo se pegan a la ruta con `Path.Combine` sin limpiar (riesgo de salir de la carpeta), y en imágenes eso corre con la cuenta de servicio (`Methods/Customer/CashReportMethods.cs:61`, `:75`; `Methods/ProductImage/ProductImageMethods.cs:38-39`; GUIA §8.1).

---

### Correo de "pedido listo para recoger"  (MailHelper.EnviarCorreoPickupAsync, Helpers/MailHelper.cs:10)

- **Para qué sirve:** avisa al cliente por correo que su pedido ya puede recogerse en sucursal y le manda la clave de recolección.
- **Quién la llama:** `Methods/Order/StorePickupMethods.cs:249-250`, al generar una clave nueva (ruta documentada en la sección 01).
- **Entrada:** `uen` (1 = Muebles América, 2 = VIU), correo del cliente, nombre del cliente, número de orden y clave (`Helpers/MailHelper.cs:10`).
- **Cómo funciona (paso a paso):**
  1. Según la UEN elige marca, ligas, remitente "no-reply" de la marca y agrega el buzón de venta en línea de esa marca como segundo destinatario (en "Para", no en copia) (`Helpers/MailHelper.cs:30-61`).
  2. Arma el HTML con saludo, número de orden y clave (`Helpers/MailHelper.cs:63-111`).
  3. Envía por SMTP, puerto 587, sin SSL (`Helpers/MailHelper.cs:119`, `:143-147`).
  4. Si el envío falla, solo lo escribe en consola y no interrumpe el flujo (`Helpers/MailHelper.cs:149-157`).
- **Reglas de negocio:**
  - **RTR-47** Asunto "Clave de pedido - <tienda>", y el buzón de venta en línea de la marca siempre va como destinatario junto con el cliente (`Helpers/MailHelper.cs:42-44`, `:58-60`, `:135-141`).
  - **RTR-48** Los destinatarios vacíos se omiten (`Helpers/MailHelper.cs:135-141`).
  - **RTR-49** Un correo que no se pudo enviar no cambia la respuesta de la ruta (`Helpers/MailHelper.cs:149-157`).
- **Fuentes de datos:** servidor SMTP de MAVI (escritura).
- **Salida y errores:** no devuelve nada. Con una UEN distinta de 1 o 2 el remitente queda vacío y crear la dirección lanza una excepción **antes** del `try`, que sube a quien llamó (`Helpers/MailHelper.cs:13`, `:129`).
- **Configuración usada:** ninguna; todo está fijo en el código.
- **Pendientes conocidos:** las credenciales SMTP están escritas en el código, marcadas "FIXME: Migrar a Web.config" (`Helpers/MailHelper.cs:113-117`). Ligas, íconos y teléfono de contacto están fijos en el código (`:23-26`, `:32-60`, `:80`). El error de envío no queda en `sap.log`.

---

### Catálogo de condiciones de pago Magento → SAP  (PaymentConditionCatalog.GetSapPaymentCode, Helpers/PaymentConditionCatalog.cs:122)

- **Para qué sirve:** traduce el texto de condición de pago que manda Magento (por ejemplo "12 M MA P INM") al código SAP de 4 caracteres.
- **Quién la llama:**
  - `Methods/Credit/CreditMethods.cs:45` y `:87` (respaldo vacío), en `credit/getPlazos`.
  - `Methods/Order/OrderMethods.cs:3345`, como último recurso de `GetCondicionAsync` (`:3314`): primero busca la condición en SIGMavi, tabla `CondicionesCredVtaLinea` (`:3322-3324`), y solo si no hay fila o la consulta falla usa este catálogo. `GetCondicionAsync` la usan la ruta `order/getCondicion` (`Controllers/OrderController.cs:321`, respaldo `ACEF`), el alta de líneas de crédito (`InsertCreditArticlesAsync`, `Methods/Order/OrderMethods.cs:832`, respaldo vacío) y el armado del pedido para SAP (`BuildSapOrderAsync`, `:2229`, respaldo `ACEF`).
  - `Methods/Order/OrderMethods.cs:2243` está dentro de un bloque comentado (`:2238`), no corre.
- **Entrada:** texto de la condición y valor de respaldo.
- **Cómo funciona (paso a paso):**
  1. Si el texto viene vacío, devuelve el respaldo (`Helpers/PaymentConditionCatalog.cs:124-127`).
  2. Quita espacios de los extremos (`Helpers/PaymentConditionCatalog.cs:129`).
  3. Busca en la tabla sin distinguir mayúsculas y minúsculas (`Helpers/PaymentConditionCatalog.cs:8`, `:131-134`).
  4. Si no está, devuelve el respaldo (`Helpers/PaymentConditionCatalog.cs:137`).
- **Reglas de negocio:**
  - **RTR-50** Si el llamador no da respaldo, se usa `ACEF` (contado Muebles América) (`Helpers/PaymentConditionCatalog.cs:122`).
  - **RTR-51** La comparación ignora mayúsculas y espacios de los extremos (`Helpers/PaymentConditionCatalog.cs:8`, `:129`).
  - **RTR-52** Varias descripciones pueden dar el mismo código, por ejemplo "12 M MA P DIF" y "Credito MA Pisos 12M P DIF" dan `12DA` (`Helpers/PaymentConditionCatalog.cs:57-58`).
- **Fuentes de datos:** tabla fija en código, cerca de 100 entradas (`Helpers/PaymentConditionCatalog.cs:10-113`).
- **Salida y errores:** código SAP o respaldo; nunca lanza error.
- **Configuración usada:** ninguna.
- **Pendientes conocidos:** una condición nueva que no esté en `CondicionesCredVtaLinea` exige cambiar el código y recompilar.

---

### Catálogo de tipos de material SAP válidos para e-commerce  (CatalogoMethods.GetTiposValidosEcommerce, Helpers/Catalog/CatalogoMethods.cs:68)

- **Para qué sirve:** dice qué tipos de material SAP (campo `Type` del artículo) pueden publicarse en el e-commerce. Sustituye el filtro de LAN "Tipo NOT IN ('Servicio','Juego')".
- **Quién la llama:** `Methods/Ecommerce/EcommerceMethods.cs:43` y `:60`, al cargar los datos para `ecommerce/listado` y `product/exportaart/{store}` (`Controllers/EcommerceController.cs:16`, `Controllers/ProductController.cs:30`; se documentan en la 06).
- **Entrada:** ninguna; lee el archivo `Helpers\MaterialSAP\TiposMaterialSAP.json` del sitio.
- **Cómo funciona (paso a paso):**
  1. La primera vez arma la ruta `<carpeta del sitio>\Helpers\MaterialSAP\TiposMaterialSAP.json` (`Helpers/Catalog/CatalogoMethods.cs:32-33`).
  2. Si el archivo no existe, lanza error (`Helpers/Catalog/CatalogoMethods.cs:35-38`).
  3. Lee el JSON y guarda en memoria la lista completa y el conjunto de códigos con `ValidoEcommerce = true`, con un candado para que dos peticiones no lo carguen a la vez (`Helpers/Catalog/CatalogoMethods.cs:24-47`).
  4. El armado del listado descarta cada artículo cuyo tipo, sin espacios en los extremos, no está en ese conjunto (`Methods/Ecommerce/EcommerceMethods.cs:264-267`).
- **Reglas de negocio:**
  - **RTR-53** El archivo trae 55 tipos de material y 10 válidos para e-commerce: `FERT`, `FGTR`, `FOOD`, `FRIP`, `HAWA`, `KMAT`, `MODE`, `PLAN`, `VKHM`, `VOLL` (`Helpers/MaterialSAP/TiposMaterialSAP.json`).
  - **RTR-54** La comparación del tipo distingue mayúsculas y minúsculas (`Helpers/Catalog/CatalogoMethods.cs:44-47`, `Methods/Ecommerce/EcommerceMethods.cs:266`).
  - **RTR-55** El catálogo se lee una sola vez por vida del app pool; un cambio en el JSON exige reciclar, porque `RecargarCatalogo` no tiene llamadores (`Helpers/Catalog/CatalogoMethods.cs:21-22`, `:107-115`).
  - **RTR-56** El JSON se publica junto con el sitio (`ServicioSap.csproj:451-453`, `PreserveNewest`).
- **Fuentes de datos:** archivo `TiposMaterialSAP.json` (lectura).
- **Salida y errores:** conjunto de códigos; error "Error al cargar catálogo de tipos de material: ..." si falta o no se puede leer el archivo (`Helpers/Catalog/CatalogoMethods.cs:49-52`).
- **Configuración usada:** ninguna.
- **Pendientes conocidos:** la clase vive en `Helpers\Catalog\` pero su espacio de nombres es `ServicioSap.Methods.Catalogs` (`Helpers/Catalog/CatalogoMethods.cs:8`). `CatalogoEstados.ObtenerClave3` (nombre de estado → clave de 3 letras, 32 estados) no tiene llamadores; solo hay un `using` sin uso en `Methods/BusinessPartner/BusinessPartnerMethods.cs:4` (`Helpers/CatalogState/CatalogoEstados.cs:9-61`).

---

### Logs  (Logger.SAP, Helpers/Logger.cs:8)

- **Para qué sirve:** bitácora en archivo de errores y de trazas de negocio.
- **Quién la llama:** 94 llamadas entre controladores y `Methods\` (p. ej. `Controllers/OrderController.cs:45`, `Methods/Credit/CreditMethods.cs:114`).
- **Entrada:** etiqueta (por ejemplo `"[ORDER NEW ERROR] "`) y mensaje.
- **Cómo funciona (paso a paso):**
  1. Escribe en el archivo del servidor `C:\inetpub\wwwroot\log\sap.log`, solo si esa carpeta ya existe; si falla, lo ignora (`Helpers/Logger.cs:11-23`).
  2. Escribe en `<carpeta del sitio>\Logs\sap.log`, creando la carpeta `Logs` si no existe (`Helpers/Logger.cs:26-41`).
  3. Lo manda también a la salida de depuración con la marca `[SAP]` (`Helpers/Logger.cs:44`).
  4. Formato de cada línea: `[yyyy-MM-dd HH:mm:ss] ` + etiqueta + mensaje, con hora local (`Helpers/Logger.cs:19`, `:38`).
- **Reglas de negocio:**
  - **RTR-57** Cada mensaje se escribe en dos archivos: el del servidor (solo si su carpeta existe) y el de la carpeta del sitio (`Helpers/Logger.cs:11-21`, `:32`).
  - **RTR-58** No poder escribir el log no rompe la petición (`Helpers/Logger.cs:23`, `:41`), salvo al crear la carpeta local, que está fuera del `try` (`:28-31`).
  - **RTR-59** Las etiquetas de error siguen el patrón `[ÁREA operación ERROR]`, por ejemplo `[ORDER NEW ERROR]` (`Controllers/OrderController.cs:45`). Las trazas de llamadas a SAP usan `[SAP <ÁREA> REQUEST]`, `[SAP <ÁREA> RESPONSE]` y `[SAP <ÁREA> ERROR]` (p. ej. `Methods/Order/OrderMethods.cs:1860`, `:1865`).
  - **RTR-60** Paridad de logs con LAN: se registra lo que LAN registraba y se quitan los que LAN no tenía (DU17; SKILL regla 8). Los errores del crédito que no tienen log propio quedan en `[ORDER NEW ERROR]` (`Controllers/OrderController.cs:45`).
- **Fuentes de datos:** archivos `sap.log` (escritura).
- **Salida y errores:** no devuelve nada.
- **Configuración usada:** ninguna; las rutas están fijas en el código.
- **Pendientes conocidos:**
  - `GeneradorLog.SapLog` es una copia anterior, sin llamadores, que solo escribe al archivo del servidor (`Helpers/Logger/GeneradorLog.cs:8-39`).
  - Hay 107 `Console.WriteLine` activos en 7 archivos (`Curl`, `MailHelper`, `LiberadorCreditoMethods`, `EcommerceMethods`, `ProductMethods`, `OrderMethods` con 89, `WalletMethods`; búsqueda en `*.cs`); bajo IIS esa salida no queda en ningún lado.
  - Si el app pool no puede crear la carpeta `Logs`, la excepción sale del logger; como el logger suele llamarse dentro de un `catch`, puede tapar el error original (`Helpers/Logger.cs:28-31`).
  - Las trazas `REQUEST`/`RESPONSE` escriben el JSON completo que se manda y recibe de SAP, que puede llevar datos del cliente (`Methods/Order/OrderMethods.cs:1860`, `:1865`). El log no tiene rotación ni tamaño máximo (`Helpers/Logger.cs:17`, `:36`).

---

### Configuración: llaves de Web.config agrupadas por propósito

Solo nombres de llave, nunca valores. Los valores de ambiente son de Dev y son correctos mientras se prueba (DU1). `appSettings` admite un `Web.local.config` opcional que sobrescribe llaves solo en el equipo del desarrollador (`Web.config:17-20`).

| Propósito | Llave | Web.config | Quién la lee |
|---|---|---|---|
| Login y JWT | `JWT_SECRET_KEY`, `JWT_AUDIENCE_TOKEN`, `JWT_ISSUER_TOKEN` | `:31-33` | `Helpers/TokenGenerator.cs:34-36`, `Helpers/TokenValidationHandler.cs:47-49` |
| Login y JWT | `JWT_EXPIRE_MINUTES` | `:35` | `Helpers/TokenGenerator.cs:37` |
| Login y JWT | `USER_HASH`, `USER_SALT`, `PASS_HASH`, `PASS_SALT` | `:36-39` | `Controllers/LoginController.cs:30`, `:32` |
| S/4HANA | `DOMINIO_SAP` (host de confianza TLS) | `:26` | `Methods/Utils/RequestMethods.cs:15` |
| S/4HANA | `ZAPI_SALESORDER_SRV` (SD09, pedidos y devoluciones) | `:45` | `Methods/Order/OrderMethods.cs:1575`, `:1664`, `:1841` |
| S/4HANA | `ZAPI_CAMPANA_BONIFICACION_SRV` (SD33, bonificación) | `:48` | `Methods/MaterialManagement/AccountMethods.cs:46`, `:97` |
| S/4HANA | `ZAPI_EX01_NOCOMP_SRV`, `ZAPI_TZ01_ZSPLIT_MERC` (EX01/TZ01, abonos y no compensados) | `:51-52` | `Methods/Abono/AbonoMethods.cs:22`, `:64` |
| S/4HANA | `ZAPI_CONDPAGO` (SD40, condiciones de pago) | `:88` | `Methods/Credit/CreditMethods.cs:472` |
| S/4HANA | `SAP_STAGE` | `:34` | nadie (sin uso) |
| APIs de MAVI y AWS | `URL_SALES_DISTRIBUTION_API` | `:21` | `Methods/SalesDistribution/MovBitaMethods.cs:17`, `Methods/Sepomex/SepomexMethods.cs:16` |
| APIs de MAVI y AWS | `URL_ANDROID_API` | `:28` | `Methods/BusinessPartner/BusinessPartnerMethods.cs:344` |
| APIs de MAVI y AWS | `URL_BP_API` | `:29` | `Methods/BusinessPartner/BusinessPartnerMethods.cs:204`, `Methods/Credit/SolicitudCreditoWebMethods.cs:485`, `Methods/Order/OrderMethods.cs:1091` |
| APIs de MAVI y AWS | `URL_CONFIGURACIONES_API` | `:30` | `Methods/MaterialManagement/ProductMethods.cs:29` |
| APIs de MAVI y AWS | `AwsBaseUrl` | `:27` | `Methods/MaterialManagement/ProductMethods.cs:28`, `Methods/Wallet/WalletMethods.cs:19` |
| Liberador de crédito | `AUTENTICACION_URL_LIBERADOR`, `PASSWORD_AUTENTICACION_LIBERADOR`, `VETA_URL_LIBERADOR` | `:40-42` | `Methods/Credit/LiberadorCreditoMethods.cs:43-45` (hoy sin llamadas activas, `Methods/Order/OrderMethods.cs:1160`) |
| DMZ / Magento | `URL_DMZ`, `USER_DMZ` | `:55-56` | `Helpers/ConexionDMZ/Curl.cs:21-22`, `Methods/Order/OrderMethods.cs:1180`, `:1185`, `:1272`, `:1276` |
| Multipagos (llave BBVA) | `MULTIPAGOS_APIKEY_URL`, `CODIGO_ENT` | `:79-80` | `Methods/CustomerService/CustomerServiceMethods.cs:93-94` |
| Archivos locales | `SQLITE_DB_PATH` | `:59` | `Helpers/ConexionDB/SQLiteDb.cs:19-20` |
| Archivos locales | `IMAGES_CREDIT_PATH` (expediente de crédito) | `:62` | `Methods/Credit/DocumentMethods.cs:46` |
| Archivos locales | `IGNORE_ATTRIBUTES_PATH` (atributos que omite la carga de catálogo) | `:66` | `Methods/Catalog/MagentoCatalogMethods.cs:44` |
| Archivos y shares | `CASH_REPORT_LOCAL_PATH`, `CASH_REPORT_SHARE_PATH` | `:69-70` | `Methods/Customer/CashReportMethods.cs:28`, `:37` |
| Archivos y shares | `IMAGES_PRODUCT_SHARE_PATH`, `IMAGES_PRODUCT_PATH` | `:74-75` | `Methods/ProductImage/ProductImageMethods.cs:20`, `:29` |
| Archivos y shares | `SMB_IMPERSONATION_DOMAIN`, `SMB_IMPERSONATION_USER`, `SMB_IMPERSONATION_PASSWORD` | `:83-85` | `Methods/Customer/CashReportMethods.cs:71-73`, `Methods/ProductImage/ProductImageMethods.cs:42-44` |
| Bases SQL | `connectionStrings/MAVICBOSANDROID` | `:13` | `Helpers/ConexionDB/ConexionSQL.cs:47`, `:106` |
| Bases SQL | `connectionStrings/ADMINDOC` | `:15` | `Helpers/ConexionDB/ConexionSQL.cs:140`, `:171` |
| Bases SQL | `applicationSettings/Server` (alias para SIGMavi en el DLL) | `:157-163` | `Helpers/ConexionDB/ConexionSQL.cs:15`, `:75`; si falta en Web.config se usa el valor por defecto compilado (`Properties/Settings.Designer.cs:28`) |
| Plantilla MVC | `webpages:Version`, `webpages:Enabled`, `ClientValidationEnabled`, `UnobtrusiveJavaScriptEnabled` | `:22-25` | ningún archivo del código (vienen de la plantilla; las lee el propio ASP.NET) |
| Falta en Web.config | `SAP_BP_CAMPO_EMAIL` | — | `Methods/Customer/CustomerMethods.cs:79`; si no existe usa `Mail` (`:80`) |

Lo que **no** está en Web.config, a propósito: la URL base de S/4HANA y las credenciales del usuario de servicio (salen de `Conexion.dll`, `Helpers/TokenGenerator.cs:70-71`), y la conexión a SIGMavi (sale del DLL, DU19). Las credenciales SMTP tampoco están, pero esa sí es deuda (`Helpers/MailHelper.cs:113-117`).

---

### Proyecto, dependencias y compilación  (ServicioSap.csproj)

**Datos del proyecto**

- Aplicación web de ASP.NET (tipo de proyecto web + C#), salida `Library`, asamblea y espacio de nombres `ServicioSap`, .NET Framework 4.7.2 (`ServicioSap.csproj:12-17`). Debug y Release compilan a `bin\` (`ServicioSap.csproj:29-45`).
- Web API 5.2.7 y MVC 5.2.7 (`ServicioSap.csproj:169-177`); compilador Roslyn por CodeDom 2.0.1 (`ServicioSap.csproj:3`, `:208-209`).
- JWT: `System.IdentityModel.Tokens.Jwt` y `Microsoft.IdentityModel.*` 8.14 (`ServicioSap.csproj:65-75`, `:114-115`).
- JSON: `System.Text.Json` 8.0.5 y `Newtonsoft.Json` 12.0.2, las dos en uso (`ServicioSap.csproj:130-131`, `:155-156`).
- `RestSharp` 106.15 (Multipagos y `RequestMethods`) (`ServicioSap.csproj:84-85`); `System.Data.HashFunction` CRC 2.0 (clave de recolección en sucursal, `Methods/Order/StorePickupMethods.cs:3-4`) (`ServicioSap.csproj:87-94`); `System.Data.SQLite` 1.0.113 (`ServicioSap.csproj:101-108`, targets en `:492`, `:518`).
- DLL locales: `Conexion.dll` (`ServicioSap.csproj:48-50`) y `Nini.dll` (`ServicioSap.csproj:80-82`), que también se publican como contenido (`:448-449`). Referencias de Fakes para pruebas (`:52-53`, `:77`, `:454-455`).
- Se compilan 221 archivos `.cs` y los 221 que hay en disco están registrados con `<Compile Include>` (comparación del `.csproj` contra el disco, 2026-10-01).
- IIS Express en desarrollo (`ServicioSap.csproj:19-20`, `:502-504`).

**Cómo compilar**

1. **Chequeo rápido (sintaxis y tipos).** Script `quick_build.ps1` de la bóveda (`.agents\skills\lan-sap-migration\MappingMetods\_IMPLEMENTACION_SP_CREDITO\build\quick_build.ps1`):
   - Uso: `powershell -ExecutionPolicy Bypass -File "<ruta>\quick_build.ps1" [-Out <carpeta local>]` (`quick_build.ps1:5-6`).
   - Arma la lista de fuentes leyendo los `<Compile Include>` del `.csproj`, así que un `.cs` nuevo entra solo si está registrado (`quick_build.ps1:11-13`).
   - Toma las referencias de `bin\` (sin `ServicioSap.dll` ni Fakes) y del Framework 4.0.30319 (`quick_build.ps1:15-27`), compila con el Roslyn de `bin\roslyn\csc.exe` y muestra solo los errores (`quick_build.ps1:29-35`).
   - La salida va a una carpeta local, nunca al share (`quick_build.ps1:4`, `:6`). `exit=0` significa que compila.
2. **Compilación completa con MSBuild (obligatoria antes de cerrar una tarea).** Desde `ServicioSap\ServicioSap\` (GUIA §9b):
   ```powershell
   $roslyn = "..\packages\Microsoft.CodeDom.Providers.DotNetCompilerPlatform.2.0.1\tools\RoslynLatest"
   & "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\MSBuild.exe" ServicioSap.csproj `
       /t:Build /p:Configuration=Debug /p:VSToolsPath= `
       /p:CscToolPath=$roslyn /p:CscToolExe=csc.exe /nologo /verbosity:minimal /m
   ```
   - `/p:VSToolsPath=` salta el import de `Microsoft.WebApplication.targets`, que no está instalado y solo sirve para publicar (`ServicioSap.csproj:490`).
   - `/p:CscToolPath` y `/p:CscToolExe` usan el Roslyn de `packages\`, porque el csc del Framework es de C# 5 y no entiende `$"..."` ni otras construcciones modernas.
   - Para no escribir en el share se pueden agregar `/p:OutDir=<carpeta local>\` y `/p:IntermediateOutputPath=<carpeta local>\obj\`.
   - Avisos esperados: `ToolsVersion 15.0` desconocido (lo trata como 4.0), `MSB3644` (falta el paquete de destino de 4.7.2; requiere administrador), `MSB3245` (no encuentra `Microsoft.QualityTools.Testing.Fakes`), `MSB3247`, `MSB3270`.

**Resultado al escribir esta sección (2026-10-01):** `quick_build.ps1` → "Fuentes: 221 Referencias: 68", `exit=0`. MSBuild completo → `ServicioSap -> ...\bin\ServicioSap.dll`, 0 errores, 15 avisos (MSB3644 ×1, MSB3245 ×1, MSB3247 ×1, MSB3270 ×3, CS0649 ×6, CS0618 ×2, CS0168 ×1). Compilar limpio es la condición mínima, no la prueba de que funcione: la prueba es la E2E con request y response documentados (SKILL regla 25).

- **Reglas:**
  - **RTR-61** Todo `.cs` nuevo debe registrarse en el `.csproj` con `<Compile Include="..." />`; si no, el servidor no lo compila y no hay error visible (SKILL regla 19; `ServicioSap.csproj:213-440`).
  - **RTR-62** El chequeo rápido sirve para iterar; antes de dar algo por terminado se corre MSBuild (`quick_build.ps1:2`; GUIA §9b).
  - **RTR-63** Ninguna compilación de prueba escribe su salida en el share (`quick_build.ps1:4`).

---

### Tabla maestra de rutas

La tabla maestra se movió al inicio del documento, a [[#Mapa de rutas]], para que sea lo primero que se consulte. Su contenido no cambió.

---

### Reglas comunes del área

- **RTR-64** Asincronía: no hay `async void`, ni `.Result`, `.Wait()` o `.GetAwaiter().GetResult()` en el código (búsqueda en `*.cs`). La regla es usar `.ConfigureAwait(false)` en `Methods\` y `Helpers\` (384 usos) y no usarlo en los controladores, porque la acción puede necesitar `HttpContext` después del `await` (GUIA §1.6). No se cumple completa: hay `await` sin `.ConfigureAwait(false)` en la librería, p. ej. `Helpers/ConexionDB/ConexionSQL.cs:88`, `Helpers/ConexionDB/SQLiteDb.cs:155`, `Methods/Catalog/MagentoCatalogMethods.cs:53`, `Methods/Order/StorePickupMethods.cs:31` (higiene, no falla; GUIA §8.1), y un controlador que sí lo usa: `Controllers/WholesaleCustomerController.cs:25`. Partes síncronas: las acciones `login/auth`, `credit/ApplyPaymentNeko` y `ma/imagenes/cache/clear` (`Controllers/LoginController.cs:21`, `Controllers/AbonosController.cs:53`, `Controllers/ImagenController.cs:64`), la conexión síncrona de `Methods/ImagenManagement/ImagenMethods.cs:32` y el `WebClient` del liberador (`Methods/Credit/LiberadorCreditoMethods.cs:72-90`, sin llamadas activas). `credit/SaveImagesProductosMx` deja el trabajo en segundo plano con `Task.Run` y responde sin esperar (`Methods/Credit/DocumentMethods.cs:229`).
- **RTR-65** La regla es que los controladores solo reciban la petición y deleguen; la lógica y las llamadas a SAP viven en `Methods\` (SKILL regla 17). Algunos controladores sí arman o transforman la respuesta, por ejemplo `Controllers/WalletCustomerController.cs:28-49` y `Controllers/OrderController.cs:28-34`.
- **RTR-66** Por diseño, el resultado de negocio viaja en el cuerpo con HTTP 200 y el DMZ no interpreta códigos (GUIA §1.5). En la práctica las acciones mezclan `Ok` (113), `BadRequest` (106), `InternalServerError` (26), `Json` (4), `NotFound` (3), `StatusCode` (3, con 201 y 204 en `product/seo`, `Controllers/ProductController.cs:425`, `:443`, `:461`), `Unauthorized` (1) y 16 `throw new HttpResponseException` con 400 o 500 (búsqueda en `Controllers\*.cs` sin líneas comentadas); el código de cada ruta está en su sección.
- **RTR-67** Ni URLs, ni hosts, ni credenciales en el código: S/4HANA por `Conexion.dll` y todo lo demás por Web.config (SKILL reglas 7, 9 y 20). Excepciones conocidas: SMTP (`Helpers/MailHelper.cs:113-117`), el respaldo de `AwsBaseUrl` (`Methods/Wallet/WalletMethods.cs:19`), la raíz CSRF de bonificación (`Methods/MaterialManagement/AccountMethods.cs:50`, `:102`), las rutas de log (`Helpers/Logger.cs:11`) y las carpetas de respaldo que se usan cuando falta la llave de Web.config, dos de ellas carpetas compartidas de red (`Helpers/ConexionDB/SQLiteDb.cs:16`, `Methods/Customer/CashReportMethods.cs:19`, `:22`, `Methods/ProductImage/ProductImageMethods.cs:14-15`, `Methods/Credit/DocumentMethods.cs:40`, `Methods/Catalog/MagentoCatalogMethods.cs:38`).
- **RTR-68** Los valores de ambiente de Dev en Web.config y en `Conexion.dll` son correctos y no son bloqueo; no se marcan como riesgo (DU1).
- **RTR-69** Paridad con LAN: se replica lo que hace LAN, con sus valores, aunque parezca mejorable; las diferencias aceptadas quedan registradas como decisión del usuario (DU5; GUIA §1.9).

**Pendientes transversales (resumen)**

| Id | Pendiente | Evidencia | Referencia |
|---|---|---|---|
| PT-1 | Credenciales SMTP en código | `Helpers/MailHelper.cs:113-117` | FIXME del código |
| PT-2 | Nodo `ENVIROMENT_DEV` fijo en 68 llamadas y `sap-client=110` en 69 URLs | `Helpers/TokenGenerator.cs:70-71`, p. ej. `Methods/MaterialManagement/ProductMethods.cs:38` | GUIA §8.6 (R-12), prerrequisito de pase |
| PT-3 | TLS sin validar hacia S/4HANA y DMZ; protocolo global cambiado por varios sitios (TLS 1.2 solo vs 1.2/1.1/1.0; gana el último que corre) | `Helpers/TokenGenerator.cs:121`, `Helpers/ConexionDMZ/Curl.cs:34-38`, `Methods/Utils/RequestMethods.cs:20`, `Methods/Order/OrderMethods.cs:1203-1206`, `:1294-1297` | GUIA §8.1 |
| PT-4 | Clave JWT compartida con LAN | `Helpers/TokenGenerator.cs:34-36` | GUIA §8.5.1 (R-02): cambiar solo junto con el DMZ |
| PT-5 | Código sin uso: `GeneradorLog`, `ConexionSapConfig`, `GetApiService`/`GetCsrfToken`, `ClearAuthS4`, `HashString`, métodos de `RequestMethods`, `CatalogoEstados`, `RecargarCatalogo`, liberador de crédito (`LiberateClientCredit`) y aviso `order/authorizationResult`, ruta convencional | ver cada bloque | Regla 12 del SKILL: señalar para decidir si se borra |
| PT-6 | Detalle de excepciones visible para quien llama | `Web.config:94`, `:97` | — |
| PT-7 | Logs: `Console.WriteLine` que se pierde en IIS; creación de carpeta fuera del `try` | `Helpers/Logger.cs:28-31` | — |
| PT-8 | Login al DMZ duplicado fuera de `Curl` | `Methods/Order/OrderMethods.cs:1177-1215`, `:1270` | — |
| PT-9 | Llaves sin uso (`SAP_STAGE`, plantilla MVC) y llave leída que no existe (`SAP_BP_CAMPO_EMAIL`) | `Web.config:22-25`, `:34`; `Methods/Customer/CustomerMethods.cs:79-80` | — |
| PT-10 | Rutas de prueba `order/testnew` y `partner/testnew` | `Controllers/OrderController.cs:50-54`, `Controllers/BusinessPartnerController.cs:119-121` | GUIA §8.2 |
| PT-11 | Alias de servidor de SIGMavi para Prod no existe en el DLL | `Helpers/ConexionDB/ConexionSQL.cs:19`, `:79` | DU19 |
| PT-12 | Raíz del CSRF de bonificación escrita a mano en vez de salir de `ZAPI_CAMPANA_BONIFICACION_SRV` | `Methods/MaterialManagement/AccountMethods.cs:50`, `:102` | SKILL regla 20 |
| PT-13 | Carpetas de respaldo fijas en código (incluye dos shares de red) si falta la llave de Web.config | `Methods/Customer/CashReportMethods.cs:22`, `Methods/ProductImage/ProductImageMethods.cs:14` | SKILL regla 7 |
| PT-14 | Trazas de SAP con el JSON completo en `sap.log`, sin rotación | `Methods/Order/OrderMethods.cs:1860`, `:1865`; `Helpers/Logger.cs:17` | — |

---

## Pendientes globales

Aquí están juntos, por sección, todos los elementos de los campos "Pendientes conocidos", copiados tal cual. La copia maestra es la del bloque de cada ruta, que además da el contexto. Se omiten los 24 bloques que dicen "ninguno". Hay además dos listas que no son campos de ruta: los pendientes transversales PT-1 a PT-14 (sección 08, "Pendientes transversales (resumen)") y el código sin ruta de la sección 01 ("Código del área sin ruta (de apoyo o pendiente)").

### 01 · Órdenes de contado y posventa

Sección: [[#Órdenes (contado, devoluciones, cancelaciones, guías, recoger en sucursal, Openpay/PayPal)|Órdenes (contado, devoluciones, cancelaciones, guías, recoger en sucursal, Openpay/PayPal)]]

- **POST order/new**:
  - El "código postal" de la validación de región toma `sDatosPedido[20]`, que es el **estado**; el código postal es el índice 17 (`OrderMethods.cs:1805` contra `:269`, `:272`). Con un estado como "Jalisco", un SKU "-R5" se reescribiría a "-RJ".
  - La región de celulares se valida después de las existencias: un SKU reescrito no pasa por DIM11 (`OrderMethods.cs:1812-1819`).
  - El registro de recoger en sucursal pasa `sDatosPedido[16]` (número interior) como correo (`OrderMethods.cs:1908` contra `:268`); hoy es un stub sin efecto (`:1553-1555`).
  - `ValidarOrdenCompleta` y `ValidateOrderRequest` existen pero no se llaman: no hay validación previa de artículos ni de cliente (`OrderMethods.cs:387-405`, `:2526-2533`).
  - La dirección se liga usando `PurchNoS` de la respuesta, y el pedido lo envía vacío; si SAP no lo devuelve lleno, la dirección no se liga (solo queda un aviso en consola) (`OrderMethods.cs:1487-1506`, `:2289`).
  - Monedero sin definir en SAP (TODO, `OrderMethods.cs:1377-1379`); la afectación `spAfectar` no está implementada ni se llama (`:1527-1543`).
  - Agente `Z1` genérico de ecommerce pendiente de solicitar a MAVI; hoy va vacío si no viene (`OrderMethods.cs:62-72`).
  - Validación de la condición contra SD40 comentada, en revisión (`OrderMethods.cs:2238-2274`).
  - Nadie en ServicioSAP lee `openpay_orders` ni `openpay_stores` (solo se escriben, `OrderMethods.cs:480-482`, `:509-511`): los pedidos Openpay tarjeta no llegan a SAP por esta vía. En el tracker siguen pendientes `order/checkOpenpay` y `order/ManagePaynetOrders` (CSV líneas 123 y 86); ver auditoría C05.
  - La fila de `openpay_stores` se escribe antes de existencias y BP; si después falla, queda la fila sin pedido SAP (`OrderMethods.cs:1765-1769` antes de `:1812-1822`).
  - El BP se da de alta antes del POST del pedido: si SAP rechaza el pedido, el BP queda creado y un reintento sin `cuenta` crea otro (`OrderMethods.cs:2601-2616` antes de `:1862`).
  - Valores de prueba fijos en el pedido: un nombre de usuario literal en `Name`, `Zsituacionusuario` y `Bname` (`OrderMethods.cs:2285`, `:2301`, `:2366`, `:2377`, `:2508`), `Zliberado` "1234" (`:2326`), `Bstkd_e`/`Ihrez_e` (`:2376-2378`); en el alta de BP `Altkn` "1234567890" y región "JAL" (`:2703`, `:2674`).
  - El precio especial no se usa como precio del pedido (RORD-29): validar con negocio (`OrderMethods.cs:2409`).
  - El filtro de DIM11 no se codifica, a diferencia de SD29 (`ProductMethods.cs:211-219`): un SKU con "+" podría no encontrarse. Por verificar en la prueba de regresión de contado ACT-25, que contempla (como opcional) un SKU con "+".
  - Prueba de regresión de contado (SD29 y `Marst` "1" en el alta de BP) pendiente: ACT-25.
- **POST order/testnew**: Eliminar antes de producción: permite escribir en SAP cualquier pedido sin validación (`OrderController.cs:52-53`).
- **POST order/setreturn** (detectados en `AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md`, sección "Defectos en la ruta de devolución"):
  - La ficha SD09 exige la **factura** en `REF_DOC` y SAP la valida; se manda el número del pedido con categoría "C" (`OrderMethods.cs:1617`, `:1629-1630`; ficha `RSG\sd09_devolucion.md:36`, `:74`).
  - Según la auditoría, `store` llega como "1"/"2" y no se traduce, por lo que caería en org. 04 / centro 2000 (RDEV-7).
  - Una devolución de una venta a crédito se crea en canal "01" (RDEV-8).
  - El campo `resolucion` del producto no se revisa (`OrderMethods.cs:2157-2166`).
  - `to_series` va vacío y SD09 valida series (`OrderMethods.cs:2515-2520`).
  - El precio se lee con `decimal.TryParse` sin cultura fija (`OrderMethods.cs:1644`).
  - El pedido original se busca siempre como ZMER, mientras que la cancelación usa `tipo` (`OrderMethods.cs:1605` contra `:2969-2970`).
- **GET order/validatecupon/{codigo}**: Cupones deprecados: avisar a Magento para retirar la casilla de promotor (ACT-35 punto 2). Código muerto de la rama "Elimina" (`OrderMethods.cs:1075-1146`). El código se pega en la URL de SuccessFactors sin codificar (`BusinessPartnerMethods.cs:350`).
- **POST order/cancelOrder**:
  - Cancelar un pedido aún sin entrega requiere marcar el pedido con `ZIDSTATUS = 03` (Anulado), y la API para hacerlo está pendiente de definir con SAP (`OrderMethods.cs:2995-3000`).
  - Si la anulación de la factura falla pero la reversión de mercancía sale bien, responde "ok" con la factura viva (`OrderMethods.cs:3038-3043`, `:3059`).
  - Si se anuló la factura y luego falla SD46, responde error con la factura ya anulada (`OrderMethods.cs:3036`, `:3051-3056`).
  - Decisión de negocio pendiente: qué hacer con un pedido ya facturado (anulación o devolución) (auditoría C02).
- **POST order/cancelInvoice**: Marcada como deprecada en el tracker, aunque el endpoint existe (CSV línea 81).
- **GET order/generateNewStorepickupCode/{idEcommerce}**:
  - SD36 se consulta con el `idEcommerce` sin el prefijo `ZSD_ZMER_` que usa `order/new` (`StorePickupMethods.cs:226` contra `OrderMethods.cs:2279`): si llega solo el número, no encontrará el pedido.
  - Credenciales SMTP en el código, marcadas FIXME para moverlas al Web.config (`MailHelper.cs:113-117`). El envío va sin SSL: la línea `EnableSsl` está comentada como en el sistema anterior (`MailHelper.cs:147`).
  - Ruta marcada como deprecada en el tracker (CSV línea 120).
- **GET order/createStorepickupCode/{idEcommerce}/{idOrder}**:
  - Igual que la ruta anterior, SD36 se consulta sin el prefijo `ZSD_ZMER_` (`StorePickupMethods.cs:264`).
  - La consulta de direcciones del BP cuando faltan correo o teléfono descarta su resultado (`StorePickupMethods.cs:276-284`).
  - El tracker anota POST y el código es GET (CSV línea 119).
  - El tracker pide además la tabla de detalle de pedidos de ecommerce, pendiente de crear (CSV línea 119).
- **POST order/GetPickUpCode**: En el tracker sigue como "To Do" aunque la ruta ya existe (CSV línea 85).

### 02 · Órdenes a crédito

Sección: [[#Órdenes a crédito (rama omnipro_pago_credito de order/new)|Órdenes a crédito (rama omnipro_pago_credito de order/new)]]

- **POST order/new — rama de crédito**:
  - Liberador y aviso a Magento apagados: bloque comentado en OrderMethods.cs:677-711, que tal como está no compila (usa `idClienteMagento`, que no existe, y `await` dentro de una lambda que no es async). En LAN se disparaban solo para clientes existentes (cuentas `C…`, hoy = BP existente por DU2). Espera al otro equipo (DU11; T1b, ACT-28). Ver el bloque "(sin ruta) Liberador de crédito y aviso a Magento".
  - `creditStatus` y `updateCreditOrderId` no existen en ServicioSAP (DU11; T2a ACT-29, T2b ACT-30). SD36 nunca encuentra una solicitud de crédito, así que cada reenvío de la orden crea otra solicitud (T2c, ACT-31).
  - Compuertas "sin fila" de LAN: con código postal, nombres, teléfono o `incrementId` nulos, o un teléfono demasiado corto, LAN no escribía la solicitud; aquí se escribe con `''`, `'0'`, 0 o `1900-01-02`. Falta decidir también si se acepta el `Trim` final del nombre de la guía, que LAN no hacía (P1, ACT-12; OrderMethods.cs:415, :651-654, :770, :783).
  - R1: número a validar con "en blanco" y quitando espacios; LAN usaba "longitud > 0" sin quitar espacios (ACT-08; OrderMethods.cs:626, :651).
  - R3: búsquedas telefónicas con la cuenta cruda en vez de `maestro.Partner` (ACT-07; SolicitudCreditoWebMethods.cs:27).
  - R4: limpieza de ramas `maestro != null` que ya no pueden fallar, de `fila.Confirmado` sin uso y de valores del pedido que se pisan (ACT-06; SolicitudCreditoWebMethods.cs:236-244, :285; OrderMethods.cs:759-764, :775).
  - Fecha vacía del BP en formato `/Date(-62135596800000)/` se guardaría como `0001-01-01` (G2-40, ACT-20; SolicitudCreditoWebMethods.cs:604-629).
  - `ZtelCte` puede traer prefijo (`+52`) y no se reduce a dígitos, lo que movería `LadaValidar`, `TelefonoValidar` y `ValidacionTelefono` (G3-23, ACT-18; OrderMethods.cs:626; SolicitudCreditoWebMethods.cs:387).
  - Sin teléfono validado se saltan tres lecturas que el SP siempre hacía; solo cambia el resultado cuando una lectura falla (G3-20, R2, ACT-13; SolicitudCreditoWebMethods.cs:389-392).
  - Qué fila de SD29 es la de crédito cuando hay varias (sucursal, vigencia, canal) y si se inserta una línea por fila como LAN (P7, P8 b; ACT-14; OrderMethods.cs:930-933). Precisión del precio de SEGU00001 (P8 d, ACT-14).
  - Prospecto por `ZtipoCliente` en lugar del prefijo `P` de LAN, por confirmar (P16, ACT-13). El límite de crédito no frena, como LAN (P17, ACT-13).
  - `05 M MA P DIF` / `05 M VIU P DIF` no están en el catálogo de respaldo: si SIGMavi tampoco las resuelve, la solicitud queda solo con SEGU00001 (P18, ACT-36; PaymentConditionCatalog.cs:40-43). Lo mismo pasa si SIGMavi falla y el catálogo no conoce la condición (ACT-16).
  - Sustitución TELEFONIA (R5/R6) y copia a `eCommerceDetPedidos` no se portan (P10, P9; ACT-13).
  - Bitácora: una caída de BP05 se ve igual que un BP inexistente y solo va a consola; el request entrante no se registra (ACT-15; G5-32; OrderMethods.cs:730-734; OrderController.cs:45).
  - Permiso INSERT del usuario de `MAVICBOSANDROID` en `VTASdArtCreditoWeb` sin confirmar: sin él la cabecera se guarda, las líneas fallan y la respuesta es `Concluido` (ACT-19; OrderMethods.cs:669-675).
  - Contrato de respuesta HTTP del crédito por confirmar (P12, ACT-13).
  - Restos en el código (ACT-17): comentario XML desactualizado sobre el origen del precio (OrderMethods.cs:803-810), `if (proper != null)` siempre verdadero (OrderMethods.cs:941), parámetro `codigoPostal` sin uso (OrderMethods.cs:811), `catch { throw; }` vacío (SolicitudCreditoWebMethods.cs:364-367), `LiberateClientCredit` sin llamador (OrderMethods.cs:1160-1172).
  - Sin actividad registrada: `uen` compara `storeId` exacto (`viu`) y la organización de SD29 busca `viu` sin distinguir mayúsculas; un `storeId` `VIU` daría uen 1 y sucursal 504 con precios de la organización 05 (OrderMethods.cs:744, :347-348). La capitalización de `metodoPago` también se trata distinto entre ramas (RCRE-1).
- **GET order/getCondicion/{storeId}/{condicionMagento}**: el respaldo `ACEF` no distingue VIU (el catálogo sugiere `VCEF` para VIU en su comentario, PaymentConditionCatalog.cs:120); el catálogo no tiene `05 M MA/VIU P DIF` (P18, ACT-36); el log `[ORDER GetCondicion ERROR]` no existía en LAN para crédito (ACT-15).
- **(sin ruta) Liberador de crédito y aviso a Magento**:
  - Encender liberador y aviso cuando el otro equipo termine el liberador (DU11; T1b, ACT-28). Al encenderlo hay que usar la cuenta BP como cliente (el bloque usa `idClienteMagento`), ubicarlo dentro del `try` de líneas y omitir prospectos (ACT-28).
  - El cuerpo del aviso usa llaves en snake_case que el DMZ no reconoce; LAN mandaba `{entityId, status, cuenta, idSolicitud}` (T1a, ACT-09; OrderMethods.cs:1234-1240).
  - El bloque comentado calcula `uen` comparando `storeId` en mayúsculas con `VIU`, distinto de la cabecera, que compara `viu` exacto (OrderMethods.cs:682 frente a :744).
  - El liberador es síncrono (`WebClient`, sin tiempo límite propio). La decisión del plan es llamarlo dentro de una tarea de fondo (P19), con un interruptor `CREDITO_LIBERADOR_ACTIVO` en false que todavía no existe en el código ni en el `Web.config` (U1; ACT-13, ACT-28; LiberadorCreditoMethods.cs:72-88).
  - Las rutas `order/creditStatus/{idSolicitud}` y `order/updateCreditOrderId` no existen en ServicioSAP (DU11; T2a ACT-29, T2b ACT-30). El CSV planea `creditStatus` como `sale/filter` (SD36, fila 82), pero SD36 no ve solicitudes de crédito. Falta definir qué id manda el aviso y cuál consulta `creditStatus` (G5-28).

### 03 · Crédito (CreditController)

Sección: [[#Crédito (CreditController SMS, plazos, documentos, montos, Credilana, etc.)|Crédito (CreditController: SMS, plazos, documentos, montos, Credilana, etc.)]]

- **POST /credit/SendSmsNewNumber**:
  - El INSERT de la cola se arma con `string.Format` y `Cliente` va sin escapar: inyección SQL heredada de LAN, listada como "fuera del plan" (CreditMethods.cs:140-144; CREDITO_WEB_ANALISIS §6.7).
  - El tiempo de espera del comando es 9999999 segundos (CreditMethods.cs:148).
- **POST /credit/getSms**:
  - La DMZ todavía apunta a LAN (DMZ:76): ACT-34. El CSV de rutas (filas 5-6) la marca "To Do" aunque ServicioSAP ya la tiene.
  - La URL del PATCH `ZidMagento` no lleva `sap-client=110` (BusinessPartnerMethods.cs:842-843); el PATCH no se ha visto correr en los logs (CREDITO_WEB_ANALISIS §6.7; SPEC_NIP_SMS §5, pregunta 2).
  - No hay evidencia de que el despachador de SMS procese filas con cuenta BP; la primera prueba positiva lo confirma (SPEC_NIP_SMS §6).
  - Se conservan a propósito los defectos de LAN (decisión Q9, "igual que LAN"): sin límite de intentos en el servidor (lo cuenta Magento) y código generado con `CHECKSUM(NEWID())`, que no es criptográfico (CreditMethods.cs:204).
- **POST /credit/validateSms**:
  - La DMZ todavía apunta a LAN (ACT-34).
  - Devolver el texto de la excepción al llamador es comportamiento de LAN que se conservó (CreditMethods.cs:461).
  - Un `IdCarritoCliente` mayor que 2,147,483,647 no cabe en un entero de 32 bits y la ruta responde 500 (CreditController.cs:62, :64-67). Igual que LAN; el riesgo con los ids que arma Magento está en SPEC_NIP_SMS §6.
- **GET /credit/getPlazos**:
  - DU19: `Conexion.dll` solo reconoce ciertos alias de servidor; para Prod hace falta uno que el DLL conozca (CREDITO_WEB_ANALISIS §4.5; actividad ACT-37). No es bloqueo (DU1).
  - Sin `ORDER BY`, la fila elegida por tienda puede cambiar si SIGMavi tiene varias (CreditMethods.cs:28-31).
- **POST /credit/GetCreditAmounts**:
  - Nadie llena `mavi_credilana_info` desde ServicioSAP. La cargaba `credit/SaveCredilanaInfo` (M-07), que solo existe en LAN (CredilanaMethods.cs:26-28; 01_CrearTablas_Ola3.sql:44-45; CSV fila 118). Mientras no se llene, la ruta responde 500. Está listado "sin dueño" (CREDITO_WEB_ANALISIS §6.7).
  - Credilana está fuera del alcance de la migración (decisión del 2026-09-11, CREDITO_WEB_ANALISIS §4.2).
- **POST /credit/guardardocumento**:
  - La ruta de la DMZ es anónima (`[AllowAnonymous]`), pero la de ServicioSAP exige token porque la DMZ se autentica (CreditController.cs:137-138). El CSV la marca "Migrar lógica a SAP" (fila 16), dato solo informativo.
  - La rama `Cliente` del SQL usa `@AVAL`, pero el parámetro se declara `@Aval` (DocumentMethods.cs:148, :179). Funciona mientras la intercalación (collation) de SQL Server no distinga mayúsculas; con una que sí las distinga, esa rama fallaría. El SQL viene literal de LAN (DocumentMethods.cs:139-141).
- **POST /credit/SaveImagesProductosMx**:
  - El trabajo corre en una tarea suelta que nadie espera (DocumentMethods.cs:229); si el proceso del sitio se detiene antes de que termine, se pierde.
  - `Name` se usa tal cual para armar la ruta del archivo, sin limpiarlo (DocumentMethods.cs:327).

### 04 · Clientes y Business Partner

Sección: [[#Clientes y Business Partner (BP, direcciones, prospectos, mayoreo, cuentas)|Clientes y Business Partner (BP, direcciones, prospectos, mayoreo, cuentas)]]

- **GET /partner/client/{clientId}**: el mensaje de error dice "listado de clientes" aunque es una consulta individual (BusinessPartnerMethods.cs:67).
- **POST /partner/client**: el `cp` del modelo no se aprovecha y la región queda fija en "JAL" (BusinessPartnerMethods.cs:427-431); falta definir qué `ZappOrig` llevan los BP de la tienda en línea (ACT-36); falta probar en DEV un alta con `Marst` 1 (ACT-25 lo prueba en el alta desde una orden de contado, que usa el mismo valor; `Marst` se decide en CREDITO P14); los cambios del 2026-10-05 están sin E2E y la E2E la hace el usuario (`01_CustomersController.md` T1.1-09, S6): la respuesta es el número de BP (RBP-47), el saneado `Sntz` (RBP-48), nombres y correo en MAYÚSCULAS (RBP-5, RBP-14), `idMagento` obligatorio (RBP-15) y la guarda de `Partner` vacío (RBP-49); `Fiscalregimen` sigue vacío, como siempre en SAP, y el `'605'` de LAN queda pendiente del dueño fiscal (RBP-17, T1.1-02); mientras no haya E2E, GUIA:363 sigue contando esta ruta entre las que no están en paridad con LAN; un `storeCode` desconocido, en otra escritura o `mavi` sigue yendo a la organización `04` (RBP-6) donde LAN fallaba, porque el usuario no lo decidió (CQ5 del 2026-10-05; `01_CustomersController.md` T1.1-07, 1.1-R4); la dirección, el teléfono, la fecha de nacimiento, `Region` y el contacto tipo 20 que LAN no guardaba se conservan por decisión del usuario (CQ4 = B, 2026-10-05; T1.1-06, T1.1-11); la búsqueda del BP existente antes de crear, que LAN hacía en el SP, es la tarea T1.1-03 de S5: hoy cada llamada crea un BP (RBP-21). El código muerto del builder (`nombreCompleto`, `nacimientoOdata` con `FormatDateSapOData`, `mappedVkorgKnvp`, el bloque comentado del canal `02` y `ParseMagentoId`) se borró el 2026-10-05 (CQ9, T1.1-10).
- **PATCH /partner/client**: por RBP-24, una actualización parcial manda en `false`/`0` los campos que no se enviaron; no se verificó qué hace SAP con ellos.
- **PATCH /partner/client/unircuenta**: las URLs del PATCH y del token no llevan `sap-client`, así que usan el mandante por defecto del sistema (BusinessPartnerMethods.cs:842-843).
- **POST /partner/enablechanelorg**: al recibir, la ruta lee `ReturnSet` con su nombre C#, no `RETURNSet` (RBPC-7); crea un cliente HTTP por petición en lugar de usar el cliente externo compartido (BusinessPartnerMethods.cs:214; TokenGenerator.cs:98-111).
- **POST /partner/testnew**: decidir si se borra (GUIA §8.2).
- **GET /partner/client/filter/{sapFilter}**: quien arme el filtro con datos del usuario debe escapar la comilla simple; ver GUIA C12 y RPRO-7. Como el filtro viaja dentro de la ruta y el Web.config no cambia la lista de caracteres prohibidos en rutas (Web.config:93), ASP.NET rechaza con 400, antes de llegar al controlador, un filtro con `:`, `*`, `%`, `&`, `<`, `>` o `\`; por ejemplo, uno con fecha (`datetime'…T00:00:00'`). Una `/` dentro del filtro rompe la ruta. Las llamadas internas (listas de correos, recuperar cuenta) no pasan por la ruta y no tienen este límite.
- **GET /partner/successfactor/employee/{userId}**: devuelve datos personales del empleado (correo, teléfonos, dirección, fecha de nacimiento) a quien tenga token (SuccessFactorEmployee.cs:40-104); crea un cliente HTTP por petición, sin tiempo de espera propio (BusinessPartnerMethods.cs:352).
- **GET /partner/ventadist/client/{clientId}**: la **edición** del canal de venta (POST por `URL_ANDROID_API`) no está implementada (BusinessPartnerMethods.cs:383).
- **GET /partner/ConsultaAnexos/{valorAnexo}**: el cliente HTTP de S4 no se libera al terminar (BusinessPartnerMethods.cs:884).
- **GET /partneraddress/partner/{bpId}**: ver RDIR-2.
- **POST /partneraddress/partner/{bpId}**: el modelo de alta no tiene `AdditionalStreetPrefixName`, que sí existe en el de cambio (AddressModels.cs:49-66, :81); el POST no lleva `sap-client`, aunque el token se pide con 110 (DeliveryAddressMethods.cs:74-75).
- **PATCH /partneraddress/partner/{bpId}/address/{addressId}**: el PATCH no lleva `sap-client` (DeliveryAddressMethods.cs:116).
- **PATCH /partneraddress/partner/phone**: por RDIR-8, un cambio que no mande `IsDefaultPhoneNumber` le quita al teléfono la marca de predeterminado.
- **POST /customer/setCustomerList**: en paridad con LAN; no volver a reportarlo (GUIA:369). Falta confirmar el destino final de las listas cuando se apague Intelisis, probablemente SIGMavi (GUIA:547). La codificación del correo en el filtro (RCLI-3) y la rama de error (RCLI-6) cambiaron el 2026-10-05 sin E2E; la E2E la hace el usuario (`PLAN_FABLE_CONTROLADORES\01_CustomersController.md` T1.2-01, T1.2-02, S6).
- **POST /customer/getCustomerList**: la rama de error (RCLI-10) cambió el 2026-10-05 sin E2E; la E2E la hace el usuario (`PLAN_FABLE_CONTROLADORES\01_CustomersController.md` T1.3-01, S6).
- **POST /customer/deleteCustomerList**: en paridad con LAN (GUIA:369); la rama de error (RCLI-12) cambió el 2026-10-05 sin E2E; la E2E la hace el usuario (`PLAN_FABLE_CONTROLADORES\01_CustomersController.md` T1.4-01, S6).
- **POST /customer/getCuenta**: sin ruta en la DMZ (tracker fila 116).
- **POST /customer/setCuenta**: sin ruta en la DMZ (tracker fila 117).
- **POST /customer/cashCustomerReport**: la ruta de respaldo del código apunta a una carpeta STAGE, igual que el legado (CashReportMethods.cs:21-22); el tracker fila 36 aún la marca "To Do" aunque la ruta existe; ver RCLI-20.
- **POST /prospecto/recuperarcuenta**:
  - Un cliente sin segundo apellido no puede recuperar su cuenta: el filtro solo lo encuentra con `SegundoApellido eq ''`, el nombre armado termina en una palabra vacía, `Substring(0, 1)` falla y la respuesta es estatus 0 "Error interno" (ProspectoController.cs:47, :55, :63-71; CustomerServiceMethods.cs:179-186). Pasa lo mismo si algún nombre trae doble espacio.
  - Inyección de filtro OData (GUIA C12; RPRO-7).
  - La fecha se interpreta con la cultura del servidor (ProspectoController.cs:40).
  - La GUIA la cuenta entre las rutas sin paridad con LAN: la forma de la respuesta coincide, pero el campo `nombre` (enmascarado) difiere (GUIA:366).
- **POST /company/wholesale-customer**: el mensaje de error de BP05MA lleva el estado como palabra (`NotFound`), no como "404" (BusinessPartnerMethods.cs:318). Hay que verificar: un BP que no existe podría salir como 500 en lugar de `"null"`, salvo que el cuerpo de SAP traiga el texto "404".
- **POST /account/bonus/async**: por RCTA-4 se pierden los datos propios de cada campaña que trae SAP (nombre `Znombon`, porcentajes `Zporcbon1`…, plazos, cascada, exclusiones). Los modelos que sí los tienen, `BonusResponseSet` y `BonusOK`, existen y no se usan (BonusResponseSet.cs:3-59; BonusOK.cs:5-162).
- **POST /account/bonus**: ruta duplicada de `account/bonus/async`; el nombre "Sync" es histórico, las dos son asíncronas (AccountMethods.cs:40, :91). Mismo pendiente de RCTA-4.
- **POST /login/auth**: el tracker fila 63 la lista como "Deprecado", pero la DMZ sí la usa para obtener el token (DMZ Helper\Curl.cs:80).

### 05 · Atención a clientes

Sección: [[#Atención a clientes (CustomerServiceController)|Atención a clientes (CustomerServiceController)]]

- **POST /customerService/obtenerQuejas**:
  - En la práctica la consulta no tiene tiempo de espera: 9 999 999 s son unos 115 días (CustomerServiceMethods.cs:58).
  - El tracker CSV (`MAVI - DMZ-SAP.csv`, línea 50) ya marca la ruta como conectada, pero en "Ruta ServicioSAP" todavía dice "To Do / GET", aunque la ruta ya existe como POST (CustomerServiceController.cs:19-20). La auditoría lo registra como C21. El hallazgo C20, que decía que el CSV la tenía como no conectada, ya no aplica (AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:564-567).
- **GET /customerService/bbvaKeyAdvanced**:
  - Sin nodo de resultado, la ruta da 500 en lugar del 400 previsto: la condición busca el texto `"null"`, no un valor nulo (CustomerServiceController.cs:36; CustomerServiceMethods.cs:104).
  - Si el SOAP falla o no se le alcanza, la ruta responde 200 con el texto de error y no deja rastro en el log, así que quien la llama debe revisar el contenido (CustomerServiceMethods.cs:134-137).
  - El tracker CSV (línea 58) ya la marca como conectada, pero en "Ruta ServicioSAP" todavía dice "To Do / GET" (hallazgo C21; C20 ya no aplica) (AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:564-567).
- **POST /customerService/validarCliente**:
  - `nombres` lleva solo `NameFirst`. LAN devolvía `PersonalNombres`, es decir, todos los nombres de pila (Post_ValidarCliente_Mapping.md:18-21). Para la fila de crédito se decidió que el equivalente de `PersonalNombres` es `NameFirst` + `Namemiddle` (DU13), pero esa decisión no cubre esta ruta y aquí no se aplicó (CustomerServiceMethods.cs:208).
  - Si un nombre en SAP trae doble espacio o un espacio al final, queda una "palabra" vacía y `Substring(0,1)` revienta. La respuesta es entonces `false` aunque el BP sí pertenezca a la cuenta (CustomerServiceMethods.cs:179-185, :215).
  - Un BP sin cuenta de Magento trae `ZidMagento = 0`, porque SAP manda el campo como número (CAPTURAS_REALES_APIS.md:21, :41). Si llega `id_cliente_magento = "0"`, la comparación da verdadero y la ruta devuelve el nombre con asteriscos de cualquier BP sin cuenta de Magento. El código no descarta ese caso (CustomerServiceMethods.cs:204). Es una observación de lectura de código; no hay decisión registrada.
  - Un error de SAP responde 200 `false`, igual que "no vinculado", así que no se distinguen los dos casos. En LAN un error de base daba 500 (CustomerServiceMethods.cs:215-220; Post_ValidarCliente_Mapping.md:40-43).
  - En esta ruta la regla de asteriscos es la misma que usaba LAN (Post_ValidarCliente_Mapping.md:38). La auditoría C17 señala que no coincide con LAN en `prospecto/recuperarcuenta`, que reutiliza el mismo helper (AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:552-553; ProspectoController.cs:55).
  - El tracker CSV (línea 44) indica como ruta SAP `partner/client/filter/{sapFilter}` GET, pero la ruta real es esta (CustomerServiceController.cs:46-47; DMZ:77).
- **POST /customerService/LoginClienteCredito**:
  - En LAN un error se volvía a lanzar y terminaba en error HTTP (LoginClienteCredito/03_BusinessMethod.md:21, :38). Aquí se responde `false`, así que una caída de SAP se ve igual que "cliente no existe" (CustomerServiceMethods.cs:247-252).
  - No se filtran BP bloqueados ni borrados (RCS-17). Es una observación de lectura de código; no hay decisión registrada.
- **POST /customerService/LoginClienteCreditoFechaN**:
  - **Nacidos antes de 1970:** OData manda esas fechas con milisegundos negativos (`/Date(-n)/`). La expresión `\d+` descarta el signo menos, calcula otra fecha y el cliente no logra entrar. Se corrige leyendo `-?\d+` (CustomerServiceMethods.cs:282-286).
  - La lectura de `BirthDate` depende de la configuración regional del servidor: `01/02/1990` puede leerse como 1 de febrero o como 2 de enero. LAN comparaba el texto `yyyy-MM-dd` exacto (CustomerServiceMethods.cs:267; LoginClienteCreditoFechaN/03_BusinessMethod.md:12-15).
  - `StoreId` no se usa (RCS-22).
  - Los errores responden `false`, igual que en `LoginClienteCredito` (CustomerServiceMethods.cs:312-317).
- **POST /customerService/obtenerCreditos** (las diferencias con LAN salen de `Post_ObtenerCreditos_Mapping.md`):
  - **Conexión DMZ:** la DMZ todavía llama a LAN (DMZ:118). El CSV (línea 49) marca la ruta como conectada y la bitácora de migración dice que la DMZ ya usa `PostSAP` (master_migration_log.md:436), pero la copia actual no lo refleja.
  - **`uen` sin uso:** LAN filtraba por `UEN` (Post_ObtenerCreditos_Mapping.md:57); aquí el campo se ignora (ObtenerCreditosModels.cs:9).
  - **Estatus incompletos:** LAN también devolvía `en proceso` y `aceptado`. Los sacaba de la cadena de cuatro documentos (solicitud → análisis → pedido → factura), cada uno con su fecha y estatus. Aquí solo hay 3 estatus y salen de `Zidstatus` (CustomerServiceMethods.cs:463-469; Post_ObtenerCreditos_Mapping.md:70-75; AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:886). La bitácora habla de "concluido"/"anulado" (master_migration_log.md:431), pero el código usa `entregado`/`rechazado`.
  - **Fecha:** LAN tomaba la fecha más reciente de esa cadena (Post_ObtenerCreditos_Mapping.md:76); aquí se usa `PurchDate`/`audat` (CustomerServiceMethods.cs:414).
  - **Puntos redimidos:** `point_redeemed` vale 0 porque `TarjetaSerieMovMAVI` ya no existe (CHECKLIST_DEV2_ROADMAP.md:118) y no hay fuente SAP.
  - **Descuento:** vale 0. LAN lo calculaba como `PrecioAnterior - Precio` (Post_ObtenerCreditos_Mapping.md:34-38).
  - **`id`:** devuelve `PurchNoC` tal cual. En los pedidos web su formato es `ZSD_{tipo}_{idEcommerce}` (CHECKLIST_DEV2_ROADMAP.md:130); LAN devolvía `MovId` (Post_ObtenerCreditos_Mapping.md:79).
  - **Orden y redondeo:** LAN ordenaba por fecha descendente y redondeaba `subtotal` a 2 decimales (Post_ObtenerCreditos_Mapping.md:61, :77); aquí no se hace ninguna de las dos cosas (RCS-47, RCS-48).
  - **Errores ocultos:** cualquier error se convierte en `""` sin que el que llama se entere (RCS-49).
  - **Rendimiento:** SD36 trae todo el historial del cliente y después se hace una llamada a DM01 por cada SKU, una tras otra (CustomerServiceMethods.cs:396-404).
  - **Volcado de depuración:** hay que quitar la línea que escribe en disco la respuesta de SD36, que contiene datos de clientes (SalesMethods.cs:193).
  - **Código sin uso:** `to_zsdt_vbap` se pide en el `$expand` pero no se lee, y los modelos `VbapResponse`/`VbapResult` no se usan (SalesMethods.cs:175; ObtenerCreditosModels.cs:55-68).
  - **Filtro OData:** `cliente_id` y cada SKU se meten en el texto del filtro sin duplicar apóstrofos (CustomerServiceMethods.cs:356; ProductMethods.cs:69).
  - **Forma de `to_zsdt_vbak` sin confirmar:** el código espera una colección `{"results":[...]}` (ObtenerCreditosModels.cs:44-47; CustomerServiceMethods.cs:436-439, :461-462). La ficha SD36 la describe como un "objeto único" (RSG\sd36_consultar_documentos.md:47-48) y no hay captura real de esa navegación. Si SAP la manda como objeto, `results` queda vacío: ningún documento entraría por `Zformapagotp` (RCS-37) y todos saldrían como `pendiente` (RCS-40). La lectura usa System.Text.Json sin opciones, que distingue mayúsculas en los nombres de campo (CustomerServiceMethods.cs:436, :461). Falta comprobarlo con una respuesta real.
  - **Lectura de números:** cantidades e importes se leen con la configuración regional del servidor (CustomerServiceMethods.cs:484, :488, :492, :515-516).

### 06 · Productos y catálogo

Sección: [[#Productos, catálogo, imágenes, etiquetas y exportación a e-commerce|Productos, catálogo, imágenes, etiquetas y exportación a e-commerce]]

- **GET /product/exportaart/{store}**:
  - `viu` y `mavi` no están implementados (ProductController.cs:33-38; AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:655).
  - Errores silenciados (EcommerceMethods.cs:1377-1381). Los contadores y las banderas `Exitoso` y `MensajeError` están comentados (EcommerceMethods.cs:1281, :1288, :1328-1331, :1379-1380; ResultadoProcesoEcommerce.cs:12-33).
  - Las fases 8 y 14 (productos configurables) no existen: la fase 8 no aparece en el código y la llamada de la fase 14 está comentada (EcommerceMethods.cs:1349-1350). Por eso todo sale como `simple` y sin `configurable_variations` (EcommerceMethods.cs:1477, :1501).
  - Las columnas de imagen salen vacías (EcommerceMethods.cs:1496-1498).
  - El grupo "secundarios dos" usa la misma lista de almacenes secundarios, porque no hay un catálogo propio (EcommerceMethods.cs:579-582, :597-599).
  - Si una regla tiene 0 en alguno de sus cuatro mínimos de almacenes, ese grupo se cumple solo y la regla pasa con que el artículo tenga una fila en DIM11 (EcommerceMethods.cs:589-605; los nulos de la tabla se leen como 0, ProductMethods.cs:785-792). Falta confirmarlo contra el SP.
  - Las existencias se suman con `int.TryParse`. Si DIM11 manda el stock con decimales (por ejemplo `"3.000"`), ese renglón cuenta 0 (EcommerceMethods.cs:335, :1748). El campo viene de `MARD-LABST`, una cantidad de SAP (RSG\dim11_existencias.md:29). Falta confirmar el formato real con una captura.
  - La consulta IE/Mayorista usa la tabla `CatalogoValorePosibles` (ProductMethods.cs:676) y la de atributos usa `CatalogoValoresPosibles` (ProductMethods.cs:1052). Son nombres distintos: hay que verificar cuál existe en SIGMavi; si una falla, el proceso entero responde vacío.
  - El precio de contado del listado (el menor de cualquier sucursal, RPR-12) y el precio final (sucursal 90 o 0, RPR-27) pueden no coincidir.
  - Los precios se filtran por `CDistr = '1'` (EcommerceMethods.cs:27; FinalListProperMethods.cs:55), pero no por organización de ventas; el modelo advierte que SD29 también trae filas legacy con OrgVtas `1`, `2` y `3` (FinalListProper.cs:30-35).
  - El upsell de SAP nunca se consulta para un artículo que está solo en su familia + línea, porque el grupo se salta antes (EcommerceMethods.cs:1110-1111).
  - Rendimiento: el proceso trae el catálogo, las existencias y los precios completos sin paginar y hace al menos una llamada de crosssell a SAP por SKU (EcommerceMethods.cs:1043-1044, :1587-1588). Cada llamada a S4 tiene 60 s de tiempo límite (TokenGenerator.cs:127).
  - Los relacionados de SAP se guardan en una caché estática que no caduca: los cambios en DM03 no se ven hasta reciclar el pool de IIS. Un error de SAP para un SKU se guarda como lista vacía (EcommerceMethods.cs:29-36, :1612-1623). Además, lo que se guarda ya viene recortado contra el listado de la corrida que lo cargó (EcommerceMethods.cs:1606-1610, :1641-1645, :1676-1680): un relacionado que no se exportaba en esa primera corrida no vuelve a aparecer en corridas posteriores aunque después sí se exporte.
  - El diccionario IE/Mayorista se arma sin distinguir mayúsculas, pero el agrupado previo sí las distingue y no quita espacios: dos filas que difieran solo en eso hacen fallar el proceso, que responde vacío (EcommerceMethods.cs:399, :434-438).
- **GET /ecommerce/listado**: la respuesta es enorme (catálogo, existencias y precios completos) y no tiene paginación. El nombre de la ruta no corresponde a lo que devuelve.
- **GET /product/products**: la respuesta es todo el catálogo, sin paginación.
- **GET /product/filter/{filter}**: filtro OData libre desde la URL (AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:653). Como va dentro de la ruta, no admite caracteres como `/`.
- **GET /product/stock/filter/{filter}**: mismo hallazgo de filtro libre que `product/filter` (AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:653).
- **GET /product/stock**: los valores se pegan al filtro sin escapar (RPR-124).
- **GET /product/exclusiones/ma**: el error se relanza con `throw ex`, que pierde la pila original (ProductMethods.cs:462).
- **GET /product/exclusiones/familialinea/ma**: error silenciado (ProductMethods.cs:509-512).
- **GET /product/articulos/ie/mayorista**: nombre de tabla `CatalogoValorePosibles` por confirmar (ver Pendientes de `product/exportaart`).
- **GET /product/catalogo/{nombreCatalogo}**: el mensaje de error expone la URL completa de AWS al cliente (ProductMethods.cs:733).
- **GET /product/almacenes/config**: no hay catálogo para "secundarios dos" (ver Pendientes de `product/exportaart`).
- **GET /product/reglas/existencia**: ver el efecto de un mínimo en 0 en los Pendientes de `product/exportaart`.
- **GET /product/jerarquia/articulos**: `success` y `total` están comentados en la respuesta, a diferencia de las rutas vecinas (ProductController.cs:320-321; AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:941).
- **GET /product/crosssell**: el artículo se pega a la llave sin escapar (RPR-124).
- **GET /product/upsell**: igual que crosssell.
- **GET /product/sustitutos**: igual que crosssell.
- **GET /product/seo**: sin parámetros trae todos los artículos, sin paginar.
- **PATCH /product/seo/{material}**: falta confirmar si SAP vacía los campos que llegan en `null` en un PATCH.
- **POST /product/obtenerImagen**:
  - Avance 55 %, bloqueada por H-02 (la impersonación): desde desarrollo la conexión al share falla con `LogonUser failed with error code: 1326` (Windows no acepta el usuario o la contraseña), igual que en el legado, así que la copia no se pudo verificar; la validación quedó para QA (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:61, :130, :134).
  - Los nombres de archivo se combinan con la ruta sin validar, así que admiten `..\` (recorrido de rutas) (ProductImageMethods.cs:38-39; AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:652).
  - No hay `try` en el controlador ni validación de cuerpo nulo (ProductController.cs:474-478).
- **POST /catalog/cargaCompleta**: falta definir quién la agenda (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:200). El tramo de E-19 que escribe en MySQL e Intelisis no está portado (ver `catalog/attributeSetChildren`).
- **POST /catalog/deletePromociones**: escrita el 7 sep y nunca ejecutada, porque escribe en Magento (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:216).
- **POST /catalog/deleteReservations**: escrita y nunca ejecutada (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:216).
- **POST /catalog/attributes**: ver RPR-125.
- **POST /catalog/attributeSetChildren**:
  - Solo está portado el tramo de SQLite. El legado termina escribiendo en MySQL (`aplicaciones_web`) y ejecutando `SpWDM0285_AtributosdeMagento` en IntelisisTmp; ese tramo espera a que se cierre la exportación de artículos (MagentoCatalogMethods.cs:157-160; CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:196).
  - `ignoreAttributes.txt` debe viajar con el despliegue: si el archivo falta, la carga muere al empezar (MagentoCatalogMethods.cs:167), y sin su lista de 114 atributos de sistema E-19 escribiría el triple de filas (163 atributos por set en vez de 54) (CHECKLIST_DEV3_NOSAP_NOINTELISIS.md:198).
- **POST /catalog/categories**: ver RPR-125.
- **POST /catalog/children/{store}**: ver RPR-110.
- **GET /ma/imagenes/optimizadas**: es la única consulta del área que abre SIGMavi en modo síncrono (ImagenMethods.cs:32). `ImagenMethods` tiene su propio filtro de imagen que nadie usa; la exportación usa el de `EcommerceMethods` (ImagenMethods.cs:72-83; EcommerceMethods.cs:1291).
- **GET /etiquetas**: solo está la consulta; DM05 también permite alta, cambio y baja (`RSG\dm05_etiquetas.md`). `GetEtiquetas` es un duplicado exacto sin llamadores, marcado para borrar (ProductMethods.cs:1316-1345).

### 07 · Ventas, monedero y abonos

Sección: [[#Ventas, monedero, abonos, SEPOMEX y listas de precios|Ventas, monedero, abonos, SEPOMEX y listas de precios]]

- **POST /sale/transaction**:
  - El POST no pide token CSRF (`X-CSRF-Token`) antes de escribir (SalesMethods.cs:31-38). Otras escrituras del proyecto sí lo piden con `TokenGenerator.GetTokenSapAsync` (TokenGenerator.cs:135-171; por ejemplo BusinessPartnerMethods.cs:81 y DeliveryAddressMethods.cs:80). Sin ese token, SAP Gateway normalmente rechaza las escrituras.
  - Se descarta la respuesta de SAP (ver RVTA-4).
- **GET /sale/{documentId}**: Según la ficha SD36, si no hay coincidencias SAP no regresa la lista sino un mensaje de error `ZSD 002` (`RSG/sd36_consultar_documentos.md:53-55`). La ficha no dice con qué código HTTP llega: si llega como error HTTP, aquí sale como 400 (SalesMethods.cs:77-79); el código no lo distingue de un fallo real.
- **GET /sale/filter/{filters}**: El filtro viaja dentro de la ruta. ASP.NET rechaza por defecto caracteres como `:` `%` `&` `*` `?` en la ruta, y Web.config no cambia ese límite (Web.config:93). Por eso un filtro con fechas (`datetime'…T…:…'`) o con `%` no llega al código. Un `/` dentro del filtro parte la ruta en más segmentos y la petición ya no coincide con esta ruta (SaleController.cs:57).
- **GET /movbita/events/{vbeln}**: Se crea un `HttpClient` por llamada y no se le fija timeout (MovBitaMethods.cs:25).
- **POST /credit/GetAccountDebts**:
  - C08: LAN agrupaba por canal de venta (CRÉDITO MA, DIMAS, DINERALIA, EMPRESARIO…) y filtraba por fecha. Aquí se devuelve la lectura cruda de EX01 (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:518-520`).
  - Según la ficha EX01, las filas con `Contable = 1` no van en el estado de cuenta (`RSG/ex01_documentos_no_compensados.md:56-59`). El código no las quita, así que el llamador tiene que filtrarlas.
  - Si falta la llave `ZAPI_EX01_NOCOMP_SRV`, la URL queda sin servicio y falla con un error de SAP (AbonoMethods.cs:22-26).
- **POST /credit/getClienteFactura/{cliente}/{factura}**:
  - C06: El DMZ hace `JObject.Parse` sobre la respuesta, pero aquí sale un arreglo, así que el DMZ responde 500 incluso cuando la consulta sale bien (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:511-512`).
  - C07: LAN devolvía un objeto `SaldoFactura` con cabecera de saldo (saldo capital, atraso, moratorios, liquida con, pago puntual…). Aquí salen las filas crudas de TZ01 (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:514-516`).
- **POST /credit/ApplyPaymentNeko**: C19, stub que responde éxito. Su severidad es baja solo porque el DMZ todavía no lo consume (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:561`). Hay un TODO de integrarlo con S/4HANA o con una base local (AbonoMethods.cs:97).
- **POST /credit/UpdateStatusPaymentNeko**: C19 (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:561`). El TODO pide recorrer las deudas y hacer PATCH a TZ01 (AbonoMethods.cs:106). El método quedó sin `async` a propósito, para no generar la advertencia CS1998, y debe volver a ser `async` cuando se implemente (AbonoMethods.cs:101-103).
- **POST /customer/wallet/details**:
  - C10: `uen` se ignora. LAN distinguía la serie (`SerieMonedero` para UEN 1, `SerieMonederoVIU` para las demás) y el saldo por UEN (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:526-528`).
  - Sigue abierto si se conserva el efecto de LAN "generar monedero" (`SP_MAVIDM0173RedimeOGeneraMONE`), que esta ruta no hace (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:1027`, `:1168`).
  - La ficha SD18 describe `Reference` como "ID Monedero POS" (CHAR16), pero el código envía el número de cliente (`RSG/sd18_consultar_contrato.md:27`; WalletCustomerMethods.cs:65). Falta confirmar con SAP que se busca por cliente.
  - `WalletCustomerMethods.GetCustomerWallet` es una copia de `GetCustomerWalletAsync` sin el caso "No se encontraron registros". No tiene llamadores y el propio código la marca como "candidato a eliminar" (WalletCustomerMethods.cs:21-25, :44-48).
  - La guía cuenta esta ruta entre las 8 que no dan la misma respuesta que LAN, con "tres defectos verificados" (`GUIA_MIGRACION_FABLE.md:354`, `:365`).
- **POST /customer/wallet/getMinimumCostToRedeem**:
  - C09: no replica el cálculo por familia de LAN. Faltan la exclusión de familias no permitidas y el recálculo multifamilia de `montoMaximoRedimibleGlobal` (`AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md:522-524`; `GUIA_MIGRACION_FABLE.md:615`).
  - Si DM01 no trae `FAMILIA` (queda nula) y la familia permitida no es "ALL", `ContainsKey(null)` lanza. El `catch` general lo traga y la respuesta sale sin totales (WalletMethods.cs:180, :191, :201, :234-237).
  - Cada llamada hace tres GET a AWS y un GET a DM01 por artículo, sin caché (WalletMethods.cs:77-79, :174).
  - El tracker la marca "Requiere desarrollo" (`MAVI - DMZ-SAP.csv:113`).
- **GET /sepomex/validarcp**: `HttpClient` nuevo por llamada y sin timeout propio (SepomexMethods.cs:33).
- **Apoyo: SD36 para otras áreas (SalesMethods.CheckDocumentExistsSD36Async y GetCreditDocumentsAsync, sin ruta propia)**: `GetCreditDocumentsAsync` escribe un volcado de depuración en una ruta fija del equipo de un desarrollador (`c:\Users\<usuario>\source\repos\sap_raw_dump.json`) y traga el error si no puede (SalesMethods.cs:193). Hay que quitarlo.
- **Apoyo: listas de precios SD29 (FinalListProperMethods, sin ruta propia)**:
  - E5, el filtro compuesto, sigue sin probar contra SAP. Además falta ratificar la autorización de los métodos nuevos (P20) (`CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md:420`, `:925`; `CAMBIOS_PARIDAD_CREDITO_2026-09-29.md:193`). Como la consulta por SKU también la usa el contado, falta probar que el contado no cambió (ACT-25, `ACTIVIDADES_PENDIENTES_CREDITO_WEB_2026-10-01.md:173`).
  - P7: ¿qué fila de SD29 es la de crédito web cuando aún quedan varias por `Sucursal`, `Vigente` o `CDistr`? (`CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md:803-809`; ACT-14, `ACTIVIDADES_PENDIENTES_CREDITO_WEB_2026-10-01.md:162`).
  - `GetFinalListProperByUenAndBranchAsync` no tiene llamadores (FinalListProperMethods.cs:19).
- **Apoyo: utilidades (StoreGlobalMethods y RequestMethods, sin ruta propia)**: Hay código sin uso que se puede borrar: `GetSalesOff`, `GetRefDocCat`, `GetTypePosition` y los `Build*`/`Validate*`/`Log*` de RequestMethods (StoreGlobalMethods.cs:9, :71, :95; RequestMethods.cs:42-110). `BuildSapRequestS4`, además, cambia la validación de certificados de todo el proceso si alguien lo llama (RequestMethods.cs:57-59).

### 08 · Transversal

Sección: [[#Transversal autenticación, conexiones, configuración, logs, llamadas a SAP, compilación|Transversal: autenticación, conexiones, configuración, logs, llamadas a SAP, compilación]]

- **Arranque del servicio y canal de cada petición**: la ruta convencional sobra (RTR-3). `compilation debug="true"` (`Web.config:91`) solo se quita con la transformación de Release (`Web.Release.config:18`); la de Debug no cambia nada (`Web.Debug.config:5-30`, solo ejemplos comentados).
- **POST login/auth**:
  - `HashService.HashString` genera una sal aleatoria pero no la devuelve, así que no sirve para crear un par hash/sal nuevo; no tiene llamadores (`Helpers/HashService.cs:12-16`).
  - La clave JWT es la misma que usa LAN (mismo emisor y audiencia; se comprobó el 2026-10-01 comparando los dos Web.config sin mostrar valores): un token de LAN es válido aquí. Separarlas rompe las rutas del DMZ que dependen de esa coincidencia; solo se cambia junto con el DMZ (GUIA_MIGRACION_FABLE.md §8.1 y §8.5.1, R-02).
- **Validación del token en cada petición**: el token se valida dos veces por petición, una para cada destino de la identidad (`Helpers/TokenValidationHandler.cs:65-66`); la variable `statusCode` de `:41` se asigna y no se usa.
- **Llamadas a S/4HANA: cliente Basic y token CSRF**:
  - Las 68 llamadas a `obtenerUrl` (66 URLs y 2 credenciales) usan fijo `Nodos.ENVIROMENT_DEV`, y `sap-client=110` está fijo en las URLs: hay que cambiarlo para QA/Prod; conviene centralizarlo antes (GUIA §8.6, R-12).
  - TLS sin validar hacia S/4HANA, que es por donde viaja el Basic (GUIA §8.1).
  - Código sin llamadores en `RequestMethods`: `BuildSapRequest` (`Methods/Utils/RequestMethods.cs:42-53`), `BuildSapRequestS4` (`:55-72`, que además suma con `+=` un validador que acepta todo, `:58-59`), `ValidateSapResponse` (`:77-88`), `LogSapRequest` y `LogSapResponse` (`:93-110`).
  - En `TokenGenerator`, los campos `ApiService` y `_csrfToken` nunca se asignan, así que `GetApiService` y `GetCsrfToken` siempre devuelven null (`Helpers/TokenGenerator.cs:29-30`, `:173-181`; MSBuild lo marca con CS0649).
  - `ConexionSapConfig` está comentada completa (`Helpers/ConexionSAP/ConexionSapConfig.cs:8-21`).
  - La raíz del CSRF de bonificación está escrita a mano como `/ZAPI_CAMPANA_BONIFICACION_SRV/` en lugar de derivarse de la llave (`Methods/MaterialManagement/AccountMethods.cs:50`, `:102`; SKILL regla 20). Si la llave cambia de valor, el CSRF se seguiría pidiendo a la ruta vieja.
- **Llamadas a APIs que no son S/4HANA**: los siete sitios con `new HttpClient()` por llamada no usan el cliente compartido (inconsistencia, no falla funcional). `WalletMethods` tiene un valor de respaldo fijo en código si falta `AwsBaseUrl` (`Methods/Wallet/WalletMethods.cs:19`). El liberador es código síncrono y hoy muerto (ver arriba); si se reactiva, bloquearía un hilo por llamada.
- **Llamadas de ServicioSAP al DMZ**: `OrderMethods` repite el login al DMZ por su cuenta en dos avisos a Magento en lugar de usar `Curl`: `order/authorizationResult` (`Methods/Order/OrderMethods.cs:1177-1215`), que hoy solo se invoca desde el bloque comentado `:678-710`, y `order/setCAccount` (`:1270`), que sí corre al crear una orden (`:1933`). TLS sin validar y protocolos antiguos habilitados para todo el proceso (`Helpers/ConexionDMZ/Curl.cs:34`, `:37-38`). En Dev `URL_DMZ` apunta a un equipo local; es correcto mientras se prueba y se cambia en el pase (GUIA §8.6).
- **Conexiones a SQL Server**:
  - `ImagenMethods` usa la variante síncrona `obtenerConexionSigMavi()` (`Methods/ImagenManagement/ImagenMethods.cs:32`).
  - El DLL solo reconoce los alias de servidor de Dev y QA; para Prod hace falta uno que el DLL conozca (DU19, `CREDITO_WEB_ANALISIS_COMPLETO_Y_PLAN_FINAL.md` §4.5).
  - A verificar: en las variantes async, `Assembly.GetCallingAssembly()` se evalúa dentro de la máquina de estados de `async`, así que el `ApplicationName` que ve SQL Server podría no ser "ServicioSap" (`Helpers/ConexionDB/ConexionSQL.cs:84`, `:115`, `:180`).
- **Base local SQLite**: SQLite se mantiene solo de forma temporal (SKILL regla 3). Las variantes sin parámetros reciben SQL armado concatenando texto (p. ej. `Methods/Catalog/MagentoCatalogMethods.cs:195`).
- **Acceso a carpetas compartidas de red**: los nombres de archivo que llegan en el cuerpo se pegan a la ruta con `Path.Combine` sin limpiar (riesgo de salir de la carpeta), y en imágenes eso corre con la cuenta de servicio (`Methods/Customer/CashReportMethods.cs:61`, `:75`; `Methods/ProductImage/ProductImageMethods.cs:38-39`; GUIA §8.1).
- **Correo de "pedido listo para recoger"**: las credenciales SMTP están escritas en el código, marcadas "FIXME: Migrar a Web.config" (`Helpers/MailHelper.cs:113-117`). Ligas, íconos y teléfono de contacto están fijos en el código (`:23-26`, `:32-60`, `:80`). El error de envío no queda en `sap.log`.
- **Catálogo de condiciones de pago Magento → SAP**: una condición nueva que no esté en `CondicionesCredVtaLinea` exige cambiar el código y recompilar.
- **Catálogo de tipos de material SAP válidos para e-commerce**: la clase vive en `Helpers\Catalog\` pero su espacio de nombres es `ServicioSap.Methods.Catalogs` (`Helpers/Catalog/CatalogoMethods.cs:8`). `CatalogoEstados.ObtenerClave3` (nombre de estado → clave de 3 letras, 32 estados) no tiene llamadores; solo hay un `using` sin uso en `Methods/BusinessPartner/BusinessPartnerMethods.cs:4` (`Helpers/CatalogState/CatalogoEstados.cs:9-61`).
- **Logs**:
  - `GeneradorLog.SapLog` es una copia anterior, sin llamadores, que solo escribe al archivo del servidor (`Helpers/Logger/GeneradorLog.cs:8-39`).
  - Hay 107 `Console.WriteLine` activos en 7 archivos (`Curl`, `MailHelper`, `LiberadorCreditoMethods`, `EcommerceMethods`, `ProductMethods`, `OrderMethods` con 89, `WalletMethods`; búsqueda en `*.cs`); bajo IIS esa salida no queda en ningún lado.
  - Si el app pool no puede crear la carpeta `Logs`, la excepción sale del logger; como el logger suele llamarse dentro de un `catch`, puede tapar el error original (`Helpers/Logger.cs:28-31`).
  - Las trazas `REQUEST`/`RESPONSE` escriben el JSON completo que se manda y recibe de SAP, que puede llevar datos del cliente (`Methods/Order/OrderMethods.cs:1860`, `:1865`). El log no tiene rotación ni tamaño máximo (`Helpers/Logger.cs:17`, `:36`).
