'use client'

import { useState, useEffect } from 'react'
import { CAT, CC, CatKey } from '@/lib/planner-data'
import { MergedBlock } from '@/lib/planner-utils'

const CAT_KEYS = Object.keys(CAT) as CatKey[]

interface Props {
  /** null = adding new block; MergedBlock = editing existing */
  block: MergedBlock | null
  dayDate: string
  onSave: (data: { time_label: string; cat: CatKey; task: string }) => void
  onClose: () => void
}

export default function BlockEditModal({ block, dayDate, onSave, onClose }: Props) {
  const [timeLabel, setTimeLabel] = useState(block?.time_label ?? '')
  const [cat, setCat] = useState<CatKey>(block?.cat ?? 'job')
  const [task, setTask] = useState(block?.task ?? '')

  // Re-populate when block changes (switching between edit targets)
  useEffect(() => {
    setTimeLabel(block?.time_label ?? '')
    setCat(block?.cat ?? 'job')
    setTask(block?.task ?? '')
  }, [block])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!timeLabel.trim() || !task.trim()) return
    onSave({ time_label: timeLabel.trim(), cat, task: task.trim() })
  }

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-md mx-2 mb-4 sm:mb-0 rounded-2xl border p-5"
        style={{
          background: 'rgba(10,14,39,0.97)',
          borderColor: 'rgba(0,212,255,0.25)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            {block ? 'Edit Block' : 'Add Block'}
          </h2>
          <div className="text-[10px] text-[var(--text-muted)]">{dayDate}</div>
        </div>

        {/* Time */}
        <div className="mb-3">
          <label className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
            Time
          </label>
          <input
            type="text"
            value={timeLabel}
            onChange={e => setTimeLabel(e.target.value)}
            placeholder="e.g. 1:30 PM"
            required
            className="w-full rounded-lg border px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors focus:border-[var(--accent-cyan)]"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* Category */}
        <div className="mb-3">
          <label className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
            Category
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {CAT_KEYS.map(k => (
              <button
                key={k}
                type="button"
                onClick={() => setCat(k)}
                className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] font-semibold transition-all"
                style={{
                  background: cat === k ? `${CC[k]}22` : 'rgba(255,255,255,0.03)',
                  borderColor: cat === k ? CC[k] : 'rgba(255,255,255,0.08)',
                  color: cat === k ? CC[k] : 'var(--text-muted)',
                }}
              >
                <span>{CAT[k].icon}</span>
                <span className="truncate">{CAT[k].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Task */}
        <div className="mb-5">
          <label className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
            Task
          </label>
          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="Describe the task…"
            required
            rows={2}
            className="w-full rounded-lg border px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none resize-none transition-colors focus:border-[var(--accent-cyan)]"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border py-2 text-xs font-semibold transition-all"
            style={{
              borderColor: 'rgba(255,255,255,0.1)',
              color: 'var(--text-muted)',
              background: 'transparent',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg py-2 text-xs font-bold text-white transition-all"
            style={{ background: 'var(--accent-gradient)' }}
          >
            {block ? 'Save Changes' : 'Add Block'}
          </button>
        </div>
      </form>
    </div>
  )
}
