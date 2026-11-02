const {onRequest} = require('firebase-functions/v2/https');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {getAgentFromRequest} = require('./auth');
const {createPlanPoseHandler} = require('./plan-pose-access-core.cjs');

let application;
exports.planPoseApplication = onRequest({region: 'us-central1', memory: '256MiB', timeoutSeconds: 30}, createPlanPoseHandler({
  getAgent: getAgentFromRequest,
  loadApplication() {
    if (!application) {
      const document = readFileSync(join(__dirname, 'plan-pose/application.html'), 'utf8');
      application = {
        html: document.match(/<body[^>]*>([\s\S]*?)<noscript>/i)[1],
        source: readFileSync(join(__dirname, 'plan-pose/generated-app.mjs'), 'utf8')
      };
    }
    return application;
  }
}));
