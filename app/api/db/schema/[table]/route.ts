import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { agentSchema } from '@/lib/agent'

export async function GET(_req: NextRequest, { params }: { params: { table: string } }) {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  try {
    const columns = await agentSchema(params.table)
    return NextResponse.json({ columns })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
