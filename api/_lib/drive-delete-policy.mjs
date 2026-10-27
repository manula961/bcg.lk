/**
 * Explicit owner-only opt-in for destructive Drive cleanup.
 * The reference scan cannot prove an ID was never embedded in older static
 * pages, media manifests or historical revisions. Keep deletion disabled
 * until a separately reviewed media inventory and retention decision.
 */
export function assertManagedMediaDeletionApproved(env = process.env) {
  if (env.BCG_ALLOW_MANAGED_DRIVE_DELETE !== '1') {
    throw Object.assign(new Error(
      'Managed media deletion is disabled until a full inventory is reviewed.'
    ), { status: 403 });
  }
}
