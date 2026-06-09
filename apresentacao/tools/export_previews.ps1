# Exporta cada slide do .pptx final para apresentacao/preview/slide_NN.png (1920x1080)
# via PowerPoint COM. Reflete fielmente o render do PowerPoint.
$ErrorActionPreference = 'Stop'
$root = "C:\Users\Jeandeson Nascimento\Desktop\TCC pathfinding"
$pptx = Join-Path $root 'apresentacao\TCC_Apresentacao_Jeandeson.pptx'
$prev = Join-Path $root 'apresentacao\preview'
if (-not (Test-Path $prev)) { New-Item -ItemType Directory -Path $prev | Out-Null }

$ppt = New-Object -ComObject PowerPoint.Application
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
$ppt.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
Write-Output "Exportados $n slides para $prev"