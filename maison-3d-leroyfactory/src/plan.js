// Architectural programme in metres. One source for geometry, room areas,
// interactive floor plan, guided viewpoints, collisions and stair navigation.
export const CLEAR_HEIGHT = 2.6,
  SLAB = 0.24,
  LEVEL_HEIGHT = CLEAR_HEIGHT + SLAB;
export const WELL = { x: 3.08, z: 0.18, w: 2.24, d: 2.98 };
const rectangle = (id, name, floor, x, z, w, d, extra = {}) => ({
  id,
  name,
  floor,
  polygon: [
    [x, z],
    [x + w, z],
    [x + w, z + d],
    [x, z + d],
  ],
  ...extra,
});
export function polygonArea(p) {
  return (
    Math.abs(
      p.reduce((s, a, i) => {
        const b = p[(i + 1) % p.length];
        return s + a[0] * b[1] - b[0] * a[1];
      }, 0),
    ) / 2
  );
}
const ground = [
  rectangle("living", "Salon · cuisine · salle à manger", 0, 0, 3.5, 10, 4.5, {
    flooring: "tile",
    description: "Une pièce de vie traversante, ouverte sur la terrasse.",
    view: [5.15, 1.58, 4.65],
    look: [8.1, 1.15, 6.7],
  }),
  rectangle("office", "Bureau & chambre d’amis", 0, 0, 0, 2.8, 3.36, {
    flooring: "wood",
    view: [2.35, 1.58, 2.9],
    look: [0.55, 0.95, 0.75],
  }),
  rectangle("entry", "Entrée & escalier", 0, 2.94, 0, 3.56, 3.36, {
    subtract: WELL.w * WELL.d,
    flooring: "tile",
    view: [6.0, 1.58, 2.9],
    look: [3.65, 1.4, 0.6],
  }),
  rectangle("shower", "Salle d’eau · douche", 0, 6.64, 0, 1.96, 3.36, {
    flooring: "stone",
    view: [8.08, 1.58, 2.85],
    look: [7.03, 1.15, 1.6],
  }),
  rectangle("wc-ground", "WC & lave-mains", 0, 8.74, 0, 1.26, 1.68, {
    flooring: "stone",
    view: [9.4, 1.55, 1.4],
    look: [9.35, 0.7, 0.35],
  }),
  rectangle("utility", "Cellier & buanderie", 0, 8.74, 1.82, 1.26, 1.54, {
    flooring: "tile",
    view: [9.3, 1.58, 3.05],
    look: [9.4, 1.1, 2.05],
  }),
];
const first = [
  rectangle("suite", "Suite parentale", 1, 0, 4.1, 4.15, 3.9, {
    flooring: "wood",
    description: "Chêne, lin naturel et dressing toute hauteur.",
    view: [3.25, 1.58, 7.65],
    look: [1.6, 1.0, 5.05],
  }),
  rectangle("bedroom-2", "Chambre · sauge", 1, 6.64, 4.1, 3.36, 3.9, {
    flooring: "wood",
    view: [9.4, 1.58, 7.3],
    look: [7.45, 1.0, 4.75],
  }),
  rectangle("bedroom-3", "Chambre · argile", 1, 0, 0, 2.8, 3.96, {
    flooring: "wood",
    view: [2.3, 1.58, 3.4],
    look: [0.8, 0.9, 0.7],
  }),
  rectangle("bathroom", "Salle de bains · baignoire", 1, 6.64, 0, 3.36, 2.2, {
    flooring: "stone",
    view: [9.45, 1.58, 1.8],
    look: [7.6, 1.0, 0.85],
  }),
  rectangle("wc-first", "WC & lave-mains · étage", 1, 6.64, 2.34, 1.4, 1.62, {
    flooring: "stone",
    view: [7.3, 1.58, 3.7],
    look: [7.4, 0.75, 2.55],
  }),
  rectangle("wardrobe", "Dressing & linge", 1, 8.18, 2.34, 1.82, 1.62, {
    flooring: "wood",
    view: [9.5, 1.58, 3.7],
    look: [8.9, 1.1, 2.5],
  }),
  {
    id: "gallery",
    name: "Palier & bibliothèque",
    floor: 1,
    flooring: "wood",
    polygon: [
      [2.94, 0],
      [6.5, 0],
      [6.5, 8],
      [4.29, 8],
      [4.29, 4.1],
      [2.94, 4.1],
    ],
    subtract: WELL.w * WELL.d,
    view: [5.9, 1.58, 7.3],
    look: [4.8, 1.1, 4.6],
  },
];
export const ROOMS = [...ground, ...first];
const baseArea = ROOMS.reduce(
  (s, r) => s + polygonArea(r.polygon) - (r.subtract || 0),
  0,
);
export const SCALE = Math.sqrt(140 / baseArea);
for (const r of ROOMS)
  r.area = (polygonArea(r.polygon) - (r.subtract || 0)) * SCALE * SCALE;
export let TOTAL_AREA = ROOMS.reduce((s, r) => s + r.area, 0);
export const point = (x, y, z) => [(x - 5) * SCALE, y, (z - 4) * SCALE];
export const unpoint = (x, z) => [x / SCALE + 5, z / SCALE + 4];
export function inside(x, z, p) {
  let h = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++)
    if (
      p[i][1] > z !== p[j][1] > z &&
      x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]
    )
      h = !h;
  return h;
}
export const roomAt = (x, z, floor) =>
  ROOMS.find((r) => r.floor === floor && inside(x, z, r.polygon));
const opening = (id, u, width, height = 2.15, bottom = 0, kind = "door") => ({
  id,
  u,
  width,
  height,
  bottom,
  kind,
});
const wall = (id, floor, a, b, openings = [], extra = {}) => ({
  id,
  floor,
  a,
  b,
  openings,
  ...extra,
});
export const WALLS = [];
for (const floor of [0, 1]) {
  WALLS.push(
    wall(
      "north-" + floor,
      floor,
      [0, 0],
      [10, 0],
      floor === 0
        ? [
            opening("office-window", 1.35, 1.5, 1.35, 0.9, "window"),
            opening("entrance-door", 6.0, 1, 2.35),
            opening("shower-window", 7.65, 1, 1.0, 1.25, "window"),
          ]
        : [
            opening("bed3-window", 1.4, 1.6, 1.4, 0.85, "window"),
            opening("stair-window", 4.5, 1.3, 1.8, 0.6, "window"),
            opening("bath-window", 8.65, 1.8, 1.15, 1.2, "window"),
          ],
      { outside: true },
    ),
  );
  WALLS.push(
    wall(
      "east-" + floor,
      floor,
      [10, 0],
      [10, 8],
      floor === 0
        ? [
            opening("wc-window", 0.8, 0.6, 0.7, 1.5, "window"),
            opening("dining-window", 4.7, 1.8, 1.7, 0.65, "window"),
          ]
        : [opening("bed2-east", 6.2, 1.7, 1.4, 0.85, "window")],
      { outside: true },
    ),
  );
  WALLS.push(
    wall(
      "south-" + floor,
      floor,
      [10, 8],
      [0, 8],
      floor === 0
        ? [
            opening("living-bay", 2.05, 3.5, 2.42, 0.02, "bay"),
            opening("kitchen-bay", 7.2, 4.3, 2.42, 0.02, "bay"),
          ]
        : [
            opening("bed2-window", 1.6, 1.9, 1.55, 0.7, "window"),
            opening("gallery-window", 4.6, 1.5, 2.25, 0.15, "window"),
            opening("suite-window", 7.8, 2.5, 2.15, 0.2, "window"),
          ],
      { outside: true },
    ),
  );
  WALLS.push(
    wall(
      "west-" + floor,
      floor,
      [0, 8],
      [0, 0],
      floor === 0
        ? [opening("kitchen-west", 2.4, 1.8, 1.4, 0.85, "window")]
        : [opening("suite-west", 2.0, 1.8, 1.4, 0.85, "window")],
      { outside: true },
    ),
  );
}
WALLS.push(
  wall(
    "office-side",
    0,
    [2.87, 0],
    [2.87, 3.43],
    [],
  ),
  wall("office-back", 0, [0, 3.43], [2.87, 3.43], [opening("office-door", 1.45, .88)]),
  wall(
    "shower-side",
    0,
    [6.57, 0],
    [6.57, 3.43],
    [opening("shower-door", 2.68, 0.88)],
  ),
  wall(
    "shower-east",
    0,
    [8.67, 0],
    [8.67, 3.43],
    [opening("wc-door", 0.95, 0.8), opening("utility-door", 2.63, 0.8)],
  ),
  wall("shower-back", 0, [6.64, 3.43], [10, 3.43]),
  wall("wc-divider", 0, [8.74, 1.75], [10, 1.75]),
);
WALLS.push(
  wall(
    "bed3-side",
    1,
    [2.87, 0],
    [2.87, 4.03],
    [opening("bed3-door", 3.35, 0.88)],
  ),
  wall("bed3-back", 1, [0, 4.03], [4.22, 4.03]),
  wall(
    "master-side",
    1,
    [4.22, 4.03],
    [4.22, 8],
    [opening("suite-door", 0.7, 0.92)],
  ),
  wall(
    "east-divider",
    1,
    [6.57, 0],
    [6.57, 8],
    [
      opening("bath-door", 1.6, 0.88),
      opening("wc-first-door", 3.3, 0.78),
      opening("bed2-door", 4.82, 0.88),
    ],
  ),
  wall(
    "bath-back",
    1,
    [6.64, 2.27],
    [10, 2.27],
    [opening("wardrobe-bath-door", 2.11, 0.72)],
  ),
  wall("wc-first-side", 1, [8.11, 2.34], [8.11, 4.03]),
  wall(
    "bed2-back",
    1,
    [6.64, 4.03],
    [10, 4.03],
    [opening("wardrobe-door", 2.11, 0.8)],
  ),
);
export function stairHeight(x, z) {
  if (x < WELL.x || x > WELL.x + WELL.w || z < WELL.z || z > WELL.z + WELL.d)
    return null;
  if (z <= 1.18) return LEVEL_HEIGHT / 2;
  if (x < 4.14) return (Math.max(0, (3.16 - z) / 1.98) * LEVEL_HEIGHT) / 2;
  if (x > 4.26)
    return LEVEL_HEIGHT / 2 + (((z - 1.18) / 1.98) * LEVEL_HEIGHT) / 2;
  return NaN;
}
export const VIEWS = {
  living: { position: [7.9, 1.58, 7.3], look: [2.4, 1.15, 4.9], floor: 0 },
  kitchen: { position: [4.9, 1.58, 6.7], look: [1.5, 1.15, 4.4], floor: 0 },
  dining: { position: [9.35, 1.58, 5.4], look: [6.5, 1.0, 6.6], floor: 0 },
  garden: { position: [13, 3.4, 16], look: [5, 2.0, 4.5], floor: 0 },
  terrace: { position: [8, 1.65, 11.4], look: [4.6, 1.5, 5.1], floor: 0 },
  stair: { position: [5.9, 1.58, 3.1], look: [3.6, 1.25, 1.1], floor: 0 },
};
export const PROGRAM = {
  name: "Maison 3D LeroyFactory",
  area: TOTAL_AREA,
  levels: 2,
  ceilingHeight: CLEAR_HEIGHT,
  bathrooms: 2,
  wcs: 2,
  bedrooms: 3,
  guestOffice: 1,
};

// Editable shared partitions. The stair, wall thicknesses and product sizes
// stay fixed; moving a partition updates both rooms and every door in that wall.
const BASE_ROOMS = structuredClone(ROOMS), BASE_WALLS = structuredClone(WALLS);
export const DEFAULT_LAYOUT = {
  width: 10, depth: 8,
  ground: {office:2.87, shower:6.57, service:8.67, back:3.43, wc:1.75},
  first: {bed3:2.87, suite:4.22, east:6.57, wc:8.11, bath:2.27, back:4.03},
};
export let LAYOUT = structuredClone(DEFAULT_LAYOUT);
const clone = x => structuredClone(x);
export function roomBounds(room) {
  const xs=room.polygon.map(p=>p[0]),zs=room.polygon.map(p=>p[1]);
  return {x:Math.min(...xs),z:Math.min(...zs),w:Math.max(...xs)-Math.min(...xs),d:Math.max(...zs)-Math.min(...zs)};
}
function knots(layout,floor,axis) {
  const v=floor?layout.first:layout.ground;
  const centers=axis==='x' ? (floor?[v.bed3,v.suite,v.east,v.wc]:[v.office,v.shower,v.service]) : (floor?[v.bath,v.back]:[v.wc,v.back]);
  const end=axis==='x'?layout.width:layout.depth;
  return [0,...centers.flatMap(n=>[n-.07,n+.07]),end];
}
function mapAxis(value,floor,axis,layout=LAYOUT) {
  const from=knots(DEFAULT_LAYOUT,floor,axis),to=knots(layout,floor,axis);
  let i=0;
  while(i<from.length-2&&value>from[i+1])i++;
  return to[i]+(value-from[i])/(from[i+1]-from[i])*(to[i+1]-to[i]);
}
export function mapPlanPoint(x,z,floor,layout=LAYOUT) {return [mapAxis(x,floor,'x',layout),mapAxis(z,floor,'z',layout)];}
// Place real-size furniture relative to its room: keep offsets to a nearby
// wall instead of scaling the manufacturer's geometry when a room grows.
export function adaptPoint(x,z,floor) {
  let original=BASE_ROOMS.find(r=>r.floor===floor&&inside(x,z,r.polygon));
  if(!original) original=BASE_ROOMS.filter(r=>r.floor===floor).sort((a,b)=>{
    const dist=r=>{const q=roomBounds(r);return Math.hypot(Math.max(q.x-x,0,x-q.x-q.w),Math.max(q.z-z,0,z-q.z-q.d));};
    return dist(a)-dist(b);
  })[0];
  const r=ROOMS.find(r=>r.id===original.id),a=roomBounds(original),b=roomBounds(r);
  const fit=(p,min,length,to,size)=>p-min<.75?to+(p-min):min+length-p<.75?to+size-(min+length-p):to+(p-min)/length*size;
  return [fit(x,a.x,a.w,b.x,b.w),fit(z,a.z,a.d,b.z,b.d)];
}
export function validateLayout(l) {
  if(!l||!l.ground||!l.first)throw Error('Dimensions du projet incomplètes.');
  for(const n of [l.width,l.depth,...Object.values(l.ground),...Object.values(l.first)]) if(!Number.isFinite(n))throw Error('Saisissez des dimensions numériques.');
  const g=l.ground,f=l.first;
  if(l.width<9.8||l.width>12.5||l.depth<7.6||l.depth>11)throw Error('L’enveloppe de cette maison peut mesurer de 9,80 à 12,50 m sur 7,60 à 11 m.');
  if(g.office<2.5||g.office>3.0||g.shower<6.2||g.shower>7.3||g.service-g.shower<1.85||l.width-g.service<1.2)throw Error('Conservez le passage de l’escalier et au moins 1,71 m dans la douche, 1,13 m dans les sanitaires.');
  if(g.back<3.40||g.back>4.4||g.wc<1.6||g.wc>2.25||g.back-g.wc<1.45||l.depth-g.back<3.7)throw Error('Profondeur incompatible avec l’escalier, les portes ou les équipements du rez-de-chaussée.');
  if(f.bed3<2.5||f.bed3>3.0||f.suite<3.8||f.suite>4.8||f.east<6.2||f.east-f.suite<1.65||f.wc-f.east<1.3||l.width-f.wc<1.65)throw Error('La répartition de l’étage doit conserver les passages et les sanitaires.');
  if(f.bath<2.05||f.bath>2.8||f.back<3.8||f.back>4.7||f.back-f.bath<1.55||l.depth-f.back<3.5)throw Error('Profondeur incompatible avec la baignoire, les portes ou les chambres.');
  // Keep all real door widths and adequate jambs after moving their centres.
  for(const w of BASE_WALLS) {
    const a=mapPlanPoint(...w.a,w.floor,l),b=mapPlanPoint(...w.b,w.floor,l),L=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const oldL=Math.hypot(w.b[0]-w.a[0],w.b[1]-w.a[1]);
    const openings=w.openings.map(o=>{const p=mapPlanPoint(w.a[0]+(w.b[0]-w.a[0])*o.u/oldL,w.a[1]+(w.b[1]-w.a[1])*o.u/oldL,w.floor,l);return {...o,u:Math.hypot(p[0]-a[0],p[1]-a[1])};}).sort((a,b)=>a.u-b.u);
    for(let i=0;i<openings.length;i++){const o=openings[i];if(o.u-o.width/2<.07||o.u+o.width/2>L-.07||(i&&o.u-o.width/2<openings[i-1].u+openings[i-1].width/2+.08))throw Error('Une ouverture ne tient plus dans sa cloison. Agrandissez la pièce voisine.');}
  }
  return l;
}
export function applyLayout(input) {
  const l=validateLayout(clone(input));
  LAYOUT=l;
  for(let i=0;i<ROOMS.length;i++) {
    const b=BASE_ROOMS[i],r=ROOMS[i];
    r.polygon=b.polygon.map(p=>mapPlanPoint(...p,b.floor));
    for(const key of ['view','look']) {const p=mapPlanPoint(b[key][0],b[key][2],b.floor);r[key]=[p[0],b[key][1],p[1]];}
    r.area=(polygonArea(r.polygon)-(r.subtract||0))*SCALE*SCALE;
  }
  for(let i=0;i<WALLS.length;i++) {
    const b=BASE_WALLS[i],w=WALLS[i],length=Math.hypot(b.b[0]-b.a[0],b.b[1]-b.a[1]);
    w.a=mapPlanPoint(...b.a,b.floor);w.b=mapPlanPoint(...b.b,b.floor);
    w.openings=b.openings.map(o=>{const p=mapPlanPoint(b.a[0]+(b.b[0]-b.a[0])*o.u/length,b.a[1]+(b.b[1]-b.a[1])*o.u/length,b.floor);return {...o,u:Math.hypot(p[0]-w.a[0],p[1]-w.a[1])};});
  }
  TOTAL_AREA=ROOMS.reduce((s,r)=>s+r.area,0);PROGRAM.area=TOTAL_AREA;
  return clone(l);
}
export function resizedLayout(id,width,depth) {
  const r=ROOMS.find(r=>r.id===id);if(!r)throw Error('Pièce inconnue.');
  if(!Number.isFinite(width)||!Number.isFinite(depth)||width<=0||depth<=0)throw Error('Indiquez une largeur et une profondeur positives.');
  const l=clone(LAYOUT),g=l.ground,f=l.first,w=width/SCALE,d=depth/SCALE;
  switch(id) {
    case 'living': l.width=w;l.depth=g.back+.07+d;break;
    case 'office':g.office=w+.07;g.back=d+.07;break;
    case 'entry':g.shower=g.office+.14+w;g.back=d+.07;break;
    case 'shower':g.service=g.shower+.14+w;g.back=d+.07;break;
    case 'wc-ground':g.service=l.width-.07-w;g.wc=d+.07;break;
    case 'utility':g.service=l.width-.07-w;g.wc=g.back-.14-d;break;
    case 'suite':f.suite=w+.07;f.back=l.depth-.07-d;break;
    case 'bedroom-2':f.east=l.width-.07-w;f.back=l.depth-.07-d;break;
    case 'bedroom-3':f.bed3=w+.07;f.back=d+.07;break;
    case 'bathroom':f.east=l.width-.07-w;f.bath=d+.07;break;
    case 'wc-first':f.wc=f.east+.14+w;f.bath=f.back-.14-d;break;
    case 'wardrobe':f.wc=l.width-.07-w;f.bath=f.back-.14-d;break;
    case 'gallery':f.east=f.bed3+.14+w;l.depth=d;break;
  }
  return validateLayout(l);
}
