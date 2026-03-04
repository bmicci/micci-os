import PlaceholderPage from '@/components/PlaceholderPage'
import DocumentUpload from '@/components/DocumentUpload'

export const metadata = { title: 'Planner — Micci OS' }

export default function PlannerPage() {
  return (
    <div className="flex flex-col min-h-full">
      <PlaceholderPage
        icon="📅"
        title="Planner"
        description="Daily schedule, time blocks, tasks, and weekly reviews."
        accentLabel="Port in progress"
      />
      <div className="px-6 md:px-10 pb-10">
        <DocumentUpload section="planner" />
      </div>
    </div>
  )
}
