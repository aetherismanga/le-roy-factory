import {getLocale} from './i18n/index.js';
import {isRandalDemo,demoConfiguratorURL} from './demo-session.js';
const wrappers={'studio-one':'studio-one-configurateur.html','randal-general':'randal-configurateur.html'};
export function publicCompositionURL(composition,mode='preview'){
 const page=wrappers[composition?.variant];if(!page)throw Error('Configurateur de la composition inconnu.');
 const url=isRandalDemo()?new URL(demoConfiguratorURL(composition.variant,'atelier.html')):new URL(page,'https://leroyfactory.fr/');url.searchParams.set('lang',getLocale());url.searchParams.set('page','atelier.html');url.searchParams.set('composition',composition.id);if(mode==='copy')url.searchParams.set('compositionMode','copy');return url.href;
}
export function navigatePublicComposition(composition,mode='preview',view=globalThis.window){
 const url=publicCompositionURL(composition,mode);try{view.top.location.href=url;}catch{view.location.href=url;}return url;
}
