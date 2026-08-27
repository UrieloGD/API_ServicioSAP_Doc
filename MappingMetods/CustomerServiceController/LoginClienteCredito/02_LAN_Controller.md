# Mapeo del Método: `POST /customerService/LoginClienteCredito` — Capa LAN (Dispatcher)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `LoginClienteCredito(LoginClienteCreditoRequest request)` — Líneas 173–178
**Capa:** LAN (Nexo)
**Rol en el flujo:** Expone el endpoint interno y delega la lógica de negocio a `CustomerServiceMethods`.

---

## Flujo de Ejecución
1. Recibe el `LoginClienteCreditoRequest`.
2. Invoca directamente el método estático `CustomerServiceMethods.LoginClienteCredito(request)`.
3. Deserializa el string retornado por el método de negocio usando `JsonConvert.DeserializeObject`.
4. Retorna el resultado envuelto en un objeto `Ok()`.

## Interacciones con Base de Datos
**Ninguna de forma directa.** 
Delega a la capa de negocio.
