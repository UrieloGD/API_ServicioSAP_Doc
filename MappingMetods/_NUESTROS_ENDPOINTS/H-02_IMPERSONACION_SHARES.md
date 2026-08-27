---
tags: [habilitador, impersonacion, smb, permisos, migracion]
partida: H-02
actualizado: 2026-08-06
---

# H-02 — Impersonación y acceso a shares SMB

Ficha de referencia para diagnosticar el bloqueo de H-02. Reúne los valores que usa la LAN hoy, las rutas de destino y lo que ya se comprobó desde el equipo de desarrollo.

Contexto general en [[ESTADO_PRUEBAS_Y_AVANCE]].

## Para qué sirve

ServicioSAP corre bajo la identidad del app pool de IIS, que no tiene permiso sobre los shares de red. Para escribir ahí, el código adopta temporalmente una cuenta de servicio de Windows (`LogonUser` + `Impersonate`), hace la operación de archivo y revierte. Lo necesitan **E-49** (`cashCustomerReport`) y **E-08** (`SaveImagesProductosMx`).

## Credenciales que usa la LAN

Viven **hardcodeadas** en `APIMagento\WebApiMagento\Conn\Connection.cs`, líneas 33–35:

| Campo en el legado | Valor                        | Clave equivalente en `Web.config` de ServicioSAP |
| ------------------ | ---------------------------- | ------------------------------------------------ |
| `domainImages`     | `GRUPOMAVI`                  | `SMB_IMPERSONATION_DOMAIN`                       |
| `userImages`       | `auxsvrwea05qai`             | `SMB_IMPERSONATION_USER`                         |
| `passImages` | `W3bS3rv3r05qai` | `SMB_IMPERSONATION_PASSWORD`                     |

Cuenta completa: **`GRUPOMAVI\auxsvrwea05qai`**

Los tres valores están **idénticos byte a byte** entre `APIMagento\Conn\Connection.cs` (líneas 33–35) y el `Web.config` de ServicioSAP. La contraseña son 14 caracteres, sin espacios al inicio ni al final.

> ⚠️ Este documento contiene una credencial en texto plano. Ya lo estaba en los dos repositorios, pero el vault lo lee más gente: si esa cuenta llega a rotarse, hay que actualizarla también aquí.

## Rutas de destino

| Ruta UNC | Servidor | Quién la usa |
|---|---|---|
| `\\172.16.200.2\mavica\ecom\BaseWhatsapp\STAGE\` | `MAVI02.grupomavi.com` | `CustomerMethods.cs:214` → **E-49** |
| `\\172.16.202.4\ecom\Desarollo\Imagenes Optimizadas WEB\` | `MAVI04.grupomavi.com` | `ProductImage\Methods.cs:395` → **E-08** |
| `\\172.16.200.60\ImagenesWEBMagento\` | `caov.grupomavi.com` | Otro flujo de imágenes del legado |

## Lo comprobado desde el equipo de desarrollo (6 ago)

| Comprobación                                                   | Resultado                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| Puerto 445 en `172.16.200.2` y `172.16.202.4`                  | ✅ Alcanzable                                               |
| Resolución DNS de los tres servidores                          | ✅ `MAVI02`, `MAVI04`, `caov`                               |
| Listar shares con la identidad de dominio del desarrollador    | ✅ Se enumeran (`mavica`, `ecom`, `Magento`, …)             |
| Acceder a las **tres rutas concretas** con esa misma identidad | ❌ Ninguna accesible                                        |
| `LogonUser` con las credenciales del legado                    | ❌ `Win32 1326`                                             |
| ¿Existe `GRUPOMAVI\auxsvrwea05qai` en el directorio?           | ❌ **No.** `net user /domain` y una consulta ADSI coinciden |

## Interpretación

**No es un problema de red ni de ruta.** Los servidores responden, resuelven por DNS y sus shares se enumeran sin problema desde el equipo de desarrollo. Lo que falla es puramente de **identidad**:

1. La cuenta configurada **no existe** en `grupomavi.com`, así que `LogonUser` ni siquiera llega a intentar el acceso al share.
2. Una cuenta de dominio normal (la del desarrollador) **sí ve los shares pero no las carpetas concretas**, lo que confirma que esas rutas tienen permisos restringidos a una cuenta específica — exactamente el motivo por el que existe la impersonación.

Y como los valores son idénticos a los del legado, **APIMagento apunta a la misma cuenta inexistente**. Solo hay dos explicaciones posibles:

- **(a)** La impersonación de APIMagento tampoco funciona hoy, y estos flujos llevan tiempo rotos sin que nadie lo haya notado.
- **(b)** El APIMagento **desplegado** no usa estos valores: o su `Web.config` los sobreescribe, o el binario en producción es más viejo, o —lo más probable— **el app pool de APIMagento ya corre como la cuenta correcta** y la impersonación por código quedó de adorno.

## Qué hace falta para desbloquear

En orden de rapidez:

1. **Mirar el servidor donde corre APIMagento.** Revisar la identidad de su app pool en IIS y su `Web.config` desplegado. Si el pool corre como una cuenta de servicio concreta, ésa es la que da acceso a los shares y la que hay que usar.
2. **Si eso no aclara, pedirla a quien administre AD.** La cuenta necesita permiso de escritura en las rutas de arriba y el derecho *"Permitir el inicio de sesión local"* en el servidor de ServicioSAP — el código usa `LOGON32_LOGON_INTERACTIVE` (tipo 2), que lo exige. Sin ese derecho el error sería `1385`, no `1326`.
3. **Poner los tres valores** en el `Web.config` de ServicioSAP y reintentar. **Un solo intento**: si la contraseña está mal, varios reintentos pueden bloquear la cuenta.

## Posibilidad a descartar: cuenta local del servidor de archivos

Que `auxsvrwea05qai` no aparezca en AD abre la opción de que sea una cuenta **local de MAVI02/MAVI04**, no de dominio. Encajaría con que esté hardcodeada y con el nombre poco convencional.

Si se confirma, el tipo de logon actual no es el adecuado: para usar credenciales ajenas contra un recurso de red sin que la cuenta se resuelva localmente, corresponde `LOGON32_LOGON_NEW_CREDENTIALS` (9) con `LOGON32_PROVIDER_WINNT50` (3).

**Eso rompería la paridad con el legado**, así que no se cambia sin decisión explícita.

## Nota sobre la clase

Desde el 6 ago, `Helpers\Impersonation\Impersonation.cs` es una **réplica literal** de la del legado (`Metodos\ProductImage\Methods.cs:410`). Ya no tiene constructor sin parámetros: igual que en la LAN, **el llamador provee las credenciales**, y el orden es `(usuario, dominio, password)` — usuario primero.
