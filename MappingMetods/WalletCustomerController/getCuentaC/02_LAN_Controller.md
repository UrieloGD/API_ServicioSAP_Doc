# Mapeo del Método: `POST /customer/wallet/getCuentaC/{idEcommerce}` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/WalletCustomerController.cs`
**Método:** `GetCuentaCByIdEcommerce(string idEcommerce)` — Líneas **39–46**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher puro. **Ruta huérfana: nadie la invoca hoy.**
**Región:** `#region WalletCustomer` (línea 13 → `#endregion` línea 55)

---

## Flujo de Ejecución

1. Declara la ruta:
   ```csharp
   [HttpPost]
   [Route("getCuentaC/{idEcommerce}")]
   public IHttpActionResult GetCuentaCByIdEcommerce(string idEcommerce)
   ```
   Controlador decorado con `[Authorize]` (línea 9) y `[RoutePrefix("customer/wallet")]` (línea 10) → ruta efectiva **`POST customer/wallet/getCuentaC/{idEcommerce}`**.

2. Instancia `WalletCustomerMethods walletCustomerMethods = new WalletCustomerMethods();` (línea 43).

3. Delega y retorna:
   ```csharp
   string cuentaC = walletCustomerMethods.GetCuentaCByIdEcommerce(idEcommerce);
   return Ok(cuentaC);
   ```
   El método de negocio devuelve un **`string`** plano (no JSON), que Web API serializa entrecomillado.

**No hay try/catch, no hay validación, no hay logging. Son 3 líneas de cuerpo.**

---

## 🔴 Ruta huérfana — contraparte del defecto G-06

Esta ruta **no es alcanzable desde la DMZ**. La DMZ invoca `GET customer/getCuentaC/{ordenCompra}` (`APIMagentoDMZ/…/WalletCustomerController.cs:64`), que difiere en prefijo (`/wallet` ausente) y en verbo (GET vs POST). Ver el análisis completo en [[01_DMZ_Controller]].

Confirmado por `_ANALISIS_PREVIO/APIMagento-conteo-rutas.md:69`:
> `customer/wallet/getCuentaC/{idEcommerce}` | WalletCustomer | ⚠️ **Huérfana** — la DMZ llama `customer/getCuentaC/{x}` (prefijo incorrecto)

**Cualquiera de los dos lados puede ser "el correcto"** — es una decisión de negocio, no técnica: si se alinea la DMZ hacia LAN, el endpoint pasa a ser POST con el folio en la ruta; si se alinea LAN hacia DMZ, hay que cambiar el verbo a `[HttpGet]` y renombrar el prefijo. Ver `### Puntos a cerrar con el Líder Técnico` en [[03_BusinessMethod]].

---

## ⚠️ Desajuste de nombre del parámetro entre capas — **NO es cosmético**

| Capa | Nombre del parámetro | Columna SQL realmente filtrada |
|---|---|---|
| DMZ (`WalletCustomerController.cs:53`) | `ordenCompra` | — (solo lo reenvía) |
| LAN (`WalletCustomerController.cs:41`) | `idEcommerce` | — (solo lo reenvía) |
| Negocio (`WalletCustomerMethods.cs:133`) | `idEcommerce` | **`Venta.ReferenciaOrdenCompra`** |

**El nombre correcto es el de la DMZ (`ordenCompra`); el de LAN (`idEcommerce`) es engañoso.** En el modelo de Intelisis, `Venta` tiene **dos columnas distintas**:

- `Venta.IDEcommerce` — folio del pedido de Magento (`increment_id`).
- `Venta.ReferenciaOrdenCompra` — referencia de orden de compra, poblada en el flujo B2B de cotizaciones negociables (`WholesaleCustomerMethods.cs:207`, mapeada desde `negotiableQuoteRequest.folioIdEcommerce`).

Que son campos **semánticamente distintos** lo prueba `OrderMethods.cs:302`, donde el proyecto las consulta como **alternativas explícitas**:

```sql
WHERE (idEcommerce IN ('…') OR ReferenciaOrdenCompra IN ('…')) AND Mov LIKE 'Factura%'
```

Y contrasta con [[obtenerVentanaConfirmacion]], que para el mismo concepto ("el folio del pedido web") filtra `Venta.IDEcommerce`, **no** `ReferenciaOrdenCompra`.

**Impacto real:** un desarrollador que lea el controller LAN asumirá que puede pasarle el `increment_id` de Magento y obtener la cuenta del cliente. **No funcionará** para pedidos B2C normales si `ReferenciaOrdenCompra` está vacía en esas filas. El valor que viaja **debe ser una referencia de orden de compra**, no un `IDEcommerce`. Esto es una **decisión de negocio pendiente**, no un renombre trivial (ver [[03_BusinessMethod]] obs. 3).

---

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia ocurre en [[03_BusinessMethod]].

---

## Observaciones técnicas detectadas

1. **Sin `try/catch`.** Contrasta con el patrón de `CreditController` (`CreditController.cs:490–496`, `507–515`, `525–533`), que envuelve todo en `try/catch` + `Logger.Credit`. Aquí, cualquier excepción no capturada abajo sube a Web API como **HTTP 500**. En la práctica el método de negocio se traga todo (ver [[03_BusinessMethod]] obs. 5), así que el 500 nunca ocurre — pero por la razón equivocada.

2. **Sin logging (Regla #8).** No se registra el folio consultado ni el resultado. `WalletCustomerMethods` tiene incluso las llamadas a `Logger.CustomerService` **comentadas** (`WalletCustomerMethods.cs:54`, `119`, `154`). Trazabilidad cero en todo el flujo de `getCuentaC`.

3. **Sin validación del parámetro.** La única guarda (`null` / `Length == 0`) vive en DMZ ([[01_DMZ_Controller]] paso 2). Como el valor se concatena sin parametrizar en el método de negocio (`WalletCustomerMethods.cs:132–133`), **esta ruta LAN es un vector de inyección SQL directo** para cualquier consumidor dentro de la red interna. Ver [[03_BusinessMethod]] obs. 1.

4. **`[HttpPost]` con parámetro solo en la ruta y sin body.** Semánticamente debería ser `[HttpGet]` — es una consulta idempotente y sin efectos. La DMZ, de hecho, lo trata como GET. Es la raíz del desajuste de verbo.

5. **Retorna `string` crudo, no un DTO.** Obliga al `.Trim('"')` del lado DMZ. En la migración debe exponerse un objeto tipado (`{ "cuenta": "C00012345", "encontrado": true }`) con códigos HTTP diferenciados.

6. **Método síncrono:** migrar a `async/await` (Regla #12).

7. **`new WalletCustomerMethods()` por request.** Correcto (a diferencia de `FacturaMethods`, que mantiene un `SqlConnection` a nivel de campo de clase); pero como `WalletCustomerMethods` no tiene estado, podría ser estático o inyectado.

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #WalletCustomerController #getCuentaC #bloqueante
