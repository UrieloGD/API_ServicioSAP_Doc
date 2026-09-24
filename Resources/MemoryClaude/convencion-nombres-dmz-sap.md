---
name: convencion-nombres-dmz-sap
description: "Los métodos de ServicioSAP deben llamarse igual que la ruta que el DMZ invoca, para poder seguir el flujo"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: bb2613c8-68f8-4e29-b018-a52b5c9feff5
  modified: 2026-09-09T16:53:42.289Z
---

Al crear o renombrar métodos en ServicioSAP, **el nombre del orquestador debe espejear la ruta que el DMZ invoca**. Convención de dos niveles:

- **Orquestador** (el que llama el controlador) → nombre de la ruta: `order/cancelOrder` → `CancelOrderAsync`, `order/setreturn` → `SetReturnAsync`.
- **Pasos internos** (por debajo del orquestador) → nombre de la operación SAP: `PostCancelInvoiceAsync` (SD48), `PostReverseGoodsIssueAsync` (SD46).

**Why:** el usuario lo pidió el 2026-09-09 porque los nombres actuales rompen la trazabilidad. Si validas el DMZ y buscas el método de cancelación, `ReverseGoodsIssueAsync` y `FullCancelAsync` no existen como concepto en el DMZ — solo existe la ruta `cancelOrder`. Hay que poder seguir el flujo DMZ → ServicioSAP leyendo los nombres, sin ir a abrir el cuerpo de cada método.

**How to apply:** antes de crear un método nuevo, revisa qué ruta lo va a invocar desde el DMZ y nómbralo igual. Los desalineamientos detectados al 2026-09-09: `order/cancelOrder` → `FullCancelAsync`, `order/setreturn` → `SetOrderAsync(req,"return")` (el peor: la devolución pasa por el mismo método que la creación de pedido con un flag de modo), `sale/transaction` → `InsertDocumentAsync`.

Ver [[convenciones-migracion-sap]].
