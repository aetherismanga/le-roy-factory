// The same accessible control changes either the current layout or the basin family.
export function mountBasinPlacement(parent,settings,{onModel,onLayout,id,layouts,alternatives,money}){
 const doc=parent.ownerDocument||globalThis.document,label=doc.createElement('label'),select=doc.createElement('select');
 if(!layouts.length&&!alternatives.length)return;
 label.textContent='Implantation de la vasque';select.setAttribute('aria-label','Implantation de la vasque');select.dataset.basinLayout='true';if(id)select.id=id;
 function option(group,value,name){const o=doc.createElement('option');o.value=value;o.textContent=name;group.append(o);}
 const positions=doc.createElement('optgroup');positions.label='Placement de la vasque';
 for(const o of layouts)option(positions,o.layout,o.name+(o.ref?' · réf. '+o.ref:'')+(Number.isInteger(o.ttc)?' · '+money(o.ttc):''));
 if(layouts.length)select.append(positions);else option(select,'','Choisir une vasque');
 if(alternatives.length){
  const models=doc.createElement('optgroup');models.label='Changer de vasque';
  for(const o of alternatives)option(models,'top:'+o.id,o.name+(Number.isInteger(o.price)?' · '+money(o.price):''));
  select.append(models);
 }
 select.value=layouts.some(o=>o.layout===settings.basinLayout)?settings.basinLayout:layouts[0]?.layout||'';
 select.onchange=()=>select.value.startsWith('top:')?onModel(select.value.slice(4)):onLayout(select.value);
 label.append(select);parent.append(label);return select;
}
