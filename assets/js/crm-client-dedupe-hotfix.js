// Compatibility entry point: one conservative audit engine, never two competing
// repair passes using stale snapshots. Keep the old URL for existing pages.
export { ready, repairDuplicates, canonicalId } from './crm-client-integrity.js?v=20261112-auth-ready1';
