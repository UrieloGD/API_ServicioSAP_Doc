---
tags: [mapeo-lan, plan, calendario, migracion, sigmavi]
proyecto: APIMagento → ServicioSAP
capa: LAN (Nexo)
actualizado: 2026-08-11
agente: Nexo
inicio: 2026-08-04
---

# Plan de migración LAN → ServicioSAP — control y fechas

Listado de control de **40 partidas**: 4 habilitadores y 36 endpoints. Incluye los ya mapeados y todos los que se reapuntan a **SIGMAVI (DEVMAVI)**.

> ➕ **Ocho partidas incorporadas el 12 ago** tras cotejar el alcance contra `PLAN_MAESTRO_ACTIVIDADES_DEVS.xlsx`, que asigna 74 endpoints al Dev 1. Tres son endpoints nuestros que faltaban —`E-14`, `E-15` y `setRecommenderList`, éste último descartado el 31 ago— y cinco son mixtos nuevos —`M-04` a `➡️`—. Los identificadores se asignan **al final de cada serie, no en orden de ola**, para no volver a reindexar lo ya numerado.

> 🗑️ **Descartados el 11 ago, de 37 partidas originales a 35.** `credit/ExistRFCAndPhoneCte` y `status/getStatus` salen del alcance de migración: **pierden su identificador** y quedan registrados en la Ola 5 sin ID, tachados, con el motivo del descarte. Los endpoints posteriores se reindexaron dos posiciones. Tras reasignar el monedero a Dev 2 el 12 ago quedó sin huecos, más **M-11 a 🗑️**.

> 🗑️ **Descartado el 31 ago: `recommender/setRecommenderList`.** Mismo criterio — pierde su identificador y los posteriores se reindexan una posición. La serie vigente es **E-01 a E-50** sin huecos.

**Listado en CSV para seguimiento:** [[_CONTROL_MIGRACION.csv]]
**Detalle de tablas antes y después:** [[_ALCANCE_MIGRACION_LAN_a_SAP]]

---

## Supuestos del calendario

| Parámetro                  | Valor                                                     |
| -------------------------- | --------------------------------------------------------- |
| Inicio                     | **martes 4 de agosto de 2026**                            |
| Fin proyectado             | **martes 3 de noviembre de 2026**                         |
| Días-desarrollo            | **54.5**                                                  |
| Días hábiles del periodo   | 65                                                        |
| Días festivos considerados | 16 sep · 16 nov · 25 dic                                  |
| Modalidad                  | Un desarrollador · sin paralelismo · con asistencia de IA |

> ⚠️ Las fechas asumen ejecución **secuencial**. Con dos desarrolladores en paralelo a partir de la ola 2, el cierre se adelanta a mediados de septiembre para todo lo no bloqueado.

---

## Resumen por ola

Las olas se agrupan en **tres bloques según de qué dependen**, no según su dificultad. El bloque A no depende de nadie y se agota antes de entrar al B.

| Bloque | Ola | Contenido | Partidas | Días | Inicio | Fin |
| --- | ------ | ----------------------------- | -------: | ---: | ------ | ------ |
| — | **0**  | Habilitadores                 |        4 |  2.0 | 04 ago | 07 ago |
| — | **1**  | Piloto                        |        1 |  0.5 | 10 ago | 10 ago |
| — | **2**  | SIGMAVI — listas blanca/negra |        3 |  2.0 | 11 ago | 13 ago |
| **A** | **3**  | SQLite                        |        2 |  1.0 | 14 ago | 17 ago |
| **A** | **4**  | AdminDoc                      |        2 |  1.5 | 18 ago | 19 ago |
| **A** | **5**  | ServicioAndroid y SOAP externo |       2 |  1.0 | 20 ago | 21 ago |
| **A** | **6**  | SMB y DMZ                     |        4 |  2.5 | 26 ago | 28 ago |
| **A** | **7**  | SIGMAVI sin dependencia de SAP |       2 |  2.0 | 31 ago | — |
| **A** | **8**  | Reapunte de rutas de la DMZ   |       31 | ⏳ | — | — |
| **B** | **9**  | Mixtos SAP                    |        4 |  5.5 | — | — |
| **C** | **11** | Mixtos Intelisis A — linked server |   4 | 11.0 | — | — |
| **C** | **12** | Mixtos Intelisis B — bifurcados |     3 | 13.0 | — | — |
| **C** | **13** | Mixtos Intelisis C — otros    |       10 | 21.0 | — | — |

> ⚠️ Las **fechas no se han recorrido** tras incorporar las partidas nuevas, tras el descarte de la Ola 5 ni tras la reorganización en bloques del 12 ago. Los días sí están actualizados; el calendario necesita una pasada aparte.

> ⏳ **La Ola 8 no tiene estimación en la escala de este plan.** El archivo maestro asigna 2 días a cada una de sus 31 rutas, pero son trabajo de verificación y ajuste, no de porteo, así que no son comparables con el resto de las olas. Estimarlas requiere abrir primero unas cuantas y medir cuánto cuesta de verdad.

---

## Ola 0 — Habilitadores · 4–7 ago

Bloquean todo lo demás. Sin esto no arranca ninguna ola.

| ID   | Pieza                                   | Días | Fecha  | Necesaria para |
| ---- | --------------------------------------- | ---: | ------ | -------------- |
| H-01 | `conexionSQL.obtenerConexionAdminDoc()` |  0.5 | 04 ago | E-07, E-08     |
| H-02 | Clase `Impersonation` (P/Invoke)        |  0.5 | 05 ago | E-13           |
| H-03 | Helper HTTP hacia la DMZ                |  0.5 | 06 ago | E-11, E-12     |
| H-04 | Corregir `SQLiteDb.DefaultPath`         |  0.5 | 07 ago | E-05, E-06     |

> ✅ Ya existen y no requieren trabajo: `conexionSQL.obtenerConexionAndroid()` y la clase `SQLiteDb`.

---

## Ola 1 — Piloto · 10 ago

| ID | Endpoint | Método | Días | Fecha |
|---|---|---|---:|---|
| E-01 | `credit/SendSmsNewNumber` | `CreditMethods.SendSmsNewNumber:1992` | 0.5 | 10 ago |

> **El método ya está migrado** en ServicioSAP (`Methods/Credit/CreditMethods.cs:12`). Solo falta el controller. Sirve para calibrar el ciclo real de revisión y despliegue antes de comprometer el resto del calendario.

---

## Ola 2 — SIGMAVI · listas blanca/negra · 11–13 ago

Bloque único: comparten método `CustomerMethods.blackwhitelist:120` y SP `SpVTASListaNBMagento`.

| ID | Endpoint | Tabla actual | Tabla nueva | Días | Fecha |
|---|---|---|---|---:|---|
| E-02 | `customer/setCustomerList` | Intelisis `VTASCListaNegra` · `VTASCListaBlanca` | **SIGMAVI** mismas tablas | 1.0 | 11 ago |
| E-03 | `customer/getCustomerList` | Intelisis `VTASCListaNegra` · `VTASCListaBlanca` | **SIGMAVI** mismas tablas | 0.5 | 12 ago |
| E-04 | `customer/deleteCustomerList` | Intelisis `VTASCListaBlanca` | **SIGMAVI** misma tabla | 0.5 | 13 ago |

> ✅ Sin bloqueante. Estructura conocida: `NumPedido`, `Nombre`, `Correo`, `Direccion`, `Cliente`, `FechaRegistro`, `Lista`.
> Justificación del ODS: *«se quedan en SIGMAVI ya que el control es de ecommerce»*.

---

## Ola 3 — SQLite · 14–17 ago

| ID   | Endpoint                  | Tabla                 | Días | Fecha  |
| ---- | ------------------------- | --------------------- | ---: | ------ |
| E-05 | `order/getGuide`          | `servicio_guias`      |  0.5 | 14 ago |
| E-06 | `credit/GetCreditAmounts` | `mavi_credilana_info` |  0.5 | 17 ago |

> ⚠️ **E-06 depende de M-03.** Su tabla la alimenta `LoadCredilanaInfo`, que lee de Intelisis. Migrar el endpoint sin resolver el alimentador deja el caché congelado.

---

## Ola 4 — AdminDoc · 18–19 ago

| ID   | Endpoint                       | Tabla                       | Días | Fecha  |
| ---- | ------------------------------ | --------------------------- | ---: | ------ |
| E-07 | `credit/guardardocumento`      | `MAVI_DOC_CTE`              |  0.5 | 18 ago |
| E-08 | `credit/SaveImagesProductosMx` | `MAVI_DOC_CTE` + filesystem |  1.0 | 19 ago |

> Requiere H-01. E-08 necesita además referencia a `System.Drawing`.

---

## Ola 5 — ServicioAndroid y SOAP externo · 20–21 ago

| ID   | Endpoint                          | Destino              | Días | Fecha  |
| ---- | --------------------------------- | -------------------- | ---: | ------ |
| E-09 | `customerService/obtenerQuejas`   | ServicioAndroid      |  0.5 | 20 ago |
| E-10 | `customerService/bbvaKeyAdvanced` | SOAP `WSeCommerceMX` |  0.5 | 21 ago |
| 🗑️ | ~~`credit/ExistRFCAndPhoneCte`~~ | ~~Ninguno~~ | — | — |
| 🗑️ | ~~`status/getStatus`~~ | ~~Ping a Intelisis~~ | — | — |

> ✅ **Los dos vigentes se migran como estaban planeados.** E-09 con una sola desviación deliberada: renombrar la variable `intelisisConn`, que construye la conexión con `sCadenaConexionAndriod` y **no toca Intelisis** pese al nombre — dejarla así haría que cualquier auditoría futura marcara el endpoint como dependiente de un servidor que se apaga. E-10 sin cambios; requiere portar al `Web.config` las claves `MULTIPAGOS_APIKEY_URL` y `CODIGO_ENT`, y no añade dependencias: `RestSharp` y `System.Xml.Linq` ya están referenciados.

> 🗑️ **Dos partidas descartadas el 11 ago — sin ID asignado.** `credit/ExistRFCAndPhoneCte` devuelve siempre el mismo literal y no abre conexión: sus dos métodos de validación tienen un `return` incondicional en la primera línea, y la funcionalidad real que pretendía dar es validación contra el maestro de clientes de **Intelisis**, fuera del alcance. `status/getStatus` hace un ping ICMP al servidor de Intelisis; es un estatus de servidor que no informa sobre la salud de ServicioSAP. **Los identificadores E-11 y E-12 se reasignan a las partidas siguientes**, que se recorren dos posiciones.

> 🔴 **Verificar antes del 20 de agosto.** La LAN declara `obtenerQuejas` como `[HttpPost]` en las ocho ramas de APIMagento revisadas, pero la DMZ llama `curl.Get(...)` desde el commit `6a55c6a` del 28-jul. Un `GET` contra una ruta que solo acepta `POST` responde **405**: o el APIMagento desplegado difiere del código, o la ruta lleva caída desde el 28 de julio. Determina qué verbo expone ServicioSAP.

> ⚠️ **Las dos rutas descartadas siguen vivas en la DMZ** apuntando al legado. Cuando APIMagento se apague responderán con error en vez de dejar de existir. Coordinar su baja con Magento antes del apagado: no bloquea ninguna ola, pero no se cierra solo.

---

## Ola 6 — SMB y DMZ · 26–28 ago

| ID | Endpoint | Destino | Días | Fecha |
|---|---|---|---:|---|
| E-11 | `customer/getCuenta` | DMZ → Magento | 0.5 | 26 ago |
| E-12 | `customer/setCuenta` | DMZ → Magento | 0.5 | 27 ago |
| E-13 | `customer/cashCustomerReport` | Filesystem + SMB | 1.0 | 28 ago |
| E-14 | `product/obtenerImagen` | Filesystem + SMB | 0.5 | 28 ago |

> ➕ **E-14 incorporado el 12 ago.** Estaba fuera del alcance original y es inequívocamente nuestro: `ProductImage\Methods.cs:388` copia una imagen desde el share `\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\` a `C:\inetpub\wwwroot\api\images\` dentro de un bloque de impersonación, **sin tocar base de datos alguna**. Es el gemelo de E-13 y comparte el habilitador H-02; conviene programarlos juntos. La red a `172.16.202.4` ya se validó el 5 ago. Ojo: el archivo maestro lo clasifica como origen `SQLITE`, lo cual no corresponde con el código.

> ✅ **Sin configuración nueva y sin habilitadores pendientes.** Los tres se cuelgan del `Controllers\CustomersController.cs` que ya existe desde la Ola 2, y consumen piezas ya escritas: `Curl` (H-03) en E-11 y E-12, `Impersonation` (H-02) en E-13. Las claves `URL_DMZ`, `USER_DMZ` y `SMB_IMPERSONATION_*` ya están en el `Web.config`. Solo los modelos nuevos —`CustomerIntelisis`, `CustomerReportRequest` y `ApiResponse`— necesitan su `<Compile Include>`.

> ℹ️ **E-11 y E-12 no tienen consumidor localizable.** No aparece una sola llamada a `customer/getCuenta` ni a `customer/setCuenta` en los tres repositorios, y la DMZ no las expone: sus rutas `getCuenta`/`setCuenta` viven bajo `MagentoController` con prefijo `magento/` y son el **destino**, no la entrada. **Decisión del 11 ago: se migran igual**, por ser endpoints necesarios del contrato. La topología es un doble salto que se conserva tal cual: ServicioSAP → `magento/getCuenta` en la DMZ → `rest/V1/mavi-cuenta/getCuenta` en Magento.

> ⚠️ **Dos detalles del porteo de E-11 y E-12 que no se pueden simplificar.** La serialización hacia la DMZ usa `NullValueHandling.Ignore`, de modo que las propiedades nulas no viajan en el JSON; serializar por defecto haría que Magento reciba `null` explícitos donde antes no recibía nada. Y la respuesta pasa por un doble desescapado —`.Replace("\\\"","\"")`, `.Replace("\\\\\"","\"")` y `.Trim('"')`— sin el cual el cliente recibe JSON escapado en lugar de JSON.

> ✅ **Decisión del 11 ago sobre E-13: se migra tal cual** —métodos, modelos y ruta— conservando embebidas la carpeta local `C:\inetpub\wwwroot\files\` y la UNC `\\172.16.200.2\mavica\ecom\BaseWhatsapp\STAGE\`. **No se difiere por H-02: en el servidor sí se tienen los permisos.** Al portar hay que respetar que la escritura local ocurre **fuera** del bloque de impersonación —solo el `File.Copy` va dentro—, porque moverla cambiaría la identidad que crea el archivo. El alcance de red quedó cerrado el 5 ago: `172.16.200.2` responde en el puerto 445. La otra IP del plan, `172.16.202.4`, no la usa este endpoint.

> ⚠️ **E-13 señala el error en el cuerpo, no en el HTTP.** El controlador devuelve `Json(response)`, así que un fallo interno responde **HTTP 200** con `status: 500` dentro del `ApiResponse`; la DMZ lo propaga igual tras deserializarlo. Quien integre debe mirar el campo, no el código de respuesta.

---

## Ola 7 — SIGMAVI sin dependencia de SAP

La partida de SIGMAVI que resuelve contra una sola tabla y **no lee nada de SAP**. Verificado sobre el código el 12 ago.

| ID | Endpoint | Tabla actual | Tabla nueva | Días | Fecha |
|---|---|---|---|---:|---|
| E-15 | `order/GetPickUpCode` | `TrWDM0285_CteRecoge` | **SIGMAVI** tabla nueva | 1.0 | — |

> ➕ **Incorporada el 12 ago**, estaba fuera del alcance original. `GetPickUpCode` hace un `SELECT ClaveVenta FROM TrWDM0285_CteRecoge` y nada más.

> 🗑️ **`recommender/setRecommenderList` descartado el 31 ago, sin ID.** Obsoleto en la LAN. Además resolvía contra **IntelisisTmp en MAVICUBOS**, no contra SIGMAVI como decía esta tabla.

> ⚠️ **No confundir con `order/createStorepickupCode`**, que vive en el mismo archivo del legado —`StorePickup\CodigoRecogerSucursal.cs`— pero **sí** cruza a `Venta` y `Cte`. Ése es de Dev 2.

---

## Ola 8 — Reubicación de llamadores hacia la DMZ

**Las 31 rutas de la DMZ no se tocan.** Lo que desaparece con el apagado de APIMagento es **quién las llama**: 21 de las 31 las invoca hoy la propia LAN, y ese cliente pasa a ser ServicioSAP, que es donde apuntará el servidor y donde vivirá la base SQLite.

| Sub-bloque | Rutas | Trabajo |
|---|---:|---|
| 8.1 Catálogo hacia SQLite | 8 | **Reconstruir el llamador** con `Curl` y `SQLiteDb` |
| 8.2 Reenvíos sin persistencia | 3 | Reconstruir el llamador; mismo patrón que E-11 y E-12 |
| 8.3 Órdenes | 3 | Un helper compartido para `setOrderStatus` + 2 llamadores |
| 8.4 Importación de productos | 8 | Sin cambio — las atiende otro proyecto |
| 8.5 Sin llamador identificado | 6 | Solo verificar |
| 8.6 Baja | 4 | Eliminar, coordinado con Magento |

El desglose por identificador está en [[Checklists/CHECKLIST_DEV3_NOSAP_NOINTELISIS#Ola 8 — Reubicación de llamadores hacia la DMZ|el checklist de Dev 3]].

> ✅ **Decisión del 12 ago.** Las ocho rutas de producto pasan tal cual: las consume la herramienta de importación, y el procedimiento almacenado que las alimenta lo migra a C# otro equipo. Las seis sin llamador se conservan por si se requieren más adelante. `setOrderStatus`, que hoy se invoca desde cinco sitios distintos de la LAN, se centraliza en un único método compartido que Dev 3 entrega y Dev 2 consume.

> 🔴 **El acoplamiento de `Curl..ctor()` es doble, no solo con la LAN.** Autentica contra `URL_INTELISIS` fuera de todo `try` y después contra `URL_SAP` dentro de uno que relanza, así que exige **ambos servicios arriba**. No afecta a esta ola —ninguna de sus rutas construye un `Curl`— pero sí a toda ruta conmutada.

> ⚠️ Los tres proxies colgantes **ya están rotos hoy**: reenvían a rutas de la LAN que no existen y el cliente recibe 500. No se romperán con el apagado.

---

## Ola 9 — Mixtos SAP

Cierran el trabajo de Dev 3 que **necesita una lectura previa contra SAP** antes de escribir en Android o SIGMAVI. No están bloqueados por arquitectura —SAP responde—, pero su prueba depende de que S/4 esté disponible.

| ID | Endpoint | Lee de SAP | Escribe en | Días | Fecha |
|---|---|---|---|---:|---|
| E-47 | `credit/SolicitudMercancia` | `partner/client/{clientId}` | `ServicioAndroid` | 1.0 | — |
| E-48 | `credit/codigoPromocion` | SuccessFactors + BP05 | **SIGMAVI** `VentaCupon` | 1.5 | — |
| E-49 | `credit/getPlazos` | TZ01 | **SIGMAVI** `CondicionesCredVtaLinea` | 1.5 | — |
| E-50 | `customerService/obtenerTipoGarantia` ⏳ | `Art` — maestro de materiales | **SIGMAVI** tabla nueva | 1.5 | — |

> **E-47** parte en dos el `INSERT ... SELECT` único del legado: leer el Business Partner en C# y luego insertar. Requiere el **helper de conversión de cuenta `C%` → BP**, que no existe y lo van a necesitar E-48, E-49 y varios mixtos.

> ⛔ **E-48 depende del wrapper de SuccessFactors** que construye Dev 1. El de TZ01 que usa E-49 ya existe.

> 🔒 **E-50 está bloqueado.** La tabla la alimenta PCP y **Miguel Marín** debe entregar la estructura. Al recibirla, verificar que conserve `TipoGarantia`, `Marca`, `Telefono`, `Proveedor`, `Linea`.

---

> ➡️ **El monedero salió del plan el 12 ago** y pasó a Dev 2: sus ocho accesos terminan todos en SAP. Ocupaba la Ola 10, así que los tres bloques de mixtos se recorrieron a las olas 10, 11 y 12.

## Olas 10–12 — Endpoints mixtos de Intelisis · Bloque C

Requieren **decisión de arquitectura previa**. Las fechas son un marcador de posición.

### Ola 10 — Bifurcados SQLite / Intelisis

| ID   | Endpoint                        | Objeto Intelisis                           | Días | Fecha     |
| ---- | ------------------------------- | ------------------------------------------ | ---: | --------- |
| M-01 | `credit/CreditoWeb_FormDatos`   | `SP_CREDITO_WEB_VALORES_FORM` — 83 objetos |  5.0 | 01–07 oct |
| M-02 | `credit/CreditoWeb_Informacion` | `SPCREDICredilana` — 31 objetos            |  5.0 | 08–14 oct |
| M-03 | `credit/SaveCredilanaInfo`      | `FnVTASListaCredilanas` — 9 objetos        |  3.0 | 15–19 oct |

> ⚠️ `SP_CREDITO_WEB_VALORES_FORM` **llama a `SPCREDICredilana`**. Están acoplados y ambos ejecutan `spAfectar` — no son consultas de catálogo.
> 📊 **Medir en producción** cuántas veces se invoca cada `op` sin caché. Si el volumen es cero, estos tres se reducen a eliminar la rama del fallback y la ola completa baja de 13 días a ~2.

### Ola 11 — Otros mixtos

| ID | Endpoint | Situación | Días | Fecha |
|---|---|---|---:|---|
| M-06 | `credit/getSms` | `VTASCodigoSMSEcommerce` mezcla Android e Intelisis | 2.0 | 20–21 oct |
| M-13 | `credit/CreditoWeb_SaveData_Articulos` | Delega + `cte_prospecto` | 2.0 | 22–23 oct |
| M-07 | `credit/CreditoWeb_Seguro` | `SpCREDICredilanaSeguroDeVida` + API Liberador | 3.0 | 26–28 oct |
| ➡️ | `credit/GetPhoneValidatedClientSecretName` | `Cte`, `CteTel` → `partner/client` | 2.0 | 29–30 oct |
| M-08 | `credit/SaveHaztenTransaction` | SIGMAVI + Android + `RM0855ACoordenadasProspecto` | 2.0 | 02–03 nov |
| M-04 | `credit/CreditoWeb_Solicitud` | `SPCREDICredilana` — **el mismo SP que M-02** | 2.0 | — |
| M-05 | `credit/CreditoWeb_SolicitudPrimerGuardado` | Intelisis — hermano de M-14 | 2.0 | — |
| M-09 | `order/ManagePaynetOrders` | Intelisis · depende de `spAfectar` | 2.0 | — |
| M-10 | `order/insertPaymentData` | Intelisis · `CXCCMensajeWebHookOpenPay` | 2.0 | — |
| ➡️ | `order/updateCreditOrderId` | Intelisis · `eCommerceDetPedidos`, `Venta` | 2.0 | — |

> ➕ **M-04 a ➡️ incorporados el 12 ago.** Los cinco son endpoints de APIMagento que abren conexión con `sCadenaConexion`, es decir contra `IntelisisTmp` en `MAVICUBOS`, y por tanto caen bajo la misma decisión de arquitectura pendiente que M-11…M-08. No estaban en el alcance original. Los días son el PERT del archivo maestro, no una estimación propia.
>
> ⚠️ **El archivo maestro los clasifica mal:** `CreditoWeb_Solicitud` y `CreditoWeb_SolicitudPrimerGuardado` figuran como origen `ANDROID` e `insertPaymentData` como `SQLITE`, cuando los tres resuelven contra Intelisis. El campo `Data_Origin` describe la conexión aparente, no dónde acaban los datos: los SP y los nombres de cuatro partes cruzan sin que se note.

> 📌 **Revisado y descartado del alcance el 12 ago.** `credit/codigoRecomendadoWithUen` resuelve contra Intelisis (`CREDIDCodigoRecomendador`) pero el propio archivo maestro lo marca *"not in gap scope"*. `login/authenticate` ya existe en ServicioSAP (`Controllers\LoginController.cs`), no hay nada que migrar. Los endpoints `magento/*`, y las variantes de `order/*` y `product/*` con parámetros de tienda, **viven solo en APIMagentoDMZ**, que no se migra. Los `product/*` de precio, stock y existencias sí están en la LAN pero su origen es el maestro de materiales, que **sí va a SAP core** — quedan fuera de nuestro criterio y deben confirmarse con arquitectura.
### Ola 12 — Cruzan por linked server `ERPMAVI`

| ID | Endpoint | SP que cruza | Días | Fecha |
|---|---|---|---:|---|
| M-11 | `credit/validateSms` | `SPVTASCodigoSeguridadeCommerce` | 3.0 | 15–18 sep |
| M-12 | `credit/CreditoWeb_SaveData` | `SP_CREDITO_WEB_DATOS` | 3.0 | 21–23 sep |
| M-14 | `credit/CreditoWeb_SaveFirstData` | `SpCREDISolicitudWebPrimerGuardado` | 3.0 | 24–28 sep |
| M-15 | `customerService/bitacoraAtencionClientes` | `SP_ACTES_REGISTRO` | 2.0 | 29–30 sep |

> 🔴 **Verificado el 12 ago: los cuatro abren conexión contra `ServicioAndroid`**, que se queda. Lo que cruza está **dentro de los procedimientos**, que alcanzan `ERPMAVI` con nombres de cuatro partes. El código C# apenas cambia de destino; **el trabajo real es de base de datos**, podar los cuatro SP de sus referencias cruzadas. La pregunta bloqueante deja de ser a dónde movemos la base y pasa a ser qué hacemos con la parte del SP que consulta Intelisis.

> ⛔ **Los días de esta ola no son estimables todavía**: los cuatro procedimientos son cajas negras. Se conoce su nombre y qué objetos de Intelisis tocan, no su cuerpo.

> ✅ **M-11 está medio resuelto**: `CreditMethods.IsValidated` ya reemplaza en ServicioSAP la lectura de `CteTel` consultando el teléfono del Business Partner. Falta la ruta que lo exponga.

> ⚠️ **M-14 tiene 25 % en el stash del 29-jul** y arrastra la decisión sobre la convención de conexiones. **`SP_CREDITO_WEB_DATOS` lo usan tres puntos del legado**, no solo M-12.


---

## Ruta crítica y riesgos

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| 1 | **Estructura de garantías (Miguel Marín)** | E-50 no arranca | Solicitar antes del 1 de septiembre |
| 2 | ~~**Definición de monedero (Valentin)**~~ | ➡️ Reasignado a Dev 2 el 12 ago | — |
| 3 | ~~**Alcance de red a los shares SMB**~~ | ~~E-13 y la ola 6 completa~~ | ✅ Cerrado: red validada el 5 ago y permisos confirmados en el servidor el 11 ago |
| 4 | **Medición de `op` sin caché** | Ola 10 oscila entre 2 y 13 días | Extraer logs de 30 días esta semana |
| 5 | **Decisión sobre los mixtos del grupo A** | 11 días de la ola 10 | Definir qué pasa con la parte que cruza a Intelisis |
| 6 | **Ciclo de revisión y despliegue** | El calendario asume revisión continua | Calibrar con el piloto E-01 |
| 7 | **Verbo de `obtenerQuejas` desalineado entre la DMZ y la LAN** | Puede ser una ruta caída en producción desde el 28-jul, no solo una decisión de E-09 | Comprobar en producción antes del 20 de agosto |

> Las tres primeras se pueden destrabar **esta semana** con una solicitud. Ninguna requiere desarrollo.
> La séptima no es de desarrollo tampoco: es una comprobación de cinco minutos contra el ambiente productivo.

---

## Escenarios de cierre

| Escenario | Condición | Cierre |
|---|---|---|
| **Optimista** | Fallback de la ola 11 sin uso · 2 desarrolladores en paralelo | **fin de septiembre** |
| **Base** | Secuencial, un desarrollador, sin bloqueos prolongados | **3 de noviembre** |
| **Pesimista** | Bloqueos de garantías y monedero se extienden · mixtos requieren rediseño | **fin de noviembre** |

> Sin las olas 10–12, todo lo demás cierra el **14 de septiembre**. Los mixtos son el 63 % del esfuerzo total (35 de 54.5 días).

---

## Navegación

- Mapa raíz de la capa: [[../LAN - Mapa|LAN - Mapa]]
- Listado de control (CSV): [[_CONTROL_MIGRACION.csv]]
- Alcance detallado: [[_ALCANCE_MIGRACION_LAN_a_SAP]]
- Decisiones del ODS: [[_DECISIONES_ODS]]
- Índice del equipo: [[README]]

