'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'

type Section = 'financial' | 'goals' | 'planner' | 'health' | 'life-plan' | 'general'
type Role = 'user' | 'assistant'
interface Message { id: string; role: Role; content: string }

function pathToSection(pathname: string): Section {
  if (pathname.startsWith('/financial')) return 'financial'
  if (pathname.startsWith('/goals')) return 'life-plan'
  if (pathname.startsWith('/planner')) return 'planner'
  if (pathname.startsWith('/health')) return 'health'
  return 'general'
}

const SECTION_LABELS: Record<Section, { label: string; icon: string }> = {
  financial: { label: 'Financial', icon: '💰' },
  goals: { label: 'Goals', icon: '🎯' },
  'life-plan': { label: 'Life Plan', icon: '🗺️' },
  planner: { label: 'Planner', icon: '📅' },
  health: { label: 'Health', icon: '🏋️' },
  general: { label: 'General', icon: '🤖' },
}

export default function AIChat() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const section = pathToSection(pathname)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    setError(null)
    setInput('')

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    const assistantId = crypto.randomUUID()
    const assistantMsg: Message = { id: assistantId, role: 'assistant', content: '' }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsLoading(true)

    abortRef.current = new AbortController()

    // Watchdog: if the server never produces a first byte (stalled RAG
    // call, hung function), abort with a real error instead of an
    // infinite "thinking..." spinner.
    const watchdog = setTimeout(() => abortRef.current?.abort(), 30000)

    try {
      const history = [...messages, userMsg].map(({ role, content }) => ({ role, content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, section }),
        signal: abortRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Session expired — refresh the page and log in again.' : `Request failed: ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let gotFirstByte = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!gotFirstByte) {
          gotFirstByte = true
          clearTimeout(watchdog)
        }
        const chunk = decoder.decode(value, { stream: true })
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + chunk } : m
          )
        )
      }
      if (!gotFirstByte) {
        throw new Error('The server closed the stream without responding — check the deployment logs.')
      }
    } catch (err) {
      const aborted = (err as Error).name === 'AbortError'
      const msg = aborted
        ? 'The AI did not respond within 30 seconds — the server may be misconfigured. Check ANTHROPIC_API_KEY in Vercel.'
        : (err as Error).message || 'Something went wrong'
      setError(msg)
      setMessages((prev) => prev.filter((m) => m.id !== assistantId))
    } finally {
      clearTimeout(watchdog)
      setIsLoading(false)
    }
  }, [isLoading, messages, section])

  const sectionInfo = SECTION_LABELS[section]

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle AI assistant"
        style={{
          position: 'fixed',
          bottom: 88,
          right: 24,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: open
            ? 'rgba(0,212,255,0.2)'
            : 'linear-gradient(135deg,#00d4ff,#1e90ff)',
          border: open ? '1px solid rgba(0,212,255,0.5)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 100,
          boxShadow: '0 4px 24px rgba(0,212,255,0.35)',
          transition: 'all 0.2s',
          fontSize: 22,
          color: open ? 'var(--accent-cyan)' : '#050505',
        }}
      >
        {open ? '✕' : '✦'}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 152,
            right: 24,
            width: 400,
            height: 'calc(100vh - 200px)',
            maxHeight: 640,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(10,10,10,0.96)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 24,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            zIndex: 99,
            boxShadow: '0 8px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid rgba(0,212,255,0.1)', flexShrink: 0 }}
          >
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 18 }}>{sectionInfo.icon}</span>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{ color: 'var(--text-primary)', lineHeight: 1.2 }}
                >
                  AI Assistant
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono)' }}
                >
                  {sectionInfo.label} context
                </p>
              </div>
            </div>
            <div
              className="flex items-center gap-1.5"
              style={{ color: '#34d399', fontSize: 11 }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#34d399',
                  display: 'inline-block',
                }}
              />
              live
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <span style={{ fontSize: 36 }}>{sectionInfo.icon}</span>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Ask me anything about your {sectionInfo.label.toLowerCase()} data.
                </p>
                <div className="flex flex-col gap-2 w-full mt-2">
                  {getStarters(section).map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSubmit(q)}
                      className="text-xs px-3 py-2 rounded-lg text-left"
                      style={{
                        background: 'rgba(0,212,255,0.06)',
                        border: '1px solid rgba(0,212,255,0.15)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background:
                      m.role === 'user'
                        ? 'linear-gradient(135deg,#00d4ff,#1e90ff)'
                        : 'rgba(255,255,255,0.06)',
                    border:
                      m.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    color: m.role === 'user' ? '#050505' : 'var(--text-primary)',
                    fontSize: 13,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.content || (m.role === 'assistant' && isLoading ? '…' : '')}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex items-center gap-2 pl-1">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: 'var(--accent-cyan)',
                        display: 'inline-block',
                        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  thinking...
                </span>
              </div>
            )}

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.08)' }}>
                Error: {error}
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmit(input) }}
            className="flex items-center gap-2 px-4 py-3"
            style={{ borderTop: '1px solid rgba(0,212,255,0.1)', flexShrink: 0 }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${sectionInfo.label.toLowerCase()}...`}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(input)
                }
              }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: 10,
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'rgba(0,212,255,0.5)')}
              onBlur={(e) => (e.target.style.borderColor = 'rgba(0,212,255,0.2)')}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background:
                  isLoading || !input.trim()
                    ? 'rgba(0,212,255,0.1)'
                    : 'linear-gradient(135deg,#00d4ff,#1e90ff)',
                border: 'none',
                color: isLoading || !input.trim() ? 'var(--text-muted)' : '#050505',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              ↑
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function getStarters(section: Section): string[] {
  const starters: Record<Section, string[]> = {
    financial: [
      "What's my total debt?",
      'Which subscriptions should I cancel?',
      'What is my survival budget target?',
    ],
    goals: [
      'What are my top active goals?',
      'How many goals do I have per category?',
      'What goals are due soon?',
    ],
    'life-plan': [
      'Summarize my Age 40 goals across all sections.',
      'What are my top career goals for the next 5 years?',
      'What custom goals have I added recently?',
      'How far along am I overall on my life plan?',
    ],
    planner: [
      "What does my morning routine look like?",
      'When are my workout blocks?',
      'What is my daily schedule?',
    ],
    health: [
      'What supplements am I taking?',
      'What is my TRT protocol?',
      'Walk me through my fitness blueprint.',
    ],
    general: [
      'Give me a full status update.',
      'What should I focus on today?',
      'What are the most urgent tasks?',
    ],
  }
  return starters[section]
}
