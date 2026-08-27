# Mapeo del Método: `POST /customer/wallet/getMinimumCostToRedeem` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/WalletCustomerController.cs`
**Método:** `GetMinimumCostToRedeem(MinimumCostToRedeemRequest minimumCostToRedeemRequest)` — Líneas **74–90**
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada. **Sin guarda de `null`** y con un modelo de request **truncado** respecto al de LAN.
**Región:** sin `#region` (el controlador DMZ no está regionalizado; el LAN sí, `#region WalletCustomer`)

---

## Flujo de Ejecución

1. Recibe `POST` con el body `MinimumCostToRedeemRequest`. Controlador decorado con `[Authorize]` (línea 10) y `[RoutePrefix("customer/wallet")]` (línea 11); el método con `[HttpPost]` (línea 74) y `[Route("getMinimumCostToRedeem")]` (línea 75).

2. **No valida nada.** No hay guarda de `null`, ni de `uen`, ni de `categoria`, ni de `articulos`. Contrasta con `GetWalletCustomerDetails` en el **mismo archivo** (líneas 18–29), que tiene tres validaciones (`null`, `cliente == null`, `uen` fuera del rango 1–2). La omisión es deliberada o un descuido, pero el efecto es que un body `null` o `{}` viaja intacto a LAN.

3. Instancia `Curl` y hace un reenvío con **doble deserialización anidada** (línea 82):
   ```csharp
   response = JsonConvert.DeserializeObject(
       JsonConvert.DeserializeObject(
           curl.Post("customer/wallet/getMinimumCostToRedeem",
                     JsonConvert.SerializeObject(minimumCostToRedeemRequest))
       ).ToString()
   );
   ```
   Ruta y verbo **sí coinciden** con LAN (`POST customer/wallet/getMinimumCostToRedeem`, `WalletCustomerController.cs:48–49`). A diferencia de [[getCuentaC]], este endpoint **no está roto**.

4. En error, retorna `BadRequest("Error al obtener el monto mínimo para redimir.")` → **HTTP 400**, genérico y sin detalle.

5. En éxito, `return Json(response);` → **HTTP 200** con el objeto tal cual vino de LAN.

---

## ⚠️ El modelo de request de la DMZ está truncado — descarta campos silenciosamente

`MinimumCostToRedeemRequest` está declarado **dos veces con formas distintas**:

| Capa | Archivo | Líneas | Propiedades |
|---|---|---|---|
| **DMZ** | `APIMagentoDMZ/WebApiMagento/Models/WalletCustomerRequest.cs` | **14–19** | `uen`, `categoria`, `articulos` — **3 campos** |
| **LAN** | `APIMagento/WebApiMagento/Models/WalletCustomerRequest.cs` | **11–26** | `uen`, `categoria`, `montoMaximoRedimibleGlobal`, `totalAlta`, `totalBloqueado`, `montoMinimoAlta`, `montoMinimoBloqueado`, `familiaPermitidaAlta`, `familiaPermitidaBloqueado`, `familiaMontoMinimoAlta`, `familiaMontoMinimoBloqueado`, `articulos` — **12 campos** |

Como la DMZ deserializa al modelo local y **vuelve a serializar** (`JsonConvert.SerializeObject(minimumCostToRedeemRequest)`, línea 82), **cualquier campo extra que el consumidor envíe se pierde en la DMZ**.

**Esto es benigno hoy y peligroso mañana:**
- **Hoy es benigno** porque los 9 campos adicionales son de **salida**, no de entrada: LAN los usa como acumuladores internos que rellena y devuelve. El frontend solo envía los 3 que la DMZ conoce (confirmado en `MAGENTO_WEB_ADOBE\app\code\Mavi\Monedero\Model\MonederoManagement.php:429–433`).
- **Es peligroso** porque el modelo LAN reutiliza **el mismo DTO como request y como response** (ver [[03_BusinessMethod]]). Si en el futuro se quisiera pre-cargar `montoMinimoAlta` desde el cliente, la DMZ lo descartaría **sin error y sin log**. Es un acoplamiento oculto entre dos archivos que nadie sincroniza.
- Además, **el truncamiento garantiza que `familiaPermitidaAlta` llegue siempre `null` a LAN** — lo que activa el `NullReferenceException` descrito en [[03_BusinessMethod]] obs. 1 cuando la tabla de configuración no tiene fila para la combinación `(uen, categoria)`.

---

## Interacciones con Base de Datos

**Ninguna.**

---

## Observaciones técnicas detectadas

1. **Doble `JsonConvert.DeserializeObject` anidado (línea 82).** Es un parche defensivo contra doble codificación: LAN retorna `Json(objeto)` (objeto JSON real), la primera deserialización produce un `JObject`, `.ToString()` lo re-emite como texto JSON y la segunda lo vuelve a parsear. **La segunda pasada no aporta nada** cuando LAN devuelve un objeto; solo salvaría el caso en que LAN devolviera un *string* JSON entrecomillado. Es un round-trip completo de serialización desperdiciado por request, sobre un payload que incluye la lista completa del carrito. Eliminar en la migración.

2. **`curl.Post` convierte excepciones en payload — pero aquí sí se detecta.** `Helper/Curl.cs:108–111` retorna `e.ToString()` en vez de relanzar. Ese texto **no es JSON**, así que la primera `DeserializeObject` lanza `JsonReaderException`, que **sí** entra al `catch` local → `BadRequest`. Es una detección **accidental**: funciona porque el texto de excepción no parsea, no porque haya manejo de errores. Si LAN devolviera un JSON de error válido, pasaría como éxito.

3. **Todo fallo colapsa en un único HTTP 400 opaco.** Red caída, 500 de LAN, timeout, `NullReferenceException` en negocio, body inválido — todos producen el mismo `"Error al obtener el monto mínimo para redimir."`. Semánticamente **400 es incorrecto** para fallos del servidor upstream (debería ser 502/504). El frontend, en consecuencia, no puede distinguir "no hay monedero aplicable" de "el backend está caído": ver `MonederoManagement.php:469–484`, que traduce cualquier excepción a `status: '500', value: 0` — degradando el monedero a cero.

4. **Sin trazabilidad (Regla #8).** No hay `Logger` en ninguna rama. Contrasta con `GetWalletCustomerDetails` en el mismo archivo, que sí llama `Logger.SAP(...)` en éxito (línea 40) y en error (línea 44). Un fallo de este endpoint **no deja rastro en la DMZ**; solo queda en `var/log/system.log` del lado Magento (`MonederoManagement.php:470–476`).

5. **La excepción se descarta por completo:** `catch (System.Exception)` sin variable (línea 84). Ni siquiera se podría loguear. Elimina toda posibilidad de diagnóstico.

6. **Sin validación de entrada.** Un body `null` produce `JsonConvert.SerializeObject(null)` → `"null"` → LAN recibe `null` → `NullReferenceException` en `WalletCustomerMethods.cs:162`. Debería replicar las guardas de `GetWalletCustomerDetails` (líneas 18–29), incluida la de rango `uen ∈ {1,2}` — que aquí falta y **sí importa**, porque `uen` alimenta el filtro `Ventascanalmavi.UEN` en la consulta de negocio.

7. **Modelo de request truncado respecto a LAN** — desarrollado arriba.

8. **Método síncrono:** debe migrar a `async/await` (Regla #12). Prohibido `.Result` / `.Wait()`.

9. **Puente a SAP (Regla #16).** Al migrar, `curl.Post(...)` debe convertirse en `curl.PostSAP(...)` (`Curl.cs:115`) y el destino en ServicioSAP declararse `[HttpPost]`. **La conversión es directa**: el endpoint ya es POST con body JSON, misma ruta en ambas capas. Es el caso más fácil de los tres del controlador. El patrón exacto está a la vista en el mismo archivo, línea 39: `GetWalletCustomerDetails` ya migró así, con la línea legacy de Intelisis comentada en la línea 36.

10. **La URL base y credenciales** se resuelven desde `ConfigurationManager.AppSettings["URL_INTELISIS"]` / `["USER_INTELISIS"]` / `["DOMINIO_LAN"]` (`Helper/Curl.cs` líneas **22–33**) — sin hardcodeo, cumple Regla #7.

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #WalletCustomerController #getMinimumCostToRedeem
