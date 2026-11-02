// Keep account changes and in-flight authorization separate from rendering.
// No persisted browser flag is used as evidence of an authenticated agent.
export function isAnimaAgent(user) {
  return !!user?.uid && ['jerome@leroyfactory.fr', 'coryne@leroyfactory.fr'].includes(String(user.email || '').trim().toLowerCase());
}

export function createAnimaSession({request, mount, unmount, status}) {
  let generation = 0;
  let mountedIdentity = '';
  function close() {
    mountedIdentity = '';
    unmount();
  }
  return async function refresh(user) {
    const current = ++generation;
    const identity = isAnimaAgent(user) ? user.uid + ':' + user.email.toLowerCase() : '';
    if (!identity || (mountedIdentity && mountedIdentity !== identity)) close();
    if (!identity) {status('Connectez-vous avec votre compte agent pour accéder à cet atelier privé.'); return;}
    status(mountedIdentity ? '' : 'Ouverture de votre atelier privé…');
    try {
      const application = await request(user);
      if (current !== generation) return;
      if (!application?.success) throw Error('Accès refusé');
      if (mountedIdentity === identity) {status(''); return;}
      // Mount is synchronous: a sign-out cannot interleave with app insertion.
      mount(application);
      mountedIdentity = identity;
      status('');
    } catch (error) {
      if (current !== generation) return;
      close();
      status(error?.message || 'Ouverture impossible. Reconnectez-vous puis réessayez.');
    }
  };
}
