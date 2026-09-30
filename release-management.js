/* AetherLab Release Management 2.0 */
(function(){
    'use strict';

    const MODERATION_CHECKS = [
        ['cover','Обложка'],
        ['audio','Аудио'],
        ['title','Название'],
        ['artist','Исполнитель'],
        ['metadata','Основные данные'],
        ['tracks','Трек-лист'],
        ['credits','Авторы / композиторы'],
        ['explicit','Explicit'],
        ['language','Язык'],
        ['lyrics','Lyrics / TTML'],
        ['ai','AI-маркировка']
    ];
    const MODERATION_STATES = {
        pending:{label:'Не проверено', cls:''},
        ok:{label:'Принято', cls:'ok'},
        warn:{label:'Требует внимания', cls:'warn'},
        error:{label:'Исправить', cls:'error'}
    };
    const DELIVERY_LABELS = {
        not_started:'Не начата',
        preparing:'Подготовка',
        delivered:'Доставлен площадкам',
        published:'Опубликован'
    };
    const LOG_CATEGORY_LABELS = {release:'Релизы', moderation:'Модерация', user:'Пользователи', support:'Поддержка', finance:'Финансы', system:'Система'};
    const LOG_CATEGORY_ICON = {release:'♫', moderation:'✓', user:'◎', support:'✉', finance:'€', system:'◇'};

    window.currentReleaseHubId = window.currentReleaseHubId || null;
    window.currentReleaseHubTab = window.currentReleaseHubTab || 'overview';
    window.releaseCalendarMode = window.releaseCalendarMode || 'month';
    window.releaseCalendarDate = window.releaseCalendarDate || new Date();
    window.activityLogFilter = window.activityLogFilter || 'all';
    window.__editingModerationReleaseId = null;

    function esc(v){ return typeof escapeHTML === 'function' ? escapeHTML(v) : String(v ?? '').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c])); }
    function attr(v){ return typeof escapeAttr === 'function' ? escapeAttr(v) : esc(v).replace(/'/g,'&#39;'); }
    function now(){ return Date.now(); }
    function currentActor(){
        return {
            id: currentUser && currentUser.id || '',
            email: currentUser && currentUser.email || '',
            name: currentUser && (currentUser.login || currentUser.email) || 'AetherLab',
            role: currentUser && currentUser.role || ''
        };
    }
    function logId(){ return 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }
    function historyId(){ return 'hist_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }
    function visibleReleaseById(id){
        const r = (appState.releases || []).find(x => String(x.id) === String(id));
        if(!r || r.isDeleted) return null;
        try {
            if(currentUser && currentUser.role === 'Administrator') return r;
            if(typeof releaseBelongsToUser === 'function' && currentUser && !releaseBelongsToUser(r,currentUser)) return null;
        } catch(e){}
        return r;
    }
    function formatDateTime(ts){
        const d = new Date(Number(ts)||Date.now());
        try { return d.toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
        catch(e){ return d.toLocaleString(); }
    }
    function formatDateOnly(v){
        if(!v) return '—';
        if(typeof formatReleaseDate === 'function') return formatReleaseDate(v);
        return String(v);
    }
    function statusClass(r){
        if(!r) return '';
        if(r.status === 'Одобрен') return 'rm-status-approved';
        if(r.status === 'Отклонён') return 'rm-status-fix';
        if(r.status === 'Модерация') return 'rm-status-moderation';
        return '';
    }
    function releaseStatusLabel(r){
        if(!r) return '—';
        return ({'Одобрен':'Принят','Отклонён':'Требует исправления','Модерация':'На модерации','Черновик':'Черновик'})[r.status] || r.status || '—';
    }
    function releaseHistoryArray(r){
        if(!r) return [];
        if(Array.isArray(r.history)) return r.history.filter(Boolean);
        if(r.history && typeof r.history === 'object') return Object.values(r.history).filter(Boolean);
        return [];
    }
    function addHistoryToObject(r, title, detail, type='release', actor){
        if(!r) return null;
        const list = releaseHistoryArray(r).slice();
        const item = {id:historyId(), title:String(title||'Действие'), detail:String(detail||''), type, createdAt:now(), actor:actor || currentActor()};
        list.push(item);
        r.history = list.slice(-250);
        return item;
    }
    window.aetherAddReleaseHistory = function(r,title,detail,type){ return addHistoryToObject(r,title,detail,type); };

    window.aetherRecordActivity = function(category, action, detail, release, extra){
        const item = Object.assign({
            id:logId(), category:category || 'system', action:String(action||'Действие'), detail:String(detail||''), createdAt:now(), actor:currentActor(),
            releaseId:release && release.id || '', releaseTitle:release && release.title || '', releaseArtist:release && release.artist || '', userEmail:release && release.userEmail || ''
        }, extra || {});
        if(!Array.isArray(appState.activityLog)) appState.activityLog = [];
        appState.activityLog.unshift(item);
        appState.activityLog = appState.activityLog.slice(0,800);
        try { db.ref('activityLog/' + item.id).set(item).catch(err => console.warn('Activity log Firebase write skipped:', err && err.message || err)); } catch(e){}
        if(currentSection === 'activityLog') renderActivityLog();
        return item;
    };

    function changedTrackAudio(oldR,newR){
        const a=(oldR&&oldR.tracks)||[], b=(newR&&newR.tracks)||[];
        if(a.length!==b.length) return true;
        return b.some((t,i)=> String((a[i]&&a[i].audioFile)||'') !== String(t.audioFile||'') || String((a[i]&&a[i].filename)||'') !== String(t.filename||''));
    }
    window.aetherPrepareReleaseHistory = function(existing, next, context){
        if(!next) return next;
        next.history = releaseHistoryArray(existing || next).slice();
        let title='Релиз изменён', detail='Данные релиза обновлены.', category='release';
        if(context==='draft_created'){title='Создан черновик'; detail=`Создан черновик «${next.title || 'Без названия'}».`;}
        else if(context==='draft_saved'){title='Черновик сохранён'; detail='Изменения черновика сохранены.';}
        else if(context==='submitted'){title='Релиз отправлен на модерацию'; detail='Релиз передан команде AetherLab на проверку.'; category='moderation';}
        else if(context==='resubmitted'){title='Исправления отправлены повторно'; detail='Артист внёс исправления и повторно отправил релиз на модерацию.'; category='moderation';}
        else if(context==='admin_saved'){title='Релиз обновлён администратором'; detail='Администратор изменил данные релиза.';}
        const changes=[];
        if(existing){
            if(String(existing.coverFile||'')!==String(next.coverFile||'')) changes.push('изменена обложка');
            if(String(existing.title||'')!==String(next.title||'')) changes.push('изменено название');
            if(String(existing.artist||'')!==String(next.artist||'')) changes.push('изменён исполнитель');
            if(changedTrackAudio(existing,next)) changes.push('изменены аудиофайлы/трек-лист');
            if(String(existing.releaseDate||'')!==String(next.releaseDate||'')) changes.push('изменена дата релиза');
        }
        if(changes.length) detail += ' Изменения: ' + changes.join(', ') + '.';
        addHistoryToObject(next,title,detail,category);
        setTimeout(()=>window.aetherRecordActivity(category,title,detail,next),0);
        return next;
    };

    function moderationData(r){
        const m=r && r.moderation && typeof r.moderation==='object'?r.moderation:{};
        const checks=m.checks && typeof m.checks==='object'?m.checks:{};
        return {m,checks};
    }
    function moderationIssue(r,key){
        const item=moderationData(r).checks[key];
        if(!item || !['error','warn'].includes(item.state)) return null;
        return {key,state:item.state,label:(MODERATION_CHECKS.find(x=>x[0]===key)||[])[1]||key,comment:String(item.comment||MODERATION_STATES[item.state].label)};
    }
    window.aetherGetModerationIssue=function(r,key){return moderationIssue(r,key);};
    window.aetherModerationIssueHTML=function(r,key,extraClass=''){
        const issue=moderationIssue(r,key); if(!issue) return '';
        return `<div class="aether-inline-moderation-issue ${issue.state} ${esc(extraClass)}" data-moderation-issue="${attr(key)}"><span>${issue.state==='error'?'!':'i'}</span><div><strong>${esc(issue.label)}</strong><div>${esc(issue.comment)}</div></div></div>`;
    };
    window.aetherClearModerationInlineIssues=function(){ document.querySelectorAll('.aether-inline-moderation-issue[data-form-injected="1"],.track-editor-moderation-issue').forEach(el=>el.remove()); };
    function injectIssueAfter(target,r,key,trackEditor){
        const issue=moderationIssue(r,key); if(!target||!issue) return;
        const holder=document.createElement('div'); holder.innerHTML=window.aetherModerationIssueHTML(r,key,trackEditor?'track-editor-moderation-issue':'');
        const node=holder.firstElementChild; if(!node)return; node.dataset.formInjected='1';
        target.insertAdjacentElement('afterend',node);
    }
    window.aetherApplyModerationIssuesToReleaseForm=function(r){
        window.aetherClearModerationInlineIssues();
        if(!r) return;
        const title=document.getElementById('r_title');
        const artist=document.getElementById('r_artist_container');
        const type=document.getElementById('r_type');
        const cover=document.getElementById('coverTechnicalCheck') || document.getElementById('r_cover_box');
        const tracks=document.getElementById('draftTracksList');
        injectIssueAfter(title && title.closest('.form-group'),r,'title');
        injectIssueAfter(artist && artist.closest('.form-group'),r,'artist');
        injectIssueAfter(type && type.closest('.form-group'),r,'metadata');
        injectIssueAfter(cover,r,'cover');
        ['audio','tracks','credits','explicit','language','lyrics','ai'].forEach(key=>injectIssueAfter(tracks,r,key));
    };
    window.aetherApplyTrackModerationIssues=function(r){
        document.querySelectorAll('.track-editor-moderation-issue').forEach(el=>el.remove());
        if(!r)return;
        injectIssueAfter(document.getElementById('trackTechnicalCheck'),r,'audio',true);
        const map={tracks:'t_title',credits:'t_author_container',explicit:'t_explicit',language:'t_lang',lyrics:'t_lyrics',ai:'trackAiUsageBox'};
        Object.entries(map).forEach(([key,id])=>{const el=document.getElementById(id); injectIssueAfter(el && (el.closest('.form-group')||el),r,key,true);});
    };

    function hubInfo(label,value,issue){
        return `<div class="rm-info ${issue?'has-issue '+issue.state:''}"><div class="rm-info-label">${esc(label)}</div><div class="rm-info-value">${esc(value || '—')}</div>${issue?`<div class="rm-info-issue ${issue.state}">${esc(issue.comment)}</div>`:''}</div>`;
    }
    function historyHas(r,patterns){
        const p=Array.isArray(patterns)?patterns:[patterns];
        return releaseHistoryArray(r).some(h=>p.some(x=>String(h.title||'').toLowerCase().includes(String(x).toLowerCase())||String(h.detail||'').toLowerCase().includes(String(x).toLowerCase())));
    }
    function renderReleaseStages(r){
        const status=r.status||'Черновик';
        const sent=status!=='Черновик'||historyHas(r,['отправлен на модерацию','повторно']);
        const moderation=sent&&(status==='Модерация'||status==='Отклонён'||status==='Одобрен'||historyHas(r,['модерац','провер']));
        const fixed=historyHas(r,['исправления отправлены повторно','внёс исправления','повторно отправил']);
        const accepted=status==='Одобрен'||historyHas(r,['релиз принят aetherlab','модерация завершена успешно']);
        const delivered=['delivered','published'].includes(r.distribution&&r.distribution.status);
        const items=[
            ['Создан','Релиз создан в кабинете',true],
            ['Отправлен','Передан на проверку AetherLab',sent],
            ['На модерации','Проверяются данные, обложка и аудио',moderation],
            ['Исправлен','Артист отправил исправления после замечаний',fixed],
            ['Принят','Модерация завершена успешно',accepted],
            ['Доставлен','Релиз отправлен на музыкальные площадки',delivered]
        ];
        let currentAssigned=false;
        return `<div class="rm-timeline">${items.map(x=>{
            const done=!!x[2];
            const current=!done&&!currentAssigned&&(currentAssigned=true);
            return `<div class="rm-timeline-item ${done?'done':current?'current':''}"><span class="rm-timeline-dot"></span><div class="rm-timeline-title">${esc(x[0])}</div><div class="rm-timeline-sub">${esc(x[1])}</div></div>`;
        }).join('')}</div>`;
    }
    function renderModerationSummary(r){
        const {m,checks}=moderationData(r);
        const issueRows=MODERATION_CHECKS.map(([key,label])=>{const item=checks[key]; if(!item||!['error','warn'].includes(item.state))return''; const state=MODERATION_STATES[item.state]; return `<div class="rm-check-row compact"><div class="rm-check-name">${esc(label)}</div><div class="rm-check-state ${state.cls}">${esc(state.label)}</div><div class="rm-check-comment">${esc(item.comment||state.label)}</div></div>`;}).filter(Boolean).join('');
        const admin=currentUser&&currentUser.role==='Administrator';
        if(!issueRows&&!m.summary&&!admin) return '';
        return `<div class="rm-panel"><div class="rm-panel-heading-row"><div><h3>Модерация по полям</h3><p class="text-sm">Замечания привязаны к конкретным элементам релиза.</p></div>${admin?`<button class="btn-primary" onclick="openReleaseModerationEditor('${attr(r.id)}')">Проверить релиз</button>`:''}</div>${issueRows?`<div class="rm-moderation-list" style="margin-top:15px;">${issueRows}</div>`:`<div class="rm-empty rm-empty-small">Замечаний по полям сейчас нет.</div>`}${m.summary?`<div class="rm-moderation-summary"><strong>Комментарий модератора</strong><div>${esc(m.summary)}</div></div>`:''}</div>`;
    }
    function syntheticHistory(r){
        const list=releaseHistoryArray(r).slice();
        if(!list.length) list.push({id:'legacy-created',title:'История релиза',detail:'Подробная история начнёт формироваться с обновления Release Hub 2.0.',createdAt:Date.now()-1000,type:'system',actor:{name:'AetherLab'}});
        return list.sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
    }
    function renderHistoryPreview(r){
        const list=syntheticHistory(r).slice(0,8);
        return `<div class="rm-panel"><h3>История релиза</h3><div class="rm-history-list">${list.map(item=>`<div class="rm-history-row"><div class="rm-history-dot"></div><div><div class="rm-history-title">${esc(item.title||'Действие')}</div><div class="rm-history-detail">${esc(item.detail||'')}</div><div class="rm-history-meta">${esc(formatDateTime(item.createdAt))}${item.actor&&item.actor.name?' • '+esc(item.actor.name):''}</div></div></div>`).join('')}</div></div>`;
    }
    function renderHubOverview(r){
        return `<div class="rm-panel"><h3>Обзор релиза</h3><div class="rm-grid">
            ${hubInfo('Формат',r.type,moderationIssue(r,'metadata'))}${hubInfo('Дата релиза',formatDateOnly(r.releaseDate),moderationIssue(r,'metadata'))}${hubInfo('Оригинальная дата',formatDateOnly(r.originalReleaseDate),null)}${hubInfo('UPC',r.upc,null)}${hubInfo('Жанр',r.genre,moderationIssue(r,'metadata'))}${hubInfo('Год',r.year,moderationIssue(r,'metadata'))}
        </div></div><div class="rm-panel"><h3>Путь релиза</h3>${renderReleaseStages(r)}</div>${renderModerationSummary(r)}${renderHistoryPreview(r)}`;
    }
    function audioTechChips(t){
        const q=t&&t.audioTechnical; if(!q)return'';
        if(!q.valid) return `<div class="track-tech-inline"><span class="track-tech-chip error">WAV: ошибка чтения</span></div>`;
        const sr=q.sampleRate?`${Math.round(q.sampleRate/100)/10} kHz`:'Sample rate —';
        const bit=q.bitDepth?`${q.bitDepth}-bit`:'Bit depth —';
        const ch=q.channels===2?'Stereo':q.channels===1?'Mono':(q.channels?`${q.channels} ch`:'Channels —');
        return `<div class="track-tech-inline"><span class="track-tech-chip ${q.sampleRate>=44100?'ok':'error'}">${esc(sr)}</span><span class="track-tech-chip ${q.bitDepth>=16?'ok':'error'}">${esc(bit)}</span><span class="track-tech-chip ${q.channels===2?'ok':'error'}">${esc(ch)}</span></div>`;
    }
    function renderHubTracks(r){
        const tracks=Array.isArray(r.tracks)?r.tracks:[];
        if(!tracks.length) return `<div class="rm-panel"><div class="rm-empty">Трек-лист пока пуст.</div></div>`;
        const keys=['audio','tracks','credits','explicit','language','lyrics','ai'];
        const issues=keys.map(k=>moderationIssue(r,k)).filter(Boolean);
        return `<div class="rm-panel"><div class="rm-panel-heading-row"><div><h3>Треки</h3><p class="text-sm">Аудио, ISRC, метаданные и техническая проверка.</p></div><span class="rm-track-count">${tracks.length}</span></div>${issues.length?`<div class="rm-track-issues">${issues.map(i=>`<div class="aether-inline-moderation-issue ${i.state}"><span>${i.state==='error'?'!':'i'}</span><div><strong>${esc(i.label)}</strong><div>${esc(i.comment)}</div></div></div>`).join('')}</div>`:''}<div class="rm-track-list">${tracks.map((t,i)=>{
            const src=t.audioFile||'';
            return `<div class="rm-track-card"><div class="rm-track-num">${i+1}</div><div><div class="rm-track-head"><div><div class="rm-track-title">${esc(t.title||r.title||'Без названия')}</div><div class="rm-track-sub">${esc(t.artist||r.artist||'—')}</div></div><span class="badge badge-draft">${esc(t.duration||'—')}</span></div><div class="rm-track-meta"><span>${esc(t.type||'Original')}</span><span>${esc(t.lang||'Язык —')}</span><span>ISRC: ${esc(t.isrc||'—')}</span><span>Explicit: ${esc(t.explicit||'Нет')}</span></div>${audioTechChips(t)}${src?`<audio controls preload="metadata" data-title="${attr((t.artist||r.artist||'')+' — '+(t.title||r.title||''))}" src="${attr(src)}"></audio>`:''}</div></div>`;
        }).join('')}</div></div>`;
    }
    function renderHubDelivery(r){
        const status=(r.distribution&&r.distribution.status)||'not_started';
        const admin=currentUser&&currentUser.role==='Administrator';
        const note=(r.distribution&&r.distribution.note)||'Статус доставки обновляется командой AetherLab.';
        const select=Object.entries(DELIVERY_LABELS).map(([v,t])=>`<option value="${v}" ${v===status?'selected':''}>${esc(t)}</option>`).join('');
        return `<div class="rm-panel"><h3>Доставка</h3><div class="rm-delivery-card"><div><div class="rm-delivery-status">${esc(DELIVERY_LABELS[status]||status)}</div><div class="rm-delivery-note">${esc(note)}</div></div>${admin?`<div class="rm-delivery-admin"><select id="releaseDeliveryStatus">${select}</select><button class="btn-primary" onclick="saveReleaseDeliveryStatus('${attr(r.id)}')">Сохранить</button></div>`:''}</div></div>`;
    }
    function financeRowsForRelease(r){
        const reports=(window.AetherFinance&&Array.isArray(window.AetherFinance.reports))?window.AetherFinance.reports:[];
        const groups=[];
        reports.forEach(report=>{
            const rows=[];
            (Array.isArray(report.sheets)?report.sheets:[]).forEach(sh=>{
                (Array.isArray(sh.rows)?sh.rows:[]).forEach(row=>{
                    const idMatch=String(row.releaseId||'')===String(r.id||'');
                    const upcMatch=!row.releaseId&&r.upc&&String(row.releaseUPC||'')===String(r.upc);
                    if(idMatch||upcMatch) rows.push(row);
                });
            });
            if(rows.length){
                const amount=rows.reduce((sum,row)=>sum+(Number.isFinite(Number(row.amountEUR))?Number(row.amountEUR):Number(row.amountScaled||0)/100000000),0);
                groups.push({report,rows,amount});
            }
        });
        return groups.sort((a,b)=>Number(b.report.publishedAt||b.report.loadedAt||0)-Number(a.report.publishedAt||a.report.loadedAt||0));
    }
    function euro(v){try{return new Intl.NumberFormat('ru-RU',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:8}).format(Number(v)||0);}catch(e){return (Number(v)||0).toFixed(2)+' EUR';}}
    function renderHubFinance(r){
        const groups=financeRowsForRelease(r);
        if(!groups.length) return `<div class="rm-panel"><div class="rm-panel-heading-row"><div><h3>Финансы</h3><p class="text-sm">Сюда автоматически попадут строки финансовых отчётов, сопоставленные с этим релизом.</p></div></div><div class="rm-empty">По этому релизу пока нет финансовых данных.</div></div>`;
        const total=groups.reduce((s,g)=>s+g.amount,0);
        return `<div class="rm-finance-summary"><div class="rm-finance-total"><span>Доход по релизу</span><strong>${esc(euro(total))}</strong><small>${groups.reduce((s,g)=>s+g.rows.length,0)} строк отчётов</small></div><div class="rm-finance-reports">${groups.map(g=>`<div class="rm-finance-report"><div><div class="rm-finance-quarter">${esc(g.report.quarter||'Финансовый отчёт')}</div><div class="rm-finance-meta">${g.report.publishedAt?esc(formatDateTime(g.report.publishedAt)):''} · ${g.rows.length} строк</div></div><strong>${esc(euro(g.amount))}</strong></div>`).join('')}</div></div><div class="rm-panel"><p class="text-sm" style="margin:0;">Суммы берутся только из опубликованных отчётов, где строки точно сопоставлены с этим релизом в AetherLab.</p></div>`;
    }
    function releaseHubTabContent(r,tab){
        if(tab==='tracks') return renderHubTracks(r);
        if(tab==='delivery') return renderHubDelivery(r);
        if(tab==='finance') return renderHubFinance(r);
        return renderHubOverview(r);
    }
    window.openReleaseHub=function(id,tab){
        const r=visibleReleaseById(id); if(!r) return UI.alert('Ошибка','Релиз не найден или недоступен.');
        window.currentReleaseHubId=String(id); window.currentReleaseHubTab=tab||'overview';
        try{sessionStorage.setItem('aetherlab_release_hub_id',String(id));}catch(e){}
        nav('releaseHub',true); renderReleaseHub();
    };
    window.setReleaseHubTab=function(tab){ window.currentReleaseHubTab=tab||'overview'; renderReleaseHub(); };
    window.renderReleaseHub=function(){
        const root=document.getElementById('releaseHubRoot'); if(!root) return;
        let id=window.currentReleaseHubId; if(!id) try{id=sessionStorage.getItem('aetherlab_release_hub_id')||'';}catch(e){}
        const r=visibleReleaseById(id);
        if(!r){root.innerHTML='<div class="rm-empty">Релиз не найден.</div>';return;}
        window.currentReleaseHubId=String(r.id);
        const tabs=[['overview','Обзор'],['tracks','Треки'],['delivery','Доставка'],['finance','Финансы']];
        const coverIssue=moderationIssue(r,'cover'), titleIssue=moderationIssue(r,'title'), artistIssue=moderationIssue(r,'artist');
        const cover=r.coverFile?`<div class="rm-cover-wrap"><img class="rm-cover" src="${attr(r.coverFile)}" alt="Обложка">${coverIssue?`<div class="rm-hero-issue-badge ${coverIssue.state}" title="${attr(coverIssue.comment)}">!</div>`:''}</div>`:`<div class="rm-cover rm-cover-empty">♫</div>`;
        root.innerHTML=`<div class="rm-shell"><div class="rm-hero">${cover}<div class="rm-hero-main"><button class="rm-back" type="button" onclick="${currentUser&&currentUser.role==='Administrator'?"nav('adminReleases')":"navCatalog('all')"}">← Назад</button><div class="rm-title">${esc(r.title||'Без названия')}</div>${titleIssue?`<div class="rm-hero-field-issue ${titleIssue.state}">${esc(titleIssue.comment)}</div>`:''}<div class="rm-artist">${esc(r.artist||'—')}</div>${artistIssue?`<div class="rm-hero-field-issue ${artistIssue.state}">${esc(artistIssue.comment)}</div>`:''}</div><div class="rm-hero-meta"><span class="rm-chip ${statusClass(r)}"><span class="rm-status-dot"></span>${esc(releaseStatusLabel(r))}</span><span class="rm-chip">${esc(formatDateOnly(r.releaseDate))}</span><span class="rm-chip">UPC: ${esc(r.upc||'—')}</span></div></div><div class="rm-tabs">${tabs.map(([key,label])=>`<button class="rm-tab ${window.currentReleaseHubTab===key?'active':''}" onclick="setReleaseHubTab('${key}')">${label}</button>`).join('')}</div>${releaseHubTabContent(r,window.currentReleaseHubTab)}</div>`;
        if(typeof aetherUpgradeAllAudioPlayers==='function') setTimeout(()=>aetherUpgradeAllAudioPlayers(root),0);
    };

    window.openReleaseModerationEditor=function(id){
        if(!currentUser||currentUser.role!=='Administrator') return;
        const r=visibleReleaseById(id); if(!r) return;
        window.__editingModerationReleaseId=String(id);
        const box=document.getElementById('releaseModerationEditor'); const body=document.getElementById('releaseModerationEditorBody'); const sub=document.getElementById('releaseModerationEditorSubtitle');
        if(!box||!body) return;
        const checks=moderationData(r).checks;
        if(sub) sub.textContent=`${r.artist||'—'} — ${r.title||'Без названия'}`;
        body.innerHTML=`<div class="rm-edit-list">${MODERATION_CHECKS.map(([key,label])=>{
            const item=checks[key]||{}; const state=item.state||'pending';
            return `<div class="rm-edit-row" data-mod-key="${key}"><div class="rm-check-name">${esc(label)}</div><select class="rm-edit-state"><option value="pending" ${state==='pending'?'selected':''}>Не проверено</option><option value="ok" ${state==='ok'?'selected':''}>Принято</option><option value="warn" ${state==='warn'?'selected':''}>Требует внимания</option><option value="error" ${state==='error'?'selected':''}>Исправить</option></select><textarea class="rm-edit-comment" rows="2" placeholder="Например: Замените WAV / Исправьте имя исполнителя">${esc(item.comment||'')}</textarea></div>`;
        }).join('')}</div><div class="form-group" style="margin-top:14px;"><label>Общий комментарий модератора</label><textarea id="releaseModerationSummary" rows="3" placeholder="Необязательно">${esc((r.moderation&&r.moderation.summary)||'')}</textarea></div>`;
        box.classList.remove('hidden');
        if(typeof refreshCustomSelectsSoon==='function') refreshCustomSelectsSoon();
    };
    window.closeReleaseModerationEditor=function(){const box=document.getElementById('releaseModerationEditor'); if(box) box.classList.add('hidden'); window.__editingModerationReleaseId=null;};
    window.saveReleaseModerationChecklist=function(){
        if(!currentUser||currentUser.role!=='Administrator') return;
        const r=visibleReleaseById(window.__editingModerationReleaseId); if(!r) return;
        const checks={}; let errors=[]; let warnings=[];
        document.querySelectorAll('#releaseModerationEditorBody .rm-edit-row').forEach(row=>{
            const key=row.dataset.modKey; const state=row.querySelector('.rm-edit-state')?.value||'pending'; const comment=(row.querySelector('.rm-edit-comment')?.value||'').trim();
            checks[key]={state,comment};
            const label=(MODERATION_CHECKS.find(x=>x[0]===key)||[])[1]||key;
            if(state==='error') errors.push(comment?`${label}: ${comment}`:label);
            if(state==='warn') warnings.push(comment?`${label}: ${comment}`:label);
        });
        const summary=(document.getElementById('releaseModerationSummary')?.value||'').trim();
        r.moderation={checks,summary,updatedAt:now(),updatedBy:currentActor()};
        let histTitle='Проверка модерации сохранена'; let histDetail='Модератор обновил проверку полей релиза.';
        if(errors.length){
            r.status='Отклонён'; r.rejectReason=errors.join(' • '); histTitle='Запрошены исправления'; histDetail=errors.join(' • ');
        } else if(warnings.length){ histDetail='Есть замечания: '+warnings.join(' • '); }
        else if(Object.values(checks).length && Object.values(checks).every(x=>x.state==='ok')){ histDetail='Все пункты проверки отмечены как принятые.'; }
        addHistoryToObject(r,histTitle,histDetail,'moderation');
        window.aetherRecordActivity('moderation',histTitle,histDetail,r);
        db.ref('releases/'+r.id).set(r).then(()=>{ closeReleaseModerationEditor(); renderReleaseHub(); if(typeof renderAdminReleases==='function') renderAdminReleases(false); UI.alert('Сохранено','Результат проверки сохранён.'); }).catch(err=>UI.alert('Ошибка',esc(err.message||err)));
    };
    window.aetherRenderModerationIssues=function(r){
        if(!r) return '';
        const checks=moderationData(r).checks;
        const issues=MODERATION_CHECKS.map(([key,label])=>({label,item:checks[key]})).filter(x=>x.item&&(x.item.state==='error'||x.item.state==='warn'));
        if(!issues.length) return r.rejectReason?`<strong>Причина:</strong><br>${esc(r.rejectReason)}`:'';
        return `<div class="rm-issue-list">${issues.map(x=>`<div class="rm-issue-item"><strong>${esc(x.label)}:</strong> ${esc(x.item.comment||MODERATION_STATES[x.item.state].label)}</div>`).join('')}</div>`;
    };
    window.saveReleaseDeliveryStatus=function(id){
        if(!currentUser||currentUser.role!=='Administrator') return;
        const r=visibleReleaseById(id); const select=document.getElementById('releaseDeliveryStatus'); if(!r||!select) return;
        const old=(r.distribution&&r.distribution.status)||'not_started'; const status=select.value;
        r.distribution=Object.assign({},r.distribution||{},{status,updatedAt:now(),updatedBy:currentActor()});
        if(old!==status){ const title='Обновлён статус доставки'; const detail=`${DELIVERY_LABELS[old]||old} → ${DELIVERY_LABELS[status]||status}`; addHistoryToObject(r,title,detail,'release'); window.aetherRecordActivity('release',title,detail,r); }
        db.ref('releases/'+r.id).set(r).then(()=>renderReleaseHub());
    };

    function releaseDateObject(v){
        const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!m) return null;
        return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12,0,0,0);
    }
    function calendarVisibleReleases(){
        const all=(appState.releases||[]).filter(r=>r&&!r.isDeleted&&releaseDateObject(r.releaseDate));
        if(currentUser&&currentUser.role==='Administrator') return all;
        try{return getReleasesVisibleToCurrentUser().filter(r=>r&&!r.isDeleted&&releaseDateObject(r.releaseDate));}catch(e){return all.filter(r=>!currentUser||String(r.userEmail||'').toLowerCase()===String(currentUser.email||'').toLowerCase());}
    }
    function calendarStatusClass(r){return r.status==='Одобрен'?'approved':r.status==='Модерация'?'moderation':r.status==='Отклонён'?'fix':'draft';}
    function monthName(d){return d.toLocaleDateString('ru-RU',{month:'long',year:'numeric'});}
    function calendarListHTML(rels,monthDate){
        const list=rels.filter(r=>{const d=releaseDateObject(r.releaseDate);return d&&d.getFullYear()===monthDate.getFullYear()&&d.getMonth()===monthDate.getMonth();}).sort((a,b)=>releaseDateObject(a.releaseDate)-releaseDateObject(b.releaseDate));
        if(!list.length) return '<div class="rm-empty">В этом месяце релизов пока нет.</div>';
        let last=''; let out='<div class="calendar-list">';
        list.forEach(r=>{const d=releaseDateObject(r.releaseDate);const key=r.releaseDate;if(key!==last){last=key;out+=`<div class="calendar-list-date">${esc(d.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'}))}</div>`;}out+=`<div class="calendar-list-item" onclick="openReleaseHub('${attr(r.id)}')"><img src="${attr(r.coverFile||'')}" alt=""><div><div class="calendar-list-title">${esc(r.title||'Без названия')}</div><div class="calendar-list-sub">${esc(r.artist||'—')}</div></div><div class="calendar-list-status"><span class="calendar-event-dot ${calendarStatusClass(r)}"></span>${esc(releaseStatusLabel(r))}</div></div>`;});
        return out+'</div>';
    }
    function calendarMonthHTML(rels,monthDate){
        const y=monthDate.getFullYear(),m=monthDate.getMonth(); const first=new Date(y,m,1); const firstMonday=(first.getDay()+6)%7; const start=new Date(y,m,1-firstMonday);
        let days=''; const today=new Date();
        for(let i=0;i<42;i++){
            const d=new Date(start); d.setDate(start.getDate()+i); const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const dayRels=rels.filter(r=>r.releaseDate===iso).slice(0,3); const more=rels.filter(r=>r.releaseDate===iso).length-dayRels.length;
            const cls=[d.getMonth()!==m?'other':'',d.toDateString()===today.toDateString()?'today':''].filter(Boolean).join(' ');
            days+=`<div class="calendar-day ${cls}"><div class="calendar-day-num">${d.getDate()}</div>${dayRels.map(r=>`<button class="calendar-event" type="button" onclick="openReleaseHub('${attr(r.id)}')"><img src="${attr(r.coverFile||'')}" alt=""><span><span class="calendar-event-title"><i class="calendar-event-dot ${calendarStatusClass(r)}"></i>${esc(r.title||'Без названия')}</span><span class="calendar-event-artist">${esc(r.artist||'—')}</span></span></button>`).join('')}${more>0?`<div class="calendar-more">+ ещё ${more}</div>`:''}</div>`;
        }
        return `<div class="calendar-mobile-note">На телефоне календарь показан списком, чтобы обложки и названия не были слишком мелкими.</div><div class="calendar-weekdays"><div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div></div><div class="calendar-grid">${days}</div><div class="calendar-mobile-list">${calendarListHTML(rels,monthDate)}</div>`;
    }
    window.renderReleaseCalendar=function(){
        const root=document.getElementById('releaseCalendarRoot'); if(!root)return;
        const d=window.releaseCalendarDate instanceof Date?window.releaseCalendarDate:new Date(); const rels=calendarVisibleReleases();
        const label=document.getElementById('releaseCalendarMonthLabel'); if(label)label.textContent=monthName(d);
        const sub=document.getElementById('releaseCalendarSubtitle'); if(sub) sub.textContent=currentUser&&currentUser.role==='Administrator'?'Все доступные релизы всех кабинетов в одном календаре.':'Ваши даты релизов в одном календаре.';
        document.querySelectorAll('[data-calendar-mode]').forEach(b=>b.classList.toggle('active',b.dataset.calendarMode===window.releaseCalendarMode));
        root.innerHTML=window.releaseCalendarMode==='list'?calendarListHTML(rels,d):calendarMonthHTML(rels,d);
    };
    window.releaseCalendarMove=function(delta){const d=new Date(window.releaseCalendarDate||new Date());d.setDate(1);d.setMonth(d.getMonth()+Number(delta||0));window.releaseCalendarDate=d;renderReleaseCalendar();};
    window.releaseCalendarToday=function(){window.releaseCalendarDate=new Date();renderReleaseCalendar();};
    window.setReleaseCalendarMode=function(mode){window.releaseCalendarMode=mode==='list'?'list':'month';renderReleaseCalendar();};

    function fallbackLogsFromHistory(){
        const out=[];(appState.releases||[]).forEach(r=>releaseHistoryArray(r).forEach(h=>out.push({id:'rh_'+r.id+'_'+(h.id||h.createdAt),category:h.type==='moderation'?'moderation':'release',action:h.title||'Действие с релизом',detail:h.detail||'',createdAt:h.createdAt||0,actor:h.actor||{},releaseId:r.id,releaseTitle:r.title,releaseArtist:r.artist,userEmail:r.userEmail,_fallback:true})));return out;
    }
    function allActivityLogs(){
        const primary=Array.isArray(appState.activityLog)?appState.activityLog:[]; const map={}; primary.forEach(x=>{if(x&&x.id)map[x.id]=x;}); fallbackLogsFromHistory().forEach(x=>{if(!Object.values(map).some(p=>p.releaseId===x.releaseId&&p.action===x.action&&Math.abs(Number(p.createdAt||0)-Number(x.createdAt||0))<1500)) map[x.id]=x;});
        return Object.values(map).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
    }
    function logDayLabel(ts){const d=new Date(Number(ts)||Date.now());const today=new Date(),yesterday=new Date();yesterday.setDate(today.getDate()-1);if(d.toDateString()===today.toDateString())return'Сегодня';if(d.toDateString()===yesterday.toDateString())return'Вчера';return d.toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric'});}
    window.setActivityLogFilter=function(filter){window.activityLogFilter=filter||'all';document.querySelectorAll('[data-log-filter]').forEach(b=>b.classList.toggle('active',b.dataset.logFilter===window.activityLogFilter));renderActivityLog();};
    window.renderActivityLog=function(){
        const root=document.getElementById('activityLogRoot'); if(!root)return;
        if(!currentUser||currentUser.role!=='Administrator'){root.innerHTML='<div class="rm-empty">Раздел доступен администраторам.</div>';return;}
        const q=(document.getElementById('activityLogSearch')?.value||'').trim().toLowerCase(); let list=allActivityLogs();
        if(window.activityLogFilter!=='all') list=list.filter(x=>x.category===window.activityLogFilter);
        if(q) list=list.filter(x=>`${x.action||''} ${x.detail||''} ${x.releaseTitle||''} ${x.releaseArtist||''} ${x.userEmail||''} ${(x.actor&&x.actor.name)||''}`.toLowerCase().includes(q));
        if(!list.length){root.innerHTML='<div class="rm-empty">Журнал пока пуст. Новые действия начнут появляться автоматически.</div>';return;}
        let last='';let html='<div class="activity-log-list">';list.slice(0,500).forEach(x=>{const day=logDayLabel(x.createdAt);if(day!==last){last=day;html+=`<div class="activity-log-day">${esc(day)}</div>`;}const detail=[x.detail,x.releaseTitle?`Релиз: ${x.releaseArtist?x.releaseArtist+' — ':''}${x.releaseTitle}`:''].filter(Boolean).join(' · ');html+=`<div class="activity-log-item"><div class="activity-log-icon">${LOG_CATEGORY_ICON[x.category]||'◇'}</div><div><div class="activity-log-action">${esc(x.action||'Действие')}</div><div class="activity-log-detail">${esc(detail||'—')}</div><div class="activity-log-actor">${esc((x.actor&&x.actor.name)||'AetherLab')}</div><span class="activity-log-category">${esc(LOG_CATEGORY_LABELS[x.category]||x.category||'Система')}</span></div><div class="activity-log-time">${esc(new Date(Number(x.createdAt)||Date.now()).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}))}</div></div>`;});root.innerHTML=html+'</div>';
    };

    function bytes(n){n=Number(n)||0;if(n<1024)return n+' B';if(n<1024*1024)return (n/1024).toFixed(1)+' KB';return (n/1024/1024).toFixed(1)+' MB';}
    function renderTechCheck(targetId,title,items){
        const el=document.getElementById(targetId);if(!el)return;const error=items.some(x=>x.state==='error'),warn=items.some(x=>x.state==='warn');const status=error?'error':warn?'warn':'ok';const label=error?'Есть ошибки':warn?'Есть предупреждения':'Проверено';
        el.classList.remove('hidden');el.innerHTML=`<div class="tech-check-head"><div class="tech-check-title">${esc(title)}</div><span class="tech-check-status ${status}">${label}</span></div><div class="tech-check-grid">${items.map(x=>`<div class="tech-check-item ${x.state}"><span class="mark">${x.state==='ok'?'✓':x.state==='warn'?'!':'×'}</span><span>${esc(x.text)}</span></div>`).join('')}</div>`;
    }
    async function detectArtworkColor(file){
        try{
            const buffer=await file.slice(0,Math.min(file.size,1048576)).arrayBuffer(); const u8=new Uint8Array(buffer);
            if(u8.length>=26 && u8[0]===0x89&&u8[1]===0x50&&u8[2]===0x4E&&u8[3]===0x47){
                const ct=u8[25];
                if(ct===2) return {mode:'RGB',ok:true};
                if(ct===6) return {mode:'RGBA',ok:true};
                if(ct===3) return {mode:'Indexed RGB',ok:true};
                if(ct===0||ct===4) return {mode:'Grayscale',ok:false};
                return {mode:'Неизвестно',ok:null};
            }
            if(u8.length>=4 && u8[0]===0xFF&&u8[1]===0xD8){
                let off=2;
                while(off+4<u8.length){
                    if(u8[off]!==0xFF){off++;continue;}
                    while(off<u8.length&&u8[off]===0xFF)off++;
                    const marker=u8[off++];
                    if(marker===0xD9||marker===0xDA)break;
                    if(off+1>=u8.length)break;
                    const len=(u8[off]<<8)|u8[off+1];
                    if(len<2||off+len>u8.length)break;
                    if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)){
                        const comps=u8[off+7];
                        if(comps===3)return {mode:'RGB',ok:true};
                        if(comps===4)return {mode:'CMYK',ok:false};
                        if(comps===1)return {mode:'Grayscale',ok:false};
                        return {mode:`${comps||'—'} channels`,ok:null};
                    }
                    off+=len;
                }
                return {mode:'RGB / JPEG',ok:true};
            }
            return {mode:'Неизвестно',ok:null};
        }catch(e){return {mode:'Не удалось определить',ok:null};}
    }
    function artworkItems(q){
        return [
            {state:q.formatOk?'ok':'error',text:`Формат: ${q.formatLabel}`},
            {state:q.exact?'ok':'error',text:`Размер: ${q.width} × ${q.height}px (требуется 3000 × 3000)`},
            {state:q.square?'ok':'error',text:'Соотношение сторон 1:1'},
            {state:q.colorOk===true?'ok':q.colorOk===false?'error':'warn',text:`Цветовой режим: ${q.colorMode}${q.colorOk===false?' (нужен RGB)':''}`},
            {state:q.sizeOk?'ok':'error',text:`Размер файла: ${bytes(q.fileSize)} / 10 MB`}
        ];
    }
    window.aetherInspectArtworkFile=async function(file,width,height){
        if(!file)return null;
        const ext=(String(file.name||'').split('.').pop()||'').toLowerCase();
        const formatOk=['jpg','jpeg','png'].includes(ext)||/image\/(jpeg|png)/i.test(file.type||'');
        const color=await detectArtworkColor(file);
        const q={width:Number(width)||0,height:Number(height)||0,fileSize:Number(file.size)||0,formatOk,formatLabel:(file.type||ext||'—').replace('image/','').toUpperCase(),square:Number(width)===Number(height),exact:Number(width)===3000&&Number(height)===3000,colorMode:color.mode,colorOk:color.ok,sizeOk:Number(file.size)<=10*1024*1024,checkedAt:now()};
        q.valid=q.formatOk&&q.square&&q.exact&&q.sizeOk&&q.colorOk!==false;
        return q;
    };
    window.aetherRenderArtworkTechnicalData=function(q){if(!q)return;renderTechCheck('coverTechnicalCheck','Artwork Checker',artworkItems(q));};
    window.aetherRenderArtworkTechnicalCheck=async function(file,width,height){
        if(!file)return null;
        renderTechCheck('coverTechnicalCheck','Artwork Checker',[{state:'warn',text:'Проверяем размер, пропорции и цветовой режим…'}]);
        const q=await window.aetherInspectArtworkFile(file,width,height); window.aetherRenderArtworkTechnicalData(q);
        try{if(typeof draftRelease==='object'&&draftRelease)draftRelease.coverTechnical=q;}catch(e){}
        return q;
    };
    function parseWav(buffer,fileSize){
        const dv=new DataView(buffer); if(dv.byteLength<12||String.fromCharCode(...new Uint8Array(buffer,0,4))!=='RIFF'||String.fromCharCode(...new Uint8Array(buffer,8,4))!=='WAVE') throw new Error('Некорректный WAV');
        let off=12,fmt=null,dataSize=0;while(off+8<=dv.byteLength){const id=String.fromCharCode(...new Uint8Array(buffer,off,4));const size=dv.getUint32(off+4,true);if(id==='fmt '&&off+8+Math.min(size,24)<=dv.byteLength){fmt={audioFormat:dv.getUint16(off+8,true),channels:dv.getUint16(off+10,true),sampleRate:dv.getUint32(off+12,true),byteRate:dv.getUint32(off+16,true),blockAlign:dv.getUint16(off+20,true),bitDepth:dv.getUint16(off+22,true)};}if(id==='data')dataSize=size;off+=8+size+(size%2);if(off>dv.byteLength&&fmt)break;}
        if(!fmt)throw new Error('Не найден WAV fmt chunk');if(!dataSize&&fmt.byteRate)dataSize=Math.max(0,fileSize-44);return Object.assign(fmt,{dataSize,duration:fmt.byteRate?dataSize/fmt.byteRate:0});
    }
    window.aetherInspectWavFile=async function(file){
        try{const buf=await file.slice(0,Math.min(file.size,262144)).arrayBuffer();const q=parseWav(buf,file.size);q.fileSize=file.size;q.checkedAt=now();q.valid=true;return q;}catch(e){return {valid:false,error:e.message||String(e),fileSize:file&&file.size||0,checkedAt:now()};}
    };
    window.aetherAudioTechnicalItems=function(q){
        if(!q||!q.valid)return[{state:'error',text:'WAV-файл не удалось корректно прочитать'}];
        return [
            {state:'ok',text:'Формат WAV'},
            {state:q.sampleRate>=44100?'ok':'error',text:`Sample rate: ${q.sampleRate?Math.round(q.sampleRate/100)/10+' kHz':'—'}${q.sampleRate<44100?' (минимум 44.1 kHz)':''}`},
            {state:q.channels===2?'ok':'error',text:q.channels===2?'Stereo':`Каналы: ${q.channels||'—'} (нужен Stereo)`},
            {state:q.bitDepth>=16?'ok':'error',text:`Bit depth: ${q.bitDepth||'—'}-bit${q.bitDepth<16?' (минимум 16-bit)':''}`},
            {state:q.fileSize<=50*1024*1024?'ok':'error',text:`Размер файла: ${bytes(q.fileSize)} / 50 MB`}
        ];
    };
    window.aetherRenderTrackTechnicalCheck=function(track,targetId='trackTechnicalCheck'){const el=document.getElementById(targetId);if(!track||!track.audioTechnical){if(el){el.classList.add('hidden');el.innerHTML='';}return;}renderTechCheck(targetId,'Audio Checker',window.aetherAudioTechnicalItems(track.audioTechnical));};
    window.aetherTrackTechChipsHTML=function(track){const q=track&&track.audioTechnical;if(!q)return'';if(!q.valid)return'<div class="track-tech-inline"><span class="track-tech-chip error">WAV ×</span></div>';const sr=q.sampleRate?`${Math.round(q.sampleRate/100)/10} kHz`:'Sample rate —';const bit=q.bitDepth?`${q.bitDepth}-bit`:'Bit depth —';const ch=q.channels===2?'Stereo':q.channels===1?'Mono':(q.channels?`${q.channels} ch`:'Channels —');return `<div class="track-tech-inline"><span class="track-tech-chip ${q.sampleRate>=44100?'ok':'error'}">${esc(sr)}</span><span class="track-tech-chip ${q.bitDepth>=16?'ok':'error'}">${esc(bit)}</span><span class="track-tech-chip ${q.channels===2?'ok':'error'}">${esc(ch)}</span></div>`;};
    window.aetherValidateDraftTechnicalChecks=async function(draft){
        const errors=[]; if(!draft)return {ok:true,errors};
        if(draft._coverFileObj){
            let q=draft.coverTechnical;
            if(!q||!q.checkedAt){
                const img=document.getElementById('coverPreview'); const w=img&&img.naturalWidth||3000,h=img&&img.naturalHeight||3000;
                q=await window.aetherInspectArtworkFile(draft._coverFileObj,w,h); draft.coverTechnical=q; window.aetherRenderArtworkTechnicalData(q);
            }
            artworkItems(q).filter(x=>x.state==='error').forEach(x=>errors.push('Обложка: '+x.text));
        } else if(draft.coverTechnical){ artworkItems(draft.coverTechnical).filter(x=>x.state==='error').forEach(x=>errors.push('Обложка: '+x.text)); }
        for(let i=0;i<(draft.tracks||[]).length;i++){
            const t=draft.tracks[i]; let q=t.audioTechnical;
            if(!q&&t._audioFileObj){q=await window.aetherInspectWavFile(t._audioFileObj);t.audioTechnical=q;}
            if(!q)continue;
            window.aetherAudioTechnicalItems(q).filter(x=>x.state==='error').forEach(x=>errors.push(`Трек №${i+1}: ${x.text}`));
        }
        return {ok:errors.length===0,errors};
    };

    function removeLegacyDeleteUi(){
        document.getElementById('btn-adminDeleted')?.remove();
        const deleted=document.getElementById('sec-adminDeleted');if(deleted)deleted.classList.add('hidden');
    }
    removeLegacyDeleteUi();
    window.addEventListener('load',removeLegacyDeleteUi);
})();
