# Mapeo del Método: `POST /customerService/UpdateStatusPaymentAdvanced` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Nombre del método en código:** `UpdateStatusPayment(UpdateStatusPaymentAdvancedRequest request)` ⚠️
**Ruta expuesta:** `[Route("UpdateStatusPaymentAdvanced")]`
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de seguridad. Retransmite el request a LAN y devuelve la respuesta textual.

> ⚠️ **Deuda Técnica — Nombre inconsistente:** Al igual que el método Neko, el método en código se llama `UpdateStatusPayment` (sobrecargado o nombrado similar) pero la ruta es `UpdateStatusPaymentAdvanced`. Puede causar confusión. Además, recibe `UpdateStatusPaymentAdvancedRequest`.

---

## Flujo de Ejecución

1. Recibe el `POST` con el cuerpo `UpdateStatusPaymentAdvancedRequest` deserializado.
2. Valida que `request != null`; si lo es, lanza `HttpResponseException(HttpStatusCode.BadRequest)`.
3. Instancia `Curl` y llama a `curl.Post("customerService/UpdateStatusPaymentAdvanced", json)`.
   - Usa `Post()` estándar (no `PostWithoutThrowingError`).
   - **Sin logging `PaymentBBVA`** en esta capa.
4. Retorna directamente `Ok(response)` con el string textual devuelto por LAN.

## Interacciones con Base de Datos

**Ninguna.** Solo proxy.

Ver tablas globales en: [[../_GLOBAL_CustomerServiceController_DB.csv]]

## Ejemplo de Request Body

**Escenario A — Pago exitoso:**
```json
{
  "mp_reference": "BBVA20240730ADV",
  "mp_response": "00"
}
```

**Escenario B — Pago fallido:**
```json
{
  "mp_reference": "BBVA20240730ADV",
  "mp_response": "01"
}
```

## Ejemplo de Response

### ✅ Registros actualizados

```
HTTP 200 OK
"Status has been updated."
```

### ❌ Pago ya registrado / Sin filas afectadas

```
HTTP 200 OK
"Payment already registered"
```
o
```
HTTP 200 OK
"Status could not be updated."
```

### ❌ Excepción SQL (silenciosa)

```
HTTP 200 OK
""
```
