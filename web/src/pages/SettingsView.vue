<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScreenHeader from '@/components/ScreenHeader.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useTripStore } from '@/stores/trip'
import { useExpenseStore } from '@/stores/expense'
import { useDestinationStore } from '@/stores/destination'
import { useTemplateStore } from '@/stores/template'
import { useSettingsStore } from '@/stores/settings'
import { db } from '@/db/schema'
import { shareBlob } from '@/utils/shareBlob'
import type { VehicleType } from '@/types/trip'
import type { ExpenseRecord } from '@/types/expense'
import type { TripRecord } from '@/types/trip'
import type { Destination } from '@/types/destination'
import type { ProjectTemplate } from '@/types/template'

const router = useRouter()
const tripStore = useTripStore()
const expenseStore = useExpenseStore()
const destStore = useDestinationStore()
const templateStore = useTemplateStore()
const settingsStore = useSettingsStore()
const electric = ref('0.5')
const gasoline = ref('1.0')
const toast = ref('')
const storageHint = ref('')

type BackupPayload = {
  exportedAt?: string
  app?: string
  trips?: TripRecord[]
  expenses?: ExpenseRecord[]
  destinations?: Destination[]
  templates?: ProjectTemplate[]
  settings?: unknown
}

type ImportPlan = {
  trips: { add: number; cover: number }
  expenses: { add: number; cover: number }
  destinations: { add: number; cover: number }
  templates: { add: number; cover: number }
  hasSettings: boolean
  payload: BackupPayload
}

const pendingImport = ref<ImportPlan | null>(null)

onMounted(async () => {
  await Promise.all([
    settingsStore.load(),
    tripStore.loadTrips(),
    expenseStore.load(),
    destStore.load(),
    templateStore.load(),
  ])
  electric.value = String(settingsStore.settings.electricRate)
  gasoline.value = String(settingsStore.settings.gasolineRate)
  void refreshStorageHint()
})

async function refreshStorageHint() {
  try {
    if (!navigator.storage?.estimate) return
    const { usage = 0, quota = 0 } = await navigator.storage.estimate()
    if (!quota) return
    const pct = (usage / quota) * 100
    if (pct >= 70) {
      storageHint.value = `本地存储已用 ${pct.toFixed(0)}%，建议导出备份并清理回收站`
    } else {
      storageHint.value = ''
    }
  } catch {
    /* ignore */
  }
}

async function saveRates() {
  await settingsStore.setRate('ELECTRIC', Number(electric.value) || 0.5)
  await settingsStore.setRate('GASOLINE', Number(gasoline.value) || 1)
  toast.value = '费率已保存'
}

async function pickVehicle(v: VehicleType) {
  await settingsStore.setDefaultVehicle(v)
  toast.value = '默认车型已更新'
}

function buildBackupPayload(): BackupPayload {
  return {
    exportedAt: new Date().toISOString(),
    app: '报销神器-vue',
    trips: tripStore.trips.concat(tripStore.deleted),
    expenses: expenseStore.all,
    destinations: destStore.list,
    templates: templateStore.list,
  }
}

async function backupJson() {
  const payload = {
    ...buildBackupPayload(),
    settings: (await db.settings.toArray())[0] || null,
  }
  const text = JSON.stringify(payload, null, 2)
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const name = `报销神器备份_${payload.exportedAt!.slice(0, 10)}.json`
  toast.value = '正在导出…'
  const result = await shareBlob(blob, name, 'application/json')
  toast.value =
    result === 'shared'
      ? '已打开系统分享'
      : result === 'saved'
        ? '已保存到「文档/报销神器」'
        : result === 'downloaded'
          ? '浏览器已下载 JSON'
          : result === 'cancelled'
            ? '已取消'
            : '导出失败，请重试'
}

async function copyBackupText() {
  try {
    const payload = {
      ...buildBackupPayload(),
      settings: (await db.settings.toArray())[0] || null,
    }
    await navigator.clipboard.writeText(JSON.stringify(payload))
    toast.value = '备份文本已复制到剪贴板'
  } catch {
    toast.value = '复制失败，请改用导出文件'
  }
}

function diffCount<T extends { id?: number }>(incoming: T[], existing: T[]) {
  const ids = new Set(existing.map((x) => x.id))
  let add = 0
  let cover = 0
  for (const row of incoming) {
    if (row?.id != null && ids.has(row.id)) cover++
    else add++
  }
  return { add, cover }
}

async function onRestoreJson(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const data = JSON.parse(await file.text()) as BackupPayload
    if (
      !Array.isArray(data.trips) &&
      !Array.isArray(data.expenses) &&
      !Array.isArray(data.destinations) &&
      !Array.isArray(data.templates) &&
      !data.settings
    ) {
      toast.value = '备份文件格式不正确'
      return
    }
    pendingImport.value = {
      trips: diffCount(data.trips || [], tripStore.trips.concat(tripStore.deleted)),
      expenses: diffCount(data.expenses || [], expenseStore.all),
      destinations: diffCount(data.destinations || [], destStore.list),
      templates: diffCount(data.templates || [], templateStore.list),
      hasSettings: !!data.settings,
      payload: data,
    }
  } catch (err) {
    toast.value = `导入失败: ${(err as Error).message}`
  }
  input.value = ''
}

function cancelImport() {
  pendingImport.value = null
}

async function confirmImport() {
  const plan = pendingImport.value
  if (!plan) return
  const data = plan.payload
  try {
    if (Array.isArray(data.trips)) {
      await db.trips.clear()
      await db.trips.bulkPut(data.trips)
    }
    if (Array.isArray(data.expenses)) {
      await db.expenses.clear()
      await db.expenses.bulkPut(data.expenses)
    }
    if (Array.isArray(data.destinations)) {
      await db.destinations.clear()
      await db.destinations.bulkPut(data.destinations)
    }
    if (Array.isArray(data.templates)) {
      await db.templates.clear()
      await db.templates.bulkPut(data.templates)
    }
    if (data.settings) {
      const s = data.settings as {
        electricRate?: number
        gasolineRate?: number
        defaultVehicleType?: VehicleType
      }
      await db.settings.put({
        id: 1,
        electricRate: s.electricRate ?? 0.5,
        gasolineRate: s.gasolineRate ?? 1,
        defaultVehicleType: s.defaultVehicleType ?? 'ELECTRIC',
      })
    }
    await settingsStore.load()
    electric.value = String(settingsStore.settings.electricRate)
    gasoline.value = String(settingsStore.settings.gasolineRate)
    await Promise.all([
      tripStore.loadTrips(),
      expenseStore.load(),
      destStore.load(),
      templateStore.load(),
    ])
    toast.value = '备份已导入'
  } catch (err) {
    toast.value = `导入失败: ${(err as Error).message}`
  } finally {
    pendingImport.value = null
  }
}

function planTotal(p: { add: number; cover: number }) {
  return p.add + p.cover
}
</script>

<template>
  <main class="page" style="padding-top: 8px; padding-bottom: 16px">
    <ScreenHeader title="设置" mark-icon="settings" />

    <section class="glass-card">
      <h2 class="section-title"><AppIcon name="rate" :size="14" /> 费率</h2>
      <div class="btn-row" style="align-items: flex-end; margin-top: 0">
        <div class="field" style="flex: 1; margin: 0">
          <label>新能源</label>
          <input v-model="electric" type="number" step="0.01" class="field-box" />
        </div>
        <div class="field" style="flex: 1; margin: 0">
          <label>油车</label>
          <input v-model="gasoline" type="number" step="0.01" class="field-box" />
        </div>
      </div>
      <div class="btn-row" style="margin: 8px 0">
        <button
          class="btn btn-secondary"
          style="flex: 1; min-height: 38px"
          :style="settingsStore.settings.defaultVehicleType === 'ELECTRIC' ? 'background:var(--primary);color:var(--on-primary);border-color:var(--primary)' : ''"
          @click="pickVehicle('ELECTRIC')"
        >
          <AppIcon name="gauge" :size="14" />新能源
        </button>
        <button
          class="btn btn-secondary"
          style="flex: 1; min-height: 38px"
          :style="settingsStore.settings.defaultVehicleType === 'GASOLINE' ? 'background:var(--primary);color:var(--on-primary);border-color:var(--primary)' : ''"
          @click="pickVehicle('GASOLINE')"
        >
          <AppIcon name="car" :size="14" />油车
        </button>
      </div>
      <button class="btn btn-primary" style="width: 100%; min-height: 40px" @click="saveRates">
        <AppIcon name="check" :size="16" />保存
      </button>
    </section>

    <section class="glass-card">
      <h2 class="section-title"><AppIcon name="list" :size="14" /> 模板管理</h2>
      <div class="icon-grid two">
        <button class="icon-cell" title="常用目的地" @click="router.push('/destinations')">
          <span class="icon-chip"><AppIcon name="pin" :size="20" /></span>
          <span class="icon-label">常用目的地</span>
        </button>
        <button class="icon-cell" title="项目模板" @click="router.push('/templates')">
          <span class="icon-chip"><AppIcon name="folder" :size="20" /></span>
          <span class="icon-label">项目模板</span>
        </button>
      </div>
    </section>

    <section class="glass-card">
      <h2 class="section-title"><AppIcon name="download" :size="14" /> 数据维护</h2>
      <div class="icon-grid two">
        <button class="icon-cell" title="全部记录" @click="router.push('/expense/history')">
          <span class="icon-chip"><AppIcon name="history" :size="20" /></span>
          <span class="icon-label">全部记录</span>
        </button>
        <button class="icon-cell danger" title="回收站" @click="router.push('/recycle-bin')">
          <span class="icon-chip danger-chip"><AppIcon name="trash" :size="20" /></span>
          <span class="icon-label">回收站</span>
        </button>
      </div>
    </section>

    <section class="glass-card">
      <h2 class="section-title"><AppIcon name="download" :size="14" /> 备份</h2>
      <div v-if="storageHint" style="font-size: 12px; color: var(--amber); margin: 0 0 8px">
        {{ storageHint }}
      </div>
      <div class="btn-row" style="margin-top: 0">
        <button class="btn btn-primary" style="flex: 1; min-height: 40px" @click="backupJson">
          <AppIcon name="download" :size="16" />导出
        </button>
        <label class="btn btn-secondary" style="flex: 1; min-height: 40px; cursor: pointer; text-align: center">
          <AppIcon name="export" :size="16" />导入
          <input type="file" accept="application/json,.json" hidden @change="onRestoreJson" />
        </label>
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" style="flex: 1; min-height: 40px" @click="copyBackupText">
          复制备份到剪贴板
        </button>
      </div>
    </section>

    <div v-if="pendingImport" class="pad-backdrop" style="z-index: 60" @click.self="cancelImport">
      <div class="xls-panel" style="width: min(100%, 360px); margin: auto; padding: 16px">
        <h3 style="margin: 0 0 8px">导入差异预览</h3>
        <p style="font-size: 12px; color: var(--muted); margin: 0 0 10px">
          导入将覆盖同 ID 计数的本地数据，请确认：
        </p>
        <ul style="font-size: 13px; line-height: 1.8; margin: 0 0 12px; padding-left: 18px">
          <li>行程：新增 {{ pendingImport.trips.add }} · 覆盖 {{ pendingImport.trips.cover }}</li>
          <li>报销：新增 {{ pendingImport.expenses.add }} · 覆盖 {{ pendingImport.expenses.cover }}</li>
          <li>目的地：新增 {{ pendingImport.destinations.add }} · 覆盖 {{ pendingImport.destinations.cover }}</li>
          <li>模板：新增 {{ pendingImport.templates.add }} · 覆盖 {{ pendingImport.templates.cover }}</li>
          <li v-if="pendingImport.hasSettings">设置：将覆盖当前设置</li>
        </ul>
        <p
          v-if="
            planTotal(pendingImport.trips) +
              planTotal(pendingImport.expenses) +
              planTotal(pendingImport.destinations) +
              planTotal(pendingImport.templates) >
            0
          "
          style="font-size: 12px; color: var(--amber); margin: 0 0 12px"
        >
          覆盖后本地对应记录不可恢复，请先导出备份。
        </p>
        <div class="btn-row" style="margin: 0">
          <button class="btn btn-secondary" style="flex: 1" @click="cancelImport">取消</button>
          <button class="btn btn-primary" style="flex: 1" @click="confirmImport">确认导入</button>
        </div>
      </div>
    </div>

    <div v-if="toast" class="toast show">{{ toast }}</div>
  </main>
</template>

<style scoped>
.icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px 4px;
}
.icon-grid.two {
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.icon-cell {
  border: 0;
  background: transparent;
  padding: 4px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.icon-cell.danger .icon-label {
  color: var(--error);
}
.danger-chip {
  background: var(--error-soft);
  color: var(--error);
}
.icon-chip {
  width: 48px;
  height: 48px;
  border-radius: 16px;
}
.icon-label {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.2;
  max-width: 100%;
  white-space: nowrap;
  overflow: visible;
}
</style>
