# PULSA — FONTE ÚNICA DE VERDADE
Atualizado em 18/10/2026. Este documento consolida decisões explícitas do proprietário e deve prevalecer sobre sugestões antigas, resumos isolados e implementações divergentes. Alterações metodológicas exigem aprovação explícita.

## Modelo padrão vigente (aprovado em 17/10/2026)
- Média nacional de segundo turno Lula × Flávio Bolsonaro.
- Universo aprovado: 14 institutos, apenas a rodada mais recente elegível de cada instituto na média atual.
- Peso-base IGUAL entre institutos. **Não** usar erro histórico do primeiro turno para ponderar o modelo padrão.
- Recência: decaimento exponencial, meia-vida de 7 dias, tomando o fim do trabalho de campo como referência.
- Discrepâncias: tolerância de 2,5 pontos percentuais em relação à referência robusta; reduzir peso somente sobre o excedente, sem excluir automaticamente pesquisas. Parâmetros numéricos exatos da penalização devem ser conferidos no código e nos commits aprovados antes de qualquer alteração.
- Não mudar metodologia, parâmetros, universo ou tratamento de dados sem confirmação expressa.
- Exibir pesos efetivos, fontes, datas, desvio padrão ponderado entre institutos, extremos e metodologia; distinguir dispersão de margem de erro e de intervalo de confiança.
- Faixa de ±3 p.p. é ilustração de sensibilidade, **não** margem de erro ou intervalo de confiança estatístico.

## Dados e histórico
- Preservar histórico completo das rodadas, com fontes, registros, datas de publicação e coleta.
- Apenas a rodada mais recente por instituto entra na média vigente; não duplicar institutos.
- Séries históricas não podem usar resultados divulgados depois da data histórica representada.
- Sem pesquisa nova verificada ou correção material, não produzir falsa mudança de média.
- Não inserir dados não verificados como confirmados; identificar pendências documentais.
- Pesquisas novas de 18/10 devem ser conferidas em suas fontes e refletidas no painel de modo consistente, sem alterar método.

## Tendências e projeções
- Separar média observacional, curva suavizada experimental e simulação condicional até 25/10.
- Evitar junções artificiais entre curvas calculadas por métodos distintos.
- Atualizar data corrente do eixo sem inventar pesquisa nem coleta diária.
- Não tratar extrapolação como previsão de vencedor.
- Quando histórico for insuficiente, indicar limitação em vez de inventar pontos.

## Publicação e validação
- Antes de editar: ler este documento, o código, os dados, a metodologia exibida e as decisões recentes.
- Mudanças de dados e correções de bugs não autorizam alterar fórmula ou universo.
- Validar testes de sintaxe, resultados numéricos, navegação, gráficos, datas e versão publicada; diferenciar commit GitHub de site efetivamente atualizado.
- Nunca reativar silenciosamente modelos anteriores.
- Havendo conflito entre chats, documentação e código, interromper mudança metodológica e esclarecer antes de publicar.

## Modelos históricos — NÃO ATIVAR
- Modelo antigo de 7 institutos com peso proporcional a 1/(1+erro absoluto médio histórico do primeiro turno): substituído; serve apenas como histórico.
- Modelos intermediários de 9 e 11 institutos: substituídos pelo padrão de 14 institutos.
- Números de médias históricas desses modelos não são intercambiáveis com a média do modelo vigente.

## Estado a conferir
- A implementação em produção e os dados devem ser auditados contra estas regras; este documento não é certificado de que o site está correto.
- A penalização exata de discrepâncias e a integridade do histórico devem ser auditadas em código, sem modificar critérios durante a auditoria.
