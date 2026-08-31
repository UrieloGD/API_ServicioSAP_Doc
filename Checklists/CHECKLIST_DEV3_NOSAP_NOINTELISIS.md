---
tags: [checklist, migracion, dev3, plan, sigmavi, mixtos]
fuente: "_PLAN_MIGRACION_FECHAS.md · MIGRATION_STATUS_MASTER_v2 FINAL.csv"
actualizado: 2026-08-23
rol: "Dev 3 — todo lo que no va a SAP ni se queda en Intelisis"
agente: Nexo (con asistencia de Claude)
---


# Checklist Dev 3 — Migración de lo que no va a SAP

Lista de control del desarrollador que migra a `ServicioSAP` **todo aquello cuyo destino de datos no es SAP core y que no se queda en Intelisis**.

> ℹ️ **Convive con [[CHECKLIST_MIGRACION_LAN_A_SAP]], no lo sustituye.** Aquél es el checklist operativo original de las 38 partidas medibles, con el histórico de decisiones y riesgos tal como se fue escribiendo, y sigue siendo el que se marca día a día. Éste es la **vista de rol**: el alcance completo de Dev 3 según el archivo maestro, con la numeración reindexada, las 31 rutas de reapunte de la DMZ y la coordinación con los otros desarrolladores. Si los dos discrepan sobre el estado de una partida, manda el original.

**Leyenda:** `[x]` hecho · `[ ]` pendiente · 🔒 bloqueado · ⏳ en definición · 🟠 destino de conexión sin definir · 🗑️ descartado

> Reparto de la migración: [[Checklists/CHECKLIST_DEV1_WRAPPERS_SAP|Dev 1 — wrappers de SAP]] · [[Checklists/CHECKLIST_DEV2_ROADMAP|Dev 2 — endpoints sobre SAP]] · [[CHECKLIST_DEV4_PAGOS|Dev 4 — flujos de pago]].
>
> El avance por endpoint y el resultado de las pruebas viven en [[ESTADO_PRUEBAS_Y_AVANCE]]; los contratos, en [[Contratos/README|Contratos]]; el calendario, en [[_PLAN_MIGRACION_FECHAS]].

## Qué entra en Dev 3 y qué no

La regla es el **destino de los datos**, no el controlador ni el nombre del endpoint:

| Destino | ¿Es de Dev 3? |
|---|---|
| `ServicioAndroid`, `AdminDoc`, `SIGMAVI`, `SQLite` | ✅ Sí |
| Filesystem local y shares SMB | ✅ Sí |
| Servicios externos que no son SAP — SOAP, Hazten, BBVA | ✅ Sí |
| Rutas de la DMZ que solo devuelven información a Magento | ✅ Sí, pero como **reapunte**, no como porteo |
| Lectura de SAP + escritura en Android o SIGMAVI | ✅ Sí, como **mixto SAP** — bloque B |
| `IntelisisTmp` en `MAVICUBOS` o el linked server `ERPMAVI` | 🟠 Mixto Intelisis: Dev 3 resuelve la parte no-SAP, **Dev 2 cierra la parte SAP** |
| SAP core — maestro de clientes, materiales, ventas, cobros | ❌ Dev 2 |
| Referencias bancarias, STP, pasarelas | ❌ Dev 4 |

**Nada se escribe ni se prueba contra `IntelisisTmp`.** Probar contra el origen viejo da un verde que no significa nada.

## El orden de ataque

El plan se divide en tres bloques, y **el criterio es la dependencia externa, no la dificultad**:

| Bloque | Olas | Qué contiene | Partidas | De qué depende |
|---|---|---|---:|---|
| — | 0 – 2 | Cerradas: habilitadores, piloto y listas | 8 | ✅ desarrollo terminado |
| **A** | **3 – 8** | Sin ninguna conexión a SAP | 43 | De nadie. Se puede cerrar completo hoy |
| **B** | **9** | Mixtos SAP | 4 | De que S/4 responda; E-48 además de un wrapper de Dev 1 |
| **C** | **11 – 13** | Mixtos Intelisis | 18 | 🟠 De la decisión de arquitectura sobre `IntelisisTmp` |

Se agota el bloque A antes de entrar al B. La razón es simple: el bloque A es el único frente del proyecto sin bloqueos externos, y consumirlo mientras los demás están detenidos es lo que mantiene el avance cuando SAP o Arquitectura no responden. Si se empieza por el B y SAP se cae una semana, no hay a qué cambiarse.

---

## Ola 0 — Habilitadores · cerrada como desarrollo

- [x] **H-01** `conexionSQL.obtenerConexionAdminDoc()` — en `Helpers\ConexionDB\ConexionSQL.cs`, con variante asíncrona. Portado de `Conn\Connection.cs`; cadena en `Web.config` como `ADMINDOC`.
- [x] **H-02** Clase `Impersonation` (P/Invoke) — en `Helpers\Impersonation\Impersonation.cs`. Réplica literal de la de APIMagento; el llamador provee credenciales en orden `usuario, dominio, password`.
- [x] **H-03** Helper HTTP hacia la DMZ — clase `Curl` en `Helpers\ConexionDMZ\Curl.cs`, misma firma pública que la del legado.
- [x] **H-04** Fix `SQLiteDb.DefaultPath` — lee `SQLITE_DB_PATH` del `Web.config`. Ruta, cadena, ensamblados e interops verificados.

> **Cerrada el 6 ago.** H-02 y H-04 quedan con validación diferida a QA por depender de recursos que solo existen en el servidor.

## Ola 1 — Piloto

- [x] **E-01** `credit/SendSmsNewNumber` — **100 % de desarrollo**. Ambas ramas verificadas el 6 ago contra la base real. ⚠️ La entrega del SMS no se pudo comprobar: el canal lleva caído desde el 5-ago 23:04 y falla igual para el legado. Ver [[E-01_SendSmsNewNumber]].

## Ola 2 — SIGMAVI · listas blanca y negra

- [x] **E-02** `customer/setCustomerList` — **90 %**. Alta verificada end-to-end contra SIGMAVI y SAP. Ver [[E-02_setCustomerList]].
- [x] **E-03** `customer/getCustomerList` — **90 %**. Los tres valores de respuesta verificados. Ver [[E-03_getCustomerList]].
- [x] **E-04** `customer/deleteCustomerList` — **90 %**. Borrado efectivo verificado. Ver [[E-04_deleteCustomerList]].

> Commiteado y **subido** en ServicioSAP (`a0f1017`) y en la DMZ (`740669e`); falta **desplegar**. Objetos de base desplegados en DEVMAVI desde el repo MaviSAP, rama `SpVTASListaNBMagento`.

---

# Bloque A — sin ninguna conexión a SAP

**Se atiende primero, completo, antes de tocar nada que lea de SAP.** Estas partidas no dependen de que S/4 responda, ni de un wrapper, ni de una decisión de arquitectura: se pueden escribir, probar y cerrar de principio a fin con lo que hay hoy. Dejarlas para después sería regalar el único frente del proyecto que no tiene bloqueos externos.

## Ola 3 — SQLite

- [ ] **E-05** `order/getGuide` — tabla `servicio_guias`. **80 %**: los 7 casos verificados el 19 ago sobre base simulada, cutover commiteado y subido. Falta validar contra la base real del servidor. Ver [[E-05_getGuide]].
- [ ] **E-06** `credit/GetCreditAmounts` — tabla `mavi_credilana_info`. **80 %**: los 9 casos y las 3 ramas de campo verificados el 19 ago, cutover commiteado y subido. ⚠️ Responderá **500 a todo** hasta que **M-03** llene la tabla. Ver [[E-06_GetCreditAmounts]].

> Corrección sobre el 404: **no es alcanzable** para el caso que importa. El `throw` está dentro del `try` y el `catch` lo convierte en 500, así que "sin guía" y "consulta rota" son indistinguibles. El legado es idéntico. El 404 solo sale con `IdEcommerce` como cadena vacía.

> El script `Scripts\SQLite\01_CrearTablas_Ola3.sql` está escrito y es idempotente, pero **crea solo `mavi_credilana_info`**: `servicio_guias` va comentada por decisión del 19 ago, replicando cómo vive en el legado. ServicioSAP usa **su propio archivo** de base, no el del legado.

> 🔴 **Pendiente en el servidor:** comprobar si `servicio_guias` existe en `C:\inetpub\wwwroot\sap\data.db`. `SaveGuide` lleva escribiendo ahí con tres capas de silencio; si la tabla no está, cada guía se pierde sin rastro.

## Ola 4 — AdminDoc

- [x] **E-07** `credit/guardardocumento` — `MAVI_DOC_CTE`. **100 %**. Conserva el `switch` de 10 casos y las ramas `Cliente`/`Token`/`Actualizar`. Los 9 casos verificados el 20 ago **contra AdminDoc real**, con las filas comprobadas por SELECT y borradas después. Cutover commiteado (`d933e44`), sin desplegar. Ver [[E-07_guardardocumento]].
- [x] **E-08** `credit/SaveImagesProductosMx` — `MAVI_DOC_CTE` + filesystem. **100 %**. Los 3 casos verificados el 20 ago: archivos en disco y fila de la selfie en AdminDoc. Cutover commiteado (`d933e44`), sin desplegar. Ver [[E-08_SaveImagesProductosMx]].

> ✅ **La Ola 4 es la primera que cierra completa.** Lo que le queda ya no depende de desarrollo: es despliegue, y en E-08 confirmar que el app pool pueda escribir en la carpeta de imágenes.

> ⚠️ **Adaptación al formato de cuenta en E-07.** El legado decide en qué columna guarda preguntando si la cuenta empieza por `C` o `P`. Con el BP esa condición sería siempre falsa y los documentos caerían en `DIR` en vez de `CLAVE`, donde `SpMaviConsultaDoc` no los encontraría. La condición pasa a `StartsWith("15") && Length <= 10`.

> ✅ **E-08 nunca estuvo bloqueado por H-02.** El comentario que lo daba por dependiente de la impersonación era falso: el legado escribe en una ruta **local**, no en un share SMB.

> 🔴 **E-08 responde `true` antes de trabajar.** Verificado: contesta en 179 ms y guarda 10 segundos después, en un `Task` suelto. Un reciclado del app pool en esa ventana se lleva el lote sin rastro.

## Ola 5 — ServicioAndroid y SOAP externo

- [ ] **E-09** `customerService/obtenerQuejas` — `ServicioAndroid`. **90 %**: escrito el 21 ago en `Methods\CustomerService\CustomerServiceMethods.cs`, compila en 0 errores, cutover commiteado el 24 ago (`c695b2e`) y subido el 31. Los 5 casos verificados el 23 ago contra servicios reales; ficha lista. Falta desplegar. ✅ Confirmado que `intelisisConn` **no toca Intelisis**: la cadena es `sCadenaConexionAndriod` (APIMagento: `Conn\Connection.cs:28`); la variable ya no se llama así en ServicioSAP.
- [ ] **E-10** `customerService/bbvaKeyAdvanced` — SOAP `WSeCommerceMX`. **90 %**: escrito el 21 ago, misma clase, cutover commiteado el 24 ago y subido el 31 (mismo commit que E-09). `MULTIPAGOS_APIKEY_URL` y `CODIGO_ENT` ya portadas al `Web.config`. Los 5 casos verificados el 23 ago contra el SOAP real; ficha lista. Falta desplegar.

> ✅ **Verbo resuelto el 21 ago, en el cutover.** La LAN declara `obtenerQuejas` como `[HttpPost]` y la DMZ la llamaba con `curl.Get(...)` desde el 28-jul (`6a55c6a`). Ahora la DMZ **conserva su `[HttpPost]` público** y llama con `curl.PostSAP(...)`, que es el verbo del legado.

> ✅ **`GetSAP` entregado por Dev 1 el 21 ago** (`4dabaa9`, `Curl.cs:210`). Las dos partidas quedan **en paridad de verbo con el legado**: E-09 por `PostSAP` y E-10 por `GetSAP`. Las rutas públicas de la DMZ siguen siendo `[HttpPost]` en ambas.
>
> | | Verbo en la LAN | Llamada de la DMZ | Ruta en ServicioSAP |
> |---|---|---|---|
> | **E-09** | `[HttpPost]` | `curl.PostSAP(...)` | `[HttpPost]` ✅ |
> | **E-10** | `[HttpGet]` | `curl.GetSAP(...)` | `[HttpGet]` ✅ |
>

- 🗑️ ~~`credit/ExistRFCAndPhoneCte`~~ — **descartado el 11 ago**, sin ID. Código muerto; su validación real es contra Intelisis.
- 🗑️ ~~`status/getStatus`~~ — **descartado el 11 ago**, sin ID. Ping al servidor de Intelisis, sin aporte funcional.

## Ola 6 — SMB y DMZ

> **Escrita y probada el 25 ago; commiteada el 26 y subida el 31** en `4315c50` de ServicioSAP, con el cutover de E-13 en `e403065` de APIMagentoDMZ. Nada desplegado.

- [ ] **E-11** `customer/getCuenta` — DMZ → Magento, con `Curl` (H-03). **90 %**: los 4 casos verificados el 25 ago contra la cadena completa, con APIMagentoDMZ levantada en local. Sin cutover: no hay ruta suya en la DMZ. Falta desplegar.
- [ ] **E-12** `customer/setCuenta` — DMZ → Magento, con `Curl` (H-03). **80 %**: rama de error verificada el 25 ago. ⚠️ **La escritura real no se ejecutó**: graba `customer_credit_account` en un cliente de Magento y falta acordar un id de prueba.
- [ ] **E-13** `customer/cashCustomerReport` — filesystem + SMB a `\\172.16.200.2`. Se migra tal cual; los permisos existen en el servidor. **80 %**: validación y escritura local verificadas el 25 ago, cutover subido el 26. 🔴 La copia al share no es verificable desde desarrollo; se valida en QA con H-02.
- [ ] **E-14** `product/obtenerImagen` — filesystem + SMB a `\\172.16.202.4`. Gemelo de E-13, mismo habilitador. Programar juntos. **55 %**: escrito el 25 ago con la diagonal del legado corregida. Sin cutover posible: no existe ruta suya en la DMZ. 🔴 Bloqueado por H-02, y la corrección no se pudo verificar ejecutando.

> Conservar el `NullValueHandling.Ignore` y el doble desescapado de la respuesta en E-11 y E-12.

## Ola 7 — SIGMAVI sin dependencia de SAP

La partida de SIGMAVI que resuelve contra una sola tabla y no lee nada de SAP. Verificado sobre el código el 12 ago.

- [ ] **E-15** `order/GetPickUpCode` — **35 %**: escrito el 31 ago en `Methods\Order\StorePickupMethods.cs`, commiteado y subido en `8cf2c52`, con sus modelos y la ruta en `OrderController`, compila en 0 errores, asíncrono. Sin pruebas, sin cutover y sin ficha. 🤝 Dev 2 depende de la misma tabla para `createStorepickupCode` y `generateNewStorepickupCode`.

> 📌 **La tabla ya existe en SIGMAVI y se llama `BpRecogePedidos`**, no `TrWDM0285_CteRecoge` — mismas columnas, `MaviSAP: Tables\BpRecogePedidos.sql`, creada en abril de 2025. **Dev 3 no tiene que crearla.** Ese es el nombre contra el que quedó programado E-15, y conviene avisar a Dev 2, cuyo checklist todavía dice el nombre viejo.

> ⏳ **E-15 no se puede probar todavía.** Solo lee; los tres flujos que llenan la tabla siguen escribiendo en Intelisis. Dos son de Dev 2 —`createStorepickupCode` (feb 2027) y `generateNewStorepickupCode` (10-11 sep)— y el tercero, `crearPrimerCodigoRecogerSucbanktransfer`, apareció el 20 ago con el work item 8600 y **no está en ningún checklist**. Mientras tanto el endpoint responde 404 siempre. Se puede adelantar la prueba insertando una fila a mano.

> ℹ️ **Solo se migró la lectura**, por decisión del 31 ago. `GetPickUpCode` en el legado no cambió desde el análisis del 12 ago —se comparó método contra método—; lo que cambió alrededor son los escritores, que se quedan. Ojo también con que la escritura va por el procedimiento `SpWDM0285_CteRecoge`, que no está en `MaviSAP\StoreProcedure`.
- 🗑️ ~~`recommender/setRecommenderList`~~ — **descartado el 31 ago, sin ID.** Obsoleto en la LAN, no se migra. Pierde su identificador y los posteriores se reindexan una posición. Al revisarlo se vio además que `CodigoRecomendador` abre `sCadenaConexion`, que es **IntelisisTmp en MAVICUBOS** (`Conn\Connection.cs:26`), no SIGMAVI como decía esta ficha.

> ⚠️ No confundir con `order/createStorepickupCode`, que vive en el mismo archivo del legado (`StorePickup\CodigoRecogerSucursal.cs`) pero **sí** cruza a `Venta` y `Cte`. Ése es de Dev 2.

## Ola 8 — Reubicación de llamadores hacia la DMZ

**Las 31 rutas de la DMZ no se tocan.** Lo que desaparece cuando se apague APIMagento no son ellas, sino **quién las llama**: 21 de las 31 las invoca hoy la propia LAN. La DMZ seguirá sirviendo a Magento; el hueco queda del lado del cliente, y ese cliente pasa a ser ServicioSAP, que es donde apuntará el servidor y donde vivirá la base SQLite.

Verificado el 12 ago sobre el código: ninguna ruta de `MagentoController` ni de `ProductsController` en la DMZ construye un `Curl`; todas resuelven contra Magento REST con `URL_MAGENTO` y `TOKEN_MAGENTO`.

### 8.1 · Catálogo hacia SQLite — 8 llamadores a reconstruir - 2 días

El grueso del trabajo real de la ola. Los ocho métodos viven en `Conn\Magento.cs` de la LAN, consultan la DMZ y **escriben el resultado en SQLite**, que se queda y pasa al servidor junto con ServicioSAP. Se reconstruyen con la clase `Curl` (H-03) y `SQLiteDb` (H-04), ambas ya disponibles.

| ID | Ruta que consume | Método de origen en la LAN | Tabla SQLite que escribe |
|---|---|---|---|
| E-16 | `magento/attributes` | `getAttributes` | `attribute_options` |
| E-17 | `magento/general/attributes` | `getGeneralAttributes` | `attributes` |
| E-18 | `magento/attributeSets` | `getAttributeSets` | `attribute_sets` |
| E-19 | `magento/attributeSetChildren/{id}` | `sendAttributesToIntelisis` | `atributos_de_magento` |
| E-20 | `magento/categories` | `getCategories` | `categories` |
| E-21 | `magento/children/{page}/{size}/{store}` | `getChildren` | `children` |
| E-22 | `magento/noImagenProduct/{store}` | `getNoImageProduct` | `no_imagen_product` |
| E-23 | `magento/productWithWebsites/{page}/{size}` | `getProductWithWebsites` | `product_in_stores` |

> 🔴 **Las ocho tablas no existen en nuestro `data.db`.** Hoy solo están contempladas `servicio_guias` y `mavi_credilana_info`, las dos del script de la Ola 3. Hace falta **un segundo script** con estas ocho, y antes sacar su definición del `data.db` del legado. Con eso, los **2 días asignados a este sub-bloque se quedan cortos**: solo levantar las definiciones y escribir el script es una jornada larga.

> ⚠️ **`sendAttributesToIntelisis` no escribe en Intelisis, escribe en SQLite.** Es la misma trampa de nombre que `intelisisConn` en E-09. Al portarlo conviene renombrarlo.

> ℹ️ Son cargas de catálogo, no peticiones de usuario. Al reubicar el llamador hay que reubicar también **quién las dispara**: hoy las agenda la LAN.

### 8.2 · Reenvíos sin persistencia — 3 llamadores - 1 día

No guardan nada, solo devuelven a quien preguntó. El patrón ya está resuelto en la Ola 6 con E-11 y E-12, que reconstruyen exactamente este tipo de llamador sobre `magento/getCuenta` y `magento/setCuenta`.

| ID | Ruta | Método de origen |
|---|---|---|
| E-24 | `magento/getOrderId/{incrementId}` | `OrdersController.cs:421` |
| E-25 | `magento/deletePromociones` | `deletePromociones` |
| E-26 | `magento/deleteReservations` | `deleteReservations` |

> `E-27 magento/getCuenta` y `E-28 magento/setCuenta` **ya están cubiertas** como E-11 y E-12 en la Ola 6; aquí solo se listan para que el conjunto quede completo.

### 8.3 · Órdenes — 1 helper compartido y 2 llamadores - 2 días

| ID | Ruta | Quién la llama hoy |
|---|---|---|
| E-29 | `order/setOrderStatus` | **Cinco sitios**: `OrdersController.cs:338`, tres puntos de `OpenpayMethods` y `CodigoRecogerSucursal.cs:192` |
| E-30 | `order/jsonOrders/{incrementId}` | `Magento.getOrderInfoAndSet`, endpoint de Dev 2 |
| E-31 | `order/setCAccount` | `Magento.SetCAccount` |

> ✅ **Decisión del 12 ago sobre E-29:** se construye **un único método compartido** en ServicioSAP que envuelva la llamada, y cada flujo lo consume, en vez de replicar la llamada en cinco sitios como hace el legado. Cinco copias de la misma petición son exactamente lo que termina divergiendo, y el contrato de la DMZ es uno solo. El helper lo entrega Dev 3 —es una llamada a la DMZ, sin SAP de por medio— y **Dev 2 lo consume** en los flujos que le tocan.

> El llamador de E-30 vive dentro de `order/getOrderInfoAndSet`, que es partida de Dev 2, así que se reconstruye allá y no aquí.

### 8.4 · Importación de productos — 8 rutas, sin cambio - 1 día

| ID | Ruta | | ID | Ruta |
|---|---|---|---|---|
| E-32 | `product/updateProduct/{store}` | | E-36 | `product/getStockByStore` |
| E-33 | `product/updateConfigurableProduct/{store}` | | E-37 | `product/updatePrice` |
| E-34 | `product/updateConfigurableProductLink/{sku}` | | E-38 | `product/uploadImage` |
| E-35 | `product/updateStock` | | E-39 | `product/uploadImagesToMagento` |

> ✅ **Decisión del 12 ago: pasan tal cual.** Las consume la **herramienta de importación de productos**, que es otro proyecto, y la lógica que hoy vive en un procedimiento almacenado **la migra a C# otro equipo**. Esa herramienta seguirá siendo su cliente. Para nosotros no hay desarrollo: es una dependencia externa que solo hay que no romper.

### 8.5 · Sin llamador identificado — 6 rutas, se conservan - 1 día

`E-40 order/authorizationResult`, `E-41 order/sendStorePickupEmail`, `E-42 order/getOrderInfo/{incrementId}` y las tres de producto sin llamador en la LAN. No aparece ninguna invocación en los tres repositorios, así que lo más probable es que sean entrada desde Magento hacia la DMZ.

> **Decisión del 12 ago: se conservan**, por si se requieren más adelante. No hay llamador que reconstruir; el trabajo se limita a verificar que siguen operando tras el apagado.

### 8.6 · Baja — 4 rutas - 1 día

| ID   | Ruta                                            | Motivo                                     |
| ---- | ----------------------------------------------- | ------------------------------------------ |
| E-43 | `customerService/ActualizarCamposConfigurables` | 🔴 Proxy colgante                          |
| E-44 | `customerService/InsertarDesdeTablerateNativo`  | 🔴 Proxy colgante                          |
| E-45 | `customerService/InsertarDesdeTablerateCustom`  | 🔴 Proxy colgante                          |
| E-46 | `order/getprueba`                               | Stub de diagnóstico expuesto en producción |

> 🔴 **Los tres proxies ya están rotos hoy, no se romperán con el apagado.** Construyen un `Curl` y reenvían a rutas de `customerService/` que **no existen** en APIMagento —enumeradas sus 23 rutas, ninguna es ésta—. `Curl.Post` atrapa el 404 y devuelve el texto de la excepción como respuesta; el controlador se lo pasa a `DeserializeObject`, que revienta, y el cliente recibe 500. Coordinar la baja con Magento.

---


# Bloque B — mixtos SAP · leen de SAP y escriben en no-SAP

Estas cuatro partidas siguen siendo de Dev 3 —el dato acaba en Android o SIGMAVI— pero necesitan una lectura previa contra SAP.

> ℹ️ **No son mixtos del mismo tipo que los `M-xx`.** Aquéllos esperan la decisión de arquitectura sobre `IntelisisTmp`, que es un bloqueo externo sin fecha. Éstos no lo están.

## La regla de reparto para los mixtos — decisión del 12 ago

Cuando un endpoint mezcla SAP y no-SAP, el corte es siempre el mismo:

| Lo hace Dev 3 | Se entrega a Dev 2 |
|---|---|
| La tabla en SIGMAVI, incluido su script y el poblado inicial si aplica | La conexión contra SAP o SuccessFactors que **no exista todavía** |
| El método de negocio y la conexión a nuestras bases | El mapeo de los campos que vengan de esas APIs |

**No construimos wrappers de SAP.** Sí podemos **consumir los que ya existen** si eso permite terminar la partida — no es el objetivo, pero tampoco se evita— con una condición que no admite matices: **la respuesta debe replicar exactamente el contrato que el legado devuelve hoy hacia Magento**, para que el consumidor no note el cambio.

Lo que quede pendiente de SAP **se anota en la sección de entregas de abajo** conforme se cierre cada partida, y se le pasa a Dev 2 en bloque.

## Ola 9 — Mixtos SAP

| ID   | Endpoint                              | Lo que construye Dev 3                                                  | Lo que espera a Dev 2                         |
| ---- | ------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| E-47 | `credit/SolicitudMercancia`           | Método, `INSERT` a `ServicioAndroid` y helper de cuenta `C%` → BP       | — `partner/client` ya existe                  |
| E-48 | `credit/codigoPromocion`              | Tabla `VentaCupon` en SIGMAVI, método y conexión                        | Lectura de personal contra **SuccessFactors** |
| E-49 | `credit/getPlazos`                    | Tabla `CondicionesCredVtaLinea` en SIGMAVI y método                     | Consulta de condiciones a **TZ01**            |
| E-50 | `customerService/obtenerTipoGarantia` | Tabla en SIGMAVI, método y **exportación de los datos desde Intelisis** | Consulta del artículo a **DM01**              |

> ✅ **E-48 ya está construido** en `Methods\Order\OrderMethods.cs:829` como `HandlePromoCode`, expuesto en `order/validatecupon/{codigo}` y consumido dentro del flujo de órdenes. Cubre validación, quema y regeneración del cupón. **Falta alinear el nombre de la tabla**: el código escribe contra `VentasCupones` y el nombre acordado es `VentaCupon`.

> ✅ **Nombres de objetos en SIGMAVI:** se conserva el nombre del original **sin el prefijo de Intelisis**, como ya se hizo en la Ola 2 con `ListaNegra`, `ListaBlanca` y `SpListaNBMagento`. Por eso `VTASCVentaCupon` → **`VentaCupon`** y `VTASCCondicionesCredVtaLinea` → **`CondicionesCredVtaLinea`**.

> ✅ **E-50 deja de estar bloqueado por SAP.** La tabla destino es `DM0415 Configuración Garantías Atención a Clientes` y sus dueños son **Valentin y Humberto**, no Miguel Marín como decía el checklist. La consulta del artículo va a **DM01**, cuyo wrapper ya existe en `Methods\MaterialManagement\ProductMethods.cs`. Nosotros creamos la tabla en SIGMAVI y la poblamos exportando desde Intelisis.

> ✅ **DM07 y `ZAPI_SUCURSALES_SRV` son el mismo servicio de sucursales**, una es la cabecera del otro. La llamada de E-48 apunta a lo correcto; queda cerrada esa duda.

> ⚠️ **Las tres partidas pendientes comparten forma:** una consulta que hoy une en un solo SQL dos orígenes que se separan. Conviene escribir E-47 primero y que E-49 y E-50 copien su patrón.

### Defectos abiertos en E-48, ya en producción

`HandlePromoCode` está construido y en uso, pero al revisarlo el 12 ago salieron cuatro cosas que conviene resolver antes de darlo por cerrado:

- 🔴 **La operación `Aplica` no existe y falla en silencio.** El método solo ramifica en `ValidarCupon` y `Elimina`; cualquier otra operación cae al `return` final y responde `"OK"` **sin aplicar nada**. Comprobar en la DMZ y en Magento si alguien invoca con esa opción antes de decidir si se implementa o se documenta que no existe.
- 🔴 **Usa `sap-client=050`** en la consulta de sucursales, cuando 51 llamadas del proyecto usan `110` y una usa `100`. Si el bueno es `110`, el cupón regenerado se guarda sin centro y nadie se entera, porque la respuesta no se valida.
- ⚠️ **Un código vacío devuelve `"OK"`.** La primera línea corta y da por válido el cupón ausente.
- ⚠️ **El `catch` escribe con `Console.WriteLine`**, que bajo IIS se pierde. Tercera aparición del mismo patrón, tras E-01 y `SaveGuide`; sustituir por `Logger.SAP`.

> ⚠️ **Revisar las columnas del `INSERT` de regeneración.** El código escribe `Codigo, Agente, FechaEnvio, BP, Centro` y el levantamiento de negocio espera `Codigo, Agente, FechaEnvio, Cliente, Sucursal`. Además inserta el código del agente en la columna `Codigo`: puede ser intencional —que el código del promotor se reutilice— pero de eso depende que la validación siga encontrando una fila con `FechaUtilizacion` nula.

> ℹ️ **E-47 no aparece en el levantamiento de tablas** (`endpoints 1(_GLOBAL_MASTER_DB)`), pese a que lee el Business Partner de SAP. O quedó fuera del inventario o se clasificó como puramente Android. Sus decisiones siguen sin fuente externa.

### Sobre el Excel de tablas como fuente

`endpoints 1(_GLOBAL_MASTER_DB)` cubre **35 endpoints en 100 filas**, una por tabla usada, con el estado del lado SAP por color: verde es wrapper completo —solo falta mapping y controller—, morado es sin wrapper, azul es lo que se migra a SIGMAVI, Android o SQLite.

**Solo 6 endpoints están marcados en azul**, así que el documento describe sobre todo el trabajo de Dev 1 y Dev 2. Es la mejor fuente disponible para esta ola y para los mixtos, pero **no cubre el bloque A**: no aparecen `getGuide`, `GetCreditAmounts`, `guardardocumento`, `obtenerQuejas`, `bbvaKeyAdvanced`, `cashCustomerReport`, `getCuenta`, `GetPickUpCode` ni ninguna de las rutas de reapunte.

## Entregas pendientes de Dev 1

| Qué se necesita | Para qué | Estado |
|---|---|---|
| **`GetSAP(string url)`** en `APIMagentoDMZ\Helper\Curl.cs` | Paridad de verbo en **E-10** | ✅ **Entregado el 21 ago** (`4dabaa9`, `Curl.cs:210`). Aplicado en el cutover |

> Mientras no exista, las dos partidas funcionan con `PostSAP` y **el contrato hacia el cliente final no cambia**, porque las rutas públicas de la DMZ ya eran `[HttpPost]`. Lo único que se pospone es la paridad interna de E-10.
>
> Al entregarse hay que tocar **dos sitios**: cambiar la llamada en `APIMagentoDMZ\Controllers\CustomerServiceController.cs` y devolver la ruta de `bbvaKeyAdvanced` en ServicioSAP de `[HttpPost]` a `[HttpGet]`.

## Entregas pendientes a Dev 2

Se anotan aquí conforme se cierra cada partida nuestra, y se entregan en bloque.

| Origen | Qué falta conectar | Estado |
|---|---|---|
| E-48 | Datos de personal —departamento y puesto— contra **SuccessFactors**. Hoy el código los toma de la API de Android | Pendiente de que Dev 1 entregue la API |
| E-49 | Condiciones de crédito contra **TZ01** | Wrapper existente |
| E-50 | Artículo contra **DM01** | Wrapper existente |

## Ola -- — Monedero · ➡️ reasignada a Dev 2 el 12 ago

- ➡️ ~~`credit/GetUnificationWalletStatus`~~ — **no es nuestra.** Sin ID.
- ➡️ ~~`credit/SetUnificationWalletData`~~ — **no es nuestra.** Sin ID.

> **Motivo del traspaso:** los **ocho accesos a datos** de las dos partidas terminan en SAP y **ninguno en SIGMAVI, Android ni SQLite**. `Cte` y `CteEnviarA` van a BP05 y `ZAPI_BP05MA_SRV`, `CXC` a TZ01, `VentaD` a SD36 y SD08, y `CREDIHUnificacionMonedero` a una tabla Z de SAP todavía por crear. Al no quedar ningún destino fuera de SAP, no cumplen el criterio de Dev 3 y pasan íntegras a Dev 2, donde ya figuran en su sección de bloqueados.

> ℹ️ **El monedero en sí ya está migrado**: `customer/wallet/details` corre desde el 15 de julio contra `ZAPI_CONDITIONCONTRACT_SRV` (SD18). Lo que faltaba destino era `CREDIHUnificacionMonedero`, que no es el monedero sino la **bitácora de unificaciones**, y el levantamiento la manda a una tabla Z.

> ⚠️ **Dos hallazgos que se entregan con las partidas.** El primero: `CheckAccountsPreUnification` exige que **ambas** cuentas sean `"CREDITO MENUDEO"`, mientras que `InsertUnificationWallet` exige `"CONTADO"` para una y `"CREDITO MENUDEO"` para la otra — un cliente puede pasar la pre-validación y ser rechazado al insertar. El segundo: la condición de rechazo del insert solo se cumple si concurren las tres comprobaciones, de modo que una cuenta de crédito con saldo pendiente pasa igual.

> ⚠️ `GetUnificationWalletStatus` devuelve **cuatro** valores —`DESCONOCIDO`, `PENDIENTE`, `COMPLETADO` y `RECHAZADO`— y la documentación previa registraba solo tres. `PENDIENTE` es el estado de una unificación recién insertada, o sea el más frecuente.

---

# Bloque C — mixtos Intelisis · 🟠 todos dependen de definir la equivalencia de `IntelisisTmp`

Dev 3 resuelve la parte que va a Android, SQLite o SIGMAVI; **Dev 2 cierra la parte que va a SAP**.

> ⚠️ **Matiz del 12 ago, tras detallar los del linked server:** la etiqueta "esperan la decisión de arquitectura" es más gruesa de lo que parecía. En la **Ola 12** los cuatro endpoints **abren conexión contra `ServicioAndroid`, que se queda**, y lo que cruza vive dentro de los procedimientos almacenados. Ahí no hay base que mover: hay procedimientos que podar. Las olas **10 y 11** están sin detallar, así que conviene verificar si les pasa lo mismo antes de darlas por bloqueadas.

> 📌 **Orden del bloque, decidido el 12 ago:** los bifurcados van primero y los del linked server al final, porque estos últimos son los más complejos y los que más dependen de terceros. Un efecto secundario bueno: **M-03 desbloquea E-06**, y al adelantarse a la Ola 10 esa dependencia se resuelve antes.

### Ola 10 — bifurcados SQLite / Intelisis · y el procedimiento `SPCREDICredilana`

| ID | Endpoint | Objeto de Intelisis |
|---|---|---|
| M-01 | `credit/CreditoWeb_FormDatos` | `SP_CREDITO_WEB_VALORES_FORM` — 83 objetos |
| M-02 | `credit/CreditoWeb_Informacion` | `SPCREDICredilana` — 31 objetos |
| M-03 | `credit/SaveCredilanaInfo` | `FnVTASListaCredilanas` — 9 objetos. **Bloquea E-06** |
| M-04 | `credit/CreditoWeb_Solicitud` | `SPCREDICredilana` |
| M-05 | `credit/CreditoWeb_SolicitudPrimerGuardado` | `SPCREDICredilana` |

> ➡️ **M-04 y M-05 llegan desde la Ola 11 el 12 ago.** Las tres partidas que ejecutan `SPCREDICredilana` —M-02, M-04 y M-05— se resuelven juntas; separarlas garantizaba retrabajo.

> ⚠️ **Corrección del 12 ago sobre M-05.** El registro anterior la daba por hermana de `CreditoWeb_SaveFirstData` y por tanto en la Ola 12. Verificado en `CreditMethods.cs:1343`: ejecuta **`SPCREDICredilana`**, no `SpCREDISolicitudWebPrimerGuardado`. Los nombres suenan a pareja y no lo son.

> ⚠️ `SP_CREDITO_WEB_VALORES_FORM` **llama a `SPCREDICredilana`**, así que M-01, M-02, M-04 y M-05 quedan acoplados y todos ejecutan `spAfectar`. No son consultas de catálogo.

> 📊 **La medición decide el tamaño de la ola.** Hay que contar en producción cuántas veces se invoca cada `op` sin caché; si el fallback contra Intelisis no se usa, se reducen a servir caché y borrar esa rama.

---

### Ola 11 — otros mixtos

| ID | Endpoint | Destino / objeto |
|---|---|---|
| M-06 | `credit/getSms` | Mezcla `ServicioAndroid` e Intelisis |
| M-07 | `credit/CreditoWeb_Seguro` | `SpCREDICredilanaSeguroDeVida` |
| M-08 | `credit/SaveHaztenTransaction` | **SIGMAVI** + Android + `RM0855ACoordenadasProspecto` |
| M-09 | `order/ManagePaynetOrders` | Intelisis · depende de `spAfectar`, declarado muerto |
| M-10 | `order/insertPaymentData` | Intelisis · `CXCCMensajeWebHookOpenPay` |

> ✅ **M-08 es la única de todo el bloque C que abre conexión contra una base que se queda** —`sCadenaConexionSigMavi`—, así que es la candidata natural a arrancar. Tiene además **25 % hecho** en el stash del 29-jul.

> ✅ **M-06 reutiliza dos auxiliares ya migrados.** `GetIdRef` e `InsertCodigoVerificacion` van a `ServicioAndroid` y se portaron en E-01; falta `UpdateMagentoId`, `ExistingCustomer` y `GetValidatedPhoneNumber`, que leen `CteTel`. Su contrato devuelve **0 nip incorrecto, 1 sin número telefónico, 3 mensaje enviado**.

> ✅ **Decisión del 12 ago sobre M-07: solo se migra el procedimiento** `SpCREDICredilanaSeguroDeVida`. La integración con la API del Liberador queda fuera del alcance.

> ➡️ **Dos partidas pasaron a Dev 2 el 12 ago**, sin ID: `credit/GetPhoneValidatedClientSecretName` y `order/updateCreditOrderId`. Todos sus destinos terminan en SAP y ninguno en SIGMAVI, Android ni SQLite. 🗑️ `credit/codigoRecomendadoWithUen` quedó fuera del alcance.

---

### Ola 12 — cruzan por linked server `ERPMAVI`

> 📌 **Va al final del bloque por decisión del 12 ago:** es el grupo más complejo. Sus procedimientos hay que podarlos de referencias cruzadas y ninguno tiene definición todavía.

| ID | Endpoint | Procedimiento | Qué cruza a Intelisis |
|---|---|---|---|
| M-11 | `credit/validateSms` | `SPVTASCodigoSeguridadeCommerce` | `UPDATE` a `Cte`, lee `CteTel` |
| M-12 | `credit/CreditoWeb_SaveData` | `SP_CREDITO_WEB_DATOS` | `CREDICCondicionArt`, `TablaStD`, `CteTel` |
| M-13 | `credit/CreditoWeb_SaveData_Articulos` | Delega en M-12 + `CreditoWeb_InsertArticuloMX` | Lo que cruce M-12 |
| M-14 | `credit/CreditoWeb_SaveFirstData` | `SpCREDISolicitudWebPrimerGuardado` | Referencias a `IntelisisTMP` |
| M-15 | `customerService/bitacoraAtencionClientes` | `SP_ACTES_REGISTRO` | Lee `Personal`, inserta en `RM1138PendientesxValidar` |

> 🔴 **`SP_CREDITO_WEB_DATOS` tiene tres consumidores y uno vive del lado de Dev 2.** Son `CredyPrestamoMethods.cs:38` para M-12, `Credit\Methods.cs:69` para M-13, y `CreditMethods.ProductosCreditoWeb_SaveData:94`, al que llama **`OrderMethods.cs:620` dentro del flujo de creación de orden**. `order/setOrder` está migrado a SAP desde marzo, así que podar ese procedimiento toca algo que Dev 2 dio por cerrado: hay que avisarle antes.

> 🔴 **Abren conexión contra `ServicioAndroid`, no contra Intelisis.** Lo que cruza está **dentro de los procedimientos**, que alcanzan `ERPMAVI` con nombres de cuatro partes. El código C# apenas cambia de destino y el trabajo real es de base de datos.

> ⛔ **Lo que impide estimar: los procedimientos son cajas negras.** Con `SPCREDICredilana` de la Ola 10 y `SpCREDICodigoRecomendador` de la Ola 7, son **seis definiciones** que conviene pedir en una sola solicitud al DBA.

> ✅ **M-11 está medio resuelto.** `CreditMethods.IsValidated` ya reemplaza en ServicioSAP la lectura de `CteTel` consultando el teléfono del Business Partner. Falta la ruta que lo exponga.

> ⚠️ **M-14 tiene 25 % hecho** en el stash del 29-jul, con la decisión sobre la convención de conexiones sin cerrar. **Deuda heredada en M-11:** el `catch` devuelve `e.Message` en el mismo campo donde el cliente espera el `5` o el `6`.

---

## Ya resuelto sin trabajo pendiente

- [x] **E-20** `login/authenticate` — ServicioSAP ya expone `login/auth` con su propio JWT (`Controllers\LoginController.cs`), y el constructor de `Curl` en la DMZ ya autentica contra él. **No hay nada que migrar.**

---

## Coordinación con Dev 2

Cinco partidas tienen a los dos equipos dentro. Conviene acordar el orden antes de arrancarlas, no durante.

| Partida de Dev 3              | Qué entrega Dev 3                          | Qué espera Dev 2                                                             |
| ----------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| **E-48** `codigoPromocion`    | `VentaCupon` en SIGMAVI                    | SuccessFactors + BP05                                                        |
| **E-49** `getPlazos`          | `CondicionesCredVtaLinea` en SIGMAVI       | TZ01                                                                         |
| **E-15** `GetPickUpCode`      | Nada: `BpRecogePedidos` ya existe en SIGMAVI | Mover los escritores — `createStorepickupCode`, `generateNewStorepickupCode` y el nuevo `crearPrimerCodigoRecogerSucbanktransfer` |
| **M-01…M-14**                 | La rama que va a Android, SQLite o SIGMAVI | La rama que va a SAP                                                         |

> ⚠️ **Dev 2 no debe crear estas tablas por su cuenta ni programar contra Intelisis mientras tanto.** Es la vía más rápida a un verde que no significa nada.

---

## Riesgos abiertos

| | Qué | Impacto |
|---|---|---|
| 🔴 | **`Curl..ctor()` de la DMZ autentica contra la LAN incondicionalmente**, fuera de un `try`, en los ~90 puntos donde se construye | Toda la Ola 8 y cualquier cutover |
| 🔴 | **Canal de SMS caído** desde el 5-ago 23:04, también para el legado | Cierra E-01 |
| ✅ | ~~**Verbo de `obtenerQuejas` desalineado**~~ — **cerrado el 21 ago en el cutover.** La DMZ conserva su `[HttpPost]` público y pasa a llamar con `curl.PostSAP(...)`, alineándose con el `[HttpPost]` de la LAN | — |
| 🔴 | **`SaveGuide` puede llevar tiempo perdiendo guías.** Si `servicio_guias` no existe en la base SQLite de ServicioSAP, cada guía se pierde en silencio — y el script de la Ola 3 **no la crea** | Datos en producción |
| 🔴 | **E-08 responde `true` antes de guardar**, con una ventana de 10 s en un `Task` suelto | Pérdida silenciosa de expedientes |
| 🟡 | **H-02**: la cuenta de impersonación no aparece en el dominio, misma que el legado | Verificación de E-13 y E-14 |
| 🟡 | **El whitelist de certificados de la DMZ es código muerto** — compara hosts pelados contra URLs completas | Certificados autofirmados |
| 🟡 | Una conexión a `mavicbosandroid` puede resolver a una **copia obsoleta** sin avisar. Comprobar `GETDATE()` y `MAX(Id)` | Falsos resultados |
| ✅ | ~~**Sin migración de datos de las listas**~~ — **cerrado el 12 ago.** `ListaNegra` y `ListaBlanca` se quedan vacías en DEVMAVI a propósito: es un ambiente de desarrollo. La carga desde Intelisis hacia SIGMAVI **en producción la ejecutan los DBA**, es externo a desarrollo | — |

### Decisiones que bloquean trabajo

| Tema | Bloquea | Quién decide |
|---|---|---|

| Equivalencia de `IntelisisTmp` | Las tres olas de mixtos | Arquitectura |
| Estructura de `DM0415` — garantías | E-50 | **Valentin y Humberto** (corregido el 12 ago; el checklist tenía a Miguel Marín) |
| ~~Definición de monedero~~ | ➡️ Reasignado a Dev 2 el 12 ago | — |
| Baja de los tres proxies colgantes | E-43, E-44, E-45 | Producto + Magento |
| Número de cliente SAP: hay 51 llamadas en `110`, una en `050` y una en `100` | Cualquier consulta a S/4 | **Dev de SAP** — escalado el 12 ago |
| Definición de los procedimientos almacenados — 6 en total | Estimar las olas 7, 10 y 12 | **DBA / Intelisis** — pedirlos juntos |
| ¿Quién poda los SP de sus referencias a Intelisis? | Toda la Ola 12 | Arquitectura — es trabajo de base, no de desarrollo |

---

## Objetos de base por crear

Inventario del 12 ago, hecho para poder estimar. **Trece objetos, ninguno con su definición todavía** — es la dependencia que más pesa en el calendario.

| Dónde | Cuántos | Cuáles | Para qué ola |
|---|---:|---|---|
| **SQLite** | 8 | `attribute_options`, `attributes`, `attribute_sets`, `atributos_de_magento`, `categories`, `children`, `no_imagen_product`, `product_in_stores` | Ola 8 |
| **SIGMAVI** | 5 | `TrWDM0285_CteRecoge`, `CodigosRecomendados` + su SP, `VentaCupon`, `CondicionesCredVtaLinea`, `DM0415` | Olas 7 y 9 |

Las definiciones salen de dos sitios distintos: **las de SQLite del `data.db` del legado** y **las de SIGMAVI de Intelisis**. Conviene pedirlas en dos solicitudes separadas.

### Olas que no necesitan crear nada

| Ola | Tablas que usa | Base |
|---|---|---|
| 3 · SQLite | `servicio_guias`, `mavi_credilana_info` | SQLite — script ya escrito |
| 4 · AdminDoc | `MAVI_DOC_CTE` | AdminDoc — ya existe |
| 5 · ServicioAndroid y SOAP | `actes_catalogo_queja` | ServicioAndroid — ya existe. E-10 no usa ninguna |
| 6 · SMB y DMZ | ninguna | Solo HTTP, filesystem y SMB |

Sus estimaciones se sostienen. Las que dependen de conseguir definiciones son la **7**, la **8** y la **9**.

---

## Progreso

**10 / 71** partidas terminadas: los cuatro habilitadores, E-01 a E-04 y E-07 a E-08. `[x]` significa **desarrollo terminado**, no en producción.

| Bloque | Partidas | Estado |
|---|---:|---|
| Cerradas — habilitadores, E-01…E-04, E-07, E-08 y E-20 | 11 | ✅ desarrollo terminado |
| **Bloque A** — sin conexión a SAP | 43 | 🎯 frente activo |
| **Bloque B** — mixtos SAP | 4 | tras cerrar el bloque A |

| **Bloque C** — mixtos Intelisis | 15 | 🟠 espera arquitectura |
| **Total** | **71** | |

El contador solo cuenta partidas cerradas, así que esconde el trabajo a medias: el avance ponderado real sobre el alcance original está en [[ESTADO_PRUEBAS_Y_AVANCE]], hoy en **37,0 %**.

**Estado del bloque A al 21 ago:** la Ola 4 cerró completa, la Ola 3 está al 80 % a falta de validar contra la base real del servidor, y la Ola 5 quedó probada: E-09 y E-10 al 90 %. Ningún cutover está desplegado todavía: los de las olas 1 a 4 están commiteados y subidos a `dbAndroid` de la DMZ, pero en producción el tráfico sigue yendo al legado.

> ⚙️ **Criterio nuevo del 20 ago: todos los endpoints migrados se escriben asíncronos**, aunque el legado sea síncrono. Se aplicó retroactivamente a las ocho partidas de las olas 0 a 4 (commit `e20033b`) y rige de aquí en adelante. Es la única desviación de la regla de paridad aprobada de antemano, porque cambia cómo espera el hilo, no qué responde el endpoint.

**Las 31 entradas de la Ola 8 no son 31 partidas de desarrollo.** Tras el análisis del 12 ago se reparten así: **12 llamadores a reconstruir** —8 de catálogo hacia SQLite, 3 reenvíos y 1 helper compartido—, 8 rutas sin cambio que atiende la herramienta de importación, 6 que solo se verifican y 4 que se dan de baja. Contarlas todas como partidas infla el alcance y distorsiona el porcentaje de avance.

**El 57 % del alcance de Dev 3 está en el bloque A**, que no depende de nadie. Es el argumento para agotarlo antes de tocar el bloque B.

