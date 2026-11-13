import key from '../../functions/unreal-host/public-key.json' with {type:'json'};
import {resolveGateway,REGISTRY} from '../../functions/unreal-host/protocol.mjs';
export const UNREAL_GATEWAY=REGISTRY;
export const resolveUnrealGateway=request=>resolveGateway(key,request);
