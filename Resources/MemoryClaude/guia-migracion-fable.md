---
name: guia-migracion-fable
description: "Dónde vive la guía consolidada de migración y las dos reglas de alcance que más errores han causado"
metadata:
  type: project
---

La guía de desarrollo consolidada para Fable 5.1 vive en `Z:\.agents\skills\lan-sap-migration\MappingMetods\GUIA_MIGRACION_FABLE.md`. Es el **qué hacer**; `AUDITORIA_INTEGRAL_LAN_DMZ_SAP.md` es el **por qué** (evidencia cruda). Cada afirmación de la guía lleva nivel de respaldo: ✅ código · 📄 ficha RSG · 🔬 response real · ⚠️ por validar · ❌ refutado.

Dos reglas de alcance que costaron errores repetidos:

- **La APP mercancías está fuera de alcance** (otro proyecto). Pero la exclusión es de la **app**, no de la palabra: las parcialidades de mercaderías, SD46 y `Zconcepto="Pedido de mercancias"` siguen dentro. Caso concreto de la app: la ruta `mercancias/getSaldoVencido` del DMZ.
- **Solo se pide un SP/función si un proceso de ServicioSAP lo consume hoy.** Traza la cadena: función → SP → método de LAN → ruta del DMZ → ¿usa `PostSAP` (puenteada) o `Post` (sigue en LAN)? Se pidieron 15 fuentes derivadas del grafo de `.sql`; al trazar, solo 4 tenían consumidor real.

- **Un `HttpClient` por petición a SAP es diseño, no deuda.** El token CSRF es único por petición y va ligado a la cookie de sesión de ese `CookieContainer`. Compartir el cliente compartiría las cookies y el token dejaría de ser exclusivo. Que 53 de 56 call sites no liberen el cliente **no es hallazgo**: no reportarlo como antipatrón.

Ver [[solo-s4-no-cpi-ni-abap]], [[convencion-nombres-dmz-sap]], [[convenciones-migracion-sap]].
