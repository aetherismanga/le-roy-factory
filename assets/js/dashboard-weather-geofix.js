(()=>{
  'use strict';
  if(window.__LRF_WEATHER_GEO_FIX__) return;
  window.__LRF_WEATHER_GEO_FIX__=true;

  const geo=navigator.geolocation;
  if(!geo||typeof geo.getCurrentPosition!=='function') return;

  const nativeGet=geo.getCurrentPosition.bind(geo);
  let networkCache=null;
  let networkAt=0;

  async function locateByNetwork(){
    if(networkCache && Date.now()-networkAt<30*60*1000) return networkCache;
    const providers=[
      async()=>{
        const r=await fetch('https://ipwho.is/',{cache:'no-store'});
        if(!r.ok) throw new Error('ipwho');
        const j=await r.json();
        if(j?.success===false||!Number.isFinite(Number(j?.latitude))||!Number.isFinite(Number(j?.longitude))) throw new Error('ipwho-data');
        return {lat:Number(j.latitude),lon:Number(j.longitude),city:j.city||'',region:j.region||'',source:'network'};
      },
      async()=>{
        const r=await fetch('https://ipapi.co/json/',{cache:'no-store'});
        if(!r.ok) throw new Error('ipapi');
        const j=await r.json();
        if(!Number.isFinite(Number(j?.latitude))||!Number.isFinite(Number(j?.longitude))) throw new Error('ipapi-data');
        return {lat:Number(j.latitude),lon:Number(j.longitude),city:j.city||'',region:j.region||'',source:'network'};
      }
    ];
    for(const provider of providers){
      try{
        const c=await provider();
        networkCache=c;networkAt=Date.now();
        try{localStorage.setItem('lrf-weather-location-mode','network');localStorage.setItem('lrf-weather-network-place',JSON.stringify(c));}catch{}
        return c;
      }catch(_){ }
    }
    throw new Error('NETWORK_LOCATION_UNAVAILABLE');
  }

  function makePosition(c){
    return {
      coords:{
        latitude:c.lat,
        longitude:c.lon,
        accuracy:25000,
        altitude:null,
        altitudeAccuracy:null,
        heading:null,
        speed:null
      },
      timestamp:Date.now(),
      __lrfApproximate:true
    };
  }

  function patchedGetCurrentPosition(success,error,options){
    const wrappedSuccess=pos=>{
      try{localStorage.setItem('lrf-weather-location-mode','gps');localStorage.removeItem('lrf-weather-network-place');}catch{}
      success?.(pos);
    };
    const wrappedError=async err=>{
      console.warn('[LRF météo] GPS navigateur indisponible, repli réseau',err?.code,err?.message);
      try{
        const c=await locateByNetwork();
        success?.(makePosition(c));
      }catch(fallbackErr){
        error?.(err||fallbackErr);
      }
    };
    try{return nativeGet(wrappedSuccess,wrappedError,options);}catch(err){wrappedError(err);}
  }

  try{
    geo.getCurrentPosition=patchedGetCurrentPosition;
  }catch(_){
    try{Object.defineProperty(geo,'getCurrentPosition',{configurable:true,writable:true,value:patchedGetCurrentPosition});}catch(__){}
  }

  window.LRFWeatherGeo={
    locateByNetwork,
    async permission(){
      try{return await navigator.permissions?.query?.({name:'geolocation'});}catch{return null;}
    }
  };
})();