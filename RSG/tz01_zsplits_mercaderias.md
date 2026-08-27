# TZ01 - Parcialidades Mercaderías (ZME_SPLITS)

**Proyecto:** MAVI  
**Número de Delta:** N-TZ01-Mercaderías  
**Descripción:** API para creación, consulta, actualización y eliminación de parcialidades en tabla `Zsplits` Mercaderías (`ZME_SPLITS`).

---

## 1. Contexto Funcional y Supuestos
El negocio requiere llevar el control de las Facturas de mercadería a nivel de **parcialidad**. Para esto, se creó la tabla `ZME_SPLIT` en S/4HANA. 
El sistema legado (C# / BAS) utilizará esta API expuesta para realizar operaciones completas CRUD (Lectura, Creación, Modificación, Eliminación) y gestionar el ciclo de vida de los abonos.

**Supuestos:**
- El cliente (C#) define el periodo de tiempo en el cual se ejecutará el llamado a la API.
- C# contendrá la lógica de orquestación de negocio para consumir los métodos descritos.

---

## 2. Información Técnica del Servicio (S/4HANA OData V4)

- **Nombre del Objeto S4:** `zsb_ntz01_zsplit_merc`
- **URL Base:** `/sap/opu/odata4/sap/zsb_ntz01_zsplit_merc/srvd_a2x/sap/zsd_ntz01_zsplit_merc/0001/`
- **Tipo de Servicio:** Sincrónico / RESTful OData V4
- **Entidad Principal:** `zsplits`

### Soporte OData
El servicio permite el consumo estándar de OData: `$filter`, `$orderby`, `$top`, `$skip`, `$select`. Para consultas masivas, se debe considerar la implementación paginada (`$top` y `$skip`). También soporta ejecuciones en `$batch`.

---

## 3. Estructura de Datos (Tabla ZME_SPLITS)

### Campos Llave (Primary Keys)
Para realizar cualquier operación específica, se requieren las 3 llaves:
1. `FKART` (Clase de factura) - CHAR(4)
2. `VBELN` (Documento de facturación) - CHAR(10)
3. `ZSPLIT` (Número de parcialidad) - INT4

### Diccionario de Datos (Payload Expuesto)
*(Se listan los campos principales utilizados para transacciones y saldos)*
- **Datos de Origen:** `FKDAT` (Fecha Factura), `VKORG`, `VTWEG`, `VKBUR`, `VGBEL` (Doc Modelo), `AUGRU_AUFT`, `PARTNER`, `ZBF` (BP Beneficiario Final).
- **Importes y Fechas Base:** `ZTOTAL`, `ZZTERM` (Condición Pago), `ZMONTO_SPLIT`, `ZVENC_SPLIT` (Vencimiento), `ZCONC_SPLIT` (Conclusión).
- **Saldos y Abonos:** `ZSALDO` (Saldo Actual), `ZABONOS` (Sumatoria Abonos), `ZANTICIPOS`, `ZCOBROS`, `ZADJUDICA`.
- **Bonificaciones:** `ZBON_CC` (Contado Comercial), `ZBON_PP` (Pago Puntual), `ZBON_EXT` (Extendida), `ZBON_AUT`, `ZBON_MAN`, `ZMONEDERO`.
- **Mora y Quebrantos:** `ZMORATORIO` (Interés Diario), `ZREMANENTE`, `ZULT_PAGO_IM`, `ZQUEBRANTO`, `ZMONTO_QF` (Quebranto Fiscal).
- **Banderas / Control:** `ZANULA` (Parcialidad Anulada), `ZINTERV` (Intervenida), `ZDIAS_VENC` (Días Vencidos), `ZSDO_INICIAL`.

---

## 4. Operaciones CRUD y Lógica de Validación

### 4.1 Método GET (Lectura)
Retorna todos los registros que cumplan con la condición de los filtros sugeridos (`$filter`).
- **Filtros Clave Soportados:** `VBELN` (Doc Facturación), `FKDAT` (Rangos Fecha), `PARTNER`, `ZSPLIT`, `ZSALDO`, `ZDIAS_VENC`, etc.
- **Ejemplo S4:** `GET .../zsplits?$filter=Vbeln eq '9000000136' and Zsplit eq 3`

### 4.2 Método POST (Creación de Registros)
Crea una o más parcialidades nuevas en la tabla `ZME_SPLITS`. Puede enviarse individualmente o mediante `$batch`.
- **Validaciones S4:**
  - Valida que la combinación llave (`FKART`, `VBELN`, `ZSPLIT`) **NO exista**.
  - Si existe, aborta la creación y retorna el mensaje de error de S4 (HTTP 400/500).
  - Si no existe, inserta y retorna éxito (HTTP 201/204).

### 4.3 Método PATCH (Actualización Parcial)
Permite modificar uno o más campos de un registro específico (apuntando a la URL con las llaves).
- **Validaciones S4:**
  - Valida que la combinación llave **SÍ exista**.
  - Si existe, ejecuta el UPDATE sobre los campos enviados en el Body. Retorna HTTP 204.
  - Si no existe, retorna mensaje de error.
- **Ejemplo S4:** `PATCH .../zsplits(Fkart='ZMER',Vbeln='9000000137',Zsplit=6)`

### 4.4 Método DELETE (Eliminación)
Borra un registro físico de la tabla apuntando a sus llaves.
- **Validaciones S4:**
  - Valida que la combinación llave **SÍ exista**.
  - Si existe, ejecuta la eliminación y retorna HTTP 204.
  - Si no existe, retorna error.

---

## 5. Pruebas Unitarias S4HANA (.NET C# Consumer)

### Ejemplo Payload POST (Registro Nuevo)
```json
{
    "Fkart": "ZMER",
    "Vbeln": "9000000136",
    "Zsplit": 20,
    "Fkdat": "2024-07-07",
    "Vkorg": "1",
    "Vtweg": "2",
    "Vkbur": "1",
    "Vgbel": "9000000000",
    "Partner": "1500000082",
    "Ztotal": 12000.00,
    "Zzterm": "NT30",
    "ZmontoSplit": 1000.00,
    "ZvencSplit": "2024-08-07",
    "Zsaldo": 1000.00,
    "Zmoneda": "MXN"
    // ... (El resto de campos numéricos se inicializan en 0.00 o null)
}
```

### Ejemplo Ejecución Múltiple ($batch)
Para insertar o procesar múltiples parcialidades en un solo viaje HTTP hacia OData V4:
```http
POST .../$batch?sap-client=110
Content-Type: multipart/mixed; boundary=changeset_21cc-1e7e-f982

--changeset_21cc-1e7e-f982
Content-Type: application/http
Content-Transfer-Encoding: binary

POST zsplits HTTP/1.1 
Content-Type: application/json

{ "Fkart": "ZMER", "Vbeln": "9000000136", "Zsplit": 25, ... }
--changeset_21cc-1e7e-f982
Content-Type: application/http 
Content-Transfer-Encoding: binary

POST zsplits HTTP/1.1
Content-Type: application/json

{ "Fkart": "ZMER", "Vbeln": "9000000136", "Zsplit": 26, ... }
--changeset_21cc-1e7e-f982--
```

> [!NOTE]
> **Aclaración Arquitectónica:** Se han omitido deliberadamente los esquemas de autorización de CPI y los resultados crudos de ABAP. El C# deberá instanciar `HttpClient` con el Token y apuntar a las URLs y `$batch` documentados aquí.

---
*Etiquetas: #TZ01 #Abonos #ZME_SPLITS #Mercaderias #ODataV4 #S4HANA #CRUD*
