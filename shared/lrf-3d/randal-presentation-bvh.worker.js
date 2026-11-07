import {BufferGeometry,BufferAttribute} from 'three';
import {MeshBVH,SAH} from 'three-mesh-bvh';

// The BVH runs away from the interaction thread. Only copied position/index
// arrays cross this boundary, so the visible raster geometry is never detached.
self.onmessage=({data})=>{
 const geometry=new BufferGeometry();
 try{
  geometry.setAttribute('position',new BufferAttribute(data.position,3));
  if(data.index)geometry.setIndex(new BufferAttribute(data.index,1));
  for(const group of data.groups||[])geometry.addGroup(group.start,group.count,group.materialIndex);
  const {maxLeafTris,...options}=data.options||{};
  const bvh=new MeshBVH(geometry,{strategy:SAH,maxLeafSize:maxLeafTris||4,indirect:true,...options,onProgress:value=>self.postMessage({id:data.id,progress:value})});
  const serialized=MeshBVH.serialize(bvh,{cloneBuffers:false}),buffers=new Set([...serialized.roots,serialized.index?.buffer,serialized.indirectBuffer?.buffer].filter(Boolean));
  self.postMessage({id:data.id,serialized},[...buffers].filter(b=>!(typeof SharedArrayBuffer!=='undefined'&&b instanceof SharedArrayBuffer)));
 }catch(error){self.postMessage({id:data.id,error:error.message});}finally{geometry.dispose();}
};
