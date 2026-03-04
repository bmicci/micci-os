import PlaceholderPage from '@/components/PlaceholderPage'
import DocumentUpload from '@/components/DocumentUpload'

export const metadata = { title: 'Health — Micci OS' }

export default function HealthPage() {
  return (
    <div className="flex flex-col min-h-full">
      <PlaceholderPage
        icon="🏋️"
        title="Health"
        description="Workouts, nutrition, sleep, and body metrics — your personal health dashboard."
        accentLabel="Port in progress"
      />
      <div className="px-6 md:px-10 pb-10">
        <DocumentUpload section="health" />
      </div>
    </div>
  )
}
