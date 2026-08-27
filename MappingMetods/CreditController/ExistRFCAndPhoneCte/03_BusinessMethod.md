# Mapeo del Método: - Logica de Negocio

**Capa:** LAN (Nexo)
**Rol en el flujo:** Procesamiento de logica de negocio e interacciones con BD.

---

## Flujo de Ejecucion Detallado (Extraido del analisis previo)

# Mapeo del Endpoint: `POST /credit/ExistRFCAndPhoneCte`

**Controlador/Clase:** `CreditController`
**Método Principal:** `ExistRFCAndPhoneCte(ExistRFCAndPhoneCteRequest req)`

## Flujo de Ejecución Detallado
1. **Recepción de la petición:** El endpoint recibe por POST un cuerpo JSON mapeado al modelo `ExistRFCAndPhoneCteRequest` (con propiedades `Rfc`, `Phone`, `Curp`, y `Uen`).
2. **Llamada a la lógica de negocio:** 
   - El controlador llama al método `cm.ExistRFCAndPhoneCte(req)` y retorna su resultado usando `Json()`.
3. **Ejecución en Base de Datos (Validaciones Directas):**
   - El método divide la lógica en dos validaciones: `CURPValidation` y `RFCValidation`.
   - **`CURPValidation`**:
     - Se conecta a la base de datos Comercializadora (`sCadenaComercializadora`) y ejecuta un `SELECT` a la tabla `Personal` para verificar si la CURP pertenece a un empleado activo.
     - Luego se conecta a la base de datos principal (`sCadenaConexion`) y hace un `SELECT` a la tabla `Cte` para revisar si ya existe como cliente (`Cliente LIKE 'C%'`).
     - Realiza otro `SELECT` cruzando `Cte`, `Venta`, y `MOVBITACORA` para revisar si existe como prospecto (`Cliente LIKE 'P%'`) con solicitudes recientes.
   - **`RFCValidation`**: (Sólo se ejecuta si CURPValidation no arrojó error)
     - Usa la base de datos principal (`sCadenaConexion`).
     - Hace un `SELECT` a la tabla `Cte` usando los primeros 10 caracteres del RFC. Si no encuentra nada, termina exitosamente.
     - Si encuentra algo, realiza un `SELECT` cruzando `Cte` con `CTETEl` (Tabla de teléfonos) filtrando por RFC y Teléfono concatenado (`Lada` + `Telefono`). Si no coinciden, termina indicando que no hay coincidencias con ambos datos.
     - Finalmente, hace un `SELECT` cruzando `Cte` con `CteEnviarA` buscando coincidencias del RFC y un Canal de Ventas (`ID` = 3 o 7 dependiendo si la `Uen` es 1 u otra). Si lo encuentra, marca error indicando que ya existe la cuenta.
4. **Respuesta Final:**
   - Retorna un objeto JSON basado en el modelo `ValidationTypeError` que contiene un booleano (`Error`) y un string (`Message`).

## Interacciones con Base de Datos (Tablas y SPs)

**Consultas directas (Sin SPs):**
Se realizan puros queries directos desde C# usando `SqlCommand`. A continuación las tablas afectadas:

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
Personal (Comercializadora), Select, "registro, Estatus", , 
Cte, Select, "Cliente, Curp, Rfc", , 
Venta, Select, "Cliente, ID", , 
MOVBITACORA, Select, "ID, Fecha", , 
CTETEl, Select, "Cliente, Lada, Telefono", , 
CteEnviarA, Select, "Cliente, ID", , 
```

*(El archivo CSV independiente fue generado en esta carpeta como `Post_ExistRFCAndPhoneCte_Tablas.csv`)*

## Ejemplo de Petición (Request)

```json
{
  "Rfc": "GAMA990101",
  "Phone": "3312345678",
  "Curp": "GAMA990101HJCXYZ00",
  "Uen": 1
}
```

## Ejemplo de Respuesta (Response)

El endpoint retorna un objeto JSON validando si hubo error:

```json
{
  "Error": false,
  "Message": "Puede continuar con la solicitud."
}
```
*(Mensajes posibles: "CURP Invalido.", "Ya existe un registro con esta CURP.", "Ya existe una cuenta o prospecto con estos datos.", etc.)*


## Interacciones con Base de Datos

Ver CSV detallado: [[03_BusinessMethod_DB.csv]]
