export interface Supplement {
  id: string
  name: string
  dosage: string | null
  frequency: string | null
  timing: string | null
  category: string | null
  notes: string | null
  is_active: boolean
}

export interface HormoneProtocol {
  id: string
  name: string
  substance: string
  dosage: string | null
  day_of_week: string[] | null
  time_of_day: string | null
  notes: string | null
  is_active: boolean
}

export interface LabMarker {
  id: string
  marker_name: string
  test_date: string
  value: number
  unit: string
  reference_low: number | null
  reference_high: number | null
  is_optimal: boolean | null
  notes: string | null
}

export interface Workout {
  id: string
  workout_date: string | null
  date: string | null
  workout_type: string | null
  type: string | null
  duration_minutes: number | null
  duration_mins: number | null
  notes: string | null
  completed: boolean | null
}

export interface BodyMetric {
  id: string
  metric_date: string
  weight_lbs: number | null
  body_fat_pct: number | null
  muscle_mass_lbs: number | null
  sleep_hours: number | null
  energy_level: number | null
  notes: string | null
}

export interface ProtocolCompliance {
  id: string
  user_id: string
  protocol_id: string
  completed_date: string
  injection_site: string | null
  notes: string | null
}

export interface SkinCareStep {
  id: string
  user_id: string
  step_name: string
  product_name: string | null
  product_brand: string | null
  time_of_day: 'am' | 'pm' | 'both'
  frequency: string
  day_of_week: string[] | null
  step_order: number
  category: string | null
  purchased_date: string | null
  est_replacement_date: string | null
  notes: string | null
  is_active: boolean
}

export interface HealthData {
  supplements: Supplement[]
  protocols: HormoneProtocol[]
  labMarkers: LabMarker[]
  workouts: Workout[]
  bodyMetrics: BodyMetric[]
  compliance: ProtocolCompliance[]
  skincare: SkinCareStep[]
}
