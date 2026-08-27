# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.nombreCliente()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public string nombreCliente(NombreClienteRequest request)` — Líneas 313–370
**Capa:** LAN (Nexo)
**Rol en el flujo:** Obtiene y enmascara el nombre y teléfono validados del cliente para propósitos de despliegue seguro (ej. front-end).

---

## Flujo de Ejecución Detallado

1. Inicializa respuesta en `"false"`.
2. Ejecuta query SELECT para obtener datos personales:
   ```sql
   SELECT TOP 1 ISNULL(PersonalNombres, ''), ISNULL(PersonalApellidoPaterno, ''), ISNULL(PersonalApellidoMaterno, ''), ISNULL(PersonalTelefonos, '')
   FROM Cte WITH(NOLOCK) WHERE Cliente = @ClientIntelisis
   ```
3. Llama al helper externo `OrderMethods.IsValidated(request.id_cliente_intelisis)` para recuperar el teléfono celular validado en la base de datos (tabla `CteTel`).
4. Si encuentra registro de cliente:
   - Enmascara cada componente del nombre (nombres, apellido paterno, apellido materno) usando `ocultarLetrasNombres` (reemplaza letras por `*` salvo la primera).
   - Enmascara el teléfono validado usando `OcultarTelefono(telefono, 4)` (deja solo los últimos 4 dígitos visibles).
5. Retorna JSON serializado: `{ nombres, apellido_paterno, apellido_materno, telefono, telefono_oculto }`.
6. En caso de error, loguea la excepción en `customerService.log` y retorna el mensaje de error de la excepción.

## Métodos Auxiliares Invocados

| Método | Clase | Descripción |
|---|---|---|
| `IsValidated(cliente)` | `OrderMethods` | Verifica si el cliente tiene un teléfono celular validado (`Tipo = 'Movil' AND ValidacionTel = 1`) y retorna el número concatenado `Lada + Telefono`. Consulta a `CteTel`. (Ubicado en `OrderMethods.cs` L: 766) |
| `ocultarLetrasNombres(nombre)` | `CustomerServiceMethods` | Enmascaramiento de strings. |
| `OcultarTelefono(tel, n)` | `CustomerServiceMethods` | Enmascaramiento de números. |

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales |
|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | Cte | Select | PersonalNombres, PersonalApellidoPaterno, PersonalApellidoMaterno, PersonalTelefonos, Cliente |
| IntelisisTmp | MAVICUBOS.grupomavi.com | CteTel | Select | Lada, Telefono, Cliente, Tipo, ValidacionTel |


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
