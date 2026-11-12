'use strict';
const {onRequest}=require('firebase-functions/v2/https');
const admin=require('firebase-admin');
const {getAgentFromRequest}=require('./auth');
const catalogue=require('./elios-samples-catalogue.json');
const {createHandler}=require('./elios-expo-budget-core.cjs');
exports.eliosExpoBudget=onRequest({region:'us-central1',timeoutSeconds:60,memory:'512MiB',maxInstances:4},createHandler({admin,getAgentFromRequest,catalogue}));
