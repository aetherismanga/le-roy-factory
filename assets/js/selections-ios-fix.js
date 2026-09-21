(function(){
  'use strict';

  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if(!isIOS) return;

  function addBodyClasses(){
    if(!document.body) return;
    ['lrf-ios','lrf-premium-v2','lrf-light-page','lrf-page-univers'].forEach(function(c){
      document.body.classList.add(c);
    });
  }

  function repairCategoryCards(){
    var cards = document.querySelectorAll('.category-card');
    for(var i=0;i<cards.length;i++){
      cards[i].style.visibility = 'visible';
      cards[i].style.opacity = '1';
    }
  }

  function keepImagesLazy(root){
    var scope = root && root.querySelectorAll ? root : document;
    var imgs = scope.querySelectorAll('.product-card-v2 img');
    for(var i=0;i<imgs.length;i++){
      imgs[i].loading = 'lazy';
      imgs[i].decoding = 'async';
      imgs[i].style.visibility = 'visible';
      imgs[i].style.opacity = '1';
    }
  }

  function repairOpenPanels(){
    var partnerGrid = document.querySelector('.partner-grid.mobile-open');
    if(partnerGrid) partnerGrid.style.display = 'grid';
    var workspace = document.querySelector('.workspace.open');
    if(workspace) workspace.style.display = 'block';
  }

  function repair(){
    addBodyClasses();
    repairCategoryCards();
    keepImagesLazy(document);
    repairOpenPanels();
  }

  function start(){
    repair();

    // Observe only newly inserted product cards. Avoid full-page rescans on every mutation,
    // which can make Safari iOS reload/crash on this large catalogue page.
    if(window.MutationObserver && document.getElementById('partner-products')){
      var target = document.getElementById('partner-products');
      var observer = new MutationObserver(function(mutations){
        for(var i=0;i<mutations.length;i++){
          var added = mutations[i].addedNodes || [];
          for(var j=0;j<added.length;j++){
            if(added[j] && added[j].nodeType === 1) keepImagesLazy(added[j]);
          }
        }
      });
      observer.observe(target,{childList:true,subtree:true});
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  window.addEventListener('pageshow',repair,{passive:true});
  window.addEventListener('orientationchange',function(){ setTimeout(repair,180); },{passive:true});
})();