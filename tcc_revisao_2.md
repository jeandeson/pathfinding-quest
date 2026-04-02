# Alterações para Revisão 2 — TCC Pathfinding Quest

**Autor:** Jeandeson Souza Nascimento  
**Orientação:** Revisão 1 recebida em 23/03/2026  
**Data das alterações:** 23/03/2026 – 02/04/2026

---

## Índice

1. [Resumo / Abstract](#1-resumo--abstract)
2. [Introdução e Justificativa](#2-introdução-e-justificativa)
3. [Objetivos](#3-objetivos)
4. [Referencial Teórico](#4-referencial-teórico)
5. [Metodologia](#5-metodologia)
6. [Resultados e Discussão](#6-resultados-e-discussão)
7. [Conclusão](#7-conclusão)
8. [Formatação e Texto](#8-formatação-e-texto)
9. [Artefato Funcional](#9-artefato-funcional)

---

## 1. Resumo / Abstract

**Comentário do orientador:** Tempo verbal futuro ("espera-se"); contradição entre a meta de 50ms e os resultados reais (~0,4ms); ausência de menção ao artefato funcional entregue.

### Alterações em `tcc.md`

| Localização | Antes | Depois |
|-------------|-------|--------|
| `\begin{abstract}` (linha ~67) | Usava "espera-se" (futuro) | Reescrito em tempo passado: "foram implementados", "demonstraram", "foi desenvolvido" |
| Abstract (linha ~68) | Meta de 50ms citada como objetivo sem contexto | "mais de 100× abaixo da meta inicial de 50ms" — resultado explicado |
| Abstract (linha ~68) | Sem menção ao simulador | "Um simulador interativo e funcional foi desenvolvido e disponibilizado online" |
| `\begin{resumo}` (linha ~72) | Mesmos problemas em português | Mesmas correções aplicadas ao resumo em PT-BR |

---

## 2. Introdução e Justificativa

**Comentário do orientador:** JPS e caching prometidos na justificativa mas não entregues nos resultados; contribuição científica fraca ("por que comparar A* com DFS em 2024?"); foco excessivo na indústria.

### Alterações em `tcc.md`

| Localização | Antes | Depois |
|-------------|-------|--------|
| `\subsection{Justificativa}` (~linha 95) | JPS citado como lacuna a preencher, mas ausente nos resultados | JPS implementado e testado — justificativa alinhada com resultados |
| Justificativa (~linha 98–100) | Contribuição vaga; sem diferencial acadêmico | Parágrafo adicionado: diferencial é a análise em ambiente web/JS, onde motor V8 introduz variações não observadas em C++ |
| Justificativa (~linha 100–102) | Sem menção ao artefato como justificativa acadêmica | "O projeto também se justifica pela entrega de um artefato funcional acessível..." |

---

## 3. Objetivos

**Comentário do orientador:** Objetivo geral focado no produto ("desenvolver um sistema"); específicos sem validação científica; sem objetivo explícito sobre entrega do app funcional.

### Alterações em `tcc.md`

| Localização | Antes | Depois |
|-------------|-------|--------|
| `\subsection{Objetivo Geral}` (~linha 82) | "Desenvolver um sistema de IA..." | "Analisar comparativamente o desempenho dos algoritmos..." — foco em análise |
| `\subsection{Objetivos Específicos}` (~linha 85–93) | 4 objetivos técnicos sem validação | 5 objetivos: adicionados (3) entrega do simulador com URL pública e (5) validar admissibilidade da heurística de Manhattan |

---

## 4. Referencial Teórico

**Comentário do orientador:** Seção lê como revisão de literatura sem crítica ao estado da arte; JPS e Hierarchical citados mas não implementados; poucas referências pós-2015.

### Alterações em `tcc.md` e `refs.bib`

| Localização | Antes | Depois |
|-------------|-------|--------|
| `\subsection{Algoritmos de Pathfinding}` (~linha 105–106) | Sem referências recentes | Adicionado: "Revisões sistemáticas recentes confirmam..." com `\cite{alsalami2022}` e `\cite{salem2024}` |
| `\subsection{Otimizações e Variantes do A*}` (~linha 171) | Item Anytime A* sem citação | `\cite{barbehenn1995}` adicionado |
| `\subsection{Justificativa}` (~linha 96) | Sem referência a NPC e experiência do jogador | `\cite{moon2022}` adicionado |
| `\subsection{Otimizações e Variantes do A*}` (~linha 175–183) | JPS mencionado mas não implementado | JPS implementado (Seção 3); texto atualizado referenciando Seção~3 |
| `\subsection{Depth-First Search (DFS)}` (~linha 117) | `\subsection{Depth-First Search (DFS}` — parêntese faltando | Corrigido: `\subsection{Depth-First Search (DFS)}` |

### Alterações em `refs.bib`

| Chave | Ação | Motivo |
|-------|------|--------|
| `alsalami2022` | Adicionada | Revisão sistemática de pathfinding em jogos (2022) |
| `salem2024` | Adicionada | Estudo comparativo de algoritmos para jogos (2024) |
| `barbehenn1995` | Adicionada | Base para Anytime A* |
| `moon2022` | Adicionada | NPC e dificuldade dinâmica (2022) |
| `rahim2018` | Corrigida: `@inproceedings` → `@article` | É publicado em journal (Journal of Physics) |
| `rabin2015` | Corrigida: `@book` → `@incollection` com author e pages | Capítulo específico dentro do livro |
| `hart1968`, `dijkstra1959`, `tarjan1972` | DOIs adicionados | Completar metadados bibliográficos |
| `millington2009` | Publisher mantido como Morgan Kaufmann | CRC Press seria incorreto para essa edição |

---

## 5. Metodologia

**Comentário do orientador:** Hardware e browser não especificados; número de iterações ausente; app não descrito como produto final acessível.

### Alterações em `tcc.md`

| Localização | Antes | Depois |
|-------------|-------|--------|
| `\subsection{Ambiente de Testes e Reprodutibilidade}` (~linha 201–214) | Seção inexistente | Criada com: hardware (Intel Core i5-10300H, 16 GB RAM, SSD NVMe), Chrome 124 (V8), `performance.now()` `\cite{w3c2023}`, sementes determinísticas |
| Metodologia (~linha 214) | Sem URL do projeto | GitHub e Vercel linkados: `\url{https://github.com/jeandeson/pathfinding-quest}` e `\url{https://pathfinding-quest-j95b.vercel.app/}` |
| `\section{Resultados}` intro (~linha 471) | "10 execuções por configuração" | "sementes determinísticas fixas — resultados idênticos em qualquer execução" |

---

## 6. Resultados e Discussão

**Comentário do orientador:** Contradição BFS mais rápido que A* não explicada; falha do A* no teste dinâmico não discutida; conclusão genérica; tabelas com dados inconsistentes ou incompletos.

### Alterações em `tcc.md`

#### 6.1 Seção 4.2 — Mapas com Obstáculos

| Localização | Antes | Depois |
|-------------|-------|--------|
| Texto (~linha 477) | "JPS apresentou o menor número de nós visitados" | Explicação do comportamento dependente de densidade: mais nós em grades esparsas (sondagens perpendiculares), menos nós em grades densas (vizinhos forçados) |
| Tabela 1 (~linha 479–493) | Valores antigos (JPS=94 nós, densidade 0,1–0,2 média) | Valores reais densidade 0,2: A*=103, BFS=284, JPS=272, DFS=51 células |
| Nova Tabela densidade 0,4 (~linha 509–523) | Inexistente | Adicionada: A*=399 nós vs JPS=79 nós — contraste que mostra vantagem do JPS |
| Parágrafo após tabela (~linha 495) | Afirmava JPS reduz nós em grades pequenas | Reescrito: overhead da heurística e comportamento do JPS por densidade explicados |

#### 6.2 Seção 4.3 — Múltiplos NPCs

| Localização | Antes | Depois |
|-------------|-------|--------|
| Texto (~linha 507) | "JPS: 4.700 nós (94 por NPC) — menor que A*" | Corrigido: JPS=15.450 nós totais, mas 2× mais rápido (2,4ms vs 4,8ms do A*) — explicação da discrepância |
| Tabela 2 (~linha 509–523) | Valores antigos: JPS=4.700 nós, 0,9ms | Valores reais: JPS=15.450 nós, 2,4ms; A*=7.100 nós, 4,8ms; DFS=8.324, 7,6ms |
| Nova Figura 2 (~linha 548) | Inexistente | `escalabilidade_npcs.png` adicionada com legenda e `\label{fig:escalabilidade}` |

#### 6.3 Seção 4.4 — Escalabilidade

| Localização | Antes | Depois |
|-------------|-------|--------|
| Texto (~linha 525–526) | "extrapolação sugere crescimento quadrático" — sem dados | Reescrito com dados reais de 40×40: A*=487 nós (densidade 0,2), JPS=159 nós (densidade 0,4) |

#### 6.4 Seção 4.5 — Congestionamento

| Localização | Antes | Depois |
|-------------|-------|--------|
| Texto (~linha 528–529) | Só A* mencionado; DFS "não foi testado" | Todos os 5 algoritmos testados e discutidos |
| Tabela 3 (~linha 531–541) | Apenas A* na tabela | Expandida: todos os 5 algoritmos na densidade 0,2; nota de que 0,4 e 0,6 falham para todos |

#### 6.5 Seção 4.6 — Objetivos Dinâmicos

| Localização | Antes | Depois |
|-------------|-------|--------|
| Texto (~linha 543–544) | Só A* e JPS mencionados na discussão | Dijkstra adicionado — todos os três algoritmos comparados |
| Tabela 4 (~linha 548–563) | Valores antigos: A* Etapa 1=297 nós; JPS Etapa 1=141 nós | Valores reais: A*=408, JPS=1041, Dijkstra adicionado (1050, 1051, 774 nós) |

#### 6.6 Seção 4.7 — Análise de Eficiência

| Localização | Antes | Depois |
|-------------|-------|--------|
| Texto (~linha 565–566) | "JPS destaca-se como a abordagem mais eficiente em nós visitados" | Reescrito: vantagem real do JPS é em TEMPO (2× mais rápido com 50 NPCs) e em nós em grades densas |
| Nova Figura 3 (~linha 607) | Inexistente | `comparativo_geral.png` adicionada com legenda e `\label{fig:comparativo_geral}` |

#### 6.7 Seção 4.8 — Desempenho Computacional

| Localização | Antes | Depois |
|-------------|-------|--------|
| Texto (~linha 568–569) | "JPS obteve o menor número de nós visitados (94 por busca)" | Corrigido: comportamento por densidade; JPS 2× mais rápido para 50 NPCs |

#### 6.8 Seção 4.10 — DFS

| Localização | Antes | Depois |
|-------------|-------|--------|
| Texto (~linha 574–575) | "DFS: 320 nós, contra 94 do JPS" | Corrigido: DFS=63 nós (densidade 0,2) mas caminho subótimo (51 células vs ótimo 39); 8.324 nós / 7,6ms para 50 NPCs |

---

## 7. Conclusão

**Comentário do orientador:** Não respondia diretamente às hipóteses; claim genérico sobre JPS; números inconsistentes com resultados.

### Alterações em `tcc.md`

| Localização | Antes | Depois |
|-------------|-------|--------|
| `\textbf{Sobre a meta de 50ms}` (~linha 582) | "A* obteve 0,40ms... abaixo de 2ms para A* e 1ms para JPS" | Corrigido: 0,20ms (densidade 0,2); 50 NPCs: A*=4,8ms (0,096ms/NPC), JPS=2,4ms (0,048ms/NPC) |
| `\textbf{Sobre A* vs BFS}` (~linha 584) | "BFS (0,15ms) mais rápido que A* (0,40ms)" | Corrigido: ambos 0,20ms (densidade 0,2); A* visita menos nós (103 vs 284); diferença de tempo aparece em grades maiores |
| `\textbf{Sobre JPS}` (~linha 586) | "JPS reduziu nós em ~50% (94 vs 188)" | Reescrito: vantagem em grades densas (80% menos nós, densidade 0,4) e em tempo com múltiplos NPCs (2× mais rápido); otimalidade confirmada em todos os casos |

---

## 8. Formatação e Texto

**Comentário do orientador:** Erros de caracteres ("cieˆncia", "j o˜o"), palavras com aspas LaTeX malformadas, nomes próprios em minúsculo, erros tipográficos.

### Alterações em `tcc.md`

| Localização | Antes | Depois |
|-------------|-------|--------|
| Linha ~123 | `Hart, nilsson e Raphael` | `Hart, Nilsson e Raphael` |
| Linha ~123 | `. o A* rapidamente` | `. O A* rapidamente` |
| Linha ~128 | `o A é um algoritmo` | `O A* é um algoritmo` |
| Linha ~128 | `o algorimo dê` | `o algoritmo dê` |
| Linha ~129 | `do A é simbolizada` | `do A* é simbolizada` |
| Linha ~128 | `(HART; NILSSON; RAPHAEL, 1968)` | `\cite{hart1968}` — padronizado com o restante |
| Linha ~120 | `backtracking''` e `low-link''` (aspas quebradas) | `\textit{backtracking}` e `\textit{low-link}` |
| Linha ~117 | `\subsection{Depth-First Search (DFS}` | `\subsection{Depth-First Search (DFS)}` |

---

## 9. Artefato Funcional

**Comentário do orientador:** Paper não deixava claro como o app seria entregue na defesa; sem repositório ou URL linkados.

### Alterações em `tcc.md`

| Localização | Antes | Depois |
|-------------|-------|--------|
| Metodologia (~linha 214) | Sem links | `\url{https://github.com/jeandeson/pathfinding-quest}` — repositório público |
| Metodologia (~linha 214) | Sem URL de produção | `\url{https://pathfinding-quest-j95b.vercel.app/}` — simulador online |
| Abstract / Resumo | Sem menção ao simulador | "simulador interativo funcional desenvolvido e disponibilizado online" |
| Objetivo Específico 3 | Inexistente | "Desenvolver e disponibilizar um simulador interativo funcional... acessível por URL pública" |

---

## Imagens a adicionar no projeto LaTeX

| Arquivo | Origem | Onde referenciar no tcc.md |
|---------|--------|---------------------------|
| `comparacao_tempo_execucao.png` | Benchmark → Aba ① → Baixar PNG | `\ref{fig:comparacao_tempo_corrigida}` (já referenciada) |
| `escalabilidade_npcs.png` | Benchmark → Aba ② → Baixar PNG | `\ref{fig:escalabilidade}` (já referenciada) |
| `comparativo_geral.png` | Benchmark → Aba ⑤ → Baixar PNG | `\ref{fig:comparativo_geral}` (já referenciada) |

Para gerar: acessar `https://pathfinding-quest-j95b.vercel.app/`, executar o benchmark, navegar para cada aba e clicar em **⬇ Baixar PNG**.

---

## Alterações no código-fonte do simulador

Estas alterações foram feitas no repositório para suportar os novos dados do TCC:

| Arquivo | Alteração |
|---------|-----------|
| `src/utils/seededRandom.ts` | Criado — PRNG determinístico (mulberry32) para reprodutibilidade |
| `src/world/Grid.ts` | `generateObstacles(density, seed?)` — seed opcional para benchmarks |
| `src/benchmarks/BenchmarkRunner.ts` | Seeds fixos por suíte (1001+, 2001, 3000+, 4001) |
| `src/pathfinding/PathfindingSystem.ts` | JPS corrigido: `jpsProbe()` adicionado para sondagem perpendicular sem recursão; `jpsDirections()` simplificado para grades 4-direcionais |
| `src/scenes/BenchmarkScene.ts` | Botões "⬇ Baixar PNG" e "⬇ Exportar CSV" adicionados pós-execução |
