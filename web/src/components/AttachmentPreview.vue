<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { shareBlob } from '@/utils/shareBlob'
import { attachmentSaveName } from '@/utils/attachmentName'

type PdfjsModule = typeof import('pdfjs-dist')
let pdfjsPromise: Promise<PdfjsModule> | null = null

/** 进入预览才动态加载 pdfjs，避免打进主 chunk */
async function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist')
      const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
      return pdfjs
    })()
  }
  return pdfjsPromise
}

const props = defineProps<{
  blob: Blob | null
  fileName?: string
  /** 保存/分享时使用的文件名（按 项目名_编号_日期_金额 规则），缺省回退 fileName */
  saveName?: string
}>()
const emit = defineEmits<{ close: [] }>()

const loading = ref(true)
const errorMsg = ref('')
const pageCanvases = ref<{ id: number; dataUrl: string }[]>([])
const totalPages = ref(0)
const saving = ref(false)
const saveMsg = ref('')

function mimeOf(blob: Blob, name?: string): string {
  if (blob.type) return blob.type
  const ext = (name || '').toLowerCase().split('.').pop() || ''
  if (ext === 'pdf') return 'application/pdf'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext)) {
    return `image/${ext === 'jpg' ? 'jpeg' : ext}`
  }
  return 'application/octet-stream'
}

async function saveLocal() {
  if (!props.blob || saving.value) return
  saving.value = true
  saveMsg.value = ''
  try {
    const targetName =
      props.saveName ||
      attachmentSaveName({
        title: '',
        projectCode: '',
        date: '',
        amount: '',
        fileName: props.fileName,
        kind: props.blob.type === 'application/pdf' ? 'pdf' : 'image',
      })
    const result = await shareBlob(props.blob, targetName, mimeOf(props.blob, targetName))
    saveMsg.value =
      result === 'shared'
        ? '已唤起分享，可「保存到文件」'
        : result === 'saved'
          ? '已保存到文档'
          : result === 'downloaded'
            ? '已开始下载'
            : result === 'cancelled'
              ? '已取消'
              : '保存失败，请重试'
  } catch {
    saveMsg.value = '保存失败，请重试'
  } finally {
    saving.value = false
  }
}

async function renderPdf(blob: Blob) {
  loading.value = true
  errorMsg.value = ''
  pageCanvases.value = []
  try {
    if (blob.type && blob.type !== 'application/pdf' && !props.fileName?.toLowerCase().endsWith('.pdf')) {
      loading.value = false
      return
    }
    const pdfjs = await loadPdfjs()
    const buf = await blob.arrayBuffer()
    const doc = await pdfjs.getDocument({ data: buf }).promise
    totalPages.value = doc.numPages
    const max = Math.min(doc.numPages, 6)
    for (let i = 1; i <= max; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: 1.4 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas 2d 不可用')
      await page.render({ canvasContext: ctx, viewport, canvas }).promise
      pageCanvases.value = [
        ...pageCanvases.value,
        { id: i, dataUrl: canvas.toDataURL('image/jpeg', 0.82) },
      ]
    }
  } catch (e) {
    errorMsg.value = `无法预览 PDF：${(e as Error)?.message || e}`
  } finally {
    loading.value = false
  }
}

watch(
  () => props.blob,
  (b) => {
    if (!b) {
      pageCanvases.value = []
      return
    }
    void renderPdf(b)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  pageCanvases.value = []
})
</script>

<template>
  <div class="pad-backdrop" @click.self="emit('close')">
    <div class="xls-panel" style="width: min(100%, 430px); max-height: 88dvh; margin: auto">
      <div style="display: flex; align-items: center; margin-bottom: 8px">
        <strong style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">
          {{ fileName || '附件预览' }}
        </strong>
        <button class="icon-chip" style="width: 36px; height: 36px; border: 0; flex-shrink: 0" @click="emit('close')">
          ×
        </button>
      </div>

      <div v-if="loading" style="padding: 32px; text-align: center; color: var(--muted)">正在加载 PDF…</div>
      <div v-else-if="errorMsg" style="padding: 24px; color: var(--error); font-size: 13px">
        {{ errorMsg }}
      </div>
      <div
        v-else-if="pageCanvases.length"
        style="flex: 1; overflow: auto; border-radius: 12px; background: var(--panel-deep)"
      >
        <p
          v-if="totalPages > 1"
          style="font-size: 11px; color: var(--muted); text-align: center; padding: 6px"
        >
          共 {{ totalPages }} 页，最多预览 6 页
        </p>
        <img
          v-for="p in pageCanvases"
          :key="p.id"
          :src="p.dataUrl"
          :alt="`PDF 第 ${p.id} 页`"
          style="width: 100%; display: block; margin-bottom: 8px; border-radius: 8px"
        />
      </div>
      <div v-else style="padding: 24px; color: var(--muted)">无预览内容</div>

      <div class="btn-row" style="margin-top: 10px">
        <button class="btn btn-secondary" :disabled="saving" @click="emit('close')">关闭</button>
        <button class="btn btn-primary" :disabled="!props.blob || saving" @click="saveLocal">
          {{ saving ? '保存中…' : '保存到本地 / 分享' }}
        </button>
      </div>
      <p v-if="saveMsg" style="font-size: 12px; color: var(--muted); text-align: center; margin: 6px 0 0">
        {{ saveMsg }}
      </p>
    </div>
  </div>
</template>
