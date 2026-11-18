'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { excludePiscinistes, isPisciniste } = require('../group-mail-recipients');

test('exclut toutes les adresses et les fiches des piscinistes, même si elles sont sélectionnées', async () => {
  const docs = [
    { id:'pool', data:() => ({ categorieActivite:'Pisciniste', email:'piscine@example.fr', emails:['info@pool.fr'], interlocuteurs:[{email:'vente@pool.fr'}] }) },
    { id:'tiles', data:() => ({ categorieActivite:'Carreleur', email:'carrelage@example.fr' }) }
  ];
  const db = { collection:() => ({ get:async () => ({ forEach:fn => docs.forEach(fn) }) }) };
  const result = await excludePiscinistes(db, { bccRecipients:['piscine@example.fr','INFO@pool.fr','vente@pool.fr','carrelage@example.fr'], clientIds:['pool','tiles'] });
  assert.deepEqual(result.bccRecipients,['carrelage@example.fr']);
  assert.deepEqual(result.clientIds,['tiles']);
  assert.equal(isPisciniste({ sousCategorie:'Pisciniste' }),true);
});
