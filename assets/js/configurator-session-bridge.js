/* First-party LRF session bridge. Only the configured iframe origin receives credentials. */
(()=>{'use strict';
 const frame=document.querySelector('iframe[data-configurator-origin]');if(!frame)return;
 const origin=frame.dataset.configuratorOrigin,allowed=new Set(['https://studio-one-beta-test-v2.vercel.app','https://randal-catalogue-general-3d.vercel.app']);if(!allowed.has(origin))return;
 let ready=false,last='',sending=false;
 async function transmit(force=false){if(!ready||sending)return;sending=true;
  try{await window.LRF_PRO_SESSION?.restore();const session=window.LRF_PRO_SESSION?.read();let token='';try{token=session?.sessionToken||sessionStorage.getItem('lrfProSessionToken')||localStorage.getItem('lrfProRememberToken')||'';}catch{}
   let payload;if(token&&!session?.isAdmin&&!session?.admin&&session?.type!=='admin'&&session?.role!=='admin')payload={type:'lrf-configurator-session',sessionToken:token};
   else if(session?.isAdmin||session?.role==='admin'||session?.role==='administrator'||session?.type==='admin'){
    const [app,auth]=await Promise.all([import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js')]);
    const config={apiKey:'AIzaSyA3iuK5Ua8kFccURSqLihLshHnhA4rm2is',authDomain:'le-roy-factory.firebaseapp.com',projectId:'le-roy-factory',storageBucket:'le-roy-factory.firebasestorage.app',messagingSenderId:'249878619253',appId:'1:249878619253:web:05f051710b6251dbfa843c'};
    const instance=auth.getAuth(app.getApps().length?app.getApp():app.initializeApp(config));await instance.authStateReady();if(instance.currentUser)payload={type:'lrf-configurator-session',idToken:await instance.currentUser.getIdToken()};
   }
   if(payload){const fingerprint=payload.sessionToken||payload.idToken;if(force||last!==fingerprint){last=fingerprint;frame.contentWindow.postMessage(payload,origin);}}
  }catch{last='';}finally{sending=false;}
 }
 addEventListener('message',e=>{if(e.origin!==origin||e.source!==frame.contentWindow)return;if(e.data?.type==='lrf-configurator-exit'){location.assign('configurateurs-randal.html');return;}if(e.data?.type!=='lrf-configurator-ready')return;ready=true;transmit(true);});
 addEventListener('lrf-pro-session-changed',()=>transmit());addEventListener('storage',()=>transmit());addEventListener('focus',()=>transmit());frame.addEventListener('load',()=>{last='';transmit(true);});
})();
