$ErrorActionPreference = 'Stop'
$taskFolder = $PSScriptRoot
$qaFolder = Join-Path $taskFolder 'qa'
New-Item -ItemType Directory -Force -Path $qaFolder | Out-Null
$taskTemp = Join-Path $qaFolder 'tmp'
New-Item -ItemType Directory -Force -Path $taskTemp | Out-Null
$env:TEMP = $taskTemp
$env:TMP = $taskTemp
$wordApp = $null
$results = @()
try {
    $wordApp = New-Object -ComObject Word.Application
    $wordApp.Visible = $false
    $wordApp.DisplayAlerts = 0
    $wordApp.AutomationSecurity = 3
    foreach ($name in @('analisis-y-diseno', 'anexos-uml')) {
        $document = $null
        try {
            $path = Join-Path $taskFolder ($name + '.docx')
            $pdfPath = Join-Path $qaFolder ($name + '.pdf')
            $document = $wordApp.Documents.Open($path, $false, $true, $false)
            $document.Repaginate()
            $document.ExportAsFixedFormat($pdfPath, 17)
            $pages = $document.ComputeStatistics(2)
            $results += [PSCustomObject]@{ document = $name; pages = $pages; renderer = 'Microsoft Word'; version = $wordApp.Version; pdf = $pdfPath }
            Write-Output ($name + ': ' + $pages + ' paginas')
        } finally {
            if ($null -ne $document) { $document.Close(0); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) }
        }
    }
    $results | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $qaFolder 'renderizado-word.json') -Encoding UTF8
} finally {
    if ($null -ne $wordApp) { $wordApp.Quit(0); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wordApp) }
}
