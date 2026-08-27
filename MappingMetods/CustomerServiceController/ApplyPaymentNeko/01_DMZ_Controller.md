# Mapeo del Método: `POST /customerService/ApplyPaymentNeko` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `ApplyPaymentNeko(ApplyPaymentRequest request)`
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Punto de entrada público. Actúa como proxy de seguridad y retransmisor hacia LAN.

---

## Flujo de Ejecución

1. Recibe el `POST` entrante con el cuerpo `ApplyPaymentRequest` deserializado automáticamente por el framework.
2. Loguea el request completo serializado en JSON usando `Logger.PaymentBBVA("INFO ", ...)` → archivo `paymentbbva.log`.
3. Valida que el request no sea `null`; si lo es, lanza `HttpResponseException(HttpStatusCode.BadRequest)`.
4. Instancia la clase `Curl` y llama a `curl.PostWithoutThrowingError("customerService/ApplyPaymentNeko", json)`.
   - **IMPORTANTE:** Usa `PostWithoutThrowingError` en lugar de `Post` para capturar errores de red sin lanzar excepción automática.
5. Loguea la respuesta recibida de LAN usando `Logger.PaymentBBVA("INFO ", "[Response] " + ...)`.
6. Verifica el tipo del objeto `response`:
   - Si es `System.Net.WebException` → retorna `HTTP 500 InternalServerError`.
   - Si no → retorna `HTTP 200 Ok(response)`.

## Interacciones con Base de Datos

**Ninguna.** Esta capa no toca la base de datos directamente. Solo actúa como proxy.

Ver tablas globales en: [[../_GLOBAL_CustomerServiceController_DB.csv]]

## Ejemplo de Request Body

```json
{
  "ClientNumber": "CLI001234",
  "Reference": "BBVA20240730ABC",
  "Debts": [
    {
      "CanalVenta": "41",
      "mov": "Factura",
      "id_factura": "F-000985",
      "abono": "3500.00"
    },
    {
      "CanalVenta": "41",
      "mov": "Factura",
      "id_factura": "F-000986",
      "abono": "1250.50"
    }
  ]
}
```

> **Nota sobre `Reference`:** El campo se usa como base. La capa LAN genera una referencia única por cada debt concatenando el índice + 1. Para el ejemplo anterior se generarán: `"BBVA20240730ABC1"` y `"BBVA20240730ABC2"`.

## Ejemplo de Response

### ✅ Caso Exitoso — Todos los debts insertados

```
HTTP 200 OK
(Sin cuerpo de respuesta)
```

### ❌ Caso de Referencia Duplicada — El debt ya fue registrado

```
HTTP 500 Internal Server Error
(Sin cuerpo de respuesta)
```

> El endpoint detecta en la capa LAN que `"BBVA20240730ABC1"` ya existe en `CXCCFacturaMultipagoBBVA` y retorna `false`, lo que provoca el 500.

### ❌ Caso de Error de Red / Timeout hacia LAN

```
HTTP 500 Internal Server Error
(Sin cuerpo de respuesta)
```

> `curl.PostWithoutThrowingError()` captura la excepción sin lanzarla y retorna un objeto `System.Net.WebException`. DMZ detecta el tipo y retorna 500.
