import * as T from 'three';

// The reflected visitor and the direct view share one skeleton. The direct
// draw contains only arm triangles: there is no hidden head or torso to clip
// into the camera, and the palm remains exactly on the reflected grip point.
function armGeometry(source,side){
 const input=source.geometry,skin=input.getAttribute('skinIndex'),weights=input.getAttribute('skinWeight');
 if(!source.isSkinnedMesh||!skin||!weights||!input.getAttribute('position'))return null;
 const allowed=new Set(source.skeleton.bones.map((bone,index)=>new RegExp('^Bip01_'+side+'_(UpperArm|Forearm|Hand|Finger)').test(bone.name)?index:-1).filter(index=>index>=0));
 const belongs=index=>{let total=0;for(let j=0;j<skin.itemSize;j++)if(allowed.has(skin.getComponent(index,j)))total+=weights.getComponent(index,j);return total>=.5;};
 const index=input.index,count=index?index.count:input.getAttribute('position').count,triangles=[],vertices=[],mapping=new Map();
 for(let i=0;i<count;i+=3){const tri=[0,1,2].map(j=>index?index.getX(i+j):i+j);if(!tri.every(belongs))continue;
  for(const original of tri){if(!mapping.has(original)){mapping.set(original,vertices.length);vertices.push(original);}triangles.push(mapping.get(original));}
 }
 if(!triangles.length)return null;
 const copy=attribute=>{const array=new attribute.array.constructor(vertices.length*attribute.itemSize);for(let i=0;i<vertices.length;i++)for(let j=0;j<attribute.itemSize;j++)array[i*attribute.itemSize+j]=attribute.isInterleavedBufferAttribute?attribute.data.array[vertices[i]*attribute.data.stride+attribute.offset+j]:attribute.array[vertices[i]*attribute.itemSize+j];return new T.BufferAttribute(array,attribute.itemSize,attribute.normalized);};
 const geometry=new T.BufferGeometry();for(const [name,attribute]of Object.entries(input.attributes))geometry.setAttribute(name,copy(attribute));
 for(const [name,attributes]of Object.entries(input.morphAttributes))geometry.morphAttributes[name]=attributes.map(copy);
 geometry.morphTargetsRelative=input.morphTargetsRelative;geometry.setIndex(triangles);
 // Every GLTF primitive in the resident has one material. For a grouped asset,
 // preserve each retained triangle's original material rather than its torso.
 if(input.groups.length){let retained=0;for(const group of input.groups){let length=0;for(let i=group.start;i<Math.min(group.start+group.count,count);i+=3){const tri=[0,1,2].map(j=>index?index.getX(i+j):i+j);if(tri.every(belongs))length+=3;}if(length){geometry.addGroup(retained,length,group.materialIndex);retained+=length;}}}
 return geometry;
}

export function createFirstPersonArms({scene,root}){
 const group=new T.Group();group.name='Jerome_bras_vue_visite';group.userData.skipPicking=true;group.visible=false;scene.add(group);
 const entries=[];root.traverse(source=>{if(!source.isSkinnedMesh)return;for(const side of ['L','R']){
  const geometry=armGeometry(source,side);if(!geometry)continue;
  const mesh=new T.SkinnedMesh(geometry,source.material);mesh.name='Bras_visite_'+side+'_'+source.name;mesh.userData.skipPicking=true;mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=source.receiveShadow;mesh.bindMode=source.bindMode;mesh.bind(source.skeleton,source.bindMatrix);mesh.matrixAutoUpdate=false;
  if(source.morphTargetInfluences)mesh.morphTargetInfluences=source.morphTargetInfluences;
  group.add(mesh);entries.push({source,mesh,side});
 }});
 let disposed=false,selected=null;const inverse=new T.Matrix4();
 function update(interaction){
  if(disposed)return;
  selected=interaction?.active&&interaction.weight>.015?interaction.side:null;
  group.visible=!!selected;group.updateWorldMatrix(true,false);inverse.copy(group.matrixWorld).invert();
  for(const {source,mesh,side}of entries){source.updateWorldMatrix(true,false);mesh.visible=side===selected;mesh.matrix.multiplyMatrices(inverse,source.matrixWorld);mesh.updateWorldMatrix(false,false);}
 }
 return {group,update,
  withHidden(capture){const before=group.visible;group.visible=false;try{return capture();}finally{group.visible=!disposed&&before;}},
  diagnostics(){return {visible:group.visible,side:selected,meshes:entries.length,triangles:entries.reduce((n,{mesh})=>n+mesh.geometry.index.count/3,0)};},
  dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const {mesh}of entries)mesh.geometry.dispose();entries.length=0;group.clear();}
 };
}
