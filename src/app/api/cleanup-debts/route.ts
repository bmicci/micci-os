import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * POST /api/cleanup-debts
 * Removes zero-balance junk rows from debt_accounts table.
 * These are transaction descriptions that were accidentally imported as debt accounts.
 */
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = await createServiceClient()

  // Count junk rows first
  const { count: junkCount } = await service
    .from('debt_accounts')
    .select('*', { count: 'exact', head: true })
    .lte('balance', 0)

  if (!junkCount || junkCount === 0) {
    return NextResponse.json({ message: 'No junk rows found', deleted: 0 })
  }

  // Delete all rows with balance <= 0
  const { error } = await service
    .from('debt_accounts')
    .delete()
    .lte('balance', 0)

  if (error) {
    console.error('[cleanup-debts] Delete error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return remaining valid accounts for verification
  const { data: remaining } = await service
    .from('debt_accounts')
    .select('name, balance, interest_rate, account_type')
    .gt('balance', 0)
    .order('balance', { ascending: false })

  return NextResponse.json({
    message: `Deleted ${junkCount} zero-balance junk rows`,
    deleted: junkCount,
    remainingAccounts: remaining?.length ?? 0,
    accounts: remaining,
  })
}
