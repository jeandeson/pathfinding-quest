// main.ts
import { Game } from './src/game';
import { PathfindingTestSuite } from './src/PathfindingTestSuite';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});

const suite = new PathfindingTestSuite();
suite.runAll();
suite.logResults();

const json = suite.exportJSON();
const csv = suite.exportCSV();

// Salvar em arquivo (Node) ou baixar no browser
console.log(json);
console.log(csv);