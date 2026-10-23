// Compatibility entry point for older CRM modules. Client identity is now set
// by clients.html from the Firestore document ID; no name inference, alias
// mirroring, merges, archival, or delayed writes are performed on page load.
export const ready = Promise.resolve();
