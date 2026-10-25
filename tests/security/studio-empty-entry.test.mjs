import {test} from 'node:test';
import assert from 'node:assert/strict';
import {beginEmptyStudioEntry,settleEmptyStudioEntry,markStudioEntryEdited,resumeStudioEntry} from '../../studio-one/src/commerce/start-entry.js';
const CURRENT='studio-one-current-project',ACTIVE='studio-one-active-project-id-v2';
function store(values){const rows=new Map(Object.entries(values));return {getItem:key=>rows.get(key)||null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)};}
test('empty entry retains the last project, saved identity and explicit resume across repeated visits',()=>{
 const previous={version:2,title:'Projet conservé',items:[{id:'cabinet'}]},empty={version:2,items:[]},storage=store({[CURRENT]:JSON.stringify(previous),[ACTIVE]:'saved-id'});
 beginEmptyStudioEntry(storage);assert.equal(storage.getItem(ACTIVE),null);settleEmptyStudioEntry(storage,empty);
 storage.setItem(CURRENT,JSON.stringify(empty));markStudioEntryEdited(storage,empty);beginEmptyStudioEntry(storage);settleEmptyStudioEntry(storage,empty);
 assert.deepEqual(resumeStudioEntry(storage),previous);assert.equal(storage.getItem(ACTIVE),'saved-id');assert.deepEqual(JSON.parse(storage.getItem(CURRENT)),previous);
});
test('actual changes to a fresh room become the current project; simply rendering it does not replace Resume',()=>{
 const previous={version:2,items:[{id:'old'}]},empty={version:2,items:[]},storage=store({[CURRENT]:JSON.stringify(previous)});
 beginEmptyStudioEntry(storage);settleEmptyStudioEntry(storage,empty);markStudioEntryEdited(storage,empty);
 const edited={version:2,items:[{id:'new'}]};markStudioEntryEdited(storage,edited);storage.setItem(CURRENT,JSON.stringify(edited));assert.equal(resumeStudioEntry(storage),null);assert.deepEqual(JSON.parse(storage.getItem(CURRENT)),edited);
});
test('legacy current drafts remain resumable and blocked browser storage cannot break a new empty entry',()=>{
 const previous={version:1,items:[{id:'legacy'}]},empty={version:2,items:[]},storage=store({[CURRENT]:JSON.stringify(previous)});
 beginEmptyStudioEntry(storage);settleEmptyStudioEntry(storage,empty);assert.deepEqual(resumeStudioEntry(storage),previous);
 const blocked={getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');},removeItem(){throw Error('Blocked');}};
 assert.doesNotThrow(()=>{beginEmptyStudioEntry(blocked);settleEmptyStudioEntry(blocked,empty);markStudioEntryEdited(blocked,empty);});assert.equal(resumeStudioEntry(blocked),null);
});
