# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.unirCuenta()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public bool unirCuenta(UnirCuentaRequest request)` — Líneas 212–254
**Capa:** LAN (Nexo)
**Rol en el flujo:** Actualiza el IDMagento de un Cliente en la base de datos de Intelisis.

---

## Flujo de Ejecución Detallado

1. Prepara las variables `cliente` (string) e `id_magento` (int).
2. Ejecuta query de actualización usando parámetros:
   ```sql
   UPDATE Cte WITH (ROWLOCK) SET IDMagento = @idMagento WHERE Cliente = @Cliente
   ```
3. Obtiene el número de registros afectados (`RecordsAffected`).
4. Si ocurre una excepción, la atrapa, loguea en `customerService.log` y continúa (no la relanza).
5. Retorna `true` si `recordsAffected != 0`, `false` en caso contrario o si hubo error.

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales |
|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | Cte | Update | IDMagento, Cliente |


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
