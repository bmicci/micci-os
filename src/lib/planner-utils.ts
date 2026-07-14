import { Day, CatKey } from '@/lib/planner-data'
import { ScheduleBlock } from '@/lib/supabase/types'

export interface MergedBlock {
  id: string             // "static-{key}" or "db-{uuid}"
  time_label: string
  cat: CatKey
  task: string
  sort_order: number
  completionKey: string  // "week-dayIdx-blockIdx" for static, "custom-{uuid}" for custom
  isCustom: boolean
  isStaticOverride: boolean
  dbId?: string          // UUID if stored in DB
  staticKey?: string     // "week-dayIdx-blockIdx" for static/override blocks
}

export function mergeBlocks(
  staticDay: Day,
  weekNum: number,
  dayIdxInWeek: number,
  allCustomBlocks: ScheduleBlock[],
): MergedBlock[] {
  const dayCustoms = allCustomBlocks.filter(b => b.day_date === staticDay.date)

  // Process static blocks — apply overrides and deletions
  const staticMerged: MergedBlock[] = []
  for (let i = 0; i < staticDay.blocks.length; i++) {
    const b = staticDay.blocks[i]
    const staticKey = `${weekNum}-${dayIdxInWeek}-${i}`
    const override = dayCustoms.find(c => c.static_key === staticKey && !c.is_deleted)
    const isDeleted = dayCustoms.some(c => c.static_key === staticKey && c.is_deleted)

    if (isDeleted) continue

    if (override) {
      staticMerged.push({
        id: `db-${override.id}`,
        time_label: override.time_label,
        cat: override.cat as CatKey,
        task: override.task,
        sort_order: override.sort_order,
        completionKey: `custom-${override.id}`,
        isCustom: false,
        isStaticOverride: true,
        dbId: override.id,
        staticKey,
      })
    } else {
      staticMerged.push({
        id: `static-${staticKey}`,
        time_label: b.t,
        cat: b.cat,
        task: b.task,
        sort_order: i * 100,
        completionKey: staticKey,
        isCustom: false,
        isStaticOverride: false,
      })
    }
  }

  // Append purely custom blocks (no static_key)
  const customMerged: MergedBlock[] = dayCustoms
    .filter(c => !c.static_key && !c.is_deleted)
    .map(c => ({
      id: `db-${c.id}`,
      time_label: c.time_label,
      cat: c.cat as CatKey,
      task: c.task,
      sort_order: c.sort_order,
      completionKey: `custom-${c.id}`,
      isCustom: true,
      isStaticOverride: false,
      dbId: c.id,
    }))

  return [...staticMerged, ...customMerged].sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Same merge logic as mergeBlocks, but for the live weekly template — keyed
 * by real ISO date instead of the archived week/dayIdx position. Each real
 * calendar day gets its own completion state, so "Monday" doesn't stay
 * checked forever across every future Monday.
 */
export function mergeLiveBlocks(
  templateBlocks: Day['blocks'],
  isoDate: string,
  allCustomBlocks: ScheduleBlock[],
): MergedBlock[] {
  const dayCustoms = allCustomBlocks.filter(b => b.day_date === isoDate)

  const staticMerged: MergedBlock[] = []
  for (let i = 0; i < templateBlocks.length; i++) {
    const b = templateBlocks[i]
    const staticKey = `${isoDate}-${i}`
    const override = dayCustoms.find(c => c.static_key === staticKey && !c.is_deleted)
    const isDeleted = dayCustoms.some(c => c.static_key === staticKey && c.is_deleted)

    if (isDeleted) continue

    if (override) {
      staticMerged.push({
        id: `db-${override.id}`,
        time_label: override.time_label,
        cat: override.cat as CatKey,
        task: override.task,
        sort_order: override.sort_order,
        completionKey: `custom-${override.id}`,
        isCustom: false,
        isStaticOverride: true,
        dbId: override.id,
        staticKey,
      })
    } else {
      staticMerged.push({
        id: `static-${staticKey}`,
        time_label: b.t,
        cat: b.cat,
        task: b.task,
        sort_order: i * 100,
        completionKey: staticKey,
        isCustom: false,
        isStaticOverride: false,
      })
    }
  }

  const customMerged: MergedBlock[] = dayCustoms
    .filter(c => !c.static_key && !c.is_deleted)
    .map(c => ({
      id: `db-${c.id}`,
      time_label: c.time_label,
      cat: c.cat as CatKey,
      task: c.task,
      sort_order: c.sort_order,
      completionKey: `custom-${c.id}`,
      isCustom: true,
      isStaticOverride: false,
      dbId: c.id,
    }))

  return [...staticMerged, ...customMerged].sort((a, b) => a.sort_order - b.sort_order)
}
