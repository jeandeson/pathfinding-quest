# Ensaio cronometrado por sintese de voz.
# Le a fala de cada slide (as citacoes "> ..." da secao "3. Slide a slide" do
# ROTEIRO_DE_APRESENTACAO.md), sintetiza com a voz pt-BR do Windows em ritmo normal
# e mede a duracao real do audio. Compara com o tempo planejado na tabela do roteiro.
#
# Saidas:
#   apresentacao/ensaio/ensaio_cronometrado.csv   slide, planejado, medido, diferenca
#   apresentacao/ensaio/slide_NN.wav              audio de cada fala, so com -Audio (para treinar ouvindo)
#
# Uso: powershell -ExecutionPolicy Bypass -File ensaio_cronometrado.ps1 [-Rate 0] [-Audio]
#   -Rate: velocidade da voz, de -10 a 10 (0 = ritmo normal da voz)
param([int]$Rate = 0, [switch]$Audio)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$apres = Split-Path -Parent $PSScriptRoot
$md    = Join-Path $apres 'ROTEIRO_DE_APRESENTACAO.md'
$out   = Join-Path $apres 'ensaio'
if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }

$lines = Get-Content $md -Encoding UTF8

# tempos planejados: tabela "| n | Titulo | m:ss | m:ss |"
$plan = @{}; $title = @{}
foreach ($l in $lines) {
    if ($l -match '^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*(\d+):(\d\d)\s*\|') {
        $plan[[int]$Matches[1]] = [int]$Matches[3] * 60 + [int]$Matches[4]
        $title[[int]$Matches[1]] = $Matches[2].Trim()
    }
}

# falas: citacoes sob cada "### Slide N"
$speech = @{}; $cur = 0
foreach ($l in $lines) {
    if ($l -match '^### Slide (\d+)') { $cur = [int]$Matches[1]; $speech[$cur] = ''; continue }
    if ($l -match '^## ') { $cur = 0; continue }
    if (($cur -gt 0) -and ($l -match '^>\s?(.*)$')) {
        $t = $Matches[1]
        if ($t -match '^\*\*Plano B') { continue }                 # instrucao de contingencia, nao e fala
        $t = $t -replace '\*\*', '' -replace '\\\*', ' estrela' -replace '[`"]', '' -replace '\(pausa\)', '.' -replace '\(aponte[^)]*\)', ''
        $speech[$cur] += ' ' + $t
    }
}

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'pt-BR' } | Select-Object -First 1
if (-not $voice) { throw 'Nenhuma voz pt-BR instalada no Windows.' }
$synth.SelectVoice($voice.VoiceInfo.Name)
$synth.Rate = $Rate

$rows = @(); $totPlan = 0; $totMeas = 0; $totWords = 0
foreach ($n in ($plan.Keys | Sort-Object)) {
    $text = ([string]$speech[$n]).Trim()
    $words = if ($text -eq '') { 0 } else { ($text -split '\s+').Count }
    $secs = 0.0
    if ($words -gt 0) {
        $ms = New-Object System.IO.MemoryStream
        $synth.SetOutputToWaveStream($ms)
        $synth.Speak($text)
        $synth.SetOutputToNull()
        $bytes = $ms.ToArray()
        # cabecalho WAV: taxa de bytes por segundo no offset 28; dados a partir do offset 44
        $byteRate = [BitConverter]::ToInt32($bytes, 28)
        $secs = [math]::Round(($bytes.Length - 44) / $byteRate, 1)
        if ($Audio) { [IO.File]::WriteAllBytes((Join-Path $out ("slide_{0:D2}.wav" -f $n)), $bytes) }
        $ms.Dispose()
    }
    $rows += [pscustomobject]@{
        Slide = $n; Titulo = $title[$n]; Palavras = $words
        Planejado_s = $plan[$n]; Fala_medida_s = $secs
        Folga_s = [math]::Round($plan[$n] - $secs, 1)
    }
    $totPlan += $plan[$n]; $totMeas += $secs; $totWords += $words
}
$synth.Dispose()

$fmt = { param($s) '{0}:{1:D2}' -f [math]::Floor($s / 60), [int]([math]::Round($s) % 60) }
$rows | Export-Csv -Path (Join-Path $out 'ensaio_cronometrado.csv') -NoTypeInformation -Encoding UTF8
$rows | Format-Table Slide, Titulo, Palavras, Planejado_s, Fala_medida_s, Folga_s -AutoSize | Out-String -Width 160
"Voz: $($voice.VoiceInfo.Name) (ritmo $Rate)"
"Total planejado: $(& $fmt $totPlan)   |   fala medida: $(& $fmt $totMeas)   |   palavras: $totWords   |   ritmo: $([math]::Round($totWords / ($totMeas / 60))) palavras/min"
$over = @($rows | Where-Object { $_.Folga_s -lt 0 })
if ($over.Count) { "ATENCAO: a fala passa do tempo planejado nos slides: $(($over | ForEach-Object { $_.Slide }) -join ', ')" } else { 'Nenhuma fala passa do tempo planejado do slide.' }
