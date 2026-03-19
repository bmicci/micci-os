import Link from 'next/link'

export const metadata = { title: 'Design Hub — House — Micci OS' }

export default function HouseDesignPage() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="shrink-0 px-6 py-4" style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
        <h1 className="text-lg font-bold gradient-text">🎨 Design Hub</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Inspiration boards, color palettes, furniture tracker — coming soon
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-5xl">🎨</p>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Design Hub</h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Inspiration boards, color palettes, furniture tracker with status management,
            and mood boards per room — building in Phase H.11.
          </p>
          <Link href="/house" className="inline-block mt-2 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-cyan-500/40 hover:text-[var(--accent-cyan)] transition-all">
            ← Back to House Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
