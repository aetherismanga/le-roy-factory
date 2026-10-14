#!/usr/bin/env python3
"""RANDAL Harmony V04: 12 catalogue cabinet variants x 3 finishes = 36 GLB.
   Technical reconstruction from factory diagrams, not manufacturer CAD.
   Independent of commercial 3D viewer; drawer opening is interactive there.
"""
from pathlib import Path
import numpy as np
import trimesh
from PIL import Image, ImageEnhance

BASE=Path(__file__).resolve().parents[1]
OUT=BASE/"assets/models/randal/harmony"
FINISHES=BASE/"assets/img/randal/finishes/harmony"
COLORS={"Serenade_Alba":"serenade-alba.webp",
        "Blanco_Mate":"blanco-mate.webp",
        "Gris_Tortora":"gris-tortora.webp"}
WIDTHS=[60,70,80,90,100,119]
OUT.mkdir(parents=True,exist_ok=True)
textures={}
for name,source in COLORS.items():
    image=Image.open(FINISHES/source).convert("RGB")
    # True center of RANDAL circular finish swatch, outside ivory area excluded.
    side=int(min(image.size)*.60)
    x=(image.width-side)//2;y=(image.height-side)//2
    chip=image.crop((x,y,x+side,y+side)).resize((512,512),Image.Resampling.LANCZOS)
    textures[name]=ImageEnhance.Contrast(chip).enhance(1.045)

def material(color):
    return trimesh.visual.material.PBRMaterial(
        name="RANDAL_Harmony_"+color,
        baseColorTexture=textures[color],
        baseColorFactor=[255,255,255,255],
        roughnessFactor=.81,metallicFactor=0)
def simple(name,rgba,metallic=0):
    return trimesh.visual.material.PBRMaterial(
        name=name,baseColorFactor=rgba,
        roughnessFactor=.62,metallicFactor=metallic)
def add(parts,name,dim,xyz,mat):
    mesh=trimesh.creation.box(extents=dim)
    mesh.apply_translation(xyz)
    # Explicit UV makes the real finish swatch visible in GLB viewers.
    uv=np.zeros((len(mesh.vertices),2),dtype=np.float32)
    vertices=mesh.vertices-np.array(xyz)
    uv[:,0]=(vertices[:,0]+dim[0]/2)/max(dim[0],1e-5)
    uv[:,1]=(vertices[:,1]+dim[1]/2)/max(dim[1],1e-5)
    mesh.visual=trimesh.visual.texture.TextureVisuals(uv=uv,material=mat)
    parts.append((name,mesh))

def drawer(parts,width,depth,y,step,index,mat,inside,top,double):
    frontZ=depth/2+.014
    # Front slab without applied handles.
    add(parts,f"Tiroir_{index}_facade", [width-.028,step-.006,.016],
        [0,y,frontZ],mat)
    back=depth/2-.042-(depth-.12)
    front=depth/2-.042
    base=y-step/2+.022
    for x in [-width/2+.049,width/2-.049]:
        add(parts,f"Tiroir_{index}_paroi",[.012,.115,depth-.12],
            [x,base+.065,(front+back)/2],inside)
    if not top:
        add(parts,f"Tiroir_{index}_fond",[width-.10,.010,depth-.12],
            [0,base,(front+back)/2],inside)
        add(parts,f"Tiroir_{index}_fond_arriere",[width-.10,.10,.01],
            [0,base+.057,back+.008],inside)
        return
    # Top drawer: U-shaped waste pipe relief at the REAR, never a solid shelf.
    cut=.17;notch=.18
    notches=[-width*.245,width*.245] if double else [0]
    add(parts,"Tiroir_superieur_ponte_avant",[width-.10,.010,depth-.12-cut],
        [0,base,(front+back+cut)/2],inside)
    left=-width/2+.05
    for cx in notches:
        x0=max(-width/2+.05,cx-notch/2)
        x1=min(width/2-.05,cx+notch/2)
        if x0>left+.005:
            add(parts,"Tiroir_superieur_fond_arriere",[x0-left,.010,cut],
                [(left+x0)/2,base,back+cut/2],inside)
        for side in (x0,x1):
            add(parts,"Tiroir_superieur_cloison_siphon",[.010,.095,cut],
                [side,base+.055,back+cut/2],inside)
        left=x1
    right=width/2-.05
    if right>left+.005:
        add(parts,"Tiroir_superieur_fond_droit",[right-left,.010,cut],
            [(right+left)/2,base,back+cut/2],inside)

def build(w_cm,three,color):
    width=w_cm/100
    height=.79 if three else .53
    depth=.45
    feet=.105 if three else 0
    mat=material(color)
    inside=simple("interieur_tiroir",[183,178,167,255])
    dark=simple("chant_interieur",[81,78,71,255])
    metal=simple("pieds_aluminium_mat",[177,182,184,255],.68)
    parts=[]
    def box(label,dim,pos,finish=mat):add(parts,label,dim,pos,finish)
    box("Harmony_cote_gauche",[.016,height,depth],[-width/2+.008,feet+height/2,0])
    box("Harmony_cote_droit",[.016,height,depth],[width/2-.008,feet+height/2,0])
    box("Harmony_panneau_arriere",[width-.032,height-.04,.01],[0,feet+height/2,-depth/2+.008],inside)
    box("Harmony_bas",[width-.032,.017,depth-.02],[0,feet+.012,0],inside)
    box("Harmony_traverse_arriere",[width-.032,.017,.04],[0,feet+height-.02,-depth/2+.04],inside)
    count=3 if three else 2
    pitch=(height-.036)/count
    for i in range(count):
        y=feet+height-.018-(i+.5)*pitch
        drawer(parts,width,depth,y,pitch,i+1,mat,inside,i==0,width>1.16)
    if three:
        for x in [-width/2+.058,width/2-.058]:
            for z in [-depth/2+.065,depth/2-.065]:
                box("Pied_aluminium",[.026,feet,.026],[x,feet/2,z],metal)
    sc=trimesh.Scene()
    for n,(name,mesh) in enumerate(parts):
        sc.add_geometry(mesh,geom_name=f"{name}_{n}",node_name=f"{name}_{n}")
    return sc

def build_column(color):
    w,h,d=.30,1.50,.27
    mat=material(color)
    inside=simple("interieur_colonne",[181,174,161,255])
    parts=[]
    def box(name,size,pos,finish=mat):add(parts,name,size,pos,finish)
    box("Colonne_cote_gauche",[.016,h,d],[-w/2+.008,h/2,0])
    box("Colonne_cote_droit",[.016,h,d],[w/2-.008,h/2,0])
    box("Colonne_panneau_arriere",[w-.032,h-.03,.01],[0,h/2,-d/2+.007],inside)
    for yy in (.02,h-.02,h/2):
        box("Colonne_tablette",[w-.032,.015,d-.03],[0,yy,0],inside)
    for i in range(2):
        cy=(i+.5)*h/2
        box(f"Colonne_porte_{i+1}",[w-.025,h/2-.008,.016],[0,cy,d/2+.012])
    sc=trimesh.Scene()
    for idx,(name,mesh) in enumerate(parts):
        sc.add_geometry(mesh,geom_name=f"{name}_{idx}",node_name=f"{name}_{idx}")
    return sc

count=0
for index,w in enumerate(WIDTHS):
    for three in (False,True):
        letter=chr(ord('G' if three else 'A')+index)
        prefix=f"Harmony_{letter}_{w}cm_{'3' if three else '2'}tiroirs"
        for color in COLORS:
            output=OUT/(prefix+"_"+color+".glb")
            output.write_bytes(build(w,three,color).export(file_type="glb"))
            check=trimesh.load(output,force="scene")
            dimensions=np.diff(check.bounds,axis=0)[0]
            if abs(dimensions[0]-w/100)>.006:raise RuntimeError(f"Bad width {output}: {dimensions}")
            if abs(dimensions[1]-(.895 if three else .53))>.006:
                raise RuntimeError(f"Bad height {output}: {dimensions}")
            if output.stat().st_size<3500:raise RuntimeError(f"Bad model {output}")
            count+=1
            print(letter,w,color,output.stat().st_size)
for color in COLORS:
    output=OUT/("Harmony_M_30cm_colonne_"+color+".glb")
    output.write_bytes(build_column(color).export(file_type="glb"))
    check=trimesh.load(output,force="scene")
    dimensions=np.diff(check.bounds,axis=0)[0]
    if abs(dimensions[0]-.30)>.006 or abs(dimensions[1]-1.50)>.006:
        raise RuntimeError(f"Invalid column dimensions {output}: {dimensions}")
    count+=1
    print("M",30,color,output.stat().st_size)
if count!=39:raise RuntimeError(f"Expected 39 models, found {count}")
print("Validated 39 Harmony GLB files: 12 cabinets and one auxiliary column, 3 finishes")
