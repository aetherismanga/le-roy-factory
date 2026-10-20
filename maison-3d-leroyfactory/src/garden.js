import * as T from "three";
import {
  box,
  cylinder,
  sphere,
  tube,
  group,
  mesh,
  batchFurniture,
} from "./geometry.js";
import { point, SCALE } from "./plan.js";
import { furnitureKit } from "./furniture.js";
import { textureClone } from "./materials.js";
export function buildGarden(scene, M) {
  const root = group(scene, 0, 0, 0, 0, "Jardin_terrasse_et_paysage"),
    kit = furnitureKit(M),
    obstacles = [];
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
        band = Math.sin(x * 0.035) * 3,
        idx = (y * 512 + x) * 4;
      grassPixels.set(
        [105 + n * 37 + band, 116 + n * 35 + band, 73 + n * 30, 255],
        idx,
      );
    }
  const grassTexture = new T.DataTexture(grassPixels, 512, 512);
  grassTexture.colorSpace = T.SRGBColorSpace;
  grassTexture.wrapS = grassTexture.wrapT = T.RepeatWrapping;
  grassTexture.repeat.set(32, 31);
  grassTexture.needsUpdate = true;
  const lawn = M.grass.clone();
  lawn.map = grassTexture;
  lawn.bumpMap = grassTexture;
  lawn.bumpScale = 0.009;
  lawn.color.set("#fff");
  box(root, 45, 0.14, 43, lawn, 0, -0.07, 0, "Terrain_paysager", 0);

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
  const exteriorSofa = kit.sofa(new T.Group(), 2.4);
  add(exteriorSofa, 7.6, 0.02, 10.45, Math.PI);
  const small = kit.coffeeTable(new T.Group());
  add(small, 7.8, 0.02, 9.22);
  const lounge = kit.chair(new T.Group(), { arm: true, mat: M.ivoryFabric });
  add(lounge, 9.65, 0.02, 9.4, -Math.PI / 2);
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
  // Pool is separate from the 140 m² interior. Real coping, water, inset basin.
  const waterM = new T.MeshPhysicalMaterial({
    color: "#629c9d",
    roughness: 0.13,
    metalness: 0.12,
    transparent: true,
    opacity: 0.82,
    transmission: 0,
    ior: 1.333,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  const pool = group(root, ...point(2.0, 0, 13.65), 0, "Bassin_jardin");
  box(pool, 4.62, 0.17, 2.62, M.stone, 0, -0.1, 0, "Margelle", 0.04);
  box(pool, 4.32, 0.02, 2.32, M.floor, 0, -0.22, 0, "Fond_bassin", 0.03);
  const water = mesh(
    pool,
    new T.PlaneGeometry(4.3, 2.3, 32, 32),
    waterM,
    "Eau_du_bassin",
    0,
    -0.04,
    0,
  );
  water.rotation.x = -Math.PI / 2;
  water.castShadow = false;
  obstacles.push({
    x: (2 - 5) * SCALE,
    z: (13.65 - 4) * SCALE,
    w: 4.65,
    d: 2.65,
    floor: 0,
    minY: -0.2,
    maxY: 0.2,
  });
  for (const x of [-1.0, 5.0]) {
    const c = group(root, ...point(x, 0, 14.2), Math.PI, "Bain_de_soleil");
    box(c, 0.65, 0.12, 1.8, M.oak, 0, 0.24, 0, "Châssis_transat", 0.04);
    box(c, 0.6, 0.1, 1.72, M.ivoryFabric, 0, 0.34, 0, "Matelas_transat", 0.04);
    for (const s of [-1, 1])
      box(
        c,
        0.04,
        0.24,
        0.04,
        M.black,
        s * 0.24,
        0.12,
        s * 0.7,
        "Pied_transat",
      );
  }
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
    const geo = new T.ShapeGeometry(leafShape, 3),
      leaves = new T.InstancedMesh(geo, M.leaf, 2200),
      matrix = new T.Matrix4(),
      q = new T.Quaternion();
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
          0.42 + random() * 0.16,
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
    [7.5, 16.5, 4.1],
    [12.5, 12.8, 5.1],
    [12.6, 5.4, 4.7],
    [11.8, -2.8, 4.0],
    [-2.3, -2.6, 4.5],
  ])
    olive(x, z, h);
  for (let i = 0; i < 32; i++) {
    const x = i % 2 ? -3 : 13,
      z = -3 + Math.floor(i / 2) * 1.35;
    sphere(
      root,
      0.57,
      i % 3 ? M.leaf : M.leafLight,
      ...point(x, 0.44, z),
      [1.0, 0.8, 1.2],
      "Haie_paysagère",
    );
  }
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
    [5.1, 15.8],
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
  terrainGeo.computeVertexNormals();
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
  let i = 0;
  while (i < 18000) {
    const x = -4 + random() * 18,
      z = -4 + random() * 23;
    if (
      (x > -0.5 && x < 10.8 && z > -0.5 && z < 11.6) ||
      (x > -0.7 && x < 4.7 && z > 12.1 && z < 15.1)
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

  batchFurniture(root, {
    exclude: root.children.filter((o) =>
      ["Terrain_paysager", "Terrasse_pierre_naturelle"].includes(o.name),
    ),
  });
  return { root, water, waterM, obstacles };
}
