# Mapeo del Método: `Logger.PaymentBBVA()` — Helper de Logging

**Archivo:** `APIMagento/WebApiMagento/Helper/Logger.cs`
**Método:** `public static void PaymentBBVA(string type, string message)` — Líneas 154–162
**Capa:** LAN (Nexo) y DMZ (Centinela) — compartido
**Rol en el flujo:** Registro de auditoría persistente para todos los eventos del flujo de pago BBVA/Neko.

---

## Flujo de Ejecución

1. Recibe `type` (ej. `"INFO "`, `"ERROR "`, `"SUCCESS "`) y `message`.
2. Abre o crea: `C:\inetpub\wwwroot\log\paymentbbva.log`.
3. Escribe: `[yyyy-MM-dd HH:mm:ss] {type}{message}`.
4. Cierra el stream via `using`.

## Interacciones con Base de Datos

**Ninguna.** Escritura exclusiva a disco.

## Firma del Método

```csharp
public static void PaymentBBVA(string type, string message)
{
    string file = @"C:\inetpub\wwwroot\log\paymentbbva.log";
    using (StreamWriter sw = File.AppendText(file))
    {
        sw.WriteLine(DateTime.Now.ToString("[yyyy-MM-dd HH:mm:ss] ") + type + message);
    }
}
```

## Ruta del Archivo de Log

```
C:\inetpub\wwwroot\log\paymentbbva.log
```

## Puntos de Invocación en este Flujo (ApplyPaymentNeko)

| Capa | Momento | `type` | Contenido de `message` |
|---|---|---|---|
| DMZ | Entrada del request | `"INFO "` | JSON del request completo |
| DMZ | Salida hacia cliente | `"INFO "` | `"[Response] " + JSON de la respuesta` |
| LAN Business | En catch de excepción | `"ERROR "` | JSON del request fallido |
| LAN Business | Al finalizar con éxito | `"SUCCESS "` | JSON del request procesado |
