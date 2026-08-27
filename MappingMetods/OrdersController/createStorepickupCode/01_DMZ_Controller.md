# Mapeo del Método: `POST /order/createStorepickupCode/{idEcommerce}/{idOrder}` — Capa DMZ

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

Búsqueda sobre todo el árbol `.cs` de la DMZ (excluyendo `bin/` y `obj/`) de los términos `storepickup`, `StorepickupCode`, `RecogerSucursal`, `PickUpCode`:

| Coincidencia | Archivo:línea | ¿Es este endpoint? |
|---|---|---|
| `[Route("sendStorePickupEmail")]` | `Controllers/OrdersController.cs:242` | ❌ Otro endpoint — llama a Magento REST `rest/V1/storepickupready/send-pickup-email` (`Conn/Magento.cs:133`) |
| `[Route("GetPickUpCode")]` | `Controllers/OrdersController.cs:253` | ❌ Es el proxy de [[01_DMZ_Controller\|GetPickUpCode]] (lectura), no de la creación |
| `NombreClienteRecogerSucursal = 26` … `CodigoRecogerSucursal = 33` | `Models/Enums.cs:38–45` | ❌ Índices del array de `setOrder`, no una ruta |
| `codigoRecogerSucursal` | `Models/OrderRequest.cs:25` | ❌ Campo del modelo de `setOrder` |
| `PickupCode` | `Models/OrderRequest.cs:100` | ❌ DTO de respuesta de `GetPickUpCode` |

**Ninguna ruta `createStorepickupCode` en ningún controlador de la DMZ.** El resultado coincide con las fuentes maestras:

- `MIGRATION_STATUS_MASTER_v2.csv` línea 119: columna DMZ = **`No DMZ route - LAN-only endpoint`**.
- `_ENDPOINTS_NoSAP.csv` línea 95: controlador registrado como **`OrdersController (LAN-only)`**.

---

## ¿Gap de exposición o decisión intencional?

**Veredicto: gap de exposición no documentado, con una asimetría difícil de justificar.**

### Argumentos de que es un gap real

1. **Su hermano de lectura sí está expuesto.** `GetPickUpCode` tiene proxy DMZ (`APIMagentoDMZ/.../OrdersController.cs:252–269`) y consumidor identificado en Magento (`MAGENTO_WEB_ADOBE/app/code/Mavi/StorePickupReadyTemplate/`). Que la **lectura** del PIN cruce la DMZ pero su **creación** no, dentro de la misma funcionalidad, no responde a ningún criterio de seguridad reconocible: si el riesgo fuera exponer el PIN, el endpoint bloqueado debería ser el otro.
2. **El endpoint no es puramente interno: dispara efectos hacia fuera de la LAN.** `crearPrimerCodigoRecogerSuc` (`CodigoRecogerSucursal.cs:88–196`) hace **dos llamadas salientes a través de la DMZ** (`Curl.Post` en LAN apunta a `URL_DMZ`, ver `APIMagento/WebApiMagento/Helper/Curl.cs:21`):
   - `order/setOrderStatus` → cambia el estado del pedido en Magento a `store_pickup` (línea 192)
   - `order/sendStorePickupEmail` → dispara el correo al cliente (línea 200–206)
   No es un método de mantenimiento interno: **es el disparador del aviso al cliente final.**
3. **Alguien tiene que invocarlo.** Sin ruta DMZ, el único origen posible es un proceso dentro de la red LAN. **No se encontró ningún invocador** ni en `APIMagento/`, ni en `APIMagentoDMZ/`, ni en `MAGENTO_WEB_ADOBE/`. La nota del master es explícita al respecto: *"No tiene ruta en DMZ, no lo consulta magento pero lo puede consultar otra aplicación, se desconoce."*

### Argumentos de que podría ser intencional

- Es un endpoint de **escritura con efectos irreversibles** (cambia el estado del pedido y manda correo al cliente). Mantenerlo fuera de la DMZ reduce superficie de ataque.
- Un `POST` con dos parámetros en la ruta y **sin body ni autenticación de negocio** (solo `[Authorize]` de servicio) sería peligroso de exponer tal cual.

### Riesgo concreto para la migración

**El consumidor real es desconocido.** Al apagar Intelisis, si existe un job, un servicio de sucursal o una app de almacén que llame a este endpoint desde la LAN, **se rompe sin aviso y nadie lo detecta hasta que los clientes dejen de recibir su clave de recogida**. La nota del master (*"se desconoce"*) documenta el desconocimiento pero no lo resuelve.

**Acción requerida antes de migrar:** instrumentar el endpoint con `Logger` de acceso (hoy solo loguea el `INFO` de entrada, `OrdersController.cs:375`) o revisar los logs de IIS de `C:\inetpub\wwwroot\` para identificar el origen real de las peticiones. Es un dato empírico obtenible, no una decisión de diseño.

---

## Interacciones con Base de Datos

**Ninguna** (no existe la capa).

## Puente a SAP (Regla #16)

No aplica hoy — no hay `curl.Post(...)` que convertir a `curl.PostSAP(...)` porque no hay proxy. **Si se decide exponerlo**, la ruta nueva debe nacer ya como `[HttpPost]` apuntando a `curl.PostSAP(...)`.

⚠️ Nótese que el flujo **inverso sí usa el puente**: el método de negocio en LAN llama a la DMZ dos veces (`order/setOrderStatus`, `order/sendStorePickupEmail`). Esas dos llamadas **sí** están sujetas a la Regla #16 y hoy siguen apuntando a `Curl.Post` (Magento), no a `PostSAP`. Ver [[03_BusinessMethod]] pasos 6 y 7.

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #OrdersController #createStorepickupCode #storepickup #bloqueante
