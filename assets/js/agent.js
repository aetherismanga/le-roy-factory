// Legacy entry point retained for old cached pages. Authentication is handled
// exclusively by Firebase Auth in agent.html; no client-side credential list.
if (document.querySelector('#login-form')) {
  const target = new URL('agent.html', location.href);
  if (location.pathname.split('/').pop() !== 'agent.html') location.replace(target.href);
}
