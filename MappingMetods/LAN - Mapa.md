---
tags: [mapa, lan, apimagento, migracion-sap]
proyecto: APIMagento
capa: LAN (Nexo)
actualizado: 2026-08-03
agente: Nexo
---

# LAN — Mapa de la Migración

Mapa principal de la capa **LAN (APIMagento)** para el proyecto de migración a SAP. Este documento es la raíz del grafo: **todo `.md` y `.csv` del vault debe estar enlazado aquí**.

> **Bóveda designada para esta migración:** `\\CATECINF214058D\Users\magalindo\Documents\Migracion SAP\.agents\skills\lan-sap-migration\MappingMetods`
> Autorizada explícitamente por el usuario el 2026-08-03 como raíz documental del esfuerzo, en lugar de la bóveda general de `urvalencia`.

---

## 🎯 Punto de entrada — Nuestro alcance

Empieza aquí si vas a trabajar en la migración.

| Documento | Qué contiene |
|---|---|
| [[_NUESTROS_ENDPOINTS/_ESTADO_REAL_EN_SERVICIOSAP\|Estado real en ServicioSAP]] | **Verificacion directa contra el repo.** Que esta implementado y que no |
| [[_NUESTROS_ENDPOINTS/_ALCANCE_MIGRACION_LAN_a_SAP\|⭐ Alcance de migración LAN → ServicioSAP]] | **Documento maestro.** Endpoint por endpoint: método, tablas antes y tablas después |
| [[_NUESTROS_ENDPOINTS/_PLAN_MIGRACION_FECHAS\|Plan de migracion con fechas]] | **Control ejecutivo.** 37 partidas en 13 olas, del 4 ago al 3 nov |
| [[_NUESTROS_ENDPOINTS/_CONTROL_MIGRACION.csv\|Listado de control (CSV)]] | Seguimiento por partida: dias, fechas, estado y bloqueos |
| [[_NUESTROS_ENDPOINTS/README\|Nuestros endpoints — índice]] | Los endpoints que **no van a SAP**: 61 nuestros, 32 mixtos, 14 fuera |
| [[_NUESTROS_ENDPOINTS/_DECISIONES_ODS\|Decisiones del ODS — lectura por color]] | Las resoluciones tomadas: qué se va a SIGMAVI, qué se descarta, qué está bloqueado |
| [[_NUESTROS_ENDPOINTS/_ENDPOINTS_NoSAP.csv\|Listado no-SAP (CSV)]] | 107 endpoints con `Data Origin`, destino y estatus |

---

## 📊 Clasificación e inventario

Resultado del barrido **Modo A** sobre 6 controladores y 90 endpoints.

| Documento | Qué contiene |
|---|---|
| [[_EXCLUIDOS_Intelisis\|Clasificación por destino de datos]] | Los 90 endpoints con marca ✅ NO-INTELISIS · 🟡 MIXTO · 🔒 FUERA DE ALCANCE |
| [[_INVENTARIO_NoIntelisis.csv\|Inventario global (CSV)]] | Una fila por endpoint con evidencia `archivo:línea` |

### Resumen de la clasificación

| Categoría | Endpoints |
|---|---|
| ✅ NO-INTELISIS | 15 |
| 🟡 MIXTO | 26 |
| 🔒 FUERA DE ALCANCE | 49 |
| **Total barrido** | **90** |

---

## 📚 Análisis previo

Documentos exploratorios consolidados en el vault el 2026-08-03. Algunos tienen cifras superadas; cada uno indica su vigencia.

| Documento | Contenido |
|---|---|
| [[_ANALISIS_PREVIO/README\|Análisis previo — índice]] | Los 9 documentos con su estado de vigencia y las 6 correcciones acumuladas |
| [[_ANALISIS_PREVIO/BRIEFING-migracion-18-endpoints\|Briefing de migración]] | Documento autocontenido con diccionario de 45 métodos |
| [[_ANALISIS_PREVIO/MAPEO-endpoints-flujo-y-responses\|Mapeo de flujo y responses]] | Flujo interno y ejemplo de response por endpoint |
| [[_ANALISIS_PREVIO/APIMagento-conteo-rutas\|Conteo de rutas]] | Las 106 rutas de APIMagento y su destino |
| [[_ANALISIS_PREVIO/DMZ-Backlog-Migracion-SAP\|Backlog de la DMZ]] | Los 120 endpoints de la DMZ frente a ServicioSAP |
| [[_ANALISIS_PREVIO/Objetos-Intelisis-3-endpoints\|Objetos de Intelisis diferidos]] | SPs y tablas de los endpoints bifurcados |

---

## 📥 Fuentes de verdad

Documentos base entregados por el equipo. **No se modifican**, solo se leen.

| Archivo | Rol | Origen |
|---|---|---|
| [[endpoints 1(_GLOBAL_MASTER_DB).ods\|endpoints 1 (ODS)]] | Destino de cada tabla: SAP, SIGMAVI o descarte | Equipo de migración |
| [[MIGRATION_STATUS_MASTER_v2.csv\|MIGRATION_STATUS_MASTER_v2 (CSV)]] | `Data Origin` y estatus por endpoint | Equipo de migración |
| [[_GLOBAL_MASTER_DB.csv\|_GLOBAL_MASTER_DB (CSV)]] | Consolidado global de tablas | Mapeo previo |

> ⚠️ La versión actualizada de `endpoints 1.xlsx` (con las filas verdes) es la que rige sobre el `.ods`. Las decisiones extraídas están en [[_DECISIONES_ODS]].

---

## 🗂️ Mapeo por controlador

### CustomerServiceController

[[CustomerServiceController/README|Índice del controlador]] · [[CustomerServiceController/_GLOBAL_CustomerServiceController_DB.csv|CSV global]]

**Endpoints mapeados (16):** `ApplyPaymentAdvanced` · `ApplyPaymentNeko` · `bbvaKeyAdvanced` · `bbvaKeyNeko` · `GetSalesChannelsSTP` · `GetSTPAccount` · `nombreCliente` · `obtenerCreditos` · `ObtenerEstatusEmbarque` · `obtenerTipoGarantia` · `unirCuenta` · `UpdateStatusPaymentAdvanced` · `UpdateStatusPaymentNeko` · `validarCliente` · `validarCoberturaPorCP` · `ValidateSTPAccount`

**Formato antiguo (7):** `Post_NombreCliente_Mapping` · `Post_ObtenerCreditos_Mapping` · `Post_ObtenerEstatusEmbarque_Mapping` · `Post_ObtenerTipoGarantia_Mapping` · `Post_UnirCuenta_Mapping` · `Post_ValidarCliente_Mapping` · `Post_ValidarCoberturaPorCP_Mapping`

### CreditController

[[CreditController/_GLOBAL_CreditController_DB.csv|CSV global]]

**Endpoints mapeados (7):** `codigoPromocion` · `ExistRFCAndPhoneCte` · `getPlazos` · `GetUnificationWalletStatus` · `pAccount` ⚠️ · `SetUnificationWalletData` · `validateSms` ⚠️

### OrdersController

[[OrdersController/_GLOBAL_OrdersController_DB.csv|CSV global]]

**Endpoints mapeados (3):** `ecommerceId` ⚠️ · `getIntelisisStatuses` · `idSolicitud` ⚠️

### ProspectoController

[[ProspectoController/_GLOBAL_ProspectoController_DB.csv|CSV global]]

**Endpoints mapeados (2):** `recuperarcuenta` · `rfc`

### CustomersController

**Formato antiguo (3):** `Post_DeleteCustomerList_Mapping` · `Post_GetCustomerList_Mapping` · `Post_SetCustomerList_Mapping`

### RecomenderController

**Formato antiguo (3):** `Post_GetRecommender_Mapping` · `Post_SetCodes_Mapping` · `Post_SetRecommenderList_Mapping`

### WholesaleCustomerController

**Formato antiguo (1):** `Post_NegotiableQuoteCreate_Mapping`

---

## ⚠️ Deuda documental registrada

Hallazgos del barrido Modo A que siguen abiertos.

| # | Hallazgo | Detalle |
|---|---|---|
| 1 | **20 endpoints 🔒 tienen carpeta** | Se mapearon antes de aplicar el criterio de exclusión. No se retiraron |
| 2 | **3 carpetas mal nombradas** | `pAccount/` → `getCreditAccount` · `idSolicitud/` → `creditStatus` · `ecommerceId/` → `estimated-delivery`. Usan el nombre del parámetro de ruta |
| 3 | **14 carpetas sin `03_BusinessMethod.md`** | En `CustomerServiceController`. El README las enlaza pero el archivo no existe: nodos rotos |
| 4 | **`validateSms/03_BusinessMethod.md` incompleto** | Documenta solo `VTASDCodigoVerificacioneCommerce`. Omite el `UPDATE` a `Cte` vía linked server. Su clasificación real es 🟡 MIXTO |
| 5 | **Dos formatos conviviendo** | Carpetas por endpoint (nuevo) y archivos `Post_*_Mapping.md` sueltos (antiguo) |

---

## 🔑 Hallazgos técnicos clave

### Linked server `ERPMAVI` → `MAVICUBOS`

El servidor `MAVICBOSANDROID` tiene un linked server directo a Intelisis. **Cinco endpoints alcanzan `IntelisisTmp` sin que se note en su cadena de conexión**: abren contra `ServicioAndroid` pero el SP o el SQL cruzan con nombres de cuatro partes.

| Endpoint | Mecanismo | Objeto Intelisis |
|---|---|---|
| `credit/validateSms` | SP `SPVTASCodigoSeguridadeCommerce` | `UPDATE` a `Cte`, lee `CteTel` |
| `customerService/bitacoraAtencionClientes` | SP `SP_ACTES_REGISTRO` | Lee `Personal`, `INSERT` a `RM1138PendientesxValidar` |
| `credit/CreditoWeb_SaveData` | SP `SP_CREDITO_WEB_DATOS` | `CREDICCondicionArt`, `TablaStD`, `CteTel` |
| `credit/CreditoWeb_SaveFirstData` | SP `SpCREDISolicitudWebPrimerGuardado` | Referencias a `IntelisisTMP` |
| `credit/SolicitudMercancia` | **SQL inline** | `FROM ERPMAVI.IntelisisTMP.dbo.Cte` |

### Objetos inexistentes — código que falla en runtime

| Objeto | Servidor | Métodos afectados |
|---|---|---|
| `SpCREDIDatosSolicitudCreditoArt` | No existe en `MAVICBOSANDROID` | `ProductosCredito_UpdateInfo` · `getClienteMagento` · `checkSaldo` |
| `SPVTASEstadoDeCuentaClienteWeb` | No existe en `MAVICBOSANDROID` | `getClienteInfoSaldo` |
| `CREDIHBiometrico` · `CREDIDTransaccionMetaDato` | No existen en `SIGMAVI` | `SaveHaztenTransaction` · `SaveHaztenMetaData` |

Los `try/catch` se tragan las excepciones, por eso nadie lo había detectado.

---

## 📌 Pendientes de definición

| # | Tema | Responsable | Bloquea |
|---|---|---|---|
| 1 | Estructura de la tabla de garantías en SIGMAVI | **Miguel Marín** | `customerService/obtenerTipoGarantia` |
| 2 | `CREDIHUnificacionMonedero` — sin destino definido | **Valentin** | `GetUnificationWalletStatus` · `SetUnificationWalletData` |
| 3 | `TarjetaSerieMovMAVI` se descarta — confirmar con Magento que `PuntosRedimidos` puede desaparecer | Equipo Magento | Contrato de `obtenerCreditos` |
| 4 | `dbo.FnVTASDesEncripta` (STP) | **Luis Ángel Peña** | `ValidateSTPAccount` |
| 5 | `INVDPaqueteriaGuia` · `EMBCConfiguracionPaqueteria` | **Aziel, Leslie** | `estimated-delivery` |
| 6 | `RFCAnexoIV` | **Alfredo García** | `prospecto/rfc` |
| 7 | Los 3 endpoints de tablerate — `Data Origin = Unknown` y sin ruta en la LAN | Por asignar | `ActualizarCamposConfigurables` y los dos `InsertarDesdeTablerate*` |

---

## 🧭 Convenciones del vault

**Estructura por endpoint en alcance:**

```
[NombreControlador]/
  README.md                          ← índice del controlador
  _GLOBAL_[Controlador]_DB.csv       ← consolidado de destinos
  [nombreEndpoint]/
    01_DMZ_Controller.md
    02_LAN_Controller.md
    03_BusinessMethod.md
    03_BusinessMethod_DB.csv
    04+_Helper_*.md  ·  04+_Integracion_*.md
```

**Reglas heredadas del gobierno global:**

- Todo `.md` se escribe en **UTF-8**, con acentuación y ñ correctas.
- Ningún archivo queda huérfano: todo se enlaza desde este mapa.
- Los pasos que tocan Intelisis en flujos mixtos se marcan con 🔒 y no se profundizan.
- Nunca se hace `commit` ni `push` sin autorización explícita del usuario.
- Ante un destino, SP o contrato desconocido: **detenerse y preguntar**, nunca inventar.
