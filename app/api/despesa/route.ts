import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export interface DadosDespesa {
  kpis: {
    dotacaoInicial:    { valor: number; vs_ano_anterior_pct: number }
    dotacaoAtualizada: { valor: number; vs_ano_anterior_pct: number }
    valorEmpenho:      { valor: number }
    valorLiquidado:    { valor: number }
    valorPago:         { valor: number }
  }
  secretarias: Array<{ nome: string; valor: number }>
  categorias:  Array<{ nome: string; valor: number; pct: number }>
  elementos:   Array<{ nome: string; dotacao: number; empenhado: number; pct_exec: number; link?: boolean }>
  modalidades: Array<{ nome: string; valor: number }>
}

const MOCK: Record<number, DadosDespesa> = {
  2026: {
    kpis: {
      dotacaoInicial:    { valor: 538300000, vs_ano_anterior_pct: 3157.0 },
      dotacaoAtualizada: { valor: 644900000, vs_ano_anterior_pct: 3801.7 },
      valorEmpenho:      { valor: 196400000 },
      valorLiquidado:    { valor: 42600000  },
      valorPago:         { valor: 33200000  },
    },
    secretarias: [
      { nome: 'EDUCAÇÃO',                  valor: 187400000 },
      { nome: 'SAÚDE',                     valor: 178700000 },
      { nome: 'SERVIÇOS PÚBLICOS',         valor: 79600000  },
      { nome: 'FINANÇAS',                  valor: 38400000  },
      { nome: 'ASSISTÊNCIA SOCIAL',        valor: 25100000  },
      { nome: 'SECRETARIA DA CÂMARA',      valor: 24300000  },
      { nome: 'SEGURANÇA E MOBILIDADE URBANA', valor: 23200000 },
      { nome: 'PLANEJAMENTO URBANO',       valor: 18600000  },
    ],
    categorias: [
      { nome: 'DESPESAS CORRENTES', valor: 516768000, pct: 96 },
      { nome: 'DESPESAS DE CAPITAL', valor: 16149000,  pct: 3  },
      { nome: 'Não Localizado',      valor: 5383000,   pct: 1  },
    ],
    elementos: [
      { nome: 'VENCIMENTOS E VANTAGENS FIXAS – PESSOAL CIVIL', dotacao: 168400000, empenhado: 14600000, pct_exec: 8.7 },
      { nome: 'OUTROS SERVIÇOS DE TERCEIROS – PESSOA JURÍDICA', dotacao: 114000000, empenhado: 89200000, pct_exec: 78.2, link: true },
      { nome: 'CONTRATO DE GESTÃO',    dotacao: 75000000,  empenhado: 46300000, pct_exec: 61.7 },
      { nome: 'OBRIGAÇÕES PATRONAIS',  dotacao: 49000000,  empenhado: 2800000,  pct_exec: 5.8,  link: true },
      { nome: 'SUBVENÇÕES SOCIAIS',    dotacao: 32700000,  empenhado: 11300000, pct_exec: 34.5, link: true },
    ],
    modalidades: [
      { nome: 'APLICAÇÕES DIRETAS',                                    valor: 422800000 },
      { nome: 'TRANSFERÊNCIAS A INSTITUIÇÕES PRIVADAS S/FINS LUCRATIVOS', valor: 187700000 },
      { nome: 'TRANSFERÊNCIAS A INSTITUIÇÕES PRIVADAS COM FINS LUCRATIVOS', valor: 5800000  },
    ],
  },
  2025: {
    kpis: {
      dotacaoInicial:    { valor: 661000000, vs_ano_anterior_pct: 6.6  },
      dotacaoAtualizada: { valor: 760700000, vs_ano_anterior_pct: 8.9  },
      valorEmpenho:      { valor: 612000000 },
      valorLiquidado:    { valor: 578000000 },
      valorPago:         { valor: 551000000 },
    },
    secretarias: [
      { nome: 'EDUCAÇÃO',                  valor: 224700000 },
      { nome: 'SAÚDE',                     valor: 214400000 },
      { nome: 'SERVIÇOS PÚBLICOS',         valor: 95500000  },
      { nome: 'FINANÇAS',                  valor: 46100000  },
      { nome: 'ASSISTÊNCIA SOCIAL',        valor: 30100000  },
      { nome: 'SECRETARIA DA CÂMARA',      valor: 29200000  },
      { nome: 'SEGURANÇA E MOBILIDADE URBANA', valor: 27800000 },
      { nome: 'PLANEJAMENTO URBANO',       valor: 22300000  },
    ],
    categorias: [
      { nome: 'DESPESAS CORRENTES', valor: 634560000, pct: 96 },
      { nome: 'DESPESAS DE CAPITAL', valor: 19830000,  pct: 3  },
      { nome: 'Não Localizado',      valor: 6610000,   pct: 1  },
    ],
    elementos: [
      { nome: 'VENCIMENTOS E VANTAGENS FIXAS – PESSOAL CIVIL', dotacao: 202200000, empenhado: 198000000, pct_exec: 97.9 },
      { nome: 'OUTROS SERVIÇOS DE TERCEIROS – PESSOA JURÍDICA', dotacao: 136800000, empenhado: 107000000, pct_exec: 78.2, link: true },
      { nome: 'CONTRATO DE GESTÃO',    dotacao: 90000000,  empenhado: 55600000,  pct_exec: 61.7 },
      { nome: 'OBRIGAÇÕES PATRONAIS',  dotacao: 58800000,  empenhado: 55200000,  pct_exec: 93.9, link: true },
      { nome: 'SUBVENÇÕES SOCIAIS',    dotacao: 39200000,  empenhado: 38700000,  pct_exec: 98.7, link: true },
    ],
    modalidades: [
      { nome: 'APLICAÇÕES DIRETAS',                                    valor: 507100000 },
      { nome: 'TRANSFERÊNCIAS A INSTITUIÇÕES PRIVADAS S/FINS LUCRATIVOS', valor: 225200000 },
      { nome: 'TRANSFERÊNCIAS A INSTITUIÇÕES PRIVADAS COM FINS LUCRATIVOS', valor: 6960000  },
    ],
  },
  2024: {
    kpis: {
      dotacaoInicial:    { valor: 620000000, vs_ano_anterior_pct: 9.7  },
      dotacaoAtualizada: { valor: 698000000, vs_ano_anterior_pct: 14.4 },
      valorEmpenho:      { valor: 571000000 },
      valorLiquidado:    { valor: 539000000 },
      valorPago:         { valor: 514000000 },
    },
    secretarias: [
      { nome: 'EDUCAÇÃO',                  valor: 210600000 },
      { nome: 'SAÚDE',                     valor: 200900000 },
      { nome: 'SERVIÇOS PÚBLICOS',         valor: 89500000  },
      { nome: 'FINANÇAS',                  valor: 43200000  },
      { nome: 'ASSISTÊNCIA SOCIAL',        valor: 28200000  },
      { nome: 'SECRETARIA DA CÂMARA',      valor: 27300000  },
      { nome: 'SEGURANÇA E MOBILIDADE URBANA', valor: 26100000 },
      { nome: 'PLANEJAMENTO URBANO',       valor: 20900000  },
    ],
    categorias: [
      { nome: 'DESPESAS CORRENTES', valor: 595200000, pct: 96 },
      { nome: 'DESPESAS DE CAPITAL', valor: 18600000,  pct: 3  },
      { nome: 'Não Localizado',      valor: 6200000,   pct: 1  },
    ],
    elementos: [
      { nome: 'VENCIMENTOS E VANTAGENS FIXAS – PESSOAL CIVIL', dotacao: 189500000, empenhado: 185400000, pct_exec: 97.8 },
      { nome: 'OUTROS SERVIÇOS DE TERCEIROS – PESSOA JURÍDICA', dotacao: 128200000, empenhado: 100200000, pct_exec: 78.2, link: true },
      { nome: 'CONTRATO DE GESTÃO',    dotacao: 84300000,  empenhado: 52000000,  pct_exec: 61.7 },
      { nome: 'OBRIGAÇÕES PATRONAIS',  dotacao: 55100000,  empenhado: 51700000,  pct_exec: 93.8, link: true },
      { nome: 'SUBVENÇÕES SOCIAIS',    dotacao: 36700000,  empenhado: 36200000,  pct_exec: 98.6, link: true },
    ],
    modalidades: [
      { nome: 'APLICAÇÕES DIRETAS',                                    valor: 475600000 },
      { nome: 'TRANSFERÊNCIAS A INSTITUIÇÕES PRIVADAS S/FINS LUCRATIVOS', valor: 211100000 },
      { nome: 'TRANSFERÊNCIAS A INSTITUIÇÕES PRIVADAS COM FINS LUCRATIVOS', valor: 6520000  },
    ],
  },
  2023: {
    kpis: {
      dotacaoInicial:    { valor: 565000000, vs_ano_anterior_pct: 7.6  },
      dotacaoAtualizada: { valor: 610000000, vs_ano_anterior_pct: 9.2  },
      valorEmpenho:      { valor: 519000000 },
      valorLiquidado:    { valor: 490000000 },
      valorPago:         { valor: 467000000 },
    },
    secretarias: [
      { nome: 'EDUCAÇÃO',                  valor: 191900000 },
      { nome: 'SAÚDE',                     valor: 183100000 },
      { nome: 'SERVIÇOS PÚBLICOS',         valor: 81500000  },
      { nome: 'FINANÇAS',                  valor: 39400000  },
      { nome: 'ASSISTÊNCIA SOCIAL',        valor: 25700000  },
      { nome: 'SECRETARIA DA CÂMARA',      valor: 24900000  },
      { nome: 'SEGURANÇA E MOBILIDADE URBANA', valor: 23800000 },
      { nome: 'PLANEJAMENTO URBANO',       valor: 19100000  },
    ],
    categorias: [
      { nome: 'DESPESAS CORRENTES', valor: 542400000, pct: 96 },
      { nome: 'DESPESAS DE CAPITAL', valor: 16950000,  pct: 3  },
      { nome: 'Não Localizado',      valor: 5650000,   pct: 1  },
    ],
    elementos: [
      { nome: 'VENCIMENTOS E VANTAGENS FIXAS – PESSOAL CIVIL', dotacao: 172600000, empenhado: 168900000, pct_exec: 97.9 },
      { nome: 'OUTROS SERVIÇOS DE TERCEIROS – PESSOA JURÍDICA', dotacao: 116800000, empenhado: 91300000, pct_exec: 78.2, link: true },
      { nome: 'CONTRATO DE GESTÃO',    dotacao: 76800000,  empenhado: 47400000,  pct_exec: 61.7 },
      { nome: 'OBRIGAÇÕES PATRONAIS',  dotacao: 50200000,  empenhado: 47100000,  pct_exec: 93.8, link: true },
      { nome: 'SUBVENÇÕES SOCIAIS',    dotacao: 33400000,  empenhado: 33000000,  pct_exec: 98.8, link: true },
    ],
    modalidades: [
      { nome: 'APLICAÇÕES DIRETAS',                                    valor: 433100000 },
      { nome: 'TRANSFERÊNCIAS A INSTITUIÇÕES PRIVADAS S/FINS LUCRATIVOS', valor: 192300000 },
      { nome: 'TRANSFERÊNCIAS A INSTITUIÇÕES PRIVADAS COM FINS LUCRATIVOS', valor: 5940000  },
    ],
  },
}

export async function GET(req: NextRequest) {
  const session = getSession()
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const ano = parseInt(searchParams.get('ano') ?? '2026')
  const dados = MOCK[ano] ?? MOCK[2026]
  return NextResponse.json(dados)
}
