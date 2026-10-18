<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScreenHeader from '@/components/ScreenHeader.vue'
import NumericPad from '@/components/NumericPad.vue'
import AttachmentPreview from '@/components/AttachmentPreview.vue'
import { useExpenseStore } from '@/stores/expense'
import { useTemplateStore } from '@/stores/template'
import { CATEGORY_LABEL, supportsPdf, type ExpenseCategory } from '@/types/expense'
import { today } from '@/utils/date'
import { attachmentSaveName } from '@/utils/attachmentName'

const router = useRouter()
const store = useExpenseStore()
const templateStore = useTemplateStore()

const title = ref('')
const projectCode = ref('')
const amount = ref('')
const purpose = ref('')
const category = ref<ExpenseCategory>('MATERIAL')
const date = ref(today())
const padOpen = ref(false)
const toast = ref('')
const pendingFiles = ref<{ name: string; blobId: number }[]>([])
const previewBlob = ref<Blob | null>(null)
const previewName = ref('')
const previewSaveName = ref('')
const showSuggest = ref(false)

onMounted(async () => {
  await store.load()
  await templateStore.load()
})

const templateSuggestions = computed(() => {
  const kw = title.value.trim()
  const all = [...templateStore.list].sort((a, b) => b.usageCount - a.usageCount)
  if (!kw) return all.slice(0, 6)
  return all.filter((t) => t.projectName.includes(kw) || t.projectCode.includes(kw)).slice(0, 6)
})

function pickTemplate(id?: number) {
  if (id == null) return
  const t = templateStore.list.find((x) => x.id === id)
  if (!t) return
  title.value = t.projectName
  projectCode.value = t.projectCode
  showSuggest.value = false
  templateStore.bumpUsage(id)
}

const fileInput = ref<HTMLInputElement | null>(null)
const pdfInput = ref<HTMLInputElement | null>(null)

async function onPickImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const id = await store.addAttachmentBlob(file)
    pendingFiles.value.push({ name: file.name, blobId: id })
    toast.value = '图片已添加'
  } catch (err) {
    toast.value = `图片添加失败：${(err as Error).message || '格式不支持'}`
  }
  input.value = ''
}

async function onPickPdf(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const id = await store.addAttachmentBlob(file)
    pendingFiles.value.push({ name: file.name, blobId: id })
    toast.value = '发票 PDF 已添加，可点预览'
  } catch (err) {
    toast.value = `PDF 添加失败：${(err as Error).message || '格式不支持'}`
  }
  input.value = ''
}

async function previewPending(
  f: { name: string; blobId: number },
  idx: number,
) {
  const row = await store.getAttachment(f.blobId)
  if (!row) {
    toast.value = '附件不存在'
    return
  }
  previewBlob.value = row.blob
  previewName.value = f.name
  previewSaveName.value = attachmentSaveName({
    title: title.value,
    projectCode: projectCode.value,
    date: date.value,
    amount: amount.value,
    index: idx,
    total: pendingFiles.value.length,
    fileName: f.name,
  })
}

async function save() {
  await store.addExpense({
    title: title.value,
    projectCode: projectCode.value,
    amount: Number(amount.value) || 0,
    purpose: purpose.value,
    category: category.value,
    attachments: pendingFiles.value.map((f) => ({
      kind: f.name.toLowerCase().endsWith('.pdf') ? ('pdf' as const) : ('image' as const),
      blobId: f.blobId,
      name: f.name,
    })),
    date: date.value,
  })
  if (store.error) {
    toast.value = store.error
    return
  }
  toast.value = '报销已保存'
  title.value = ''
  projectCode.value = ''
  amount.value = ''
  purpose.value = ''
  pendingFiles.value = []
  store.resetSaveSuccess()
  router.push('/expense')
}

function onPlus() {
  // 累加金额：保持简单，把当前输入并入 amount
  const cur = Number(amount.value) || 0
  if (cur > 0) {
    toast.value = `已记录 ${cur}，继续输入下一笔后点完成`
  }
}
</script>

<template>
  <main class="page">
    <ScreenHeader title="添加报销" subtitle="四类费用 · 可选发票 PDF" mark="+" trailing="返回" />

    <section class="glass-card">
      <div class="field">
        <label>项目名称 *</label>
        <input
          v-model="title"
          class="field-box"
          placeholder="项目/费用名"
          @focus="showSuggest = true"
        />
        <div v-if="showSuggest && templateSuggestions.length" style="margin-top: 6px">
          <button
            v-for="t in templateSuggestions"
            :key="t.id"
            type="button"
            class="chip"
            style="display: block; width: 100%; text-align: left; margin-bottom: 6px"
            @click="pickTemplate(t.id)"
          >
            {{ t.projectName }}
            <span v-if="t.projectCode" style="color: var(--muted); font-size: 12px"> · {{ t.projectCode }}</span>
          </button>
        </div>
      </div>
      <div class="field">
        <label>项目编号</label>
        <input v-model="projectCode" class="field-box" placeholder="可选" />
      </div>
      <div class="btn-row">
        <div class="field" style="flex: 1; margin: 0">
          <label>金额 (元) *</label>
          <button class="field-box" style="text-align: left" type="button" @click="padOpen = true">
            {{ amount || '点按输入' }}
          </button>
        </div>
        <div class="field" style="flex: 1; margin: 0">
          <label>日期 *</label>
          <input v-model="date" type="date" class="field-box" />
        </div>
      </div>
      <div class="field">
        <label>事由 *</label>
        <input v-model="purpose" class="field-box" placeholder="用途说明" />
      </div>
      <div class="field">
        <label>类别</label>
        <select v-model="category" class="field-box">
          <option value="MATERIAL">{{ CATEGORY_LABEL.MATERIAL }}</option>
          <option value="MEAL_SUBSIDY">{{ CATEGORY_LABEL.MEAL_SUBSIDY }}</option>
          <option value="INVOICE">{{ CATEGORY_LABEL.INVOICE }}</option>
          <option value="OTHER">{{ CATEGORY_LABEL.OTHER }}</option>
        </select>
      </div>
      <div class="field">
        <label>{{ supportsPdf(category) ? '发票 / 凭证' : '凭证图片' }}</label>
        <div class="btn-row">
          <button class="btn btn-secondary" type="button" @click="fileInput?.click()">选择图片</button>
          <button v-if="supportsPdf(category)" class="btn btn-secondary" type="button" @click="pdfInput?.click()">
            上传发票PDF
          </button>
        </div>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onPickImage" />
        <input ref="pdfInput" type="file" accept="application/pdf" hidden @change="onPickPdf" />
        <div v-for="(f, fi) in pendingFiles" :key="f.blobId" style="font-size: 12px; color: var(--muted); display: flex; gap: 8px; align-items: center">
          <span style="flex: 1">附件：{{ f.name }}</span>
          <button type="button" class="btn btn-secondary" style="min-height: 28px; font-size: 12px; padding: 0 8px" @click="previewPending(f, fi)">
            预览
          </button>
        </div>
      </div>
      <button class="btn btn-primary" style="width: 100%" :disabled="store.isLoading" @click="save">
        保存报销
      </button>
      <div v-if="toast" class="toast" style="position: static; transform: none; margin-top: 10px">{{ toast }}</div>
    </section>

    <NumericPad
      v-if="padOpen"
      :model-value="amount"
      title="输入报销金额 (元)"
      @update:model-value="(v) => (amount = v)"
      @close="padOpen = false"
    />
    <AttachmentPreview
      v-if="previewBlob"
      :blob="previewBlob"
      :file-name="previewName"
      :save-name="previewSaveName"
      @close="previewBlob = null"
    />
  </main>
</template>
