// qr_lib.mjs — degradações de imagem e leitura de QR code usadas por qr_stress.mjs e make_qr.mjs.
// Imagens em tons de cinza: { g: Float32Array, w, h }.
import jsQR from 'jsqr';
import zx from '@zxing/library';

const { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource, DecodeHintType } = zx;

export function grayOf(png) {
  const g = new Float32Array(png.width * png.height);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * png.data[i * 4] + 0.587 * png.data[i * 4 + 1] + 0.114 * png.data[i * 4 + 2];
  return { g, w: png.width, h: png.height };
}

export function crop({ g, w }, x, y, cw, ch) {
  const o = new Float32Array(cw * ch);
  for (let r = 0; r < ch; r++) o.set(g.subarray((y + r) * w + x, (y + r) * w + x + cw), r * cw);
  return { g: o, w: cw, h: ch };
}

/** Coloca a imagem sobre um fundo liso (o slide final é escuro em volta do código). */
export function pad({ g, w, h }, m, bg) {
  const nw = w + 2 * m, nh = h + 2 * m, o = new Float32Array(nw * nh).fill(bg);
  for (let r = 0; r < h; r++) o.set(g.subarray(r * w, (r + 1) * w), (r + m) * nw + m);
  return { g: o, w: nw, h: nh };
}

/** Redução por média de área (o que a óptica da câmera faz com a distância). */
export function shrink({ g, w, h }, s) {
  if (s >= 1) return { g, w, h };
  const nw = Math.max(8, Math.round(w * s)), nh = Math.max(8, Math.round(h * s)), o = new Float32Array(nw * nh);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) {
    const x0 = x / s, x1 = Math.min(w, (x + 1) / s), y0 = y / s, y1 = Math.min(h, (y + 1) / s);
    let sum = 0, area = 0;
    for (let yy = Math.floor(y0); yy < Math.ceil(y1); yy++) for (let xx = Math.floor(x0); xx < Math.ceil(x1); xx++) {
      const a = (Math.min(xx + 1, x1) - Math.max(xx, x0)) * (Math.min(yy + 1, y1) - Math.max(yy, y0));
      sum += g[yy * w + xx] * a; area += a;
    }
    o[y * nw + x] = sum / area;
  }
  return { g: o, w: nw, h: nh };
}

/** Desfoque: duas passadas de média móvel de raio r (aproxima um gaussiano). */
export function blur({ g, w, h }, r) {
  if (!r) return { g, w, h };
  let a = g;
  for (let pass = 0; pass < 2; pass++) {
    const t = new Float32Array(w * h), o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += a[y * w + xx]; n++; } } t[y * w + x] = s / n; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += t[yy * w + x]; n++; } } o[y * w + x] = s / n; }
    a = o;
  }
  return { g: a, w, h };
}

/** Contraste: o preto vira `lo` e o branco vira `hi` (projetor lavado pela luz da sala). */
export const contrast = ({ g, w, h }, lo, hi) => ({ g: g.map(v => lo + v / 255 * (hi - lo)), w, h });

/** Ruído gaussiano com semente fixa (resultado reprodutível). */
export function noise({ g, w, h }, sigma, seed = 1234) {
  let a = seed >>> 0;
  const rnd = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  return { g: g.map(v => v + sigma * Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd())), w, h };
}

const bilinear = (g, w, sx, sy) => {
  const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
  return g[y0 * w + x0] * (1 - fx) * (1 - fy) + g[y0 * w + x0 + 1] * fx * (1 - fy) + g[(y0 + 1) * w + x0] * (1 - fx) * fy + g[(y0 + 1) * w + x0 + 1] * fx * fy;
};

/** Rotação em torno do centro (celular torto). */
export function rotate({ g, w, h }, deg) {
  if (!deg) return { g, w, h };
  const o = new Float32Array(w * h), c = Math.cos(deg * Math.PI / 180), s = Math.sin(deg * Math.PI / 180), cx = w / 2, cy = h / 2, bg = g[0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = c * (x - cx) + s * (y - cy) + cx, sy = -s * (x - cx) + c * (y - cy) + cy;
    o[y * w + x] = (sx < 0 || sy < 0 || sx >= w - 1 || sy >= h - 1) ? bg : bilinear(g, w, sx, sy);
  }
  return { g: o, w, h };
}

/** A câmera amplia o que vê: devolve a imagem a um tamanho de leitura, sem recriar detalhe. */
export function enlarge({ g, w, h }, target) {
  const s = target / w;
  if (s <= 1) return { g, w, h };
  const nw = Math.round(w * s), nh = Math.round(h * s), o = new Float32Array(nw * nh);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) o[y * nw + x] = bilinear(g, w, Math.min(w - 1.001, x / s), Math.min(h - 1.001, y / s));
  return { g: o, w: nw, h: nh };
}

const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v;

export function readJsQR({ g, w, h }) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { const v = clamp(g[i]); rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = v; rgba[i * 4 + 3] = 255; }
  const hit = jsQR(rgba, w, h);
  return hit ? hit.data : null;
}

export function readZXing({ g, w, h }) {
  const lum = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = clamp(g[i]);
  try {
    const hints = new Map([[DecodeHintType.TRY_HARDER, true]]);
    return new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, w, h))), hints).getText();
  } catch (e) { return null; }
}

// Condições: [rótulo, escala, desfoque(px), contraste [lo,hi] | null, ruído σ, rotação°, exigência]
// Escala = tamanho do código na foto em relação ao slide exportado com 1920 px de largura.
// Exigência: 'ambos' = os dois decodificadores; 'um' = pelo menos um; 'info' = só informativo.
export const CASES = [
  ['nítido, tela cheia',                               1.00, 0, null,       0,  0, 'ambos'],
  ['metade do tamanho',                                0.50, 0, null,       0,  0, 'ambos'],
  ['um terço (fundo de sala)',                         0.33, 0, null,       0,  0, 'ambos'],
  ['metade + pouco contraste (projetor lavado)',       0.50, 0, [70, 190],  0,  0, 'ambos'],
  ['metade + ruído (sala escura, ISO alto)',           0.50, 0, null,      25,  0, 'ambos'],
  ['metade + celular torto 10°',                       0.50, 0, null,       0, 10, 'ambos'],
  ['metade + desfoque leve',                           0.50, 1, null,       0,  0, 'ambos'],
  ['metade + desfoque forte',                          0.50, 2, null,       0,  0, 'um'],
  ['tudo junto: 40%, desfoque, contraste, ruído, 6°',  0.40, 1, [60, 200], 15,  6, 'um'],
  ['um terço + desfoque + pouco contraste',            0.33, 1, [60, 200],  0,  0, 'um'],
  ['um quarto (limite)',                               0.25, 0, null,       0,  0, 'info'],
  ['um quinto (além do limite)',                       0.20, 0, null,       0,  0, 'info'],
];

/** Aplica cada condição à imagem-base e devolve o que cada decodificador leu. */
export function runCases(base, url) {
  return CASES.map(([label, s, b, c, n, r, need]) => {
    let im = shrink(base, s);
    im = blur(im, b);
    if (c) im = contrast(im, c[0], c[1]);
    if (n) im = noise(im, n);
    im = rotate(im, r);
    im = enlarge(im, 420);
    const js = readJsQR(im) === url, zxing = readZXing(im) === url;
    const pass = need === 'ambos' ? (js && zxing) : need === 'um' ? (js || zxing) : true;
    return { label, scale: s, need, js, zxing, pass };
  });
}
