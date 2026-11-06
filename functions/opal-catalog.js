const {onRequest} = require('firebase-functions/v2/https');
const {getAgentFromRequest} = require('./auth');
const {clientFromSessionToken} = require('./pro-session');
const {createOpalHandler} = require('./opal-catalog-core.cjs');
const products = require('./opal-public-products.json');
exports.opalCatalog = onRequest({region:'us-central1',timeoutSeconds:30,memory:'256MiB'}, createOpalHandler({verifyAgent:getAgentFromRequest,verifySession:clientFromSessionToken,products}));
