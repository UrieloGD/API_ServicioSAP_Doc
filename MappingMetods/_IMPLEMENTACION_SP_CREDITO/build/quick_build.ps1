# Compilacion rapida de ServicioSAP: chequeo de sintaxis y tipos con el Roslyn del propio proyecto.
# NO sustituye a MSBuild para cerrar una tarea (GUIA_MIGRACION_FABLE.md §9b).
# Arma el build.rsp desde ServicioSap.csproj en cada corrida, asi un .cs nuevo registrado en el .csproj
# entra solo. La salida va a una carpeta local (nunca al share).
# Uso:  powershell -ExecutionPolicy Bypass -File "<ruta>\quick_build.ps1"   [-Out C:\temp\ServicioSapBuild]
param([string]$Out = "C:\temp\ServicioSapBuild")

$d = '\\172.16.214.58\sap\ServicioSAP\ServicioSap\ServicioSap'
New-Item -ItemType Directory -Force $Out | Out-Null

[xml]$x = Get-Content "$d\ServicioSap.csproj"
$ns = @{ m = 'http://schemas.microsoft.com/developer/msbuild/2003' }
$src = Select-Xml -Xml $x -XPath '//m:Compile/@Include' -Namespace $ns | ForEach-Object { "`"$d\$($_.Node.Value)`"" }

$refs = Get-ChildItem "$d\bin" -Filter *.dll |
    Where-Object { $_.Name -ne 'ServicioSap.dll' -and $_.Name -notlike '*.Fakes.dll' } |
    ForEach-Object { "/r:`"$($_.FullName)`"" }

$fw = 'C:\Windows\Microsoft.NET\Framework64\v4.0.30319'
$fwr = 'System.dll','System.Core.dll','System.Data.dll','System.Xml.dll','System.Xml.Linq.dll','System.Web.dll',
       'System.Configuration.dll','System.Net.Http.dll','System.Runtime.Serialization.dll',
       'System.ComponentModel.DataAnnotations.dll','System.Web.Extensions.dll','System.Drawing.dll',
       'System.Transactions.dll','System.Web.Services.dll','System.Web.ApplicationServices.dll',
       'System.Web.Abstractions.dll','System.Web.Routing.dll','System.Net.dll','System.IO.Compression.dll',
       'System.IO.Compression.FileSystem.dll','System.Numerics.dll','Microsoft.CSharp.dll',
       'System.EnterpriseServices.dll','System.Runtime.Caching.dll','System.ServiceModel.dll','System.Security.dll' |
    ForEach-Object { if (Test-Path "$fw\$_") { "/r:`"$fw\$_`"" } }

$rsp = @('/nologo', '/target:library', '/nowarn:1591,0168,0219,0414,0649,1998,4014', '/langversion:latest',
         "/out:`"$Out\ServicioSap.dll`"") + $refs + $fwr + $src
$rsp | Set-Content "$Out\build.rsp" -Encoding UTF8

Write-Host "Fuentes: $($src.Count)  Referencias: $($refs.Count + $fwr.Count)"
& "$d\bin\roslyn\csc.exe" "@$Out\build.rsp" 2>&1 | Select-String ': error '
Write-Host "exit=$LASTEXITCODE  (0 = compila)"
