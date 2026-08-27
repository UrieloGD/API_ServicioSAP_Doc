# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.GetSalesChannelsSTP()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static Dictionary<string, List<int>> GetSalesChannelsSTP(GetSalesChannelsSTPRequest request)` — Líneas 1413–1453
**Capa:** LAN (Nexo)
**Rol en el flujo:** Consulta los canales de venta (`ID`) permitidos para un cliente y UEN (Unidad Estratégica de Negocio) en la base de datos Intelisis.

---

## Flujo de Ejecución Detallado

1. Inicializa conexión a BD.
2. Ejecuta query parametrizada en el texto (inseguro, usa string interpolation en vez de parámetros SQL reales):
   ```sql
   SELECT ID 
   FROM CteEnviarA 
   WHERE Cliente = '{request.ClientNumber}' 
   AND UENMAVI = {request.Uen}
   ```
3. Si hay filas, itera sobre ellas añadiendo el valor `ID` (entero) a una lista `salesChales`.
4. Si no hay filas, lanza excepción: `"No fue encontrado ningún canal de venta."`
5. En catch general (incluyendo el lanzado en el paso previo), lanza una nueva excepción envolviendo el mensaje original `"Error: " + ex.Message`.
6. Si todo está correcto, retorna un diccionario: `{ "canales_de_venta": [id1, id2, ...] }`.

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales |
|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | CteEnviarA | Select | ID, Cliente, UENMAVI |

## Notas de Deuda Técnica

> ⚠️ **Inyección de SQL:** La query usa interpolación de strings (`'{request.ClientNumber}'` y `{request.Uen}`) directamente en lugar de usar parámetros SQL (`@Cliente`), lo cual la hace altamente vulnerable a Inyección de SQL.


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
