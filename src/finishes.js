// Shared catalogue data only: importing swatches must not load Three.js.
// New manufacturer sample available for ALBA only. Other seven finishes retain
// existing definitions until their original email attachments can be recovered.
export const FINISHES=[
{id:'ROBLE',name:'Roble Amazona',hex:'#bda084',texture:'roble.webp',kind:'Bois',roughness:.43},
{id:'ALBA',name:'Serenade Alba',hex:'#bfa386',texture:'finishes/20261022/alba-balanced.webp',textureVariants:{fluid:'finishes/20261022/alba-fluid.webp',balanced:'finishes/20261022/alba-balanced.webp',max:'finishes/20261022/alba-max.webp'},swatch:'finishes/20261022/alba-swatch.webp',frontRotation:Math.PI/2,textureRepeat:[1,.40375],frontRepeat:[1,.52735],kind:'Bois',roughness:.46,manufacturerSample:true,source:'Juan Carlos Segura · Serenade_alba_acabado.jpg · 2026-10-22'},
{id:'NOGAL',name:'Nogal Valentina',hex:'#53433e',texture:'nogal-valentina.webp',kind:'Bois',roughness:.40},
{id:'WHITE',name:'White Bolero',hex:'#dfdeda',texture:'white-bolero.webp',kind:'Uni texturé',roughness:.29},
{id:'AZUL',name:'Azul Acero',hex:'#61717c',kind:'Uni',roughness:.34},
{id:'GRIS',name:'Gris Tórtora',hex:'#5e5559',kind:'Uni',roughness:.36},
{id:'BISC',name:'Biscuit',hex:'#c9b29a',kind:'Uni',roughness:.37},
{id:'GREEN',name:'Muted Green',hex:'#949280',kind:'Uni',roughness:.39}];
