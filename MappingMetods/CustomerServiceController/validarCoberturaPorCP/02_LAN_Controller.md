# Mapeo del Método: `POST /customerService/validarCoberturaPorCP` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `ValidarCoberturaPorCP(ValidarCoberturaPorCPRequest request)` — Líneas 231–237
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher.

---

## Flujo de Ejecución

1. Recibe petición `POST`.
2. Llama a `CustomerServiceMethods.ValidarCoberturaPorCP(request)`.
3. Retorna JSON directo a través de `Ok(JsonConvert.DeserializeObject(...))`.

## Interacciones con Base de Datos

**Ninguna directa.**
