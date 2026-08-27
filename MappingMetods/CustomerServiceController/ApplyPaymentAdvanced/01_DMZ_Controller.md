# Mapeo del Método: `POST /customerService/ApplyPaymentAdvanced` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `ApplyPaymentAdvanced(ApplyPaymentRequest request)` — Líneas 157–167
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Punto de entrada público. Actúa como proxy de seguridad y retransmisor hacia LAN.

---

## Flujo de Ejecución

1. Recibe el `POST` entrante con el cuerpo `ApplyPaymentRequest` deserializado.
2. Loguea el request completo serializado usando `Logger.PaymentBBVA("INFO ", ...)`.
3. Valida que el request no sea `null`; si lo es, lanza `HttpResponseException(HttpStatusCode.BadRequest)`.
4. Instancia la clase `Curl` y llama a `curl.PostWithoutThrowingError("customerService/ApplyPaymentAdvanced", json)`.
   - **IMPORTANTE:** Usa `PostWithoutThrowingError` para capturar excepciones de red internamente.
5. Loguea la respuesta recibida de LAN usando `Logger.PaymentBBVA("INFO ", "[Response] " + ...)`.
6. Verifica el tipo del objeto `response`:
   - Si es `System.Net.WebException` → retorna `HTTP 500 InternalServerError`.
   - Si no → retorna `HTTP 200 Ok(response)`.

## Interacciones con Base de Datos

**Ninguna.** Esta capa solo actúa como proxy.

Ver tablas globales en: [[../_GLOBAL_CustomerServiceController_DB.csv]]

## Ejemplo de Request Body

```json
{
  "ClientNumber": "CLI001234",
  "Reference": "BBVA20240730ADV",
  "Debts": [
    {
      "CanalVenta": "41",
      "mov": "Factura",
      "id_factura": "F-000985",
      "abono": "3500.00"
    }
  ]
}
```

## Ejemplo de Response

### ✅ Caso Exitoso

```
HTTP 200 OK
(Sin cuerpo de respuesta)
```

### ❌ Caso de Error / Excepción SQL

```
HTTP 500 Internal Server Error
(Sin cuerpo de respuesta)
```

> A diferencia de `ApplyPaymentNeko`, este método en la capa LAN **no realiza validación anti-duplicados** antes del INSERT, por lo que las Referencias duplicadas causarán una excepción SQL (que derivará en un HTTP 500 general) en lugar de un `false` controlado.
