// Furniture disposal and room surface adapters remain local; interaction logic is shared.
import {mountRenovation as mountSharedRenovation} from '../../shared/lrf-3d/renovation.js';
import {withNichePlacement} from '../../shared/lrf-3d/niche-placement.js';
import {validateZones,renderZones,zoneProfileSegments,jointProfileSegments} from './surface-zones.js';
import {disposeObject} from './composition.js';
export const mountRenovation=api=>withNichePlacement(api,()=>mountSharedRenovation(api,{validateZones,renderZones,zoneProfileSegments,jointProfileSegments,disposeObject}));
