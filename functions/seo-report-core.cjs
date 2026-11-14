'use strict';
const {gunzipSync}=require('node:zlib');
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const isDate=s=>typeof s==='string'&&DATE.test(s)&&Number.isFinite(new Date(s+'T12:00:00Z').getTime())&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
function numeric(value){if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw Error('Invalid Search Console metric');return value;}
function cleanMetrics(row){const clicks=numeric(row.clicks),impressions=numeric(row.impressions);return {clicks,impressions,ctr:impressions?clicks/impressions:0,position:numeric(row.position??0)};}
function decodeReport(encoded){
 if(typeof encoded!=='string'||encoded.length>100000||!/^[A-Za-z0-9+/=\r\n]+$/.test(encoded))throw Error('Invalid compressed report');
 const source=gunzipSync(Buffer.from(encoded.trim(),'base64'),{maxOutputLength:750000}).toString('utf8');
 return validateReport(JSON.parse(source));
}
function validateReport(source){
 if(source?.site!=='sc-domain:leroyfactory.fr'||!Array.isArray(source.daily)||source.daily.length>2000)throw Error('Expected leroyfactory.fr report');
 const daily=source.daily.map(r=>{if(!isDate(r.date))throw Error('Invalid report date');return {date:r.date,...cleanMetrics(r)};}).sort((a,b)=>a.date.localeCompare(b.date));
 if(!daily.length||new Set(daily.map(r=>r.date)).size!==daily.length)throw Error('Missing or duplicate report days');
 const raw=source.breakdown||{};if(!isDate(raw.startDate)||!isDate(raw.endDate)||raw.startDate>raw.endDate)throw Error('Invalid breakdown period');
 const list=(key,field)=>{const rows=raw[key]||[];if(!Array.isArray(rows)||rows.length>2000)throw Error('Oversized breakdown');return rows.map(r=>{const text=String(r[field]||'');if(text.length>4096)throw Error('Oversized dimension');if(field==='page'){const u=new URL(text);if(u.protocol!=='https:'||!['leroyfactory.fr','www.leroyfactory.fr'].includes(u.hostname))throw Error('Unexpected report page');}return {[field]:text,...cleanMetrics(r)};});};
 const sitemaps=(source.sitemaps||[]).slice(0,20).map(r=>({path:String(r.path||'').slice(0,4096),errors:numeric(r.errors||0),warnings:numeric(r.warnings||0),lastSubmitted:String(r.lastSubmitted||r.last_submitted||'').slice(0,40),lastDownloaded:String(r.lastDownloaded||r.last_downloaded||'').slice(0,40)}));
 const stamp=new Date(source.updatedAtIso);if(!Number.isFinite(stamp.getTime()))throw Error('Invalid capture timestamp');
 return {schema:1,site:'sc-domain:leroyfactory.fr',trackingStartedAt:isDate(source.trackingStartedAt)?source.trackingStartedAt:'2026-10-31',daily,breakdown:{startDate:raw.startDate,endDate:raw.endDate,queries:list('queries','query'),pages:list('pages','page'),devices:list('devices','device'),limited:raw.limited===true},sitemaps,source:'Google Search Console · verified import',updatedAtIso:stamp.toISOString()};
}
function mergeReport(current,incoming){
 const hasNewer=current?.daily?.length&&String(current.updatedAtIso||'')>incoming.updatedAtIso;
 const rows=new Map();
 for(const r of (hasNewer?[...incoming.daily,...current.daily]:[...(current?.daily||[]),...incoming.daily]))if(isDate(r.date))rows.set(r.date,r);
 return {...(hasNewer?current:incoming),schema:1,site:'sc-domain:leroyfactory.fr',daily:[...rows.values()].sort((a,b)=>a.date.localeCompare(b.date)),trackingStartedAt:isDate(current?.trackingStartedAt)?current.trackingStartedAt:incoming.trackingStartedAt};
}
module.exports={decodeReport,validateReport,mergeReport};
