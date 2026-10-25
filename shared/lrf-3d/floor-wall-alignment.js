import {Vector3} from 'three';

const near=(a,b)=>Math.abs(a-b)<1e-6;
const unavailable=reason=>({allowed:false,reason});

// Align only the floor's joint phase along the chosen wall. The wall is never
// modified, and the perpendicular floor origin is retained. Work in the real
// surface transforms so opposite walls and partition faces keep their phase.
export function floorWallAlignment({floorLayout,wallLayout,floorFormat,wallFormat,floorGroup,wallGroup,wallTiled=true}){
 if(!wallTiled||!wallFormat)return unavailable('Choisissez un mur carrelé.');
 if(!floorFormat||![floorFormat.width,floorFormat.height,wallFormat.width,wallFormat.height].every(n=>Number.isFinite(n)&&n>0))return unavailable('Choisissez un format de carrelage disponible.');
 if(!near(floorFormat.width,wallFormat.width)||!near(floorFormat.height,wallFormat.height))return unavailable('Le sol et ce mur doivent utiliser le même format de carreau.');
 const f=floorLayout||{},w=wallLayout||{};
 if([f,w].some(l=>(l.shape&&l.shape!=='rectangle')||(l.pattern&&l.pattern!=='straight')))return unavailable('L’alignement des joints nécessite une pose droite sur le sol et le mur.');
 if(!near(Number(f.groutWidth)||2,Number(w.groutWidth)||2))return unavailable('Utilisez la même largeur de joint sur le sol et ce mur.');
 if(!floorGroup||!wallGroup)return unavailable('La surface choisie n’est plus disponible.');
 floorGroup.updateWorldMatrix(true,false);wallGroup.updateWorldMatrix(true,false);
 const origin=floorGroup.worldToLocal(wallGroup.localToWorld(new Vector3(0,0,0)));
 const along=floorGroup.worldToLocal(wallGroup.localToWorld(new Vector3(1,0,0))).sub(origin);
 const axis=Math.abs(along.y)<1e-6&&near(Math.abs(along.x),1)?'x':Math.abs(along.x)<1e-6&&near(Math.abs(along.y),1)?'y':null;
 if(!axis)return unavailable('Ce mur est en biais par rapport au calepinage du sol.');
 const floorPitch=axis==='x'?(f.direction==='vertical'?floorFormat.height:floorFormat.width):(f.direction==='vertical'?floorFormat.width:floorFormat.height);
 const wallPitch=w.direction==='vertical'?wallFormat.height:wallFormat.width;
 if(!near(floorPitch,wallPitch))return unavailable('Tournez le sens de pose du sol pour faire correspondre ses joints à ceux de ce mur.');
 const seam=floorGroup.worldToLocal(wallGroup.localToWorld(new Vector3((Number(w.x)||0)/100,0,0)));
 const sign=axis==='y'&&f.planAxes?-1:1,current=(Number(f[axis])||0)/100*sign;
 const physical=seam[axis]+Math.round((current-seam[axis])/floorPitch)*floorPitch;
 const value=Math.round(physical*sign*1e8)/1e6;
 if(value < -1000||value > 1000)return unavailable('Le départ requis dépasse la plage de réglage du sol.');
 return {allowed:true,reason:'Les joints du sol peuvent suivre ceux de ce mur.',axis,layout:{...f,[axis]:value},pitch:floorPitch};
}

export function calepinagePanelCSS(){return `
 #viewer.calepinage-open #object-editor{display:none!important}
 .calepinage-panel{position:absolute;inset:76px 12px auto auto;z-index:46;width:340px;max-width:calc(100% - 24px);max-height:calc(100% - 88px);box-sizing:border-box;overflow:auto;overscroll-behavior:contain;padding:16px;border:1px solid #cdd1c4;border-radius:12px;background:#fffdf7;color:#2b3c32;box-shadow:0 8px 26px #19352b22}
 .calepinage-panel .calepinage-heading{position:sticky;top:-16px;display:flex;justify-content:space-between;align-items:center;gap:8px;background:#fffdf7;padding:8px 0;z-index:2}
 .calepinage-panel .calepinage-minimize{display:none}
 .calepinage-panel h2{font:22px/1.2 Georgia,serif;margin:0}
 .calepinage-panel .renovation-fields{gap:10px}
 .calepinage-panel label{display:grid;gap:5px;min-width:0;font:12px/1.4 Arial,sans-serif}
 .calepinage-panel input,.calepinage-panel select{font:12px Arial,sans-serif;min-height:40px;width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccd2c3;border-radius:7px;background:#fff;color:#29483e}
 .calepinage-panel button{font:12px Arial,sans-serif;min-height:40px;padding:8px 10px;border:1px solid #cdd1c4;border-radius:7px;background:#faf9f2;color:#29483e;cursor:pointer}
 .calepinage-panel button:disabled{opacity:.6;cursor:default}
 .calepinage-panel p,.calepinage-panel summary{font:12px/1.45 Arial,sans-serif;margin:8px 0}
 .calepinage-panel details{margin-top:12px;border-top:1px solid #d9dccf;padding-top:6px}
 .calepinage-panel summary{cursor:pointer;min-height:28px}
 .calepinage-panel .renovation-actions{gap:6px;margin:10px 0}
 .calepinage-panel .renovation-status{min-height:0;color:#6c7469}
 .calepinage-panel .calepinage-alignment{border-top:1px solid #d9dccf;margin-top:14px;padding-top:10px}
 .calepinage-panel .calepinage-heading button{font-size:18px;min-width:38px;flex-shrink:0}
 #settings.layout-editor-open>:not(#calepinage-editor){display:none!important}
 #settings.context-open>#calepinage-editor{display:block!important}
 #settings .calepinage-panel.calepinage-docked{position:static;inset:auto;width:100%;max-width:none;max-height:none;padding:0;border:0;border-radius:0;box-shadow:none;overflow:visible}
 @media(max-width:760px){.calepinage-panel .calepinage-minimize{display:inline-block;font-size:12px;min-width:64px}.calepinage-panel.calepinage-minimized>:not(.calepinage-heading){display:none}.calepinage-panel{inset:auto 8px 8px;max-width:calc(100% - 16px);width:auto;max-height:48%;padding:12px}.calepinage-panel .calepinage-heading{top:-12px}.calepinage-panel h2{font-size:20px}.calepinage-panel input,.calepinage-panel select,.calepinage-panel button{min-height:42px}}
 `;}
