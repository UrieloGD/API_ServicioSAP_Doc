# Mapeo del Método: `GET /customer/wallet/getCuentaC/{ordenCompra}` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/WalletCustomerController.cs`
**Método:** `GetCuentaCByIdEcommerce(string ordenCompra)` — Líneas **51–72**
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada. **Hoy es un proxy roto: el destino que invoca no existe en LAN.**
**Región:** sin `#region` (el controlador DMZ no está regionalizado; el LAN sí, `#region WalletCustomer`)

---

## Flujo de Ejecución

1. Recibe petición `GET` sobre la ruta `customer/wallet/getCuentaC/{ordenCompra}`. Controlador decorado con `[Authorize]` (línea 10) y `[RoutePrefix("customer/wallet")]` (línea 11); el método con `[HttpGet]` (línea 51) y `[Route("getCuentaC/{ordenCompra}")]` (línea 52).

2. **Valida el parámetro de ruta:**
   ```csharp
   if (ordenCompra == null || ordenCompra.Length == 0)
   {
       return BadRequest("La orden de compra no puede quedar vacía.");
   }
   ```
   → **HTTP 400**. En la práctica es una guarda muerta: el ruteo de Web API no hace match cuando el segmento `{ordenCompra}` viene vacío (devuelve 404 antes de entrar al método). Solo se dispara si alguien invoca el método por reflexión o desde una prueba unitaria.

3. Instancia `Curl` (`WebApiMagento.Helper.Curl`) y reenvía a LAN:
   ```csharp
   response = curl.Get($"customer/getCuentaC/{ordenCompra}").Trim('"');
   ```

4. Retorna `Ok(response)` — **siempre HTTP 200**, con el `string` crudo como cuerpo.

---

## 🔴 Defecto bloqueante: la ruta destino no existe (G-06)

Este es **el hallazgo principal de todo el endpoint**. La DMZ y la LAN no coinciden en **dos ejes simultáneos**:

| Eje | DMZ (`WalletCustomerController.cs:64`) | LAN (`WalletCustomerController.cs:39–40`) | ¿Coincide? |
|---|---|---|---|
| **Ruta** | `customer/getCuentaC/{ordenCompra}` | `customer/wallet/getCuentaC/{idEcommerce}` | ❌ falta el segmento `/wallet` |
| **Verbo** | `GET` (`curl.Get` → `WebClient.DownloadString`) | `[HttpPost]` (línea 39) | ❌ GET vs POST |
| Prefijo declarado en el propio controlador DMZ | `customer/wallet` (línea 11) | `customer/wallet` (línea 10) | ✅ (pero **no se usa** al construir la llamada saliente) |

Nótese la ironía: el `[RoutePrefix("customer/wallet")]` de la DMZ es correcto, pero la URL que se **construye a mano** en la línea 64 omite el `/wallet`. El bug está en el string literal, no en el ruteo de entrada.

**Consecuencia en tiempo de ejecución:**
1. IIS de LAN responde **404 Not Found** a `GET {URL_INTELISIS}customer/getCuentaC/…`.
2. `WebClient.DownloadString` lanza `WebException`.
3. `Curl.Get` (`Helper/Curl.cs` líneas **210–230**) **captura la excepción y la devuelve como si fuera el payload**:
   ```csharp
   catch (Exception e)
   {
       return e.ToString();   // ← no relanza, no loguea
   }
   ```
4. La DMZ hace `.Trim('"')` sobre ese texto, **no entra al `catch`** (nunca hubo excepción aquí) y ejecuta `return Ok(response)`.

**Resultado neto: HTTP 200 con el `ToString()` completo de una `System.Net.WebException` (mensaje + stack trace + tipos internos) como cuerpo de la respuesta.**

Esto es a la vez:
- Un **fallo funcional silencioso** — el consumidor recibe 200 y un string; si solo valida el código de estado, cree que funcionó.
- Una **fuga de información** — el stack trace expone rutas internas, nombres de ensamblado y la URL interna de LAN hacia el borde DMZ.

Corroborado por las fuentes maestras del proyecto:
- `_ANALISIS_PREVIO/sin-intelisis.csv:213` → *"Sin destino - prefijo y verbo no coinciden con LAN"*, estado **`Roto`**.
- `_ANALISIS_PREVIO/APIMagento-conteo-rutas.md:69` → ruta LAN marcada **"⚠️ Huérfana"**.
- `_ANALISIS_PREVIO/DMZ-Backlog-Migracion-SAP.md:216` → *"❌ FALTA + 🔴 ROTO"*.
- `MIGRATION_STATUS_MASTER_v2.csv:112` → *"Two defects… See G-06"*.

---

## Interacciones con Base de Datos

**Ninguna.**

---

## Observaciones técnicas detectadas

1. **Ruta y verbo desalineados con LAN (G-06)** — desarrollado arriba. Es un **bloqueante real**: el endpoint no funciona hoy en producción.

2. **`Curl.Get` convierte excepciones en payload.** `Helper/Curl.cs:224–227` retorna `e.ToString()` en vez de relanzar. Es el mismo antipatrón de `Curl.Post` (línea 110). Mientras exista, **ningún `try/catch` del controlador DMZ puede detectar un fallo de red o un 4xx/5xx de LAN**: el `catch` de las líneas 66–69 es inalcanzable para errores HTTP.

3. **El `catch` local es código muerto en la práctica.**
   ```csharp
   catch (System.Exception e) { response = e.Message; }
   ```
   Solo se dispararía si el **constructor** de `Curl` fallara — pero ese constructor está fuera del `try` (línea 60) y sí relanza (`Curl.cs:88–90`), por lo que produciría un 500 antes de llegar aquí. En cualquier otro escenario, `Curl.Get` ya se tragó la excepción.

4. **Sin trazabilidad (Regla #8).** A diferencia de `GetWalletCustomerDetails` en el mismo archivo (líneas 40 y 44, que sí llaman `Logger.SAP(...)`), este método **no registra nada**: ni el `ordenCompra` consultado ni el error. No hay forma de detectar el fallo G-06 desde los logs de la DMZ.

5. **Siempre HTTP 200.** No distingue "cuenta encontrada" / "orden inexistente" / "error". El sentinela `"None"` que devuelve LAN (ver [[03_BusinessMethod]]) se propaga tal cual como cuerpo de un 200.

6. **`.Trim('"')` como parche de doble serialización.** LAN retorna `Ok(cuentaC)` con un `string`, que Web API serializa como JSON entrecomillado (`"C00012345"`). El `Trim('"')` deshace eso a mano. Si el valor devuelto contuviera comillas legítimas al inicio o final, se corromperían. En la migración debe retornarse un DTO tipado.

7. **Método síncrono:** debe migrar a `async/await` (Regla #12). Prohibido `.Result` / `.Wait()`.

8. **Puente a SAP (Regla #16).** Al migrar, `curl.Get(...)` debe convertirse en `curl.PostSAP(...)` (`Curl.cs:115`) y el destino en ServicioSAP declararse `[HttpPost]`. **Ojo:** aquí la conversión **no es directa** — hoy es un `GET` con parámetro en la ruta; hay que decidir si el contrato SAP recibe el folio en el body (POST) o si se agrega un `GetSAP` al helper, que **hoy no existe** (`Curl.cs` solo expone `Post`, `PostSAP`, `PatchSAP`, `PostWithoutThrowingError` y `Get`, y este último apunta a `Ip` = `URL_INTELISIS`, no a `IpSAP`).

9. **Endpoint hermano ya migrado en el mismo archivo:** `GetWalletCustomerDetails` (líneas 14–49) ya usa `curl.PostSAP("customer/wallet/details", …)` con el legacy Intelisis comentado (línea 36). Es el patrón a replicar. Ver [[details]].

10. **La URL base y credenciales** se resuelven desde `ConfigurationManager.AppSettings["URL_INTELISIS"]` / `["USER_INTELISIS"]` / `["DOMINIO_LAN"]` (`Helper/Curl.cs` líneas **22–33**) — sin hardcodeo, cumple Regla #7.

---

## Decisión previa requerida

Antes de migrar hay que responder: **¿este endpoint se corrige o se retira?**
Está roto desde su introducción (commit `b416730`), **no tiene consumidor identificado en el frontend** (ver [[03_BusinessMethod]] §Referencias cruzadas) y su lógica está **duplicada dentro de LAN** en `OrderMethods.GenerarMonedero` (`OrderMethods.cs:1414–1435`). Migrarlo tal cual sería portar código muerto.

> Siguiente eslabón: [[02_LAN_Controller]]

---

#migracion #SAP #dotnet #WalletCustomerController #getCuentaC #bloqueante
