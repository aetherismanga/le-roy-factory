const {onRequest} = require('firebase-functions/v2/https');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {getAgentFromRequest} = require('./auth');
const {createNeobathAnimaHandler} = require('./neobath-anima-access-core.cjs');
const {createNeobathProjectStore} = require('./neobath-anima-projects.cjs');
const admin = require('firebase-admin');

let application;
exports.neobathAnimaApplication = onRequest({region: 'us-central1', memory: '256MiB', timeoutSeconds: 30}, createNeobathAnimaHandler({
  getAgent: getAgentFromRequest,
  projectStore: createNeobathProjectStore({db: admin.firestore()}),
  loadApplication() {
    if (!application) {
      const read = name => readFileSync(join(__dirname, 'neobath-anima', name), 'utf8');
      const document = read('application.html');
      application = {
        html: document.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || document,
        css: read('style.css'),
        module: read('app.js'),
        catalogue: JSON.parse(read('catalogue.json'))
      };
    }
    return application;
  }
}));
