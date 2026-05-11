export interface CatalogEntry {
  tabela: string
  descricao: string
  conceitos: string[]
  colunas_chave: Record<string, string>
  joins_comuns: string[]
  exemplos_query?: string[]
}

export interface Catalog {
  gerado_em: string
  entradas: CatalogEntry[]
  mapa_conceitos: Record<string, string[]>
}
