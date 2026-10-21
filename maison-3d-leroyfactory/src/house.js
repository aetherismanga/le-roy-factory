import * as T from "three";
import { tiledPolygonGeometry } from "../../randal-general/src/room.js";
import { makeOpening } from "../../randal-general/src/openings.js";
import {makeColumn} from "../../randal-general/src/column.js";
import {basinColors,basinReference,resolveBasinLayout} from "../../randal-general/src/basins.js";
import {CATALOG,FINISHES,defaultFloor,defaultBathroom,normalizeBathroom,surfaceProduct} from "./products.js";
import {floorPolygon,floorHoles,tileLayout,tileGeometry,tileCounts,geometryArea} from "./takeoff.js";
import { makeModel } from "../../randal-general/src/model.js";
import {
  makeFixture,
  preloadBaths,
} from "../../randal-general/src/fixtures.js";
import { makeEquipment } from "../../randal-general/src/equipment.js";
import { makeTap, tapProduct, tapsFor } from "../../randal-general/src/taps.js";
import {
  makeCatalogueMirror,
  mirrorGeometry,
} from "../../randal-general/src/mirrors.js";
import { makeMirrorReflector } from "../../randal-general/src/mirror-reflection.js";
import { decorateAsset } from "../../randal-general/src/decor.js";
import {
  CLEAR_HEIGHT,
  SLAB,
  LEVEL_HEIGHT,
  SCALE,
  WELL,
  ROOMS,
  WALLS,
  point,
  roomAt,
  adaptPoint,
  mapPlanPoint,
  LAYOUT,
  polygonArea,
} from "./plan.js";
import {
  box,
  cylinder,
  mesh,
  group,
  tube,
  sphere,
  batchFurniture,
  setUVMetres,
  ceilingGeometry,
  reverseFace,
} from "./geometry.js";
import { textureClone } from "./materials.js";
import { furnitureKit } from "./furniture.js";
import {FURNITURE_LAYOUT} from "./furniture-layout.js";
import {createWallCoverings} from './wall-coverings.js';
import {registerAddition,specimenPlant} from './object-library.js';
import {createArrangement} from "./arrangement.js";
export async function buildHouse(scene, M, project = {}, textures) {
  await preloadBaths();
  const root = new T.Group();
  root.name = "Maison_3D_LeroyFactory";
  root.visible=false;
  scene.add(root);
  const floors = [0, 1].map((f) => {
      const g = group(
        root,
        0,
        f * LEVEL_HEIGHT,
        0,
        0,
        f ? "Étage" : "Rez_de_chaussée",
      );
      g.userData.floor=f;
      return {
        group: g,
        architecture: group(g),
        static: group(g),
        reused: group(g),
        ceilings: group(g),
        lights: group(g),
        walls: [],
        roomFloors: [],
      };
    }),
    furn = furnitureKit(M),
    doors = [],
    windows = [],
    colliders = [],
    mirrors = [],
    assets = [],
    interactives = [],
    spots = [],
    paintMaterials = new Map(),
    floorMeshes = [],
    floorSurfaces = new Map(),
    wallSurfaces = [],
    bathroomProducts = new Map();
  const arrangement=createArrangement({project,root,floors,doors});
  const tracked=[];
  // The existing plants now have visibly distinct botanical silhouettes.
  let plantVariant=0;
  furn.plant=(parent,x=0,y=0,z=0,size=1)=>{const o=specimenPlant(M,(plantVariant++)%4);o.position.set(x,y,z);o.scale.setScalar(size*.65);o.userData.furnitureKind='plant';parent.add(o);return o;};
  const world = (x, z) => point(x, 0, z),
    pos = (parent, x, y, z, rotation = 0, name) => {
      let ancestor=parent;while(ancestor&&ancestor.userData.floor===undefined)ancestor=ancestor.parent;
      const [ax,az]=adaptPoint(x,z,ancestor?.userData.floor||0);
      return group(parent, ...point(ax,y,az), rotation, name);
    };
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext("2d"),
    gradient = shadowContext.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,.28)");
  gradient.addColorStop(0.55, "rgba(0,0,0,.16)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const contactMaterial = new T.MeshBasicMaterial({
    map: new T.CanvasTexture(shadowCanvas),
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
    toneMapped: false,
  });
  const contact = (x, z, w, d, floor) => {
    const shadow = mesh(
      floors[floor].static,
      new T.PlaneGeometry(w + 0.24, d + 0.24),
      contactMaterial,
      "Ombre_contact",
      ...point(x, 0.019, z),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.castShadow = shadow.receiveShadow = false;
  };
  const obstacle = (x, z, w, d, floor, minY = 0, maxY = 2.0) =>
    colliders.push({
      x: (x - 5) * SCALE,
      z: (z - 4) * SCALE,
      w: w * SCALE,
      d: d * SCALE,
      floor,
      minY,
      maxY,
    });
  function place(object, x, z, floor, angle = 0, bounds = null, y = 0, options={}) {
    [x,z]=adaptPoint(x,z,floor);
    const p = point(x, y + 0.02 + object.position.y, z);
    object.position.set(...p);
    object.rotation.y = angle;
    floors[floor].static.add(object);
    if (bounds) {
      const swap = Math.abs(Math.sin(angle)) > 0.7;
      obstacle(
        x,
        z,
        swap ? bounds[1] : bounds[0],
        swap ? bounds[0] : bounds[1],
        floor,
        0,
        bounds[2] || 1.0,
      );
      contact(
        x,
        z,
        swap ? bounds[1] : bounds[0],
        swap ? bounds[0] : bounds[1],
        floor,
      );
    }
    tracked.push({object,kind:object.userData.furnitureKind|| (object.getObjectByName("Banquette_pied_de_lit")?"bench":"shelf"),floor,...options});
    return object;
  }
  function ownedMaterial(id) {
    if (!id) return M.exterior;
    if (!paintMaterials.has(id)) {
      const room = ROOMS.find((r) => r.id === id),
        wet = room.flooring === "stone",
        mat = wet ? textureClone(M.bathTile) : M.plaster.clone();
      if (id === "bedroom-2") mat.color.set("#b8c1ae");
      if (id === "bedroom-3") mat.color.set("#d5b7a3");
      mat.name = "Finition_mur_" + id;
      if(project.rooms?.[id]?.paint)mat.color.set(project.rooms[id].paint);
      paintMaterials.set(id, mat);
    }
    return paintMaterials.get(id);
  }
  const floorPoly = (r) =>
    r.polygon.map(([x, z]) => {
      const p = world(x, z);
      return [p[0], -p[2]];
    });
  function wellPolygon() {
    return [
      [WELL.x, WELL.z],
      [WELL.x + WELL.w, WELL.z],
      [WELL.x + WELL.w, WELL.z + WELL.d],
      [WELL.x, WELL.z + WELL.d],
    ].map(([x, z]) => {
      const p = world(x, z);
      return [p[0], -p[2]];
    });
  }
  async function floorParts(room,spec) {
    const wood=spec.kind==='parquet', product=wood?null:surfaceProduct(spec);
    if(product&&!product.collection.surfaces.includes('floor'))throw Error('Ce revêtement est réservé aux murs.');
    const format=wood?{width:1.2,height:.18}:product.format;
    const poly=floorPolygon(room),holes=floorHoles(room),layout=tileLayout(room,spec,format);
    let mats;
    if(wood){const mat=textureClone(M.oak);mat.roughness=.55;if(mat.map){mat.map.center.set(.5,.5);mat.map.rotation=Math.PI/2;}mats=[mat];}
    else mats=await textures.tile(spec);
    const geometry=tileGeometry(poly,holes,layout),keys=geometry.userData.faceCells;
    geometry.clearGroups();
    let start=0,prev=-1;
    for(let i=0;i<keys.length;i++){
      let hash=0;for(const c of keys[i])hash=(hash*31+c.charCodeAt(0))|0;
      const material=((hash% mats.length)+mats.length)%mats.length;
      if(material!==prev){if(i)geometry.addGroup(start*3,(i-start)*3,prev);start=i;prev=material;}
    }
    if(keys.length)geometry.addGroup(start*3,(keys.length-start)*3,prev);
    const area=polygonArea(poly)-holes.reduce((n,h)=>n+polygonArea(h),0);
    return {geometry,mats,poly,holes,layout,product,counts:tileCounts(geometry,format,area,spec.waste,product?.pack),spec:{...spec}};
  }
  async function setFloorSurface(id,spec){
    const room=ROOMS.find(r=>r.id===id);if(!room)throw Error('Pièce inconnue.');
    const next=await floorParts(room,spec),old=floorSurfaces.get(id);
    if(old){old.mesh.geometry.dispose();for(const m of Array.isArray(old.mesh.material)?old.mesh.material:[old.mesh.material]){m.map?.dispose();m.dispose();}old.mesh.geometry=next.geometry;old.mesh.material=next.mats;old.grout.material.color.set(spec.grout||'#b9b1a1');Object.assign(old,next);return old;}
    const f=floors[room.floor],tiles=mesh(f.architecture,next.geometry,next.mats,'Sol_'+id);
    tiles.rotation.x=-Math.PI/2;tiles.position.y=.014;tiles.castShadow=false;tiles.userData.room=id;tiles.userData.floor=room.floor;floorMeshes.push(tiles);
    f.roomFloors.push({room,mesh:tiles,material:next.mats});
    const shape=new T.Shape(next.poly.map(v=>new T.Vector2(...v)));next.holes.forEach(h=>shape.holes.push(new T.Path(h.map(v=>new T.Vector2(...v)))));
    const grout=mesh(f.architecture,new T.ShapeGeometry(shape),new T.MeshStandardMaterial({color:spec.grout||'#b9b1a1',roughness:.95}),'Fond_joint_'+id);
    grout.rotation.x=-Math.PI/2;grout.position.y=.003;grout.castShadow=false;
    const result={...next,room,mesh:tiles,grout};floorSurfaces.set(id,result);return result;
  }
  await Promise.all(ROOMS.map(room=>setFloorSurface(room.id,project.rooms?.[room.id]?.floor||defaultFloor(room))));
  // In cutaway views, wall footprints rest on a neutral structural deck, never on the garden.
  for(const f of floors){
    const corners=[[0,0],[LAYOUT.width,0],[LAYOUT.width,LAYOUT.depth],[0,LAYOUT.depth]].map(([x,z])=>{const p=point(x,0,z);return new T.Vector2(p[0],-p[2]);}),shape=new T.Shape(corners);
    if(f.group.userData.floor)shape.holes.push(new T.Path(wellPolygon().map(p=>new T.Vector2(...p))));
    const base=mesh(f.architecture,new T.ShapeGeometry(shape),M.stone,'Dalle_sous_cloisons');base.rotation.x=-Math.PI/2;base.position.y=.001;base.castShadow=false;f.substrate=base;
  }
  for(const room of ROOMS){
    const poly=floorPolygon(room),ceilingXZ=poly.map(([x,z])=>[x,-z]);
    const ceilingHoles=room.id==='entry'&&project.levels!==1?[wellPolygon().map(([x,z])=>[x,-z])]:[];
    const ceiling=mesh(floors[room.floor].ceilings,ceilingGeometry(ceilingXZ,ceilingHoles),M.ceiling,'Plafond_'+room.id);
    ceiling.position.y=CLEAR_HEIGHT-.012;ceiling.userData.ceiling=true;
  }
  for (const w of WALLS) {
    const a = world(...w.a),
      b = world(...w.b),
      dx = b[0] - a[0],
      dz = b[2] - a[2],
      length = Math.hypot(dx, dz),
      wallThickness = (w.outside ? 0.24 : 0.14)*SCALE,
      thickness = wallThickness-.003,
      shape = new T.Shape(),
      open = w.openings.map((o) => ({
        ...o,
        u: o.u * SCALE,
        width: o.width * SCALE,
      })),
      doorCuts = open.filter((o) => o.bottom < 0.03).sort((a, b) => a.u - b.u);
    shape.moveTo(0, 0);
    for (const o of doorCuts) {
      const l = o.u - o.width / 2,
        r = o.u + o.width / 2;
      shape.lineTo(l, 0);
      shape.lineTo(l, o.bottom + o.height);
      shape.lineTo(r, o.bottom + o.height);
      shape.lineTo(r, 0);
    }
    shape.lineTo(length, 0);
    shape.lineTo(length, CLEAR_HEIGHT);
    shape.lineTo(0, CLEAR_HEIGHT);
    shape.closePath();
    for (const o of open.filter((o) => o.bottom >= 0.03)) {
      const l = o.u - o.width / 2,
        r = o.u + o.width / 2,
        h = new T.Path();
      h.moveTo(l, o.bottom);
      h.lineTo(l, o.bottom + o.height);
      h.lineTo(r, o.bottom + o.height);
      h.lineTo(r, o.bottom);
      h.closePath();
      shape.holes.push(h);
    }
    const angle = -Math.atan2(dz, dx),
      g = new T.ExtrudeGeometry(shape, {
        depth: thickness,
        bevelEnabled: false,
        curveSegments: 4,
      });
    g.translate(0, 0, -thickness / 2);
    setUVMetres(g);
    const nx =
        -(w.b[1] - w.a[1]) / Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]),
      nz = (w.b[0] - w.a[0]) / Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
    const mid = [(w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2],
      left = roomAt(mid[0] + nx * 0.15, mid[1] + nz * 0.15, w.floor),
      right = roomAt(mid[0] - nx * 0.15, mid[1] - nz * 0.15, w.floor),
      materials = [
        ownedMaterial(left?.id),
        ownedMaterial(right?.id),
        M.plaster,
      ];
    g.clearGroups();
    const n = g.attributes.normal;
    let start = 0,
      previous = -1;
    for (let i = 0; i < n.count; i += 3) {
      const face = n.getZ(i) > 0.7 ? 0 : n.getZ(i) < -0.7 ? 1 : 2;
      if (face !== previous) {
        if (i > 0) g.addGroup(start, i - start, previous);
        start = i;
        previous = face;
      }
    }
    g.addGroup(start, n.count - start, previous);
    const holder = group(
        floors[w.floor].architecture,
        a[0],
        0,
        a[2],
        angle,
        "Mur_" + w.id,
      ),
      surface = mesh(holder, g, materials, "Mur_plein_avec_ouvertures");
    // Room polygons describe finished inside dimensions. Keep the exterior
    // wall thickness outside that envelope so the visible floor and takeoff agree.
    if(w.outside){holder.position.x-=nx*wallThickness/2;holder.position.z-=nz*wallThickness/2;}
    surface.userData.wall = w.id;
    const record = {
      ...w,
      group: holder,
      mesh: surface,
      normal: new T.Vector3(nx, 0, nz),
      worldA: w.outside?[a[0]-nx*wallThickness/2,0,a[2]-nz*wallThickness/2]:a,
      length,
      openings: [],
    };
    const cutcap=box(floors[w.floor].architecture,length,.085,thickness,M.plaster,a[0]+dx/2,.0425,a[2]+dz/2,'Coupe_cloison_'+w.id,.003);cutcap.position.x=record.worldA[0]+dx/2;cutcap.position.z=record.worldA[2]+dz/2;cutcap.rotation.y=angle;cutcap.castShadow=false;cutcap.visible=false;record.cutcap=cutcap;
    floors[w.floor].walls.push(record);
    const cuts = new Set([0, length]);
    for (const room of ROOMS.filter((r) => r.floor === w.floor))
      for (const [x, z] of room.polygon) {
        const pp = world(x, z),
          u = ((pp[0] - a[0]) * dx + (pp[2] - a[2]) * dz) / length,
          dist = Math.abs(
            (pp[0] - a[0]) * (-dz / length) + (pp[2] - a[2]) * (dx / length),
          );
        if (dist < 0.19 && u > 0.01 && u < length - 0.01) cuts.add(u);
      }
    const slices = [...cuts].sort((a, b) => a - b);
    for (let k = 0; k < slices.length - 1; k++) {
      const x0 = slices[k],
        x1 = slices[k + 1];
      if (x1 - x0 < 0.02) continue;
      const midU = (x0 + x1) / 2,
        px = w.a[0] + ((w.b[0] - w.a[0]) * midU) / length,
        pz = w.a[1] + ((w.b[1] - w.a[1]) * midU) / length;
      for (const sign of [-1, 1]) {
        const room = roomAt(
          px + nx * 0.16 * sign,
          pz + nz * 0.16 * sign,
          w.floor,
        );
        if (!room) continue;
        const face = new T.Shape();
        face.moveTo(x0, 0);
        for (const o of doorCuts) {
          const l = Math.max(x0, o.u - o.width / 2),
            r = Math.min(x1, o.u + o.width / 2);
          if (r - l < 0.001) continue;
          face.lineTo(l, 0);
          face.lineTo(l, o.height);
          face.lineTo(r, o.height);
          face.lineTo(r, 0);
        }
        face.lineTo(x1, 0);
        face.lineTo(x1, CLEAR_HEIGHT);
        face.lineTo(x0, CLEAR_HEIGHT);
        face.closePath();
        for (const o of open.filter((o) => o.bottom >= 0.03)) {
          const l = Math.max(x0, o.u - o.width / 2),
            r = Math.min(x1, o.u + o.width / 2);
          if (r - l < 0.001) continue;
          const hole = new T.Path();
          hole.moveTo(l, o.bottom);
          hole.lineTo(l, o.bottom + o.height);
          hole.lineTo(r, o.bottom + o.height);
          hole.lineTo(r, o.bottom);
          hole.closePath();
          face.holes.push(hole);
        }
        const geometry = setUVMetres(new T.ShapeGeometry(face));
        const material = ownedMaterial(room.id);
        if (sign < 0) reverseFace(geometry);
        material.side = T.FrontSide;
        const finish = mesh(
          holder,
          geometry,
          material,
          "Mur_finition_" + room.id,
          0,
          0,
          sign * wallThickness / 2,
        );
        finish.castShadow = false;
        finish.userData.wall = w.id;
        finish.userData.room=room.id;
        const doorLength=doorCuts.reduce((n,o)=>n+Math.max(0,Math.min(x1,o.u+o.width/2)-Math.max(x0,o.u-o.width/2)),0);
        wallSurfaces.push({room:room.id,wall:w.id,u0:x0,u1:x1,mesh:finish,length:x1-x0,area:geometryArea(geometry),plinth:Math.max(0,x1-x0-doorLength)});
      }
    }

    // Skirting is split around real doorways, rather than crossing the openings.
    let end = 0;
    for (const o of [...doorCuts, { u: length + 0.005, width: 0 }]) {
      const next = Math.max(end, Math.min(length, o.u - o.width / 2));
      if (next - end > 0.02)
        for (const sign of [-1, 1])
          box(
            holder,
            next - end,
            0.075,
            0.012,
            M.paint,
            (end + next) / 2,
            0.038,
            sign * (thickness / 2 + 0.004),
            "Plinthe",
            0.001,
          );
      end = o.u + o.width / 2;
    }
    for (const o of open) {
      const mount = group(holder, o.u, 0, 0, 0, "Ouverture_" + o.id);
      mount.position.y = o.bottom;
      if (o.kind === "door") {
        const asset = makeOpening("door", {
          width: Math.round(o.width * 100),
          height: Math.round(o.height * 100),
          color: w.outside ? "black" : "white",
          hingeSide: "left",
        });
        const inward = ["office-door","shower-door","bath-door","wc-door","utility-door","wc-first-door"].includes(o.id) ? -1 : 1;
        const sliding=["wc-door","wc-first-door","wardrobe-door","wardrobe-bath-door"].includes(o.id);
        asset.root.position.z = inward * 0.24;
        asset.root.scale.z = inward;
        if(sliding){
          asset.setOpenProgress(0);const closed=asset.door.position.x;
          const direction=o.id==='wardrobe-bath-door'?-1:1;
          asset.setOpenProgress=p=>{asset.door.rotation.y=0;asset.door.position.x=closed+direction*(o.width-.1)*p;};
        }
        mount.add(asset.root);
        asset.setOpenProgress(0.93);
        const d = {
          id: o.id,
          sliding,inward,hinge:"left",
          asset,
          open: true,
          progress: 0.93,
          target: 0.93,
          floor: w.floor,
          wall: record,
          opening: o,
        };
        doors.push(d);
        record.openings.push({ ...o, state: d });
        asset.root.userData.action = { kind: "door", item: d };
        interactives.push(asset.root);
        for (const sign of [-1, 1]) {
          box(
            mount,
            o.width + 0.09,
            0.055,
            0.025,
            M.paint,
            0,
            o.height + 0.015,
            sign * (thickness / 2 + 0.02),
            "Chambranle",
          );
          for (const x of [-o.width / 2 - 0.02, o.width / 2 + 0.02])
            box(
              mount,
              0.045,
              o.height,
              0.025,
              M.paint,
              x,
              o.height / 2,
              sign * (thickness / 2 + 0.02),
              "Chambranle",
            );
        }
      } else {
        const frame = 0.045,
          W = o.width,
          H = o.height,
          glassGroup = group(mount, 0, 0, 0, 0, "Menuiserie_vitrée");
        for (const x of [-W / 2 + frame / 2, W / 2 - frame / 2])
          box(
            glassGroup,
            frame,
            H,
            0.105,
            M.windowBlack,
            x,
            H / 2,
            0,
            "Montant_aluminium",
          );
        for (const y of [frame / 2, H - frame / 2])
          box(glassGroup, W, frame, 0.105, M.windowBlack, 0, y, 0, "Traverse");
        const panes = o.kind === "bay" ? 4 : 2,
          glassParts = [];
        for (let i = 0; i < panes; i++) {
          const part = group(
            glassGroup,
            -W / 2 + ((i + 0.5) * W) / panes,
            0,
            (i % 2) * 0.016,
            0,
            "Vantail_vitré",
          );
          box(
            part,
            W / panes - 0.02,
            H - 0.07,
            0.008,
            M.glass,
            0,
            H / 2,
            0,
            "Vitrage_transparent",
          );
          for (const s of [-1, 1])
            box(
              part,
              0.025,
              H - 0.04,
              0.035,
              M.windowBlack,
              s * (W / panes / 2 - 0.013),
              H / 2,
              0.012,
              "Profil_ouvrant",
            );
          glassParts.push(part);
        }
        const win = {
          id: o.id,
          root: glassGroup,
          parts: glassParts,
          opening: o,
          wall: record,
          floor: w.floor,
          open: false,
          progress: 0,
          target: 0,
        };
        windows.push(win);
        record.openings.push({ ...o, state: win });
        if (o.kind === "bay") {
          glassGroup.userData.action = { kind: "bay", item: win };
          interactives.push(glassGroup);
        }
        box(
          glassGroup,
          W + 0.08,
          0.026,
          0.17,
          M.stone,
          0,
          0.002,
          0.015,
          "Seuil",
        );
        // Diffuse sky enters through the actual opening. No fixed exterior photo.
        const portal = new T.RectAreaLight("#eaf2ff", 1.7, W - 0.1, H - 0.1);
        portal.position.set(0, H / 2, 0.07);
        portal.rotation.y = Math.PI;
        mount.add(portal);
        spots.push({ light: portal, base: 1.7, floor: w.floor, portal: true });
      }
    }
  }
  for(const floor of floors)for(const x of [-.12,LAYOUT.width+.12])for(const z of [-.12,LAYOUT.depth+.12])box(floor.architecture,.24*SCALE,CLEAR_HEIGHT,.24*SCALE,M.exterior,...point(x,CLEAR_HEIGHT/2,z),'Angle_façade');
  // A structural intermediate floor with a real stairwell cut. Its underside
  // stays closed during the first-person visit, and is hidden only in maquette.
  const slabShape = new T.Shape(
    [
      [-5 * SCALE, -4 * SCALE],
      [(LAYOUT.width-5) * SCALE, -4 * SCALE],
      [(LAYOUT.width-5) * SCALE, (LAYOUT.depth-4) * SCALE],
      [-5 * SCALE, (LAYOUT.depth-4) * SCALE],
    ].map((p) => new T.Vector2(...p)),
  );
  const hole = wellPolygon();
  slabShape.holes.push(new T.Path(hole.map((p) => new T.Vector2(...p))));
  const slabG = new T.ExtrudeGeometry(slabShape, {
    depth: SLAB,
    bevelEnabled: false,
  });
  slabG.rotateX(-Math.PI / 2);
  const slab = mesh(
    root,
    slabG,
    M.ceiling,
    "Dalle_entre_les_niveaux",
    0,
    CLEAR_HEIGHT,
    0,
  );
  const roof = box(
    root,
    (LAYOUT.width+.52) * SCALE,
    0.22,
    (LAYOUT.depth+.52) * SCALE,
    M.exterior,
    (LAYOUT.width-10)/2*SCALE,
    LEVEL_HEIGHT + CLEAR_HEIGHT + 0.11,
    (LAYOUT.depth-8)/2*SCALE,
    "Toiture_terrasse",
    0.01,
  );
  // Open oak stair, 16 true risers, intermediate landing, continuous handrails.
  const stair = group(root, 0, 0, 0, 0, "Escalier_double_volée");
  for (let i = 0; i < 8; i++) {
    const step = LEVEL_HEIGHT / 16,
      depth = 1.98 / 8,
      z = 3.16 - (i + 0.5) * depth;
    const p = point(3.61, (i + 1) * step, z);
    box(
      stair,
      1.06 * SCALE,
      0.05,
      depth * SCALE + 0.008,
      M.oak,
      ...p,
      "Marche_chêne",
      0.006,
    );
    const r = point(3.61, (i + 0.5) * step, z - depth / 2);
    box(stair, 1.06 * SCALE, step, 0.018, M.paint, ...r, "Contremarche", 0.002);
    const p2 = point(
      4.79,
      LEVEL_HEIGHT / 2 + (i + 1) * step,
      1.18 + (i + 0.5) * depth,
    );
    box(
      stair,
      1.06 * SCALE,
      0.05,
      depth * SCALE + 0.008,
      M.oak,
      ...p2,
      "Marche_étage",
      0.006,
    );
    const r2 = point(
      4.79,
      LEVEL_HEIGHT / 2 + (i + 0.5) * step,
      1.18 + (i + 1) * depth,
    );
    box(
      stair,
      1.06 * SCALE,
      step,
      0.018,
      M.paint,
      ...r2,
      "Contremarche_étage",
      0.002,
    );
  }
  box(
    stair,
    2.24 * SCALE,
    0.07,
    SCALE,
    M.oak,
    ...point(4.2, LEVEL_HEIGHT / 2, 0.68),
    "Palier_intermediaire",
    0.005,
  );
  for (const x of [3.09, 4.14, 4.26, 5.31]) {
    const right = x > 4.2;
    for (let i = 0; i < 9; i++) {
      const z = right ? 1.18 + (i * 1.98) / 8 : 3.16 - (i * 1.98) / 8,
        y = right
          ? LEVEL_HEIGHT / 2 + (i * LEVEL_HEIGHT) / 16
          : (i * LEVEL_HEIGHT) / 16;
      box(
        stair,
        0.015,
        0.93,
        0.015,
        M.black,
        ...point(x, y + 0.47, z),
        "Balustre",
        0.002,
      );
    }
    tube(
      stair,
      [
        point(x, (right ? LEVEL_HEIGHT / 2 : 0) + 0.97, right ? 1.18 : 3.16),
        point(
          x,
          (right ? LEVEL_HEIGHT : LEVEL_HEIGHT / 2) + 0.97,
          right ? 3.16 : 1.18,
        ),
      ],
      0.022,
      M.oak,
      "Main_courante",
    );
  }
  for (const x of [3.09, 5.31])
    tube(
      stair,
      [
        point(x, LEVEL_HEIGHT / 2 + 0.97, 0.2),
        point(x, LEVEL_HEIGHT / 2 + 0.97, 1.18),
      ],
      0.022,
      M.oak,
      "Main_courante_palier",
    );
  // The upper stairwell has a full protective balustrade; its south-east
  // opening stays clear for the top tread. These are real rail and post meshes.
  const guard = group(stair, 0, LEVEL_HEIGHT, 0, 0, "Garde_corps_trémie");
  for (const [a, b] of [
    [
      [3.08, 0.18],
      [5.32, 0.18],
    ],
    [
      [3.08, 0.18],
      [3.08, 3.16],
    ],
    [
      [5.32, 0.18],
      [5.32, 3.16],
    ],
    [
      [3.08, 3.16],
      [4.14, 3.16],
    ],
  ]) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]),
      count = Math.ceil(len / 0.16);
    for (let i = 0; i <= count; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / count,
        z = a[1] + ((b[1] - a[1]) * i) / count;
      box(
        guard,
        0.012,
        0.96,
        0.012,
        M.black,
        ...point(x, 0.48, z),
        "Barreau_protection",
        0.0015,
      );
    }
    tube(
      guard,
      [point(a[0], 0.98, a[1]), point(b[0], 0.98, b[1])],
      0.022,
      M.oak,
      "Lisse_de_protection",
    );
  }
  batchFurniture(stair);
  // Furniture, laid out at real dimensions. Paths to the stair and every room
  // are kept separate from kitchen cabinets and chair clearances.
  const makeBasinTap = () => makeTap(tapProduct(null, "basin"));
  const kitchen=furn.kitchen(new T.Group()),kitchenReturn=kitchen.getObjectByName('Meuble_retour').parent,fridge=kitchen.getObjectByName('Colonne_froid').parent;
  kitchenReturn.removeFromParent();fridge.removeFromParent();
  place(kitchen,0,4,0,0,null,0,{id:'kitchen-main'});
  place(kitchenReturn,0,5,0,-Math.PI/2,null,0,{id:'kitchen-return',kind:'counter'});
  place(fridge,0,7,0,-Math.PI/2,null,0,{id:'kitchen-fridge',kind:'fridge'});
  const island=furn.island(new T.Group()),stools=island.children.filter(o=>o.name==='Tabouret_îlot');
  for(const o of stools)o.removeFromParent();
  place(island,2.45,5.7,0,Math.PI/2,null,0,{id:'kitchen-island'});
  stools.forEach((o,i)=>place(o,3.35,4.85+i*.85,0,Math.PI/2,null,0,{id:'island-stool-'+i,kind:'stool'}));
  const dining=furn.dining(new T.Group()),diningChairs=dining.children.filter(o=>o.name==='Chaise_tapissée');
  for(const o of diningChairs)o.removeFromParent();
  place(dining,5.15,6.85,0,0,null,0,{id:'dining-table'});
  diningChairs.forEach((o,i)=>place(o,4.45+(i%3)*.7,6.85+(i<3?-.82:.82),0,i<3?Math.PI:0,null,0,{id:'dining-chair-'+i,kind:'chair'}));
  place(
    furn.sofa(new T.Group(), 2.5, false),
    6.95,
    6.65,
    0,
    Math.PI / 2,
    [2.68, 1.0, 0.95],
  );

  place(furn.rug(new T.Group(), 2.48, 2.9, 0, 0), 7.72, 6.58, 0);
  place(furn.coffeeTable(new T.Group()), 8.35, 6.55, 0, 0, [1.18, 1.13, 0.45]);
  place(furn.tv(new T.Group()), 9.9, 6.55, 0, -Math.PI / 2, [2.25, 0.4, 1.7]);
  const arm = furn.chair(new T.Group(), { arm: true, mat: M.charcoalFabric });
  place(arm, 8.85, 7.5, 0, Math.PI * 0.8, [0.65, 0.65, 0.9]);
  place(furn.sofa(new T.Group(), 1.8, false), 1.4, 0.65, 0, 0, [1.8, 0.92, 0.9]);
  place(
    furn.desk(new T.Group(), 1.3),
    0.35,
    2.35,
    0,
    Math.PI / 2,
    [1.3, 0.58, 1.3],
  );
  place(
    furn.chair(new T.Group()),
    1.15,
    2.35,
    0,
    -Math.PI / 2,
    [0.53, 0.52, 0.9],
  );
  place(furn.bed(new T.Group(), 1.8), 1.65, 5.55, 1, 0, [1.92, 2.15, 1.3]);
  place(furn.rug(new T.Group(), 2.8, 3.0, 0, 0), 1.65, 5.9, 1);
  for (const x of [0.33, 2.97])
    place(furn.nightstand(new T.Group()), x, 4.85, 1, 0, [0.44, 0.4, 0.95]);
  place(
    furn.wardrobe(new T.Group(), 2.15),
    3.81,
    6.75,
    1,
    -Math.PI / 2,
    [2.15, 0.58, 2.45],
  );
  const bench = group(new T.Group());
  box(
    bench,
    1.4,
    0.12,
    0.44,
    M.linen,
    0,
    0.45,
    0,
    "Banquette_pied_de_lit",
    0.05,
  );
  for (const x of [-0.5, 0.5]) box(bench, 0.04, 0.41, 0.33, M.oak, x, 0.205, 0);
  place(bench, 1.65, 7.05, 1, 0, [1.4, 0.44, 0.56]);
  place(
    furn.bed(new T.Group(), 1.4, M.sageFabric),
    8.05,
    5.22,
    1,
    0,
    [1.52, 2.15, 1.3],
  );
  place(furn.rug(new T.Group(), 2.0, 2.9, 0, 0), 8.05, 5.7, 1);
  place(furn.nightstand(new T.Group()), 9.15, 5.1, 1, 0, [0.44, 0.4, 0.95]);
  place(furn.wardrobe(new T.Group(), .8), 9.36, 4.48, 1, 0, [1.0, 0.58, 2.45]);
  place(
    furn.desk(new T.Group(), 1.25),
    8.85,
    7.62,
    1,
    Math.PI,
    [1.25, 0.58, 1.3],
  );
  place(furn.chair(new T.Group()), 8.85, 7.08, 1, 0, [0.53, 0.52, 0.9]);
  place(
    furn.bed(new T.Group(), 1.05, M.clayFabric),
    0.83,
    1.48,
    1,
    0,
    [1.17, 2.15, 1.3],
  );
  place(furn.nightstand(new T.Group()), 1.65, 0.6, 1, 0, [0.44, 0.4, 0.95]);
  place(
    furn.wardrobe(new T.Group(), 1.45),
    2.48,
    1.0,
    1,
    -Math.PI / 2,
    [1.45, 0.58, 2.45],
  );
  place(
    furn.desk(new T.Group(), 1.15),
    0.85,
    3.59,
    1,
    Math.PI,
    [1.15, 0.58, 1.3],
  );
  place(furn.chair(new T.Group()), 0.85, 2.95, 1, 0, [0.53, 0.52, 0.9]);
  const bedroomTV = furn.tv(new T.Group(), .74);
  for (const o of [...bedroomTV.children])
    if (!["Cadre_écran", "Écran"].includes(o.name)) o.removeFromParent();
  place(bedroomTV, 6.72, 7.18, 1, Math.PI / 2);
  place(
    furn.bookcase(new T.Group(), 1.8),
    4.5,
    6.7,
    1,
    Math.PI / 2,
    [1.8, 0.35, 2.3],
  );
  place(
    furn.chair(new T.Group(), { arm: true, mat: M.linen }),
    5.88,
    6.55,
    1,
    -0.6,
    [0.65, 0.65, 0.95],
  );
  place(
    furn.wardrobe(new T.Group(), 1.5),
    9.65,
    3.15,
    1,
    -Math.PI / 2,
    [1.5, 0.58, 2.45],
  );
  place(furn.washer(new T.Group()), 9.35, 2.15, 0, 0, [0.6, 0.62, 0.9]);
  const shelf = group(new T.Group());
  for (let i = 0; i < 3; i++) {
    box(
      shelf,
      1.04,
      0.026,
      0.29,
      M.oak,
      0,
      1.3 + i * 0.35,
      0,
      "Étagère_buanderie",
    );
    furn.books(shelf, -0.43, 1.32 + i * 0.35, 0, 5);
  }
  place(shelf, 9.35, 1.98, 0);
  // Existing manufacturer models and sanitary equipment, unchanged geometry.
  function assetAt(asset, x, y, z, floor, angle = 0, collision = null, options={}) {
    const wrap = pos(floors[floor].reused, x, y, z, angle, asset.root.name);
    wrap.add(asset.root);
    assets.push(asset);
    if(collision){const [ax,az]=adaptPoint(x,z,floor),swap=Math.abs(Math.sin(angle))>.7;obstacle(ax,az,swap?collision[1]:collision[0],swap?collision[0]:collision[1],floor,y,y+collision[2]);}
    tracked.push({object:wrap,kind:options.kind||"fixture",floor,fixed:true,...options});
    return wrap;
  }
  async function vanity(x,z,floor,angle,id){
    const s=normalizeBathroom(project.bathrooms?.[id]||defaultBathroom(id)),form=CATALOG.models.find(m=>m.id===s.format),layout=resolveBasinLayout(s.top,s.width,s.format,s.basinLayout)||'center';
    const a=makeModel({format:s.format,width:s.width/100,includeMirror:false,basinTop:s.top,basinLayout:layout});
    a.setTop(s.top);await textures.finish(a,s.finish);
    const topFinish=CATALOG.topFinishes.find(f=>f.id===s.topFinish);
    if(a.topWood&&topFinish){const f=FINISHES.find(f=>f.id===s.topFinish);const carrier={wood:a.topWood,frontWood:a.topWood};await textures.finish(carrier,f.id);}

    const ceramic=basinColors(s.top,s.width,s.format,layout).find(c=>c.id===s.basinColor);
    if(ceramic){a.ceramic.color.set(ceramic.hex);a.ceramic.roughness=ceramic.roughness;a.ceramic.clearcoat=ceramic.clearcoat;}
    a.spec.cabinetRef=form.refs[s.width]?.[s.finish];
    a.spec.basinRef=basinReference(s.top,s.basinColor,s.width,s.format,layout);
    // The manufacturer's basin offsets, including double-bowl versions.
    for(const f of a.faucets)f.visible=false;
    if(!['none','plain'].includes(s.top))for(const center of a.getBasinCenters(s.top)){
      const tap=makeBasinTap();tap.position.set(center,a.spec.bottom+a.spec.height+.025+(s.top==='neris'?.15:s.top==='torne'?.13:0),-form.depth/200+.052);a.root.add(tap);
    }
    decorateAsset(a,'cabinet',{format:s.format,width:s.width,decor:true});
    const wrap=assetAt(a,x,0,z,floor,angle,[a.spec.width,form.depth/100,1],{id:"vanity-"+id,kind:"vanity",room:id});
    wrap.userData.action={kind:'drawer',asset:a,open:false};interactives.push(wrap);
    const result={...s,basinLayout:layout,reference:a.spec.cabinetRef,basinReference:a.spec.basinRef,collection:form.collectionName,name:form.name,width:a.spec.width*100,height:form.height,depth:form.depth,finishName:FINISHES.find(f=>f.id===s.finish)?.name,page:form.page,topFinishName:topFinish?.name,topReference:['plain','neris','torne'].includes(s.top)?topFinish?.refs[s.width]:null};
    bathroomProducts.set(id,result);
    if(s.mirror!=='none'){
      const ms={mirrorModel:s.mirror,width:s.mirror==='capsule'?45:Math.min(100,s.width),height:s.mirror==='capsule'?90:80,led:true};
      const mirror=makeCatalogueMirror(ms),glass=makeMirrorReflector(mirrorGeometry(ms,.011),{textureWidth:innerWidth<700?512:768,textureHeight:innerWidth<700?512:768,clipBias:.002});
      glass.position.z=.012;mirror.root.add(glass);mirror.root.position.y=1.55;
      const mw=assetAt(mirror,x,0,z,floor,angle,null,{id:"mirror-"+id,kind:"mirror",room:id});mirrors.push({mirror:glass,root:mw,floor});
    }
    if(s.column!=='none'){
      const c=CATALOG.columns.find(c=>c.id===s.column),finish=c.finishes.includes(s.finish)?s.finish:c.finishes[0];
      const col=makeColumn({columnModel:c.id,finish});await textures.finish(col,finish);
      assetAt(col,id==='shower'?7.9:7.8,0,id==='shower'?3.12:2.01,floor,Math.PI,[c.width/100,c.depth/100,c.height/100],{id:"column-"+id,kind:"column",room:id});
      result.columnReference=c.refs[finish];result.columnName=c.name;
    }
  }
  const vanityTasks=Promise.all([vanity(6.89,1.95,0,Math.PI/2,'shower'),vanity(6.89,.88,1,Math.PI/2,'bathroom')]);
  const shower = makeFixture("shower", {
    width: 140,
    depth: 95,
    trayColor: "beige",
  });
  assetAt(shower, 7.61, 0.015, 0.36, 0, 0, [1.4, 0.95, 0.1],{id:"shower-tray",kind:"shower",room:"shower"});
  const showerTap = makeEquipment("tap", { use: "shower" });
  assetAt(showerTap, 7.9, 0.61, 0.45, 0,0,null,{kind:"tap",room:"shower"});
  const screen = makeEquipment("screen", {
    width: 110,
    screen: "fixed",
    metal: "Or brossé",
  });
  assetAt(screen, 7.61, 0.05, 1.31, 0,0,null,{kind:"screen",room:"shower"});
  const towel = makeEquipment("towel", {
    model: "flat",
    metal: "Or brossé",
    decor: true,
  });
  decorateAsset(towel, "towel", { decor: true });
  assetAt(towel, 8.2, 0.45, 2.35, 0, -Math.PI / 2,null,{kind:"towel",room:"shower"});

  const bath = makeFixture("bath", { kind: "island", width: 170, depth: 75 });
  assetAt(bath, 8.85, 0.015, 0.44, 1, 0, [1.7, 0.75, 0.64],{id:"bathtub",kind:"bath",room:"bathroom"});
  const bathTap = makeEquipment("tap", { use: "island" });
  assetAt(bathTap, 9.48, 0.02, 0.75, 1, -Math.PI / 2,null,{kind:"tap",room:"bathroom"});
  const towel2 = makeEquipment("towel", {
    model: "flat",
    metal: "Noir mat",
    decor: true,
  });
  decorateAsset(towel2, "towel", { decor: true });
  assetAt(towel2, 9.6, 0.48, 1.6, 1, -Math.PI / 2,null,{kind:"towel",room:"bathroom"});
  for (const [floor, x, z] of [
    [0, 9.36, 0.32],
    [1, 7.37, 2.6],
  ]) {
    const wc = makeEquipment("toilet", {
      reference: "TR2217R",
      lidOpen: false,
    });
    assetAt(wc, x, 0.16, z, floor, 0, [0.38, 0.54, 0.55],{id:"toilet-"+floor,kind:"toilet",room:floor?"wc-first":"wc-ground"});
    const fixture = pos(floors[floor].static, x, 0.93, z - 0.2);
    box(
      fixture,
      0.245,
      0.15,
      0.008,
      M.bronze,
      0,
      0,
      0,
      "Plaque_double_chasse",
      0.007,
    );
    for (const dx of [-0.055, 0.05])
      cylinder(
        fixture,
        0.037,
        0.008,
        M.bronze,
        dx,
        0,
        0.01,
        "Commande_chasse",
      ).rotation.x = Math.PI / 2;
    const hand = makeEquipment("washstand", {
      reference: "STR4335",
      metal: "Or brossé",
      decor: true,
    });
    decorateAsset(hand, "washstand", { reference: "STR4335", decor: true });
    assetAt(
      hand,
      x + (floor ? -0.44 : -0.4),
      0.83,
      z + 0.83,
      floor,
      Math.PI / 2,
      null,{id:"washstand-"+floor,kind:"washstand",room:floor?"wc-first":"wc-ground"}
    );
    furn.art(
      floors[floor].static,
      0.3,
      0.4,
      ...(()=>{const p=adaptPoint(x+.38,z-.2,floor);return point(p[0],1.47,p[1]);})(),
      0,
      7 + floor,
    );
  }
  // Decoration is geometry: plants, art, books, textiles, curtains, switches,
  // skirting, vases, bedside lamps and ceiling luminaires.
  for (const [x, z, floor, size] of [
    [0.55, 7.35, 0, 1.3],
    [5.8, 7.7, 0, 1.05],
    [.6, 3.95, 0, 0.85],
    [2.48, 2.9, 0, 0.7],
    [6.2, 0.45, 0, 0.6],
    [3.35, 7.55, 1, 0.8],
    [9.6, 7.4, 1, 0.65],
    [2.4, 3.55, 1, 0.65],
    [5.95, 7.65, 1, 0.8],
  ])
    place(furn.plant(new T.Group(), 0, 0, 0, size), x, z, floor);
  for (const [x, y, z, f, angle, w, h, seed] of [
    [1.4, 1.53, .07, 0, 0, 1.4, 0.85, 1],
    [6.74, 1.65, 1.5, 0, Math.PI / 2, 0.48, 0.68, 2],
    [0.05, 1.55, 1.75, 0, Math.PI / 2, 0.72, 1.1, 3],
    [1.65, 1.85, 4.16, 1, 0, 1.1, 0.58, 4],
    [7.55, 1.78, 4.16, 1, 0, 1.1, 0.58, 8],
    [0.85, 1.68, 0.06, 1, 0, 0.66, 0.85, 9],
    [6.46, 1.65, 5.0, 1, -Math.PI / 2, 0.72, 1.05, 6],
  ]) {
    const ap=adaptPoint(x,z,f),p=point(ap[0],y,ap[1]);
    furn.art(floors[f].static, w, h, ...p, angle, seed);
  }
  for (const [f, x, z] of [
    [0, 1.4, 7.88],
    [0, 8.5, 7.88],
    [1, 1.35, 7.88],
    [1, 8.4, 7.88],
  ]) {
    const g = pos(floors[f].static, x, 0, z, 0, "Rideau_en_lin");
    const geo = new T.PlaneGeometry(0.54, 2.42, 30, 24),
      p = geo.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setZ(i, Math.cos(p.getX(i) * 52) * 0.045);
    geo.computeVertexNormals();
    const mat = M.ivoryFabric.clone();
    mat.side = T.DoubleSide;
    mat.transparent = true;
    mat.opacity = 0.88;
    mesh(g, geo, mat, "Voilage_plissé", 0, 1.3, 0);
    cylinder(g, 0.012, 0.72, M.bronze, 0, 2.55, 0, "Tringle").rotation.z =
      Math.PI / 2;
  }
  for (const room of ROOMS) {
    const b = room.polygon,
      loX = Math.min(...b.map((p) => p[0])),
      hiX = Math.max(...b.map((p) => p[0])),
      loZ = Math.min(...b.map((p) => p[1])),
      hiZ = Math.max(...b.map((p) => p[1])),
      wet = room.flooring === "stone",
      coords =
        room.id === "living"
          ? [
              [1.25, 4.3],
              [2.4, 4.3],
              [5.2, 4.4],
              [6.3, 4.4],
              [8.7, 4.4],
              [1.2, 6.8],
              [5.25, 7.2],
              [7.2, 6.6],
              [9.0, 7.1],
            ]
          : room.id === "entry"
            ? [
                [5.97, 0.9],
                [5.97, 2.65],
              ]
            : room.id === "gallery"
              ? [
                  [5.7, 3.5],
                  [5.5, 5.4],
                  [5.5, 7.4],
                ]
              : [[(loX + hiX) / 2, (loZ + hiZ) / 2]];
    for (const [x, z] of coords) {
      const original= ["living","entry","gallery"].includes(room.id);
      const parent=floors[room.floor].lights;
      const g = (original?pos:(parent,x,y,z,rot,name)=>group(parent,...point(x,y,z),rot,name))(
        parent,
        x,
        CLEAR_HEIGHT - 0.025,
        z,
        0,
        "Spot_LED_encastré",
      );
      const frame = cylinder(
        g,
        0.047,
        0.012,
        M.black,
        0,
        0,
        0,
        "Collerette_spot",
        32,
      );
      cylinder(g, 0.034, 0.003, M.led, 0, -0.008, 0, "Lentille_LED", 32);
    }
    const light = new T.RectAreaLight(
      "#ffedcf",
      room.id === "living" ? 1.8 : 1.25,
      Math.min(2, hiX - loX - 0.3),
      Math.min(1.4, hiZ - loZ - 0.3),
    );
    light.position.set(...point((loX + hiX) / 2, 2.52, (loZ + hiZ) / 2));
    light.lookAt(new T.Vector3(...point((loX + hiX) / 2, 0, (loZ + hiZ) / 2)));
    floors[room.floor].lights.add(light);
    spots.push({
      light,
      base: light.intensity,
      floor: room.floor,
      portal: false,
    });
  }
  for (const z of [4.85, 5.7, 6.55]) {
    const g = pos(floors[0].lights, 2.45, 0, z,0,"Suspension_cuisine");
    cylinder(g, 0.035, 0.025, M.black, 0, 2.58, 0, "Pavillon_suspension");
    cylinder(g, 0.002, 0.46, M.black, 0, 2.34, 0, "Câble");
    const shade = cylinder(
      g,
      0.16,
      0.17,
      M.terracotta,
      0,
      2.04,
      0,
      "Suspension_céramique",
      48,
      0.1,
    );
    cylinder(g, 0.125, 0.006, M.led, 0, 1.953, 0, "Diffuseur_suspension");
  }
  // Light switches at door handles are tangible, restrained architectural detail.
  for (const d of doors.filter((d) => !d.wall.outside)) {
    const w = d.wall,
      dx = (w.b[0] - w.a[0]) / Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]),
      dz = (w.b[1] - w.a[1]) / Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]),
      x =
        w.a[0] +
        dx * (d.opening.u / SCALE + d.opening.width / SCALE / 2 + 0.11),
      z =
        w.a[1] +
        dz * (d.opening.u / SCALE + d.opening.width / SCALE / 2 + 0.11),
      p = group(floors[w.floor].static, ...point(x,1.07,z), w.group.rotation.y);
    box(p, 0.075, 0.075, 0.01, M.paint, 0, 0, 0.085, "Interrupteur", 0.005);
  }
  await vanityTasks;
  for(const t of tracked)arrangement.register(t.object,t);
  for(let floor=0;floor<2;floor++){
    for(const o of [...floors[floor].static.children]){
      if(o.name==='Ombre_contact'){o.removeFromParent();continue;}
      const kind=o.name==='Tableau_encadré'?'art':o.name==='Rideau_en_lin'?'curtain':o.getObjectByName('Plaque_double_chasse')?'flush':null;
      if(kind)arrangement.register(o,{floor,kind});
    }
    for(const o of [...floors[floor].lights.children])if(!o.isLight)arrangement.register(o,{floor,kind:'light'});
  }
  arrangement.at('kitchen-main',8.15,3.97);
  arrangement.at('kitchen-return',.42,5.25);
  arrangement.at('kitchen-fridge',.43,6.93);
  for(const [id,p]of Object.entries(FURNITURE_LAYOUT))arrangement.at(id,...p);
  const showerWidth=normalizeBathroom(project.bathrooms?.shower||defaultBathroom('shower')).width,showerZ=Math.min(1.7,2.20-showerWidth/200);
  arrangement.at('vanity-shower',6.9,showerZ,90);arrangement.at('mirror-shower',6.69,showerZ,90);
  for(const id of ['shower','bathroom']){
    const s=normalizeBathroom(project.bathrooms?.[id]||defaultBathroom(id)),c=CATALOG.columns.find(c=>c.id===s.column);
    if(c)arrangement.at('column-'+id,id==='shower'?7.9:7.8,(id==='shower'?3.32:2.18)-c.depth/200,180);
  }
  // Measure each object independently; never merge the editable furniture into a level.
  for(const item of arrangement.items.values())if(item.root.parent===floors[item.floor].static)batchFurniture(item.object);
  for(const entry of project.additions||[])registerAddition({floors,arrangement},project,M,entry);
  if(project.template?.empty){project.items??={};const added=new Set((project.additions||[]).map(a=>a.id));for(const item of arrangement.items.values())if(!added.has(item.id)&&!Object.hasOwn(project.items,item.id))project.items[item.id]={hidden:true};}
  arrangement.prepare();arrangement.load();
  if(project.levels===1)roof.position.y-=LEVEL_HEIGHT;

  colliders.length=0;colliders.push(...arrangement.colliders());
  for (const a of assets) {
    const drawers = a.drawers || [];
    for (const d of drawers) batchFurniture(d);
    batchFurniture(a.root, { exclude: drawers });
  }
  for (const d of doors) {
    batchFurniture(d.asset.door);
    batchFurniture(d.asset.root, { exclude: [d.asset.door] });
  }
  for (const f of floors) {
    batchFurniture(f.static,{exclude:[...arrangement.items.values()].map(i=>i.root)});
    for (const w of f.walls)
      batchFurniture(w.group, {
        exclude: [w.mesh,...w.group.children.filter((c) =>
          c.name.startsWith("Ouverture_") || c.name.startsWith("Mur_finition_"),
        )],
        label: "Mur_finitions",
      });
  }
  // Thin architectural glazing uses alpha reflection rather than a second full
  // scene transmission render; the view through every bay remains live geometry.
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m.transmission > 0) {
        m.transmission = 0;
        m.transparent = true;
        m.opacity = 0.14;
        m.needsUpdate = true;
      }
  });
  const focusVisibility=new Map();
  function rememberVisible(o,value){if(!focusVisibility.has(o))focusVisibility.set(o,o.visible);o.visible=value;}
  function focusRoom(id,camera){
    const room=ROOMS.find(r=>r.id===id);if(!room)return;
    const centroid=room.polygon.reduce((p,q)=>[p[0]+q[0]/room.polygon.length,p[1]+q[1]/room.polygon.length],[0,0]),center=new T.Vector3(...point(centroid[0],room.floor*LEVEL_HEIGHT+1,centroid[1]));
    floors.forEach((f,i)=>{rememberVisible(f.group,i===room.floor);rememberVisible(f.ceilings,false);rememberVisible(f.substrate,false);});
    rememberVisible(stair,project.levels!==1&&['entry','gallery'].includes(id));rememberVisible(slab,false);rememberVisible(roof,false);
    for(const f of floorSurfaces.values()){rememberVisible(f.mesh,f.room.id===id);rememberVisible(f.grout,f.room.id===id);}
    for(const item of arrangement.items.values())rememberVisible(item.root,item.room===id&&!item.hidden);
    for(const f of floors)for(const child of f.static.children)if(!child.userData.editableId)rememberVisible(child,false);
    for(const w of floors[room.floor].walls){
      const faces=wallSurfaces.filter(s=>s.wall===w.id&&s.room===id),p=new T.Vector3(...w.worldA),side=center.clone().sub(p).dot(w.normal),cameraSide=camera.position.clone().sub(p).dot(w.normal);
      rememberVisible(w.group,faces.length>0&&(side*cameraSide>=-.02));
      rememberVisible(w.cutcap,false);
      rememberVisible(w.mesh,false);
      for(const child of w.group.children)if(child.name.startsWith('Ouverture_')){
        const opening=w.openings.find(o=>child.name==='Ouverture_'+o.id);
        rememberVisible(child,!!opening&&faces.some(f=>opening.u+opening.width/2>f.u0&&opening.u-opening.width/2<f.u1));
        if(opening?.kind==='door')rememberVisible(opening.state.asset.door,false);
      }
      for(const s of wallSurfaces.filter(s=>s.wall===w.id)){rememberVisible(s.mesh,s.room===id);if(s.backing)rememberVisible(s.backing,s.room===id);}
    }
  }
  function show(mode = "visit", floor = 0) {
    root.visible = true;
    for(const [o,visible]of focusVisibility)o.visible=visible;focusVisibility.clear();
    for(const item of arrangement.items.values())item.root.visible=!item.hidden;
    for (let i = 0; i < 2; i++) {
      for(const w of floors[i].walls)w.cutcap.visible=false;
      floors[i].group.visible =
        (project.levels!==1||i===0)&&(mode === "exterior" || mode === "visit" || i === floor);
      floors[i].ceilings.visible = mode === "visit" || mode === "exterior";
      for(const child of floors[i].lights.children)if(!child.isLight)child.visible=(mode==='visit'||mode==='exterior')&&!arrangement.items.get(child.userData.editableId)?.hidden;
    }
    slab.visible = project.levels!==1&&(mode === "visit" || mode === "exterior");
    roof.visible = mode === "exterior" || mode === "visit";
    stair.visible = project.levels!==1;
  }
  function updateDoors(dt) {
    let moving = false;
    for (const d of [
      ...doors,
      ...windows.filter((w) => w.opening.kind === "bay"),
    ]) {
      const step = T.MathUtils.damp(d.progress, d.target, 8, dt);
      if (Math.abs(step - d.progress) > 0.00005) {
        d.progress = step;
        moving = true;
        if (d.asset) d.asset.setOpenProgress(step);
        else
          for (let i = 0; i < d.parts.length; i++)
            d.parts[i].position.x =
              -d.opening.width / 2 +
              ((i + 0.5) * d.opening.width) / d.parts.length +
              (i === 1 ? -1 : i === 2 ? 1 : 0) * d.opening.width * 0.235 * step;
      }
    }
    for (const action of interactives
      .map((o) => o.userData.action)
      .filter((a) => a?.kind === "drawer")) {
      const target = action.open ? 0.28 : 0;
      for (const drawer of action.asset.drawers) {
        const z = T.MathUtils.damp(drawer.position.z, target, 8, dt);
        if (Math.abs(drawer.position.z - z) > 0.0001) moving = true;
        drawer.position.z = z;
      }
    }
    return moving;
  }
  const wallCoverings=createWallCoverings(wallSurfaces,textures);
  for(const room of ROOMS)if(project.rooms?.[room.id]?.wall)await wallCoverings.set(room.id,project.rooms[room.id].wall);
  return {
    wallCoverings,
    setWallSurface:wallCoverings.set,
    root,
    floors,
    doors,
    windows,
    colliders,
    arrangement,
    mirrors,
    assets,
    interactives,
    spots,
    floorMeshes,
    floorSurfaces,
    wallSurfaces,
    bathroomProducts,
    setFloorSurface,
    paintMaterials,
    stair,
    roof,
    slab,
    show,
    focusRoom,
    updateDoors,
    program: {
      rooms: ROOMS.length,
      manufacturedAssets: assets.length,
      ceiling: CLEAR_HEIGHT,
    },
  };
}
