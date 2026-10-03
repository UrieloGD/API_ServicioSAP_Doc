# Guía: abrir `\\172.16.214.58\sap` en Claude Code

_Creada: 2026-09-17 · Actualizada: 2026-09-26 — ruta cambiada a `\\172.16.214.58\sap`_

Cómo acceder al proyecto de Migración SAP (en la máquina de `magalindo`) desde las máquinas de Claude Code, y cómo revertir lo que se configura.

> **Usa siempre `\\172.16.214.58\sap`** — por IP y con el recurso `sap`.
> Verificado el 2026-09-25 desde `CATECINF214119D` (172.16.214.119): lectura y escritura funcionan directamente, sin configurar nada más.

---

## 1. La ruta

| Dónde | Cómo se escribe |
|---|---|
| Windows / PowerShell / Explorador | `\\172.16.214.58\sap` |
| Bash | `"//172.16.214.58/sap"` — con barras normales y entre comillas |

El nombre del recurso (`sap`) no lleva espacios, a diferencia de la ruta anterior. Aun así, en Bash conviene entrecomillar siempre.

Comprobación rápida (PowerShell):

```bat
Test-Path '\\172.16.214.58\sap'
```

Debe devolver `True`. Si devuelve `False`, primero comprobar que la máquina esté encendida:

```bat
ping -n 1 172.16.214.58
```

## 2. El resolver de carpetas de la app

El resolver de carpetas de la app **no acepta rutas de red** (falla con `The requested directory could not be resolved.`). El shell (Bash / PowerShell) **sí** lee la ruta sin problema, así que el bloqueo es solo de la app.

Para trabajar sobre el recurso: cambiar la carpeta del workspace desde la UI de la app, o conceder acceso con el selector de carpetas nativo (Claude puede lanzarlo) navegando al recurso.

## 3. Mapeo de unidad (opcional)

No hace falta para acceder: la ruta funciona directamente. Solo es cómodo para trabajar desde una terminal:

```bat
net use Z: "\\172.16.214.58\sap" /persistent:no
```

**No usar `M:`**: en la máquina de Claude ya está ocupada por `\\CATECINF214230D\mavi-pwa`. `/persistent:no` hace que la unidad desaparezca al cerrar sesión de Windows.

Para quitarla antes:

```bat
net use Z: /delete
```

## 4. Git: *dubious ownership*

Git se niega a operar sobre repos en rutas de red hasta que se declaran seguras (`fatal: detected dubious ownership in repository at ...`). Se declara cada repo, uno por uno:

```bat
git config --global --add safe.directory "%(prefix)///172.16.214.58/sap/ServicioSAP"
git config --global --add safe.directory "%(prefix)///172.16.214.58/sap/DMZ"
git config --global --add safe.directory "%(prefix)///172.16.214.58/sap/LAN"
git config --global --add safe.directory "%(prefix)///172.16.214.58/sap/.agents/skills/lan-sap-migration"
```

Detalles de sintaxis que importan: el prefijo `%(prefix)//` seguido de **tres** barras antes de la IP, y **barras normales** aunque sea una ruta de Windows.

Comprobar qué quedó declarado:

```bat
git config --global --get-all safe.directory
```

## 5. Qué hay en el recurso

Verificado el 2026-09-25 listando `\\172.16.214.58\sap`:

| Carpeta | Qué es | Repo git |
|---|---|---|
| `ServicioSAP` | El servicio destino de la migración. C# .NET Framework 4.7.2, ASP.NET Web API 2 | sí — TFS `mavivstf01:8080/tfs/MaviNet/eCommerce TI/_git/ServicioSAP` |
| `DMZ` | `WebApiMagento` de la DMZ: puente entre Magento y LAN/SAP | sí |
| `LAN` | `WebApiMagento` heredado (Intelisis). Es de donde se migra | sí |
| `Magento248` | Frontend Magento 2.4.8 | — |
| `businesspartner-dev` | Python/FastAPI + Lambdas. Referencia de cómo se consumen las OData de BP | — |
| `salesanddistribution-dev` | Ídem para el módulo SD | — |
| `.agents\skills\lan-sap-migration` | La skill: `SKILL.md`, `SPsOrden\`, `MappingMetods\`, `RSG\`, `Resources\`, `Checklists\` | sí — `github.com/UrieloGD/API_ServicioSAP_Doc` |
| `ExcelAnalyzer`, `ClaudeUsageReport` | Utilidades sueltas | — |

No es un monorepo: cada carpeta con `.git` es un repo independiente. Por eso la lista de `safe.directory` de §4 lleva una entrada por repo.

## 6. No usar `\\CATECINF214058D\Migracion SAP`

La ruta por nombre de máquina **falla desde las máquinas de Claude** y no hay que reintentarla:

- Con la cuenta de dominio (`GRUPOMAVI\magalindo`) da **`Error de sistema 2240 — No se permite el inicio de sesión del usuario desde esta estación de trabajo`**. La cuenta tiene en Active Directory `Estaciones de trabajo autorizadas: CATECINF214058D` (verificado con `net user magalindo /domain`): solo puede autenticarse desde su propia máquina. No es un permiso de la carpeta, así que ningún cambio en la carpeta compartida lo resuelve.
- Con cuenta local (`CATECINF214058D\magalindo`) da **`Error de sistema 86`**: esa cuenta local no existe, porque la máquina está en dominio.

## 7. Consejos al trabajar desde Claude

- **No diagnosticar SMB desde Bash.** Git Bash (MSYS) convierte `\\SERVIDOR\recurso` en `\SERVIDOR\recurso` al pasarlo a `net.exe` y produce un **`Error de sistema 67`** falso. Para `net use`, `Test-Path` y `robocopy`, usar **PowerShell**.
- **Para compilar**, copiar el proyecto a local con `robocopy` desde PowerShell y mapear la carpeta con `subst` a una letra corta. La ruta temporal de Claude más las rutas de los paquetes NuGet superan los 260 caracteres (MAX_PATH) y MSBuild no puede importar los `.props`. Usar el MSBuild de Visual Studio 18 (`C:\Program Files\Microsoft Visual Studio\18\Community\MSBuild\Current\Bin\MSBuild.exe`).
- La máquina espejo `\\CATECINF214034\Compartida` está apagada: no usarla.

## 8. Cambios hechos en la máquina de Claude

Todos son reversibles:

1. Entradas `safe.directory` en el `.gitconfig` global, una por repo (§4). Para quitarlas, editar el `.gitconfig` a mano — `git config --global --unset-all safe.directory` borra también las que se quieran conservar.
2. Unidad `Z:`, si se mapeó (§3). Se quita con `net use Z: /delete`.
3. Letra de `subst` para compilar, si se usó (§7). Desaparece al reiniciar, o con `subst X: /d`.

Ninguno toca el contenido del recurso.
