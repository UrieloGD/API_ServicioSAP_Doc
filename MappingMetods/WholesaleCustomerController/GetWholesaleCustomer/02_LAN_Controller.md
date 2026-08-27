# Mapeo del Método: `GET /company/wholesale-customer/{wholesaleAccount}` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/WholesaleCustomerController.cs`
**Método:** `GetWholesaleCustomer(String wholesaleAccount)` — Líneas **14–21**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher puro. **Sin validación, sin trazabilidad y sin red de seguridad de excepciones.**
**Región:** `#region WholesaleCustomer` (líneas 12–22)

> **Verbo HTTP verificado:** `[HttpGet]` (línea 14) + `[Route("wholesale-customer/{wholesaleAccount}")]` (línea 15). Coincide con la DMZ.

---

## Flujo de Ejecución

1. Recibe `GET` con el segmento de ruta `{wholesaleAccount}` enlazado al parámetro `String wholesaleAccount`. Controlador decorado con `[Authorize]` y `[RoutePrefix("company")]`.
2. Instancia `WholesaleCustomerMethods wholesaleCustomerMethods = new WholesaleCustomerMethods();` (línea 18).
3. Retorna en una sola línea:
   ```csharp
   return Ok(wholesaleCustomerMethods.GetWholesaleCustomer(wholesaleAccount));
   ```
   El método de negocio devuelve un **`string` plano** (el nombre del cliente, el centinela `"null"`, o el texto de una excepción). **No hay `JsonConvert.DeserializeObject`** aquí — se envuelve el `string` directamente en `Ok(...)`, por lo que Web API lo serializa como literal JSON encomillado.

## Interacciones con Base de Datos

**Ninguna directa.** Toda la consulta ocurre en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

1. **Cero validación de entrada — asimetría peligrosa con la DMZ.** La regex `^C[0-9]{8,9}$` **solo existe en la capa DMZ** ([[01_DMZ_Controller]] paso 2). Un consumidor que alcance la LAN directamente (otro servicio interno, un job, una prueba) puede pasar cualquier cadena. El riesgo de inyección está cubierto porque el método de negocio usa `SqlParameter` tipado (`WholesaleCustomerMethods.cs:23–29`), pero **el contrato de negocio "esto es una cuenta de mayoreo" no se sostiene en esta capa**.

2. **`Ok(string)` en lugar de un DTO — origen del doble encomillado.** El `string` retornado se serializa como literal JSON (`"NOMBRE"`, con comillas). Combinado con el `Ok(response)` de la DMZ, el cuerpo que recibe Magento llega con comillas escapadas y el frontend las limpia manualmente (`WholesaleAccountManagement.php:154–155`). Ver [[01_DMZ_Controller]] obs. 2.

3. **Sin `try/catch`.** A diferencia del patrón de `CreditController`, aquí no hay red de seguridad. En la práctica no explota porque el método de negocio **captura toda excepción** y devuelve `e.Message` como si fuera el payload — pero eso significa que **el error viaja como respuesta 200 exitosa** hasta la DMZ, donde el `Contains("null")` decide arbitrariamente si es un 400 o un 200.

4. **Sin `Logger.<Modulo>("INFO", ...)` del request.** Viola la Regla #8 (Trazabilidad). No queda registro de qué cuenta mayorista se consultó ni de si respondió. Sólo hay log de error, y desde la capa de negocio, escrito además en el archivo equivocado (`customerService.log`, ver [[03_BusinessMethod]] obs. 6).

5. **Nombres divergentes entre capas.** DMZ: `GetWholesaleAccount`; LAN: `GetWholesaleCustomer`; negocio: `GetWholesaleCustomer`. Sólo el `[Route]` mantiene la cadena unida. Debe normalizarse al migrar.

6. **Método síncrono:** debe migrar a `async/await` (Regla #12). Prohibido `.Result` / `.Wait()`.

7. **El método de negocio es `internal`** (`WholesaleCustomerMethods.cs:13`), no `public`. Funciona por estar en el mismo ensamblado, pero impide pruebas unitarias desde un proyecto de test externo sin `InternalsVisibleTo`. Mismo caso en `CrateNegotiableQuote` (línea 61).

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #WholesaleCustomerController #GetWholesaleCustomer
