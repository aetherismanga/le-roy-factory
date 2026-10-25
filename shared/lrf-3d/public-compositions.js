import catalogue from './public-compositions.json' with {type:'json'};

const clone=value=>JSON.parse(JSON.stringify(value));
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const templates=freeze(catalogue.compositions);
export const PUBLIC_COMPOSITIONS=Object.freeze(templates.map(({project,...descriptor})=>Object.freeze(descriptor)));
export function publicComposition(id){return PUBLIC_COMPOSITIONS.find(composition=>composition.id===id)||null;}

function sceneEntities(project){
 const entities=[...(project.items||[]),...(project.room.partitions||[]),...(project.room.niches||[])];
 const visit=value=>{if(!value||typeof value!=='object')return;for(const [key,child]of Object.entries(value)){if((key==='zones'||key==='jointProfiles')&&Array.isArray(child))entities.push(...child.filter(item=>item&&typeof item==='object'&&item.id));if(child&&typeof child==='object')visit(child);}};
 visit(project.floor);visit(project.walls);return [...new Set(entities)];
}
function rekey(value,entries){
 if(typeof value==='string'){for(const [before,after]of entries)value=value.replaceAll(before,after);return value;}
 if(Array.isArray(value))return value.map(child=>rekey(child,entries));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>key!=='positionUnlocked').map(([key,child])=>[rekey(key,entries),rekey(child,entries)]));
 return value;
}

// Templates are immutable and are never the user's active/saved project. Every
// preview and every personal copy gets its own independent serializable scene.
export function publicCompositionProject(id,{copy=false,idFactory=()=>crypto.randomUUID()}={}){
 const template=templates.find(composition=>composition.id===id);if(!template)throw Error('Cette composition Le Roy FACTORY est introuvable.');
 let project=clone(template.project);
 if(copy){
  const ids=sceneEntities(project).filter(entity=>entity.id).map(entity=>[entity.id,entity.id.split('-')[0]+'-'+idFactory()]);
  ids.sort((a,b)=>b[0].length-a[0].length);project=rekey(project,ids);project.title='Mon projet · '+(template.variant==='studio-one'?'Studio One':'Catalogue Général');
 }
 project.renovation={...project.renovation,locked:!copy};
 if(project.profiles)project.profiles.editMode=false;
 for(const entity of sceneEntities(project)){entity.locked=!copy;delete entity.positionUnlocked;}
 return project;
}
