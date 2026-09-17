---
tags: [contrato, endpoint, migracion, ola-7, e-15, sigmavi]
partida: E-15
endpoint: order/GetPickUpCode
probado: 2026-09-14
actualizado: 2026-09-14
---

# E-15 — `order/GetPickUpCode`

Devuelve la clave con la que el cliente recoge su pedido en sucursal. **Solo lee**: los tres
procesos que escriben la clave son partidas aparte.

| | |
|---|---|
| Ruta pública (DMZ) | `POST order/GetPickUpCode` — `APIMagentoDMZ\Controllers\OrdersController.cs:253` |
| Destino migrado | `ServicioSap\Controllers\OrderController.cs:276` → `StorePickupMethods.GetPickUpCodeAsync` |
| Origen en el legado | `APIMagento\Controllers\OrdersController.cs:347` → `CodigoRecogerSucursal.GetPickUpCode` |
| Base | `BpRecogePedidos` en **SIGMAVI** ✅ — el legado usa `TrWDM0285_CteRecoge` en IntelisisTmp |
| Cutover DMZ | 🔴 **no aplicado** — ver el apartado final |
| No toca SAP | correcto: es una consulta a SIGMAVI, sin OData |

---

## Request

```http
POST /order/GetPickUpCode
Content-Type: application/json

{ "IdEcommerce": "2100061234" }
```

Un solo campo. El modelo es `StoreReadyPickupRequest`, idéntico en las tres capas.

## Respuestas verificadas

Probado el 14-sep-2026 contra `localhost:8097`, con datos reales de `BpRecogePedidos`.

| Caso | HTTP | Cuerpo |
|---|---|---|
| El pedido tiene clave | **200** | `{"PickupCode":"58AB1D28"}` |
| El pedido no está en la tabla | **404** | vacío |
| `IdEcommerce` nulo o ausente | **404** | vacío |
| Body `null` | **400** | `{"Message":"Referencia a objeto no establecida como instancia de un objeto."}` |

La clave devuelta se comprobó contra la fila de origen: coincide carácter por carácter.

> **El 400 del body nulo es paridad, no defecto.** El controlador hace `request.IdEcommerce`
> antes de comprobar que `request` exista, la `NullReferenceException` cae en el `catch` y sale
> como `BadRequest(e.Message)`. El legado tiene exactamente el mismo orden
> (`OrdersController.cs:352`), así que se hereda tal cual.

## Cómo viaja por la DMZ

```csharp
string response = curl.Post("order/GetPickUpCode", JsonConvert.SerializeObject(request));
return Json(response);
```

Patrón **escapado**, el de E-05: la DMZ envuelve en `Json(...)` un string que ya es JSON, así
que el consumidor recibe el objeto **dentro de una cadena** y tiene que deserializar dos veces.
No es intercambiable con el patrón recortado de E-06; se conserva igual que en el legado.

---

## El cutover no se puede aplicar todavía

No por el endpoint —está probado y responde igual que el legado— sino por **quién llena la
tabla**. Son tres escritores y solo dos están migrados:

| Escritor | Estado | Escribe en |
|---|---|---|
| `createStorepickupCode` (S3-02, Dev 2) | ✅ migrado, `8107ede` | `BpRecogePedidos` · SIGMAVI |
| `generateNewStorepickupCode` (S3-01, Dev 2) | ✅ migrado, `b8f4358` | `BpRecogePedidos` · SIGMAVI |
| `crearPrimerCodigoRecogerSucbanktransfer` | 🔴 **sin migrar, sin work item** | `TrWDM0285_CteRecoge` · IntelisisTmp |

El tercero se dispara desde el alta del legado (`APIMagento\Metodos\OrderMethods.cs:695`) para
los pedidos `instore_pickup` + `banktransfer` **con agente**. Si se conmuta E-15 antes de
moverlo, esos pedidos quedan sin clave: se escribió en Intelisis y se busca en SIGMAVI.

> **El cutover de E-15 no es una decisión propia.** Los de S3-01 y S3-02 tampoco están
> desplegados, así que en producción la cadena entera sigue yendo al legado. Los tres se
> conmutan juntos o se parte por donde se deje a medias.

---

## Hallazgo al probar: la tabla se está llenando con los contactos vacíos

`BpRecogePedidos` pasó de 0 filas (8 sep) a 6 (14 sep) — los escritores de Dev 2 ya trabajan.
Pero **cinco de las seis tienen `Correo` y `Nombre` en blanco**, y la causa está confirmada:

```
GET order/checkDocument/2100061234           →  []
GET order/checkDocument/ZSD_ZMER_2100061234  →  { DocNumber 13927, SalesOrg "05", Customer "1500008089", … }
```

`CheckDocumentExistsSD36Async` filtra por `PurchNoC eq`, y el folio tiene el formato
`ZSD_{docType}_{incrementId}` que arma `OrderMethods.cs:1663`. Los seis llamadores del
proyecto le pasan ese folio; los dos de `StorePickupMethods` —líneas 226 y 264— le pasan el
`idEcommerce` crudo, y la consulta vuelve vacía.

Consecuencias, las dos silenciosas:

- **S3-02** no obtiene el `Customer`, así que inserta la fila con correo, nombre y teléfono
  vacíos, y responde `"Código generado correctamente"` igual.
- **S3-01** lee ese correo vacío de la tabla y **no manda el aviso**. Además deja `uen` en su
  valor inicial `1`; el pedido de la prueba es `SalesOrg 05` —VIU—, así que el correo saldría
  con la plantilla de Muebles América.

No afecta a E-15, que solo lee `ClaveVenta`. Queda anotado para Dev 2.

---

## Pendiente

- Mover `crearPrimerCodigoRecogerSucbanktransfer`, que no está en ningún checklist.
- Conmutar los tres cutovers de la cadena a la vez.
- El `PurchNoC` de `StorePickupMethods` — de Dev 2.

Ver [[FLUJO_RECOGER_EN_SUCURSAL]] y [[PLAN_RECOGER_EN_SUCURSAL]].
