<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ScreenHeader from '@/components/ScreenHeader.vue'
import AppIcon from '@/components/AppIcon.vue'
import NumericPad from '@/components/NumericPad.vue'
import { useTripStore } from '@/stores/trip'
import { useSettingsStore } from '@/stores/settings'
import { useDestinationStore } from '@/stores/destination'
import { today } from '@/utils/date'
import { formatNum } from '@/utils/numeric'
import type { VehicleType } from '@/types/trip'

const tripStore = useTripStore()
const settingsStore = useSettingsStore()
const destStore = useDestinationStore()

const destination = ref('')
const purpose = ref('')
const distance = ref('')
const date = ref(today())
const vehicleType = ref<VehicleType>('ELECTRIC')
const padOpen = ref(false)
const toast = ref('')
const showSuggest = ref(false)

const rate = computed(() =>
  vehicleType.value === 'ELECTRIC' ? settingsStore.settings.electricRate : settingsStore.settings.gasolineRate,
)
const amountPreview = computed(() => (Number(distance.value) || 0) * rate.value)

const accum = ref(0)
const hasPlus = ref(false)

function openPad() {
  accum.value = 0
  hasPlus.value = false
  padOpen.value = true
}

function onPadInput(v: string) {
  distance.value = v
}

function onPlus() {
  const cur = Number(distance.value) || 0
  accum.value += cur
  hasPlus.value = true
  distance.value = ''
}

onMounted(async () => {
  await settingsStore.load()
  await destStore.load()
  vehicleType.value = settingsStore.settings.defaultVehicleType
  window.addEventListener('numeric-pad-plus', onPlus)
})
onUnmounted(() => window.removeEventListener('numeric-pad-plus', onPlus))

const destSuggestions = computed(() => {
  const kw = destination.value.trim()
  const all = [...destStore.list].sort((a, b) => b.usageCount - a.usageCount)
  if (!kw) return all.slice(0, 6)
  return all.filter((d) => d.name.includes(kw) || d.purpose.includes(kw)).slice(0, 6)
})

function pickDestination(name: string) {
  const d = destStore.list.find((x) => x.name === name)
  if (!d) return
  destination.value = d.name
  if (d.distance > 0) distance.value = String(d.distance)
  if (d.purpose && !purpose.value) purpose.value = d.purpose
  showSuggest.value = false
}

function closePad() {
  // 完成时：若有累加且当前为空，把累计写入距离
  if (hasPlus.value && !distance.value) {
    distance.value = formatNum(accum.value)
  } else if (hasPlus.value && distance.value) {
    const total = accum.value + (Number(distance.value) || 0)
    distance.value = formatNum(total)
  }
  padOpen.value = false
}

async function save() {
  const d = Number(distance.value) || 0
  await tripStore.addTrip({
    destination: destination.value,
    purpose: purpose.value,
    distance: d,
    vehicleType: vehicleType.value,
    date: date.value,
    rate: rate.value,
  })
  if (tripStore.error) {
    toast.value = tripStore.error
    return
  }
  await destStore.add({
    name: destination.value,
    distance: d,
    purpose: purpose.value,
  })
  await destStore.bumpUsage(destination.value)
  toast.value = '行程已保存'
  destination.value = ''
  purpose.value = ''
  distance.value = ''
  hasPlus.value = false
  accum.value = 0
  tripStore.resetSaveSuccess()
}

function padDisplay() {
  if (!hasPlus.value) return distance.value || '0'
  return distance.value ? `${formatNum(accum.value)}+${distance.value}` : `${formatNum(accum.value)}+`
}
</script>

<template>
  <main class="page">
    <ScreenHeader title="行程" subtitle="日期 · 九宫格距离" mark-icon="car" />

    <section class="glass-card">
      <div class="field">
        <label>目的地</label>
        <input
          v-model="destination"
          class="field-box"
          placeholder="如：客户现场"
          @focus="showSuggest = true"
        />
        <div v-if="showSuggest && destSuggestions.length" style="margin-top: 6px">
          <button
            v-for="d in destSuggestions"
            :key="d.id"
            type="button"
            class="chip"
            style="display: block; width: 100%; text-align: left; margin-bottom: 6px"
            @click="pickDestination(d.name)"
          >
            {{ d.name }} · {{ d.distance }}km
            <span v-if="d.purpose" style="color: var(--muted); font-size: 12px"> · {{ d.purpose }}</span>
          </button>
        </div>
      </div>
      <div class="field">
        <label>事由</label>
        <input v-model="purpose" class="field-box" placeholder="如：拜访 / 开会" />
      </div>
      <div class="btn-row">
        <div class="field" style="flex: 1; margin: 0">
          <label>距离 (km)</label>
          <button class="field-box" style="text-align: left" type="button" @click="openPad">
            {{ padOpen && hasPlus ? padDisplay() : distance || '点按输入' }}
          </button>
        </div>
        <div class="field" style="flex: 1; margin: 0">
          <label>日期</label>
          <input v-model="date" type="date" class="field-box" />
        </div>
      </div>
      <div class="field">
        <label>车型</label>
        <select v-model="vehicleType" class="field-box">
          <option value="ELECTRIC">新能源</option>
          <option value="GASOLINE">油车</option>
        </select>
      </div>
      <div class="money-row">
        <span>预计金额</span>
        <b class="tabnum">¥{{ amountPreview.toFixed(2) }}</b>
      </div>
      <p style="font-size: 12px; color: var(--muted); margin: 8px 0 0">
        费率：{{ vehicleType === 'ELECTRIC' ? '新能源' : '油车' }} {{ rate }} 元/km
      </p>
      <button class="btn btn-primary" style="width: 100%; margin-top: 12px" :disabled="tripStore.isLoading" @click="save">
        <AppIcon name="check" :size="16" />保存
      </button>
      <div v-if="tripStore.error" class="toast" style="position: static; transform: none; margin-top: 12px">
        {{ tripStore.error }}
      </div>
      <div v-if="toast" class="toast" style="position: static; transform: none; margin-top: 8px">{{ toast }}</div>
    </section>

    <NumericPad
      v-if="padOpen"
      :model-value="hasPlus && !distance ? formatNum(accum) + '+' : distance"
      :title="`输入距离 (km)${hasPlus ? ' · 累加中' : ''}`"
      :plus-active="hasPlus"
      @update:model-value="onPadInput"
      @close="closePad"
    />
  </main>
</template>
