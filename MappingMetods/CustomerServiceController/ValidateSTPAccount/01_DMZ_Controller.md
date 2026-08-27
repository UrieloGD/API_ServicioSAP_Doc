# Mapeo del Método: `GET /customerService/ValidateSTPAccount` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `ValidateSTPAccount(string clientNumber)` — Líneas 239–246
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecución

1. Recibe petición `GET` con el parámetro `clientNumber` por query string.
2. Llama a LAN vía `curl.Get("customerService/validateSTPAccount?clientNumber=" + clientNumber)`.
3. Retorna envuelto en `Ok(response)`.

## Interacciones con Base de Datos

**Ninguna.**

Ver tablas globales en: [[../_GLOBAL_CustomerServiceController_DB.csv]]
