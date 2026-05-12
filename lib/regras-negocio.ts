/**
 * Regras de negócio que a IA deve seguir antes de executar qualquer consulta.
 * Adicione novas regras aqui — elas são injetadas automaticamente no system prompt.
 */

export const REGRAS_NEGOCIO = `
══════════════════════════════════════════
REGRAS DE NEGÓCIO — OBRIGATÓRIAS
══════════════════════════════════════════

## REGRA 1 — RECEITA: sempre mostrar bruta, deduções e líquida

Toda vez que o usuário perguntar sobre receita (arrecadação, receita total, receita por tributo,
receita por secretaria, etc.), você DEVE apresentar TRÊS valores no resultado:

  1. Receita Bruta     → filtro: CD_TIPO_NATUREZA_RECEITA = 1  (DS = "Receita")
  2. Deduções          → filtro: CD_TIPO_NATUREZA_RECEITA = 2  (DS = "Dedução")
  3. Receita Líquida   → Bruta + Deduções

ATENÇÃO: os valores de dedução (CD=2) já são armazenados como NEGATIVOS no banco.
Por isso a receita líquida é Bruta + Deduções (não Bruta - Deduções).
Exemplo: bruta R$ 80M + deduções R$ -7M = líquida R$ 73M. NUNCA subtraia as deduções.

A tabela de resultado deve sempre ter as três colunas, por exemplo:
  | secretaria | receita_bruta | deducoes | receita_liquida |

Join obrigatório para aplicar o filtro:
  JOIN pref_aruja_sp.DIM_BIORC_TIPO_NATUREZA_RECEITA tn
    ON f.SK_TIPO_NATUREZA_RECEITA = tn.SK_TIPO_NATUREZA_RECEITA

Query modelo para receita com as três colunas:
  SELECT
    SUM(CASE WHEN tn.CD_TIPO_NATUREZA_RECEITA = 1 THEN f.VL_ARRECADACAO_RECEITA ELSE 0 END) AS receita_bruta,
    SUM(CASE WHEN tn.CD_TIPO_NATUREZA_RECEITA = 2 THEN f.VL_ARRECADACAO_RECEITA ELSE 0 END) AS deducoes,
    SUM(f.VL_ARRECADACAO_RECEITA) AS receita_liquida
  FROM pref_aruja_sp.FATO_BIORC_EXECUCAO_RECEITA f
  JOIN pref_aruja_sp.DIM_BIORC_TIPO_NATUREZA_RECEITA tn
    ON f.SK_TIPO_NATUREZA_RECEITA = tn.SK_TIPO_NATUREZA_RECEITA
  JOIN pref_aruja_sp.DIM_BIORC_DATA_CALENDARIO d
    ON f.SK_DATA_CALENDARIO_ANO = d.SK_DATA_CALENDARIO
  WHERE d.NO_ANO = 2025

NUNCA retorne apenas um valor total de receita sem mostrar bruta e líquida separadamente.
`
