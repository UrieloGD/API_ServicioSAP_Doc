# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Método: `CustomerServiceMethods.obtenerTipoGarantia()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public string obtenerTipoGarantia(TipoGarantiaRequest request)` — Líneas 37–105
**Capa:** LAN (Nexo)
**Rol en el flujo:** Consulta el tipo de garantía para un artículo (product_id) especificado, buscando al proveedor activo de la garantía y la tabla de artículos.

---

## Flujo de Ejecución Detallado

1. Ejecuta una consulta SELECT cruzando `VTASCProveedorActivoGarantia` y `Art` usando `@ProductId`.
2. Ordena los resultados por `TipoGarantia DESC` y toma el `TOP 1`.
3. Extrae la información (tipo de garantía, nombre, teléfono). Si tipo de garantía viene vacío, asume `"Proveedor"`.
4. Retorna el resultado serializado en JSON (con estructura `[{ id: 1, type_warranty: "...", persons: [...] }]`).

## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]

| BaseDeDatos | Servidor | NombreTabla | Acción | Campos Principales |
|---|---|---|---|---|
| IntelisisTmp | MAVICUBOS.grupomavi.com | VTASCProveedorActivoGarantia | Select | TipoGarantia, Marca, Telefono, Proveedor, Linea |
| IntelisisTmp | MAVICUBOS.grupomavi.com | Art | Select | Proveedor, MarcaE, Linea, Articulo |


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
