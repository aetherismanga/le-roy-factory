import data from '../../assets/data/elios-segmento.json' with {type:'json'};

// One manufacturer drawing is shared by the schematic and both 3D ateliers.
// Rows in the source are top-down; the physical tile grid uses bottom-up rows.
export const SEGMENTO=data;
export const segmentoComposition=id=>data.compositions.find(item=>item.id===id)||null;
export const segmentoColor=id=>data.colors.find(item=>item.id===id)||null;
export const segmentoPattern=id=>data.patterns.find(item=>item.id===id)||null;
export const segmentoCompositions=pattern=>data.compositions.filter(item=>item.patternId===pattern);
export const segmentoSelection=layout=>layout?.pattern==='segmento'?segmentoComposition(typeof layout.segmento==='string'?layout.segmento:layout.segmento?.composition):null;
const mod=(n,p)=>((n%p)+p)%p;
const grids=new WeakMap();
export function segmentoCell(composition,col,row){
 if(!composition)return null;
 let grid=grids.get(composition);
 if(!grid){grid=new Map(composition.tiles.map(tile=>[tile.col+':'+tile.row,tile]));grids.set(composition,grid);}
 return grid.get(mod(col,composition.columns)+':'+(composition.rows-1-mod(row,composition.rows)))||null;
}
export function segmentoColors(layout){return [...new Set(segmentoSelection(layout)?.tiles.map(tile=>tile.color)||[])];}
export function segmentoLayout(layout={},id){
 const composition=segmentoComposition(id);if(!composition)throw Error('Cette composition Segmento ne figure pas dans le document fabricant.');
 return {...layout,pattern:'segmento',width:.15,height:.15,shape:'rectangle',opus:undefined,segmento:{composition:composition.id}};
}
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function segmentoPreview(composition,urlFor=value=>value){
 if(!composition)return '';
 const asset=value=>urlFor(value.startsWith('assets/')?'https://leroyfactory.fr/'+value:value);
 if(composition.preview)return `<img src="${esc(asset(composition.preview))}" alt="" loading="lazy" decoding="async">`;
 const images=composition.tiles.map(tile=>{const color=segmentoColor(tile.color),src=color?.preview||color?.faces?.[0];if(!src)return '';const x=tile.col,y=tile.row;return `<image href="${esc(asset(src))}" x="${x}" y="${y}" width="1" height="1" transform="rotate(${Number(tile.rotation)||0} ${x+.5} ${y+.5})"/>`;}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${composition.columns} ${composition.rows}" aria-hidden="true">${images}</svg>`;
}
