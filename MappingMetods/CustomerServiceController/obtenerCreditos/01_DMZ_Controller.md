# Mapeo del Método: `POST /customerService/obtenerCreditos` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `obtenerCreditos(ObtenerCreditosRequest request)` — Líneas 103–110
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecución

1. Recibe petición `POST` con `ObtenerCreditosRequest`.
2. Llama a LAN vía `curl.Post("customerService/obtenerCreditos", json)`.
3. Retorna envuelto en `Ok(...)`.

## Interacciones con Base de Datos

**Ninguna.**
