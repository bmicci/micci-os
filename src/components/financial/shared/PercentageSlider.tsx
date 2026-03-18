'use client'

import { useState } from 'react'

interface PercentageSliderProps {
  value: number
  onChange: (value: number) => void
  label?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

export default function PercentageSlider({
  value,
  onChange,
  label,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  className = '',
}: PercentageSliderProps) {
  const [inputVal, setInputVal] = useState(String(value))
  const [inputFocused, setInputFocused] = useState(false)

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value)
    onChange(v)
    setInputVal(String(v))
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputVal(e.target.value)
  }

  function handleTextBlur() {
    setInputFocused(false)
    const parsed = parseFloat(inputVal)
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed))
      onChange(clamped)
      setInputVal(String(clamped))
    } else {
      setInputVal(String(value))
    }
  }

  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleSliderChange}
            disabled={disabled}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, var(--accent-cyan) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
              opacity: disabled ? 0.5 : 1,
            }}
          />
        </div>
        <div className="flex items-center gap-0.5" style={{ minWidth: 56 }}>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={inputFocused ? inputVal : value}
            onChange={handleTextChange}
            onFocus={() => { setInputFocused(true); setInputVal(String(value)) }}
            onBlur={handleTextBlur}
            disabled={disabled}
            className="w-12 px-2 py-1 rounded text-xs text-right font-mono"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(0,212,255,0.2)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>%</span>
        </div>
      </div>
    </div>
  )
}
