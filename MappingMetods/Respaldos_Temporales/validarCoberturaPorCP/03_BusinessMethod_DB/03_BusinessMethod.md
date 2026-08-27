# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.ValidarCoberturaPorCP()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public string ValidarCoberturaPorCP(ValidarCoberturaPorCPRequest request)` — Líneas 1738–1877
**Capa:** LAN (Nexo)
**Rol en el flujo:** Valida, busca o enlista la cobertura de entrega (rutas Mavi) basándose en Código Postal, Estado o Delegación (Municipio), según la operación (`op`) solicitada.

---

## Flujo de Ejecución Detallado

1. Recibe el request con la operación solicitada `request.op`. Define la Query SQL base dependiendo del valor de `op`:
   - `op == "states"`: Devuelve lista única de Estados con rutas habilitadas (`MaviRutaSupervision IS NOT NULL` y `Colonia != 'SIN COLONIA'`).
   - `op == "delegations"`: Devuelve lista única de Delegaciones/Municipios para un `@SearchState` dado.
   - `op == "table"`: Devuelve lista de CP, Colonias y Delegaciones de un `@SearchState` y `@SearchDelegation` dado.
   - `op == "coverage"`: Valida si un Código Postal exacto (`@Search`) tiene ruta habilitada y retorna información de colonia y delegación.
2. Agrega los parámetros requeridos (`@Search`, `@SearchState`, `@SearchDelegation`).
3. Ejecuta la Query usando `ExecuteReader()`.
4. Si hay resultados, itera armando listas de objetos JSON (`Dictionary<string, object>`). Las keys generadas varían según la `op`.
5. Retorna la respuesta como JSON Array (string).

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales |
|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | CodigoPostal | Select | Estado, Delegacion, CodigoPostal, Colonia, MaviRutaSupervision |


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
