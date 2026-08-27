---
proyecto: MAVI
id_requerimiento: D-IM-11
descripcion: Especificación Funcional - Consulta de Existencias (Stock)
---

# Especificación Maestra: Consulta de Existencias (D-IM-11)

## 1. Contexto Funcional
Se requiere de una API de consulta mediante la cual un sistema externo (POS, eCommerce, etc.) pueda consultar la **existencia física de uno o varios productos por centro / almacén** en SAP S/4HANA.

### Supuestos Clave:
- Si un sistema externo actualiza existencias, la API no reflejará esos movimientos hasta que sean procesados y confirmados en S/4.
- Se debe generar un registro separado por cada combinación de: `Material` / `Centro` / `Almacén` / `Lote` / `Número de Serie`.
- Soporte completo de OData: `$filter`, `$orderby`, `$top`, `$expand`.

---

## 2. Estructuras de Respuesta y Diccionario de Datos

La API retorna diferentes niveles de detalle según la naturaleza del material (Normal, Gestionado por Lotes, Gestionado por Series).

### A. Existencia General (Nivel Centro/Almacén)
| Campo | Descripción | Origen SAP |
| :--- | :--- | :--- |
| `Material` | Número de material (SKU) | `MARD-MATNR` |
| `Plant` | Centro / Sucursal | `MARD-WERKS` |
| `StorageLoc` | Almacén interno | `MARD-LGORT` |
| `UnrestrictedUseStock` | Stock de libre utilización | `MARD-LABST` |
| `BlockedStock` | Stock bloqueado | `MARD-SPEME` |
| `BaseUnit` | Unidad de medida base | `MARA-MEINS` |
| `ProductName` | Descripción del artículo | `MAKT-MAKTX` |
| `ProductGroup` | Línea o Grupo de artículos | `MARA-MATKL` |

> *Nota sobre tipos de stock en MARD:* `UMLME` (En traslado), `INSME` (Inspección calidad), `EINME` (Stock no libre), `RETME` (Devoluciones).

### B. Existencia Gestionada por Lotes (Ej. Importación)
Se añade la entidad expandida (`to_lotes`) con las características del lote:
| Campo | Descripción | Origen SAP |
| :--- | :--- | :--- |
| `BatchNumber` | Número de lote | `MCHB-CHARG` |
| `Characteristic` | Nombre característica (Pedimento, fecha, aduana) | `CABN-ATNAM` |
| `CharcValue` | Valor de la característica | `AUSP-ATWRT` |

> *Nota sobre lotes en MCHB:* Libre utilización `CLABS`, Bloqueado `CSPEM`.

### C. Existencia Gestionada por Series
Se añade la entidad expandida (`to_series`) con las características del número de serie:
| Campo | Descripción | Origen SAP |
| :--- | :--- | :--- |
| `SerialNumber` | Número de serie del artículo | `EQUI-SERNR` (Verificado en `EQBS`) |
| `Characteristic` | Característica (Color, Modelo, Tipo, Cuadro) | `CABN-ATNAM` |
| `CharcValue` | Valor de la característica | `AUSP-ATWRT` |

---

## 3. Información Técnica (Servicio S4 y CPI)

- **Tipo de servicio**: Sincrónico (RESTful / OData GET)
- **Nombre de Objeto S4**: `ZAPI_EXISTENCIAS_SRV`
- **Artefacto (CDS)**: `ZCDS_DIM11_EXISTENCIA_CDS`
- **Entidad OData**: `zcds_dim11_existencia`

### Filtros Soportados (`$filter`)
La API soporta filtrado por los siguientes campos clave:
- `Material`
- `Plant`
- `StorageLoc`
- `BatchNumber`
- `ProductGroup`

### Ejemplos de Consumo OData para Desarrollo (Endpoints)
*(Las URLs base han sido enmascaradas por seguridad)*

1. **Filtro simple por Material y Centro:**
   `GET https://[URL_CPI]/.../ZCDS_DIM11_EXISTENCIA_CDS/zcds_dim11_existencia?$filter=Material eq 'MN00000005' and Plant eq '0008'`

2. **Filtro con Ordenamiento:**
   `GET https://[URL_CPI]/.../ZCDS_DIM11_EXISTENCIA_CDS/zcds_dim11_existencia?$filter=Plant eq '0007'&$orderby=UnrestrictedUseStock`

3. **Expansión de Lotes (Artículos de Importación):**
   `GET https://[URL_CPI]/.../zcds_dim11_existencia?$filter=Material eq 'MN00000003'&$expand=to_lotes`

4. **Expansión de Series y Lotes Combinados:**
   `GET https://[URL_CPI]/.../zcds_dim11_existencia?$filter=Material eq 'MN00000005'&$expand=to_lotes,to_series`

---

> [!TIP]
> **Para los Subagentes ([Oracle] / [Vanguard]):** 
> Cuando refactoricen los módulos de eCommerce o POS que actualmente consultan existencias directas a bases de datos legadas o procedimientos en Intelisis (Ej. Artículos, Lotes o Series), **deberán reemplazar** esas consultas por clientes HTTP que disparen peticiones `GET` hacia `ZCDS_DIM11_EXISTENCIA_CDS`. Asegúrense de inyectar el token OAuth2 (`Bearer`) e implementar lógica para manejar entidades `to_lotes` o `to_series` si el producto lo requiere.
