<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScreenHeader from '@/components/ScreenHeader.vue'
import AppIcon from '@/components/AppIcon.vue'
import AttachmentPreview from '@/components/AttachmentPreview.vue'
import { useExpenseStore } from '@/stores/expense'
import { CATEGORY_LABEL } from '@/types/expense'
import { buildPendingZipBlob } from '@/utils/pendingExport'
import { shareBlob } from '@/utils/shareBlob'
import { attachmentSaveName } from '@/utils/attachmentName'

const router = useRouter()
const store = useExpenseStore()
const previewBlob = ref<Blob | null>(null)
const previewName = ref('')
const previewSaveName = ref('')
const exportMsg = ref('')
const thumbs = reactive<Record<number, string>>({})
const exporting = ref(false)

onMounted(async () => {
  await store.load()
  await loadThumbs()
})
onUnmounted(() => {
  Object.values(thumbs).forEach((u) => URL.revokeObjectURL(u))
})

async function loadThumbs() {
  for (const r of store.all) {
    for (const a of r.attachments || []) {
      if (thumbs[a.blobId]) continue
      const row = await store.getAttachment(a.blobId)
      if (!row?.blob) continue
      if (a.kind === 'pdf' || row.kind === 'pdf' || row.blob.type === 'application/pdf') continue
      thumbs[a.blobId] = URL.createObjectURL(row.blob)
    }
  }
}

const filteredEmpty = computed(
  () => !store.records.length && (store.selectedCategory || store.selectedStatus || store.keyword),
)

const pendingCount = computed(() => store.all.filter((r) => r.status === 'PENDING').length)

async function previewAttachment(
  r: { title: string; projectCode: string; date: string; amount: number; attachments?: { blobId: number; name: string; kind: 'image' | 'pdf' }[] },
  a: { blobId: number; name: string; kind: 'image' | 'pdf' },
  ai: number,
) {
  const row = await store.getAttachment(a.blobId)
  if (!row) return
  previewBlob.value = row.blob
  previewName.value = a.name
  previewSaveName.value = attachmentSaveName({
    title: r.title,
    projectCode: r.projectCode,
    date: r.date,
    amount: r.amount,
    index: ai,
    total: r.attachments?.length ?? 1,
    fileName: a.name,
    kind: a.kind,
  })
}

function openEdit(id: number) {
  router.push(`/expense/${id}/edit`)
}

async function exportPendingZip() {
  if (exporting.value) return
  exporting.value = true
  exportMsg.value = '正在打包未报销…'
  try {
    const { blob, fileName, count, fileCount } = await buildPendingZipBlob(store.all)
    if (!count) {
      exportMsg.value = '没有待报销记录'
      return
    }
    const result = await shareBlob(blob, fileName, 'application/zip')
    exportMsg.value =
      result === 'shared'
        ? `已分享未报销包（${count} 条 / 附件 ${fileCount}）`
        : result === 'saved'
          ? `已保存到文档/报销神器 · ${fileName}`
          : result === 'downloaded'
            ? '已开始下载 zip'
            : result === 'cancelled'
              ? '已取消'
              : '导出失败'
  } catch (e) {
    exportMsg.value = `导出失败: ${(e as Error).message}`
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <main class="page">
    <ScreenHeader title="历史" subtitle="点按编辑 · 可导出待报销" mark-icon="history" />

    <section class="glass-card">
      <div class="btn-row" style="margin-top: 0">
        <button
          class="btn btn-primary"
          style="flex: 1"
          :disabled="exporting"
          @click="exportPendingZip"
        >
          <AppIcon name="export" :size="16" />
          导出待报销 ZIP
        </button>
      </div>
      <div v-if="exportMsg" class="toast show" style="position: static; transform: none; margin-top: 8px">
        {{ exportMsg }}
      </div>
    </section>

    <section class="glass-card">
      <div class="field">
        <label>搜索</label>
        <input
          class="field-box"
          :value="store.keyword"
          placeholder="搜索报销记录..."
          @input="store.setKeyword(($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="chip-row">
        <button
          v-for="c in [null, 'MATERIAL', 'MEAL_SUBSIDY', 'INVOICE', 'OTHER'] as const"
          :key="c ?? 'all'"
          class="chip"
          :class="{ on: store.selectedCategory === c }"
          @click="store.filterByCategory(c)"
        >
          {{ c ? CATEGORY_LABEL[c] : '全部类别' }}
        </button>
      </div>
      <div class="chip-row">
        <button class="chip" :class="{ on: store.selectedStatus === null }" @click="store.filterByStatus(null)">
          全部状态
        </button>
        <button class="chip" :class="{ on: store.selectedStatus === 'PENDING' }" @click="store.filterByStatus('PENDING')">
          待报销
        </button>
        <button class="chip" :class="{ on: store.selectedStatus === 'PAID' }" @click="store.filterByStatus('PAID')">
          已报销
        </button>
      </div>
    </section>

    <section class="glass-card">
      <h2 class="section-title">报销记录</h2>
      <div v-if="!store.records.length" class="empty">
        <div class="icon-chip">史</div>
        <h3>暂无报销记录</h3>
        <p style="color: var(--muted); font-size: 13px">
          {{ filteredEmpty ? '当前筛选条件下没有记录' : '还没有报销数据' }}
        </p>
        <div class="btn-row" style="justify-content: center">
          <button v-if="filteredEmpty" class="btn btn-secondary" @click="store.clearFilters()">清除筛选</button>
          <button class="btn btn-primary" @click="router.push('/expense/add')">添加报销</button>
        </div>
      </div>
      <div v-for="r in store.records" :key="r.id" class="list-item" @click="openEdit(r.id!)">
        <div
          class="icon-chip"
          :style="r.category === 'INVOICE' ? 'background:var(--amber-soft);color:var(--amber)' : ''"
        >
          <AppIcon :name="r.category === 'INVOICE' ? 'pdf' : 'wallet'" :size="18" />
        </div>
        <div class="l">
          <b>{{ r.title }}</b>
          <small>{{ CATEGORY_LABEL[r.category] }} · {{ r.date }}{{ r.projectCode ? ' · ' + r.projectCode : '' }}</small>
          <div>
            <span class="badge" :class="r.status === 'PAID' ? 'paid' : 'pending'">
              {{ r.status === 'PAID' ? '已报销' : '待报销' }}
            </span>
          </div>
          <div v-if="r.attachments?.length" class="thumb-row">
            <template v-for="(a, ai) in r.attachments" :key="a.blobId">
              <img
                v-if="thumbs[a.blobId]"
                :src="thumbs[a.blobId]"
                :alt="a.name"
                @click.stop="previewAttachment(r, a, ai)"
              />
              <span
                v-else
                class="pdf-tag"
                @click.stop="previewAttachment(r, a, ai)"
              >PDF</span>
            </template>
          </div>
        </div>
        <div class="r">
          <b class="tabnum amount-text">¥{{ r.amount.toFixed(2) }}</b>
          <div>
            <button
              class="btn btn-secondary"
              style="min-height: 30px; padding: 0 10px; font-size: 12px; margin-top: 6px"
              @click.stop="store.toggleStatus(r.id!)"
            >
              {{ r.status === 'PAID' ? '标待付' : '标已付' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <AttachmentPreview
      v-if="previewBlob"
      :blob="previewBlob"
      :file-name="previewName"
      :save-name="previewSaveName"
      @close="previewBlob = null"
    />
  </main>
</template>
