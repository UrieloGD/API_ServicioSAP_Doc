# Mapeo del Metodo: `POST /prospecto/recuperarcuenta` - Capa DMZ (Proxy)

**Archivo:** `APIMagentoDMZ/WebApiMagento/Controllers/ProspectoController.cs`
**Capa:** DMZ (Centinela)
**Rol en el flujo:** Proxy de entrada.

---

## Flujo de Ejecucion

1. Recibe peticion POST en la ruta /prospecto/recuperarcuenta.
2. Se encontro controlador en DMZ. Su rol es recibir la peticion POST y llamar a LAN.

## Interacciones con Base de Datos

**Ninguna directa.**
