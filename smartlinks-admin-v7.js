/* AetherLab Smart Links — replaces legacy external promo-link entry. */
(function(){
    'use strict';

    window.AETHER_SMARTLINKS_BUILD = '20260930-smartlinks-7';

    const SMART_LINK_BASE = 'https://labelonline.github.io/AetherLab-SmartLinks/#';
    const SERVICE_CATALOG = [
        {id:'spotify', name:'Spotify', mark:'SP'},
        {id:'apple', name:'Apple Music', mark:'AM'},
        {id:'youtubeMusic', name:'YouTube Music', mark:'YT'},
        {id:'youtube', name:'YouTube', mark:'YT'},
        {id:'deezer', name:'Deezer', mark:'DZ'},
        {id:'tidal', name:'TIDAL', mark:'TD'},
        {id:'amazon', name:'Amazon Music', mark:'AZ'},
        {id:'soundcloud', name:'SoundCloud', mark:'SC'},
        {id:'yandex', name:'Яндекс Музыка', mark:'YM'},
        {id:'vk', name:'VK Музыка', mark:'VK'},
        {id:'boom', name:'BOOM', mark:'BM'}
    ];
    const SOCIAL_CATALOG = [
        {id:'instagram', name:'Instagram', mark:'IG'},
        {id:'tiktok', name:'TikTok', mark:'TT'},
        {id:'youtube', name:'YouTube', mark:'YT'},
        {id:'telegram', name:'Telegram', mark:'TG'},
        {id:'x', name:'X', mark:'X'},
        {id:'vk', name:'VK', mark:'VK'},
        {id:'facebook', name:'Facebook', mark:'FB'},
        {id:'website', name:'Сайт', mark:'WWW'}
    ];

    let smartEditorState = null;
    let smartEditorTab = 'content';
    let smartPreviewDevice = 'desktop';
    let smartDragServiceId = null;

    function smartClone(value){
        try { return structuredClone(value); } catch(e) { return JSON.parse(JSON.stringify(value)); }
    }
    function isMainSmartLinkAdmin(){
        if(!currentUser || currentUser.role !== 'Administrator') return false;
        // Prefer the cabinet's canonical main-admin check, but keep admin_root as a safe fallback
        // for the original root account if its profile data was edited later.
        if(typeof isMainAdministrator === 'function' && isMainAdministrator(currentUser)) return true;
        if(String(currentUser.id || '') === 'admin_root') return true;
        const email = String(currentUser.email || '').trim().toLowerCase();
        return !!ADMIN_EMAIL && email === String(ADMIN_EMAIL).trim().toLowerCase();
    }
    function smartUrl(slug){ return SMART_LINK_BASE + encodeURIComponent(String(slug || '').trim()); }
    function validHttpUrl(value){ return !value || /^https?:\/\//i.test(String(value).trim()); }
    function smartText(v){ return escapeHTML(String(v == null ? '' : v)); }
    function smartBrandIcon(id, fallback){
        const common='viewBox="0 0 24 24" aria-hidden="true" focusable="false"';
        const icons={
            spotify:`<svg ${common}><circle cx="12" cy="12" r="10" fill="#1ed760"/><path d="M6.7 9.2c3.5-1 7.7-.8 10.8.7M7.4 12.3c2.9-.8 6.5-.6 9.2.6M8 15.2c2.4-.6 5.3-.5 7.7.5" fill="none" stroke="#07130b" stroke-width="1.6" stroke-linecap="round"/></svg>`,
            apple:`<svg ${common}><rect x="2" y="2" width="20" height="20" rx="6" fill="#fa3158"/><path d="M14.8 6.2v9.1a2.5 2.5 0 1 1-1.3-2.2V8.4l5-1v6.8a2.5 2.5 0 1 1-1.3-2.2V6.1z" fill="#fff"/></svg>`,
            youtubeMusic:`<svg ${common}><circle cx="12" cy="12" r="10" fill="#ff0033"/><circle cx="12" cy="12" r="5.8" fill="none" stroke="#fff" stroke-width="1.2"/><path d="m10 8.8 5.2 3.2-5.2 3.2z" fill="#fff"/></svg>`,
            youtube:`<svg ${common}><rect x="2.4" y="5.5" width="19.2" height="13" rx="4" fill="#ff0033"/><path d="m10 9 5.3 3-5.3 3z" fill="#fff"/></svg>`,
            deezer:`<svg ${common}><path d="M3 15h4v4H3zm4.7-3h4v7h-4zm4.7-3h4v10h-4zm4.7-3h4v13h-4z" fill="#a855f7"/></svg>`,
            tidal:`<svg ${common}><path d="m12 4 3 3-3 3-3-3zm-6 3 3 3-3 3-3-3zm12 0 3 3-3 3-3-3zm-6 6 3 3-3 3-3-3z" fill="#fff"/></svg>`,
            amazon:`<svg ${common}><path d="M7 6v8.2a2.2 2.2 0 1 0 1.4 2V9l7-1.6v5.8a2.2 2.2 0 1 0 1.4 2V5.2z" fill="#25d1da"/><path d="M6 20c3.8 1.5 8.1 1.4 12-.3" fill="none" stroke="#25d1da" stroke-width="1.2" stroke-linecap="round"/></svg>`,
            soundcloud:`<svg ${common}><path d="M4 14.5h1.2v4H4zm2-2h1.2v6H6zm2-1.6h1.2v7.6H8zm2-1.1h1.2v8.7H10zm2.2 8.7h5.2a3.1 3.1 0 0 0 .2-6.2 5.1 5.1 0 0 0-5.4-3.9z" fill="#ff6a00"/></svg>`,
            yandex:`<svg ${common}><circle cx="12" cy="12" r="10" fill="#ff2b2b"/><path d="M8.2 6.2h3.4c3.1 0 4.5 1.4 4.5 3.6 0 1.7-.8 2.8-2.4 3.5l2.8 4.5h-2.8l-2.4-4.1h-.7v4.1H8.2zm2.4 2v3.6h.9c1.5 0 2.2-.6 2.2-1.8s-.7-1.8-2.2-1.8z" fill="#fff"/></svg>`,
            vk:`<svg ${common}><rect x="2" y="4" width="20" height="16" rx="5" fill="#2787f5"/><path d="M5.7 8.2h2.5c.2 2.2 1.1 4 2.1 4.2V8.2h2.4v2.4c1-.1 2-1.5 2.3-2.4h2.4c-.3 1.4-1.6 2.8-2.5 3.4 1 .5 2.6 1.8 3.2 4.1h-2.7c-.4-1.1-1.5-2.5-2.7-2.6v2.6h-.3c-4.8 0-7-3.3-7.1-7.5z" fill="#fff"/></svg>`,
            instagram:`<svg ${common}><defs><linearGradient id="igx" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#ffd600"/><stop offset=".45" stop-color="#ff0169"/><stop offset="1" stop-color="#7b2cff"/></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#igx)"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="17.5" cy="6.7" r="1.2" fill="#fff"/></svg>`,
            tiktok:`<svg ${common}><path d="M14.5 4c.4 2.3 1.8 3.6 4 3.8v2.4c-1.5 0-2.8-.5-4-1.4v5.4a4.9 4.9 0 1 1-4.2-4.9v2.5a2.5 2.5 0 1 0 1.8 2.4V4z" fill="#fff"/></svg>`,
            telegram:`<svg ${common}><circle cx="12" cy="12" r="10" fill="#29a9ea"/><path d="m5.3 11.5 12.9-5c.6-.2 1 .2.8 1l-2.2 10.2c-.2.7-.7.9-1.3.5l-3.3-2.4-1.6 1.6c-.2.2-.3.3-.7.3l.2-3.4 6.2-5.6c.3-.2-.1-.4-.4-.2l-7.7 4.8-3.3-1c-.7-.2-.7-.7.4-.8z" fill="#fff"/></svg>`,
            x:`<svg ${common}><path d="M5 4h3.7l4 5.3L17.3 4H19l-5.5 6.6L19.5 20h-3.7l-4.4-5.8L6.2 20H4.5l6-7.1z" fill="#fff"/></svg>`,
            facebook:`<svg ${common}><circle cx="12" cy="12" r="10" fill="#1877f2"/><path d="M13.5 20v-7h2.3l.4-2.7h-2.7V8.6c0-.8.2-1.3 1.4-1.3h1.5V4.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v1.7H8v2.7h2.5v7z" fill="#fff"/></svg>`,
            website:`<svg ${common}><circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M3.5 12h17M12 3c2.2 2.4 3.4 5.4 3.4 9S14.2 18.6 12 21M12 3C9.8 5.4 8.6 8.4 8.6 12s1.2 6.6 3.4 9" fill="none" stroke="#fff" stroke-width="1.4"/></svg>`
        };
        return icons[id] || `<span>${smartText(fallback||'♪')}</span>`;
    }
    function smartAttr(v){ return escapeAttr(String(v == null ? '' : v)); }
    function getPromoForRelease(releaseId){
        return (appState.promoLinks || []).find(x => String(x.releaseId) === String(releaseId) && !x.deleted);
    }
    function findSmartLinkById(id){
        return (appState.promoLinks || []).find(x => String(x.id) === String(id) && !x.deleted) || null;
    }
    function smartLinkIsNative(item){ return !!(item && (item.kind === 'aether-smart-link' || item.slug)); }
    function approvedReleases(){
        return getReleasesVisibleToCurrentUser().filter(r => !r.isDeleted && isApprovedRelease(r));
    }
    function releaseForId(id){ return (appState.releases || []).find(r => String(r.id) === String(id)); }

    function transliterate(value){
        const map = {а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',і:'i',ї:'yi',є:'ye',ґ:'g'};
        return String(value || '').toLowerCase().split('').map(ch => map[ch] !== undefined ? map[ch] : ch).join('');
    }
    function slugifySmart(value){
        return transliterate(value)
            .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
            .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').replace(/-{2,}/g,'-').slice(0,70) || 'release';
    }
    function uniqueSlug(base, editingId){
        let slug = slugifySmart(base), n = 2;
        const exists = candidate => (appState.promoLinks || []).some(x => !x.deleted && String(x.id) !== String(editingId || '') && String(x.slug || '').toLowerCase() === candidate.toLowerCase());
        const original = slug;
        while(exists(slug)) slug = `${original}-${n++}`;
        return slug;
    }
    function defaultServices(){
        return SERVICE_CATALOG.slice(0,7).map(x => ({id:x.id, name:x.name, mark:x.mark, url:'', cta:'Play'}));
    }
    function defaultSocials(){ return SOCIAL_CATALOG.reduce((a,x)=>(a[x.id]='',a),{}); }
    function defaultSmartState(release){
        const title = release && release.title || '';
        const artist = release && release.artist || '';
        return {
            id:'', kind:'aether-smart-link', releaseId: release && release.id || '',
            slug:uniqueSlug(`${artist}-${title}`), title, artist,
            subtitle:'Choose your preferred music service',
            coverUrl: release && release.coverFile || '', releaseDate: release && release.releaseDate || '',
            services:defaultServices(), socials:defaultSocials(),
            theme:{background:'blur', backgroundColor:'#090c12', accent:'#ffffff', text:'#ffffff', button:'#ffffff', buttonText:'#111111', radius:14, coverRadius:18, blur:34},
            createdAt:Date.now(), updatedAt:Date.now(), deleted:false
        };
    }
    function normalizeSmartState(item){
        const out = Object.assign(defaultSmartState(releaseForId(item && item.releaseId)), smartClone(item || {}));
        out.kind = 'aether-smart-link';
        out.services = Array.isArray(out.services) ? out.services.map((s,i)=>Object.assign({id:`custom-${i}`,name:'Сервис',mark:'♪',url:'',cta:'Play'},s)) : defaultServices();
        out.socials = Object.assign(defaultSocials(), out.socials || {});
        out.theme = Object.assign(defaultSmartState(null).theme, out.theme || {});
        return out;
    }

    function publicSmartLinkPayload(record){
        const safe = normalizeSmartState(record || {});
        return {
            sourceId: String(safe.id || ''),
            kind: 'aether-smart-link',
            slug: String(safe.slug || ''),
            title: String(safe.title || ''),
            artist: String(safe.artist || ''),
            subtitle: String(safe.subtitle || ''),
            coverUrl: String(safe.coverUrl || ''),
            releaseDate: String(safe.releaseDate || ''),
            services: (safe.services || []).map(s => ({
                id: String(s.id || ''), name: String(s.name || ''), mark: String(s.mark || ''),
                url: String(s.url || ''), cta: String(s.cta || 'Play')
            })),
            socials: Object.assign({}, safe.socials || {}),
            theme: Object.assign({}, safe.theme || {}),
            updatedAt: Number(safe.updatedAt || Date.now()),
            createdAt: Number(safe.createdAt || Date.now()),
            deleted: false
        };
    }

    async function savePromoLinkRecord(record){
        if(!record.id) record.id = 'smart_' + Date.now().toString(36);
        record.updatedAt = Date.now();
        if(!record.createdAt) record.createdAt = record.updatedAt;
        const existingIndex = appState.promoLinks.findIndex(x => String(x.id) === String(record.id));
        const previous = existingIndex >= 0 ? appState.promoLinks[existingIndex] : null;
        const previousSlug = String(previous && previous.slug || '').trim();
        const nextSlug = String(record.slug || '').trim();

        // Save the authoritative editor record first. Public publishing is deliberately
        // separate so a stricter rule on publicSmartLinks cannot destroy the editor flow.
        await db.ref('promoLinks/' + record.id).set(record);
        if(existingIndex >= 0) appState.promoLinks[existingIndex] = smartClone(record); else appState.promoLinks.push(smartClone(record));

        if(nextSlug){
            try{
                const existingPublic = (appState.publicSmartLinks || {})[nextSlug] || {};
                const payload = publicSmartLinkPayload(record);
                if(existingPublic.stats) payload.stats = smartClone(existingPublic.stats);
                await db.ref('publicSmartLinks/' + nextSlug).set(payload);
                appState.publicSmartLinks = appState.publicSmartLinks || {};
                appState.publicSmartLinks[nextSlug] = payload;
            }catch(publicErr){
                console.warn('AetherLab Smart Links: publicSmartLinks publish failed, legacy fallback remains available.', publicErr);
            }
        }
        if(previousSlug && previousSlug !== nextSlug){
            try{
                await db.ref('publicSmartLinks/' + previousSlug).remove();
                if(appState.publicSmartLinks) delete appState.publicSmartLinks[previousSlug];
            }catch(publicErr){ console.warn('AetherLab Smart Links: old public slug cleanup failed.', publicErr); }
        }
        renderPromoLinks();
        return record;
    }

    function renderPromoLinks(){
        const area = document.getElementById('smartLinksArea');
        if(!area || !currentUser) return;
        const mainAdmin = isMainSmartLinkAdmin();
        const hero = document.getElementById('smartAdminCreateHero');
        if(hero) hero.classList.toggle('hidden', !mainAdmin);

        const rels = approvedReleases();
        const releaseIds = new Set(rels.map(r=>String(r.id)));
        let items = (appState.promoLinks || []).filter(x => !x.deleted && (mainAdmin || releaseIds.has(String(x.releaseId))));
        items = items.sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0));

        const nativeCount = items.filter(smartLinkIsNative).length;
        const legacyItems = items.filter(x => !smartLinkIsNative(x));

        if(!mainAdmin && !items.length){
            area.innerHTML = `<div class="smart-link-empty"><strong>Смарт-линков пока нет</strong>Когда команда AetherLab создаст смарт-линк для вашего принятого релиза, он появится здесь.</div>`;
            return;
        }
        if(mainAdmin && !items.length){
            area.innerHTML = `<div class="smart-link-empty"><strong>Смарт-линков пока нет</strong>Нажмите «Создать смарт-линк» выше. Старое ручное добавление BandLink/Muz.lc отключено.</div>`;
            return;
        }

        const notice = legacyItems.length && mainAdmin
          ? `<div class="smart-legacy-notice"><strong>Старые внешние ссылки: ${legacyItems.length}</strong><span>Они сохранены только для истории. Новые ссылки создаются исключительно через редактор AetherLab Smart Links.</span></div>`
          : '';
        area.innerHTML = `${notice}<div class="smart-admin-toolbar"><div class="smart-admin-count">Смарт-линков AetherLab: ${nativeCount}</div></div><div class="smart-link-list">${items.map(renderSmartCard).join('')}</div>`;
    }

    function renderSmartCard(item){
        const rel = releaseForId(item.releaseId) || {};
        const native = smartLinkIsNative(item);
        const url = native ? smartUrl(item.slug) : String(item.url || '');
        const cover = item.coverUrl || rel.coverFile || '';
        const title = item.title || rel.title || 'Без названия';
        const artist = item.artist || rel.artist || '—';
        const publicCopy = (appState.publicSmartLinks || {})[String(item.slug || '')] || {};
        const stats = publicCopy.stats || item.stats || {};
        const visits = Number(stats.views || 0);
        const actions = [];
        if(url){
            actions.push(`<button class="btn-outline" type="button" onclick="copyPromoLink('${smartAttr(url)}')">Скопировать</button>`);
            actions.push(`<button class="btn-outline" type="button" onclick="window.open('${smartAttr(url)}','_blank','noopener')">Открыть</button>`);
        }
        if(isMainSmartLinkAdmin()){
            if(native) actions.push(`<button class="btn-primary" type="button" onclick="openSmartLinkEditor('${smartAttr(item.id)}')">Редактировать</button>`);
            actions.push(`<button class="btn-danger" type="button" onclick="deletePromoLink('${smartAttr(item.id)}')">Удалить</button>`);
        }
        return `<article class="smart-link-card${native?'':' smart-link-legacy'}">
            <img class="smart-link-card-cover" src="${smartAttr(cover)}" alt="" onerror="this.style.opacity='.25'">
            <div class="smart-link-card-main">
                <div class="smart-link-card-title">${smartText(title)}</div>
                <div class="smart-link-card-artist">${smartText(artist)}</div>
                <div class="smart-link-card-url">${smartText(url || 'Ссылка не указана')}</div>
                <div class="smart-link-card-meta"><span>${native?'AetherLab Smart Link':'Старая внешняя ссылка'}</span>${native?`<span>•</span><span>${visits} просмотров</span>`:''}</div>
            </div>
            <div class="smart-link-card-actions">${actions.join('')}</div>
        </article>`;
    }

    function mountSmartEditor(){
        const mount = document.getElementById('smartLinkEditorMount');
        if(!mount) return null;
        if(!document.getElementById('smartLinkEditor')){
            mount.innerHTML = `<div class="smart-editor-overlay hidden" id="smartLinkEditor"><div class="smart-editor-shell">
                <section class="smart-editor-panel">
                    <div class="smart-editor-head"><div class="smart-editor-head-left"><div class="smart-editor-kicker">AetherLab Smart Links</div><h2 id="smartEditorHeading">Новый смарт-линк</h2></div><button class="smart-editor-close" type="button" onclick="closeSmartLinkEditor()">×</button></div>
                    <div class="smart-editor-tabs" id="smartEditorTabs"></div>
                    <div class="smart-editor-scroll" id="smartEditorForm"></div>
                    <div class="smart-savebar"><button class="btn-outline" type="button" onclick="openSmartPreviewMobile()">Предпросмотр</button><button class="btn-primary" type="button" id="smartSaveBtn" onclick="saveSmartLinkFromEditor()">Сохранить смарт-линк</button></div>
                </section>
                <section class="smart-editor-preview-wrap" id="smartPreviewWrap">
                    <div class="smart-editor-preview-top"><span>Live preview</span><div class="smart-preview-device-tabs"><button id="smartDesktopPreviewBtn" type="button" onclick="setSmartPreviewDevice('desktop')">Desktop</button><button id="smartMobilePreviewBtn" type="button" onclick="setSmartPreviewDevice('mobile')">Mobile</button><button class="smart-mobile-preview-close" type="button" onclick="closeSmartPreviewMobile()">Закрыть</button></div></div>
                    <div class="smart-editor-preview-stage"><div class="smart-preview-browser" id="smartPreviewBrowser"><div class="smart-preview-frame" id="smartPreviewFrame"></div></div></div>
                </section>
            </div></div>`;
        }
        return document.getElementById('smartLinkEditor');
    }

    function openSmartLinkEditor(id){
        if(!isMainSmartLinkAdmin()) return UI.alert('Недоступно', 'Редактор смарт-линков пока доступен только главному администратору.');
        const rels = approvedReleases();
        if(!rels.length && !id) return UI.alert('Нет принятых релизов', 'Сначала примите хотя бы один релиз на модерации. После этого он появится в редакторе смарт-линка.');
        const existing = id ? findSmartLinkById(id) : null;
        if(existing && !smartLinkIsNative(existing)) return UI.alert('Старая ссылка', 'Эта запись была создана в старой версии. Создайте новый AetherLab Smart Link.');
        smartEditorState = existing ? normalizeSmartState(existing) : defaultSmartState(rels[0]);
        smartEditorTab = 'content'; smartPreviewDevice = 'desktop';
        const editor = mountSmartEditor();
        if(!editor) return;
        editor.classList.remove('hidden'); document.body.style.overflow='hidden';
        renderSmartEditor();
    }

    function closeSmartLinkEditor(){
        const el = document.getElementById('smartLinkEditor');
        if(el) el.classList.add('hidden');
        const preview=document.getElementById('smartPreviewWrap'); if(preview) preview.classList.remove('mobile-open');
        document.body.style.overflow=''; smartEditorState=null;
    }

    function renderSmartEditor(){
        if(!smartEditorState) return;
        const heading = document.getElementById('smartEditorHeading');
        if(heading) heading.textContent = smartEditorState.id ? 'Редактирование смарт-линка' : 'Новый смарт-линк';
        const tabs = document.getElementById('smartEditorTabs');
        if(tabs) tabs.innerHTML = [['content','Контент'],['services','Площадки'],['design','Дизайн'],['social','Соцсети']].map(([id,label])=>`<button type="button" class="smart-editor-tab ${smartEditorTab===id?'active':''}" onclick="setSmartEditorTab('${id}')">${label}</button>`).join('');
        const form = document.getElementById('smartEditorForm');
        if(form) form.innerHTML = smartEditorTab === 'content' ? renderContentEditor() : smartEditorTab === 'services' ? renderServicesEditor() : smartEditorTab === 'design' ? renderDesignEditor() : renderSocialEditor();
        renderSmartPreview();
    }
    function setSmartEditorTab(tab){ smartEditorTab=tab; renderSmartEditor(); }

    function renderContentEditor(){
        const rels=approvedReleases();
        return `<div class="smart-editor-section active">
          <div class="smart-editor-block"><div class="smart-editor-block-title">Релиз <span class="smart-editor-block-note">Данные можно изменить только для страницы</span></div>
            <div class="form-group"><label>Принятый релиз</label><select onchange="smartEditorReleaseChanged(this.value)">${rels.map(r=>`<option value="${smartAttr(r.id)}" ${String(r.id)===String(smartEditorState.releaseId)?'selected':''}>${smartText((r.artist||'')+' — '+(r.title||'Без названия'))}</option>`).join('')}</select></div>
            <div class="smart-editor-grid"><div class="form-group"><label>Название</label><input value="${smartAttr(smartEditorState.title)}" oninput="smartEditorSet('title',this.value)"></div><div class="form-group"><label>Артист</label><input value="${smartAttr(smartEditorState.artist)}" oninput="smartEditorSet('artist',this.value)"></div></div>
            <div class="form-group"><label>Текст над площадками</label><input value="${smartAttr(smartEditorState.subtitle)}" oninput="smartEditorSet('subtitle',this.value)" placeholder="Choose your preferred music service"></div>
          </div>
          <div class="smart-editor-block"><div class="smart-editor-block-title">Публичная ссылка <span class="smart-editor-block-note">открывается на отдельном сайте AetherLab-SmartLinks</span></div>
            <div class="form-group"><label>Slug</label><div class="smart-editor-url-row"><input value="${smartAttr(smartEditorState.slug)}" oninput="this.value=smartEditorSlugInput(this.value)" placeholder="artist-release"><button class="btn-outline" type="button" onclick="copyCurrentSmartUrl()">Копировать</button></div></div>
            <div class="smart-link-card-url" id="smartPublicUrlText">${smartText(smartUrl(smartEditorState.slug))}</div>
          </div>
          <div class="smart-editor-block"><div class="smart-editor-block-title">Обложка</div>
            <div class="smart-cover-tools"><img class="smart-cover-preview" src="${smartAttr(smartEditorState.coverUrl)}" alt=""><div><div class="form-group"><label>URL обложки</label><input value="${smartAttr(smartEditorState.coverUrl)}" oninput="smartEditorSet('coverUrl',this.value)"></div><div class="smart-cover-actions"><input type="file" accept="image/*" id="smartCoverFile" class="hidden" onchange="uploadSmartLinkCover(this.files&&this.files[0])"><button class="btn-outline" type="button" onclick="document.getElementById('smartCoverFile').click()">Загрузить изображение</button><button class="btn-outline" type="button" onclick="smartUseReleaseCover()">Из релиза</button></div></div></div>
          </div>
        </div>`;
    }

    function renderServicesEditor(){
        const used=new Set((smartEditorState.services||[]).map(x=>x.id));
        const available=SERVICE_CATALOG.filter(x=>!used.has(x.id));
        return `<div class="smart-editor-section active"><div class="smart-editor-block"><div class="smart-editor-block-title">Музыкальные площадки <span class="smart-editor-block-note">перетаскивайте или используйте стрелки</span></div>
          <div class="smart-service-list">${(smartEditorState.services||[]).map(renderServiceEditorRow).join('')}</div>
          <div class="smart-service-add"><select id="smartServiceAddSelect"><option value="">Добавить площадку…</option>${available.map(x=>`<option value="${x.id}">${smartText(x.name)}</option>`).join('')}<option value="custom">Другой сервис</option></select><button class="btn-outline" type="button" onclick="smartEditorAddService()">Добавить</button></div>
          <p class="text-sm" style="margin-top:10px;font-size:10px!important;line-height:1.5">Площадка отображается на публичной странице только если для неё указана ссылка.</p>
        </div></div>`;
    }
    function renderServiceEditorRow(s,index){
        return `<div class="smart-service-row" draggable="true" ondragstart="smartServiceDragStart('${smartAttr(s.id)}')" ondragover="event.preventDefault()" ondrop="smartServiceDrop('${smartAttr(s.id)}')">
          <div class="smart-service-drag" title="Перетащить">⋮⋮</div><div class="smart-service-name">${smartText(s.name)}</div>
          <input value="${smartAttr(s.url)}" placeholder="https://…" oninput="smartEditorServiceUrl('${smartAttr(s.id)}',this.value)">
          <button class="smart-mini-btn smart-move-up" type="button" onclick="smartMoveService('${smartAttr(s.id)}',-1)" title="Выше">↑</button>
          <button class="smart-mini-btn smart-move-down" type="button" onclick="smartMoveService('${smartAttr(s.id)}',1)" title="Ниже">↓</button>
          <button class="smart-mini-btn danger" type="button" onclick="smartRemoveService('${smartAttr(s.id)}')" title="Удалить">×</button>
        </div>`;
    }

    function renderDesignEditor(){
        const t=smartEditorState.theme||{};
        return `<div class="smart-editor-section active">
          <div class="smart-editor-block"><div class="smart-editor-block-title">Фон страницы</div><div class="form-group"><label>Тип фона</label><select onchange="smartEditorThemeSet('background',this.value)"><option value="blur" ${t.background==='blur'?'selected':''}>Размытая обложка</option><option value="gradient" ${t.background==='gradient'?'selected':''}>AetherLab Gradient</option><option value="solid" ${t.background==='solid'?'selected':''}>Однотонный</option></select></div><div class="smart-color-grid"><div class="form-group"><label>Цвет фона</label><div class="smart-color-field"><input value="${smartAttr(t.backgroundColor||'#090c12')}" oninput="smartEditorThemeSet('backgroundColor',this.value)"><input type="color" value="${smartAttr(t.backgroundColor||'#090c12')}" oninput="smartEditorThemeSet('backgroundColor',this.value)"></div></div><div class="form-group"><label>Цвет текста</label><div class="smart-color-field"><input value="${smartAttr(t.text||'#ffffff')}" oninput="smartEditorThemeSet('text',this.value)"><input type="color" value="${smartAttr(t.text||'#ffffff')}" oninput="smartEditorThemeSet('text',this.value)"></div></div></div></div>
          <div class="smart-editor-block"><div class="smart-editor-block-title">Кнопки</div><div class="smart-color-grid"><div class="form-group"><label>Кнопка Play</label><div class="smart-color-field"><input value="${smartAttr(t.button||'#ffffff')}" oninput="smartEditorThemeSet('button',this.value)"><input type="color" value="${smartAttr(t.button||'#ffffff')}" oninput="smartEditorThemeSet('button',this.value)"></div></div><div class="form-group"><label>Текст Play</label><div class="smart-color-field"><input value="${smartAttr(t.buttonText||'#111111')}" oninput="smartEditorThemeSet('buttonText',this.value)"><input type="color" value="${smartAttr(t.buttonText||'#111111')}" oninput="smartEditorThemeSet('buttonText',this.value)"></div></div></div>
          <div class="form-group"><label>Скругление карточек</label><div class="smart-range-row"><input type="range" min="4" max="30" value="${Number(t.radius||14)}" oninput="smartEditorThemeSet('radius',Number(this.value));this.nextElementSibling.textContent=this.value+'px'"><div class="smart-range-value">${Number(t.radius||14)}px</div></div></div></div>
          <div class="smart-editor-block"><div class="smart-editor-block-title">Обложка</div><div class="form-group"><label>Скругление обложки</label><div class="smart-range-row"><input type="range" min="0" max="40" value="${Number(t.coverRadius||18)}" oninput="smartEditorThemeSet('coverRadius',Number(this.value));this.nextElementSibling.textContent=this.value+'px'"><div class="smart-range-value">${Number(t.coverRadius||18)}px</div></div></div><div class="form-group"><label>Размытие фоновой обложки</label><div class="smart-range-row"><input type="range" min="8" max="70" value="${Number(t.blur||34)}" oninput="smartEditorThemeSet('blur',Number(this.value));this.nextElementSibling.textContent=this.value+'px'"><div class="smart-range-value">${Number(t.blur||34)}px</div></div></div></div>
        </div>`;
    }

    function renderSocialEditor(){
        return `<div class="smart-editor-section active"><div class="smart-editor-block"><div class="smart-editor-block-title">Социальные сети <span class="smart-editor-block-note">пустые поля не показываются</span></div><div class="smart-social-grid">${SOCIAL_CATALOG.map(s=>`<div class="form-group"><label>${smartText(s.name)}</label><div class="smart-social-field"><span>${smartText(s.mark)}</span><input value="${smartAttr((smartEditorState.socials||{})[s.id]||'')}" placeholder="https://…" oninput="smartEditorSocialSet('${s.id}',this.value)"></div></div>`).join('')}</div></div></div>`;
    }

    function smartEditorSet(key,value){ if(!smartEditorState)return; smartEditorState[key]=value; renderSmartPreview(); }
    function smartEditorThemeSet(key,value){ if(!smartEditorState)return; smartEditorState.theme=smartEditorState.theme||{}; smartEditorState.theme[key]=value; renderSmartPreview(); }
    function smartEditorSocialSet(key,value){ if(!smartEditorState)return; smartEditorState.socials=smartEditorState.socials||{}; smartEditorState.socials[key]=value; renderSmartPreview(); }
    function smartEditorSlugInput(value){ if(!smartEditorState)return ''; smartEditorState.slug=slugifySmart(value); const el=document.getElementById('smartPublicUrlText'); if(el) el.textContent=smartUrl(smartEditorState.slug); renderSmartPreview(); return smartEditorState.slug; }
    function copyCurrentSmartUrl(){ if(smartEditorState) copyPromoLink(smartUrl(smartEditorState.slug)); }
    function smartEditorReleaseChanged(id){
        if(!smartEditorState)return; const r=releaseForId(id); if(!r)return;
        smartEditorState.releaseId=r.id; smartEditorState.title=r.title||''; smartEditorState.artist=r.artist||''; smartEditorState.coverUrl=r.coverFile||''; smartEditorState.releaseDate=r.releaseDate||'';
        if(!smartEditorState.id) smartEditorState.slug=uniqueSlug(`${r.artist||''}-${r.title||''}`);
        renderSmartEditor();
    }
    function smartUseReleaseCover(){ const r=releaseForId(smartEditorState&&smartEditorState.releaseId); if(r){smartEditorState.coverUrl=r.coverFile||'';renderSmartEditor();} }
    async function uploadSmartLinkCover(file){
        if(!file || !smartEditorState) return;
        try{
            const btn=document.getElementById('smartSaveBtn'); if(btn)btn.disabled=true;
            const meta=await uploadFileToCloudinary(file,file.name||'smartlink-cover.jpg');
            smartEditorState.coverUrl=meta.url; renderSmartEditor();
        }catch(err){UI.alert('Ошибка',err.message||'Не удалось загрузить изображение.');}
        finally{const btn=document.getElementById('smartSaveBtn'); if(btn)btn.disabled=false;}
    }
    function smartEditorServiceUrl(id,value){ const s=(smartEditorState.services||[]).find(x=>x.id===id); if(s){s.url=value;renderSmartPreview();} }
    function smartMoveService(id,delta){ const a=smartEditorState.services||[]; const i=a.findIndex(x=>x.id===id); const j=i+delta; if(i<0||j<0||j>=a.length)return; [a[i],a[j]]=[a[j],a[i]]; renderSmartEditor(); }
    function smartRemoveService(id){ smartEditorState.services=(smartEditorState.services||[]).filter(x=>x.id!==id); renderSmartEditor(); }
    function smartEditorAddService(){
        const sel=document.getElementById('smartServiceAddSelect'); const id=sel&&sel.value; if(!id)return;
        if(id==='custom'){
            const name=window.prompt('Название сервиса'); if(!name)return;
            smartEditorState.services.push({id:'custom-'+Date.now().toString(36),name:String(name).trim(),mark:'♪',url:'',cta:'Play'});
        }else{
            const def=SERVICE_CATALOG.find(x=>x.id===id); if(def)smartEditorState.services.push({id:def.id,name:def.name,mark:def.mark,url:'',cta:'Play'});
        }
        renderSmartEditor();
    }
    function smartServiceDragStart(id){smartDragServiceId=id;}
    function smartServiceDrop(targetId){
        if(!smartDragServiceId||smartDragServiceId===targetId)return; const a=smartEditorState.services||[]; const from=a.findIndex(x=>x.id===smartDragServiceId),to=a.findIndex(x=>x.id===targetId); if(from<0||to<0)return; const [m]=a.splice(from,1); a.splice(to,0,m); smartDragServiceId=null; renderSmartEditor();
    }

    function setSmartPreviewDevice(device){ smartPreviewDevice=device==='mobile'?'mobile':'desktop'; const b=document.getElementById('smartPreviewBrowser'); if(b)b.classList.toggle('mobile',smartPreviewDevice==='mobile'); document.getElementById('smartDesktopPreviewBtn')?.classList.toggle('active',smartPreviewDevice==='desktop'); document.getElementById('smartMobilePreviewBtn')?.classList.toggle('active',smartPreviewDevice==='mobile'); }
    function openSmartPreviewMobile(){ const w=document.getElementById('smartPreviewWrap'); if(w){w.classList.add('mobile-open');setSmartPreviewDevice('mobile');renderSmartPreview();} }
    function closeSmartPreviewMobile(){document.getElementById('smartPreviewWrap')?.classList.remove('mobile-open');}

    function renderSmartPreview(){
        if(!smartEditorState)return; const frame=document.getElementById('smartPreviewFrame'); if(!frame)return;
        frame.innerHTML=buildSmartPreviewHTML(smartEditorState,true); setSmartPreviewDevice(smartPreviewDevice);
    }
    function buildSmartPreviewHTML(state,inEditor){
        const t=state.theme||{}; const cover=String(state.coverUrl||'');
        const services=(state.services||[]).filter(s=>String(s.url||'').trim());
        const socials=SOCIAL_CATALOG.map(s=>Object.assign({},s,{url:String((state.socials||{})[s.id]||'').trim()})).filter(s=>s.url);
        const bg = t.background==='blur' && cover ? `<div class="sl-bg" style="background-image:url('${smartAttr(cover)}');filter:blur(${Number(t.blur||34)}px) saturate(1.1)"></div><div class="sl-bg-overlay"></div>` : t.background==='gradient' ? `<div class="sl-bg-gradient"></div>` : `<div class="sl-bg-gradient" style="background:${smartAttr(t.backgroundColor||'#090c12')}"></div>`;
        const serviceHtml=services.length?services.map(s=>`<a class="sl-service" ${inEditor?'href="javascript:void(0)"':`href="${smartAttr(s.url)}" target="_blank" rel="noopener"`} style="border-radius:${Number(t.radius||14)}px"><span class="sl-service-logo">${smartBrandIcon(s.id,s.mark||'♪')}</span><span class="sl-service-name">${smartText(s.name)}</span><span class="sl-service-cta" style="background:${smartAttr(t.button||'#fff')};color:${smartAttr(t.buttonText||'#111')};border-radius:${Math.max(6,Number(t.radius||14)-4)}px">${smartText(s.cta||'Play')}</span></a>`).join(''):`<div class="sl-no-services">Добавьте ссылки на музыкальные площадки.</div>`;
        const socialHtml=socials.length?`<div class="sl-socials">${socials.map(s=>`<a class="sl-social" ${inEditor?'href="javascript:void(0)"':`href="${smartAttr(s.url)}" target="_blank" rel="noopener"`} title="${smartAttr(s.name)}">${smartBrandIcon(s.id,s.mark)}</a>`).join('')}</div>`:'';
        return `<div class="sl-preview-page" style="color:${smartAttr(t.text||'#fff')}">${bg}<main class="sl-content"><img class="sl-cover" src="${smartAttr(cover)}" alt="" style="border-radius:${Number(t.coverRadius||18)}px"><h1 class="sl-title">${smartText(state.title||'Без названия')}</h1><div class="sl-artist">${smartText(state.artist||'')}</div>${state.releaseDate?`<div class="sl-release-date">${smartText(formatReleaseDate(state.releaseDate))}</div>`:''}<div class="sl-subtitle">${smartText(state.subtitle||'Choose your preferred music service')}</div><div class="sl-services">${serviceHtml}</div>${socialHtml}<div class="sl-powered"><span>Powered by</span><a ${inEditor?'href="javascript:void(0)"':'href="https://labelonline.github.io/AetherLab/" target="_blank" rel="noopener"'}><img src="favicon.png" alt="">AetherLab</a></div></main></div>`;
    }

    async function saveSmartLinkFromEditor(){
        if(!smartEditorState || !isMainSmartLinkAdmin()) return;
        const state=normalizeSmartState(smartEditorState);
        state.slug=slugifySmart(state.slug);
        if(!state.releaseId) return UI.alert('Ошибка','Выберите релиз.');
        if(!String(state.title||'').trim()) return UI.alert('Ошибка','Укажите название.');
        if(!String(state.artist||'').trim()) return UI.alert('Ошибка','Укажите артиста.');
        if(!state.slug) return UI.alert('Ошибка','Укажите адрес смарт-линка.');
        const duplicate=(appState.promoLinks||[]).find(x=>!x.deleted&&String(x.id)!==String(state.id||'')&&String(x.slug||'').toLowerCase()===state.slug.toLowerCase());
        if(duplicate) return UI.alert('Адрес занят','Такой slug уже используется другим смарт-линком.');
        const badService=(state.services||[]).find(s=>s.url&&!validHttpUrl(s.url));
        if(badService) return UI.alert('Ошибка ссылки',`Проверьте ссылку для «${badService.name}». Она должна начинаться с https://`);
        const badSocial=Object.keys(state.socials||{}).find(k=>state.socials[k]&&!validHttpUrl(state.socials[k]));
        if(badSocial) return UI.alert('Ошибка ссылки','Ссылки на соцсети должны начинаться с https://');
        state.url=smartUrl(state.slug); state.kind='aether-smart-link'; state.deleted=false;
        const btn=document.getElementById('smartSaveBtn'); if(btn){btn.disabled=true;btn.textContent='Сохранение…';}
        try{await savePromoLinkRecord(state);const publishedUrl=smartUrl(state.slug);closeSmartLinkEditor();UI.alert('Смарт-линк опубликован',`Ссылка готова и открывается на отдельном сайте AetherLab Smart Links.\n\n${publishedUrl}`);}
        catch(err){console.error(err);UI.alert('Ошибка','Не удалось сохранить смарт-линк в Firebase.');}
        finally{if(btn){btn.disabled=false;btn.textContent='Сохранить смарт-линк';}}
    }

    function copyPromoLink(url){
        const value=String(url||'');
        if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(()=>UI.alert('Скопировано','Ссылка скопирована.')).catch(()=>UI.alert('Ссылка',value));
        else UI.alert('Ссылка',value);
    }
    function deletePromoLink(id){
        if(!isMainSmartLinkAdmin()) return;
        const item=findSmartLinkById(id); if(!item)return;
        UI.confirm('Удалить этот смарт-линк?', async()=>{
            item.deleted=true; item.updatedAt=Date.now();
            try{
                await db.ref('promoLinks/'+item.id).set(item);
                if(item.slug){
                    try{await db.ref('publicSmartLinks/'+String(item.slug)).remove();}catch(publicErr){console.warn('AetherLab Smart Links: public cleanup failed.', publicErr);}
                    if(appState.publicSmartLinks) delete appState.publicSmartLinks[String(item.slug)];
                }
                renderPromoLinks();
            }catch(e){UI.alert('Ошибка','Не удалось удалить ссылку.');}
        });
    }


    function addPromoLinkFromAdmin(){
        return UI.alert('Функция отключена', 'Ручное добавление BandLink/Muz.lc больше не используется. Нажмите «Создать смарт-линк».');
    }
    Object.assign(window,{
        renderPromoLinks,getPromoForRelease,copyPromoLink,deletePromoLink,addPromoLinkFromAdmin,openSmartLinkEditor,closeSmartLinkEditor,setSmartEditorTab,
        smartEditorSet,smartEditorThemeSet,smartEditorSocialSet,smartEditorSlugInput,copyCurrentSmartUrl,smartEditorReleaseChanged,smartUseReleaseCover,uploadSmartLinkCover,
        smartEditorServiceUrl,smartMoveService,smartRemoveService,smartEditorAddService,smartServiceDragStart,smartServiceDrop,setSmartPreviewDevice,
        openSmartPreviewMobile,closeSmartPreviewMobile,saveSmartLinkFromEditor
    });
})();
