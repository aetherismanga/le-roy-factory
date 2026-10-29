import {Reflector} from 'three/addons/objects/Reflector.js';
import {withoutEditorGuides} from './niche-guides.js';

export function makeMirrorReflector(geometry,options={}){
 const mirror=new Reflector(geometry,{...options,color:0xffffff});
 // The render target contains linear scene colours. Apply the renderer's
 // output transform once, without an overlay tint or brightness multiplier.
 mirror.material.fragmentShader=mirror.material.fragmentShader.replace('gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );','gl_FragColor = vec4( base.rgb, 1.0 );');
 return mirror;
}

export function captureMirrorScene({room,items=[],profiles,reflector},capture){
 const visibility=new Map(),show=(object,value)=>{if(!object)return;if(!visibility.has(object))visibility.set(object,object.visible);object.visible=value;};
 // A wall hidden to see into the room can still be in front of the mirror's
 // virtual camera. Capture the complete room, then restore the user's view.
 for(const wall of room?.walls||[])show(wall.group,true);
 for(const item of items){if(['window','door'].includes(item.type))show(item.root,true);if(item.asset.reflector)show(item.asset.reflector,item.asset.reflector===reflector);}
 for(const profile of profiles?.children||[])show(profile,true);
 try{return withoutEditorGuides(room?.root,capture);}finally{for(const [object,visible]of visibility)object.visible=visible;}
}
