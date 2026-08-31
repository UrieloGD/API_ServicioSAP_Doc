---
tags: [checklist, migracion, dev2, endpoints, sap]
fuente: "MIGRATION_STATUS_MASTER_v2 FINAL.csv"
actualizado: 2026-08-12
rol: "Dev 2 — endpoints sobre SAP"
---

# Checklist Dev 2 — Endpoints sobre SAP

Lista de control del desarrollador que **implementa los endpoints cuyo destino es SAP**, consumiendo las APIs ya construidas. Cierra además la parte SAP de los endpoints mixtos que Dev 3 entrega resueltos por el lado no-SAP.

**Leyenda:** `[x]` hecho · `[ ]` pendiente · 🔒 bloqueado · ⏳ falta definición · ⛔ espera wrapper de Dev 1

> Reparto de la migración: [[Checklists/CHECKLIST_DEV1_WRAPPERS_SAP|Dev 1 — wrappers]] · [[CHECKLIST_DEV4_PAGOS|Dev 4 — flujos de pago]] · [[Checklists/CHECKLIST_DEV3_NOSAP_NOINTELISIS|Dev 3 — Android, SQLite y SIGMAVI]].

## Cómo está ordenado y por qué

El trabajo sube **por número de APIs de SAP que consume cada endpoint**: primero los de una sola, luego los de dos, después los de tres o más, y al final los que dependen de wrappers que Dev 1 todavía está construyendo.

La razón no es la dificultad, es el riesgo. Un endpoint que consume una API ya construida se puede terminar y probar hoy; uno que consume tres tiene tres formas de quedarse a medias. Empezar por los sencillos deja capacidad libre para cuando lleguen los caros, y da tiempo a que Dev 1 entregue lo que falta. Si en la fase 4 los wrappers no están, el problema es de calendario de Dev 1, no de Dev 2 — pero para entonces ya no hay margen, así que conviene vigilar ese frente desde el primer día.

**26 endpoints, 346 días-desarrollo estimados** según el archivo maestro.

---

## Fase 0 — Triaje · 11 endpoints sin estimar

Estos no traen número de APIs en el archivo maestro, así que **no se pueden ordenar todavía**. La primera tarea de Dev 2 no es programar: es abrir cada uno, contar contra cuántas APIs de SAP resuelve y colocarlo en la fase que le toque.

- [ ] ⏳ **`credit/MonederoSaldoCredito`** — SD18. La ficha advierte que la estimación lo trata como no construido mientras el resumen lo da por completo: verificar cuál es cierto.
- [ ] ⏳ **`customerService/LoginClienteCredito`** — BP05
- [ ] ⏳ **`customerService/LoginClienteCreditoFechaN`** — BP05
- [ ] ⏳ **`customerService/GetEmpleadoByNomina`** — API de SuccessFactors, api de agente
- [ ] ⏳ **`order/cancelOrder`** — SD46. Al 70 %; faltan los escenarios de cancelación y no se tiene el documento de entrega
- [ ] ⏳ **`order/validateCredit`** — mismo flujo que `setOrder`; según la ficha basta apuntarlo al método de orden ya migrado, con su propia ruta
- [ ] ⏳ **`prospecto/rfc`** — falta definir si vive en SAP o en SIGMAVI
- [ ] ⏳ **`customer/wallet/getCuentaC/{ordenCompra}`** — SD36
- [ ] ⏳ **`company/wholesale-customer/{wholesaleAccount}`** — BP05
- [ ] ⏳ **`order/generateNewStorepickupCode/{idEcommerce}`** — actualiza la tabla de recoger en sucursal, que en SIGMAVI ya existe como **`BpRecogePedidos`**. **Coordinar con Dev 3**
- [ ] ⏳ **`order/checkOpenpay`** — job del servidor LAN. Toca SQLite e Intelisis

> 💡 `order/validateCredit` es el candidato más probable a resolverse en horas y no en días: si la ficha acierta, es reapuntar una ruta a un método ya migrado. Vale la pena mirarlo primero.

---

## Fase 1 — Una sola API · 9 endpoints · 72 días

Todos con su wrapper ya construido. Es el frente que se puede atacar desde el día uno sin depender de nadie.

- [ ] **`credit/getPlazos`** — TZ01 + SIGMAVI `CondicionesCredVtaLinea`. **Mixto: Dev 3 entrega la parte de SIGMAVI**
- [ ] **`credit/getCreditAccount/{pAccount}`** — la tabla deja de existir; se valida en `ZSDT_CTE` con `ZtipoCliente = PROSPECTO`
- [ ] **`customerService/unirCuenta`** — BP05 → `ZID_MAGENTO`. Investigar la API de actualización de cliente, BP02
- [ ] **`customerService/validarCliente`** — BP05
- [ ] **`order/getIntelisisStatuses`** — SD36
- [ ] **`order/creditStatus/{idSolicitud}`** — SD36. El mapeo ya está documentado, incluida la traducción `01→Pendiente`, `02→Concluido`, `03→Anulado`
- [ ] **`prospecto/recuperarcuenta`** — BP05
- [ ] **`recommender/getRecommender`** — BP05; falta obtener `znipventa` y confirmar si la API lo expone
- [ ] **`customer/wallet/getMinimumCostToRedeem`** — SD18. Usa dos tablas para validar si se puede redimir: **decidir si se vuelven configurables o migran a SIGMAVI**, en cuyo caso pasa a ser mixto con Dev 3

---

## Fase 2 — Dos APIs · 4 endpoints · 56 días

- [ ] **`customerService/obtenerCreditos`** — venta por SD36 y artículos ya resueltos. Falta definir de dónde sale el importe de `TarjetaSerieMovMAVI`
- [ ] **`order/estimated-delivery/{ecommerceId}`** — SD36 y `ZSRV_SALESDOC_ADDRCHANGE`. Ojo: en SAP designaron la guía como el *tracking*, y el tracking real se desconoce
- [ ] **`order/createStorepickupCode/{idEcommerce}/{idOrder}`** — cruza `TrWDM0285_CteRecoge`, `Venta` (SD36), `Cte` (BP05), `VentaEntrega` y `EcommerceDetPedidos`. **Coordinar con Dev 3**, que crea la tabla en SIGMAVI
- [ ] **`order/getOrderInfoAndSet/{incrementId}`** — consulta Magento, valida estatus en SD36 y, si procede, genera pedido SD01

---

## Fase 3 — Tres o más APIs · 2 endpoints · 40 días

- [ ] **`company/negotiable-quote/create`** — SD36, SD01 y DM01
- [ ] **`order/getOrderId/{idEcommerce}`** — el más ramificado del bloque: llama a Magento y consulta `Venta`, `VentaD`, `Art` y **cinco tablas pendientes de creación**. Levantar primero qué tablas faltan y quién las crea

---

## Fase 4 — Esperan wrapper de Dev 1 · 7 endpoints · 140 días ⛔

**No arrancar sin el wrapper.** El orden dentro de la fase lo marca lo que Dev 1 vaya entregando, no la lista.

| Endpoint | APIs | Días | Espera |
|---|---:|---:|---|
| `customerService/nombreCliente` | 1 | 14 | BP05_MA |
| `customerService/GetSalesChannelsSTP` | 1 | 14 | BP05_MA |
| `credit/CheckAccountsPreUnification` | 1 | 14 | BP05_MA |
| `customerService/validarCoberturaPorCP` | 1 | 14 | ZAPI_ZDMT_SEPOMEX |
| `credit/codigoPromocion` | 2 | 20 | SuccessFactors |
| `customerService/obtenerVentanaConfirmacion` | 3 | 26 | ⏳ wrapper sin identificar |
| `credit/ExistRFCAndPhoneCte` | 4 | 38 | SuccessFactors + SD05 |

> 🔴 **Los tres primeros dependen del mismo wrapper.** En cuanto Dev 1 entregue `BP05_MA` se abren 42 días de trabajo de golpe. Es la dependencia que más conviene vigilar.

> ⚠️ **`credit/ExistRFCAndPhoneCte` merece una decisión previa.** Son 38 días estimados, dos wrappers nuevos y cuatro mapeos. Dev 3 verificó que en el legado **ambos métodos de validación tienen un `return` incondicional en la primera línea**: el endpoint no consulta nada y siempre responde lo mismo. Antes de invertir 38 días, confirmar con Producto que la validación se quiere de verdad y no se está reconstruyendo algo que lleva años apagado.

---

## Fase 5 — Jobs de producto contra Intelisis · 9 entradas · al final de todo

Por decisión del 12 ago van al cierre del plan. Son jobs del servidor LAN, no endpoints de cara al cliente, y su origen es el maestro de materiales y de existencias.

- [ ] `product/updateProduct` · `product/updateProductJsonOnly` → `product/products`, `product/exportaart/{store}`
- [ ] `product/updatePrice` → `product/products`
- [ ] `product/updateConfigurableProduct` → `product/jerarquia/articulos`
- [ ] `product/updateStockMavi` · `product/updateStock` → `product/stock`
- [ ] `product/existenciasAlmacenArt` → `product/stock/filter/{filter}`

> ⚠️ En el archivo maestro `product/updatePrice` y `product/updateStock` aparecen **duplicados**, una vez como origen Magento y otra como Intelisis. Depurar antes de estimar.

---

## Bloqueados · no entran en ninguna fase

- [ ] 🔒 **`customerService/ObtenerEstatusEmbarque`** — consulta SD36, pero las tablas `Embarque` y `EmbarquesMov` **no existen**. Pendiente de desarrollo del equipo ABAP.
- [ ] 🔒 **`credit/GetUnificationWalletStatus`** y 🔒 **`credit/SetUnificationWalletData`** — el requerimiento RM-SD-2026-006 menciona tablas y APIs que no existen. Planificados al final hasta nuevo aviso.

### ➡️ Traspaso desde Dev 3 · 12 ago — monedero

Las dos partidas del monedero **estaban en el plan de Dev 3 y pasan íntegras aquí**, porque sus **ocho accesos a datos terminan en SAP** y ninguno en SIGMAVI, Android ni SQLite.

| Tabla de origen | Destino | Wrapper |
|---|---|---|
| `Cte` — `SerieMonedero` / `SerieMonederoVIU` | BP05 · `zapi_bp05ma` | 🟩 listo |
| `CteEnviarA` | `ZAPI_BP05MA_SRV/…/to_CteDatosComerciales` | 🟪 por construir |
| `CXC` — saldo y estatus | TZ01 Mercadería | 🟩 listo |
| `VentaD` | SD36 · SD08 si es movimiento final | 🟩 listo |
| `CREDIHUnificacionMonedero` | Tabla Z de SAP | 🔒 no existe |

**Lo único bloqueado es dónde vive `CREDIHUnificacionMonedero`.** El resto tiene destino y cuatro de cinco ya tienen wrapper, así que la partida puede avanzar bastante antes de tropezar. Conviene además separar la pregunta: el monedero **ya está migrado** —`customer/wallet/details` corre contra SD18 desde el 15 de julio—; lo que falta ubicar es la **bitácora de unificaciones**, que es otra cosa.

Tres hallazgos que Dev 3 dejó verificados sobre el legado y conviene no redescubrir:

- 🔴 **Dos validaciones contradictorias sobre los mismos parámetros.** `CheckAccountsPreUnification` exige que **ambas** cuentas sean `"CREDITO MENUDEO"`; `InsertUnificationWallet` exige `"CONTADO"` para la de contado y `"CREDITO MENUDEO"` para la de crédito. Un cliente puede pasar la pre-validación y ser rechazado al insertar. Hay que decidir cuál regla es la buena.
- 🔴 **La condición de rechazo del insert es más laxa de lo que aparenta**: solo rechaza si concurren las tres comprobaciones, de modo que una cuenta de crédito con saldo pendiente pasa igual.
- ⚠️ **`GetUnificationWalletStatus` devuelve cuatro valores**, no tres: `DESCONOCIDO`, `PENDIENTE`, `COMPLETADO` y `RECHAZADO`. `PENDIENTE` es el estado de una unificación recién insertada —el más frecuente al consultar— y no estaba documentado.

> ⚠️ Sin validar tampoco: la UEN sale de `IdEcommerce[0]`, así que una cadena vacía lanza excepción y responde 500; y el insert no comprueba duplicados para el mismo `IdEcommerce`.

---

## Coordinación con Dev 3

Cuatro endpoints de esta lista tocan tablas que **Dev 3 crea en SIGMAVI**. Dev 2 no debe programarlos contra Intelisis ni crear la tabla por su cuenta: da un verde que no significa nada.

> 📌 **Corregido el 31 ago: la tabla de recoger en sucursal ya existe y se llama `BpRecogePedidos`.** El legado la conoce como `TrWDM0285_CteRecoge`; el equivalente en SIGMAVI está en `MaviSAP: Tables\BpRecogePedidos.sql` desde abril de 2025, con las mismas columnas. Dev 3 no la crea, ya la usa: E-15 `order/GetPickUpCode` quedó programado contra ese nombre el 31 ago.
>
> ⚠️ **Hay un tercer escritor que no estaba listado:** `crearPrimerCodigoRecogerSucbanktransfer`, del flujo de transferencia bancaria, añadido el 20 ago con el work item 8600 y llamado desde `OrderMethods.cs:695`. Escribe la misma tabla por el procedimiento `SpWDM0285_CteRecoge`, **que no está en `MaviSAP\StoreProcedure`** y habrá que sacar de Intelisis.
>
> 🔢 **Cuidado con `Telefono`:** en `BpRecogePedidos` es `BIGINT`, mientras el legado le pasa `VarChar` tras quitarle los no-dígitos con un `Regex`. Afecta a quien migre los escritores, no a la lectura.

| Endpoint de Dev 2 | Depende de |
|---|---|
| `credit/getPlazos` | `CondicionesCredVtaLinea` en SIGMAVI |
| `order/createStorepickupCode/...` | `BpRecogePedidos` en SIGMAVI — **ya existe**, no hay que crearla |
| `order/generateNewStorepickupCode/...` | `BpRecogePedidos` en SIGMAVI — **ya existe**, no hay que crearla |
| `customer/wallet/getMinimumCostToRedeem` | Dos tablas por definir, candidatas a SIGMAVI |

---

## Progreso

**0 / 26** endpoints activos terminados, más **2 reasignados desde Dev 3** el 12 ago, más 11 en triaje que pueden mover el conteo al recolocarse. **346 días-desarrollo estimados**, de los cuales **140 dependen de que Dev 1 entregue wrappers a tiempo** — el 40 % del esfuerzo.

Ya migrados con anterioridad y fuera de esta lista: `customer/setCustomer`, `order/setOrder`, `order/returnOrder`, `customer/wallet/details`, `customerService/GetAccountDebts` y `credit/getClienteFactura`.

