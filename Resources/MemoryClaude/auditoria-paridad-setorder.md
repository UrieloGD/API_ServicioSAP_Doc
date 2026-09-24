---
name: auditoria-paridad-setorder
description: Dónde vive la auditoría de paridad SetPedido (LAN) → SetOrder (ServicioSAP) y sus 20 hallazgos
metadata: 
  node_type: memory
  type: reference
  originSessionId: bb2613c8-68f8-4e29-b018-a52b5c9feff5
  modified: 2026-09-07T23:16:54.449Z
---

Auditoría de paridad del flujo de creación de orden LAN → SAP, hecha el 2026-09-07:

- Documento: `COMPARATIVA_SETORDER_LAN_VS_SAP.md` en la raíz del proyecto (comparativa de 26 pasos, 20 hallazgos D-01…D-20, plantilla de verificación).
- Artefacto publicado (plantilla que el equipo llena, estado compartido vía capability `db`, doc `auditoria/setorder`): https://claude.ai/code/artifact/6a5f36b4-f5d1-4cd5-8e14-df3987d69102

Hallazgos de severidad alta: D-01 (idempotencia se salta con `precioEspecial`), D-02 (región celulares usa índice 20 = estado, no el CP), D-05 (Openpay tarjetas nunca llega a SAP: falta el reproceso de `CheckStatus`), D-07 (costo de envío no viaja a SAP en contado), D-11 (pickup sin clave ni correo), D-12 (`afectar`, monedero y pickup son stubs que devuelven éxito), D-13 (liberador de crédito comentado).

Alcance cubierto: solo creación de orden. Pendiente de auditar con el mismo formato: `cancelOrder`, `returnOrder`, `validateCredit`.
