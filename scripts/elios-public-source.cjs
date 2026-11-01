// Read the same public collection/media sources as Selections. No API or DOM runs.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function loadCatalogue(){
 const window={},document={readyState:'loading',addEventListener(){},querySelector(){return null},querySelectorAll(){return []},getElementById(){return null},createElement(){return {dataset:{},style:{},setAttribute(){},addEventListener(){}}},head:{appendChild(){}}};
 const context=vm.createContext({window,document,console:{log(){},warn(){},error(){}},setTimeout(){},setInterval(){},clearInterval(){},MutationObserver:class{observe(){}},URL,URLSearchParams});
 const files=[...Array.from({length:11},(_,i)=>`assets/js/elios-images/elios-images-${i+1}.js`),'assets/js/inspirations-elios-hd-remote.js','assets/js/inspirations-elios-data.js','assets/js/inspirations-elios-thickness-overrides.js','assets/js/inspirations-elios-cersaie-2026.js','assets/js/inspirations-elios-pricing.js',...['','-2','-3','-4','-5','-6'].map(n=>`assets/js/inspirations-elios-official-galleries${n}.js`),'assets/js/inspirations-elios-fix-bavaria-dolomiti-harmony.js','assets/js/inspirations-elios-pass1-hd.js','assets/js/inspirations-elios-lot1-hd.js','assets/js/inspirations-elios-montreal-hd.js','assets/js/inspirations-elios-slate-hd.js','assets/js/inspirations-elios-azuli-hd.js','assets/js/inspirations-elios-dust-hd.js','assets/js/inspirations-elios-selection-media.js'];
 const colorMedia='assets/js/inspirations-elios-color-media-20261101.js';
 if(fs.existsSync(path.join(root,colorMedia)))files.push(colorMedia);
 for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file,timeout:3000});
 return {window,files};
}
module.exports={loadCatalogue,root};
if(require.main===module){const {window:w}=loadCatalogue();console.log(JSON.stringify({collections:w.ELIOS_CATALOGUE.map(p=>({slug:p.slug,name:p.name,formats:p.formats})),mediaKeys:Object.keys(w.ELIOS_SELECTION_MEDIA||{}),officialGalleryCount:Object.keys(w.ELIOS_OFFICIAL_GALLERIES||{}).length}));}
