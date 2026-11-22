# Roteiro de Apresentação — Defesa do TCC
### Versão pós-devolutiva de 18/09/2026: 17 slides de conteúdo + 5 divisórias de seção + slides de apoio

> **Tempo-alvo:** cerca de 16 minutos de fala, já com a demonstração (2:30). Cabe em uma defesa de 15–20 minutos.
> **Regra de ouro:** o slide é apoio, não roteiro. **Olhe para a banca, não para a tela.** Nunca leia o slide: comente-o.
> **Onde está a fala:** cada slide tem a fala resumida nas **anotações do orador** do PowerPoint. No modo Apresentador (Alt+F5) elas aparecem só para você.

**Sobre a numeração.** As cinco divisórias de seção, que a devolutiva apontou como ponto forte, continuam no deck. Com elas, os slides voltam a ter os mesmos números do deck avaliado: o simulador é o **12**, "Nós expandidos" é o **15** e "Escalabilidade" é o **16**, exatamente os que o professor citou.

---

## 1. Três termos, sempre iguais

A devolutiva apontou termos misturados. Na fala, no slide e no artigo, use **só** estes:

| Diga | Nunca diga |
|---|---|
| **DFS-Greedy** (variante adotada) | "Greedy DFS", "DFS (Greedy)", "DFS puro" |
| **nós expandidos** | "nós visitados" |
| **16 ms/quadro (60 fps)** | "16,67 ms" solto, "50 ms" |

Quando precisar falar do DFS clássico, sem heurística, diga **"DFS canônico"**. O valor exato do quadro (1000 ÷ 60 ≈ 16,67 ms) só aparece no slide de apoio 37, que explica o arredondamento.

---

## 2. Tabela de tempos (para o ensaio cronometrado)

| Slide | Título | Duração | Acumulado |
|---|---|---|---|
| 1 | Capa | 0:35 | 0:35 |
| 2 | Agenda | 0:20 | 0:55 |
| 3 | Divisória 01: Introdução | 0:05 | 1:00 |
| 4 | Problema | 1:00 | 2:00 |
| 5 | Objetivos | 0:45 | **2:45** |
| 6 | Divisória 02: Referencial Teórico | 0:05 | 2:50 |
| 7 | Os 5 algoritmos | 1:00 | 3:50 |
| 8 | A\* | 0:50 | 4:40 |
| 9 | JPS | 1:00 | **5:40** |
| 10 | Divisória 03: Metodologia | 0:05 | 5:45 |
| 11 | Ambiente de medição | 0:55 | 6:40 |
| 12 | Simulador (demonstração) | 2:30 | 9:10 |
| 13 | Cenários de teste | 0:40 | **9:50** |
| 14 | Divisória 04: Resultados | 0:05 | 9:55 |
| 15 | Nós expandidos | 1:05 | 11:00 |
| 16 | Escalabilidade | 0:55 | 11:55 |
| 17 | 50 NPCs simultâneos | 0:50 | 12:45 |
| 18 | Trade-offs | 1:00 | **13:45** |
| 19 | Divisória 05: Conclusão | 0:05 | 13:50 |
| 20 | Conclusões | 1:10 | 15:00 |
| 21 | Limitações e futuro | 0:55 | 15:55 |
| 22 | Obrigado + QR codes | 0:20 | **16:15** |

**Pontos de controle** (olhe o relógio só nestes momentos):

- fim da Introdução (slide 5): **2:45**
- fim do Referencial (slide 9): **5:40**
- fim da Metodologia (slide 13): **9:50**, mais da metade do tempo
- fim dos Resultados (slide 18): **13:45**

**As divisórias custam 5 segundos cada (25 s no total).** A devolutiva avisou que elas consomem tempo; por isso cada uma leva só a frase de passagem. Não pare nelas.

**Se o limite for de 15 minutos cravados**, corte nesta ordem: demonstração de 2:30 para 1:30 (pule o passo 5), slide 17 em 30 s, slide 13 em 25 s. Total: cerca de 14:40. Se ainda faltar tempo, oculte as cinco divisórias (botão direito no slide → **Ocultar Slide**): ganha mais 25 s e **a numeração dos outros slides não muda**. **Nunca corte** os slides 15 (resultado principal) e 20 (conclusões).

### Ensaio de referência (já feito, por síntese de voz)

O roteiro foi cronometrado com a voz em português do Windows lendo a fala de cada slide em ritmo normal (`apresentacao/tools/ensaio_cronometrado.ps1`):

- **Fala medida: 9:03** (915 palavras). Com a demonstração de 2:30, o total é **11:33**.
- O plano é de 16:15, então sobram cerca de **4:40 para pausas, apontar gráficos e transições**. Cabe em 15 minutos mesmo falando devagar.
- Nenhuma fala passa do tempo do seu slide. A mais justa é a da capa (30 s de fala para 35 s de slide): não improvise ali.
- O resultado por slide está em `apresentacao/ensaio/ensaio_cronometrado.csv`. Com `-Audio`, o script grava a fala de cada slide em `.wav`, para treinar ouvindo.

Isso mede o texto, não você. O seu ritmo, com as pausas, só aparece nos ensaios abaixo.

### Como ensaiar

1. Abra **`apresentacao/ensaio/ensaio.html`** (dois cliques; abre no navegador). A página mostra o slide, a fala e dois cronômetros: o do slide, com a meta dele, e o total. Aperte **Espaço** para começar e para avançar. No fim ela mostra a tabela "planejado × realizado", marca os slides em que você estourou e guarda o resultado de cada ensaio.
2. Faça **três ensaios completos**, em voz alta, em pé, com a demonstração no slide 12. Ao terminar cada um, a página salva o resultado na pasta de downloads; o comando `node registrar_ensaios.mjs` (em `apresentacao/tools`) preenche a ficha abaixo. A coluna "Ajuste" é sua: anote o que vai mudar para o ensaio seguinte.

<!-- ensaios:inicio -->
| Ensaio | Data | Tempo total | Slides acima da meta | Ajuste |
|---|---|---|---|---|
| 1º | | | |  |
| 2º | | | |  |
| 3º | | | |  |

<!-- ensaios:fim -->

3. No terceiro ensaio, peça para alguém fazer as três perguntas da seção 4 e responda indo ao slide de apoio (número + Enter).
4. Um ensaio final no próprio PowerPoint, em modo Apresentador (Alt+F5), para acostumar com as anotações e o controle.

---

## 3. Slide a slide

### Abertura (antes do slide 1)
Respire. Cumprimente a banca.

### Slide 1 — Capa (0:35)
> "Bom dia. Sou Jeandeson Nascimento e apresento meu trabalho de conclusão: uma análise comparativa de algoritmos de pathfinding para NPCs em jogos 2D no navegador, orientado pelo professor Gilson Amorim Carvalho."
>
> "São cinco algoritmos e uma pergunta: **qual usar em um jogo web, e quanto custa, de verdade, rodar cada um no navegador?**"

Transição: "Vou seguir esta agenda."

### Slide 2 — Agenda (0:20)
> "Cinco blocos: introdução, o referencial dos cinco algoritmos, a metodologia com o simulador que desenvolvi, os resultados dos benchmarks e a conclusão."

Dica: cada seção abre com um slide divisório.

### Slide 3 — Divisória 01: Introdução (0:05)
> "Começo pelo problema."

Não pare aqui: diga a frase e avance.

### Slide 4 — Problema (1:00)
> "Em jogos de exploração, o movimento inteligente dos NPCs sustenta a experiência. O desenvolvedor independente tem IA pronta em Unity e Phaser, mas a literatura mede pathfinding em C++ e código nativo. No navegador quem executa é o motor V8: compilação JIT, coletor de lixo e um relógio de resolução limitada mudam o custo real."
>
> "A lacuna específica é a comparação A\* contra JPS em JavaScript. Daí a pergunta de pesquisa:" (aponte o cartão e leia).

Transição: "Para responder, estes foram os objetivos."

### Slide 5 — Objetivos (0:45)
> "O objetivo geral é comparar o desempenho dos cinco algoritmos em um ambiente 2D com obstáculos. Os específicos: **estudar** os princípios, **implementar** do zero, **disponibilizar** o simulador online, **avaliar** por tempo, nós expandidos, comprimento do caminho e taxa de sucesso, e **validar** a admissibilidade da heurística de Manhattan."

**[controle: 2:45]**

### Slide 6 — Divisória 02: Referencial Teórico (0:05)
> "Primeiro, os cinco algoritmos."

### Slide 7 — Os 5 algoritmos (1:00)
Não leia célula por célula.
> "Dijkstra é a base: ótimo, sem heurística. O BFS explora camada por camada e garante o menor número de passos. O DFS entra na **variante adotada, o DFS-Greedy**: uma pilha guiada pela distância de Manhattan, rápida, mas sem garantia de caminho ótimo. O A\* soma custo real e estimativa. E o JPS é o A\* com saltos."
>
> "As cores dos quadradinhos são as mesmas dos gráficos."

Transição: "Dois deles são o foco: A\* e JPS."

### Slide 8 — A\* (0:50)
> "O A\* concilia o Dijkstra com a busca heurística. A função f(n) soma g(n), o custo real desde a origem, com h(n), a estimativa até o objetivo. Com heurística admissível, que nunca superestima, o caminho é o ótimo. Em grade de quatro direções, a distância de Manhattan cumpre esse papel."

Transição: "O JPS parte daí."

### Slide 9 — JPS (1:00)
> "Mesmo mapa, dois algoritmos. O A\* expande as nove células do corredor, uma a uma. O JPS salta em linha reta e só para em um **ponto de salto**: a célula P, onde o fim do obstáculo cria um vizinho forçado. São 2 nós expandidos em vez de 9, e o mesmo caminho."
>
> "O JPS original usa oito direções. Neste trabalho ele foi **adaptado para quatro direções**."

**[controle: 5:40]**

### Slide 10 — Divisória 03: Metodologia (0:05)
> "Como medi tudo isso?"

### Slide 11 — Ambiente de medição (0:55)
> "Três decisões. Implementação em TypeScript com Canvas 2D nativo, sem framework de jogo e sem biblioteca de pathfinding. Medição em Chrome headless: como o relógio do navegador tem resolução de cerca de 0,1 ms, cada busca é repetida em lote, em dez janelas. E reprodutibilidade: com sementes fixas, nós expandidos e caminhos são idênticos em qualquer máquina; só o tempo depende do hardware."

Transição: "O artefato central é o simulador."

### Slide 12 — Simulador: demonstração ao vivo (2:30)
Abra o simulador (aba já aberta antes de começar). Faça nesta ordem:

1. No menu, selecione o algoritmo dos NPCs.
2. Inicie o jogo e **clique no mapa**: o caminho é traçado até o destino.
3. Aperte a tecla **D**: aparecem a grade e os custos f de cada célula.
4. Troque para o DFS-Greedy (tecla 4 para o jogador, R para os inimigos) e mostre o caminho mais longo.
5. Se houver tempo, abra o **modo benchmark**: no menu, "Executar Benchmark" e depois "Executar Testes".

A demonstração foi executada e cronometrada no simulador publicado. Três coisas para saber antes de fazê-la ao vivo:

- **Os inimigos perseguem você.** Com o jogador parado, o jogo acabou em 12 a 25 segundos em duas de três partidas. Explique enquanto clica; se aparecer "Game Over", use "Jogar novamente".
- **Não há tecla para voltar ao menu durante o jogo.** Volte pelo botão "Menu principal" da tela de fim de jogo ou recarregue a página (F5, cerca de 2 segundos).
- **O modo benchmark leva cerca de 45 segundos**, e a tela fica parada enquanto roda. Fale dos cenários enquanto espera. Com isso, os passos 1 a 4 cabem em 1:30 e os cinco, em 2:30.

> **Plano B:** se a rede falhar, fique no slide 12 (ele mostra as duas telas com os quatro pontos) e diga: "Tenho uma gravação; sigo pelos slides."

Transição: "Estes foram os cenários medidos."

### Slide 13 — Cenários de teste (0:40)
> "Quatro cenários: densidade de obstáculos em grade 20×20; múltiplos NPCs, com 50 buscas simultâneas; congestionamento, com todos convergindo para um corredor central em grade 30×30; e objetivos dinâmicos em grade 40×40. Em todos, as mesmas quatro métricas."

**[controle: 9:50]**

### Slide 14 — Divisória 04: Resultados (0:05)
> "Aos resultados."

### Slide 15 — Nós expandidos (1:05)
> "O resultado mais marcante. Em grade 20×20 com densidade 0,4, A\*, Dijkstra e BFS expandem 399 nós. O JPS, **três**. Redução de 99,2%." (pausa)
>
> "Obstáculos densos criam vizinhos forçados, e poucos pontos de salto ligam origem e destino. O caminho continua ótimo: 39 células, igual ao do A\*."

Transição: "E quando são muitos NPCs ao mesmo tempo?"

### Slide 16 — Escalabilidade (0:55)
> "Corredor 30×30, de 5 a 50 NPCs convergindo para o mesmo gargalo. O gráfico mostra o A\*, o JPS e o limite de 16 ms por quadro. O tempo cresce em linha reta, porque cada NPC faz uma busca independente. Com 50 NPCs, o A\* usa 1,28 ms: 8% do quadro. Mesmo o mais lento, o Dijkstra, fica em 2,05 ms."

Transição: "Na grade 20×20, com os cinco lado a lado:"

### Slide 17 — 50 NPCs simultâneos (0:50)
> "Cinquenta buscas no mesmo quadro, e todos terminam em menos de 2 ms. No pior caso, 10% do orçamento de 16 ms por quadro. Nestas escalas, a taxa de quadros não decide a escolha do algoritmo."
>
> "Repare que o JPS não é o mais rápido aqui."

Transição: "É o que o próximo slide explica."

### Slide 18 — Trade-offs (1:00)
> "Lendo por linha. O A\* tem caminho ótimo e bom tempo. O JPS expande metade dos nós do A\*, 3.500 contra 7.100, e ainda assim é mais lento: nesta grade pequena e esparsa, as sondagens de cada salto custam mais do que os nós poupados. O DFS-Greedy é o mais rápido, 0,51 ms, mas o caminho tem 45 células contra 39: 15% mais longo."
>
> "Nenhum vence em tudo. A escolha depende do gargalo."

**[controle: 13:45]**

### Slide 19 — Divisória 05: Conclusão (0:05)
> "Concluindo."

### Slide 20 — Conclusões (1:10)
> "Quatro respostas. **Um:** o orçamento de 16 ms por quadro é atendido com folga; a estimativa inicial de 50 ms por busca era folgada em mais de uma ordem de grandeza. **Dois:** o JPS confirma a vantagem em nós expandidos, acima de 99% em grades densas. **Três:** o A\* segue como a referência de equilíbrio. **Quatro:** o DFS-Greedy é o mais rápido, mas não garante o caminho ótimo."
>
> "Em uma frase: **nas escalas testadas, o gargalo não é a taxa de quadros; são os nós expandidos e a qualidade do caminho que decidem.**"

### Slide 21 — Limitações e futuro (0:55)
> "Três limitações, cada uma com a saída. Sem verificação prévia de conectividade, um destino isolado provoca busca exaustiva: basta checar antes. O A\* não tem memória: a cada mudança no mapa refaz a busca inteira; o D\* Lite replaneja só o que mudou. E o custo cresce com agentes e mapa: HPA\* e amortização entre quadros."
>
> "Além disso, os tempos vêm de um único hardware."

A última frase não está no slide: diga de memória.

### Slide 22 — Obrigado + QR codes (0:20)
> "Obrigado pela atenção. O simulador e o código estão nos QR codes: é só apontar a câmera. Fico à disposição da banca."

Deixe este slide na tela durante a arguição.

---

## 4. Arguição: perguntas prováveis e respostas prontas

Para ir a um slide de apoio durante a apresentação: **digite o número e aperte Enter**. Os slides de apoio começam no 24 (o 23 é a divisória "Slides de apoio").

### As três perguntas que o orientador antecipou

**"Por que o JPS não foi mais rápido?"** → slide **24 · JPS × tempo**
> "Porque o JPS reduz nós expandidos, não necessariamente tempo. Na minha adaptação para quatro direções, cada célula percorrida no salto dispara duas sondagens perpendiculares. Em grade pequena e esparsa essas sondagens são longas e custam mais do que os nós poupados: 1,06 ms contra 0,95 ms do A\*, mesmo com metade dos nós. Em grade densa os obstáculos encurtam as sondagens: em 40×40 com densidade 0,4 o JPS leva 0,06 ms contra 0,24 ms, quatro vezes mais rápido."

**"Por que usar DFS?"** → slide **25 · DFS-Greedy**
> "Como linha de base clássica, para mostrar em números o conflito entre velocidade de busca e qualidade do caminho. O DFS canônico gerava rotas que se afastavam do objetivo, inviável para NPCs. Por isso a variante adotada, o DFS-Greedy: os vizinhos são ordenados pela distância de Manhattan antes de empilhar. Ele é o mais rápido, 0,51 ms com 50 NPCs, mas entrega 45 células contra 39 do ótimo."

**"Qual a limitação do A\* em ambientes dinâmicos?"** → slide **26 · A\* dinâmico**
> "O A\* que implementei não tem memória: cada replanejamento recria a lista aberta e zera os custos de todas as células. Mudou uma célula, recalcula tudo. Nas escalas medidas isso cabe com folga, mas projetando 50 NPCs replanejando a cada quadro em grade 40×40 densa, são cerca de 12 dos 16 ms do quadro. As saídas são o D\* Lite, o A\* fatiado entre quadros e o HPA\*."

### Outras perguntas prováveis

| Pergunta | Resposta em uma frase | Slide |
|---|---|---|
| Seu JPS é realmente ótimo? | A prova original é para 8 direções; a minha variante foi validada empiricamente: mesmos comprimentos do A\* em todos os cenários. | 27 · JPS em 4 direções |
| Pode mostrar o código? | Laço principal do A\* e rotina de salto do JPS, com linhas reais do repositório. | 28 · Código: A\* e 29 · Código: JPS |
| E os números completos? | Tabelas de 20×20, 40×40, múltiplos NPCs e objetivos dinâmicos, e o gráfico com os cinco algoritmos. | 30 a 34 |
| E em grades maiores? | Em 40×40 densa o JPS expande 3 nós contra 1.599 do A\* e também vence em tempo. | 31 · Tabela: grade 40×40 |
| Por que a etapa 2 do teste dinâmico falhou? | O destino estava isolado pelos obstáculos; os três algoritmos responderam corretamente que não há caminho. | 34 · Objetivos dinâmicos |
| Por que medir em lote? | O relógio do Chrome tem resolução de cerca de 0,1 ms, maior que a duração de uma busca. | 35 · Protocolo de medição |
| Por que Manhattan é admissível? | Cada passo cardeal reduz a distância em no máximo 1; logo h nunca superestima. | 36 · Heurística de Manhattan |
| O quadro não é 16,67 ms? | Sim: 1000 ÷ 60. Adotei 16 ms/quadro, arredondando para baixo, que é o critério mais exigente. | 37 · 16 ms/quadro |
| Por que JavaScript e não C++? | Porque a literatura já mede em C++; a lacuna é o navegador, onde o dev indie publica. | 4 · Problema |
| Se todos ficam abaixo de 2 ms, por que comparar? | Porque a escala é linear: com centenas de agentes ou grades maiores, nós expandidos e qualidade do caminho passam a decidir. | 17 · 50 NPCs simultâneos e 18 · Trade-offs |
| Por que o Dijkstra é mais lento que o BFS com os mesmos nós? | Pela estrutura de dados: heap binário, O(log n), contra fila FIFO, O(1). | 32 · Tabela: múltiplos NPCs |
| O DFS não deveria gastar pouca memória? | O canônico sim; a variante adotada mantém conjunto de visitados e mapa de origem, O(V), em troca de robustez. | 25 · DFS-Greedy |

**Se não souber:** "Não testei esse caso específico; pela escala linear medida, eu esperaria que..." Raciocine em voz alta, não invente número.

---

## 5. Antes de subir

**Equipamento**
- Abra o simulador e o repositório em abas, antes de começar. Teste a tecla D.
- Tenha um vídeo curto da demonstração gravado (plano B).
- **Teste os dois QR codes do slide 22 com o seu celular, na sala, com o projetor ligado**, a partir do fundo da sala. Eles foram conferidos por decodificação automática (inclusive com a imagem reduzida, desfocada e com pouco contraste), mas a leitura na tela real depende do projetor e da luz da sala, e isso só se confere lá. Se algum falhar, o endereço está escrito ao lado do código. Os dois endereços abrem em celular sem login: o repositório é público e o simulador cabe na tela e responde ao toque (menu, iniciar, tocar no mapa); a tecla D e a troca de algoritmo do jogador pedem teclado.

<!-- qr:inicio -->

| Teste dos QR codes com o celular | Data | Resultado |
|---|---|---|
| Em um monitor, antes da defesa | 22/11/2026 | Feito por mim, com a câmera do celular: os dois abriram (simulador e repositório) |
| Na sala, com o projetor | | repetir ao chegar, do fundo da sala |

<!-- qr:fim -->


**Postura**
- Fale para a banca. Pause depois de cada número de impacto (3 contra 399; menos de 2 ms).
- Não diga "é simples" ou "é óbvio".

**Números na ponta da língua**
- 39 células (ótimo) e 45 (DFS-Greedy, 15% a mais)
- 399 contra 3 nós expandidos (99,2% a menos)
- menos de 2 ms para 50 NPCs; 16 ms/quadro (60 fps)
- A\* 0,95 ms, JPS 1,06 ms, DFS-Greedy 0,51 ms (50 NPCs, 20×20)

**Frase para fechar respostas difíceis**
> "O trabalho não busca o algoritmo melhor em absoluto; mostra que a escolha depende do gargalo (tempo, nós expandidos ou qualidade do caminho) e mede isso no navegador, onde a literatura quase não mede."
