<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TripRecord } from '@/types/trip'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps<{
  open: boolean
  trips: TripRecord[]
}>()
const emit = defineEmits<{ close: [] }>()

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1)
const selectedDay = ref<string | null>(null)

watch(
  () => props.open,
  (v) => {
    if (v) {
      const d = new Date()
      year.value = d.getFullYear()
      month.value = d.getMonth() + 1
      selectedDay.value = `${year.value}-${String(month.value).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`
    }
  },
)

const monthKey = computed(() => `${year.value}-${String(month.value).padStart(2, '0')}`)

/** date -> day trips */
const byDay = computed(() => {
  const map = new Map<string, TripRecord[]>()
  for (const t of props.trips) {
    if (!t.date.startsWith(monthKey.value)) continue
    const list = map.get(t.date) || []
    list.push(t)
    map.set(t.date, list)
  }
  for (const list of map.values()) list.sort((a, b) => a.date.localeCompare(b.date))
  return map
})

type DayCell = { key: string; day: number | null; trips: TripRecord[]; intensity: number }

const cells = computed<DayCell[]>(() => {
  const y = year.value
  const m = month.value
  const first = new Date(y, m - 1, 1)
  const startWeek = first.getDay() // 0=Sun
  const daysInMonth = new Date(y, m, 0).getDate()
  const out: DayCell[] = []
  for (let i = 0; i < startWeek; i++) {
    out.push({ key: `pad-${i}`, day: null, trips: [], intensity: 0 })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const trips = byDay.value.get(date) || []
    // 强度：按当天行程数与里程/金额
    const km = trips.reduce((s, t) => s + t.distance, 0)
    let intensity = 0
    if (trips.length >= 1) intensity = 1
    if (trips.length >= 2 || km >= 40) intensity = 2
    if (trips.length >= 3 || km >= 80) intensity = 3
    out.push({ key: date, day: d, trips, intensity })
  }
  return out
})

const selectedTrips = computed(() =>
  selectedDay.value ? (byDay.value.get(selectedDay.value) || []) : [],
)

const monthSummary = computed(() => {
  const list = [...byDay.value.values()].flat()
  return {
    days: byDay.value.size,
    count: list.length,
    km: list.reduce((s, t) => s + t.distance, 0),
    amount: list.reduce((s, t) => s + t.amount, 0),
  }
})

const weekLabels = ['日', '一', '二', '三', '四', '五', '六']

function prevMonth() {
  if (month.value === 1) {
    year.value--
    month.value = 12
  } else month.value--
  selectedDay.value = null
}

function nextMonth() {
  if (month.value === 12) {
    year.value++
    month.value = 1
  } else month.value++
  selectedDay.value = null
}

function pick(cell: DayCell) {
  if (cell.day == null) return
  selectedDay.value = cell.key
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="pad-backdrop" @click.self="emit('close')">
      <div class="cal-sheet">
        <!-- 本子顶栏 -->
        <div class="cal-head">
          <div class="cal-title">
            <AppIcon name="list" :size="16" />
            <strong>行程日历</strong>
            <span class="cal-month tabnum">{{ year }}.{{ String(month).padStart(2, '0') }}</span>
          </div>
          <div class="cal-nav">
            <button class="cal-nav-btn" @click="prevMonth">
              <AppIcon name="back" :size="16" />
            </button>
            <button class="cal-nav-btn" @click="nextMonth">
              <AppIcon name="back" :size="16" style="transform: scaleX(-1)" />
            </button>
            <button class="cal-nav-btn close" @click="emit('close')">
              <AppIcon name="close" :size="16" />
            </button>
          </div>
        </div>

        <div class="cal-summary">
          <span><AppIcon name="list" :size="12" /> {{ monthSummary.days }} 天</span>
          <span class="tabnum">{{ monthSummary.count }} 次</span>
          <span class="tabnum">{{ monthSummary.km.toFixed(1) }} km</span>
          <span class="tabnum amount-text">¥{{ monthSummary.amount.toFixed(0) }}</span>
        </div>

        <!-- 星期 -->
        <div class="cal-week">
          <div v-for="w in weekLabels" :key="w" class="cal-week-cell">{{ w }}</div>
        </div>

        <!-- 日历格（错题本网格） -->
        <div class="cal-grid">
          <button
            v-for="c in cells"
            :key="c.key"
            class="cal-cell"
            :class="{
              empty: c.day == null,
              has: c.intensity > 0,
              'lv1': c.intensity === 1,
              'lv2': c.intensity === 2,
              'lv3': c.intensity === 3,
              selected: c.key === selectedDay,
            }"
            @click="pick(c)"
          >
            <span v-if="c.day != null" class="day tabnum">{{ c.day }}</span>
            <span v-if="c.intensity > 0" class="dot" />
          </button>
        </div>

        <!-- 当日详情 -->
        <div class="cal-detail">
          <div class="cal-detail-head">
            <AppIcon name="pin" :size="14" />
            <span v-if="selectedDay">{{ selectedDay }}</span>
            <span v-else>点日期查看当天行程</span>
            <span v-if="selectedTrips.length" class="badge-lv">已记录</span>
          </div>
          <div v-if="!selectedDay" class="cal-hint">亮色格 = 当天有行程</div>
          <div v-else-if="!selectedTrips.length" class="cal-hint">当天暂无行程</div>
          <div v-else class="cal-trips">
            <div v-for="t in selectedTrips" :key="t.id" class="cal-trip">
              <b>{{ t.destination }}</b>
              <span>{{ t.purpose }}</span>
              <span class="tabnum right amount-text">{{ t.distance.toFixed(1) }}km · ¥{{ t.amount.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.cal-sheet {
  width: min(100%, 430px);
  margin: auto;
  max-height: min(92dvh, 720px);
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--stroke-strong);
  border-radius: 20px;
  padding: 12px 14px 16px;
}
.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.cal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.cal-month {
  color: var(--accent);
  font-size: 14px;
  font-weight: 700;
}
.cal-nav {
  display: flex;
  gap: 6px;
}
.cal-nav-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: rgba(255, 255, 255, 0.04);
  color: var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cal-nav-btn.close {
  color: var(--muted);
}
.cal-summary {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--muted);
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--stroke);
}
.cal-summary span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.cal-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;
}
.cal-week-cell {
  text-align: center;
  font-size: 11px;
  color: var(--muted);
  padding: 4px 0;
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 33px,
    rgba(255, 255, 255, 0.03) 33px,
    rgba(255, 255, 255, 0.03) 34px
  );
}
.cal-cell {
  position: relative;
  min-height: 42px;
  border: 1px solid var(--stroke);
  border-radius: 8px;
  background: #ffffff;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cal-cell.empty {
  border-color: transparent;
  background: transparent;
}
.cal-cell .day {
  font-size: 13px;
  font-weight: 600;
}
.cal-cell.has {
  color: var(--ink);
  border-color: rgba(13, 148, 136, 0.4);
}
.cal-cell.lv1 {
  background: rgba(46, 211, 183, 0.18);
}
.cal-cell.lv2 {
  background: rgba(46, 211, 183, 0.38);
  box-shadow: 0 0 10px var(--accent-glow);
}
.cal-cell.lv3 {
  background: rgba(46, 211, 183, 0.65);
  box-shadow: 0 0 14px var(--accent-glow);
}
.cal-cell.lv3 .day {
  color: var(--on-primary);
}
.cal-cell.selected {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.cal-cell .dot {
  position: absolute;
  bottom: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
}
.cal-cell.lv3 .dot {
  background: var(--on-primary);
}
.cal-detail {
  margin-top: 12px;
  border-top: 1px dashed var(--stroke-strong);
  padding-top: 10px;
}
.cal-detail-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
}
.badge-lv {
  margin-left: auto;
  font-size: 10px;
  color: var(--accent);
  border: 1px solid rgba(46, 211, 183, 0.4);
  border-radius: 999px;
  padding: 2px 8px;
}
.cal-hint {
  font-size: 12px;
  color: var(--muted);
}
.cal-trips {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cal-trip {
  display: flex;
  gap: 8px;
  align-items: baseline;
  background: #ffffff;
  border: 1px solid var(--stroke);
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 13px;
}
.cal-trip b {
  font-size: 14px;
}
.cal-trip span {
  color: var(--muted);
  font-size: 12px;
}
.cal-trip .right {
  margin-left: auto;
  color: var(--amber);
}
</style>
