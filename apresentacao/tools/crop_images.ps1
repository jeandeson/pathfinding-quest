# Crops simulator screenshots to remove the 1920x1080 → 1152x864 letterbox.
# Canvas displays at (384, 103) with size 1152x864 in viewport.

Add-Type -AssemblyName System.Drawing

$assets = "C:\Users\Jeandeson Nascimento\Desktop\TCC pathfinding\apresentacao\assets"
$cropX = 384; $cropY = 103
$cropW = 1152; $cropH = 864

# Files to crop: all simulator screenshots
$files = @(
    '01_menu_inicial.png',
    '02_jogo_a_star_inicio.png',
    '03_jogo_em_movimento.png',
    '04_jogo_debug_pathfinding.png',
    '05_jogo_debug_acao.png',
    '06_menu_jps_selecionado.png',
    '07_jogo_jps_debug.png',
    'bench_00_intro.png',
    'bench_01_density.png',
    'bench_02_scalability.png',
    'bench_03_congestion.png',
    'bench_04_dynamic.png',
    'bench_05_summary.png'
)

foreach ($f in $files) {
    $src = Join-Path $assets $f
    if (-not (Test-Path $src)) { Write-Output "skip: $f (not found)"; continue }

    $img = [System.Drawing.Image]::FromFile($src)
    $bmp = New-Object System.Drawing.Bitmap $cropW, $cropH
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $srcRect = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropW, $cropH
    $dstRect = New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH
    $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $out = Join-Path $assets ("crop_" + $f)
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $img.Dispose()
    Write-Output "cropped: $f → crop_$f"
}
