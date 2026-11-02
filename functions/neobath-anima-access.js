const {onRequest} = require('firebase-functions/v2/https');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const {getAgentFromRequest} = require('./auth');
const {createNeobathAnimaHandler} = require('./neobath-anima-access-core.cjs');
const {createNeobathProjectStore} = require('./neobath-anima-projects.cjs');
const admin = require('firebase-admin');
const {createHash} = require('node:crypto');

let application;
exports.neobathAnimaApplication = onRequest({region: 'us-central1', memory: '256MiB', timeoutSeconds: 30}, createNeobathAnimaHandler({
  getAgent: getAgentFromRequest,
  projectStore: createNeobathProjectStore({db: admin.firestore()}),
  loadApplication() {
    if (!application) {
      const read = name => readFileSync(join(__dirname, 'neobath-anima', name), 'utf8');
      const release = JSON.parse(read('release.json'));
      const assets = {};
      for (const file of ['app.js','application.html','style.css','catalogue.json']) {
        assets[file] = read(file);
        if (createHash('sha256').update(assets[file]).digest('hex') !== release.assets[file]) throw Error('Private release integrity mismatch');
      }
      const document = assets['application.html'];
      application = {
        release: {id: release.id, appSha256: release.assets['app.js']},
        html: document.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || document,
        css: assets['style.css'],
        module: assets['app.js'],
        catalogue: JSON.parse(assets['catalogue.json'])
      };
    }
    return application;
  }
}));
