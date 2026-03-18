'use client'

import { useState, useRef } from 'react'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  label?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function CurrencyInput({
  value,
  onChange,
  label,
  min = 0,
  max = 10_000_000,
  step = 1000,
  disabled = false,
  className = '',
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFocus() {
    setFocused(true)
    setRaw(String(value))
  }

  function handleBlur() {
    setFocused(false)
    const parsed = parseFloat(raw.replace(/[^0-9.]/g, ''))
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed))
      onChange(clamped)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRaw(e.target.value)
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        type={focused ? 'number' : 'text'}
        value={focused ? raw : formatCurrency(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg text-sm font-mono text-right transition-all"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${focused ? 'var(--accent-cyan)' : 'rgba(0,212,255,0.2)'}`,
          color: 'var(--text-primary)',
          outline: 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      />
    </div>
  )
}
