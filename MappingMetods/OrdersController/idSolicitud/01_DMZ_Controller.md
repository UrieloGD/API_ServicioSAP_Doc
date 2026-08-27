# Mapeo del Metodo: `GET /order/creditStatus/{idSolicitud}` - Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/OrdersController.cs`
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecucion

1. Recibe peticion GET en la ruta /order/creditStatus/{idSolicitud}.
2. Se encontro controlador en DMZ. Su rol es recibir la peticion GET y llamar a LAN.

## Interacciones con Base de Datos

**Ninguna directa.**
