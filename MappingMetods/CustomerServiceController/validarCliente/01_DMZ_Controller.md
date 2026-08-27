# Mapeo del Método: `POST /customerService/validarCliente` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `validarCliente(ValidarClienteRequest request)` — Líneas 62–69
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecución

1. Recibe petición `POST` con `ValidarClienteRequest`.
2. Llama a LAN vía `curl.Post("customerService/validarCliente", json)`.
3. Retorna envuelto en `Ok(...)`.

## Interacciones con Base de Datos

**Ninguna.**
