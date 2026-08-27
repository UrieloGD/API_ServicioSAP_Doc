# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.validarCliente()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public string validarCliente(ValidarClienteRequest request)` — Líneas 255–311
**Capa:** LAN (Nexo)
**Rol en el flujo:** Consulta y retorna el nombre completo enmascarado/oculto de un cliente validando que coincida el ID de Intelisis y el ID de Magento.

---

## Flujo de Ejecución Detallado

1. Inicializa respuesta en `"false"`.
2. Ejecuta query SELECT para obtener los nombres:
   ```sql
   SELECT TOP 1 ISNULL(PersonalNombres, ''), ISNULL(PersonalApellidoPaterno, ''), ISNULL(PersonalApellidoMaterno, '')
   FROM Cte WITH(NOLOCK) WHERE Cliente = @ClientIntelisis AND IDMagento = @ClientMagento
   ```
3. Si encuentra registro, llama a la función local `ocultarLetrasNombres` para cada parte del nombre.
   - `ocultarLetrasNombres`: Función que toma un string, deja la primera letra visible y reemplaza el resto de letras por asteriscos `*`.
4. Devuelve un JSON serializado con las propiedades `{ nombres, apellido_paterno, apellido_materno }`.
5. Si ocurre un error, loguea en `customerService.log` y retorna el mensaje de error de la excepción (código de error expuesto al cliente).

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales |
|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | Cte | Select | PersonalNombres, PersonalApellidoPaterno, PersonalApellidoMaterno, Cliente, IDMagento |


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
