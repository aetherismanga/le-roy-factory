import {AQUAHOME} from '../../../shared/lrf-3d/aquahome-catalog.js';
import {drawerDescription} from '../../../shared/lrf-3d/drawer-options.js';
import {quoteProject} from './pricing.js';

export function furnitureOrderRows(project) {
 const {rows,excluded}=quoteProject(project);
 if(!rows.length)return [];
 const items=new Map(project.items.map(item=>[item.id,item]));
 return [
  ...rows.map(row=>{
   const item=items.get(row.itemId);
   const hinge=item?.type==='column'?(item.settings.hingeSide==='right'?'Charnières à droite':'Charnières à gauche'):'';
   return {
    quantity:1,
    name:row.name,
    reference:row.ref,
    details:[row.detail+drawerDescription(project,rows,row),hinge,row.note].filter(Boolean).join(' · ')
   };
  }),
  ...excluded.filter(row=>row.reference&&row.reference!=='none').map(row=>{
   const tap=AQUAHOME.find(item=>item.reference===row.reference);
   return {
    quantity:1,
    name:tap?[tap.name,tap.collection].filter(Boolean).join(' · '):'Robinetterie',
    reference:row.reference,
    details:[tap?.finish,'AQUA HOME · hors chiffrage du mobilier RANDAL'].filter(Boolean).join(' · ')
   };
  })
 ];
}
