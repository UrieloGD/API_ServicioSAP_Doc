---
tags: [mapeo-lan, estado-real, serviciosap, verificacion]
proyecto: APIMagento → ServicioSAP
capa: LAN (Nexo)
actualizado: 2026-08-03
agente: Nexo
verificado_contra: C:\Users\dsvalle\source\repos\ServicioSAP
---

# Estado real en ServicioSAP — verificación directa contra el código

Reanálisis de **qué está realmente implementado en `ServicioSAP`** de los 33 endpoints de nuestro alcance.

**Método:** inspección directa del repositorio `C:\Users\dsvalle\source\repos\ServicioSAP\ServicioSap\ServicioSap`, no de documentación previa. Se enumeraron las rutas expuestas, los métodos de `Methods/` y el uso real de cada helper de conexión.

---

## ⚠️ Corrección a la documentación previa

En documentos anteriores marqué varios endpoints como *«ya migrado»* cuando en realidad **solo existe el método, sin ruta que lo exponga**. Un método sin controller no es un endpoint migrado: Magento no puede llamarlo.

Esta verificación separa ambas cosas:

| Nivel | Significado |
|---|---|
| **Método** | Existe la lógica en `Methods/` |
| **Endpoint** | Existe además una ruta en `Controllers/` que lo expone |

---

## Resultado

| Estado | Endpoints | % |
|---|---|---|
| ✅ **Migrado completo** — método + ruta | **0** | 0 % |
| ⚠️ **Método listo, sin ruta** | **2** | 6 % |
| ⚠️ **Parcial** — cubre parte del caso | **1** | 3 % |
| ❌ **No existe nada** | **30** | 91 % |
| **Total de nuestro alcance** | **33** | |

> **Ningún endpoint de nuestro alcance está migrado de extremo a extremo.**

---

## ⚠️ Los 2 con método listo pero sin ruta

### 1. `credit/SendSmsNewNumber`

| | |
|---|---|
| **Método en ServicioSAP** | `CreditMethods.SendSmsNewNumber` — `Methods/Credit/CreditMethods.cs:12` |
| **Auxiliares** | `GetIdRef:53` · `InsertCodigoVerificacion:86` |
| **Conexión** | `conexionSQL.obtenerConexionAndroid()` ✅ correcta |
| **Tablas** | `TcAAEA00030_EnvioMensajes` · `VTASDCodigoVerificacioneCommerce` ✅ correctas |
| **Ruta expuesta** | ❌ **No existe** — no hay `credit/SendSmsNewNumber` en ningún controller |

**Falta:** crear el controller. El método está completo y con la conexión correcta.

### 2. `order/getGuide`

| | |
|---|---|
| **Método en ServicioSAP** | `OrderMethods.SaveGuide` — `Methods/Order/OrderMethods.cs:389` *(privado)* |
| **Conexión** | `SQLiteDb` ✅ correcta |
| **Tabla** | `servicio_guias` — `INSERT OR IGNORE` ✅ |
| **Ruta expuesta** | ❌ **No existe** |

> ⚠️ **Solo está la escritura.** `SaveGuide` inserta desde el flujo de `order/new`. **No existe el método de lectura** que es justamente lo que hace `order/getGuide`.

**Falta:** escribir el `GetGuide` (el `SELECT`) y exponerlo.

---

## ⚠️ El parcial — y está más avanzado de lo que documenté

### `credit/codigoPromocion`

| | |
|---|---|
| **Método en ServicioSAP** | `OrderMethods.HandlePromoCode` — `Methods/Order/OrderMethods.cs:828` |
| **Conexión** | `conexionSQL.obtenerConexionSigMavi()` ✅ **ya apunta a SIGMAVI** |
| **Tabla** | **`VentasCupones`** — `SELECT COUNT(*)` y `UPDATE ... SET FechaUtilizacion` |
| **Ruta expuesta** | ⚠️ `GET order/validatecupon/{codigo}` — solo la operación `ValidarCupon` |
| **Operaciones implementadas** | `ValidarCupon` *(línea 889)* · `Elimina` *(línea 895)* |
| **Uso interno** | `OrderMethods.cs:549` lo invoca con `"Elimina"` dentro de `SetOrder` |

> 🟢 **Buena noticia:** la migración a SIGMAVI de los cupones **ya está hecha**. Mi documentación decía que estaba pendiente.

> 🔴 **Discrepancia de nombre de tabla que hay que resolver:**
>
> | Fuente | Nombre de la tabla |
> |---|---|
> | Intelisis (origen) | `VTASCVentaCupon` |
> | ODS *(destino planeado)* | `VentaCupon` |
> | **ServicioSAP (implementado)** | **`VentasCupones`** |
>
> Son tres nombres distintos. Hay que confirmar cuál es el correcto en SIGMAVI antes de dar por buena la migración.

**Falta:** exponer la operación `Aplica` bajo el prefijo `credit/`, y verificar que el contrato de respuesta coincida con lo que espera Magento hoy.

---

## ❌ Los 30 que no existen

Ninguna coincidencia en `Controllers/` ni en `Methods/`. Búsqueda por nombre de método, nombre de tabla y cadena de conexión.

### CreditController — 8

| Endpoint | Objeto buscado | Resultado |
|---|---|---|
| `credit/GetCreditAmounts` | `GetCredilanaInfo` · `mavi_credilana_info` | ❌ No existe |
| `credit/SaveImagesProductosMx` | `SaveImagesProductosMx` · `MAVI_DOC_CTE` | ❌ No existe |
| `credit/guardardocumento` | `GuardarDocumento` · `MAVI_DOC_CTE` | ❌ No existe |
| `credit/ExistRFCAndPhoneCte` | `ExistRFCAndPhoneCte` | ❌ No existe |
| `credit/SolicitudMercancia` | `SolicitudMercancia` · `CRED_SOLICITUD_WEB_DATOS_TEMP` | ❌ No existe |
| `credit/getPlazos` | `GetPlazos` · `CondicionesCredVtaLinea` | ❌ No existe |
| `credit/GetUnificationWalletStatus` | `UnificacionMonedero` | ❌ No existe |
| `credit/SetUnificationWalletData` | `UnificacionMonedero` | ❌ No existe |

### CustomersController — 6

| Endpoint | Objeto buscado | Resultado |
|---|---|---|
| `customer/setCustomerList` | `blackwhitelist` · `ListaNegra` · `ListaBlanca` | ❌ No existe |
| `customer/getCustomerList` | ídem | ❌ No existe |
| `customer/deleteCustomerList` | ídem | ❌ No existe |
| `customer/cashCustomerReport` | `CreateCashReport` | ❌ No existe |
| `customer/getCuenta` | `getCuenta` | ❌ No existe |
| `customer/setCuenta` | `setCuenta` | ❌ No existe |

### CustomerServiceController — 3

| Endpoint | Objeto buscado | Resultado |
|---|---|---|
| `customerService/obtenerQuejas` | `obtenerQuejas` · `ACTES_CATALOGO_QUEJA` | ❌ No existe |
| `customerService/bbvaKeyAdvanced` | `GetBBVAKeyAdvanced` · `WSeCommerceMX` | ❌ No existe |
| `customerService/obtenerTipoGarantia` | `obtenerTipoGarantia` · `ProveedorActivoGarantia` | ❌ No existe |

> 📌 **No existe ningún `CustomerServiceController` en ServicioSAP.** Hay que crearlo desde cero.

### StatusController — 1

`status/getStatus` → ❌ No existe. ServicioSAP no tiene health-check.

### Los 12 mixtos — ninguno

`validateSms` · `CreditoWeb_SaveData` · `CreditoWeb_SaveFirstData` · `bitacoraAtencionClientes` · `CreditoWeb_FormDatos` · `CreditoWeb_Informacion` · `SaveCredilanaInfo` · `getSms` · `CreditoWeb_SaveData_Articulos` · `CreditoWeb_Seguro` · `GetPhoneValidatedClientSecretName` · `SaveHaztenTransaction`

---

## Lo que ServicioSAP sí tiene hoy

**59 rutas en 13 controladores**, ninguna de nuestro alcance:

| Controlador | Prefijo | Rutas | Tema |
|---|---|---:|---|
| `ProductController` | `product` | 22 | Catálogo, stock, SEO, jerarquías |
| `PartnerAddressController` | `partneraddress` | 6 | Direcciones y teléfonos del BP |
| `BusinessPartnerController` | `partner` | 5 | Business Partner |
| `OrderController` | `order` | 6 | Pedidos, devoluciones, cupón |
| `SaleController` | `sale` | 4 | Documentos de venta |
| `AbonosController` | `credit` | 4 | Abonos y pagos BBVA |
| `ImagenController` | `ma/imagenes` | 3 | Imágenes optimizadas |
| `AccountController` | `account` | 2 | Bonificación |
| Otros | — | 7 | Login, ecommerce, etiquetas, test, wallet |

### Métodos privados que ya usan nuestras bases

Existen dentro del flujo de `order/new`, **sin ruta propia**. Sirven como referencia de patrón, no como endpoints migrados:

| Método | Archivo:línea | Conexión | Objeto |
|---|---|---|---|
| `SaveToValidateOpenpay` | `OrderMethods.cs:326` | SQLite | `openpay_orders` |
| `SaveOpenpayStoresOrder` | `OrderMethods.cs:353` | SQLite | `openpay_stores` |
| `SaveGuide` | `OrderMethods.cs:389` | SQLite | `servicio_guias` |
| `ObtenerNumeroTablaSms` | `OrderMethods.cs:419` | Android | `TcAAEA00030_EnvioMensajes` |
| `CrearSolicitudCredito` | `OrderMethods.cs:640` | Android | Solicitud de crédito |
| `InsertCreditArticles` | `OrderMethods.cs:741` | Android | Artículos de la solicitud |
| `HandlePromoCode` | `OrderMethods.cs:828` | **SigMavi** | `VentasCupones` |
| `CreditMethods.IsValidated` | `CreditMethods.cs:116` | Android | `CteTel` |
| `CreditMethods.ObtenerNumeroTablaSms` | `CreditMethods.cs:147` | Android | — |

---

## Estado de los habilitadores

| Habilitador | Estado real | Evidencia |
|---|---|---|
| `obtenerConexionAndroid()` | ✅ **Existe y se usa** | 4 usos en `CreditMethods`, 3 en `OrderMethods` |
| `obtenerConexionSigMavi()` | ✅ **Existe y se usa** | 9 usos en `ProductMethods`, 3 en `OrderMethods`, 1 en `ImagenMethods` |
| `SQLiteDb` | ✅ **Existe y se usa** | 3 usos en `OrderMethods` |
| **H-01** `obtenerConexionAdminDoc()` | ❌ **No existe** | Sin referencias a `AdminDoc` en todo el repo |
| **H-02** Clase `Impersonation` | ❌ **No existe** | Sin `LogonUser` ni P/Invoke |
| **H-03** Helper HTTP hacia DMZ | ⚠️ **Parcial** | El patrón está inline en `OrderMethods.cs:998`, sin extraer |
| **H-04** Ruta de SQLite | ⚠️ **A corregir** | `SQLiteDb.cs:11` apunta a `C:\AntigravityRoute` |

---

## Impacto sobre el plan de fechas

| Partida | Estimación previa | Estimación corregida | Motivo |
|---|---|---|---|
| **E-01** `SendSmsNewNumber` | 0.5 d | **0.25 d** | El método está completo; solo falta el controller |
| **E-05** `order/getGuide` | 0.5 d | **0.75 d** | Hay que escribir el `SELECT`, no solo exponer |
| **E-50** `codigoPromocion` | 1.5 d | **0.75 d** | Ya está en SIGMAVI; falta `Aplica` y el prefijo `credit/` |
| Los otros 30 | Sin cambio | Sin cambio | Se confirma que parten de cero |

**Efecto neto sobre el total: −0.75 días.** El calendario no se mueve de forma significativa.

---

## Conclusiones

1. **Ningún endpoint de nuestro alcance está migrado de extremo a extremo.** Los que documenté como *«ya migrados»* son métodos sin ruta.
2. **La migración de cupones a SIGMAVI ya ocurrió** y no estaba en mi documentación. `HandlePromoCode` trabaja contra `VentasCupones` en SigMavi.
3. **Hay un conflicto de nombre de tabla** entre lo implementado (`VentasCupones`), lo planeado en el ODS (`VentaCupon`) y el origen (`VTASCVentaCupon`). Requiere confirmación.
4. **Tres de las cuatro conexiones que necesitamos ya existen** en ServicioSAP. Solo falta AdminDoc.
5. **No existe `CustomerServiceController`** en ServicioSAP — se crea desde cero para los 3 endpoints de ese controlador.
6. El patrón de portado está probado: `SendSmsNewNumber` demuestra que un método de APIMagento se mueve tal cual cambiando solo la obtención de la conexión.

---

## Navegación

- Mapa raíz de la capa: [[../LAN - Mapa|LAN - Mapa]]
- Plan con fechas: [[_PLAN_MIGRACION_FECHAS]]
- Alcance detallado: [[_ALCANCE_MIGRACION_LAN_a_SAP]]
- Listado de control: [[_CONTROL_MIGRACION.csv]]
