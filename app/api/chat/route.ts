import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { agentQuery } from '@/lib/agent'
import { getSchemaContext } from '@/lib/schema-cache'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'executar_query',
    description: 'Executa uma query SELECT no banco Sybase IQ (pref_aruja_sp) e retorna colunas, linhas e contagem. Apenas SELECT é permitido. Use sempre a sintaxe correta do Sybase IQ.',
    input_schema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'Query SELECT completa e válida para Sybase IQ',
        },
        limit: {
          type: 'number',
          description: 'Máximo de linhas (padrão 100, máximo 500)',
        },
      },
      required: ['sql'],
    },
  },
]

function buildSystemPrompt(schemaContext: string): string {
  return `Você é um especialista em análise de dados da Prefeitura de Arujá (SP), com acesso direto ao banco Sybase IQ (schema: pref_aruja_sp, banco: IQHML).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS OBRIGATÓRIAS — SYBASE IQ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. LIMITE de linhas: use TOP N logo após SELECT. NUNCA use LIMIT.
   ✓ SELECT TOP 100 col FROM tabela
   ✗ SELECT col FROM tabela LIMIT 100

2. CASE SENSITIVE: Sybase IQ diferencia maiúsculas/minúsculas em dados.
   - Nomes de colunas e tabelas: use EXATAMENTE como estão no schema abaixo.
   - NUNCA use UPPER() ou LOWER() para comparação de strings — use o valor exato.
   - Para buscas case-insensitive use: col LIKE '%valor%' (funciona case-insensitive para LIKE)

3. PREFIXO obrigatório em toda tabela: pref_aruja_sp.NOME_TABELA

4. TIPOS e CONVERSÕES:
   - Cast: CONVERT(tipo, valor) ou CAST(valor AS tipo)
   - Datas: YEAR(col), MONTH(col), DAY(col), DATEFORMAT(col, 'yyyy-mm-dd')
   - Concatenação: col1 || ' ' || col2  ou  STRING(col1, ' ', col2)

5. AGREGAÇÕES:
   - GROUP BY deve incluir todas as colunas não agregadas do SELECT
   - Em vez de STRING_AGG use LIST(col, ',')
   - HAVING funciona normalmente

6. SUBQUERIES e JOINs funcionam normalmente.

7. Datas: o formato padrão é 'YYYY-MM-DD'. Para o ano corrente: YEAR(NOW()).

8. NULL: use IS NULL / IS NOT NULL. Função: ISNULL(col, valor_default).

9. Se a query retornar erro, analise o erro, corrija e tente novamente (até 3 vezes).

10. Sempre ordene resultados relevantes com ORDER BY.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPORTAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Você já conhece o schema completo (listado abaixo). NÃO precisa descobrir tabelas — vá direto à query.
- Para perguntas de negócio (ex: "maiores despesas por secretaria"), identifique as tabelas relevantes no schema, monte a query correta e execute imediatamente.
- Responda em português brasileiro.
- Para resultados tabulares, use tabelas markdown.
- Mostre a query SQL executada em bloco de código sql para referência do usuário.
- Se não encontrar dados relevantes, explique quais tabelas poderiam ter a informação e o que foi tentado.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${schemaContext}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
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
      // Schema já em cache — 0 round-trips de descoberta
      const schemaContext = await getSchemaContext(forceRefreshSchema ?? false)
      const systemPrompt = buildSystemPrompt(schemaContext)

      const msgs: Anthropic.MessageParam[] = [...messages]
      let attempt = 0

      while (attempt < 6) {
        attempt++

        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: systemPrompt,
          tools: TOOLS,
          messages: msgs,
        })

        // Streama texto imediatamente
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
            if (block.type !== 'tool_use') continue

            if (block.name === 'executar_query') {
              const input = block.input as { sql: string; limit?: number }

              await send({ type: 'tool_start', name: 'executar_query', sql: input.sql })

              let resultContent: string
              try {
                const result = await agentQuery(input.sql, input.limit ?? 100)
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
