# Mapeo del Método: `POST /customerService/obtenerTipoGarantia` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `obtenerTipoGarantia(TipoGarantiaRequest request)` — Líneas 15–21
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher.

---

## Flujo de Ejecución

1. Recibe petición `POST`.
2. Llama a `CustomerServiceMethods.obtenerTipoGarantia(request)`.
3. Retorna deserializado envuelto en `Ok(...)`.

## Interacciones con Base de Datos

**Ninguna directa.**
