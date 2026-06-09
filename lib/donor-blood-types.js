export const DONOR_BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'unknown']

export const CONFIRMED_BLOOD_TYPES = DONOR_BLOOD_TYPES.filter((t) => t !== 'unknown')

export const BLOOD_TYPE_UNKNOWN = 'unknown'

export function normalizeDonorBloodType(value, fallback = BLOOD_TYPE_UNKNOWN) {
  if (!value) return fallback
  const normalized = String(value).trim()
  return DONOR_BLOOD_TYPES.includes(normalized) ? normalized : fallback
}

export function formatBloodTypeLabel(bloodType) {
  if (!bloodType || bloodType === BLOOD_TYPE_UNKNOWN) {
    return 'Unknown (confirm at screening)'
  }
  return bloodType
}

export function isConfirmedBloodType(bloodType) {
  return CONFIRMED_BLOOD_TYPES.includes(bloodType)
}
