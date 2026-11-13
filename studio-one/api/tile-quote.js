import commercial from './commercial.js';
import {createTileQuoteHandler} from '../../shared/lrf-server/tile-quote.mjs';
export default createTileQuoteHandler({commercial,variant:'studio-one'});
