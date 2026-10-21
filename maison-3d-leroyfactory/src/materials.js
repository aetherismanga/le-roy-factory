import * as T from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { prepareFinishTexture } from "../../randal-general/src/finish-texture.js";
import { FINISHES } from "../../randal-general/src/finishes.js";
export const ASSETS = "https://studio-one-beta-test-v2.vercel.app/assets/";
export const GENERAL = "https://randal-catalogue-general-3d.vercel.app/";
function weave() {
  const n = 128,
    data = new Uint8Array(n * n * 4);
  let seed = 29;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      const v =
          125 +
          Math.sin(x * Math.PI * 0.5) * 16 +
          Math.cos(y * Math.PI * 0.5) * 16 +
          (seed >>> 28) -
          8,
        i = (y * n + x) * 4;
      data.set([v, v, v, 255], i);
    }
  const t = new T.DataTexture(data, n, n);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.repeat.set(12, 12);
  t.minFilter = T.LinearMipmapLinearFilter;
  t.magFilter = T.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}
function grain() {
  const n = 512,
    m = 256,
    d = new Uint8Array(n * m * 4);
  for (let y = 0; y < m; y++)
    for (let x = 0; x < n; x++) {
      const wave =
          Math.sin(x * 0.16 + Math.sin(y * 0.018) * 4) +
          0.45 * Math.sin(x * 0.74 + y * 0.012) +
          0.23 * Math.cos(x * 2.3 + y * 0.013),
        v = 128 + wave * 34,
        i = (y * n + x) * 4;
      d.set([v, v, v, 255], i);
    }
  const t = new T.DataTexture(d, n, m);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.minFilter = T.LinearMipmapLinearFilter;
  t.magFilter = T.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}
export async function createMaterials(renderer, scene, onProgress = () => {}) {
  const loader = new T.TextureLoader(),
    cloth = weave(),
    bump = grain(),
    resources = [],
    failures = [];
  const physical = (color, roughness = 0.6, extra = {}) =>
    new T.MeshPhysicalMaterial({ color, roughness, ...extra });
  const m = {
    plaster: physical("#ede9df", 0.91, { bumpMap: cloth, bumpScale: 0.00012 }),
    ceiling: physical("#f4f1e8", 0.94),
    exterior: physical("#ded7c7", 0.88),
    stone: physical("#c7bba6", 0.78),
    oak: physical("#a88d68", 0.43, { bumpMap: bump, bumpScale: 0.001 }),
    walnut: physical("#785944", 0.48, { bumpMap: bump, bumpScale: 0.0007 }),
    paint: physical("#c8c0b1", 0.64),
    sage: physical("#8d9985", 0.83),
    clay: physical("#bc8b74", 0.85),
    linen: physical("#cfc2aa", 0.98, { bumpMap: cloth, bumpScale: 0.00085 }),
    ivoryFabric: physical("#e9e2d4", 0.98, {
      bumpMap: cloth,
      bumpScale: 0.0006,
    }),
    charcoalFabric: physical("#586059", 0.98, {
      bumpMap: cloth,
      bumpScale: 0.0008,
    }),
    sageFabric: physical("#8e9e88", 0.97, {
      bumpMap: cloth,
      bumpScale: 0.0007,
    }),
    clayFabric: physical("#bb8e77", 0.97, {
      bumpMap: cloth,
      bumpScale: 0.0007,
    }),
    rug: physical("#cec1a5", 1, { bumpMap: cloth, bumpScale: 0.002 }),
    black: physical("#252b2a", 0.35, { metalness: 0.42 }),
    bronze: physical("#a58c60", 0.28, { metalness: 0.82 }),
    steel: physical("#bdc5c6", 0.23, { metalness: 1 }),
    whiteCeramic: physical("#f4f1e9", 0.16, { clearcoat: 0.7 }),
    terracotta: physical("#9d725a", 0.84),
    leaf: physical("#637a4f", 0.83, { side: T.DoubleSide }),
    leafLight: physical("#869465", 0.9, { side: T.DoubleSide }),
    trunk: physical("#6c6253", 1),
    grass: physical("#89936c", 0.98),
    earth: physical("#8a806a", 1),
    glass: physical("#eff8f4", 0.035, {
      transmission: 0,
      opacity: 0.13,
      thickness: 0.009,
      ior: 1.5,
      transparent: true,
      side: T.DoubleSide,
      envMapIntensity: 1.1,
    }),
    windowBlack: physical("#303632", 0.33, { metalness: 0.65 }),
    led: physical("#fff1d0", 0.3, {
      emissive: "#ffdaa5",
      emissiveIntensity: 2,
    }),
    screen: physical("#19242b", 0.25, {
      metalness: 0.2,
      clearcoat: 0.8,
      emissive: "#132831",
      emissiveIntensity: 0.55,
    }),
    floor: physical("#d7c9b4", 0.57),
    bathTile: physical("#c5bba6", 0.64),
    books: [
      physical("#c8bda2", 0.8),
      physical("#737e70", 0.8),
      physical("#a57d64", 0.8),
      physical("#313a3b", 0.8),
    ],
    cloth,
    woodBump: bump,
  };
  for(const key of ['linen','ivoryFabric','charcoalFabric','sageFabric','clayFabric']){
    m[key].sheen=.65;m[key].sheenColor.copy(m[key].color).lerp(new T.Color('#fff9eb'),.2);m[key].sheenRoughness=.84;
  }
  m.glass.userData.architecturalGlass = true;
  const tasks = [
    ["oak", ASSETS + "serenade-alba.webp"],
    ["walnut", "/shared/materials/aruba-nogal-front.jpg"],
    ["floor", ASSETS + "shell-ivory.webp"],
    ["bathTile", ASSETS + "creta-avena.webp"],
  ];
  let done = 0;
  await Promise.all(
    tasks.map(async ([key, url]) => {
      try {
        let t = await loader.loadAsync(url);
        if (key === "walnut") {
          const def = FINISHES.find(
            (f) => f.materialSample === "aruba-flat-nogal",
          );
          t = prepareFinishTexture(t, def);
        }
        t.colorSpace = T.SRGBColorSpace;
        t.wrapS = t.wrapT = T.RepeatWrapping;
        t.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
        m[key].map = t;
        m[key].color.set("#ffffff");
        m[key].needsUpdate = true;
        resources.push(t);
      } catch (e) {
        failures.push(url);
        console.warn("Matériau indisponible", key, e.message);
      }
      onProgress(++done / 5);
    }),
  );
  const pmrem = new T.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  // Neutral studio illumination avoids reflecting the unrelated office
  // photograph of the legacy HDR. Mirrors still reflect the actual house.
  const environment = new RoomEnvironment();
  const env = pmrem.fromScene(environment, .055);
  scene.environment = env.texture;
  resources.push(env);
  environment.dispose();
  pmrem.dispose();
  onProgress(1);
  scene.environmentIntensity = 0.5;
  return { ...m, resources, failures };
}
export function textureClone(material, repeatX = 1, repeatY = 1) {
  const m = material.clone();
  for (const key of ["map", "bumpMap"])
    if (material[key]) {
      m[key] = material[key].clone();
      m[key].repeat.set(repeatX, repeatY);
      m[key].needsUpdate = true;
    }
  return m;
}
export function artTexture(seed = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const c = canvas.getContext("2d");
  c.fillStyle = "#e5ddca";
  c.fillRect(0, 0, 768, 1024);
  for (let i = 0; i < 35; i++) {
    c.fillStyle = ["#c3b9a1", "#8d998a", "#b79478", "#dfd4bc", "#51594d"][
      (i + seed) % 5
    ];
    c.globalAlpha = 0.2 + (i % 4) * 0.16;
    c.beginPath();
    c.ellipse(
      80 + ((i * 179 + seed * 55) % 630),
      120 + ((i * 131) % 790),
      90 + ((i * 13) % 200),
      30 + ((i * 31) % 150),
      (i * 0.36) % 3,
      0,
      Math.PI * 2,
    );
    c.fill();
  }
  c.globalAlpha = 1;
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
