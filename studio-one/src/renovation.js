// Furniture disposal and room surface adapters remain local; interaction logic is shared.
import {mountRenovation as mountSharedRenovation} from '../../shared/lrf-3d/renovation.js';
import {validateZones,renderZones,zoneProfileSegments,jointProfileSegments} from './surface-zones.js';
import {disposeObject} from './composition.js';
export const mountRenovation=api=>mountSharedRenovation(api,{validateZones,renderZones,zoneProfileSegments,jointProfileSegments,disposeObject});
