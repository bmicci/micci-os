// Server-side loader for the Money brief inputs (see moneyBrief.ts). Shared by
// the micci_money_brief_inputs MCP tool and the flagged API-key runner.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { FinancialData } from '../financial-data'
import { buildMoneyBriefInputs, type MoneyBriefInputs, type RecentTxn } from './moneyBrief'

const shift = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Last week's transactions, paged past the 1,000-row cap like fetchAllTxns. */
async function recentTxns(supabase: SupabaseClient, since: string, until: string): Promise<RecentTxn[]> {
  const rows: RecentTxn[] = []
  for (let from = 0; from < 10_000; from += 1000) {
    const { data, error } = await supabase.from('transactions')
      .select('transaction_date, amount, category, merchant, account_name')
      .gte('transaction_date', since).lte('transaction_date', until)
      .order('transaction_date').range(from, from + 999)
    if (error) throw new Error(`transactions query failed: ${error.message}`)
    rows.push(...((data ?? []) as RecentTxn[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

export async function loadMoneyBriefInputs(
  d: FinancialData,
  supabase: SupabaseClient,
  today: string,
): Promise<MoneyBriefInputs> {
  const recent = await recentTxns(supabase, shift(today, -7), today)
  const accepted = d.offers.find(o => o.offer.status === 'accepted')
  return buildMoneyBriefInputs(d, recent, today, { periodDays: accepted?.periodDays ?? 14 })
}
