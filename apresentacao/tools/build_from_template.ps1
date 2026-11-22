# Constrói a apresentação do TCC clonando slides de template_unijorge_v1.pptx via
# PowerPoint COM (preserva gradientes, fontes e logo do template institucional).
#
# Versão pós-devolutiva de 18/09/2026 — o que mudou e por quê:
#   • Fontes: título 36 pt, mensagem e corpo 24–28 pt, tabelas/rótulos 20–22 pt,
#     notas 18 pt. NENHUM texto abaixo de 18 pt (conferido por audit_deck.ps1).
#   • Uma ideia por slide: 17 slides principais + slides de apoio (backup).
#   • Termos padronizados: "DFS-Greedy (variante adotada)", "nós expandidos",
#     "16 ms/quadro (60 fps)".
#   • Gráficos claros, com rótulos diretos (slide_charts.html).
#   • Slide do simulador com callouts; slide final com QR codes.
#   • Todo número vem de deck_data.json (gerado do benchmark_results.csv).
#
# Pré-requisitos (nesta ordem, na pasta tools):
#   node build_chart_data.mjs ; node build_deck_data.mjs
#   node render_slide_charts.mjs ; node make_qr.mjs ; node capture_slides.mjs
# Uso: powershell -ExecutionPolicy Bypass -File build_from_template.ps1
#
# ATENÇÃO: este arquivo precisa ficar em UTF-8 COM BOM (PowerShell 5.1).

$ErrorActionPreference = 'Stop'
$tools     = $PSScriptRoot
$apres     = Split-Path -Parent $tools
$root      = Split-Path -Parent $apres
$tmpl      = Join-Path $root  'template_unijorge_v1.pptx'
$workCopy  = Join-Path $apres '_template_work.pptx'
$outFinal  = Join-Path $apres 'TCC_Apresentacao_Jeandeson.pptx'
$assets    = Join-Path $apres 'assets'
$charts    = Join-Path $apres 'charts'

foreach ($need in @(
    $tmpl, (Join-Path $tools 'deck_data.json'),
    (Join-Path $charts 'slide_nodes.png'), (Join-Path $charts 'slide_scale.png'),
    (Join-Path $charts 'slide_npc50.png'), (Join-Path $charts 'slide_scale5.png'),
    (Join-Path $assets 'qr_simulador.png'), (Join-Path $assets 'qr_repositorio.png'),
    (Join-Path $assets 'slide_menu.png'), (Join-Path $assets 'slide_jogo_debug.png'))) {
    if (-not (Test-Path $need)) { throw "Arquivo necessário ausente: $need (veja os pré-requisitos no topo do script)" }
}

# Fonte única dos números: deck_data.json (derivado do CSV por build_deck_data.mjs)
$D  = Get-Content (Join-Path $tools 'deck_data.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$dv = $D.derived
$BUDGET = $D.meta.budgetF                      # "16 ms/quadro (60 fps)"

Copy-Item $tmpl $workCopy -Force

# ─── Cores (RGB decimal para o PowerPoint COM) ──────────────────────────────
function RGB($r, $g, $b) { return [int]($r + ($g -shl 8) + ($b -shl 16)) }
$cWhite   = RGB 255 255 255
$cMagenta = RGB 207 13 114      # JPS / destaque institucional
$cPurple  = RGB 65 57 103
$cTextDk  = RGB 30 20 60
$cTextMid = RGB 90 80 120
$cBlue    = RGB 42 120 214      # A*  (mesma paleta dos gráficos)
$cBlueDk  = RGB 24 79 149
$cOrange  = RGB 235 104 52      # Dijkstra
$cAqua    = RGB 27 175 122      # BFS
$cViolet  = RGB 98 80 214       # DFS-Greedy
$cOK      = RGB 22 122 62
$cErr     = RGB 196 44 72
$cGridLn  = RGB 205 200 220
# fundos suaves de cartão
$tMagenta = RGB 252 234 243
$tBlue    = RGB 232 241 252
$tPurple  = RGB 241 239 247
$tGreen   = RGB 229 244 235
$tRed     = RGB 252 235 238
$tGray    = RGB 245 244 249
$algColor = @{ astar = $cBlue; dijkstra = $cOrange; bfs = $cAqua; dfs = $cViolet; jps = $cMagenta }

# ─── Escala tipográfica (pt) ─────────────────────────────────────────────────
$szTitle = 36   # título na faixa
$szMsg   = 24   # mensagem do slide (uma ideia)
$szBody  = 24   # corpo
$szTable = 20   # tabelas
$szNote  = 18   # notas / referências (mínimo absoluto do deck)

$ppt = New-Object -ComObject PowerPoint.Application
$hadOpen = $ppt.Presentations.Count          # se o usuário já tinha algo aberto, não fechamos o PowerPoint
$ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
$pres = $ppt.Presentations.Open($workCopy, $false, $false, $true)

$tplCover   = $pres.Slides.Item(1)
$tplSection = $pres.Slides.Item(2)
$tplContent = $pres.Slides.Item(3)
$tplThanks  = $pres.Slides.Item(10)

$deck = New-Object System.Collections.ArrayList   # registro: slide, tipo, seção

# ─── Helpers ────────────────────────────────────────────────────────────────

function Add-Text($slide, [double]$x, [double]$y, [double]$w, [string]$text, [double]$size = 24, [int]$rgb = -1,
                  [bool]$bold = $false, [string]$align = 'left', [string]$font = '') {
    $tb = $slide.Shapes.AddTextbox(1, $x, $y, $w, 20)
    $tf = $tb.TextFrame
    $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0
    $tf.WordWrap = -1
    $tr = $tf.TextRange
    $tr.Text = $text
    $tr.Font.Size = $size
    if ($rgb -ge 0) { $tr.Font.Color.RGB = $rgb } else { $tr.Font.Color.RGB = $cTextDk }
    if ($bold) { $tr.Font.Bold = -1 }
    if ($font -ne '') { $tr.Font.Name = $font }
    switch ($align) {
        'center' { $tr.ParagraphFormat.Alignment = 2 }
        'right'  { $tr.ParagraphFormat.Alignment = 3 }
        default  { $tr.ParagraphFormat.Alignment = 1 }
    }
    return $tb
}

# Texto com trechos em negrito marcados por [[ ... ]] (opcionalmente coloridos).
function Add-Rich($slide, [double]$x, [double]$y, [double]$w, [string]$markup, [double]$size = 24,
                  [int]$boldRgb = -1, [int]$rgb = -1, [string]$align = 'left') {
    $parts = $markup -split '\[\[|\]\]'
    $plain = $parts -join ''
    $tb = Add-Text $slide $x $y $w $plain $size $rgb $false $align
    $tr = $tb.TextFrame.TextRange
    $pos = 1
    for ($i = 0; $i -lt $parts.Count; $i++) {
        $len = $parts[$i].Length
        if ((($i % 2) -eq 1) -and ($len -gt 0)) {
            $run = $tr.Characters($pos, $len)
            $run.Font.Bold = -1
            if ($boldRgb -ge 0) { $run.Font.Color.RGB = $boldRgb }
        }
        $pos += $len
    }
    return $tb
}

function Add-Rect($slide, [double]$x, [double]$y, [double]$w, [double]$h, [int]$fillRgb = -1, [int]$lineRgb = -1,
                  [double]$lineWidth = 0.0, [bool]$rounded = $false, [double]$radius = 0.12) {
    $shapeType = if ($rounded) { 5 } else { 1 }
    $sh = $slide.Shapes.AddShape($shapeType, $x, $y, $w, $h)
    if ($rounded) { $sh.Adjustments.Item(1) = $radius }
    if ($fillRgb -ge 0) { $sh.Fill.Solid(); $sh.Fill.ForeColor.RGB = $fillRgb } else { $sh.Fill.Visible = 0 }
    if ($lineRgb -ge 0) { $sh.Line.ForeColor.RGB = $lineRgb; $sh.Line.Weight = $lineWidth } else { $sh.Line.Visible = 0 }
    $sh.Shadow.Visible = 0
    return $sh
}

function Add-Card($slide, [double]$x, [double]$y, [double]$w, [double]$h, [int]$fillRgb) {
    return (Add-Rect $slide $x $y $w $h $fillRgb -1 0 $true 0.07)
}

function Add-Oval($slide, [double]$x, [double]$y, [double]$d, [int]$fillRgb) {
    $sh = $slide.Shapes.AddShape(9, $x, $y, $d, $d)
    $sh.Fill.Solid(); $sh.Fill.ForeColor.RGB = $fillRgb; $sh.Line.Visible = 0; $sh.Shadow.Visible = 0
    return $sh
}

function Add-Line($slide, [double]$x1, [double]$y1, [double]$x2, [double]$y2, [int]$rgb, [double]$weight = 2.5,
                  [bool]$arrow = $false, [int]$dash = 1) {
    $ln = $slide.Shapes.AddLine($x1, $y1, $x2, $y2)
    $ln.Line.ForeColor.RGB = $rgb
    $ln.Line.Weight = $weight
    $ln.Line.DashStyle = $dash                 # 1 = sólida, 4 = tracejada
    if ($arrow) { $ln.Line.EndArrowheadStyle = 2; $ln.Line.EndArrowheadLength = 3; $ln.Line.EndArrowheadWidth = 3 }
    $ln.Shadow.Visible = 0
    return $ln
}

function Add-Image($slide, [string]$path, [double]$x, [double]$y, [double]$w, [double]$h, [string]$alt = '') {
    $pic = $slide.Shapes.AddPicture($path, 0, -1, $x, $y, $w, $h)
    if ($alt -ne '') { $pic.AlternativeText = $alt }
    return $pic
}

# Etiqueta de callout: caixa branca com borda magenta e texto centralizado.
function Add-Tag($slide, [double]$x, [double]$y, [double]$w, [double]$h, [string]$text, [double]$size = 20) {
    $sh = Add-Rect $slide $x $y $w $h $cWhite $cMagenta 2.25 $true 0.28
    $tf = $sh.TextFrame
    $tf.MarginLeft = 4; $tf.MarginRight = 4; $tf.MarginTop = 0; $tf.MarginBottom = 0
    $tf.WordWrap = 0
    $tf.AutoSize = 0
    $tf.VerticalAnchor = 3
    $tf.TextRange.Text = $text
    $tf.TextRange.Font.Size = $size
    $tf.TextRange.Font.Bold = -1
    $tf.TextRange.Font.Color.RGB = $cTextDk
    $tf.TextRange.ParagraphFormat.Alignment = 2
    return $sh
}

# Lista de tópicos (marcador quadrado). Aceita [[negrito]]. Devolve o y seguinte.
function Add-Bullets($slide, [double]$x, [double]$y, [double]$w, $items, [double]$size = 24, [double]$gap = 14, [int]$markRgb = -1) {
    if ($markRgb -lt 0) { $markRgb = $cMagenta }
    foreach ($it in $items) {
        $null = Add-Rect $slide $x ($y + $size * 0.42) 10 10 $markRgb
        $tb = Add-Rich $slide ($x + 24) $y ($w - 24) $it $size
        $y = $y + $tb.Height + $gap
    }
    return $y
}

# Tabela nativa do PowerPoint. $data = linhas; célula = string ou @{t;b;c;fill;a;sub}.
function Add-Table($slide, [double]$x, [double]$y, $colW, $data, [double]$size = 20, [double]$rowH = 44,
                   [int]$headRows = 1, [double]$headH = 40, $aligns = $null, $merges = $null) {
    $nR = $data.Count; $nC = $colW.Count
    $tw = 0.0; foreach ($cw in $colW) { $tw += $cw }
    $shape = $slide.Shapes.AddTable($nR, $nC, $x, $y, $tw, $rowH * $nR)
    $tbl = $shape.Table
    $tbl.ApplyStyle('{2D5ABB26-0587-4C30-8999-92F81FD0307C}', $false)   # "Sem estilo, sem grade"
    for ($c = 0; $c -lt $nC; $c++) { $tbl.Columns.Item($c + 1).Width = $colW[$c] }
    for ($r = 0; $r -lt $nR; $r++) {
        $isHead = ($r -lt $headRows)
        for ($c = 0; $c -lt $nC; $c++) {
            $spec = $data[$r][$c]
            if ($spec -is [string]) { $spec = @{ t = $spec } }
            $cell = $tbl.Cell($r + 1, $c + 1)
            $tf = $cell.Shape.TextFrame
            $tf.MarginLeft = 10; $tf.MarginRight = 8; $tf.MarginTop = 2; $tf.MarginBottom = 2
            $tf.VerticalAnchor = 3
            $txt = [string]$spec.t
            if ($spec.sub) { $txt = $txt + "`r" + [string]$spec.sub }
            $tr = $tf.TextRange
            $tr.Text = $txt
            $tr.Font.Size = $size
            $tr.Font.Bold = 0
            $tr.Font.Color.RGB = $cTextDk
            $al = 'left'
            if ($aligns -ne $null) { $al = $aligns[$c] }
            if ($spec.a) { $al = $spec.a }
            switch ($al) { 'center' { $tr.ParagraphFormat.Alignment = 2 } 'right' { $tr.ParagraphFormat.Alignment = 3 } default { $tr.ParagraphFormat.Alignment = 1 } }
            if ($isHead) {
                $tr.Font.Bold = -1; $tr.Font.Color.RGB = $cWhite
                $cell.Shape.Fill.Solid(); $cell.Shape.Fill.ForeColor.RGB = $cPurple
            } else {
                if ($spec.b) { $tr.Font.Bold = -1 }
                if ($spec.c -ne $null) { $tr.Font.Color.RGB = $spec.c }
                if ($spec.fill -ne $null) { $cell.Shape.Fill.Solid(); $cell.Shape.Fill.ForeColor.RGB = $spec.fill } else { $cell.Shape.Fill.Visible = 0 }
                if ($spec.sub) {
                    $first = ([string]$spec.t).Length
                    $subRun = $tr.Characters($first + 2, ([string]$spec.sub).Length)
                    $subRun.Font.Size = $szNote; $subRun.Font.Bold = 0; $subRun.Font.Color.RGB = $cTextMid
                }
                $bd = $cell.Borders.Item(3)                 # linha inferior
                $bd.Visible = -1; $bd.ForeColor.RGB = $cGridLn; $bd.Weight = 1
            }
        }
        if ($isHead) { $tbl.Rows.Item($r + 1).Height = $headH } else { $tbl.Rows.Item($r + 1).Height = $rowH }
    }
    if ($merges -ne $null) {
        foreach ($m in $merges) {                           # @{ r; c1; c2; t }
            $tbl.Cell($m.r, $m.c1).Merge($tbl.Cell($m.r, $m.c2))
            $mc = $tbl.Cell($m.r, $m.c1).Shape.TextFrame.TextRange
            $mc.Text = $m.t; $mc.Font.Size = $size; $mc.Font.Bold = -1; $mc.Font.Color.RGB = $cWhite
            $mc.ParagraphFormat.Alignment = 2
        }
    }
    return $shape
}

# Quadradinho colorido ao lado do nome do algoritmo (mesma cor dos gráficos).
function Add-Swatch($slide, [double]$x, [double]$y, [int]$rgb) {
    return (Add-Rect $slide $x $y 14 14 $rgb -1 0 $true 0.2)
}

function Set-Notes($slide, [string]$text) {
    try { $slide.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text = $text }
    catch {
        foreach ($ph in $slide.NotesPage.Shapes.Placeholders) {
            if ($ph.PlaceholderFormat.Type -eq 2) { $ph.TextFrame.TextRange.Text = $text }
        }
    }
}

# Duplicate() insere logo após a origem; movemos para o fim para manter a ordem.
function Dup-Move($srcSlide) {
    $new = $srcSlide.Duplicate().Item(1)
    $new.MoveTo($pres.Slides.Count)
    return $new
}

# Slide de conteúdo: faixa com TÍTULO (36 pt) + MENSAGEM de uma linha (24 pt).
function New-ContentSlide([string]$title, [string]$message, [string]$section = '') {
    $s = Dup-Move $tplContent
    if ($s.Shapes.Count -ge 6) { $s.Shapes.Item(6).Delete() }      # corpo de exemplo do template
    $kick = $s.Shapes.Item(1); $mark = $s.Shapes.Item(2); $ban = $s.Shapes.Item(3); $ttl = $s.Shapes.Item(4)

    $ttl.TextFrame.WordWrap = 0
    $ttl.TextFrame.TextRange.Text = $title
    $ttl.TextFrame.TextRange.Font.Size = $szTitle
    $ttl.TextFrame2.TextRange.Font.Spacing = 2
    $ban.Height = 66
    $ttl.Left = 24
    $ttl.Top = (66 - $ttl.Height) / 2
    $ban.Width = $ttl.Left + $ttl.Width + 36

    $kick.Left = 22; $kick.Top = 74; $kick.Width = 900
    $kick.TextFrame.TextRange.Text = $message
    $kick.TextFrame.TextRange.Font.Size = $szMsg
    $kick.TextFrame2.TextRange.Font.Spacing = 0
    $mark.Top = $kick.Top + 9; $mark.Height = 20

    $null = $deck.Add(@{ s = $s; kind = 'content'; section = $section })
    return $s
}

function New-SectionSlide([string]$title, [string]$subtitle = '') {
    $s = Dup-Move $tplSection
    $s.Shapes.Item(1).TextFrame.TextRange.Text = $title
    if ($subtitle -ne '') {
        $t = $s.Shapes.Item(1)
        $tb = Add-Text $s 130 ($t.Top + $t.Height + 14) 700 $subtitle 28 $cWhite $false 'center'
    }
    $null = $deck.Add(@{ s = $s; kind = 'section'; section = '' })
    return $s
}

# Cartão de destaque à direita dos gráficos: número grande + duas frases.
function Add-StatCard($slide, [int]$fillRgb, [int]$numRgb, [string]$big, [double]$bigSize, [string]$line1, [string]$line2) {
    $card = Add-Card $slide 622 134 300 292 $fillRgb
    $b = Add-Text $slide 640 146 266 $big $bigSize $numRgb $true
    $y = 146 + $b.Height + 4
    $l1 = Add-Rich $slide 640 $y 266 $line1 $szBody
    $y = $y + $l1.Height + 12
    if ($line2 -ne '') { $l2 = Add-Rich $slide 640 $y 266 $line2 $szBody; $y = $y + $l2.Height }
    $card.Height = ($y + 22) - 134
}

$sec1 = '01 · Introdução'
$sec2 = '02 · Referencial Teórico'
$sec3 = '03 · Metodologia'
$sec4 = '04 · Resultados'
$sec5 = '05 · Conclusão'
$secB = 'Apoio'

try {

# ══════════════════════════════════════════════════════════════════════════════
#  SLIDES PRINCIPAIS (17)
# ══════════════════════════════════════════════════════════════════════════════

# ── 1. CAPA ──────────────────────────────────────────────────────────────────
$s = Dup-Move $tplCover
$null = $deck.Add(@{ s = $s; kind = 'cover'; section = '' })
$t = $s.Shapes.Item(1)
$t.Left = 80; $t.Width = 800; $t.Top = 48
$t.TextFrame.TextRange.Text = 'Análise Comparativa de Algoritmos de Pathfinding para NPCs em Jogos 2D em Ambiente Web'
$t.TextFrame.TextRange.Font.Size = 40
$sub = $s.Shapes.Item(2)
$sub.Left = 80; $sub.Width = 800; $sub.Top = $t.Top + $t.Height + 16
$sub.TextFrame.TextRange.Text = 'A*  ·  Dijkstra  ·  BFS  ·  DFS-Greedy  ·  JPS'
$sub.TextFrame.TextRange.Font.Size = 26
$sub.TextFrame.TextRange.Font.Color.RGB = $cWhite
$au = $s.Shapes.Item(4)
$au.Left = 40; $au.Top = 338; $au.Width = 760; $au.Height = 150
$au.TextFrame.TextRange.Text = "Jeandeson Souza Nascimento`rOrientador: Prof. Gilson Amorim Carvalho`rUNIJORGE  ·  Ciência da Computação  ·  2026"
$au.TextFrame.TextRange.Font.Size = 24
$au.TextFrame.TextRange.Paragraphs(1).Font.Size = 30
$au.TextFrame.TextRange.Paragraphs(1).Font.Bold = -1
Set-Notes $s @"
[0:35] Cumprimente a banca. "Sou Jeandeson Nascimento e apresento meu TCC: uma análise comparativa de algoritmos de pathfinding para NPCs em jogos 2D no navegador, orientado pelo professor Gilson Amorim Carvalho."
Gancho: cinco algoritmos e uma pergunta: qual usar em um jogo web e quanto custa, de verdade, rodar cada um no navegador?
"@

# ── 2. AGENDA ────────────────────────────────────────────────────────────────
$s = New-ContentSlide 'Agenda' 'Cinco seções em cerca de 15 minutos'
$items = @(
    @{ n = '01'; t = 'Introdução';          d = 'Problema, pergunta de pesquisa e objetivos';   m = '≈ 2 min' },
    @{ n = '02'; t = 'Referencial Teórico'; d = 'Os cinco algoritmos, com foco em A* e JPS';    m = '≈ 3 min' },
    @{ n = '03'; t = 'Metodologia';         d = 'Ambiente de medição, simulador e cenários';    m = '≈ 4 min' },
    @{ n = '04'; t = 'Resultados';          d = 'Nós expandidos, escalabilidade e trade-offs';  m = '≈ 4 min' },
    @{ n = '05'; t = 'Conclusão';           d = 'Respostas, limitações e trabalhos futuros';    m = '≈ 2 min' }
)
$y = 130
foreach ($it in $items) {
    $null = Add-Rect $s 40 $y 54 54 $cMagenta -1 0 $true 0.14
    $null = Add-Text $s 40 ($y + 10) 54 $it.n 26 $cWhite $true 'center'
    $null = Add-Text $s 114 ($y - 3) 700 $it.t 28 $cPurple $true
    $null = Add-Text $s 114 ($y + 30) 560 $it.d 22 $cTextMid
    $null = Add-Text $s 690 ($y + 10) 130 $it.m 24 $cTextMid $false 'right'
    $y += 73
}
Set-Notes $s @"
[0:20] Passe pelos cinco blocos sem detalhar: introdução, referencial dos cinco algoritmos, metodologia com o simulador, resultados dos benchmarks e conclusão. O indicador no canto superior direito de cada slide mostra em qual seção estamos.
"@

# ── 3. PROBLEMA ──────────────────────────────────────────────────────────────
$s = New-ContentSlide 'Problema' 'Falta medir o custo real do pathfinding no navegador' $sec1
$null = Add-Bullets $s 40 142 520 @(
    'Movimento inteligente dos NPCs sustenta a experiência do jogo (Moon et al., 2022)',
    'A literatura mede o desempenho em C++ e em código nativo',
    '[[Lacuna:]] A* × JPS em JavaScript quase não é documentado'
) $szBody 22
$card = Add-Card $s 590 134 332 268 $tMagenta
$null = Add-Text $s 610 152 292 'PERGUNTA DE PESQUISA' $szNote $cMagenta $true
$q = Add-Text $s 610 186 294 'Qual algoritmo de pathfinding escolher em jogos web 2D, e qual é o custo real no navegador?' 28 $cTextDk $true
$card.Height = ($q.Top + $q.Height + 22) - 134
Set-Notes $s @"
[1:00] Em jogos de exploração, o movimento inteligente dos NPCs é essencial. O dev indie tem IA pronta em Unity e Phaser, mas a literatura clássica mede pathfinding em C++ ou código nativo. No navegador quem executa é o motor V8: compilação JIT, coletor de lixo e relógio com resolução limitada mudam o custo real. A lacuna específica é a comparação A* contra JPS em JavaScript.
Leia a pergunta de pesquisa apontando para o cartão.
"@

# ── 4. OBJETIVOS ─────────────────────────────────────────────────────────────
$s = New-ContentSlide 'Objetivos' 'Comparar cinco algoritmos em um simulador web próprio' $sec1
$null = Add-Card $s 40 132 880 100 $tPurple
$null = Add-Text $s 58 140 400 'OBJETIVO GERAL' $szNote $cMagenta $true
$null = Add-Text $s 58 164 846 'Analisar comparativamente A*, Dijkstra, BFS, DFS-Greedy e JPS em um ambiente 2D com obstáculos, medindo a eficiência no navegador.' $szBody
$null = Add-Text $s 40 246 400 'OBJETIVOS ESPECÍFICOS' $szNote $cMagenta $true
$objs = @(
    '[[Estudar]] os princípios dos cinco algoritmos',
    '[[Implementar]] todos do zero, sem bibliotecas',
    '[[Disponibilizar]] um simulador interativo online',
    '[[Avaliar]] tempo, nós expandidos, caminho e sucesso',
    '[[Validar]] a admissibilidade da heurística de Manhattan'
)
$y = 276; $i = 1
foreach ($o in $objs) {
    $null = Add-Oval $s 40 $y 34 $cMagenta
    $null = Add-Text $s 40 ($y + 4) 34 "$i" 20 $cWhite $true 'center'
    $null = Add-Rich $s 88 ($y + 2) 730 $o $szBody $cPurple
    $y += 44; $i++
}
Set-Notes $s @"
[0:45] Objetivo geral: comparar o desempenho dos cinco algoritmos em um ambiente 2D com obstáculos, com um simulador em TypeScript. Específicos, em uma frase: estudar os princípios, implementar do zero, disponibilizar o simulador online, avaliar por métricas (tempo, nós expandidos, comprimento do caminho e taxa de sucesso) e validar a admissibilidade da heurística de Manhattan.
"@

# ── 5. OS 5 ALGORITMOS ───────────────────────────────────────────────────────
$s = New-ContentSlide 'Os 5 algoritmos' 'Quatro garantem o caminho ótimo; o DFS-Greedy, não' $sec2
$yes = @{ t = '✓  Sim'; c = $cOK;  b = $true }
$no  = @{ t = '✗  Não'; c = $cErr; b = $true }
$rows = @(
    @( 'Algoritmo', 'Caminho ótimo?', 'Como busca' ),
    @( @{ t = 'Dijkstra'; b = $true },   $yes, 'Menor custo acumulado, sem heurística' ),
    @( @{ t = 'BFS'; b = $true },        $yes, 'Camada por camada, com fila FIFO' ),
    @( @{ t = 'DFS-Greedy'; b = $true; sub = 'variante adotada' }, $no, 'Pilha LIFO guiada por Manhattan' ),
    @( @{ t = 'A*'; b = $true },         $yes, 'f(n) = g(n) + h(n)' ),
    @( @{ t = 'JPS'; b = $true },        $yes, 'A* com saltos e poda de simetrias' )
)
$tblTop = 130; $headH = 40; $rowH = 54
$tb = Add-Table $s 40 $tblTop @(290, 180, 410) $rows 22 $rowH 1 $headH
$order = @('dijkstra', 'bfs', 'dfs', 'astar', 'jps')
for ($r = 0; $r -lt 5; $r++) {
    $tb.Table.Cell($r + 2, 1).Shape.TextFrame.MarginLeft = 38
    $null = Add-Swatch $s 54 ($tblTop + $headH + $r * $rowH + ($rowH - 14) / 2) $algColor[$order[$r]]
}
Set-Notes $s @"
[1:00] Não leia célula por célula. Dijkstra é a base: ótimo, sem heurística, explora tudo por custo. BFS usa fila e garante o menor número de passos em grade de custo uniforme. O DFS entra na variante adotada, o DFS-Greedy: pilha guiada pela distância de Manhattan, rápido, mas sem garantia de ótimo. O A* soma custo real e estimativa. O JPS é o A* com saltos.
As cores dos quadradinhos são as mesmas dos gráficos de resultados.
"@

# ── 6. A* ────────────────────────────────────────────────────────────────────
$s = New-ContentSlide 'A*' 'Custo real + estimativa: busca guiada com caminho ótimo' $sec2
$null = Add-Card $s 40 134 480 244 $tBlue
$null = Add-Text $s 40 152 480 'f(n) = g(n) + h(n)' 46 $cBlueDk $true 'center' 'Consolas'
$null = Add-Rich $s 76 238 420 '[[g(n)]]  custo real desde a origem' $szBody $cBlueDk
$null = Add-Rich $s 76 278 420 '[[h(n)]]  estimativa até o objetivo' $szBody $cBlueDk
$null = Add-Text $s 76 332 420 'Hart, Nilsson e Raphael (1968)' $szNote $cTextMid
$null = Add-Bullets $s 560 146 362 @(
    '[[Heurística admissível]] garante o caminho ótimo',
    '[[Manhattan:]] h = |Δx| + |Δy|, para grades de 4 direções',
    'Fila de prioridade em [[heap binário]]'
) $szBody 22 $cBlue
Set-Notes $s @"
[0:50] O A* concilia o Dijkstra com a busca heurística. f(n) soma o custo real g(n) com a estimativa h(n). Com heurística admissível (que nunca superestima) o caminho encontrado é o ótimo. Em grade de 4 direções a distância de Manhattan é admissível e consistente (prova no slide de apoio 31). A lista aberta é um heap binário: O((V+E) log V).
"@

# ── 7. JPS ───────────────────────────────────────────────────────────────────
$s = New-ContentSlide 'JPS' 'Saltar em linha reta em vez de expandir célula a célula' $sec2
$cs = 38; $gy = 178
function Draw-Grid($slide, [double]$x0, [double]$y0, [double]$cell, $fills, $labels) {
    for ($r = 0; $r -lt 3; $r++) {
        for ($c = 0; $c -lt 10; $c++) {
            $key = "$c,$r"
            $fill = RGB 247 246 251
            if ($fills.ContainsKey($key)) { $fill = $fills[$key] }
            $null = Add-Rect $slide ($x0 + $c * $cell) ($y0 + $r * $cell) $cell $cell $fill $cGridLn 0.75
            if ($labels.ContainsKey($key)) {
                $lb = $labels[$key]
                $null = Add-Text $slide ($x0 + $c * $cell) ($y0 + $r * $cell + 6) $cell $lb.t 20 $lb.c $true 'center'
            }
        }
    }
}
$obst = @{ '3,0' = $cPurple; '4,0' = $cPurple; '5,0' = $cPurple }
# A*: expande as 9 células da linha até o objetivo
$fa = @{}; foreach ($k in $obst.Keys) { $fa[$k] = $obst[$k] }
for ($c = 0; $c -le 8; $c++) { $fa["$c,1"] = RGB 176 208 246 }
$fa['9,1'] = RGB 190 232 205
$la = @{ '0,1' = @{ t = 'S'; c = $cBlueDk }; '9,1' = @{ t = 'G'; c = $cOK } }
$null = Add-Rich $s 40 138 400 '[[A*]]  expande cada célula' $szBody $cBlueDk
Draw-Grid $s 40 $gy $cs $fa $la
$null = Add-Text $s 40 ($gy + 3 * $cs + 8) 380 '9 nós expandidos' 26 $cBlueDk $true
# JPS: só a origem e o ponto de salto entram na fila
$fj = @{}; foreach ($k in $obst.Keys) { $fj[$k] = $obst[$k] }
$fj['0,1'] = RGB 246 190 218; $fj['6,1'] = $cMagenta; $fj['9,1'] = RGB 190 232 205
$lj = @{ '0,1' = @{ t = 'S'; c = $cMagenta }; '6,1' = @{ t = 'P'; c = $cWhite }; '9,1' = @{ t = 'G'; c = $cOK } }
$gx = 500
$null = Add-Rich $s $gx 138 420 '[[JPS]]  salta até o ponto de salto' $szBody $cMagenta
Draw-Grid $s $gx $gy $cs $fj $lj
$midY = $gy + 1.5 * $cs
$null = Add-Line $s ($gx + $cs + 3) $midY ($gx + 6 * $cs - 3) $midY $cMagenta 3.5 $true
$null = Add-Line $s ($gx + 7 * $cs + 3) $midY ($gx + 9 * $cs - 3) $midY $cMagenta 3.5 $true
$null = Add-Text $s $gx ($gy + 3 * $cs + 8) 380 '2 nós expandidos' 26 $cMagenta $true
$null = Add-Text $s 40 ($gy + 3 * $cs + 46) 880 'S: origem  ·  G: objetivo  ·  P: ponto de salto  ·  células escuras: obstáculos' $szNote $cTextMid
$null = Add-Bullets $s 40 370 790 @(
    '[[Mesmo caminho ótimo]] do A*, com muito menos nós expandidos',
    'Adaptado neste trabalho para [[4 direções]] (o original usa 8)'
) $szBody 12
$null = Add-Text $s 64 448 600 'Harabor e Grastien (2011)' $szNote $cTextMid
Set-Notes $s @"
[1:00] Mesmo mapa, dois algoritmos. O A* expande as nove células do corredor, uma a uma. O JPS salta em linha reta e só para em um ponto de salto: aqui, a célula P, onde o fim do obstáculo cria um vizinho forçado. Resultado: 2 nós expandidos em vez de 9, e o mesmo caminho.
O JPS original (Harabor e Grastien, 2011) usa 8 direções. Neste trabalho foi adaptado para 4 direções; os detalhes estão no slide de apoio 22.
"@

# ── 8. AMBIENTE DE MEDIÇÃO ───────────────────────────────────────────────────
$s = New-ContentSlide 'Ambiente de medição' 'Medição no navegador real, justa e reprodutível' $sec3
$cards = @(
    @{ h = 'Implementação';     c = $cBlueDk;  f = $tBlue;    l = "TypeScript`rCanvas 2D nativo`rSem bibliotecas de pathfinding" },
    @{ h = 'Medição';           c = $cMagenta; f = $tMagenta; l = "Chrome headless (V8)`rperformance.now() em lotes`r10 janelas por cenário" },
    @{ h = 'Reprodutibilidade'; c = $cOK;      f = $tGreen;   l = "Sementes fixas (mulberry32)`rMesmos nós e caminhos em qualquer máquina" }
)
$x = 40; $cardBoxes = @(); $maxBottom = 0
foreach ($cd in $cards) {
    $cardBoxes += (Add-Card $s $x 134 286 270 $cd.f)
    $null = Add-Text $s ($x + 18) 148 252 $cd.h 26 $cd.c $true
    $tb = Add-Text $s ($x + 18) 194 252 $cd.l $szBody
    $tb.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 8
    if (($tb.Top + $tb.Height) -gt $maxBottom) { $maxBottom = $tb.Top + $tb.Height }
    $x += 297
}
foreach ($cb in $cardBoxes) { $cb.Height = ($maxBottom + 14) - 134 }
$null = Add-Text $s 40 ($maxBottom + 28) 780 'Hardware: Intel Core i5-10300H  ·  16 GB de RAM  ·  Windows 11 Pro' $szNote $cTextMid
Set-Notes $s @"
[0:55] Três decisões. Implementação: TypeScript e Canvas 2D nativo, sem framework de jogo e sem biblioteca de pathfinding, para não inserir variáveis externas. Medição: Chrome headless; como o relógio do navegador tem resolução de cerca de 0,1 ms, cada busca é repetida em lote e o tempo é a janela dividida pelo número de repetições, em 10 janelas. Reprodutibilidade: sementes fixas, então nós expandidos e caminhos são idênticos em qualquer máquina; só o tempo depende do hardware.
Detalhes do protocolo: slide de apoio 30.
"@

# ── 9. SIMULADOR (callouts) ──────────────────────────────────────────────────
$s = New-ContentSlide 'Simulador' 'Artefato online: pathfinding-quest-j95b.vercel.app' $sec3
$gX = 30; $gY = 128; $gW = 500; $gH = 375                       # jogo (4:3)
$null = Add-Image $s (Join-Path $assets 'slide_jogo_debug.png') $gX $gY $gW $gH 'Simulador em modo de depuração: grade, custos f de cada célula e caminho do jogador até o destino clicado.'
$mX = 560; $mY = 128; $mW = 370; $mH = [math]::Round(370 * 366 / 520, 1)   # recorte do menu (520×366)
$null = Add-Image $s (Join-Path $assets 'slide_menu.png') $mX $mY $mW $mH 'Menu do simulador: botões Iniciar Jogo e Executar Benchmark e a seleção de algoritmo (A*, Dijkstra, BFS, DFS, JPS).'
$k = $mW / 520.0                                                # px do recorte → pt
# callouts do jogo (sobre a imagem)
$destX = $gX + (12.5 * 64 / 1280) * $gW; $destY = $gY + (4.5 * 64 / 960) * $gH    # destino clicado (X amarelo)
$null = Add-Line $s ($destX + 46) ($destY - 44) ($destX + 9) ($destY - 8) $cMagenta 3 $true
$null = Add-Tag $s ($destX + 2) ($destY - 78) 178 34 'Clique para mover'
$numX = $gX + (2.12 * 64 / 1280) * $gW; $numY = $gY + (11.2 * 64 / 960) * $gH     # custo f da célula (2,11), visível com a tecla D
$null = Add-Line $s ($numX + 40) ($numY + 40) ($numX + 5) ($numY + 5) $cMagenta 3 $true
$null = Add-Tag $s ($numX + 14) ($numY + 40) 192 34 'Tecla D: depuração'
# callouts do menu (abaixo do recorte)
$tagY = $mY + $mH + 12
$null = Add-Tag $s $mX $tagY 198 34 'Seleção de algoritmo'
$null = Add-Line $s ($mX + 99) $tagY ($mX + 145 * $k) ($mY + 302 * $k) $cMagenta 3 $true
$null = Add-Tag $s ($mX + 212) $tagY 158 34 'Modo benchmark'
$bx = $mX + 500 * $k; $by = $mY + 108 * $k                      # margem direita do recorte / botão
$null = Add-Line $s $bx $tagY $bx $by $cMagenta 3
$null = Add-Line $s $bx $by ($mX + 409 * $k) $by $cMagenta 3 $true
Set-Notes $s @"
[2:30 com a demonstração] Abra o simulador ao vivo (abas já abertas antes de começar). Roteiro da demo:
1. No menu, selecione o algoritmo dos NPCs.
2. Inicie o jogo e clique no mapa: o caminho é traçado até o destino.
3. Aperte D: aparecem a grade e os custos f de cada célula.
4. Troque para o DFS-Greedy (tecla 4 no jogador, R nos inimigos) e mostre o caminho mais longo.
5. Se houver tempo, volte ao menu e abra o modo benchmark (ele gera os dados dos próximos slides).
Plano B: se a rede falhar, use este slide e diga que há uma gravação.
"@

# ── 10. CENÁRIOS DE TESTE ────────────────────────────────────────────────────
$s = New-ContentSlide 'Cenários de teste' 'Quatro cenários, quatro métricas, sementes fixas' $sec3
$cen = @(
    @{ t = 'Densidade de obstáculos'; d = 'Grade 20×20  ·  densidades 0,2 e 0,4' },
    @{ t = 'Múltiplos NPCs';          d = 'Grade 20×20  ·  50 NPCs simultâneos' },
    @{ t = 'Congestionamento';        d = 'Corredor 30×30  ·  5 a 50 NPCs' },
    @{ t = 'Objetivos dinâmicos';     d = 'Grade 40×40  ·  3 destinos em série' }
)
for ($i = 0; $i -lt 4; $i++) {
    $x = 40 + ($i % 2) * 450
    $y = 134 + [math]::Floor($i / 2) * 126
    $null = Add-Card $s $x $y 430 112 $tGray
    $null = Add-Rect $s ($x + 16) ($y + 18) 46 46 $cMagenta -1 0 $true 0.14
    $null = Add-Text $s ($x + 16) ($y + 26) 46 "$($i + 1)" 24 $cWhite $true 'center'
    $null = Add-Text $s ($x + 78) ($y + 13) 340 $cen[$i].t 26 $cPurple $true
    $null = Add-Text $s ($x + 78) ($y + 56) 345 $cen[$i].d 22 $cTextMid
}
$null = Add-Text $s 40 396 400 'MÉTRICAS' $szNote $cMagenta $true
$null = Add-Text $s 40 420 790 'Tempo  ·  nós expandidos  ·  comprimento do caminho  ·  taxa de sucesso' $szBody $cTextDk $true
Set-Notes $s @"
[0:40] Quatro cenários: densidade de obstáculos em grade 20×20; múltiplos NPCs, com 50 buscas simultâneas; congestionamento, com todos convergindo para um corredor central em grade 30×30; e objetivos dinâmicos em grade 40×40, com replanejamento em três etapas. Em todos, as mesmas quatro métricas. Os resultados de 40×40 e de objetivos dinâmicos estão nos slides de apoio 26 e 29.
"@

# ── 11. NÓS EXPANDIDOS ───────────────────────────────────────────────────────
$d4 = $D.dens20.d04
$s = New-ContentSlide 'Nós expandidos' "Em grade densa, o JPS expande $($dv.jpsCut04F)% menos nós que o A*" $sec4
$null = Add-Image $s (Join-Path $charts 'slide_nodes.png') 25 120 575 385 "Gráfico de barras, grade 20×20, densidade 0,4. Nós expandidos: A* $($d4.astar.nodesF), Dijkstra $($d4.dijkstra.nodesF), BFS $($d4.bfs.nodesF), DFS-Greedy $($d4.dfs.nodesF), JPS $($d4.jps.nodesF)."
Add-StatCard $s $tMagenta $cMagenta "−$($dv.jpsCut04F)%" 58 "de nós expandidos: [[$($d4.astar.nodesF)]] no A*, [[$($d4.jps.nodesF)]] no JPS" "Mesmo caminho ótimo: [[$($d4.jps.pathF) células]]"
Set-Notes $s @"
[1:05] O resultado mais marcante. Grade 20×20 com densidade 0,4: A*, Dijkstra e BFS expandem $($d4.astar.nodesF) nós; o JPS, apenas $($d4.jps.nodesF). Redução de $($dv.jpsCut04F)%. Pause aqui.
Por quê: obstáculos densos criam vizinhos forçados, e poucos pontos de salto ligam origem e destino. O caminho continua ótimo, $($d4.jps.pathF) células, igual ao do A*.
Na densidade 0,2 a vantagem é menor: $($D.dens20.d02.jps.nodesF) contra $($D.dens20.d02.astar.nodesF) nós ($($dv.jpsCut02F)% a menos). Tabela completa: slide de apoio 25.
"@

# ── 12. ESCALABILIDADE ───────────────────────────────────────────────────────
$c50 = $D.cong.n50
$s = New-ContentSlide 'Escalabilidade' 'O tempo cresce linearmente e fica longe dos 16 ms/quadro' $sec4
$null = Add-Image $s (Join-Path $charts 'slide_scale.png') 25 120 575 385 "Gráfico de linhas, corredor 30×30, densidade 0,2: tempo total por número de NPCs (5, 10, 20, 50). Com 50 NPCs: A* $($c50.astar.timeF) ms, JPS $($c50.jps.timeF) ms. Linha de referência: $BUDGET."
Add-StatCard $s $tBlue $cBlueDk "$($dv.astarCong50PctF)%" 58 "do quadro: o A* resolve [[50 NPCs em $($c50.astar.timeF) ms]]" "O mais lento, $($dv.worstCong50.label): [[$($dv.worstCong50.timeF) ms]] ($($dv.worstCong50.pctF)% do quadro)"
Set-Notes $s @"
[0:55] Corredor 30×30 com 5 a 50 NPCs convergindo para o mesmo gargalo. O gráfico mostra só A*, JPS e o limite de $BUDGET. O tempo cresce em linha reta, porque cada NPC faz uma busca independente (o motor é single-thread). Com 50 NPCs o A* usa $($c50.astar.timeF) ms, $($dv.astarCong50PctF)% do quadro; o JPS, $($c50.jps.timeF) ms. Mesmo o mais lento, o $($dv.worstCong50.label), fica em $($dv.worstCong50.timeF) ms.
Os cinco algoritmos juntos: slide de apoio 28. Tabela: slide 27.
"@

# ── 13. 50 NPCs ──────────────────────────────────────────────────────────────
$e50 = $D.esc50
$s = New-ContentSlide '50 NPCs simultâneos' 'Todos os algoritmos concluem as 50 buscas em menos de 2 ms' $sec4
$null = Add-Image $s (Join-Path $charts 'slide_npc50.png') 25 120 575 385 "Gráfico de barras, grade 20×20, densidade 0,2, tempo das 50 buscas: A* $($e50.astar.timeF) ms, Dijkstra $($e50.dijkstra.timeF) ms, BFS $($e50.bfs.timeF) ms, DFS-Greedy $($e50.dfs.timeF) ms, JPS $($e50.jps.timeF) ms."
Add-StatCard $s $tGreen $cOK '< 2 ms' 54 'para as 50 buscas, em [[qualquer]] dos cinco algoritmos' "Pior caso, $($dv.worstEsc50.label): [[$($dv.worstEsc50.pctF)% do quadro]] de 16 ms (60 fps)"
Set-Notes $s @"
[0:50] Grade 20×20, 50 buscas no mesmo quadro. Todos terminam em menos de 2 ms: DFS-Greedy $($e50.dfs.timeF), A* $($e50.astar.timeF), BFS $($e50.bfs.timeF), JPS $($e50.jps.timeF) e Dijkstra $($e50.dijkstra.timeF) ms. No pior caso, $($dv.worstEsc50.pctF)% do orçamento de $BUDGET.
Conclusão prática: nestas escalas, a taxa de quadros não decide a escolha do algoritmo. Repare que o JPS não é o mais rápido aqui; é o assunto do próximo slide.
"@

# ── 14. TRADE-OFFS ───────────────────────────────────────────────────────────
$s = New-ContentSlide 'Trade-offs' 'Nenhum algoritmo vence em tudo: a escolha depende do gargalo' $sec4
$best = $tGreen
$rows = @(
    @( '50 NPCs  ·  grade 20×20', 'Nós expandidos', 'Tempo', 'Caminho' ),
    @( @{ t = 'A*'; b = $true },         "$($e50.astar.nodesF)", "$($e50.astar.timeF) ms", @{ t = "$($e50.astar.pathF) células (ótimo)"; fill = $best; b = $true } ),
    @( @{ t = 'JPS'; b = $true },        "$($e50.jps.nodesF)",   "$($e50.jps.timeF) ms",   @{ t = "$($e50.jps.pathF) células (ótimo)"; fill = $best; b = $true } ),
    @( @{ t = 'DFS-Greedy'; b = $true }, @{ t = "$($e50.dfs.nodesF)"; fill = $best; b = $true }, @{ t = "$($e50.dfs.timeF) ms"; fill = $best; b = $true }, @{ t = "$($e50.dfs.pathF) células (+$($dv.dfsExtraPathF)%)"; c = $cErr; b = $true } )
)
$tblTop = 132; $headH = 42; $rowH = 58
$tb = Add-Table $s 40 $tblTop @(290, 190, 160, 240) $rows 22 $rowH 1 $headH
$order = @('astar', 'jps', 'dfs')
for ($r = 0; $r -lt 3; $r++) {
    $tb.Table.Cell($r + 2, 1).Shape.TextFrame.MarginLeft = 38
    $null = Add-Swatch $s 54 ($tblTop + $headH + $r * $rowH + ($rowH - 14) / 2) $algColor[$order[$r]]
}
$legY = $tblTop + $headH + 3 * $rowH + 12
$null = Add-Rect $s 40 ($legY + 3) 18 18 $best -1 0 $true 0.2
$null = Add-Text $s 66 $legY 400 'melhor valor da coluna' $szNote $cTextMid
$null = Add-Bullets $s 40 ($legY + 40) 790 @(
    '[[JPS:]] metade dos nós do A*, mas sem ganho de tempo em grade esparsa',
    '[[DFS-Greedy:]] o mais rápido, com caminho mais longo'
) $szBody 10
Set-Notes $s @"
[1:00] Leia por linha. A*: caminho ótimo e bom tempo, $($e50.astar.timeF) ms. JPS: expande metade dos nós do A* ($($e50.jps.nodesF) contra $($e50.astar.nodesF)) e ainda assim é mais lento, $($e50.jps.timeF) ms, porque nesta grade pequena e esparsa as sondagens de cada salto custam mais do que os nós poupados. DFS-Greedy: menos nós e menor tempo, $($e50.dfs.timeF) ms, mas o caminho tem $($e50.dfs.pathF) células contra $($e50.astar.pathF): $($dv.dfsExtraPathF)% mais longo.
Se perguntarem por que o JPS não foi o mais rápido: slide de apoio 19.
"@

# ── 15. CONCLUSÕES ───────────────────────────────────────────────────────────
$s = New-ContentSlide 'Conclusões' 'Todos são viáveis a 60 fps; o gargalo define a escolha' $sec5
$concl = @(
    @{ ic = '✓'; c = $cOK;      f = $tGreen;   t = "[[$BUDGET atendido:]] 50 NPCs em menos de 2 ms" },
    @{ ic = '✓'; c = $cMagenta; f = $tMagenta; t = "[[JPS:]] até $($dv.jpsCut04IntF)% menos nós expandidos em grades densas" },
    @{ ic = '✓'; c = $cBlueDk;  f = $tBlue;    t = '[[A*:]] melhor equilíbrio entre caminho ótimo e tempo' },
    @{ ic = '✗'; c = $cErr;     f = $tRed;     t = "[[DFS-Greedy:]] o mais rápido, mas com caminho $($dv.dfsExtraPathF)% mais longo" }
)
$y = 134
foreach ($c in $concl) {
    $null = Add-Card $s 40 $y 880 64 $c.f
    $null = Add-Text $s 54 ($y + 9) 44 $c.ic 34 $c.c $true 'center'
    $null = Add-Rich $s 112 ($y + 17) 790 $c.t $szBody
    $y += 74
}
Set-Notes $s @"
[1:10] Quatro respostas. Um: o orçamento de $BUDGET é atendido com folga; a estimativa inicial de 50 ms por busca do anteprojeto era folgada em mais de uma ordem de grandeza. Dois: o JPS confirma a vantagem em nós expandidos, acima de $($dv.jpsCut04IntF)% em grades densas; em tempo, só vence quando a grade é densa. Três: o A* segue como referência geral. Quatro: o DFS-Greedy é o mais rápido, mas não garante o ótimo.
Frase de fechamento: nas escalas testadas, o gargalo não é a taxa de quadros; são os nós expandidos e a qualidade do caminho que decidem.
"@

# ── 16. LIMITAÇÕES E FUTURO ──────────────────────────────────────────────────
$s = New-ContentSlide 'Limitações e futuro' 'Cada limitação aponta um trabalho futuro' $sec5
$null = Add-Text $s 40 132 410 'LIMITAÇÃO' $szNote $cErr $true
$null = Add-Text $s 506 132 414 'TRABALHO FUTURO' $szNote $cOK $true
$pairs = @(
    @{ l = 'Destino inalcançável gera busca exaustiva';   f = 'Verificar conectividade antes de buscar' },
    @{ l = 'A* refaz a busca inteira a cada mudança';     f = 'D* Lite: replanejamento incremental' },
    @{ l = 'Custo cresce com agentes e tamanho do mapa';  f = 'HPA* e amortização entre quadros' }
)
$y = 160
foreach ($p in $pairs) {
    $null = Add-Card $s 40 $y 410 78 $tRed
    $tl = Add-Text $s 58 ($y + 10) 376 $p.l $szBody
    $tl.Top = $y + (78 - $tl.Height) / 2
    $null = Add-Line $s 456 ($y + 39) 500 ($y + 39) $cMagenta 3.5 $true
    $null = Add-Card $s 506 $y 414 78 $tGreen
    $tf2 = Add-Text $s 524 ($y + 10) 380 $p.f $szBody $cTextDk $true
    $tf2.Top = $y + (78 - $tf2.Height) / 2
    $y += 88
}
$null = Add-Text $s 40 426 780 'Os tempos vêm de um único hardware e não se generalizam a outros dispositivos.' $szNote $cTextMid
Set-Notes $s @"
[0:55] Três limitações, cada uma com a saída. Sem verificação prévia de conectividade, um destino isolado provoca busca exaustiva (foi a etapa 2 do teste dinâmico): basta checar a conectividade antes. O A* não tem memória: a cada mudança no mapa refaz a busca inteira; o D* Lite replaneja só o que mudou. E o custo cresce com o número de agentes e o tamanho do mapa: HPA* e amortização, replanejando parte dos NPCs por quadro.
Além disso, os tempos foram medidos em um único hardware.
Se perguntarem sobre ambientes dinâmicos: slide de apoio 21.
"@

# ── 17. OBRIGADO + QR CODES ──────────────────────────────────────────────────
$s = Dup-Move $tplThanks
$null = $deck.Add(@{ s = $s; kind = 'thanks'; section = '' })
foreach ($g in @('Agrupar 9', 'Agrupar 12')) { $s.Shapes.Item($g).Delete() }     # ícones de redes do template dão lugar aos QR codes
$null = Add-Text $s 80 282 800 'Jeandeson Souza Nascimento' 24 $cWhite $true 'center'
$null = Add-Text $s 80 312 800 'jeandeson.nascimento@bol.com.br' $szNote (RGB 244 226 250) $false 'center'
$qy = 352; $qs = 150
$null = Add-Image $s (Join-Path $assets 'qr_simulador.png') 52 $qy $qs $qs 'QR code do simulador: https://pathfinding-quest-j95b.vercel.app/'
$null = Add-Text $s 218 ($qy + 22) 220 'Simulador' 28 $cWhite $true
$null = Add-Text $s 218 ($qy + 62) 220 "pathfinding-quest-j95b`r.vercel.app" $szNote (RGB 244 226 250)
$null = Add-Image $s (Join-Path $assets 'qr_repositorio.png') 462 $qy $qs $qs 'QR code do repositório: https://github.com/jeandeson/pathfinding-quest'
$null = Add-Text $s 628 ($qy + 22) 205 'Repositório' 28 $cWhite $true
$null = Add-Text $s 628 ($qy + 62) 205 "github.com/jeandeson/`rpathfinding-quest" $szNote (RGB 244 226 250)
Set-Notes $s @"
[0:20] "Obrigado pela atenção. O simulador e o código estão nos QR codes: é só apontar a câmera do celular. Fico à disposição da banca."
Deixe este slide na tela durante a arguição. Para ir a um slide de apoio, digite o número e Enter:
19 por que o JPS não foi o mais rápido · 20 por que usar DFS · 21 A* em ambientes dinâmicos · 22 JPS em 4 direções · 23 e 24 código · 25 a 29 tabelas completas · 30 protocolo · 31 Manhattan · 32 por que 16 ms.
"@

# ══════════════════════════════════════════════════════════════════════════════
#  SLIDES DE APOIO (BACKUP)
# ══════════════════════════════════════════════════════════════════════════════

# ── 18. DIVISÓRIA ────────────────────────────────────────────────────────────
$s = New-SectionSlide 'Slides de apoio' 'Respostas e dados completos para a arguição'
Set-Notes $s 'Slides de apoio: não fazem parte da fala. Use o número do slide + Enter para ir direto ao assunto perguntado.'

# ── 19. POR QUE O JPS NÃO FOI O MAIS RÁPIDO? ─────────────────────────────────
$g2 = $D.dens40.d04
$s = New-ContentSlide 'JPS × tempo' 'Por que o JPS não foi o mais rápido?' $secB
$rows = @(
    @( 'Cenário', 'A*', 'JPS', 'Resultado' ),
    @( @{ t = 'Esparsa: 20×20, densidade 0,2'; sub = '50 NPCs' }, @{ t = "$($e50.astar.nodesF) nós"; sub = "$($e50.astar.timeF) ms" }, @{ t = "$($e50.jps.nodesF) nós"; sub = "$($e50.jps.timeF) ms" }, @{ t = 'JPS mais lento'; c = $cErr; b = $true } ),
    @( @{ t = 'Densa: 40×40, densidade 0,4'; sub = '1 busca' },   @{ t = "$($g2.astar.nodesF) nós"; sub = "$($g2.astar.timeF) ms" }, @{ t = "$($g2.jps.nodesF) nós"; sub = "$($g2.jps.timeF) ms" },   @{ t = "JPS $($dv.jpsSpeedup40F)× mais rápido"; c = $cOK; b = $true } )
)
$null = Add-Table $s 40 130 @(330, 160, 160, 230) $rows 22 62 1 40
$null = Add-Bullets $s 40 312 790 @(
    'A cada célula do salto, o JPS de 4 direções faz [[2 sondagens laterais]]',
    '[[Grade esparsa:]] sondagens longas custam mais que os nós poupados',
    '[[Grade densa:]] os obstáculos encurtam as sondagens e o JPS vence'
) $szBody 12
Set-Notes $s @"
Resposta curta: o JPS reduz nós expandidos, não necessariamente tempo. Na adaptação para 4 direções, cada célula percorrida pelo salto dispara duas sondagens perpendiculares. Em grade pequena e esparsa essas sondagens são longas e custam mais do que os nós poupados: $($e50.jps.timeF) ms contra $($e50.astar.timeF) ms do A*, mesmo com metade dos nós. Em grade densa os obstáculos encurtam as sondagens: em 40×40 com densidade 0,4 o JPS leva $($g2.jps.timeF) ms contra $($g2.astar.timeF) ms do A*.
"@

# ── 20. POR QUE USAR DFS? ────────────────────────────────────────────────────
$s = New-ContentSlide 'DFS-Greedy' 'Por que incluir o DFS na comparação?' $secB
$null = Add-Bullets $s 40 142 540 @(
    'Contraponto clássico: busca [[sem garantia]] de caminho ótimo',
    '[[DFS canônico:]] rotas incoerentes, inviável para NPCs em tempo real',
    '[[Variante adotada (DFS-Greedy):]] vizinhos ordenados por Manhattan antes de empilhar'
) $szBody 20 $cViolet
$card = Add-Card $s 622 134 300 292 $tPurple
$a1 = Add-Text $s 640 144 266 "$($e50.dfs.timeF) ms" 50 $cViolet $true
$a2 = Add-Text $s 640 ($a1.Top + $a1.Height) 266 'o mais rápido com 50 NPCs' $szBody
$a3 = Add-Text $s 640 ($a2.Top + $a2.Height + 14) 266 "$($dv.dfsPathF) × $($dv.optPathF)" 50 $cErr $true
$a4 = Add-Text $s 640 ($a3.Top + $a3.Height) 266 "células: caminho $($dv.dfsExtraPathF)% mais longo que o ótimo" $szBody
$card.Height = ($a4.Top + $a4.Height + 20) - 134
Set-Notes $s @"
Resposta curta: o DFS é a linha de base clássica e mostra, em números, o conflito entre velocidade de busca e qualidade do caminho. O DFS canônico (sem heurística) gerava rotas que se afastavam do objetivo, inviável para NPCs. Por isso a variante adotada, o DFS-Greedy: antes de empilhar, os vizinhos são ordenados pela distância de Manhattan, e o mais próximo do objetivo é expandido primeiro. Continua sem garantia de ótimo: é o mais rápido ($($e50.dfs.timeF) ms para 50 NPCs), com caminho de $($dv.dfsPathF) células contra $($dv.optPathF).
Nota: a implementação usa conjunto de visitados e mapa cameFrom, ambos O(V); não preserva a vantagem clássica de memória do DFS.
"@

# ── 21. A* EM AMBIENTES DINÂMICOS ────────────────────────────────────────────
$s = New-ContentSlide 'A* dinâmico' 'Qual é a limitação do A* em ambientes dinâmicos?' $secB
$null = Add-Bullets $s 40 142 540 @(
    '[[Sem memória:]] cada replanejamento refaz a busca inteira',
    "50 NPCs a 60 fps são [[$($dv.replansPerSecF) buscas por segundo]]",
    '[[Saídas:]] D* Lite, A* fatiado entre quadros e HPA*'
) $szBody 20 $cBlue
$card = Add-Card $s 622 134 300 292 $tBlue
$a1 = Add-Text $s 640 144 266 "≈ $($dv.projMsF) ms" 50 $cBlueDk $true
$a2 = Add-Text $s 640 ($a1.Top + $a1.Height) 266 'de 16 ms/quadro só com pathfinding' $szBody
$a3 = Add-Text $s 640 ($a2.Top + $a2.Height + 14) 266 "Projeção: 50 NPCs × $($g2.astar.timeF) ms, grade 40×40, densidade 0,4, replanejando a cada quadro" 20 $cTextMid
$card.Height = ($a3.Top + $a3.Height + 20) - 134
Set-Notes $s @"
Resposta curta: o A* implementado não tem memória. Cada chamada recria a lista aberta e o conjunto fechado e zera f, g e h de todas as células; mudou uma célula, recalcula tudo, com custo O((V+E) log V). Nas escalas medidas isso cabe com folga. Projetando: 50 NPCs replanejando a cada quadro em grade 40×40 com densidade 0,4 dão 50 × $($g2.astar.timeF) ms, cerca de $($dv.projMsF) ms dos 16 ms do quadro.
Saídas: D* Lite (propaga só o que mudou), A* fatiado (limita expansões por quadro e persiste a busca) e HPA* (busca hierárquica).
"@

# ── 22. JPS EM 4 DIREÇÕES ────────────────────────────────────────────────────
$s = New-ContentSlide 'JPS em 4 direções' 'Como o JPS foi adaptado para 4 direções?' $secB
$c2 = 40; $gx = 40; $gy2 = 140
for ($r = 0; $r -lt 5; $r++) {
    for ($c = 0; $c -lt 7; $c++) {
        $fill = RGB 247 246 251
        if (($c -eq 4) -and (($r -eq 2) -or ($r -eq 3))) { $fill = $cPurple }
        if (($c -eq 0) -and ($r -eq 2)) { $fill = RGB 246 190 218 }
        if (($c -eq 3) -and ($r -eq 2)) { $fill = $cMagenta }
        $null = Add-Rect $s ($gx + $c * $c2) ($gy2 + $r * $c2) $c2 $c2 $fill $cGridLn 0.75
    }
}
$null = Add-Text $s $gx ($gy2 + 2 * $c2 + 7) $c2 'S' 20 $cMagenta $true 'center'
$null = Add-Text $s ($gx + 3 * $c2) ($gy2 + 2 * $c2 + 7) $c2 'P' 20 $cWhite $true 'center'
$rowMid = $gy2 + 2.5 * $c2
$null = Add-Line $s ($gx + $c2 + 3) $rowMid ($gx + 3 * $c2 - 3) $rowMid $cMagenta 3.5 $true
foreach ($c in 1, 2, 3) {                                   # sondagens perpendiculares
    $cx = $gx + ($c + 0.5) * $c2
    $null = Add-Line $s $cx ($gy2 + 2 * $c2 - 3) $cx ($gy2 + 8) $cBlueDk 2 $true 4
    $null = Add-Line $s $cx ($gy2 + 3 * $c2 + 3) $cx ($gy2 + 5 * $c2 - 8) $cBlueDk 2 $true 4
}
$ly = $gy2 + 5 * $c2 + 12
$null = Add-Line $s $gx ($ly + 12) ($gx + 34) ($ly + 12) $cMagenta 3.5 $true
$null = Add-Text $s ($gx + 42) $ly 110 'salto' $szNote $cTextDk
$null = Add-Line $s ($gx + 130) ($ly + 12) ($gx + 164) ($ly + 12) $cBlueDk 2 $true 4
$null = Add-Text $s ($gx + 172) $ly 130 'sondagem' $szNote $cTextDk
$null = Add-Bullets $s 350 142 572 @(
    '[[Original]] (Harabor e Grastien, 2011): 8 direções, com diagonais',
    '[[Adaptação:]] salto cardeal + sondagem perpendicular a cada célula',
    '[[Ponto de salto (P):]] objetivo, vizinho forçado ou sondagem positiva',
    '[[Otimalidade validada:]] mesmos comprimentos do A* em todos os testes'
) $szBody 12
Set-Notes $s @"
O JPS original pressupõe 8 direções: a quebra de simetria entre caminhos diagonais é o cerne do método. Com movimento só cardeal, um ponto de curva em corredor aberto nunca seria detectado. A adaptação: ao saltar em uma direção, cada célula percorrida dispara uma sondagem linear nas duas direções perpendiculares; se a sondagem acha o objetivo ou uma célula com vizinho forçado, a célula atual vira ponto de salto. No desenho, a sondagem a partir de P encontra a passagem ao lado do obstáculo.
Custo: uma sondagem por célula (por isso o JPS não é o mais rápido em grade esparsa). Como é uma adaptação, a otimalidade não é herdada da prova original: foi validada empiricamente, com comprimentos idênticos aos do A* em todos os cenários.
"@

# ── 23. CÓDIGO: A* ───────────────────────────────────────────────────────────
function Add-Code($slide, [double]$x, [double]$y, [double]$w, [string]$code, [double]$size = 18) {
    $lines = ($code -split "`n").Count
    $h = $lines * $size * 1.09 + 22
    $null = Add-Rect $slide $x $y $w $h $tGray $cGridLn 1 $true 0.03
    $tb = Add-Text $slide ($x + 16) ($y + 10) ($w - 28) ($code -replace "`n", "`r") $size $cTextDk $false 'left' 'Consolas'
    $tb.TextFrame.TextRange.ParagraphFormat.SpaceWithin = 0.9
    $tb.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 0
    $tb.TextFrame.TextRange.ParagraphFormat.SpaceBefore = 0
    return $tb
}
$s = New-ContentSlide 'Código: A*' 'Laço principal do A* (PathfindingSystem.ts)' $secB
$code = @'
while (open.size > 0) {
  const current = open.pop()!.cell;
  if (closed.has(current)) continue;
  if (current === goal) return this.buildPath(current);
  closed.add(current);
  this.nodesVisited++;
  for (const nb of this.grid.getNeighbors(current)) {
    if (closed.has(nb)) continue;
    const g = current.g + 1;
    if (!seen.has(nb) || g < nb.g) {
      nb.parent = current;
      nb.g = g;
      nb.h = this.heuristic(nb, goal);
      nb.f = nb.g + nb.h;
      seen.add(nb);
      open.push({ cell: nb, key: nb.f, seq: seq++ });
    }
  }
}
'@
$null = Add-Code $s 40 122 600 ($code -replace "`r", '') 18
$null = Add-Bullets $s 662 136 262 @(
    '[[open:]] heap binário, extrai o menor f(n)',
    '[[nodesVisited:]] conta os nós expandidos',
    '[[h:]] distância de Manhattan'
) 20 16 $cBlue
Set-Notes $s 'Trecho real do repositório (src/pathfinding/PathfindingSystem.ts, método aStar), sem as linhas em branco. open é um heap binário com remoção preguiçosa (lazy deletion): entradas obsoletas são descartadas ao sair da fila. nodesVisited é incrementado quando o nó é extraído e expandido, de forma idêntica nos cinco algoritmos.'

# ── 24. CÓDIGO: JPS ──────────────────────────────────────────────────────────
$s = New-ContentSlide 'Código: JPS' 'Rotina de salto do JPS em 4 direções (jpsJump)' $secB
$code = @'
let cx = x + dx;
let cy = y + dy;
while (true) {
  if (!this.grid.isValid(cx, cy) ||
      !this.grid.cells[cy][cx].walkable) return null;
  const cell = this.grid.cells[cy][cx];
  if (cell === goal) return cell;
  if (this.jpsHasForced(cx, cy, dx, dy)) return cell;
  if (dx !== 0) {
    if (this.jpsProbe(cx, cy, 0,  1, goal)) return cell;
    if (this.jpsProbe(cx, cy, 0, -1, goal)) return cell;
  } else {
    if (this.jpsProbe(cx, cy,  1, 0, goal)) return cell;
    if (this.jpsProbe(cx, cy, -1, 0, goal)) return cell;
  }
  cx += dx;
  cy += dy;
}
'@
$null = Add-Code $s 40 122 600 ($code -replace "`r", '') 18
$null = Add-Bullets $s 662 136 262 @(
    '[[null:]] obstáculo ou borda, sem salto',
    '[[jpsHasForced:]] vizinho forçado',
    '[[jpsProbe:]] sondagem perpendicular, a cada célula'
) 20 16 $cMagenta
Set-Notes $s 'Trecho real do repositório (método jpsJump), com uma quebra de linha a mais na primeira condição para caber no slide. A rotina avança uma célula por vez na direção (dx, dy). Devolve a célula se ela for o objetivo, se tiver vizinho forçado ou se uma sondagem perpendicular (jpsProbe) encontrar o objetivo ou um vizinho forçado. As sondagens a cada célula são o custo extra da adaptação para 4 direções.'

# ── 25–26. TABELAS: DENSIDADE (20×20 e 40×40) ────────────────────────────────
function Add-DensityTable($slide, $dens) {
    $rows = New-Object System.Collections.ArrayList
    $null = $rows.Add(@( '', '', '', '', '', '', '' ))
    $null = $rows.Add(@( 'Algoritmo', 'Caminho', 'Nós exp.', 'Tempo (ms)', 'Caminho', 'Nós exp.', 'Tempo (ms)' ))
    foreach ($a in $D.algos) {
        $p = $dens.d02.($a.key); $q = $dens.d04.($a.key)
        $null = $rows.Add(@( @{ t = $a.label; b = $true }, $p.pathF, $p.nodesF, $p.timeF, $q.pathF, $q.nodesF, $q.timeF ))
    }
    $al = @('left', 'center', 'center', 'center', 'center', 'center', 'center')
    $mg = @( @{ r = 1; c1 = 2; c2 = 4; t = 'Densidade 0,2' }, @{ r = 1; c1 = 5; c2 = 7; t = 'Densidade 0,4' } )
    return (Add-Table $slide 40 130 @(196, 104, 116, 122, 104, 116, 122) $rows.ToArray() 20 43 2 38 $al $mg)
}
$s = New-ContentSlide 'Tabela: grade 20×20' 'Densidade de obstáculos em grade 20×20 (1 busca por algoritmo)' $secB
$null = Add-DensityTable $s $D.dens20
Set-Notes $s "Tabelas 1 e 2 do artigo. Caminho em células. Destaques: na densidade 0,4 o JPS expande $($D.dens20.d04.jps.nodesF) nós contra $($D.dens20.d04.astar.nodesF) do A*; o DFS-Greedy acha $($D.dens20.d02.dfs.pathF) células na densidade 0,2 (ótimo: $($D.dens20.d02.astar.pathF)) e o caminho ótimo na densidade 0,4, onde as rotas viáveis são poucas."

$s = New-ContentSlide 'Tabela: grade 40×40' "Em grade maior e densa, o JPS vence também em tempo: $($g2.jps.timeF) × $($g2.astar.timeF) ms" $secB
$null = Add-DensityTable $s $D.dens40
Set-Notes $s "Resultados de 40×40 (benchmark_results.csv). Na densidade 0,4 o JPS expande $($g2.jps.nodesF) nós contra $($g2.astar.nodesF) do A* e é cerca de $($dv.jpsSpeedup40F) vezes mais rápido ($($g2.jps.timeF) contra $($g2.astar.timeF) ms). Na densidade 0,2 o JPS expande menos nós ($($D.dens40.d02.jps.nodesF) contra $($D.dens40.d02.astar.nodesF)), mas é mais lento ($($D.dens40.d02.jps.timeF) contra $($D.dens40.d02.astar.timeF) ms): mesma leitura do slide 19."

# ── 27. TABELA: MÚLTIPLOS NPCs ───────────────────────────────────────────────
$s = New-ContentSlide 'Tabela: múltiplos NPCs' 'Tempo total das buscas; todos abaixo de 16 ms/quadro (60 fps)' $secB
$rows = New-Object System.Collections.ArrayList
$null = $rows.Add(@( '', '', '', '', '', '', '', '' ))
$null = $rows.Add(@( 'Algoritmo', 'Caminho', 'Nós exp.', 'Tempo', '5', '10', '20', '50' ))
foreach ($a in $D.algos) {
    $p = $e50.($a.key)
    $null = $rows.Add(@( @{ t = $a.label; b = $true }, $p.pathF, $p.nodesF, $p.timeF,
        $D.cong.n5.($a.key).timeF, $D.cong.n10.($a.key).timeF, $D.cong.n20.($a.key).timeF, $D.cong.n50.($a.key).timeF ))
}
$al = @('left', 'center', 'center', 'center', 'center', 'center', 'center', 'center')
$mg = @( @{ r = 1; c1 = 2; c2 = 4; t = '20×20  ·  50 NPCs (ms)' }, @{ r = 1; c1 = 5; c2 = 8; t = 'Corredor 30×30: NPCs (ms)' } )
$null = Add-Table $s 40 130 @(196, 104, 116, 100, 91, 91, 91, 91) $rows.ToArray() 20 43 2 38 $al $mg
Set-Notes $s "Tabelas 3 e 5 do artigo. À esquerda, 50 NPCs em grade 20×20 (densidade 0,2): caminho em células, nós expandidos somados e tempo total. À direita, o corredor 30×30 com 5, 10, 20 e 50 NPCs: o tempo dobra quando o número de NPCs dobra (crescimento linear). Maior valor da tabela: $($dv.worstCong50.label), $($dv.worstCong50.timeF) ms."

# ── 28. ESCALABILIDADE: OS 5 ALGORITMOS ──────────────────────────────────────
$s = New-ContentSlide 'Escalabilidade: os 5' 'Os cinco algoritmos crescem em linha reta com o número de NPCs' $secB
$null = Add-Image $s (Join-Path $charts 'slide_scale5.png') 40 122 790 370 "Gráfico de linhas, corredor 30×30, densidade 0,2, eixo de 0 a 2,5 ms. Com 50 NPCs: Dijkstra $($c50.dijkstra.timeF) ms, JPS $($c50.jps.timeF) ms, A* $($c50.astar.timeF) ms, BFS $($c50.bfs.timeF) ms, DFS-Greedy $($c50.dfs.timeF) ms."
Set-Notes $s "Mesmo cenário do slide 12, agora com os cinco algoritmos e o eixo ampliado (0 a 2,5 ms); a linha de 16 ms ficaria muito acima do gráfico. Cada série tem cor, traço e marcador próprios. A* e BFS praticamente coincidem ($($c50.astar.timeF) e $($c50.bfs.timeF) ms com 50 NPCs)."

# ── 29. TABELA: OBJETIVOS DINÂMICOS ──────────────────────────────────────────
$s = New-ContentSlide 'Objetivos dinâmicos' 'Etapa 2: destino isolado, busca exaustiva e nenhum caminho' $secB
$rows = New-Object System.Collections.ArrayList
$null = $rows.Add(@( 'Algoritmo', 'Etapa', 'Destino', 'Caminho', 'Nós exp.', 'Tempo (ms)' ))
foreach ($k in 'astar', 'dijkstra', 'jps') {
    $label = ($D.algos | Where-Object { $_.key -eq $k }).label
    foreach ($e in 1, 2, 3) {
        $p = $D.dyn.$k."e$e"
        $first = ''
        if ($e -eq 1) { $first = $label }
        if ($e -eq 2) {
            $null = $rows.Add(@( @{ t = $first; b = $true }, @{ t = "$e"; fill = $tRed }, @{ t = $D.dynGoals."e$e"; fill = $tRed }, @{ t = $p.pathF; fill = $tRed; c = $cErr; b = $true }, @{ t = $p.nodesF; fill = $tRed }, @{ t = $p.timeF; fill = $tRed } ))
        } else {
            $null = $rows.Add(@( @{ t = $first; b = $true }, "$e", $D.dynGoals."e$e", $p.pathF, $p.nodesF, $p.timeF ))
        }
    }
}
$al = @('left', 'center', 'center', 'center', 'center', 'center')
$null = Add-Table $s 40 126 @(170, 90, 125, 155, 115, 125) $rows.ToArray() 20 34 1 36 $al
Set-Notes $s "Tabela 6 do artigo: grade 40×40, densidade 0,25, três destinos em sequência. Na etapa 2 o destino (20,20) está isolado pelos obstáculos: os três algoritmos varrem todo o espaço alcançável ($($D.dyn.astar.e2.nodesF) nós no A*) e respondem, corretamente, que não há caminho. É a limitação 1 do slide 16: sem verificação prévia de conectividade, o destino inalcançável custa uma busca exaustiva. Nas etapas 1 e 3, os comprimentos são idênticos entre os algoritmos ($($D.dyn.astar.e1.pathF) e $($D.dyn.astar.e3.pathF) células)."

# ── 30. PROTOCOLO DE MEDIÇÃO ─────────────────────────────────────────────────
$s = New-ContentSlide 'Protocolo de medição' 'Como medir buscas mais rápidas que o relógio do navegador' $secB
$null = Add-Bullets $s 40 142 790 @(
    '[[Relógio:]] performance.now() no Chrome tem resolução de cerca de 0,1 ms',
    '[[Lote:]] a busca é repetida K vezes, até a janela passar de 25 ms',
    '[[Tempo por busca]] = janela ÷ K, após aquecimento do JIT',
    '[[10 janelas]] por cenário: média e desvio-padrão',
    "[[Desvio-padrão:]] abaixo de $($dv.stdSingleF) ms (1 busca) e de $($dv.stdMultiF) ms (vários NPCs)"
) $szBody 16
Set-Notes $s 'O Chrome limita a resolução de performance.now() a cerca de 100 microssegundos (mitigação contra Spectre). Uma busca isolada dura menos que isso. Solução: medição em lote, com K calibrado automaticamente até a janela passar de 25 ms; o tempo por busca é a janela dividida por K. Antes de medir, repetições de aquecimento são descartadas para o JIT do V8 estabilizar. O benchmark roda em página isolada (benchmark.html), sem o laço de renderização do jogo. A contagem de nós expandidos é feita dentro do PathfindingSystem, igual para todos os algoritmos.'

# ── 31. HEURÍSTICA DE MANHATTAN ──────────────────────────────────────────────
$s = New-ContentSlide 'Heurística de Manhattan' 'Por que a heurística de Manhattan é admissível?' $secB
$null = Add-Card $s 40 134 880 86 $tBlue
$null = Add-Text $s 40 152 880 'h(n) = |Δx| + |Δy|  ≤  custo real' 38 $cBlueDk $true 'center' 'Consolas'
$null = Add-Bullets $s 40 244 790 @(
    'Cada passo cardeal reduz a distância em [[no máximo 1]]: h(n) nunca superestima',
    '[[Consistente:]] h(n) ≤ 1 + h(n′) entre células vizinhas',
    "[[Na prática:]] A*, Dijkstra, BFS e JPS acharam caminhos de $($dv.optPathF) células"
) $szBody 16 $cBlue
Set-Notes $s "Objetivo específico 5. Em grade de 4 direções cada passo cobre uma unidade em uma direção cardeal; para ir de n ao objetivo são necessários pelo menos |Δx| + |Δy| passos. Logo h(n) nunca superestima o custo real: é admissível. Também é consistente, pela desigualdade triangular da norma L1: h(n) ≤ 1 + h(n′). Com isso o A* devolve o caminho de custo mínimo. Evidência experimental: A*, Dijkstra, BFS e JPS produziram caminhos de mesmo comprimento em todos os cenários ($($dv.optPathF) células em 20×20)."

# ── 32. POR QUE 16 ms/QUADRO? ────────────────────────────────────────────────
$s = New-ContentSlide '16 ms/quadro' 'De onde vem o orçamento de 16 ms/quadro (60 fps)?' $secB
$null = Add-Card $s 40 134 880 86 $tGreen
$null = Add-Text $s 40 152 880 "1000 ms ÷ 60 quadros ≈ $($dv.frameExactF) ms" 38 $cOK $true 'center' 'Consolas'
$null = Add-Bullets $s 40 244 790 @(
    "[[Adotado: $BUDGET]], arredondado para baixo (conservador)",
    'O quadro também paga renderização, lógica do jogo e áudio',
    "[[Pior caso medido:]] $($dv.worstCong50.timeF) ms com 50 NPCs, $($dv.worstCong50.pctF)% do quadro",
    'A estimativa inicial de 50 ms por busca era folgada demais'
) $szBody 16 $cOK
Set-Notes $s "A 60 quadros por segundo, cada quadro dura 1000 ÷ 60 ≈ $($dv.frameExactF) ms. O trabalho adota $BUDGET, arredondando para baixo (critério mais exigente). O orçamento é compartilhado: todas as buscas do quadro, mais renderização, lógica e entrada. No pior caso medido, 50 NPCs no corredor com $($dv.worstCong50.label), o pathfinding usa $($dv.worstCong50.timeF) ms, $($dv.worstCong50.pctF)% do quadro. A estimativa de 50 ms por busca do anteprojeto misturava escalas: uma busca isolada custa centésimos de milissegundo."

# ══════════════════════════════════════════════════════════════════════════════
#  Acabamento: indicador de seção e número do slide; remoção do template
# ══════════════════════════════════════════════════════════════════════════════
for ($i = 0; $i -lt $deck.Count; $i++) {
    $e = $deck[$i]
    if ($e.kind -ne 'content') { continue }
    if ($e.section -ne '') { $null = Add-Text $e.s 640 20 292 $e.section $szNote $cTextMid $true 'right' }
    $null = Add-Text $e.s 14 508 60 "$($i + 1)" $szNote $cTextMid
}

Write-Output "Slides antes da limpeza: $($pres.Slides.Count)"
for ($k = 1; $k -le 10; $k++) { $pres.Slides.Item(1).Delete() }
Write-Output "Slides finais:           $($pres.Slides.Count)  (registro: $($deck.Count))"
if ($pres.Slides.Count -ne $deck.Count) { throw 'Contagem de slides inesperada' }

if (Test-Path $outFinal) { Remove-Item $outFinal -Force }
$pres.SaveAs($outFinal, 24)        # 24 = .pptx
Write-Output "DONE: $outFinal"

} finally {
    try { $pres.Close() } catch {}
    if ($hadOpen -eq 0) { try { $ppt.Quit() } catch {} }
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
    Remove-Item $workCopy -ErrorAction SilentlyContinue
}
