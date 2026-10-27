#!/usr/bin/env python3
"""Reproduce the Jerome mesh edits from the recovered MIT Rocketbox GLB.

Requires numpy. Source GLB URL and SHA-256 are recorded in the avatar manifest.
Usage: python scripts/personalize-jerome-avatar.py /path/to/resident-v1.glb
"""
from pathlib import Path
import argparse,json,struct,numpy as np
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('source',type=Path,help='Original recovered Rocketbox resident-v1.glb')
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parents[1]/'shared/avatar/jerome-v1/resident.glb')
args=parser.parse_args();source=args.source;out=args.output
out.parent.mkdir(parents=True,exist_ok=True)
b=source.read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);data=bytearray(b[28+n:])
def acc(i):
 a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];c={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
 return np.frombuffer(data,dtype=dt,count=a['count']*c,offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,c)
pr=d['meshes'][0]['primitives'];pos=acc(pr[0]['attributes']['POSITION']);uv=acc(pr[0]['attributes']['TEXCOORD_0']);norm=acc(pr[0]['attributes']['NORMAL']);initial=pos.copy();initial_uv=uv.copy()
def ids(material):
 return np.unique(np.concatenate([acc(p['indices']).ravel() for p in pr if d['materials'][p['material']]['name']==material]))
head=ids('m002_head');body=ids('m002_body');hair=ids('m002_opacity')
# The image-generated atlas has deliberately retained the UV islands but its
# central facial landmarks were stretched. Reauthor the mesh UV correspondence
# in image coordinates so sockets/lips align with the original physical mesh.
u=uv[head,0];iy=1-uv[head,1]
wx=np.clip((.265-np.abs(u-.5))/.055,0,1)
wy=np.clip((iy-.13)/.09,0,1)*np.clip((.72-iy)/.12,0,1)
w=wx*wy
newy=iy*1.2-.03
uv[head,1]=1-(iy+(newy-iy)*w)
# Extend the trouser material onto the real articulated shins and ankles.
# Keep feet/shoes on their original UV islands and preserve the leg rig.
legs=body[(initial[body,2]>8)&(initial[body,2]<88)&(np.abs(initial[body,0])<25)]
p=initial[legs];side=np.sign(p[:,0]);center=side*10.5
uv[legs,0]=np.clip(.145+(p[:,0]-center)*.007,.045,.25)
uv[legs,1]=1-np.clip(.035+(88-p[:,2])/80*.19,.035,.225)
# Preserve the original leg topology and positions. Geometry at the old
# shorts/calf overlap is sensitive to reshaping and must not fold at the knees.
feet=body[(initial[body,2]<=8)&(np.abs(initial[body,0])<25)]
uv[feet,0]=.244+(initial[feet,0]-np.sign(initial[feet,0])*10.5)*.0015
uv[feet,1]=.062+(initial[feet,1]+5)*.0006
# Beard volume is part of the skin deformation, so it follows all head motion.
p=initial[head];weight=np.clip((161-p[:,2])/6,0,1)*np.clip((p[:,2]-150)/3,0,1)*np.clip((-p[:,1]-4)/4,0,1)
pos[head,2]-=weight*1.8
pos[head,1]-=weight*.65
# Remove legacy long combed alpha cards. The real scalp mesh receives a
# short, gently broken raised silhouette, with no transparent holes or billboards.
d['meshes'][0]['primitives']=[p for p in pr if d['materials'][p['material']]['name']!='m002_opacity']
p=initial[head];top=np.clip((p[:,2]-174)/6,0,1)
spikes=(.5+.5*np.sin(p[:,0]*2.4+p[:,1]*1.9))*top
pos[head,2]+=spikes*1.25
# Dedicated material primitives make lower clothing independent of body UV
# islands. Runtime prepareModel preserves these explicit matte material names.
trouser_material=len(d['materials']);shoe_material=trouser_material+1
d['materials'] += [
 {'name':'Jerome_pantalon','pbrMetallicRoughness':{'baseColorFactor':[.075,.08,.09,1],'metallicFactor':0,'roughnessFactor':.92}},
 {'name':'Jerome_chaussures','pbrMetallicRoughness':{'baseColorFactor':[.035,.028,.024,1],'metallicFactor':0,'roughnessFactor':.65}}
]
extra_data=bytearray()
def index_accessor(indices):
 while (len(data)+len(extra_data))%4:extra_data.append(0)
 offset=len(data)+len(extra_data);array=np.asarray(indices,dtype='<u2');extra_data.extend(array.tobytes())
 view=len(d['bufferViews']);d['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':array.nbytes,'target':34963})
 accessor=len(d['accessors']);d['accessors'].append({'bufferView':view,'componentType':5123,'count':int(array.size),'type':'SCALAR','min':[int(array.min())],'max':[int(array.max())]})
 return accessor
primitives=[];counts={'trousers':0,'shoes':0}
for primitive in d['meshes'][0]['primitives']:
 if d['materials'][primitive['material']]['name']!='m002_body':primitives.append(primitive);continue
 triangles=acc(primitive['indices']).ravel().reshape(-1,3).copy();centers=initial[triangles].mean(axis=1);tex=initial_uv[triangles].mean(axis=1)
 vertex_uv=initial_uv[triangles];vertex_pos=initial[triangles]
 original_pants=((vertex_uv[:,:,1]>.75)&((vertex_uv[:,:,0]<.30)|(vertex_uv[:,:,0]>.70))).all(axis=1)&(vertex_pos[:,:,2].max(axis=1)<110)
 # Original shirt-front UV triangles start at source z=89.00554. Every
 # vertex must lie below z=88, except complete original trouser UV islands.
 lower=((vertex_pos[:,:,2].max(axis=1)<88)&(np.abs(vertex_pos[:,:,0]).max(axis=1)<26))|original_pants
 shoes=lower&(centers[:,2]<10.3)
 for mask,material,key in [(~lower,primitive['material'],None),(lower&~shoes,trouser_material,'trousers'),(shoes,shoe_material,'shoes')]:
  if not np.any(mask):continue
  piece=dict(primitive);piece['indices']=index_accessor(triangles[mask].ravel());piece['material']=material;primitives.append(piece)
  if key:counts[key]+=int(mask.sum())
d['meshes'][0]['primitives']=primitives;data=bytearray(data)+extra_data;d['buffers'][0]['byteLength']=len(data)
print('clothing triangles',counts)

# Refine the close-up head silhouette with a single subdivision level. UV seam
# vertices stay separate: interpolating atlas coordinates across a welded seam
# would put parts of the beard/eyes on unrelated islands. Only positions are
# welded for the conservative Loop stencil; skin weights and all four morph
# targets are independently interpolated per original edge.
head_primitives=[p for p in primitives if d['materials'][p['material']]['name']=='m002_head']
head_triangles=[acc(p['indices']).ravel().reshape(-1,3).copy() for p in head_primitives]
head_ids=np.unique(np.concatenate(head_triangles).ravel())
head_positions=pos[head_ids].copy()
rounded=np.round(head_positions,5)
_,first,welded=np.unique(rounded,axis=0,return_index=True,return_inverse=True)
weld_positions=head_positions[first]
old_to_local={int(value):i for i,value in enumerate(head_ids)}
head_weld={int(value):int(welded[i]) for i,value in enumerate(head_ids)}
rings=[set() for _ in weld_positions];edge_opposites={}
for triangles in head_triangles:
 for triangle in triangles:
  a,b,c=[head_weld[int(v)] for v in triangle]
  for x,y,z in [(a,b,c),(b,c,a),(c,a,b)]:
   if x==y:continue
   rings[x].add(y);rings[y].add(x)
   edge_opposites.setdefault(tuple(sorted((x,y))),set()).add(z)
def refinement_weight(point):
 # Eye sockets, eyelids, nose and lip landmarks retain their authored shape.
 # The crown gets a rounder contour; the chin gets only a light softening.
 z=point[2]
 return max(.75*np.clip((z-170)/8,0,1),.18*np.clip((163-z)/8,0,1)*np.clip((z-150)/3,0,1))
smoothed=weld_positions.copy()
for i,neighbors in enumerate(rings):
 n=len(neighbors)
 if n<3:continue
 beta=3/(8*n) if n!=3 else 3/16
 loop=weld_positions[i]*(1-n*beta)+weld_positions[list(neighbors)].sum(0)*beta
 smoothed[i]+=refinement_weight(weld_positions[i])*(loop-weld_positions[i])

head_attribute_arrays={name:acc(index).copy() for name,index in head_primitives[0]['attributes'].items()}
head_morph_arrays=[acc(target['POSITION']).copy() for target in head_primitives[0].get('targets',[])]
new_attributes={name:[array[int(i)].copy() for i in head_ids] for name,array in head_attribute_arrays.items()}
new_morphs=[[array[int(i)].copy() for i in head_ids] for array in head_morph_arrays]
new_attributes['POSITION']=[smoothed[head_weld[int(i)]].copy() for i in head_ids]
new_edges={};subdivided=[]
def midpoint(a,b):
 key=tuple(sorted((int(a),int(b))))
 if key in new_edges:return new_edges[key]
 index=len(new_attributes['POSITION']);new_edges[key]=index
 wa,wb=head_weld[int(a)],head_weld[int(b)]
 middle=(weld_positions[wa]+weld_positions[wb])/2
 opposite=edge_opposites.get(tuple(sorted((wa,wb))),set())
 if len(opposite)==2:
  loop=(weld_positions[wa]+weld_positions[wb])*.375+weld_positions[list(opposite)].sum(0)*.125
  middle+=refinement_weight(middle)*(loop-middle)
 for name,array in head_attribute_arrays.items():
  if name=='POSITION':value=middle
  elif name=='JOINTS_0':
   influences={}
   for source_index in [a,b]:
    for joint,weight in zip(head_attribute_arrays['JOINTS_0'][source_index],head_attribute_arrays['WEIGHTS_0'][source_index]):influences[int(joint)]=influences.get(int(joint),0)+float(weight)*.5
   ranked=sorted(influences.items(),key=lambda item:item[1],reverse=True)[:4]
   ranked += [(0,0)]*(4-len(ranked));skin_weights=np.asarray([v for _,v in ranked]);skin_weights/=max(skin_weights.sum(),1e-8)
   value=np.asarray([joint for joint,_ in ranked],dtype=array.dtype)
  elif name=='WEIGHTS_0':value=skin_weights
  else:
   value=(array[a]+array[b])*.5
   if name=='NORMAL':value/=max(np.linalg.norm(value),1e-8)
  new_attributes[name].append(np.asarray(value,dtype=array.dtype))
 for target,array in zip(new_morphs,head_morph_arrays):target.append((array[a]+array[b])*.5)
 return index
for triangles in head_triangles:
 result=[]
 for a,b,c in triangles:
  ab,bc,ca=midpoint(int(a),int(b)),midpoint(int(b),int(c)),midpoint(int(c),int(a))
  aa,bb,cc=old_to_local[int(a)],old_to_local[int(b)],old_to_local[int(c)]
  result.extend([(aa,ab,ca),(ab,bb,bc),(ca,bc,cc),(ab,bc,ca)])
 subdivided.append(np.asarray(result,dtype='<u2'))

refined_data=bytearray()
def append_accessor(array,kind,target=None):
 array=np.ascontiguousarray(array)
 while (len(data)+len(refined_data))%4:refined_data.append(0)
 offset=len(data)+len(refined_data);refined_data.extend(array.tobytes())
 view=len(d['bufferViews']);v={'buffer':0,'byteOffset':offset,'byteLength':array.nbytes}
 if target:v['target']=target
 d['bufferViews'].append(v)
 component={'f':5126,'u':5123 if array.dtype.itemsize==2 else 5125}[array.dtype.kind]
 accessor={'bufferView':view,'componentType':component,'count':int(array.shape[0]),'type':kind}
 if kind=='VEC3' and array.dtype.kind=='f':accessor.update(min=array.min(0).tolist(),max=array.max(0).tolist())
 index=len(d['accessors']);d['accessors'].append(accessor);return index
refined_attributes={}
for name,values in new_attributes.items():
 dtype=head_attribute_arrays[name].dtype
 array=np.asarray(values,dtype=dtype)
 refined_attributes[name]=append_accessor(array,{2:'VEC2',3:'VEC3',4:'VEC4'}[array.shape[1]],34962)
refined_morphs=[{'POSITION':append_accessor(np.asarray(values,dtype='<f4'),'VEC3',34962)} for values in new_morphs]
for primitive,triangles in zip(head_primitives,subdivided):
 primitive['attributes']=refined_attributes.copy();primitive['targets']=[x.copy() for x in refined_morphs]
 primitive['indices']=append_accessor(triangles.ravel(),'SCALAR',34963)
data=bytearray(data)+refined_data;d['buffers'][0]['byteLength']=len(data)
print('refined head',{'vertices':len(new_attributes['POSITION']),'triangles':int(sum(len(x) for x in subdivided)),'addedBytes':len(refined_data)})

# Expose source-coordinate bounds, retained rig/morph provenance.
for index in set(x['attributes']['POSITION'] for x in pr):
 a=d['accessors'][index];v=acc(index);a['min']=v.min(0).tolist();a['max']=v.max(0).tolist()
d['asset']['extras']={'personalization':'Jerome aligned face UVs, seam-preserving one-level head subdivision, smooth crown/chin silhouette, preserved original leg topology and positions, dedicated trouser/shoe materials, beard and short scalp volume','base':'Microsoft Rocketbox MIT','notAPhotographicScan':True}
j=json.dumps(d,separators=(',',':')).encode();j+=b' ' *((-len(j))%4);data=bytes(data)+b'\0'*((-len(data))%4)
out.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(data),0x004e4942)+data)
print({'vertices':len(pos),'uvMappedHeadVertices':int((w>0).sum()),'trouserLegVertices':len(legs),'hairVertices':len(hair),'beardVertices':int((weight>0).sum()),'bytes':out.stat().st_size})
