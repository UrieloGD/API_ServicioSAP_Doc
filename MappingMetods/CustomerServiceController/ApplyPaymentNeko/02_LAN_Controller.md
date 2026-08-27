# Mapeo del Método: `POST /customerService/ApplyPaymentNeko` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `ApplyPaymentNeko(ApplyPaymentRequest request)` — Líneas 106–114
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher. Recibe el request de DMZ y delega la lógica al método de negocio.

---

## Flujo de Ejecución

1. Recibe el `POST` reenviado desde DMZ con el cuerpo `ApplyPaymentRequest`.
2. Llama directamente al método estático de negocio: `CustomerServiceMethods.ApplyPaymentNeko(request)`.
3. Evalúa el booleano devuelto:
   - Si `true` → retorna `HTTP 200 Ok()` (sin cuerpo).
   - Si `false` → retorna `HTTP 500 InternalServerError()`.
4. No tiene manejo de `null`-check explícito en este controlador (la validación se asume desde DMZ).

## Interacciones con Base de Datos

**Ninguna directa.** Toda la lógica de datos está encapsulada en `CustomerServiceMethods.ApplyPaymentNeko`.

Ver tablas globales en: [[../_GLOBAL_CustomerServiceController_DB.csv]]

## Métodos que llama

| Método | Clase | Descripción |
|---|---|---|
| `ApplyPaymentNeko(request)` | `CustomerServiceMethods` | Contiene toda la lógica de negocio e interacción con BD |

## Response

**Éxito:** `HTTP 200 OK` (sin cuerpo)
**Fallo / excepción en business logic:** `HTTP 500 InternalServerError`
