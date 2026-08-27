# Mapeo del Método: `POST /customerService/validarCoberturaPorCP` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `ValidarCoberturaPorCP(ValidarCoberturaPorCPRequest request)` — Líneas 286–293
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecución

1. Recibe petición `POST` con `ValidarCoberturaPorCPRequest`.
2. Llama a LAN vía `curl.Post("customerService/validarCoberturaPorCP", json)`.
3. Retorna envuelto en `Ok(...)`.

## Interacciones con Base de Datos

**Ninguna.**
