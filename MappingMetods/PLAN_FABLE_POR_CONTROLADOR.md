---
tags: [migracion, sap, plan, fable, controladores]
fecha: 2026-09-14
estado: vigente
---

# Plan de trabajo para Fable 5.1 — un controlador del DMZ a la vez

> [!abstract] Para qué existe este documento
> El trabajo completo son **120 rutas** del DMZ. Dárselas de una sola vez a Fable produce deriva: se pierde el criterio a la mitad y se empiezan a inventar equivalencias.
>
> Aquí está partido en **14 paquetes, uno por controlador**. Cada paquete es una sesión: alcance acotado, bloqueos identificados y criterio de cierre propio.
>
> Reglas y criterio: [[GUIA_MIGRACION_FABLE]] + `SKILL.md`. **Los dos son obligatorios** (§0.1 de la guía).

---

## Cómo leer las cifras

Derivadas del código el **2026-09-14**, contando atributos `[Route(...)]` por controlador.

| Columna | Qué significa | Confianza |
|---|---|---|
| **Rutas** | Atributos `[Route]` del controlador | exacta |
| **SAP** | El cuerpo de la ruta llama `PostSAP` / `GetSAP` / `PatchSAP` | exacta |
| **LAN** | El cuerpo llama `curl.Post` / `curl.Get` | exacta |
| **Delega** | El cuerpo no llama a ninguno: el destino vive en una clase de `Metodos\` o va directo a Magento | **hay que abrirlo para saberlo** |

> [!warning] No resuelvas "Delega" adivinando por el nombre del método
> Se intentó resolver la indirección emparejando nombres de método y **dio falsos positivos**: marcó las 5 rutas de `mercancias/*` como puenteadas a SAP cuando no tienen ninguna llamada. Abre el archivo.

| Controlador | Prefijo | Rutas | SAP | LAN | Delega |
|---|---|---:|---:|---:|---:|
| `CustomersController` | `customer` | 5 | **5** | 0 | 0 |
| `ProspectoController` | `prospecto` | 2 | 1 | 1 | 0 |
| `WholesaleCustomerController` | `company` | 2 | 1 | 1 | 0 |
| `WalletCustomerController` | `customer/wallet` | 3 | 1 | 2 | 0 |
| `StatusController` | `status` | 1 | 0 | 1 | 0 |
| `RecommenderController` | `recommender` | 3 | 0 | 3 | 0 |
| `OrdersController` | `order` | 20 | 3 | 9 | 8 |
| `CustomerServiceController` | `customerService` | 26 | 5 | 19 | 2 |
| `CreditController` | `credit` | 30 | 6 | 24 | 0 |
| `ProductsController` | `product` | 8 | 0 | 0 | 8 |
| `MagentoController` | `magento` | 13 | 0 | 0 | 13 |
| `MercanciaController` | `mercancias` | 5 | 0 | 0 | 5 |
| `LoginController` | `login` | 1 | 0 | 0 | 1 |
| `LoggingController` | — | 1 | 0 | 0 | 1 |
| **TOTAL** | | **120** | **22** | **60** | **38** |

---

## Lo que se aplica a TODOS los paquetes

No se repite en cada sección. Fable lo lee una vez y lo arrastra.

### Entrada obligatoria antes de tocar nada

1. `SKILL.md` — las 32 reglas de construcción
2. [[GUIA_MIGRACION_FABLE]] §0 a §2 — objetivo, clases de ruta, evidencia válida
3. El controlador de **LAN** homólogo, para ver qué hace de verdad

### Criterio de cierre de cada paquete

- [ ] Cada ruta del controlador tiene su igual en ServicioSAP con la lógica de LAN
- [ ] El contrato de salida es **el que devolvía LAN** (§3.2), con HTTP 200
- [ ] El puente del DMZ usa `PostSAP` / `GetSAP` / `PatchSAP`, nunca HTTP a mano
- [ ] Los `.cs` nuevos están en `ServicioSap.csproj` (regla 19)
- [ ] **MSBuild** compila sin errores (guía §9b — no basta el `csc` suelto)
- [ ] E2E documentada por ruta: request enviado y response exacto (regla 25)
- [ ] Lo que quedó bloqueado está anotado con **quién** lo desbloquea

### Las tres formas de equivocarse, en orden de frecuencia

1. **Mapear a una envoltura de OData y darlo por hecho.** Si el destino devuelve forma nativa de SAP (`d.results`, nombres de campo SAP), es **interno**: falta construir la capa que traduce. Guía §0.2.
2. **Agregar parámetros o variables.** Replicar es uno a uno. Si el legado omite algo, se omite. Guía §1.9.
3. **Cambiar un valor que funciona porque una ficha dice otra cosa.** Guía §1.7 y §2.3.

---

# Los 14 paquetes, en orden recomendado

El orden va de menor a mayor riesgo. Los tres primeros existen para **calibrar el método** antes de tocar nada grande.

---

## 1 · `CustomersController` — 5 rutas, las 5 ya en SAP

**Trabajo: verificar, no construir.** Arranque ideal.

Es el único controlador completamente puenteado. Fable no construye nada: comprueba paridad de las 5 y documenta la E2E.

Hallazgo conocido que hay que cerrar aquí: `customer/setCustomer` → `partner/client` **devuelve el `Client` completo donde LAN devolvía la cuenta**. Es uno de los 8 contratos rotos, y el más peligroso: si Magento guardaba la cuenta y ahora recibe un JSON, el vínculo cliente-cuenta se rompe en silencio.

**Producto de este paquete, y vale más que las 5 rutas:** la primera fila de la tabla de vocabulario de respuesta (§3.2 de la guía), sacada de un caso real.

---

## 2 · `ProspectoController` — 2 rutas, 1 pendiente

**Pendiente:** `prospecto/rfc` — replicar `spRegistroSugerir` con la operación RFC, incluido `QuitarAcentos`.

Contenido y sin dependencias externas. Buen segundo caso.

---

## 3 · `WholesaleCustomerController` — 2 rutas, 1 pendiente

Antes de nada: el CSV declara el destino como `company/wholesale-customer/{wholesaleAccount}` y **esa ruta no existe**. La real es `wholesale-customer/{wholesaleAccount}` en `WholesaleCustomerController.cs:14` de ServicioSAP.

**Pendiente:** `company/negotiable-quote/create` — `InsertTableVenta` + `InsertTableVentaD` + `getUnidadArt`.

---

## 4 · `WalletCustomerController` — 3 rutas, 2 pendientes

- `customer/wallet/getMinimumCostToRedeem` — **declarado conectado y no lo está**. Falta el cálculo por familia (C09).
- `customer/wallet/getCuentaC` — equivalente del SELECT sobre `Venta.ReferenciaOrdenCompra`.
- `customer/wallet/details` — conectado, con **tres defectos verificados**, entre ellos falta la discriminación por `uen` (C10).

El monedero es **Wallet**, no Intelisis. Confirmar destino antes de construir.

---

## 5 · `StatusController` — 1 ruta

`status/getStatus` hoy hace ping a la BD de **Intelisis** y no dice nada de S/4HANA. Hay que **definir qué significa "sano"** en el stack nuevo antes de escribirlo. Paquete chico, pero es una decisión, no una migración.

---

## 6 · `RecommenderController` — 3 rutas, las 3 en LAN

Sin análisis previo en estos documentos. **El paquete arranca con la investigación** (regla 22 del `SKILL.md`): documentar antes de migrar.

---

## 7 · `OrdersController` — 20 rutas · 3 SAP · 9 LAN · 8 por abrir

El flujo central, y el más documentado: [[COMPARATIVA_SETORDER_LAN_VS_SAP]] y [[FLUJO_CREDITO_LAN_VS_SAP]].

**Sub-paquetes sugeridos — no tomarlo entero:**

| | Rutas | Nota |
|---|---|---|
| **7a · Creación** | `setOrder` → `order/new` | Ya conectado. Pendiente: `PedidoExistente` viaja con HTTP 200 donde LAN daba 409 |
| **7b · Cancelación y devolución** | `cancelOrder`, `returnOrder` | `setreturn` **ya está en producción** y tiene defectos confirmados. Prioridad |
| **7c · Crédito** | `creditStatus`, `updateCreditOrderId`, `validateCredit` | **Bloqueado**: falta la URL del liberador (Valentín) |
| **7d · Openpay y pickup** | `checkOpenpay`, `createStorepickupCode`, `insertPaymentData` | `checkOpenpay` es la brecha más grande del flujo de contado |
| **7e · Consultas** | `getIntelisisStatuses`, `getPosCancellations`, `getOrderId`, `getOrderInfoAndSet`, `estimated-delivery` | `getPosCancellations` está mapeado a `cancelInvoice`, que es **la operación inversa** |

---

## 8 · `CustomerServiceController` — 26 rutas · 5 SAP · 19 LAN

El más grande después de crédito. **Partirlo en tres:**

- **8a · Victorias rápidas** — `LoginClienteCredito`, `LoginClienteCreditoFechaN`, `GetEmpleadoByNomina`: el destino ya existe y está completo. **Sólo cambiar `curl.Post` por `PostSAP`.** Los dos Login están marcados como conectados y no lo están.
- **8b · Abonos BBVA y STP** — `ApplyPaymentAdvanced`, `UpdateStatusPaymentAdvanced`, `GetSTPAccount`, `ValidateSTPAccount`, `GetSalesChannelsSTP`. Contexto en [[flujo_abonos_credito]].
- **8c · Consultas de servicio** — `obtenerCreditos` (el más grande de la lane: cadena `Venta` completa con los 4 pares fecha/estatus), `nombreCliente`, `validarCoberturaPorCP`, `obtenerVentanaConfirmacion`, `ObtenerEstatusEmbarque` (bloqueado por ABAP).

---

## 9 · `CreditController` — 30 rutas · 6 SAP · 24 LAN

El paquete más grande y el de más bloqueos externos. **No tomarlo hasta tener los tres primeros hechos.**

Contexto obligatorio: [[FLUJO_CREDITO_LAN_VS_SAP]].

**Fuera de alcance dentro de este controlador:** todo lo de **Credilana** (`CreditoWeb_Seguro`, `SaveCredilanaInfo`). Guía §1.6b.

**Pendiente sin dueño:** `credit/GetCreditAmounts` está conectado y lee `mavi_credilana_info`, **tabla que ningún proceso llena**. Los montos no son del préstamo: alimentan el checkout de crédito normal. Hay que definir quién la llena.

**Dos stubs que NO se deben conectar:** `ApplyPaymentNeko` y `UpdateStatusPaymentNeko` tienen cuerpo TODO y devuelven `true`. Conectarlos haría que el sistema responda éxito **sin registrar el pago**.

---

## 10 · `ProductsController` — 8 rutas, todas por abrir

**Este controlador no habla con LAN: empuja a Magento.** Las 8 rutas instancian un helper `Magento` (`mag.updateProduct`, `mag.updateStock`, `mag.updatePrice`…).

Por eso **no aplica "conmutar el puente"**: es otra forma. Y `getStockByStore` devuelve un literal fijo — es un stub.

**Antes de planear este paquete hay que aclarar con el usuario** cuál es la relación entre estas rutas y las `product/*` que la auditoría lista como pendientes de SAP. Son superficies distintas y el CSV las mezcla.

---

## 11 · `MagentoController` — 13 rutas, Magento directo

No hay trabajo de SAP. Son las 13 filas que el CSV declara como generadas y que **inflan el avance**: son Magento directo.

**Acción:** confirmar que ninguna necesita equivalencia y marcarlas como fuera del conteo.

---

## 12 · `MercanciaController` — 5 rutas

**FUERA DE ALCANCE.** Es la **APP mercancías**, que pertenece a otro proyecto. Guía §1.6b.

Ninguna de las 5 tiene llamada a SAP ni a LAN en el controlador.

---

## 13-14 · `LoginController` y `LoggingController` — 1 ruta cada uno

Infraestructura, no negocio. Dos pendientes conocidos, los dos de Marcos/Diego:

- Separar la llave JWT de LAN de la de ServicioSAP y sacar los secretos del `Web.config`
- El mecanismo de selección de entorno: **64 puntos de llamada con `ENVIROMENT_DEV` fijo**

---

# Resumen de secuencia

| Fase | Paquetes | Por qué |
|---|---|---|
| **Calibración** | 1, 2, 3 | Poco riesgo. Producen el patrón de escritura y la tabla de vocabulario |
| **Victorias rápidas** | 8a | Tres conmutaciones limpias, sin construir nada |
| **Volumen** | 4, 5, 6, 7 | El grueso del trabajo, con análisis previo disponible |
| **Lo grande** | 8b, 8c, 9 | Sólo con el método ya calibrado |
| **Aclarar antes** | 10, 11 | Requieren decisión del usuario, no código |
| **Excluidos** | 12 | Fuera de alcance |

---

# Lo que sigue bloqueado, con dueño

| Bloqueo | Quién | Paquetes que frena |
|---|---|---|
| URL del liberador y su aviso | Valentín | 7c, 9 |
| Fuente real del saldo de crédito | SAP | 9 |
| Agente genérico de ecommerce | MAVI | 7a |
| BP genérico para invitado | MAVI | 7a |
| Si se puede reescribir `PurchNoC` / `Zidecomm` | Alan | 7c |
| Contradicción de la División (la ficha dice `00`, el sistema sólo acepta `01`) | SAP | 7a |
| `ObtenerEstatusEmbarque` | ABAP | 8c |
| Quién llena `mavi_credilana_info` | **sin dueño** | 9 |
| Relación entre `product/*` del DMZ y las de SAP | **sin dueño** | 10 |
