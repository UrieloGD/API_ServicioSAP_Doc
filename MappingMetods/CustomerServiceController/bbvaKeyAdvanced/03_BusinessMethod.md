# Mapeo del Método: `CustomerServiceMethods.GetBBVAKeyAdvanced()` — Lógica de Negocio

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `public static string GetBBVAKeyAdvanced()` — Líneas 1124–1167
**Capa:** LAN (Nexo)
**Rol en el flujo:** Consulta a un servicio web SOAP (WSeCommerceMX) para obtener la Master Seguridad.

---

## Flujo de Ejecución Detallado

1. Construye un sobre SOAP (`soapEnvelope`) XML dirigido a `http://WSeCommerceMX.asmx/GetMasterSeguridad`.
2. Inyecta el `{CODIGO_ENT}` en el header XML (nota: en el código se ve literal `{CODIGO_ENT}` dentro de interpolación de strings, lo que sugiere que podría estar tomando una variable global, aunque no fue resuelta en la búsqueda local, o podría estar quemado así si es un placeholder que el webservice procesa).
3. Hace un `POST` HTTP vía RestClient hacia `APIKEY_URL` (definido en AppSettings como `MULTIPAGOS_APIKEY_URL`).
4. Añade headers SOAPAction y Content-Type.
5. Ejecuta la llamada. Si el StatusCode no es `OK`, retorna `"Ocurrio un error"`.
6. Si es `OK`, parsea la respuesta XML usando `XDocument`.
7. Extrae el valor del nodo `GetMasterSeguridadResult` y lo retorna.
8. En catch, loguea en `customerService.log` y relanza la excepción.

## Interacciones con Base de Datos

**Ninguna directa.** Consumo de API externa SOAP.
