'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface QueryResult {
  columns: string[]
  rows: unknown[][]
  count: number
  truncated: boolean
}

interface ColumnDef {
  name: string
  type: string
  nullable: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [tables, setTables] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [schema, setSchema] = useState<ColumnDef[]>([])
  const [sql, setSql] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [tablesLoading, setTablesLoading] = useState(true)
  const [agentOnline, setAgentOnline] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<'explorer' | 'sql'>('explorer')

  useEffect(() => {
    checkHealth()
    loadTables()
  }, [])

  async function checkHealth() {
    try {
      const res = await fetch('/api/health')
      setAgentOnline(res.ok)
    } catch {
      setAgentOnline(false)
    }
  }

  async function loadTables() {
    setTablesLoading(true)
    try {
      const res = await fetch('/api/db/tables')
      if (res.status === 401) { router.push('/login'); return }
      const data = await res.json()
      setTables(data.tables || [])
    } catch {
      setError('Erro ao carregar tabelas')
    } finally {
      setTablesLoading(false)
    }
  }

  const loadSchema = useCallback(async (table: string) => {
    setSchema([])
    setResult(null)
    setError('')
    try {
      const res = await fetch(`/api/db/schema/${encodeURIComponent(table)}`)
      const data = await res.json()
      setSchema(data.columns || [])
      setSql(`SELECT TOP 100 *\nFROM pref_aruja_sp.${table}`)
    } catch {
      setError('Erro ao carregar schema')
    }
  }, [])

  async function runQuery() {
    if (!sql.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, limit: 500 }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro na query')
        return
      }
      setResult(data)
      setActiveTab('sql')
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function handleSelectTable(table: string) {
    setSelectedTable(table)
    loadSchema(table)
    setActiveTab('explorer')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <div>
            <h1 className="text-lg font-bold leading-none">Prefeitura de Arujá</h1>
            <p className="text-blue-300 text-xs">Analytics Municipal — Sybase IQ</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full ${agentOnline === true ? 'bg-green-400' : agentOnline === false ? 'bg-red-400' : 'bg-yellow-400'}`} />
            <span className="text-blue-200">
              {agentOnline === true ? 'Agent online' : agentOnline === false ? 'Agent offline' : 'Verificando...'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-blue-300 hover:text-white text-sm transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — lista de tabelas */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              pref_aruja_sp
            </span>
            <button
              onClick={loadTables}
              className="text-slate-400 hover:text-blue-600 transition-colors"
              title="Recarregar tabelas"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {tablesLoading ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">Carregando...</div>
            ) : tables.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">Nenhuma tabela encontrada</div>
            ) : (
              tables.map(table => (
                <button
                  key={table}
                  onClick={() => handleSelectTable(table)}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors ${
                    selectedTable === table ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                  }`}
                >
                  <svg className="w-4 h-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 10h18M3 14h18M10 6v12M14 6v12" />
                  </svg>
                  <span className="truncate">{table}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* SQL Editor */}
          <div className="bg-white border-b border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <textarea
                value={sql}
                onChange={e => setSql(e.target.value)}
                onKeyDown={e => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault()
                    runQuery()
                  }
                }}
                rows={4}
                className="flex-1 font-mono text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-gray-900"
                placeholder="SELECT TOP 100 * FROM pref_aruja_sp.tabela"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={runQuery}
                  disabled={loading || !sql.trim()}
                  className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {loading ? 'Executando...' : '▶ Executar'}
                </button>
                <span className="text-xs text-slate-400 text-center">Ctrl+Enter</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white border-b border-slate-200 px-4 flex gap-4">
            <button
              onClick={() => setActiveTab('explorer')}
              className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'explorer'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Estrutura
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'sql'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Resultado {result && <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{result.count}</span>}
            </button>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto p-4">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm font-mono">
                {error}
              </div>
            )}

            {/* Explorer tab — schema */}
            {activeTab === 'explorer' && (
              <div>
                {!selectedTable ? (
                  <div className="text-center py-20 text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M3 10h18M3 14h18M10 6v12M14 6v12" />
                    </svg>
                    <p>Selecione uma tabela na barra lateral</p>
                  </div>
                ) : schema.length === 0 ? (
                  <div className="text-slate-400 text-sm">Carregando schema...</div>
                ) : (
                  <div>
                    <h2 className="text-base font-semibold text-slate-700 mb-3">
                      {selectedTable}
                      <span className="ml-2 text-xs text-slate-400 font-normal">{schema.length} colunas</span>
                    </h2>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Coluna</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nullable</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {schema.map(col => (
                            <tr key={col.name} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-mono text-slate-800">{col.name}</td>
                              <td className="px-4 py-2 text-blue-700 font-mono">{col.type}</td>
                              <td className="px-4 py-2 text-slate-400">{col.nullable ? 'YES' : 'NO'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SQL Result tab */}
            {activeTab === 'sql' && (
              <div>
                {!result ? (
                  <div className="text-center py-20 text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>Execute uma query para ver os resultados</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-3 text-sm text-slate-500">
                      <span>{result.count} linha{result.count !== 1 ? 's' : ''}</span>
                      {result.truncated && (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs">
                          Resultado truncado pelo limite
                        </span>
                      )}
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-auto">
                      <table className="text-sm whitespace-nowrap">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                          <tr>
                            {result.columns.map(col => (
                              <th key={col} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-slate-100 last:border-0">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {result.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              {row.map((cell, j) => (
                                <td key={j} className="px-4 py-2 text-slate-700 border-r border-slate-100 last:border-0 max-w-xs truncate font-mono text-xs">
                                  {cell === null || cell === undefined
                                    ? <span className="text-slate-300 italic">null</span>
                                    : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
