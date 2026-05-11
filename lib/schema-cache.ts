import { agentQuery, agentSchema } from './agent'

interface TableSchema {
  name: string
  columns: { name: string; type: string; nullable: boolean }[]
}

let cachedContext: string | null = null
let cachedAt: number = 0

// Carrega uma vez por processo (ou forçado)
export async function getSchemaContext(force = false): Promise<string> {
  // Usa cache enquanto o processo viver (dados são diários)
  if (cachedContext && !force) return cachedContext

  const tables = await loadAllSchemas()
  cachedContext = buildPromptContext(tables)
  cachedAt = Date.now()
  console.log(`[schema-cache] carregado: ${tables.length} tabelas em ${Date.now() - cachedAt + (Date.now() - cachedAt)}ms`)
  return cachedContext
}

async function loadAllSchemas(): Promise<TableSchema[]> {
  // Busca lista de tabelas do schema
  const listResult = await agentQuery(
    `SELECT table_name FROM sys.systable WHERE user_name(creator) = 'pref_aruja_sp' AND table_type IN ('BASE', 'VIEW') ORDER BY table_name`,
    1000
  )

  const tableNames = listResult.rows.map(r => String(r[0]))

  // Carrega schemas em paralelo (lotes de 10 para não sobrecarregar o agent)
  const schemas: TableSchema[] = []
  for (let i = 0; i < tableNames.length; i += 10) {
    const batch = tableNames.slice(i, i + 10)
    const results = await Promise.allSettled(
      batch.map(async name => {
        const cols = await agentSchema(`pref_aruja_sp.${name}`)
        return { name, columns: cols } as TableSchema
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled') schemas.push(r.value)
    }
  }

  return schemas
}

function buildPromptContext(tables: TableSchema[]): string {
  const lines: string[] = ['## Schema: pref_aruja_sp\n']

  for (const t of tables) {
    lines.push(`### ${t.name}`)
    for (const c of t.columns) {
      const nullable = c.nullable ? '' : ' NOT NULL'
      lines.push(`  - ${c.name} ${c.type}${nullable}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
