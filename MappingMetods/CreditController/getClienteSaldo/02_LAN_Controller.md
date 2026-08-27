# Mapeo del Método: `GET /credit/getClienteSaldo/{cliente}` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/CreditController.cs`
**Método:** `GetClienteSaldo(string cliente)` — Líneas **97–122**
**Capa:** LAN (Nexo)
**Rol en el flujo:** Validación del parámetro + dispatcher hacia la lógica de negocio.

---

## Flujo de Ejecución

1. El controlador declara a nivel de clase (líneas 20–22):
   - `private FacturaMethods cs = new FacturaMethods();` — instancia compartida de la clase de negocio.
   - `Regex rx = new Regex("^[C]{1}[0-9]{8}$");` — patrón de validación del cliente.

2. Recibe `GET` con `{cliente}` y evalúa `rx.IsMatch(cliente)`:
   - **Si NO cumple el patrón** → retorna `Ok("El cliente es incorrecto")` (**200**, no 400).
   - **Si cumple** → invoca `cs.getClienteSaldo(cliente)` que regresa un objeto `ClienteSaldo`.

3. Evalúa el resultado:
   - Si `string.IsNullOrEmpty(clienteSaldo.clienteIntelisis)` → retorna `Ok("No tiene facturas")`. Este es el caso "objeto vacío" que devuelve la capa de negocio cuando el SP no arrojó filas.
   - En caso contrario → retorna `Ok(clienteSaldo)` serializado como JSON.

## Interacciones con Base de Datos

**Ninguna directa.** Toda la persistencia ocurre en [[03_BusinessMethod]].

## Observaciones técnicas detectadas

- **Discrepancia Regex vs. documentación:** el comentario XML de `FacturaMethods.getClienteSaldo` dice *"DEBE TENER UNA LONGITUD DE 10"*, y el patrón `^[C]{1}[0-9]{8}$` exige `C` + **8** dígitos = **9 caracteres**. El ejemplo del SP (`Exec SPCXCSaldosClientesPendiente 'C00000820'`) tiene 9 caracteres, por lo que el Regex es el correcto y el comentario está desactualizado.
- **Errores como HTTP 200:** tanto "cliente inválido" como "sin facturas" se devuelven con código 200 y cuerpo de texto plano, no como JSON tipado ni con código de error. Es la DMZ la que reinterpreta esos textos ([[01_DMZ_Controller]]).
- **Respuesta polimórfica:** el mismo endpoint puede devolver un `string` o un objeto `ClienteSaldo`, lo que obliga al consumidor a inspeccionar el tipo. Candidato a normalizarse en la migración.
- **Instancia compartida de `FacturaMethods`:** el campo `cs` es de instancia del controller y mantiene internamente un `SqlConnection` de nivel de clase — ver la nota de reutilización de conexión en [[03_BusinessMethod]].
- **Método síncrono:** debe migrar a `async/await` (Regla #12).

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #CreditController #getClienteSaldo
