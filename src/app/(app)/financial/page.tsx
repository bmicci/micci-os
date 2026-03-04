import PlaceholderPage from '@/components/PlaceholderPage'
import DocumentUpload from '@/components/DocumentUpload'

export const metadata = { title: 'Financial — Micci OS' }

export default function FinancialPage() {
  return (
    <div className="flex flex-col min-h-full">
      <PlaceholderPage
        icon="💰"
        title="Financial"
        description="Net worth tracking, budgets, investments, and cash flow — all in one place."
        accentLabel="Port in progress"
      />
      <div className="px-6 md:px-10 pb-10">
        <DocumentUpload section="financial" />
      </div>
    </div>
  )
}
