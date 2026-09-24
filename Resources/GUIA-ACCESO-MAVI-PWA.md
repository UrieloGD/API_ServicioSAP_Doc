# Guía: abrir `\\CATECINF214058D\Migracion SAP` en Claude Code

_Fecha: 2026-09-17_

Resumen de lo que hubo que hacer para poder trabajar sobre este recurso de red desde
una sesión de Claude Code (Windows), y cómo revertirlo.

---

## 1. El problema

El resolver de carpetas de la app **no acepta rutas de red**. Fallan con
`The requested directory could not be resolved.`:

- `\\CATECINF214058D\Migracion SAP` (UNC con barras invertidas)
- `//CATECINF214058D/Migracion SAP` (UNC con barras normales)
- `M:\` (letra mapeada con `net use` al mismo recurso)

En cambio el shell (Bash / PowerShell) **sí** lee la ruta sin problema, así que el
bloqueo es sólo de la app, no del sistema.

## 2. Lo que sí funciona

**Cambiar la carpeta del workspace desde la propia UI de la app.** Es la vía directa
y la que quedó aplicada: la sesión tiene ahora como raíz `\\CATECINF214058D\Migracion SAP`
y las rutas relativas resuelven ahí.

Como alternativa, para **conceder acceso** sin mover la raíz de la sesión, sirve abrir
el selector de carpetas nativo (Claude puede lanzarlo) y navegar al recurso; con eso se
conceden tanto la letra mapeada como la ruta UNC.

## 3. Mapeo de unidad (opcional)

Útil para trabajar cómodo desde una terminal, no es necesario para la app:

```bat
net use M: "\\CATECINF214058D\Migracion SAP" /user:CATECINF214058D\magalindo * /persistent:no
```

`/persistent:no` hace que desaparezca al cerrar sesión de Windows.

Para quitarlo antes:

```bat
net use M: /delete
```

## 4. Git: *dubious ownership*

Git se niega a operar sobre repos en rutas de red hasta que se declaran seguras.
Sin esto, cualquier comando devuelve
`fatal: detected dubious ownership in repository at ...`:

```bat
git config --global --add safe.directory "%(prefix)///CATECINF214058D/Migracion SAP"
```

Ojo con la sintaxis: el prefijo `%(prefix)//` y **tres** barras antes del nombre del
servidor. Es lo que git mismo sugiere en el mensaje de error.

Para revertir, quitar esas líneas del `.gitconfig` global:

```bat
git config --global --unset-all safe.directory
```

(o editar el archivo a mano si hay otras entradas que se quieran conservar).

## 5. Qué hay en el recurso

El recurso compartido contiene los repositorios y archivos relacionados con el proyecto de Migración SAP alojados en la máquina de `magalindo`.

## 6. Cambios hechos en la máquina

Los dos son reversibles y están explicados arriba:

1. Unidad `M:` mapeada al recurso (no persistente).
2. Entrada `safe.directory` en el `.gitconfig` global.
