---
proyecto: Mavi
id_requerimiento: SD36
descripcion: Especificación Funcional - Consultar Documentos de Ventas desde POS
---

# Especificación Maestra: Consultar Documentos de Ventas (SD36)

## 1. Contexto Funcional
Esta API "Inbound" permite al sistema POS **consultar** los datos de un documento de ventas existente en SAP SD (Pedidos, Consultas, Ofertas, Devoluciones, etc.) y todas sus tablas Z asociadas. Se ejecuta a través de una petición HTTP `GET` con filtros `$filter` y expansiones `$expand`.

---

## 2. Lógica de Petición (GET Request)

> [!IMPORTANT]
> **REGLA DE ORO DE INTEGRACIÓN:** El código C# (.NET) **NUNCA** consultará ni cruzará las tablas estándar (VBAK, VBKD, VBAP) ni las tablas Z de MAVI a nivel base de datos. C# únicamente invocará la URL OData estructurada con los filtros correspondientes, dejando que la CDS de ABAP resuelva la consulta.

La consulta se realiza inyectando los filtros OData en la URL y obligando la expansión de los nodos hijos mediante `$expand`.

**Ejemplo de Petición OData (Filtrando por el Folio POS `PurchNoC`):**
`/ZAPI_DOCVTAS_CHECK?$expand=to_salesdoc_items,to_zsdt_vbak,to_zsdt_vbap&$filter=PurchNoC eq 'ZSD_ZMER_002'`

### 2.1 Requisitos Mínimos de Búsqueda
La lógica en ABAP exige que al menos se envíe la Referencia del Cliente (Folio POS) o un campo equivalente en el `$filter` (ej. `PurchNoC eq 'XYZ'`). De lo contrario, SAP arrojará un error lógico `ZSD 001`. 

### 2.2 Requisitos No Funcionales (Paginación)
La API soporta sentencias `$top` y `$skip` para restringir o paginar consultas masivas (límite sugerido en ABAP: 300 registros).

---

## 3. Lógica de Respuesta (Response Payload)

El Response retornará un OData Feed donde cada "Entry" principal es la Cabecera estándar del Documento, acompañada de sus relaciones navegacionales (Hijos).

### 3.1 Cabecera Base (Datos Estándar)
Contiene la información general `ZSALESDOC_HEADER` (fusionada en la respuesta OData):
- `DocNumber` (VBELN), `DocType` (Clase de documento), `PurchNoC` (FolioPOS), `SalesOrg` (UEN), `DistrChan`, `Total`, `Currency`, etc.

### 3.2 Relaciones Extendidas (`$expand`)

Para obtener el panorama completo del documento, la respuesta embebe tres colecciones anidadas:

**A. `to_salesdoc_items` (Posiciones Estándar)**
- Arreglo de los ítems del documento (`ItmNo`, `Material`, `Plant`, `StoreLoc`, `Batch`).

**B. `to_zsdt_vbak` (Datos Z Cabecera - MAVI)**
- Objeto único que mapea todos los campos personalizados de la cabecera: `Zconcepto`, `Zreferencia`, `Zsituacion`, `Zidstatus`, Agentes (`Zkunnr1...4`), montos de puntos, estatus de crédito, etc. (Tabla `ZSDT_VBAK`).

**C. `to_zsdt_vbap` (Datos Z Posición - MAVI)**
- Arreglo que mapea los campos personalizados por cada posición: `POSNR`, `KWERT` (Precio anterior), `ZDESCREXTRA`, `ZPUNTOS`, `ZIDCAMPAPROMO`, `ZPADRE`, etc. (Tabla `ZSDT_VBAP`).

### 3.3 Mensajes de Error (ABAP)
Si no se encuentra el documento con los filtros proveídos, SAP no regresará la estructura anterior, sino un error en la estructura `RETURN` indicando:
`Type="E", ID="ZSD", NUMBER="002", MESSAGE="No se encontró ningún documento..."`.

---

## 4. Detalles Técnicos
- **Objeto S4**: `ZAPI_DOCVTAS_CHECK_CDS`
- **Artefacto CPI**: `RSG_SD36_ZAPI_DOCVTAS_CHECK_CDS`
- **Entidad OData**: `/ZAPI_DOCVTAS_CHECK`
- **Método**: `GET`
- **Seguridad**: Autenticación Bearer Token (OAuth 2.0). No requiere `X-CSRF-TOKEN` al ser una operación de Solo Lectura.
