import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
// Build in world X/Z first. Mirroring an already triangulated ceiling would
// leave its winding and shadow normal pointing in opposite directions.
export function ceilingGeometry(polygon, holes = []) {
  const shape = new T.Shape(polygon.map((p) => new T.Vector2(...p)));
  for (const hole of holes)
    shape.holes.push(new T.Path(hole.map((p) => new T.Vector2(...p))));
  return new T.ShapeGeometry(shape).rotateX(Math.PI / 2);
}
export function reverseFace(geometry) {
  const index = geometry.index;
  for (let i = 0; i < index.count; i += 3) {
    const b = index.getX(i + 1);
    index.setX(i + 1, index.getX(i + 2));
    index.setX(i + 2, b);
  }
  index.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
export function mesh(parent, g, m, name, x = 0, y = 0, z = 0) {
  const o = new T.Mesh(g, m);
  o.name = name;
  o.position.set(x, y, z);
  o.castShadow = !m.transparent;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
export function box(
  parent,
  w,
  h,
  d,
  m,
  x = 0,
  y = 0,
  z = 0,
  name = "Element",
  r = 0.004,
) {
  return mesh(
    parent,
    r
      ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 4, h / 4, d / 4))
      : new T.BoxGeometry(w, h, d),
    m,
    name,
    x,
    y,
    z,
  );
}
export function cylinder(
  parent,
  r,
  h,
  m,
  x = 0,
  y = 0,
  z = 0,
  name = "Cylindre",
  n = 32,
  r2 = r,
) {
  return mesh(parent, new T.CylinderGeometry(r2, r, h, n), m, name, x, y, z);
}
export function sphere(
  parent,
  r,
  m,
  x,
  y,
  z,
  scale = [1, 1, 1],
  name = "Forme",
) {
  const o = mesh(parent, new T.SphereGeometry(r, 24, 14), m, name, x, y, z);
  o.scale.set(...scale);
  return o;
}
export function tube(parent, points, r, m, name = "Tube") {
  return mesh(
    parent,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
      Math.max(12, points.length * 8),
      r,
      10,
      false,
    ),
    m,
    name,
  );
}
export function group(parent, x = 0, y = 0, z = 0, angle = 0, name = "Objet") {
  const g = new T.Group();
  g.name = name;
  g.position.set(x, y, z);
  g.rotation.y = angle;
  parent.add(g);
  return g;
}
export function clothSurface(
  parent,
  w,
  d,
  m,
  x,
  y,
  z,
  { drop = 0.18, seed = 0, name = "Textile", segments = 30 } = {},
) {
  const g = new T.PlaneGeometry(w, d, segments, segments),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i),
      v = p.getY(i),
      edge = Math.max(Math.abs(u) / (w / 2), Math.abs(v) / (d / 2)),
      drape = Math.max(0, (edge - 0.8) / 0.2) ** 2 * drop,
      fold =
        (Math.sin(u * 21 + seed) * 0.006 + Math.sin(v * 31 + u * 4) * 0.004) *
        (0.25 + edge * edge);
    p.setZ(i, fold - drape);
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  const o = mesh(parent, g, m, name, x, y, z);
  o.material.side = T.DoubleSide;
  return o;
}
export function setUVMetres(g) {
  const p = g.attributes.position,
    n = g.attributes.normal,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)),
      ny = Math.abs(n.getY(i));
    if (nx > 0.7) uv.setXY(i, p.getZ(i), p.getY(i));
    else if (ny > 0.7) uv.setXY(i, p.getX(i), p.getZ(i));
    else uv.setXY(i, p.getX(i), p.getY(i));
  }
  uv.needsUpdate = true;
  return g;
}
// Bake only authored static furniture. Architecture, mirrors, doors, movable
// drawers, lights and selectable floor finishes retain their real objects.
export function batchFurniture(
  root,
  { exclude = [], label = "Mobilier_détaillé_assemblé" } = {},
) {
  const skipped = new Set(exclude);
  const preserved = (o) => {
    for (let a = o; a && a !== root; a = a.parent)
      if (!a.visible || skipped.has(a) || a.userData.dynamic) return true;
    return false;
  };
  root.updateMatrixWorld(true);
  const inverse = new T.Matrix4().copy(root.matrixWorld).invert(),
    batches = new Map(),
    remove = [];
  root.traverse((o) => {
    if (
      !o.visible ||
      !o.isMesh ||
      o.isInstancedMesh ||
      o.isReflector ||
      preserved(o) ||
      o.userData.dynamic ||
      o.material?.transparent ||
      Array.isArray(o.material) ||
      !o.geometry.attributes.uv
    )
      return;
    const key = o.material.uuid + "-" + o.castShadow;
    let batch = batches.get(key);
    if (!batch) {
      batch = { material: o.material, cast: o.castShadow, geometries: [] };
      batches.set(key, batch);
    }
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.deleteAttribute("uv1");
    g.deleteAttribute("tangent");
    g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
    batch.geometries.push(g);
    remove.push(o);
  });
  for (const o of remove) o.removeFromParent();
  for (const b of batches.values()) {
    const g = mergeGeometries(b.geometries, false);
    b.geometries.forEach((g) => g.dispose());
    if (!g) continue;
    const o = mesh(root, g, b.material, label);
    o.castShadow = b.cast;
  }
  return batches.size;
}
