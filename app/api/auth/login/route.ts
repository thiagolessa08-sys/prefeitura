import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { signToken } from '@/lib/auth'

interface Usuario {
  id: number
  nome: string
  email: string
  senha_hash: string
}

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json()
    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 })
    }

    const db = getDb()
    const user = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email) as Usuario | undefined

    if (!user || !bcrypt.compareSync(senha, user.senha_hash)) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
    }

    const token = signToken({ userId: user.id, email: user.email, nome: user.nome })

    const res = NextResponse.json({ ok: true, nome: user.nome })
    res.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return res
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
