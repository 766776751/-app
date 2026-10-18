export type VehicleType = 'ELECTRIC' | 'GASOLINE'

export interface TripRecord {
  id: number
  destination: string
  purpose: string
  distance: number
  amount: number
  date: string // YYYY-MM-DD
  vehicleType: VehicleType
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  isDeleted: boolean
}
