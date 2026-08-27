# Mapeo del Método: `POST /customerService/obtenerTipoGarantia` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `obtenerTipoGarantia(TipoGarantiaRequest request)` — Líneas 21–28
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecución

1. Recibe petición `POST` con `TipoGarantiaRequest`.
2. Llama a LAN vía `curl.Post("customerService/obtenerTipoGarantia", json)`.
3. Retorna envuelto en `Ok(...)`.

## Interacciones con Base de Datos

**Ninguna.**
