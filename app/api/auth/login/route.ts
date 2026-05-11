import { NextRequest, NextResponse } from 'next/server'
import { signToken } from '@/lib/auth'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@prefeitura.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json()
    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
    }

    if (email !== ADMIN_EMAIL || senha !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = signToken({ userId: 1, email: ADMIN_EMAIL, nome: 'Administrador' })

    const res = NextResponse.json({ ok: true, nome: 'Administrador' })
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[login]', msg)
    return NextResponse.json({ error: 'Erro interno', detail: msg }, { status: 500 })
  }
}
