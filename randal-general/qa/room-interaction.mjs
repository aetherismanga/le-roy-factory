import * as roomAPI from '../src/room.js';
import {createRoomEditor} from '../src/room-editor.js';
import {runRoomAcceptance} from '../../shared/lrf-3d/qa/room-controls-acceptance.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const report=runRoomAcceptance({roomAPI,createRoomEditor,markup:readFileSync('dist/atelier.html','utf8')});
writeFileSync('qa/room-interaction-result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
