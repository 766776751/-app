<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import ScreenHeader from '@/components/ScreenHeader.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useExpenseStore } from '@/stores/expense'
import { CATEGORY_LABEL, type ExpenseCategory } from '@/types/expense'
import type { IconName } from '@/utils/icons'

const router = useRouter()
const store = useExpenseStore()
const categories: (ExpenseCategory | null)[] = [null, 'MATERIAL', 'MEAL_SUBSIDY', 'INVOICE', 'OTHER']
const thumbs = reactive<Record<number, string>>({})

onMounted(async () => {
  await store.load()
  await loadThumbs()
})
onUnmounted(() => {
  Object.values(thumbs).forEach((u) => URL.revokeObjectURL(u))
})

async function loadThumbs() {
  for (const r of store.all.slice(0, 12)) {
    for (const a of r.attachments || []) {
      if (thumbs[a.blobId]) continue
      const row = await store.getAttachment(a.blobId)
      if (!row?.blob) continue
      if (a.kind === 'pdf' || row.kind === 'pdf' || row.blob.type === 'application/pdf') continue
      thumbs[a.blobId] = URL.createObjectURL(row.blob)
    }
  }
}

const total = computed(() => store.all.reduce((s, r) => s + r.amount, 0))
const pending = computed(() => store.all.filter((r) => r.status === 'PENDING').length)
const paid = computed(() => store.all.filter((r) => r.status === 'PAID').length)
const recent = computed(() => store.records)

function openEdit(id: number) {
  router.push(`/expense/${id}/edit`)
}

const catIcon: Record<ExpenseCategory, IconName> = {
  MATERIAL: 'rate',
  MEAL_SUBSIDY: 'file',
  INVOICE: 'pdf',
  OTHER: 'list',
}
</script>

<template>
  <main class="page">
    <ScreenHeader title="报销" mark-icon="wallet" />

    <section class="glass-card compact-stats">
      <div class="stat-row" style="margin-top: 0">
        <div class="stat-tile">
          <b class="tabnum amount-text">¥{{ total.toFixed(0) }}</b>
          <span>总金额</span>
        </div>
        <div class="stat-tile">
          <b class="tabnum">{{ pending }}</b>
          <span>待报销</span>
        </div>
        <div class="stat-tile">
          <b class="tabnum">{{ paid }}</b>
          <span>已报销</span>
        </div>
      </div>
    </section>

    <section class="glass-card">
      <div class="chip-row" style="margin-top: 0">
        <button
          v-for="c in categories"
          :key="c ?? 'all'"
          class="chip"
          :class="{ on: store.selectedCategory === c }"
          @click="store.filterByCategory(c)"
        >
          {{ c ? CATEGORY_LABEL[c] : '全部' }}
        </button>
      </div>
      <div class="btn-row" style="margin-top: 10px">
        <button class="btn btn-primary" style="flex: 1" @click="router.push('/expense/add')">
          <AppIcon name="plus" :size="16" />添加报销
        </button>
        <button class="btn btn-secondary" @click="router.push('/expense/history')">
          <AppIcon name="export" :size="16" />导出待报销
        </button>
      </div>
    </section>

    <section class="glass-card">
      <h2 class="section-title">记录</h2>
      <div v-if="store.isLoading" style="padding: 20px; text-align: center; color: var(--muted)">加载中…</div>
      <div v-else-if="!recent.length" class="empty">
        <div class="icon-chip">票</div>
        <h3>暂无报销记录</h3>
        <p style="color: var(--muted); font-size: 13px">
          {{
            store.selectedCategory
              ? `「${CATEGORY_LABEL[store.selectedCategory]}」下还没有记录`
              : '点上方「添加报销」录入第一笔费用'
          }}
        </p>
        <button class="btn btn-primary" style="margin-top: 10px" @click="router.push('/expense/add')">
          添加报销
        </button>
      </div>
      <div v-for="r in recent" :key="r.id" class="list-item" @click="openEdit(r.id!)">
        <div
          class="icon-chip"
          :style="r.category === 'INVOICE' ? 'background:var(--amber-soft);color:var(--amber)' : ''"
        >
          <AppIcon :name="catIcon[r.category]" :size="18" />
        </div>
        <div class="l">
          <b>{{ r.title }}</b>
          <small>{{ CATEGORY_LABEL[r.category] }} · {{ r.date }}</small>
          <div>
            <span class="badge" :class="r.status === 'PAID' ? 'paid' : 'pending'">
              {{ r.status === 'PAID' ? '已报销' : '待报销' }}
            </span>
          </div>
          <div v-if="r.attachments?.length" class="thumb-row">
            <template v-for="a in r.attachments" :key="a.blobId">
              <img
                v-if="thumbs[a.blobId]"
                :src="thumbs[a.blobId]"
                :alt="a.name"
                @click.stop="openEdit(r.id!)"
              />
              <span v-else class="pdf-tag">PDF</span>
            </template>
          </div>
        </div>
        <div class="r">
          <b class="tabnum amount-text">¥{{ r.amount.toFixed(2) }}</b>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.compact-stats .stat-tile {
  padding: 8px 6px;
}
.compact-stats .stat-tile b {
  font-size: 16px;
}
.amount-text {
  color: var(--amber);
}
</style>
