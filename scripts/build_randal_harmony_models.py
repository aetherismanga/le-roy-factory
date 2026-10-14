#!/usr/bin/env python3
"""First controlled 3D prototype for RANDAL Harmony, reconstructed from 2D catalogue pages 4–5.
Not a manufacturer CAD asset. Never replace production assets until approved.
"""
from pathlib import Path
import fitz, numpy as np, trimesh
from PIL import Image, ImageEnhance

BASE=Path(__file__).resolve().parents[1]
SRC=BASE/"assets/pdf/RANDAL%20V04.pdf"
OUT=BASE/"assets/models/randal/harmony"
COLORS={"Serenade_Alba":(684,303),"Blanco_Mate":(787,303),"Gris_Tortora":(889,303)}
OUT.mkdir(parents=True,exist_ok=True)
doc=fitz.open(SRC)
if len(doc)!=43:raise RuntimeError("RANDAL catalogue version mismatch")
pix=doc[3].get_pixmap(matrix=fitz.Matrix(5,5),alpha=False)
page=Image.frombytes("RGB",(pix.width,pix.height),pix.samples)
textures={}
for name,(x,y) in COLORS.items():
 scale=5/1.65
 cx,cy=x*scale,y*scale;r=19*scale
 im=page.crop((int(cx-r),int(cy-r),int(cx+r),int(cy+r)))
 im=im.resize((512,512),Image.Resampling.BICUBIC).crop((68,68,444,444))
 textures[name]=ImageEnhance.Contrast(im.resize((512,512),Image.Resampling.LANCZOS)).enhance(1.02)

def cube(dim,where,name,material):
 obj=trimesh.creation.box(extents=dim)
 obj.apply_translation(where)
 obj.visual.material=material
 obj.metadata["name"]=name
 return obj

def model(w,h,d,color,count,feet):
 material=trimesh.visual.material.PBRMaterial(
   name="Harmony_"+color,baseColorTexture=textures[color],
   metallicFactor=0,roughnessFactor=.88,baseColorFactor=[255,255,255,255])
 dark=trimesh.visual.material.PBRMaterial(
   name="Interieur",baseColorFactor=[58,54,49,255],roughnessFactor=.9)
 metal=trimesh.visual.material.PBRMaterial(
   name="Aluminium_mat",baseColorFactor=[183,188,190,255],metallicFactor=.72,roughnessFactor=.4)
 ground=.105 if feet else 0
 parts=[]
 add=lambda dim,pos,n,mat=material:parts.append(cube(dim,pos,n,mat))
 add([.016,h,d],[(-w+.016)/2,ground+h/2,0],"Cote_gauche_16mm")
 add([.016,h,d],[(w-.016)/2,ground+h/2,0],"Cote_droit_16mm")
 add([w-.032,.010,d-.035],[0,ground+.015,-.01],"Fond")
 add([w-.032,h-.04,.008],[0,ground+h/2,-d/2+.005],"Panneau_arriere",dark)
 add([w-.032,.017,.022],[0,ground+h-.026,-d/2+.035],"Traverse_arriere")
 add([w-.032,.013,.02],[0,ground+h-.023,d/2-.03],"Traverse_avant")
 step=(h-.038)/count
 for i in range(count):
  y=ground+.016+(i+.5)*step
  face=step-(.006 if i<count-1 else .003)
  add([w-.028,face,.016],[0,y,d/2+.005],f"Facade_tiroir_{i+1}_sans_poignee")
  add([w-.07,.012,d-.14],[0,y-face/2+.02,-.025],f"Fond_tiroir_{i+1}")
 if feet:
  for x in [-w/2+.058,w/2-.058]:
   for z in [-d/2+.063,d/2-.063]:
    add([.024,ground,.024],[x,ground/2,z],"Pied_aluminium",metal)
 scene=trimesh.Scene()
 for i,part in enumerate(parts):
  scene.add_geometry(part,node_name=part.metadata["name"]+"_"+str(i),geom_name=part.metadata["name"]+"_"+str(i))
 return scene

variants=[("Harmony_A_60cm_2tiroirs",.60,.53,.45,2,False),
          ("Harmony_K_100cm_3tiroirs",1.,.79,.45,3,True)]
for name,w,h,d,count,feet in variants:
 for color in COLORS:
  path=OUT/(name+"_"+color+".glb")
  path.write_bytes(model(w,h,d,color,count,feet).export(file_type="glb"))
  test=trimesh.load(path,force="scene")
  assert len(test.geometry)>=10 and path.stat().st_size>5000
  sizes=np.diff(test.bounds,axis=0)[0]
  assert abs(sizes[0]-w)<.005 and abs(sizes[1]-h-(.105 if feet else 0))<.005
  print(path.name,path.stat().st_size,"bytes")
