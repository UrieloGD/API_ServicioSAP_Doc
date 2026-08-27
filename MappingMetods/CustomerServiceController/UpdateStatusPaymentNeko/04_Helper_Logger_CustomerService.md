# Mapeo del Método: `Logger.CustomerService()` — Helper de Logging

**Archivo:** `APIMagento/WebApiMagento/Helper/Logger.cs`
**Método:** `public static void CustomerService(string type, string message)` — Líneas 134–142
**Capa:** LAN (Nexo)
**Rol en el flujo:** Logging de errores del módulo CustomerService en disco.

---

## Flujo de Ejecución

1. Recibe `type` (ej. `"ERROR "`) y `message`.
2. Abre o crea: `C:\inetpub\wwwroot\log\customerService.log`.
3. Escribe: `[yyyy-MM-dd HH:mm:ss] {type}{message}`.
4. Cierra el stream via `using`.

## Interacciones con Base de Datos

**Ninguna.** Escritura exclusiva a disco.

## Firma del Método

```csharp
public static void CustomerService(string type, string message)
{
    string file = @"C:\inetpub\wwwroot\log\customerService.log";
    using (StreamWriter sw = File.AppendText(file))
    {
        sw.WriteLine(DateTime.Now.ToString("[yyyy-MM-dd HH:mm:ss] ") + type + message);
    }
}
```

## Ruta del Archivo de Log

```
C:\inetpub\wwwroot\log\customerService.log
```

## Puntos de Invocación en este Flujo (UpdateStatusPaymentNeko)

| Método | Momento | `type` | Contenido de `message` |
|---|---|---|---|
| `CustomerServiceMethods.UpdateStatusPaymentNeko` | En catch `SqlException` | `"ERROR "` | Mensaje de excepción SQL |
