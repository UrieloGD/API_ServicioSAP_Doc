# Mapeo del Método: `POST /customerService/ApplyPaymentAdvanced` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `ApplyPaymentAdvanced(ApplyPaymentRequest request)` — Líneas 117–125
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher. Recibe el request de DMZ y delega la lógica al método de negocio.

---

## Flujo de Ejecución

1. Recibe el `POST` reenviado desde DMZ con el cuerpo `ApplyPaymentRequest`.
2. Llama directamente al método estático de negocio: `CustomerServiceMethods.ApplyPaymentAdvanced(request)`.
3. Evalúa el booleano devuelto:
   - Si `true` → retorna `HTTP 200 Ok()` (sin cuerpo).
   - Si `false` → retorna `HTTP 500 InternalServerError()`.
4. No tiene manejo de `null`-check explícito en este controlador.

## Interacciones con Base de Datos

**Ninguna directa.** 

Ver tablas globales en: [[../_GLOBAL_CustomerServiceController_DB.csv]]

## Métodos que llama

| Método | Clase | Descripción |
|---|---|---|
| `ApplyPaymentAdvanced(request)` | `CustomerServiceMethods` | Contiene toda la lógica de negocio e interacción con BD |

## Response

**Éxito:** `HTTP 200 OK` (sin cuerpo)
**Fallo / excepción:** `HTTP 500 InternalServerError`
