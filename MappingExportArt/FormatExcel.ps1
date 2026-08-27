Import-Module ImportExcel

$csvPath = "C:\Users\magalindo\Documents\Migracion SAP\.agents\skills\lan-sap-migration\MappingExportArt\Analisis_SP_eCommerceexportaMA_Tablas.csv"
$xlsxPath = "C:\Users\magalindo\Documents\Migracion SAP\.agents\skills\lan-sap-migration\MappingExportArt\Analisis_SP_eCommerceexportaMA_Tablas.xlsx"

# Eliminar xlsx anterior si existe
if (Test-Path $xlsxPath) { Remove-Item $xlsxPath -Force }

# Leer CSV con delimitador pipe
$data = Import-Csv -Path $csvPath -Delimiter '|' -Encoding UTF8

# Exportar a Excel con formato
$excelParams = @{
    Path          = $xlsxPath
    WorksheetName = "Tablas SP ExportaMA"
    AutoFilter    = $true
    FreezeTopRow  = $true
    BoldTopRow    = $true
    AutoSize      = $false
    TableStyle    = "None"
}

$excel = $data | Export-Excel @excelParams -PassThru

$ws = $excel.Workbook.Worksheets["Tablas SP ExportaMA"]

# --- Anchos de columna ---
$ws.Column(1).Width = 44   # Nombre Tabla
$ws.Column(2).Width = 30   # Tipo
$ws.Column(3).Width = 70   # Campos
$ws.Column(4).Width = 85   # Descripcion
$ws.Column(5).Width = 72   # Resultado

# --- Wrap text en todas las columnas ---
$lastRow = $ws.Dimension.End.Row
for ($col = 1; $col -le 5; $col++) {
    for ($row = 1; $row -le $lastRow; $row++) {
        $ws.Cells[$row, $col].Style.WrapText = $true
        $ws.Cells[$row, $col].Style.VerticalAlignment = [OfficeOpenXml.Style.ExcelVerticalAlignment]::Top
    }
}

# --- Formato del encabezado ---
$headerColor = [System.Drawing.Color]::FromArgb(44, 62, 80)
$headerFontColor = [System.Drawing.Color]::White
for ($col = 1; $col -le 5; $col++) {
    $ws.Cells[1, $col].Style.Fill.PatternType = [OfficeOpenXml.Style.ExcelFillStyle]::Solid
    $ws.Cells[1, $col].Style.Fill.BackgroundColor.SetColor($headerColor)
    $ws.Cells[1, $col].Style.Font.Color.SetColor($headerFontColor)
    $ws.Cells[1, $col].Style.Font.Bold = $true
    $ws.Cells[1, $col].Style.Font.Size = 12
    $ws.Cells[1, $col].Style.HorizontalAlignment = [OfficeOpenXml.Style.ExcelHorizontalAlignment]::Center
    $ws.Cells[1, $col].Style.VerticalAlignment = [OfficeOpenXml.Style.ExcelVerticalAlignment]::Center
}
$ws.Row(1).Height = 30

# --- Alto de filas de datos y colores por tipo ---
$colorPermanente = [System.Drawing.Color]::FromArgb(212, 239, 223)    # Verde claro
$colorSelectInto  = [System.Drawing.Color]::FromArgb(214, 234, 248)   # Azul claro
$colorCreateTable = [System.Drawing.Color]::FromArgb(252, 243, 207)   # Amarillo claro
$borderColor = [System.Drawing.Color]::FromArgb(189, 195, 199)

for ($row = 2; $row -le $lastRow; $row++) {
    # Alto de fila
    $ws.Row($row).Height = 85
    
    # Color segun tipo
    $tipoVal = $ws.Cells[$row, 2].Text
    $bgColor = $null
    
    if ($tipoVal -like "*PERMANENTE*") {
        $bgColor = $colorPermanente
    } elseif ($tipoVal -like "*SELECT INTO*") {
        $bgColor = $colorSelectInto
    } elseif ($tipoVal -like "*CREATE TABLE*") {
        $bgColor = $colorCreateTable
    }
    
    if ($bgColor -ne $null) {
        for ($col = 1; $col -le 5; $col++) {
            $ws.Cells[$row, $col].Style.Fill.PatternType = [OfficeOpenXml.Style.ExcelFillStyle]::Solid
            $ws.Cells[$row, $col].Style.Fill.BackgroundColor.SetColor($bgColor)
        }
    }
    
    # Font size para datos
    for ($col = 1; $col -le 5; $col++) {
        $ws.Cells[$row, $col].Style.Font.Size = 10
    }
    
    # Nombre de tabla en negrita
    $ws.Cells[$row, 1].Style.Font.Bold = $true
    $ws.Cells[$row, 1].Style.Font.Size = 11
}

# --- Bordes finos en todo el rango ---
$fullRange = $ws.Cells[1, 1, $lastRow, 5]
$fullRange.Style.Border.Top.Style = [OfficeOpenXml.Style.ExcelBorderStyle]::Thin
$fullRange.Style.Border.Bottom.Style = [OfficeOpenXml.Style.ExcelBorderStyle]::Thin
$fullRange.Style.Border.Left.Style = [OfficeOpenXml.Style.ExcelBorderStyle]::Thin
$fullRange.Style.Border.Right.Style = [OfficeOpenXml.Style.ExcelBorderStyle]::Thin
$fullRange.Style.Border.Top.Color.SetColor($borderColor)
$fullRange.Style.Border.Bottom.Color.SetColor($borderColor)
$fullRange.Style.Border.Left.Color.SetColor($borderColor)
$fullRange.Style.Border.Right.Color.SetColor($borderColor)

# Guardar
Close-ExcelPackage $excel

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Excel creado exitosamente!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Ruta: $xlsxPath" -ForegroundColor Cyan
Write-Host "  Total filas: $($lastRow - 1) tablas documentadas" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Colores:" -ForegroundColor Yellow
Write-Host "    Verde claro  = Tablas PERMANENTES" -ForegroundColor Green
Write-Host "    Azul claro   = Temporales SELECT INTO" -ForegroundColor Blue
Write-Host "    Amarillo     = Temporales CREATE TABLE" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Use el auto-filtro en la columna 'Tipo'" -ForegroundColor White
Write-Host "  para mostrar solo PERMANENTES u ocultar temporales." -ForegroundColor White
