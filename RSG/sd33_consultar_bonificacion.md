---
proyecto: Mavi
id_requerimiento: SD33
descripcion: Especificación Funcional - Consultar Campaña de Bonificación
---

# Especificación Maestra: Consultar Campaña de Bonificación (SD33)

## 1. Contexto Funcional
Esta API permite al sistema POS consultar (mediante un método HTTP `POST` hacia OData) la información de las **Campañas de Bonificación** vigentes o históricas en SAP S/4HANA. Las campañas se almacenan en múltiples tablas Z en el sistema, y la respuesta retornará un arreglo de bonificaciones válidas según los criterios de búsqueda.

---

## 2. Lógica de Petición (Request Payload)

> [!IMPORTANT]
> **REGLA DE ORO DE INTEGRACIÓN:** El código C# (.NET) **NUNCA** consultará por base de datos las tablas Z (ej. `ZTSD_CONF_BONIFI`, `ZTSD_BONF_UEN`, etc.). Solamente mapeará los filtros de búsqueda en el Payload JSON y enviará la petición POST a OData, delegando a la vista CDS interna de SAP la recolección de los datos.

Aunque funcionalmente es una consulta, técnicamente la API en SAP se expone a través del método **`POST`** enviando los criterios de búsqueda en el body principal, debido a la complejidad de las entidades.

### 2.1 Estructura del Nodo Padre (`REQUESTSet`)
Estos campos actúan como **filtros de búsqueda**.

| Parámetro OData | Descripción | Tipo | Comentarios/Reglas |
| :--- | :--- | :--- | :--- |
| `Zidbonconf` | Folio de la Bonificación | INT4 | |
| `Zestatus` | Estatus | CHAR15 | "Aceptada", "Pendiente", "Cancelada" |
| `Zfechaini` | Fecha Inicio | TIMESTAMP| |
| `Zfechafin` | Fecha Fin | TIMESTAMP| |
| `Vkorg` | Organización de Ventas | CHAR4 | |
| `Vtweg` | Canal de Distribución | CHAR2 | |
| `Spart` | Sector | CHAR2 | |
| `Zcondicion` | Condición | CHAR50 | Soporta `*` y listas |
| `Zsucursal` | Sucursal | CHAR50 | Soporta `*` y listas |
| `Zarticulo` | Artículo | CHAR20 | Soporta `*` y listas |
| `Zmovimiento`| Movimiento | CHAR20 | |
| `Zlinea` | Línea | CHAR50 | |

El Request original enviado por el POS también incluye arreglos vacíos de `"RESPONSESet": []` y el nodo `"RETURN": {}` listos para ser poblados por SAP.

---

## 3. Lógica de Respuesta (Response Payload)

Si SAP encuentra promociones que coincidan con los criterios, retornará en el mismo formato el nodo **`RESPONSESet`** poblado con una matriz de objetos.

### 3.1 Estructura del arreglo `RESPONSESet` (Campañas Encontradas)
Cada objeto en este arreglo incluye la suma de todas las tablas Z de bonificaciones en una sola vista plana. Algunos campos destacados:
- **Cabecera**: `Zidbonconf`, `Znombon`, `Zestatus`, `Zfechaini`, `Zfechafin`
- **Porcentajes Base**: `Zporcbon1`, `Zporcbon2`, `Zporcreact`, `ZporcbonFin`
- **Tiempos y Plazos**: `Zplazoeje`, `Zvencantes`, `Zvencdes`, `Zdiasatrazo`, `Zdiasmenores`, `Zdiasmayores`
- **Especificaciones**: `Vkorg`, `Vtweg`, `Spart`, `Zmovimiento`, `Zcondicion`, `Zsucursal`, `Zarticulo`
- **Porcentajes Nivel Artículo**: `art_Zporcbon1`, `art_Zporcbon2`, `art_Zporcreact`
- **Porcentajes Nivel Línea**: `line_Zlinea`, `line_Zporcbon1`, etc.
- **Cascadas y Exclusiones**: `Zencascada`, `excl_Znombon`, `incl_Znombon`, `Zorden`

### 3.2 Nodo `RETURN` (Status de la Consulta)
- Si encuentra datos: `Type="S"`, `Id="ZSD"`, `Number="100"`, `Message="Se han encontrado promociones..."`
- Si no encuentra datos: `Type="E"`, `Id="ZSD"`, `Number="101"`, `Message="No se ha encontrado ninguna bonificación válida..."`

---

## 4. Orquestación ABAP Interna (Informativo)
SAP utiliza una vista **CDS** que agrupa mediante `JOIN` al campo `ZIDBONCONF` las tablas: `ZTSD_CONF_BONIFI`, `ZTSD_BONF_UEN`, `ZTSD_BONF_MOV`, `ZTSD_BONF_COND`, `ZTSD_BONF_SUCUR`, `ZTSD_BONF_ART`, `ZTSD_BONF_VENC`, `ZTSD_BONF_LINE`, `ZTSD_BONF_EXCL` y `ZTSD_BONF_INC`.

---

## 5. Detalles Técnicos
- **Objeto S4**: `ZAPI_CAMPANA_BONIFICACION_SRV`
- **Artefacto CPI**: `RSG_SD33_ZAPI_CAMPANA_BONIFICACION_SRV`
- **Entidad OData**: `/REQUESTSet`
- **Método**: `POST`
- **Seguridad**: Autenticación Bearer Token, requiere `X-CSRF-TOKEN` y JSESSIONID obtenidos previamente mediante llamada `GET` por ser un método `POST`.
