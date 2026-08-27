# Mapeo del Método: `GET /order/getOrderInfoAndSet/{incrementId}` — Capa DMZ

## ⛔ NO EXISTE CAPA DMZ

**No hay ruta `getOrderInfoAndSet` en `APIMagentoDMZ/`.** Este endpoint solo existe en LAN.

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

Búsqueda de `getOrderInfoAndSet` sobre todo el árbol `.cs` de la DMZ (excluyendo `bin/` y `obj/`): **cero coincidencias**.

⚠️ **Existe una ruta con nombre parecido que NO es su par** — `GET order/getOrderInfo/{incrementId}` (`APIMagentoDMZ/WebApiMagento/Controllers/OrdersController.cs:335–341`):
```csharp
[HttpGet]
[Route("getOrderInfo/{incrementId}")]
public IHttpActionResult GetOrderInfo(string incrementId)
{
    Magento mag = new Magento();
    return Ok(mag.getOrderInfo(incrementId));
}
```
Es un endpoint **distinto**: sin el sufijo `AndSet`, sin contraparte en LAN, y llama a otro método (`Magento.getOrderInfo`, no `getOrderInfoAndSet`). **No es proxy de nada.** Registrarlo aquí explícitamente para que no se confunda en revisiones posteriores.

Coincide con las fuentes maestras:
- `MIGRATION_STATUS_MASTER_v2.csv` línea 122: columna DMZ = **`No DMZ route - LAN-only endpoint`**.
- `_ENDPOINTS_NoSAP.csv` línea 98: controlador registrado como **`OrdersController (LAN-only)`**.

---

## Pero el flujo SÍ atraviesa la DMZ — en sentido inverso

Igual que [[01_DMZ_Controller|getOrderId]], este endpoint **es cliente de la DMZ, no está expuesto por ella**. `Magento.getOrderInfoAndSet` (`APIMagento/WebApiMagento/Conn/Magento.cs:371`) ejecuta:

```csharp
string response = curl.Get("order/jsonOrders/" + incrementId);
```

Y `Curl` en LAN apunta a `URL_DMZ` (`APIMagento/WebApiMagento/Helper/Curl.cs:21`). La ruta invocada es la de la DMZ:

**`GET order/jsonOrders/{incrementId}`** — `APIMagentoDMZ/WebApiMagento/Controllers/OrdersController.cs:343–355`:
```csharp
[HttpGet]
[Route("jsonOrders/{incrementId}")]
public IHttpActionResult GetJsonOrder(string incrementId)
{
    if (incrementId == null)
        throw new HttpResponseException(HttpStatusCode.BadRequest);

    Magento mag = new Magento();
    return Ok(JsonConvert.DeserializeObject(mag.GetJsonOrder(incrementId)));
}
```
→ `Magento.GetJsonOrder` (`APIMagentoDMZ/.../Conn/Magento.cs:233–236`) → `Get("rest/V1/jsonOrders/" + incrementId)` → **API REST de Magento** (endpoint personalizado de Magento que devuelve el pedido ya serializado en el formato `OrderRequest` que LAN espera).

**Cadena real del flujo:**

```
[consumidor desconocido]
        │  GET order/getOrderInfoAndSet/{incrementId}
        ▼
  LAN  OrdersController.GetOrderInfoAndSet          ← este endpoint
        ▼
  LAN  Magento.getOrderInfoAndSet
        │
        ├─(1)─► OrderMethods.ReSetPedido → lee C:\inetpub\wwwroot\log\setOrder.log (¡archivo!)
        │            └─ si encuentra la línea → SetPedido → Intelisis
        │
        └─(2)─► si no la encuentra: curl.Get("order/jsonOrders/…")   (Curl LAN → URL_DMZ)
                     ▼
               DMZ  OrdersController.GetJsonOrder
                     │  Magento REST: rest/V1/jsonOrders/{incrementId}
                     ▼
                  Magento  ──►  JSON del pedido  ──►  vuelve a LAN
                     ▼
               LAN  OrderMethods.SetPedido → Intelisis (SP_eCommerceNuevoPed / SPVTASPedidosMagento)
```

Nótese que `GET order/jsonOrders/{incrementId}` **también existe solo en la DMZ**: no tiene contraparte en LAN (verificado: la única aparición del término en `APIMagento/` es la llamada saliente de `Conn/Magento.cs:371`).

---

## ¿Gap de exposición o decisión intencional?

**Veredicto: gap de exposición — y el más difícil de justificar de los tres LAN-only del controlador, porque este endpoint reejecuta la creación de un pedido completo.**

### Argumentos de que es un gap real

1. **Es una herramienta de recuperación operativa.** Su función es "el pedido no cayó en Intelisis; vuelve a intentarlo" — exactamente lo que necesita el equipo de soporte cuando `setOrder` falla. Que no esté expuesto significa que solo se puede ejecutar desde dentro de la LAN.
2. **Ya cruza la DMZ para funcionar** (paso 2 de la cadena). No hay aislamiento real de red que justifique no exponerlo.
3. **Sin llamador conocido.** No hay invocación en `APIMagento/`, `APIMagentoDMZ/` ni `MAGENTO_WEB_ADOBE/`. El master lo documenta: *"No tiene ruta en DMZ, no lo consulta magento pero lo puede consultar otra aplicación, se desconoce."*

### Argumentos de que es intencional (los más fuertes de los tres LAN-only)

1. **Ejecuta `SetPedido` con `forzarOrder = "1"`** (`OrderMethods.cs:1686`), lo que **cambia el SP destino** de `SP_eCommerceNuevoPed` a `SPVTASPedidosMagento` (`OrderMethods.cs:558–561`), saltándose validaciones de precio. Exponer eso a la DMZ sería exponer un bypass de controles de negocio.
2. **Puede crear pedidos duplicados en Intelisis** si las guardas fallan (ver [[03_BusinessMethod]] obs. 4).
3. **Depende de leer un archivo de log del disco del servidor** (`ReSetPedido`, `OrderMethods.cs:1670`). Es inequívocamente una herramienta interna de mantenimiento, no un servicio de negocio.

### Riesgo concreto para la migración

Este es el único de los tres LAN-only donde **el diseño interno es un argumento sólido para dejarlo sin exponer**. El riesgo no es que se rompa un consumidor: es que **la herramienta de recuperación desaparezca sin sustituto**. Al migrar a SAP, `ReSetPedido` deja de tener sentido (el log `setOrder.log` de la LAN no contendrá los pedidos que fueron a SAP) y el reintento tendrá que rediseñarse en el nuevo servicio.

**Además, `[HttpGet]`** (`APIMagento/WebApiMagento/Controllers/OrdersController.cs:436`) sobre una operación que **crea un pedido en el ERP** es un defecto de contrato grave — ver [[02_LAN_Controller]] obs. 1.

---

## Interacciones con Base de Datos

**Ninguna** (no existe la capa).

## Puente a SAP (Regla #16)

No hay proxy que convertir. Pero **sí hay una llamada saliente sujeta a la regla**: `curl.Get("order/jsonOrders/" + incrementId)` en `APIMagento/WebApiMagento/Conn/Magento.cs:371`.

Decisión pendiente: al migrar, ¿el pedido de origen se sigue leyendo de Magento (`rest/V1/jsonOrders`) o pasa a leerse de SAP? El master clasifica este endpoint como `MAGENTO` (línea 122), lo que apunta a lo primero — pero eso deja abierto qué hace `SetPedido` después, que es 100 % Intelisis.

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #OrdersController #getOrderInfoAndSet #bloqueante
