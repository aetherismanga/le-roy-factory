# Office-PC crisp rendering — 4 November 2026

Release: `20261104-crisp-office-1`. Applications: Studio One, Randal Catalogue Général, private Neobath Anima (`20261104-neobath-anima-studio-one-crisp-office-13`).

## Rendering changes

- Light rendering uses a 2.4-million-pixel budget instead of 500,000, retaining native pixel density for a 1920×1080 viewport on a 1× display. Retina/4K displays remain bounded by the budget; this is not a promise of native4K rendering on weak hardware.
- Working furniture/column textures use the balanced1024 source derivatives even in Light, retaining anisotropic filtering8 and native colour/UV identities. Source textures and4096 export textures remain unchanged. Background surfaces may retain lighter manufacturer derivatives.
- Standard:1024 shadows,512 mirror targets at up to15Hz instead of2048/1024/30Hz. Light:512 shadows when settled,512 mirror targets up to12Hz. Phone targets/budgets remain separately bounded.
- During camera, visitor, drawer and placement movement: shadows are suspended, mirrors throttled6/8Hz and expensive Ultra AO bypassed, without changing image density or texture identity. Render targets are not reallocated for each gesture. After180ms without motion, all mirror schedules reset and a final settled shadow/reflection frame is rendered before the existing on-demand loop sleeps.
- Lighting recipes/colours remain stable through movement. Physical architectural glass is simplified during non-Ultra editing. Furniture keeps native bump/normal/colour detail while Light background shaders omit extra clearcoat and bump sampling.
- Auto can recover from Light to Standard but no longer promotes to Ultra. Opening a window does not implicitly enable Ultra. Explicit Ultra remains available.
- Native HD captures explicitly select Max independently of interaction phase, request full source textures, refresh mirrors/shadows, and restore working state on success or failure. General quote-preview capture now also upgrades and restores mirror/shadow targets. Preview canvases use a bounded sharp pixel budget.

## Ribelle geometry

A119.6cm facade retains its rib front, lower bevel, grip, silhouette, metric UVs and dimensions. Redundant planar triangles are replaced with boundary-preserving triangulation:48,056→19,250triangles (-59.94%);144,168→26,754vertices;5,190,048→971,628geometry bytes (-81.28%). No fake relief, altered pitch, or visual LOD substitution. Tests compare198 rays with the previous model plus manifold edges, normals, UVs, volume, hinge and picking invariants.

## Verification

- Node regression suite:680passed,0failed,1skipped (local Chromium unavailable). Includes Anima/private access, security, PLAN&POSE, material/geometry, scheduling, HD transaction and window behavior.
- Native core check, Studio One workspace check and Catalogue Général workspace check required before release.
- Three application builds and public site build; decoded eight Anima resources SHA-256 verified. Public build excludes private function bundles. Anima access unchanged: Jérôme/Coryne only.
- Browser UI inspection: native quality labels visible in source DOM. GPU renderer unavailable in the cloud browser (WebGL context disabled), so no full3D visual approval, client-PC FPS or percentage speedup is claimed. Performance savings above are geometry/resource-budget measurements, not measured total frame-rate improvements.

Publication targets: existing GitHub Pages site, existing HUGOL TRADING Studio/General projects and only the affected Neobath Anima Firebase application. No account, project, client-data or tariff mutation.
