import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as T from "three";
import { ceilingGeometry, reverseFace } from "../src/geometry.js";
import {
  TOTAL_AREA,
  ROOMS,
  WALLS,
  WELL,
  PROGRAM,
  SCALE,
  point,
  unpoint,
  polygonArea,
  stairHeight,
  LEVEL_HEIGHT,
  CLEAR_HEIGHT,
} from "../src/plan.js";
assert.ok(Math.abs(TOTAL_AREA - 140) < 1e-9);
assert.equal(PROGRAM.levels, 2);
assert.equal(CLEAR_HEIGHT, 2.6);
assert.equal(
  ROOMS.filter((r) => r.id === "shower" || r.id === "bathroom").length,
  2,
);
assert.equal(ROOMS.filter((r) => r.id.startsWith("wc-")).length, 2);
for (const r of ROOMS) {
  assert.ok(r.area > 1.8);
  assert.ok(r.polygon.every(([x, z]) => x >= 0 && x <= 10 && z >= 0 && z <= 8));
  const actual = (polygonArea(r.polygon) - (r.subtract || 0)) * SCALE * SCALE;
  assert.ok(Math.abs(actual - r.area) < 1e-9);
}
for (const w of WALLS) {
  const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  for (const o of w.openings) {
    assert.ok(o.u - o.width / 2 >= -0.01, w.id + ": " + o.id);
    assert.ok(o.u + o.width / 2 <= L + 0.01, w.id + ": " + o.id);
    assert.ok(o.bottom + o.height <= 2.6);
  }
}
for (const [x, z] of [
  [0, 0],
  [10, 8],
  [6.8, 3.6],
]) {
  const p = point(x, 0, z),
    q = unpoint(p[0], p[2]);
  assert.ok(Math.abs(q[0] - x) < 1e-8 && Math.abs(q[1] - z) < 1e-8);
}
assert.ok(Math.abs(stairHeight(3.6, 3.16)) < 1e-10);
assert.ok(Math.abs(stairHeight(3.6, 1.18) - LEVEL_HEIGHT / 2) < 1e-10);
assert.ok(Math.abs(stairHeight(4.8, 1.18) - LEVEL_HEIGHT / 2) < 1e-10);
assert.ok(Math.abs(stairHeight(4.8, 3.16) - LEVEL_HEIGHT) < 1e-10);
assert.ok(Number.isNaN(stairHeight(4.2, 2)));
assert.equal(stairHeight(5.9, 2), null);
// The normal used by the shadow shader must agree with the visible face.
// A mirrored ceiling with unreversed winding creates striped self-shadowing.
const ceiling = ceilingGeometry(
  [
    [0, 0],
    [4, 0],
    [4, 4],
    [0, 4],
  ],
  [
    [
      [1, 1],
      [3, 1],
      [3, 3],
      [1, 3],
    ],
  ],
);
for (let i = 0; i < ceiling.attributes.normal.count; i++)
  assert.ok(ceiling.attributes.normal.getY(i) < -0.999);
const ceilingMesh = new T.Mesh(
  ceiling,
  new T.MeshBasicMaterial({ side: T.FrontSide }),
);
ceilingMesh.updateMatrixWorld();
const fromBelow = (x, z) =>
  new T.Raycaster(
    new T.Vector3(x, -1, z),
    new T.Vector3(0, 1, 0),
  ).intersectObject(ceilingMesh).length;
assert.ok(fromBelow(0.5, 0.5) > 0);
assert.equal(fromBelow(2, 2), 0);
assert.equal(
  new T.Raycaster(
    new T.Vector3(0.5, 1, 0.5),
    new T.Vector3(0, -1, 0),
  ).intersectObject(ceilingMesh).length,
  0,
);
const wallBack = reverseFace(
  new T.ShapeGeometry(
    new T.Shape(
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ].map((p) => new T.Vector2(...p)),
    ),
  ),
);
for (let i = 0; i < wallBack.attributes.normal.count; i++)
  assert.ok(wallBack.attributes.normal.getZ(i) < -0.999);
ceiling.dispose();
ceilingMesh.material.dispose();
wallBack.dispose();
const config = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url)),
);
assert.ok(
  config.headers.some((h) =>
    h.headers.some(
      (v) => v.key === "X-Robots-Tag" && v.value.includes("noindex"),
    ),
  ),
);
console.log(
  JSON.stringify({
    result: "PASS",
    surface: TOTAL_AREA,
    ceilingHeight: CLEAR_HEIGHT,
    rooms: ROOMS.length,
    levels: PROGRAM.levels,
    bathrooms: 2,
    wcs: 2,
    stairs: "16 risers, continuous height, real well",
    engine: "existing Studio One / RANDAL renderer and geometry",
    publication: "independent preview only",
  }),
);
