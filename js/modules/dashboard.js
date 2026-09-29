/* AetherLab Overview — live Firebase data + Firebase server-time offset. */
(function(){
    'use strict';
    let timer = null;

    const copy = {
        ru:{
            morning:'Доброе утро',day:'Добрый день',evening:'Добрый вечер',night:'Доброй ночи',
            subtitle:'Вот что сейчас происходит с вашим каталогом. Данные обновляются вместе с Firebase.',
            synced:'Время Firebase',local:'Локальное время',total:'Всего релизов',moderation:'На модерации',approved:'Принято',fix:'Требует исправления',
            totalNote:'включая черновики',moderationNote:'ожидают проверки',approvedNote:'приняты модерацией',fixNote:'нужно исправить',
            next:'Следующий релиз',nextCaption:'Ближайший принятый релиз по дате выхода.',catalog:'Весь каталог',attention:'Требует внимания',attentionCaption:'Задачи, которые можно закрыть прямо сейчас.',
            activity:'Последняя активность',activityCaption:'Текущие статусы последних релизов.',news:'Последние новости',newsCaption:'Свежие публикации команды AetherLab.',allNews:'Все новости',
            actionRelease:'Новый релиз',actionCatalog:'Каталог',actionNews:'Новости',actionSupport:'Поддержка',
            noNext:'Пока нет будущих принятых релизов. После одобрения релиза здесь появится ближайшая дата выхода.',
            drafts:'Черновики',draftsMeta:'Незавершённые релизы',rejected:'Исправления',rejectedMeta:'Релизы отклонены модератором',waiting:'Модерация',waitingMeta:'Релизы ожидают проверки',allGood:'Сейчас ничего срочного нет.',
            noActivity:'Пока нет релизов для отображения активности.',noNews:'Пока нет опубликованных новостей.',today:'Сегодня',tomorrow:'Завтра',days:'дн.',hours:'ч.',minutes:'мин.',releasedToday:'Дата релиза — сегодня',
            statusDraft:'Черновик',statusMod:'На модерации',statusOk:'Принят',statusErr:'Требует исправления',releaseDate:'Дата выхода',timezone:'Часовой пояс'
        },
        en:{
            morning:'Good morning',day:'Good afternoon',evening:'Good evening',night:'Good night',
            subtitle:'Here is what is happening with your catalog right now. Data updates with Firebase.',
            synced:'Firebase time',local:'Local time',total:'Total releases',moderation:'In moderation',approved:'Approved',fix:'Needs changes',
            totalNote:'including drafts',moderationNote:'waiting for review',approvedNote:'approved by moderation',fixNote:'requires changes',
            next:'Next release',nextCaption:'Nearest approved release by release date.',catalog:'Full catalog',attention:'Needs attention',attentionCaption:'Tasks you can act on right now.',
            activity:'Recent activity',activityCaption:'Current status of your latest releases.',news:'Latest news',newsCaption:'Recent posts from the AetherLab team.',allNews:'All news',
            actionRelease:'New release',actionCatalog:'Catalog',actionNews:'News',actionSupport:'Support',
            noNext:'There are no upcoming approved releases yet. The nearest release date will appear here after approval.',
            drafts:'Drafts',draftsMeta:'Unfinished releases',rejected:'Changes required',rejectedMeta:'Releases rejected by moderation',waiting:'Moderation',waitingMeta:'Releases waiting for review',allGood:'Nothing urgent right now.',
            noActivity:'There are no releases to show activity for yet.',noNews:'There are no published news posts yet.',today:'Today',tomorrow:'Tomorrow',days:'d',hours:'h',minutes:'m',releasedToday:'Release date is today',
            statusDraft:'Draft',statusMod:'In moderation',statusOk:'Approved',statusErr:'Needs changes',releaseDate:'Release date',timezone:'Time zone'
        },
        uk:{
            morning:'Доброго ранку',day:'Добрий день',evening:'Добрий вечір',night:'Доброї ночі',
            subtitle:'Ось що зараз відбувається з вашим каталогом. Дані оновлюються разом із Firebase.',
            synced:'Час Firebase',local:'Локальний час',total:'Усього релізів',moderation:'На модерації',approved:'Прийнято',fix:'Потребує виправлень',
            totalNote:'разом із чернетками',moderationNote:'очікують перевірки',approvedNote:'прийняті модерацією',fixNote:'потрібно виправити',
            next:'Наступний реліз',nextCaption:'Найближчий прийнятий реліз за датою виходу.',catalog:'Увесь каталог',attention:'Потребує уваги',attentionCaption:'Завдання, які можна закрити прямо зараз.',
            activity:'Остання активність',activityCaption:'Поточні статуси останніх релізів.',news:'Останні новини',newsCaption:'Свіжі публікації команди AetherLab.',allNews:'Усі новини',
            actionRelease:'Новий реліз',actionCatalog:'Каталог',actionNews:'Новини',actionSupport:'Підтримка',
            noNext:'Поки немає майбутніх прийнятих релізів. Після схвалення тут з’явиться найближча дата виходу.',
            drafts:'Чернетки',draftsMeta:'Незавершені релізи',rejected:'Виправлення',rejectedMeta:'Релізи відхилені модератором',waiting:'Модерація',waitingMeta:'Релізи очікують перевірки',allGood:'Зараз нічого термінового немає.',
            noActivity:'Поки немає релізів для відображення активності.',noNews:'Поки немає опублікованих новин.',today:'Сьогодні',tomorrow:'Завтра',days:'дн.',hours:'год.',minutes:'хв.',releasedToday:'Дата релізу — сьогодні',
            statusDraft:'Чернетка',statusMod:'На модерації',statusOk:'Прийнято',statusErr:'Потребує виправлень',releaseDate:'Дата виходу',timezone:'Часовий пояс'
        }
    };

    function lang(){
        try{ if(window.AetherI18n && /^(ru|en|uk)$/.test(window.AetherI18n.language||'')) return window.AetherI18n.language; }catch(e){}
        try{ const v=localStorage.getItem('aetherlab_language_v1'); if(/^(ru|en|uk)$/.test(v||'')) return v; }catch(e){}
        return 'ru';
    }
    function t(key){ const l=lang(); return (copy[l]&&copy[l][key])||copy.ru[key]||key; }
    function locale(){ return lang()==='en'?'en-US':lang()==='uk'?'uk-UA':'ru-RU'; }
    function nowMs(){ return window.AetherClock && typeof window.AetherClock.now==='function' ? window.AetherClock.now() : Date.now(); }
    function now(){ return new Date(nowMs()); }
    function esc(v){ return typeof escapeHTML==='function' ? escapeHTML(v) : String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
    function safeAttr(v){ return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
    function visible(){
        try { return (getReleasesVisibleToCurrentUser()||[]).filter(r=>r&&!r.isDeleted); }
        catch(e){ return []; }
    }
    function parseReleaseDate(value){
        const m=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if(m){ const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),0,0,0,0); return Number.isNaN(d.getTime())?null:d; }
        const d=new Date(value); return Number.isNaN(d.getTime())?null:d;
    }
    function startOfToday(){ const d=now(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
    function releaseStamp(r){
        const candidates=[r&&r.updatedAt,r&&r.submittedAt,r&&r.createdAt,r&&r.id];
        for(const c of candidates){ const n=Number(c); if(Number.isFinite(n)&&n>946684800000&&n<4102444800000) return n; }
        const d=r&&r.date?Date.parse(r.date):NaN; return Number.isFinite(d)?d:0;
    }
    function statusInfo(status){
        if(status==='Одобрен') return {label:t('statusOk'),cls:'ok',icon:'✓'};
        if(status==='Модерация') return {label:t('statusMod'),cls:'mod',icon:'↗'};
        if(status==='Отклонён') return {label:t('statusErr'),cls:'err',icon:'!'};
        return {label:t('statusDraft'),cls:'',icon:'•'};
    }
    function setText(id,value){ const el=document.getElementById(id); if(el) el.textContent=value; }
    function greetingFor(date){ const h=date.getHours(); if(h>=5&&h<12)return t('morning'); if(h>=12&&h<18)return t('day'); if(h>=18&&h<23)return t('evening'); return t('night'); }
    function formatDate(date, opts){ try{return new Intl.DateTimeFormat(locale(),opts).format(date);}catch(e){return date.toLocaleDateString();} }
    function formatTimeAgo(ts){
        if(!ts) return '';
        const diff=Math.max(0,nowMs()-ts),min=Math.floor(diff/60000),hr=Math.floor(min/60),day=Math.floor(hr/24);
        if(min<1) return lang()==='en'?'just now':lang()==='uk'?'щойно':'только что';
        if(min<60) return lang()==='en'?`${min} min ago`:lang()==='uk'?`${min} хв тому`:`${min} мин назад`;
        if(hr<24) return lang()==='en'?`${hr} h ago`:lang()==='uk'?`${hr} год тому`:`${hr} ч назад`;
        if(day<7) return lang()==='en'?`${day} d ago`:lang()==='uk'?`${day} дн тому`:`${day} дн назад`;
        return formatDate(new Date(ts),{day:'2-digit',month:'short',year:'numeric'});
    }
    function formatCountdown(target){
        const diff=target.getTime()-nowMs();
        if(diff<=0 && diff>-86400000) return t('releasedToday');
        if(diff<=0) return '';
        const mins=Math.floor(diff/60000); const days=Math.floor(mins/1440); const hours=Math.floor((mins%1440)/60); const minutes=mins%60;
        if(days===0){ if(hours===0) return `${minutes} ${t('minutes')}`; return `${hours} ${t('hours')} ${minutes} ${t('minutes')}`; }
        return `${days} ${t('days')} ${hours} ${t('hours')}`;
    }
    function releaseDateLabel(d){
        const today=startOfToday(); const target=new Date(d.getFullYear(),d.getMonth(),d.getDate()); const delta=Math.round((target-today)/86400000);
        const prefix=delta===0?t('today'):delta===1?t('tomorrow'):formatDate(d,{day:'numeric',month:'long',year:'numeric'});
        return prefix;
    }
    function icon(name){
        const icons={all:'<path d="M4 6h16M4 12h16M4 18h10"/>',mod:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',ok:'<path d="m5 12 4 4L19 6"/>',fix:'<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5M12 18h.01"/>'};
        return `<svg viewBox="0 0 24 24">${icons[name]||icons.all}</svg>`;
    }
    function statCard(label,value,note,kind,onclick){ return `<button type="button" class="overview-stat" onclick="${onclick}"><div class="overview-stat-top"><span class="overview-stat-label">${esc(label)}</span><span class="overview-stat-icon">${icon(kind)}</span></div><div class="overview-stat-value">${value}</div><div class="overview-stat-note">${esc(note)}</div></button>`; }

    function renderCopy(){
        const date=now(); const name=(currentUser&&(currentUser.login||currentUser.email))||'AetherLab';
        setText('overviewGreeting',`${greetingFor(date)}, ${name}`);
        setText('overviewSubtitle',t('subtitle'));
        setText('overviewActionRelease',t('actionRelease'));setText('overviewActionCatalog',t('actionCatalog'));setText('overviewActionNews',t('actionNews'));setText('overviewActionSupport',t('actionSupport'));
        setText('overviewNextHeading',t('next'));setText('overviewNextCaption',t('nextCaption'));setText('overviewCatalogLink',t('catalog'));
        setText('overviewAttentionHeading',t('attention'));setText('overviewAttentionCaption',t('attentionCaption'));
        setText('overviewActivityHeading',t('activity'));setText('overviewActivityCaption',t('activityCaption'));
        setText('overviewNewsHeading',t('news'));setText('overviewNewsCaption',t('newsCaption'));setText('overviewAllNews',t('allNews'));
    }
    function renderStats(list){
        const all=list.length, mod=list.filter(r=>r.status==='Модерация').length, ok=list.filter(r=>r.status==='Одобрен').length, fix=list.filter(r=>r.status==='Отклонён').length;
        const area=document.getElementById('dashboardStats'); if(!area)return;
        area.innerHTML=statCard(t('total'),all,t('totalNote'),'all',"navCatalog('all')")+statCard(t('moderation'),mod,t('moderationNote'),'mod',"navCatalog('mod')")+statCard(t('approved'),ok,t('approvedNote'),'ok',"navCatalog('all')")+statCard(t('fix'),fix,t('fixNote'),'fix',"navCatalog('fix')");
    }
    function renderNext(list){
        const area=document.getElementById('overviewNextRelease'); if(!area)return;
        const today=startOfToday();
        const candidates=list.filter(r=>r.status==='Одобрен').map(r=>({r,d:parseReleaseDate(r.releaseDate)})).filter(x=>x.d&&x.d.getTime()>=today.getTime()).sort((a,b)=>a.d-b.d);
        const item=candidates[0];
        if(!item){area.innerHTML=`<div class="overview-empty">${esc(t('noNext'))}</div>`;return;}
        const r=item.r,d=item.d; const cover=r.coverFile?`<img class="overview-next-cover" src="${safeAttr(r.coverFile)}" alt="${safeAttr(r.title||'')}">`:`<div class="overview-next-cover"></div>`;
        const cd=formatCountdown(d);
        area.innerHTML=`<div class="overview-next">${cover}<div class="overview-next-main"><div class="overview-next-title">${esc(r.title||'Без названия')}</div><div class="overview-next-artist">${esc(r.artist||'—')}</div><div class="overview-next-date"><span>◷</span><span>${esc(t('releaseDate'))}: ${esc(releaseDateLabel(d))}</span></div>${cd?`<div class="overview-countdown" data-overview-countdown="${d.getTime()}">${esc(cd)}</div>`:''}</div></div>`;
    }
    function renderAttention(list){
        const area=document.getElementById('overviewAttention');if(!area)return;
        const draft=list.filter(r=>r.status==='Черновик').length, fix=list.filter(r=>r.status==='Отклонён').length, mod=list.filter(r=>r.status==='Модерация').length;
        const rows=[];
        if(fix) rows.push(`<button type="button" class="overview-attention-item" onclick="navCatalog('fix')"><span class="overview-attention-icon danger">!</span><span class="overview-attention-main"><span class="overview-item-title">${esc(t('rejected'))}</span><span class="overview-item-meta">${esc(t('rejectedMeta'))}</span></span><span class="overview-attention-count">${fix}</span></button>`);
        if(draft) rows.push(`<button type="button" class="overview-attention-item" onclick="navCatalog('drafts')"><span class="overview-attention-icon warning">✎</span><span class="overview-attention-main"><span class="overview-item-title">${esc(t('drafts'))}</span><span class="overview-item-meta">${esc(t('draftsMeta'))}</span></span><span class="overview-attention-count">${draft}</span></button>`);
        if(mod) rows.push(`<button type="button" class="overview-attention-item" onclick="navCatalog('mod')"><span class="overview-attention-icon info">◷</span><span class="overview-attention-main"><span class="overview-item-title">${esc(t('waiting'))}</span><span class="overview-item-meta">${esc(t('waitingMeta'))}</span></span><span class="overview-attention-count">${mod}</span></button>`);
        area.innerHTML=rows.length?rows.join(''):`<div class="overview-empty">${esc(t('allGood'))}</div>`;
    }
    function renderActivity(list){
        const area=document.getElementById('overviewActivity');if(!area)return;
        const latest=list.slice().sort((a,b)=>releaseStamp(b)-releaseStamp(a)).slice(0,5);
        if(!latest.length){area.innerHTML=`<div class="overview-empty">${esc(t('noActivity'))}</div>`;return;}
        area.innerHTML=latest.map(r=>{const s=statusInfo(r.status),stamp=releaseStamp(r);return `<div class="overview-activity-item"><span class="overview-activity-icon">${esc(s.icon)}</span><span class="overview-activity-main"><span class="overview-item-title">${esc(r.artist||'—')} — ${esc(r.title||'Без названия')}</span><span class="overview-item-meta">${esc(s.label)}${stamp?` • ${esc(formatTimeAgo(stamp))}`:''}</span></span><span class="overview-status-dot ${s.cls}"></span></div>`;}).join('');
    }
    function normalizeNews(raw){
        if(typeof normalizeContentItems==='function') return normalizeContentItems(raw);
        if(Array.isArray(raw)) return raw; if(raw&&typeof raw==='object') return Object.values(raw); return [];
    }
    function renderNews(){
        const area=document.getElementById('overviewLatestNews');if(!area)return;
        const items=normalizeNews(appState&&appState.content?appState.content.news:[]).filter(Boolean).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).slice(0,3);
        if(!items.length){area.innerHTML=`<div class="overview-empty">${esc(t('noNews'))}</div>`;return;}
        area.innerHTML=items.map(item=>{const title=item.title||item.name||'AetherLab'; const text=typeof richHTMLToPlainText==='function'?richHTMLToPlainText(item.text||item.content||''):String(item.text||item.content||'').replace(/<[^>]+>/g,' '); return `<button type="button" class="overview-news-item" onclick="nav('news')"><span class="overview-news-main"><span class="overview-item-title">${esc(title)}</span><span class="overview-item-meta">${esc(text.slice(0,120)||'AetherLab')}</span>${item.createdAt?`<span class="overview-news-date">${esc(formatDate(new Date(Number(item.createdAt)),{day:'2-digit',month:'short',year:'numeric'}))}</span>`:''}</span></button>`;}).join('');
    }
    function updateClock(){
        const d=now(); setText('overviewClockTime',new Intl.DateTimeFormat(locale(),{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d)); setText('overviewClockDate',formatDate(d,{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
        const zone=(window.AetherClock&&window.AetherClock.timeZone)||(()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'Local'}catch(e){return 'Local'}})();
        setText('overviewClockZone',zone); const synced=!!(window.AetherClock&&window.AetherClock.synced); setText('overviewClockSyncText',synced?t('synced'):t('local')); const dot=document.getElementById('overviewClockSyncDot');if(dot)dot.classList.toggle('synced',synced);
        const cd=document.querySelector('[data-overview-countdown]'); if(cd){const target=new Date(Number(cd.dataset.overviewCountdown));cd.textContent=formatCountdown(target);}
        const greet=document.getElementById('overviewGreeting'); if(greet&&currentUser){const name=currentUser.login||currentUser.email||'AetherLab'; greet.textContent=`${greetingFor(d)}, ${name}`;}
    }
    function ensureTimer(){ if(timer)return; updateClock(); timer=setInterval(updateClock,1000); if(window.AetherClock&&window.AetherClock.onChange)window.AetherClock.onChange(updateClock); }

    window.renderOverview=function(){
        if(!currentUser)return;
        renderCopy(); const list=visible(); renderStats(list); renderNext(list); renderAttention(list); renderActivity(list); renderNews(); updateClock(); ensureTimer();
        try{ if(typeof window.renderOverviewFinancePreview==='function') window.renderOverviewFinancePreview(); }catch(e){console.warn('Finance overview preview:',e);}
    };
    window.AetherOverview={render:window.renderOverview,refreshClock:updateClock};
})();
