# Reconstroi a apresentacao inteira a partir do CSV, em uma unica chamada:
#   CSV -> dados -> graficos -> QR codes -> .pptx -> previews -> auditorias
#   (fontes por classe, QR codes sob degradacao, roteiro x deck) -> pagina do ensaio
#
# Uso (na pasta apresentacao/tools):
#   powershell -ExecutionPolicy Bypass -File build_all.ps1            # usa as capturas ja salvas
#   powershell -ExecutionPolicy Bypass -File build_all.ps1 -Capture   # recaptura o simulador publicado
#
# Qualquer etapa que falhe interrompe o processo (nada de slide com dado errado).
param([switch]$Capture)
$ErrorActionPreference = 'Stop'

function Step([string]$label, [scriptblock]$cmd) {
    Write-Host ""
    Write-Host "== $label" -ForegroundColor Cyan
    & $cmd
    if ($LASTEXITCODE -ne 0) { throw "Etapa falhou: $label (codigo $LASTEXITCODE)" }
}

Push-Location $PSScriptRoot
try {
    Step 'dados dos graficos (CSV -> chart_data.js)'  { node build_chart_data.mjs | Out-Null }
    Step 'dados dos slides (CSV -> deck_data.json)'    { node build_deck_data.mjs }
    Step 'graficos dos slides'                         { node render_slide_charts.mjs }
    Step 'QR codes (gera e confere)'                   { node make_qr.mjs }
    if ($Capture) { Step 'capturas do simulador publicado' { node capture_slides.mjs } }
    Step 'apresentacao (.pptx)'                        { powershell -NoProfile -ExecutionPolicy Bypass -File build_from_template.ps1 }
    Step 'previews (PNG)'                              { powershell -NoProfile -ExecutionPolicy Bypass -File export_previews.ps1 }
    Step 'auditoria de legibilidade'                   { powershell -NoProfile -ExecutionPolicy Bypass -File audit_deck.ps1 }
    Step 'QR codes legiveis no slide final'            { node make_qr.mjs --check ..\preview\slide_22.png }
    Step 'QR codes sob degradacao (2 leitores)'        { node qr_stress.mjs ..\preview\slide_22.png }
    Step 'roteiro x deck (numeros e titulos)'          { node verify_roteiro.mjs }
    Step 'pagina do ensaio cronometrado'               { node build_ensaio.mjs }
    Write-Host ""
    Write-Host "OK: apresentacao reconstruida e conferida." -ForegroundColor Green
} finally {
    Pop-Location
}
