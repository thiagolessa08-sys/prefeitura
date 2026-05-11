'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ToolEvent {
  name: string
  sql?: string
  rows?: number
  error?: string
  done: boolean
}

const SUGESTOES = [
  'Quais são as maiores despesas por secretaria?',
  'Mostre o total de despesas por mês no ano atual',
  'Quais fornecedores receberam mais pagamentos?',
  'Quantos funcionários ativos existem?',
]

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <div key={i} className="my-3 rounded-lg overflow-hidden border border-slate-700">
          {lang && (
            <div className="bg-slate-700 text-slate-300 text-xs px-3 py-1.5 font-mono uppercase tracking-wider">
              {lang}
            </div>
          )}
          <pre className="bg-slate-900 text-green-300 text-xs p-4 overflow-x-auto font-mono whitespace-pre leading-relaxed">
            {codeLines.join('\n')}
          </pre>
        </div>
      )
      i++
      continue
    }

    if (line.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines
        .filter(l => !l.match(/^\|[\s\-:|]+\|$/))
        .map(l =>
          l.split('|')
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
            .map(c => c.trim())
        )
      if (rows.length > 0) {
        elements.push(
          <div key={i} className="my-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="text-xs border-collapse w-full">
              <thead>
                <tr className="bg-blue-50 border-b border-slate-200">
                  {rows[0].map((h, j) => (
                    <th key={j} className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-slate-700 font-mono border-t border-slate-100">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="font-bold text-slate-800 mt-4 mb-1 text-sm">{line.slice(4)}</h3>)
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="font-bold text-slate-800 mt-4 mb-1">{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="font-bold text-slate-800 text-lg mt-4 mb-1">{line.slice(2)}</h1>)
    } else if (line.match(/^[-*] /)) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-slate-700 text-sm">
          <InlineMarkdown text={line.slice(2)} />
        </li>
      )
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(
        <p key={i} className="text-slate-700 text-sm leading-relaxed">
          <InlineMarkdown text={line} />
        </p>
      )
    }
    i++
  }

  return <div className="space-y-0.5">{elements}</div>
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className="bg-slate-100 text-blue-700 px-1 rounded font-mono text-xs">{part.slice(1, -1)}</code>
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i}>{part.slice(1, -1)}</em>
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function ToolIndicator({ tool }: { tool: ToolEvent }) {
  if (tool.done && tool.error) {
    return (
      <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 my-1">
        <span>✗ Query falhou:</span>
        <code className="font-mono">{tool.error}</code>
      </div>
    )
  }
  if (tool.done) {
    return (
      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 my-1">
        <span>✓</span>
        <span>{tool.rows} linha{tool.rows !== 1 ? 's' : ''} retornada{tool.rows !== 1 ? 's' : ''}</span>
        {tool.sql && (
          <code className="ml-1 text-slate-500 font-mono truncate max-w-xs" title={tool.sql}>
            {tool.sql.slice(0, 60)}{tool.sql.length > 60 ? '…' : ''}
          </code>
        )}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 my-1 animate-pulse">
      <svg className="w-3.5 h-3.5 animate-spin flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span>Executando query no Sybase IQ…</span>
      {tool.sql && (
        <code className="ml-1 text-amber-600 font-mono truncate max-w-xs" title={tool.sql}>
          {tool.sql.slice(0, 50)}{tool.sql.length > 50 ? '…' : ''}
        </code>
      )}
    </div>
  )
}

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [schemaLoaded, setSchemaLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, toolEvents, loading])

  async function send(text?: string, forceRefreshSchema = false) {
    const userText = (text ?? input).trim()
    if (!userText || loading) return

    const userMsg: Message = { role: 'user', content: userText }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setToolEvents([])

    let assistantContent = ''
    const currentTools: ToolEvent[] = []
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          forceRefreshSchema,
        }),
      })

      if (res.status === 401) { router.push('/login'); return }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          const event = JSON.parse(raw)

          if (event.type === 'text') {
            assistantContent += event.text
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
              return updated
            })
          } else if (event.type === 'tool_start') {
            const tool: ToolEvent = { name: event.name, sql: event.sql, done: false }
            currentTools.push(tool)
            setToolEvents([...currentTools])
            setSchemaLoaded(true)
          } else if (event.type === 'tool_end') {
            const last = currentTools[currentTools.length - 1]
            if (last) {
              last.done = true
              last.rows = event.rows
              last.error = event.error
            }
            setToolEvents([...currentTools])
          } else if (event.type === 'error') {
            assistantContent += '\n' + event.text
            setMessages(prev => {
              const updated = [...prev]
              updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
              return updated
            })
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: 'Erro de conexão. Tente novamente.' }
        return updated
      })
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Intercala mensagens com tool events da última resposta
  const renderMessages = () => {
    return messages.map((msg, i) => {
      const isLast = i === messages.length - 1
      const isAssistant = msg.role === 'assistant'

      return (
        <div key={i}>
          <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-1`}>
            {isAssistant && (
              <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
            )}
            <div className={`max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-blue-700 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm'
                : 'bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm">{msg.content}</p>
              ) : msg.content ? (
                <MarkdownText text={msg.content} />
              ) : (
                <div className="flex gap-1 py-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          </div>

          {/* Tool events só na última mensagem do assistente */}
          {isLast && isAssistant && toolEvents.length > 0 && (
            <div className="ml-10 mb-2 space-y-1">
              {toolEvents.map((t, ti) => <ToolIndicator key={ti} tool={t} />)}
            </div>
          )}
        </div>
      )
    })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <div>
            <h1 className="text-base font-bold leading-none">Assistente IA — Prefeitura de Arujá</h1>
            <p className="text-blue-300 text-xs">Consulta em linguagem natural • Sybase IQ</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {schemaLoaded && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              Schema em cache
            </span>
          )}
          <button
            onClick={() => send(undefined, true)}
            disabled={loading}
            title="Recarregar schema do banco"
            className="text-blue-300 hover:text-white text-xs border border-blue-700 hover:border-blue-400 rounded px-2 py-1 transition-colors disabled:opacity-40"
          >
            ↺ Schema
          </button>
          <Link href="/dashboard" className="text-blue-300 hover:text-white text-sm transition-colors">
            ← Dashboard
          </Link>
          <button
            onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login') }}
            className="text-blue-300 hover:text-white text-sm transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">Olá! O que deseja saber?</h2>
            <p className="text-slate-500 text-sm mb-8 max-w-md">
              Faça perguntas sobre os dados municipais em português. Vou consultar o banco Sybase IQ e responder com dados reais.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
              {SUGESTOES.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 text-sm text-slate-600 transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {renderMessages()}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
            placeholder="Pergunte sobre os dados municipais… (Enter para enviar, Shift+Enter para nova linha)"
            className="flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 disabled:opacity-50"
            style={{ maxHeight: '140px' }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 140) + 'px'
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="bg-blue-700 hover:bg-blue-800 text-white p-3 rounded-xl transition-colors disabled:opacity-40 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
