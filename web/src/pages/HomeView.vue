<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScreenHeader from '@/components/ScreenHeader.vue'
import AppIcon from '@/components/AppIcon.vue'
import TripCalendar from '@/components/TripCalendar.vue'
import { useTripStore } from '@/stores/trip'
import { useExpenseStore } from '@/stores/expense'
import { useSettingsStore } from '@/stores/settings'
import {
  buildTripXlsXml,
  shareTripXls,
  tripFileName,
  tripSheetTitle,
  tripTableRows,
  TRIP_HEADERS,
  DEFAULT_COMPANY,
} from '@/utils/xlsExporter'

const DEFAULT_CO = DEFAULT_COMPANY
const MONTH_CAP = 5000

const router = useRouter()
const tripStore = useTripStore()
const expenseStore = useExpenseStore()
const settingsStore = useSettingsStore()

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const exportOpen = ref(false)
const showPreview = ref(false)
const toast = ref('')
const showCalendar = ref(false)

const monthTrips = computed(() =>
  tripStore.trips
    .filter((t) => t.date.startsWith(`${year.value}-${String(month.value).padStart(2, '0')}`))
    .sort((a, b) => a.date.localeCompare(b.date)),
)

const stats = computed(() => ({
  count: monthTrips.value.length,
  km: monthTrips.value.reduce((s, t) => s + t.distance, 0),
  amount: monthTrips.value.reduce((s, t) => s + t.amount, 0),
}))

const barPct = computed(() => Math.min(100, (stats.value.amount / MONTH_CAP) * 100))
const rows = computed(() => tripTableRows(monthTrips.value, month.value))
const title = computed(() => tripSheetTitle(month.value))
const recentExpenses = computed(() => expenseStore.records.slice(0, 4))

function rowClass(row: string[]): Record<string, boolean> {
  return row[0] === '合计' ? { 'xls-sum': true } : {}
}
function isTitleRow(row: string[]): boolean {
  return String(row[0] || '').startsWith('私车公用')
}

onMounted(async () => {
  await Promise.all([tripStore.loadTrips(), expenseStore.load(), settingsStore.load()])
})

async function onShare() {
  if (!monthTrips.value.length) {
    toast.value = '无记录，无法导出'
    return
  }
  try {
    const xml = buildTripXlsXml(year.value, month.value, monthTrips.value)
    const result = await shareTripXls(xml, tripFileName(year.value, month.value))
    toast.value =
      result === 'shared'
        ? '已打开系统分享'
        : result === 'saved'
          ? '已存「文档/报销神器」，可在文件管理分享'
          : result === 'downloaded'
            ? '已开始下载'
            : result === 'cancelled'
              ? '已取消'
              : '导出失败，请重试'
    showPreview.value = false
  } catch (e) {
    toast.value = `导出失败：${(e as Error).message || '未知错误'}`
  }
}

function toggleExport() {
  exportOpen.value = !exportOpen.value
  if (!exportOpen.value) showPreview.value = false
}

const quickActions = [
  { to: '/trip/add', icon: 'car' as const, label: '添加行程' },
  { to: '/expense/add', icon: 'plus' as const, label: '添加报销' },
]
</script>

<template>
  <main class="page">
    <ScreenHeader title="报销神器" subtitle="MILEAGE OPS" mark-icon="home" />

    <section class="glass-card hero-instrument">
      <p class="hero-label">
        {{ year }}.{{ String(month).padStart(2, '0') }}
        <span style="float: right; display: inline-flex; gap: 10px; align-items: center">
          <AppIcon name="gauge" :size="14" />
        </span>
      </p>
      <h1 class="hero-value tabnum">
        {{ stats.km.toFixed(1) }}<span>km</span>
      </h1>
      <div class="hero-sub">
        <div>
          <b class="tabnum">{{ stats.count }}</b>
          <span><AppIcon name="list" :size="12" /> 行程</span>
        </div>
        <div>
          <b class="tabnum amount-text">¥{{ stats.amount.toFixed(0) }}</b>
          <span><AppIcon name="money" :size="12" /> 金额</span>
        </div>
        <div>
          <b class="tabnum">{{ DEFAULT_CO }}</b>
          <span><AppIcon name="file" :size="12" /> 单位</span>
        </div>
      </div>
      <div class="hero-bar"><i :style="{ width: barPct + '%' }" /></div>
    </section>

    <section class="glass-card">
      <h2 class="section-title"><AppIcon name="plus" :size="14" /> 快捷</h2>
      <div class="quick-row">
        <button
          v-for="s in quickActions"
          :key="s.to"
          class="btn quick-action"
          :class="s.label === '添加行程' ? 'btn-primary' : 'btn-secondary'"
          @click="router.push(s.to)"
        >
          <AppIcon :name="s.icon" :size="18" />{{ s.label }}
        </button>
      </div>
      <button class="export-toggle" type="button" @click="toggleExport">
        <AppIcon name="export" :size="14" />
        <span>{{ exportOpen ? '收起导出' : '展开导出' }}</span>
        <span class="export-toggle-hint">{{ title }}</span>
      </button>
    </section>

    <section v-if="exportOpen" class="glass-card">
      <h2 class="section-title"><AppIcon name="export" :size="14" /> 导出</h2>
      <div class="btn-row" style="margin-top: 0">
        <select v-model.number="year" class="field-box" style="min-height: 40px">
          <option
            v-for="y in [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]"
            :key="y"
            :value="y"
          >
            {{ y }}
          </option>
        </select>
        <select v-model.number="month" class="field-box" style="min-height: 40px">
          <option v-for="m in 12" :key="m" :value="m">{{ m }}月</option>
        </select>
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" @click="showPreview = !showPreview">
          <AppIcon :name="showPreview ? 'close' : 'eye'" :size="16" />
          {{ showPreview ? '收起预览' : '预览表格' }}
        </button>
        <button class="btn btn-secondary" @click="showCalendar = true">
          <AppIcon name="list" :size="16" />行程日历
        </button>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" style="flex: 1" @click="onShare">
          <AppIcon name="share" :size="16" />分享文件
        </button>
      </div>
      <div v-if="showPreview" class="xls-scroll" style="max-height: 240px; margin-top: 8px">
        <table>
          <tbody>
            <tr>
              <th v-for="h in TRIP_HEADERS" :key="h">{{ h }}</th>
            </tr>
            <template v-for="(row, i) in rows" :key="i">
              <tr v-if="isTitleRow(row)" class="xls-title">
                <td colspan="7">{{ row[0] }}</td>
              </tr>
              <tr v-else :class="rowClass(row)">
                <td v-for="(c, j) in row" :key="j">{{ c }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p v-else class="hint-line">
        <AppIcon name="pdf" :size="12" />
        本月 {{ monthTrips.length }} 条行程 · 可预览后分享
      </p>
    </section>

    <section class="glass-card">
      <h2 class="section-title"><AppIcon name="wallet" :size="14" /> 最近报销</h2>
      <div v-if="!recentExpenses.length" class="empty">
        <div class="icon-chip"><AppIcon name="wallet" :size="24" /></div>
        <h3>暂无记录</h3>
        <p>点上方「添加报销」录入第一笔</p>
      </div>
      <div
        v-for="r in recentExpenses"
        :key="r.id"
        class="list-item"
        @click="router.push(`/expense/${r.id}/edit`)"
      >
        <div class="icon-chip" :style="r.category === 'INVOICE' ? 'background:var(--amber-soft);color:var(--amber)' : ''">
          <AppIcon :name="r.category === 'INVOICE' ? 'pdf' : 'wallet'" :size="18" />
        </div>
        <div class="l">
          <b>{{ r.title }}</b>
          <small>{{ r.date }}</small>
        </div>
        <div class="r">
          <b class="tabnum amount-text">¥{{ r.amount.toFixed(2) }}</b>
        </div>
      </div>
    </section>

    <TripCalendar :open="showCalendar" :trips="tripStore.trips" @close="showCalendar = false" />

    <div v-if="toast" class="toast show">{{ toast }}</div>
  </main>
</template>

<style scoped>
.hint-line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--muted);
  margin-top: 8px;
}
.quick-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 0;
}
.quick-action {
  min-height: 48px;
  font-size: 14px;
}
.export-toggle {
  width: 100%;
  margin-top: 10px;
  min-height: 40px;
  border-radius: var(--radius-field);
  border: 1px dashed var(--stroke-strong);
  background: transparent;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  font-size: 12px;
  transition: color var(--dur-fast) ease, border-color var(--dur-fast) ease;
}
.export-toggle:active {
  color: var(--accent);
  border-color: var(--accent);
}
.export-toggle-hint {
  margin-left: auto;
  opacity: 0.75;
  font-size: 11px;
}
.amount-text {
  color: var(--amber);
}
</style>
