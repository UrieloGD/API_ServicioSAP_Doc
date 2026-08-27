# Mapeo del Método: `POST /customerService/ObtenerEstatusEmbarque` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `ObtenerEstatusEmbarque(EstatusEmbarqueRequest request)` — Líneas **310–320**
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada con guarda de `null`. Es el punto de entrada del **gate de cancelación de pedidos** de Magento.
**Región:** `#region Embarque estatus` (líneas 308–322)

---

## Flujo de Ejecución

1. Recibe petición `POST` con el body `EstatusEmbarqueRequest` (`IdEcommerce`). El controlador está decorado con `[Authorize]` y `[RoutePrefix("customerService")]` (líneas **14–15**).
2. **Valida `null`:** si el body llega vacío lanza `HttpResponseException(HttpStatusCode.BadRequest)` → **HTTP 400**.
   ```csharp
   if (request == null)
       throw new HttpResponseException(HttpStatusCode.BadRequest);
   ```
   > La validación es únicamente de instancia. Un body `{ }` con `IdEcommerce = null` **pasa el filtro** y llega hasta la LAN, donde se concatena a un SQL (ver [[03_BusinessMethod]] obs. 1).
3. Instancia `Curl` (`WebApiMagento.Helper.Curl`) y reenvía a LAN:
   ```csharp
   var curl = new Curl();
   var response = curl.Post("customerService/ObtenerEstatusEmbarque",
       JsonConvert.SerializeObject(request));
   ```
   La URL base, usuario y hosts confiables se resuelven de `ConfigurationManager.AppSettings["URL_INTELISIS"]` / `["USER_INTELISIS"]` / `["DOMINIO_LAN"]` (Regla #7: sin hardcodeo) — ver `Helper/Curl.cs` líneas **22–33**.
4. Deserializa la respuesta cruda y la retorna: `return Ok(JsonConvert.DeserializeObject(response));`

## Interacciones con Base de Datos

**Ninguna.** La DMZ no abre ninguna conexión SQL en este endpoint; toda la persistencia ocurre en [[03_BusinessMethod]].

## Modelo de entrada (espejo)

`APIMagentoDMZ/WebApiMagento/Models/CustomerServiceRequest.cs` líneas **139–142**:

| Campo | Tipo |
|---|---|
| `IdEcommerce` | string |

Idéntico al modelo LAN (`APIMagento/WebApiMagento/Models/CustomerServiceRequest.cs` líneas **133–136**). Nótese que el nombre de la región en DMZ es `#region Obtener Estatus Embarque` (línea 137) vs. `#region Embarque Estatus` (línea 131) en LAN — inconsistencia cosmética.

## Observaciones técnicas detectadas

1. **La respuesta útil de este endpoint es un booleano JSON plano (`true` / `false`), no un objeto.** `JsonConvert.DeserializeObject("true")` produce un `JValue` booleano y la DMZ responde `HTTP 200` con cuerpo `true`. El contrato no tiene envolvente ni código de error: **un `false` puede significar tres cosas distintas** (ver [[03_BusinessMethod]] §Ejemplo de Respuesta).

2. **`Curl.Post` convierte cualquier fallo de red o HTTP 500 de la LAN en texto de excepción, no en error.** `Helper/Curl.cs` líneas **108–111**:
   ```csharp
   } catch(Exception e)
   {
       return e.ToString();
   }
   ```
   Ese `e.ToString()` (con stack trace completo) entra como `response` a `JsonConvert.DeserializeObject(response)` de la línea 319, que **no está en `try/catch`** → `JsonReaderException` no capturada → **HTTP 500 con stack trace en la DMZ**. Como el método de negocio en LAN **no tiene `try/catch` alguno** (a diferencia de casi todos sus vecinos), cualquier `SqlException` recorre esta cadena completa. Es el punto de falla más grave de la capa.

3. **Fuga de información en el camino de error.** El `e.ToString()` del punto 2 incluye tipo de excepción, mensaje y stack trace de la DMZ; si en algún momento se envolviera la deserialización en un `try/catch` que devolviera el texto, se expondría infraestructura interna al llamador. Debe normalizarse a un error tipado antes de migrar.

4. **`webClient.Timeout = 9999999`** (~2.7 horas, `Curl.cs` línea 103). Un bloqueo en LAN retiene el hilo de IIS de la DMZ prácticamente sin límite. Combinado con el `CommandTimeout = 99999` del método de negocio, no hay ningún corte efectivo en toda la cadena.

5. **Método síncrono:** debe migrar a `async/await` (Regla #12). Prohibido `.Result` / `.Wait()`.

6. **Puente a SAP (Regla #16):** al migrar, `curl.Post(...)` de la línea 317 debe convertirse en `curl.PostSAP(...)` (ya disponible en `Curl.cs` línea **115**, con manejo de `WebException` y lectura del cuerpo de error — mejor que `Post`) y el endpoint destino en ServicioSAP debe declararse `[HttpPost]`. Este endpoint ya es `POST`, por lo que la conversión de verbo es directa. **Nota:** `PostSAP` también retorna el error como `string` (`"WebException: ..."`), así que el problema del punto 2 **no se resuelve solo con el cambio de método**; requiere manejo explícito en el controlador.

7. **Superficie expuesta a Internet.** El consumidor real es Magento (`MAGENTO_WEB_ADOBE/app/code/Mavi/ShipmentStatus/etc/webapi.xml` líneas **4–9**), donde una de las dos rutas está declarada `<resource ref="anonymous"/>`. Es decir, el `IdEcommerce` que termina **concatenado sin parametrizar** en el SQL de la LAN (ver [[03_BusinessMethod]] obs. 1) es controlable por un llamador **no autenticado**. Aunque medien dos saltos, esto eleva el hallazgo de inyección de "deuda técnica" a **riesgo de seguridad real**.

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #CustomerServiceController #ObtenerEstatusEmbarque #bloqueante
