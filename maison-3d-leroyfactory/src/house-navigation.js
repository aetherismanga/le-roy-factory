import * as T from "three";
import { LEVEL_HEIGHT, SCALE, unpoint, stairHeight, WELL, LAYOUT } from "./plan.js";
export function collisionWorld(house, garden) {
  const radius = 0.18,
    obstacles = [...house.colliders, ...garden.obstacles],
    inside = (x, z) => x >= 0 && x <= LAYOUT.width && z >= 0 && z <= LAYOUT.depth;
  function groundAt(x, z, currentHeight) {
    const [px, pz] = unpoint(x, z);
    if (px < -5 || px > 16 || pz < -6 || pz > 21) return NaN;
    const sh = stairHeight(px, pz);
    if (sh !== null) return Number.isFinite(sh) ? sh + 0.02 : NaN;
    const floor = currentHeight > LEVEL_HEIGHT * 0.68 ? 1 : 0;
    if (floor && !inside(px, pz)) return NaN;
    return floor * LEVEL_HEIGHT + 0.02;
  }
  const doorMatrices=new Map(),doorPoint=new T.Vector3();
  function passable(x, z, height, { ignoreSteps = false } = {}) {
    const ground = groundAt(x, z, height);
    if (
      !Number.isFinite(ground) ||
      (!ignoreSteps && Math.abs(ground - height) > 0.23)
    )
      return false;
    const floor = ground > LEVEL_HEIGHT * 0.65 ? 1 : 0;
    for (const wall of house.floors[floor].walls) {
      const ax = wall.worldA[0],
        az = wall.worldA[2],
        dx = (wall.b[0] - wall.a[0]) * SCALE,
        dz = (wall.b[1] - wall.a[1]) * SCALE,
        L = wall.length,
        u = ((x - ax) * dx + (z - az) * dz) / L,
        dist = Math.abs((x - ax) * (-dz / L) + (z - az) * (dx / L));
      if (
        u < -0.08 ||
        u > L + 0.08 ||
        dist > radius + (wall.outside ? 0.12 : 0.07)
      )
        continue;
      const clear = wall.openings.some(
        (o) =>
          o.bottom < 0.08 &&
          (o.kind === "door"
            ? o.state.progress > 0.55
            : o.kind === "bay" && o.state.progress > 0.6) &&
          Math.abs(u - o.u) <
            o.width * (o.kind === "bay" ? 0.23 : 0.5) - radius * 0.65,
      );
      if (!clear) return false;
    }
    // The open leaf remains a physical object, including during its animation.
    for(const d of house.doors||[]){
      if(d.floor!==floor)continue;
      let cached=doorMatrices.get(d.id);
      if(!cached||cached.progress!==d.progress){d.asset.door.updateWorldMatrix(true,false);cached={progress:d.progress,inverse:d.asset.door.matrixWorld.clone().invert()};doorMatrices.set(d.id,cached);}
      doorPoint.set(x,floor*LEVEL_HEIGHT+.9,z).applyMatrix4(cached.inverse);
      if(doorPoint.y>0&&doorPoint.y<d.opening.height&&Math.abs(doorPoint.z)<.022+radius&&doorPoint.x>-.003-radius&&doorPoint.x<d.opening.width-.10+radius)return false;
    }
    for (const o of obstacles) {
      if (o.floor !== floor || o.maxY < 0.15 || o.minY > 1.6) continue;
      const c=Math.cos(o.angle||0),s=Math.sin(o.angle||0),dx=x-o.x,dz=z-o.z;
      if (
        Math.abs(dx*c-dz*s) < o.w / 2 + radius &&
        Math.abs(dx*s+dz*c) < o.d / 2 + radius
      )
        return false;
    }
    return true;
  }
  function route(start, goal) {
    const step = 0.2,
      floor = start.y > LEVEL_HEIGHT * 0.68 ? 1 : 0,
      height = floor * LEVEL_HEIGHT + 0.02,
      minX = -9,
      minZ = -11,
      maxX = 12,
      maxZ = 17,
      key = (x, z) => x + "," + z,
      toCell = (p) => [Math.round(p.x / step), Math.round(p.z / step)],
      initialStart = toCell(start),
      initialGoal = toCell(goal);
    const valid = (x, z) =>
      x * step >= minX &&
      x * step <= maxX &&
      z * step >= minZ &&
      z * step <= maxZ &&
      passable(x * step, z * step, height);
    const lineClear = (a, b) => {
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.04));
      for (let i = 0; i <= n; i++)
        if (
          !passable(
            a.x + ((b.x - a.x) * i) / n,
            a.z + ((b.z - a.z) * i) / n,
            height,
          )
        )
          return false;
      return true;
    };
    const nearest = (cell, p) => {
      let best = null,
        dist = Infinity;
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++) {
          const c = [cell[0] + dx, cell[1] + dz];
          if (!valid(...c)) continue;
          const q = { x: c[0] * step, z: c[1] * step },
            d = Math.hypot(q.x - p.x, q.z - p.z);
          if (d < dist && lineClear(p, q)) {
            best = c;
            dist = d;
          }
        }
      return best;
    };
    const s = nearest(initialStart, start),
      g = nearest(initialGoal, goal);
    if (!s || !g) return [];
    const open = [{ x: s[0], z: s[1], g: 0, f: 0 }],
      visited = new Map(),
      done = new Set();
    visited.set(key(...s), open[0]);
    let count = 0,
      last = null;
    while (open.length && count++ < 18000) {
      let best = 0;
      for (let i = 1; i < open.length; i++)
        if (open[i].f < open[best].f) best = i;
      const n = open.splice(best, 1)[0],
        k = key(n.x, n.z);
      if (done.has(k)) continue;
      done.add(k);
      if (n.x === g[0] && n.z === g[1]) {
        last = n;
        break;
      }
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        const x = n.x + dx,
          z = n.z + dz,
          kk = key(x, z);
        if (
          done.has(kk) ||
          !valid(x, z) ||
          (dx && dz && (!valid(n.x + dx, n.z) || !valid(n.x, n.z + dz)))
        )
          continue;
        const cost = n.g + (dx && dz ? 1.414 : 1),
          old = visited.get(kk);
        if (old && old.g <= cost) continue;
        const node = {
          x,
          z,
          g: cost,
          f: cost + Math.hypot(x - g[0], z - g[1]),
          parent: n,
        };
        visited.set(kk, node);
        open.push(node);
      }
    }
    if (!last) return [];
    const result = [];
    while (last.parent) {
      result.push(new T.Vector3(last.x * step, height, last.z * step));
      last = last.parent;
    }
    result.reverse();
    const first = new T.Vector3(s[0] * step, height, s[1] * step);
    if (Math.hypot(first.x - start.x, first.z - start.z) > 0.04)
      result.unshift(first);
    if (!result.length || result.at(-1).distanceTo(goal) > 0.03)
      result.push(new T.Vector3(goal.x, height, goal.z));
    return result;
  }
  return { groundAt, passable, route, radius, obstacles };
}
export function createHouseWalk({
  camera,
  canvas,
  controls,
  world,
  onChange,
  onInteract,
  onStatus,
}) {
  const keys = new Set(),
    eye = 1.58;
  let active = false,
    yaw = 0,
    pitch = 0,
    pointer = null,
    ground = 0.02,
    path = [],
    lookChanged = false;
  const forward = new T.Vector3(),
    side = new T.Vector3();
  const editing = (e) =>
    !!e?.closest?.("input,textarea,select,button,[contenteditable]");
  function updateLook() {
    camera.rotation.order = "YXZ";
    camera.rotation.set(pitch, yaw, 0);
    camera.updateMatrixWorld();
    controls.target
      .copy(camera.position)
      .add(new T.Vector3(0, 0, -1).applyEuler(camera.rotation));
  }
  function setPose(position, target) {
    camera.position.copy(position);
    const dir = target.clone().sub(position).normalize();
    yaw = Math.atan2(-dir.x, -dir.z);
    pitch = Math.asin(T.MathUtils.clamp(dir.y, -0.98, 0.98));
    ground = position.y - eye;
    path = [];
    updateLook();
  }
  function setActive(value) {
    active = value;
    controls.enabled = !value;
    keys.clear();
    path = [];
    if (value) {
      const d = controls.target.clone().sub(camera.position).normalize();
      yaw = Math.atan2(-d.x, -d.z);
      pitch = Math.asin(T.MathUtils.clamp(d.y, -0.95, 0.95));
      ground = camera.position.y - eye;
      updateLook();
    }
    onChange();
  }
  const map = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "turnLeft",
    ArrowRight: "turnRight",
    KeyW: "up",
    KeyZ: "up",
    KeyS: "down",
    KeyQ: "left",
    KeyA: "left",
    KeyD: "right",
    KeyE: "right",
  };
  document.addEventListener("keydown", (e) => {
    if (!active || editing(e.target) || e.ctrlKey || e.metaKey || e.altKey)
      return;
    if (map[e.code]) {
      e.preventDefault();
      keys.add(map[e.code]);
      path = [];
    }
    if (e.code === "ShiftLeft") keys.add("fast");
  });
  document.addEventListener("keyup", (e) => {
    if (map[e.code]) keys.delete(map[e.code]);
    if (e.code === "ShiftLeft") keys.delete("fast");
  });
  window.addEventListener("blur", () => keys.clear());
  const finish = (e) => {
    if (!pointer || pointer.id !== e.pointerId) return;
    const tap = pointer.total < 7;
    pointer = null;
    if (tap) onInteract(e);
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (!active) return;
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, total: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!active || pointer?.id !== e.pointerId) return;
    const dx = e.clientX - pointer.x,
      dy = e.clientY - pointer.y;
    pointer.total += Math.hypot(dx, dy);
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    yaw -= dx * 0.0035;
    pitch = T.MathUtils.clamp(pitch - dy * 0.0035, -1.24, 1.24);
    updateLook();
    lookChanged = true;
  });
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", () => (pointer = null));
  for (const b of document.querySelectorAll("[data-move]")) {
    const release = () => keys.delete(b.dataset.move);
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      keys.add(b.dataset.move);
      path = [];
    });
    b.addEventListener("pointerup", release);
    b.addEventListener("pointercancel", release);
  }
  function walkTo(target) {
    if (!active) return false;
    const route = world.route(
      new T.Vector3(camera.position.x, ground, camera.position.z),
      target,
    );
    if (!route.length) {
      onStatus("Choisissez un passage dégagé, ou ouvrez la porte.");
      return false;
    }
    path = route;
    onStatus("Déplacement vers ce point");
    return true;
  }
  function tick(dt) {
    if (!active) return false;
    dt = Math.min(0.04, dt);
    let changed = lookChanged;
    lookChanged = false;
    const turn = (+keys.has("turnLeft") - +keys.has("turnRight")) * 1.55 * dt;
    if (turn) {
      yaw += turn;
      changed = true;
    }
    forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
    side.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const move = forward
      .multiplyScalar(+keys.has("up") - +keys.has("down"))
      .addScaledVector(side, +keys.has("right") - +keys.has("left"));
    const speed = keys.has("fast") ? 2.9 : 1.65;
    if (path.length) {
      const target = path[0],
        dx = target.x - camera.position.x,
        dz = target.z - camera.position.z;
      if (Math.hypot(dx, dz) < 0.06) path.shift();
      else move.set(dx, 0, dz).normalize();
    }
    if (move.lengthSq() > 0.0001) {
      move.normalize().multiplyScalar(speed * dt);
      const p = camera.position;
      for (const [dx, dz] of [
        [move.x, 0],
        [0, move.z],
      ]) {
        if (world.passable(p.x + dx, p.z + dz, ground)) {
          p.x += dx;
          p.z += dz;
          ground = world.groundAt(p.x, p.z, ground);
        } else if (path.length) {
          path = [];
          onStatus("Le passage est occupé.");
        }
      }
      p.y = T.MathUtils.damp(p.y, ground + eye, 18, dt);
      changed = true;
    }
    if (changed) {
      updateLook();
      onChange();
    }
    return changed;
  }
  return {
    get active() {
      return active;
    },
    get ground() {
      return ground;
    },
    get pathLength() {
      return path.length;
    },
    setActive,
    setWorld(next){world=next;keys.clear();path=[];},
    setPose,
    walkTo,
    tick,
    stop() {
      keys.clear();
      path = [];
    },
    debugMove(dx, dz) {
      const p = camera.position;
      if (!world.passable(p.x + dx, p.z + dz, ground)) return false;
      p.x += dx;
      p.z += dz;
      ground = world.groundAt(p.x, p.z, ground);
      p.y = ground + eye;
      updateLook();
      return true;
    },
  };
}
