# Exporta cada slide do .pptx final para apresentacao/preview/slide_NN.png (1920x1080)
# via PowerPoint COM. Reflete fielmente o render do PowerPoint.
# Previews antigos sao apagados antes (o numero de slides pode mudar entre versoes).
$ErrorActionPreference = 'Stop'
$apres = Split-Path -Parent $PSScriptRoot
$pptx  = Join-Path $apres 'TCC_Apresentacao_Jeandeson.pptx'
$prev  = Join-Path $apres 'preview'
if (-not (Test-Path $prev)) { New-Item -ItemType Directory -Path $prev | Out-Null }
Get-ChildItem $prev -Filter 'slide_*.png' | Remove-Item -Force

$ppt = New-Object -ComObject PowerPoint.Application
$hadOpen = $ppt.Presentations.Count      # nao fecha o PowerPoint se o usuario ja o estava usando
try {
    # ReadOnly=true, Untitled=false, WithWindow=false
    $pres = $ppt.Presentations.Open($pptx, $true, $false, $false)
} catch {
    # fallback: alguns ambientes exigem janela
    $ppt.Visible = 1
    $pres = $ppt.Presentations.Open($pptx, $true, $false, $true)
}

$n = $pres.Slides.Count
for ($i = 1; $i -le $n; $i++) {
    $name = "slide_{0:D2}.png" -f $i
    $out = Join-Path $prev $name
    $pres.Slides.Item($i).Export($out, "PNG", 1920, 1080)
}
$pres.Close()
if ($hadOpen -eq 0) { $ppt.Quit() }
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
Write-Output "Exportados $n slides para $prev"
