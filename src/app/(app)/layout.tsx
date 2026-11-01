import Sidebar from '@/components/Sidebar'
import AnimatedBackground from '@/components/AnimatedBackground'
import AIChat from '@/components/AIChat'
import QueryProvider from '@/components/providers/QueryProvider'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="ambient-glow" aria-hidden="true"><span /></div>
      <AnimatedBackground />
      <div className="relative z-10 flex h-screen">
        <Sidebar />
        {/* Transparent so the ambient glow shows through and the glass
            cards have something to blur */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <AIChat />
    </QueryProvider>
  )
}
