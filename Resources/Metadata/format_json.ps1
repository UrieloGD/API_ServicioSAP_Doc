$rawFile = "c:\Users\magalindo\Documents\Migracion SAP\.agents\skills\lan-sap-migration\Resources\raw_response.json"
$mdFile = "c:\Users\magalindo\Documents\Migracion SAP\.agents\skills\lan-sap-migration\Resources\hoppscotch_test_payloads.md"

$rawContent = Get-Content -Path $rawFile -Raw
$data = ConvertFrom-Json $rawContent
$inner = ConvertFrom-Json $data.ResponseContent
$prettyJson = ConvertTo-Json $inner -Depth 100

$mdContent = Get-Content -Path $mdFile -Raw
$marker = "## 5. Ejemplo de Respuesta Real"
$startIdx = $mdContent.IndexOf($marker)

if ($startIdx -ge 0) {
    $mdContent = $mdContent.Substring(0, $startIdx)
}

$newBlock = "## 5. Ejemplo de Respuesta Real (S/4HANA OData)`r`n" +
            "Este es un ejemplo de un response exitoso devuelto por SAP al crear una orden de venta (``A_SALES_ORDERSet``). `r`n`r`n" +
            "Nótese que el campo ``Vbeln`` y ``Salesdocument`` confirman la creación del pedido (Ej. ``9419``), y el arreglo ``to_return`` detalla que las cabeceras, condiciones e items fueron procesados con éxito en S/4HANA (DS4CLNT110).`r`n`r`n" +
            "``````json`r`n" +
            $prettyJson + "`r`n" +
            "```````r`n"

$finalContent = $mdContent + $newBlock

Set-Content -Path $mdFile -Value $finalContent -NoNewline
