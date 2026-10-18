import type { VehicleType } from './trip'

export interface AppSettings {
  id: number
  electricRate: number
  gasolineRate: number
  defaultVehicleType: VehicleType
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  electricRate: 0.5,
  gasolineRate: 1.0,
  // 专属 App：默认车型固定新能源
  defaultVehicleType: 'ELECTRIC',
}
