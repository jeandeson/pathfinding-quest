# Auditoria de legibilidade do .pptx final (PowerPoint COM, somente leitura).
# Regras (devolutiva de 18/09/2026):
#   1. nenhum texto abaixo de 18 pt;
#   2. título de cada slide de conteúdo com 36 pt ou mais;
#   3. nada fora da área do slide;
#   4. nada invade a área do logo UNIJORGE (canto inferior direito);
#   5. texto de etiquetas/formas não transborda a própria forma.
# Sai com código 1 se alguma regra falhar. Uso: powershell -File audit_deck.ps1 [-Dump]
param([switch]$Dump)
$ErrorActionPreference = 'Stop'
$apres = Split-Path -Parent $PSScriptRoot
$pptx  = Join-Path $apres 'TCC_Apresentacao_Jeandeson.pptx'
$MIN_PT = 18; $MIN_TITLE = 36

$ppt = New-Object -ComObject PowerPoint.Application
$hadOpen = $ppt.Presentations.Count
$pres = $ppt.Presentations.Open($pptx, $true, $false, $false)
$W = $pres.PageSetup.SlideWidth; $H = $pres.PageSetup.SlideHeight
$fails = New-Object System.Collections.ArrayList
$report = New-Object System.Collections.ArrayList

function Get-Leaves($shapes) {
    foreach ($sh in $shapes) {
        if ($sh.Type -eq 6) { Get-Leaves $sh.GroupItems } else { $sh }
    }
}
function Get-Sizes($tr) {
    $set = @{}
    foreach ($run in $tr.Runs()) { if ($run.Text.Trim() -ne '') { $set[[double]$run.Font.Size] = 1 } }
    return $set.Keys
}

try {
    for ($i = 1; $i -le $pres.Slides.Count; $i++) {
        $s = $pres.Slides.Item($i)
        $isContent = ($s.CustomLayout.Name -like '*conte*')
        $logo = $null
        foreach ($sh in $s.Shapes) { if (($sh.Type -eq 13) -and ($sh.Left -gt 830) -and ($sh.Top -gt 430)) { $logo = $sh } }
        $min = 999; $max = 0; $n = 0
        foreach ($sh in (Get-Leaves $s.Shapes)) {
            $n++
            $l = $sh.Left; $t = $sh.Top; $r = $l + $sh.Width; $b = $t + $sh.Height
            $sizes = @()
            $texts = @()
            if ($sh.HasTable) {
                $tbl = $sh.Table
                for ($rr = 1; $rr -le $tbl.Rows.Count; $rr++) {
                    for ($cc = 1; $cc -le $tbl.Columns.Count; $cc++) {
                        $ctr = $tbl.Cell($rr, $cc).Shape.TextFrame.TextRange
                        if ($ctr.Text.Trim() -ne '') { $sizes += (Get-Sizes $ctr) }
                    }
                }
            } elseif ($sh.HasTextFrame -and $sh.TextFrame.HasText) {
                $tr = $sh.TextFrame.TextRange
                # o "v" invisível da faixa do template não é conteúdo
                if (-not (($tr.Text.Trim() -eq 'v') -and ($sh.Top -le 0))) {
                    $sizes += (Get-Sizes $tr)
                    # regra 5: formas (não caixas de texto) com texto maior que a própria forma
                    if (($sh.Type -eq 1) -and ($sh.TextFrame.AutoSize -eq 0)) {
                        if (($tr.BoundWidth -gt $sh.Width + 1) -or ($tr.BoundHeight -gt $sh.Height + 1)) {
                            $null = $fails.Add("slide ${i}: texto transborda a forma: '$($tr.Text)' ($([math]::Round($tr.BoundWidth))x$([math]::Round($tr.BoundHeight)) em $([math]::Round($sh.Width))x$([math]::Round($sh.Height)))")
                        }
                    }
                }
            }
            foreach ($z in $sizes) {
                if ($z -lt $min) { $min = $z }
                if ($z -gt $max) { $max = $z }
                if ($z -lt $MIN_PT) {
                    $txt = ''; try { $txt = $sh.TextFrame.TextRange.Text } catch {}
                    $null = $fails.Add("slide ${i}: fonte de $z pt (< $MIN_PT): '$txt'")
                }
            }
            # regra 3: fora do slide (ignora decoração do template, que sangra de propósito)
            $isTemplateBleed = (($t -lt 0) -or ($l -le 0.5 -and $sh.Width -lt 320 -and $t -lt 100))
            if (-not $isTemplateBleed) {
                if (($l -lt -0.5) -or ($t -lt -0.5) -or ($r -gt $W + 0.5) -or ($b -gt $H + 0.5)) {
                    $null = $fails.Add("slide ${i}: forma fora do slide @($([math]::Round($l)),$([math]::Round($t)) $([math]::Round($sh.Width))x$([math]::Round($sh.Height)))")
                }
            }
            # regra 4: invasão do logo
            if (($logo -ne $null) -and ($sh.Name -ne $logo.Name) -and (-not $isTemplateBleed)) {
                $lx = $logo.Left + 4; $ly = $logo.Top + 4; $lr = $logo.Left + $logo.Width - 4; $lb = $logo.Top + $logo.Height - 4
                if (($l -lt $lr) -and ($r -gt $lx) -and ($t -lt $lb) -and ($b -gt $ly)) {
                    $txt = ''; try { $txt = $sh.TextFrame.TextRange.Text } catch {}
                    # caixas de texto ocupam a largura declarada: conta só o texto efetivo
                    $hit = $true
                    if (($sh.Type -eq 17) -and ($txt -ne '')) {
                        $tr = $sh.TextFrame.TextRange
                        $tl = $tr.BoundLeft; $tt = $tr.BoundTop; $trr = $tl + $tr.BoundWidth; $tbb = $tt + $tr.BoundHeight
                        $hit = (($tl -lt $lr) -and ($trr -gt $lx) -and ($tt -lt $lb) -and ($tbb -gt $ly))
                    }
                    if ($hit) { $null = $fails.Add("slide ${i}: invade o logo @($([math]::Round($l)),$([math]::Round($t)) $([math]::Round($sh.Width))x$([math]::Round($sh.Height))) '$txt'") }
                }
            }
        }
        # regra 2: título do slide de conteúdo
        $titlePt = ''
        if ($isContent) {
            $tt = $s.Shapes.Item(4).TextFrame.TextRange
            $titlePt = $tt.Font.Size
            if ($titlePt -lt $MIN_TITLE) { $null = $fails.Add("slide ${i}: título com $titlePt pt (< $MIN_TITLE): '$($tt.Text)'") }
            $ban = $s.Shapes.Item(3)
            if (($s.Shapes.Item(4).Left + $s.Shapes.Item(4).Width) -gt ($ban.Left + $ban.Width)) { $null = $fails.Add("slide ${i}: título maior que a faixa") }
        }
        if ($min -eq 999) { $min = 0 }
        $null = $report.Add(("slide {0,2}  formas {1,3}  fonte min {2,4} pt  max {3,4} pt  titulo {4}" -f $i, $n, $min, $max, $titlePt))
    }
} finally {
    $pres.Close()
    if ($hadOpen -eq 0) { $ppt.Quit() }
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
}

if ($Dump) { $report | ForEach-Object { $_ } }
"`n=== audit_deck: $($report.Count) slides  ·  $($fails.Count) falha(s) ==="
if ($fails.Count) { $fails | ForEach-Object { "  x $_" }; exit 1 }
"OK: nenhum texto abaixo de $MIN_PT pt; títulos >= $MIN_TITLE pt; nada fora do slide nem sobre o logo."
