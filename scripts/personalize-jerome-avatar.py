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
# Preserve original leg topology and positions: radial reshaping can fold
# duplicated seam vertices differently and expose dark knee triangles.
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

# Expose source-coordinate bounds, retained rig/morph provenance.
for index in set(x['attributes']['POSITION'] for x in pr):
 a=d['accessors'][index];v=acc(index);a['min']=v.min(0).tolist();a['max']=v.max(0).tolist()
d['asset']['extras']={'personalization':'Jerome aligned face UVs, dedicated trouser/shoe materials, preserved original leg topology, beard and short scalp volume','base':'Microsoft Rocketbox MIT','notAPhotographicScan':True}
j=json.dumps(d,separators=(',',':')).encode();j+=b' ' *((-len(j))%4);data=bytes(data)+b'\0'*((-len(data))%4)
out.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(j)+8+len(data))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(data),0x004e4942)+data)
print({'vertices':len(pos),'uvMappedHeadVertices':int((w>0).sum()),'trouserLegVertices':len(legs),'hairVertices':len(hair),'beardVertices':int((weight>0).sum()),'bytes':out.stat().st_size})
