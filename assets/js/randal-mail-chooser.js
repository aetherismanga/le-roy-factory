/* Sélecteur de messagerie LE ROY FACTORY — deux configurateurs RANDAL.
   L'utilisateur choisit Gmail, Outlook, la messagerie par défaut ou copie le contenu.
   Aucun message n'est envoyé sans action dans la messagerie choisie. */
(function(){
 'use strict';
 if(window.RandalMailChooser)return;
 var style=document.createElement('style');
 style.textContent=[
 '.lrf-mail-backdrop{position:fixed;inset:0;z-index:2147483000;background:rgba(25,30,27,.74);display:grid;place-items:center;padding:16px;overscroll-behavior:contain}',
 '.lrf-mail-dialog{background:#fdfbf7;border-radius:19px;border:1px solid #dfdacf;width:min(470px,100%);max-height:min(90dvh,690px);overflow-y:auto;padding:22px;box-shadow:0 20px 65px #0006;color:#303d34}',
 '.lrf-mail-dialog h2{font-size:1.28rem;color:#344539;margin:0 40px 9px 0;line-height:1.25}',
 '.lrf-mail-dialog p{color:#647168;font-size:.88rem;line-height:1.55;margin:5px 0 19px}',
 '.lrf-mail-dialog .lrf-mail-close{float:right;width:39px;height:39px;min-height:39px;border:1px solid #d7d6ce;border-radius:50%;background:#edece7;color:#38433a;cursor:pointer;font-size:21px;padding:0}',
 '.lrf-mail-actions{display:grid;gap:10px}',
 '.lrf-mail-actions button{border-radius:12px;min-height:51px;padding:12px 13px;font:700 .96rem system-ui,-apple-system,sans-serif;cursor:pointer;text-align:center;white-space:normal;border:1px solid #b9c7bb;background:#eaf1e9;color:#314a39}',
 '.lrf-mail-actions button.lrf-gmail{background:#34493c;color:#fff;border-color:#34493c;font-weight:800}',
 '.lrf-mail-actions button.lrf-other{background:#fffaf2;color:#4e4637;border-color:#cfc6b9}',
 '.lrf-mail-actions button.lrf-copy{background:#fff;color:#3a4b40;border-color:#d9dcd6}',
 '.lrf-mail-dialog .lrf-mail-note{font-size:.76rem;margin:16px 0 0;color:#7c7e77}',
 '.lrf-mail-feedback{font-size:.78rem;min-height:1em;color:#245d3a;font-weight:750;margin-top:9px}',
 '@media(max-width:450px){.lrf-mail-dialog{padding:17px}.lrf-mail-dialog h2{font-size:1.13rem}.lrf-mail-actions button{font-size:.9rem;min-height:54px}}'
 ].join('\n');
 document.head.appendChild(style);
 function makeLink(base,params){
  var qs=new URLSearchParams();
  Object.keys(params).forEach(function(key){if(params[key])qs.set(key,params[key])});
  return base+(base.indexOf('?')>=0?'&':'?')+qs.toString();
 }
 function mailtoUrl(options){
  var qs=new URLSearchParams();
  if(options.cc)qs.set('cc',options.cc);
  if(options.subject)qs.set('subject',options.subject);
  if(options.body)qs.set('body',options.body);
  return 'mailto:'+options.to+'?'+qs.toString();
 }
 function createButton(title,cls,onclick){
  var b=document.createElement('button');b.type='button';b.textContent=title;
  b.className=cls;b.addEventListener('click',onclick);return b;
 }
 function show(options){
  if(!options||!options.to||!options.subject||!options.body)throw new Error('Informations mail incomplètes');
  document.querySelectorAll('.lrf-mail-backdrop').forEach(function(old){old.remove()});
  var previous=document.activeElement;
  var backdrop=document.createElement('div');backdrop.className='lrf-mail-backdrop';
  var dialog=document.createElement('section');dialog.className='lrf-mail-dialog';
  dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','lrf-mail-title');
  var closeButton=createButton('×','lrf-mail-close',close);closeButton.setAttribute('aria-label','Fermer le choix de messagerie');
  var heading=document.createElement('h2');heading.id='lrf-mail-title';heading.textContent='Choisir votre messagerie';
  var description=document.createElement('p');
  description.textContent='Sélectionnez Gmail ou une autre messagerie pour préparer votre demande RANDAL. Vérifiez le message avant de l’envoyer.';
  var actions=document.createElement('div');actions.className='lrf-mail-actions';
  var feedback=document.createElement('div');feedback.className='lrf-mail-feedback';feedback.setAttribute('role','status');
  var info=document.createElement('p');info.className='lrf-mail-note';
  info.textContent='Gmail et Outlook ouvrent la rédaction dans votre navigateur (connexion nécessaire). « Autre messagerie » utilise l’application définie par votre appareil. Aucun mail n’est envoyé automatiquement.';
  function close(){document.removeEventListener('keydown',escapeKey);backdrop.remove();if(previous&&previous.focus)previous.focus()}
  function escapeKey(e){if(e.key==='Escape'){e.preventDefault();close()}}
  backdrop.addEventListener('click',function(e){if(e.target===backdrop)close()});
  function openCompose(url){
   // Clic direct : ouverture autorisée par les bloqueurs de fenêtres sur PC et mobile.
   var popup=window.open(url,'_blank');
   if(!popup)window.location.assign(url);
   close();
  }
  var gmail=makeLink('https://mail.google.com/mail/',{view:'cm',fs:'1',to:options.to,cc:options.cc, su:options.subject,body:options.body});
  var outlook=makeLink('https://outlook.live.com/mail/0/deeplink/compose',{to:options.to,cc:options.cc,subject:options.subject,body:options.body});
  actions.appendChild(createButton('Ouvrir Gmail','lrf-gmail',function(){openCompose(gmail)}));
  actions.appendChild(createButton('Ouvrir Outlook (web)','',function(){openCompose(outlook)}));
  actions.appendChild(createButton('Autre messagerie (application par défaut)','lrf-other',function(){window.location.href=mailtoUrl(options);close()}));
  actions.appendChild(createButton('Copier le message','lrf-copy',function(){
   var copy='À : '+options.to+'\n'+(options.cc?'Cc : '+options.cc+'\n':'')+'Objet : '+options.subject+'\n\n'+options.body;
   if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(copy).then(function(){feedback.textContent='Message copié. Vous pouvez le coller dans Gmail.'}).catch(function(){window.prompt('Copiez le message :',copy)});
   }else window.prompt('Copiez le message :',copy);
  }));
  dialog.appendChild(closeButton);dialog.appendChild(heading);dialog.appendChild(description);
  dialog.appendChild(actions);dialog.appendChild(feedback);dialog.appendChild(info);
  backdrop.appendChild(dialog);document.body.appendChild(backdrop);
  document.addEventListener('keydown',escapeKey);
  actions.querySelector('button').focus();
 }
 window.RandalMailChooser={show:show,buildGmailUrl:function(options){return makeLink('https://mail.google.com/mail/',{view:'cm',fs:'1',to:options.to,cc:options.cc,su:options.subject,body:options.body})},buildMailtoUrl:mailtoUrl};
})();
