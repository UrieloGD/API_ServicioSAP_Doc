# Mapeo del Método: `GET /customerService/bbvaKeyNeko` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `GetBBVAKeyNeko()` — Líneas 249–256
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecución

1. Recibe petición `GET` (sin parámetros).
2. Llama a LAN vía `curl.Get("customerService/bbvaKeyNeko")`.
3. Retorna directamente `Ok(response)`.

## Interacciones con Base de Datos

**Ninguna.**

Ver tablas globales en: [[../_GLOBAL_CustomerServiceController_DB.csv]]
