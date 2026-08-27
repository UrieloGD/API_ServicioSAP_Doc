---
proyecto: Mavi
id_requerimiento: DM01
descripcion: Especificación Funcional - Maestro de Artículos
---

# Especificación Maestra: Maestro de Artículos (DM01)

## 1. Contexto Funcional
Se requiere de una API para exponer la información de los **datos maestros de artículos** hacia los sistemas legados, POS y eCommerce. Adicionalmente, la arquitectura contempla una **tabla Z (`ZMMT_ART`)** dentro de SAP para almacenar datos adicionales de artículos que no existen en el estándar, enfocados principalmente en atributos para el eCommerce.

---

## 2. Estructura de Datos (Tabla Adicional y Exposición API)

### A. Tabla Z Adicional (`ZMMT_ART`)
Esta tabla complementa el maestro de materiales (`MARA`) con información específica de catálogo web y metadatos:
- `MATNR`: Número de artículo (Llave).
- `ZDESCRIPCION`: Descripción adicional optimizada para espacios.
- `ZNOMBRECORTO`, `ZNOMBRELARGOE`: Nombres corto y largo (eCommerce).
- `ZMARCAE`, `ZMODELOE`, `ZLINEAE`: Taxonomía para eCommerce.
- `ZMETAPALABRAS1E` al `3E` y `ZMETADESC1E` al `3E`: Tags, conceptos y meta-descripciones para SEO/Búsquedas.
- `ZCOSTOPCP`: Costo del sistema PCP.
- `ZNOMECOMM`: Indicador para permitir modificar el nombre en eCommerce.
- `ZDESCLVIU`, `ZDESCLMAVI`: Descripciones largas específicas por tienda (VIU / MAVI).
- `ZMATAUTVTA`: Indicador de autorizado para venta (Check de datos completos).

### B. Diccionario de Datos de Exposición (API OData)
La entidad `Articulos` consolida y mapea la información a través de las tablas estándar y Z de SAP:

| Campo API | Origen Lógico (ABAP) |
| :--- | :--- |
| `Articulo` | `MARA-MATNR` |
| `Descripcion1` | `MAKT-MAKTX` (Filtro por idioma `SY-LANGU`) |
| `DescripcionAdicional` | `ZMMT_ART-ZDESCRIPCION` |
| `NombreCorto` | `ZMMT_ART-ZNOMBRECORTO` |
| `Categoria` | Función `WWGR_EXPAND_CLASSES` (KLAH, STUFE='0') |
| `Familia` | Función `WWGR_EXPAND_CLASSES` (KLAH, STUFE='1') |
| `Linea` | `MARA-MATKL` |
| `Fabricante` | `MARA-BRAND_ID` |
| `ClaveFabricante` | `WRF_BRANDS_T-BRAND_DESCR` |
| `Unidad` (Base) | `MARA-MEINS` |
| `UnidadCompra` | `MARA-BSTME` |
| `UnidadTraspaso` | `MAW1-WAUSM` |
| `UnidadCantidad` | `MARA-VEPRH` |
| `Peso` | `MARA-BRGEW` |
| `Volumen` | `MARA-VOLUM` |
| `Tipo` | `MARA-MTART` |
| `Estatus` | `MARA-MSTAE` |
| `Alta` / `UltimoCambio` | `MARA-ERSDA` / `MARA-LAEDA` |
| `Usuario` | `MARA-ERNAM` |
| `Proveedor` | `EINA-LIFNR` (Donde `RELIF` = 'X') |
| `Volumetrico` | `MARA-GROES` |
| *(Campos eCommerce)* | Todos apuntan a sus respectivos campos en `ZMMT_ART`. |

---

## 3. Información Técnica (Servicio S4 y CPI)

- **Tipo de servicio**: Sincrónico (RESTful / OData GET)
- **Nombre de Objeto S4**: `ZAPI_ARTICULOS_SRV`
- **Nombre de Artefacto CPI**: `RSG_DM01_ZAPI_ARTICULOS_SRV`
- **Entidad OData**: `Articulos`

### Filtros Soportados (`$filter`)
La API soporta potentes opciones de filtro, paginación (`$top`, `$skip`) y ordenamiento (`$orderby`):
- `ARTICULO`
- `LINEA`
- `CLAVEFABRICANTE`
- `TIPO`
- `MATERIALAUTORIZADOVENTA`
- `CATEGORIA`
- `FAMILIA`
- `PROVEEDOR`

### Ejemplo de Consumo (Filtro por Línea y Paginación)
`GET https://[URL_CPI]/.../ZAPI_ARTICULOS_SRV/Articulos?$format=json&$filter=LINEA eq 'L001'&$top=3`

---

## 4. Estructura de Respuesta (Payload JSON)

A continuación se detalla un ejemplo real del JSON que devuelve el servicio cuando se consulta un artículo.

```json
{
    "d": {
        "results": [
            {
                "__metadata": {
                    "id": "https://[URL_S4]/sap/opu/odata/sap/ZAPI_ARTICULOS_SRV/Articulos('000000000000000008')",
                    "uri": "https://[URL_S4]/sap/opu/odata/sap/ZAPI_ARTICULOS_SRV/Articulos('000000000000000008')",
                    "type": "ZAPI_ARTICULOS_SRV.Articulos"
                },
                "ARTICULO": "000000000000000008",
                "DESCRIPCION1": "Television 42\"\"",
                "DESCRIPCIONADICIONAL": "DESCRIPCIÓN ADICIONAL",
                "NOMBRECORTO": "NOMBRE CORTO ARTICULO",
                "CATEGORIA": "2",
                "FAMILIA": "",
                "LINEA": "2",
                "FABRICANTE": "",
                "CLAVEFABRICANTE": "",
                "UNIDAD": "ST",
                "UNIDADCOMPRA": "",
                "UNIDADTRASPASO": "",
                "UNIDADCANTIDAD": "0",
                "PESO": "2",
                "VOLUMEN": "0",
                "TIPO": "HAWA",
                "ESTATUS": "",
                "ULTIMOCAMBIO": "/Date(1702598400000)/",
                "ALTA": "/Date(1677110400000)/",
                "USUARIO": "EXRAMARO",
                "PROVEEDOR": "0055300001",
                "MARCAE": "MARCA PARA ECOMMERCE",
                "MODELOE": "MODELO PARA ECOMMERCE",
                "LINEAE": "LINEA PARA ECOMMERCE",
                "NOMBRELARGOE": "NOMBRE LARGO PARA ECOMMERCE",
                "VOLUMETRICO": "",
                "METAPALABRAS1E": "META PALABRAS, TAGS, CONCEPTOS",
                "METADESCRIPCION1E": "META PALABRAS , TAGS",
                "METAPALABRAS2E": "META PALABRAS, TAGS 3",
                "METADESCRIPCION2E": "META PALABRAS , TAGS 4",
                "METAPALABRAS3E": "META PALABRAS TAGS 5",
                "METADESCRIPCION3E": "META PALABRAS 6",
                "COSTOPROMEDIOPCP": "5",
                "EDITARNOMBREECOMMERCE": "M",
                "DESCRIPCIONLARGAVIU": "META PALABRAS",
                "DESCRIPCIONLARGAMAVI": "META PALABRAS, TAGS 4",
                "MATERIALAUTORIZADOVENTA": "1"
            }
        ]
    }
}
```

> [!TIP]
> **Para los Subagentes ([Oracle] / [Vanguard]):** 
> En los procesos del backend legados donde se obtenía información base de los artículos directamente de Intelisis (ej. tabla `Art`), ahora debe priorizarse el consumo de `ZAPI_ARTICULOS_SRV` para sincronizar atributos, descripciones, categorías y todos los meta-datos exclusivos de eCommerce resguardados en `ZMMT_ART`.
