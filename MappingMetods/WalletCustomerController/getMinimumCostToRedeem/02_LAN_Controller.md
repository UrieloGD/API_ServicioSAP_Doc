# Mapeo del Método: `POST /customer/wallet/getMinimumCostToRedeem` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/WalletCustomerController.cs`
**Método:** `GetMinimumCostToRedeem(MinimumCostToRedeemRequest minimumCostToRedeemRequest)` — Líneas **48–54**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher puro. **Sin `try/catch`, sin validación, sin logging.**
**Región:** `#region WalletCustomer` (línea 13 → `#endregion` línea 55)

---

## Flujo de Ejecución

1. Declara la ruta:
   ```csharp
   [HttpPost]
   [Route("getMinimumCostToRedeem")]
   public IHttpActionResult GetMinimumCostToRedeem(MinimumCostToRedeemRequest minimumCostToRedeemRequest)
   ```
   Controlador decorado con `[Authorize]` (línea 9) y `[RoutePrefix("customer/wallet")]` (línea 10) → ruta efectiva **`POST customer/wallet/getMinimumCostToRedeem`**. **Coincide exactamente con lo que invoca la DMZ** (`APIMagentoDMZ/…/WalletCustomerController.cs:82`); a diferencia de [[getCuentaC]], este endpoint no está roto.

2. Instancia `WalletCustomerMethods walletCustomerMethods = new WalletCustomerMethods();` (línea 52).

3. Retorna en una sola línea (línea 53):
   ```csharp
   return Json(walletCustomerMethods.GetMinimumCostToRedeem(minimumCostToRedeemRequest));
   ```

**Es un `Json(...)` directo del objeto de negocio: el cuerpo de este método son 2 líneas.**

---

## ⚠️ El DTO de entrada es también el DTO de salida

`Json(...)` serializa **el mismo objeto `MinimumCostToRedeemRequest` que llegó como request**, mutado in-place por la capa de negocio (`WalletCustomerMethods.cs:160–403`, que recibe el objeto, lo modifica campo por campo y lo retorna).

Consecuencias:
- El response arrastra **todo** el request de vuelta al cliente, incluida la lista completa de `articulos` **enriquecida con campos internos** (`familia`, `estatus`, `procesado`) que el consumidor nunca pidió y que exponen datos del maestro de artículos de Intelisis.
- El campo `procesado` (`"TRUE"` / `"TRUE1"` / `"FALSE"`) es una **bandera de estado del algoritmo** que se filtra al exterior. Ver [[03_BusinessMethod]].
- El nombre del tipo (`…Request`) contradice su uso. En la migración deben separarse `MinimumCostToRedeemRequest` y `MinimumCostToRedeemResponse`.
- Es la razón de que el modelo LAN tenga **12 propiedades** (`Models/WalletCustomerRequest.cs:11–26`) frente a las **3** del modelo DMZ (`APIMagentoDMZ/…/Models/WalletCustomerRequest.cs:14–19`). Ver [[01_DMZ_Controller]].

---

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia ocurre en [[03_BusinessMethod]].

---

## Observaciones técnicas detectadas

1. **🔴 Sin `try/catch` — y aquí sí tiene consecuencias reales.** El método de negocio **no** captura todas sus excepciones: sus dos `try/catch` (`WalletCustomerMethods.cs:166–216` y `218–268`) cubren solo las consultas SQL. Todo el bloque de cálculo posterior (líneas **271–402**) está **fuera de cualquier `try`**. Una `NullReferenceException` en la línea 273 (`familiaPermitidaAlta.Split(',')` con `familiaPermitidaAlta == null`) o una `KeyNotFoundException` en la línea 276 (`articulo["estatus"]`) suben sin filtro a Web API → **HTTP 500 con stack trace**. Ver [[03_BusinessMethod]] obs. 1 y 2 — **no es hipotético: ocurre siempre que la tabla de configuración no tenga fila para la combinación `(uen, categoria)` recibida.**

   Contrasta con `CreditController` (`CreditController.cs:490–496`, `507–515`, `525–533`), que envuelve cada dispatch en `try/catch` + `Logger.Credit`.

2. **Sin logging (Regla #8).** Ni `INFO` del request ni `ERROR`. El único log del flujo está enterrado en los `catch` de las consultas SQL del método de negocio (`Logger.CustomerService("ERROR ", …)` en `WalletCustomerMethods.cs:215`, `267` y `470`), que escriben a `C:\inetpub\wwwroot\log\customerService.log` (`Helper/Logger.cs:134–136`) — un archivo de **otro módulo**. No existe `Logger.Wallet` ni `Logger.Monedero`.

   > Nota de contenido sensible: el request incluye la lista completa del carrito (SKUs, precios, cantidades, descuentos). Si se agregara logging del request completo — como hace `CreditController.cs:510` con `JsonConvert.SerializeObject(data)` — habría que evaluar si constituye dato comercial sensible en un log en texto plano.

3. **Sin validación de entrada.** No se valida `null` del request, ni `uen ∈ {1,2}`, ni `categoria != null`, ni `articulos != null`. La única guarda del flujo completo es… ninguna: la DMZ tampoco valida (ver [[01_DMZ_Controller]] obs. 6). Un `POST` con body vacío produce `NullReferenceException` en `WalletCustomerMethods.cs:162` → **HTTP 500**.

4. **El error de negocio es indistinguible del resultado legítimo.** Si ambas consultas SQL fallan (excepción capturada y logueada), el método continúa con `montoMinimoAlta = 0` y devuelve un `montoMaximoRedimibleGlobal` calculado sobre configuración inexistente. **El cliente recibe HTTP 200 con un umbral silenciosamente incorrecto** — y como este valor decide cuánto monedero puede redimir el cliente, el impacto es **monetario directo**.

5. **`Json(...)` en vez de `Ok(...)`.** Fuerza el serializador de Newtonsoft por encima del formatter configurado. Funciona, pero es inconsistente con el resto del proyecto (`Ok(JsonConvert.DeserializeObject(...))`). Al menos evita la doble serialización que sí sufren otros endpoints — es, irónicamente, el patrón **menos** malo del proyecto en ese aspecto.

6. **Método síncrono:** migrar a `async/await` (Regla #12). Especialmente relevante aquí: el método de negocio abre **tres conexiones SQL secuenciales** por request (`WalletCustomerMethods.cs:168`, `220`, `425`), en el camino crítico del checkout.

7. **`new WalletCustomerMethods()` por request.** Correcto — la clase no tiene estado ni conexiones a nivel de campo (a diferencia de `FacturaMethods`).

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #WalletCustomerController #getMinimumCostToRedeem
