// xAI / Grok client for Edge Functions
// Uses Responses API. Model from env GROK_MODEL (default grok-4.7)

const BASE = 'https://api.x.ai/v1'

export interface GrokResult {
  text: string
  sources: { title: string; url: string }[]
  input_tokens: number
  output_tokens: number
}

export async function callGrok(
  system: string,
  user: string,
  tools: ('web' | 'x')[] = []
): Promise<GrokResult> {
  const apiKey = Deno.env.get('XAI_API_KEY')
  const model = Deno.env.get('GROK_MODEL') || 'grok-4.7'
  if (!apiKey) throw new Error('XAI_API_KEY missing')

  const toolList = tools.map(t => ({ type: t === 'web' ? 'web_search' : 'x_search' }))

  const body = {
    model,
    input: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    tools: toolList.length ? toolList : undefined,
  }

  let lastErr: Error | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${BASE}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`xAI ${res.status}: ${errText}`)
      }
      const data = await res.json()
      // Responses API shape: output text in data.output or similar; adapt as needed
      const text = data.output?.[0]?.content?.[0]?.text
        || data.choices?.[0]?.message?.content
        || data.text
        || JSON.stringify(data)
      const sources = (data.citations || data.sources || []).map((s: any) => ({
        title: s.title || s.url || 'source',
        url: s.url || s.link || ''
      })).filter((s: any) => s.url)
      const usage = data.usage || {}
      return {
        text,
        sources,
        input_tokens: usage.input_tokens || usage.prompt_tokens || 0,
        output_tokens: usage.output_tokens || usage.completion_tokens || 0,
      }
    } catch (e) {
      lastErr = e as Error
      if (attempt === 0) await new Promise(r => setTimeout(r, 1000))
    }
  }
  throw lastErr || new Error('Grok call failed')
}
