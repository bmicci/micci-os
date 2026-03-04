import PlaceholderPage from '@/components/PlaceholderPage'
import DocumentUpload from '@/components/DocumentUpload'

export const metadata = { title: 'Goals + Vision — Micci OS' }

export default function GoalsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <PlaceholderPage
        icon="🎯"
        title="Goals + Vision"
        description="Long-term vision, quarterly goals, milestones, and progress tracking."
        accentLabel="Port in progress"
      />
      <div className="px-6 md:px-10 pb-10">
        <DocumentUpload section="goals" />
      </div>
    </div>
  )
}
