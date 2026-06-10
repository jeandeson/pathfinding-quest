# Roteiro de Estudo — Defesa do TCC
### Análise Comparativa de Algoritmos de Pathfinding para NPCs em Jogos 2D em Ambiente Web

> Objetivo deste documento: reunir **tudo o que você precisa dominar** para defender o trabalho com segurança. Estude na ordem: (1) entenda a história do trabalho, (2) domine os 5 algoritmos, (3) decore os números-chave, (4) treine as respostas da banca, (5) saiba defender as limitações.

---

## 1. A "história" do trabalho em 30 segundos (decore isto)

> "Eu implementei do zero, sem bibliotecas, cinco algoritmos de pathfinding — A*, Dijkstra, BFS, DFS e Jump Point Search — em TypeScript rodando no navegador com Canvas. Construí um simulador interativo online e um benchmark automatizado. Medi tempo, nós expandidos, comprimento do caminho e taxa de sucesso em vários cenários. A descoberta central é que **nas escalas testadas o gargalo nunca é o frame rate — todos os algoritmos rodam em menos de 2 ms para 50 NPCs, contra um orçamento de 16 ms por quadro**. Então a escolha do algoritmo não é sobre 'cabe no quadro?', e sim sobre **nós expandidos e qualidade do caminho**. O JPS reduz mais de 99% dos nós em grades densas, mas essa economia só vira vantagem de tempo quando a grade é densa."

Se você souber explicar esse parágrafo com naturalidade, já passou metade da defesa.

---

## 2. Por que o trabalho existe (problema, lacuna, justificativa)

- **Contexto:** jogos usam pathfinding para mover NPCs de forma inteligente. Devs indie têm IA pronta em Unity/Phaser, mas **não sabem o custo real de cada algoritmo no navegador**.
- **Lacuna científica:** quase toda a literatura mede pathfinding em **C++ / ambiente nativo compilado**. O ambiente **JavaScript/navegador (motor V8)** tem características próprias — compilação JIT progressiva, pausas de garbage collector, mitigação Spectre que limita a resolução do relógio — e é **pouco documentado**. A comparação **A* vs JPS no navegador** é a lacuna específica.
- **Justificativa prática:** entregar um **artefato funcional online** (simulador + benchmark) que a banca e a comunidade podem reproduzir sem instalar nada.

**Frase-chave:** "A contribuição não é inventar um algoritmo novo, é medir empiricamente esses cinco algoritmos clássicos num ambiente que a literatura ignora — o navegador."

---

## 3. Os 5 algoritmos — o que você PRECISA saber explicar

Para cada um, saiba responder: *como funciona? garante o caminho ótimo? usa heurística? memória? quando usar?*

### Dijkstra (1959)
- **Como:** explora a partir da origem sempre escolhendo o nó de **menor custo g(n) acumulado**. Sem heurística → explora uniformemente em todas as direções.
- **Ótimo?** Sim. **Heurística?** Não. **Memória:** alta.
- **Papel no trabalho:** é a **base** de tudo. O A* é "Dijkstra + heurística". É o mais lento dos ótimos porque explora demais.
- **Detalhe técnico:** open list em **heap binário** → extração O(log V), laço O((V+E) log V).

### BFS — Breadth-First Search
- **Como:** fila **FIFO**, explora por **níveis** (camadas de distância). Acha o caminho de **menor número de passos**.
- **Ótimo?** Sim, **em grades de custo uniforme** (que é o caso aqui). **Heurística?** Não. **Memória:** alta.
- **Detalhe importante (a banca pode cobrar):** BFS e Dijkstra expandem **exatamente o mesmo número de nós** (284 na densidade 0,2), mas o **BFS é mais rápido** porque o `dequeue` da fila FIFO é **O(1)**, enquanto o heap do Dijkstra é **O(log n)**. A diferença NÃO é a heurística (nenhum dos dois usa) — é a estrutura de dados.

### DFS — Depth-First Search (variante **Greedy DFS**)
- **Como (canônico):** desce o mais fundo possível num ramo antes de voltar (backtracking), usando **pilha LIFO**.
- **Problema do DFS puro:** sem heurística, expande vizinhos em ordem fixa (N,S,O,L) e pode percorrer a área inteira — gerou NPCs "andando para o lado oposto do objetivo". **Inaplicável em jogo real.**
- **Solução adotada (Greedy DFS):** antes de empilhar, ordena os vizinhos por **distância Manhattan decrescente**. Como a pilha é LIFO, o vizinho mais próximo do objetivo fica no topo e é expandido primeiro → direciona a busca **sem mudar a estrutura de pilha**.
- **Ótimo?** **Não** — caminhos sistematicamente mais longos (45 vs 39 = 15% mais longo em grade esparsa). **Heurística?** Sim (só para ordenar). **Memória:** baixa em teoria, mas **esta implementação usa `visited` + `cameFrom`, ambos O(V)** — então abriu mão da vantagem clássica de memória do DFS em troca de prevenção de ciclos.
- **Honestidade técnica (ponto forte da sua defesa):** você admite que essa variante não é o DFS canônico e explica o porquê. Isso impressiona banca.

### A* (Hart, Nilsson, Raphael, 1968)
- **Como:** Dijkstra + heurística. Usa **f(n) = g(n) + h(n)**:
  - **g(n)** = custo real do início até n.
  - **h(n)** = estimativa heurística de n até o objetivo (aqui, **distância de Manhattan**).
  - escolhe expandir sempre o nó de **menor f**.
- **Ótimo?** Sim, **se a heurística for admissível**. **Heurística?** Sim. **Memória:** média.
- **Por que é o "marco":** equilibra a completude do Dijkstra com a eficiência da busca informada. É o mais usado em jogos.

### JPS — Jump Point Search (Harabor & Grastien, 2011)
- **Como:** é uma **otimização do A*** para **grades de custo uniforme**. Em vez de expandir todos os vizinhos, ele **"salta"** em linha reta até encontrar um **jump point** (ponto de salto) — uma célula com **vizinho forçado**.
- **Ideia central — simetria de caminhos:** numa linha reta, vários caminhos de mesmo custo são equivalentes (simétricos); basta avaliar um. A **poda** elimina os redundantes.
- **Vizinho forçado:** um vizinho cujo caminho ótimo **obrigatoriamente** passa pelo nó atual por causa de um obstáculo adjacente. É isso que força o algoritmo a "fazer uma curva" / criar um jump point.
- **Ótimo?** Sim (mantém otimalidade do A* com heurística admissível). **Memória:** baixa.
- **Adaptação importante do seu trabalho:** o JPS original é para **8 direções (com diagonais)**. Você adaptou para **4 direções (cardeais)**. Por isso precisou da **sondagem perpendicular (`jpsProbe`)** — sem ela, curvas em corredores sem obstáculos adjacentes nunca seriam detectadas. **Essa sondagem roda a cada célula do salto e é a causa do JPS ser às vezes mais lento que o A* em grades esparsas.**
- **Consequência:** como sua variante 4-direcional é uma adaptação, a otimalidade **não é herdada da prova original** — você a **validou empiricamente** (todos os caminhos deram 39 células, iguais ao A*).

---

## 4. Conceitos teóricos que a banca PODE cobrar

### Heurística admissível e consistente (Objetivo Específico 5)
- **Admissível:** nunca superestima o custo real até o objetivo → `h(n) ≤ custo_real(n, objetivo)`. Garante que o A* acha o **ótimo**.
- **Consistente (firme/monotônica):** para qualquer nó n e vizinho n': `h(n) ≤ custo(n,n') + h(n')`. Garante eficiência (não reabre nós).
- **Prova para Manhattan (saiba reproduzir):** numa grade 4-direcional, cada passo cobre **1 unidade** em uma direção cardinal. Para ir de n ao objetivo, qualquer caminho válido precisa de **pelo menos |Δx| + |Δy| passos**. Logo `h(n) = |Δx| + |Δy| ≤ custo_real`. A igualdade só ocorre com caminho reto livre; com obstáculos a desigualdade é estrita. Consistência vem da **desigualdade triangular da norma L1**.
- **Validação empírica:** A*, Dijkstra, BFS e JPS produziram caminhos **idênticos (39 células)** em todos os cenários → confirma otimalidade.

### Complexidade (saiba de cor)
- **BFS / DFS:** O(V + E).
- **Dijkstra / A* / JPS** (com heap binário): **O((V + E) log V)**.
- Por que heap e não vetor? Vetor com varredura linear faria extract-min em O(V), degradando o laço para **O(V²)**. O heap mantém O(log V).

### A métrica `nodesVisited` (definição precisa — muito importante)
- Conta **apenas nós EXPANDIDOS** = nós **extraídos da lista aberta** no laço principal (extract-min no A*/Dijkstra/JPS; dequeue no BFS; pop no DFS).
- **No JPS:** conta só os **jump points** extraídos da fila — **NÃO** as células varridas internamente pela rotina `jump()`. Isso alinha a métrica ao conceito de "nodes expanded" de Harabor & Grastien e torna justa a comparação A* vs JPS.
- **Por que isso importa:** se você contasse as varreduras internas, o JPS pareceria pior. A escolha é metodologicamente correta e defensável.

---

## 5. Metodologia de medição — por que é confiável (a banca valoriza rigor)

- **Hardware:** Intel Core i5-10300H, 16 GB RAM, SSD NVMe, Windows 11 Pro.
- **Navegador:** Chrome headless (V8/Blink), dirigido via Chrome DevTools Protocol, em página isolada (`benchmark.html`) **sem o loop de renderização** — para a cronometragem não disputar CPU com o canvas.
- **Relógio:** `performance.now()`. **Problema:** o Chrome limita a resolução a ~100 microssegundos (mitigação Spectre). Uma busca isolada dura menos que isso → seria só ruído.
- **Solução — medição em lote:** repete a unidade de trabalho **K vezes** numa única janela cronometrada, com K calibrado até a janela passar de 25 ms; o tempo por unidade = janela / K. Assim buscas de microssegundos viram mensuráveis.
- **Reprodutibilidade:** repetições de **aquecimento (warm-up)** descartadas para o JIT estabilizar; depois **10 janelas** medidas; reporta **média + desvio-padrão**.
- **Determinismo:** obstáculos gerados por **PRNG mulberry32 com sementes fixas** → métricas estruturais (comprimento, nós) são **idênticas em qualquer máquina**. Só o **tempo** varia (JIT, GC, SO) e não é generalizável a outro hardware.
- **Isolamento:** cada algoritmo reinicia os dados das células (`resetPathfindingData`) → um não contamina o outro. Instrumentação de contagem **idêntica para todos**, sem viés.

**Frase-chave:** "Eu separei o que é reprodutível do que não é: nós e comprimento são determinísticos e valem em qualquer máquina; tempo é específico do meu hardware, e por isso reporto desvio-padrão e uso medição em lote."

---

## 6. NÚMEROS-CHAVE (decore os principais — a banca adora pedir)

### Tabela 1 — Grade 20×20, densidade 0,2
| Algoritmo | Comprimento | Nós | Tempo (ms) |
|-----------|-------------|-----|-----------|
| **A***     | 39 | 103 | 0,01 |
| Dijkstra  | 39 | 284 | 0,03 |
| BFS       | 39 | 284 | 0,02 |
| DFS       | **45** | 50 | 0,01 |
| **JPS**     | 39 | 66 | 0,02 |

### Tabela 2 — Grade 20×20, densidade 0,4
| Algoritmo | Comprimento | Nós | Tempo (ms) |
|-----------|-------------|-----|-----------|
| A*        | 39 | 399 | 0,05 |
| Dijkstra  | 39 | 399 | 0,05 |
| BFS       | 39 | 399 | 0,03 |
| DFS       | 39 | 38 | 0,01 |
| **JPS**     | 39 | **3** | 0,02 |

> 🌟 **O número mais importante do trabalho:** densidade 0,4 → **JPS: 3 nós vs A*: 399 nós = redução de >99%.**

### Tabela 3 — 50 NPCs, 20×20, densidade 0,2 (tempo TOTAL das 50 buscas)
| Algoritmo | Nós (total) | Tempo total (ms) |
|-----------|-------------|------------------|
| DFS       | 2.350  | **0,51** (mais rápido) |
| A*        | 7.100  | 0,95 |
| BFS       | 14.700 | 0,96 |
| JPS       | 3.500  | 1,06 |
| Dijkstra  | 14.700 | **1,62** (mais lento) |

> 🌟 **Todos < 2 ms, contra orçamento de 16 ms.** E note: JPS expande **menos da metade** dos nós do A* (3.500 vs 7.100) mas é **mais lento** (1,06 vs 0,95) — por causa das sondagens perpendiculares. **Esse é o paradoxo central da sua discussão.**

### Tabela 5 — Congestionamento 30×30, 50 NPCs (% do quadro de 16,67 ms)
- DFS 0,71 ms (~4%) · BFS 1,25 ms (~8%) · A* 1,28 ms (~8%) · JPS 1,71 ms (~10%) · Dijkstra 2,05 ms (~12%).
- Custo escala **linearmente** com nº de NPCs.

### Números soltos para ter na ponta da língua
- Orçamento de um quadro a 60 fps = **16,67 ms** (arredonda-se 16 ms).
- Caminho ótimo na 20×20 = **39 células**; DFS esparso = **45** (15% pior).
- Estimativa inicial do anteprojeto era **50 ms/busca** — revelou-se folgada em **mais de uma ordem de grandeza** (real: centésimos de ms).
- 40×40 densidade 0,4: A* visita **1.599** nós, JPS só **3**.

---

## 7. As 5 perguntas de pesquisa e suas respostas (a "espinha dorsal" da conclusão)

1. **O orçamento de 16 ms é atendido?** SIM, com folga enorme. 50 NPCs em <2 ms. Frame rate **não** é o fator limitante nas escalas testadas.
2. **A* vs BFS?** A* expande **sempre menos nós** (heurística direciona). Mas em **tempo** é "condicional": em grade densa o A* ganha; em grade muito esparsa o custo da heurística+heap do A* pode ser superado pela fila FIFO O(1) do BFS. **"Vantagem clara em nós, condicional em tempo."**
3. **JPS é melhor que A*?** Em **nós**, sempre (>99% em densa). Em **tempo**, **só em grades densas** — em esparsas a sondagem perpendicular o torna mais lento. Use JPS quando o gargalo for **nº de expansões** (grades grandes e densas).
4. **DFS — velocidade vs qualidade?** Greedy DFS é o mais **rápido** (menos nós) mas **subótimo** (caminhos 15% maiores). DFS puro é inviável. Trade-off explícito: velocidade × qualidade são conflitantes.
5. **Ambientes dinâmicos?** A falha na Etapa 2 do teste dinâmico **não foi bug** — a célula-destino estava genuinamente isolada (todos os algoritmos falharam igual). Lição: precisa de **verificação de conectividade prévia** (BFS O(V)) e, para obstáculos móveis, **D* Lite**.

---

## 8. Perguntas prováveis da banca + respostas prontas

**P: Por que JavaScript e não C++, se C++ é mais rápido?**
R: Justamente porque a literatura toda já mede em C++. A lacuna é o navegador. Devs indie publicam jogos web e não têm referência de desempenho nesse ambiente — onde o V8, o JIT e o GC mudam o comportamento. Minha contribuição é preencher essa lacuna específica.

**P: Se todos rodam em <2 ms, qual o sentido prático de comparar?**
R: Nas escalas testadas o tempo não é o gargalo — e isso já é um resultado importante (derruba a estimativa de 50 ms do anteprojeto). Mas a escala é **linear**: projetando para centenas de NPCs ou grades muito maiores, o orçamento de 16 ms vira restritivo. Aí o número de nós expandidos (onde JPS ganha) e a qualidade do caminho passam a decidir.

**P: Por que o JPS, expandindo 99% menos nós, às vezes é mais lento?**
R: Porque "nós expandidos" e "tempo de relógio" são métricas diferentes. Minha variante 4-direcional faz uma **sondagem perpendicular a cada célula do salto** — um custo constante por passo que o JPS 8-direcional clássico não tem. Em grade esparsa as varreduras são longas e esse custo não é amortizado pelas poucas expansões economizadas. Em grade densa as varreduras encurtam e a economia aparece também no tempo.

**P: Seu JPS é realmente ótimo? Você adaptou para 4 direções.**
R: A prova de otimalidade original é para 8 direções, então a minha variante **não herda a prova**. Por isso validei **empiricamente**: em todos os cenários o JPS achou caminhos de comprimento idêntico ao A* e ao BFS (39 células), o que confirma a otimalidade na prática para os mapas testados.

**P: Por que Dijkstra é mais lento que BFS se expandem o mesmo número de nós?**
R: Não é a heurística — nenhum dos dois usa. É a estrutura de dados: Dijkstra usa heap binário (extração O(log n)) e BFS usa fila FIFO (dequeue O(1)). Em grade de custo uniforme os dois exploram igual, mas o BFS paga menos por operação.

**P: O DFS não deveria usar pouca memória? Você disse que usa O(V).**
R: O DFS canônico recursivo usa O(profundidade). Mas minha implementação usa um `Set` de visitados e um `Map` `cameFrom`, ambos O(V), para evitar ciclos e reconstruir o caminho com robustez. Foi uma troca consciente: abri mão da vantagem de memória em favor de corretude e de não estourar a pilha.

**P: Por que medir em lote? Não dá pra cronometrar uma busca?**
R: Não com precisão. O Chrome limita `performance.now()` a ~100 µs por segurança (anti-Spectre). Uma busca dura menos que isso, então sairia como zero ou ruído. Repetindo K vezes numa janela >25 ms e dividindo, eu trago a medida para acima do piso de resolução. O desvio-padrão ficou <0,01 ms nas buscas isoladas.

**P: Qual a aplicação real disso?**
R: Um dev indie fazendo um jogo top-down no navegador pode usar este simulador como referência: para até dezenas de NPCs em grades pequenas, qualquer dos cinco serve em tempo; ele deve escolher por qualidade de caminho (A*/JPS para ótimo, Greedy DFS se velocidade > qualidade). Para muitos agentes ou grades grandes, JPS reduz expansões, e obstáculos móveis pedem D* Lite.

**P: Por que a Etapa 2 do teste dinâmico falhou?**
R: Não foi falha de algoritmo. A semente de obstáculos isolou a célula (20,20). Todos os algoritmos retornaram null igualmente, depois de explorar todo o espaço alcançável — comportamento correto. Isso evidenciou a necessidade de checar conectividade antes (BFS) para não desperdiçar uma busca exaustiva.

**P: O que você faria diferente / trabalhos futuros?**
R: (1) **D* Lite** para replanejamento incremental em ambientes com obstáculos móveis; (2) **HPA*** (hierárquico) para mapas muito grandes; (3) **amortização temporal** — replanejar alguns NPCs por quadro em vez de todos; (4) verificação de conectividade prévia.

---

## 9. Limitações do trabalho (saiba admiti-las com elegância)

1. **Sem detecção de conectividade prévia** → busca exaustiva quando o destino é inalcançável.
2. **Custo escala com o número de agentes** (linear) → pode pesar em grades grandes com replanejamento a cada quadro.
3. **Hardware único** → os **tempos** não são generalizáveis (mas nós e comprimento sim, por serem determinísticos).
4. **JPS adaptado a 4 direções** → otimalidade validada empiricamente, não provada formalmente.
5. **Ambiente estático predominante** → obstáculos móveis (caso realista) não foram o foco; ficam para D* Lite.

> Dica de postura: nunca esconda limitação. Apresente cada uma **já com a mitigação/trabalho futuro ao lado**. Banca pune quem esconde, premia quem antecipa.

---

## 10. Glossário rápido (para não travar)

- **Pathfinding:** busca do menor caminho entre dois pontos num grafo/grade.
- **NPC:** personagem não jogável (controlado pela IA do jogo).
- **Grade uniforme:** matriz onde cada passo tem custo igual (1).
- **Nó expandido:** nó retirado da lista aberta e processado.
- **Lista aberta / fechada:** abertos = a explorar; fechados = já processados.
- **Heap binário / fila de prioridade:** estrutura que entrega o menor elemento em O(log n).
- **Heurística admissível:** estimativa que nunca superestima → garante ótimo.
- **Distância de Manhattan:** |Δx| + |Δy|; ideal para movimento 4-direcional.
- **Jump point:** célula com vizinho forçado onde o JPS "para" de saltar.
- **Vizinho forçado:** vizinho cujo caminho ótimo obriga a passar pelo nó atual (por um obstáculo).
- **Poda de simetria:** descartar caminhos equivalentes de mesmo custo.
- **JIT (Just-In-Time):** compilação em tempo de execução do V8; melhora após warm-up.
- **PRNG (mulberry32):** gerador pseudoaleatório determinístico (semente fixa = resultado repetível).
- **D* Lite:** algoritmo de replanejamento incremental para ambientes dinâmicos.
- **HPA*:** pathfinding hierárquico para mapas grandes.

---

## 11. Checklist final antes da defesa

- [ ] Sei contar a "história em 30 segundos" sem ler.
- [ ] Sei explicar cada um dos 5 algoritmos e dizer se é ótimo/usa heurística/memória.
- [ ] Sei a diferença A* vs JPS e **por que JPS às vezes é mais lento**.
- [ ] Decorei: 39 células, 16 ms, 3 vs 399 nós (>99%), <2 ms para 50 NPCs.
- [ ] Sei provar a admissibilidade de Manhattan.
- [ ] Sei por que Dijkstra é mais lento que BFS com os mesmos nós.
- [ ] Sei explicar a medição em lote e por que ela foi necessária.
- [ ] Testei a **demo ao vivo** (simulador online) e tenho plano B (vídeo/print) se a internet falhar.
- [ ] Sei admitir cada limitação já com o trabalho futuro correspondente.
- [ ] Repositório e URL abertos numa aba antes de começar.
