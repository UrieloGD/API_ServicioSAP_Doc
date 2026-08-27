# Mapeo del Método: `POST /customerService/unirCuenta` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `unirCuenta(UnirCuentaRequest request)` — Líneas 50–57
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecución

1. Recibe petición `POST` con `UnirCuentaRequest`.
2. Llama a LAN vía `curl.Post("customerService/unirCuenta", json)`.
3. Retorna envuelto en `Ok(...)`.

## Interacciones con Base de Datos

**Ninguna.**
