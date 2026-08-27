# Mapeo del Método: `POST /customerService/LoginClienteCreditoFechaN` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `LoginClienteCreditoFechaN(LoginClienteCreditoFechaNRequest request)` — Líneas 214–222
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy que recibe la petición de validación de fecha de nacimiento y la redirige a la LAN.

---

## Flujo de Ejecución
1. Valida que el `request` no sea nulo; si lo es, arroja `HttpResponseException(HttpStatusCode.BadRequest)`.
2. Instancia la clase `Curl`.
3. Ejecuta `curl.Post("customerService/LoginClienteCreditoFechaN", JsonConvert.SerializeObject(request))`.
4. Limpia la respuesta de comillas sobrantes (`.Trim('"')`).
5. Retorna `Ok(JsonConvert.DeserializeObject(response))`.

## Interacciones con Base de Datos
**Ninguna.**

## Ejemplo de Request Body
```json
{
  "ClientNumber": "C00000020",
  "BirthDate": "1990-05-20"
}
```

