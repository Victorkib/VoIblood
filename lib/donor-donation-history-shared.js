/** Client-safe labels for donation history UI (no DB imports). */

export const COMPONENT_LABELS = {
  whole_blood: 'Whole blood',
  rbc: 'Red blood cells',
  plasma: 'Plasma',
  platelets: 'Platelets',
  cryo: 'Cryoprecipitate',
}

export const ELIGIBILITY_LABELS = {
  eligible: 'Eligible',
  temporarily_deferred: 'Temporarily deferred',
  ineligible: 'Needs follow-up',
  pending: 'Pending review',
}

export const ELIGIBILITY_COLORS = {
  eligible: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  temporarily_deferred: 'bg-amber-100 text-amber-900 border-amber-200',
  ineligible: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
}
