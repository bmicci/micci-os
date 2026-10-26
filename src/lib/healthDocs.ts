// ───────────────────────────────────────────────────────────────────────────
// Health document pipeline — server-only.
//
// Lab reports (Quest / Labcorp PDFs) and InBody result sheets (PDF or photo)
// are uploaded to the private "health-docs" bucket, read by Claude into a
// structured extraction, and shown for review in /health. Nothing is written
// to lab_markers / body_metrics until the user confirms (same contract as the
// card-statement pipeline in lib/statements.ts).
// ───────────────────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'

export const HEALTH_BUCKET = 'health-docs'
const MODEL = 'claude-opus-5-5'

export type HealthDocKind = 'lab' | 'inbody'
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
type ImageType = (typeof IMAGE_TYPES)[number]

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Schemas ───────────────────────────────────────────────────────────────

const LabMarkerSchema = z.object({
  panel: z.string().nullable().describe('Panel / section heading, e.g. "Lipid Panel", "CBC", "Comprehensive Metabolic Panel"'),
  name_on_report: z.string().describe('Test name exactly as printed'),
  canonical_name: z.string().describe('Common standardized name, e.g. "Total Testosterone", "Free Testosterone", "Estradiol", "SHBG", "Hematocrit", "Hemoglobin", "PSA", "LDL Cholesterol", "HDL Cholesterol", "Triglycerides", "Total Cholesterol", "Vitamin D (25-OH)", "Vitamin B12", "Ferritin", "TSH", "Free T4", "HbA1c", "Glucose", "ApoB", "Lp(a)", "hs-CRP", "ALT", "AST", "Creatinine", "eGFR"'),
  value: z.number().nullable().describe('Numeric result; null when the result is non-numeric'),
  value_text: z.string().nullable().describe('Result as printed when not a plain number, e.g. "<0.5", "NEGATIVE", ">90"'),
  unit: z.string().nullable(),
  reference_low: z.number().nullable(),
  reference_high: z.number().nullable(),
  reference_text: z.string().nullable().describe('Reference interval as printed, e.g. "250-1100", "<200", "> OR = 40"'),
  flag: z.string().nullable().describe('Abnormal flag as printed: "H", "L", "HH", "LL", "A", or null when in range'),
})

const LabReportSchema = z.object({
  is_lab_report: z.boolean().describe('false if this is not a laboratory results report'),
  lab_provider: z.string().nullable().describe('e.g. "Quest Diagnostics", "Labcorp"'),
  collected_on: z.string().nullable().describe('Specimen collection date, YYYY-MM-DD'),
  reported_on: z.string().nullable().describe('Report date, YYYY-MM-DD'),
  ordering_provider: z.string().nullable(),
  markers: z.array(LabMarkerSchema).describe('Every reported analyte, one entry each'),
  notes: z.string().nullable().describe('Interpretive comments worth keeping (short)'),
})

const InBodySchema = z.object({
  is_inbody: z.boolean().describe('false if this is not a body composition (InBody or similar BIA) result'),
  device: z.string().nullable().describe('e.g. "InBody 570", "InBody 770"'),
  test_date: z.string().nullable().describe('YYYY-MM-DD'),
  weight_lbs: z.number().nullable(),
  skeletal_muscle_lbs: z.number().nullable().describe('Skeletal Muscle Mass (SMM)'),
  body_fat_mass_lbs: z.number().nullable(),
  body_fat_pct: z.number().nullable().describe('Percent Body Fat (PBF)'),
  total_body_water_lbs: z.number().nullable(),
  visceral_fat_level: z.number().nullable(),
  bmr_kcal: z.number().nullable().describe('Basal Metabolic Rate'),
  inbody_score: z.number().nullable(),
  segmental_lean_lbs: z.object({
    right_arm: z.number().nullable(), left_arm: z.number().nullable(), trunk: z.number().nullable(),
    right_leg: z.number().nullable(), left_leg: z.number().nullable(),
  }).nullable().describe('Segmental lean analysis, in pounds'),
  notes: z.string().nullable(),
})

export type LabReportExtraction = z.infer<typeof LabReportSchema>
export type InBodyExtraction = z.infer<typeof InBodySchema>

const LAB_PROMPT = `You extract results from US clinical laboratory reports (Quest Diagnostics, Labcorp, hospital labs) for a personal health tracker that charts each marker over time.

Accuracy over completeness: copy values, units and reference intervals exactly as printed; return null for anything not printed rather than estimating. Dates are YYYY-MM-DD; use the specimen collection date as collected_on. Include every analyte on every page, including ones that are in range. canonical_name should be the common name a clinician would use so the same test from different labs lines up over time; keep name_on_report as printed. Split a reference interval like "250-1100" into reference_low 250 and reference_high 1100; for "<200" set only reference_high; for "> OR = 40" set only reference_low.`

const INBODY_PROMPT = `You read body composition result sheets (InBody 270/370/570/770/970 and similar bioelectrical impedance devices) for a personal health tracker.

Return weights in POUNDS: if the sheet shows kilograms, convert (kg × 2.20462) and round to one decimal. Copy numbers exactly as printed otherwise; return null for anything not on the sheet. The date is the test date printed on the sheet, YYYY-MM-DD.`

let anthropic: Anthropic | null = null
function claude(): Anthropic {
  anthropic ??= new Anthropic()
  return anthropic
}

function fileBlock(file: Buffer, mime: string): Anthropic.Beta.BetaContentBlockParam {
  if ((IMAGE_TYPES as readonly string[]).includes(mime)) {
    return { type: 'image', source: { type: 'base64', media_type: mime as ImageType, data: file.toString('base64') } }
  }
  return { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: file.toString('base64') } }
}

async function extract<T>(file: Buffer, mime: string, schema: z.ZodType<T>, system: string, ask: string): Promise<T> {
  const response = await claude().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: 'user', content: [fileBlock(file, mime), { type: 'text', text: ask }] }],
  })
  if (response.stop_reason === 'refusal') throw new Error('Claude declined to read this document')
  if (response.stop_reason === 'max_tokens') throw new Error('Extraction was cut off (max_tokens)')
  if (!response.parsed_output) throw new Error('Extraction returned no structured output')
  return response.parsed_output as T
}

export const extractLabReport = (file: Buffer, mime: string) =>
  extract(file, mime, LabReportSchema, LAB_PROMPT, 'Extract this lab report.')

export const extractInBody = (file: Buffer, mime: string) =>
  extract(file, mime, InBodySchema, INBODY_PROMPT, 'Extract this body composition result.')

/** Download a stored document, extract it, save the result for review. */
export async function parseHealthDocument(service: any, id: string): Promise<{ id: string; error?: string }> {
  const { data: doc } = await service.from('health_documents').select('*').eq('id', id).single()
  if (!doc) return { id, error: 'Document not found' }
  await service.from('health_documents').update({ status: 'parsing', parse_error: null }).eq('id', id)
  try {
    const { data: blob, error: dlErr } = await service.storage.from(HEALTH_BUCKET).download(doc.storage_path)
    if (dlErr || !blob) throw new Error(`storage: ${dlErr?.message ?? 'missing file'}`)
    const buf = Buffer.from(await blob.arrayBuffer())
    const mime = doc.mime_type ?? 'application/pdf'

    if (doc.kind === 'lab') {
      const x = await extractLabReport(buf, mime)
      if (!x.is_lab_report) throw new Error('This does not look like a lab report')
      await service.from('health_documents').update({
        status: 'parsed', extracted: x, collected_on: x.collected_on ?? x.reported_on, provider: x.lab_provider,
      }).eq('id', id)
    } else {
      const x = await extractInBody(buf, mime)
      if (!x.is_inbody) throw new Error('This does not look like a body composition result')
      await service.from('health_documents').update({
        status: 'parsed', extracted: x, collected_on: x.test_date, provider: x.device ?? 'InBody',
      }).eq('id', id)
    }
    return { id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await service.from('health_documents').update({ status: 'error', parse_error: msg.slice(0, 500) }).eq('id', id)
    return { id, error: msg }
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
