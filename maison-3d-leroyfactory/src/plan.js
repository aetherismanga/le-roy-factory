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
export const TOTAL_AREA = ROOMS.reduce((s, r) => s + r.area, 0);
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
    [opening("office-door", 2.68, 0.88)],
  ),
  wall("office-back", 0, [0, 3.43], [2.87, 3.43]),
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
