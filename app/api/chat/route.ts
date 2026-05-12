import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { agentQuery } from '@/lib/agent'
import { getSchemaContext } from '@/lib/schema-cache'
import { getCatalog, catalogToPromptContext } from '@/lib/catalog-cache'
import { REGRAS_NEGOCIO } from '@/lib/regras-negocio'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'executar_query',
    description: 'Executa uma query SELECT no Sybase IQ. Use APENAS para buscar dados — nunca para explorar metadados do banco.',
    input_schema: {
      type: 'object',
      properties: {
        sql: { type: 'string', description: 'Query SELECT válida para Sybase IQ' },
        limit: { type: 'number', description: 'Máximo de linhas (padrão 200)' },
      },
      required: ['sql'],
    },
  },
]

function buildSystemPrompt(schemaContext: string, catalogContext: string): string {
  return `Você é um analista de dados sênior da Prefeitura de Arujá (SP).
Seu trabalho é RESPONDER PERGUNTAS DE NEGÓCIO com dados reais do banco Sybase IQ.

══════════════════════════════════════════
PROIBIDO — NUNCA FAÇA ISSO:
══════════════════════════════════════════
✗ Consultar SYS.SYSTAB, SYS.SYSTABCOL, INFORMATION_SCHEMA ou qualquer tabela de metadados
✗ Rodar queries de "exploração" para descobrir tabelas ou colunas
✗ Fazer mais de 3 queries por resposta
✗ Responder sem interpretar os dados (não liste só os resultados — analise)
✗ Usar LIMIT (Sybase IQ usa TOP N)
✗ Usar UPPER() ou LOWER() para comparar strings
✗ Consultar tabelas sem o prefixo pref_aruja_sp.

══════════════════════════════════════════
VOCÊ JÁ SABE TUDO SOBRE O BANCO:
══════════════════════════════════════════
O schema completo está listado abaixo. Leia-o, identifique as tabelas certas e execute a query diretamente.
NÃO faça queries para descobrir o schema — ele está aqui.

══════════════════════════════════════════
SINTAXE OBRIGATÓRIA — SYBASE IQ:
══════════════════════════════════════════
• TOP N:        SELECT TOP 20 col FROM pref_aruja_sp.TABELA  (nunca LIMIT)
• Datas:        YEAR(col), MONTH(col), DATEFORMAT(col,'yyyy-mm-dd')
• Cast:         CONVERT(NUMERIC,col) ou CAST(col AS NUMERIC)
• Nulos:        ISNULL(col, 0)
• Concatenar:   col1 || ' ' || col2
• Sem GROUP_CONCAT: use LIST(col, ',')
• Nomes de colunas: use EXATAMENTE como estão no schema (case-sensitive)
• Se a query falhar: leia o erro, corrija e tente de novo (máx 2 tentativas)

══════════════════════════════════════════
REGRAS DE NEGÓCIO — ANO / EXERCÍCIO:
══════════════════════════════════════════
• NUNCA use YEAR(NOW()) para filtrar dados orçamentários — o relógio retorna 2026 mas os dados são de 2025.
• O exercício mais recente com dados é 2025. Use SEMPRE: WHERE d.NO_ANO = 2025
• Se o usuário pedir "ano atual" ou "este ano" sem especificar, use 2025.
• Se quiser confirmar o ano mais recente disponível, rode antes:
    SELECT MAX(NO_ANO) FROM pref_aruja_sp.DIM_BIORC_DATA_CALENDARIO
  e use esse valor no filtro.

══════════════════════════════════════════
REGRAS DE NEGÓCIO — DIM_BIORC_INSTITUCIONAL:
══════════════════════════════════════════
• SECRETARIAS da prefeitura = poder executivo: CD_ORGAO = 1 E DS_UO <> DS_ORGAO
• CD_ORGAO = 2 → Câmara Municipal (poder LEGISLATIVO) — NÃO é secretaria da prefeitura
• CD_ORGAO negativo (-1, -2, -3) → registros sem classificação — excluir de análises
• Quando DS_UO = DS_ORGAO → linha genérica do órgão inteiro, NÃO uma secretaria específica
• SEMPRE que a pergunta for sobre "secretarias" ou "por secretaria":
    use: AND i.CD_ORGAO = 1 AND i.DS_UO <> i.DS_ORGAO

══════════════════════════════════════════
COMO RESPONDER:
══════════════════════════════════════════
1. Identifique as tabelas relevantes no schema abaixo
2. Execute a query (máx 2-3 queries por resposta)
3. ANALISE os resultados: destaque os números mais importantes, tendências, comparações
4. Responda em português com tabela markdown quando houver dados tabulares
5. Mostre a query SQL usada em bloco \`\`\`sql para o usuário poder reutilizar
6. Se o dado não existir, diga claramente qual tabela foi consultada e o que encontrou

${REGRAS_NEGOCIO}
══════════════════════════════════════════
${catalogContext ? catalogContext + '\n\n' : '⚠️  Catálogo semântico não gerado ainda. Acesse /catalogo para gerar.\n\n'}══════════════════════════════════════════
SCHEMA TÉCNICO COMPLETO — pref_aruja_sp:
══════════════════════════════════════════
${schemaContext}
══════════════════════════════════════════`
}

export async function POST(req: NextRequest) {
  const session = getSession()
  if (!session) return new Response('Não autenticado', { status: 401 })

  const { messages, forceRefreshSchema } = await req.json()

  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  async function send(payload: object) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
  }

  async function run() {
    try {
      const schemaContext = await getSchemaContext(forceRefreshSchema ?? false)
      const catalog = getCatalog()
      const catalogContext = catalog ? catalogToPromptContext(catalog) : ''
      const systemPrompt = buildSystemPrompt(schemaContext, catalogContext)

      const msgs: Anthropic.MessageParam[] = [...messages]
      let queryCount = 0
      const MAX_QUERIES = 3

      for (let turn = 0; turn < 8; turn++) {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: systemPrompt,
          tools: queryCount >= MAX_QUERIES ? [] : TOOLS, // bloqueia mais queries se atingir limite
          messages: msgs,
        })

        for (const block of response.content) {
          if (block.type === 'text' && block.text) {
            await send({ type: 'text', text: block.text })
          }
        }

        if (response.stop_reason === 'end_turn') break

        if (response.stop_reason === 'tool_use') {
          msgs.push({ role: 'assistant', content: response.content })
          const toolResults: Anthropic.ToolResultBlockParam[] = []

          for (const block of response.content) {
            if (block.type !== 'tool_use' || block.name !== 'executar_query') continue

            queryCount++
            const input = block.input as { sql: string; limit?: number }

            await send({ type: 'tool_start', name: 'executar_query', sql: input.sql })

            let resultContent: string
            try {
              const result = await agentQuery(input.sql, input.limit ?? 200)
              resultContent = JSON.stringify(result)
              await send({ type: 'tool_end', name: 'executar_query', rows: result.count })
            } catch (e) {
              resultContent = JSON.stringify({ error: String(e) })
              await send({ type: 'tool_end', name: 'executar_query', error: String(e) })
            }

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: resultContent,
            })
          }

          msgs.push({ role: 'user', content: toolResults })
        }
      }
    } catch (e) {
      await send({ type: 'error', text: `Erro: ${String(e)}` })
    } finally {
      await send({ type: 'done' })
      await writer.close()
    }
  }

  run()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
