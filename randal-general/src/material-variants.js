// Prepared from the existing documented manufacturer photographs. Originals
// remain unchanged in assets/materials; these files only vary in resolution.
const versions=name=>Object.fromEntries(['fluid','balanced','max'].map(p=>[p,`/assets/materials/quality/${name}-${p}.webp`]));
export const FINISH_VARIANTS=Object.freeze({
 'aruba-rainure--roble-amazona-acanalado':versions('aruba-roble'),
 'aruba--roble-amazona':versions('aruba-roble'),
 'aruba-rainure--nogal-valentina-acanalado':versions('aruba-nogal'),
 'aruba--nogal-valentina':versions('aruba-nogal-front')
});
