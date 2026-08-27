---
tags: [mapeo-lan, alcance, migracion, sigmavi, tablas]
proyecto: APIMagento → ServicioSAP
capa: LAN (Nexo)
actualizado: 2026-08-03
agente: Nexo
---

# Alcance de migración LAN → ServicioSAP

Definición endpoint por endpoint de lo que **nosotros** migramos desde `APIMagento` (LAN) hacia `ServicioSAP`, con el detalle de **qué tablas se usaban** y **a cuáles apuntaremos**.

**Criterio de inclusión:** endpoints cuyo destino de datos **no es SAP core**. Se llevan tal cual a ServicioSAP conservando su backend (ServicioAndroid, AdminDoc, SQLite, filesystem, servicios externos), o se reapuntan a **SIGMAVI (DEVMAVI)**.

---

## Leyenda

| Marca | Significado                                                            |
| ----- | ---------------------------------------------------------------------- |
| 🟰    | **La tabla no cambia.** Se conserva el mismo servidor y la misma tabla |
| 🔄    | **Se reapunta.** Cambia de Intelisis a SIGMAVI o a un servicio SAP     |
| ⏳     | **Bloqueado.** Falta una definición para poder codificar               |
| 🗑️   | **Se descarta.** La tabla desaparece del flujo                         |
| ⚠️    | Tiene una advertencia que hay que leer                                 |

---

## Resumen por controlador

| Controlador                 | Endpoints nuestros | Sin cambio de tabla | Reapuntados | Bloqueados |
| --------------------------- | -----------------: | ------------------: | ----------: | ---------: |
| `CreditController`          |                 10 |                   4 |           4 |          2 |
| `CustomersController`       |                  6 |                   3 |           3 |          0 |
| `CustomerServiceController` |                  3 |                   2 |           1 |          1 |
| `OrdersController`          |                  1 |                   1 |           0 |          0 |
| `StatusController`          |                  1 |                   — |           1 |          0 |
| **Total**                   |             **21** |              **10** |       **9** |      **3** |

> Los endpoints **mixtos** (los que además tocan Intelisis por linked server) están en un apartado propio al final. Son 12 y requieren decisión previa.

---

# CreditController

## 1. `POST /credit/SendSmsNewNumber` 🟰

**Método:** `CreditMethods.SendSmsNewNumber` — `CreditMethods.cs:1992` *(static)*
**Auxiliares:** `GetIdRef` (`:2036`) · `InsertCodigoVerificacion` (`:2068`)

| #   | Antes — `ServicioAndroid`          | Acción          | Después                                      |
| --- | ---------------------------------- | --------------- | -------------------------------------------- |
| 1   | `VTASDCodigoVerificacioneCommerce` | Select · Insert | 🟰 **Igual** — `ServicioAndroid` se mantiene |
| 2   | `TcAAEA00030_EnvioMensajes`        | Insert          | 🟰 **Igual**                                 |

**Conexión:** `sCadenaConexionAndriod` → `conexionSQL.obtenerConexionAndroid()`
**Estado:** ✅ Listo para migrar. **El método ya existe en ServicioSAP** (`Methods/Credit/CreditMethods.cs:12`) — solo falta el controller.

---

## 2. `POST /credit/GetCreditAmounts` 🟰 ⚠️

**Método:** `CredyPrestamoMethods.GetCredilanaInfo<T>` — `CredyPrestamoMethods.cs:833`

| #   | Antes — `SQLite data.db` | Acción | Después                           |
| --- | ------------------------ | ------ | --------------------------------- |
| 1   | `mavi_credilana_info`    | Select | 🟰 **Igual** — SQLite se mantiene |

**Campos leídos:** `montos_cte_nuevo` · `montos_cte_nuevo_apertura` · `montos_cte_casa`
**Conexión:** `Conn/DB.cs` → `SQLiteDb` *(API idéntica)*

> ⚠️ **El endpoint es trivial, pero su alimentador no.** La tabla la llena `LoadCredilanaInfo` (`CredyPrestamoMethods.cs:675`) leyendo `dbo.FnVTASListaCredilanas` de **Intelisis**. Si no se resuelve el alimentador, el caché queda congelado. Ver el apartado de mixtos.

---

## 3. `POST /credit/SaveImagesProductosMx` 🟰

**Método:** `CreditMethods.SaveImagesProductosMx` — `CreditMethods.cs:971`
**Auxiliares:** `SaveSelfieImageForCredit` (`:994`) · `SaveCompressedFile` (`:1017`) · `CompressBytesFromBase64Image` (`:1041`) · `GetEncoder` (`:1078`)

| #   | Antes                                               | Acción | Después                               |
| --- | --------------------------------------------------- | ------ | ------------------------------------- |
| 1   | `AdminDoc` → `MAVI_DOC_CTE`                         | Insert | 🟰 **Igual** — `AdminDoc` se mantiene |
| 2   | Filesystem → `C:\inetpub\wwwroot\api\images\credit` | Write  | 🟰 Igual — ruta a `Web.config`        |

**Valores fijos del INSERT:** `TIPO_DOC='14'` · `IDAPLICACION=7` · `FORMATO='IMG'` · `ESTATUS=1`
**Conexión:** `sCadenaConexionAdminDoc` → ⏳ **crear `obtenerConexionAdminDoc()`** en ServicioSAP

> ⚠️ Requiere referencia a `System.Drawing`. Verificar que esté en el `.csproj` de ServicioSAP.

---

## 4. `POST /credit/guardardocumento` 🟰

**Método:** `CreditMethods.GuardarDocumento` — `CreditMethods.cs:2605`

| # | Antes | Acción | Después |
|---|---|---|---|
| 1 | `AdminDoc` → `MAVI_DOC_CTE` | Insert · Update | 🟰 **Igual** |

**Columnas:** `TIPO_DOC`, `CLAVE`, `DIR`, `AVAL`, `FECHA`, `DOCUMENTO` *(varbinary)*, `ESTATUS`, `ID_EXTERNO`, `IDAPLICACION`, `FORMATO`, `ID_FOTO`, `UsuarioCarga`
**Lógica que se conserva:** el `switch (TipoDoc)` de 10 casos que asigna `IdFoto` y `Formato`, y las tres ramas `Cliente` / `Token` / `Actualizar`.

> ✅ Los 4 triggers de `MAVI_DOC_CTE` se verificaron: son locales, no tocan Intelisis. No hay que hacer nada con ellos.

---

## 5. `POST /credit/SolicitudMercancia` 🔄

**Método:** `CreditMethods.SolicitudMercancia` — `CreditMethods.cs:610`

| #   | Antes                                               | Acción | Después                                                           |
| --- | --------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| 1   | **Intelisis** → `ERPMAVI.IntelisisTMP.dbo.Cte`      | Select | 🔄 **`GET partner/client/{clientId}`** — ya existe en ServicioSAP |
| 2   | `ServicioAndroid` → `CRED_SOLICITUD_WEB_DATOS_TEMP` | Insert | 🟰 **Igual**                                                      |

**Campos que hoy se leen de `Cte`:** `Cliente`, `PersonalApellidoPaterno`, `PersonalApellidoMaterno`, `PersonalNombres`, `FechaNacimiento`, `RFC`, `Sexo`, `eMail1`, `Direccion`, `DireccionNumero`, `DireccionNumeroInt`, `EntreCalles`, `CodigoPostal`, `Delegacion`, `Estado`, `Colonia`, `Poblacion`

**Reglas de negocio embebidas en el SQL que hay que replicar:**

| Campo | Valor |
|---|---|
| `articulo` | `'ADTE00001'` fijo |
| `estatus` | `7` fijo |
| `origen` | `'APP MERCANCIAS'` |
| `IdMagento` | `'APP MERCANCIA'` |
| `ValidacionTelefono` · `Confirmado` | `1` |
| `condicion` | `'12 M MA P INM'` si uen=1 · `'12 M VIU P INM'` si uen=2 |
| `Sucursal` | `504` si uen=1 · `505` si uen=2 |
| Lada | 2 dígitos si empieza en `33`/`55`/`81`; 3 en cualquier otro caso |
| `Colonia` | Se trunca a 30 caracteres |

**Cómo queda:** obtener el BP desde SAP → mapear los 17 campos en memoria → ejecutar el `INSERT` contra `ServicioAndroid`.

---

## 6. `POST /credit/codigoPromocion` 🔄

**Método:** `CreditMethods.CodigoPromocion` — `CreditMethods.cs:392`

| #   | Antes — `IntelisisTmp`          | Acción          | Después                             |
| --- | ------------------------------- | --------------- | ----------------------------------- |
| 1   | `VTASCVentaCupon`               | Select · Update | 🔄 **SIGMAVI** → `VentaCupon`       |
| 2   | `Comercializadora.dbo.Personal` | Select          | 🔄 **API SuccessFactors** *(PONCE)* |

**SP:** `SpVTASVentaCupon`
**Operaciones del endpoint:** `Valida` · `Aplica` · `Elimina`

> ⚠️ ServicioSAP ya tiene `GET order/validatecupon/{codigo}` (`OrderMethods.HandlePromoCode`), pero **solo cubre la validación**. Faltan `Aplica` y `Elimina`.

---

## 7. `GET /credit/getPlazos` 🔄

**Método:** `CreditMethods.GetPlazos` — `CreditMethods.cs:2530`
**Auxiliares:** `GetDelayedDays` (`:2550`) · `GetQueryDelayedDays` (`:2582`)

| #   | Antes — `IntelisisTmp`         | Acción | Después                                    |
| --- | ------------------------------ | ------ | ------------------------------------------ |
| 1   | `VTASCCondicionesCredVtaLinea` | Select | 🔄 **SIGMAVI** → `CondicionesCredVtaLinea` |
| 2   | `Condicion`                    | Select | 🔄 **SAP** → SD40 / TZ01 Splits            |

**Campos:** `DiasVencimiento`, `Condicion`, `CondicionPropre`

---

## 8. `POST /credit/GetUnificationWalletStatus` ⏳

**Método:** `CreditMethods.SelectUnificationWalletStatus` — `CreditMethods.cs:1644`

| # | Antes — `IntelisisTmp` | Acción | Después |
|---|---|---|---|
| 1 | `CREDIHUnificacionMonedero` | Select | ⏳ **SIN DEFINIR** |

**Campos:** `Estatus`, `FechaUnificacion`, `IdEcommerce`
**Retorno:** `"COMPLETADO"` · `"RECHAZADO"` · `"DESCONOCIDO"`

> 🔒 **Bloqueado.** El ODS dice textualmente: *«definir con Valentin — no está migrado la unificación de monedero»*. El proceso completo, incluido el SP `SpVTASUnificacionMonedero`, no tiene destino asignado.

---

## 9. `POST /credit/SetUnificationWalletData` ⏳

**Método:** `CreditMethods.InsertUnificationWallet` — `CreditMethods.cs:1678`
**Auxiliares:** `AccountType` (`:1719`) · `ClienteTieneSerieMonedero` (`:1745`)

| # | Antes — `IntelisisTmp` | Acción | Después |
|---|---|---|---|
| 1 | `CREDIHUnificacionMonedero` | Insert | ⏳ **SIN DEFINIR** |

**Campos:** `IdEcommerce`, `ClienteCredito`, `ClienteContado`, `FechaRegistro`

> 🔒 Mismo bloqueo que el anterior. **Los dos se resuelven juntos.**
> Contexto del ODS: *«ocurre cuando un cliente migra su cuenta de contado a su cuenta de crédito, en este caso también se debe migrar el monedero a la cuenta de crédito y la tabla funciona como histórico»*.

---

## 10. `POST /credit/ExistRFCAndPhoneCte` 🗑️

**Método:** `CreditMethods.ExistRFCAndPhoneCte` — `CreditMethods.cs:1414`

| # | Antes | Acción | Después |
|---|---|---|---|
| — | **Ninguna** | — | 🗑️ Ninguna |

> El método tiene un `return` incondicional en `CURPValidation` (`:1426`) y en `RFCValidation` (`:1496`). **Hoy no consulta ninguna base** y siempre responde *"Puede continuar con la solicitud"*.
>
> **Decisión requerida:** migrarlo tal cual con la deuda documentada *(recomendado, no bloquea)*, eliminarlo coordinando con Magento, o reimplementar la validación —que sería desarrollo nuevo sobre `Cte`, `CteTel`, `CteEnviarA`, `Venta`, `MOVBITACORA` y `Personal`—.

---

# CustomersController

## 11–13. Listas blanca/negra 🔄 — **bloque único**

**Endpoints:** `POST /customer/setCustomerList` · `POST /customer/getCustomerList` · `POST /customer/deleteCustomerList`
**Método compartido:** `CustomerMethods.blackwhitelist` — `CustomerMethods.cs:120`
**SP compartido:** `SpVTASListaNBMagento` → en SIGMAVI se crea como `SpListaNBMagento`

| #   | Antes — `IntelisisTmp` | Acción                   | Después                             |
| --- | ---------------------- | ------------------------ | ----------------------------------- |
| 1   | `VTASCListaNegra`      | Select · Insert          | 🔄 **SIGMAVI** → `ListaNegra`  |
| 2   | `VTASCListaBlanca`     | Select · Insert · Delete | 🔄 **SIGMAVI** → `ListaBlanca` |

**Columnas:** `NumPedido`, `Nombre`, `Correo`, `Direccion`, `Cliente` → `IdMagento` en SIGMAVI, `FechaRegistro`, `Lista`

**Operaciones por endpoint:**

| Endpoint | Operación del SP | Tablas |
|---|---|---|
| `setCustomerList` | `Insertar` | Ambas — Select + Insert |
| `getCustomerList` | `Consultar` | Ambas — Select con filtro por `Correo` |
| `deleteCustomerList` | `Eliminar` | `VTASCListaBlanca` — Delete |

> ✅ **Resuelto y sin bloqueante.** El ODS confirma: *«se quedan en SIGMAVI ya que el control es de ecommerce»*. `partner/client` queda **descartado** como destino.
>
> La estructura ya la conocemos porque hoy la escribimos nosotros. **Se migran como un solo bloque**: comparten método, SP y ambas tablas.

---

## 14. `POST /customer/cashCustomerReport` 🟰

**Método:** `CustomerMethods.CreateCashReport` — `CustomerMethods.cs:194`

| # | Antes | Acción | Después |
|---|---|---|---|
| — | **Ninguna tabla** | — | 🟰 Ninguna |
| 1 | Filesystem → `C:\inetpub\wwwroot\files\` | Write | 🟰 Igual |
| 2 | SMB → `\\172.16.200.2\mavica\ecom\BaseWhatsapp\STAGE\` | Copy | 🟰 Igual |

**Requiere:** clase `Impersonation` (P/Invoke `LogonUser`) — ⏳ **crear en ServicioSAP**

> ⚠️ **Validar antes de codificar** que la cuenta del app pool de ServicioSAP alcance por red `172.16.200.2`.

---

## 15–16. `POST /customer/getCuenta` y `POST /customer/setCuenta` 🟰

**Métodos:** `Magento.getCuenta` — `Conn/Magento.cs:309` · `Magento.setCuenta` — `Conn/Magento.cs:319`

| # | Antes | Acción | Después |
|---|---|---|---|
| — | **Ninguna tabla** | — | 🟰 Ninguna |
| 1 | HTTP → DMZ `magento/getCuenta` · `magento/setCuenta` | Post | 🟰 Igual |

**Requiere:** helper HTTP hacia la DMZ — ⏳ **crear en ServicioSAP** *(el patrón ya existe en `OrderMethods.cs:998`)*

> ⚠️ Conservar el post-procesado de la respuesta: `.Replace("\\\"", "\"").Replace("\\\\\"", "\"").Trim('"')`

---

# CustomerServiceController

## 17. `POST /customerService/obtenerQuejas` 🟰

**Método:** `CustomerServiceMethods.obtenerQuejas` — `CustomerServiceMethods.cs:714`

| # | Antes — `ServicioAndroid` | Acción | Después |
|---|---|---|---|
| 1 | `ACTES_CATALOGO_QUEJA` | Select | 🟰 **Igual** |

**Filtros:** `queja != ''` · `Estatus = 1` · `ISNULL(AliasQueja,'') <> ''` · orden por `AliasQueja`
**Retorno:** lista de `{ id, intencion }`

> ⚠️ Unificar el verbo: la DMZ la llama con `GET` en la rama `dbAndroid` y con `POST` en `SAP-DMZ`.

---

## 18. `GET /customerService/bbvaKeyAdvanced` 🟰

**Método:** `CustomerServiceMethods.GetBBVAKeyAdvanced` — `CustomerServiceMethods.cs:1124` *(static)*

| # | Antes | Acción | Después |
|---|---|---|---|
| — | **Ninguna tabla** | — | 🟰 Ninguna |
| 1 | SOAP → `WSeCommerceMX.asmx` / `GetMasterSeguridad` | Call | 🟰 Igual |

**Config a copiar:** `MULTIPAGOS_APIKEY_URL` = `http://172.16.215.51:3024/WSeCommerceMX.asmx?wsdl` · `CODIGO_ENT`

> 📌 Es el **sustituto** de `bbvaKeyNeko`, que el ODS marca para eliminación: *«no debe de estar en uso... el correcto es otro que llama a un webservice de Alan»*.

---

## 19. `POST /customerService/obtenerTipoGarantia` 🔄 ⏳

**Método:** `CustomerServiceMethods.obtenerTipoGarantia` — `CustomerServiceMethods.cs:37`
**Auxiliar:** `guardarSoporte` (`:117`)

| #   | Antes — `IntelisisTmp`         | Acción | Después                            |
| --- | ------------------------------ | ------ | ---------------------------------- |
| 1   | `VTASCProveedorActivoGarantia` | Select | 🔄 **SIGMAVI** — tabla nueva ⏳     |
| 2   | `Art`                          | Select | 🔄 **SAP** — maestro de materiales |

**Campos que consume hoy:** `TipoGarantia`, `Marca`, `Telefono`, `Proveedor`, `Linea`

> 🔒 **Bloqueado.** El ODS resuelve: *«Crear tabla Sigmavi»* y *«se llena a través de PCP, Miguel Marín deberá otorgar la estructura»*.
>
> | Aspecto | Definición |
> |---|---|
> | Dónde vive | Tabla nueva en **SIGMAVI** |
> | Quién la alimenta | **PCP** — nosotros solo consultamos |
> | Estructura | ⏳ **Miguel Marín**, pendiente de entregar |
>
> Al recibir la estructura hay que verificar que conserve los 5 campos con esos nombres, o documentar el mapeo.

---

# OrdersController

## 20. `POST /order/getGuide` 🟰

**Método:** `OrderMethods.GetGuide` — `OrderMethods.cs:736`

| # | Antes — `SQLite data.db` | Acción | Después |
|---|---|---|---|
| 1 | `servicio_guias` | Select | 🟰 **Igual** |

**Columnas:** `id`, `idecommerce`, `fullname`

> ✅ La escritura (`SaveGuide`) **ya está migrada** en ServicioSAP (`Methods/Order/OrderMethods.cs:389`). Solo falta exponer la lectura.

---

# StatusController

## 21. `GET /status/getStatus` 🔄

**Método:** inline en el controlador — `StatusController.cs:12`

| #   | Antes                                                  | Acción | Después                                         |
| --- | ------------------------------------------------------ | ------ | ----------------------------------------------- |
| 1   | `Ping` ICMP a `172.16.202.2` *(servidor de Intelisis)* | —      | 🔄 **Rehacer** como health-check de ServicioSAP |

> ⚠️ **No portar tal cual.** Hoy monitorea el servidor de Intelisis; tras la migración quedaría apuntando al lugar equivocado. Debe verificar OData S/4, `MAVICBOSANDROID` y SQLite.
>
> El contrato actual devuelve `true` o el string `"No se tiene conexion con la base de datos"`. Coordinar con Magento si se cambia.

---

# Endpoints mixtos — requieren decisión previa

Estos **también son nuestros**, pero alcanzan Intelisis por linked server o por bifurcación de lógica. No se pueden migrar sin resolver primero esa parte.

## Grupo A — Los que cruzan por linked server `ERPMAVI` → `MAVICUBOS`

El `Data Origin` los marca como `ANDROID`, pero el SP cruza a Intelisis con nombres de cuatro partes.

| Endpoint | Método | SP | Objeto Intelisis oculto |
|---|---|---|---|
| `credit/validateSms` | `ProductosCredito_Clave` `:50` | `SPVTASCodigoSeguridadeCommerce` | `UPDATE` a `Cte`, lee `CteTel` |
| `credit/CreditoWeb_SaveData` | `CredyPrestamoMethods.CreditoWeb_SaveData` `:29` | `SP_CREDITO_WEB_DATOS` | `CREDICCondicionArt`, `TablaStD`, `CteTel` |
| `credit/CreditoWeb_SaveFirstData` | `CreditoWeb_SaveFirstData` `:507` | `SpCREDISolicitudWebPrimerGuardado` | Referencias a `IntelisisTMP` |
| `customerService/bitacoraAtencionClientes` | `bitacoraAtencionClientes` `:409` | `SP_ACTES_REGISTRO` | Lee `Personal`, `INSERT` a `RM1138PendientesxValidar` |

> 🔴 **Riesgo:** si se migran asumiendo que solo tocan ServicioAndroid, **se rompen al apagar Intelisis**. Hay que decidir qué pasa con la parte que cruza.

## Grupo B — Los que bifurcan entre SQLite e Intelisis

| Endpoint                        | Rama SQLite                    | Rama Intelisis                                       |
| ------------------------------- | ------------------------------ | ---------------------------------------------------- |
| `credit/CreditoWeb_FormDatos`   | 6 `op` → `mavi_credilana_info` | Resto → `SP_CREDITO_WEB_VALORES_FORM` *(83 objetos)* |
| `credit/CreditoWeb_Informacion` | 3 `op` → `mavi_credilana_info` | 6 `op` → `SPCREDICredilana` *(31 objetos)*           |
| `credit/SaveCredilanaInfo`      | Escribe `mavi_credilana_info`  | Lee `FnVTASListaCredilanas` *(9 objetos)*            |

> 📊 **Medición pendiente:** hay que contar en producción cuántas veces se invoca cada `op` sin caché. Si el volumen es cero, estos tres se reducen a eliminar la rama del fallback.
>
> ⚠️ `SP_CREDITO_WEB_VALORES_FORM` **llama a `SPCREDICredilana`** — los dos endpoints están acoplados y ambos ejecutan `spAfectar`. No son consultas de catálogo.

## Grupo C — Otros mixtos

| Endpoint | Método | Situación |
|---|---|---|
| `credit/getSms` | `ProductosCredito_Nip` `:21` | `VTASCodigoSMSEcommerce` mezcla Android e Intelisis |
| `credit/CreditoWeb_SaveData_Articulos` | `:467` | Delega en `Credit.Methods.CreditoWeb_SaveData` + `cte_prospecto` |
| `credit/CreditoWeb_Seguro` | `CredyPrestamoMethods.CreditoWeb_Seguro` `:228` | `SpCREDICredilanaSeguroDeVida` + API Liberador |
| `credit/GetPhoneValidatedClientSecretName` | `:1784` | `Cte`, `CteTel` en Intelisis |
| `credit/SaveHaztenTransaction` | `:2288` | SIGMAVI + Android + `RM0855ACoordenadasProspecto` en Intelisis |




# Habilitadores a construir en ServicioSAP

Sin esto no arranca ningún bloque.

| # | Pieza | Necesaria para | Estado |
|---|---|---|---|
| H1 | `conexionSQL.obtenerConexionAdminDoc()` | Endpoints 3, 4 | ⏳ Crear — clonar `obtenerConexionAndroid()` |
| H2 | Clase `Impersonation` (P/Invoke) | Endpoint 14 | ⏳ Crear — copiar de `ProductImage/Methods.cs:410-446` |
| H3 | Helper HTTP hacia la DMZ | Endpoints 15, 16 | ⏳ Crear — patrón en `OrderMethods.cs:998` |
| H4 | Corregir `SQLiteDb.DefaultPath` | Endpoints 2, 20 | ⏳ Hoy apunta a `C:\AntigravityRoute` |
| — | `conexionSQL.obtenerConexionAndroid()` | Endpoints 1, 5, 17 | ✅ **Ya existe** — `ConexionSQL.cs:40` |
| — | `SQLiteDb` | Endpoints 2, 20 | ✅ **Ya existe** — API idéntica a `Conn/DB.cs` |

> 🔴 **Trampa conocida:** `obtenerConexionAndroid()` devuelve la conexión **ya abierta**. El código de APIMagento hace `cnn.Open()` explícito. Al portar hay que quitar esos `Open()` o el segundo lanza `InvalidOperationException`.

---

# Orden de ejecución sugerido

| Orden | Bloque | Endpoints | Por qué |
|---|---|---|---|
| 1 | **SendSmsNewNumber** | 1 | El método ya está en ServicioSAP. Solo falta el controller — sirve de piloto |
| 2 | **Listas blanca/negra** | 11, 12, 13 | Resuelto, sin bloqueante, estructura conocida. Un solo bloque |
| 3 | **SQLite** | 2, 20 | Solo requiere H4 |
| 4 | **AdminDoc** | 3, 4 | Requiere H1 |
| 5 | **ServicioAndroid y SOAP externo** | 17, 18, 21 | Port directo |
| 6 | **Filesystem y DMZ** | 14, 15, 16 | Requiere H2, H3 y validación de red |
| 7 | **SolicitudMercancia** | 5 | Requiere el adaptador a `partner/client` |
| 8 | **SIGMAVI** | 6, 7, 19 | 19 espera la estructura de Miguel Marín |
| 9 | **Monedero** | 8, 9 | ⏳ Bloqueado hasta definición de Valentin |
| 10 | **Mixtos** | Grupos A, B, C | Requieren decisión de arquitectura |

---

## Navegación

- Mapa raíz de la capa: [[LAN - Mapa]]
- Índice del equipo: [[_ANALISIS_PREVIO/_NUESTROS_ENDPOINTS/README]]
- Decisiones del ODS: [[_DECISIONES_ODS]]
- Listado no-SAP: [[_ENDPOINTS_NoSAP.csv]]
