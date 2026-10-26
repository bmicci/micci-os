// #32 · Labs tab: results grouped by category, dates correct (no off-by-one).
import { describe, expect, it } from 'vitest'
import { KEY_MARKERS, labCategory, labDate, markerFlag, reportedValue } from '@/lib/health/labs'
import { chicagoDay, shiftDay, weekday } from '@/lib/health/dates'

describe('labDate', () => {
  it('prints the stored calendar day regardless of the machine timezone', () => {
    const tz = process.env.TZ
    try {
      for (const zone of ['America/Chicago', 'America/Los_Angeles', 'Pacific/Kiritimati', 'UTC']) {
        process.env.TZ = zone
        expect(labDate('2026-03-01')).toBe('Mar 1, 26')
        expect(labDate('2025-12-31', false)).toBe('Dec 31')
      }
    } finally {
      process.env.TZ = tz
    }
  })
})

describe('health dates', () => {
  it('keys the day in Chicago, not UTC', () => {
    // 11:30 PM Chicago on Oct 25 is already Oct 26 in UTC
    expect(chicagoDay(new Date('2026-10-26T04:30:00Z'))).toBe('2026-10-25')
    expect(chicagoDay(new Date('2026-10-26T05:30:00Z'))).toBe('2026-10-26')
  })

  it('shifts across month, year and DST boundaries', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDay('2026-11-01', 1)).toBe('2026-11-02') // DST ends Nov 1 2026
    expect(shiftDay('2026-03-08', -7)).toBe('2026-03-01')
    expect(weekday('2026-10-26', 'long')).toBe('Monday')
  })
})

describe('labCategory', () => {
  it.each([
    ['Total Testosterone', 'hormones'], ['Free Testosterone', 'hormones'], ['Estradiol', 'hormones'], ['PSA', 'hormones'],
    ['TSH', 'thyroid'], ['Free T4', 'thyroid'],
    ['LDL Cholesterol', 'heart'], ['ApoB', 'heart'], ['Lp(a)', 'heart'],
    ['Hemoglobin A1c', 'metabolic'], ['Glucose', 'metabolic'], ['eGFR', 'metabolic'], ['Creatinine', 'metabolic'],
    ['AST', 'liver'], ['ALT', 'liver'],
    ['Hematocrit', 'blood'], ['Hemoglobin', 'blood'], ['Platelets', 'blood'],
    ['RBC', 'blood'], ['WBC', 'blood'],
    ['Vitamin D (25-OH)', 'nutrients'], ['Ferritin', 'nutrients'], ['Magnesium (RBC)', 'nutrients'],
    ['Urine Glucose', 'other'],
  ])('%s → %s', (name, cat) => {
    expect(labCategory(name)).toBe(cat)
  })

  it('puts every key marker in a real category', () => {
    expect(KEY_MARKERS.filter(m => labCategory(m) === 'other')).toEqual([])
  })
})

describe('markerFlag / reportedValue', () => {
  it('lets the lab flag win', () => {
    expect(markerFlag(500, 300, 1000, 'L')).toBe('low')
    expect(markerFlag(500, 300, 1000, 'H')).toBe('high')
  })

  it('compares against the range otherwise', () => {
    expect(markerFlag(250, 300, 1000)).toBe('low')
    expect(markerFlag(1100, 300, 1000)).toBe('high')
    expect(markerFlag(600, 300, 1000)).toBe('normal')
    expect(markerFlag(5, null, null)).toBe('unknown')
    expect(markerFlag(5, null, null, null, 'Function: In Range')).toBe('normal')
  })

  it('treats below-detection values as normal and shows them as printed', () => {
    expect(markerFlag(0.3, 1, 5, null, 'As reported: <0.3')).toBe('normal')
    expect(reportedValue(0.3, 'As reported: < 0.3')).toBe('<0.3')
    expect(reportedValue(1500, 'As reported: >1500')).toBe('>1500')
    expect(reportedValue(4.20, null)).toBe('4.2')
  })
})
