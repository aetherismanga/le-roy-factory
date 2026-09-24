(()=>{
  if(window.__LRF_CATALOGUES_RENDERER__) return;
  window.__LRF_CATALOGUES_RENDERER__=true;

  const data=[
    {nom:'Elios Ceramica',pays:'Italie',logo:'elios.png',presentation:'Fabricant italien spécialisé dans les petits formats et la céramique décorative haut de gamme.',fichiers:[
      ['Catalogue Général interactif','Toutes les collections 2026 avec lexique cliquable intégré au PDF.','assets/pdf/ELIOS_Catalogue_General_2026_INTERACTIF.pdf'],
      ['Coverings 2026 interactif','Revêtements et dernières tendances avec lexique cliquable intégré au PDF.','assets/pdf/ELIOS_Coverings_2026_INTERACTIF.pdf'],
      ['Outdoor 2026 interactif',"Solutions et carrelages pour l'extérieur avec lexique cliquable intégré au PDF.",'assets/pdf/ELIOS_Outdoor_2026_INTERACTIF.pdf'],
      ['Azuli Mood','Catalogue de la nouvelle collection Azuli Mood.','assets/pdf/AZULI-MOOD_new.pdf'],
      ['Cersaie 2026 · Living Gallery','Nouveautés ELIOS présentées au Cersaie 2026.','assets/pdf/ELIOS%20CERSAIE%202026.pdf'],
      ['Skultura','Catalogue ELIOS Skultura / ArgillaKotta.','assets/pdf/ELIOS%20SKULTURA.pdf'],
      ['Dynasty','Catalogue officiel ELIOS Dynasty.','assets/pdf/ELIOS_DYNASTY%20%281%29.pdf'],
      ['Pool Surfaces 2026','Catalogue piscine ELIOS — 12 collections, format principal 15×15 cm.','assets/pdf/ELIOS_Pool_Surfaces_2026_INTERACTIF.pdf']
    ]},
    {nom:'Life Cerámica',pays:'Espagne',logo:'life-ceramica.svg',presentation:'Fabricant espagnol de solutions céramiques innovantes, notamment le système de pose à sec ONDABLOCK.',fichiers:[
      ['ONDABLOCK 2026 · Français interactif','Version française optimisée avec sommaire cliquable et accès direct aux collections.','assets/pdf/Catalogue_ONDABLOCK_2026_FR_INTERACTIF.pdf']
    ],force:true},
    {nom:'View Ceramica',pays:'Italie',logo:'view.png',presentation:'Design contemporain et solutions céramiques innovantes pour les professionnels exigeants.',fichiers:[
      ['Corso 2026','Catalogue de la série Corso.','https://viewceramiche.com/wp-content/uploads/2023/12/View_catalogo_serie_Corso_2024_LR.pdf'],
      ['Tibur 2026','Catalogue de la série Tibur.','https://viewceramiche.com/wp-content/uploads/2023/11/Catalogo-Tibur_01-2025_LR.pdf'],
      ['Golden Stone 2026','Catalogue de la série Golden Stone.','https://viewceramiche.com/wp-content/uploads/2025/10/View_catalogo_serie_Golden_Stone_2026_LR.pdf'],
      ['COCO & Le Pietre di View','Nouveau catalogue VIEW — séries COCO et Le Pietre di View.','assets/pdf/View_serie%20COCO%20et%20Le_Pietre_di_View.pdf'],
      ['Ardenne','Catalogue View Ceramica — collection Ardenne.','assets/pdf/view%20Ardenne.pdf'],
      ['Dorset','Catalogue View Ceramica — collection Dorset.','assets/pdf/View%20Dorset_.pdf'],
      ['Marais','Catalogue View Ceramica — collection Marais.','assets/pdf/View_.marais.pdf'],
      ['Digione','Catalogue View Ceramica — collection Digione.','assets/pdf/View-DIGIONE.pdf'],
      ['Extérieur','Catalogue View Ceramica dédié aux solutions extérieures.','assets/pdf/VIEW-EXTERIEUR.pdf'],
      ['Phura 2026','Nouveau catalogue VIEW — collection Phura 2026.','assets/pdf/VIEW_CATALOGO_PHURA_2026.pdf']
    ]},
    {nom:'La Fenice',pays:'Italie',logo:'lafenice.png',presentation:"Tradition et modernité italienne au service de l'architecture intérieure.",fichiers:[
      ['Catalogue Général 2026/2027','Lecteur La Fenice haute définition avec lexique permanent et accès direct aux collections.','fenice-pdf.html?catalogue=general&section=marble&page=1&title=Catalogue%20G%C3%A9n%C3%A9ral%202026%2F2027'],
      ['Nouveautés Cersaie 2026','Lecteur interactif avec lexique permanent, recherche et accès direct aux collections, coloris et décors.','fenice-pdf.html?catalogue=cersaie&page=1&title=Nouveaut%C3%A9s%20Cersaie%202026'],
      ['Catalogues officiels','Tous les catalogues La Fenice.','https://lafenicegc.com/fr/catalogues/']
    ]},
    {nom:'Reviglass',pays:'Espagne',logo:'reviglass.png',presentation:'Spécialiste de la mosaïque en verre recyclé haut de gamme.',fichiers:[
      ['Catalogue Général','Catalogue général Reviglass.','assets/pdf/REVIGLASS_catalogue%20general-baja.pdf'],
      ['Ambiances','Inspirations et réalisations Reviglass.','assets/pdf/reviglass%20ambiances.pdf'],
      ['Pool','Catalogue piscine Reviglass.','assets/pdf/web_Reviglass_Pool.pdf'],
      ['Configurateur Virtuel Piscine','Créez votre design de piscine en ligne.','https://myvirtualpool.reviglass.es/']
    ]},
    {nom:'Biopietra',pays:'Italie',logo:'biopietra.png',presentation:"Pierre naturelle régénérée fabriquée en Italie pour la construction écologique et l'architecture durable",fichiers:[['Catalogue Biopietra',"Pierre naturelle régénérée fabriquée en Italie pour la construction écologique et l'architecture durable",'https://www.biopietra.com']]},
    {nom:"Petracer's",pays:'Italie',logo:'petracer.png',presentation:"L'expression ultime du luxe à l'italienne dans le carrelage d'exception.",fichiers:[
      ['Catalogue Intérieur',"Collections de luxe et décors d'apparat.",'https://petracer.it/wp-content/uploads/2026/07/Interno_Cat_PET_bassa.pdf'],
      ['Catalogue Général','Sélection complète et tarifs mail.','https://petracer.it/wp-content/uploads/2026/07/Low-catalogo-OII-mail-.pdf']
    ]},
    {nom:'Pecchioli Firenze',pays:'Italie',logo:'pecchioli.png',presentation:'Céramique artistique et historique faite à Florence.',fichiers:[['Catalogue Pecchioli 2026',"Faïences d'art et créations sur mesure.",'assets/pdf/catalogue%20pecchioli%202026.pdf']]},
    {nom:'Bulbo',pays:'Italie',logo:'bulbo.png',presentation:'Créations céramiques audacieuses et design avant-gardiste.',fichiers:[
      ['Catalogue Design 1','Lignes avant-gardistes et colorées.','https://heyzine.com/flip-book/50766f6757.html'],
      ['Catalogue Design 2','Collections et ambiances.','https://heyzine.com/flip-book/890ffb683e.html']
    ]},
    {nom:'Randal Pro',pays:'Espagne',logo:'randal.png',presentation:'Mobilier de salle de bain sur mesure haut de gamme.',fichiers:[
      ['Catalogues Randal','Collections et téléchargements officiels.','https://randal.group/colecciones/'],
      ['Configurateur Meuble','Créez votre meuble sur mesure en ligne.','https://conf.randalsa.com/studio/register.php']
    ]},
    {nom:'Neobath',pays:'Italie',logo:'neobath.png',presentation:'Fabricant italien de meubles de salle de bain design.',fichiers:[['Catalogues Neobath','Collections et catalogue officiel à télécharger.','https://neobathdesign.fr/catalogues/']]},
    {nom:'Koibath',pays:'Espagne',logo:'koibath.png',presentation:'Solutions innovantes et esthétiques pour la salle de bain moderne.',fichiers:[['Catalogue Salle de Bain','Équipements et aménagements modernes.','https://www.koibath.com/wp-content/uploads/2025-Catalogo-Espana-muebles-de-bano.pdf']]},
    {nom:'Aquahome',pays:'Robinetterie',logo:'aquahome.png',presentation:'Robinetterie haut de gamme alliant design et performance technique.',fichiers:[['Catalogue Aquahome 2026','Catalogue officiel Aquahome 2026 — robinetterie.','assets/pdf/aquahome2026.pdf']]},
    {nom:'Opal',pays:'International',logo:'opal.png',presentation:"Fabricant de miroirs lumineux et décoratifs pour espaces d'eau.",fichiers:[['Miroirs & Éclairages','Gamme de miroirs lumineux et accessoires.','https://www.koibath.com/wp-content/uploads/CATALOGO-ESPEJOS-2025.pdf']]},
    {nom:'Reitano Rubinetteria',pays:'Italie',logo:'reitano.svg',presentation:'Robinetterie italienne et accessoires de salle de bain.',fichiers:[
      ['Catalogue interactif 2026','Collections, références, finitions et prix dynamiques.','reitano-catalogue-interactif.html'],
      ['Catalogue PDF original 2026','Version complète du catalogue fournisseur.','assets/pdf/REITANO-Robinetterie-2026.pdf'],
      ['Catalogue Accessoires 2026','Accessoires et compléments Reitano pour la salle de bain.','assets/pdf/REITANO-Accessoire-2026-Catalogue.pdf'],
      ['CIELO • MOLLE • COSMOS','Catalogue des ciels de douche COSMOS avec système SpringFix — version sans tarif.','assets/pdf/CIELO-MOLLE-COSMOS-Sans-tarif-BD.pdf']
    ]},
    {nom:'Bilt',pays:'International',logo:'bilt.png',presentation:'Croisillons autonivelants et accessoires de pose professionnels.',fichiers:[['Outillage & Pose','Systèmes de nivellement et accessoires de chantier.','https://static1.squarespace.com/static/6303350848baf04643f47e75/t/695e81a2f7247e0c195e5394/1767801250391/Cata%CC%81logo+2025_ES_3.2.pdf']]}
  ];

  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const renderFile=f=>{
    const [titre,desc,lien]=f;
    const isPdf=lien.toLowerCase().includes('.pdf');
    return '<div class="catalogue-row"><div><strong>'+esc(titre)+'</strong><span>'+esc(desc)+'</span></div><a href="'+esc(lien)+'" target="_blank" rel="noopener" class="catalogue-link">'+(isPdf?'PDF':'Lien')+'</a></div>';
  };

  function render(){
    const grid=document.getElementById('grid-catalogues');
    if(!grid) return false;
    const existingNames=[...grid.querySelectorAll('h3')].map(x=>(x.textContent||'').trim().toLowerCase());
    const hasCore=existingNames.some(n=>n==='elios ceramica') && existingNames.some(n=>n==='view ceramica');
    if(hasCore) return true;

    grid.innerHTML=data.map(fab=>{
      const rows=fab.fichiers.map(renderFile).join('');
      const picker=(fab.force||fab.fichiers.length>1)
        ? '<details class="catalogue-picker"><summary>☰ Voir les catalogues <span style="font-weight:600;color:#80611c;">'+fab.fichiers.length+'</span></summary><div class="catalogue-menu">'+rows+'</div></details>'
        : '<div style="display:flex;flex-direction:column;gap:.75rem;">'+rows+'</div>';
      return '<article class="card-premium catalogue-card"><div class="catalogue-card-logo" style="background-image:url(\'assets/img/'+fab.logo+'\');" aria-hidden="true"></div><div class="catalogue-card-copy"><span class="catalogue-country">'+esc(fab.pays)+'</span><h3>'+esc(fab.nom)+'</h3><p class="catalogue-description">'+esc(fab.presentation)+'</p></div><div class="catalogue-actions">'+picker+'</div></article>';
    }).join('');
    document.documentElement.dataset.cataloguesRenderer='20260924-fallback2';
    return true;
  }

  let tries=0;
  const boot=()=>{ if(render()) return; if(tries++<80) setTimeout(boot,100); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();