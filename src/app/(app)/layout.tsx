import Sidebar from '@/components/Sidebar'
import AnimatedBackground from '@/components/AnimatedBackground'
import AIChat from '@/components/AIChat'
import QueryProvider from '@/components/providers/QueryProvider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AnimatedBackground />
      <div className="relative z-10 flex h-screen">
        <Sidebar />
        <main
          className="flex-1 overflow-y-auto pb-20 md:pb-0"
          style={{ background: 'var(--bg-body)' }}
        >
          {children}
        </main>
      </div>
      <AIChat />
    </QueryProvider>
  )
}
