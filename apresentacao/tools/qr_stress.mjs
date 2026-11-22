// qr_stress.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Teste de robustez dos QR codes do slide final. Pega o slide EXPORTADO, recorta
// cada código e o degrada como uma câmera de celular o veria na projeção: menor
// (mais longe), desfocado, com pouco contraste (projetor lavado, sala clara),
// com ruído e torto. Dois decodificadores independentes (jsQR e ZXing) precisam
// devolver a URL exata; as condições e as exigências estão em qr_lib.mjs.
//
// Isto NÃO substitui apontar um celular para a tela da sala: mede a margem de
// leitura da imagem, não o projetor nem a luz do ambiente.
//
// Uso: node qr_stress.mjs ..\preview\slide_22.png   (sai com código 1 se faltar margem)
// ─────────────────────────────────────────────────────────────────────────────
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { readFileSync } from 'node:fs';
import { TARGETS } from './make_qr_targets.mjs';
import { grayOf, crop, runCases } from './qr_lib.mjs';

const file = process.argv[2];
if (!file) { console.error('uso: node qr_stress.mjs <slide.png>'); process.exit(1); }
const png = PNG.sync.read(readFileSync(file));
const W = png.width, H = png.height;
const gray = grayOf(png);

// localiza os códigos no slide: janela deslizante + cantos devolvidos pelo jsQR
const found = [];
const win = Math.floor(W / 3), step = Math.floor(W / 12);
for (let x = 0; x + win <= W; x += step) {
  const rgba = new Uint8ClampedArray(win * H * 4);
  for (let r = 0; r < H; r++) rgba.set(png.data.subarray((r * W + x) * 4, (r * W + x + win) * 4), r * win * 4);
  const hit = jsQR(rgba, win, H);
  if (!hit || found.some(f => f.url === hit.data)) continue;
  const L = hit.location, xs = [L.topLeftCorner.x, L.topRightCorner.x, L.bottomLeftCorner.x, L.bottomRightCorner.x], ys = [L.topLeftCorner.y, L.topRightCorner.y, L.bottomLeftCorner.y, L.bottomRightCorner.y];
  const x0 = x + Math.min(...xs), y0 = Math.min(...ys), side = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  found.push({ url: hit.data, x0, y0, side });
}
for (const t of TARGETS) if (!found.some(f => f.url === t.url)) { console.error(`x QR não encontrado no slide: ${t.url}`); process.exit(1); }

let fail = 0;
for (const f of found) {
  const name = TARGETS.find(t => t.url === f.url).file.replace(/^qr_|\.png$/g, '');
  const m = Math.round(f.side * 0.22);                                 // zona de silêncio + um pouco do fundo do slide
  const x = Math.max(0, Math.round(f.x0 - m)), y = Math.max(0, Math.round(f.y0 - m));
  const base = crop(gray, x, y, Math.min(W - x, Math.round(f.side + 2 * m)), Math.min(H - y, Math.round(f.side + 2 * m)));
  console.log(`\n${name}: ${f.url}\n  código com ${Math.round(f.side)} px de lado no slide de ${W} px (${(f.side / W * 100).toFixed(1)}% da largura, sem a margem branca)`);
  for (const r of runCases(base, f.url)) {
    const verdict = r.need === 'info' ? (r.js || r.zxing ? 'leu' : 'não leu') : r.pass ? 'ok' : 'FALHOU';
    if (!r.pass) fail++;
    const need = r.need === 'ambos' ? 'exige os dois' : r.need === 'um' ? 'exige um' : 'informativo';
    console.log(`  ${verdict.padEnd(8)} ${String(Math.round(f.side * r.scale)).padStart(4)} px  jsQR ${r.js ? 'sim' : 'não'} · ZXing ${r.zxing ? 'sim' : 'não'}  ${r.label}  (${need})`);
  }
}

console.log('');
if (fail) { console.error(`x ${fail} condição(ões) exigida(s) sem leitura.`); process.exit(1); }
console.log('OK: os dois QR codes passam em todas as condições exigidas, com dois decodificadores independentes.');
console.log('    Falta só o que nenhum script confere: apontar um celular para a tela da sala.');
