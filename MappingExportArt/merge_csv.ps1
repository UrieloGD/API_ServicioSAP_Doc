$dir = "C:\Users\magalindo\Documents\Migracion SAP\.agents\skills\lan-sap-migration\MappingExportArt"
$outFile = "$dir\Analisis_Consolidado_Mapeo.csv"

# MA
Set-Content -Path $outFile -Value "=== SECCION: Analisis_SP_eCommerceexportaMA_Tablas ===||||" -Encoding UTF8
Get-Content "$dir\Analisis_SP_eCommerceexportaMA_Tablas.csv" | Add-Content -Path $outFile -Encoding UTF8
Add-Content -Path $outFile -Value "" -Encoding UTF8

# MAVI
Add-Content -Path $outFile -Value "=== SECCION: Analisis_SP_eCommerceexportaMAVI_Tablas ===||||" -Encoding UTF8
Get-Content "$dir\Analisis_SP_eCommerceexportaMAVI_Tablas.csv" | Add-Content -Path $outFile -Encoding UTF8
Add-Content -Path $outFile -Value "" -Encoding UTF8

# VIU
Add-Content -Path $outFile -Value "=== SECCION: Analisis_SP_eCommerceexportaVIU_Tablas ===||||" -Encoding UTF8
Get-Content "$dir\Analisis_SP_eCommerceexportaVIU_Tablas.csv" | Add-Content -Path $outFile -Encoding UTF8
Add-Content -Path $outFile -Value "" -Encoding UTF8

# C# vs SP
Add-Content -Path $outFile -Value "=== SECCION: Analisis_CSharp_vs_SP ===||||" -Encoding UTF8
Get-Content "$dir\Analisis_CSharp_vs_SP.csv" | Add-Content -Path $outFile -Encoding UTF8

Write-Host "Files merged successfully into Analisis_Consolidado_Mapeo.csv"
