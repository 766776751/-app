import Dexie, { type Table } from 'dexie'
import type { TripRecord } from '@/types/trip'
import type { ExpenseRecord } from '@/types/expense'
import type { AppSettings } from '@/types/settings'
import type { Destination } from '@/types/destination'
import type { ProjectTemplate } from '@/types/template'
import { DEFAULT_SETTINGS } from '@/types/settings'

export interface AttachmentRow {
  id?: number
  blob: Blob
  name: string
  kind: 'image' | 'pdf'
}

class BxsbDb extends Dexie {
  trips!: Table<TripRecord, number>
  expenses!: Table<ExpenseRecord, number>
  settings!: Table<AppSettings, number>
  attachments!: Table<AttachmentRow, number>
  destinations!: Table<Destination, number>
  templates!: Table<ProjectTemplate, number>

  constructor() {
    super('bxsb')
    this.version(1).stores({
      trips: '++id, date, isDeleted, destination',
      expenses: '++id, date, status, category',
      settings: 'id',
      attachments: '++id',
    })
    this.version(2)
      .stores({
        trips: '++id, date, isDeleted, destination',
        expenses: '++id, date, status, category',
        settings: 'id',
        attachments: '++id',
        destinations: '++id, name, usageCount',
        templates: '++id, projectName, projectCode, usageCount',
      })
      .upgrade(async (tx) => {
        const destCount = await tx.table('destinations').count()
        if (destCount === 0) {
          await tx.table('destinations').bulkAdd([
            { name: '公司', distance: 0, purpose: '上班', usageCount: 0, lastUsed: Date.now() },
          ])
        }
      })
  }
}

export const db = new BxsbDb()

/** 安卓 WebView 偶发 IndexedDB 打开失败：带退避重试 */
export async function openBxsbDb(retries = 3): Promise<void> {
  let lastErr: unknown
  for (let i = 0; i < retries; i++) {
    try {
      if (!db.isOpen()) await db.open()
      return
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 200 * (i + 1)))
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('数据库打开失败')
}

export async function ensureSettings(): Promise<AppSettings> {
  await openBxsbDb()
  const existing = await db.settings.get(1)
  if (existing) {
    // 专属 App：缺省一律新能源
    if (!existing.defaultVehicleType) {
      const fixed = { ...existing, defaultVehicleType: 'ELECTRIC' as const }
      await db.settings.put(fixed)
      return fixed
    }
    return existing
  }
  await db.settings.put({ ...DEFAULT_SETTINGS })
  return { ...DEFAULT_SETTINGS }
}
