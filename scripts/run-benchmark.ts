/**
 * Script para rodar o benchmark via Node.js (sem navegador).
 * Polyfills: requestAnimationFrame (usado pelo yieldFrame do BenchmarkRunner).
 *
 * Uso: npx tsx scripts/run-benchmark.ts > benchmark_results.csv
 */

// Polyfill para requestAnimationFrame (não existe em Node.js)
(globalThis as any).requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0);

import { BenchmarkRunner } from '../src/benchmarks/BenchmarkRunner';

async function main() {
  const runner = new BenchmarkRunner();
  const results = await runner.run((p) => {
    process.stderr.write(`\r[${p.completed}/${p.total}] ${p.current}`);
  });
  process.stderr.write('\n');

  const csv = runner.toCSV();
  process.stdout.write(csv + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
