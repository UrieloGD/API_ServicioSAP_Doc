# Mapeo del Método: `POST /order/getOrderId/{idEcommerce}` — Capa LAN (Controller)

**Archivo:** `APIMagento/WebApiMagento/Controllers/OrdersController.cs`
**Método:** `getOrderId(string idEcommerce)` — Líneas **416–434**
**Capa:** LAN (Nexo) — **sin proxy DMZ**; el endpoint DMZ homónimo es su *dependencia*, no su par ([[01_DMZ_Controller]])
**Rol en el flujo:** **No es un dispatcher.** Contiene lógica de orquestación propia: consulta a Magento a través de la DMZ, sanea la respuesta y decide si dispara la escritura en Intelisis.
**Región:** sin `#region`. Entre `generateNewStorepickupCode` (393–414) y `GetOrderInfoAndSet` (436–443).

---

## Flujo de Ejecución

```csharp
[HttpPost]
[Route("getOrderId/{idEcommerce}")]
public IHttpActionResult getOrderId(string idEcommerce)
{
    Curl curl = new Curl();
    string response = curl.Get("magento/getOrderId/" + idEcommerce).Replace("\\\"", "\"").Trim('"'); ;

    if (response != "0" && !response.Contains("System.Net.WebException"))
    {
        OrderMethods om = new OrderMethods();
        om.InsertDetPedido(idEcommerce, response);
    }
    else
    {
        return Ok("0");
    }

    return Ok(response);
}
```

1. Recibe `POST` con un parámetro de ruta `{idEcommerce}` y **sin body**. Controlador con `[Authorize]` y `[RoutePrefix("order")]`.
2. **Sin ninguna guarda.** No valida `null`, ni cadena vacía, ni formato. No hay `try/catch`. No hay `Logger`. Es el endpoint **menos protegido** de los siete analizados en este controlador.
3. **Salida hacia la DMZ (línea 421):**
   ```csharp
   string response = curl.Get("magento/getOrderId/" + idEcommerce).Replace("\\\"", "\"").Trim('"');
   ```
   `Curl` en LAN apunta a `URL_DMZ` (`APIMagento/WebApiMagento/Helper/Curl.cs:21`) → `MagentoController.GetOrderId` en la DMZ → API REST de Magento. Ver [[01_DMZ_Controller]].
   - **`idEcommerce` se concatena crudo en la URL**, sin `Uri.EscapeDataString`. Un valor con `/`, `?`, `#` o `%` cambia la ruta invocada. Ver observación 2.
   - `.Replace("\\\"", "\"").Trim('"')` es un parche de deserialización manual: la DMZ devuelve el valor JSON-encodeado y aquí se desenvuelve a mano en vez de con `JsonConvert`.
   - **Doble punto y coma al final de la línea** (`; ;`) — residuo de edición, inofensivo pero revelador del nivel de revisión del código.
4. **Detección de error por búsqueda de subcadena (línea 423)** — el hallazgo más grave de esta capa:
   ```csharp
   if (response != "0" && !response.Contains("System.Net.WebException"))
   ```
   `Curl.Get` **no lanza**: su `catch` devuelve `e.ToString()` como si fuera el cuerpo de la respuesta (`Helper/Curl.cs:130–133`). Así que este `if` está inspeccionando el **texto de una excepción .NET** para decidir si hubo fallo. Ver observación 1.
5. **Rama de fallo:** `return Ok("0")` — **HTTP 200** con el texto `"0"`, tanto si Magento no encontró el pedido (`json.items == null` en la DMZ → `Ok("0")`) como si la red se cayó.
6. **Rama de éxito:** instancia `OrderMethods` y ejecuta la escritura:
   ```csharp
   om.InsertDetPedido(idEcommerce, response);
   ```
   `InsertDetPedido` es **`void`** (`OrderMethods.cs:453`) y **no tiene `try/catch`** en su cuerpo principal. Ver [[03_BusinessMethod]].
7. `return Ok(response);` — devuelve el `entity_id` de Magento como texto plano.

## Interacciones con Base de Datos

**Ninguna directa** en el controller. Toda la persistencia ocurre en [[03_BusinessMethod]] (`OrderMethods.InsertDetPedido`), que borra y reinserta filas en `eCommerceDetPedidos`.

## Observaciones técnicas detectadas

1. **Detección de errores por `Contains("System.Net.WebException")` — hallazgo principal.** El control de flujo depende de que el texto de una excepción .NET contenga un nombre de clase concreto. Falla en tres direcciones:
   - **Falsos negativos:** `Curl.Get` devuelve `e.ToString()` de *cualquier* excepción. Un `UriFormatException`, un `SocketException` envuelto de otra forma, o un timeout representado por otra clase **no contienen esa cadena** → se toman por respuesta válida y **se pasan como `orderId` a `InsertDetPedido`**, que los inserta en `eCommerceDetPedidos.idOrden`. Es decir: **el texto de un stack trace puede terminar escrito en una columna de la base de datos.**
   - **Falso positivo:** si algún día Magento devolviera legítimamente un texto con esa subcadena, el endpoint lo descartaría.
   - **Acoplamiento a la implementación:** basta cambiar la excepción que lanza `WebClient` (p. ej. al migrar a `HttpClient`, que lanza `HttpRequestException`) para que la detección deje de funcionar **en silencio**.

   La causa raíz está en `Helper/Curl.cs:130–133`, que convierte excepciones en cuerpos de respuesta. La corrección debe hacerse ahí, no aquí.

2. **`idEcommerce` concatenado sin escapar en la URL** (línea 421). Sin `Uri.EscapeDataString`, un valor con caracteres reservados altera la ruta que se invoca en la DMZ. Combinado con la ausencia total de validación (paso 2), es una superficie de manipulación de ruta desde un parámetro controlado por el cliente.

3. **`"0"` significa cuatro cosas distintas.** El literal se produce en dos capas y por cuatro motivos:

   | Origen | Motivo |
   |---|---|
   | DMZ `MagentoController.cs:84` | Magento no encontró el pedido (`json.items == null`) |
   | LAN línea 430 | la respuesta fue `"0"` (propaga el anterior) |
   | LAN línea 430 | hubo un `WebException` (red caída, DMZ inaccesible, 500) |
   | LAN línea 430 | el `idEcommerce` era inválido |

   Los cuatro salen como **HTTP 200 con cuerpo `"0"`**. El consumidor no puede distinguir "no existe" de "no pude preguntar".

4. **Sin `try/catch` en todo el método.** Si `InsertDetPedido` lanza — y **puede**: abre una `SqlConnection`, ejecuta SQL concatenado y **no la cierra nunca** (ver [[03_BusinessMethod]] obs. 3) — la excepción sube al pipeline de Web API y produce un **HTTP 500 con detalle interno** según la configuración de `customErrors`. Contrasta con todos sus vecinos del archivo, que sí envuelven la llamada.

5. **Sin `Logger` en ninguna rama.** Ni entrada, ni resultado, ni error. Es el único de los siete endpoints analizados **sin una sola línea de traza**. Grave por partida doble: (a) viola la Regla #8; (b) como el consumidor del endpoint es desconocido ([[01_DMZ_Controller]]), **la ausencia de log impide identificarlo desde la propia aplicación** — hay que recurrir a los logs de IIS.

6. **`POST` sin body que muta estado por un parámetro de ruta.** Mismo antipatrón de contrato que `createStorepickupCode`. Al menos aquí el verbo es correcto (es una escritura), a diferencia de [[02_LAN_Controller|generateNewStorepickupCode]].

7. **Deserialización JSON hecha a mano** (`.Replace("\\\"", "\"").Trim('"')`). Frágil ante cualquier cambio de formato en la respuesta de la DMZ. Debe usarse `JsonConvert` / un DTO tipado.

8. **Método síncrono con un salto de red y N escrituras a BD en cadena**, con `Curl.Timeout = 9999999` (`Helper/Curl.cs:35, 121`) — sin techo real de duración. Migrar a `async/await` (Regla #12).

> Siguiente eslabón: [[03_BusinessMethod]]

---

#migracion #SAP #dotnet #OrdersController #getOrderId
