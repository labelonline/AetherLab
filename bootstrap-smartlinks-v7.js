(async function(){
    'use strict';
    const root=document.getElementById('aether-root');
    const BUILD_VERSION='20260930-smartlinks-7';
    function versioned(path){ const join=String(path).includes('?')?'&':'?'; return `${path}${join}v=${encodeURIComponent(BUILD_VERSION)}`; }
    const viewNames=['overview','catalog','userChat','news','guide','karaoke','promoLinks','financialReports','adminChats','newRelease','trackEdit','adminContent','questionnaires','adminUsers','adminReleases','adminDeleted'];
    async function get(path){ const r=await fetch(versioned(path),{cache:'no-store'}); if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`); return r.text(); }
    function loadScript(src){ return new Promise((resolve,reject)=>{ const s=document.createElement('script');s.src=versioned(src);s.onload=resolve;s.onerror=()=>reject(new Error(`Не удалось загрузить ${src}`));document.body.appendChild(s); }); }
    try{
        const [globalHtml,sidebarHtml,footerHtml,...views]=await Promise.all([get('partials/global.html'),get('partials/sidebar.html'),get('partials/seo-footer.html'),...viewNames.map(v=>get(`views/${v}.html`))]);
        root.innerHTML=globalHtml;
        const app=document.createElement('div'); app.id='appView'; app.className='app hidden';
        const content=document.createElement('div'); content.className='content'; content.setAttribute('onclick',"document.querySelector('.sidebar').classList.remove('open')");
        content.innerHTML='<h1 id="pageTitle">Обзор</h1>'+views.join('\n');
        const sideWrap=document.createElement('div'); sideWrap.innerHTML=sidebarHtml.trim();
        app.appendChild(sideWrap.firstElementChild); app.appendChild(content); root.appendChild(app); root.insertAdjacentHTML('beforeend',footerHtml);

        const scripts=[
            'js/config.js','js/firebase.js','js/core/ui.js','js/core/data.js','js/core/state.js','js/core/auth.js','js/sidebar.js','js/mobile.js','js/modules/content.js','js/modules/dashboard.js',
            'js/modules/chat-admin.js','js/modules/releases.js','js/modules/moderation.js','js/modules/smartlinks-admin-v7.js','js/modules/date-picker.js','js/modules/karaoke.js','js/modules/audio.js',
            'js/modules/questionnaires.js','js/modules/support.js','js/router.js','js/modules/ai.js','js/i18n.js','js/modules/finance.js','js/firebase-sync.js'
        ];
        for(const src of scripts) await loadScript(src);

        // The partials are fetched asynchronously, so DOMContentLoaded may already have fired.
        if(window.AetherLabDatePickerInit) try{window.AetherLabDatePickerInit();}catch(e){}
        if(typeof aetherUpgradeAllAudioPlayers==='function') try{aetherUpgradeAllAudioPlayers(document);}catch(e){}
        if(typeof restoreAetherLabSession==='function') try{await restoreAetherLabSession();}catch(e){console.warn(e);}
        document.documentElement.classList.add('aether-ready');
    }catch(err){
        console.error(err);
        if(root) root.innerHTML='<div style="min-height:100vh;display:grid;place-items:center;padding:30px;background:#0b0d12;color:#fff;font-family:Inter,Arial,sans-serif"><div style="max-width:560px"><h1 style="margin-bottom:12px">AetherLab</h1><p style="color:#aab0c0;line-height:1.6">Не удалось загрузить интерфейс. Обновите страницу. Если ошибка повторяется, проверьте, что папки <code>partials</code>, <code>views</code>, <code>css</code> и <code>js</code> загружены на GitHub Pages вместе с index.html.</p></div></div>';
    }
})();
