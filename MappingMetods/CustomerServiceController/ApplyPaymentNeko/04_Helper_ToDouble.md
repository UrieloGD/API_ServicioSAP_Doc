# Mapeo del Método: `CustomerServiceMethods.ToDouble()` — Helper de Conversión

**Archivo:** `APIMagento/WebApiMagento/Metodos/CustomerServiceMethods.cs`
**Método:** `private static double ToDouble(string val)` — Líneas 1729–1732
**Capa:** LAN (Nexo)
**Rol en el flujo:** Método utilitario de conversión. Convierte el campo `abono` (string del JSON) a `double` para usarlo como parámetro SQL de tipo `Money`.

---

## Flujo de Ejecución

1. Recibe un `string val` (contenido del campo `debt["abono"]` del request).
2. Llama a `double.Parse(val)` y retorna el resultado.
3. **No tiene manejo de errores interno.** Si el string no es un número válido, lanzará `FormatException` o `OverflowException`, capturada por el `try/catch` del método llamante.

## Interacciones con Base de Datos

**Ninguna.** Método puramente utilitario en memoria.

## Firma del Método

```csharp
private static double ToDouble(string val)
{
    return double.Parse(val);
}
```

## Notas de Deuda Técnica

> ⚠️ Este método usa `double.Parse()` sin especificar `CultureInfo`. En entornos con configuración regional diferente (coma decimal vs punto decimal), esto puede causar errores silenciosos. Se recomienda usar `double.Parse(val, CultureInfo.InvariantCulture)`.
