// make_qr.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Gera os QR codes do slide final (simulador + repositório) e CONFERE cada um:
// o PNG gerado é decodificado de volta (jsQR) e precisa devolver a URL exata.
// Se a decodificação divergir, o script falha — nenhum QR quebrado vai ao slide.
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS    = resolve(__dirname, '..', 'assets');

export const TARGETS = [
  { file: 'qr_simulador.png',   url: 'https://pathfinding-quest-j95b.vercel.app/' },
  { file: 'qr_repositorio.png', url: 'https://github.com/jeandeson/pathfinding-quest' },
];

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

async function generate() {
  mkdirSync(ASSETS, { recursive: true });
  let fail = 0;
  for (const t of TARGETS) {
    const out = resolve(ASSETS, t.file);
    // Nível Q (25% de correção) + zona de silêncio de 4 módulos: leitura robusta
    // em projeção. Preto puro sobre branco = contraste máximo para a câmera.
    await QRCode.toFile(out, t.url, {
      errorCorrectionLevel: 'Q',
      margin: 4,
      scale: 24,
      color: { dark: '#000000', light: '#FFFFFF' },
    });
    const back = decodePng(out);
    const ok = back === t.url;
    console.log(`${ok ? '✓' : '✗'} ${t.file}  →  ${back}`);
    if (!ok) fail++;
  }
  if (fail) { console.error(`\n✗ ${fail} QR code(s) não decodificaram para a URL esperada.`); process.exit(1); }
  console.log('\n✓ QR codes gerados e conferidos (decodificação = URL exata).');
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
