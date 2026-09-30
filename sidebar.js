/* AetherLab desktop sidebar collapse controller. */
(function(){
    'use strict';
    const STORAGE_KEY='aetherlab_sidebar_collapsed_v1';
    const mq=window.matchMedia('(min-width: 769px)');
    const labels={
        ru:{collapse:'Свернуть боковую панель',expand:'Развернуть боковую панель'},
        en:{collapse:'Collapse sidebar',expand:'Expand sidebar'},
        uk:{collapse:'Згорнути бічну панель',expand:'Розгорнути бічну панель'}
    };

    function sidebar(){ return document.querySelector('.sidebar'); }
    function currentLang(){
        try{
            const value=localStorage.getItem('aetherlab_language_v1');
            return /^(ru|en|uk)$/.test(value||'') ? value : 'ru';
        }catch(e){ return 'ru'; }
    }
    function storedCollapsed(){
        try{return localStorage.getItem(STORAGE_KEY)==='1';}catch(e){return false;}
    }
    function saveCollapsed(value){
        try{localStorage.setItem(STORAGE_KEY,value?'1':'0');}catch(e){}
    }
    function updateButton(){
        const s=sidebar();
        const btn=document.getElementById('sidebarCollapseBtn');
        if(!s||!btn)return;
        const collapsed=s.classList.contains('collapsed')&&mq.matches;
        const copy=labels[currentLang()]||labels.ru;
        const text=collapsed?copy.expand:copy.collapse;
        btn.title=text;
        btn.setAttribute('aria-label',text);
        btn.setAttribute('aria-expanded',collapsed?'false':'true');
    }
    function setCollapsed(value,persist=true){
        const s=sidebar();
        if(!s)return;
        const shouldCollapse=!!value&&mq.matches;
        s.classList.toggle('collapsed',shouldCollapse);
        document.documentElement.classList.toggle('aether-sidebar-collapsed',shouldCollapse);
        if(persist)saveCollapsed(shouldCollapse);
        updateButton();
    }
    function addMenuTitles(){
        const s=sidebar();
        if(!s)return;
        s.querySelectorAll('.menu-btn').forEach(btn=>{
            if(btn.id==='sidebarCollapseBtn')return;
            const label=btn.querySelector('.mil > span:not(.ico)');
            if(label&&label.textContent.trim()){
                const text=label.textContent.trim();
                btn.setAttribute('title',text);
                btn.setAttribute('data-sidebar-label',text);
            }
        });
        const profile=document.querySelector('.profile-card');
        if(profile){
            if(!profile.title)profile.title='Профиль';
            profile.setAttribute('data-sidebar-label','Профиль');
        }
    }

    window.toggleSidebarCollapsed=function(force){
        const s=sidebar();
        if(!s||!mq.matches)return;
        const next=typeof force==='boolean'?force:!s.classList.contains('collapsed');
        setCollapsed(next,true);
    };

    // Parent icons need their labels to choose a submenu. When clicked in icon-only
    // mode, expand first and then open the requested group.
    document.addEventListener('click',function(ev){
        const s=sidebar();
        if(!s||!mq.matches||!s.classList.contains('collapsed'))return;
        const parent=ev.target.closest('.nav-parent');
        if(!parent||!s.contains(parent))return;
        ev.preventDefault();
        ev.stopPropagation();
        if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
        const menuId=parent.getAttribute('data-nav-toggle');
        setCollapsed(false,true);
        if(menuId&&typeof window.toggleNavMenu==='function'){
            setTimeout(()=>window.toggleNavMenu(menuId),0);
        }
    },true);

    function syncViewport(){
        if(mq.matches)setCollapsed(storedCollapsed(),false);
        else setCollapsed(false,false);
    }
    function init(){
        addMenuTitles();
        syncViewport();
        updateButton();
    }

    if(typeof mq.addEventListener==='function')mq.addEventListener('change',syncViewport);
    else if(typeof mq.addListener==='function')mq.addListener(syncViewport);
    window.addEventListener('storage',function(e){if(e.key===STORAGE_KEY)syncViewport();});
    document.addEventListener('aether-language-changed',updateButton);
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
    else init();
})();
