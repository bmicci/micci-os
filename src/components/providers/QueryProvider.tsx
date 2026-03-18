'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { makeQueryClient } from '@/lib/query-client'

export default function QueryProvider({ children }: { children: ReactNode }) {
  // Create query client once per component lifecycle (stable across re-renders)
  const [queryClient] = useState(() => makeQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
