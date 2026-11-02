// Keep one canonical application entry in Git; copy it before deployment.
const {copyFileSync} = require('node:fs');
const {resolve} = require('node:path');
copyFileSync(resolve(__dirname, '../../assets/js/lrf-plan-pose/app.mjs'), resolve(__dirname, '../plan-pose/generated-app.mjs'));
console.log('Private PLAN & POSE application prepared.');
