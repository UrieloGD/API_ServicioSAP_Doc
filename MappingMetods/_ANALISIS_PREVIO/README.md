---
tags: [mapeo-lan, analisis-previo, historico]
proyecto: APIMagento
capa: LAN (Nexo)
actualizado: 2026-08-03
agente: Nexo
---

# Análisis previo — documentos de trabajo

Documentos generados durante el análisis exploratorio de `APIMagento` (LAN), `APIMagentoDMZ` y `ServicioSAP`, previos a la aplicación de la skill de mapeo. **Consolidados aquí el 2026-08-03** para cumplir la regla de ruta única de documentación.

> ⚠️ **Estos documentos son históricos.** Algunas cifras quedaron superadas por análisis posteriores. La fuente vigente es [[_ALCANCE_MIGRACION_LAN_a_SAP|el documento de alcance]].

---

## Documentos

| Documento | Contenido | Vigencia |
|---|---|---|
| [[APIMagento-LAN-sin-Intelisis\|Inventario LAN sin Intelisis]] | Primer barrido: controladores, métodos y helpers que no conectan a Intelisis | ⚠️ Reportaba 68 endpoints; el conteo real es 106 |
| [[APIMagento-conteo-rutas\|Conteo de rutas de APIMagento]] | Las 106 rutas, cuáles consume la DMZ, cuáles terminan en Intelisis | ✅ Vigente |
| [[DMZ-Backlog-Migracion-SAP\|Backlog de migración de la DMZ]] | Los 120 endpoints de la DMZ y su estado frente a ServicioSAP | ✅ Vigente |
| [[Plan-migracion-18-rutas-a-ServicioSAP\|Plan de migración de 18 rutas]] | Plan por fases con habilitadores y riesgos | ⚠️ Superado por el documento de alcance |
| [[Objetos-Intelisis-3-endpoints\|Objetos de Intelisis de los 3 endpoints diferidos]] | SPs, funciones y tablas de `CreditoWeb_FormDatos`, `CreditoWeb_Informacion` y `ExistRFCAndPhoneCte` | ✅ Vigente |
| [[BRIEFING-migracion-18-endpoints\|Briefing de migración]] | Documento autocontenido para contexto de otra IA: infraestructura, instrucciones y diccionario de 45 métodos | ✅ Vigente |
| [[MAPEO-endpoints-flujo-y-responses\|Mapeo de flujo y responses]] | URL, cadena de métodos, flujo interno y ejemplo de response por endpoint | ✅ Vigente |
| [[LISTA-18-endpoints\|Lista de los 18 endpoints]] | Tabla compacta con controlador, método, backend y acceso | ⚠️ El alcance evolucionó a 21 endpoints |
| `sin-intelisis.csv` | 260 filas: todo controlador y método que no conecta a Intelisis, con evidencia `archivo:línea` | ✅ Vigente |

---

## Correcciones acumuladas

Hallazgos que invalidaron cifras de los documentos más antiguos:

| # | Corrección | Impacto |
|---|---|---|
| 1 | **El conteo de rutas de APIMagento es 106, no 68** | Corregido en `APIMagento-conteo-rutas` |
| 2 | **Linked server `ERPMAVI` → `MAVICUBOS`** | 5 endpoints alcanzan Intelisis sin que se vea en su cadena de conexión |
| 3 | **`SolicitudMercancia` sí toca Intelisis** | SQL inline con `FROM ERPMAVI.IntelisisTMP.dbo.Cte` |
| 4 | **Objetos inexistentes** | `SpCREDIDatosSolicitudCreditoArt`, `SPVTASEstadoDeCuentaClienteWeb`, `CREDIHBiometrico` y `CREDIDTransaccionMetaDato` no existen — su código falla en runtime |
| 5 | **Grafo de llamadas de `BuildJsonAndSend*`** | No invocan los 17 auxiliares; son 8 y 11 respectivamente, más `runDelta` que lanza un proceso Python |
| 6 | **Tablas que van a SIGMAVI, no a SAP** | Cambió el alcance: 6 tablas pasaron a ser responsabilidad nuestra |

---

**Mapa raíz de la capa:** [[../LAN - Mapa|LAN - Mapa]]
