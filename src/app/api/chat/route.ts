import { anthropic } from '@ai-sdk/anthropic'
import { streamText } from 'ai'
import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { retrieveRelevantChunks, getStructuredContext, type Section } from '@/lib/ai/retrieval'

export const maxDuration = 60

// Race a promise against a timeout. The chat's RAG + context phase runs
// BEFORE the first byte is sent — if any of it stalls (embeddings API,
// slow query), the whole chat appears to hang. Cap it hard and degrade.
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const encoder = new TextEncoder()
  const plainText = (msg: string) =>
    new Response(msg, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

  // Fail fast and LOUD on missing configuration. Without this check a
  // missing key dies inside streamText, AI SDK v6 routes the error to
  // onError and ends the stream cleanly — the user just sees an empty
  // bubble forever ("chat never works").
  if (!process.env.ANTHROPIC_API_KEY) {
    return plainText(
      '⚠️ AI chat is not configured: the ANTHROPIC_API_KEY environment variable is missing ' +
      'from this deployment. Add it in Vercel → micci-os → Settings → Environment Variables ' +
      '(get a key at console.anthropic.com), then redeploy.',
    )
  }

  const { messages, section = 'general' } = await request.json()
  const userMessage: string = messages[messages.length - 1]?.content ?? ''

  // Retrieve document chunks (RAG) — capped at 6s, degrades to no context.
  // Requires OPENAI_API_KEY (embeddings); skip silently if absent.
  let chunks: Awaited<ReturnType<typeof retrieveRelevantChunks>> = []
  if (process.env.OPENAI_API_KEY) {
    try {
      chunks = await withTimeout(
        retrieveRelevantChunks(userMessage, section as Section, 8, 0.5),
        6000,
        [],
      )
    } catch (err) {
      console.warn('[chat/route] RAG retrieval failed, continuing without:', err)
    }
  }

  // Structured data context — capped at 5s, degrades to none.
  let structuredContext = ''
  try {
    structuredContext = await withTimeout(getStructuredContext(section as Section), 5000, '')
  } catch (err) {
    console.warn('[chat/route] structured context failed, continuing without:', err)
  }

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
- Left JPMC March 19, 2026 — now in stabilization mode (unemployment bridge, TWC benefits end Oct 2026, active job search)
- Texas CU HELOC @ 6.85% ($190K limit) — high-rate debt rolled onto it; 0% promos paid from HELOC as they expire
- The cash runway (cash-out date) is the number that matters most
- TRT protocol active (Testosterone + hCG + Anastrozole)

Always be direct and data-driven. Reference actual numbers from the data when answering. Be concise but thorough. If you don't have data to answer a question, say so clearly.

Life Plan context (when section is life-plan):
- Brandon has ~480 life goals organized across 10 categories (Health, Career, Relationships, Family, Finance, Home, Fun, Memberships, Personal Development, Spiritual)
- Goals are grouped by timeframes: Age 40 (1yr), Age 45 (5yr), Age 50 (10yr), Age 55 (15yr), Age 60 (20yr)
- Foundation: Vision → C-Suite by 45, CEO by 50, Forbes cover, Governor capstone. Purpose → Business visionary to world leader.
- Role models: Ray Dalio, Simon Sinek, Julius Caesar, Ronald Reagan
- Custom/AI-added goals are tracked in the database and available in structured context${structuredContext ? `\n\n## Structured Data from Database${structuredContext}` : ''}${ragContext}`

  // Store user message — graceful fallback if table missing
  let service: Awaited<ReturnType<typeof createServiceClient>> | null = null
  try {
    service = await createServiceClient()
    await service.from('chat_messages').insert({
      user_id: user.id,
      section,
      role: 'user',
      content: userMessage,
    })
  } catch { /* chat_messages table may not exist yet */ }

  const result = streamText({
    model: anthropic('claude-opus-5'),
    system: systemPrompt,
    messages,
    onError: ({ error }) => {
      console.error('[chat/route] streamText error:', error)
    },
    onFinish: async ({ text }) => {
      if (!service || !text) return
      try {
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
      } catch { /* graceful fallback */ }
    },
  })

  // Pipe via fullStream, NOT textStream: in AI SDK v6 a provider error
  // (bad key, model error, overload) is emitted as an 'error' part and
  // textStream simply ENDS — the client would render an empty bubble with
  // no clue why. fullStream lets us surface the real error to the user.
  const stream = new ReadableStream({
    async start(controller) {
      let emitted = false
      try {
        for await (const part of result.fullStream) {
          if (part.type === 'text-delta') {
            emitted = true
            controller.enqueue(encoder.encode(part.text))
          } else if (part.type === 'error') {
            const raw = part.error
            const msg = raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : JSON.stringify(raw)
            console.error('[chat/route] stream error part:', msg)
            controller.enqueue(encoder.encode(`${emitted ? '\n\n' : ''}⚠️ AI error: ${msg}`))
            emitted = true
          }
        }
        if (!emitted) {
          controller.enqueue(encoder.encode('⚠️ The model returned no output. Check the ANTHROPIC_API_KEY in Vercel and the server logs.'))
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Stream error'
        console.error('[chat/route] stream iteration error:', err)
        controller.enqueue(encoder.encode(`${emitted ? '\n\n' : ''}⚠️ ${msg}`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
