<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ScreenHeader from '@/components/ScreenHeader.vue'
import AttachmentPreview from '@/components/AttachmentPreview.vue'
import { useExpenseStore } from '@/stores/expense'
import { useTemplateStore } from '@/stores/template'
import { CATEGORY_LABEL, type ExpenseCategory } from '@/types/expense'
import { today } from '@/utils/date'
import { attachmentSaveName } from '@/utils/attachmentName'

const route = useRoute()
const router = useRouter()
const store = useExpenseStore()
const templateStore = useTemplateStore()

const id = computed(() => Number(route.params.id))
const title = ref('')
const projectCode = ref('')
const amount = ref('')
const purpose = ref('')
const category = ref<ExpenseCategory>('MATERIAL')
const date = ref(today())
const attachments = ref<{ name: string; blobId: number; kind: 'image' | 'pdf' }[]>([])
const padOpen = ref(false)
const toast = ref('')
const previewBlob = ref<Blob | null>(null)
const previewName = ref('')
const previewSaveName = ref('')

onMounted(async () => {
  await store.load()
  await templateStore.load()
  const rec = store.all.find((r) => r.id === id.value)
  if (!rec) {
    toast.value = '未找到该报销记录'
    return
  }
  title.value = rec.title
  projectCode.value = rec.projectCode
  amount.value = String(rec.amount)
  purpose.value = rec.purpose
  category.value = rec.category
  date.value = rec.date
  attachments.value = [...(rec.attachments || [])]
})

const fileInput = ref<HTMLInputElement | null>(null)
const pdfInput = ref<HTMLInputElement | null>(null)

async function onPickFile(e: Event, kind: 'image' | 'pdf') {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const blobId = await store.addAttachmentBlob(file)
    attachments.value.push({ name: file.name, blobId, kind })
    toast.value = '附件已添加'
  } catch (err) {
    toast.value = `附件添加失败：${(err as Error).message || '格式不支持'}`
  }
  input.value = ''
}

async function previewAtt(blobId: number, name: string) {
  const row = await store.getAttachment(blobId)
  if (!row) {
    toast.value = '附件不存在'
    return
  }
  previewBlob.value = row.blob
  previewName.value = name
}

async function save() {
  const amt = Number(amount.value)
  if (!title.value.trim() || !(amt > 0)) {
    toast.value = '请填写名称与有效金额'
    return
  }
  await store.updateExpense(id.value, {
    title: title.value.trim(),
    projectCode: projectCode.value.trim(),
    amount: amt,
    purpose: purpose.value.trim(),
    category: category.value,
    date: date.value,
    attachments: attachments.value,
  })
  toast.value = '已保存'
  setTimeout(() => router.push('/expense/history'), 400)
}

function removeAtt(blobId: number) {
  attachments.value = attachments.value.filter((a) => a.blobId !== blobId)
}

const supportsPdf = computed(() => category.value === 'INVOICE')

// 项目联想：按项目名/编号匹配模板，选中后自动填充编号
const showSuggest = ref(false)
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
</script>

<template>
  <main class="page">
    <ScreenHeader title="编辑报销" subtitle="修改后保存" mark="编" />

    <section class="glass-card">
      <div class="field">
        <label>项目名称 *</label>
        <input v-model="title" class="field-box" @focus="showSuggest = true" />
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
        <input v-model="projectCode" class="field-box" />
      </div>
      <div class="btn-row" style="align-items: flex-end">
        <div class="field" style="flex: 1; margin: 0">
          <label>金额 (元) *</label>
          <button class="field-box" style="text-align: left" type="button" @click="padOpen = true">
            {{ amount || '点按输入' }}
          </button>
        </div>
        <div class="field" style="flex: 1; margin: 0">
          <label>日期</label>
          <input v-model="date" type="date" class="field-box" />
        </div>
      </div>
      <div class="field">
        <label>事由</label>
        <input v-model="purpose" class="field-box" />
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
        <label>附件</label>
        <div class="btn-row">
          <button class="btn btn-secondary" type="button" @click="fileInput?.click()">图片</button>
          <button v-if="supportsPdf" class="btn btn-secondary" type="button" @click="pdfInput?.click()">
            发票PDF
          </button>
        </div>
        <input ref="fileInput" type="file" accept="image/*" hidden @change="onPickFile($event, 'image')" />
        <input ref="pdfInput" type="file" accept="application/pdf" hidden @change="onPickFile($event, 'pdf')" />
        <div
          v-for="a in attachments"
          :key="a.blobId"
          style="display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--muted); margin-top: 6px"
        >
          <span style="flex: 1">{{ a.name }}</span>
          <button class="btn btn-secondary" style="min-height: 28px; font-size: 12px; padding: 0 8px" @click="previewAtt(a.blobId, a.name)">
            预览
          </button>
          <button class="btn btn-secondary" style="min-height: 28px; font-size: 12px; padding: 0 8px" @click="removeAtt(a.blobId)">
            删
          </button>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" @click="router.back()">返回</button>
        <button class="btn btn-primary" @click="save">保存</button>
      </div>
      <div v-if="toast" class="toast" style="position: static; transform: none; margin-top: 8px">{{ toast }}</div>
    </section>

    <AttachmentPreview
      v-if="previewBlob"
      :blob="previewBlob"
      :file-name="previewName"
      @close="previewBlob = null"
    />
  </main>
</template>
