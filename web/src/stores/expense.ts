import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { db } from '@/db/schema'
import type { ExpenseCategory, ExpenseRecord, ExpenseStatus } from '@/types/expense'
import { nowIso, today } from '@/utils/date'
import { compressImageFile } from '@/utils/imageCompress'

const FILTER_KEY = 'bxsb_expense_filters'

function loadFilters(): {
  selectedCategory: ExpenseCategory | null
  selectedStatus: ExpenseStatus | null
  keyword: string
} {
  try {
    const raw = localStorage.getItem(FILTER_KEY)
    if (!raw) return { selectedCategory: null, selectedStatus: null, keyword: '' }
    const p = JSON.parse(raw) as Record<string, unknown>
    return {
      selectedCategory: (p.selectedCategory as ExpenseCategory) || null,
      selectedStatus: (p.selectedStatus as ExpenseStatus) || null,
      keyword: typeof p.keyword === 'string' ? p.keyword : '',
    }
  } catch {
    return { selectedCategory: null, selectedStatus: null, keyword: '' }
  }
}

function persistFilters(next: {
  selectedCategory: ExpenseCategory | null
  selectedStatus: ExpenseStatus | null
  keyword: string
}) {
  try {
    localStorage.setItem(FILTER_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export const useExpenseStore = defineStore('expense', () => {
  const saved = loadFilters()
  const all = ref<ExpenseRecord[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const saveSuccess = ref(false)
  const selectedCategory = ref<ExpenseCategory | null>(saved.selectedCategory)
  const selectedStatus = ref<ExpenseStatus | null>(saved.selectedStatus)
  const keyword = ref(saved.keyword)

  const records = computed(() => {
    const cat = selectedCategory.value
    const st = selectedStatus.value
    const kw = keyword.value.trim()
    return all.value.filter((r) => {
      if (cat && r.category !== cat) return false
      if (st && r.status !== st) return false
      if (kw && !(r.title.includes(kw) || r.projectCode.includes(kw) || r.purpose.includes(kw)))
        return false
      return true
    })
  })

  async function load() {
    isLoading.value = true
    try {
      all.value = (await db.expenses.orderBy('date').reverse().toArray()) as ExpenseRecord[]
      error.value = null
    } catch (e) {
      error.value = `加载报销失败: ${(e as Error).message}`
    } finally {
      isLoading.value = false
    }
  }

  function filterByCategory(c: ExpenseCategory | null) {
    selectedCategory.value = c
    persistFilters({
      selectedCategory: selectedCategory.value,
      selectedStatus: selectedStatus.value,
      keyword: keyword.value,
    })
  }

  function filterByStatus(s: ExpenseStatus | null) {
    selectedStatus.value = s
    persistFilters({
      selectedCategory: selectedCategory.value,
      selectedStatus: selectedStatus.value,
      keyword: keyword.value,
    })
  }

  function setKeyword(k: string) {
    keyword.value = k
    persistFilters({
      selectedCategory: selectedCategory.value,
      selectedStatus: selectedStatus.value,
      keyword: keyword.value,
    })
  }

  function clearFilters() {
    selectedCategory.value = null
    selectedStatus.value = null
    keyword.value = ''
    persistFilters({ selectedCategory: null, selectedStatus: null, keyword: '' })
  }

  async function addExpense(input: {
    title: string
    projectCode: string
    amount: number
    purpose: string
    category: ExpenseCategory
    attachments: ExpenseRecord['attachments']
    date?: string
  }) {
    if (!input.title.trim()) {
      error.value = '项目名称不能为空'
      return
    }
    if (!(input.amount > 0)) {
      error.value = '报销金额必须大于 0'
      return
    }
    if (!input.purpose.trim()) {
      error.value = '报销事由不能为空'
      return
    }
    const ts = nowIso()
    const rec: Omit<ExpenseRecord, 'id'> = {
      title: input.title.trim(),
      projectCode: input.projectCode.trim(),
      amount: input.amount,
      purpose: input.purpose.trim(),
      category: input.category,
      attachments: input.attachments,
      status: 'PENDING',
      date: input.date || today(),
      createdAt: ts,
      updatedAt: ts,
    }
    try {
      await db.expenses.add(rec as ExpenseRecord)
      await load()
      saveSuccess.value = true
      error.value = null
    } catch (e) {
      error.value = `保存报销失败: ${(e as Error).message}`
    }
  }

  async function updateExpense(id: number, patch: Partial<ExpenseRecord>) {
    await db.expenses.update(id, { ...patch, updatedAt: nowIso() })
    await load()
  }

  async function toggleStatus(id: number) {
    const rec = all.value.find((r) => r.id === id)
    if (!rec) return
    const next: ExpenseStatus = rec.status === 'PAID' ? 'PENDING' : 'PAID'
    await updateExpense(id, { status: next })
  }

  async function remove(id: number) {
    await db.expenses.delete(id)
    await load()
  }

  async function addAttachmentBlob(file: File): Promise<number> {
    if (file.size > 15 * 1024 * 1024) {
      throw new Error('附件过大（超过 15MB）')
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const kind: 'image' | 'pdf' = isPdf ? 'pdf' : 'image'
    const stored = isPdf ? file : await compressImageFile(file)
    const id = await db.attachments.add({ blob: stored, name: stored.name || file.name, kind })
    return id as number
  }

  async function getAttachment(blobId: number) {
    return db.attachments.get(blobId)
  }

  function resetSaveSuccess() {
    saveSuccess.value = false
  }

  function clearError() {
    error.value = null
  }

  return {
    all,
    records,
    isLoading,
    error,
    saveSuccess,
    selectedCategory,
    selectedStatus,
    keyword,
    load,
    filterByCategory,
    filterByStatus,
    setKeyword,
    clearFilters,
    addExpense,
    updateExpense,
    toggleStatus,
    remove,
    addAttachmentBlob,
    getAttachment,
    resetSaveSuccess,
    clearError,
  }
})