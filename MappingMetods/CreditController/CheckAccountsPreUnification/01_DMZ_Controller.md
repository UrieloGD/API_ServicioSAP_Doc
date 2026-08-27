# Mapeo del Método: `POST /credit/CheckAccountsPreUnification` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CreditController.cs`
**Método:** `CheckAccountsPreUnification(UnificationWalletDataRequest data)` — Líneas **247–253**
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada puro.

---

## Flujo de Ejecución

1. Recibe petición `POST` con el body `UnificationWalletDataRequest` (`IdEcommerce`, `ClienteCredito`, `ClienteContado`). **No valida** el request (ni `null`, ni contenido) en esta capa.
2. Instancia `Curl` (`WebApiMagento.Helper.Curl`) y reenvía a LAN:
   ```csharp
   string response = curl.Post("credit/CheckAccountsPreUnification", JsonConvert.SerializeObject(data)).Trim('"');
   ```
   La URL base y credenciales se resuelven desde `ConfigurationManager.AppSettings["URL_INTELISIS"]` / `["USER_INTELISIS"]` / `["DOMINIO_LAN"]` (Regla #7: sin hardcodeo).
3. Aplica `.Trim('"')` al texto crudo para desenvolver el JSON string, y retorna `Ok(response)`.

## Interacciones con Base de Datos

**Ninguna.**

## Observaciones técnicas detectadas

- **Respuesta como texto, no booleano:** LAN devuelve un booleano JSON (`true`/`false`) vía `Json(...)`; el `.Trim('"')` lo convierte en el **string** `"true"` / `"false"` y se envuelve en `Ok(...)`. El consumidor recibe texto, no un booleano tipado. Mismo patrón que los endpoints hermanos `GetUnificationWalletStatus` y `SetUnificationWalletData`.
- **Sin validación de `null`:** a diferencia de otros endpoints del proyecto (que lanzan `HttpResponseException(HttpStatusCode.BadRequest)` cuando el request es `null`), aquí un body vacío se serializa como `null` y viaja a LAN.
- **Sin manejo de errores:** no hay `try/catch`; una falla de `Curl` propaga la excepción sin log.
- **Método síncrono:** debe migrar a `async/await` (Regla #12).
- **Puente a SAP:** al migrar, debe usarse `curl.PostSAP(...)` y el endpoint destino en ServicioSAP declararse `[HttpPost]` (Regla #16). Este endpoint ya es `POST`, por lo que la conversión es directa.

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #CreditController #CheckAccountsPreUnification
