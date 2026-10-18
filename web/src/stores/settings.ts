import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ensureSettings, db } from '@/db/schema'
import type { AppSettings } from '@/types/settings'
import type { VehicleType } from '@/types/trip'
import { DEFAULT_SETTINGS } from '@/types/settings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const message = ref<string | null>(null)

  async function load() {
    settings.value = await ensureSettings()
  }

  async function setRate(vehicle: VehicleType, rate: number) {
    const patch =
      vehicle === 'ELECTRIC' ? { electricRate: rate } : { gasolineRate: rate }
    await db.settings.update(1, patch)
    settings.value = { ...settings.value, ...patch }
    message.value = '费率已更新'
  }

  async function setDefaultVehicle(vehicleType: VehicleType) {
    const patch = { defaultVehicleType: vehicleType } as const
    await db.settings.update(1, patch)
    settings.value = { ...settings.value, defaultVehicleType: vehicleType }
    message.value = '默认车型已更新'
  }

  function clearMessage() {
    message.value = null
  }

  return { settings, message, load, setRate, setDefaultVehicle, clearMessage }
})
