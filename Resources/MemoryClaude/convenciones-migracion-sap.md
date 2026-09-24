---
name: convenciones-migracion-sap
description: "Fuente de verdad, reglas de alcance y acceso al share para el proyecto de migración LAN → SAP"
metadata: 
  node_type: memory
  type: project
  originSessionId: bb2613c8-68f8-4e29-b018-a52b5c9feff5
  modified: 2026-09-08T16:11:16.348Z
---

Decisiones vigentes del proyecto de migración Intelisis → SAP (confirmadas por el usuario el 2026-09-08):

**Acceso.** Los repos canónicos viven en el share `\\CATECINF214058D\Migracion SAP`, mapeado como `Z:` (permanente). El harness NO acepta unidades de red como directorio de trabajo — hay que operar con rutas absolutas `Z:\...`, que sí funcionan con Read/Write/Edit/Grep/Bash. Búsquedas amplias desde `Z:\` son lentas (hay un `.venv`): acotar a `Z:\LAN`, `Z:\DMZ`, `Z:\ServicioSAP`.

**Única fuente de verdad de endpoints:** `Z:\.agents\skills\lan-sap-migration\MappingMetods\MAVIDMZSAPConexiones.csv` (136 endpoints, columna `Programador` con el responsable: Diego, Javier, Marcos). Al parsearlo, respetar campos entrecomillados — el campo `Notas` contiene comas y un split ingenuo corrompe las columnas.

**Archivos retirados, no usar:** `MIGRATION_STATUS_MASTER_v2.csv`, `ENDPOINTS_DMZ_VS_SAP.csv` y `_EXCLUIDOS_Intelisis.md`. Los tres quedaron obsoletos; el CSV nuevo los reemplaza.

**Regla 16 de SKILL.md retirada.** `curl.GetSAP` se creó a propósito por escalabilidad para lecturas sin cuerpo. Ya NO es violación usarlo, ni que un endpoint de ServicioSAP sea `[HttpGet]`/`[HttpPatch]` en vez de `[HttpPost]`. La regla ya fue reescrita en `Z:\.agents\skills\lan-sap-migration\SKILL.md:56`.

**Alcance del puenteo.** ServicioSAP tiene 88 rutas reales, pero solo las filas del CSV requieren equivalencia DMZ↔SAP. Las rutas que solo envuelven una OData de RSG (BP01/BP02, BP05, DIM11, DM01-DM07, EX01, NTZ01, SD01, SD09, SD18, SD29, SD33, SD36, SD46, SD48, TZ01 — documentadas en `Z:\.agents\skills\lan-sap-migration\RSG\`) son internas de SAP por diseño: no son brechas ni "superficie sin consumir".

**Why:** el usuario corrigió estos tres puntos en medio de una auditoría porque estaba midiendo avance contra trackers desactualizados y reportando falsos positivos de alcance.

**How to apply:** antes de evaluar si un endpoint está migrado, cruzar contra el CSV nuevo, atribuir el pendiente a su `Programador`, y descartar las rutas internas de RSG. Ver [[auditoria-paridad-setorder]].
