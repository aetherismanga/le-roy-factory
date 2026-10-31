// Read-only extraction of the same public VIEW sources as Selections.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function loadCatalogue(){
 const window={dispatchEvent(){},addEventListener(){}},document={readyState:'loading',addEventListener(){},querySelector(){return null},querySelectorAll(){return []},getElementById(){return null},createElement(){return {dataset:{},style:{},setAttribute(){},addEventListener(){}}},head:{appendChild(){}}};
 const context=vm.createContext({window,document,console:{log(){},warn(){},error(){}},setTimeout(){},setInterval(){},clearInterval(){},CustomEvent:class{},MutationObserver:class{observe(){}},URL,URLSearchParams});
 const files=['assets/js/inspirations-view-data.js','assets/js/inspirations-view-elios-parity.js','assets/js/inspirations-view-data-lot2.js','assets/js/inspirations-view-data-lot3.js','assets/js/inspirations-view-selection-media.js'];
 for(const file of files)vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file,timeout:3000});
 return {window,files};
}
module.exports={loadCatalogue,root};
if(require.main===module){const {window:w}=loadCatalogue();console.log(JSON.stringify(w.VIEW_CATALOGUE.map(p=>({slug:p.slug,name:p.name,description:p.description,effect:p.effect,formats:p.formats,finishes:p.finishes,source:p.sourceUrl,images:w.VIEW_SELECTION_MEDIA.galleries[p.slug]?.length,catalogues:w.VIEW_SELECTION_MEDIA.catalogues[p.slug]?.map(x=>({name:x.title,url:x.originalUrl||x.sourceUrl||x.url}))})),null,2));}
