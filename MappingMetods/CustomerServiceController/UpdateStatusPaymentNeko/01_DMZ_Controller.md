# Mapeo del Método: `POST /customerService/UpdateStatusPaymentNeko` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Nombre del método en código:** `UpdateStatusPayment(UpdateStatusPaymentNekoRequest request)` ⚠️
**Ruta expuesta:** `[Route("UpdateStatusPaymentNeko")]`
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de seguridad. Retransmite el request a LAN y devuelve la respuesta textual.

> ⚠️ **Deuda Técnica — Nombre inconsistente:** El método en código se llama `UpdateStatusPayment` pero la ruta es `UpdateStatusPaymentNeko`. Puede causar confusión en revisiones de código.

---

## Flujo de Ejecución

1. Recibe el `POST` con el cuerpo `UpdateStatusPaymentNekoRequest` deserializado.
2. Valida que `request != null`; si lo es, lanza `HttpResponseException(HttpStatusCode.BadRequest)`.
3. Instancia `Curl` y llama a `curl.Post("customerService/UpdateStatusPaymentNeko", json)`.
   - Usa `Post()` estándar (no `PostWithoutThrowingError`). Si LAN falla de red, la excepción se propaga.
   - **Sin logging `PaymentBBVA`** en esta capa (diferencia con ApplyPaymentNeko).
4. Retorna directamente `Ok(response)` con el string textual devuelto por LAN.

## Interacciones con Base de Datos

**Ninguna.** Solo proxy.

Ver tablas globales en: [[../_GLOBAL_CustomerServiceController_DB.csv]]

## Ejemplo de Request Body

**Escenario A — Pago exitoso:**
```json
{
  "Reference": "BBVA20240730ABC1",
  "Success": true
}
```

**Escenario B — Pago fallido:**
```json
{
  "Reference": "BBVA20240730ABC1",
  "Success": false
}
```

> **Nota sobre `Reference`:** Se envía **una sola referencia indexada**. LAN quita el último carácter y hace `LIKE` para actualizar todas las deudas del mismo grupo.

## Ejemplo de Response

### ✅ Registros actualizados

```
HTTP 200 OK
"Status has been updated."
```

### ❌ Sin filas afectadas

```
HTTP 200 OK
"Status could not be updated."
```

### ❌ Excepción SQL (silenciosa)

```
HTTP 200 OK
""
```

> El endpoint retorna HTTP 200 incluso en error SQL. El cliente debe leer el cuerpo para conocer el resultado real.
