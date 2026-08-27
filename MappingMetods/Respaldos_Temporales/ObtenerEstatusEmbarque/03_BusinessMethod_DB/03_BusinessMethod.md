# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.ObtenerEstatusEmbarque()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static string ObtenerEstatusEmbarque(EstatusEmbarqueRequest request)` — Líneas 1905–1947
**Capa:** LAN (Nexo)
**Rol en el flujo:** Valida si un pedido (identificado por IDEcommerce) ha sido embarcado, y retorna `true` si ya hay embarques registrados para él, `false` en caso contrario.

---

## Flujo de Ejecución Detallado

1. Ejecuta una primera query para obtener el último `MovID` de la Venta asociado al `IDEcommerce`:
   ```sql
   SELECT top 1 V.MovID FROM Venta V with (nolock) WHERE V.IDEcommerce = '{0}' ORDER BY V.FechaEmision DESC
   ```
2. Si no hay resultados para ese ID de Magento, devuelve `false`.
3. Extrae el `MovID` de la Venta (Ej. "12345").
4. Ejecuta una segunda query cruzando el embarque con la Venta usando el `MovID`:
   ```sql
   SELECT v.IDEcommerce FROM Embarque e WITH(NOLOCK)
   INNER JOIN EmbarqueMov em WITH(NOLOCK) ON e.ID = em.AsignadoID
   INNER JOIN Venta v WITH(NOLOCK) ON v.MovID = em.MovID AND v.Mov = em.Mov
   WHERE v.MovID = '{0}'
   ```
5. Si no hay resultados de la segunda query, retorna `true` (⚠️ Parece contradictorio, esto indica que no se encontraron embarques pero retorna true).
6. Si hay resultados, los añade a una lista y finalmente retorna `true` o `false` dependiendo de si la lista está vacía o no (`listData.Count <= 0`).

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales |
|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | Venta | Select | MovID, IDEcommerce, Mov |
| IntelisisTmp | MAVICUBOS.grupomavi.com | Embarque | Select | ID |
| IntelisisTmp | MAVICUBOS.grupomavi.com | EmbarqueMov | Select | AsignadoID, MovID, Mov |

## Notas de Deuda Técnica

> ⚠️ **Inyección de SQL:** La query usa interpolación/formateo de strings (`string.Format("... WHERE V.IDEcommerce = '{0}'", request.IdEcommerce)`) directamente en lugar de usar parámetros SQL (`@IDEcommerce`), lo cual la hace vulnerable.


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
