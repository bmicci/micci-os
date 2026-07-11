import TaskManager from '@/components/tasks/TaskManager'

export const metadata = { title: 'Tasks — Micci OS' }

export default function TasksPage() {
  return (
    <div className="flex flex-col min-h-full">
      <header
        className="shrink-0 px-6 py-4"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid rgba(0,212,255,0.1)',
        }}
      >
        <h1 className="text-lg font-bold gradient-text">Task Command Center</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Month-agnostic task manager · Categories · Deadline countdowns · Drag to reschedule
        </p>
      </header>
      <div className="flex-1 overflow-y-auto">
        <TaskManager />
      </div>
    </div>
  )
}
