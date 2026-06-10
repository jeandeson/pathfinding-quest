# Roteiro de Apresentação — Defesa do TCC
### Slide a slide: o que falar, em que ordem, com qual transição

> **Tempo-alvo:** ~15–18 min de fala + demo. Ritmo: ~40–50 s por slide de conteúdo, mais rápido nas capas de seção.
> **Regra de ouro:** o slide é apoio, não roteiro. **Olhe para a banca, não para a tela.** Nunca leia o slide — comente-o.
> **Como usar:** a parte "🎙️ Fala" é o que dizer (não decore palavra por palavra, capte a ideia). "⏱️" é o tempo sugerido. "➡️ Transição" é a ponte para o próximo slide.

---

## ABERTURA (antes do slide 1)
Respire. Cumprimente a banca:
> "Bom dia/boa tarde. Sou Jeandeson Nascimento, e vou apresentar meu trabalho de conclusão: uma análise comparativa de algoritmos de pathfinding para NPCs em jogos 2D rodando no navegador. Orientação do professor Gilson Amorim Carvalho."

---

## SLIDE 1 — Capa ⏱️ 30 s
🎙️ **Fala:** Apresente título, seu nome e a frase de gancho:
> "São cinco algoritmos no foco — A*, Dijkstra, BFS, DFS e Jump Point Search — e a pergunta central é simples: **qual deles usar num jogo web, e quanto custa de verdade rodar cada um no navegador?**"

➡️ **Transição:** "Vou seguir esta agenda."

---

## SLIDE 2 — Agenda / Roteiro ⏱️ 20 s
🎙️ **Fala:** Passe rápido pelos 5 blocos sem detalhar:
> "Começo pela introdução — contexto e objetivos; depois o referencial dos cinco algoritmos; a metodologia, com o simulador que desenvolvi; os resultados dos benchmarks; e fecho com os trade-offs e trabalhos futuros."

➡️ **Transição:** "Começando pela introdução."

---

## SLIDE 3 — Divisória "01 — Introdução" ⏱️ 5 s
🎙️ Só anuncie: "Primeiro, o problema que motivou o trabalho." (Não pare aqui.)

---

## SLIDE 4 — Contexto e Problema ⏱️ 60 s
🎙️ **Fala:**
> "Jogos combinam regras e mundos fictícios, e em jogos de exploração o movimento inteligente dos NPCs é essencial para a experiência. Hoje o dev indie tem IA pronta em motores como Unity e Phaser — mas falta uma referência de **desempenho real** de pathfinding **no navegador**, onde quem executa é o motor V8 do JavaScript."
>
> "Daí a pergunta de pesquisa:" — aponte o destaque — **"qual algoritmo escolher para ambientes web 2D, e qual o custo real de execução no navegador?"**
>
> "Os números à direita resumem o escopo: **5 algoritmos, 4 cenários de benchmark, motor V8, e o número que vai voltar o tempo todo — 16 ms, o orçamento de um quadro a 60 fps**."

➡️ **Transição:** "Por que isso é uma lacuna? É a justificativa."

---

## SLIDE 5 — Justificativa ⏱️ 55 s
🎙️ **Fala:**
> "A literatura clássica de pathfinding mede quase tudo em C++ ou compilação nativa. O JavaScript introduz variabilidade **pouco documentada**: o JIT compila progressivamente, o garbage collector causa pausas, e mitigações de segurança como a do Spectre limitam até a precisão do relógio. A lacuna específica é a comparação **A* vs JPS em ambiente web**."
>
> "Além da análise, entrego um **artefato funcional**: o simulador está hospedado online — a banca pode reproduzir tudo sem instalar nada. Inclusive farei uma **demonstração ao vivo** daqui a pouco."

➡️ **Transição:** "Esses são os objetivos formais."

---

## SLIDE 6 — Objetivos ⏱️ 45 s
🎙️ **Fala:** Leia o objetivo geral de forma resumida e cite os 5 específicos rápido:
> "O objetivo geral é comparar o desempenho dos cinco algoritmos num ambiente 2D com obstáculos, via simulador em TypeScript. Os específicos foram: **estudar** os princípios, **implementar do zero** sem bibliotecas, **disponibilizar** o simulador online, **avaliar** por métricas — tempo, nós, caminho e sucesso — e **validar** a admissibilidade da heurística de Manhattan."

➡️ **Transição:** "Vamos ao referencial — os cinco algoritmos."

---

## SLIDE 7 — Divisória "02 — Referencial Teórico" ⏱️ 5 s
🎙️ "Agora, o que é cada algoritmo."

---

## SLIDE 8 — Tabela dos 5 algoritmos ⏱️ 75 s
🎙️ **Fala:** Esta é a tabela-mãe. Percorra coluna a coluna, sem ler célula por célula:
> "Resumindo numa tabela: **Dijkstra** é a base de toda busca informada — ótimo, sem heurística, mas explora uniformemente e gasta memória. **BFS** usa fila FIFO e garante o menor número de passos em grades de custo uniforme. **DFS**, na minha variante Greedy, usa pilha e é rápido, mas dá caminhos subótimos. **A*** é o marco: combina custo real e heurística em f(n) = g(n) + h(n). E o **JPS** pula simetrias em corredores — brilha em grades densas."
>
> "O recado da literatura é que **a escolha do algoritmo impacta diretamente o desempenho** conforme o cenário."

➡️ **Transição:** "Dois deles merecem um olhar mais de perto — A* e JPS, que são o foco."

---

## SLIDE 9 — A* e JPS em foco ⏱️ 75 s
🎙️ **Fala:**
> "O **A*** concilia o Dijkstra com busca heurística informada. A fórmula **f(n) = g(n) + h(n)** equilibra custo real e estimativa — e, com heurística admissível como a distância de Manhattan, ele **garante o caminho ótimo**."
>
> "O **JPS** é uma otimização do A*: ele poda simetrias e salta até os jump points, eliminando vizinhos redundantes. O resultado mais forte do trabalho está aqui: em densidade 0,4, ele expande **3 nós contra 399 do A* — mais de 99% de redução**, mantendo a otimalidade. Importante: **adaptei o JPS para movimento 4-direcional** neste trabalho."

➡️ **Transição:** "Como medi tudo isso? Metodologia."

---

## SLIDE 10 — Divisória "03 — Metodologia" ⏱️ 5 s
🎙️ "Agora, como o trabalho foi construído e medido."

---

## SLIDE 11 — Stack e ambiente ⏱️ 70 s
🎙️ **Fala:** Não leia a lista inteira; destaque as escolhas e o **porquê**:
> "A stack é TypeScript 5, bundler Vite, renderização em **Canvas 2D nativo — de propósito, sem framework de jogo**, para não inserir variáveis externas no desempenho. **Zero bibliotecas de pathfinding**: implementei os cinco do zero."
>
> "O benchmark roda em Chrome headless. E o ponto metodológico mais importante é o **protocolo de reprodutibilidade**: como o relógio do Chrome tem resolução limitada por segurança, uso **medição em lote** — repito a busca muitas vezes numa janela cronometrada e divido — em 10 janelas, com **PRNG de semente fixa**. Isso garante que **nós e comprimento de caminho são idênticos em qualquer máquina**; só o tempo depende do hardware."

➡️ **Transição:** "E o artefato central é o simulador — que vou mostrar agora."

---

## SLIDE 12 — Simulador / DEMO AO VIVO ⏱️ 2–3 min ⭐
🎙️ **Fala + ação:** Este é o momento de maior impacto. **Abra o simulador ao vivo** (`pathfinding-quest-j95b.vercel.app`).
> "Este é o simulador. Vou selecionar o algoritmo dos NPCs aqui... clico no mapa para definir o destino e eles traçam o caminho. Apertando **D**, ativo o debug visual: aparecem a grade e os custos das células. E há um **modo benchmark** que gera os gráficos que vou mostrar a seguir."

**Roteiro da demo (faça nesta ordem):**
1. Mostre um NPC achando caminho com **A***.
2. Troque para **DFS** e mostre o caminho mais sinuoso/longo.
3. Ative **debug (D)** para mostrar a grade.
4. Se houver tempo, mostre o modo benchmark.

> ⚠️ **Plano B:** se a internet falhar, tenha um **vídeo de tela gravado** ou prints. Nunca dependa só da rede ao vivo. Diga: "Caso a conexão oscile, tenho uma gravação."

➡️ **Transição:** "Esses são os cenários que testei."

---

## SLIDE 13 — Cenários de teste ⏱️ 40 s
🎙️ **Fala:** Apresente os 4 cenários rapidamente:
> "Foram quatro cenários: **densidade de obstáculos** numa grade 20×20; **múltiplos NPCs** — 50 simultâneos; **congestionamento**, com um corredor central forçado em 30×30; e **objetivos dinâmicos** em 40×40, com replanejamento em etapas."

➡️ **Transição:** "Vamos aos resultados."

---

## SLIDE 14 — Divisória "04 — Resultados" ⏱️ 5 s
🎙️ "Os números." (avance)

---

## SLIDE 15 — Resultados: Obstáculos ⏱️ 70 s
🎙️ **Fala:** Foque nos 3 destaques:
> "Primeiro destaque, e o mais marcante: na grade 20×20 em densidade 0,4, o **A* expande 399 nós e o JPS apenas 3 — 99,2% menos**. A poda de simetrias do JPS é dramática quando há muitos obstáculos."
>
> "Segundo: em **tempo**, todos os algoritmos ficam em **menos de 1 ms por busca** — ordens de grandeza abaixo dos 16 ms do quadro."
>
> "Terceiro: o **DFS** paga o preço da velocidade — caminho **15% mais longo**, 45 células contra as 39 ótimas."

➡️ **Transição:** "E quando colocamos muitos NPCs ao mesmo tempo?"

---

## SLIDE 16 — Resultados: Escalabilidade ⏱️ 55 s
🎙️ **Fala:**
> "Aqui está a escalabilidade no corredor 30×30 com 50 NPCs. A ordem de tempo é: DFS 0,71 ms, BFS 1,25, A* 1,28, JPS 1,71 e Dijkstra 2,05. O custo **cresce linearmente** com o número de NPCs, porque cada NPC faz uma busca independente — o motor é single-thread."
>
> "O ponto-chave: mesmo o mais lento fica **bem abaixo dos 16 ms**."

➡️ **Transição:** "Vendo o gargalo do corredor de perto."

---

## SLIDE 17 — Resultados: Congestionamento ⏱️ 50 s
🎙️ **Fala:**
> "No cenário de gargalo — todos os NPCs convergindo para o mesmo corredor — o DFS é o mais rápido com 0,71 ms e o Dijkstra o mais lento com 2,05. A conclusão prática é importante: **mesmo com 50 NPCs disputando o corredor, todos cabem folgadamente no quadro**. A diferença entre eles está no **número de nós expandidos, não na viabilidade** de rodar em tempo real."

➡️ **Transição:** "Juntando tudo, quais são os trade-offs?"

---

## SLIDE 18 — Comparativo / Trade-offs ⏱️ 60 s
🎙️ **Fala:**
> "Os trade-offs ficam claros. O **JPS** vence em nós expandidos — redução acima de 99% em alta densidade —, mas sua vantagem **de tempo** só aparece em grades densas. O **A*** é o melhor equilíbrio geral: robusto e referência da literatura. E o **DFS Greedy** entrega só velocidade — caminhos 15% mais longos, então serve quando a qualidade do caminho não é prioridade."

➡️ **Transição:** "Concluindo."

---

## SLIDE 19 — Divisória "05 — Conclusão" ⏱️ 5 s
🎙️ "Os pontos-chave do trabalho."

---

## SLIDE 20 — Pontos-chave ⏱️ 70 s
🎙️ **Fala:** Os 4 achados, com convicção:
> "Quatro conclusões. **Um:** o orçamento de 16 ms é atendido com folga — a estimativa inicial de 50 ms por busca do anteprojeto estava errada em mais de uma ordem de grandeza; com 50 NPCs, todos rodam em menos de 2 ms. **Dois:** o JPS confirma a vantagem em nós expandidos, acima de 99% em grades densas. **Três:** o A* segue como referência geral, com a admissibilidade de Manhattan validada. **Quatro:** o DFS puro é inviável em tempo real, e mesmo o Greedy dá caminhos 15% mais longos."
>
> "Em uma frase: **nas escalas testadas, o gargalo não é o frame rate — é o número de nós e a qualidade do caminho que decidem a escolha.**"

➡️ **Transição:** "Limitações e o que vem depois."

---

## SLIDE 21 — Limitações e direções futuras ⏱️ 55 s
🎙️ **Fala:** Mostre maturidade — admita limitações já com a solução:
> "Três limitações honestas: não há **detecção de conectividade prévia**, então uma busca para destino inalcançável é exaustiva; o **custo escala com o número de agentes**; e os tempos vêm de um **hardware único**, não generalizáveis."
>
> "As direções futuras endereçam isso: **D* Lite** para replanejamento incremental em ambientes com obstáculos móveis; **HPA*** para mapas grandes; e **amortização temporal** — replanejar parte dos NPCs por quadro em vez de todos."

➡️ **Transição:** "Com isso, encerro e agradeço."

---

## SLIDE 22 — Agradecimento ⏱️ 20 s
🎙️ **Fala:**
> "Obrigado pela atenção. O simulador e o código estão disponíveis nos links em tela, e fico à disposição da banca para as perguntas."

(Deixe o slide com os links visível durante a arguição — facilita se pedirem para rever a demo.)

---

## DICAS DE EXECUÇÃO (leia antes de subir)

**Tempo:**
- Se estiver atrasado, **corte tempo nos slides 8, 16 e 17** (são reforço). **Nunca corte a demo (12)** nem a conclusão (20).
- Marque mentalmente: ao terminar a metodologia (slide 11) você deve estar por volta da metade do tempo.

**Postura:**
- Fale para a **banca**, não para o slide nem para o computador.
- Pause após cada número de impacto (3 vs 399; <2 ms). Deixe assentar.
- Não diga "é simples/óbvio" — pode soar arrogante diante da banca.

**Demo (slide 12):**
- Abra a URL e o repositório em abas **antes** de começar a apresentação.
- Teste o "D" de debug antes. Tenha vídeo/prints de backup.

**Arguição (depois):**
- Para perguntas, use o **ROTEIRO_DE_ESTUDO.md, seção 8** — já tem as respostas prontas.
- Se não souber algo: "Essa é uma boa observação; não testei esse caso específico, mas pela escala linear medida eu esperaria que..." — raciocine em voz alta, não invente número.
- Tenha à mão: 39 células · 16 ms · 3 vs 399 nós · <2 ms para 50 NPCs.

**Frase de efeito para fechar respostas difíceis:**
> "O trabalho não busca o algoritmo 'melhor' em absoluto, mas mostrar que a escolha depende do gargalo: tempo, nós expandidos ou qualidade de caminho — e medir isso no navegador, que a literatura ignora."
