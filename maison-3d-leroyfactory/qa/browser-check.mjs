const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const origin = process.env.HOUSE_URL || process.argv[2];
if (!origin)
  throw Error(
    "Usage: HOUSE_URL=https://votre-preview.vercel.app npm run check:browser",
  );
const base = fileURLToPath(new URL("../qa-results", import.meta.url));
fs.mkdirSync(path.join(base, "qa-house"), { recursive: true });

(async () => {
  const b = await chromium.launch({
    headless: true,
    ...(process.env.https_proxy || process.env.HTTPS_PROXY
      ? {
          proxy: { server: process.env.https_proxy || process.env.HTTPS_PROXY },
        }
      : {}),
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const p = await b.newPage({
        viewport: { width: 1180, height: 820 },
        ignoreHTTPSErrors: true,
        reducedMotion: "reduce",
      }),
      errors = [];
    p.setDefaultTimeout(60000);
    p.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("ERROR", e.message);
    });
    p.on("console", (m) => {
      if (m.type() === "error") {
        errors.push(m.text());
        console.log("CONSOLE", m.text().slice(0, 300));
      }
    });

    await p.goto(origin, { waitUntil: "domcontentloaded" });
    await p.waitForFunction(() => window.maison3D?.getState().ready, null, {
      timeout: 120000,
    });
    await p.waitForFunction(() => document.querySelector("#loading").hidden);
    await p.evaluate(() => window.maison3D.setQuality("balanced"));
    await p.locator("#enter").click();
    // Every bookmark starts in physically free space, rather than inside a model.
    const poses = await p.evaluate(() => {
      const a = window.maison3D,
        rooms = a.getState().rooms;
      return rooms.map((r) => {
        a.goRoom(r.id);
        const s = a.getState();
        return {
          id: r.id,
          pose: a.getRoomPose(r.id),
          free: a.canStand(s.camera[0], s.camera[2], s.ground),
          floor: s.floor,
        };
      });
    });
    console.log("POSES", poses);
    assert.ok(
      poses.every((r) => r.free),
      "bookmark collides with room furniture",
    );
    // Genuine routes between rooms use open doorways and avoid cabinets and walls.
    for (const [start, targets] of [
      ["living", ["entry", "office", "shower", "wc-ground", "utility"]],
      [
        "gallery",
        ["suite", "bedroom-2", "bedroom-3", "bathroom", "wc-first", "wardrobe"],
      ],
    ]) {
      await p.evaluate((id) => window.maison3D.goRoom(id), start);
      const routes = await p.evaluate(
        (ids) =>
          ids.map((id) => ({
            id,
            length: window.maison3D.getRouteToRoom(id).length,
          })),
        targets,
      );
      console.log("ROUTES", start, routes);
      assert.ok(
        routes.every((r) => r.length > 0),
        "an interior room cannot be reached by the floor route planner",
      );
    }
    // Physically walk all 16 stair risers, the turn and back down in small steps.
    const stair = await p.evaluate(() => {
      const a = window.maison3D,
        S = 1.0004917911214477;
      const move = (dx, dz, n) => {
        for (let i = 0; i < n; i++)
          if (!a.debugMove((dx * S) / n, (dz * S) / n))
            return { ok: false, at: a.getState() };
        return { ok: true };
      };
      a.goRoom("entry");
      a.setPose([3.61, 1.6, 3.36], [3.61, 1.6, 1.0]);
      const checks = [];
      checks.push(move(0, -2.65, 106));
      checks.push(move(1.18, 0, 48));
      checks.push(move(0, 2.65, 106));
      const top = a.getState();
      checks.push(move(0, -2.65, 106));
      checks.push(move(-1.18, 0, 48));
      checks.push(move(0, 2.65, 106));
      return { checks, top, back: a.getState() };
    });
    console.log(
      "STAIRS",
      stair.checks.map((c) => c.ok),
      "heights",
      stair.top.ground,
      stair.back.ground,
    );
    assert.ok(
      stair.checks.every((c) => c.ok),
      "physical staircase has a blocked tread or turn",
    );
    assert.ok(Math.abs(stair.top.ground - 2.86) < 0.03);
    assert.ok(Math.abs(stair.back.ground - 0.02) < 0.03);
    // Closed doors block the doorway; opening really restores the route.
    await p.evaluate(() => {
      window.maison3D.goRoom("entry");
      window.maison3D.openDoor("office-door", false);
    });
    await p.waitForFunction(
      () =>
        window.maison3D
          .getNavigation()
          .walls.find((w) => w.id === "office-side").openings[0].progress < 0.1,
    );
    const blocked = await p.evaluate(() =>
      window.maison3D.canStand(
        (2.87 - 5) * 1.0004917911214477,
        (2.68 - 4) * 1.0004917911214477,
        0.02,
      ),
    );
    assert.equal(blocked, false);
    await p.evaluate(() => window.maison3D.openDoor("office-door", true));
    await p.waitForFunction(
      () =>
        window.maison3D
          .getNavigation()
          .walls.find((w) => w.id === "office-side").openings[0].progress > 0.8,
    );
    assert.equal(
      await p.evaluate(() =>
        window.maison3D.canStand(
          (2.87 - 5) * 1.0004917911214477,
          (2.68 - 4) * 1.0004917911214477,
          0.02,
        ),
      ),
      true,
    );
    // Mobile controls must remain inside the visible viewport in both orientations.
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 360, height: 640 },
      { width: 844, height: 390 },
    ]) {
      await p.setViewportSize(viewport);
      await p.evaluate(() => window.maison3D.goRoom("living"));
      const boxes = await p.evaluate(() =>
        [
          "#rooms-open",
          "#tour-start",
          "#settings-open",
          "#home-view",
          "[data-move=up]",
          "[data-move=right]",
        ].map((s) => {
          const r = document.querySelector(s).getBoundingClientRect();
          return {
            s,
            x: r.x,
            y: r.y,
            right: r.right,
            bottom: r.bottom,
            w: r.width,
            h: r.height,
          };
        }),
      );
      assert.ok(
        boxes.every(
          (r) =>
            r.y >= 0 &&
            r.bottom <= viewport.height + 0.5 &&
            r.x >= 0 &&
            r.right <= viewport.width + 0.5 &&
            r.w >= 30 &&
            r.h >= 30,
        ),
        JSON.stringify({ viewport, boxes }),
      );
      console.log("MOBILE", viewport, "all controls reachable");
      await p.locator("#rooms-open").click();
      assert.equal(await p.locator("#room-list [data-room]").count(), 13);
      await p.locator("#rooms-close").click();
    }

    await p.setViewportSize({ width: 390, height: 844 });
    await p.evaluate(() => {
      window.maison3D.goRoom("entry");
      window.maison3D.setPose([6, 1.6, 3.05], [6, 1.6, 5.5]);
    });
    const before = await p.evaluate(() => window.maison3D.getState().camera);
    const up = await p.locator("[data-move=up]").boundingBox();
    await p.mouse.move(up.x + up.width / 2, up.y + up.height / 2);
    await p.mouse.down();
    try {
      await p.waitForFunction(
        (before) =>
          Math.hypot(
            window.maison3D.getState().camera[0] - before[0],
            window.maison3D.getState().camera[2] - before[2],
          ) > 0.04,
        before,
      );
    } finally {
      await p.mouse.up();
    }
    console.log("MOVEMENT PAD PASS");
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.evaluate(() => {
      window.maison3D.goRoom("living");
      window.maison3D.setLight("golden");
      window.maison3D.setQuality("high");
    });
    await p.screenshot({
      path: base + "/qa-house/09-golden.png",
      timeout: 90000,
    });
    await p.evaluate(() => window.maison3D.setLight("night"));
    await p.screenshot({
      path: base + "/qa-house/10-night.png",
      timeout: 90000,
    });
    const diag = await p.evaluate(() => window.maison3D.getDiagnostics());
    assert.deepEqual(errors, []);
    assert.deepEqual(diag.materialFailures, []);
    fs.writeFileSync(
      base + "/qa-house/deep-results.json",
      JSON.stringify({ poses, stair, diag, errors }, null, 2),
    );
    console.log("DEEP PASS", diag);
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
