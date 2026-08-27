# Mapeo del Método: `POST /customerService/LoginClienteCredito` — Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CustomerServiceController.cs`
**Método:** `LoginClienteCredito(LoginClienteCreditoRequest request)` — Líneas 204–212
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Recibe la petición desde el exterior, la serializa y la redirige mediante Curl (bypass) hacia la capa LAN.

---

## Flujo de Ejecución
1. Valida que el `request` no sea nulo; si lo es, arroja `HttpResponseException(HttpStatusCode.BadRequest)`.
2. Instancia la clase `Curl`.
3. Ejecuta `curl.Post("customerService/LoginClienteCredito", JsonConvert.SerializeObject(request))`.
4. Aplica `.Trim('"')` a la respuesta para limpiar posibles comillas dobles.
5. Retorna `Ok(JsonConvert.DeserializeObject(response))`.

## Interacciones con Base de Datos
**Ninguna.**

## Ejemplo de Request Body
```json
{
  "ClientNumber": "C00000020"
}
```

## Ejemplo de Response
```json
{
  "nombreCliente": "JUAN PEREZ LOPEZ",
  "email": "juan.perez@correo.com"
}
```

