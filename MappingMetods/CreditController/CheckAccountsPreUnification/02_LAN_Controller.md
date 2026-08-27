# Mapeo del Método: `POST /credit/CheckAccountsPreUnification` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CreditController.cs`
**Método:** `CheckAccountsPreUnification(UnificationWalletDataRequest data)` — Líneas **505–516**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Dispatcher + trazabilidad + red de seguridad de excepciones.

---

## Flujo de Ejecución

1. Recibe `POST` con el body `UnificationWalletDataRequest`.
2. Dentro de un `try`:
   - Instancia `var methods = new CreditMethods();`
   - **Registra el request completo:** `Logger.Credit("INFO", $"[CheckAccountsPreUnification] {JsonConvert.SerializeObject(data)}")`.
   - Retorna `Json(methods.CheckAccountsPreUnification(data))` → booleano serializado.
3. En el `catch (Exception e)`:
   - Registra `Logger.Credit("ERROR", $"[CheckAccountsPreUnification] {e.Message}")`.
   - Retorna `Json(false)` con **HTTP 200**.

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia ocurre en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

- **Error indistinguible de resultado negativo.** Cualquier excepción (BD caída, `IdEcommerce` vacío, timeout) se traduce a `false` con código 200 — exactamente la misma respuesta que "las cuentas no son elegibles". El consumidor no puede diferenciar un fallo técnico de una respuesta de negocio. Es el hallazgo más relevante de esta capa.
- **Logging correcto pero con datos de cliente:** a diferencia de otros métodos del proyecto, aquí sí se usa `Logger.Credit` conforme a la Regla #8. Considerar que el log `INFO` escribe números de cliente completos (`ClienteCredito`, `ClienteContado`) en texto plano.
- **Método síncrono:** debe migrar a `async/await` (Regla #12).
- **Contraste con el endpoint hermano:** este método es la **precondición de validación** que el frontend consulta antes de invocar `SetUnificationWalletData` (que ejecuta el `INSERT` real en `CREDIHUnificacionMonedero`). Ambos comparten el mismo DTO `UnificationWalletDataRequest`. Ver [[SetUnificationWalletData]].

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #CreditController #CheckAccountsPreUnification
