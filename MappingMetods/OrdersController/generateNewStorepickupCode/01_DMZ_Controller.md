# Mapeo del Método: `GET /order/generateNewStorepickupCode/{idEcommerce}` — Capa DMZ

## ⛔ NO EXISTE CAPA DMZ

**No hay ruta equivalente en `APIMagentoDMZ/`.** Este endpoint solo existe en LAN.

---

## Evidencia de la búsqueda

Se revisaron **los 14 controladores** de `APIMagentoDMZ/WebApiMagento/Controllers/`:

```
CreditController.cs          CustomerServiceController.cs   CustomersController.cs
LoginController.cs           MagentoController.cs           MercanciaController.cs
OrdersController.cs          ProductsController.cs          ProspectoController.cs
RecommenderController.cs     StatusController.cs            TokenGenerator.cs
TokenValidationHandler.cs    WalletCustomerController.cs    WholesaleCustomerController.cs
```

Búsqueda sobre todo el árbol `.cs` de la DMZ (excluyendo `bin/` y `obj/`) de `storepickup`, `StorepickupCode`, `RecogerSucursal`, `PickUpCode`, `generateNew`. **Cero coincidencias con esta ruta.** Las únicas rutas de la DMZ relacionadas con recogida en sucursal son:

| Ruta DMZ | Archivo:línea | Relación |
|---|---|---|
| `POST order/GetPickUpCode` | `Controllers/OrdersController.cs:253` | proxy de [[01_DMZ_Controller\|GetPickUpCode]] — **lectura** del PIN |
| `POST order/sendStorePickupEmail` | `Controllers/OrdersController.cs:242` | **destino de salida** que este endpoint invoca indirectamente (ver [[03_BusinessMethod]] paso 3) |

Coincide con las fuentes maestras:
- `MIGRATION_STATUS_MASTER_v2.csv` línea 120: columna DMZ = **`No DMZ route - LAN-only endpoint`**.
- `_ENDPOINTS_NoSAP.csv` línea 96: controlador registrado como **`OrdersController (LAN-only)`**.

---

## ¿Gap de exposición o decisión intencional?

**Veredicto: gap de exposición, con un agravante propio — es un `GET` que muta estado.**

### Argumentos de que es un gap real

1. **Es la única forma de recuperarse de un PIN perdido.** Si el cliente extravía la clave, o si el correo original nunca llegó (escenario perfectamente posible: la cadena de notificación de `createStorepickupCode` descarta todos sus retornos), **este endpoint es el único mecanismo de reemisión**. Que no esté expuesto significa que atención a clientes no puede resolverlo desde ninguna herramienta que pase por la DMZ.
2. **Su hermano de lectura sí cruza la DMZ.** `GetPickUpCode` está expuesto y es consumido por Magento. La asimetría —leer sí, regenerar no— no responde a ningún criterio de seguridad coherente.
3. **Dispara una notificación al cliente final** (`order/sendStorePickupEmail` a través de la DMZ, `CodigoRecogerSucursal.cs:200–206`). No es un método de mantenimiento interno.
4. **Sin llamador conocido.** No se encontró invocación alguna en `APIMagento/`, `APIMagentoDMZ/` ni `MAGENTO_WEB_ADOBE/`. El master lo documenta: *"No tiene ruta en DMZ, no lo consulta magento pero lo puede consultar otra aplicación, se desconoce."*

### Argumentos de que podría ser intencional

- Regenerar un PIN **invalida el anterior** con un `UPDATE` destructivo. Exponerlo permitiría a cualquiera con el `IdEcommerce` **anular la clave de un pedido ajeno** — una negación de servicio trivial sobre la entrega. Mantenerlo dentro de la LAN mitiga eso.
- ⚠️ Pero el mitigante es frágil: **el endpoint es `[HttpGet]`** (`APIMagento/WebApiMagento/Controllers/OrdersController.cs:393`), y un `GET` que muta estado es invocable por navegación, prefetch de navegador, crawler, o un `<img src>`. Si algún día se expone tal cual, el problema es inmediato.

### Riesgo concreto para la migración

Igual que su hermano `createStorepickupCode`: **el consumidor real es desconocido**. Al apagar Intelisis, cualquier herramienta interna (mesa de ayuda, app de sucursal) que dependa de esta ruta se rompe sin señal. Y a diferencia de `createStorepickupCode`, aquí la pérdida de funcionalidad es directamente visible para el cliente: *"perdí mi clave y nadie puede regenerármela"*.

**Acción requerida antes de migrar:** revisar los logs de IIS / `orderStatus.log` (el endpoint sí loguea su entrada, `OrdersController.cs:397`) para identificar empíricamente el origen de las peticiones.

---

## Interacciones con Base de Datos

**Ninguna** (no existe la capa).

## Puente a SAP (Regla #16)

No aplica hoy — no hay `curl.Post(...)` que convertir. **Si se decide exponerlo, la ruta nueva debe nacer como `[HttpPost]`** (nunca `GET`, ver arriba) apuntando a `curl.PostSAP(...)`.

⚠️ El flujo **de salida** sí usa el puente: `SendNotifyPickUpOrder` llama a `order/sendStorePickupEmail` en la DMZ (`CodigoRecogerSucursal.cs:200`). Esa llamada sigue apuntando a `Curl.Post` (Magento), no a `PostSAP`.

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #OrdersController #generateNewStorepickupCode #storepickup #bloqueante
