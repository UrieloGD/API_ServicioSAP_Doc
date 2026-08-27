# Mapeo del Método: `GET /customerService/ValidateSTPAccount` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `ValidateSTPAccount(string clientNumber)` — Líneas 202–206
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher.

---

## Flujo de Ejecución

1. Recibe petición `GET`.
2. Llama a `CustomerServiceMethods.ValidateSTPAccount(clientNumber)`.
3. Retorna envuelto en `Json(...)`.

## Interacciones con Base de Datos

**Ninguna directa.**
