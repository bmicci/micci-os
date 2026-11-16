'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireUser } from '@/lib/supabase/require-user'

type ModuleStatus = 'complete' | 'in_progress' | 'not_started'

function toDbStatus(uiStatus: string): ModuleStatus {
  const map: Record<string, ModuleStatus> = {
    done: 'complete',
    progress: 'in_progress',
    urgent: 'in_progress',
    pending: 'not_started',
  }
  return map[uiStatus] ?? 'not_started'
}

export async function updateModuleProgress(
  supabaseId: string,
  status: string,
  pct: number,
): Promise<{ error?: string }> {
  // Server actions are public POST endpoints: check the owner here too.
  if (!(await requireUser())) return { error: 'Unauthorized' }
  const supabase = createServiceClient()
  if (!supabase) return { error: 'No Supabase client' }

  const { error } = await supabase
    .from('financial_modules')
    .update({ status: toDbStatus(status), progress: pct })
    .eq('id', supabaseId)

  if (error) return { error: error.message }

  revalidatePath('/financial')
  return {}
}
