# Mapeo del Método: `GET /company/wholesale-customer/{wholesaleAccount}` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/WholesaleCustomerController.cs`
**Método:** `GetWholesaleAccount(String wholesaleAccount)` — Líneas **16–39**
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada con validación de formato por expresión regular y traducción de "no encontrado" a HTTP 400.
**Región:** `#region WholesaleCustomer` (líneas 15–40)

> **Verbo HTTP verificado:** `[HttpGet]` en DMZ (línea 16) y `[HttpGet]` en LAN (línea 14). **No es POST.** El nombre del método de acción (`GetWholesaleAccount`) además **no coincide** con el de la capa LAN (`GetWholesaleCustomer`), y colisiona por nombre con la sobrecarga POST de cotizaciones de la misma clase (línea 45).

---

## Flujo de Ejecución

1. Recibe petición `GET` a `company/wholesale-customer/{wholesaleAccount}`. El controlador está decorado con `[Authorize]` y `[RoutePrefix("company")]`; la ruta se declara explícitamente con `[Route("wholesale-customer/{wholesaleAccount}")]` (línea 17).

2. **Validación por expresión regular — única guarda del flujo completo:**
   ```csharp
   Regex regex = new Regex(@"^C[0-9]{8,9}$");
   string response;
   if (regex.IsMatch(wholesaleAccount))
   ```
   Exige literalmente una `C` mayúscula seguida de 8 o 9 dígitos. Si no valida:
   ```csharp
   return BadRequest($"{wholesaleAccount} is not a valid wholesale account.");
   ```
   → **HTTP 400** con el valor recibido reflejado en el mensaje.

   > **Esta regex es el único criterio de "mayoreo" en toda la cadena.** El método de negocio en LAN consulta la tabla `Cte` **sin ningún filtro de canal, categoría ni grupo de cuenta** (ver [[03_BusinessMethod]] obs. 1). Compárese con `CreditController.AccountType` (`CreditMethods.cs:1719–1743`), que sí hace `JOIN CteEnviarA ... AND CteEnviarA.Categoria = @Categorie` para discriminar el canal — ver [[CheckAccountsPreUnification]].

3. **Reflejo del input en el mensaje de error.** `$"{wholesaleAccount} is not a valid wholesale account."` devuelve al llamante la cadena que envió. Como el parámetro es de ruta y ya falló la regex, el riesgo es bajo, pero es un eco de input no saneado en el cuerpo de respuesta.

4. Instancia `Curl` y reenvía a LAN por **GET**:
   ```csharp
   Curl curl = new Curl();
   response = curl.Get("company/wholesale-customer/" + wholesaleAccount);
   ```
   La URL base y credenciales se resuelven desde `ConfigurationManager.AppSettings["URL_INTELISIS"]` / `["USER_INTELISIS"]` / `["DOMINIO_LAN"]` (Regla #7: sin hardcodeo) — ver `Helper/Curl.cs` líneas 22–33. El método `Curl.Get` está en `Curl.cs` líneas **210–230**.

5. **Discriminación del resultado por `String.Contains`:**
   ```csharp
   if (response.Contains("null"))
   {
       return BadRequest("Customer not found.");
   }
   else
   {
       return Ok(response);
   }
   ```

6. **No hay deserialización.** A diferencia del patrón dominante del proyecto, aquí **no** se ejecuta `JsonConvert.DeserializeObject(response)`: se retorna `Ok(response)` con el `string` crudo. Web API lo serializa como literal JSON, produciendo **doble encomillado** (ver Observaciones).

## Interacciones con Base de Datos

**Ninguna.**

## Observaciones técnicas detectadas

1. **`response.Contains("null")` — el hallazgo más grave de esta capa.** Es una comparación de **subcadena**, no de igualdad, sobre un payload que puede ser cualquiera de tres cosas:
   - El centinela `"null"` que el método de negocio emite cuando no hay filas (`WholesaleCustomerMethods.cs:44`) → comportamiento deseado.
   - **El `e.Message` de una excepción de BD** (`WholesaleCustomerMethods.cs:53`). Muchos mensajes de `SqlException` / `NullReferenceException` contienen la palabra `null` (p. ej. *"Object reference not set to an instance of an object"* no, pero *"...cannot be null"*, *"Data is Null"*, *"Column 'Nombre' does not allow nulls"* sí). Cuando eso ocurre, **un fallo de infraestructura se reporta como HTTP 400 "Customer not found."** El cliente concluye que la cuenta no existe cuando en realidad la base está caída.
   - **El nombre real del cliente** devuelto por `Cte.Nombre`. Cualquier razón social que contenga la secuencia `null` como subcadena (mayúsculas/minúsculas dependen de la cultura, `Contains` es sensible a mayúsculas, así que `NULL` en mayúsculas **no** dispara) provocaría un falso 400. Riesgo bajo pero real.
   - **`Curl.Get` también captura sus propias excepciones y retorna `e.ToString()`** (`Curl.cs:224–227`), es decir, un stack trace completo. Ese texto suele contener la palabra `null`, con lo que **una caída de red LAN→DMZ también se traduce a "Customer not found."**

2. **`Ok(response)` con `string` crudo → doble encomillado.** La LAN ya devolvió el nombre serializado como literal JSON (`"JUAN PEREZ"`). `Curl.Get` lo entrega como texto que **incluye las comillas**, y `Ok(string)` lo vuelve a serializar → el cuerpo final es `"\"JUAN PEREZ\""`. **Hay evidencia directa de que el frontend convive con este defecto:** `MAGENTO_WEB_ADOBE/app/code/Mavi/WholesaleAccount/Model/Api/WholesaleAccountManagement.php` líneas **154–155** ejecuta
   ```php
   $intelisisResponse = str_replace("\"", "", $intelisisResponse);
   return str_replace("\\", "", $intelisisResponse);
   ```
   es decir, **el consumidor limpia a mano comillas y backslashes**. Al migrar debe entregarse un DTO tipado y eliminarse ese parche del lado Magento.

3. **`BadRequest` para "no encontrado" es semánticamente incorrecto.** Una cuenta con formato válido que simplemente no existe en `Cte` debe ser **404**, no 400. Hoy 400 significa a la vez "formato inválido", "no existe" y (por la obs. 1) "la base falló".

4. **El constructor de `Curl` ya depende de SAP.** `Curl()` (`Curl.cs:57–91`) hace `UploadString(IpSAP + "login/auth", ...)` y **relanza** la excepción si falla (`throw;`, línea 89). Por lo tanto **este endpoint legacy, que ni siquiera toca SAP, cae con HTTP 500 si el login de ServicioSAP está caído**. Acoplamiento no intencional introducido por la unificación de token.

5. **Puente a SAP (Regla #16) — BLOQUEANTE TÉCNICO.** `Helper/Curl.cs` expone `Post`, `PostSAP` (línea 115), `PatchSAP` (línea 152), `PostWithoutThrowingError` (línea 187) y `Get` (línea 210), pero **no existe ningún `GetSAP`**. Como este endpoint es `GET`, la conversión `curl.Get(...)` → `curl.GetSAP(...)` **no es posible con el helper actual**: hay que implementar el método (o exponer el destino en ServicioSAP como `[HttpPost]`, lo que rompería la semántica REST del recurso). Es un requisito previo a la migración, no un detalle.

6. **Método síncrono:** debe migrar a `async/await` (Regla #12).

7. **Sin `Logger`.** No hay trazabilidad alguna en la DMZ: no se registra la cuenta consultada ni el resultado (Regla #8).

8. **Sin guarda de `null`/vacío antes de la regex.** `regex.IsMatch(null)` lanza `ArgumentNullException`. En la práctica el enrutamiento de Web API no permite un segmento vacío en `{wholesaleAccount}`, por lo que el escenario no es alcanzable por HTTP, pero la defensa no existe.

9. **Sobrecarga de nombre confusa:** `GetWholesaleAccount` aparece dos veces en la clase (línea 18 para el GET, línea 45 para el `POST negotiable-quote/create`). El enrutamiento funciona porque ambos `[Route]` son explícitos, pero el nombre debe corregirse al migrar. Ver [[Post_NegotiableQuoteCreate_Mapping]].

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #WholesaleCustomerController #GetWholesaleCustomer #bloqueante
