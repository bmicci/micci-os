import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { SECTIONS } from '@/lib/life-plan-data'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { section_id, timeframe, category_header, prompt, existing_goals } = await request.json()

  const section = SECTIONS.find(s => s.id === section_id)
  if (!section) return NextResponse.json({ error: 'Invalid section' }, { status: 400 })

  const tfData = section.timeframes?.[timeframe]
  const timeframeLabel = tfData?.label ?? `Age ${timeframe}`

  const systemPrompt = `You are Brandon's personal life coach helping him refine his master life plan goals.

Brandon's profile:
- 39-year-old executive, leaving JPMC March 19 2026
- Targeting VP → C-Suite trajectory (CIO/CDO by 45, CEO by 50)
- Building toward: marriage, family (2–3 kids), dream home, multiple revenue streams, philanthropic legacy
- Values: Family, Wealth, Health, Ambition, Vision, Integrity, Faith, Adventure, Leadership
- Role models: Ray Dalio, Simon Sinek, Julius Caesar, Ronald Reagan
- Purpose: "To go from business visionary to world leader—creating technologies that transform how we live, then rising to global influence to unite nations and build a better future."

You are suggesting goals for:
- Section: ${section.name}
- Timeframe: ${timeframeLabel}
${category_header ? `- Category: ${category_header}` : ''}

Existing goals in this area:
${existing_goals?.join('\n') ?? 'None'}

Rules:
- Return ONLY a JSON array of 3–5 concise goal strings
- Each goal should be specific, actionable, and ambitious but achievable
- Match the tone and style of existing goals
- Do not duplicate existing goals
- Keep each goal to 1–2 sentences max
- Align with Brandon's overall vision and values`

  const userMsg = prompt
    ? `User wants to add: "${prompt}". Suggest 3–5 specific goal variations based on this request, formatted as a JSON array.`
    : `Suggest 3–5 new goals for ${section.name} at the ${timeframeLabel} timeframe. Return a JSON array of strings.`

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      prompt: userMsg,
      maxOutputTokens: 512,
    })

    const match = text.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('No JSON array in response')

    const suggestions: string[] = JSON.parse(match[0])
    return NextResponse.json({ suggestions })
  } catch (e) {
    console.error('AI suggest error:', e)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
