'use client'

import { useState } from 'react'

// ── Data ───────────────────────────────────────────────────────────────────

const AM_ROUTINE = [
  {
    step: 1, name: 'Cleanser',
    product: 'LANEIGE Water Bank Gentle Gel Cleanser',
    alt: 'ALT: The Face Shop Rice Water Bright (adds mild brightening from rice water)',
    note: '30-60 sec, lukewarm water. Gentle pH 5.0 won\'t strip barrier — important since tretinoin is working overnight.',
    star: false,
  },
  {
    step: 2, name: 'Toner Pads (Brightening)',
    product: 'Biodance Vita Niacinamide Gel Toner Pads',
    alt: 'ALT: Eqqualberry Swimming Pool Toner (liquid — more hydrating option)',
    note: 'Swipe one pad across face. Delivers niacinamide for daily brightening + preps skin for Vitamin C absorption. Safe every day, even after tret nights.',
    star: false,
  },
  {
    step: 3, name: 'Vitamin C Serum',
    product: 'Numbuzin No.5 Vitamin Concentrated Serum',
    alt: '',
    note: '3-4 drops, pat into skin. Your #1 dark spot weapon — attacks pigmentation from 4 pathways (Vit C + Glutathione + TXA + Niacinamide). Wait 2-3 min before next step. MORNING ONLY — never at night with tretinoin.',
    star: true,
  },
  {
    step: 4, name: 'Essence',
    product: 'COSRX Advanced Snail 96 Mucin Power Essence',
    alt: '',
    note: '2-3 pumps, pat in. Snail mucin hydrates, repairs, fades spots, and plumps fine lines. The hydration base that makes everything else absorb better.',
    star: false,
  },
  {
    step: 5, name: 'Moisturizer',
    product: 'Medicube Collagen Jelly Cream',
    alt: 'Can layer Arencia Vitamin C Booster Shot underneath for extra Vit C + glutathione',
    note: 'Freeze-dried hydrolyzed collagen + niacinamide + squalane. Lightweight AM weight — sits well under sunscreen. Gives that glass-skin glow finish.',
    star: false,
  },
  {
    step: 6, name: 'Sunscreen SPF 50+',
    product: 'Beauty of Joseon Relief Sun SPF50+ PA++++',
    alt: 'Innisfree SPF 36 for fully indoor days ONLY as backup',
    note: 'LAST STEP. Generous amount — face, neck, ears. Reapply every 2 hrs outdoors. Rice bran + probiotics hydrate while protecting. This single product defends everything else in your routine.',
    star: true,
  },
]

const PM_TRET = [
  {
    step: 1, name: 'Oil Cleanser',
    product: 'ANUA Heartleaf Pore Control Cleansing Oil',
    alt: '',
    note: 'Massage onto DRY face 30-60 sec — dissolves sunscreen, sebum, SPF residue. Emulsify with water, rinse. Heartleaf calms while deep-cleaning pores.',
    star: false,
  },
  {
    step: 2, name: 'Water Cleanser',
    product: 'LANEIGE Water Bank Gentle Gel Cleanser',
    alt: 'ALT: The Face Shop Rice Water Bright',
    note: 'Second cleanse sweeps away remaining residue. 30 sec, lukewarm water. Skin should feel clean but not tight.',
    star: false,
  },
  {
    step: 3, name: 'Hydrating Toner (Buffer)',
    product: 'Torriden Dive-In Low Molecular HA Toner',
    alt: 'ALT: Eqqualberry Swimming Pool Toner',
    note: 'Pat 2-3 layers onto face. 5 weights of hyaluronic acid flood skin with moisture before tret. This buffer layer is what prevents flaking and irritation. THEN WAIT — skin must be FULLY DRY (15-20 min) before tret.',
    star: false,
  },
  {
    step: 4, name: 'TRETINOIN',
    product: 'Tretinoin Cream (Rx)',
    alt: '',
    note: 'Pea-sized amount, spread across full face. Apply to COMPLETELY DRY skin. Sandwich method: toner → dry → tret → wait 5-10 min → ampoule → moisturizer. Start 2-3x/week, build to nightly over 6-8 weeks.',
    star: true,
  },
  {
    step: 5, name: 'Barrier Repair Ampoule',
    product: 'Biodance Hydro Cera-Nol Ampoule',
    alt: 'ALT: COSRX Snail 96 Mucin Essence',
    note: 'Ceramide + panthenol + HA rebuilds barrier after tret. Apply after tret has absorbed (5-10 min). This is your overnight recovery layer.',
    star: false,
  },
  {
    step: 6, name: 'Eye Cream',
    product: 'Beauty of Joseon Revive Eye Serum (Ginseng + Retinal)',
    alt: '',
    note: 'Ring finger, gentle patting around orbital bone. Contains retinal — SKIP tretinoin around eye area since this already delivers vitamin A there. Targets crow\'s feet, dark circles, puffiness.',
    star: false,
  },
  {
    step: 7, name: 'Night Moisturizer',
    product: 'BioHeal BOH Probioderm 3D Lifting Cream',
    alt: '',
    note: '17 peptides + probiotics + Core V-uilder™ seal everything in. Rich enough to combat tret dryness and support overnight repair. Your anchor night cream.',
    star: false,
  },
]

const PM_OFF = [
  {
    step: 1, name: 'Oil Cleanser',
    product: 'ANUA Heartleaf Pore Control Cleansing Oil',
    alt: '',
    note: 'Same double cleanse as tret nights.',
    star: false,
  },
  {
    step: 2, name: 'Water Cleanser',
    product: 'LANEIGE Water Bank Gentle Gel Cleanser',
    alt: '',
    note: '',
    star: false,
  },
  {
    step: 3, name: 'Exfoliating Pads',
    product: 'Medicube Zero Pore Pads 2.0',
    alt: 'ALT: COSRX BHA Blackhead Power Liquid (deeper BHA) OR Medicube Pore Release (2% salicylic acid)',
    note: 'Swipe textured/embossed side first (exfoliate), flip to smooth side (hydrate + calm). 4.5% AHA + 0.45% BHA declog pores. Rotate with COSRX BHA for variety. Pick ONE exfoliant per night — never stack. NEVER use on tret nights.',
    star: true,
  },
  {
    step: 4, name: 'Hydrating Toner',
    product: 'Torriden Dive-In Low Molecular HA Toner',
    alt: 'ALT: Eqqualberry Swimming Pool Toner',
    note: 'Rehydrate after exfoliation. Pat in 1-2 layers.',
    star: false,
  },
  {
    step: 5, name: 'Brightening Serum',
    product: 'Anua Niacinamide 10% + TXA 4% Serum',
    alt: '',
    note: 'Your night-shift dark spot treatment. 10% niacinamide + 4% tranexamic acid + arbutin. Complements your AM Numbuzin — together they attack pigmentation around the clock from different angles.',
    star: false,
  },
  {
    step: 6, name: 'Essence',
    product: 'COSRX Advanced Snail 96 Mucin Power Essence',
    alt: '',
    note: 'Hydration + repair. Snail mucin accelerates healing after exfoliation.',
    star: false,
  },
  {
    step: 7, name: 'Eye Cream',
    product: 'Beauty of Joseon Revive Eye Serum',
    alt: '',
    note: 'Ginseng + retinal for fine lines and dark circles.',
    star: false,
  },
  {
    step: 8, name: 'Sleeping Mask / Night Cream',
    product: 'LANEIGE Bouncy & Firm Sleeping Mask',
    alt: 'ROTATE: LANEIGE Water Sleeping Mask (hydration) OR Biodance Bio Collagen Real Deep Mask (plumping)',
    note: 'Bouncy & Firm → firming/anti-aging. Water → deep hydration recovery. Biodance Collagen → plumping + pore refinement. Choose based on what skin needs that night.',
    star: false,
  },
]

const SCHEDULE = [
  { day: 'MON', type: 'tret', label: 'Tretinoin', emoji: '💊', detail: 'Tret + BOH Lifting Cream', mask: '' },
  { day: 'TUE', type: 'off',  label: 'Pore Clear', emoji: '✨', detail: 'Zero Pore Pads + Anua TXA', mask: '' },
  { day: 'WED', type: 'tret', label: 'Tretinoin', emoji: '💊', detail: 'Tret + BOH Lifting Cream', mask: '' },
  { day: 'THU', type: 'off',  label: 'Brighten',  emoji: '✨', detail: 'COSRX BHA + Anua TXA', mask: 'Biodance Collagen' },
  { day: 'FRI', type: 'tret', label: 'Tretinoin', emoji: '💊', detail: 'Tret + BOH Lifting Cream', mask: '' },
  { day: 'SAT', type: 'off',  label: 'Deep Clean', emoji: '✨', detail: 'Zero Pore Pads + Clay Mask', mask: 'Volcanic Clay' },
  { day: 'SUN', type: 'off',  label: 'Recovery',  emoji: '🧖', detail: 'Anua TXA only (gentle)', mask: 'Sleeping Mask' },
]

const WEEKLY = [
  { name: 'Medicube Zero Pore Pads 2.0',       freq: '2-3x/week · Off-nights Step 3', note: 'Primary pore exfoliation. Embossed side scrubs, smooth side soothes. Can also leave on nose/cheeks 5 min as mini mask.', tag: 'PORES' },
  { name: 'Innisfree Volcanic Pore Clay Mask',  freq: '1x/week · Saturday off-night',  note: 'Deep pore detox. Apply after cleansing, 10-15 min, rinse. Don\'t combine with Zero Pore Pads same night.', tag: 'PORES' },
  { name: 'Biodance Bio Collagen Real Deep Mask', freq: '1-2x/week · Off-nights',      note: 'Collagen + HA for deep hydration and plumping. Replaces sleeping mask. Mask fully melts and absorbs overnight.', tag: 'HYDRATE' },
  { name: 'Grace & Stella Restoring Eye Masks', freq: '2-3x/week · Mornings',          note: 'Apply during AM routine while Numbuzin Vit C absorbs (2-3 min). De-puffs + hydrates under-eyes. Multitask the wait time!', tag: 'EYES' },
  { name: 'Biodance Caviar Pore Patches',       freq: '1-2x/week · Off-nights',        note: 'Targeted pore patches for nose/cheeks. Apply after cleansing, before serums.', tag: 'PORES' },
]

const TAG_COLORS: Record<string, string> = {
  PORES:   'text-blue-300 bg-blue-500/10 border-blue-500/20',
  HYDRATE: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  EYES:    'text-purple-300 bg-purple-500/10 border-purple-500/20',
}

const PRODUCT_GROUPS = [
  { cat: 'Cleansers', items: ['ANUA Heartleaf Pore Control Cleansing Oil', 'LANEIGE Water Bank Gentle Gel Cleanser', 'The Face Shop Rice Water Bright Cleanser'] },
  { cat: 'Toners & Pads', items: ['Torriden Dive-In Low Molecular HA Toner', 'Biodance Vita Niacinamide Gel Toner Pads', 'Eqqualberry Swimming Pool Toner', 'Mediheal Tea Tree Trouble Pads', 'Medicube Zero Pore Pads 2.0'] },
  { cat: 'Serums & Actives', items: ['Numbuzin No.5 Vitamin Concentrated Serum', 'Anua Niacinamide 10% + TXA 4% Serum', 'COSRX BHA Blackhead Power Liquid', 'Medicube Pore Release (2% Salicylic Acid)', 'Tretinoin Cream (Rx)'] },
  { cat: 'Essences & Ampoules', items: ['COSRX Advanced Snail 96 Mucin Power Essence', 'Biodance Hydro Cera-Nol Ampoule', 'Arencia Vitamin C Booster Shot'] },
  { cat: 'Moisturizers', items: ['Medicube Collagen Jelly Cream', 'BioHeal BOH Probioderm 3D Lifting Cream'] },
  { cat: 'Sunscreen', items: ['Beauty of Joseon Relief Sun SPF50+ PA++++', 'Innisfree Daily UV Defense SPF 36 (backup)'] },
  { cat: 'Eye Care', items: ['Beauty of Joseon Revive Eye Serum (Ginseng + Retinal)', 'Grace & Stella Restoring Eye Masks'] },
  { cat: 'Masks & Treatments', items: ['LANEIGE Water Sleeping Mask', 'LANEIGE Bouncy & Firm Sleeping Mask', 'Biodance Bio Collagen Real Deep Mask', 'Innisfree Volcanic Pore Clay Mask', 'Biodance Caviar Pore Patches', 'Hero Cosmetics Spot Treatment', 'LANEIGE Lip Sleeping Mask'] },
]

const TOTAL_PRODUCTS = PRODUCT_GROUPS.reduce((sum, g) => sum + g.items.length, 0)

// ── Sub-components ─────────────────────────────────────────────────────────

function StepRow({ s }: { s: typeof AM_ROUTINE[number] }) {
  return (
    <div className={`px-4 py-3.5 mb-2 rounded-xl border transition-colors ${
      s.star
        ? 'bg-amber-500/5 border-amber-500/20'
        : 'bg-white/2 border-white/6 hover:bg-white/4'
    }`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
          s.star
            ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
            : 'bg-white/8 border border-white/12 text-[var(--text-muted)]'
        }`}>
          {s.step}
        </div>
        <span className={`text-sm font-semibold ${s.star ? 'text-amber-300' : 'text-[var(--text-primary)]'}`}>
          {s.name}
          {s.star && <span className="ml-1.5 text-amber-400">⭐</span>}
        </span>
      </div>
      <div className="ml-9">
        <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">{s.product}</p>
        {s.alt && <p className="text-[10px] text-[var(--text-muted)] mb-1.5">{s.alt}</p>}
        {s.note && <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">{s.note}</p>}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SkincareRoutine() {
  const [tab, setTab] = useState<'am' | 'tret' | 'off' | 'week' | 'all'>('am')

  const tabs = [
    { k: 'am'   as const, l: '☀️ AM',        sub: '6 steps' },
    { k: 'tret' as const, l: '🌙 Tret Night', sub: '7 steps' },
    { k: 'off'  as const, l: '✨ Off Night',  sub: '8 steps' },
    { k: 'week' as const, l: '📋 Weekly',     sub: 'schedule' },
    { k: 'all'  as const, l: '📦 Collection', sub: `${TOTAL_PRODUCTS} products` },
  ]

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            🧴 K-Beauty + Tretinoin Protocol
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {TOTAL_PRODUCTS} products · 3 routine modes · Dark spots · Anti-aging · Pore clarity
          </p>
        </div>
        <span className="text-[10px] font-semibold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-1 uppercase">
          All Ordered
        </span>
      </div>

      {/* Tab strip */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`shrink-0 px-3.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
              tab === t.k
                ? 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)]'
                : 'bg-white/3 border-white/8 text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-secondary)]'
            }`}
          >
            <div className="text-xs font-semibold whitespace-nowrap">{t.l}</div>
            <div className="text-[9px] mt-0.5 opacity-70">{t.sub}</div>
          </button>
        ))}
      </div>

      {/* ── AM ───────────────────────────────────────────────────────── */}
      {tab === 'am' && (
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest text-center mb-4">
            Every Morning · Protect · Brighten · Defend
          </p>
          {AM_ROUTINE.map((s) => <StepRow key={s.step} s={s} />)}
          <div className="mt-3 px-4 py-3 rounded-xl bg-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/15">
            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
              💡 <strong className="text-[var(--text-primary)]">Pro tip:</strong> Pop on Grace & Stella eye masks while your Numbuzin absorbs (2-3 min wait). De-puff + hydrate while you multitask.
            </p>
          </div>
        </div>
      )}

      {/* ── Tret Night ───────────────────────────────────────────────── */}
      {tab === 'tret' && (
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest text-center mb-4">
            Mon · Wed · Fri → Build to Nightly
          </p>
          <div className="px-4 py-3 mb-4 rounded-xl bg-red-500/5 border border-red-500/15">
            <p className="text-xs font-semibold text-red-300 mb-2">⚠️ Tret Night Rules</p>
            <div className="text-[10px] text-[var(--text-muted)] space-y-1 leading-relaxed">
              <p>✗ No exfoliants (Zero Pore Pads, COSRX BHA, Pore Release)</p>
              <p>✗ No vitamin C (Numbuzin = morning only)</p>
              <p>✗ No clay masks</p>
              <p>✓ Skin must be FULLY DRY before tret (15-20 min)</p>
              <p>✓ Sandwich: toner → dry → tret → wait → ampoule → cream</p>
              <p>✓ Hero patches for any purge breakouts</p>
            </div>
          </div>
          {PM_TRET.map((s) => <StepRow key={s.step} s={s} />)}
        </div>
      )}

      {/* ── Off Night ────────────────────────────────────────────────── */}
      {tab === 'off' && (
        <div>
          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest text-center mb-4">
            Tue · Thu · Sat · Sun — Active Treatment Nights
          </p>
          <div className="px-4 py-3 mb-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
            <p className="text-xs font-semibold text-emerald-300 mb-2">✅ Off-nights = pore clearing + brightening</p>
            <div className="text-[10px] text-[var(--text-muted)] space-y-1 leading-relaxed">
              <p>• Medicube Zero Pore Pads OR COSRX BHA (pick one)</p>
              <p>• Anua Niacinamide + TXA serum for dark spots</p>
              <p>• Masks, sleeping packs, pore patches all OK</p>
            </div>
          </div>
          {PM_OFF.map((s) => <StepRow key={s.step} s={s} />)}
        </div>
      )}

      {/* ── Weekly Schedule ──────────────────────────────────────────── */}
      {tab === 'week' && (
        <div className="space-y-5">
          {/* 7-day grid */}
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Weekly Night Schedule</p>
            <div className="grid grid-cols-7 gap-1.5">
              {SCHEDULE.map((d) => (
                <div
                  key={d.day}
                  className={`text-center p-2 rounded-xl border ${
                    d.type === 'tret'
                      ? 'bg-amber-500/8 border-amber-500/20'
                      : 'bg-emerald-500/5 border-emerald-500/12'
                  }`}
                >
                  <p className="text-[8px] font-bold tracking-widest text-[var(--text-muted)] mb-1.5">{d.day}</p>
                  <p className="text-sm mb-1">{d.emoji}</p>
                  <p className={`text-[7px] font-semibold leading-tight ${d.type === 'tret' ? 'text-amber-300' : 'text-emerald-300'}`}>
                    {d.label}
                  </p>
                  <p className="text-[6px] text-[var(--text-muted)] leading-tight mt-1 min-h-[18px]">{d.detail}</p>
                  {d.mask && <p className="text-[6px] text-purple-300 font-bold mt-1">{d.mask}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Weekly treatments */}
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Weekly Treatments</p>
            <div className="space-y-2">
              {WEEKLY.map((t, i) => (
                <div key={i} className="px-4 py-3 rounded-xl bg-[var(--card-bg)] border border-white/8">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{t.name}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TAG_COLORS[t.tag] ?? 'text-[var(--text-muted)]'}`}>
                      {t.tag}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--accent-cyan)] font-medium mb-1">{t.freq}</p>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">{t.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Always remember */}
          <div className="px-4 py-4 rounded-xl bg-[var(--card-bg)] border border-[var(--card-border)]">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">💡 Always Remember</p>
            <div className="space-y-1.5 text-[10px] text-[var(--text-muted)] leading-relaxed">
              <p>• <strong className="text-[var(--text-secondary)]">LANEIGE Lip Sleeping Mask</strong> — every night, lips only</p>
              <p>• <strong className="text-[var(--text-secondary)]">Hero Cosmetics patches</strong> — on standby for tret purge breakouts</p>
              <p>• <strong className="text-[var(--text-secondary)]">Mediheal Tea Tree Pads</strong> — AM use if skin feels oily/inflamed</p>
              <p>• <strong className="text-[var(--text-secondary)]">Arencia Vitamin C Booster Shot</strong> — layer under Medicube Jelly Cream as extra AM moisture + mild Vit C</p>
              <p>• <strong className="text-[var(--text-secondary)]">Results timeline</strong> — 4-6 wks brightness · 8-12 wks dark spots · 3-6 months wrinkles</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Collection ──────────────────────────────────────────── */}
      {tab === 'all' && (
        <div>
          <div className="text-center mb-5">
            <p className="text-4xl font-bold gradient-text">{TOTAL_PRODUCTS}</p>
            <p className="text-xs text-[var(--text-muted)]">products in your arsenal</p>
          </div>
          <div className="space-y-4">
            {PRODUCT_GROUPS.map((group) => (
              <div key={group.cat}>
                <p className="text-[10px] font-bold text-[var(--accent-cyan)] uppercase tracking-widest mb-2 px-1">
                  {group.cat}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div key={item} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/2 border border-white/5 hover:bg-white/4 transition-colors">
                      <span className="text-emerald-400 text-[10px]">✓</span>
                      <span className="text-xs text-[var(--text-secondary)]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
