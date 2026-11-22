// md_lint_fix.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Evita dois tropeços de Markdown nos roteiros (valem para o GitHub e para o .docx):
//   1. o asterisco de "A*", "D*" e "HPA*" ser lido como marca de ênfase
//      (ex.: **"... do A* em ambientes dinâmicos?"** perdia o negrito) → vira A\*
//   2. "~4%" ... "~8%" virar texto tachado (um til abre/fecha tachado no GFM) → vira ≈
// Trechos entre crases (código) não são tocados. Idempotente.
//
// Uso: node md_lint_fix.mjs arquivo.md [outro.md ...]
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs';

for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let stars = 0, tildes = 0, fenced = false;
  const out = src.split(/(\r?\n)/).map(line => {
    if (/^\s*```/.test(line)) { fenced = !fenced; return line; }
    if (fenced || /^\r?\n$/.test(line)) return line;
    return line.split(/(`[^`]*`)/).map((seg, i) => {
      if (i % 2 === 1) return seg;                                   // código em linha
      seg = seg.replace(/\b(HPA|A|D)\*/g, (m, name) => { stars++; return `${name}\\*`; });
      seg = seg.replace(/~(?=\d)/g, () => { tildes++; return '≈'; });
      return seg;
    }).join('');
  }).join('');
  if (out !== src) writeFileSync(file, out);
  console.log(`${file}: ${stars} asterisco(s) escapado(s), ${tildes} til(es) trocado(s) por ≈`);
}
