# Dashboard Receita Municipal — Design Spec

**Data:** 2026-05-19  
**Status:** Aprovado  
**Rota:** `/receita`

## Objetivo
Página de dashboard de Receitas do Município com KPIs, gráfico mensal com meta vs realizado, donut por categoria, tabela histórica e barras por origem. Dados mock; estrutura pronta para conectar ao Sybase IQ.

## API
`GET /api/receita?ano=N` retorna JSON único com 5 blocos.

## Layout
- Sidebar azul (igual às outras páginas), link "Receita" como 2º item do nav
- 5 KPI cards: Orçado (azul-marinho), Orçado Atualizado, Arrecadação Mês, Acumulado (bege), Mês Anterior
- Row 2 (60/40): BarChart 2 séries (meta cinza + realizado azul) com pills de ano | Donut categorias + legenda %
- Row 3 (60/40): Tabela histórica 5 colunas (MESES+4 anos) | BarChart horizontal origens
- Skeleton loaders, toggle tema, botões decorativos
