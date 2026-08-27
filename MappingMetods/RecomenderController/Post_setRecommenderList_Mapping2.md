# Mapeo del Endpoint: `POST /recommender/setRecommenderList`

**Controlador/Clase:** `RecommenderController`
**Método Principal:** `SetRecommenderList(RecommenderRequest recommender)`

## Flujo de Ejecución Detallado
1. **Petición HTTP:** El cliente envía una petición POST a `/recommender/setRecommenderList` con un objeto JSON (modelo `RecommenderRequest`) que contiene `code`, `uen`, `name`, `phone`, y `kinship`.
2. **Invocación del Método:** El controlador delega la operación a la capa de métodos llamando a `RecommenderMethods.CodigoRecomendador`. Es clave notar que pasa el valor quemado `"2"` en el parámetro `@opcion`, seguido de los datos del payload.
3. **Lógica de Datos (C#):** `CodigoRecomendador` configura la cultura a `es-MX`, establece conexión a Intelisis y prepara la llamada al Stored Procedure `SpCREDICodigoRecomendador`. Asigna los parámetros a los objetos `SqlParameter` (nota: no usa el parámetro `@Nomina` en este llamado, por lo que viajará nulo al SP).
4. **Ejecución del SP (Opción 2):** Dentro de Intelisis, el SP ingresa a la rama `IF (@opcion = 2)` que realiza lo siguiente:
   - **Validación:** Busca en la tabla `CREDIDCodigoRecomendador` el ID del registro donde el `Codigo` coincida con el proporcionado, que sí tenga un cliente asignado, que **no haya sido canjeado** y que **aún esté vigente**.
   - **Si el código es VÁLIDO:**
     1. Extrae el `IdCodigoRecomendador` en una variable temporal.
     2. Actualiza ese registro en la tabla `CREDIDCodigoRecomendador` llenando los campos del invitado (`Nombre`, `Telefono`, `Parentesco`).
     3. Hace una consulta externa a la base de datos `MAVIANDROID01` para obtener el ID de la plantilla del mensaje SMS ("Código Recomendador (Recomienda y Gana)") desde `TcAAEA00030_Mensajes`.
     4. Si encontró el mensaje, inserta un registro en la cola `TcAAea00030_EnvioMensajes` para disparar un mensaje de texto al teléfono del invitado.
     5. Regresa un SELECT con el ID afectado.
   - **Si el código NO ES VÁLIDO (o no existe):**
     - Regresa un SELECT con el valor `-1`.
5. **Formateo de la Respuesta (C#):** El `SqlDataAdapter` llena un `DataSet`. C# toma la primera tabla y la convierte iterando filas y columnas en una variable genérica `List<List<string>>`.
6. **Retorno (C#):** El controlador toma la lista genérica y la devuelve a través de un HTTP 200 (OK), empaquetando todo en JSON.

## Interacciones con Base de Datos (Tablas y SPs)

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
CREDIDCodigoRecomendador, Select, "IdCodigoRecomendador, Codigo, Cliente, FechaCanjeado, FechaVencimiento", , 
CREDIDCodigoRecomendador, Update, "Nombre, Telefono, Parentesco, Nomina", , 
TcAAEA00030_Mensajes, Select, "IdMensaje, Descripcion", , 
TcAAea00030_EnvioMensajes, Insert, "IdRegistro, IdMensaje, Cliente, FechaEnvio, EstatusEnvio, Telefono", , 
SpCREDICodigoRecomendador, Execute, "@opcion, @search, @Uen, @Nombre, @Telefono, @Parentesco", , 
```

## Ejemplo de Respuesta (Response)
Al usar una estructura `List<List<string>>`, el JSON devuelto siempre es un arreglo de arreglos.

### Caso Éxito (El código existía y se actualizó)
```json
[
  [
    "45281"
  ]
]
```
*(El número corresponde al `IdCodigoRecomendador` interno en la base de datos).*

### Caso Fallido (Código vencido, canjeado o inexistente)
```json
[
  [
    "-1"
  ]
]
```
