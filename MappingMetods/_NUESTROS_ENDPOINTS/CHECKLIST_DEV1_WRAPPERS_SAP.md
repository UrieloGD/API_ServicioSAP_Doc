---
tags: [checklist, migracion, dev1, wrappers, sap]
fuente: "MIGRATION_STATUS_MASTER_v2 FINAL.csv"
actualizado: 2026-08-12
rol: "Dev 1 — wrappers y conexiones a SAP"
---

# Checklist Dev 1 — Wrappers y conexiones a SAP

Lista de control del desarrollador que **construye las APIs y wrappers de SAP que hoy no existen**. No implementa endpoints de negocio: entrega piezas reutilizables que Dev 2 y Dev 4 consumen.

**Leyenda:** `[x]` hecho · `[ ]` pendiente · 🔒 bloqueado · ⏳ en definición · 🔴 en ruta crítica de Dev 2

> Reparto de la migración: [[CHECKLIST_DEV2_ENDPOINTS_SAP|Dev 2 — endpoints sobre SAP]] · [[CHECKLIST_DEV4_PAGOS|Dev 4 — flujos de pago]] · [[CHECKLIST_DEV3_NOSAP_NOINTELISIS|Dev 3 — Android, SQLite y SIGMAVI]].

## La regla que ordena este backlog

Dev 1 no elige por dificultad ni por afinidad, sino **por cuántos endpoints de Dev 2 desbloquea cada wrapper**. Dev 2 arranca por los endpoints que consumen una sola API ya construida y va subiendo; cuando llegue a los que dependen de wrappers nuevos, éstos ya tienen que estar listos. Si Dev 1 se retrasa, Dev 2 se queda sin frente de trabajo al final del camino, que es el peor momento para descubrirlo.

Por eso el orden de abajo está calculado sobre la demanda real: primero el wrapper que aparece en más fichas, después los que aparecen en una sola.

---

## Fase 1 — Wrappers en ruta crítica · construir primero

- [ ] 🔴 **BP05_MA** — variante del maestro de clientes. **Desbloquea 3 endpoints de Dev 2**: `customerService/nombreCliente`, `customerService/GetSalesChannelsSTP` y `credit/CheckAccountsPreUnification`. Es el de mayor retorno del backlog: libera 42 días-desarrollo de Dev 2.
- [ ] 🔴 **API de SuccessFactors** — **desbloquea 2 endpoints**: `credit/codigoPromocion` y `credit/ExistRFCAndPhoneCte`. El segundo es el endpoint más caro de todo el plan de Dev 2, con 38 días estimados, así que su wrapper no puede llegar tarde.

> ⚠️ **Confirmar antes de arrancar**: el archivo maestro dice que `ExistRFCAndPhoneCte` necesita *dos* wrappers nuevos de entre `BP05`, `SuccessFactor`, `SD36` y `SD05`, sin precisar cuáles. `BP05` y `SD36` ya se consumen en otros endpoints, así que los candidatos son **SuccessFactor y SD05** — verificarlo con quien levantó la ficha antes de comprometer la estimación.

---

## Fase 2 — Wrappers de un solo consumidor

- [ ] **SD05** — requerido por `credit/ExistRFCAndPhoneCte`. Conviene entregarlo junto con SuccessFactors: comparten endpoint y de nada sirve uno sin el otro.
- [ ] **ZAPI_ZDMT_SEPOMEX** — API nueva de códigos postales, requerida por `customerService/validarCoberturaPorCP`. No existe todavía; hay que confirmar con el equipo ABAP si la construyen ellos o si Dev 1 solo consume.
- [ ] ⏳ **Wrapper de `customerService/obtenerVentanaConfirmacion`** — la ficha declara un wrapper pendiente pero **no dice cuál**. El endpoint consume tres APIs y la nota aclara que `ZSRV_SALESDOC_ADDRCHANGE` ya está mapeada en otro endpoint, así que el faltante es otro. **Identificarlo es el primer paso**, no estimarlo.

---

## Fase 3 — Bloqueados por definición externa

- [ ] 🔒 **Wrapper de unificación de monedero** — lo piden `credit/GetUnificationWalletStatus` y `credit/SetUnificationWalletData`. Se entregó el requerimiento **RM-SD-2026-006**, pero las tablas y APIs que menciona **no existen**. No se estima ni se arranca hasta que haya definición.

---

## Lo que NO construye Dev 1

Queda anotado para que nadie lo tome por descuido:

| Pieza | Quién |
|---|---|
| Wrappers de **STP y referencias bancarias** | **Dev 4**, junto con los endpoints de pago que los consumen |
| Wrappers ya existentes — `BP01`, `EX01`, `SD01`, `SD09`, `SD18`, `TZ01`, `SD36`, `BP05` | Ya construidos, se consumen tal cual |
| Endpoints de negocio | **Dev 2** |

> `customerService/ValidateSTPAccount` requiere crear una tabla Z en SAP y su API. Por decisión del 12 ago, **los wrappers de pago los construye Dev 4**, no Dev 1.

---

## Cómo entregar

Un wrapper se da por terminado cuando Dev 2 puede consumirlo sin preguntar nada:

1. **Método en el proyecto**, siguiendo el patrón de `Methods\BusinessPartner\BusinessPartnerMethods.cs` — cliente autenticado, `async`, deserialización tipada.
2. **Modelo de respuesta** en `Models\SAP\`, con los campos reales de la vista CDS, no un `dynamic`.
3. **Declarado en el `.csproj`.** El proyecto es de estilo antiguo: un archivo sin su `<Compile Include>` no compila y **no da error**, simplemente no existe.
4. **Configuración en el `Web.config`** por nombre de clave, nunca valores en documentos.
5. **Una llamada de prueba documentada** con un dato real, para que Dev 2 no descubra en integración que un campo llega vacío.

> ⚠️ **Verificar el ambiente al que apunta.** `GetClientAsync` construye su URL con el nodo `ENVIROMENT_DEV`, fijo en código y no en configuración. Antes de dar por bueno un wrapper hay que confirmar contra qué ambiente resuelve, porque afecta a todo lo que consulte SAP.

---

## Progreso

**0 / 6** wrappers entregados. Dos en ruta crítica, dos de un solo consumidor, uno por identificar y uno bloqueado por definición externa.

El indicador que importa no es cuántos wrappers van, sino **cuántos días de Dev 2 quedan desbloqueados**: hoy son 0 de 140 días-desarrollo que dependen de esta lista.
