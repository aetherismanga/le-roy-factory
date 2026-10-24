import {createAgentTariffsHandler,readAgentTariffs} from '../../shared/lrf-server/agent-tariffs.mjs';
export default createAgentTariffsHandler({read:()=>readAgentTariffs(new URL('../server/data/agent-tariffs.enc.json',import.meta.url))});
