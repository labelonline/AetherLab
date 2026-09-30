/* AetherLab mobile shell controller. */
(function(){
  'use strict';
  const mq=window.matchMedia('(max-width: 768px)');
  let touchStartX=null;
  let touchStartY=null;

  function sidebar(){return document.querySelector('.sidebar');}
  function backdrop(){return document.getElementById('mobileSidebarBackdrop');}

  function syncOpenState(open){
    const s=sidebar();
    const b=backdrop();
    if(!s)return;
    s.classList.toggle('open',!!open && mq.matches);
    if(b){
      b.classList.toggle('open',!!open && mq.matches);
      b.setAttribute('aria-hidden',open&&mq.matches?'false':'true');
    }
    document.body.classList.toggle('mobile-nav-open',!!open && mq.matches);
  }

  window.openMobileSidebar=function(){if(mq.matches)syncOpenState(true);};
  window.closeMobileSidebar=function(){syncOpenState(false);};
  window.toggleMobileSidebar=function(){const s=sidebar(); if(s&&mq.matches)syncOpenState(!s.classList.contains('open'));};

  function updateMobileTitle(){
    const source=document.getElementById('pageTitle');
    const target=document.getElementById('mobileHeaderPageTitle');
    if(!source||!target)return;
    const text=(source.textContent||'').trim();
    target.textContent=text||'AetherLab';
  }

  function bindTitle(){
    const source=document.getElementById('pageTitle');
    if(!source)return;
    updateMobileTitle();
    new MutationObserver(updateMobileTitle).observe(source,{childList:true,subtree:true,characterData:true});
  }

  document.addEventListener('click',function(e){
    if(!mq.matches)return;
    const s=sidebar();
    if(!s||!s.classList.contains('open'))return;
    const item=e.target.closest('.menu-btn');
    if(item && s.contains(item) && !item.classList.contains('nav-parent')){
      setTimeout(()=>syncOpenState(false),60);
    }
  });

  document.addEventListener('keydown',function(e){if(e.key==='Escape')syncOpenState(false);});

  // Gentle edge-swipe: right from the left edge opens, left inside drawer closes.
  document.addEventListener('touchstart',function(e){
    if(!mq.matches||!e.touches||e.touches.length!==1)return;
    touchStartX=e.touches[0].clientX;
    touchStartY=e.touches[0].clientY;
  },{passive:true});
  document.addEventListener('touchend',function(e){
    if(!mq.matches||touchStartX===null||!e.changedTouches||!e.changedTouches.length)return;
    const x=e.changedTouches[0].clientX,y=e.changedTouches[0].clientY;
    const dx=x-touchStartX,dy=y-touchStartY;
    const s=sidebar();
    if(Math.abs(dx)>70 && Math.abs(dx)>Math.abs(dy)*1.35){
      if(dx>0 && touchStartX<24 && !(s&&s.classList.contains('open')))syncOpenState(true);
      else if(dx<0 && s&&s.classList.contains('open'))syncOpenState(false);
    }
    touchStartX=touchStartY=null;
  },{passive:true});

  function viewportChanged(){
    if(!mq.matches)syncOpenState(false);
    updateMobileTitle();
  }
  if(typeof mq.addEventListener==='function')mq.addEventListener('change',viewportChanged);
  else mq.addListener(viewportChanged);
  window.addEventListener('orientationchange',()=>setTimeout(viewportChanged,120));

  function init(){bindTitle();viewportChanged();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
