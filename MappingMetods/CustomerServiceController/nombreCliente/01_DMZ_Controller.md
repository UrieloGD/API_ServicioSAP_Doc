# Mapeo del Método: `POST /customerService/nombreCliente` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `nombreCliente(NombreClienteRequest request)` — Líneas 74–81
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecución

1. Recibe petición `POST` con `NombreClienteRequest`.
2. Llama a LAN vía `curl.Post("customerService/nombreCliente", json)`.
3. Retorna envuelto en `Ok(...)`.

## Interacciones con Base de Datos

**Ninguna.**
