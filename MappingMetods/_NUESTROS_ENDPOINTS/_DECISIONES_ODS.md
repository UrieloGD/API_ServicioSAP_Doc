---
tags: [mapeo-lan, nuestros, sigmavi, decisiones]
proyecto: APIMagento
actualizado: 2026-08-03
fuente: endpoints 1.xlsx (versión actualizada)
---

# Decisiones del `.xlsx` — lectura por color

Análisis de `endpoints 1.xlsx` (versión actualizada). El archivo usa **tema LibreOffice**, no Office, así que los índices de color no son los estándar:

| Índice | Color | Hex | Filas |
|---|---|---|---|
| theme 4 | 🟢 **VERDE** | `#18A303` | **13** |
| theme 8 | 🟡 AMARILLO | `#C99C00` | 7 |
| theme 9 | 🔴 ROJO | `#C9211E` | 3 |
| theme 5 | 🔵 AZUL | `#0369A3` | 1 |
| — | sin color | — | 99 |

**123 filas de datos · 5 endpoints afectados por las verdes.**

---

## 🟢 VERDES — decisiones tomadas

### 1. `POST /customerService/obtenerTipoGarantia` → **CONFIRMADO SIGMAVI**

| | |
|---|---|
| **Tabla** | `VTASCProveedorActivoGarantia` (Select) |
| **Campos** | `TipoGarantia`, `Marca`, `Telefono`, `Proveedor`, `Linea` |
| **SP** | N/A — SQL inline |
| **Destino** | DM0415 Configuración Garantías Atención a Clientes *(Valentin/Humberto)* |
| **API SAP** | **«Crear tabla Sigmavi»** |
| **Comentario del ODS** | *"Este servicio se utiliza en el panel del cliente ya que puede consultar si la garantía de sus compras son con la marca o con mavi"* |
| **Resolución** ✅ | **«se llena a través de PCP, Miguel Marín deberá otorgar la estructura»** |

✅ **Es nuestro y está confirmado.** No va a SAP: se crea la tabla en SIGMAVI.

**Qué implica la resolución:**

| Aspecto | Definición |
|---|---|
| Dónde vive | Tabla nueva en **SIGMAVI** |
| Quién la alimenta | **PCP** — no la escribe el ecommerce, solo la consulta |
| Quién define la estructura | **Miguel Marín** ⏳ *pendiente de entregar* |
| Nuestro trabajo | Reapuntar el `SELECT` de `VTASCProveedorActivoGarantia` a la tabla nueva de SIGMAVI |

> 🔒 **Bloqueante:** no se puede escribir el código hasta que Miguel Marín entregue la estructura de la tabla. Los campos que hoy consume el endpoint son `TipoGarantia`, `Marca`, `Telefono`, `Proveedor`, `Linea` — hay que verificar que la estructura nueva los conserve con esos nombres o documentar el mapeo.

> ⚠️ La fila 🟡 amarilla del mismo endpoint que decía `Por Definir` / `SAP Equipos` queda **superada**: manda la verde con la resolución de PCP/Miguel Marín.

---

### 2. Listas blanca/negra → ✅ **SE QUEDAN EN SIGMAVI** *(resuelto)*

Tres endpoints, un solo método (`CustomerMethods.blackwhitelist`) y un solo SP (`SpVTASListaNBMagento`).

| Endpoint | Tabla | Acciones |
|---|---|---|
| `POST /customer/setCustomerList` | `VTASCListaNegra` · `VTASCListaBlanca` | Select · Insert · Delete |
| `POST /customer/getCustomerList` | `VTASCListaNegra` · `VTASCListaBlanca` | Select |
| `POST /customer/deleteCustomerList` | `VTASCListaBlanca` | Delete |

**Campos:** `NumPedido`, `Nombre`, `Correo`, `Direccion`, `Cliente`, `FechaRegistro`, `Lista`

| | |
|---|---|
| **Destino** | «definir con Valentin si se creará en sigmavi» |
| **API SAP** | `partner/client` |
| **Comentario del ODS** | *"Se utiliza para un reporte de venta en línea de intelisis, **sí se debe de migrar**"* |
| **Resolución** ✅ | **«se quedan en SIGMAVI ya que el control es de ecommerce»** |

✅ **Resuelto y es 100 % nuestro.** Las tablas `VTASCListaNegra` y `VTASCListaBlanca` **se crean en SIGMAVI**, no se resuelven vía `partner/client` en SAP. El motivo es de propiedad funcional: **el control de listas blanca/negra pertenece a ecommerce**, no al maestro de clientes.

**Qué implica la resolución:**

| Aspecto | Definición |
|---|---|
| Dónde viven | **SIGMAVI** — tablas `VTASCListaNegra` y `VTASCListaBlanca` |
| Quién las controla | **Ecommerce** *(nosotros)* — altas, bajas y consultas |
| Rol de `partner/client` | **Descartado** como destino. Era una hipótesis del ODS que la resolución invalida |
| Nuestro trabajo | Portar el SP `SpVTASListaNBMagento` a SIGMAVI y reapuntar `CustomerMethods.blackwhitelist` |

> ✅ **No hay bloqueante.** A diferencia de `obtenerTipoGarantia`, aquí conocemos la estructura completa porque hoy la escribimos nosotros: `NumPedido`, `Nombre`, `Correo`, `Direccion`, `Cliente`, `FechaRegistro`, `Lista`. Se puede planear el desarrollo de inmediato.

> 📌 **Los tres endpoints se migran como un solo bloque.** Comparten método (`CustomerMethods.blackwhitelist`), SP (`SpVTASListaNBMagento`) y ambas tablas. Separarlos duplicaría trabajo y arriesgaría inconsistencias.

---

### 3. Unificación de monedero → **NO MIGRADO, decisión pendiente**

| Endpoint | Tabla | Acción | Campos |
|---|---|---|---|
| `POST /credit/GetUnificationWalletStatus` | `CREDIHUnificacionMonedero` | Select | `Estatus`, `FechaUnificacion`, `IdEcommerce` |
| `POST /credit/SetUnificationWalletData` | `CREDIHUnificacionMonedero` | Insert | `IdEcommerce`, `ClienteCredito`, `ClienteContado`, `FechaRegistro` |

| | |
|---|---|
| **Destino** | «definir con Valentin — **no está migrado la unificación de monedero**» |
| **API SAP** | `OData Monedero` *(Get)* · `SAP BP` *(Set)* |
| **SP relacionado** | `SpVTASUnificacionMonedero` |
| **Comentario del ODS** | *"Esta tabla va de la mano con la instrucción de unificación de cuentas, ocurre cuando un cliente migra su cuenta de contado a su cuenta de crédito, en este caso también se debe migrar el monedero a la cuenta de crédito y la tabla funciona como histórico de la migración de monedero"* |

⚠️ **Cambio importante.** Yo los tenía como 🔒 100% Intelisis fuera de alcance. El proceso completo de unificación de monedero **no está migrado** y no hay destino definido. Queda como pendiente crítico, no como descartado.

---

### 4. `GET /customerService/bbvaKeyNeko` → **SE ELIMINA**

| | |
|---|---|
| **Tabla** | `master.dbo.dbacseguridad` (Select `*`) |
| **Destino** | «Revisar con Valentin» / «Pendiente SAP» |
| **Comentario del ODS** | *"Este servicio **no debe de estar en uso** debido a que el correcto es otro que llama a un webservice de Alan, **se debe de eliminar**"* |

✅ Confirma el `Deprecated` del `MIGRATION_STATUS`. El sustituto es `bbvaKeyAdvanced`, que llama al SOAP `WSeCommerceMX` — y ese sí es nuestro.

---

## 🟡 AMARILLAS — pendientes con dueño asignado

| Endpoint | Tabla | Responsable | Destino |
|---|---|---|---|
| `GET /customerService/ValidateSTPAccount` | `dbo.FnVTASDesEncripta` | **Luis Ángel Peña** | ??? / Pendiente SAP |
| `GET /order/estimated-delivery/{ecommerceId}` | `INVDPaqueteriaGuia` | **Aziel, Leslie** | posibles Deltas |
| `GET /order/estimated-delivery/{ecommerceId}` | `EMBCConfiguracionPaqueteria` | **Aziel, Leslie** | posibles Deltas |
| `POST /prospecto/rfc` | `RFCAnexoIV` | **Alfredo García** | S4 |
| `GET /customerService/bbvaKeyNeko` | `master.dbo.dbacseguridad` | — | Pendiente SAP |
| `POST /customerService/obtenerTipoGarantia` | `VTASCProveedorActivoGarantia` | — | Por Definir / SAP Equipos ⚠️ *contradice la verde* |

---

## 🔴 ROJAS — se descartan

| Endpoint | Tabla | Decisión |
|---|---|---|
| `POST /customerService/obtenerCreditos` | `TarjetaSerieMovMAVI` | **«no existe y no se usará»** |

El campo `Importe` de esa tabla alimenta `PuntosRedimidos` en la respuesta de `obtenerCreditos`. **Al migrar, ese campo desaparece del contrato.** Hay que avisar a Magento.

---

## 🔵 AZUL — resuelto sin tabla nueva

| Endpoint | Tabla | Decisión |
|---|---|---|
| `GET /credit/getCreditAccount/{pAccount}` | `CREDIHProspectoACliente` | **«no existirá esta tabla, se validará en `ZSDT_CTE` campo `ZtipoCliente = PROSPECTO`»** — API: SAP BP05 |

---

## Impacto sobre nuestro alcance

| Endpoint | Antes | Ahora | Motivo |
|---|---|---|---|
| `customerService/obtenerTipoGarantia` | 🔒 Fuera de alcance | ✅ **Nuestro** | «Crear tabla Sigmavi» |
| `customer/setCustomerList` | 🔒 Fuera de alcance | ✅ **Nuestro** | «sí se debe de migrar» |
| `customer/getCustomerList` | 🔒 Fuera de alcance | ✅ **Nuestro** | «sí se debe de migrar» |
| `customer/deleteCustomerList` | 🔒 Fuera de alcance | ✅ **Nuestro** | «sí se debe de migrar» |
| `credit/GetUnificationWalletStatus` | 🔒 Fuera de alcance | ⚠️ **Pendiente** | «no está migrado» — sin destino |
| `credit/SetUnificationWalletData` | 🔒 Fuera de alcance | ⚠️ **Pendiente** | «no está migrado» — sin destino |
| `credit/getPlazos` | 🔒 Fuera de alcance | 🟡 Mixto | `VTASCCondicionesCredVtaLinea` → SIGMAVI |
| `credit/codigoPromocion` | 🔒 Fuera de alcance | 🟡 Mixto | `VTASCVentaCupon` → SIGMAVI |
| `customerService/bbvaKeyNeko` | 🔒 Fuera de alcance | ⛔ **Se elimina** | «no debe estar en uso» |
| `customerService/obtenerCreditos` | 🔒 Fuera de alcance | 🔒 Sigue fuera | Pero pierde `PuntosRedimidos` |

---

## Tablas que se van a SIGMAVI — consolidado

| Tabla en Intelisis | Destino | Estado | Endpoints |
|---|---|---|---|
| `VTASCProveedorActivoGarantia` | **SIGMAVI** — la llena PCP | ✅ Confirmado · ⏳ estructura pendiente (Miguel Marín) | `obtenerTipoGarantia` |
| `VTASCCondicionesCredVtaLinea` | `CondicionesCredVtaLinea` | ✅ Confirmado | `getPlazos` |
| `VTASCVentaCupon` | `VentaCupon` | ✅ Confirmado | `codigoPromocion` |
| `VTASCListaNegra` | **SIGMAVI** — control de ecommerce | ✅ **Resuelto** | `setCustomerList` · `getCustomerList` |
| `VTASCListaBlanca` | **SIGMAVI** — control de ecommerce | ✅ **Resuelto** | los 3 de listas |
| `CREDIHUnificacionMonedero` | Sin definir | ⚠️ **No migrado** | `GetUnificationWalletStatus` · `SetUnificationWalletData` |

---

## Preguntas abiertas

1. ~~**`obtenerTipoGarantia` tiene dos filas contradictorias**~~ → ✅ **RESUELTO**: manda la verde. Tabla nueva en SIGMAVI, la llena PCP. ⏳ Falta que **Miguel Marín** entregue la estructura.
2. ~~**Listas blanca/negra**: ¿SIGMAVI o `partner/client`?~~ → ✅ **RESUELTO**: se quedan en **SIGMAVI** porque el control es de ecommerce. `partner/client` queda descartado.
3. **`CREDIHUnificacionMonedero`**: ¿la unificación de monedero entra en este alcance o se pospone? Hoy no tiene destino.
4. **`TarjetaSerieMovMAVI` se descarta** — confirmar con Magento que `PuntosRedimidos` puede desaparecer del response de `obtenerCreditos`.

---

## Navegación

- Índice del equipo: [[_ANALISIS_PREVIO/_NUESTROS_ENDPOINTS/README]]
- Listado completo: [[_ENDPOINTS_NoSAP.csv]]

---

**Mapa raíz de la capa:** [[LAN - Mapa]]
