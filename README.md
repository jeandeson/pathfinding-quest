# Pathfinding Quest

> Trabalho de Conclusão de Curso (TCC) — análise comparativa e visualização interativa de algoritmos de busca de caminhos em um jogo top-down 2D.

**Simulador online:** https://pathfinding-quest-j95b.vercel.app/ (roda no navegador, sem instalar nada)

---

## Objetivo

O projeto tem dupla finalidade: **acadêmica e lúdica**.

Do ponto de vista acadêmico, o objetivo é implementar, comparar e visualizar na prática cinco algoritmos de pathfinding — A\*, Dijkstra, BFS, DFS-Greedy e JPS — mostrando como cada um encontra (ou não) o caminho ótimo em um grid com obstáculos, e como eles diferem em desempenho (tempo de execução, nós expandidos, comprimento do caminho).

Do ponto de vista do jogo, o jogador controla um personagem que precisa coletar todas as maçãs do mapa para abrir a saída, enquanto três inimigos o perseguem usando o algoritmo de pathfinding selecionado.

---

## Funcionalidades

- **5 algoritmos de pathfinding** implementados do zero, sem bibliotecas externas
  - A\* com heurística de distância Manhattan
  - Dijkstra (custo uniforme)
  - BFS (Busca em Largura)
  - DFS-Greedy (Busca em Profundidade na variante adotada: vizinhos ordenados pela distância de Manhattan antes de empilhar)
  - JPS — Jump Point Search (otimização do A\* para grades uniformes)
- **Troca de algoritmo em tempo real** — tanto para o jogador quanto para os inimigos
- **Modo Benchmark** — roda os 5 algoritmos em quatro suítes (densidade de obstáculos, múltiplos NPCs, congestionamento e objetivos dinâmicos), exibindo gráficos e tabelas de tempo e nós expandidos
- **Mecânicas de jogo**: Dash (velocidade), Pulo (pular obstáculos), coleta de itens, saída condicional
- **Efeitos visuais**: partículas de pontuação, animação de sprites, squash & stretch no dash e pouso
- **Áudio completo**: efeitos sonoros para cada ação e músicas de fundo no menu e durante a partida
- **Modo Debug** (tecla `D`): exibe grade de pathfinding e f-costs nas células

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Linguagem | TypeScript 5 |
| Bundler | Vite 7 |
| Renderização | Canvas 2D API (sem framework de jogo) |
| Assets visuais | Kenney.nl (sprites e tileset) |
| Assets de áudio | Kenney.nl (efeitos e músicas) |

Sem dependências de runtime — zero bibliotecas externas no jogo. Tudo implementado sobre a API nativa do browser.

---

## Instalação

**Pré-requisitos**: Node.js 18+ e npm.

```bash
# 1. Clone o repositório
git clone <url-do-repositório>
cd tcc-pathfinding

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm run dev
```

Abra o browser em `http://localhost:5173` (ou a porta indicada no terminal).

### Build de produção

```bash
npm run build    # compila TypeScript e empacota com Vite
npm run preview  # serve o build localmente para validação
```

---

## Como Jogar

### Objetivo
Colete todas as **12 maçãs** espalhadas pelo mapa. Quando a última maçã for coletada, a **porta de saída** se abre. Chegue até ela antes que os inimigos te peguem.

### Controles

| Ação | Controle |
|------|----------|
| Mover o personagem | Clique com o mouse na célula de destino |
| Dash (velocidade 3.5×) | `Shift` |
| Pular sobre um obstáculo | `Espaço` |
| Alternar modo debug | `D` |

### Trocar Algoritmo do Jogador

| Tecla | Algoritmo |
|-------|-----------|
| `1` | A\* |
| `2` | Dijkstra |
| `3` | BFS |
| `4` | DFS-Greedy |
| `5` | JPS |

### Trocar Algoritmo dos Inimigos

| Tecla | Algoritmo |
|-------|-----------|
| `Q` | A\* |
| `W` | Dijkstra |
| `E` | BFS |
| `R` | DFS-Greedy |
| `T` | JPS |

### Dicas
- O **Dash** tem cooldown de 1,5 segundo — use com sabedoria.
- O **Pulo** só funciona quando há um obstáculo adjacente com célula livre do outro lado.
- Os inimigos recalculam o caminho a cada 0,5 segundo — trocas de algoritmo refletem na próxima atualização.
- No **modo debug** (`D`), você consegue ver o f-cost de cada célula do último pathfinding executado.

---

## Os Algoritmos

### A\* (A-Star)
Combina o custo real do caminho percorrido (`g`) com uma heurística estimada até o objetivo (`h = distância Manhattan`). Como a heurística é admissível em grade de 4 direções, **garante o caminho ótimo** e expande menos nós que Dijkstra e BFS. É o padrão tanto do jogador quanto dos inimigos.

### Dijkstra
Expande os nós em ordem crescente de custo acumulado, sem heurística. Também **garante o caminho ótimo**, mas tende a explorar mais nós que o A\* porque não tem informação direcional sobre o objetivo.

### BFS (Breadth-First Search)
Explora o grafo nível a nível, garantindo o caminho com **menor número de passos** (ótimo para grafos sem pesos). É mais simples que Dijkstra e A\*, mas expande muitos nós desnecessários em grids grandes.

### DFS-Greedy (variante adotada do Depth-First Search)
Busca em profundidade com pilha explícita. Antes de empilhar, os vizinhos são ordenados pela distância de Manhattan ao objetivo, de modo que o mais próximo é expandido primeiro. **Não garante o caminho ótimo**: é o mais rápido dos cinco, mas nos testes o caminho chegou a ser 15% mais longo (45 contra 39 células). O DFS canônico, sem essa ordenação, gerava rotas incoerentes para os NPCs e por isso não é usado.

### JPS (Jump Point Search)
Otimização do A\* para grades uniformes proposta por Harabor & Grastien (2011). Em vez de expandir cada célula individualmente, o JPS **salta** ao longo de linhas retas até encontrar um "ponto de salto" — uma célula com vizinhos forçados cuja rota ótima obrigatoriamente passa por ali. Isso reduz drasticamente o número de nós adicionados à lista aberta, mantendo a garantia de caminho ótimo do A\*. Implementado para movimentos 4-direcionais (cardeais).

---

## Modo Benchmark

Acessível pelo botão **"Executar Benchmark"** no menu principal.

O benchmark roda automaticamente os 5 algoritmos em grades 20×20, 30×30 e 40×40, com densidades de obstáculos e quantidades de NPCs variadas, coletando métricas de:

- **Tempo de execução** (ms)
- **Nós expandidos** (coluna `nodesVisited` do CSV: nós extraídos da lista aberta e processados)
- **Comprimento do caminho**
- **Taxa de sucesso**

Os resultados são exibidos em gráficos e tabelas comparativos diretamente no canvas. Cada rodada roda de forma assíncrona (yield entre batches) para não travar a UI durante a execução.

---

## Reproduzir o Benchmark e Regenerar os Artefatos do TCC

A **fonte única** dos dados é o arquivo `benchmark_results.csv` na raiz do projeto. Tabelas e gráficos do TCC derivam dele — nunca edite números à mão.

### 1. Reexportar o `benchmark_results.csv`

Há duas formas equivalentes (as métricas estruturais — `pathLength`, `nodesVisited`, `success` — são determinísticas via PRNG `mulberry32` com sementes fixas; apenas `timeMs` varia conforme o hardware/navegador):

```bash
# Opção A — no navegador (gera os tempos usados no TCC):
#   npm run dev → "Executar Benchmark" → "Exportar CSV"
#   o arquivo é baixado como benchmark_results.csv

# Opção B — headless via Node (mesmos nós/caminhos; tempos diferem):
npx tsx scripts/run-benchmark.ts > benchmark_results.csv
```

> O navegador costuma renomear downloads repetidos para `benchmark_results (n).csv`. Mantenha **apenas** o arquivo canônico `benchmark_results.csv` na raiz (renomeie o último export para esse nome).

### 2. Regenerar a apresentação (Windows + PowerPoint)

Um único comando refaz tudo, do CSV ao `.pptx`, e só termina com sucesso se as conferências passarem:

```bash
cd apresentacao/tools
npm install                                              # uma vez
powershell -ExecutionPolicy Bypass -File build_all.ps1   # CSV → dados → gráficos → QR codes → .pptx → previews → auditorias
```

O que o `build_all.ps1` executa, na ordem:

| Etapa | Script | Saída |
|---|---|---|
| Dados dos gráficos | `build_chart_data.mjs` | `chart_data.js` |
| Dados dos slides (confere cada afirmação contra o CSV) | `build_deck_data.mjs` | `deck_data.json` |
| Gráficos dos slides (fundo claro, rótulos de 18 pt ou mais) | `render_slide_charts.mjs` | `apresentacao/charts/slide_*.png` |
| QR codes do slide final (gera e decodifica de volta) | `make_qr.mjs` | `apresentacao/assets/qr_*.png` |
| Capturas do simulador (só com `-Capture`) | `capture_slides.mjs` | `apresentacao/assets/slide_*.png` |
| Apresentação | `build_from_template.ps1` | `apresentacao/TCC_Apresentacao_Jeandeson.pptx` |
| Previews | `export_previews.ps1` | `apresentacao/preview/slide_NN.png` |
| Auditoria de legibilidade (nenhum texto abaixo de 18 pt, títulos com 36 pt ou mais, nada sobre o logo) | `audit_deck.ps1` | relatório |
| QR codes legíveis no slide exportado | `make_qr.mjs --check` | relatório |

Nenhum número dos slides é digitado à mão: o builder lê `deck_data.json`.

### 2b. Regenerar as figuras do artigo

```bash
node apresentacao/tools/build_chart_data.mjs   # CSV → chart_data.js
node scripts/render-charts.mjs                 # → figuras/chart_{A,B,C,D}.png (referenciadas pelo tcc.md)
```

A renderização usa o Chrome do sistema (sem baixar navegador).

### 3. Verificar consistência (rode antes de cada entrega)

```bash
node scripts/verify_tables.mjs       # tabelas do tcc.md  ×  benchmark_results.csv
node scripts/verify_invariants.mjs   # corretude lógica dos dados (otimalidade, escala linear, etc.)
node scripts/verify_terms.mjs        # nomenclatura padronizada em artigo, roteiros, slides e simulador
```

Os três devem terminar com **0 divergências / 0 falhas**. Termos padronizados: **DFS-Greedy** (variante adotada), **nós expandidos** e **16 ms/quadro (60 fps)**. Se um número do `tcc.md` divergir do CSV após um novo export, `verify_tables.mjs` aponta exatamente qual célula corrigir.

---

## Estrutura do Projeto

```
src/
├── config/
│   └── GameConfig.ts        # Todas as constantes do jogo (única fonte de verdade)
├── core/
│   ├── AssetManager.ts      # Carregamento de imagens
│   ├── EventBus.ts          # Barramento de eventos tipado
│   ├── GameLoop.ts          # Loop principal
│   ├── InputManager.ts      # Mouse e teclado
│   └── SoundManager.ts      # Efeitos sonoros e músicas
├── entities/
│   ├── Agent.ts             # Classe base (movimento, animação, juice)
│   ├── Player.ts            # Jogador (dash, pulo)
│   └── Enemy.ts             # Inimigo (segue pathfinding)
├── pathfinding/
│   ├── PathfindingSystem.ts # A*, Dijkstra, BFS, DFS-Greedy, JPS
│   └── types.ts             # Enum de algoritmos e nomes de exibição
├── world/
│   ├── Cell.ts              # Tipo de dados de uma célula
│   ├── Grid.ts              # Geração do mapa, obstáculos, itens
│   └── GridRenderer.ts      # Renderização do mapa (tiles, maçãs, porta)
├── scenes/
│   ├── MenuScene.ts         # Tela inicial
│   ├── GameScene.ts         # Cena principal do jogo
│   ├── ResultScene.ts       # Tela de vitória/derrota
│   └── BenchmarkScene.ts    # Tela de benchmark
├── benchmarks/
│   ├── BenchmarkRunner.ts   # Execução assíncrona dos testes
│   └── BenchmarkResult.ts   # Tipos de resultado
├── rendering/
│   ├── ChartRenderer.ts     # Gráficos do benchmark
│   └── drawUtils.ts         # Utilitários de desenho
├── ui/
│   ├── HUD.ts               # Interface durante o jogo
│   └── Button.ts            # Componente de botão
└── Game.ts                  # Orquestrador: canvas, loop, cenas, assets
```

---

## Créditos

- **Assets visuais e sonoros**: [Kenney.nl](https://kenney.nl) — licença Creative Commons Zero (CC0)
- **Desenvolvimento**: Jeandeson Nascimento
- **Orientação**: Prof. Gilson Amorim Carvalho — Curso de Ciência da Computação, UNIJORGE

