// Lab marker grouping + display helpers (pure). Names are the canonical
// names the importers write (Labcorp + Quest/Function Health line up on
// these so each marker trends as one series).

export const KEY_MARKERS = [
  'Total Testosterone', 'Free Testosterone', 'Estradiol', 'SHBG', 'Hematocrit', 'PSA',
  'LDL Cholesterol', 'HDL Cholesterol', 'ApoB', 'Lp(a)', 'Hemoglobin A1c', 'Glucose',
  'Vitamin D (25-OH)', 'Creatinine', 'eGFR', 'AST', 'ALT', 'TSH', 'Free T4', 'Free T3',
]

export const LAB_CATEGORIES: { id: string; label: string; match: (name: string) => boolean }[] = [
  { id: 'hormones', label: 'Hormones', match: n => /testosterone|estradiol|shbg|^lh$|^fsh$|psa|dhea|prolactin|cortisol/i.test(n) },
  { id: 'thyroid', label: 'Thyroid', match: n => /tsh|t3|t4|thyrox|thyro|tpo/i.test(n) },
  { id: 'heart', label: 'Lipids & heart', match: n => /cholesterol|ldl|hdl|triglycer|apob|lp\(a\)|crp|homocysteine/i.test(n) },
  { id: 'metabolic', label: 'Metabolic & kidney', match: n => /glucose|a1c|insulin|leptin|uric|creatinine|egfr|bun|sodium|potassium|chloride|co2|calcium|albumin|protein|globulin|a\/g/i.test(n) },
  { id: 'liver', label: 'Liver & pancreas', match: n => /^ast$|^alt$|alkaline|bilirubin|ggt|amylase|lipase/i.test(n) },
  { id: 'blood', label: 'Blood count', match: n => /wbc|rbc|hemoglobin$|hematocrit|mcv|mch|rdw|platelet|mpv|neutro|lymph|mono|eos|baso|immature/i.test(n) },
  { id: 'nutrients', label: 'Nutrients & minerals', match: n => /vitamin|ferritin|iron|tibc|zinc|magnesium|omega|methylmalonic|aa\/epa|lead|mercury/i.test(n) },
]

export function labCategory(name: string): string {
  if (/^urine /i.test(name)) return 'other'
  return LAB_CATEGORIES.find(c => c.match(name))?.id ?? 'other'
}

/** "<0.3" / ">1500" as the lab printed it, from the importer's note. */
export function reportedValue(value: number, notes: string | null | undefined): string {
  const m = notes?.match(/As reported: ([<>]\s*[\d.]+)/)
  return m ? m[1].replace(/\s+/g, '') : String(Number(value))
}

/** Lab-printed flag wins; otherwise compare with the reference range. */
export function markerFlag(value: number, low: number | null, high: number | null, labFlag?: string | null, notes?: string | null): 'high' | 'low' | 'normal' | 'unknown' {
  if (labFlag) return /^l/i.test(labFlag) ? 'low' : 'high'
  // "<1.5" = below the assay's detection limit; unflagged by the lab → not high
  if (notes && /As reported: </.test(notes)) return 'normal'
  if (low == null && high == null) return notes && /In Range/.test(notes) ? 'normal' : 'unknown'
  if (low != null && value < low) return 'low'
  if (high != null && value > high) return 'high'
  return 'normal'
}

/** Local-safe date label for a YYYY-MM-DD string (no UTC day shift). */
export function labDate(iso: string, withYear = true): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', ...(withYear ? { year: '2-digit' } : {}), timeZone: 'UTC',
  })
}
