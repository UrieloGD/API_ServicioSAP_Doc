---
tags: [checklist, migracion, dev4, pagos, sap]
fuente: "MIGRATION_STATUS_MASTER_v2 FINAL.csv"
actualizado: 2026-08-12
rol: "Dev 4 — flujos de pago"
---

# Checklist Dev 4 — Flujos de pago

Lista de control del desarrollador dedicado a los **flujos de pago**. A diferencia de Dev 2, que consume wrappers construidos por Dev 1, **Dev 4 construye los suyos**: los de referencias bancarias y STP salen de aquí.

**Leyenda:** `[x]` hecho · `[ ]` pendiente · ⏳ falta definición

> Reparto de la migración: [[CHECKLIST_DEV1_WRAPPERS_SAP|Dev 1 — wrappers]] · [[CHECKLIST_DEV2_ENDPOINTS_SAP|Dev 2 — endpoints sobre SAP]] · [[CHECKLIST_DEV3_NOSAP_NOINTELISIS|Dev 3 — Android, SQLite y SIGMAVI]].

## Por qué este bloque va aparte

Los pagos comparten una sola familia de APIs de SAP —referencias bancarias y su equivalente de cobros— y un integrador externo, STP. Repartirlos entre varios desarrolladores obligaría a coordinar el mismo wrapper tres veces. Concentrarlos permite construir la conexión una vez y reutilizarla en los seis endpoints que la consumen.

**7 endpoints, 62 días-desarrollo estimados.**

---

## Fase 1 — El wrapper compartido

- [ ] **`ZAPI_REFERENCIAS_BANCARIAS`** — lo consumen cuatro endpoints de esta lista. Construirlo primero: hasta que exista, la fase 2 no arranca.
- [ ] **`ZFICRUD_COBREF_SRV`** — lo consume `UpdateStatusPaymentAdvanced`. Confirmar si es una API distinta o la misma familia con otra operación; el archivo maestro los nombra por separado.

> ℹ️ El archivo indica que en estos endpoints **apoya un desarrollador extra**. Conviene fijar desde el arranque quién construye el wrapper y quién los endpoints, para no duplicar.

---

## Fase 2 — Aplicación y estatus de pagos · 4 endpoints · 32 días

Los cuatro consumen el wrapper de la fase 1. Van en pares, porque aplicar un pago y actualizar su estatus comparten modelo y validaciones.

- [ ] **`customerService/ApplyPaymentNeko`** → `credit/ApplyPaymentNeko`
- [ ] **`customerService/UpdateStatusPaymentNeko`** → `credit/UpdateStatusPaymentNeko`
- [ ] **`customerService/ApplyPaymentAdvanced`**
- [ ] **`customerService/UpdateStatusPaymentAdvanced`** — usa `ZFICRUD_COBREF_SRV`

---

## Fase 3 — STP · 2 endpoints · 22 días

- [ ] **`customerService/GetSTPAccount`** — integración con STP
- [ ] **`customerService/ValidateSTPAccount`** — ⏳ **requiere crear una tabla Z en SAP** y su API, para consultarla con el BP, la CLABE y el campo correspondiente. La tabla no existe: es una dependencia del equipo ABAP, no de desarrollo. Levantarla al inicio del proyecto aunque el endpoint se programe al final.

> ⚠️ `customerService/GetSalesChannelsSTP` **no está en esta lista**: pese al nombre, el archivo lo asigna a Dev 2 y depende del wrapper `BP05_MA`. Verificar que el reparto sea intencional y no un efecto del nombre.

---

## Fase 4 — Saldos

- [ ] **`credit/getClienteSaldo/{cliente}`** → `partner/client/{clientId}` — 8 días. La ficha propone **analizar si se elimina toda la lógica actual** para consultar únicamente EX01 y aplicar la lógica nueva de SAP sobre los datos calculados. Es una decisión de alcance previa a programar, no una tarea de codificación.

---

## Fuera del alcance de Dev 4

Por decisión del 12 ago, tres endpoints que tocan pasarelas de pago **se quedan con Dev 3**, porque su destino de datos es SQLite e Intelisis y no la familia de APIs de pago de SAP:

| Endpoint | Dueño | Motivo |
|---|---|---|
| `order/ManagePaynetOrders` | Dev 3 | Depende de `spAfectar`; declarado muerto |
| `order/InsertPaymentData` | Dev 3 | Webhook de OpenPay sobre `CXCCMensajeWebHookOpenPay` |
| `order/checkOpenpay` | Dev 2 | Job del servidor LAN |

---

## Progreso

**0 / 7** endpoints terminados y **0 / 2** wrappers construidos. Los 32 días de la fase 2 dependen íntegramente del wrapper de referencias bancarias, y la fase 3 de una tabla Z que todavía no existe en SAP.

Las dos dependencias externas —el desarrollador de apoyo y la tabla Z del equipo ABAP— conviene solicitarlas en la primera semana: ninguna requiere desarrollo previo y ambas bloquean fases completas.
