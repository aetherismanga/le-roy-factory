'use strict';
// Build an isolated HTTP function source directory for Google Cloud.
const fs=require('node:fs');
const path=require('node:path');
const dir=process.argv[2];
if(!dir || fs.existsSync(dir)) throw Error('An unused build directory is required.');
fs.mkdirSync(path.join(dir,'data'),{recursive:true});
const root=path.join(__dirname,'..');
for(const file of ['saxso-order.js','saxso-order-core.cjs','saxso-order-pdf.cjs','pro-session.js','pro-client-access.cjs','lrf-analytics-core.js','auth.js','agent-policy.cjs','fenice-request-core.js','data/saxso-order-version.json']){
  fs.copyFileSync(path.join(root,file),path.join(dir,file));
}
fs.writeFileSync(path.join(dir,'index.js'),[
  "const admin=require('firebase-admin');",
  "admin.initializeApp({projectId:'le-roy-factory',storageBucket:'le-roy-factory.firebasestorage.app'});",
  "exports.saxsoOrder=require('./saxso-order').saxsoOrder;",
  ''
].join('\n'));
const pkg=require('../package.json');
const dependencies=Object.fromEntries(['firebase-admin','firebase-functions','nodemailer','pdf-lib'].map(name=>[name,pkg.dependencies[name]]));
fs.writeFileSync(path.join(dir,'package.json'),JSON.stringify({name:'saxso-order',version:'1.0.0',private:true,main:'index.js',engines:pkg.engines,dependencies},null,2));
