import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { section_id, timeframe, category_header, prompt } = await request.json()

  // Fetch section metadata + existing goals from DB
  const [{ data: section }, { data: existingGoals }] = await Promise.all([
    supabase.from('life_plan_sections').select('*').eq('id', section_id).single(),
    supabase
      .from('life_plan_goals')
      .select('goal_text')
      .eq('section_id', section_id)
      .eq('timeframe', timeframe)
      .order('sort_order'),
  ])

  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

  const sectionName: string = section.name
  const tfLabels: Record<string, string> = {
    '40': 'Age 40 (1 Year)',
    '45': 'Age 45 (5 Years)',
    '50': 'Age 50 (10 Years)',
    '60': 'Age 60 (20 Years)',
    'all': 'All Ages',
    'pinned': 'Pinned / Top Priority',
  }
  const timeframeLabel = tfLabels[timeframe] ?? `Age ${timeframe}`

  const systemPrompt = `You are Brandon's personal life coach helping him build his master life plan.

Brandon's profile:
- 39-year-old executive, leaving JPMC March 19 2026
- Targeting VP → C-Suite trajectory (CIO/CDO by 45, CEO by 50)
- Building toward: marriage, family (2–3 kids), dream home, multiple revenue streams, philanthropic legacy
- Values: Family, Wealth, Health, Ambition, Vision, Integrity, Faith, Adventure, Leadership
- Role models: Ray Dalio, Simon Sinek, Julius Caesar, Ronald Reagan
- Purpose: "To go from business visionary to world leader—creating technologies that transform how we live, then rising to global influence to unite nations and build a better future."

You are suggesting goals for:
- Section: ${sectionName}
- Timeframe: ${timeframeLabel}
${category_header ? `- Category: ${category_header}` : ''}

Existing goals in this area:
${existingGoals?.map(g => `- ${g.goal_text}`).join('\n') ?? 'None yet'}

Rules:
- Return ONLY a JSON array of 3-5 concise goal strings, nothing else
- Each goal should be specific, actionable, and ambitious but achievable
- Match the tone and style of existing goals (short, punchy phrases)
- Do not duplicate existing goals
- Keep each goal to 1-2 sentences max
- Align with Brandon's overall vision and values`

  const userMsg = prompt
    ? `User wants to add goals related to: "${prompt}". Suggest 3-5 specific goal variations, formatted as a JSON array of strings only.`
    : `Suggest 3-5 new goals for ${sectionName} at the ${timeframeLabel} timeframe. Return a JSON array of strings only.`

  try {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-6'),
      system: systemPrompt,
      prompt: userMsg,
      maxOutputTokens: 512,
    })

    const match = text.match(/\[[\s\S]*?\]/)
    if (!match) throw new Error('No JSON array in response')

    const suggestions: string[] = JSON.parse(match[0])
    return NextResponse.json({ suggestions })
  } catch (e) {
    console.error('AI suggest error:', e)
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
  }
}
