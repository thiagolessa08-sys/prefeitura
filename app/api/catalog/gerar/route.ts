import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { buildCatalog, isBuildInProgress } from '@/lib/catalog-cache'

export async function POST() {
  try {
    const session = getSession()
    if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    if (isBuildInProgress()) {
      return NextResponse.json({ error: 'Build já em andamento, aguarde.' }, { status: 409 })
    }

    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    async function send(msg: string) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ msg })}\n\n`))
    }

    async function run() {
      try {
        const catalog = await buildCatalog(send)
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ done: true, tabelas: catalog.entradas.length })}\n\n`)
        )
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[catalog/build]', msg)
        await writer.write(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
      } finally {
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
  } catch (e) {
    // Garante que nunca retorna HTML em caso de erro de inicialização
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[catalog/build] init error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
