import * as T from "three";
import {buildExterior,groundWithPoolHole,excludePoolTriangles,botanicalMaterials} from "./exterior.js";
import {
  box,
  cylinder,
  sphere,
  tube,
  group,
  mesh,
  batchFurniture,
} from "./geometry.js";
import { point as basePoint, SCALE, LAYOUT } from "./plan.js";
import { furnitureKit } from "./furniture.js";
import { textureClone } from "./materials.js";
export async function buildGarden(scene, M, {renderer,config}={}) {
  M={...M};botanicalMaterials(M);
  const point=(x,y,z)=>basePoint(x>10?x+LAYOUT.width-10:x<0?x:x/10*LAYOUT.width,y,z>8?z+LAYOUT.depth-8:z<0?z:z/8*LAYOUT.depth);
  const root = group(scene, 0, 0, 0, 0, "Jardin_terrasse_et_paysage"),
    kit = furnitureKit(M),
    obstacles = [],seats=[];
  let seed = 947;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const add = (o, x, y, z, angle = 0) => {
    o.position.set(...point(x, y, z));
    o.rotation.y = angle;
    root.add(o);
    return o;
  };
  // Grass colour varies at the scale of blades and gentle mowing bands.
  const grassPixels = new Uint8Array(512 * 512 * 4);
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const n = random(),
        band = Math.sin(x * 0.006) * 3,
        idx = (y * 512 + x) * 4;
      grassPixels.set(
        [78 + n * 32 + band, 111 + n * 40 + band, 60 + n * 24, 255],
        idx,
      );
    }
  const grassTexture = new T.DataTexture(grassPixels, 512, 512);
  grassTexture.colorSpace = T.SRGBColorSpace;
  grassTexture.wrapS = grassTexture.wrapT = T.RepeatWrapping;
  grassTexture.repeat.set(32, 31);
  grassTexture.minFilter = T.LinearMipmapLinearFilter;
  grassTexture.magFilter = T.LinearFilter;
  grassTexture.generateMipmaps = true;
  grassTexture.anisotropy = 4;
  grassTexture.needsUpdate = true;
  const lawn = M.grass.clone();
  lawn.map = grassTexture;
  lawn.bumpMap = grassTexture;
  lawn.bumpScale = 0.009;
  lawn.color.set("#fff");
  const poolPosition=new T.Vector3(...point(4.6,0,15.6));
  mesh(root,groundWithPoolHole(45,43,poolPosition),lawn,"Terrain_paysager").castShadow=false;

  const deck = textureClone(M.floor, 9, 3.2);
  box(
    root,
    11.4,
    0.1,
    3.25,
    deck,
    ...point(5, -0.035, 9.7),
    "Terrasse_pierre_naturelle",
    0.008,
  );
  for (let i = 0; i < 12; i++)
    box(
      root,
      0.003,
      0.002,
      3.24,
      M.stone,
      ...point(-0.6 + i * 0.96, 0.017, 9.7),
      "Joint_terrasse",
      0,
    );
  for (let j = 0; j < 4; j++)
    box(
      root,
      11.4,
      0.002,
      0.003,
      M.stone,
      ...point(5, 0.017, 8.1 + j * 0.97),
      "Joint_terrasse",
      0,
    );
  const exteriorSofa = kit.sofa(new T.Group(), 2.4,false);
  add(exteriorSofa, 7.6, 0.02, 10.45, Math.PI);
  seats.push({id:"garden-sofa",name:"Canapé de la terrasse",kind:"sofa",floor:0,root:exteriorSofa,object:exteriorSofa,external:true});
  const small = kit.coffeeTable(new T.Group());
  add(small, 7.8, 0.02, 9.22);
  const lounge = kit.chair(new T.Group(), { arm: true, mat: M.ivoryFabric });
  add(lounge, 9.65, 0.02, 9.4, -Math.PI / 2);
  seats.push({id:"garden-lounge",name:"Fauteuil de la terrasse",kind:"chair",floor:0,root:lounge,object:lounge,external:true});
  for (const [x, z] of [
    [-0.15, 8.4],
    [10.22, 8.5],
    [10.2, 11.1],
  ])
    add(kit.plant(new T.Group(), 0, 0, 0, 1.7), x, 0.02, z);
  // A timber pergola and its spaced slats create real filtered shadows.
  for (const x of [6.0, 10.45])
    for (const z of [8.25, 11.2])
      box(
        root,
        0.105,
        2.7,
        0.105,
        M.oak,
        ...point(x, 1.35, z),
        "Poteau_pergola",
        0.008,
      );
  for (const z of [8.25, 11.2])
    box(
      root,
      4.56,
      0.16,
      0.12,
      M.oak,
      ...point(8.22, 2.67, z),
      "Poutre_pergola",
      0.006,
    );
  for (let i = 0; i < 18; i++)
    box(
      root,
      0.055,
      0.075,
      3.12,
      M.oak,
      ...point(6.08 + i * 0.25, 2.78, 9.72),
      "Lame_pergola",
      0.004,
    );
  const exterior=await buildExterior(root,M,point,renderer,config);obstacles.push(...exterior.obstacles);
  for(const [x,z]of [[-.65,15.6],[10.15,15.6]]){const chair=kit.chair(new T.Group(),{arm:true,mat:M.ivoryFabric});add(chair,x,.05,z,Math.PI/2);seats.push({id:'garden-chair-'+x,name:'Fauteuil du jardin',kind:'chair',floor:0,root:chair,object:chair,external:true});}
  function olive(x, z, height = 3.8) {
    const g = group(root, ...point(x, 0, z), 0, "Olivier");
    tube(
      g,
      [
        [0, 0, 0],
        [0.1, height * 0.25, 0.03],
        [0.03, height * 0.55, 0],
      ],
      0.085,
      M.trunk,
      "Tronc_olivier",
    );
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      tube(
        g,
        [
          [0.03, height * 0.42, 0],
          [Math.cos(a) * 0.3, height * 0.63, Math.sin(a) * 0.3],
          [Math.cos(a) * 0.7, height * 0.78, Math.sin(a) * 0.7],
        ],
        0.027,
        M.trunk,
        "Branche_olivier",
      );
    }
    const leafShape = new T.Shape();
    leafShape.moveTo(0, -0.055);
    leafShape.quadraticCurveTo(0.018, -0.02, 0.012, 0.028);
    leafShape.lineTo(0, 0.065);
    leafShape.quadraticCurveTo(-0.025, 0.02, 0, -0.055);
    const geo = new T.ShapeGeometry(leafShape, 4),
      leaves = new T.InstancedMesh(geo, M.leaf, 2200),
      matrix = new T.Matrix4(),
      q = new T.Quaternion();
    const lp=geo.attributes.position;for(let j=0;j<lp.count;j++)lp.setZ(j,.005*(1-(lp.getY(j)/.07)**2)-Math.abs(lp.getX(j))*.23);geo.computeVertexNormals();
    leaves.userData={qualityKind:"leaves",fullCount:2200};
    for (let i = 0; i < 2200; i++) {
      const a = random() * Math.PI * 2,
        r = Math.sqrt(random()) * 1.28,
        h = height * 0.64 + random() * height * 0.33;
      q.setFromEuler(new T.Euler(random() * 3, random() * 6, random() * 3));
      matrix.compose(
        new T.Vector3(Math.cos(a) * r, h, Math.sin(a) * r),
        q,
        new T.Vector3(0.9 + random() * 0.9, 1.1 + random() * 0.8, 1),
      );
      leaves.setMatrixAt(i, matrix);
      leaves.setColorAt(
        i,
        new T.Color().setHSL(
          0.2 + random() * 0.035,
          0.14 + random() * 0.1,
          0.68 + random() * 0.16,
        ),
      );
    }
    leaves.castShadow = leaves.receiveShadow = true;
    g.add(leaves);
  }
  for (const [x, z, h] of [
    [-2, 2, 4.8],
    [-2, 8, 4.2],
    [-2.6, 13, 4.6],
    [11.8, 18.1, 4.1],
    [12.5, 12.8, 5.1],
    [12.6, 5.4, 4.7],
    [11.8, -2.8, 4.0],
    [-2.3, -2.6, 4.5],
  ])
    olive(x, z, h);
  const shrubGeo=new T.SphereGeometry(1,7,5),shrubLeaves=new T.InstancedMesh(shrubGeo,M.leaf.clone(),4200),sm=new T.Matrix4(),sq=new T.Quaternion();shrubLeaves.name='Feuillage_haies_et_buissons';shrubLeaves.userData={qualityKind:'leaves',fullCount:4200};
  for(let i=0;i<4200;i++){const bush=i%30,x=bush%2?-3:13,z=-3+Math.floor(bush/2)*1.45,a=random()*Math.PI*2,r=Math.sqrt(random())*.57;sm.compose(new T.Vector3(...point(x+Math.cos(a)*r,.15+random()*.75,z+Math.sin(a)*r)),sq.setFromEuler(new T.Euler(random()*3,random()*6,random()*3)),new T.Vector3(.07+random()*.045,.025,.11));shrubLeaves.setMatrixAt(i,sm);shrubLeaves.setColorAt(i,new T.Color().setHSL(.22+random()*.04,.2+random()*.08,.63+random()*.2));}shrubLeaves.castShadow=shrubLeaves.receiveShadow=true;root.add(shrubLeaves);
  // Front path, entry canopy, mailbox and pathway bollards.
  for (let i = 0; i < 7; i++)
    box(
      root,
      1.05,
      0.04,
      0.55,
      M.stone,
      ...point(6.0, 0.006, -0.5 - i * 0.75),
      "Pas_japonais",
      0.01,
    );
  box(
    root,
    1.55,
    0.1,
    1.0,
    M.black,
    ...point(6, 2.46, -0.3),
    "Auvent_entrée",
    0.008,
  );
  for (const [x, z] of [
    [5.1, -1.0],
    [6.9, -3.2],
    [5.1, -4.6],
    [10.3, 11.3],
    [10.7, 18.5],
  ]) {
    box(
      root,
      0.045,
      0.7,
      0.045,
      M.black,
      ...point(x, 0.35, z),
      "Borne_lumineuse",
    );
    box(
      root,
      0.047,
      0.04,
      0.047,
      M.led,
      ...point(x, 0.64, z),
      "Diffuseur_borne",
    );
  }
  // A continuous rolling terrain replaces distant primitive silhouettes.
  const terrainGeo = new T.PlaneGeometry(260, 260, 96, 96);
  terrainGeo.rotateX(-Math.PI / 2);
  const pp = terrainGeo.attributes.position;
  for (let i = 0; i < pp.count; i++) {
    const x = pp.getX(i),
      z = pp.getZ(i),
      dist = Math.hypot(x, z),
      blend = T.MathUtils.smoothstep(dist, 26, 55);
    pp.setY(
      i,
      -0.15 +
        blend *
          (Math.sin(x * 0.036 + z * 0.019) * 2.0 +
            Math.sin(z * 0.052 - x * 0.017) * 2.4 +
            3.4),
    );
  }
  excludePoolTriangles(terrainGeo,poolPosition);
  const distant = lawn.clone();
  distant.map = grassTexture.clone();
  distant.map.repeat.set(145, 145);
  distant.map.needsUpdate = true;
  mesh(root, terrainGeo, distant, "Paysage_vallonné").castShadow = false;
  // Fine foreground blades, instanced once, remain light enough for phones.
  const bladeGeo = new T.BufferGeometry();
  bladeGeo.setAttribute(
    "position",
    new T.Float32BufferAttribute(
      [-0.009, 0, 0, 0.009, 0, 0, 0.006, 0.08, 0.008],
      3,
    ),
  );
  bladeGeo.computeVertexNormals();
  bladeGeo.setAttribute(
    "uv",
    new T.Float32BufferAttribute([0, 0, 1, 0, 0.8, 1], 2),
  );
  const blades = new T.InstancedMesh(bladeGeo, M.leafLight, 18000),
    bm = new T.Matrix4(),
    bq = new T.Quaternion();
  blades.userData={qualityKind:"grass",fullCount:18000};
  let i = 0;
  while (i < 18000) {
    const x = -4 + random() * 18,
      z = -4 + random() * 23;
    if (
      (x > -0.5 && x < 10.8 && z > -0.5 && z < 11.6) ||
      (x > -1.5 && x < 10.7 && z > 11.1 && z < 20.1)
    )
      continue;
    bq.setFromAxisAngle(new T.Vector3(0, 1, 0), random() * Math.PI);
    bm.compose(
      new T.Vector3(...point(x, 0.008, z)),
      bq,
      new T.Vector3(0.6 + random(), 0.4 + random() * 0.7, 1),
    );
    blades.setMatrixAt(i++, bm);
  }
  blades.castShadow = false;
  blades.receiveShadow = true;
  root.add(blades);

  root.updateMatrixWorld(true);for(const seat of seats){seat.root.userData.externalSeatId=seat.id;const b=new T.Box3().setFromObject(seat.root),c=b.getCenter(new T.Vector3()),s=b.getSize(new T.Vector3());obstacles.push({id:seat.id,x:c.x,z:c.z,w:s.x,d:s.z,minY:b.min.y,maxY:b.max.y,floor:0});}
  batchFurniture(root, {
    exclude: [...seats.map(s=>s.root),...root.children.filter((o) =>
      ["Terrain_paysager", "Terrasse_pierre_naturelle", "Piscine_8x4m", "Muret_BIOPIETRA"].includes(o.name),
    )],
  });
  return {root,water:exterior.water,waterM:exterior.waterM,obstacles,seats,exterior};
}
