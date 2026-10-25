import {sanitarySpec} from './sanitaries.js';

// A suspended bowl (including its floor-standing frame) is attached to a
// wall face. It must not use the free floor rotation/offset of an island bath.
export const isWallMountedSanitary=item=>item?.type==='toilet'&&!sanitarySpec(item.settings||{}).floor;
export const isFloorAnchoredSanitary=item=>isWallMountedSanitary(item)&&!!item.settings?.support;

const nichesOn=(room,wall)=>room?.walls?.[wall]?.niches||[];
const mountHeight=item=>Math.max(item.dimensions?.height||0,.98); // bowl and separate flush plate
export function nicheFitsSanitary(item,placement,niche){
 if(!isWallMountedSanitary(item)||item.settings?.support||!niche)return false;
 const half=(item.dimensions?.width||.36)*50,top=placement.height+mountHeight(item)*100;
 return placement.u-half>=niche.u-niche.width/2+.2&&placement.u+half<=niche.u+niche.width/2-.2&&placement.height>=niche.bottom+.2&&top<=niche.bottom+niche.height-.2;
}

export function normalizeSanitaryPlacement(item,placement,room,{chooseNiche=true}={}){
 if(!isWallMountedSanitary(item)||!placement)return placement;
 const result={...placement,offset:0,rotation:0};
 if(item.settings?.support){result.height=0;delete result.nicheId;return result;}
 const list=nichesOn(room,result.wall),prior=list.find(n=>n.id===result.nicheId);
 const niche=prior&&nicheFitsSanitary(item,result,prior)?prior:chooseNiche?list.find(n=>nicheFitsSanitary(item,result,n)):null;
 if(niche){result.nicheId=niche.id;result.offset=-niche.depth;}else delete result.nicheId;
 return result;
}

export function sanitaryMountError(item,placement,room){
 if(!isWallMountedSanitary(item))return '';
 if(Math.abs(placement.rotation||0)>1e-8)return 'Le WC suspendu doit rester orienté face à sa paroi.';
 if(item.settings?.support&&placement.height!==0)return 'Le bâti-support doit reposer au sol.';
 const niche=placement.nicheId&&nichesOn(room,placement.wall).find(n=>n.id===placement.nicheId);
 if(placement.nicheId&&(!niche||!nicheFitsSanitary(item,placement,niche)))return 'Le WC et sa plaque doivent tenir dans la niche choisie.';
 if(Math.abs((placement.offset||0)-(niche?-niche.depth:0))>1e-8)return 'Le WC suspendu doit rester plaqué à sa paroi.';
 return '';
}

// Moving an actual recessed niche moves its attached WC, while resizing or
// deleting that niche cannot silently bury the bowl/plate in solid masonry.
export function remapSanitaryPlacement(item,placement,oldRoom,nextRoom){
 if(!isWallMountedSanitary(item))return placement;
 const id=item.placement?.nicheId;
 if(!id)return normalizeSanitaryPlacement(item,placement,nextRoom);
 const old=nichesOn(oldRoom,item.placement.wall).find(n=>n.id===id),next=nichesOn(nextRoom,placement.wall).find(n=>n.id===id);
 if(!old||!next)return null;
 const moved={...placement,u:item.placement.u+next.u-old.u,height:item.placement.height+next.bottom-old.bottom,nicheId:id};
 if(!nicheFitsSanitary(item,moved,next))return null;
 return normalizeSanitaryPlacement(item,moved,nextRoom,{chooseNiche:false});
}
