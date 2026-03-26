# Pathfinding Quest

> Trabalho de Conclusão de Curso (TCC) — visualização interativa de algoritmos de busca de caminhos em um jogo top-down 2D.

---

## Objetivo

O projeto tem dupla finalidade: **acadêmica e lúdica**.

Do ponto de vista acadêmico, o objetivo é implementar, comparar e visualizar na prática quatro algoritmos clássicos de pathfinding — A\*, Dijkstra, BFS e DFS — mostrando como cada um encontra (ou não) o caminho ótimo em um grid com obstáculos, e como eles diferem em desempenho (tempo de execução, nós visitados, comprimento do caminho).

Do ponto de vista do jogo, o jogador controla um personagem que precisa coletar todas as maçãs do mapa para abrir a saída, enquanto três inimigos o perseguem usando o algoritmo de pathfinding selecionado.

---

## Funcionalidades

- **5 algoritmos de pathfinding** implementados do zero, sem bibliotecas externas
  - A\* com heurística de distância Manhattan
  - Dijkstra (custo uniforme)
  - BFS (Busca em Largura)
  - DFS (Busca em Profundidade, com aleatorização leve para evitar caminhos repetitivos)
  - JPS — Jump Point Search (otimização do A\* para grades uniformes)
- **Troca de algoritmo em tempo real** — tanto para o jogador quanto para os inimigos
- **Modo Benchmark** — roda os 4 algoritmos em múltiplos tamanhos de grade e densidades de obstáculos, exibindo gráficos comparativos de tempo e nós visitados
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
| `4` | DFS |
| `5` | JPS |

### Trocar Algoritmo dos Inimigos

| Tecla | Algoritmo |
|-------|-----------|
| `Q` | A\* |
| `W` | Dijkstra |
| `E` | BFS |
| `R` | DFS |
| `T` | JPS |

### Dicas
- O **Dash** tem cooldown de 1,5 segundo — use com sabedoria.
- O **Pulo** só funciona quando há um obstáculo adjacente com célula livre do outro lado.
- Os inimigos recalculam o caminho a cada 0,5 segundo — trocas de algoritmo refletem na próxima atualização.
- No **modo debug** (`D`), você consegue ver o f-cost de cada célula do último pathfinding executado.

---

## Os Algoritmos

### A\* (A-Star)
Combina o custo real do caminho percorrido (`g`) com uma heurística estimada até o objetivo (`h = distância Manhattan`). É o único algoritmo **garantidamente ótimo** entre os quatro neste contexto, e geralmente o mais eficiente em termos de nós visitados. É o padrão tanto do jogador quanto dos inimigos.

### Dijkstra
Expande os nós em ordem crescente de custo acumulado, sem heurística. Também **garante o caminho ótimo**, mas tende a explorar mais nós que o A\* porque não tem informação direcional sobre o objetivo.

### BFS (Breadth-First Search)
Explora o grafo nível a nível, garantindo o caminho com **menor número de passos** (ótimo para grafos sem pesos). É mais simples que Dijkstra e A\*, mas visita muitos nós desnecessários em grids grandes.

### DFS (Depth-First Search)
Explora recursivamente o máximo possível antes de retroceder. **Não garante o caminho ótimo** — o caminho encontrado costuma ser mais longo. É o mais imprevisível dos quatro e interessante para demonstrar a diferença qualitativa em relação aos demais.

### JPS (Jump Point Search)
Otimização do A\* para grades uniformes proposta por Harabor & Grastien (2011). Em vez de expandir cada célula individualmente, o JPS **salta** ao longo de linhas retas até encontrar um "ponto de salto" — uma célula com vizinhos forçados cuja rota ótima obrigatoriamente passa por ali. Isso reduz drasticamente o número de nós adicionados à lista aberta, mantendo a garantia de caminho ótimo do A\*. Implementado para movimentos 4-direcionais (cardeais).

---

## Modo Benchmark

Acessível pelo botão **"Executar Benchmark"** no menu principal.

O benchmark roda automaticamente todos os 4 algoritmos em diferentes configurações de grade (15×15, 20×20, 30×30, 40×40) com densidades de obstáculos variadas, coletando métricas de:

- **Tempo de execução** (ms)
- **Nós visitados**
- **Comprimento do caminho**
- **Taxa de sucesso**

Os resultados são exibidos em gráficos de barras comparativos diretamente no canvas. Cada rodada roda de forma assíncrona (yield entre batches) para não travar a UI durante a execução.

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
│   ├── PathfindingSystem.ts # A*, Dijkstra, BFS, DFS
│   └── types.ts             # Enum de algoritmos
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
│   ├── ChartRenderer.ts     # Gráficos de barras do benchmark
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
- **Orientação**: TCC — Curso de Ciência da Computação, Unijorge

