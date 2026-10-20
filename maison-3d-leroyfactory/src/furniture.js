import * as T from "three";
import {
  box,
  cylinder,
  sphere,
  tube,
  group,
  clothSurface,
  mesh,
  setUVMetres,
} from "./geometry.js";
import { artTexture } from "./materials.js";
export function furnitureKit(M) {
  const pillow = (p, w, h, d, x, y, z, mat = M.ivoryFabric, angle = 0) => {
    const geo = new T.SphereGeometry(1, 36, 24),
      a = geo.attributes.position;
    const puff = (v) => Math.sign(v) * Math.pow(Math.abs(v), 0.55);
    for (let i = 0; i < a.count; i++) {
      const xx = a.getX(i),
        yy = a.getY(i),
        zz = a.getZ(i);
      a.setXYZ(
        i,
        (puff(xx) * w) / 2,
        (puff(yy) * h) / 2,
        (puff(zz) * d) / 2 + Math.sin(xx * 24 + yy * 19) * 0.0016,
      );
    }
    geo.computeVertexNormals();
    const o = mesh(p, geo, mat, "Coussin_garni", x, y, z);
    o.rotation.z = angle;
    return o;
  };
  function plant(p, x = 0, y = 0, z = 0, size = 1) {
    const g = group(p, x, y, z, 0, "Plante_décorative");
    cylinder(
      g,
      0.18 * size,
      0.33 * size,
      M.terracotta,
      0,
      0.165 * size,
      0,
      "Pot_céramique",
      40,
      0.215 * size,
    );
    cylinder(
      g,
      0.185 * size,
      0.012 * size,
      M.earth,
      0,
      0.333 * size,
      0,
      "Terre",
    );
    for (let i = 0; i < 13; i++) {
      const a = i * 2.399,
        h = (0.48 + (i % 5) * 0.115) * size,
        rad = (0.13 + (i % 3) * 0.065) * size;
      const end = [Math.cos(a) * rad, h, Math.sin(a) * rad];
      tube(
        g,
        [[0, 0.33 * size, 0], [end[0] * 0.45, h * 0.75, end[2] * 0.45], end],
        0.004 * size,
        M.leaf,
        "Tige",
      );
      const leaf = sphere(
        g,
        1,
        i % 3 ? M.leaf : M.leafLight,
        end[0],
        h - 0.06 * size,
        end[2],
        [0.08 * size, 0.22 * size, 0.008 * size],
        "Feuille",
      );
      leaf.rotation.set(0.55, a, 0.45);
    }
    return g;
  }
  function vase(p, x, y, z, size = 0.22) {
    const pts = [
      [0.05, 0],
      [0.075, 0.03],
      [0.085, 0.12],
      [0.064, 0.18],
      [0.031, 0.2],
      [0.03, 0.27],
      [0.027, 0.277],
    ].map((a) => new T.Vector2(...a));
    const o = mesh(
      p,
      new T.LatheGeometry(pts, 36),
      M.whiteCeramic,
      "Vase",
      x,
      y,
      z,
    );
    o.scale.setScalar(size / 0.27);
    for (let i = 0; i < 4; i++)
      tube(
        p,
        [
          [x, y + size * 0.7, z],
          [x + 0.03 * (i - 1), y + size * 1.3, z + 0.02 * i],
          [x + 0.06 * (i - 1), y + size * 1.8, z + 0.03 * i],
        ],
        0.0017,
        M.trunk,
        "Branche_sculpturale",
      );
    return o;
  }
  function books(p, x, y, z, n = 7) {
    for (let i = 0; i < n; i++) {
      const h = 0.17 + (i % 4) * 0.025,
        w = 0.027 + (i % 3) * 0.011;
      box(
        p,
        w,
        h,
        0.15,
        M.books[i % 4],
        x + i * 0.045,
        y + h / 2,
        z,
        "Livre_relié",
        0.001,
      );
      if (i % 3 === 1) {
        box(
          p,
          w * 0.7,
          0.003,
          0.001,
          M.bronze,
          x + i * 0.045,
          y + h * 0.67,
          z + 0.076,
          "Dorure_livre",
          0,
        );
      }
    }
  }
  function tableLamp(p, x, y, z) {
    cylinder(p, 0.085, 0.025, M.bronze, x, y + 0.013, z, "Socle_lampe");
    cylinder(p, 0.012, 0.23, M.bronze, x, y + 0.13, z, "Pied_lampe");
    const shade = mesh(
      p,
      new T.CylinderGeometry(0.09, 0.145, 0.19, 40, 1, true),
      M.ivoryFabric,
      "Abat_jour",
      x,
      y + 0.32,
      z,
    );
    M.ivoryFabric.side = T.DoubleSide;
    sphere(p, 0.022, M.led, x, y + 0.28, z);
    return shade;
  }
  function art(p, w, h, x, y, z, angle = 0, seed = 1) {
    const g = group(p, x, y, z, angle, "Tableau_encadré");
    box(
      g,
      w + 0.035,
      h + 0.035,
      0.026,
      M.walnut,
      0,
      0,
      0,
      "Cadre_chêne",
      0.002,
    );
    box(g, w, h, 0.006, M.ivoryFabric, 0, 0, 0.017, "Passe_partout", 0);
    mesh(
      g,
      new T.PlaneGeometry(w * 0.88, h * 0.88),
      new T.MeshStandardMaterial({ map: artTexture(seed), roughness: 1 }),
      "Œuvre_abstraite",
      0,
      0,
      0.023,
    );
    return g;
  }
  function rug(p, w, d, x, z, mat = M.rug) {
    const o = box(p, w, 0.012, d, mat, x, 0.008, z, "Tapis_tissé", 0.006);
    for (const sign of [-1, 1])
      for (let i = 0; i < 32; i++) {
        const xx = x - w / 2 + 0.025 + (i * (w - 0.05)) / 31;
        tube(
          p,
          [
            [xx, 0.013, z + (sign * d) / 2],
            [xx + 0.005, 0.012, z + sign * (d / 2 + 0.045)],
          ],
          0.0013,
          M.ivoryFabric,
          "Frange_tapis",
        );
      }
    return o;
  }
  function sofa(p, w = 2.85) {
    const g = group(p, 0, 0, 0, 0, "Canapé_d_angle");
    box(
      g,
      w - 0.1,
      0.22,
      0.94,
      M.linen,
      0,
      0.28,
      0,
      "Structure_tapissée",
      0.065,
    );
    for (const x of [-w / 2 + 0.17, w / 2 - 0.17])
      for (const z of [-0.34, 0.34])
        cylinder(g, 0.024, 0.17, M.black, x, 0.085, z, "Pied_canapé");
    box(g, w, 0.52, 0.21, M.linen, 0, 0.64, -0.43, "Dossier", 0.09);
    for (const s of [-1, 1])
      box(
        g,
        0.2,
        0.46,
        1.02,
        M.linen,
        s * (w / 2 - 0.1),
        0.51,
        0,
        "Accoudoir",
        0.08,
      );
    const cw = (w - 0.45) / 3;
    for (let i = 0; i < 3; i++) {
      pillow(
        g,
        cw - 0.018,
        0.2,
        0.82,
        -w / 2 + 0.225 + cw * (i + 0.5),
        0.46,
        0.02,
        M.ivoryFabric,
      );
      const c = pillow(
        g,
        cw - 0.024,
        0.43,
        0.19,
        -w / 2 + 0.225 + cw * (i + 0.5),
        0.76,
        -0.31,
        M.linen,
      );
      c.rotation.x = -0.12;
    }
    box(
      g,
      0.88,
      0.23,
      0.78,
      M.linen,
      -w / 2 + 0.61,
      0.28,
      0.79,
      "Méridienne",
      0.08,
    );
    pillow(g, 0.85, 0.2, 0.79, -w / 2 + 0.61, 0.46, 0.77, M.ivoryFabric);
    pillow(g, 0.39, 0.39, 0.14, -w / 2 + 0.36, 0.74, -0.08, M.sageFabric, 0.23);
    pillow(g, 0.44, 0.44, 0.15, w / 2 - 0.4, 0.74, -0.06, M.clayFabric, -0.18);
    clothSurface(g, 0.82, 0.9, M.charcoalFabric, 0.45, 0.59, 0.2, {
      drop: 0.25,
      name: "Plaid_sur_canapé",
    });
    return g;
  }
  function chair(p, { arm = false, mat = M.ivoryFabric } = {}) {
    const g = group(p, 0, 0, 0, 0, arm ? "Fauteuil_bouclé" : "Chaise_tapissée");
    for (const x of [-0.2, 0.2])
      for (const z of [-0.2, 0.2]) {
        const leg = cylinder(g, 0.017, 0.43, M.oak, x, 0.215, z);
        leg.rotation.z = x > 0 ? -0.08 : 0.08;
      }
    pillow(g, 0.51, 0.1, 0.51, 0, 0.47, 0, mat);
    const back = pillow(g, 0.5, 0.39, 0.105, 0, 0.7, -0.22, mat);
    back.rotation.x = -0.12;
    if (arm)
      for (const x of [-0.265, 0.265]) {
        box(g, 0.07, 0.25, 0.48, mat, x, 0.6, 0, "Accoudoir", 0.035);
      }
    return g;
  }
  function dining(p) {
    const g = group(p, 0, 0, 0, 0, "Table_de_salle_à_manger");
    box(g, 2.15, 0.055, 1.02, M.oak, 0, 0.75, 0, "Plateau_chêne_massif", 0.045);
    for (const x of [-0.72, 0.72])
      box(g, 0.075, 0.7, 0.68, M.oak, x, 0.365, 0, "Piètement_tréteau", 0.02);
    for (const z of [-0.82, 0.82])
      for (const x of [-0.7, 0, 0.7]) {
        const c = chair(g);
        c.position.set(x, 0, z);
        c.rotation.y = z < 0 ? Math.PI : 0;
      }
    for (const x of [-0.68, 0, 0.68])
      for (const z of [-0.27, 0.27]) {
        cylinder(g, 0.14, 0.009, M.whiteCeramic, x, 0.785, z, "Assiette", 40);
        cylinder(g, 0.042, 0.1, M.whiteCeramic, x + 0.2, 0.83, z, "Tasse", 32);
        const napkin = box(
          g,
          0.11,
          0.004,
          0.16,
          M.linen,
          x - 0.21,
          0.788,
          z,
          "Serviette_en_lin",
          0.003,
        );
        cylinder(
          g,
          0.034,
          0.09,
          M.glass,
          x + 0.15,
          0.835,
          z - 0.12,
          "Verre",
          32,
        );
      }
    vase(g, 0, 0.785, 0, 0.19);
    return g;
  }
  function coffeeTable(p) {
    const g = group(p, 0, 0, 0, 0, "Tables_basses_gigognes");
    for (const [x, z, r, h] of [
      [0, 0, 0.49, 0.34],
      [0.45, 0.3, 0.3, 0.27],
    ]) {
      cylinder(g, r, 0.04, M.stone, x, h, z, "Plateau_travertin", 64);
      cylinder(
        g,
        r * 0.52,
        h - 0.03,
        M.walnut,
        x,
        (h - 0.03) / 2,
        z,
        "Piètement_strié",
        48,
      );
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        cylinder(
          g,
          0.009,
          h - 0.055,
          M.oak,
          x + Math.cos(a) * r * 0.52,
          (h - 0.055) / 2,
          z + Math.sin(a) * r * 0.52,
          "Cannelure",
          8,
        );
      }
    }
    box(
      g,
      0.21,
      0.025,
      0.28,
      M.books[3],
      -0.08,
      0.379,
      0.04,
      "Livre_d_art",
      0.002,
    );
    vase(g, 0.17, 0.37, -0.1, 0.16);
    return g;
  }
  function tv(p, w = 1.55) {
    const g = group(p, 0, 0, 0, 0, "Ensemble_TV");
    box(g, w + 0.08, 0.9, 0.045, M.black, 0, 1.2, 0, "Cadre_écran", 0.015);
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 576;
    const c = canvas.getContext("2d"),
      gradient = c.createLinearGradient(0, 0, 1024, 576);
    gradient.addColorStop(0, "#253b3c");
    gradient.addColorStop(0.5, "#526050");
    gradient.addColorStop(1, "#1a2727");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 1024, 576);
    c.fillStyle = "#f4e7c9";
    c.font = "200 60px Georgia";
    c.fillText("LE ROY FACTORY", 160, 270);
    c.font = "16px Arial";
    c.fillText("L ’ A R T   D ’ H A B I T E R", 310, 320);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    mesh(
      g,
      new T.PlaneGeometry(w, 0.84),
      new T.MeshPhysicalMaterial({
        map: texture,
        roughness: 0.17,
        emissive: "#ffffff",
        emissiveMap: texture,
        emissiveIntensity: 0.18,
      }),
      "Écran",
      0,
      1.2,
      0.025,
    );
    box(g, 2.25, 0.3, 0.4, M.walnut, 0, 0.36, 0.1, "Meuble_TV_suspendu", 0.015);
    for (const x of [-0.74, 0, 0.74])
      box(
        g,
        0.727,
        0.27,
        0.019,
        M.oak,
        x,
        0.36,
        0.313,
        "Porte_meuble_TV",
        0.002,
      );
    books(g, -0.95, 0.52, 0.1, 4);
    vase(g, 0.78, 0.52, 0.1, 0.16);
    return g;
  }
  function bed(p, w = 1.6, mat = M.ivoryFabric) {
    const g = group(p, 0, 0, 0, 0, "Lit_avec_linge");
    box(g, w + 0.1, 0.26, 2.13, M.linen, 0, 0.25, 0, "Sommier_tapissé", 0.075);
    box(g, w, 0.24, 2.0, M.ivoryFabric, 0, 0.48, 0, "Matelas", 0.09);
    box(g, w + 0.36, 1.15, 0.1, M.linen, 0, 0.75, -1.05, "Tête_de_lit", 0.055);
    for (const x of [-w / 2 + 0.13, w / 2 - 0.13])
      for (const z of [-0.86, 0.86])
        cylinder(g, 0.025, 0.13, M.black, x, 0.065, z);
    clothSurface(g, w + 0.2, 1.8, mat, 0, 0.615, 0.22, {
      drop: 0.26,
      seed: 2,
      name: "Couette_drapée",
      segments: 46,
    });
    clothSurface(g, w + 0.19, 0.52, M.charcoalFabric, 0, 0.632, 0.73, {
      drop: 0.18,
      seed: 4,
      name: "Jeté_de_lit",
    });
    for (const x of w > 1.3 ? [-w / 4, w / 4] : [0]) {
      pillow(g, w > 1.3 ? w / 2 - 0.06 : 0.7, 0.19, 0.47, x, 0.7, -0.65);
      pillow(g, 0.48, 0.32, 0.14, x, 0.81, -0.79, mat, 0.08);
    }
    return g;
  }
  function nightstand(p) {
    const g = group(p, 0, 0, 0);
    box(g, 0.44, 0.4, 0.38, M.walnut, 0, 0.27, 0, "Chevet", 0.015);
    box(g, 0.4, 0.14, 0.018, M.oak, 0, 0.34, 0.2, "Tiroir_chevet", 0.003);
    box(g, 0.08, 0.008, 0.018, M.bronze, 0, 0.35, 0.217, "Prise_de_main");
    tableLamp(g, 0, 0.48, 0);
    return g;
  }
  function wardrobe(p, w = 1.8, h = 2.45) {
    const g = group(p, 0, 0, 0, 0, "Dressing_toute_hauteur");
    box(g, w, h, 0.56, M.oak, 0, h / 2, 0, "Caisson_dressing", 0.005);
    for (let i = 0; i < Math.ceil(w / 0.55); i++) {
      const n = Math.ceil(w / 0.55),
        cw = w / n;
      box(
        g,
        cw - 0.003,
        h - 0.06,
        0.022,
        M.paint,
        -w / 2 + cw * (i + 0.5),
        h / 2,
        0.291,
        "Porte_dressing",
        0.003,
      );
      box(
        g,
        0.009,
        0.33,
        0.018,
        M.bronze,
        -w / 2 + cw * (i + 0.5) + cw * 0.3,
        1.08,
        0.31,
        "Poignée_dressing",
      );
    }
    return g;
  }
  function desk(p, w = 1.3) {
    const g = group(p, 0, 0, 0, 0, "Bureau_aménagé");
    box(g, w, 0.035, 0.58, M.oak, 0, 0.75, 0, "Plateau_bureau", 0.012);
    for (const x of [-w / 2 + 0.065, w / 2 - 0.065])
      box(g, 0.035, 0.72, 0.48, M.black, x, 0.36, 0, "Piètement_bureau");
    box(g, 0.45, 0.3, 0.028, M.black, -0.12, 1.05, -0.17, "Moniteur", 0.008);
    box(g, 0.07, 0.13, 0.035, M.black, -0.12, 0.84, -0.17, "Pied_moniteur");
    box(g, 0.23, 0.012, 0.14, M.black, -0.12, 0.779, -0.13, "Socle_moniteur");
    box(g, 0.32, 0.014, 0.11, M.books[3], -0.12, 0.79, 0.1, "Clavier", 0.003);
    books(g, w / 2 - 0.27, 0.77, -0.12, 3);
    plant(g, -w / 2 + 0.12, 0.77, -0.12, 0.28);
    return g;
  }
  function bookcase(p, w = 1.8, h = 2.3) {
    const g = group(p, 0, 0, 0, 0, "Bibliothèque");
    box(g, w, h, 0.045, M.paint, 0, h / 2, -0.15, "Fond_bibliothèque");
    for (const x of [-w / 2, w / 2])
      box(g, 0.025, h, 0.34, M.oak, x, h / 2, 0, "Montant");
    for (let j = 0; j < 6; j++) {
      const y = 0.12 + (j * (h - 0.16)) / 5;
      box(g, w, 0.027, 0.35, M.oak, 0, y, 0, "Étagère");
      if (j < 5) {
        books(g, -w / 2 + 0.06, y + 0.02, 0, Math.floor(w / 0.065) - 4);
        if (j % 2 === 0) vase(g, w / 2 - 0.2, y + 0.02, 0.02, 0.13);
      }
    }
    return g;
  }
  function stool(p) {
    const g = group(p, 0, 0, 0, 0, "Tabouret_îlot");
    cylinder(g, 0.2, 0.06, M.linen, 0, 0.76, 0, "Assise", 40);
    for (const x of [-0.13, 0.13])
      for (const z of [-0.13, 0.13])
        cylinder(g, 0.015, 0.72, M.oak, x, 0.36, z);
    const ring = mesh(
      g,
      new T.TorusGeometry(0.19, 0.008, 8, 40),
      M.black,
      "Repose_pieds",
      0,
      0.25,
      0,
    );
    ring.rotation.x = Math.PI / 2;
    return g;
  }
  function kitchen(p) {
    const g = group(p, 0, 0, 0, 0, "Cuisine_sur_mesure");
    // Units on the office wall leave the staircase passage completely open.
    for (let i = 0; i < 4; i++) {
      const x = 0.36 + i * 0.62;
      box(g, 0.6, 0.81, 0.6, M.paint, x, 0.47, 0.32, "Meuble_bas");
      for (let j = 0; j < 3; j++) {
        box(
          g,
          0.59,
          0.235,
          0.022,
          M.paint,
          x,
          0.2 + j * 0.25,
          0.635,
          "Façade_tiroir",
        );
        box(
          g,
          0.46,
          0.009,
          0.022,
          M.bronze,
          x,
          0.3 + j * 0.25,
          0.653,
          "Poignée_cuisine",
        );
      }
    }
    const topShape = new T.Shape();
    topShape.moveTo(0.04, -0.65);
    topShape.lineTo(2.55, -0.65);
    topShape.lineTo(2.55, 0.02);
    topShape.lineTo(0.04, 0.02);
    topShape.closePath();
    const hole = new T.Path();
    hole.moveTo(1.2, -0.54);
    hole.lineTo(1.2, -0.13);
    hole.lineTo(1.79, -0.13);
    hole.lineTo(1.79, -0.54);
    hole.closePath();
    topShape.holes.push(hole);
    const tg = new T.ExtrudeGeometry(topShape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelSize: 0.002,
      bevelThickness: 0.002,
      bevelSegments: 2,
    });
    tg.rotateX(-Math.PI / 2);
    mesh(g, tg, M.stone, "Plan_cuisine_découpé", 0, 0.9, 0);
    box(g, 0.58, 0.018, 0.4, M.steel, 1.495, 0.72, 0.335, "Fond_évier");
    for (const x of [1.21, 1.78])
      box(g, 0.014, 0.18, 0.41, M.steel, x, 0.81, 0.335, "Paroi_évier");
    for (const z of [0.13, 0.54])
      box(g, 0.58, 0.18, 0.014, M.steel, 1.495, 0.81, z, "Paroi_évier");
    cylinder(g, 0.027, 0.005, M.steel, 1.495, 0.733, 0.335, "Bonde_évier");
    const tap = group(g, 1.49, 0.936, 0.08, 0, "Mitigeur_cuisine_col_de_cygne");
    cylinder(tap, 0.027, 0.008, M.steel, 0, 0.004, 0, "Embase");
    tube(
      tap,
      [
        [0, 0, 0],
        [0, 0.27, 0],
        [0, 0.36, 0.08],
        [0, 0.33, 0.2],
        [0, 0.24, 0.22],
      ],
      0.014,
      M.steel,
      "Bec_cuisine",
    );
    cylinder(tap, 0.017, 0.07, M.steel, 0.035, 0.09, 0, "Commande_mitigeur");
    for (let i = 0; i < 3; i++) {
      box(
        g,
        0.61,
        0.68,
        0.33,
        M.paint,
        0.36 + i * 0.63,
        1.9,
        0.17,
        "Meuble_haut",
      );
      box(
        g,
        0.59,
        0.65,
        0.018,
        M.paint,
        0.36 + i * 0.63,
        1.9,
        0.345,
        "Façade_meuble_haut",
      );
    }
    box(
      g,
      1.88,
      0.009,
      0.018,
      M.led,
      0.99,
      1.55,
      0.31,
      "Bandeau_LED_plan_de_travail",
    );
    const left = group(g, 0.24, 0, 1.72, -Math.PI / 2);
    for (let i = 0; i < 3; i++) {
      box(
        left,
        0.59,
        0.82,
        0.59,
        M.paint,
        (i - 1) * 0.6,
        0.47,
        0,
        "Meuble_retour",
      );
      box(
        left,
        0.58,
        0.78,
        0.019,
        M.paint,
        (i - 1) * 0.6,
        0.48,
        0.31,
        "Porte_retour",
      );
    }
    box(left, 1.82, 0.035, 0.64, M.stone, 0, 0.9, 0, "Plan_retour");
    const tall = group(g, 0.38, 0, 2.69, -Math.PI / 2);
    box(tall, 0.7, 2.43, 0.66, M.oak, 0, 1.215, 0, "Colonne_froid");
    for (const y of [0.55, 1.72]) {
      box(tall, 0.67, 1.07, 0.025, M.paint, 0, y, 0.348, "Porte_réfrigérateur");
      box(
        tall,
        0.012,
        0.37,
        0.035,
        M.bronze,
        0.25,
        y,
        0.37,
        "Poignée_réfrigérateur",
      );
    }
    books(g, 2.17, 0.94, 0.26, 4);
    box(g, 0.25, 0.012, 0.28, M.oak, 0.72, 0.943, 0.3, "Planche_à_découper");
    cylinder(
      g,
      0.11,
      0.12,
      M.whiteCeramic,
      0.77,
      1.0,
      0.32,
      "Bol_fruits",
      36,
      0.15,
    );
    for (let i = 0; i < 5; i++)
      sphere(
        g,
        0.045,
        i % 2 ? M.clayFabric : M.sageFabric,
        0.71 + (i % 3) * 0.055,
        1.07 + (i > 2 ? 0.035 : 0),
        0.3 + (i % 2) * 0.055,
      );
    return g;
  }
  function island(p) {
    const g = group(p, 0, 0, 0, 0, "Îlot_cuisine");
    box(g, 2.5, 0.88, 0.83, M.oak, 0, 0.44, 0, "Îlot_chêne");
    for (let i = 0; i < 72; i++)
      box(
        g,
        0.009,
        0.8,
        0.01,
        M.walnut,
        -1.22 + i * 0.034,
        0.46,
        0.425,
        "Rainure_façade_îlot",
        0.002,
      );
    box(
      g,
      2.7,
      0.045,
      1.06,
      M.stone,
      0,
      0.92,
      0.08,
      "Plan_îlot_travertin",
      0.008,
    );
    box(
      g,
      0.62,
      0.012,
      0.52,
      M.black,
      -0.46,
      0.95,
      0,
      "Plaque_induction",
      0.01,
    );
    for (const x of [-0.63, -0.29])
      for (const z of [-0.14, 0.14]) {
        const ring = mesh(
          g,
          new T.TorusGeometry(0.102, 0.003, 8, 40),
          M.steel,
          "Foyer_induction",
          x,
          0.96,
          z,
        );
        ring.rotation.x = Math.PI / 2;
      }
    cylinder(g, 0.1, 0.08, M.black, -0.61, 1.0, 0.14, "Casserole", 36);
    box(g, 0.21, 0.015, 0.035, M.black, -0.43, 1.04, 0.14, "Manche_casserole");
    vase(g, 0.86, 0.947, -0.08, 0.16);
    // Integrated oven under the hob, on the working side of the island.
    const oven = group(g, -0.46, 0, -0.428, Math.PI, "Four_encastré");
    box(oven, 0.6, 0.64, 0.025, M.black, 0, 0.47, 0, "Cadre_four", 0.006);
    box(oven, 0.51, 0.4, 0.008, M.screen, 0, 0.43, 0.018, "Vitre_four", 0.006);
    box(
      oven,
      0.43,
      0.018,
      0.035,
      M.steel,
      0,
      0.68,
      0.04,
      "Poignée_four",
      0.004,
    );
    for (const x of [-0.18, 0.18])
      cylinder(
        oven,
        0.023,
        0.018,
        M.steel,
        x,
        0.74,
        0.025,
        "Sélecteur_four",
      ).rotation.x = Math.PI / 2;
    box(
      oven,
      0.09,
      0.025,
      0.004,
      M.screen,
      0,
      0.74,
      0.025,
      "Affichage_four",
      0.002,
    );
    for (const x of [-0.85, 0, 0.85]) {
      const st = stool(g);
      st.position.set(x, 0, 0.94);
    }
    return g;
  }
  function washer(p) {
    const g = group(p, 0, 0, 0);
    box(g, 0.6, 0.85, 0.61, M.whiteCeramic, 0, 0.425, 0, "Lave_linge");
    box(g, 0.57, 0.11, 0.015, M.paint, 0, 0.77, 0.313, "Bandeau_commandes");
    const ring = mesh(
      g,
      new T.TorusGeometry(0.19, 0.028, 12, 64),
      M.steel,
      "Hublot",
      0,
      0.41,
      0.33,
    );
    cylinder(
      g,
      0.035,
      0.012,
      M.steel,
      -0.18,
      0.78,
      0.333,
      "Sélecteur_programme",
    ).rotation.x = Math.PI / 2;
    const glass = mesh(
      g,
      new T.CircleGeometry(0.16, 48),
      M.screen,
      "Vitre_hublot",
      0,
      0.41,
      0.345,
    );
    for (let i = 0; i < 3; i++)
      box(
        g,
        0.49,
        0.023,
        0.36,
        M.ivoryFabric,
        0,
        0.87 + i * 0.024,
        0,
        "Linge_plié",
      );
    return g;
  }
  return {
    plant,
    vase,
    books,
    tableLamp,
    art,
    rug,
    sofa,
    chair,
    dining,
    coffeeTable,
    tv,
    bed,
    nightstand,
    wardrobe,
    desk,
    bookcase,
    stool,
    kitchen,
    island,
    washer,
    pillow,
  };
}
