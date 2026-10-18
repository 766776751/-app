import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db/schema'
import type { Destination } from '@/types/destination'

const MAX_DESTINATIONS = 50

export const useDestinationStore = defineStore('destination', () => {
  const list = ref<Destination[]>([])
  const isLoading = ref(false)
  const keyword = ref('')

  const suggestions = () => {
    const kw = keyword.value.trim()
    const all = [...list.value].sort((a, b) => b.usageCount - a.usageCount)
    if (!kw) return all
    return all.filter((d) => d.name.includes(kw) || d.purpose.includes(kw))
  }

  async function load() {
    isLoading.value = true
    try {
      list.value = await db.destinations.orderBy('usageCount').reverse().toArray()
    } finally {
      isLoading.value = false
    }
  }

  function setKeyword(k: string) {
    keyword.value = k
  }

  /** 超过上限时淘汰使用次数最低的一条 */
  async function evictIfNeeded() {
    if (list.value.length <= MAX_DESTINATIONS) return
    const sorted = [...list.value].sort((a, b) => a.usageCount - b.usageCount)
    const excess = list.value.length - MAX_DESTINATIONS
    const ids = sorted
      .slice(0, excess)
      .map((d) => d.id)
      .filter((x): x is number => x != null)
    if (ids.length) await db.destinations.bulkDelete(ids)
  }

  async function add(input: { name: string; distance: number; purpose?: string }) {
    const name = input.name.trim()
    if (!name) return
    const existing = list.value.find((d) => d.name === name)
    if (existing) {
      if (existing.id == null) return
      await db.destinations.update(existing.id, {
        distance: input.distance,
        purpose: input.purpose ?? existing.purpose,
        lastUsed: Date.now(),
      })
    } else {
      await db.destinations.add({
        name,
        distance: input.distance,
        purpose: input.purpose ?? '',
        usageCount: 0,
        lastUsed: Date.now(),
      })
      await evictIfNeeded()
    }
    await load()
  }

  async function remove(id: number) {
    await db.destinations.delete(id)
    await load()
  }

  async function bumpUsage(name: string) {
    const d = list.value.find((x) => x.name === name)
    if (!d || d.id == null) return
    await db.destinations.update(d.id, {
      usageCount: d.usageCount + 1,
      lastUsed: Date.now(),
    })
    await load()
  }

  return { list, isLoading, keyword, suggestions, load, setKeyword, add, remove, bumpUsage }
})