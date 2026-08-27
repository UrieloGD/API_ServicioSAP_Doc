# Mapeo del Método: `CustomerServiceMethods.LoginClienteCredito()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static string LoginClienteCredito(LoginClienteCreditoRequest request)` — Líneas 1214–1258
**Capa:** LAN (Nexo)
**Rol en el flujo:** Consulta la base de datos para recuperar los datos básicos del cliente (nombre y correo) a partir de su número de cliente.

---

## Flujo de Ejecución Detallado
1. Inicializa variables en blanco: `nombreCliente`, `apellidoPaterno`, `apellidoMaterno`, `eMail1`.
2. Abre conexión a la base de datos `IntelisisTmp` mediante la clase `Connection`.
3. Construye la consulta SQL: `SELECT TOP 1 PersonalNombres, PersonalApellidoPaterno, PersonalApellidoMaterno, eMail1 FROM Cte with(nolock) WHERE Cliente = '{0}'` inyectando `request.ClientNumber`.
4. Ejecuta el comando SQL (`ExecuteReader`).
5. Si obtiene resultados (`HasRows`):
   - Lee el primer registro.
   - Asigna las variables con los datos de la BD.
   - Concatena los nombres en `nombreCompleto` separado por espacios.
   - Crea un `Dictionary<string, string>` con llaves `nombreCliente` y `email`.
   - Retorna el diccionario serializado a JSON.
6. Si ocurre una excepción: la imprime por consola y hace `throw`.
7. Si no encuentra resultados, retorna el booleano `false` serializado a JSON.

## Métodos Auxiliares Invocados
Ninguno en este flujo.

## Interacciones con Base de Datos
Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales | Nombre TablaSAP | API SAP |
|---|---|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | Cte | Select | PersonalNombres, PersonalApellidoPaterno, PersonalApellidoMaterno, eMail1 | | |

## Lógica de Retorno
| Condición | Retorna |
|---|---|
| Cliente encontrado | JSON con formato `{"nombreCliente": "...", "email": "..."}` |
| Cliente NO encontrado | `"false"` (booleano false serializado) |
| Excepción | Relanza la excepción original (`throw`) |

---

## Ejemplo Completo de Ejecución

### Request que recibe el método
```json
{
  "ClientNumber": "C00000020"
}
```

### Parámetros SQL generados por iteración
```sql
SELECT TOP 1 PersonalNombres, PersonalApellidoPaterno, PersonalApellidoMaterno, eMail1 
FROM Cte with(nolock) WHERE Cliente = 'C00000020'
```

### Retorno del método
```json
{"nombreCliente":"JUAN PEREZ LOPEZ","email":"juan.perez@correo.com"}
```

