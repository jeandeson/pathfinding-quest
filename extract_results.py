# analisar_resultados.py
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import json

# =======================
# 1. Carregar os dados
# =======================
with open("testes.json", "r", encoding="utf-8") as f:
    data = json.load(f)

df = pd.DataFrame(data)

# =======================
# 2. Estatísticas gerais
# =======================
print("\n📊 Estatísticas gerais por algoritmo:")
print(df.groupby("algorithm")[["timeMs", "nodesVisited", "pathLength"]].mean().round(2))

# =======================
# 3. Filtrar tipos de teste
# =======================
obstaculos = df[df["testName"] == "Mapas com Obstáculos"]
escalabilidade = df[df["testName"] == "Escalabilidade"]
congestionamento = df[df["testName"] == "Congestionamento"]

sns.set(style="whitegrid", context="talk")

# =======================
# 4. Gráfico 1 — Eficiência por Densidade de Obstáculos
# =======================
plt.figure(figsize=(10,6))
sns.lineplot(
    data=obstaculos[obstaculos["success"]],
    x="obstacleDensity", y="timeMs", hue="algorithm", marker="o"
)
plt.title("Desempenho por Densidade de Obstáculos")
plt.xlabel("Densidade de Obstáculos")
plt.ylabel("Tempo de Execução (ms)")
plt.legend(title="Algoritmo")
plt.tight_layout()
plt.savefig("grafico_obstaculos_tempo.png", dpi=300)
plt.close()

# =======================
# 5. Gráfico 2 — Nós Visitados vs Densidade
# =======================
plt.figure(figsize=(10,6))
sns.lineplot(
    data=obstaculos[obstaculos["success"]],
    x="obstacleDensity", y="nodesVisited", hue="algorithm", marker="o"
)
plt.title("Nós Visitados por Densidade de Obstáculos")
plt.xlabel("Densidade de Obstáculos")
plt.ylabel("Nós Visitados")
plt.legend(title="Algoritmo")
plt.tight_layout()
plt.savefig("grafico_obstaculos_nos.png", dpi=300)
plt.close()

# =======================
# 6. Gráfico 3 — Taxa de Sucesso por Densidade
# =======================
taxa_sucesso = (
    obstaculos.groupby(["algorithm", "obstacleDensity"])["success"]
    .mean()
    .reset_index()
)
plt.figure(figsize=(10,6))
sns.lineplot(
    data=taxa_sucesso,
    x="obstacleDensity", y="success", hue="algorithm", marker="o"
)
plt.title("Taxa de Sucesso por Densidade de Obstáculos")
plt.xlabel("Densidade de Obstáculos")
plt.ylabel("Taxa de Sucesso")
plt.tight_layout()
plt.savefig("grafico_obstaculos_sucesso.png", dpi=300)
plt.close()

# =======================
# 7. Gráfico 4 — Escalabilidade (tempo × NPCs)
# =======================
plt.figure(figsize=(10,6))
sns.lineplot(
    data=escalabilidade,
    x="npcCount", y="timeMs", hue="algorithm", marker="o"
)
plt.title("Escalabilidade — Tempo Médio por Número de NPCs")
plt.xlabel("Número de NPCs")
plt.ylabel("Tempo (ms)")
plt.legend(title="Algoritmo")
plt.tight_layout()
plt.savefig("grafico_escalabilidade.png", dpi=300)
plt.close()

# =======================
# 8. Gráfico 5 — Congestionamento (tempo × densidade)
# =======================
plt.figure(figsize=(10,6))
sns.barplot(
    data=congestionamento,
    x="obstacleDensity", y="timeMs", hue="success"
)
plt.title("Teste de Congestionamento — Sucesso e Tempo Médio")
plt.xlabel("Densidade de Obstáculos (gargalo)")
plt.ylabel("Tempo (ms)")
plt.tight_layout()
plt.savefig("grafico_congestionamento.png", dpi=300)
plt.close()

# =======================
# 9. Conclusão e resumo
# =======================
print("\n✅ Gráficos salvos:")
print(" - grafico_obstaculos_tempo.png")
print(" - grafico_obstaculos_nos.png")
print(" - grafico_obstaculos_sucesso.png")
print(" - grafico_escalabilidade.png")
print(" - grafico_congestionamento.png")
