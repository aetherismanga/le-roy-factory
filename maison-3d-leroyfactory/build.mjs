import { build } from "esbuild";
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
mkdirSync("dist", { recursive: true });
await build({
  entryPoints: ["src/app.js"],
  outfile: "dist/app.js",
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  alias: {
    "three/addons": path.resolve("node_modules/three/examples/jsm"),
    three: path.resolve("node_modules/three/build/three.module.js"),
  },
  legalComments: "eof",
});
copyFileSync("src/style.css", "dist/style.css");
let html = readFileSync("src/index.html", "utf8");
for (const f of ["app.js", "style.css"])
  html = html.replaceAll(
    f,
    f +
      "?v=" +
      createHash("sha256")
        .update(readFileSync("dist/" + f))
        .digest("hex")
        .slice(0, 12),
  );
writeFileSync("dist/index.html", html);
writeFileSync("dist/robots.txt", "User-agent: *\nDisallow: /\n");
console.log("Maison 3D LeroyFactory — independent preview built.");
