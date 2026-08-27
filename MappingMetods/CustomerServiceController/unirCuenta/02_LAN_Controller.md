# Mapeo del Método: `POST /customerService/unirCuenta` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `unirCuenta(UnirCuentaRequest request)` — Líneas 37–43
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher.

---

## Flujo de Ejecución

1. Recibe petición `POST`.
2. Llama a `CustomerServiceMethods.unirCuenta(request)`.
3. Retorna bool envuelto en `Ok(...)`.

## Interacciones con Base de Datos

**Ninguna directa.**
