import { redirect } from 'next/navigation'

// Markets now lives in the briefs hub as its Markets tab (one place for every
// brief). Keep old /markets links working, including ?d=, ?t= and ?tests=.
export default async function MarketsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; t?: string; tests?: string }>
}) {
  const params = await searchParams
  const q = new URLSearchParams({ tab: 'markets' })
  for (const k of ['d', 't', 'tests'] as const) if (params[k]) q.set(k, params[k]!)
  redirect(`/briefs?${q.toString()}`)
}
