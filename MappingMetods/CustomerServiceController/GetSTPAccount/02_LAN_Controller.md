# Mapeo del Método: `POST /customerService/GetSTPAccount` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `GetSTPAccount(GetSTPAccountRequest request)` — Líneas 188–192
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher.

---

## Flujo de Ejecución

1. Recibe petición `POST`.
2. Llama a `CustomerServiceMethods.GetSTPAccount(request)`.
3. Retorna envuelto en `Json(...)`.

## Interacciones con Base de Datos

**Ninguna directa.**
