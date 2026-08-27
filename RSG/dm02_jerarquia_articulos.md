---
proyecto: Mavi
id_requerimiento: DM02
descripcion: Especificación Funcional - Jerarquía de Artículos
---

# Especificación Maestra: Jerarquía de Artículos (DM02)

## 1. Contexto Funcional
Se requiere de una API para exponer la información referente a la **Jerarquía de Artículos** hacia sistemas legados. Al igual que en DM01, se incorpora una **tabla Z (`ZMMT_JERART`)** en S4 para almacenar datos adicionales propios del negocio (como reglas de monedero electrónico, tipos de artículos específicos y responsables de compras) que no están contemplados en las jerarquías estándar de SAP.

---

## 2. Estructura de Datos (Tabla Adicional y Exposición API)

### A. Tabla Z Adicional (`ZMMT_JERART`)
Esta tabla complementa la jerarquía estándar de SAP (almacenada en `KLAH` y `SWOR`):
- `CLASS`: Clave de la clase / nivel de jerarquía (Llave).
- `MAESTRA`, `MAESTRADIMA`: Clases maestras del nivel y para DIMA.
- `TOPEPORCMONEDERO`: Tope de porcentaje a otorgar en monedero.
- `PESO`: Peso de la clase.
- `ARTTIPOPEQUE`, `ARTTIPODECORACION`: Flags de clasificación (Artículo pequeño / Decoración).
- `PERFILCOM`, `NOMBRECOM`: Perfil y nombre del comprador asignado.
- `PERFILGER`, `NOMBREGER`: Perfil y nombre del gerente asignado.

### B. Diccionario de Datos de Exposición (API OData)
La entidad `GET_ARTICULOSSet` combina el maestro estándar de SAP y los atributos de negocio:

| Campo API | Origen Lógico (ABAP) |
| :--- | :--- |
| `CLASS` | `KLAH-CLASS` (Donde `KLART` = '026') |
| `DESCRIPCION` | `SWOR` (Donde `SWOR-CLINT` = `KLAH-CLINT` y `SPRAS` = `SY-LANGU`) |
| `MAESTRA` | `ZMMT_JERART-MAESTRA` |
| `MAESTRADIMA` | `ZMMT_JERART-MAESTRADIMA` |
| `TOPEPORCMONEDERO` | `ZMMT_JERART-TOPEPORCMONEDERO` |
| `PESO` | `ZMMT_JERART-PESO` |
| `ARTTIPOPEQUE` | `ZMMT_JERART-ARTTIPOPEQUE` |
| `ARTTIPODECORACION` | `ZMMT_JERART-ARTTIPODECORACION` |
| `PERFILCOM` | `ZMMT_JERART-PERFILCOM` |
| `NOMBRECOM` | `ZMMT_JERART-NOMBRECOM` |
| `PERFILGER` | `ZMMT_JERART-PERFILGER` |
| `NOMBREGER` | `ZMMT_JERART-NOMBREGER` |

---

## 3. Información Técnica (Servicio S4 y CPI)

- **Tipo de servicio**: Sincrónico (RESTful / OData GET)
- **Nombre de Objeto S4**: `ZAPI_JERARQUIA_ARTICULOS_SRV`
- **Nombre de Artefacto CPI**: `RSG_DM02_ZAPI_JERARQUIA_ARTICULOS_SRV`
- **Entidad OData**: `GET_ARTICULOSSet`

### Filtros y Ejemplos de Consumo (`$filter`)
La API soporta múltiples operadores relacionales (`eq`, `ne`, `gt`, `lt`), ordenamientos y paginación. Aquí algunos ejemplos prácticos de consulta (URLs ofuscadas por seguridad):

1. **Filtro básico por Clase de Jerarquía:**
   `GET https://[URL_CPI]/.../GET_ARTICULOSSet?$format=json&$filter=Class eq 'VF002L007'`

2. **Filtro por Clase Maestra y Ordenamiento:**
   `GET https://[URL_CPI]/.../GET_ARTICULOSSet?$filter=Maestra eq 'CELU'&$orderby=Class`

3. **Filtro por Tope de Monedero Electrónico (Mayor a 10):**
   `GET https://[URL_CPI]/.../GET_ARTICULOSSet?$filter=Topeporcmonedero gt 10&$orderby=Topeporcmonedero desc`

4. **Filtros combinados (Operador AND) por Peso y Tipo Pequeño:**
   `GET https://[URL_CPI]/.../GET_ARTICULOSSet?$filter=Peso lt 5 and Arttipopeque eq '1'`

5. **Paginación obteniendo el Perfil de Gerente:**
   `GET https://[URL_CPI]/.../GET_ARTICULOSSet?$filter=Perfilger eq 'COMPR_GERB1'&$top=1`

---

> [!TIP]
> **Para los Subagentes ([Oracle] / [Vanguard]):** 
> Las reglas de negocio sobre **topes de monedero** y categorización de artículos pequeños/decoración ya no se leen de tablas locales en SQL Server. Cualquier servicio de eCommerce o POS que calcule promociones de monedero sobre una línea o jerarquía debe consultar `GET_ARTICULOSSet` (filtrando por la `CLASS` del artículo en cuestión) para extraer `TOPEPORCMONEDERO`.
