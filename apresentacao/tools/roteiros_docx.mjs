// roteiros_docx.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Regenera os .docx dos roteiros a partir dos .md (os .md são a fonte única):
//   ROTEIRO_DE_APRESENTACAO.md → ROTEIRO_DE_APRESENTACAO.docx
//   ROTEIRO_DE_ESTUDO.md       → ROTEIRO_DE_ESTUDO.docx
// Markdown (marked) → Word (docx), sem depender do Word instalado.
//
// Uso: node roteiros_docx.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { marked }                      from 'marked';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, LevelFormat,
} from 'docx';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname }            from 'node:path';
import { fileURLToPath }               from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APRES = resolve(__dirname, '..');
const NAMES = ['ROTEIRO_DE_APRESENTACAO', 'ROTEIRO_DE_ESTUDO'];

// A4 com margens de 2 cm → 9638 twips de largura útil
const PAGE = { w: 11906, h: 16838, margin: 1134 };
const CONTENT_W = PAGE.w - 2 * PAGE.margin;
const INK = '1E143C', PURPLE = '413967', MAGENTA = 'CF0D72', MUTED = '5A5078';
const FONT = 'Calibri', MONO = 'Consolas';
const SZ = 22;                                   // 11 pt (meios-pontos)

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Tokens inline do marked → TextRun[] */
function runs(tokens, st = {}) {
  const out = [];
  for (const t of tokens || []) {
    switch (t.type) {
      case 'strong':   out.push(...runs(t.tokens, { ...st, bold: true })); break;
      case 'em':       out.push(...runs(t.tokens, { ...st, italics: true })); break;
      case 'del':      out.push(...runs(t.tokens, { ...st, strike: true })); break;
      case 'link':     out.push(...runs(t.tokens, { ...st })); break;
      case 'codespan': out.push(new TextRun({ text: decode(t.text), font: MONO, size: (st.size || SZ) - 1, color: st.color || INK, bold: st.bold })); break;
      case 'br':       out.push(new TextRun({ break: 1 })); break;
      case 'html':     break;                                    // comentários HTML não vão para o documento
      case 'text':
      case 'escape':
      default:
        if (t.tokens && t.tokens.length) { out.push(...runs(t.tokens, st)); break; }
        out.push(new TextRun({ text: decode(t.text ?? t.raw ?? ''), font: FONT, size: st.size || SZ, color: st.color || INK, bold: st.bold, italics: st.italics, strike: st.strike }));
    }
  }
  return out;
}

const para = (children, opts = {}) => new Paragraph({ children, spacing: { after: 100, line: 276 }, ...opts });

function heading(t) {
  const cfg = {
    1: { size: 40, color: PURPLE,  before: 0,   after: 60 },
    2: { size: 30, color: MAGENTA, before: 300, after: 100 },
    3: { size: 25, color: PURPLE,  before: 220, after: 70 },
  }[Math.min(t.depth, 3)];
  return new Paragraph({
    children: runs(t.tokens, { bold: true, size: cfg.size, color: cfg.color }),
    spacing: { before: cfg.before, after: cfg.after },
    keepNext: true,
  });
}

const QUOTE = {
  indent: { left: 240, right: 120 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: MAGENTA, space: 8 } },
  shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FBF1F6' },
};

let listInstance = 0;
function list(t, level = 0, extra = {}) {
  const out = [];
  const inst = t.ordered ? ++listInstance : 0;
  for (const item of t.items) {
    let first = true;
    for (const child of item.tokens) {
      if (child.type === 'list') { out.push(...list(child, level + 1, extra)); continue; }
      const inl = child.tokens || [{ type: 'text', text: child.text ?? child.raw ?? '' }];
      const base = first
        ? (t.ordered ? { numbering: { reference: 'ol', level, instance: inst } } : { bullet: { level } })
        : { indent: { left: 720 * (level + 1) } };
      out.push(para(runs(inl), { ...base, ...extra, spacing: { after: 60, line: 276 } }));
      first = false;
    }
  }
  return out;
}

function table(t) {
  const nC = t.header.length;
  // largura proporcional ao texto mais longo de cada coluna (com piso e teto)
  const len = Array.from({ length: nC }, (_, c) =>
    Math.max(t.header[c].text.length, ...t.rows.map(r => (r[c]?.text || '').length)));
  const weight = len.map(l => Math.min(Math.max(l, 6), 60));
  const sum = weight.reduce((a, b) => a + b, 0);
  const widths = weight.map(w => Math.floor(CONTENT_W * w / sum));
  widths[nC - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'B9B2CC' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (c, i, head) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    borders,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    shading: head ? { type: ShadingType.CLEAR, color: 'auto', fill: PURPLE } : undefined,
    children: [new Paragraph({ children: runs(c.tokens, head ? { bold: true, color: 'FFFFFF', size: 21 } : { size: 21 }), spacing: { after: 0, line: 264 } })],
  });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: t.header.map((c, i) => cell(c, i, true)) }),
      ...t.rows.map(r => new TableRow({ children: r.map((c, i) => cell(c, i, false)) })),
    ],
  });
}

function blocks(tokens, extra = {}) {
  const out = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'heading':    out.push(heading(t)); break;
      case 'paragraph':  out.push(para(runs(t.tokens), extra)); break;
      case 'text':       out.push(para(runs(t.tokens || [{ type: 'text', text: t.text }]), extra)); break;
      case 'blockquote': out.push(...blocks(t.tokens, QUOTE)); break;
      case 'list':       out.push(...list(t, 0, extra)); break;
      case 'table':      out.push(table(t), para([], { spacing: { after: 60 } })); break;
      case 'hr':         out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D5D0E2', space: 1 } }, spacing: { before: 120, after: 160 } })); break;
      case 'code':       for (const line of t.text.split('\n')) out.push(new Paragraph({ children: [new TextRun({ text: line, font: MONO, size: 19, color: INK })], shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F5F4F9' }, spacing: { after: 0 } })); out.push(para([])); break;
      case 'space': case 'html': break;
      default: if (t.raw && t.raw.trim()) out.push(para([new TextRun({ text: t.raw.trim(), font: FONT, size: SZ, color: INK })], extra));
    }
  }
  return out;
}

const levels = [0, 1, 2].map(level => ({
  level, format: LevelFormat.DECIMAL, text: `%${level + 1}.`, alignment: AlignmentType.START,
  style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
}));

for (const name of NAMES) {
  listInstance = 0;
  const md = readFileSync(resolve(APRES, `${name}.md`), 'utf8');
  const doc = new Document({
    creator: 'Jeandeson Souza Nascimento',
    title: name.replace(/_/g, ' '),
    styles: { default: { document: { run: { font: FONT, size: SZ, color: INK } } } },
    numbering: { config: [{ reference: 'ol', levels }] },
    sections: [{
      properties: { page: { size: { width: PAGE.w, height: PAGE.h }, margin: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin } } },
      children: blocks(marked.lexer(md, { gfm: true })),
    }],
  });
  const out = resolve(APRES, `${name}.docx`);
  writeFileSync(out, await Packer.toBuffer(doc));
  console.log(`✓ ${name}.docx`);
}
