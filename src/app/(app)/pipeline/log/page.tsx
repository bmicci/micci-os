import Link from 'next/link'
import { getPipelineData } from '@/lib/pipeline-data'
import QuickLog from '@/components/pipeline/QuickLog'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Log a Touch — Micci OS' }

export default async function LogPage() {
  const { companies, contacts } = await getPipelineData()
  return (
    <div className="px-6 md:px-10 py-8 space-y-4 max-w-[1200px]">
      <div>
        <Link href="/pipeline" className="text-[12px]" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>
          ← Pipeline
        </Link>
        <h1 className="text-2xl font-bold gradient-text mt-1">⚡ Log a Touch</h1>
        <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          Ten seconds or it doesn&apos;t get used. Logging against a contact auto-sets their next follow-up date.
        </p>
      </div>
      <QuickLog companies={companies} contacts={contacts} />
    </div>
  )
}
