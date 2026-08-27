# Mapeo del Método: `GET /credit/getClienteSaldo/{cliente}` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CreditController.cs`
**Método:** `getClienteSaldo(string cliente)` — Líneas **18–41**
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada + normalización de la respuesta.

---

## Flujo de Ejecución

1. Recibe petición `GET` con el parámetro de ruta `{cliente}`. **No valida** el formato del cliente en esta capa (la validación Regex vive en LAN).
2. Instancia `Curl` (`WebApiMagento.Helper.Curl`) y llama a LAN vía `curl.Get("credit/getClienteSaldo/" + cliente)`. La URL base y credenciales se resuelven desde `ConfigurationManager.AppSettings["URL_INTELISIS"]` / `["USER_INTELISIS"]` / `["DOMINIO_LAN"]` (Regla #7: sin hardcodeo).
3. **Traducción de respuestas de negocio a códigos HTTP** (inspección por substring sobre el texto crudo):
   - Si la respuesta contiene `"No tiene facturas"` → `Ok("No tiene facturas")` (200).
   - Si la respuesta contiene `"El cliente es incorrecto"` → `BadRequest("No existe el cliente")` (400). **Nota:** el texto se reescribe aquí; LAN dice "El cliente es incorrecto", DMZ responde "No existe el cliente".
4. Intenta `JObject.Parse(response.Trim('"'))` dentro de un `try/catch`. Si falla el parseo → `InternalServerError()` (500), con un `//TODO LOG` pendiente (no se registra el error).
5. Si el parseo es válido, **vuelve a ejecutar** `JObject.Parse(response.Trim('"'))` y retorna `Ok(...)`.

## Interacciones con Base de Datos

**Ninguna.**

## Observaciones técnicas detectadas

- **Doble parseo:** `JObject.Parse` se ejecuta dos veces sobre el mismo string (una para validar en el `try`, otra en el `return`). El resultado del primer parseo se descarga sin usarse.
- **Detección frágil por substring:** `response.Contains("No tiene facturas")` haría match también si esa cadena apareciera dentro de un campo de datos (p. ej. en un `NombreCliente`), devolviendo un falso positivo.
- **Excepción silenciada:** la variable `e` del `catch` se captura pero nunca se usa; el `//TODO LOG` sigue abierto.
- **Método síncrono:** debe migrar a `async/await` (Regla #12).
- **Puente a SAP:** al migrar, este proxy debe usar `curl.PostSAP(...)` y el endpoint destino en ServicioSAP debe declararse `[HttpPost]` (Regla #16), lo que implica cambiar este `[HttpGet]` con parámetro de ruta por un `POST` con body.

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #CreditController #getClienteSaldo
