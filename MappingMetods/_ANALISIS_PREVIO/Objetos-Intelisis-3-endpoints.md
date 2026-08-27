# Objetos de Intelisis usados por los 3 endpoints diferidos
### Hoja de trabajo para investigar equivalencias en SAP

Los 3 endpoints que quedaron dentro de las 18 "sin Intelisis" pero cuyo fallback sí llega a `IntelisisTmp` (MAVICUBOS).

---

## 1 · `POST credit/CreditoWeb_FormDatos`

**Ruta de código**: `CreditController.cs:145` → `CreditMethods.CreditoWeb_FormDatos` (`CreditMethods.cs:677`)
**Conexión**: `sCadenaConexion` → `MAVICUBOS.grupomavi.com` / `IntelisisTmp`

### Stored procedure

| SP | Firma tal como se invoca |
|---|---|
| `SP_CREDITO_WEB_VALORES_FORM` | `SP_CREDITO_WEB_VALORES_FORM @Op, @Val, @Uen, @File, '', '', ''` |

| Parámetro | Tipo | Origen |
|---|---|---|
| `@Op` | `VARCHAR(MAX)` | operación solicitada |
| `@Val` | `VARCHAR(MAX)` | valor de búsqueda |
| `@Uen` | `INT` | 1 = Muebles América · 2 = VIU |
| `@File` | `VARBINARY` | siempre `new byte[1]` (vacío) |
| 3 posicionales | — | siempre `''` |

### Valores de `@Op` observados en el código

| `op` | Invocado desde | ¿Cubierto hoy por SQLite? |
|---|---|---|
| `GetAnioMes` | `CreditController.cs:151`, `LoadCredilanaInfo:703` | Sí — `antiguedad_domiciliaria` |
| `EstadosMA` | `CreditController.cs:154`, `LoadCredilanaInfo:708` | Sí — `estados_ma` |
| `EstadosVIU` | `CreditController.cs:157`, `LoadCredilanaInfo:715` | Sí — `estados_viu` |
| `DelegacionMA` | `CreditController.cs:160`, `LoadCredilanaInfo:723` | Sí — `municipios_ma_{estado}` |
| `DelegacionVIU` | `CreditController.cs:163`, `LoadCredilanaInfo:732` | Sí — `municipios_viu_{estado}` |
| `GetAtencionClientes` | `CreditController.cs:166`, `LoadCredilanaInfo:745,751` | Sí — `atencion_clientes_*` |
| `Bonificacion` | `CredyPrestamoMethods.cs:646` | **No** — va directo al SP |
| *(cualquier otro)* | `CreditController.cs:177` fallback | **No** |

> **Todos los `op` conocidos ya tienen caché en SQLite excepto `Bonificacion`.** Esto refuerza la hipótesis de que el fallback está prácticamente muerto — hay que confirmarlo con logs.

### Tablas internas del SP
⚠️ **Desconocidas.** El cuerpo del SP vive en `MAVICUBOS`, servidor al que no se consultó. Ver sección 5.

---

## 2 · `POST credit/CreditoWeb_Informacion`

**Ruta de código**: `CreditController.cs:289` → `CreditMethods.CreditoWeb_Informacion` (`CreditMethods.cs:1191`)
**Conexión**: `sCadenaConexion` → `IntelisisTmp`

### Stored procedure

| SP | Firma tal como se invoca |
|---|---|
| `SPCREDICredilana` | `SPCREDICredilana @Op, null, null, null, null, @Val, @Uen` |

Firma completa (deducida de `CredyPrestamoMethods.SeguroVida:604`, que llama al mismo SP):

| Posición | Parámetro | Tipo | Valor en `CreditoWeb_Informacion` |
|---|---|---|---|
| 1 | `@Op` | `VARCHAR(MAX)` | operación |
| 2 | `@Cliente` | `VARCHAR(MAX)` | `null` |
| 3 | `@Nombre` | `VARCHAR(MAX)` | `null` |
| 4 | `@ApellidoPaterno` | `VARCHAR(MAX)` | `null` |
| 5 | `@ApellidoMaterno` | `VARCHAR(MAX)` | `null` |
| 6 | `@Val` | `VARCHAR(MAX)` | valor de búsqueda |
| 7 | `@Uen` | `INT` | 1 · 2 |

### Valores de `@Op` observados

| `op` | Invocado desde | ¿Cubierto por SQLite? |
|---|---|---|
| `banco` + `@Val=BINESBANCARIOS` | `CreditController.cs:296` | Sí — `bancos_bines` |
| `banco` + `@Val=INSTITUCIONESUC` | `CreditController.cs:299` | Sí — `bancos_instituciones` |
| `GeLeyendaCatDimas` | `CreditController.cs:303` | Sí — `leyenda_dimas` |
| `Artc` | `CredyPrestamoMethods.cs:662` | **No** |
| `Condicion` | `CredyPrestamoMethods.cs:665` | **No** |
| `CteInfo` | `CreditMethods.cs:1193` | **No** |
| `ActTelCredilana` | `CredyPrestamoMethods.cs:566` | **No** |
| `QuitarTelValidado` | `CredyPrestamoMethods.cs:567` | **No** |
| `GetSeguroVidaInfo` | `CredyPrestamoMethods.cs:612` | **No** (vía `SeguroVida`, código muerto) |

### Query inline adicional — solo cuando `op = "CteInfo"`
`CreditMethods.cs:1249-1260`

```sql
SELECT * FROM (
  SELECT TOP 1
    dbo.FnVTASMuestraCuatro(CuentaCLABE) ClabeCuenta,
    STP.Participante AS Banco,
    ValidacionTD
  FROM CREDIDCuentaCLABEDispersion AS CREDI WITH (NOLOCK)
  JOIN CREDICConfiguracionSTP AS STP WITH (NOLOCK)
    ON STP.Clave = CREDI.InstitucionBancaria
  WHERE Cliente = @Client
  ORDER BY FechaCapturaModificacion DESC
) AS Ultimo
WHERE Ultimo.ValidacionTD = 4;
```

| Objeto | Tipo | Columnas usadas |
|---|---|---|
| `CREDIDCuentaCLABEDispersion` | Tabla | `CuentaCLABE`, `InstitucionBancaria`, `Cliente`, `ValidacionTD`, `FechaCapturaModificacion` |
| `CREDICConfiguracionSTP` | Tabla | `Clave`, `Participante` |
| `dbo.FnVTASMuestraCuatro` | Función escalar | Enmascara la CLABE mostrando 4 dígitos |

### Dependencia — `NombreCliente(cliente, uen)`
`CreditMethods.cs:1809`, se ejecuta antes cuando `op = "CteInfo"`

| Objeto | Tipo | Columnas / filtros |
|---|---|---|
| `dbo.FNVTASValidarEmpleado` | Función escalar | Recibe `@Cliente`; si devuelve valor, bloquea la compra a crédito |
| `Cte` | Tabla | `PersonalNombres`, `PersonalApellidoPaterno`, `PersonalApellidoMaterno`, `Cliente`, `Estatus = 'ALTA'` |
| `CteEnviarA` | Tabla | `Cliente`, `ID IN (3, 76)` si UEN=1 · `ID IN (7)` si UEN=2 · `Categoria = 'CREDITO MENUDEO'` |

---

## 3 · `POST credit/ExistRFCAndPhoneCte`

**Ruta de código**: `CreditController.cs:376` → `CreditMethods.ExistRFCAndPhoneCte` (`:1414`) → `CURPValidation` (`:1423`) + `RFCValidation` (`:1494`)

> ⚠️ **Todo el SQL de abajo es hoy inalcanzable**: ambos métodos tienen un `return` incondicional en su primera línea (`:1426` y `:1496`). El inventario se documenta por si se decide reactivar la validación.

### `CURPValidation` — 3 consultas

**a)** BD `Comercializadora` (conexión `sCadenaComercializadora`) — *además está comentada dentro del método*
```sql
SELECT * FROM Personal WITH(NOLOCK) WHERE registro = @CURP AND Estatus = 'ALTA'
```
| Objeto | BD | Columnas |
|---|---|---|
| `Personal` | Comercializadora | `registro` (CURP), `Estatus` |

**b)** BD `IntelisisTmp`
```sql
SELECT Curp FROM cte WITH(NOLOCK) WHERE Cliente LIKE 'C%' AND CURP = @CURP;
```
| Objeto | Columnas |
|---|---|
| `Cte` | `Curp`, `Cliente` |

**c)** BD `IntelisisTmp` — solicitudes pendientes
```sql
SELECT M.* FROM Cte C
JOIN Venta V ON V.Cliente = C.Cliente
JOIN MOVBITACORA M ON V.ID = M.ID
WHERE C.Cliente LIKE 'P%' AND C.Curp = @CURP
ORDER BY M.Fecha DESC;
```
| Objeto | Columnas usadas |
|---|---|
| `Cte` | `Cliente`, `Curp` |
| `Venta` | `Cliente`, `ID` |
| `MOVBITACORA` | `ID`, `Fecha` |

### `RFCValidation` — 3 consultas

**a)** Existencia por RFC
```sql
SELECT Cliente FROM Cte WITH (NOLOCK) WHERE SUBSTRING(Rfc, 1, 10) = @Rfc;
```

**b)** RFC + teléfono
```sql
SELECT C.Cliente FROM Cte AS C WITH (NOLOCK)
LEFT JOIN CTETEl AS CT WITH (NOLOCK) ON CT.Cliente = C.Cliente
WHERE SUBSTRING(C.Rfc, 1, 10) = @Rfc AND CONCAT(CT.Lada, CT.Telefono) = @Phone;
```

**c)** RFC + canal de venta
```sql
SELECT C.Cliente FROM Cte AS C WITH (NOLOCK)
LEFT JOIN CteEnviarA AS CE WITH(NOLOCK) ON CE.Cliente = C.Cliente
WHERE SUBSTRING(C.Rfc, 1, 10) = @Rfc AND CE.ID = @Chanel;
```
`@Chanel` = `3` si UEN=1 · `7` si UEN=2

| Objeto | Columnas usadas |
|---|---|
| `Cte` | `Cliente`, `Rfc` (primeros 10 caracteres) |
| `CteTel` | `Cliente`, `Lada`, `Telefono` |
| `CteEnviarA` | `Cliente`, `ID` |

---

## 4 · Alimentador del caché — `LoadCredilanaInfo`

No es uno de los 3 endpoints, pero es lo que da valor a `credit/GetCreditAmounts` y a las ramas SQLite de los otros dos. **Sin equivalente en SAP, el caché queda congelado.**

`CredyPrestamoMethods.cs:675` → `GetCreditAmmountCteN` (`:299`)

```sql
SELECT * FROM dbo.FnVTASListaCredilanas(@uen)
```

| Objeto | Tipo | Salida (por posición, según el consumo en `:317-374`) |
|---|---|---|
| `dbo.FnVTASListaCredilanas` | Función tabular | `[1]` artículo · `[2]` monto · `[3]` total · `[4]` total pago puntual · `[5]` bonificación · `[6]` tasa · `[7]` CAT · `[8]` tasa SPP · `[9]` CAT SPP · `[10]` condición |

Además invoca `SP_CREDITO_WEB_VALORES_FORM` y `SPCREDICredilana` (secciones 1 y 2).

---

## 5 · Consolidado para investigar equivalencias

### Stored procedures — cuerpo desconocido

| SP | Usado por | Estado |
|---|---|---|
| `SP_CREDITO_WEB_VALORES_FORM` | `CreditoWeb_FormDatos` + alimentador | ⚠️ Definición no consultada |
| `SPCREDICredilana` | `CreditoWeb_Informacion` + alimentador + `SeguroVida` | ⚠️ Definición no consultada |

### Funciones

| Función | Tipo | Usada por |
|---|---|---|
| `dbo.FnVTASListaCredilanas(@uen)` | Tabular | Alimentador |
| `dbo.FnVTASMuestraCuatro(@clabe)` | Escalar | `CreditoWeb_Informacion` op=CteInfo |
| `dbo.FNVTASValidarEmpleado(@cliente)` | Escalar | `NombreCliente` |

### Tablas de `IntelisisTmp`

| Tabla | Usada por | Candidato en SAP |
|---|---|---|
| `Cte` | `NombreCliente`, `CURPValidation`, `RFCValidation` | **Business Partner** — `GET partner/client/{id}` ya existe en ServicioSAP |
| `CteTel` | `RFCValidation` | Teléfonos del BP — `partneraddress/partner/phone` ya existe |
| `CteEnviarA` | `NombreCliente`, `RFCValidation` | Direcciones/canales del BP — `partneraddress/*` ya existe |
| `Venta` | `CURPValidation` | Documento de ventas SD — `sale/filter/{filters}` ya existe |
| `MOVBITACORA` | `CURPValidation` | Bitácora de movimientos — **sin equivalente identificado** |
| `CREDIDCuentaCLABEDispersion` | `CreditoWeb_Informacion` op=CteInfo | **Sin equivalente identificado** — datos bancarios de dispersión |
| `CREDICConfiguracionSTP` | `CreditoWeb_Informacion` op=CteInfo | **Sin equivalente identificado** — catálogo de participantes STP |

### Tablas de `Comercializadora`

| Tabla | Usada por | Nota |
|---|---|---|
| `Personal` | `CURPValidation` | La consulta está comentada. SIGMAVI ya tiene el sinónimo `Personal → ERPMAVI.Comercializadora.dbo.Personal` |

---

## 6 · Lo que falta para cerrar la investigación

Los 2 SPs son cajas negras: **su contenido es justo lo que determina qué objetos de SAP hacen falta.** `SPCREDICredilana` atiende al menos 9 operaciones distintas, así que muy probablemente toca bastantes más tablas que las 7 listadas arriba.

Para obtenerlo hace falta leer sus definiciones en `MAVICUBOS`, con el mismo tipo de consulta read-only que se usó en `MAVICBOSANDROID`:

```sql
SELECT o.name, m.definition
FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id
WHERE o.name IN ('SP_CREDITO_WEB_VALORES_FORM','SPCREDICredilana',
                 'FnVTASListaCredilanas','FnVTASMuestraCuatro','FNVTASValidarEmpleado');
```

Y para extraer las tablas que referencian sin leer todo el cuerpo:

```sql
SELECT DISTINCT o.name AS Modulo, d.referenced_entity_name AS Objeto
FROM sys.sql_expression_dependencies d
JOIN sys.objects o ON o.object_id = d.referencing_id
WHERE o.name IN ('SP_CREDITO_WEB_VALORES_FORM','SPCREDICredilana','FnVTASListaCredilanas')
ORDER BY o.name, d.referenced_entity_name;
```

`MAVICUBOS` es el servidor de Intelisis y no estaba en el alcance autorizado para la consulta anterior.

### Además, pendiente de medir en producción

Cuántas veces se invoca realmente cada `op` que **no** tiene caché en SQLite:
- `SP_CREDITO_WEB_VALORES_FORM`: `Bonificacion` y cualquier `op` no listado
- `SPCREDICredilana`: `Artc`, `Condicion`, `CteInfo`, `ActTelCredilana`, `QuitarTelValidado`

Si el volumen es cero, los bloques 16 y 17 del Gantt (5 días cada uno) colapsan a eliminar la rama del fallback.
