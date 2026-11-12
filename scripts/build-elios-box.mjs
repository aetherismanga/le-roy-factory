import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
export async function buildEliosBox(root=resolve('.')){
 const transform=(source,from,to)=>{if(!source.includes(from))throw Error('ELIOS Studio One adapter contract changed: '+from.slice(0,80));return source.replace(from,to);};
 await build({absWorkingDir:root,entryPoints:['studio-one/src/app.js'],bundle:true,format:'esm',target:['es2020'],minify:true,outfile:'studio-one/dist/elios-box.js',legalComments:'eof',plugins:[{name:'elios-box-native-studio',setup(b){
  b.onLoad({filter:/studio-one\/src\/app\.js$/},args=>{let source=readFileSync(args.path,'utf8');source="import {mountEliosBox} from '../elios-box/box.js';\nlet eliosController=null;\n"+source;
   source=transform(source,'mountRandalWorkshopAccess(createAccessIdentity);','');
   source=transform(source,'refreshCommerce=mountCommerce(collectProject);','refreshCommerce=()=>eliosController?.changed();');
   source=transform(source,'  initializeWorkspace();','  projectWorkspace={locked:false,checkpoint(){},save(){return eliosController?.save();},download(){return document.querySelector("#elios-box-save")?.click();},showProjects(){document.querySelector("#elios-box-save")?.click();}};');
   source=transform(source,'  const photoRoute=new URL(location.href);','  eliosController=mountEliosBox(window.studioOnePrototype);\n  const photoRoute=new URL(location.href);');
   return {contents:source,loader:'js'};
  });
  b.onLoad({filter:/shared\/lrf-3d\/demo-session\.js$/},args=>{let source=readFileSync(args.path,'utf8');source=transform(source,"export const localStorage=scopedDemoStorage(browserStorage('localStorage'));","export const localStorage=scopedDemoStorage(browserStorage('localStorage'),{demo:true,prefix:'lrf-elios-box-v1:'});");return {contents:source,loader:'js'};});
 } }]});
 let html=readFileSync(resolve(root,'studio-one/src/atelier.html'),'utf8').replace('<title>STUDIO ONE — Atelier 3D</title>','<title>ELIOS — Box expo 3D</title>').replace(/src="app\.js(?:\?v=[^"]*)?"/,'src="elios-box.js?v='+createHash('sha256').update(readFileSync(resolve(root,'studio-one/dist/elios-box.js'))).digest('hex').slice(0,12)+'"');
 html=html.replace(/<a aria-label="STUDIO ONE" class="brand" href="#">.*?<\/a>/s,'<a aria-label="ELIOS · LE ROY FACTORY" class="brand" href="https://leroyfactory.fr/echantillons-elios.html"><img class="elios-lrf-logo" src="assets/showroom/lrf-logo.png" alt="LE ROY FACTORY"><span>ELIOS<br><small>BOX EXPO</small></span></a>').replace('ATELIER SALLE DE BAIN','VOTRE BOX D’EXPOSITION').replace('value="Ma salle de bain"','value="Mon box expo Elios"').replace('UN PROTOTYPE INDÉPENDANT','ELIOS · ATELIER EXPOSITION').replace('Vue interactive du meuble en trois dimensions','Vue interactive du box expo en trois dimensions');
 const css=readFileSync(resolve(root,'studio-one/elios-box/box.css'),'utf8');html=html.replace('</head>','<style>'+css+'</style></head>');
 // The native DOM is retained so all geometry, tile, rug, column and profile
 // controls keep their stable IDs and bindings.
 writeFileSync(resolve(root,'studio-one/dist/elios-box.html'),html);
 console.log('ELIOS box: native Studio One variant built; catalogue and storage isolated.');
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname)await buildEliosBox();
