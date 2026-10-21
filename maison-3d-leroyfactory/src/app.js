import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { configureColourRendering } from "../../randal-general/src/colour-rendering.js";
import { configureNavigation } from "../../randal-general/src/navigation.js";
import { createUltraPipeline } from "../../randal-general/src/ultra-rendering.js";
import { createMaterials } from "./materials.js";
import {createProductTextures} from "./products.js";
import {mountWorkshop,readDraft,saveDraft,validateProject} from "./workshop.js";
import {allTakeoffs} from "./takeoff.js";
import { buildHouse } from "./house.js";
import { buildGarden } from "./garden.js";
import { collisionWorld, createHouseWalk } from "./house-navigation.js";
import {
  ROOMS,
  WALLS,
  WELL,
  VIEWS,
  PROGRAM,
  LEVEL_HEIGHT,
  SCALE,
  point,
  unpoint,
  roomAt,
  TOTAL_AREA,
  LAYOUT,
  applyLayout,
} from "./plan.js";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  stage = $("#stage"),
  canvas = $("#scene"),
  state = {
    ready: false,
    mode: "welcome",
    floor: 0,
    room: "living",
    light: "day",
    quality: innerWidth > 900 ? "high" : "balanced",
    tour: false,
  },
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let renderer,
  scene,
  camera,
  controls,
  house,
  garden,
  materials,
  walk,
  world,
  sun,
  hemisphere,
  sky,
  ultra = null,
  cameraTween = null,
  tourTimer = null,
  revision = 0,
  frames = 0,
  mirrorRenders = 0,
  lastTime = 0,
  toastTimer,
  lastFloor = 0,
  raf = null,
  firstPaint = false,
  renderedRevision = -1,
  lastRender = 0,
  lastLightZone = "",
  frameMs = 0,
  productTextures,
  workshop,
  project=readDraft();
applyLayout(project.layout);
const errors = [],
  resources = [],
  ray = new T.Raycaster(),
  mouse = new T.Vector2();
function status(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("show"), 2800);
}
function invalidate() {
  revision++;
  if (renderer) renderer.shadowMap.needsUpdate = true;
}
function size() {
  // CSS 100dvh owns the viewport height. A cached pixel height can leave the
  // navigation below the screen during a mobile browser/orientation resize.
  if (!renderer) return;
  const w = canvas.clientWidth,
    height = canvas.clientHeight,
    phone = w < 700,
    ratio = Math.min(
      devicePixelRatio || 1,
      state.quality === "high" ? 1.8 : 1.5,
      Math.sqrt(
        (state.quality === "high" ? 3500000 : 2100000) /
          Math.max(1, w * height),
      ),
    );
  renderer.setPixelRatio(ratio);
  renderer.setSize(w, height, false);
  camera.aspect = w / height;
  camera.updateProjectionMatrix();
  ultra?.resize(w, height, ratio);
  invalidate();
}
window.addEventListener("resize", size);
window.visualViewport?.addEventListener("resize", size);
function progress(value, text) {
  $("#load-progress").style.width = Math.min(100, value) + "%";
  if (text) $("#loading-text").textContent = text;
}
function locate() {
  if (!walk?.active) return;
  const p = camera.position,
    base = walk.ground,
    floor = base > LEVEL_HEIGHT * 0.65 ? 1 : 0;
  const [x, z] = unpoint(p.x, p.z),
    room = roomAt(x, z, floor);
  state.floor = floor;
  if (room && state.room !== room.id) {
    state.room = room.id;
    locationUI();
  }
  if (floor !== lastFloor) {
    lastFloor = floor;
    locationUI();
  }
  $("#compass-needle").style.transform =
    "rotate(" + (-camera.rotation.y * 180) / Math.PI + "deg)";
}
function updateActiveLights() {
  if (!house) return;
  const key = [state.mode, state.floor, state.room, state.light].join(":");
  if (key === lastLightZone) return;
  lastLightZone = key;
  const indoor = state.mode === "visit" || state.mode === "model",
    candidates = house.spots
      .filter((s) => s.floor === state.floor)
      .map((s) => {
        s.light.getWorldPosition(tmp);
        return { s, d: tmp.distanceTo(camera.position) };
      })
      .sort((a, b) => a.d - b.d),
    active = new Set(
      candidates
        .slice(0, indoor ? 6 : state.light === "night" ? 6 : 0)
        .map((x) => x.s),
    );
  for (const s of house.spots) s.light.visible = active.has(s);
  if (state.mode === "visit")
    for (const f of house.floors) f.group.visible = true;
}
function locationUI() {
  const r = ROOMS.find((r) => r.id === state.room);
  $("#floor-label").textContent =
    state.mode === "exterior"
      ? "LA MAISON & SON JARDIN"
      : state.floor
        ? "ÉTAGE · " +
          ROOMS.filter((r) => r.floor === 1)
            .reduce((s, r) => s + r.area, 0)
            .toFixed(1)
            .replace(".", ",") +
          " M²"
        : "REZ-DE-CHAUSSÉE · " +
          ROOMS.filter((r) => r.floor === 0)
            .reduce((s, r) => s + r.area, 0)
            .toFixed(1)
            .replace(".", ",") +
          " M²";
  $("#location-title").textContent =
    state.mode === "exterior"
      ? "Une ouverture sur le jardin"
      : state.mode === "model"
        ? "La maison, en volume"
        : r?.id === "living"
          ? "La pièce de vie"
          : r?.name || "La maison";
  $("#location-description").textContent =
    state.mode === "exterior"
      ? "Terrasse, pergola et jardin méditerranéen."
      : state.mode === "model"
        ? "Tournez autour de votre niveau pour en explorer chaque détail."
        : r?.description ||
          (r?.area.toFixed(1).replace(".", ",") || "") +
            " m² · matières et détails à vivre";
  $$("[data-floor]").forEach((b) =>
    b.setAttribute("aria-pressed", String(+b.dataset.floor === state.floor)),
  );
  $$("[data-mode]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode)),
  );
  $("#movement").hidden = state.mode !== "visit";
  updateActiveLights();
}
function closePanels() {
  workshop?.close();
  for (const id of ["room-panel", "settings-panel"]) $("#" + id).hidden = true;
  $("#rooms-open").setAttribute("aria-expanded", "false");
  $("#settings-open").setAttribute("aria-expanded", "false");
}
function pose(position, target, floor = 0, animate = true) {
  const p = new T.Vector3(...point(...position));
  p.y += floor * LEVEL_HEIGHT;
  const t = new T.Vector3(...point(...target));
  t.y += floor * LEVEL_HEIGHT;
  cameraTween = null;
  if (walk.active) {
    walk.setPose(p, t);
    controls.target.copy(t);
    invalidate();
    return;
  }
  if (animate && !reduced)
    cameraTween = {
      start: performance.now(),
      duration: 900,
      from: camera.position.clone(),
      to: p,
      targetFrom: controls.target.clone(),
      targetTo: t,
    };
  else {
    camera.position.copy(p);
    controls.target.copy(t);
    controls.update();
  }
  invalidate();
}
function safeRoomPose(room) {
  const y = room.floor * LEVEL_HEIGHT + 0.02;
  const requested = new T.Vector3(...point(room.view[0], y, room.view[2]));
  if (world.passable(requested.x, requested.z, y, { ignoreSteps: true }))
    return [room.view[0], 1.6, room.view[2]];
  const [minX, maxX, minZ, maxZ] = [
    Math.min(...room.polygon.map((p) => p[0])),
    Math.max(...room.polygon.map((p) => p[0])),
    Math.min(...room.polygon.map((p) => p[1])),
    Math.max(...room.polygon.map((p) => p[1])),
  ];
  let best = null,
    dist = Infinity;
  for (let x = minX + 0.28; x < maxX - 0.22; x += 0.22)
    for (let z = minZ + 0.28; z < maxZ - 0.22; z += 0.22) {
      if (!roomAt(x, z, room.floor) || roomAt(x, z, room.floor).id !== room.id)
        continue;
      const p = point(x, y, z);
      if (world.passable(p[0], p[2], y, { ignoreSteps: true })) {
        const d = Math.hypot(x - room.view[0], z - room.view[2]);
        if (d < dist) {
          dist = d;
          best = [x, 1.6, z];
        }
      }
    }
  return best || room.view;
}
function setMode(mode, { keepPose = false } = {}) {
  if (!state.ready) return;
  state.mode = mode;
  document.body.dataset.mode = mode;
  $("#welcome").hidden = true;
  $("#experience").hidden = false;
  $("#plan-panel").hidden = mode !== "plan";
  closePanels();
  garden.root.visible = mode !== "model" && mode !== "plan";
  sky.visible = mode !== "model" && mode !== "plan";
  scene.background.set(
    mode === "model" || mode === "plan" ? "#e9e6dc" : "#ccd5cf",
  );
  walk.setActive(false);
  house.show(
    mode === "model" || mode === "plan"
      ? "model"
      : mode === "exterior"
        ? "exterior"
        : "visit",
    state.floor,
  );
  if (mode === "visit") {
    const room = ROOMS.find((r) => r.id === state.room) || ROOMS[0];
    const view = safeRoomPose(room);
    pose(view, room.look, room.floor, false);
    walk.setActive(true);
    $("#hint").textContent =
      innerWidth < 700
        ? "Glissez pour regarder · touchez le sol pour avancer"
        : "ZQSD / WASD pour marcher · glissez pour regarder · cliquez au sol";
  } else if (mode === "model") {
    const centerY = state.floor * LEVEL_HEIGHT + 0.6;
    const height = innerWidth < 700 ? 18 : 15;
    pose([14, height, 15], [5, centerY, 4], 0, true);
    $("#hint").textContent =
      "Glissez pour tourner · pincez ou utilisez la molette pour zoomer";
  } else if (mode === "exterior") {
    pose(VIEWS.garden.position, VIEWS.garden.look, 0, true);
    $("#hint").textContent = "Explorez la maison et son jardin en 3D";
  } else renderPlan();
  locationUI();
  invalidate();
}
function goRoom(id) {
  const r = ROOMS.find((r) => r.id === id);
  if (!r) return false;
  stopTour(false);
  state.room = r.id;
  state.floor = r.floor;
  setMode("visit");
  status(r.name + " · " + r.area.toFixed(1).replace(".", ",") + " m²");
  return true;
}
function setFloor(floor) {
  if (![0, 1].includes(floor)) return;
  state.floor = floor;
  state.room = floor ? "gallery" : "living";
  if (state.mode === "plan") renderPlan();
  else if (state.mode === "model") setMode("model");
  else if (state.mode === "exterior") setMode("model");
  else goRoom(state.room);
  locationUI();
  invalidate();
}
function renderRooms() {
  $("#total-room-area").textContent=TOTAL_AREA.toFixed(2).replace(".",",")+" m²";
  $("#welcome-area").textContent=TOTAL_AREA.toFixed(1).replace(".",",");
  const p = $("#room-list");
  p.replaceChildren();
  for (const floor of [0, 1]) {
    const h = document.createElement("p");
    h.textContent = floor ? "01 / ÉTAGE" : "00 / REZ-DE-CHAUSSÉE";
    p.append(h);
    for (const r of ROOMS.filter((r) => r.floor === floor)) {
      const b = document.createElement("button");
      b.dataset.room = r.id;
      b.textContent = r.name;
      const s = document.createElement("span");
      s.textContent = r.area.toFixed(1).replace(".", ",") + " m² ↗";
      b.append(s);
      b.onclick = () => goRoom(r.id);
      p.append(b);
    }
  }
}
function renderPlan() {
  const f = state.floor,
    rooms = ROOMS.filter((r) => r.floor === f);
  $("#plan-title").textContent = f ? "L’étage" : "Le rez-de-chaussée";
  const colors = { wood: "#d6c3a5", tile: "#e1dacb", stone: "#bbc6b8" },
    labels = {
      living: ["Salon · cuisine", "Salle à manger"],
      office: ["Bureau / amis"],
      entry: ["Entrée", "Escalier"],
      shower: ["Salle d’eau"],
      "wc-ground": ["WC"],
      utility: ["Cellier"],
      suite: ["Suite parentale"],
      "bedroom-2": ["Chambre sauge"],
      "bedroom-3": ["Chambre argile"],
      bathroom: ["Salle de bains"],
      "wc-first": ["WC"],
      wardrobe: ["Dressing"],
      gallery: ["Bibliothèque", "Palier"],
    };
  let s =
    `<svg viewBox="-30 -45 ${LAYOUT.width*100+60} ${LAYOUT.depth*100+100}" role="img" aria-label="Plan du ` +
    (f ? "premier étage" : "rez-de-chaussée") +
    '"><defs><pattern id="wood" width="120" height="18" patternUnits="userSpaceOnUse"><rect width="120" height="18" fill="#dac9ae"/><path d="M0 0H120V18H0Z" fill="none" stroke="#c9b698" stroke-width="1"/></pattern><pattern id="tile" width="120" height="60" patternUnits="userSpaceOnUse"><rect width="120" height="60" fill="#e3dfd4"/><path d="M0 0H120V60H0Z" fill="none" stroke="#cfcec1" stroke-width="1"/></pattern></defs>';
  for (const r of rooms) {
    const poly = r.polygon.map(([x, z]) => [x * 100, z * 100]),
      xs = poly.map((p) => p[0]),
      zs = poly.map((p) => p[1]);
    let x = (Math.min(...xs) + Math.max(...xs)) / 2,
      z = (Math.min(...zs) + Math.max(...zs)) / 2;
    if (r.id === "entry") {
      x = 602;
      z = 210;
    }
    if (r.id === "gallery") {
      x = 545;
      z = 565;
    }
    if (r.id === "living") {
      x = 540;
      z = 560;
    }
    const lines = labels[r.id] || [r.name];
    s += `<g data-room="${r.id}" tabindex="0" role="button" aria-label="Visiter ${r.name}"><polygon points="${poly.map((p) => p.join(",")).join(" ")}" fill="${r.flooring === "stone" ? colors.stone : "url(#" + (r.flooring === "wood" ? "wood" : "tile") + ")"}" stroke="#f8f4e9" stroke-width="3"/><text x="${x}" y="${z - (lines.length - 1) * 13}" text-anchor="middle" fill="#3c4d3b" font-family="Arial" font-size="${r.area < 4 ? 19 : 23}">${lines.map((l, i) => `<tspan x="${x}" dy="${i ? 27 : 0}">${l}</tspan>`).join("")}<tspan x="${x}" dy="28" fill="#7e876f" font-size="19">${r.area.toFixed(1).replace(".", ",")} m²</tspan></text></g>`;
  }
  for (const w of WALLS.filter((w) => w.floor === f)) {
    const dx = w.b[0] - w.a[0],
      dz = w.b[1] - w.a[1],
      L = Math.hypot(dx, dz),
      u = [dx / L, dz / L];
    let end = 0;
    for (const o of [
      ...w.openings.sort((a, b) => a.u - b.u),
      { u: L, width: 0 },
    ]) {
      const left = o.u - o.width / 2;
      if (left > end)
        s += `<path d="M${(w.a[0] + u[0] * end) * 100} ${(w.a[1] + u[1] * end) * 100} L${(w.a[0] + u[0] * left) * 100} ${(w.a[1] + u[1] * left) * 100}" stroke="#59604f" stroke-width="${w.outside ? 16 : 10}"/>`;
      end = o.u + o.width / 2;
    }
  }
  s += `<rect x="308" y="18" width="224" height="298" fill="#f0ecdf" stroke="#a6ac99" stroke-width="2"/>`;
  for (let i = 0; i < 8; i++)
    s += `<path d="M308 ${118 + i * 24.75} H414 M426 ${118 + i * 24.75} H532" stroke="#a5a791" stroke-width="2"/>`;
  s +=
    `<path d="M361 296V68H479V296" stroke="#4f6447" stroke-width="3" fill="none"/><path d="M469 281L479 299L489 281" fill="none" stroke="#4f6447" stroke-width="3"/><text x="${LAYOUT.width*50}" y="${LAYOUT.depth*100+45}" font-family="Arial" font-size="17" text-anchor="middle" fill="#839078">${TOTAL_AREA.toFixed(2).replace(".",",")} m² · Hauteur sous plafond 2,60 m · Dimensions intérieures</text></svg>`;
  $("#plan-drawing").innerHTML = s;
  $("#plan-drawing")
    .querySelectorAll("[data-room]")
    .forEach((b) => {
      b.onclick = () => goRoom(b.dataset.room);
      b.onkeydown = (e) => {
        if (e.key === "Enter") goRoom(b.dataset.room);
      };
    });
}
function setLight(id) {
  if (!["day", "golden", "night"].includes(id)) return;
  state.light = id;
  const p = {
    day: {
      sun: 2.55,
      env: 0.48,
      hemi: 0.65,
      color: "#fff8e9",
      pos: [-8, 12, 15],
      exposure: 1.05,
      indoor: 1.0,
      sky: [0.2, 0.6, 0.8],
    },
    golden: {
      sun: 3.1,
      env: 0.38,
      hemi: 0.42,
      color: "#ffd5a1",
      pos: [-13, 6, 15],
      exposure: 1.08,
      indoor: 1.5,
      sky: [-0.7, 0.22, 0.6],
    },
    night: {
      sun: 0.03,
      env: 0.13,
      hemi: 0.18,
      color: "#b8cef3",
      pos: [-8, 14, 10],
      exposure: 1.25,
      indoor: 3.2,
      sky: [0.4, -0.15, 0.5],
    },
  }[id];
  sun.intensity = p.sun;
  sun.color.set(p.color);
  sun.position.set(...p.pos);
  const hour=Number($('#sun-hour')?.value||14),az=(hour-12)/12*Math.PI;
  if(id!=='night')sun.position.set(Math.sin(az)*16,Math.max(4,Math.cos(az)*15),14);
  sun.target.position.set(0, 1, 0);
  hemisphere.intensity = p.hemi;
  scene.environmentIntensity = p.env;
  renderer.toneMappingExposure = p.exposure;
  sky.material.uniforms.sunPosition.value.set(...p.sky).normalize();
  sky.material.uniforms.turbidity.value = id === "night" ? 2 : 8;
  sky.material.uniforms.rayleigh.value = id === "night" ? 0.15 : 1.6;
  materials.led.emissiveIntensity = id === "night" ? 3.5 : 1.6;
  for (const s of house.spots)
    s.light.intensity =
      s.base *
      (s.portal
        ? id === "night"
          ? 0.08
          : id === "golden"
            ? 0.85
            : 1
        : p.indoor);
  $$("[data-light]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.light === id)),
  );
  updateActiveLights();
  invalidate();
}
function setQuality(id) {
  if (!["balanced", "high"].includes(id)) return false;
  state.quality = id;
  if (ultra) {
    ultra.dispose();
    ultra = null;
  }
  if (id === "high") {
    ultra = createUltraPipeline(renderer, scene, camera);
    ultra.ao.blendIntensity = 0.45;
    ultra.ao.updateGtaoMaterial({
      radius: 0.22,
      thickness: 0.1,
      distanceFallOff: 0.5,
      samples: 16,
      screenSpaceRadius: false,
    });
  }
  const shadow = id === "high" ? 4096 : innerWidth < 700 ? 1536 : 3072;
  sun.shadow.mapSize.set(shadow, shadow);
  sun.shadow.map?.dispose();
  sun.shadow.map = null;
  size();
  $("#quality").value = id;
  status(
    id === "high"
      ? "Haute qualité : ombres de contact activées"
      : "Affichage équilibré",
  );
  return true;
}
function interact(e) {
  if (!state.ready) return;
  const r = canvas.getBoundingClientRect();
  mouse.set(
    ((e.clientX - r.left) / r.width) * 2 - 1,
    (-(e.clientY - r.top) / r.height) * 2 + 1,
  );
  ray.setFromCamera(mouse, camera);
  const hits = ray.intersectObject(house.root, true);
  for (const hit of hits) {
    let o = hit.object,
      action = null;
    while (o) {
      if (o.userData.action) {
        action = o.userData.action;
        break;
      }
      o = o.parent;
    }
    if (action) {
      if (action.kind === "door" || action.kind === "bay") {
        const d = action.item;
        d.open = !d.open;
        d.target = d.open ? (d.asset ? 0.93 : 1) : 0;
        status(d.open ? "Ouverture" : "Fermeture");
      } else if (action.kind === "drawer") {
        action.open = !action.open;
        status(action.open ? "Tiroirs ouverts" : "Tiroirs fermés");
      }
      invalidate();
      return;
    }
    if (hit.object.userData.room && walk.active) {
      walk.walkTo(hit.point);
      return;
    }
    if (hit.distance < 0.2) continue;
    if (
      hit.object.name.startsWith("Mur_") ||
      hit.object.name.includes("Mur_plein")
    )
      break;
  }
  if (walk.active) {
    const floor = ray
      .intersectObject(garden.root, true)
      .find(
        (h) =>
          h.object.name === "Terrain_paysager" ||
          h.object.name === "Terrasse_pierre_naturelle",
      );
    if (floor) walk.walkTo(floor.point);
  }
}
function stopTour(reset = true) {
  if (tourTimer) clearTimeout(tourTimer);
  tourTimer = null;
  state.tour = false;
  $("#tour-badge").hidden = true;
  if (reset) status("Visite guidée arrêtée");
}
function startTour() {
  stopTour(false);
  const stops = [
    { room: "living", name: "La pièce de vie" },
    { special: "kitchen", name: "La cuisine et son îlot" },
    { room: "shower", name: "La salle d’eau" },
    { room: "wc-ground", name: "Le WC invités" },
    { room: "office", name: "Le bureau / chambre d’amis" },
    { room: "suite", name: "La suite parentale" },
    { room: "bedroom-2", name: "La chambre sauge" },
    { room: "bedroom-3", name: "La chambre argile" },
    { room: "bathroom", name: "La salle de bains" },
    { room: "gallery", name: "La bibliothèque" },
    { special: "garden", name: "Le jardin" },
  ];
  let i = 0;
  function step() {
    if (i >= stops.length) {
      stopTour(false);
      status("La maison est à vous. Bonne visite.");
      return;
    }
    const stop = stops[i++];
    if (stop.room) goRoom(stop.room);
    else if (stop.special === "garden") setMode("exterior");
    else {
      state.room = "living";
      state.floor = 0;
      setMode("visit");
      const v = VIEWS[stop.special];
      pose(v.position, v.look, v.floor, false);
    }
    state.tour = true;
    $("#tour-badge").hidden = false;
    $("#tour-title").textContent =
      String(i).padStart(2, "0") + " / " + stops.length + " · " + stop.name;
    tourTimer = setTimeout(step, 8500);
  }
  step();
}
function updateMaquette() {
  if (state.mode !== "model" && state.mode !== "plan") return;
  for (const f of house.floors)
    for (const wall of f.walls) {
      if (!wall.outside) {
        wall.group.visible = true;
        continue;
      }
      const midpoint = new T.Vector3(
        wall.worldA[0],
        f.group.position.y + 1.2,
        wall.worldA[2],
      );
      wall.group.visible =
        camera.position.clone().sub(midpoint).dot(wall.normal) > -0.05;
    }
}
function architectureCapture(fn) {
  const states = [],
    set = (o, value) => {
      if (!o) return;
      states.push([o, o.visible]);
      o.visible = value;
    };
  for (const f of house.floors) {
    set(f.group, true);
    set(f.ceilings, true);
    for (const w of f.walls) set(w.group, true);
  }
  set(house.roof, true);
  set(house.slab, true);
  try {
    return fn();
  } finally {
    states.reverse().forEach(([o, v]) => (o.visible = v));
  }
}
function installMirrors() {
  for (const { mirror, floor, root } of house.mirrors) {
    const capture = mirror.onBeforeRender.bind(mirror);
    let at = -1000,
      lastRevision = -1,
      lastPosition = new T.Vector3(999, 999, 999),
      first = true;
    mirror.onBeforeRender = (...args) => {
      if (scene.overrideMaterial || state.mode !== "visit") return;
      root.getWorldPosition(tmp);
      if (camera.position.distanceTo(tmp) > 6.0) return;
      const now = performance.now();
      if (
        !first &&
        now - at < 130 &&
        lastRevision === revision &&
        camera.position.distanceTo(lastPosition) < 0.04
      )
        return;
      first = false;
      at = now;
      lastRevision = revision;
      lastPosition.copy(camera.position);
      architectureCapture(() => capture(...args));
      mirrorRenders++;
    };
  }
}
const tmp = new T.Vector3();
function updateCamera(t) {
  if (!cameraTween) return false;
  const k = Math.min(1, (t - cameraTween.start) / cameraTween.duration),
    e = k * k * (3 - 2 * k);
  camera.position.lerpVectors(cameraTween.from, cameraTween.to, e);
  controls.target.lerpVectors(cameraTween.targetFrom, cameraTween.targetTo, e);
  controls.update();
  if (k === 1) cameraTween = null;
  return true;
}
function frame(t) {
  raf = requestAnimationFrame(frame);
  if (document.hidden) return;
  const dt = Math.min(0.05, (t - lastTime) / 1000 || 0.016);
  lastTime = t;
  let changed = updateCamera(t);
  if (walk?.active) {
    changed = walk.tick(dt) || changed;
    locate();
  } else controls?.update();
  if (house?.updateDoors(dt)) {
    changed = true;
    invalidate();
  }
  updateMaquette();
  if (garden?.water) {
    const a = garden.water.geometry.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i),
        y = a.getY(i);
      a.setZ(
        i,
        Math.sin(x * 5 + t * 0.00065) * Math.cos(y * 4 + t * 0.00051) * 0.0025,
      );
    }
    a.needsUpdate = true;
  }
  if (state.mode === "welcome" && firstPaint && !reduced) {
    const theta = Math.sin(t * 0.00004) * 0.045;
    camera.position.x = 11.5 + theta * 15;
    camera.lookAt(new T.Vector3(...point(5, 1.8, 4.6)));
  }
  const animated =
      !reduced && (state.mode === "welcome" || state.mode === "exterior"),
    dirty =
      changed ||
      renderedRevision !== revision ||
      !firstPaint ||
      (animated && t - lastRender > 100);
  if (dirty && t - lastRender > 30) {
    const start = performance.now();
    renderer.info.reset();
    if (ultra) ultra.render(dt);
    else renderer?.render(scene, camera);
    frameMs = performance.now() - start;
    lastRender = t;
    renderedRevision = revision;
    frames++;
  }
  if (!firstPaint && state.ready) {
    firstPaint = true;
    $("#loading").hidden = true;
    $("#welcome").hidden = false;
  }
}
function focusRoom(id){
  const r=ROOMS.find(r=>r.id===id);if(!r)return;
  const x=r.polygon.reduce((n,p)=>n+p[0],0)/r.polygon.length,z=r.polygon.reduce((n,p)=>n+p[1],0)/r.polygon.length;
  state.room=id;state.floor=r.floor;setMode('model');
  pose([x+2.4,7.4,z+3.1],[x,.3,z],r.floor,false);workshop.open(id);invalidate();
}
function setPaint(id,color){
  const m=house.paintMaterials.get(id);if(!m)return;
  m.color.set(color);project.rooms[id].paint=color;saveDraft(project);invalidate();
}
async function setSurfaces(ids,spec){
  if(!ids.length||ids.some(id=>!ROOMS.some(r=>r.id===id)))throw Error('Pièce inconnue.');
  const next=structuredClone(project);for(const id of ids)next.rooms[id].floor=structuredClone(spec);validateProject(next);
  const previous=structuredClone(project);
  try{for(const id of ids)await house.setFloorSurface(id,spec);project=next;saveDraft(project);invalidate();}
  catch(e){for(const id of ids)await house.setFloorSurface(id,previous.rooms[id].floor);invalidate();throw e;}
}
function disposeHouse(old,next){
  const keepM=new Set(),keepT=new Set();
  const keep=m=>{if(!m?.isMaterial)return;keepM.add(m);for(const v of Object.values(m))if(v?.isTexture)keepT.add(v);};
  for(const v of Object.values(materials))if(Array.isArray(v))v.forEach(keep);else keep(v);
  next.root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])keep(m);});
  const gs=new Set(),ms=new Set();old.root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);});
  for(const tx of productTextures.resources)keepT.add(tx);
  gs.forEach(g=>g.dispose());
  const disposableTextures=new Set();for(const m of ms)if(!keepM.has(m))for(const tx of Object.values(m))if(tx?.isTexture&&!keepT.has(tx))disposableTextures.add(tx);
  disposableTextures.forEach(tx=>tx.dispose());
  // Product maps are cached for reuse when returning to a saved selection.
  for(const m of ms)if(!keepM.has(m))m.dispose();
  for(const m of old.mirrors)m.mirror.getRenderTarget?.().dispose();
  scene.remove(old.root);
}
async function rebuildHouse(raw){
  const next=validateProject(raw),previousLayout=structuredClone(project.layout),old=house;
  const workshopWasOpen=!$("#workshop-panel").hidden,workshopRoom=workshop?.activeRoom;
  walk.stop();walk.setActive(false);
  try{
    applyLayout(next.layout);
    const temporary=new T.Scene(),built=await buildHouse(temporary,materials,next,productTextures);
    const envelopeChanged=Math.abs(previousLayout.width-next.layout.width)>1e-9||Math.abs(previousLayout.depth-next.layout.depth)>1e-9;
    const builtGarden=envelopeChanged?buildGarden(temporary,materials):null;
    // Prepare both scene graphs before replacing the live project.
    scene.add(built.root);house=built;project=next;
    disposeHouse(old,built);
    if(builtGarden){
      const previousGarden=garden;garden=builtGarden;scene.add(garden.root);
      const geometries=new Set(),mats=new Set();previousGarden.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);});
      geometries.forEach(g=>g.dispose());const shared=new Set(Object.values(materials).filter(m=>m?.isMaterial));mats.forEach(m=>{if(!shared.has(m))m.dispose();});scene.remove(previousGarden.root);
    }
    world=collisionWorld(house,garden);walk.setWorld(world);
    installMirrors();lastLightZone='';setLight(state.light);renderRooms();
    // A safe room viewpoint is recomputed against the new walls and furniture.
    const mode=state.mode==='welcome'?'model':state.mode;
    setMode(mode);locationUI();saveDraft(project);workshop?.refresh();if(workshopWasOpen)workshop.open(workshopRoom);invalidate();
    return true;
  }catch(e){applyLayout(previousLayout);walk.setActive(state.mode==='visit');throw e;}
}
function bindUI() {
  $("#enter").onclick = () => setMode("visit");
  $("#explore-model").onclick = () => setMode("model");
  $("#brand").onclick = (e) => {
    e.preventDefault();
    if (!state.ready) return;
    closePanels();
    stopTour(false);
    state.mode = "welcome";
    document.body.dataset.mode = "welcome";
    $("#welcome").hidden = false;
    $("#experience").hidden = true;
    walk.setActive(false);
    house.show("exterior");
    garden.root.visible = true;
    sky.visible = true;
    camera.position.set(11.5, 7.2, 14.8);
    controls.target.set(...point(5, 1.8, 4.6));
    controls.update();
    invalidate();
  };
  $$("[data-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        stopTour(false);
        setMode(b.dataset.mode);
      }),
  );
  $$("[data-floor]").forEach(
    (b) =>
      (b.onclick = () => {
        stopTour(false);
        setFloor(+b.dataset.floor);
      }),
  );
  $("#rooms-open").onclick = () => {
    const open = $("#room-panel").hidden;
    closePanels();
    $("#room-panel").hidden = !open;
    $("#rooms-open").setAttribute("aria-expanded", String(open));
  };
  $("#rooms-close").onclick = closePanels;
  $("#settings-open").onclick = () => {
    const open = $("#settings-panel").hidden;
    closePanels();
    $("#settings-panel").hidden = !open;
    $("#settings-open").setAttribute("aria-expanded", String(open));
  };
  $("#settings-close").onclick = closePanels;
  $("#home-view").onclick = () => setMode("model");
  $("#tour-start").onclick = startTour;
  $("#tour-stop").onclick = () => stopTour();
  $$("[data-light]").forEach(
    (b) => (b.onclick = () => setLight(b.dataset.light)),
  );
  $$("[data-paint]").forEach(
    (b) =>
      (b.onclick = () => {
        setPaint(state.room,b.dataset.paint);
        workshop?.refresh();
      }),
  );
  $("#sun-hour").oninput=e=>{$("#sun-hour-label").textContent=e.target.value+" h";setLight(state.light);};
  $("#quality").onchange = (e) => setQuality(e.target.value);
  $("#help-open").onclick = () => $("#help").showModal();
  $("#help-close").onclick = () => $("#help").close();
  $("#help-go").onclick = () => $("#help").close();
  $("#fullscreen").onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else
      stage
        .requestFullscreen?.()
        .catch(() => status("Le plein écran dépend de votre navigateur."));
  };
  $("#capture").onclick = () => {
    try {
      if(ultra)ultra.render(0);else renderer.render(scene, camera);
      const a = document.createElement("a");
      a.download = "maison-3d-leroyfactory.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
      status("Vue enregistrée");
    } catch {
      status("La capture n’est pas disponible sur ce navigateur.");
    }
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePanels();
      if (state.tour) stopTour();
    }
  });
  canvas.addEventListener("click", (e) => {
    if (!walk?.active && state.mode !== "welcome") interact(e);
  });
}
async function start() {
  try {
    size();
    RectAreaLightUniformsLib.init();
    renderer = new T.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    configureColourRendering(renderer);
    renderer.info.autoReset = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    scene = new T.Scene();
    scene.background = new T.Color("#ccd5cf");
    scene.fog = new T.FogExp2("#c6d0c6", 0.006);
    camera = new T.PerspectiveCamera(47, 1, 0.045, 350);
    camera.position.set(11.5, 7.2, 14.8);
    controls = configureNavigation(new OrbitControls(camera, canvas), true);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 48;
    controls.minDistance = 0.65;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(...point(5, 1.8, 4.6));
    controls.update();
    controls.addEventListener("change", () => {
      revision++;
    });
    size();
    sky = new Sky();
    sky.scale.setScalar(250);
    scene.add(sky);
    const u = sky.material.uniforms;
    u.turbidity.value = 8;
    u.rayleigh.value = 1.6;
    u.mieCoefficient.value = 0.005;
    u.mieDirectionalG.value = 0.8;
    hemisphere = new T.HemisphereLight("#e4edf1", "#b2a18b", 0.65);
    scene.add(hemisphere);
    sun = new T.DirectionalLight("#fff8e9", 2.5);
    sun.castShadow = true;
    sun.position.set(-8, 12, 15);
    sun.target.position.set(0, 1, 0);
    scene.add(sun, sun.target);
    Object.assign(sun.shadow.camera, {
      left: -14,
      right: 14,
      top: 12,
      bottom: -12,
      near: 0.5,
      far: 70,
    });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.mapSize.set(
      innerWidth < 700 ? 1536 : 3072,
      innerWidth < 700 ? 1536 : 3072,
    );
    sun.shadow.bias = -0.00005;
    sun.shadow.normalBias = 0.006;
    sun.shadow.radius = 2.4;
    progress(6, "Matières naturelles et lumière du jour…");
    materials = await createMaterials(renderer, scene, (n) =>
      progress(8 + n * 35),
    );
    progress(47, "Construction des deux niveaux et de l’escalier…");
    productTextures=createProductTextures(renderer);
    house = await buildHouse(scene, materials,project,productTextures);
    progress(75, "Jardin, terrasse et mobilier extérieur…");
    garden = buildGarden(scene, materials);
    world = collisionWorld(house, garden);
    walk = createHouseWalk({
      camera,
      canvas,
      controls,
      world,
      onChange: () => {
        revision++;
      },
      onInteract: interact,
      onStatus: status,
    });
    const renderShadow = renderer.shadowMap.render.bind(renderer.shadowMap);
    renderer.shadowMap.render = (...args) =>
      architectureCapture(() => renderShadow(...args));
    installMirrors();
    bindUI();
    workshop=mountWorkshop({getHouse:()=>house,getProject:()=>project,getState:()=>state,goRoom,focusRoom,setMode,closePanels,stopTour,status,onPanel:size,setPaint,setLayout:async layout=>{const next=structuredClone(project);next.layout=layout;await rebuildHouse(next);},setBathroom:async(id,s)=>{const next=structuredClone(project);next.bathrooms[id]=s;await rebuildHouse(next);},setSurfaces,replaceProject:rebuildHouse});
    renderRooms();
    house.show("exterior");
    setLight("day");
    progress(100, "Bienvenue dans Maison 3D LeroyFactory.");
    state.ready = true;
    if (state.quality === "high") setQuality("high");
    updateActiveLights();
    window.maison3D = {
      workshop:{open:(id)=>workshop.open(id),close:()=>workshop.close(),setTab:id=>workshop.setTab(id),getProject:()=>structuredClone(project),getTakeoffs:()=>allTakeoffs(house),setSurfaces,setLayout:async layout=>{const next=structuredClone(project);next.layout=layout;await rebuildHouse(next);},setBathroom:async(id,s)=>{const next=structuredClone(project);next.bathrooms[id]=s;await rebuildHouse(next);},replaceProject:rebuildHouse},
      getState: () => ({
        ...state,
        camera: camera.position.toArray(),
        ground: walk.ground,
        area: TOTAL_AREA,
        rooms: ROOMS.map((r) => ({
          id: r.id,
          name: r.name,
          floor: r.floor,
          area: r.area,
        })),
        program: PROGRAM,
      }),
      getDiagnostics: () => {
        let meshes = 0,
          vertices = 0;
        scene.traverse((o) => {
          if (o.isMesh) {
            meshes++;
            vertices +=
              (o.geometry?.attributes.position?.count || 0) *
              (o.isInstancedMesh ? o.count : 1);
          }
        });
        return {
          three: T.REVISION,
          engine: "STUDIO ONE BETA V2 · RANDAL Général",
          meshes,
          vertices,
          frames,
          frameMs: Math.round(frameMs),
          activeLights: house.spots.filter((s) => s.light.visible).length,
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          mirrorRenders,
          assetCount: house.assets.length,
          doors: house.doors.length,
          windows: house.windows.length,
          spotCount: house.spots.length,
          stairs: { risers: 16, levelHeight: LEVEL_HEIGHT, well: WELL },
          ready: state.ready,
          errors,
          materialFailures: materials.failures,
          source: "Independent branch; original configurators unmodified",
        };
      },
      goRoom,
      setFloor,
      setMode,
      setLight,
      setQuality,
      startTour,
      stopTour,
      openDoor: (id, open = true) => {
        const d = [...house.doors, ...house.windows].find((d) => d.id === id);
        if (!d) return false;
        d.open = open;
        d.target = open ? (d.asset ? 0.93 : 1) : 0;
        invalidate();
        return true;
      },
      debugMove: (dx, dz) => {
        const result = walk.debugMove(dx, dz);
        revision++;
        return result;
      },
      canStand: (x, z, height) => world.passable(x, z, height),
      getRoomPose: (id) => {
        const r = ROOMS.find((r) => r.id === id);
        return r ? safeRoomPose(r) : null;
      },
      walkTo: (x, z) => walk.walkTo(new T.Vector3(x, walk.ground, z)),
      setPose: (p, t, floor = 0) => {
        state.floor = floor;
        if (!walk.active) setMode("visit");
        pose(p, t, floor, false);
      },
      getRouteToRoom: (id) => {
        const r = ROOMS.find((r) => r.id === id);
        if (!r) return [];
        const v = safeRoomPose(r),
          t = new T.Vector3(
            ...point(v[0], r.floor * LEVEL_HEIGHT + 0.02, v[2]),
          );
        return world
          .route(
            new T.Vector3(camera.position.x, walk.ground, camera.position.z),
            t,
          )
          .map((v) => [v.x, v.z]);
      },
      getNavigation: () => ({
        walls: house.floors
          .flatMap((f) => f.walls)
          .map((w) => ({
            id: w.id,
            floor: w.floor,
            a: w.a,
            b: w.b,
            openings: w.openings.map((o) => ({
              id: o.id,
              kind: o.kind,
              progress: o.state.progress,
            })),
          })),
        obstacles: world.obstacles,
        pathLength: walk.pathLength,
      }),
      getViewProjection: () => ({
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      }),
    };
    raf = requestAnimationFrame(frame);
  } catch (e) {
    console.error(e);
    errors.push(e.message);
    $("#loading").hidden = true;
    $("#fatal").hidden = false;
    $("#fatal-text").textContent =
      e.message || "Vérifiez la connexion et la disponibilité de WebGL.";
  }
}
start();
