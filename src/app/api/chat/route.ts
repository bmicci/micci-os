import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { retrieveRelevantChunks, getStructuredContext, type Section } from '@/lib/ai/retrieval'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { messages, section = 'general' } = await request.json()
  const userMessage: string = messages[messages.length - 1]?.content ?? ''

  // Retrieve relevant document chunks (RAG)
  const chunks = await retrieveRelevantChunks(userMessage, section as Section, 8, 0.5)

  // Fetch structured data from relevant tables
  const structuredContext = await getStructuredContext(section as Section)

  // Build context string
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  let ragContext = ''
  if (chunks.length > 0) {
    ragContext = '\n\n## Retrieved Document Context\n'
    chunks.forEach((chunk, i) => {
      ragContext += `\n### Source ${i + 1} (similarity: ${(chunk.similarity * 100).toFixed(0)}%)\n${chunk.content}\n`
    })
  }

  const systemPrompt = `You are Brandon's personal AI assistant embedded in his life OS app. You have access to his real financial data, goals, wellness protocols, and planning data.

Current context: ${section}
Today: ${today}

Key facts:
- JPMC exit March 19 2026 (employment end date)
- Texas CU HELOC @ 6.85%
- Survival budget phase — every dollar tracked
- TRT protocol active (Testosterone + hCG + Anastrozole)
- Job search in progress, targeting 40+ applications by March 19

Always be direct and data-driven. Reference actual numbers from the data when answering. Be concise but thorough. If you don't have data to answer a question, say so clearly.${structuredContext ? `\n\n## Structured Data from Database${structuredContext}` : ''}${ragContext}`

  // Store user message
  const service = await createServiceClient()
  await service.from('chat_messages').insert({
    user_id: user.id,
    section,
    role: 'user',
    content: userMessage,
  })

  // Stream response
  const result = streamText({
    model: anthropic('claude-sonnet-4-5'),
    system: systemPrompt,
    messages,
    onFinish: async ({ text }) => {
      // Store assistant response with sources
      const sources = chunks.map((c) => ({
        document_id: c.document_id,
        content_preview: c.content.slice(0, 120),
        similarity: c.similarity,
      }))

      await service.from('chat_messages').insert({
        user_id: user.id,
        section,
        role: 'assistant',
        content: text,
        sources,
      })
    },
  })

  return result.toDataStreamResponse()
}
