# Mapeo del Método: `POST /customerService/LoginClienteCreditoFechaN` — Capa LAN (Dispatcher)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `LoginClienteCreditoFechaN(LoginClienteCreditoFechaNRequest request)` — Líneas 180–185
**Capa:** LAN (Nexo)
**Rol en el flujo:** Recibe la petición desde la DMZ y delega a la capa de negocio.

---

## Flujo de Ejecución
1. Recibe el `LoginClienteCreditoFechaNRequest`.
2. Llama al método estático `CustomerServiceMethods.LoginClienteCreditoFechaN(request)`.
3. Deserializa la respuesta recibida y la retorna envuelta en un `Ok()`.
