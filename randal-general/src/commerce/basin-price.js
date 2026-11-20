import {integratedTop,defaultBasinColor} from '../../../shared/lrf-3d/solid-surface-catalog.js';
import {basinEntry} from '../basins.js';
import {CATALOG as C} from './catalog.js';
export function basinChoicePrice(draft,top){
 const color=top===draft.top?draft.basinColor||defaultBasinColor(top):defaultBasinColor(top);
 if(integratedTop(top))return basinEntry(top,color,draft.width,draft.format,top===draft.top?draft.basinLayout:undefined)?.ttc??null;
 if(['neris','torne'].includes(top)&&C.vesselColors.some(entry=>entry.code===color))return C.vesselTTC;
 return null;
}
