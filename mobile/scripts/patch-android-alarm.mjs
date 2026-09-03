import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const mobileRoot=resolve(here,'..');
const manifestPath=join(mobileRoot,'android','app','src','main','AndroidManifest.xml');

let manifest=await readFile(manifestPath,'utf8');
const permissions=[
  'android.permission.SCHEDULE_EXACT_ALARM',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.VIBRATE'
];
for(const permission of permissions){
  if(!manifest.includes(permission)){
    manifest=manifest.replace(/<manifest([^>]*)>/,`<manifest$1>\n    <uses-permission android:name="${permission}" />`);
  }
}
await writeFile(manifestPath,manifest,'utf8');
console.log('Permissions Android : alarme exacte, notifications et vibration activées');
