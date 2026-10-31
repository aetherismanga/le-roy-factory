(() => {
 'use strict';
 const input=document.getElementById('elios-discovery-query');if(!input)return;
 const cards=[...document.querySelectorAll('.discovery-card[data-slug]')],api=window.LRF_ELIOS_DISCOVERY,data=window.LRF_ELIOS_SEARCH_META;
 if(!api||!data)return;
 function render(){let count=0;for(const card of cards){const match=api.matches({slug:card.dataset.slug},input.value);card.hidden=!match;if(match)count++;}document.getElementById('elios-discovery-count').textContent=`${count} collection${count===1?'':'s'}`;document.getElementById('elios-discovery-empty').hidden=count!==0;}
 input.value=new URLSearchParams(location.search).get('search')||'';input.addEventListener('input',render);render();
})();
