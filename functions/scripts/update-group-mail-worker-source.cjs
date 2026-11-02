'use strict';

// Update only the worker's source. Its existing scheduler job is untouched.
const { GoogleAuth } = require('google-auth-library');

(async () => {
  if (process.env.GOOGLE_CLOUD_PROJECT !== 'le-roy-factory') throw new Error('Unexpected project.');
  const client = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient();
  const base = 'https://cloudfunctions.googleapis.com/v2/';
  const prefix = 'projects/le-roy-factory/locations/us-central1/functions/';
  const { data: sender } = await client.request({ url: base + prefix + 'sendGroupEmail' });
  if (sender.state !== 'ACTIVE' || !sender.buildConfig?.source?.storageSource) throw new Error('The new mail source is not active.');
  const { data: operation } = await client.request({
    url: base + prefix + 'processScheduledEmails?updateMask=buildConfig.source', method: 'PATCH',
    data: { name: prefix + 'processScheduledEmails', buildConfig: { source: sender.buildConfig.source } }
  });
  if (!/^projects\/le-roy-factory\/locations\/us-central1\/operations\//.test(operation.name || '')) throw new Error('Unexpected operation.');
  const deadline = Date.now() + 8 * 60000;
  while (Date.now() < deadline) {
    const { data: current } = await client.request({ url: base + operation.name });
    if (current.error) throw new Error('Worker source update failed: ' + current.error.code);
    if (current.done) { console.log('Scheduled mail worker source updated. No scheduler job or mail payload changed.'); return; }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error('Worker source update still pending.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
