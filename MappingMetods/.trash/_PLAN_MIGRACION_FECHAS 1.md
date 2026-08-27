---
tags: [mapeo-lan, plan, calendario, migracion, sigmavi]
proyecto: APIMagento → ServicioSAP
capa: LAN (Nexo)
actualizado: 2026-08-03
agente: Nexo
inicio: 2026-08-04
---

# Plan de migración LAN → ServicioSAP — control y fechas

Listado de control de **37 partidas**: 4 habilitadores y 33 endpoints. Incluye los ya mapeados y todos los que se reapuntan a **SIGMAVI (DEVMAVI)**.

**Listado en CSV para seguimiento:** [[_CONTROL_MIGRACION.csv]]
**Detalle de tablas antes y después:** [[_ALCANCE_MIGRACION_LAN_a_SAP]]

---

## Supuestos del calendario

| Parámetro                  | Valor                                                     |
| -------------------------- | --------------------------------------------------------- |
| Inicio                     | **martes 4 de agosto de 2026**                            |
| Fin proyectado             | **martes 3 de noviembre de 2026**                         |
| Días-desarrollo            | **54.5**                                                  |
| Días hábiles del periodo   | 65                                                        |
| Días festivos considerados | 16 sep · 16 nov · 25 dic                                  |
| Modalidad                  | Un desarrollador · sin paralelismo · con asistencia de IA |

> ⚠️ Las fechas asumen ejecución **secuencial**. Con dos desarrolladores en paralelo a partir de la ola 2, el cierre se adelanta a mediados de septiembre para todo lo no bloqueado.

---

## Resumen por ola

| Ola    | Contenido                     | Partidas | Días | Inicio | Fin    |
| ------ | ----------------------------- | -------: | ---: | ------ | ------ |
| **0**  | Habilitadores                 |        4 |  2.0 | 04 ago | 07 ago |
| **1**  | Piloto                        |        1 |  0.5 | 10 ago | 10 ago |
| **2**  | SIGMAVI — listas blanca/negra |        3 |  2.0 | 11 ago | 13 ago |
| **3**  | SQLite                        |        2 |  1.0 | 14 ago | 17 ago |
| **4**  | AdminDoc                      |        2 |  1.5 | 18 ago | 19 ago |
| **5**  | Sin base de datos             |        4 |  2.0 | 20 ago | 25 ago |
| **6**  | SMB y DMZ                     |        3 |  2.0 | 26 ago | 28 ago |
| **7**  | Adaptador SAP                 |        1 |  1.0 | 31 ago | 31 ago |
| **8**  | SIGMAVI — resto               |        3 |  4.5 | 01 sep | 08 sep |
| **9**  | Monedero ⏳                    |        2 |  3.0 | 09 sep | 14 sep |
| **10** | Mixtos A — linked server      |        4 | 11.0 | 15 sep | 30 sep |
| **11** | Mixtos B — bifurcados         |        3 | 13.0 | 01 oct | 19 oct |
| **12** | Mixtos C — otros              |        5 | 11.0 | 20 oct | 03 nov |

---

## Ola 0 — Habilitadores · 4–7 ago

Bloquean todo lo demás. Sin esto no arranca ninguna ola.

| ID   | Pieza                                   | Días | Fecha  | Necesaria para |
| ---- | --------------------------------------- | ---: | ------ | -------------- |
| H-01 | `conexionSQL.obtenerConexionAdminDoc()` |  0.5 | 04 ago | E-07, E-08     |
| H-02 | Clase `Impersonation` (P/Invoke)        |  0.5 | 05 ago | E-15           |
| H-03 | Helper HTTP hacia la DMZ                |  0.5 | 06 ago | E-13, E-14     |
| H-04 | Corregir `SQLiteDb.DefaultPath`         |  0.5 | 07 ago | E-05, E-06     |

> ✅ Ya existen y no requieren trabajo: `conexionSQL.obtenerConexionAndroid()` y la clase `SQLiteDb`.

---

## Ola 1 — Piloto · 10 ago

| ID | Endpoint | Método | Días | Fecha |
|---|---|---|---:|---|
| E-01 | `credit/SendSmsNewNumber` | `CreditMethods.SendSmsNewNumber:1992` | 0.5 | 10 ago |

> **El método ya está migrado** en ServicioSAP (`Methods/Credit/CreditMethods.cs:12`). Solo falta el controller. Sirve para calibrar el ciclo real de revisión y despliegue antes de comprometer el resto del calendario.

---

## Ola 2 — SIGMAVI · listas blanca/negra · 11–13 ago

Bloque único: comparten método `CustomerMethods.blackwhitelist:120` y SP `SpVTASListaNBMagento`.

| ID | Endpoint | Tabla actual | Tabla nueva | Días | Fecha |
|---|---|---|---|---:|---|
| E-02 | `customer/setCustomerList` | Intelisis `VTASCListaNegra` · `VTASCListaBlanca` | **SIGMAVI** mismas tablas | 1.0 | 11 ago |
| E-03 | `customer/getCustomerList` | Intelisis `VTASCListaNegra` · `VTASCListaBlanca` | **SIGMAVI** mismas tablas | 0.5 | 12 ago |
| E-04 | `customer/deleteCustomerList` | Intelisis `VTASCListaBlanca` | **SIGMAVI** misma tabla | 0.5 | 13 ago |

> ✅ Sin bloqueante. Estructura conocida: `NumPedido`, `Nombre`, `Correo`, `Direccion`, `Cliente`, `FechaRegistro`, `Lista`.
> Justificación del ODS: *«se quedan en SIGMAVI ya que el control es de ecommerce»*.

---

## Ola 3 — SQLite · 14–17 ago

| ID   | Endpoint                  | Tabla                 | Días | Fecha  |
| ---- | ------------------------- | --------------------- | ---: | ------ |
| E-05 | `order/getGuide`          | `servicio_guias`      |  0.5 | 14 ago |
| E-06 | `credit/GetCreditAmounts` | `mavi_credilana_info` |  0.5 | 17 ago |

> ⚠️ **E-06 depende de M-07.** Su tabla la alimenta `LoadCredilanaInfo`, que lee de Intelisis. Migrar el endpoint sin resolver el alimentador deja el caché congelado.

---

## Ola 4 — AdminDoc · 18–19 ago

| ID   | Endpoint                       | Tabla                       | Días | Fecha  |
| ---- | ------------------------------ | --------------------------- | ---: | ------ |
| E-07 | `credit/guardardocumento`      | `MAVI_DOC_CTE`              |  0.5 | 18 ago |
| E-08 | `credit/SaveImagesProductosMx` | `MAVI_DOC_CTE` + filesystem |  1.0 | 19 ago |

> Requiere H-01. E-08 necesita además referencia a `System.Drawing`.

---

## Ola 5 — Sin base de datos · 20–25 ago

| ID   | Endpoint                          | Destino              | Días | Fecha  | Nota                      |
| ---- | --------------------------------- | -------------------- | ---: | ------ | ------------------------- |
| E-09 | `customerService/obtenerQuejas`   | ServicioAndroid      |  0.5 | 20 ago | Unificar verbo GET/POST   |
| E-10 | `customerService/bbvaKeyAdvanced` | SOAP `WSeCommerceMX` |  0.5 | 21 ago | Sustituye a `bbvaKeyNeko` |
| E-11 | `credit/ExistRFCAndPhoneCte`      | Ninguno              |  0.5 | 24 ago | ⚠️ Decidir si se elimina  |
| E-12 | `status/getStatus`                | Health-check nuevo   |  0.5 | 25 ago | No portar tal cual        |

---

## Ola 6 — SMB y DMZ · 26–28 ago

| ID | Endpoint | Destino | Días | Fecha |
|---|---|---|---:|---|
| E-13 | `customer/getCuenta` | DMZ → Magento | 0.5 | 26 ago |
| E-14 | `customer/setCuenta` | DMZ → Magento | 0.5 | 27 ago |
| E-15 | `customer/cashCustomerReport` | Filesystem + SMB | 1.0 | 28 ago |

> 🔴 **Validar antes del 26 de agosto** que la cuenta del app pool de ServicioSAP alcance por red `\\172.16.200.2` y `\\172.16.202.4`. Es el supuesto más frágil del plan.

---

## Ola 7 — Adaptador SAP · 31 ago

| ID | Endpoint | Cambio | Días | Fecha |
|---|---|---|---:|---|
| E-16 | `credit/SolicitudMercancia` | Intelisis `Cte` → **SAP** `GET partner/client/{clientId}` | 1.0 | 31 ago |

> El `INSERT` a `CRED_SOLICITUD_WEB_DATOS_TEMP` en ServicioAndroid no cambia. Solo se sustituye la lectura del cliente.

---

## Ola 8 — SIGMAVI · resto · 1–8 sep

| ID | Endpoint | Tabla actual | Tabla nueva | Días | Fecha |
|---|---|---|---|---:|---|
| E-17 | `credit/codigoPromocion` | `VTASCVentaCupon` | **SIGMAVI** `VentaCupon` | 1.5 | 01–02 sep |
| E-18 | `credit/getPlazos` | `VTASCCondicionesCredVtaLinea` · `Condicion` | **SIGMAVI** + **SAP** SD40 | 1.5 | 03–04 sep |
| E-19 | `customerService/obtenerTipoGarantia` ⏳ | `VTASCProveedorActivoGarantia` | **SIGMAVI** tabla nueva | 1.5 | 07–08 sep |

> 🔒 **E-19 está bloqueado.** La tabla la alimenta PCP y **Miguel Marín** debe entregar la estructura. Al recibirla, verificar que conserve `TipoGarantia`, `Marca`, `Telefono`, `Proveedor`, `Linea`.

---

## Ola 9 — Monedero · 9–14 sep ⏳

| ID | Endpoint | Tabla | Días | Fecha |
|---|---|---|---:|---|
| E-20 | `credit/GetUnificationWalletStatus` | `CREDIHUnificacionMonedero` | 1.5 | 09–10 sep |
| E-21 | `credit/SetUnificationWalletData` | `CREDIHUnificacionMonedero` | 1.5 | 11–14 sep |

> 🔒 **Ambos bloqueados.** El ODS dice: *«definir con Valentin — no está migrado la unificación de monedero»*. Se resuelven juntos: comparten tabla y proceso (`SpVTASUnificacionMonedero`).

---

## Olas 10–12 — Endpoints mixtos · 15 sep – 3 nov

Requieren **decisión de arquitectura previa**. Las fechas son un marcador de posición.

### Ola 10 — Cruzan por linked server `ERPMAVI` · 15–30 sep

| ID | Endpoint | SP que cruza | Días | Fecha |
|---|---|---|---:|---|
| M-01 | `credit/validateSms` | `SPVTASCodigoSeguridadeCommerce` | 3.0 | 15–18 sep |
| M-02 | `credit/CreditoWeb_SaveData` | `SP_CREDITO_WEB_DATOS` | 3.0 | 21–23 sep |
| M-03 | `credit/CreditoWeb_SaveFirstData` | `SpCREDISolicitudWebPrimerGuardado` | 3.0 | 24–28 sep |
| M-04 | `customerService/bitacoraAtencionClientes` | `SP_ACTES_REGISTRO` | 2.0 | 29–30 sep |

> 🔴 El `Data Origin` los marca como `ANDROID`, pero sus SPs alcanzan Intelisis con nombres de cuatro partes. **Se rompen al apagar Intelisis** si se migran asumiendo que solo tocan ServicioAndroid.

### Ola 11 — Bifurcados SQLite / Intelisis · 1–19 oct

| ID   | Endpoint                        | Objeto Intelisis                           | Días | Fecha     |
| ---- | ------------------------------- | ------------------------------------------ | ---: | --------- |
| M-05 | `credit/CreditoWeb_FormDatos`   | `SP_CREDITO_WEB_VALORES_FORM` — 83 objetos |  5.0 | 01–07 oct |
| M-06 | `credit/CreditoWeb_Informacion` | `SPCREDICredilana` — 31 objetos            |  5.0 | 08–14 oct |
| M-07 | `credit/SaveCredilanaInfo`      | `FnVTASListaCredilanas` — 9 objetos        |  3.0 | 15–19 oct |

> ⚠️ `SP_CREDITO_WEB_VALORES_FORM` **llama a `SPCREDICredilana`**. Están acoplados y ambos ejecutan `spAfectar` — no son consultas de catálogo.
> 📊 **Medir en producción** cuántas veces se invoca cada `op` sin caché. Si el volumen es cero, estos tres se reducen a eliminar la rama del fallback y la ola completa baja de 13 días a ~2.

### Ola 12 — Otros mixtos · 20 oct – 3 nov

| ID | Endpoint | Situación | Días | Fecha |
|---|---|---|---:|---|
| M-08 | `credit/getSms` | `VTASCodigoSMSEcommerce` mezcla Android e Intelisis | 2.0 | 20–21 oct |
| M-09 | `credit/CreditoWeb_SaveData_Articulos` | Delega + `cte_prospecto` | 2.0 | 22–23 oct |
| M-10 | `credit/CreditoWeb_Seguro` | `SpCREDICredilanaSeguroDeVida` + API Liberador | 3.0 | 26–28 oct |
| M-11 | `credit/GetPhoneValidatedClientSecretName` | `Cte`, `CteTel` → `partner/client` | 2.0 | 29–30 oct |
| M-12 | `credit/SaveHaztenTransaction` | SIGMAVI + Android + `RM0855ACoordenadasProspecto` | 2.0 | 02–03 nov |

---

## Ruta crítica y riesgos

| # | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| 1 | **Estructura de garantías (Miguel Marín)** | E-19 no arranca | Solicitar antes del 1 de septiembre |
| 2 | **Definición de monedero (Valentin)** | E-20, E-21 sin destino | Solicitar antes del 1 de septiembre |
| 3 | **Alcance de red a los shares SMB** | E-15 y la ola 6 completa | Probar copia antes del 26 de agosto |
| 4 | **Medición de `op` sin caché** | Ola 11 oscila entre 2 y 13 días | Extraer logs de 30 días esta semana |
| 5 | **Decisión sobre los mixtos del grupo A** | 11 días de la ola 10 | Definir qué pasa con la parte que cruza a Intelisis |
| 6 | **Ciclo de revisión y despliegue** | El calendario asume revisión continua | Calibrar con el piloto E-01 |

> Las tres primeras se pueden destrabar **esta semana** con una solicitud. Ninguna requiere desarrollo.

---

## Escenarios de cierre

| Escenario | Condición | Cierre |
|---|---|---|
| **Optimista** | Fallback de la ola 11 sin uso · 2 desarrolladores en paralelo | **fin de septiembre** |
| **Base** | Secuencial, un desarrollador, sin bloqueos prolongados | **3 de noviembre** |
| **Pesimista** | Bloqueos de garantías y monedero se extienden · mixtos requieren rediseño | **fin de noviembre** |

> Sin las olas 10–12, todo lo demás cierra el **14 de septiembre**. Los mixtos son el 63 % del esfuerzo total (35 de 54.5 días).

---

## Navegación

- Mapa raíz de la capa: [[../LAN - Mapa|LAN - Mapa]]
- Listado de control (CSV): [[_CONTROL_MIGRACION.csv]]
- Alcance detallado: [[_ALCANCE_MIGRACION_LAN_a_SAP]]
- Decisiones del ODS: [[_DECISIONES_ODS]]
- Índice del equipo: [[README]]
