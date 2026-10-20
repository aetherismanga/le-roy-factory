import json,struct,hashlib
from pathlib import Path
import numpy as np
out={}
for key in ['island','rect']:
 path=Path('dist/assets/bathroom/bath-'+key+'.glb');b=path.read_bytes();size=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+size]);offset=20+size;binSize=struct.unpack_from('<I',b,offset)[0];binary=b[offset+8:offset+8+binSize]
 def acc(i):
  a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];dtype={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];start=v.get('byteOffset',0)+a.get('byteOffset',0);stride=v.get('byteStride',n*np.dtype(dtype).itemsize);return np.ndarray((a['count'],n),dtype=dtype,buffer=binary,offset=start,strides=(stride,np.dtype(dtype).itemsize)).copy()
 def matrix(n):
  if 'matrix'in n:return np.array(n['matrix']).reshape(4,4).T
  x,y,z,w=n.get('rotation',[0,0,0,1]);r=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]);m=np.eye(4);m[:3,:3]=r@np.diag(n.get('scale',[1,1,1]));m[:3,3]=n.get('translation',[0,0,0]);return m
 parts=[]
 def visit(i,parent):
  n=d['nodes'][i];m=parent@matrix(n)
  if 'mesh'in n:
   for p in d['meshes'][n['mesh']]['primitives']:
    pos=acc(p['attributes']['POSITION']);pos=(np.c_[pos,np.ones(len(pos))]@m.T)[:,:3];pos=pos[:,[2,1,0]];pos[:,2]*=-1
    part={'name':n.get('name','Bath'),'positions':pos.round(6).flatten().tolist(),'metal':d.get('materials',[{}])[p.get('material',0)].get('pbrMetallicRoughness',{}).get('metallicFactor',0)>.5}
    if 'indices'in p:part['indices']=acc(p['indices']).flatten().tolist()
    if 'TEXCOORD_0'in p['attributes']:part['uv']=acc(p['attributes']['TEXCOORD_0']).round(5).flatten().tolist()
    parts.append(part)
  for c in n.get('children',[]):visit(c,m)
 for i in d['scenes'][d.get('scene',0)]['nodes']:visit(i,np.eye(4))
 out[key]=parts
Path('dist/assets/bathroom/baths.json').write_text(json.dumps(out,separators=(',',':')))
Path('dist/assets/bathroom/SOURCES.json').write_text(json.dumps({'license':'CC0-1.0','publisher':'Innerscene','assets':[{'file':'bath-island.glb','url':'https://www.innerscene.com/tools/library/3d-parts/soak-freestanding-oval-bath-a29c42f0'},{'file':'bath-rect.glb','url':'https://www.innerscene.com/tools/library/3d-parts/inset-bath-inset-bathtub-118db49b'}],'adaptation':'Geometry extracted, rotated and parameterised in length; decorative generic baths, not manufacturer SKUs.'},indent=2))
print('Bath geometry prepared',Path('dist/assets/bathroom/baths.json').stat().st_size)
