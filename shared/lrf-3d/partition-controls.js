// Shared by Randal Studio One, Catalogue Général and the Neobath variant.
// Integration fixes placement only: both faces remain normal editable walls.
export function partitionContextActions(partition,api){
 const integrated=partition.planIntegrated===true,disabled=!!api.locked;
 return [
  {label:'Modifier les dimensions et l’épaisseur',run:api.dimensions},
  {label:integrated?'Modifier l’emplacement':'Valider l’emplacement et intégrer au plan',run:()=>api.update({planIntegrated:!integrated}),disabled},
  {label:'Modifier le revêtement de cette face',run:api.finish},
  {label:'Calepinage de cette face',run:api.layout},
  {label:'Ajouter une niche',run:api.niche,disabled:!!api.readonly},
  {label:'Ajouter une porte',run:api.door,disabled:!!api.readonly},
  {label:'Ajouter une fenêtre',run:api.window,disabled:!!api.readonly},
  {label:'Supprimer la cloison',run:api.remove,disabled,danger:true},
 ];
}

export function renderPartitionControls(parent,api){
 const p=api.partition,integrated=p.planIntegrated===true,locked=!!api.locked;
 const box=document.createElement('section');box.className='partition-context';box.setAttribute('aria-label','Dimensions et emplacement de la cloison');
 const wide=element=>{element.style.gridColumn='1 / -1';box.append(element);return element;};
 const title=document.createElement('strong');title.textContent='Dimensions et emplacement de la cloison';wide(title);
 const status=document.createElement('p');status.className='control-note';status.dataset.partitionStatus='true';status.textContent=integrated?'Intégrée au plan · chaque face se personnalise comme un mur.':'Réglez les dimensions et la position, puis validez l’emplacement.';wide(status);
 const number=(key,label,value,min,max)=>{const field=document.createElement('label');field.textContent=label;const input=document.createElement('input');input.type='number';input.inputMode='decimal';input.step='0.1';input.min=min;input.max=max;input.value=value;input.required=true;input.dataset.partitionDimension=key;input.disabled=locked;field.append(input);box.append(field);return input;};
 const length=number('length','Longueur (cm)',Math.round(Math.hypot(p.b[0]-p.a[0],p.b[1]-p.a[1])*10)/10,20,1000);
 const thickness=number('thickness','Épaisseur (cm)',p.thickness,5,30);
 const field=document.createElement('label');field.textContent='Hauteur';const mode=document.createElement('select');for(const [value,text]of [['full','Toute hauteur · suit la pièce'],['custom','Hauteur au choix']]){const option=document.createElement('option');option.value=value;option.textContent=text;mode.append(option);}mode.value=p.fullHeight?'full':'custom';mode.disabled=locked;field.append(mode);box.append(field);
 const height=number('height','Hauteur (cm)',p.height,30,api.roomHeight);height.oninput=()=>{mode.value='custom';};mode.onchange=()=>{if(mode.value==='full')height.value=api.roomHeight;};
 const x=number('x','Position X sur le plan (cm)',(p.a[0]+p.b[0])/2,-1500,1500),y=number('y','Position Y sur le plan (cm)',(p.a[1]+p.b[1])/2,-1500,1500);x.disabled=y.disabled=locked||integrated;
 const action=(key,label,run,disabled=locked)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.partitionAction=key;button.disabled=disabled;button.onclick=run;box.append(button);return button;};
 const patch=()=>{for(const input of [length,thickness,height,...(!integrated?[x,y]:[])])if(input.reportValidity&&!input.reportValidity())return null;return {length:Number(length.value),thickness:Number(thickness.value),height:Number(height.value),fullHeight:mode.value==='full',...(!integrated?{moveX:Number(x.value)-(p.a[0]+p.b[0])/2,moveY:Number(y.value)-(p.a[1]+p.b[1])/2}:{})};};
 action('apply','Appliquer les dimensions',()=>{const next=patch();if(next)api.update(next);});
 const validate=action('integrate',integrated?'Modifier l’emplacement':'Valider l’emplacement',()=>{const next=integrated?{}:patch();if(next)api.update({...next,planIntegrated:!integrated});});validate.setAttribute('aria-pressed',String(integrated));
 const hint=document.createElement('small');hint.textContent=integrated?'L’emplacement est fixé. Les dimensions, revêtements, ouvertures et niches restent modifiables.':'Maintenez puis glissez la cloison dans la 3D, ou déplacez-la sur le plan.';wide(hint);
 for(const [edge,label]of [['a','Profilé · extrémité A'],['b','Profilé · extrémité B'],['top','Profilé · dessus']]){const field=document.createElement('label');field.textContent=label;const select=document.createElement('select');for(const color of ['none','Argent','Noir','Doré','Bronze']){const option=document.createElement('option');option.value=color;option.textContent=color==='none'?'Sans profilé':color==='Argent'?'Chrome':color;select.append(option);}select.value=p.profileEdges?.[edge]||'none';select.disabled=locked;select.onchange=()=>api.update({profileEdges:{...p.profileEdges,[edge]:select.value}});field.append(select);box.append(field);}
 action('rotate','Tourner de 90°',()=>api.update({rotate:true}),locked||integrated);
 action('niche','Ajouter une niche',api.niche);
 action('plan','Dimensions et position sur le plan',api.plan);
 action('remove','Supprimer la cloison',api.remove);
 const lock=action('lock',locked?'Déverrouiller cette cloison':'Verrouiller cette cloison',api.lock,false);lock.setAttribute('aria-pressed',String(locked));wide(lock);
 parent.append(box);return box;
}
