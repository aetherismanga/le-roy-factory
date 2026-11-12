const names = new Map([['jerome@leroyfactory.fr', 'Jérôme Hugol'], ['coryne@leroyfactory.fr', 'Coryne']]);
const verified = new WeakMap();
export function cachedAgentProfile(user) {
  const cached = user && verified.get(user);
  if (!user?.emailVerified || !cached || cached.expiresAt <= Date.now()) return null;
  return cached.profile;
}
export async function verifiedAgentProfile(user, forceRefresh = false) {
  if (!user?.emailVerified || !names.has(String(user.email || '').trim().toLowerCase())) return null;
  try {
    const token = await user.getIdTokenResult(forceRefresh), claims = token.claims;
    if (claims.email_verified !== true || claims.lrfAgentUid !== user.uid) {
      verified.delete(user); return null;
    }
    const email = String(user.email).trim().toLowerCase();
    const profile = {uid:user.uid, email, name:names.get(email)};
    verified.set(user, {profile, expiresAt:Date.parse(token.expirationTime)});
    return profile;
  } catch { verified.delete(user); return null; }
}
