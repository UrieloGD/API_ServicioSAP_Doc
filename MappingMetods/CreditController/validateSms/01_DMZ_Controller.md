# Mapeo del Metodo: `POST /credit/validateSms` - Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/CreditController.cs`
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecucion

1. Recibe peticion POST en la ruta /credit/validateSms.
2. Se encontro controlador en DMZ. Su rol es recibir la peticion POST y llamar a LAN.

## Interacciones con Base de Datos

**Ninguna directa.**
