import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '@/db/schema'
import type { TripRecord, VehicleType } from '@/types/trip'
import { nowIso, today } from '@/utils/date'

export const useTripStore = defineStore('trip', () => {
  const trips = ref<TripRecord[]>([])
  const deleted = ref<TripRecord[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const saveSuccess = ref(false)

  async function loadTrips() {
    isLoading.value = true
    try {
      const all = await db.trips.orderBy('date').toArray()
      trips.value = all.filter((t) => !t.isDeleted)
      deleted.value = all.filter((t) => t.isDeleted)
      error.value = null
    } catch (e) {
      error.value = `加载行程失败: ${(e as Error).message}`
    } finally {
      isLoading.value = false
    }
  }

  async function addTrip(input: {
    destination: string
    purpose: string
    distance: number
    vehicleType: VehicleType
    date?: string
    rate: number
  }) {
    if (!input.destination.trim()) {
      error.value = '目的地不能为空'
      return
    }
    if (!input.purpose.trim()) {
      error.value = '事由不能为空'
      return
    }
    if (!(input.distance > 0)) {
      error.value = '距离必须大于 0'
      return
    }
    const ts = nowIso()
    const rec: Omit<TripRecord, 'id'> = {
      destination: input.destination.trim(),
      purpose: input.purpose.trim(),
      distance: input.distance,
      amount: input.distance * input.rate,
      date: input.date || today(),
      vehicleType: input.vehicleType,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
      isDeleted: false,
    }
    try {
      await db.trips.add(rec as TripRecord)
      await loadTrips()
      saveSuccess.value = true
      error.value = null
    } catch (e) {
      error.value = `保存行程失败: ${(e as Error).message}`
    }
  }

  async function softDelete(id: number) {
    const rec = await db.trips.get(id)
    if (!rec) return
    await db.trips.update(id, { isDeleted: true, deletedAt: nowIso(), updatedAt: nowIso() })
    await loadTrips()
  }

  async function restore(id: number) {
    await db.trips.update(id, { isDeleted: false, deletedAt: null, updatedAt: nowIso() })
    await loadTrips()
  }

  async function purge(id: number) {
    await db.trips.delete(id)
    await loadTrips()
  }

  function resetSaveSuccess() {
    saveSuccess.value = false
  }

  function clearError() {
    error.value = null
  }

  return {
    trips,
    deleted,
    isLoading,
    error,
    saveSuccess,
    loadTrips,
    addTrip,
    softDelete,
    restore,
    purge,
    resetSaveSuccess,
    clearError,
  }
})
