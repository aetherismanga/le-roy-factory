// Duplicate repair used to run on every visit and merge/archive real clients.
// Keep this compatibility module read-only. Creation is guarded by the central
// save service; historical duplicate resolution requires an explicit review.
export const automaticDuplicateRepairEnabled = false;

