---
tags: [contrato, endpoint, migracion, ola-8, e-23, intelisis]
partida: `getOrderId`
endpoint: order/getOrderId/{idEcommerce}
actualizado: 2026-09-21
---

# `getOrderId` — `order/getOrderId/{idEcommerce}` · mapa del llamador paso a paso

Lo que la partida reubica **no es el reenvío a Magento** —ése ya vive en la DMZ y no se
mueve— sino el llamador de la LAN: `OrdersController.getOrderId`, que después de traer el
`order_id` reconstruye el detalle del pedido dentro de Intelisis.

| | |
|---|---|
| Ruta LAN | `POST order/getOrderId/{idEcommerce}` — `APIMagento\Controllers\OrdersController.cs:416` |
| Ruta DMZ | `GET magento/getOrderId/{incrementId}` — `APIMagentoDMZ\Controllers\MagentoController.cs:77` |
| Método que hay que portar | `OrderMethods.InsertDetPedido` — `OrderMethods.cs:454` |
| Bases que toca | **IntelisisTmp** en MAVICUBOS 🟠 · Magento (REST, vía DMZ) |
| Tablas que escribe | `eCommerceDetPedidos` — nada más |
| Estado | 🗑️ **baja confirmada, 21 sep** — Magento ignora el arreglo que justificaba la cadena |

> 🗑️ **Partida dada de baja el 21 sep. No se porta.** El 14 sep se verificó que
> el único lector de `eCommerceDetPedidos` —el flujo de recoger en sucursal— ya está migrado
> por Dev 2 y **no usa la tabla**: el `order_id` que `getOrderId` existía para rellenar ahora llega
> como parámetro de ruta. El detalle de un pedido se consulta por **SD36**. Ver
> [[#6. Lo que cambió · 9 al 15 de septiembre]] antes de leer el resto.

> El mapa del legado que sigue **se conserva como referencia histórica**: describe cómo
> funcionaba en la LAN, no lo que se va a construir.

---

## 1. La cadena completa, de punta a punta

```
consumidor externo
  │  POST order/getOrderId/{idEcommerce}
  ▼
APIMagento (LAN) · OrdersController.getOrderId : 418
  │  ① new Curl()          → POST {URL_DMZ}login/authenticate   (JWT)
  │  ② curl.Get("magento/getOrderId/" + idEcommerce)
  ▼
APIMagentoDMZ · MagentoController.GetOrderId : 79
  │  ③ Magento.getOrderId(incrementId) : 120
  ▼
Magento REST · GET rest/V1/orders?searchCriteria[...]=increment_id
  │  ④ devuelve items[items[order_id]]
  ▼
DMZ  ⑤ deserializa OrderId → si items == null ⇒ "0"
     ⑥ Ok(json.items[0].items[0].order_id)
  ▼
LAN  ⑦ limpia el escapado del string
     ⑧ ¿es "0" o trae "System.Net.WebException"?  ── sí ⇒ Ok("0")  · fin, no toca la base
     │                                              no ⇓
     ▼
OrderMethods.InsertDetPedido(idEcommerce, orderId) : 454
     ⑨ detallePedido("Limpiar", …)   → SpVTASeCommerceDetPedidos  ⇒ DELETE eCommerceDetPedidos
     ⑩ SELECT vd.* FROM Venta ⋈ VentaD                            ⇒ IntelisisTmp
     ⑪ por cada renglón: detallePedido("Insertar", …)             ⇒ INSERT eCommerceDetPedidos
     ▼
Ok(orderId)   — string plano con el id de Magento
```

---

## 2. Paso a paso, con el código real

### ① Autenticación contra la DMZ

`new Curl()` (`Helper\Curl.cs:25`) autentica **en el constructor**, sin `try`: si la DMZ no
responde, el endpoint revienta antes de llegar a la lógica.

```csharp
Token = webClient.UploadString(Ip + "login/authenticate", "POST", user);
```

`URL_DMZ` y `USER_DMZ` salen de `Web.config`. TLS 1.2 y validación de certificado
deshabilitada (`ServerCertificateValidationCallback => true`).

### ② Reenvío a la DMZ

```csharp
string response = curl.Get("magento/getOrderId/" + idEcommerce)
                      .Replace("\\\"", "\"").Trim('"');
```

`Curl.Get` (`Curl.cs:112`) manda el JWT en `Authorization`, `Timeout = 9999999`, decodifica
como UTF-8 y **atrapa cualquier excepción devolviendo `e.Message` como si fuera la
respuesta** — de ahí que el paso ⑧ tenga que buscar la cadena `"System.Net.WebException"`
dentro del cuerpo.

### ③–④ La DMZ consulta Magento

`Magento.getOrderId` (`Conn\Magento.cs:120`):

```
GET rest/V1/orders
    ?searchCriteria[filter_groups][0][filters][0][field]=increment_id
    &searchCriteria[filter_groups][0][filters][0][value]={incrementId}
    &searchCriteria[filter_groups][0][filters][0][condition_type]=eq
    &fields=items[items[order_id]]
```

Respuesta de Magento:

```json
{ "items": [ { "items": [ { "order_id": 123456 } ] } ] }
```

### ⑤–⑥ La DMZ recorta

```csharp
OrderId json = JsonConvert.DeserializeObject<OrderId>(mag.getOrderId(incrementId));
if (json.items == null) return Ok("0");
return Ok(json.items[0].items[0].order_id);
```

Modelo en `Models\OrderRequest.cs:148` — `OrderId` → `Item[]` → `Item1[]` → `int order_id`.

> 🔴 **Dos índices fijos sin comprobar.** Si Magento devuelve `items: []` —el `increment_id`
> existe pero sin partidas— `json.items` **no es null** y `items[0]` lanza
> `IndexOutOfRangeException`. La LAN lo verá como texto de excepción, no como "0".

### ⑦–⑧ La compuerta de la LAN

```csharp
if (response != "0" && !response.Contains("System.Net.WebException"))
    om.InsertDetPedido(idEcommerce, response);
else
    return Ok("0");
```

Un pedido inexistente y un error de red **se responden igual**: `"0"`. El llamador no puede
distinguirlos.

### ⑨ Limpiar el detalle anterior

```csharp
detallePedido("Limpiar", 1, "", incrementId, "", "1.0", "1.0", "1", "1.0", "1", "1", 0);
```

Ejecuta `SpVTASeCommerceDetPedidos` con `@Opc = 'Limpiar'`:

```sql
DELETE FROM eCommerceDetPedidos
WHERE IdPedido = @IdMag AND RefPedidoIntelisis IS NULL
```

Borra solo lo que todavía no se ligó a Intelisis. Los diez parámetros restantes son relleno
—la rama no los usa.

### ⑩ Leer los renglones desde Intelisis

```csharp
Connection con = new Connection();
SqlConnection conexion = new SqlConnection(con.sCadenaConexion);   // IntelisisTmp @ MAVICUBOS
conexion.Open();
SqlCommand select = new SqlCommand(
    "SELECT vd.* FROM Venta v WITH(NOLOCK) " +
    "INNER JOIN VentaD vd WITH(NOLOCK) ON v.ID = vd.ID " +
    "WHERE v.IDEcommerce = '" + incrementId + "' and v.mov = 'pedido'", conexion);
select.CommandTimeout = 9999999;
SqlDataReader tabla = select.ExecuteReader();
```

| | |
|---|---|
| Base | `IntelisisTmp` en MAVICUBOS (`Conn\Connection.cs:26`) |
| Tablas | `Venta` (cabecera) ⋈ `VentaD` (detalle), ambas con `NOLOCK` |
| Filtro | `IDEcommerce = {incrementId}` **y** `mov = 'pedido'` |
| Columnas que consume | `Articulo`, `UEN`, `Precio`, `Cantidad` — trae `vd.*`, usa cuatro |

> 🔴 **Concatenación directa del parámetro de ruta en el SQL.** `incrementId` llega desde la
> URL sin validar ni parametrizar. Al portarlo va con `SqlParameter`, sin discusión.
>
> 🔴 **La conexión nunca se cierra.** Ni `using`, ni `Close()`, ni el `SqlDataReader`
> liberado. Cada llamada deja una conexión al pool hasta el GC.

### ⑪ Insertar renglón por renglón

```csharp
string store = "";
while (tabla.Read())
{
    if (tabla["Articulo"].ToString() == "SEGU00001") continue;   // el seguro no va al detalle
    switch (tabla["UEN"].ToString())
    {
        case "1": store = "muebles_america"; break;
        case "2": store = "viu";             break;
    }
    detallePedido("Insertar", 1, store, incrementId,
                  tabla["Articulo"].ToString(),
                  tabla["Precio"].ToString(), "1.0",
                  tabla["Cantidad"].ToString(), "1.0",
                  orderId, "1", 0);
}
```

> 🔴 **`store` se declara fuera del `while` y el `switch` no cubre la UEN 3 (`mavi`).** Un
> renglón de mavi **conserva la tienda del renglón anterior**; si es el primero, queda `""`,
> que `detallePedido` traduce a `iUen = 0`. En cualquiera de los dos casos el detalle se
> guarda con una UEN que no es la del artículo.

**Valores fijos que manda este llamador** — y que explican qué ramas del SP quedan muertas:

| Parámetro | Valor | Consecuencia |
|---|---|---|
| `partidas` | `1` | el arreglo de salida siempre es de dos posiciones |
| `sPrecioEspecial` | `"1.0"` | no se propaga el precio especial real del renglón |
| `sDescuento` | `"1.0"` | el descuento real de `VentaD` se pierde |
| `codigoPostal` | `"1"` | **nunca entra la lógica de región** — un CP de un carácter no está en `VTASCCodigoPostalRegionCelular` |
| `recogerSucursal` | `0` | siempre se guarda como entrega a domicilio |

### El método puente: `detallePedido` (`OrderMethods.cs:963`)

1. Traduce la tienda a UEN entera: `muebles_america`→1, `viu`→2, `mavi`→3, cualquier otra→**0**.
2. Solo en `Insertar`, convierte la cantidad a `int` recortando en el punto decimal
   (`"2.0000"` → `2`).
3. Abre `SqlConnection` sobre `clsConexion.sCadenaConexion` (IntelisisTmp) **con `using`** —
   aquí sí se cierra.
4. Arma los once `SqlParameter` y ejecuta `SpVTASeCommerceDetPedidos` como
   `StoredProcedure`, `CommandTimeout = 60000`.
5. Carga el resultado en un `DataTable` y toma `row["Result"]` (`'concluido'`) en
   `saResultado[0]`. En la rama `PrecioIncorrecto` arma en su lugar líneas
   `Articulo|Cantidad|Precio|Preciocsv`.
6. `catch (SqlException)` → `Logger.SetOrder(...)` y **devuelve `"Incorrecto"` sin propagar**.

> 🔴 **El error de base se traga.** `InsertDetPedido` ignora el `string[]` que devuelve
> `detallePedido`, así que si el SP falla el endpoint responde **200 con el `order_id`** como
> si todo hubiera salido bien. El único rastro queda en el log.

### Firma del SP

```sql
@Opc varchar(18), @UEN int, @IdMag varchar(50), @Art varchar(20),
@Precio float, @Preciosesp float, @Cantidad int, @Descto float,
@idOrden varchar(20) = NULL, @Cp varchar(5) = NULL, @RecSuc bit = NULL
```

Mapeo desde este llamador:

| Parámetro | Origen en `Insertar` | Origen en `Limpiar` |
|---|---|---|
| `@Opc` | `"Insertar"` | `"Limpiar"` |
| `@UEN` | `VentaD.UEN` traducida vía `store` | `0` |
| `@IdMag` | `idEcommerce` de la ruta | idem |
| `@Art` | `VentaD.Articulo` | `""` |
| `@Precio` | `VentaD.Precio` | `1.0` |
| `@Preciosesp` | `1.0` fijo | `1.0` |
| `@Cantidad` | `VentaD.Cantidad` truncada | `1` |
| `@Descto` | `1.0` fijo | `1.0` |
| `@idOrden` | **`order_id` de Magento** | `"1"` |
| `@Cp` | `"1"` fijo | `"1"` |
| `@RecSuc` | `0` fijo | `0` |

---

## 3. Inventario de consumos y escrituras

### Por HTTP

| Destino | Verbo y ruta | Quién lo hace |
|---|---|---|
| DMZ | `POST login/authenticate` | `Curl` ctor, en cada instancia |
| DMZ | `GET magento/getOrderId/{id}` | `OrdersController.cs:421` |
| Magento REST | `GET rest/V1/orders?…increment_id=…` | `Magento.cs:122` |

### Por base de datos — todo en `IntelisisTmp` @ MAVICUBOS 🟠

| Tabla                                | Cómo se toca                                                                 | Desde dónde           | Equivalencia SAP             |
| ------------------------------------ | ---------------------------------------------------------------------------- | --------------------- | ---------------------------- |
| `Venta`                              | **lee** — `SELECT … WITH(NOLOCK)` por `IDEcommerce` + `mov='pedido'`         | `OrderMethods.cs:461` | pendiente                    |
| `VentaD`                             | **lee** — `INNER JOIN` por `ID`; usa `Articulo`, `UEN`, `Precio`, `Cantidad` | idem                  | pendiente                    |
| `eCommerceDetPedidos`                | **escribe** — `DELETE` en `Limpiar`, `INSERT` en `Insertar`                  | SP                    | **SD36**                     |
| `Art`                                | lee — `Familia`, para decidir si aplica región                               | SP, rama `Insertar`   | pendiente                    |
| `VTASCRegionSku`                     | lee — par de SKUs región 5 ↔ 6                                               | SP                    | ⚪ inalcanzable por esta ruta |
| `VTASCCodigoPostalRegionCelular`     | lee — clasifica el CP                                                        | SP                    | ⚪ inalcanzable (`@Cp = '1'`) |
| `eCommerceExist`                     | lee — existencia base del SKU destino                                        | SP                    | ⚪ inalcanzable               |
| `VTASDEcommerceExportaArtExistencia` | lee — existencia que pisa a la anterior                                      | SP                    | ⚪ inalcanzable               |
| `#RegionSKUDetPedidos`               | temporal del SP                                                              | SP                    | n/a                          |

**Las cuatro marcadas ⚪ solo se alcanzan con un CP real**, y este llamador manda `"1"`
fijo. `ecomerceexportaart` y `#DetalleeCommerceDetPedidos` pertenecen a la rama
`PrecioIncorrecto`, que `getOrderId` no invoca.

> Para portar `getOrderId` hacen falta, en el peor caso, **tres tablas**: `Venta`, `VentaD` y
> `eCommerceDetPedidos`. Las otras cuatro entran solo si se decide corregir el CP fijo, y esa
> es una desviación de paridad que hay que aprobar aparte.

---

## 4. Contrato observable

**Petición**

```
POST /order/getOrderId/300000123
```

Sin cuerpo. `idEcommerce` es el `increment_id` de Magento.

**Respuestas**

| Código | Cuerpo | Cuándo |
|---|---|---|
| 200 | `"123456"` | el pedido existe en Magento; el detalle quedó reescrito |
| 200 | `"0"` | Magento no encontró el `increment_id`, **o** falló la llamada a la DMZ |
| 200 | `"123456"` | el SP falló — **indistinguible del éxito**, solo se ve en el log |
| 500 | — | la DMZ no respondió al `login/authenticate` del constructor |

La respuesta viaja como **string plano**, no como objeto. Es el patrón "recortado" de la
DMZ, el mismo de E-06.

---

## 5. Deuda heredada

Documentada arriba: la concatenación en el `SELECT`, la conexión sin cerrar, `store` fuera
del bucle sin caso para `mavi`, el precio especial y el descuento fijos en `1.0`, el error de
base tragado, y los dos índices sin comprobar en la DMZ. **No se replica ninguna**, porque el
llamador no se porta.

---

## 6. Lo que cambió · 9 al 15 de septiembre

### Para qué existía la tabla

`eCommerceDetPedidos` era un **buzón**, no un registro de la venta. Se llenaba dos veces —en
el alta, y otra vez desde `getOrderId` ya con el `order_id` de Magento— y se leía **una sola**, en
`CodigoRecogerSucursal.cs:151`:

```sql
SELECT Articulo, Cantidad FROM eCommerceDetPedidos WITH(NOLOCK)
WHERE idorden = @Id AND idPedido = @idEcommerce
```

Con esos artículos se armaba el aviso de *"puede recoger en la tienda"*. La consulta filtra
por `idorden`, que el alta no conocía: **rellenar esa columna era toda la razón de ser de
`getOrderId`**.

### Por qué deja de hacer falta

Dev 2 migró el flujo de recogida los días 10 y 11 de septiembre —`generateNewStorepickupCode`
(`b8f4358`) y `createStorepickupCode` (`8107ede`), ambos en `StorePickupMethods.cs`— y el
migrado **no lee la tabla**: el `idOrder` llega como parámetro de ruta y se usa directo en el
payload a Magento. No queda ninguna columna que rellenar.

| | Legado | ServicioSAP |
|---|---|---|
| Datos del cliente | `Venta` ⋈ `Cte` ⋈ `VentaEntrega` en IntelisisTmp | SD36 → `Customer` → BP05 |
| Clave de recogida | `TrWDM0285_CteRecoge` | `BpRecogePedidos` en SIGMAVI |
| Artículos del aviso | `eCommerceDetPedidos` | **`products = new object[] { }`** — vacío |

Y `Venta`/`VentaD`, lo único que quedaba sin equivalencia, **son SD36**.

### 🔴 Hallazgo abierto: el aviso a Magento va sin artículos

`StorePickupMethods.cs:341` manda el arreglo vacío donde el legado mandaba SKU y cantidad de
cada renglón. El dato **sí está disponible**: la misma llamada a SD36 que ya se hace trae
`to_salesdoc_items` con `Material`, `Cantidad`, `Plant` y `PrecioUnitario`. Falta confirmar
con el módulo de Magento si ese arreglo se usa o se ignora.

**De esa respuesta depende la regla de región.** Si Magento lo usa, la sustitución de SKU se
recalcula al armar `products` —sin guardar nada y sin tocar la orden de SAP—; si lo ignora, la
regla se da de baja junto con esta partida.

### 🔴 Hallazgo abierto: el folio mal formado en las dos partidas de recogida

`CheckDocumentExistsSD36Async` filtra por `PurchNoC eq '…'`, y `StorePickupMethods.cs:226`
y `:264` le pasan el `idEcommerce` crudo. Verificado el 14 sep contra SD36 real:

```
GET /order/checkDocument/ZSD_ZMER_38515  →  200, 1 documento
GET /order/checkDocument/38515           →  200, []
```

Efecto: **S3-02** guarda el contacto vacío en `BpRecogePedidos` sin marcar error, y **S3-01**
rota la clave y luego devuelve *"No se encontró la orden en SAP SD36"* — el cliente se queda
con una clave nueva que nadie le avisó. Los otros seis llamadores del proyecto sí pasan el
folio compuesto.

### La regla de región, si sobrevive

Se escribió en `OrderMethods.cs` (sin commitear) y quedó así tras las decisiones del 10 al 15
de septiembre:

| Pieza | Origen en el SP | Hoy |
|---|---|---|
| Familia del artículo | `SELECT Familia FROM Art` | **DM01** `ZAPI_ARTICULOS_SRV` |
| Par de región | `VTASCRegionSku` + tabla temporal | `RegionesArticulos` (SIGMAVI, 25 pares) |
| CP región celular | `VTASCCodigoPostalRegionCelular` | `CodigosPostalesRegionesCelulares` (48 CP activos) |
| Existencia | `eCommerceExist` ⟕ `VTASDEcommerceExportaArtExistencia` | **DIM11**, solo el centro de la orden |

**La existencia cuenta un solo centro**, el que `DeterminarPlant` deduce de la tienda y el
método de pago —contado `0090` MA / `0041` VIU, crédito `0504` MA / `0505` VIU—, sumando sus
almacenes. Las dos tablas de existencia de SIGMAVI están **vacías** (0 filas ambas el 15 sep),
así que DIM11 es la única fuente real.

### 🔴 Dos datos que no cuadran

**`SF034L000` no es la familia de los teléfonos.** Filtrando DM01 por ese código salen **dos
artículos, los dos servicios**: `GRAL00381` "SERVICIO GARANTIA CELULARES TELCEL" y `GRAL00382`
"SERVICIO GARANTIA TARJETAS SIM TELCEL". Si la regla compara contra él, ningún celular la pasa
y la sustitución **nunca ocurre, sin avisar**. Falta el código correcto.

**Los artículos de `RegionesArticulos` no existen en SAP DEV.** Los 25 pares son `TELC…`;
se probaron cuatro contra DM01 y los cuatro devuelven vacío. El catálogo de regiones está
poblado, pero apunta a artículos que este entorno no conoce.

De paso quedó confirmado que **DM01 acepta el SKU tal cual**, sin rellenar a 18 con ceros
(control con `111A00137`).

### Qué falta para cerrar la partida

| # | Qué | Quién |
|---|---|---|
| 1 | ¿Magento usa el arreglo `products`? | módulo Magento |
| 2 | Código de familia correcto para telefonía | negocio |
| 3 | Si los `TELC…` deben existir en SAP DEV | negocio |
| 4 | El folio mal formado en `StorePickupMethods` | Dev 2 |
| 5 | Quién llama hoy a `order/getOrderId`, antes de retirarlo | equipo |

La **1** decide todo lo demás: si el arreglo se ignora, esta partida y la regla de región se
cierran como bajas.

Ver también [[SP_VTASeCommerceDetPedidos]], [[FLUJO_OLA8_REUBICACION_LLAMADORES]] y
[[FLUJO_RECOGER_EN_SUCURSAL]].

---

## 7. La baja, confirmada · 21 de septiembre

La única pregunta que quedaba era si Magento usa el arreglo `products` del aviso de recogida.
**No hacía falta preguntar: el módulo que lo recibe está en el repositorio de Magento.**

`app\code\Omnipro\OrderStatus\etc\webapi.xml` declara la ruta:

```xml
<route url="/V1/omnipro-orderstatus/order" method="POST">
    <service class="Omnipro\OrderStatus\Api\OrderManagementInterface" method="postOrder"/>
```

Y `Model\OrderManagement.php:176` arma el arreglo, pero **solo lo consume dentro de un `if`**:

```php
if (!empty($item['products'])) {
    $productsSku = array_column($item['products'], 'sku');
    $productsQty = array_column($item['products'], 'qty');
    $products = array_combine($productsSku, $productsQty);
}

if (in_array($item['status'], self::ORDER_STATUSES_INVOICE_SHIP)) {
    $this->checkProductStock($products, $item['source_code']);
    $this->createInvoice($order, $products);
    …
}
```

```php
const ORDER_STATUSES_INVOICE_SHIP = ['store_pickup_complete', 'ship', 'ship_carrier'];
```

**El aviso de recogida manda `status = "store_pickup"`** (`CodigoRecogerSucursal.cs:175`), que no
está en esa lista ni en las de cancelación o RMA. El arreglo se calcula y **nunca se lee**.

### Qué cierra esto

La cadena entera se queda sin razón: `getOrderId` rellenaba `idOrden`; `idOrden` servía para que el
flujo de recogida encontrara las filas; esas filas alimentaban un arreglo que Magento ignora.
Y el flujo de recogida ya se migró sin usar la tabla.

**También cae la regla de cambio de SKU por región**, cuyo último destino posible era ese
arreglo. Quedó escrita y subida en `13675c1` de ServicioSAP; su porteo está documentado en
[[SP_VTASeCommerceDetPedidos]] por si la regla reaparece en otro flujo.

### Lo que NO cae, y conviene vigilar

**`store_pickup_complete` sí consume `products`**, y con esas cantidades Magento factura y
descuenta inventario. En APIMagento, APIMagentoDMZ y ServicioSAP **nadie manda ese estatus**
—solo aparece `store_pickup`—, así que el emisor está fuera de estos tres repos: POS o
Intelisis. Conviene confirmar quién es antes del apagado; si desaparece con la LAN, se cae la
facturación de las recogidas.
