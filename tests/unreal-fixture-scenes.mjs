import * as T from 'three';
import {makeRoom,roomPreset} from '../shared/lrf-3d/room.js';
import {makeFixture,setBathData} from '../studio-one/src/fixtures.js';
import {makeEquipment} from '../shared/lrf-3d/equipment.js';
export {setBathData};
export const cases={
 'bath-rect':{label:'Baignoire rectangulaire',shape:'rect',bath:'rect'},
 'bath-round':{label:'Baignoire arrondie',shape:'rect',bath:'round'},
 'bath-island':{label:'Baignoire îlot',shape:'rect',bath:'island'},
 'shower-fixed':{label:'Douche et paroi fixe',shape:'rect',screen:'fixed'},
 'shower-return':{label:'Douche et retour vitré',shape:'rect',screen:'return'},
 'shower-tile':{label:'Receveur carrelé surélevé',shape:'rect',screen:'return',tile:true},
 'room-l':{label:'Pièce en L',shape:'l',bath:'rect',screen:'fixed'},
 'room-chamfer':{label:'Pièce avec angle coupé',shape:'chamfer',bath:'island',screen:'return'},
 'room-narrow':{label:'Pièce longue et étroite',shape:'rect',width:240,depth:650,screen:'fixed'},
 'room-partition':{label:'Pièce en L avec cloison',shape:'l',bath:'round',screen:'fixed',partition:true}
};
export function buildFixtureScene(id){
 const spec=cases[id];if(!spec)throw Error('Unknown fixture case');
 const config=roomPreset(spec.shape,spec.width||550,spec.depth||500);if(spec.partition)config.partitions=[{id:'controle',a:[80,220],b:[230,220],thickness:12,height:220}];
 const room=makeRoom(config,0),scene=new T.Scene();scene.background=new T.Color('#e8e5dc');scene.add(room.root);
 for(const s of [room.floor,...room.walls]){s.paint.visible=true;s.tiles.visible=false;s.grout.material.color.set('#c8bfae');s.paint.material.color.set(s===room.floor?'#b6b0a4':'#ded7c9');s.paint.material.roughness=.8;}
 if(spec.bath){const b=makeFixture('bath',{kind:spec.bath,width:170,depth:75,apron:'white',metal:'Chrome brillant'});b.root.position.x=spec.screen?-1.25:0;scene.add(b.root);const tap=makeEquipment('tap',{use:'bath',metal:'Chrome brillant'});tap.root.position.set(b.root.position.x,.7,0);scene.add(tap.root);}
 if(spec.screen){const tray=makeFixture('shower',{width:120,depth:100,trayColor:'grey',...(spec.tile?{trayType:'tile',trayInstallation:'raised',trayHeight:15}:{})});tray.root.position.x=spec.bath?1.3:0;scene.add(tray.root);const panel=makeEquipment('screen',{width:100,screen:spec.screen,metal:'Chrome brillant'});panel.root.rotation.y=Math.PI;panel.root.position.set(tray.root.position.x,spec.tile?.15:.035,.54);scene.add(panel.root);}
 const roles={},lights=[];for(const role of ['key','fill','rim']){const l=new T.RectAreaLight(0xffffff,1,3,2);l.position.set(0,2.5,2);l.lookAt(0,0,0);roles[l.uuid]=role;lights.push(l);scene.add(l);}
 const sky=new T.HemisphereLight(0xffffff,0x88847c,2);scene.add(sky);
 scene.updateMatrixWorld(true);
 return {scene,room,config,roles,lights,label:spec.label};
}
