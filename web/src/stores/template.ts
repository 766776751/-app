import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db/schema'
import type { ProjectTemplate } from '@/types/template'

export const useTemplateStore = defineStore('template', () => {
  const list = ref<ProjectTemplate[]>([])
  const keyword = ref('')

  const suggestions = () => {
    const kw = keyword.value.trim()
    const all = [...list.value].sort((a, b) => b.usageCount - a.usageCount)
    if (!kw) return all
    return all.filter(
      (t) => t.projectName.includes(kw) || t.projectCode.includes(kw),
    )
  }

  async function load() {
    list.value = await db.templates.orderBy('usageCount').reverse().toArray()
  }

  function setKeyword(k: string) {
    keyword.value = k
  }

  async function add(input: { projectName: string; projectCode: string; description?: string }) {
    const projectName = input.projectName.trim()
    const projectCode = input.projectCode.trim()
    if (!projectName && !projectCode) return
    const existing = list.value.find(
      (t) => t.projectName === projectName || (projectCode && t.projectCode === projectCode),
    )
    if (existing) {
      if (existing.id == null) return
      await db.templates.update(existing.id, {
        projectName: projectName || existing.projectName,
        projectCode: projectCode || existing.projectCode,
        description: input.description ?? existing.description,
        lastUsed: Date.now(),
      })
    } else {
      await db.templates.add({
        projectName,
        projectCode,
        description: input.description ?? '',
        usageCount: 0,
        lastUsed: Date.now(),
      })
    }
    await load()
  }

  async function update(id: number, patch: Partial<ProjectTemplate>) {
    await db.templates.update(id, { ...patch, lastUsed: Date.now() })
    await load()
  }

  async function remove(id: number) {
    await db.templates.delete(id)
    await load()
  }

  async function bumpUsage(id: number) {
    const t = list.value.find((x) => x.id === id)
    if (!t) return
    await db.templates.update(id, { usageCount: t.usageCount + 1, lastUsed: Date.now() })
    await load()
  }

  return { list, keyword, suggestions, load, setKeyword, add, update, remove, bumpUsage }
})
