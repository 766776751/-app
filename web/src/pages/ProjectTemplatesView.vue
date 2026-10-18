<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import ScreenHeader from '@/components/ScreenHeader.vue'
import { useTemplateStore } from '@/stores/template'

const store = useTemplateStore()
const editingId = ref<number | null>(null)
const projectName = ref('')
const projectCode = ref('')
const description = ref('')
const search = ref('')
const toast = ref('')
const formRef = ref<HTMLElement | null>(null)

// 导入/导出弹窗
const importOpen = ref(false)
const importText = ref('')
const exportOpen = ref(false)
const exportText = ref('')

// 首次空库预置的项目（来源：致远/首创项目编号表）
const SEED: { projectName: string; projectCode: string }[] = [
  { projectName: '唯德康智能仓储', projectCode: 'XS-2024-00557' },
  { projectName: '恒创六分厂', projectCode: 'XS-2024-00538' },
  { projectName: '澳弘智能仓储', projectCode: 'XS-2022-00025' },
  { projectName: '腾龙储液罐', projectCode: 'XS-2025-00095' },
  { projectName: '泰州领航CTU', projectCode: '2024-006' },
  { projectName: '无锡范德威尔AMR', projectCode: '2024-005' },
  { projectName: '澳弘蓝芯AGV', projectCode: '2024-002' },
  { projectName: '恒创七分厂', projectCode: '2024-007' },
]

onMounted(async () => {
  await store.load()
  // 首次空库：写入预置项目，便于直接选用
  if (store.list.length === 0) {
    for (const s of SEED) await store.add(s)
  }
})

function startEdit(id?: number) {
  if (id == null) {
    editingId.value = null
    projectName.value = ''
    projectCode.value = ''
    description.value = ''
    return
  }
  const t = store.list.find((x) => x.id === id)
  if (!t) {
    toast.value = '未找到该模板'
    return
  }
  editingId.value = id
  projectName.value = t.projectName
  projectCode.value = t.projectCode
  description.value = t.description
  nextTick(() => formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

async function save() {
  if (!projectName.value.trim() && !projectCode.value.trim()) {
    toast.value = '请填写项目名称或编号'
    return
  }
  const payload = {
    projectName: projectName.value.trim(),
    projectCode: projectCode.value.trim(),
    description: description.value.trim(),
  }
  if (editingId.value != null) {
    await store.update(editingId.value, payload)
    toast.value = '已保存修改'
  } else {
    await store.add(payload)
    toast.value = '已添加'
  }
  startEdit()
}

async function remove(id?: number) {
  if (id == null) return
  if (!confirm('删除该项目模板？')) return
  await store.remove(id)
  toast.value = '已删除'
}

function filtered() {
  const kw = search.value.trim()
  if (!kw) return store.list
  return store.list.filter((t) => t.projectName.includes(kw) || t.projectCode.includes(kw))
}

// ---- 导入：解析剪切板文本（支持 Tab / 多空格 / 逗号分隔，跳过表头）----
function parseImport(text: string): { projectName: string; projectCode: string }[] {
  const HEADER = new Set(['项目名称', '项目名', '项目编号', '名称', '编号', 'project', 'name'])
  const out: { projectName: string; projectCode: string }[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    let parts = line.split('\t')
    if (parts.length < 2) parts = line.split(/\s{2,}/)
    if (parts.length < 2) parts = line.split(/[,，]/)
    const name = (parts[0] || '').trim()
    const code = (parts[1] || '').trim()
    if (!name && !code) continue
    if (HEADER.has(name)) continue // 跳过表头行
    out.push({ projectName: name, projectCode: code })
  }
  return out
}

async function doImport() {
  const rows = parseImport(importText.value)
  if (!rows.length) {
    toast.value = '未解析到有效数据'
    return
  }
  for (const r of rows) await store.add(r)
  toast.value = `已导入 ${rows.length} 条`
  importOpen.value = false
  importText.value = ''
}

// ---- 导出：生成 TSV 并写入剪切板 ----
function buildTsv(): string {
  const head = '项目名称\t项目编号'
  const lines = store.list.map((t) => `${t.projectName}\t${t.projectCode}`)
  return [head, ...lines].join('\n')
}

async function openExport() {
  exportText.value = buildTsv()
  exportOpen.value = true
  await copyText(exportText.value)
}

async function copyText(t: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(t)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = t
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

async function copyExport() {
  const ok = await copyText(exportText.value)
  toast.value = ok ? '已复制到剪切板' : '复制失败，请长按文本框手动复制'
}
</script>

<template>
  <main class="page">
    <ScreenHeader title="项目模板" subtitle="报销时快速填项目名称与编号" mark="模" />

    <section class="glass-card" ref="formRef" :style="editingId != null ? 'border: 2px solid var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)' : ''">
      <h2 class="section-title">{{ editingId != null ? '编辑模板（修改后保存）' : '添加项目模板' }}</h2>
      <div class="field">
        <label>项目名称</label>
        <input v-model="projectName" class="field-box" />
      </div>
      <div class="field">
        <label>项目编号</label>
        <input v-model="projectCode" class="field-box" />
      </div>
      <div class="field">
        <label>描述（可选）</label>
        <input v-model="description" class="field-box" />
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" @click="startEdit()">取消编辑</button>
        <button class="btn btn-primary" @click="save">保存</button>
      </div>
      <div v-if="toast" class="toast" style="position: static; transform: none; margin-top: 8px">{{ toast }}</div>
    </section>

    <section class="glass-card">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px">
        <h2 class="section-title" style="margin: 0; flex: 1">模板列表</h2>
        <button class="btn btn-secondary" style="min-height: 32px; font-size: 12px; padding: 0 10px" @click="importOpen = true">
          导入
        </button>
        <button class="btn btn-secondary" style="min-height: 32px; font-size: 12px; padding: 0 10px" @click="openExport">
          导出
        </button>
      </div>
      <div class="field">
        <label>搜索</label>
        <input v-model="search" class="field-box" placeholder="项目名称/编号" />
      </div>
      <div v-if="!filtered().length" class="empty">
        <div class="icon-chip">模</div>
        <h3>暂无项目模板</h3>
        <p style="color: var(--muted); font-size: 13px">添加后，添加报销页可一键选用</p>
      </div>
      <div v-for="t in filtered()" :key="t.id" class="list-item">
        <div class="icon-chip">模</div>
        <div class="l">
          <b>{{ t.projectName || '—' }}</b>
          <small>{{ t.projectCode || '无编号' }} · {{ t.description || '—' }} · {{ t.usageCount }} 次</small>
        </div>
        <div class="r">
          <button class="btn btn-secondary" style="min-height: 32px; font-size: 12px; padding: 0 10px" @click="startEdit(t.id)">
            编辑
          </button>
          <button class="btn btn-secondary" style="min-height: 32px; font-size: 12px; padding: 0 10px; margin-top: 4px" @click="remove(t.id)">
            删除
          </button>
        </div>
      </div>
    </section>

    <!-- 导入弹窗 -->
    <div v-if="importOpen" class="pad-backdrop" @click.self="importOpen = false">
      <div class="xls-panel" style="width: min(100%, 460px); max-height: 88dvh; margin: auto">
        <div style="display: flex; align-items: center; margin-bottom: 8px">
          <strong style="flex: 1">从剪切板导入</strong>
          <button class="icon-chip" style="width: 36px; height: 36px; border: 0; flex-shrink: 0" @click="importOpen = false">
            ×
          </button>
        </div>
        <p style="font-size: 12px; color: var(--muted); margin: 0 0 8px">
          粘贴「项目名称 ⇥ 项目编号」表格（Excel/文本均可，自动跳过表头），每行一条。
        </p>
        <textarea
          v-model="importText"
          class="field-box"
          style="width: 100%; min-height: 200px; font-family: monospace; font-size: 13px; resize: vertical"
          placeholder="唯德康智能仓储	XS-2024-00557\n恒创六分厂	XS-2024-00538"
        ></textarea>
        <div class="btn-row" style="margin-top: 10px">
          <button class="btn btn-secondary" @click="importOpen = false">取消</button>
          <button class="btn btn-primary" :disabled="!importText.trim()" @click="doImport">解析并导入</button>
        </div>
      </div>
    </div>

    <!-- 导出弹窗 -->
    <div v-if="exportOpen" class="pad-backdrop" @click.self="exportOpen = false">
      <div class="xls-panel" style="width: min(100%, 460px); max-height: 88dvh; margin: auto">
        <div style="display: flex; align-items: center; margin-bottom: 8px">
          <strong style="flex: 1">导出到剪切板</strong>
          <button class="icon-chip" style="width: 36px; height: 36px; border: 0; flex-shrink: 0" @click="exportOpen = false">
            ×
          </button>
        </div>
        <p style="font-size: 12px; color: var(--muted); margin: 0 0 8px">
          已尝试自动复制。若未成功，请长按下方文本框手动复制。
        </p>
        <textarea
          :value="exportText"
          readonly
          class="field-box"
          style="width: 100%; min-height: 200px; font-family: monospace; font-size: 13px; resize: vertical"
        ></textarea>
        <div class="btn-row" style="margin-top: 10px">
          <button class="btn btn-secondary" @click="exportOpen = false">关闭</button>
          <button class="btn btn-primary" @click="copyExport">复制</button>
        </div>
      </div>
    </div>
  </main>
</template>
