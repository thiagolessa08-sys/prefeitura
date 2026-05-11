import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getCatalog } from '@/lib/catalog-cache'

// Catálogo agora é estático (lib/catalog.json) — endpoint retorna status
export async function POST() {
  try {
    const session = getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const catalog = getCatalog()
    if (!catalog) {
      return NextResponse.json({ error: 'Catálogo não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({ done: true, tabelas: catalog.entradas.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
