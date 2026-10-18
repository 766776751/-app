<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScreenHeader from '@/components/ScreenHeader.vue'
import { useTripStore } from '@/stores/trip'

const router = useRouter()
const tripStore = useTripStore()
const staleCount = ref(0)
const prompted = ref(false)

const STALE_DAYS = 90

onMounted(async () => {
  await tripStore.loadTrips()
  const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000
  staleCount.value = tripStore.deleted.filter((t) => {
    const ts = t.deletedAt ? Date.parse(t.deletedAt) : 0
    return ts > 0 && ts < cutoff
  }).length
  maybePrompt()
})

function maybePrompt() {
  if (prompted.value || staleCount.value <= 0) return
  prompted.value = true
  if (confirm(`有 ${staleCount.value} 条行程删除已超过 ${STALE_DAYS} 天，是否永久清理？`)) {
    void purgeStale()
  }
}

async function purgeStale() {
  const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000
  const targets = tripStore.deleted.filter((t) => {
    const ts = t.deletedAt ? Date.parse(t.deletedAt) : 0
    return ts > 0 && ts < cutoff
  })
  for (const t of targets) {
    await tripStore.purge(t.id)
  }
  staleCount.value = 0
}

async function restore(id: number) {
  await tripStore.restore(id)
}

async function purge(id: number) {
  if (!confirm('永久删除该行程？不可恢复')) return
  await tripStore.purge(id)
}
</script>

<template>
  <main class="page">
    <ScreenHeader title="回收站" subtitle="删除的行程会先放在这里" mark="收" />

    <section v-if="staleCount > 0" class="glass-card" style="border-color: var(--error-border)">
      <h2 class="section-title" style="color: var(--error)">过期提醒</h2>
      <p style="font-size: 13px; color: var(--muted); margin: 0 0 10px">
        {{ staleCount }} 条行程已删除超过 {{ STALE_DAYS }} 天，可永久清理释放空间
      </p>
      <button class="btn btn-secondary" style="width: 100%" @click="purgeStale">
        永久清理过期项
      </button>
    </section>

    <section class="glass-card">
      <h2 class="section-title">已删除行程</h2>
      <div v-if="!tripStore.deleted.length" class="empty">
        <div class="icon-chip">收</div>
        <h3>回收站是空的</h3>
        <p style="color: var(--muted); font-size: 13px">在行程列表里删除的记录会出现在这里</p>
        <button class="btn btn-secondary" style="margin-top: 12px" @click="router.push('/trip/add')">
          去添加行程
        </button>
      </div>
      <div v-for="t in tripStore.deleted" :key="t.id" class="list-item">
        <div class="icon-chip">车</div>
        <div class="l">
          <b>{{ t.destination }}</b>
          <small>{{ t.date }} · {{ t.purpose }} · <span class="amount-text">¥{{ t.amount.toFixed(2) }}</span></small>
        </div>
        <div class="r">
          <button
            class="btn btn-secondary"
            style="min-height: 32px; font-size: 12px; padding: 0 10px"
            @click="restore(t.id)"
          >
            恢复
          </button>
          <button
            class="btn btn-secondary"
            style="min-height: 32px; font-size: 12px; padding: 0 10px; margin-top: 4px"
            @click="purge(t.id)"
          >
            永删
          </button>
        </div>
      </div>
    </section>
  </main>
</template>
