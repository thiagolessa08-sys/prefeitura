import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { listSchemaTables } from '@/lib/agent'

export async function GET() {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const tables = await listSchemaTables()
    return NextResponse.json({ tables })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
