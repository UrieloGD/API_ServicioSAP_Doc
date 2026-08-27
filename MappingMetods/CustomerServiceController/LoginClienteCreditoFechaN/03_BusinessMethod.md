# Mapeo del Método: `CustomerServiceMethods.LoginClienteCreditoFechaN()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static string LoginClienteCreditoFechaN(LoginClienteCreditoFechaNRequest request)` — Líneas 1260–1293
**Capa:** LAN (Nexo)
**Rol en el flujo:** Valida que la fecha de nacimiento ingresada coincida con la registrada para el cliente en la base de datos. Si coincide, invoca de manera cruzada al método `LoginClienteCredito()` para retornar sus datos básicos.

---

## Flujo de Ejecución Detallado
1. Inicializa conexión a base de datos `IntelisisTmp` (mediante clase `Connection`).
2. Consulta la fecha de nacimiento en formato `yyyy-MM-dd`: 
   `SELECT TOP 1 CONVERT(varchar, FechaNacimiento, 23) as Fecha FROM Cte with(nolock) WHERE Cliente = '{0}'` inyectando `request.ClientNumber`.
3. Ejecuta comando. Si no hay registros (`!dataReader.HasRows`), retorna `"false"`.
4. Si encuentra registro, itera. Si `Fecha` no coincide exactamente con `request.BirthDate` (como string), hace `continue` (como es un `TOP 1`, si no coincide termina el ciclo y retorna `"false"` al final).
5. Si coinciden:
   - Crea un objeto `LoginClienteCreditoRequest` asignándole el `ClientNumber` actual.
   - Llama a `CustomerServiceMethods.LoginClienteCredito(loginClienteCredito)`.
   - Retorna inmediatamente lo que responda esa función (los datos del cliente).
6. Si ocurre una excepción:
   - Lo registra con el helper `Logger.CustomerService("Exception: ", e.Message)`.
   - Relanza la excepción (`throw`).

## Métodos Auxiliares Invocados
| Método | Clase | Descripción |
|---|---|---|
| `LoginClienteCredito(request)` | `CustomerServiceMethods` | Invocación cruzada al otro método para obtener el nombre y correo del cliente validado. |
| `Logger.CustomerService(string, string)` | `Logger` | Registra errores en un archivo de texto físico (log). |

## Interacciones con Base de Datos
Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales | Nombre TablaSAP | API SAP |
|---|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | Cte | Select | FechaNacimiento | | |

## Lógica de Retorno
| Condición | Retorna |
|---|---|
| Cliente NO existe | `"false"` |
| Fecha NO coincide | `"false"` |
| Fecha coincide | Mismo JSON que `LoginClienteCredito()` (`{"nombreCliente": "...", "email": "..."}`) |

---

## Ejemplo Completo de Ejecución

### Request que recibe el método
```json
{
  "ClientNumber": "C00000020",
  "BirthDate": "1990-05-20"
}
```

### Parámetros SQL generados por iteración
```sql
SELECT TOP 1 CONVERT(varchar, FechaNacimiento, 23) as Fecha 
FROM Cte with(nolock) WHERE Cliente = 'C00000020'
```

