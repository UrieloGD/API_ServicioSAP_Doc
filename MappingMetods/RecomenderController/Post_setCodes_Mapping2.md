# Mapeo del Endpoint: `POST /recommender/setCodes`

**Controlador/Clase:** `RecommenderController`
**Método Principal:** `setCodes(RecommenderIntelisis recommender)`

## Flujo de Ejecución Detallado
1. **Petición HTTP:** El cliente envía una petición POST a `/recommender/setCodes` con el modelo `RecommenderIntelisis` que contiene (entre otros) `customerAccount`, `requestedCodes`, y `uen`.
2. **Invocación del Método:** El controlador manda a llamar a `RecommenderMethods.TraerCodigosRecomendadoscliente`. Pasa el valor `"1"` en el parámetro de operación.
    *   > [!WARNING]
        > **¡ATENCIÓN A UN POSIBLE BUG EN C#!** 
        > En la línea 45 de `RecomenderController.cs`, los parámetros se mandan en este orden: `("1", customerAccount, requestedCodes, "WEB", uen)`. 
        > Sin embargo, la firma del método en `RecommenderMethods.cs` es: `(string op, string search, int uen, string aplicacion, int cantidad)`.
        > Esto significa que **están invirtiendo los valores**: el SP está recibiendo la cantidad solicitada en la variable `@Uen`, y el número de sucursal (uen) en la variable `@Cantidad`. Revisa esto urgentemente.
3. **Lógica de Datos (C#):** El método configura los parámetros SQL, donde `@opcion` recibe `"1"` y `@Aplicacion` recibe `"WEB"`. 
4. **Ejecución del SP (Opción 1):** Dentro de `SpCREDICodigoRecomendador`, la `IF (@opcion = 1)` hace lo siguiente:
   - **Lectura de Parámetros:** Consulta la tabla `CREDICMenudeoParametros` para saber cuántos días de vigencia tiene un cupón y calcula la fecha de vencimiento (`@fechaFinal`).
   - **Asignación (UPDATE):** Realiza un `UPDATE TOP (@Cantidad)` en la tabla `CREDIDCodigoRecomendador`. Toma "N" códigos que estén libres (o vencidos sin canjear) y se los apropia al cliente (`@search`), limpiando los campos de invitado y asignándoles la nueva `FechaVencimiento`. 
   - *Nota: Usa una tabla temporal `#TEMPID` para guardar los IDs afectados por el UPDATE.*
   - **Retorno de Códigos:** Finalmente hace un `SELECT` uniendo la tabla temporal con `CREDIDCodigoRecomendador` para devolverle a C# los códigos que acaba de asignar en el formato `Codigo|IdCodigoRecomendador`.
5. **Retorno (C#):** C# lee el resultado, iterando sobre las filas devueltas y empaquetándolas en un `List<List<string>>`.

## Interacciones con Base de Datos (Tablas y SPs)

```csv
NombreTabla, Accion, Campos Principales, Nombre TablaSAP, API SAP
CREDICMenudeoParametros, Select, "VALOR, Descripcion", , 
CREDIDCodigoRecomendador, Update, "Cliente, FechaVencimiento, FechaRegistro, UEN, Aplicacion", , 
CREDIDCodigoRecomendador, Select, "Codigo, IdCodigoRecomendador", , 
SpCREDICodigoRecomendador, Execute, "@opcion, @search, @Uen, @Aplicacion, @Cantidad", , 
```

## Ejemplo de Respuesta (Response)
El resultado es un arreglo de arreglos. Retorna la lista de los códigos que le fueron asignados al cliente. Cada celda es una concatenación de "Código | ID".

### Caso Éxito
```json
[
  [
    "X9F8J2|45281"
  ],
  [
    "A1B2C3|45282"
  ]
]
```

### Caso Fallido (No encontró la tabla en el DataSet)
```json
[
  [
    "vacio"
  ]
]
```
