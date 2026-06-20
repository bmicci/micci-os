// ───────────────────────────────────────────────────────────────────────────
// One-off bulk transaction ingest (Option B).
// Mirrors src/app/api/import/route.ts exactly:
//  · CATEGORY_RULES are extracted from the route file at runtime (no drift)
//  · same header-row detection, bank-format sign logic, signed amounts,
//    structural-category override, and dedup key
// Usage: node scripts/ingest_txns.mjs "<file>" "<Account Name>" [--commit]
//   without --commit it's a DRY RUN (parse + summary, no writes)
// ───────────────────────────────────────────────────────────────────────────
import fs from 'fs'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const [, , FILE, ACCOUNT, COMMIT_FLAG] = process.argv
const COMMIT = COMMIT_FLAG === '--commit'
if (!FILE || !ACCOUNT) { console.error('usage: ingest_txns.mjs <file> <account> [--commit]'); process.exit(1) }

// ── env ──
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const USER_ID = '2ae5eb2e-f44a-4351-9a40-00430af2fe22' // brandon.micci@gmail.com

// ── extract CATEGORY_RULES from the route (single source of truth) ──
const routeSrc = fs.readFileSync(new URL('../src/app/api/import/route.ts', import.meta.url), 'utf8')
const block = routeSrc.match(/const CATEGORY_RULES[^=]*=\s*(\[[\s\S]*?\n\])/)[1]
const CATEGORY_RULES = eval(block) // array of [RegExp, string]
function autoCategory(desc) { for (const [re, c] of CATEGORY_RULES) if (re.test(desc.trim())) return c; return 'Other' }

// ── bank formats (mirror route) ──
const BANK_FORMATS = {
  chase:          { date: ['transaction date', 'posting date'], desc: ['description'], amt: ['amount'], cat: ['category'], sign: 'chase' },
  chase_checking: { date: ['posting date', 'date'], desc: ['description'], amt: ['amount'], cat: [], sign: 'bofa' },
  amex:           { date: ['date'], desc: ['description'], amt: ['amount'], cat: ['category'], sign: 'amex' },
  bofa:           { date: ['date', 'posted date'], desc: ['payee', 'description'], amt: ['amount'], cat: [], sign: 'bofa' },
  generic:        { date: ['date', 'transaction date', 'trans date', 'posted'], desc: ['description', 'merchant', 'payee', 'memo', 'name'], amt: ['amount', 'debit', 'charge'], cat: ['category', 'type'], sign: 'generic' },
}
function detectFormat(h) {
  const L = h.map(x => x.toLowerCase().trim())
  if (L.includes('posting date') && L.includes('balance') && L.includes('amount')) return 'chase_checking'
  if (L.includes('transaction date') && L.includes('type') && L.includes('amount')) return 'chase'
  if (L.includes('date') && L.includes('description') && L.includes('amount') && !L.includes('transaction date')) return 'amex'
  if ((L.includes('posted date') || L.includes('reference number')) && L.includes('amount')) return 'bofa'
  return 'generic'
}

// ── header-row detection (mirror extractSheet) ──
const HEADER_TOKENS = ['date', 'amount', 'description', 'payee', 'merchant', 'name', 'balance', 'ticker', 'category', 'debit', 'credit', 'posting']
function extractSheet(sheet) {
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
  let hi = 0, best = -1
  for (let i = 0; i < Math.min(aoa.length, 25); i++) {
    const cells = (aoa[i] || []).map(c => String(c ?? '').toLowerCase().trim())
    const ne = cells.filter(c => c !== '').length
    const ht = cells.some(c => HEADER_TOKENS.some(t => c === t || c.includes(t)))
    if (ht && ne > best) { best = ne; hi = i }
  }
  const hdr = (aoa[hi] || []).map(c => String(c ?? '').trim())
  const rows = []
  for (let i = hi + 1; i < aoa.length; i++) {
    const o = {}; let any = false
    hdr.forEach((h, j) => { if (h) { o[h] = aoa[i][j] ?? ''; if (String(o[h]).trim()) any = true } })
    if (any) rows.push(o)
  }
  return { headers: hdr.filter(Boolean), rows }
}

const parseCur = v => { if (v == null || v === '') return null; const n = parseFloat(String(v).replace(/[$,\s]/g, '')); return isNaN(n) ? null : n }
function parseDate(v) {
  if (!v) return null; const s = String(v).trim()
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/); if (m) { let y = +m[3]; if (y < 100) y += 2000; return `${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

const STRUCTURAL = new Set(['Card Payment', 'Transfer', 'Income', 'Debt Service', 'Taxes'])
function parseRows(rows, headers, account) {
  const fmt = detectFormat(headers); const cfg = BANK_FORMATS[fmt]
  const L = headers.map(h => h.toLowerCase().trim())
  const find = pats => { for (const p of pats) { const i = L.findIndex(h => h.includes(p) || p.includes(h)); if (i !== -1) return headers[i] } }
  const dC = find(cfg.date), sC = find(cfg.desc), aC = find(cfg.amt), cC = cfg.cat.length ? find(cfg.cat) : undefined
  const out = []
  for (const r of rows) {
    const dateStr = dC ? parseDate(r[dC]) : null; if (!dateStr) continue
    const description = sC ? String(r[sC] ?? '').trim() : ''; if (!description) continue
    const raw = parseCur(aC ? r[aC] : null); if (raw == null) continue
    let amount
    switch (cfg.sign) { case 'chase': amount = -raw; break; case 'amex': amount = raw; break; case 'bofa': amount = -raw; break; default: amount = raw < 0 ? -raw : raw }
    const autoCat = autoCategory(description)
    const bankCat = cC ? String(r[cC] ?? '').split('-')[0].trim() : ''
    const category = STRUCTURAL.has(autoCat) ? autoCat : (bankCat || autoCat)
    out.push({ user_id: USER_ID, transaction_date: dateStr, date: dateStr, merchant: description, amount, category, account_name: account, is_income: amount < 0, raw_description: description })
  }
  return { fmt, rows: out }
}

// ── run ──
const wb = XLSX.read(fs.readFileSync(FILE), { type: 'buffer' })
const { headers, rows: rawRows } = extractSheet(wb.Sheets[wb.SheetNames[0]])
const { fmt, rows } = parseRows(rawRows, headers, ACCOUNT)

const byCat = {}
for (const r of rows) { byCat[r.category] ??= { n: 0, net: 0 }; byCat[r.category].n++; if (!['Card Payment', 'Transfer'].includes(r.category)) byCat[r.category].net += r.amount }
console.log(`\n${FILE.split('/').pop()}  [${fmt}] → "${ACCOUNT}"`)
console.log(`parsed ${rows.length} rows from ${rawRows.length} raw`)
const f = n => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
for (const [c, v] of Object.entries(byCat).sort((a, b) => b[1].net - a[1].net)) console.log('  ' + c.padEnd(24), String(v.n).padStart(5), f(v.net).padStart(11))

if (!COMMIT) { console.log('\n(DRY RUN — pass --commit to write)'); process.exit(0) }

const supa = createClient(SUPA_URL, SERVICE_KEY, { auth: { persistSession: false } })
let inserted = 0
for (let i = 0; i < rows.length; i += 500) {
  const chunk = rows.slice(i, i + 500)
  const { data, error } = await supa.from('transactions').upsert(chunk, { onConflict: 'user_id,account_name,transaction_date,merchant,amount', ignoreDuplicates: true }).select('id')
  if (error) { console.error('batch error:', error.message); process.exit(1) }
  inserted += data?.length ?? 0
}
console.log(`\n✅ committed: ${inserted} new rows (${rows.length - inserted} dupes skipped)`)
