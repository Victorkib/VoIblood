/**
 * Client helper to download a report from /api/reports/export.
 */

export async function downloadReport({
  organizationId,
  reportType,
  format = 'csv',
  startDate,
  endDate,
  layout,
  scope,
  filenamePrefix,
}) {
  if (!organizationId) {
    throw new Error('No organization selected. Choose an organization context and try again.')
  }

  const params = new URLSearchParams({
    organizationId,
    reportType,
    format,
  })

  const allTimeReports = ['donor_donations']
  if (!allTimeReports.includes(reportType)) {
    params.set(
      'startDate',
      startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    )
    params.set('endDate', endDate || new Date().toISOString().split('T')[0])
  } else {
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (layout) params.set('layout', layout)
    if (scope) params.set('scope', scope)
  }

  const response = await fetch(`/api/reports/export?${params}`)

  if (!response.ok) {
    let message = 'Failed to generate report'
    try {
      const errData = await response.json()
      message = errData.message || message
    } catch {
      // non-JSON error body
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const extension = format === 'pdf' ? 'pdf' : format === 'xlsx' ? 'xlsx' : 'csv'
  const prefix = filenamePrefix || `report-${reportType}`
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${prefix}-${new Date().toISOString().split('T')[0]}.${extension}`
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}
