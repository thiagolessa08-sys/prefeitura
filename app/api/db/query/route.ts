import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { agentQuery } from '@/lib/agent'

export async function POST(req: NextRequest) {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const { sql, limit } = await req.json()
    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({ error: 'Campo sql obrigatório' }, { status: 400 })
    }

    // Bloqueia qualquer coisa além de SELECT no proxy também
    const normalized = sql.trim().toUpperCase()
    if (!normalized.startsWith('SELECT') && !normalized.startsWith('WITH')) {
      return NextResponse.json({ error: 'Apenas SELECT é permitido' }, { status: 403 })
    }

    const result = await agentQuery(sql, limit ?? 500)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
