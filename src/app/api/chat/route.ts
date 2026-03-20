import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getStructuredContext, type Section } from '@/lib/ai/retrieval'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages, section = 'general' } = await request.json()
  const userMessage: string = messages[messages.length - 1]?.content ?? ''

  // Fetch structured context from Supabase — skip RAG (requires OpenAI key not configured)
  let structuredContext = ''
  try {
    structuredContext = await getStructuredContext(section as Section)
  } catch { /* graceful fallback if tables missing */ }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const systemPrompt = `You are Brandon's personal AI assistant embedded in his life OS app. You have access to his real financial data, goals, wellness protocols, and planning data.

Current context: ${section}
Today: ${today}

Key facts:
- JPMC exit March 19 2026 (employment end date)
- Texas CU HELOC @ 6.85%
- Survival budget phase — every dollar tracked
- TRT protocol active (Testosterone + hCG + Anastrozole)
- Job search in progress, targeting 40+ applications by March 19

Always be direct and data-driven. Reference actual numbers from the data when answering. Be concise but thorough. If you don't have data to answer a question, say so clearly.

Life Plan context (when section is life-plan):
- Brandon has ~300 static life goals organized across 10 categories (Health, Career, Relationships, Family, Finance, Home, Fun, Memberships, Personal Development, Spiritual)
- Goals are grouped by timeframes: Age 40 (1yr), Age 45 (5yr), Age 50 (10yr), Age 60 (20yr)
- Foundation: Vision → C-Suite by 45, CEO by 50, Forbes cover, Governor capstone. Purpose → Business visionary to world leader.
- Role models: Ray Dalio, Simon Sinek, Julius Caesar, Ronald Reagan
- Custom/AI-added goals are tracked in the database and available in structured context${structuredContext ? `\n\n## Structured Data from Database\n${structuredContext}` : ''}`

  // Persist user message (best-effort)
  let service: Awaited<ReturnType<typeof createServiceClient>> | null = null
  try {
    service = await createServiceClient()
    await service.from('chat_messages').insert({ user_id: user.id, section, role: 'user', content: userMessage })
  } catch { /* chat_messages table may not exist */ }

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    messages,
    onFinish: async ({ text }) => {
      if (!service) return
      try {
        await service.from('chat_messages').insert({ user_id: user.id, section, role: 'assistant', content: text })
      } catch { /* graceful fallback */ }
    },
  })

  return result.toTextStreamResponse()
}
