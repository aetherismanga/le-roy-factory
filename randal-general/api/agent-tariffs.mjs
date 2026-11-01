import {createAgentTariffsHandler,readAgentTariffs,readFeniceTariffs} from '../../shared/lrf-server/agent-tariffs.mjs';
export default createAgentTariffsHandler({
 read:()=>readAgentTariffs(new URL('../server/data/agent-tariffs.enc.json',import.meta.url)),
 readFenice:()=>readFeniceTariffs(new URL('../server/data/fenice-tariffs.enc.json',import.meta.url))
});
