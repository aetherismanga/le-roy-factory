(function(){
  'use strict';

  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if(!isIOS) return;

  var scheduled = false;

  function addBodyClasses(){
    if(!document.body) return;
    var classes = ['lrf-ios','lrf-premium-v2','lrf-light-page','lrf-page-univers'];
    for(var i=0;i<classes.length;i++) document.body.classList.add(classes[i]);
  }

  function repairCategoryCards(){
    var cards = document.querySelectorAll('.category-card');
    for(var i=0;i<cards.length;i++){
      var rect = cards[i].getBoundingClientRect();
      var width = rect.width || cards[i].offsetWidth || 0;
      var height = rect.height || cards[i].offsetHeight || 0;
      if(width && height < 48){
        cards[i].style.height = Math.max(72, Math.round(width * 3 / 8)) + 'px';
      }
      cards[i].style.visibility = 'visible';
      cards[i].style.opacity = '1';
    }
  }

  function repairProducts(){
    var products = document.querySelectorAll('.product-card-v2');
    for(var i=0;i<products.length;i++){
      products[i].style.contentVisibility = 'visible';
      products[i].style.contain = 'none';
      products[i].style.visibility = 'visible';
      products[i].style.opacity = '1';
      var imgs = products[i].querySelectorAll('img');
      for(var j=0;j<imgs.length;j++){
        imgs[j].loading = 'eager';
        imgs[j].style.visibility = 'visible';
        imgs[j].style.opacity = '1';
      }
    }
  }

  function repairOpenPanels(){
    var partnerGrid = document.querySelector('.partner-grid.mobile-open');
    if(partnerGrid) partnerGrid.style.display = 'grid';
    var workspace = document.querySelector('.workspace.open');
    if(workspace) workspace.style.display = 'block';
  }

  function repair(){
    scheduled = false;
    addBodyClasses();
    repairCategoryCards();
    repairProducts();
    repairOpenPanels();
  }

  function scheduleRepair(){
    if(scheduled) return;
    scheduled = true;
    if(window.requestAnimationFrame) window.requestAnimationFrame(repair);
    else setTimeout(repair,16);
  }

  function start(){
    repair();
    setTimeout(repair,100);
    setTimeout(repair,500);
    setTimeout(repair,1200);
    if(window.MutationObserver && document.body){
      var observer = new MutationObserver(scheduleRepair);
      observer.observe(document.body,{childList:true,subtree:true});
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start);
  else start();

  window.addEventListener('pageshow',repair);
  window.addEventListener('resize',scheduleRepair);
  window.addEventListener('orientationchange',function(){setTimeout(repair,180);});
})();

// Reviglass AB02 / AB03 / AB14: galerie directe, sans recherche lente des médias.
(function(){
  if(document.querySelector('script[data-lrf-ab-fast]')) return;
  var s=document.createElement('script');
  s.src='assets/js/inspirations-reviglass-ab-fast-gallery.js?v=20260912-abfast1';
  s.defer=true;
  s.dataset.lrfAbFast='1';
  document.head.appendChild(s);
})();
