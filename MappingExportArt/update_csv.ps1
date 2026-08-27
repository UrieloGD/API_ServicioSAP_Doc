$inputFile = "C:\Users\magalindo\Documents\Migracion SAP\.agents\skills\lan-sap-migration\MappingExportArt\Analisis_Consolidado_Mapeo_Exportacion_Art.csv"
$outputFile = "C:\Users\magalindo\Documents\Migracion SAP\.agents\skills\lan-sap-migration\MappingExportArt\Analisis_Consolidado_Mapeo_Exportacion_Art_Temp.csv"

$lines = Get-Content $inputFile -Encoding UTF8
$currentSection = ""

$outLines = @()

foreach ($line in $lines) {
    if ($line.StartsWith("=== SECCION:")) {
        $currentSection = $line
        $outLines += $line
        continue
    }

    $parts = $line -split '\|'
    
    if ($parts.Length -eq 5) {
        if ($parts[0] -eq "Nombre Tabla" -or $parts[0] -eq "Nombre Metodo") {
            if ($parts[0] -eq "Nombre Metodo") {
                $outLines += "$line|Estado de Migracion|Notas"
            } else {
                $outLines += "$line|Estado de Migracion|Notas"
            }
        } else {
            $tableName = $parts[0].Trim()
            $estado = ""
            $nota = ""
            
            if ($currentSection -match "CSharp_vs_SP") {
                # Already has its own analysis, just append empty or generic
                $estado = "N/A"
                $nota = "Analizado en columnas previas"
            } elseif ($currentSection -match "MA_Tablas") {
                # MA Logic
                $migrados = @("#Listadoarticulos", "#articulosIEMay", "#AlmacenesPrincipales", "#DisponiblePorAlmacenP", "#AlmacenesSecundarios", "#AlmacenesRespaldo", "#DisponiblePorAlmacenSReglaUno", "#DisponiblePorAlmacenSReglaDos", "#DisponiblePorAlmacenSReglaTres", "#DisponiblePorAlmacenSReglaCuatro", "#DisponiblePorAlmacenSReglaCinco", "#DisponiblePorAlmacenSReglaSeis", "#DisponiblePorAlmacenSReglaUnoRespaldo", "#DisponiblePorAlmacenSReglaDosRespaldo", "#DisponiblePorAlmacenSReglaTresRespaldo", "#DisponiblePorAlmacenSReglaCuatroRespaldo", "#DisponiblePorAlmacenSReglaCincoRespaldo", "#DisponiblePorAlmacenSReglaSeisRespaldo", "#DisponiblePorAlmacenSReglaSieteRespaldo", "#articulos", "#ArticulosPromocion", "#Superpromo", "#CarruselCategoria", "#Hallazgos", "#precio_propre", "#precioart", "#PorcSobrePrecio", "#precio_precioesp90", "#precio_precioesp0", "#precio_precioesp", "#propsgeneral", "#artprops", "#SETprop", "#categ", "#categFinal", "#FamLinCat", "#ArticulosUpsell", "#ArticulosUpsell2", "#ArticulosCrossP", "#ArticulosCrossF", "#ArticulosCrossH", "#ArtFamLin", "#ArtCrossEsp", "#ArtFamLin1", "#ArtFamLin2", "#posicionamiento")
                $noMigrados = @("#controlcategoria", "#controlcategoriafinal", "#sinsetocat", "#excluidos", "#exc_conexist", "#artsvisibles", "#configurables", "#PropNombreConf", "#PropConfig", "#SKUprops", "#configvariat", "#ArticuloPadre", "#ListaDePrioridad", "#TempTop10", "#Region6_ECOMERCEEXPORTAART")
                
                if ($migrados -contains $tableName) {
                    $estado = "Migrado"
                    $nota = "Implementado en EcommerceMethods.cs"
                } elseif ($noMigrados -contains $tableName) {
                    $estado = "No Migrado"
                    $nota = "No se encontro implementacion en C#"
                } elseif ($tableName -match "^#temp_eComerceExportaArt$") {
                    $estado = "Parcialmente migrado"
                    $nota = "Faltan hijos configurables y lógicas avanzadas"
                } elseif ($tableName -match "^eComerceExportaArt$") {
                    $estado = "Parcialmente migrado"
                    $nota = "El volcado final omite configurables"
                } else {
                    $estado = "Migrado"
                    $nota = "Tabla permanente mapeada en contexto"
                }
            } else {
                # MAVI y VIU
                $noMigrados = @("#padreshijos", "#controlcategoria", "#sinsetocat", "#excluidos", "#exc_conexist", "#configurables")
                
                if ($noMigrados -contains $tableName) {
                    $estado = "No Migrado"
                    $nota = "Lógica faltante en C#"
                } elseif ($tableName.StartsWith("#")) {
                    $estado = "Parcialmente migrado"
                    $nota = "Logica base existe pero fuertemente acoplada a MA (UEN=1, Suc 90/0, ACEF)"
                } else {
                    $estado = "Migrado"
                    $nota = "Tabla permanente consultada por cache"
                }
            }
            
            $outLines += "$line|$estado|$nota"
        }
    } else {
        $outLines += $line
    }
}

Set-Content -Path $outputFile -Value $outLines -Encoding UTF8
Move-Item -Path $outputFile -Destination $inputFile -Force
Write-Host "CSV procesado exitosamente."
