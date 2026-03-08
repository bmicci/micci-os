'use client'

import { useState } from 'react'
import type { DBSection } from './LifePlanClient'

const TIMEFRAMES = [
  { value: '40', label: 'Age 40 (1 Year)' },
  { value: '45', label: 'Age 45 (5 Years)' },
  { value: '50', label: 'Age 50 (10 Years)' },
  { value: '60', label: 'Age 60 (20 Years)' },
  { value: 'all', label: 'All Ages' },
  { value: 'pinned', label: 'Pinned / Top Priority' },
]

interface Props {
  sections: DBSection[]
  defaultSectionId?: string
  defaultTimeframe?: string
  defaultTimeframeLabel?: string
  defaultCategoryHeader?: string | null
  defaultGoalText?: string
  onAdd: (sectionId: string, timeframe: string, timeframeLabel: string, categoryHeader: string | null, goalText: string, aiGenerated: boolean) => Promise<void>
  onClose: () => void
}

export default function AddGoalModal({
  sections,
  defaultSectionId = sections[0]?.id ?? 'health',
  defaultTimeframe = '40',
  defaultTimeframeLabel = 'Age 40 (1 Year)',
  defaultCategoryHeader = null,
  defaultGoalText = '',
  onAdd,
  onClose,
}: Props) {
  const [sectionId, setSectionId] = useState(defaultSectionId)
  const [timeframe, setTimeframe] = useState(defaultTimeframe)
  const [categoryHeader, setCategoryHeader] = useState(defaultCategoryHeader ?? '')
  const [goalText, setGoalText] = useState(defaultGoalText)
  const [aiPrompt, setAiPrompt] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'manual' | 'ai'>('manual')

  const tfLabel = TIMEFRAMES.find(t => t.value === timeframe)?.label ?? defaultTimeframeLabel

  async function handleAISuggest() {
    setAiLoading(true)
    setError(null)
    setSuggestions([])
    try {
      const res = await fetch('/api/life-plan/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          timeframe,
          category_header: categoryHeader || null,
          prompt: aiPrompt,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuggestions(data.suggestions ?? [])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSave(text: string, isAi: boolean) {
    if (!text.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onAdd(sectionId, timeframe, tfLabel, categoryHeader || null, text, isAi)
      onClose()
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-lg rounded-2xl border p-6"
        style={{ background: 'var(--bg-elevated)', borderColor: 'rgba(0,212,255,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-geist-sans)', color: 'var(--text-primary)' }}>Add Goal</h3>
          <button onClick={onClose} className="text-sm px-3 py-1 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 rounded-lg mb-5" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {(['manual', 'ai'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-all"
              style={{ background: mode === m ? 'var(--accent-cyan)' : 'transparent', color: mode === m ? '#000' : 'var(--text-secondary)' }}>
              {m === 'manual' ? '✏️ Manual' : '🤖 AI Suggest'}
            </button>
          ))}
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section</label>
            <select value={sectionId} onChange={e => setSectionId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeframe</label>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>
              {TIMEFRAMES.map(tf => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
            </select>
          </div>
        </div>

        {/* Category header (free text) */}
        <div className="mb-4">
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category (optional)</label>
          <input value={categoryHeader} onChange={e => setCategoryHeader(e.target.value)}
            placeholder="e.g. Physique & Weight:"
            className="w-full rounded-lg px-3 py-2 text-sm border"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)' }} />
        </div>

        {/* Manual mode */}
        {mode === 'manual' && (
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goal</label>
            <textarea value={goalText} onChange={e => setGoalText(e.target.value)}
              placeholder="Describe your goal..."
              rows={3}
              className="w-full rounded-lg px-3 py-2 text-sm border resize-none"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(0,212,255,0.2)', color: 'var(--text-primary)' }} />
            <button onClick={() => handleSave(goalText, false)}
              disabled={!goalText.trim() || saving}
              className="mt-3 w-full py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: goalText.trim() ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)', color: goalText.trim() ? '#000' : 'var(--text-muted)', cursor: goalText.trim() ? 'pointer' : 'not-allowed' }}>
              {saving ? 'Saving...' : 'Add Goal'}
            </button>
          </div>
        )}

        {/* AI mode */}
        {mode === 'ai' && (
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Describe what you want (optional)</label>
            <div className="flex gap-2 mb-4">
              <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAISuggest()}
                placeholder="e.g. 'language learning' or leave blank..."
                className="flex-1 rounded-lg px-3 py-2 text-sm border"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(0,212,255,0.2)', color: 'var(--text-primary)' }} />
              <button onClick={handleAISuggest} disabled={aiLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: 'var(--accent-cyan)', color: '#000' }}>
                {aiLoading ? '...' : '✨ Go'}
              </button>
            </div>

            {aiLoading && (
              <div className="flex justify-center py-4">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: 'var(--accent-cyan)', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}

            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Click a suggestion to add it:</p>
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border"
                    style={{ background: 'rgba(0,212,255,0.04)', borderColor: 'rgba(0,212,255,0.15)' }}>
                    <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{s}</span>
                    <button onClick={() => handleSave(s, true)} disabled={saving}
                      className="text-xs px-3 py-1 rounded-md font-medium flex-shrink-0 transition-all"
                      style={{ background: 'var(--accent-cyan)', color: '#000' }}>
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  )
}
