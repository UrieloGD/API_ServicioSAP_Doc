# Mapeo del Método: `POST /customerService/UpdateStatusPaymentAdvanced` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `UpdateStatusPaymentAdvanced(UpdateStatusPaymentAdvancedRequest request)` — Líneas 135–139
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher minimalista. Sin validación de null. Delega directamente al método de negocio.

---

## Flujo de Ejecución

1. Recibe el `POST` reenviado desde DMZ.
2. Llama directamente a `CustomerServiceMethods.UpdateStatusPaymentAdvanced(request)`.
3. Envuelve el string devuelto en `Ok(...)` y lo retorna a DMZ.
4. **Sin validación de null** en este controlador.

## Interacciones con Base de Datos

**Ninguna directa.**

Ver tablas globales en: [[../_GLOBAL_CustomerServiceController_DB.csv]]

## Métodos que llama

| Método | Clase | Descripción |
|---|---|---|
| `UpdateStatusPaymentAdvanced(request)` | `CustomerServiceMethods` | Lógica de UPDATE en BD |

## Response

| Caso | HTTP Status | Cuerpo |
|---|---|---|
| Ya registrado | 200 OK | `"Payment already registered"` |
| Registros actualizados | 200 OK | `"Status has been updated."` |
| Sin filas afectadas | 200 OK | `"Status could not be updated."` |
| SqlException | 200 OK | `""` (vacío) |
