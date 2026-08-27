# Mapeo del Método: `POST /customerService/nombreCliente` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `nombreCliente(NombreClienteRequest request)` — Líneas 55–61
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher.

---

## Flujo de Ejecución

1. Recibe petición `POST`.
2. Llama a `CustomerServiceMethods.nombreCliente(request)`.
3. Retorna deserializado envuelto en `Ok(...)`.

## Interacciones con Base de Datos

**Ninguna directa.**
