'use strict';
const AGENT_EMAILS = new Set(['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr']);
// Firebase custom claim set only by a trusted administrator, bound to this UID.
function verifiedAgentClaims(claims) {
  const uid = claims?.uid || claims?.sub;
  return typeof uid === 'string' && uid.length > 0 && claims.email_verified === true
    && claims.lrfAgentUid === uid
    && AGENT_EMAILS.has(String(claims.email || '').trim().toLowerCase());
}
module.exports = {AGENT_EMAILS, verifiedAgentClaims};
