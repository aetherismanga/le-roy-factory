const {onRequest} = require('firebase-functions/v2/https');
const {join} = require('node:path');
const {getAgentFromRequest} = require('./auth');
const {createNeobathAnimaHandler, createStudioApplicationLoader, readStudioAsset} = require('./neobath-anima-access-core.cjs');
const {createNeobathProjectStore} = require('./neobath-anima-projects.cjs');
const admin = require('firebase-admin');
exports.neobathAnimaApplication = onRequest({region: 'us-central1', memory: '512MiB', timeoutSeconds: 90, secrets: ['SMTP_PASSWORD_JEROME']}, createNeobathAnimaHandler({
  releaseId: require('./neobath-anima/studio-dist/release.json').id,
  getAgent: getAgentFromRequest,
  ...require('./neobath-anima-commerce.cjs'),
  projectStore: createNeobathProjectStore({db: admin.firestore()}),
  loadApplication: createStudioApplicationLoader({readAsset: name => readStudioAsset(join(__dirname, 'neobath-anima/studio-dist'), name)})
}));
