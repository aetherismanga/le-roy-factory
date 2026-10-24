// Same geometry and validation, with the existing General lighting adapter.
export * from '../../shared/lrf-3d/room.js';
import {makeRoom as createRoom,createSurface as createSharedSurface} from '../../shared/lrf-3d/room.js';
export const makeRoom=(config,cabinetWidth=80)=>createRoom(config,cabinetWidth,{receiveTileShadows:true});
export const createSurface=(polygon,name,holes=[])=>createSharedSurface(polygon,name,holes,{receiveTileShadows:true});
