/**
 * Schedule drive activation outreach after the HTTP response (with dev fallback).
 * @param {string} driveId
 * @param {{ after?: (fn: () => void | Promise<void>) => void }} [context]
 */
export function scheduleDriveActivationOutreach(driveId, context = {}) {
  const runJob = async () => {
    const { runDriveActivationOutreachJob } = await import('@/lib/drive-outreach')
    await runDriveActivationOutreachJob(driveId)
  }

  if (typeof context.after === 'function') {
    context.after(runJob)
    return
  }

  void runJob().catch((err) => {
    console.error('[schedule-outreach] Background job failed:', err)
  })
}
