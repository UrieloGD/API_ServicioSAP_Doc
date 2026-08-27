# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.GetBBVAKeyNeko()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static string GetBBVAKeyNeko()` — Líneas 1083–1122
**Capa:** LAN (Nexo)
**Rol en el flujo:** Consulta la base de datos `master` para obtener una llave o token de seguridad.

---

## Flujo de Ejecución Detallado

1. Inicializa conexión a BD.
2. Ejecuta query: `SELECT top 1 * FROM master.dbo.dbacseguridad WITH(NOLOCK)`
3. Si hay resultados, lee la primera columna (`GetString(0)`) y la retorna.
4. Si no hay, retorna `"null"`.
5. Si ocurre `Exception`, loguea en `customerService.log` y retorna el mensaje de error de la excepción.

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales |
|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | master.dbo.dbacseguridad | Select | (Top 1 primer campo) |


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
