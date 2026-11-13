import {createRequire} from 'node:module';
import {resolveGateway,REGISTRY} from '../../functions/unreal-host/protocol.mjs';
const key=createRequire(import.meta.url)('../../functions/unreal-host/public-key.json');
export const UNREAL_GATEWAY=REGISTRY;
export const resolveUnrealGateway=request=>resolveGateway(key,request);
