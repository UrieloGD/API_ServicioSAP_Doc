# Mapeo del Método: `GET /customerService/bbvaKeyAdvanced` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `GetBBVAKeyAdvanced()` — Líneas 266–273
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecución

1. Recibe petición `GET` (sin parámetros).
2. Llama a LAN vía `curl.Get("customerService/bbvaKeyAdvanced")`.
3. Retorna directamente `Ok(response)`.

## Interacciones con Base de Datos

**Ninguna.**
