import { Upload } from 'lucide-react'
import ImportCenter from '@/components/import/ImportCenter'

export const metadata = {
  title: 'Import Center — micci-os',
}

export default function ImportPage() {
  return (
    <div
      className="flex flex-col gap-6 p-6 md:p-8 max-w-5xl mx-auto w-full"
      style={{ minHeight: '100%' }}
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Upload size={24} strokeWidth={2} className="text-[var(--accent-cyan)]" />
          <h1
            className="gradient-text"
            style={{
              fontSize: 26,
              fontWeight: 700,
              fontFamily: 'var(--font-geist-mono)',
              letterSpacing: '-0.01em',
            }}
          >
            Import Center
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginLeft: 43 }}>
          Upload Excel or CSV files to sync your financial data with Supabase. The dashboard
          will immediately reflect the imported numbers.
        </p>
      </div>

      <ImportCenter />
    </div>
  )
}
