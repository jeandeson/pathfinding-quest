// make_qr.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Gera os QR codes do slide final (simulador + repositório) e CONFERE cada um:
// o PNG gerado é decodificado de volta por dois leitores independentes (jsQR e
// ZXing) e precisa devolver a URL exata. A máscara de cada código é escolhida
// pelo teste de leitura (ver pickMask). Se algo divergir, o script falha:
// nenhum QR quebrado vai ao slide.
//
// Uso: node make_qr.mjs            → apresentacao/assets/qr_*.png
//      node make_qr.mjs --check F  → decodifica todos os QR codes de um PNG
//                                    (ex.: slide exportado) e imprime o conteúdo
// ─────────────────────────────────────────────────────────────────────────────

import QRCode                      from 'qrcode';
import jsQR                        from 'jsqr';
import { PNG }                     from 'pngjs';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname }        from 'node:path';
import { fileURLToPath }           from 'node:url';

import { TARGETS }                 from './make_qr_targets.mjs';
import { grayOf, pad, shrink, runCases, readJsQR, readZXing, CASES } from './qr_lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS    = resolve(__dirname, '..', 'assets');

/** Decodifica um QR em uma região (ou na imagem inteira) de um PNG. */
export function decodePng(path, region) {
  const png = PNG.sync.read(readFileSync(path));
  let { width, height, data } = png;
  if (region) {
    const { x, y, w, h } = region;
    const out = new Uint8ClampedArray(w * h * 4);
    for (let row = 0; row < h; row++) {
      const src = ((y + row) * width + x) * 4;
      out.set(data.subarray(src, src + w * 4), row * w * 4);
    }
    data = out; width = w; height = h;
  }
  const hit = jsQR(new Uint8ClampedArray(data), width, height);
  return hit ? hit.data : null;
}

// Tamanho do código no slide exportado (196 pt em um slide de 960 pt → 392 px em 1920).
const SLIDE_PX = 392, SCALE = 24, MARGIN = 4, SLIDE_BG = 87;

/**
 * Escolhe a máscara do QR pelo que os leitores conseguem ler, não pela pontuação
 * padrão do codificador. As 8 máscaras são válidas (o leitor a descobre no próprio
 * código), mas não são igualmente fáceis de ler: com a máscara automática, o código
 * do repositório não era encontrado pelo ZXing nem com a imagem perfeita. Cada
 * máscara passa pelas condições de qr_lib.mjs (distância, desfoque, contraste,
 * ruído, inclinação) com dois decodificadores; ganha a que falha menos.
 */
async function pickMask(url) {
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const buf = await QRCode.toBuffer(url, { errorCorrectionLevel: 'Q', maskPattern: mask, margin: MARGIN, scale: SCALE });
    const full = grayOf(PNG.sync.read(buf));
    const base = pad(shrink(full, SLIDE_PX / full.w), 32, SLIDE_BG);          // como fica no slide: reduzido, sobre fundo escuro
    const res = runCases(base, url);
    const score = [res.filter(r => !r.pass).length, -res.filter(r => r.js && r.zxing).length, -res.filter(r => r.js || r.zxing).length, mask];
    if (!best || score.some((v, i) => v !== best.score[i] && score.slice(0, i).every((w, k) => w === best.score[k]) && v < best.score[i])) best = { mask, score };
  }
  return best;
}

async function generate() {
  mkdirSync(ASSETS, { recursive: true });
  let fail = 0;
  for (const t of TARGETS) {
    const out = resolve(ASSETS, t.file);
    const best = await pickMask(t.url);
    // Nível Q (25% de correção) + zona de silêncio de 4 módulos: leitura robusta
    // em projeção. Preto puro sobre branco = contraste máximo para a câmera.
    await QRCode.toFile(out, t.url, {
      errorCorrectionLevel: 'Q',
      maskPattern: best.mask,
      margin: MARGIN,
      scale: SCALE,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    const img = grayOf(PNG.sync.read(readFileSync(out)));
    const a = readJsQR(img), z = readZXing(img);
    const ok = a === t.url && z === t.url;
    console.log(`${ok ? '✓' : '✗'} ${t.file}  máscara ${best.mask} (falhas exigidas ${best.score[0]}, lido pelos dois em ${-best.score[1]} de ${CASES.length} condições)  →  jsQR: ${a} | ZXing: ${z}`);
    if (!ok || best.score[0] > 0) fail++;
  }
  if (fail) { console.error(`\n✗ ${fail} QR code(s) sem leitura garantida pelos dois decodificadores.`); process.exit(1); }
  console.log('\n✓ QR codes gerados e conferidos (dois decodificadores devolvem a URL exata).');
}

function check(path) {
  // O jsQR devolve um QR por chamada: varre o slide com uma janela deslizante
  // (1/3 da largura, passo de 1/12) para isolar cada código, onde quer que esteja.
  const png = PNG.sync.read(readFileSync(path));
  const { width: W, height: H } = png;
  const win = Math.floor(W / 3), step = Math.floor(W / 12);
  const found = new Set();
  for (let x = 0; x + win <= W; x += step) {
    const d = decodePng(path, { x, y: 0, w: win, h: H });
    if (d && !found.has(d)) { found.add(d); console.log(`  [x=${x}px] ${d}`); }
  }
  const missing = TARGETS.filter(t => !found.has(t.url));
  if (missing.length) {
    console.error(`✗ não li no slide: ${missing.map(m => m.url).join(' , ')}`);
    process.exit(1);
  }
  console.log('✓ os dois QR codes do slide decodificam para as URLs corretas.');
}

const i = process.argv.indexOf('--check');
if (i > 0) check(process.argv[i + 1]);
else await generate();
