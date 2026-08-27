# Mapeo del Método: `POST /customerService/obtenerVentanaConfirmacion` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `obtenerVentanaConfirmacion(VentanaConfirmacionRequest request)` — Líneas **32–43**
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada con guarda de `null`.
**Región:** `#region Garantías`

---

## Flujo de Ejecución

1. Recibe petición `POST` con el body `VentanaConfirmacionRequest` (`order_id`). El controlador está decorado con `[Authorize]` y `[RoutePrefix("customerService")]`.
2. **Valida `null`:** si el body llega vacío lanza `HttpResponseException(HttpStatusCode.BadRequest)` → **HTTP 400**.
   ```csharp
   if (request == null)
       throw new HttpResponseException(HttpStatusCode.BadRequest);
   ```
   > A diferencia de otros endpoints del proyecto (ej. [[CheckAccountsPreUnification]]), aquí **sí** existe la guarda. La validación es únicamente de instancia: un body `{ }` con `order_id = null` pasa el filtro.
3. Instancia `Curl` (`WebApiMagento.Helper.Curl`) y reenvía a LAN:
   ```csharp
   string response = curl.Post("customerService/obtenerVentanaConfirmacion",
       JsonConvert.SerializeObject(request));
   ```
   La URL base y credenciales se resuelven desde `ConfigurationManager.AppSettings["URL_INTELISIS"]` / `["USER_INTELISIS"]` / `["DOMINIO_LAN"]` (Regla #7: sin hardcodeo) — ver `Helper/Curl.cs` líneas 22–32.
4. Deserializa la respuesta cruda y la retorna: `return Ok(JsonConvert.DeserializeObject(response));`

## Interacciones con Base de Datos

**Ninguna.**

## Observaciones técnicas detectadas

- **`JsonConvert.DeserializeObject(response)` sin `try/catch`.** Es el punto de falla más grave de esta capa. Como el método de negocio en LAN devuelve **el texto plano de `e.Message`** cuando ocurre una excepción (ver [[03_BusinessMethod]] obs. 1), ese texto llega aquí y **no es JSON válido** → `JsonReaderException` no capturada → **HTTP 500** con stack trace. Un fallo de BD en LAN se convierte en un 500 opaco en la DMZ.
- **Respuesta vacía se convierte en `null`.** Si la consulta no encuentra el pedido, LAN devuelve `""`; `DeserializeObject("")` retorna `null` y la DMZ responde **HTTP 200 con cuerpo vacío**. El consumidor no puede distinguir "pedido inexistente" de "todo bien pero sin datos".
- **Método síncrono:** debe migrar a `async/await` (Regla #12).
- **Puente a SAP:** al migrar, debe usarse `curl.PostSAP(...)` (ya disponible en `Curl.cs` línea 115) y el endpoint destino en ServicioSAP declararse `[HttpPost]` (Regla #16). Este endpoint ya es `POST`, por lo que la conversión es directa.
- **Endpoint hermano en la misma región:** `obtenerTipoGarantia` (líneas 20–30) comparte estructura idéntica. Ver [[obtenerTipoGarantia]].

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #CustomerServiceController #obtenerVentanaConfirmacion
