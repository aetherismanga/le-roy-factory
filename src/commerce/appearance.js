// Same visual definitions and existing texture files as src/model.js FINISHES.
export const APPEARANCE={ROBLE:{hex:'#bda084',texture:'roble.webp'},ALBA:{hex:'#c4ae94',texture:'serenade-alba.webp'},NOGAL:{hex:'#53433e',texture:'nogal-valentina.webp'},WHITE:{hex:'#e2e9e2',texture:'white-bolero.webp'},AZUL:{hex:'#61717c'},GRIS:{hex:'#7b7072'},BISC:{hex:'#e5dbd1'},GREEN:{hex:'#949280'}};
export const chipStyle=id=>{const f=APPEARANCE[id];return f?'background-color:'+f.hex+(f.texture?';background-image:url(assets/'+f.texture+');background-size:cover':''):'';};
