---
tags: [checklist, migracion, dev2, endpoints, sap, roadmap]
fuente: "CHECKLIST_DEV2_ENDPOINTS_SAP_2.md · MIGRATION_STATUS_MASTER_v2 FINAL.csv"
actualizado: 2026-08-24
rol: "Dev 2 — endpoints sobre SAP"
---

# Checklist Dev 2 — Endpoints sobre SAP (Roadmap detallado)

Lista de control del desarrollador que **implementa los endpoints cuyo destino es SAP**, consumiendo las APIs ya construidas por Dev 1. Cierra además la parte SAP de los endpoints mixtos que Dev 3 entrega resueltos por el lado no-SAP, y absorbe las dos partidas de monedero traspasadas desde Dev 3 el 12 de agosto.

> ℹ️ **Este documento es la vista de rol para Dev 2**, reindexada como guía de construcción (Sprints con fechas de calendario, IDs por partida, dependencias explícitas), a partir del checklist original `CHECKLIST_DEV2_ENDPOINTS_SAP_2.md`. Si hay discrepancia entre los dos, manda el original — este archivo es el mapa de ruta, no la fuente de la verdad del estado día a día.

**Leyenda:** `[x]` hecho · `[ ]` pendiente · 🔒 bloqueado · ⏳ falta definición · ⛔ espera wrapper de Dev 1

> Reparto de la migración: [[Checklists/CHECKLIST_DEV1_WRAPPERS_SAP|Dev 1 — wrappers]] · [[Checklists/CHECKLIST_DEV3_NOSAP_NOINTELISIS|Dev 3 — Android, SQLite y SIGMAVI]] · [[CHECKLIST_DEV4_PAGOS|Dev 4 — flujos de pago]].

## Qué entra en Dev 2 y qué no

La regla es la **API que resuelve el endpoint**, no el controlador ni el nombre:

| Destino | ¿Es de Dev 2? |
|---|---|
| SAP core — Business Partner, ventas, crédito, cobros | ✅ Sí |
| Wrappers de BP Maestro (`BP05_MA`) y externos (SEPOMEX, SuccessFactors) ya entregados | ✅ Sí, en cuanto Dev 1 los entregue |
| Endpoints mixtos: lectura/escritura SAP + tabla en SIGMAVI | ✅ Sí la parte SAP — **Dev 3 entrega la parte SIGMAVI** |
| Jobs del servidor LAN contra Intelisis (maestro de producto y existencias) | ✅ Sí, Sprint 9, al final |
| Tablas de SIGMAVI (`TrWDM0285_CteRecoge`, `CondicionesCredVtaLinea`, etc.) | ❌ Dev 3 — no crear por cuenta propia |
| Wrappers de SAP sin construir | ❌ Dev 1 — Dev 2 solo consume |
| Referencias bancarias, STP, pasarelas | ❌ Dev 4 |

**No se programa contra `IntelisisTmp` ni se crean tablas de SIGMAVI desde este frente.** Da un verde que no significa nada, igual que en Dev 3.

## Cómo está ordenado y por qué

El calendario de Sprints viene fijado por planeación (tickets 12564–12572). **El Sprint 1 no tiene endpoints propios**: es una fase pura de mapeo e investigación (heredada de la Ola 0 original) para encontrar la equivalencia entre el sistema LAN legado y las APIs de SAP en los 11 endpoints que no traían esa clasificación en el archivo maestro. El resultado de ese mapeo es lo que permite ubicar cada uno de esos 11 endpoints dentro de su Sprint temático correspondiente — **todos los endpoints de construcción arrancan a partir del Sprint 2**.

De ahí en adelante los Sprints agrupan **por dominio de negocio**: Business Partner, Ventas/Monedero, cruces operativos y de alta complejidad, y al final los que dependen de wrappers externos (`BP05_MA`, SEPOMEX, SuccessFactors) y los jobs de importación de producto. Dentro de cada Sprint sigue aplicando el criterio de riesgo original: un endpoint que consume una sola API ya construida se puede terminar y probar en el día; uno que cruza varias tiene varias formas de quedarse a medias.

## El orden de ataque

| Sprint | Fechas | Tema | Partidas | De qué depende |
|---|---|---|---:|---|
| **Sprint 1** | 12/08/2026 – 19/08/2026 | Mapeo e investigación — equivalencias LAN ↔ SAP | 0 (fase de descubrimiento, sin endpoints propios) | De abrir cada ficha y confirmar contra cuántas APIs de SAP resuelve |
| **Sprint 2** | 20/08/2026 – 08/09/2026 | Endpoints de Business Partner | 9 | De nadie. BP05 ya construido |
| **Sprint 3** | 09/09/2026 – 28/09/2026 | Endpoints con Cruces Operativos de Dos APIs | 5 | De coordinación con Dev 3 en 2 de los 5 |
| **Sprint 4** | 29/09/2026 – 13/10/2026 | Endpoints de Ventas (SD) y Monedero Electrónico | 15 | Incluye 3 bloqueados y las 5 partidas de monedero traspasadas de Dev 3 |
| **Sprint 5** | 14/10/2026 – 29/10/2026 | Endpoints de Alta Complejidad (Múltiples APIs) | 2 | De levantar cinco tablas pendientes en 1 de los 2 |
| **Sprint 6** | 30/10/2026 – 13/11/2026 | Integración de endpoints de Business Partner Maestro BP05_MA | 3 | ⛔ De que Dev 1 entregue `BP05_MA` |
| **Sprint 7** | 16/11/2026 – 25/11/2026 | Implementación Endpoints SEPOMEX y SuccessFactor | 4 | ⛔ De que Dev 1 entregue `ZAPI_ZDMT_SEPOMEX` y los wrappers de SuccessFactors |
| **Sprint 8** | 26/11/2026 – 03/12/2026 | Endpoints RFC y Prospecto | 2 | De una decisión de Producto/Arquitectura antes de construir |
| **Sprint 9** | 04/12/2026 – 18/12/2026 | Endpoints de Importación | 8 | De depurar los dos duplicados del maestro de producto |

> Este remapeo por Sprint cubre las **48 partidas** del archivo maestro (33 endpoints `S-`, 7 jobs `J-`, 3 bloqueados `B-` y 5 accesos de monedero `W-` traspasados de Dev 3), sin dejar ninguna fuera.

---

## Sprint 1 — Mapeo e investigación · equivalencias LAN ↔ SAP · 12/08/2026 – 19/08/2026 · sin endpoints propios

Este Sprint **no lleva checklist de endpoints**. Corresponde a la fase de descubrimiento heredada de la Ola 0 original: los 11 endpoints que no traían el número de APIs contado en el archivo maestro se abren, se les encuentra su equivalencia entre el sistema LAN legado y SAP, y se cuenta contra cuántas APIs resuelve cada uno. Con ese resultado, cada uno de los 11 quedó reclasificado dentro del Sprint temático que le corresponde (2 en adelante):

| Endpoint mapeado | Reclasificado en |
|---|---|
| `credit/MonederoSaldoCredito` | Sprint 4 — **S4-01** |
| `customerService/LoginClienteCredito` | Sprint 2 — **S2-01** |
| `customerService/LoginClienteCreditoFechaN` | Sprint 2 — **S2-02** |
| `customerService/GetEmpleadoByNomina` | Sprint 7 — **S7-01** |
| `order/cancelOrder` | Sprint 4 — **S4-02** |
| `order/validateCredit` | Sprint 4 — **S4-03** |
| `prospecto/rfc` | Sprint 8 — **S8-01** |
| `customer/wallet/getCuentaC/{ordenCompra}` | Sprint 4 — **S4-04** |
| `company/wholesale-customer/{wholesaleAccount}` | Sprint 2 — **S2-03** |
| `order/generateNewStorepickupCode/{idEcommerce}` | Sprint 3 — **S3-01** |
| `order/checkOpenpay` | Sprint 9 — **S9-08** |

> 💡 El más rápido de reclasificar fue `order/validateCredit` (hoy **S4-03**): mismo flujo que `setOrder`, ya migrado — basta apuntarlo a su propia ruta.

---

## Sprint 2 — Endpoints de Business Partner · 20/08/2026 – 08/09/2026 · 9 endpoints

Endpoints que resuelven contra BP05, wrapper ya construido por Dev 1, más las dos partidas mixtas (SIGMAVI/Dev 3) que se unifican aquí.

- [x] ✅ **S2-01** `customerService/LoginClienteCredito` — BP05
  - *Completado el 01/09/2026. Se implementó utilizando el wrapper `BP05` (`GetClientMaAsync`), extrayendo el correo y unificando el nombre completo del cliente.*
- [x] ✅ **S2-02** `customerService/LoginClienteCreditoFechaN` — BP05
  - *Completado el 01/09/2026. Se implementó la lógica de validación de `BirthDate` con soporte para timestamp de OData (`/Date(xxxxx)/`) sin sufrir desviaciones por TimeZone local, y string `YYYY-MM-DD`.*
- [x] ✅ **S2-03** `company/wholesale-customer/{wholesaleAccount}` — BP05
  - *Completado el 26/08/2026. Orquestación local 100% probada. Se ajustó el Regex de DMZ para admitir cuentas numéricas SAP (ej. 1500008152) e IDs legados, y se transformó la petición a POST hacia el nuevo backend (ServicioSAP) que consume el wrapper BP05 de forma asíncrona.*
- [x] ✅ **S2-04** `credit/getPlazos` — SIGMAVI `CondicionesCredVtaLinea` + SAP SD40. **Mixto: Dev 3 entrega SIGMAVI**
  - *Estado: Implementado mediante arquitectura mixta. Se recuperan nombres de condiciones en SIGMAVI y se extrae el campo `Zdiasgracia` de SD40. Endpoint depurado y limpio (listo para Staging).*
  - **⚠️ NOTA PENDIENTE (Confirmación SAP):** Se detectó que SD40 (`Zdiasgracia`) omite el primer mes en su conteo en relación con Intelisis (122 vs 153 para Diferido, 0 vs 31 para Inmediato). A la espera de que el PM y SAP confirmen si esto es un error de configuración o la nueva regla oficial. Módulo cerrado por ahora.
- [x] ✅ **S2-05:** `customerService/unirCuenta` — BP05 -> `ZID_MAGENTO` (API Actualización de cliente), BP02
- [x] ✅ **S2-06:** `customerService/validarCliente` — BP05 (Enmascaramiento de Nombres + Validación `ZidMagento`)
- [x] ✅ **S2-07** `prospecto/recuperarcuenta` — BP05 
      Para probar el estatus 1 se requiere conocer los datos personales y RFC de un Business Partner existente en SAP.
- [x] ✅ **S2-08** `recommender/getRecommender` — BP05; falta obtener `znipventa` y confirmar si la API lo expone **Endpoint Deprecado**
- [x] ✅ **S2-09** `customer/wallet/getMinimumCostToRedeem` — configuracionescatalgo(fasAPI), SD52
  - *Completado el 03/09/2026. Se implementó unificando las reglas desde FastAPI (Catálogos de AWS) para los montos mínimos y SAP OData (`ZAPI_ARTICULOS_SRV`) para consultar familia y estatus (ALTA o BLOQUEADO).*
  - **Servicios Consumidos:** 
    - AWS API Gateway (FastAPI) para `AI_GET_CatalogoConfiguracion` (catálogos `MINIMO PARA REDIMIR MONEDERO`, `FAMILIAS ESTATUS BLOQUEADO REDIMEN MONEDERO`, `VENTASCANALMAVI`).
    - SAP OData (`ZAPI_ARTICULOS_SRV`) para extracción de familias y estatus de artículos.

> ⚠️ **S2-04 es el único punto de este Sprint con dependencia externa** (Dev 3 / SIGMAVI). El resto se puede terminar y probar de principio a fin sin esperar a nadie.

---

## Sprint 3 — Endpoints con Cruces Operativos de Dos APIs · 09/09/2026 – 28/09/2026 · 5 endpoints

Mismo criterio de riesgo que en Dev 3: más APIs por endpoint significa más formas de quedar a medias. Se ataca después de agotar el Sprint 2.

- [ ] ⏳ **S3-01** `order/generateNewStorepickupCode/{idEcommerce}` — actualiza `TrWDM0285_CteRecoge`(BPRecogePedidos), tabla que Dev 3 crea en SIGMAVI. **Coordinar con Dev 3**
- [ ] **S3-02** `order/createStorepickupCode/{idEcommerce}/{idOrder}` — cruza `TrWDM0285_CteRecoge` (BPRecogePedidos) en SigMavi, `Venta` (SD36), `Cte` (BP05), `VentaEntrega` (PartnerAddress) y `EcommerceDetPedidos` (SD36). **Coordinar con Dev 3**, que crea la tabla en SIGMAVI
- [ ] **S3-03** `customerService/obtenerCreditos` — venta por SD36 y artículos ya resueltos. (La tabla `TarjetaSerieMovMAVI` ya no existirá y no se utilizará más).
- [ ] **S3-04** `order/estimated-delivery/{ecommerceId}` — SD36 y `ZSRV_SALESDOC_ADDRCHANGE`. Ojo: en SAP designaron la guía como el *tracking*, y el tracking real se desconoce
- [ ] **S3-05** `order/getOrderInfoAndSet/{incrementId}` — consulta Magento, valida estatus en SD36 y, si procede, genera pedido SD01

> **S3-01 y S3-02 comparten la misma tabla de SIGMAVI** (`TrWDM0285_CteRecoge`) — conviene resolverlos juntos con Dev 3.

---

## Sprint 4 — Endpoints de Ventas (SD) y Monedero Electrónico · 29/09/2026 – 13/10/2026 · 15 endpoints

### Endpoints de Ventas y Monedero

- [ ] ⏳ **S4-01** `credit/MonederoSaldoCredito` — SD18. La ficha advierte que la estimación lo trata como no construido mientras el resumen lo da por completo: **verificar cuál es cierto** antes de estimar.
- [ ] ⏳ **S4-02** `order/cancelOrder` — SD46. Al 70 %; faltan los escenarios de cancelación y no se tiene el documento de entrega
- [ ] ⏳ **S4-03** `order/validateCredit` — mismo flujo que `setOrder`; según la ficha basta apuntarlo al método de orden ya migrado, con su propia ruta
- [ ] ⏳ **S4-04** `customer/wallet/getCuentaC/{ordenCompra}` — SD36
- [ ] **S4-05** `credit/getCreditAccount/{pAccount}` — la tabla legada deja de existir; se valida en `ZSDT_CTE` con `ZtipoCliente = PROSPECTO`
- [ ] **S4-06** `order/getIntelisisStatuses` — SD36
- [ ] **S4-07** `order/creditStatus/{idSolicitud}` — SD36. El mapeo ya está documentado, incluida la traducción `01→Pendiente`, `02→Concluido`, `03→Anulado`

> 💡 **S4-03** (`validateCredit`) es el candidato más probable a resolverse en horas y no en días: si la ficha acierta, es reapuntar una ruta a un método ya migrado.
>
> 🟡 **S4-01 con estimación contradictoria** entre "no construido" y "completo" en el archivo maestro — es la prioridad de aclarar dentro de este Sprint.

### Bloqueados dentro de este Sprint

- [ ] 🔒 **S4-08** `customerService/ObtenerEstatusEmbarque` — consulta SD36, pero las tablas `Embarque` y `EmbarquesMov` **no existen**. Pendiente de desarrollo del equipo ABAP.
- [ ] 🔒 **S4-09** `credit/GetUnificationWalletStatus` — el requerimiento RM-SD-2026-006 menciona tablas y APIs que no existen. Planificado al final hasta nuevo aviso.
- [ ] 🔒 **S4-10** `credit/SetUnificationWalletData` — misma causa que S4-09.

### Traspaso desde Dev 3 · 12 ago — monedero

Las dos partidas del monedero **estaban en el plan de Dev 3 y pasaron íntegras aquí**, porque sus **ocho accesos a datos terminan en SAP** y ninguno en SIGMAVI, Android ni SQLite.

| ID | Tabla de origen | Destino | Wrapper |
|---|---|---|---|
| **S4-11** | `Cte` — `SerieMonedero` / `SerieMonederoVIU` | BP05 · `zapi_bp05ma` | 🟩 listo |
| **S4-12** | `CteEnviarA` | `ZAPI_BP05MA_SRV/…/to_CteDatosComerciales` | 🟪 por construir |
| **S4-13** | `CXC` — saldo y estatus | TZ01 Mercadería | 🟩 listo |
| **S4-14** | `VentaD` | SD36 · SD08 si es movimiento final | 🟩 listo |
| **S4-15** | `CREDIHUnificacionMonedero` | Tabla Z de SAP | 🔒 no existe |

**Lo único bloqueado es dónde vive `CREDIHUnificacionMonedero` (S4-15).** El resto tiene destino y cuatro de cinco ya tienen wrapper, así que la partida puede avanzar bastante antes de tropezar.

Conviene separar la pregunta: el monedero **ya está migrado** —`customer/wallet/details` corre contra SD18 desde el 15 de julio—; lo que falta ubicar es la **bitácora de unificaciones**, que es otra cosa.

Tres hallazgos que Dev 3 dejó verificados sobre el legado y conviene no redescubrir:

- 🔴 **Dos validaciones contradictorias sobre los mismos parámetros.** `CheckAccountsPreUnification` (**S6-03**) exige que **ambas** cuentas sean `"CREDITO MENUDEO"`; `InsertUnificationWallet` exige `"CONTADO"` para la de contado y `"CREDITO MENUDEO"` para la de crédito. Un cliente puede pasar la pre-validación y ser rechazado al insertar. Hay que decidir cuál regla es la buena.
- 🔴 **La condición de rechazo del insert es más laxa de lo que aparenta**: solo rechaza si concurren las tres comprobaciones, de modo que una cuenta de crédito con saldo pendiente pasa igual.
- ⚠️ **`GetUnificationWalletStatus` (**S4-09**) devuelve cuatro valores**, no tres: `DESCONOCIDO`, `PENDIENTE`, `COMPLETADO` y `RECHAZADO`. `PENDIENTE` es el estado de una unificación recién insertada —el más frecuente al consultar— y no estaba documentado.

> ⚠️ Sin validar tampoco: la UEN sale de `IdEcommerce[0]`, así que una cadena vacía lanza excepción y responde 500; y el insert no comprueba duplicados para el mismo `IdEcommerce`.

---

## Sprint 5 — Endpoints de Alta Complejidad (Múltiples APIs) · 14/10/2026 – 29/10/2026 · 2 endpoints

- [ ] **S5-01** `company/negotiable-quote/create` — SD36, SD01 y DM01
- [ ] **S5-02** `order/getOrderId/{idEcommerce}` — el más ramificado del bloque: llama a Magento y consulta `Venta`, `VentaD`, `Art` y **cinco tablas pendientes de creación**. Levantar primero qué tablas faltan y quién las crea

> 🔴 **S5-02 no se estima en firme hasta levantar las cinco tablas.** Es el mismo patrón de riesgo que Dev 3 marca para sus procedimientos almacenados sin definición: no se puede prometer fecha sobre un objeto de base que no existe.

---

## Sprint 6 — Integración de endpoints de Business Partner Maestro BP05_MA ⛔ · 30/10/2026 – 13/11/2026 · 3 endpoints

**No arrancar sin el wrapper.** Los tres dependen del mismo wrapper `BP05_MA`.

| ID | Endpoint | APIs | Días | Espera |
|---|---|---:|---:|---|
| **S6-01** | `customerService/nombreCliente` | 1 | 14 | `BP05_MA` |
| **S6-02** | `customerService/GetSalesChannelsSTP` | 1 | 14 | `BP05_MA` |
| **S6-03** | `credit/CheckAccountsPreUnification` | 1 | 14 | `BP05_MA` |

> 🔴 **S6-01, S6-02 y S6-03 comparten el mismo wrapper.** En cuanto Dev 1 entregue `BP05_MA` se abren 42 días de trabajo de golpe. Es la dependencia que más conviene vigilar de todo el checklist.

---

## Sprint 7 — Implementación Endpoints SEPOMEX y SuccessFactor ⛔ · 16/11/2026 – 25/11/2026 · 4 endpoints

| ID | Endpoint | APIs | Días | Espera |
|---|---|---:|---:|---|
| **S7-01** | `customerService/GetEmpleadoByNomina` | API de SuccessFactors, API de agente | sin estimar | SuccessFactors |
| **S7-02** | `customerService/validarCoberturaPorCP` | 1 | 14 | `ZAPI_ZDMT_SEPOMEX` |
| **S7-03** | `credit/codigoPromocion` | 2 | 20 | SuccessFactors |
| **S7-04** | `customerService/obtenerVentanaConfirmacion` | 3 | 26 | ⏳ wrapper sin identificar |

---

## Sprint 8 — Endpoints RFC y Prospecto · 26/11/2026 – 03/12/2026 · 2 endpoints

- [ ] ⏳ **S8-01** `prospecto/rfc` — falta definir si vive en SAP o en SIGMAVI
- [ ] **S8-02** `credit/ExistRFCAndPhoneCte` — SuccessFactors + SD05, 4 APIs, 38 días estimados, dos wrappers nuevos y cuatro mapeos

> ⚠️ **S8-02 (`ExistRFCAndPhoneCte`) merece una decisión previa, no código.** Dev 3 verificó que en el legado **ambos métodos de validación tienen un `return` incondicional en la primera línea**: el endpoint no consulta nada y siempre responde lo mismo. Antes de invertir 38 días, confirmar con Producto que la validación se quiere de verdad y no se está reconstruyendo algo que lleva años apagado.

---

## Sprint 9 — Endpoints de Importación · 04/12/2026 – 18/12/2026 · 8 entradas

Por decisión del 12 ago van al cierre del plan. Son jobs del servidor LAN, no endpoints de cara al cliente; los siete primeros tienen como origen el maestro de materiales y de existencias, y el último es el job de conciliación de pagos que también corre en el servidor LAN.

- [ ] **S9-01** `product/updateProduct` → `product/products`, `product/exportaart/{store}`
- [ ] **S9-02** `product/updateProductJsonOnly` → `product/products`, `product/exportaart/{store}`
- [ ] **S9-03** `product/updatePrice` → `product/products`
- [ ] **S9-04** `product/updateConfigurableProduct` → `product/jerarquia/articulos`
- [ ] **S9-05** `product/updateStockMavi` → `product/stock`
- [ ] **S9-06** `product/updateStock` → `product/stock`
- [ ] **S9-07** `product/existenciasAlmacenArt` → `product/stock/filter/{filter}`
- [ ] ⏳ **S9-08** `order/checkOpenpay` — job del servidor LAN. Toca SQLite e Intelisis

> ⚠️ En el archivo maestro `product/updatePrice` (**S9-03**) y `product/updateStock` (**S9-06**) aparecen **duplicados**, una vez como origen Magento y otra como Intelisis. **Depurar antes de estimar** — es la misma clase de deuda que Dev 3 encontró en su Ola 8 con las 31 entradas que no eran 31 partidas reales.

---

## Coordinación con Dev 3

Cuatro endpoints de esta lista tocan tablas que **Dev 3 crea en SIGMAVI**. Dev 2 no debe programarlos contra Intelisis ni crear la tabla por su cuenta: da un verde que no significa nada.

| ID | Endpoint de Dev 2 | Depende de |
|---|---|---|
| **S2-04** | `credit/getPlazos` | `CondicionesCredVtaLinea` en SIGMAVI |
| **S3-02** | `order/createStorepickupCode/...` | `TrWDM0285_CteRecoge` (BPRecogePedidos) en SigMavi |
| **S3-01** | `order/generateNewStorepickupCode/...` | `TrWDM0285_CteRecoge`(BPRecogePedidos) |

> Del lado de Dev 3, las partidas espejo son **E-16** (`getPlazos`), **E-19** (`GetPickUpCode`) y **E-20** (`setRecommenderList`, relacionada con **S2-08**). Conviene acordar el orden de entrega antes de arrancar cualquiera de las dos puntas, no durante.

---

## Riesgos abiertos

| | Qué | Impacto |
|---|---|---|
| 🔴 | **S6-01, S6-02, S6-03 comparten el mismo wrapper `BP05_MA`.** Si Dev 1 se atrasa, los tres se atrasan juntos | 42 días del Sprint 6 |
| 🔴 | **S8-02 puede ser trabajo desechable.** El legado tiene un `return` incondicional en ambos métodos de validación — confirmar con Producto antes de construir | 38 días del Sprint 8 |
| 🔴 | **S5-02 sin cinco tablas creadas.** No se puede estimar en firme hasta levantar el inventario | Fecha del Sprint 5 |
| 🟡 | **S9-03 y S9-06 duplicados en el maestro** (Magento vs. Intelisis como origen) | Estimación del Sprint 9 |
| 🟡 | **S4-01 con estimación contradictoria** entre "no construido" y "completo" en el archivo maestro | Prioridad dentro del Sprint 4 |
| 🟡 | **S4-15 sin tabla Z definida** en SAP | Cierre del monedero (Sprint 4) |
| 🟡 | **S4-12 sin wrapper construido** todavía | Cierre del monedero (Sprint 4) |

### Decisiones que bloquean trabajo

| Tema | Bloquea | Quién decide |
|---|---|---|
| Regla válida entre `CheckAccountsPreUnification` e `InsertUnificationWallet` | **S6-03**, S4-15 | Producto |
| Validez real de `ExistRFCAndPhoneCte` (¿se quiere la regla o se apaga?) | **S8-02** | Producto |
| Ubicación de `prospecto/rfc` (SAP o SIGMAVI) | **S8-01** | Arquitectura |
| Tabla Z para `CREDIHUnificacionMonedero` | **S4-15** | SAP / DBA |
| Entrega de `BP05_MA` | **S6-01, S6-02, S6-03** | Dev 1 |
| Entrega de `ZAPI_ZDMT_SEPOMEX` | **S7-02** | Dev 1 |
| Identificar el wrapper de `obtenerVentanaConfirmacion` | **S7-04** | Dev 1 / Arquitectura |
| Cinco tablas pendientes de creación | **S5-02** | A levantar — dueño por definir |

---

## Progreso

**0 / 48** partidas terminadas en total, repartidas en los 9 Sprints de calendario:

| Sprint | Tema | Fechas | Partidas | Estado |
|---|---|---|---:|---|
| Sprint 1 | Mapeo e investigación (sin endpoints propios) | 12/08 – 19/08/2026 | 0 | 🟨 fase de descubrimiento — alimenta Sprints 2+ |
| Sprint 2 | Endpoints de Business Partner | 20/08 – 08/09/2026 | 9 | 🎯 sin bloqueos, BP05 ya construido |
| Sprint 3 | Cruces Operativos de Dos APIs | 09/09 – 28/09/2026 | 5 | tras agotar Sprint 2 |
| Sprint 4 | Ventas (SD) y Monedero Electrónico | 29/09 – 13/10/2026 | 15 | incluye 3 bloqueados y 5 accesos de monedero |
| Sprint 5 | Alta Complejidad (Múltiples APIs) | 14/10 – 29/10/2026 | 2 | 1 de 2 sin tablas creadas |
| Sprint 6 | Business Partner Maestro BP05_MA | 30/10 – 13/11/2026 | 3 | ⛔ espera a Dev 1 |
| Sprint 7 | SEPOMEX y SuccessFactor | 16/11 – 25/11/2026 | 4 | ⛔ espera a Dev 1 |
| Sprint 8 | RFC y Prospecto | 26/11 – 03/12/2026 | 2 | ⏳ espera decisión de Producto/Arquitectura |
| Sprint 9 | Endpoints de Importación | 04/12 – 18/12/2026 | 8 (2 dudosos por duplicado) | al cierre del plan |

**346 días-desarrollo estimados** según el archivo maestro (cifra conocida solo para las partidas con días individuales documentados — sobre todo Sprints 6 y 7 —, más los agregados heredados de las agrupaciones originales por número de APIs). De ese total, **el trabajo de los Sprints 6 y 7 depende de que Dev 1 entregue los wrappers `BP05_MA`, `ZAPI_ZDMT_SEPOMEX` y los de SuccessFactors a tiempo**. Agotar primero los Sprints 2–5, que no dependen de nadie, mantiene el avance mientras Dev 1 y las decisiones de Producto se resuelven en paralelo.

Ya migrados con anterioridad y fuera de esta lista: `customer/setCustomer`, `order/setOrder`, `order/returnOrder`, `customer/wallet/details`, `customerService/GetAccountDebts` y `credit/getClienteFactura`.
