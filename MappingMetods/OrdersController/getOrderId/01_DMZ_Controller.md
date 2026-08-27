# Mapeo del Método: `POST /order/getOrderId/{idEcommerce}` — Capa DMZ

## ⛔ NO EXISTE PROXY DMZ PARA ESTE ENDPOINT

**Conclusión verificada: `POST /order/getOrderId/{idEcommerce}` no tiene par en la DMZ.**
Existe una ruta `GET magento/getOrderId/{incrementId}` en `APIMagentoDMZ/WebApiMagento/Controllers/MagentoController.cs:78`, pero **no es su proxy: es su dependencia.** La dirección del flujo está invertida respecto al patrón habitual del proyecto.

---

## El caso que había que resolver

El nombre coincide, el controlador no. Se pidió verificar si `MagentoController.GetOrderId` es realmente el mismo flujo o un endpoint distinto que coincide en nombre. **La respuesta es la segunda, y con una vuelta de tuerca:** no son endpoints paralelos, son **dos eslabones consecutivos de la misma cadena, en el orden opuesto al normal.**

### Evidencia 1 — `Curl` en LAN apunta a la DMZ, no al revés

`APIMagento/WebApiMagento/Helper/Curl.cs` línea **21**:
```csharp
private string Ip = ConfigurationManager.AppSettings["URL_DMZ"];
```

El `Curl` del proyecto **LAN** resuelve su host contra `URL_DMZ`. Todo `curl.Get(...)` / `curl.Post(...)` ejecutado desde LAN **sale hacia la DMZ**. (Compárese con `APIMagentoDMZ/WebApiMagento/Helper/Curl.cs:22`, que usa `URL_INTELISIS` y apunta de vuelta a LAN.)

### Evidencia 2 — el controller LAN llama explícitamente a la ruta DMZ

`APIMagento/WebApiMagento/Controllers/OrdersController.cs` líneas **420–421**:
```csharp
Curl curl = new Curl();
string response = curl.Get("magento/getOrderId/" + idEcommerce).Replace("\\\"", "\"").Trim('"');
```

La ruta invocada es literalmente `magento/getOrderId/{...}` — el `RoutePrefix("magento")` + `Route("getOrderId/{incrementId}")` de `MagentoController` en la DMZ. **El endpoint LAN es cliente del endpoint DMZ.**

### Evidencia 3 — el endpoint DMZ nunca toca Intelisis

`APIMagentoDMZ/WebApiMagento/Controllers/MagentoController.cs` líneas **77–87**:
```csharp
[HttpGet]
[Route("getOrderId/{incrementId}")]
public IHttpActionResult GetOrderId(string incrementId)
{
    Magento mag = new Magento();
    OrderId json = JsonConvert.DeserializeObject<OrderId>(mag.getOrderId(incrementId));
    if (json.items == null)
        return Ok("0");

    return Ok(json.items[0].items[0].order_id);
}
```

`Magento.getOrderId` (`APIMagentoDMZ/WebApiMagento/Conn/Magento.cs:120–122`) es una llamada directa a la API REST de Magento:
```csharp
return Get("rest/V1/orders?searchCriteria[filter_groups][0][filters][0][field]=increment_id"
         + "&searchCriteria[filter_groups][0][filters][0][value]=" + incrementId
         + "&searchCriteria[filter_groups][0][filters][0][condition_type]=eq"
         + "&fields=items[items[order_id]]");
```

**Ninguna `SqlConnection`, ningún `Curl` hacia LAN, cero contacto con Intelisis.** Traduce un `increment_id` de Magento a su `entity_id` numérico.

### Evidencia 4 — la fuente maestra dice lo mismo

`MIGRATION_STATUS_MASTER_v2.csv` línea **72**, fila de `MagentoController / magento/getOrderId/{incrementId}`:

> *"**Not in LAN - DMZ calls Magento REST directly**"* … *"Handled by new Magento() in the DMZ; calls the Magento REST API directly. **Never reaches Intelisis.**"* — clasificado `MAGENTO`, `Planed Dev 1`.

Y la fila del endpoint LAN, `MIGRATION_STATUS_MASTER_v2.csv` línea **121**:

> `OrdersController (LAN-only)` · `order/getOrderId/{idEcommerce}` · POST · `WebApiMagento/Controllers/OrdersController.cs:417` · **`No DMZ route - LAN-only endpoint`** · `Out of scope` · *"No tiene ruta en DMZ, no lo consulta magento pero lo puede consultar otra aplicación, se desconoce."*

**Las dos filas son entradas independientes del master**, con controlador, verbo, destino y clasificación distintos. Coinciden únicamente en el nombre del método.

---

## Cuadro comparativo — son endpoints distintos

| | LAN `POST order/getOrderId/{idEcommerce}` | DMZ `GET magento/getOrderId/{incrementId}` |
|---|---|---|
| Archivo | `APIMagento/.../OrdersController.cs:416–434` | `APIMagentoDMZ/.../MagentoController.cs:77–87` |
| Controlador / prefijo | `OrdersController` / `order` | `MagentoController` / `magento` |
| Verbo | `POST` | `GET` |
| Rol en la cadena | **cliente** | **proveedor** |
| Destino de datos | Intelisis (`Venta`, `VentaD`, `eCommerceDetPedidos` vía SP) | **Magento REST** (`rest/V1/orders`) |
| Efecto | **escritura** — repuebla `eCommerceDetPedidos` | **lectura pura** |
| Clasificación en el master | `Out of scope` (LAN-only) | `Planed Dev 1` (MAGENTO) |
| ¿Toca Intelisis? | sí | **no, nunca** |

**Cadena real del flujo:**

```
[consumidor desconocido]
        │  POST order/getOrderId/{idEcommerce}
        ▼
  LAN  OrdersController.getOrderId          ← este endpoint
        │  curl.Get("magento/getOrderId/…")  (Curl LAN → URL_DMZ)
        ▼
  DMZ  MagentoController.GetOrderId
        │  Magento REST: rest/V1/orders?…increment_id=…
        ▼
     Magento  ──►  entity_id  ──►  vuelve a LAN
        │
        ▼
  LAN  OrderMethods.InsertDetPedido(idEcommerce, entity_id)
        │  SELECT Venta+VentaD  +  SP SpVTASeCommerceDetPedidos (Limpiar + N×Insertar)
        ▼
     IntelisisTmp.eCommerceDetPedidos
```

Es un **flujo LAN→DMZ→externo→LAN**, no el habitual DMZ→LAN. Ver [[03_BusinessMethod]] para la parte de escritura.

---

## ¿Gap de exposición o decisión intencional?

**Veredicto: gap de exposición, con el mismo síntoma que sus hermanos `createStorepickupCode` y `generateNewStorepickupCode` — sin ruta DMZ y sin consumidor identificado.**

- **No es intencional por seguridad**: el endpoint no maneja secretos ni datos sensibles; solo reconstruye el detalle de un pedido. No hay razón evidente para no exponerlo.
- **Sí es una operación de mantenimiento**, y eso explicaría el diseño: borra y reinserta el detalle de un pedido a partir de lo que ya está en `Venta`/`VentaD`. Es un "reparador" de `eCommerceDetPedidos`, probablemente pensado para uso manual del equipo de sistemas.
- **Consumidor desconocido.** Sin invocación en `APIMagento/`, `APIMagentoDMZ/` ni `MAGENTO_WEB_ADOBE/`. La nota del master lo confirma: *"no lo consulta magento pero lo puede consultar otra aplicación, se desconoce."*
- **Riesgo para la migración:** si algún proceso interno lo usa para reparar pedidos, al apagar Intelisis se rompe sin señal. Y a diferencia de los de *storepickup*, **este ni siquiera loguea la entrada** (`OrdersController.cs:416–434` no tiene ninguna llamada a `Logger`), por lo que **ni los logs de la aplicación permiten identificar quién lo llama**: habría que ir a los logs de IIS.

---

## Puente a SAP (Regla #16)

⚠️ **Este endpoint es un caso especial de la Regla #16, en el sentido inverso.** No hay un `curl.Post(...)` en la DMZ que convertir a `curl.PostSAP(...)`; lo que hay es un **`curl.Get(...)` desde LAN hacia la DMZ** (`OrdersController.cs:421`) que sale hacia Magento.

Al migrar hay que decidir explícitamente:
1. **Si el `entity_id` de Magento se sigue resolviendo por la API de Magento** (la ruta actual, que no toca SAP y podría sobrevivir intacta), **o**
2. **si esa correlación pasa a resolverse contra SAP**, en cuyo caso el `curl.Get("magento/getOrderId/…")` debe convertirse en una llamada a ServicioSAP.

**El master ya asigna `magento/getOrderId` a `MAGENTO` / `Planed Dev 1`** (línea 72), lo que apunta a la opción 1 — pero eso deja abierta la pregunta de qué pasa con la **escritura** a `eCommerceDetPedidos` que ocurre después, y que sí es 100 % Intelisis. Ver [[03_BusinessMethod]] § Destino SAP.

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #OrdersController #getOrderId #bloqueante
