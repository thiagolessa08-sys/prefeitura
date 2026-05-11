import { NextResponse } from 'next/server'
import { agentHealth } from '@/lib/agent'

export async function GET() {
  try {
    const agentStatus = await agentHealth()
    return NextResponse.json({ status: 'ok', agent: agentStatus })
  } catch (e) {
    return NextResponse.json(
      { status: 'degraded', agent: 'offline', error: String(e) },
      { status: 503 }
    )
  }
}
