# Builds the TCC presentation by cloning slides from template_unijorge_v1.pptx
# via PowerPoint COM. This preserves the template's gradients, fonts and logo
# exactly. Each new slide is a duplicate of one of 4 template slides
# (cover / section / content / thanks), then its text and images are replaced.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$root      = "C:\Users\Jeandeson Nascimento\Desktop\TCC pathfinding"
$tmpl      = Join-Path $root 'template_unijorge_v1.pptx'
$workCopy  = Join-Path $root 'apresentacao\_template_work.pptx'
$outFinal  = Join-Path $root 'apresentacao\TCC_Apresentacao_Jeandeson.pptx'
$assets    = Join-Path $root 'apresentacao\assets'
$charts    = Join-Path $root 'apresentacao\charts'

Copy-Item $tmpl $workCopy -Force

# Color constants (decimal RGB for PowerPoint COM)
function RGB($r, $g, $b) { return [int]($r + ($g -shl 8) + ($b -shl 16)) }
$cMagenta = RGB 207 13 114
$cPurple  = RGB 65 57 103
$cTextDk  = RGB 30 20 60
$cTextMid = RGB 90 80 120
$cGold    = RGB 200 130 30
$cTech    = RGB 50 80 200
$cOK      = RGB 30 130 70
$cErr     = RGB 200 50 80
$cWarn    = RGB 200 100 40

$ppt = New-Object -ComObject PowerPoint.Application
$ppt.Visible = [Microsoft.Office.Core.MsoTriState]::msoTrue
$pres = $ppt.Presentations.Open($workCopy, $false, $false, $true)

# Take strong references to the four template slides before we clone & later delete.
$tplCover   = $pres.Slides.Item(1)
$tplSection = $pres.Slides.Item(2)
$tplContent = $pres.Slides.Item(3)
$tplThanks  = $pres.Slides.Item(10)

# ─── Helpers ────────────────────────────────────────────────────────────────

function Set-Text($shape, $text, [int]$size = 0, [int]$rgb = -1, [bool]$bold = $false) {
    $shape.TextFrame.TextRange.Text = $text
    if ($size -gt 0) { $shape.TextFrame.TextRange.Font.Size = $size }
    if ($rgb -ge 0) { $shape.TextFrame.TextRange.Font.Color.RGB = $rgb }
    if ($bold) { $shape.TextFrame.TextRange.Font.Bold = $true }
}

function Add-Text($slide, $x, $y, $w, $h, $text, [int]$size = 14, [int]$rgb = -1, [bool]$bold = $false, [string]$align = 'left', [string]$font = '') {
    $tb = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)  # 1 = msoTextOrientationHorizontal
    $tr = $tb.TextFrame.TextRange
    $tr.Text = $text
    $tr.Font.Size = $size
    if ($rgb -ge 0) { $tr.Font.Color.RGB = $rgb } else { $tr.Font.Color.RGB = $cTextDk }
    if ($bold) { $tr.Font.Bold = $true }
    if ($font -ne '') { $tr.Font.Name = $font }
    switch ($align) {
        'center' { $tr.ParagraphFormat.Alignment = 2 }
        'right'  { $tr.ParagraphFormat.Alignment = 3 }
        default  { $tr.ParagraphFormat.Alignment = 1 }
    }
    $tb.TextFrame.MarginLeft = 2; $tb.TextFrame.MarginRight = 2
    $tb.TextFrame.MarginTop  = 2; $tb.TextFrame.MarginBottom = 2
    $tb.TextFrame.WordWrap = -1
    return $tb
}

function Add-Rect($slide, $x, $y, $w, $h, [int]$fillRgb = -1, [int]$lineRgb = -1, [double]$lineWidth = 0.0, [bool]$rounded = $false) {
    $shapeType = if ($rounded) { 5 } else { 1 }  # 5 = msoShapeRoundedRectangle, 1 = msoShapeRectangle
    $sh = $slide.Shapes.AddShape($shapeType, $x, $y, $w, $h)
    if ($fillRgb -ge 0) { $sh.Fill.ForeColor.RGB = $fillRgb } else { $sh.Fill.Visible = 0 }
    if ($lineRgb -ge 0) {
        $sh.Line.ForeColor.RGB = $lineRgb
        $sh.Line.Weight = $lineWidth
    } else {
        $sh.Line.Visible = 0
    }
    return $sh
}

function Add-Image($slide, $path, $x, $y, $w, $h) {
    return $slide.Shapes.AddPicture($path, 0, -1, $x, $y, $w, $h)
}

# Adjust title pill width if title is too long for the default 287pt pill.
function Resize-TitlePill($slide, [double]$newWidth, [double]$newPillW = 0) {
    if ($newPillW -le 0) { $newPillW = $newWidth + 30 }
    $slide.Shapes.Item(3).Width = $newPillW
    $slide.Shapes.Item(4).Width = $newWidth
}

# Duplicate(...) inserts the new slide right after the source, which
# would interleave new slides with the originals and break our final
# deletion step. So we always move the duplicate to the end immediately.
function Dup-Move($srcSlide) {
    $new = $srcSlide.Duplicate().Item(1)
    $new.MoveTo($pres.Slides.Count)
    return $new
}

# Builds a content slide by duplicating template content slide and clearing
# the default body shape (index 6). Returns the new slide.
function New-ContentSlide($kicker, $title, [double]$titleW = 0) {
    $s = Dup-Move $tplContent
    Set-Text $s.Shapes.Item(1) $kicker
    Set-Text $s.Shapes.Item(4) $title
    if ($titleW -gt 0) { Resize-TitlePill $s $titleW }
    # Delete the sample body rectangle (shape 6) since we'll add our own
    if ($s.Shapes.Count -ge 6) { $s.Shapes.Item(6).Delete() }
    return $s
}

function New-SectionSlide($title) {
    $s = Dup-Move $tplSection
    Set-Text $s.Shapes.Item(1) $title
    return $s
}

# ─── Build slides (appended at end, indexes 11+) ────────────────────────────

# 1. COVER — title is much longer than template's; resize box & shrink font
$s = Dup-Move $tplCover
$titleShape = $s.Shapes.Item(1)
$titleShape.Top = 40
$titleShape.Height = 175
Set-Text $titleShape "Análise Comparativa de Algoritmos de Pathfinding para NPCs em Jogos 2D em Ambiente Web" 26
$subShape = $s.Shapes.Item(2)
$subShape.Top = 225
Set-Text $subShape "A*  ·  DIJKSTRA  ·  BFS  ·  DFS  ·  JUMP POINT SEARCH" 12
Set-Text $s.Shapes.Item(4) "Autor: Jeandeson Souza Nascimento`r`nE-mail: jeandeson.nascimento@bol.com.br`r`n`r`nOrientador: Prof. Gilson Amorim Carvalho`r`n`r`nUNIJORGE  ·  Ciência da Computação  ·  2026"

# 2. AGENDA (content slide)
$s = New-ContentSlide "Roteiro" "Agenda" 260
$items = @(
    @{ n='01'; t='Introdução';          d='Contexto, problema, justificativa e objetivos' },
    @{ n='02'; t='Referencial Teórico'; d='Os 5 algoritmos analisados e suas variantes' },
    @{ n='03'; t='Metodologia';         d='Stack, simulador desenvolvido e protocolo' },
    @{ n='04'; t='Resultados';          d='Benchmarks de obstáculos, NPCs e congestionamento' },
    @{ n='05'; t='Conclusão';           d='Trade-offs e trabalhos futuros' }
)
$yStart = 130
foreach ($it in $items) {
    Add-Rect $s 25 $yStart 50 50 $cMagenta | Out-Null
    Add-Text $s 25 ($yStart + 6) 50 38 $it.n 22 -1 $true 'center' | Out-Null  # number, white
    $s.Shapes.Item($s.Shapes.Count).TextFrame.TextRange.Font.Color.RGB = (RGB 255 255 255)
    Add-Text $s 90 ($yStart + 4) 600 28 $it.t 18 $cPurple $true 'left' | Out-Null
    Add-Text $s 90 ($yStart + 28) 700 22 $it.d 12 $cTextMid $false 'left' | Out-Null
    $yStart += 60
}

# 3. SECTION 01 — Introdução
New-SectionSlide "01 — Introdução" | Out-Null

# 4. CONTEXTO E PROBLEMA
$s = New-ContentSlide "Contexto" "Problema" 220
$bullets = @(
    "Jogos digitais combinam regras formais e mundos fictícios (Juul, 2005)",
    "Em jogos de exploração, movimento inteligente é essencial para UX (Moon et al., 2022)",
    "Devs indie têm acesso facilitado a IA via Unity e Phaser.js",
    "Porém, falta referência de desempenho de pathfinding no navegador (V8)"
)
$yb = 130
foreach ($b in $bullets) {
    Add-Rect $s 30 ($yb + 8) 6 6 $cMagenta | Out-Null
    Add-Text $s 48 $yb 620 28 $b 13 $cTextDk $false 'left' | Out-Null
    $yb += 32
}
# Pergunta de pesquisa box (right)
Add-Rect $s 690 130 260 130 -1 $cMagenta 1.5 $true | Out-Null
Add-Text $s 705 138 240 20 "PERGUNTA DE PESQUISA" 9 $cMagenta $true 'left' | Out-Null
Add-Text $s 705 158 240 95 "Qual algoritmo de pathfinding escolher para ambientes web 2D, e qual o custo real de execução no navegador?" 13 $cTextDk $false 'left' | Out-Null
# Stats row at bottom
$stats = @(
    @{ v='5';  l='algoritmos analisados';     c=$cMagenta },
    @{ v='4';  l='cenários de benchmark';     c=$cTech },
    @{ v='V8'; l='JavaScript Engine';          c=$cPurple },
    @{ v='16 ms'; l='orçamento por quadro · 60 fps';  c=$cOK }
)
$xs = 30
foreach ($st in $stats) {
    Add-Rect $s $xs 290 215 130 -1 $st.c 1 $true | Out-Null
    Add-Text $s $xs 305 215 60 $st.v 36 $st.c $true 'center' | Out-Null
    Add-Text $s $xs 380 215 30 $st.l 11 $cTextMid $false 'center' | Out-Null
    $xs += 230
}

# 5. JUSTIFICATIVA
$s = New-ContentSlide "Justificativa" "Justificativa" 220
$bullets = @(
    "Literatura clássica reporta experimentos em C++ ou compilação nativa",
    "JavaScript introduz variabilidade não documentada para pathfinding",
    "JIT progressivo, pausas de garbage collection, mitigações Spectre (timer)"
)
$yb = 130
foreach ($b in $bullets) {
    Add-Rect $s 30 ($yb + 8) 6 6 $cMagenta | Out-Null
    Add-Text $s 48 $yb 580 28 $b 13 $cTextDk $false 'left' | Out-Null
    $yb += 32
}
Add-Rect $s 30 235 600 50 -1 $cMagenta 1.5 $true | Out-Null
Add-Text $s 45 245 580 18 "LACUNA IDENTIFICADA" 10 $cMagenta $true 'left' | Out-Null
Add-Text $s 45 263 580 22 "A comparação A* vs JPS em ambiente JavaScript/Web é pouco documentada" 13 $cTextDk $true 'left' | Out-Null

Add-Rect $s 30 300 600 50 -1 $cOK 1.5 $true | Out-Null
Add-Text $s 45 310 580 18 "ENTREGA ADICIONAL" 10 $cOK $true 'left' | Out-Null
Add-Text $s 45 328 580 22 "Artefato funcional hospedado online — banca executa sem instalar nada" 13 $cTextDk $true 'left' | Out-Null

# URL card on the right
Add-Rect $s 660 130 290 290 -1 $cTech 1.5 $true | Out-Null
Add-Text $s 670 145 270 22 "SIMULADOR ONLINE" 10 $cTech $true 'center' | Out-Null
Add-Text $s 670 170 270 60 "pathfinding-quest-j95b.vercel.app" 13 $cTextDk $true 'center' 'Consolas' | Out-Null
Add-Rect $s 700 235 210 1 $cTech | Out-Null
Add-Text $s 670 245 270 22 "REPOSITÓRIO" 10 $cTech $true 'center' | Out-Null
Add-Text $s 670 268 270 50 "github.com/jeandeson/pathfinding-quest" 11 $cTextDk $false 'center' 'Consolas' | Out-Null
Add-Text $s 670 330 270 60 "Demonstração ao vivo`r`ndurante a defesa" 12 $cMagenta $true 'center' | Out-Null

# 6. OBJETIVOS
$s = New-ContentSlide "Objetivos" "Objetivos"
# OBJETIVO GERAL block
Add-Rect $s 30 130 920 80 -1 $cMagenta 1.5 $true | Out-Null
Add-Text $s 40 138 900 18 "OBJETIVO GERAL" 10 $cMagenta $true 'left' | Out-Null
Add-Text $s 40 158 900 50 "Analisar comparativamente o desempenho de A*, Dijkstra, BFS, DFS e JPS em ambiente 2D com obstáculos, por meio de um simulador interativo em JavaScript/TypeScript, avaliando métricas de eficiência computacional em ambiente web." 12 $cTextDk $false 'left' | Out-Null

# 5 specific objectives cards
$objs = @(
    @{ n='1'; t='Estudar';        d="Princípios dos 5`r`nalgoritmos em grades 2D" },
    @{ n='2'; t='Implementar';    d="Do zero, sem`r`nbibliotecas externas" },
    @{ n='3'; t='Disponibilizar'; d="Simulador interativo`r`nacessível por URL pública" },
    @{ n='4'; t='Avaliar';        d="Métricas: tempo · nós ·`r`ncaminho · sucesso" },
    @{ n='5'; t='Validar';        d="Admissibilidade da`r`nheurística de Manhattan" }
)
$xc = 30
foreach ($o in $objs) {
    Add-Rect $s $xc 220 178 200 -1 $cPurple 1 $true | Out-Null
    Add-Rect $s ($xc + 65) 232 48 48 $cMagenta | Out-Null
    Add-Text $s ($xc + 65) 238 48 38 $o.n 22 -1 $true 'center' | Out-Null
    $s.Shapes.Item($s.Shapes.Count).TextFrame.TextRange.Font.Color.RGB = (RGB 255 255 255)
    Add-Text $s $xc 290 178 28 $o.t 14 $cPurple $true 'center' | Out-Null
    Add-Text $s ($xc + 5) 322 168 90 $o.d 11 $cTextDk $false 'center' | Out-Null
    $xc += 188
}

# 7. SECTION 02 — Referencial Teórico
New-SectionSlide "02 — Referencial Teórico" | Out-Null

# 8. OS 5 ALGORITMOS
$s = New-ContentSlide "Os 5 algoritmos" "Algoritmos" 220
$headers = @('Algoritmo', 'Ótimo?', 'Heurística', 'Memória', 'Característica principal')
$rows = @(
    @{ a='Dijkstra'; ot='Sim'; h='Não'; m='Alta'; d='Base de toda busca informada · explora uniformemente'; c=$cWarn },
    @{ a='BFS';      ot='Sim (passos)'; h='Não'; m='Alta'; d='Fila FIFO · ótimo em grades não ponderadas'; c=$cOK },
    @{ a='DFS (Greedy)'; ot='Não'; h='Ordenação Manhattan'; m='Baixa'; d='Pilha LIFO · rápido mas caminhos subótimos'; c=$cErr },
    @{ a='A*'; ot='Sim'; h='Manhattan'; m='Média'; d='f(n) = g(n) + h(n) · marco da busca heurística'; c=$cTech },
    @{ a='JPS'; ot='Sim'; h='Manhattan + poda'; m='Baixa'; d='Pula simetrias em corredores · ótima em grades densas'; c=$cMagenta }
)
$colX = @(30, 165, 250, 410, 510)
$colW = @(135, 85, 160, 100, 440)
# Header row
Add-Rect $s 30 130 920 32 $cPurple | Out-Null
for ($i = 0; $i -lt $headers.Count; $i++) {
    Add-Text $s $colX[$i] 137 $colW[$i] 22 $headers[$i] 11 -1 $true 'left' | Out-Null
    $s.Shapes.Item($s.Shapes.Count).TextFrame.TextRange.Font.Color.RGB = (RGB 255 255 255)
}
# Data rows
$yr = 162
foreach ($r in $rows) {
    Add-Text $s $colX[0] ($yr + 6) $colW[0] 22 $r.a 12 $r.c $true 'left' | Out-Null
    Add-Text $s $colX[1] ($yr + 6) $colW[1] 22 $r.ot 11 $cTextDk $false 'left' | Out-Null
    Add-Text $s $colX[2] ($yr + 6) $colW[2] 22 $r.h 11 $cTextDk $false 'left' | Out-Null
    Add-Text $s $colX[3] ($yr + 6) $colW[3] 22 $r.m 11 $cTextDk $false 'left' | Out-Null
    Add-Text $s $colX[4] ($yr + 6) $colW[4] 22 $r.d 11 $cTextDk $false 'left' | Out-Null
    Add-Rect $s 30 ($yr + 32) 920 1 (RGB 220 215 235) | Out-Null
    $yr += 34
}
Add-Text $s 30 ($yr + 14) 920 22 "A escolha do algoritmo impacta diretamente o desempenho em cenários específicos (Salem et al., 2024)" 11 $cTextMid $false 'center' | Out-Null
$s.Shapes.Item($s.Shapes.Count).TextFrame.TextRange.Font.Italic = $true

# 9. A* e JPS em foco
$s = New-ContentSlide "A* e JPS · em foco" "Em foco" 200
# A* column
Add-Rect $s 30 130 445 290 -1 $cTech 1.5 $true | Out-Null
Add-Text $s 45 142 415 25 "A* (A-Star) — Hart et al., 1968" 14 $cTech $true 'left' | Out-Null
Add-Text $s 45 170 415 50 "Conciliação entre Dijkstra e busca heurística informada. Marco essencial da área." 11 $cTextDk $false 'left' | Out-Null
Add-Rect $s 60 225 385 50 (RGB 235 240 255) | Out-Null
Add-Text $s 60 232 385 25 "f(n) = g(n) + h(n)" 18 $cTech $true 'center' 'Consolas' | Out-Null
Add-Text $s 60 260 385 18 "g(n) custo real · h(n) estimativa" 10 $cTextMid $false 'center' | Out-Null
$bulletsA = @(
    "Equilíbrio entre velocidade e precisão",
    "Heurística admissível ⇒ caminho ótimo",
    "Distância de Manhattan para grades 4-direcionais"
)
$yb = 290
foreach ($b in $bulletsA) {
    Add-Rect $s 55 ($yb + 6) 5 5 $cTech | Out-Null
    Add-Text $s 70 $yb 400 22 $b 11 $cTextDk $false 'left' | Out-Null
    $yb += 25
}
# JPS column
Add-Rect $s 490 130 460 290 -1 $cMagenta 1.5 $true | Out-Null
Add-Text $s 505 142 430 25 "JPS — Harabor & Grastien, 2011" 14 $cMagenta $true 'left' | Out-Null
Add-Text $s 505 170 430 50 "Otimização do A*: poda de simetrias e jump points eliminam vizinhos redundantes." 11 $cTextDk $false 'left' | Out-Null
Add-Rect $s 520 225 400 50 (RGB 252 230 240) | Out-Null
Add-Text $s 520 232 400 25 "−99% nós em densidade 0,4" 16 $cMagenta $true 'center' | Out-Null
Add-Text $s 520 260 400 18 "3 nós (JPS) vs 399 nós (A*)" 10 $cTextMid $false 'center' | Out-Null
$bulletsJ = @(
    "Mantém completude e otimalidade de A*",
    "Salta em linhas retas até jump points",
    "Adaptado para movimento 4-direcional neste trabalho"
)
$yb = 290
foreach ($b in $bulletsJ) {
    Add-Rect $s 515 ($yb + 6) 5 5 $cMagenta | Out-Null
    Add-Text $s 530 $yb 400 22 $b 11 $cTextDk $false 'left' | Out-Null
    $yb += 25
}

# 10. SECTION 03 — Metodologia
New-SectionSlide "03 — Metodologia" | Out-Null

# 11. STACK E AMBIENTE
$s = New-ContentSlide "Stack e ambiente" "Stack" 180
Add-Text $s 30 130 440 22 "STACK TÉCNICA" 11 $cMagenta $true 'left' | Out-Null
$stack = @(
    @{ k='Linguagem';    v='TypeScript 5' },
    @{ k='Bundler';      v='Vite 7' },
    @{ k='Renderização'; v='Canvas 2D nativa (HTML5)' },
    @{ k='Dependências'; v='Zero bibliotecas de pathfinding' },
    @{ k='Deploy';       v='Vercel (Edge Network)' }
)
$yb = 158
foreach ($it in $stack) {
    Add-Text $s 30 $yb 130 22 $it.k 11 $cTextMid $false 'left' | Out-Null
    Add-Text $s 170 $yb 280 22 $it.v 12 $cTech $true 'left' 'Consolas' | Out-Null
    $yb += 28
}
# Hardware column
Add-Text $s 490 130 440 22 "AMBIENTE DE BENCHMARK" 11 $cMagenta $true 'left' | Out-Null
$hw = @(
    @{ k='CPU';     v='Intel Core i5-10300H' },
    @{ k='RAM';     v='16 GB' },
    @{ k='Storage'; v='SSD NVMe' },
    @{ k='OS';      v='Windows 11 Pro' },
    @{ k='Browser'; v='Chrome · V8 (headless)' }
)
$yb = 158
foreach ($it in $hw) {
    Add-Text $s 490 $yb 130 22 $it.k 11 $cTextMid $false 'left' | Out-Null
    Add-Text $s 630 $yb 300 22 $it.v 12 $cTextDk $true 'left' | Out-Null
    $yb += 28
}
# Protocol box
Add-Rect $s 30 320 920 90 -1 $cPurple 1 $true | Out-Null
Add-Text $s 45 330 900 20 "PROTOCOLO DE REPRODUTIBILIDADE" 10 $cMagenta $true 'left' | Out-Null
Add-Text $s 45 352 900 50 "performance.now() · medição em lote (supera o piso de resolução do relógio do Chrome) · 10 janelas · Chrome headless · PRNG mulberry32 (sementes fixas)" 12 $cTextDk $false 'left' | Out-Null

# 12. SIMULADOR
$s = New-ContentSlide "Simulador" "Simulador" 240
Add-Image $s (Join-Path $assets 'crop_04_jogo_debug_pathfinding.png') 30 130 560 290 | Out-Null
# Right info card
Add-Rect $s 615 130 335 290 -1 $cTech 1.5 $true | Out-Null
Add-Text $s 625 142 315 20 "DEMONSTRAÇÃO AO VIVO" 10 $cGold $true 'center' | Out-Null
Add-Text $s 625 165 315 70 "pathfinding-quest-j95b.vercel.app" 14 $cTech $true 'center' 'Consolas' | Out-Null
Add-Rect $s 645 235 275 1 $cTech | Out-Null
$controls = @(
    "Selecionar algoritmo dos NPCs",
    "Clicar no mapa para mover",
    "Tecla D para debug visual",
    "Modo Benchmark com gráficos"
)
$yb = 250
foreach ($c in $controls) {
    Add-Rect $s 640 ($yb + 8) 5 5 $cMagenta | Out-Null
    Add-Text $s 655 $yb 280 25 $c 11 $cTextDk $false 'left' | Out-Null
    $yb += 25
}

# 13. CENÁRIOS DE TESTE
$s = New-ContentSlide "Cenários de teste" "Cenários" 200
$cards = @(
    @{ t='Densidade de Obstáculos'; d="Grade 20×20`r`nDensidades 0,2 e 0,4`r`nTabelas 1 e 2"; c=$cTech },
    @{ t='Múltiplos NPCs';          d="Grade 20×20, densidade 0,2`r`n50 NPCs simultâneos`r`nTabela 3"; c=$cOK },
    @{ t='Congestionamento';        d="Grade 30×30 · corredor central`r`n5, 10, 20 e 50 NPCs`r`nTabela 4"; c=$cWarn },
    @{ t='Objetivos Dinâmicos';     d="Grade 40×40, densidade 0,25`r`n3 etapas sequenciais`r`nTabela 6"; c=$cMagenta }
)
$i = 0
foreach ($card in $cards) {
    $x = 30 + ($i % 2) * 460
    $y = 130 + [math]::Floor($i / 2) * 145
    Add-Rect $s $x $y 450 130 -1 $card.c 1.2 $true | Out-Null
    Add-Rect $s $x $y 6 130 $card.c | Out-Null
    Add-Text $s ($x + 20) ($y + 10) 420 28 $card.t 15 $cTextDk $true 'left' | Out-Null
    Add-Text $s ($x + 20) ($y + 42) 420 80 $card.d 11 $cTextMid $false 'left' | Out-Null
    $i++
}

# 14. SECTION 04 — Resultados
New-SectionSlide "04 — Resultados" | Out-Null

# 15. OBSTÁCULOS (chart A)
$s = New-ContentSlide "Obstáculos" "Resultados" 280
Add-Image $s (Join-Path $charts 'chart_A.png') 25 125 570 320 | Out-Null
Add-Rect $s 615 125 335 305 -1 $cMagenta 1.5 $true | Out-Null
Add-Text $s 625 138 315 20 "DESTAQUES" 10 $cMagenta $true 'left' | Out-Null
Add-Text $s 625 162 315 20 "20×20 · densidade 0,4" 10 $cTextMid $false 'left' | Out-Null
Add-Text $s 625 184 315 22 "A*: 399 nós" 14 $cTextDk $false 'left' | Out-Null
Add-Text $s 625 208 315 22 "JPS: 3 nós" 16 $cMagenta $true 'left' | Out-Null
Add-Text $s 625 232 315 38 "−99,2%" 30 $cGold $true 'left' | Out-Null
Add-Rect $s 625 275 305 1 (RGB 220 215 235) | Out-Null
Add-Text $s 625 282 315 20 "Tempo médio · todos algoritmos" 10 $cTextMid $false 'left' | Out-Null
Add-Text $s 625 302 315 25 "< 1 ms por busca" 16 $cOK $true 'left' | Out-Null
Add-Text $s 625 326 315 18 "ordens de grandeza sob 16 ms/quadro" 10 $cTextMid $false 'left' | Out-Null
Add-Rect $s 625 350 305 1 (RGB 220 215 235) | Out-Null
Add-Text $s 625 357 315 20 "DFS (Greedy)" 10 $cTextMid $false 'left' | Out-Null
Add-Text $s 625 378 315 22 "Caminho 15% mais longo" 12 $cErr $true 'left' | Out-Null
Add-Text $s 625 400 315 18 "45 vs 39 células" 10 $cTextMid $false 'left' | Out-Null

# 16. MÚLTIPLOS NPCs (chart B) — both chart & panel use Tabela 4 (30×30 corredor)
$s = New-ContentSlide "Escalabilidade" "Resultados" 240
Add-Image $s (Join-Path $charts 'chart_B.png') 25 125 570 320 | Out-Null
Add-Rect $s 615 125 335 305 -1 $cOK 1.5 $true | Out-Null
Add-Text $s 625 138 315 20 "ESCALABILIDADE LINEAR" 10 $cOK $true 'left' | Out-Null
Add-Text $s 625 162 315 20 "Grade 30×30 · corredor central · dens. 0,2" 10 $cTextMid $false 'left' | Out-Null
$ranks = @(
    @{ a='DFS';      v='0,71 ms'; c=$cErr },
    @{ a='BFS';      v='1,25 ms'; c=$cOK },
    @{ a='A*';       v='1,28 ms'; c=$cTech },
    @{ a='JPS';      v='1,71 ms'; c=$cMagenta },
    @{ a='Dijkstra'; v='2,05 ms'; c=$cWarn }
)
$yb = 192
foreach ($r in $ranks) {
    Add-Text $s 625 $yb 130 26 $r.a 13 $r.c $true 'left' | Out-Null
    Add-Text $s 760 $yb 175 26 $r.v 13 $cTextDk $true 'right' 'Consolas' | Out-Null
    $yb += 30
}
Add-Rect $s 625 350 305 1 (RGB 220 215 235) | Out-Null
Add-Text $s 625 360 315 22 "Tempo cresce linearmente com N" 11 $cGold $true 'center' | Out-Null
Add-Text $s 625 385 315 30 "Todos ficam bem abaixo de 16 ms (60 fps)" 11 $cOK $true 'center' | Out-Null

# 17. CONGESTIONAMENTO (chart C)
$s = New-ContentSlide "Congestionamento" "Resultados" 280
Add-Image $s (Join-Path $charts 'chart_C.png') 25 125 570 320 | Out-Null
Add-Rect $s 615 125 335 305 -1 $cWarn 1.5 $true | Out-Null
Add-Text $s 625 138 315 20 "GARGALO 30×30" 10 $cWarn $true 'left' | Out-Null
Add-Text $s 625 162 315 20 "Tempo médio com 50 NPCs" 10 $cTextMid $false 'left' | Out-Null
Add-Text $s 625 186 315 24 "DFS:  0,71 ms  (menor)" 14 $cMagenta $true 'left' 'Consolas' | Out-Null
Add-Text $s 625 213 315 24 "A*:   1,28 ms" 14 $cTech $true 'left' 'Consolas' | Out-Null
Add-Text $s 625 240 315 24 "Dijkstra: 2,05 ms  (maior)" 13 $cWarn $false 'left' 'Consolas' | Out-Null
Add-Rect $s 625 275 305 1 (RGB 220 215 235) | Out-Null
Add-Text $s 625 285 315 20 "Conclusão prática" 11 $cGold $true 'left' | Out-Null
Add-Text $s 625 310 315 110 "Mesmo com 50 NPCs no corredor, todos ficam bem abaixo de 16 ms. A diferença está no número de nós expandidos, não na viabilidade." 12 $cTextDk $false 'left' | Out-Null
$s.Shapes.Item($s.Shapes.Count).TextFrame.TextRange.Font.Italic = $true

# 18. COMPARATIVO GERAL (chart D)
$s = New-ContentSlide "Comparativo" "Resultados" 220
Add-Image $s (Join-Path $charts 'chart_D.png') 25 125 570 320 | Out-Null
Add-Rect $s 615 125 335 305 -1 $cMagenta 1.5 $true | Out-Null
Add-Text $s 625 138 315 20 "TRADE-OFFS" 10 $cMagenta $true 'left' | Out-Null
$tradeoffs = @(
    @{ t='JPS — vence em nós expandidos';     d='Redução de >99% em densidade alta; vantagem de tempo só em grades densas'; c=$cMagenta },
    @{ t='A* — melhor equilíbrio geral';         d='Robusto · referência da literatura';                 c=$cTech },
    @{ t='DFS Greedy — só velocidade ≫ qualidade'; d='Caminhos subótimos · 15% mais longos';            c=$cErr }
)
$yb = 165
foreach ($t in $tradeoffs) {
    Add-Rect $s 625 ($yb + 8) 5 5 $t.c | Out-Null
    Add-Text $s 638 $yb 295 22 $t.t 12 $t.c $true 'left' | Out-Null
    Add-Text $s 638 ($yb + 22) 295 38 $t.d 10 $cTextMid $false 'left' | Out-Null
    $yb += 75
}

# 19. SECTION 05 — Conclusão
New-SectionSlide "05 — Conclusão" | Out-Null

# 20. CONCLUSÕES PRINCIPAIS
$s = New-ContentSlide "Pontos-chave" "Conclusão" 240
$concl = @(
    @{ ic='✓'; t='Orçamento de 16 ms/quadro (60 fps) atendido';     d='Busca isolada em centésimos de ms — a estimativa inicial de 50 ms era folgada. Com 50 NPCs (20×20), todos os algoritmos ficam < 2 ms, folgadamente dentro do quadro'; c=$cOK },
    @{ ic='✓'; t='JPS confirma vantagem em nós expandidos'; d='Redução de >99% nos nós em grades densas · em tempo, sua vantagem aparece em grades densas e iguala-se ao A* nas esparsas';                  c=$cMagenta },
    @{ ic='✓'; t='A* segue como referência geral';     d='Melhor equilíbrio entre garantia de ótimo, uso de memória e desempenho · admissibilidade da heurística de Manhattan validada';  c=$cTech },
    @{ ic='✗'; t='DFS puro inviável em tempo real';    d='Mesmo Greedy DFS produz caminhos 15% mais longos · usabilidade comprometida em jogos onde o caminho importa';                    c=$cErr }
)
$yb = 125
foreach ($c in $concl) {
    Add-Rect $s 30 $yb 920 65 -1 $c.c 1 $true | Out-Null
    Add-Rect $s 30 $yb 6 65 $c.c | Out-Null
    Add-Text $s 50 ($yb + 12) 40 40 $c.ic 22 $c.c $true 'center' | Out-Null
    Add-Text $s 95 ($yb + 8) 850 24 $c.t 13 $cTextDk $true 'left' | Out-Null
    Add-Text $s 95 ($yb + 30) 850 35 $c.d 11 $cTextMid $false 'left' | Out-Null
    $yb += 73
}

# 21. LIMITAÇÕES E TRABALHOS FUTUROS
$s = New-ContentSlide "Limitações" "Conclusão" 250
# Limits
Add-Text $s 30 130 440 22 "LIMITAÇÕES IDENTIFICADAS" 11 $cErr $true 'left' | Out-Null
$limits = @(
    @{ t='Sem detecção de conectividade prévia'; d='Buscas exaustivas quando o destino é inalcançável' },
    @{ t='Custo escala com o número de agentes';        d='Linear; pode pesar em grades grandes ou replanejamento a cada quadro' },
    @{ t='Hardware único';                         d='Resultados não generalizáveis a outros ambientes' }
)
$yb = 160
foreach ($l in $limits) {
    Add-Rect $s 30 ($yb + 6) 5 5 $cErr | Out-Null
    Add-Text $s 45 $yb 430 22 $l.t 12 $cTextDk $true 'left' | Out-Null
    Add-Text $s 45 ($yb + 22) 430 30 $l.d 10 $cTextMid $false 'left' | Out-Null
    $yb += 60
}
# Futures
Add-Text $s 490 130 440 22 "DIREÇÕES FUTURAS" 11 $cGold $true 'left' | Out-Null
$futures = @(
    @{ t='D* Lite';               d='Replanejamento incremental proporcional às células afetadas · Koenig & Likhachev, 2002'; c=$cMagenta },
    @{ t='HPA*';                  d='Hierarchical Pathfinding para mapas grandes com pré-cálculo entre regiões'; c=$cTech },
    @{ t='Amortização temporal';  d='Replanejar N NPCs por frame em vez de todos · distribuir o custo'; c=$cOK }
)
$yb = 160
foreach ($f in $futures) {
    Add-Rect $s 490 $yb 6 50 $f.c | Out-Null
    Add-Text $s 506 $yb 430 22 $f.t 13 $f.c $true 'left' | Out-Null
    Add-Text $s 506 ($yb + 22) 430 30 $f.d 10 $cTextMid $false 'left' | Out-Null
    $yb += 60
}

# 22. OBRIGADO (thanks slide — duplicate template 10)
$s = Dup-Move $tplThanks
# Template 10 has groups for "Obrigado" / "Thank you | Gracias" / social icons.
# We'll leave the visual groups but add author/contact info on top.
Add-Text $s 70 270 800 30 "Jeandeson Souza Nascimento" 16 -1 $true 'center' | Out-Null
$s.Shapes.Item($s.Shapes.Count).TextFrame.TextRange.Font.Color.RGB = (RGB 255 255 255)
Add-Text $s 70 300 800 20 "jeandeson.nascimento@bol.com.br" 12 -1 $false 'center' | Out-Null
$s.Shapes.Item($s.Shapes.Count).TextFrame.TextRange.Font.Color.RGB = (RGB 240 220 250)
Add-Text $s 70 425 800 18 "pathfinding-quest-j95b.vercel.app  ·  github.com/jeandeson/pathfinding-quest" 10 -1 $false 'center' 'Consolas' | Out-Null
$s.Shapes.Item($s.Shapes.Count).TextFrame.TextRange.Font.Color.RGB = (RGB 240 220 250)

# ─── Now delete the original 10 template slides (they live at indices 1..10).
# Because we appended, our new slides are at 11..32. After deletion they shift
# down to 1..22.
Write-Output "Total slides before cleanup: $($pres.Slides.Count)"
for ($k = 1; $k -le 10; $k++) {
    $pres.Slides.Item(1).Delete()
}
Write-Output "Total slides after cleanup:  $($pres.Slides.Count)"

# Save as final filename
if (Test-Path $outFinal) { Remove-Item $outFinal -Force }
$pres.SaveAs($outFinal, 24)   # 24 = ppSaveAsOpenXMLPresentation (.pptx)
$pres.Close()
$ppt.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
Remove-Item $workCopy -ErrorAction SilentlyContinue
Write-Output "DONE: $outFinal"
