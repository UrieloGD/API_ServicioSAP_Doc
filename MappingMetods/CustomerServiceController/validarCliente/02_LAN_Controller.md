# Mapeo del Método: `POST /customerService/validarCliente` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `validarCliente(ValidarClienteRequest request)` — Líneas 46–52
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher.

---

## Flujo de Ejecución

1. Recibe petición `POST`.
2. Llama a `CustomerServiceMethods.validarCliente(request)`.
3. Retorna deserializado envuelto en `Ok(...)`.

## Interacciones con Base de Datos

**Ninguna directa.**
