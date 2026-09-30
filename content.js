/* AetherLab module extracted from the former monolithic index.html. */
    function refreshUI() {
        updateSidebarCounts();
        if(currentSection === 'overview') renderOverview(); 
        if(currentSection === 'catalog') renderCatalog();
        if(currentSection === 'releaseHub' && typeof renderReleaseHub === 'function') renderReleaseHub();
        if(currentSection === 'releaseCalendar' && typeof renderReleaseCalendar === 'function') renderReleaseCalendar();
        if(currentSection === 'activityLog' && typeof renderActivityLog === 'function') renderActivityLog(); 
        if(currentSection === 'news') renderNews();
        if(currentSection === 'guide') renderGuide();
        if(currentSection === 'adminContent') renderAdminContent();
        if(currentSection === 'adminUsers') renderAdminUsers();
        if(currentSection === 'questionnaires') renderQuestionnaires(); 
        if(currentSection === 'adminReleases') renderAdminReleases(false); 
        if(currentSection === 'userChat') renderUserChat(); 
        if(currentSection === 'adminChats') renderAdminChatList();
        if(currentSection === 'karaoke') renderKaraoke();
        if(currentSection === 'promoLinks') renderPromoLinks();
    }
    function escapeHTML(value) {
        return String(value ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
    }

    const KITE_TRACK_AI_USAGE_OPTIONS = [
        'Трек полностью сгенерирован ИИ',
        'ИИ использован частично, только для генерации музыки',
        'ИИ использован частично, только для генерации текста',
        'ИИ использован частично, только для генерации и/или обработки вокала'
    ];
    const KITE_AI_USAGE_ALIASES = {
        'Трек полностью сгенерирован ИИ (Текст + Музыка)': 'Трек полностью сгенерирован ИИ',
        'ИИ использован частично, только для обработки трека': 'ИИ использован частично, только для генерации и/или обработки вокала',
        'ИИ использован частично, только для генерации/обработки вокала': 'ИИ использован частично, только для генерации и/или обработки вокала'
    };
    function normalizeAiUsage(value) {
        let list = [];
        if(Array.isArray(value)) list = value;
        else if(typeof value === 'string' && value.trim()) list = value.split(/[;\n]+/);
        else if(value === true) list = ['Использован ИИ'];
        const normalized = [];
        list.forEach(item => {
            const clean = String(item || '').trim();
            if(!clean) return;
            const mapped = KITE_AI_USAGE_ALIASES[clean] || clean;
            if(!normalized.includes(mapped)) normalized.push(mapped);
        });
        return normalized;
    }
    function getAiUsageChecked(containerId) {
        const box = document.getElementById(containerId);
        if(!box) return [];
        return Array.from(box.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
    }
    function setAiUsageChecked(containerId, value) {
        const selected = normalizeAiUsage(value);
        const box = document.getElementById(containerId);
        if(!box) return;
        box.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.checked = selected.includes(input.value);
        });
    }
    function formatAiUsage(value) {
        const items = normalizeAiUsage(value);
        return items.length ? items.join('; ') : 'Нет';
    }
    function setCoverAiUsed(value) {
        const checked = !!value;
        const input = document.getElementById('r_cover_ai');
        if(input) input.checked = checked;
        if(typeof draftRelease === 'object' && draftRelease) draftRelease.aiCoverUsed = checked;
    }

    function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            if(!file) return resolve(null);
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    function getMediaTypeFromData(src) {
        if(String(src || '').startsWith('data:video')) return 'video';
        return 'image';
    }
    function getBlockFiles(block) {
        if(!block) return [];
        if(Array.isArray(block.files) && block.files.length) {
            return block.files.filter(f => f && f.src).map((f, index) => ({
                id: f.id || (block.id + '_file_' + index),
                src: f.src,
                type: f.type || getMediaTypeFromData(f.src)
            }));
        }
        if(block.src) return [{ id: block.id + '_file_0', src: block.src, type: block.type || getMediaTypeFromData(block.src) }];
        return [];
    }
    function ensureContentMediaBlocks(item) {
        if(!item) return [];
        if(!Array.isArray(item.mediaBlocks)) item.mediaBlocks = [];
        if(item.media && item.media.src && !item.mediaBlocks.some(b => b.src === item.media.src || (Array.isArray(b.files) && b.files.some(f => f.src === item.media.src)))) {
            item.mediaBlocks.push({
                id: item.media.id || ('legacy_' + Date.now()),
                files: [{ id: 'legacy_file_0', src: item.media.src, type: item.media.type || getMediaTypeFromData(item.media.src) }],
                caption: item.media.caption || '',
                afterLine: item.media.position === 'before' ? 0 : ''
            });
            delete item.media;
        }
        item.mediaBlocks = item.mediaBlocks.filter(b => b && (b.src || (Array.isArray(b.files) && b.files.some(f => f && f.src)))).map((b, index) => {
            const id = b.id || (Date.now() + '_' + index);
            const files = getBlockFiles({ ...b, id }).map((f, fileIndex) => ({
                id: f.id || (id + '_file_' + fileIndex),
                src: f.src,
                type: f.type || getMediaTypeFromData(f.src)
            }));
            return {
                id,
                files,
                caption: b.caption || '',
                afterLine: b.afterLine === 0 || b.afterLine ? b.afterLine : ''
            };
        });
        return item.mediaBlocks;
    }
    function getContentMediaBlocks(item) {
        if(!item) return [];
        if(Array.isArray(item.mediaBlocks) && item.mediaBlocks.length) {
            return item.mediaBlocks.filter(b => b && (b.src || (Array.isArray(b.files) && b.files.some(f => f && f.src))));
        }
        if(item.media && item.media.src) return [{
            id: item.media.id || 'legacy',
            files: [{ id: 'legacy_file_0', src: item.media.src, type: item.media.type || getMediaTypeFromData(item.media.src) }],
            caption: item.media.caption || '',
            afterLine: item.media.position === 'before' ? 0 : ''
        }];
        return [];
    }
    function normalizeAfterLine(value) {
        if(value === '' || value === null || value === undefined) return '';
        const num = Number(value);
        if(!Number.isFinite(num)) return '';
        return Math.max(0, Math.floor(num));
    }
    function contentBlockDomId(kind, itemId, blockId) {
        return ('media_' + kind + '_' + itemId + '_' + blockId).replace(/[^a-zA-Z0-9_-]/g, '_');
    }
    function renderMediaBlock(block, item, admin = false, kind = '', placementClass = 'inline-media') {
        const files = getBlockFiles(block);
        if(!block || !files.length) return '';
        const blockId = escapeHTML(block.id || '');
        const domId = contentBlockDomId(kind, item.id, block.id || '');
        const slides = files.map((file, index) => {
            const type = file.type || getMediaTypeFromData(file.src);
            const inner = type === 'video'
                ? `<video src="${file.src}" controls></video>`
                : `<img src="${file.src}" alt="${escapeHTML(block.caption || item.title || '')}" onclick="openContentMediaFullscreen('${kind}','${item.id}','${blockId}',${index})">`;
            return `<div class="content-media-slide ${index === 0 ? 'active' : ''}" data-index="${index}">${inner}</div>`;
        }).join('');
        const carouselControls = files.length > 1
            ? `<button class="content-carousel-btn prev" onclick="contentCarouselMove('${domId}',-1)">‹</button><button class="content-carousel-btn next" onclick="contentCarouselMove('${domId}',1)">›</button><div class="content-carousel-meta"><span class="carousel-current">1</span> / ${files.length}</div>`
            : '';
        const caption = block.caption ? `<div class="content-media-caption">${escapeHTML(block.caption)}</div>` : '';
        const openBtn = `<button class="content-media-open" onclick="openContentMediaFullscreen('${kind}','${item.id}','${blockId}', getContentCarouselIndex('${domId}'))">Открыть на весь экран</button>`;
        const posText = block.afterLine === 0 || block.afterLine === '0' ? 'перед текстом' : (block.afterLine ? `после строки ${escapeHTML(block.afterLine)}` : 'после всего текста');
        const fileText = files.length > 1 ? ` • файлов: ${files.length}` : '';
        const tools = admin ? `<div class="media-admin-tools"><span class="text-sm" style="align-self:center;">Позиция: ${posText}${fileText}</span><button class="btn-outline" onclick="editContentMedia('${kind}','${item.id}','${blockId}')">Изменить блок</button><button class="btn-danger" onclick="removeContentMedia('${kind}','${item.id}','${blockId}')">Удалить блок</button></div>` : '';
        return `<div class="content-media-block ${placementClass}" id="${domId}" data-current="0"><div class="content-media-carousel">${slides}${carouselControls}</div>${caption}${openBtn}${tools}</div>`;
    }
    function getContentCarouselIndex(domId) {
        const el = document.getElementById(domId);
        return el ? Number(el.dataset.current || 0) : 0;
    }
    function contentCarouselMove(domId, dir) {
        const root = document.getElementById(domId);
        if(!root) return;
        const slides = Array.from(root.querySelectorAll('.content-media-slide'));
        if(slides.length <= 1) return;
        let current = Number(root.dataset.current || 0);
        current = (current + dir + slides.length) % slides.length;
        root.dataset.current = String(current);
        slides.forEach((slide, index) => slide.classList.toggle('active', index === current));
        const label = root.querySelector('.carousel-current');
        if(label) label.textContent = String(current + 1);
    }
    function renderTextWithMedia(item, admin = false, kind = '') {
        const lines = richStoredToLines(item.text || '');
        const blocks = getContentMediaBlocks(item);
        const byLine = {};
        const afterAll = [];
        blocks.forEach(block => {
            const pos = normalizeAfterLine(block.afterLine);
            if(pos === '') afterAll.push(block);
            else {
                const safePos = Math.min(pos, lines.length);
                if(!byLine[safePos]) byLine[safePos] = [];
                byLine[safePos].push(block);
            }
        });
        const html = [];
        if(byLine[0]) byLine[0].forEach(block => html.push(renderMediaBlock(block, item, admin, kind, 'before-text')));
        lines.forEach((line, index) => {
            html.push(`<span class="content-line">${line || '&nbsp;'}</span>`);
            const lineNumber = index + 1;
            if(byLine[lineNumber]) byLine[lineNumber].forEach(block => html.push(renderMediaBlock(block, item, admin, kind, 'inline-media')));
        });
        afterAll.forEach(block => html.push(renderMediaBlock(block, item, admin, kind, 'after-text')));
        return html.join('');
    }
    function renderContentArticle(item, admin = false, kind = '') {
        const adminActions = admin ? `<div class="admin-content-actions"><button class="btn-outline" onclick="editContentItem('${kind}','${item.id}')">Изменить текст</button><button class="btn-outline" onclick="editContentMedia('${kind}','${item.id}')">+ Фото/видео блок</button><button class="btn-danger" onclick="deleteContentItem('${kind}','${item.id}')">Удалить запись</button></div>` : '';
        return `<article class="content-item"><h3>${escapeHTML(item.title)}</h3><div class="date">${escapeHTML(item.date || '')}</div><div class="content-body">${renderTextWithMedia(item, admin, kind)}</div>${adminActions}</article>`;
    }
    function openContentMediaFullscreen(kind, itemId, blockId, fileIndex = 0) {
        const items = appState.content && appState.content[kind] ? normalizeContentItems(appState.content[kind]) : [];
        const item = items.find(x => x.id === itemId);
        const block = item ? getContentMediaBlocks(item).find(b => String(b.id) === String(blockId)) : null;
        const files = getBlockFiles(block);
        const file = files[Math.max(0, Math.min(Number(fileIndex) || 0, files.length - 1))];
        if(!file || !file.src) return;
        const type = file.type || getMediaTypeFromData(file.src);
        const box = document.getElementById('mediaViewerBox');
        if(!box) return;
        box.innerHTML = type === 'video'
            ? `<video src="${file.src}" controls autoplay></video>`
            : `<img src="${file.src}" alt="${escapeHTML(block.caption || '')}">`;
        document.getElementById('mediaViewer').classList.remove('hidden');
    }
    function closeContentMediaFullscreen() {
        const viewer = document.getElementById('mediaViewer');
        const box = document.getElementById('mediaViewerBox');
        if(box) box.innerHTML = '';
        if(viewer) viewer.classList.add('hidden');
    }

    function normalizeContentItems(raw) {
        if(Array.isArray(raw)) return raw.filter(Boolean).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        if(raw && typeof raw === 'object') return Object.values(raw).filter(Boolean).sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        return [];
    }
    function getContentMaxCreatedAt(kind) {
        return normalizeContentItems(appState.content[kind]).reduce((max, item) => Math.max(max, Number(item.createdAt || 0)), 0);
    }
    function hasUnreadContent(kind) {
        if(!currentUser) return false;
        const read = currentUser.readContent && Number(currentUser.readContent[kind] || 0);
        return getContentMaxCreatedAt(kind) > read;
    }
    function markContentRead(kind, silent = false) {
        if(!currentUser || !['news','guide'].includes(kind)) return;
        const max = getContentMaxCreatedAt(kind);
        if(!currentUser.readContent) currentUser.readContent = {};
        if(max && Number(currentUser.readContent[kind] || 0) < max) {
            currentUser.readContent[kind] = max;
            saveUserDB(currentUser);
            if(!silent) checkNotifications();
        }
    }
    function getUnreadArtistChats() {
        return currentUser && currentUser.unreadArtistChats && typeof currentUser.unreadArtistChats === 'object' ? currentUser.unreadArtistChats : {};
    }
    function hasUnreadArtistChats() {
        return Object.values(getUnreadArtistChats()).some(Boolean);
    }
    function clearArtistChatUnread(email, silent = false) {
        if(!currentUser || currentUser.role !== 'Administrator' || !email) return;
        const safe = email.replace(/\./g, '_');
        if(currentUser.unreadArtistChats && currentUser.unreadArtistChats[safe]) {
            currentUser.unreadArtistChats[safe] = false;
            saveUserDB(currentUser);
            if(!silent) checkNotifications();
        }
    }
    function markAdminsUnreadForChat(userEmail) {
        const safe = userEmail.replace(/\./g, '_');
        appState.users.filter(u => u.role === 'Administrator').forEach(admin => {
            if(!admin.unreadArtistChats) admin.unreadArtistChats = {};
            admin.unreadArtistChats[safe] = true;
            saveUserDB(admin);
        });
    }
    function toggleDot(id, show) {
        const el = document.getElementById(id);
        if(el) el.classList.toggle('hidden', !show);
    }
    function isApprovedRelease(r) {
        return !!r && r.status === 'Одобрен';
    }
    function isDraftRelease(r) {
        return !!r && r.status === 'Черновик';
    }
    function isModerationRelease(r) {
        return !!r && r.status === 'Модерация';
    }
    function isFixRelease(r) {
        return !!r && r.status === 'Отклонён';
    }

    function updateSidebarCounts() {
        const rels = getReleasesVisibleToCurrentUser().filter(r => !r.isDeleted);
        const setBadge = (id, value) => { const el = document.getElementById(id); if(el) el.textContent = String(value); };
        setBadge('badge-cat-all', rels.filter(isApprovedRelease).length);
        setBadge('badge-cat-drafts', rels.filter(isDraftRelease).length);
        setBadge('badge-cat-mod', rels.filter(isModerationRelease).length);
        setBadge('badge-cat-fix', rels.filter(isFixRelease).length);
        toggleDot('newsUnreadDot', hasUnreadContent('news'));
        toggleDot('guideUnreadDot', hasUnreadContent('guide'));
        toggleDot('adminChatsUnreadDot', currentUser && currentUser.role === 'Administrator' && hasUnreadArtistChats());
        const qCountEl = document.getElementById('questionnairesCount');
        if(qCountEl) qCountEl.innerText = String((appState.questionnaires || []).filter(q => (q.status || 'На проверке') === 'На проверке').length || (appState.questionnaires || []).length || 0);
    }
    function renderContentList(kind, targetId, emptyText) {
        const target = document.getElementById(targetId);
        if(!target) return;
        const items = normalizeContentItems(appState.content[kind]);
        if(!items.length) {
            target.innerHTML = `<div class="empty-panel">${escapeHTML(emptyText)}</div>`;
            return;
        }
        target.innerHTML = items.map(item => renderContentArticle(item, false, kind)).join('');
    }
    function renderNews() { renderContentList('news', 'newsList', 'Пока нет новостей от администрации.'); }
    function renderGuide() { renderContentList('guide', 'guideList', 'Пока нет инструкций. Администратор сможет добавить их в отдельном разделе.'); }
    function renderAdminContentList(kind, targetId) {
        const target = document.getElementById(targetId);
        if(!target) return;
        const items = normalizeContentItems(appState.content[kind]);
        if(!items.length) { target.innerHTML = `<div class="empty-panel">Ничего не добавлено.</div>`; return; }
        target.innerHTML = items.map(item => renderContentArticle(item, true, kind)).join('');
    }
    function renderAdminContent() {
        if(currentUser.role !== 'Administrator') { nav('overview', true); return; }
        renderAdminContentList('news', 'adminNewsList');
        renderAdminContentList('guide', 'adminGuideList');
    }
    function saveContentKind(kind) {
        appState.content[kind] = normalizeContentItems(appState.content[kind]);
        db.ref('content/' + kind).set(appState.content[kind]);
    }
    async function addContentItem(kind) {
        const isNews = kind === 'news';
        UI.prompt(isNews ? 'Добавить новость' : 'Добавить инструкцию', [
            {id:'title', label:'Заголовок', placeholder:isNews ? 'Например: Обновление правил модерации' : 'Например: Как отправить релиз'},
            {id:'text', label:'Текст', type:'richtext', placeholder:'Введите текст и выделите нужные фрагменты для форматирования...'},
            {id:'media', label:'Фото или видео (необязательно)', type:'file', accept:'image/*,video/*', multiple:true},
            {id:'caption', label:'Подпись к фото/видео (необязательно)', placeholder:'Текст под медиа'},
            {id:'afterLine', label:'Вставить медиа после строки', type:'number', placeholder:'Например: 4. 0 — перед текстом, пусто — после всего текста'}
        ], async (res) => {
            if(!res.title || !richHTMLToPlainText(res.text)) return UI.alert('Ошибка', 'Заполните заголовок и текст.');
            const item = { id: Date.now().toString(), title: res.title.trim(), text: sanitizeRichHTML(res.text).trim(), date: new Date().toLocaleString(), createdAt: Date.now(), mediaBlocks: [] };
            if(res.media && res.media.length) {
                const files = await Promise.all(res.media.map(async (file, index) => ({ id: Date.now().toString() + '_file_' + index, src: await fileToDataURL(file), type: file.type && file.type.startsWith('video') ? 'video' : 'image' })));
                item.mediaBlocks.push({ id: Date.now().toString() + '_media', files, caption: (res.caption || '').trim(), afterLine: normalizeAfterLine(res.afterLine) });
            }
            appState.content[kind].unshift(item);
            saveContentKind(kind);
            renderAdminContent();
        });
    }
    function editContentItem(kind, id) {
        const item = appState.content[kind].find(x => x.id === id);
        if(!item) return;
        UI.prompt(kind === 'news' ? 'Изменить новость' : 'Изменить инструкцию', [
            {id:'title', label:'Заголовок', value:item.title},
            {id:'text', label:'Текст', type:'richtext', value:item.text, placeholder:'Введите текст и выделите нужные фрагменты для форматирования...'}
        ], (res) => {
            if(!res.title || !richHTMLToPlainText(res.text)) return UI.alert('Ошибка', 'Заполните заголовок и текст.');
            item.title = res.title.trim();
            item.text = sanitizeRichHTML(res.text).trim();
            item.date = new Date().toLocaleString();
            saveContentKind(kind);
            renderAdminContent();
        });
    }
    function editContentMedia(kind, id, blockId = '') {
        const item = appState.content[kind].find(x => x.id === id);
        if(!item) return;
        const blocks = ensureContentMediaBlocks(item);
        const block = blockId ? blocks.find(b => String(b.id) === String(blockId)) : null;
        UI.prompt(block ? 'Изменить фото/видео блок' : 'Добавить фото/видео блок', [
            {id:'media', label:block ? 'Заменить фото/видео блок (необязательно)' : 'Выберите фото/видео', type:'file', accept:'image/*,video/*', multiple:true},
            {id:'caption', label:'Подпись к фото/видео', value:block ? block.caption : '', placeholder:'Текст под медиа'},
            {id:'afterLine', label:'Вставить после строки', type:'number', value:block ? (block.afterLine ?? '') : '', placeholder:'Например: 4. 0 — перед текстом, пусто — после всего текста'}
        ], async (res) => {
            let target = block;
            if(!target) target = { id: Date.now().toString() + '_media', files: [], caption: '', afterLine: '' };
            if(res.media && res.media.length) {
                target.files = await Promise.all(res.media.map(async (file, index) => ({ id: Date.now().toString() + '_file_' + index, src: await fileToDataURL(file), type: file.type && file.type.startsWith('video') ? 'video' : 'image' })));
                delete target.src;
                delete target.type;
            }
            if(!getBlockFiles(target).length) return UI.alert('Ошибка', 'Сначала выберите фото или видео.');
            target.caption = (res.caption || '').trim();
            target.afterLine = normalizeAfterLine(res.afterLine);
            if(!block) blocks.push(target);
            item.mediaBlocks = blocks;
            item.date = new Date().toLocaleString();
            saveContentKind(kind);
            renderAdminContent();
        });
    }
    function toggleContentMediaPosition(kind, id) {
        const item = appState.content[kind].find(x => x.id === id);
        if(!item) return;
        const blocks = ensureContentMediaBlocks(item);
        const block = blocks[0];
        if(!block) return;
        block.afterLine = block.afterLine === 0 || block.afterLine === '0' ? '' : 0;
        saveContentKind(kind);
        renderAdminContent();
    }
    function removeContentMedia(kind, id, blockId = '') {
        const item = appState.content[kind].find(x => x.id === id);
        if(!item) return;
        UI.confirm('Удалить этот фото/видео блок?', () => {
            const blocks = ensureContentMediaBlocks(item);
            item.mediaBlocks = blockId ? blocks.filter(b => String(b.id) !== String(blockId)) : [];
            delete item.media;
            saveContentKind(kind);
            renderAdminContent();
        });
    }
    function deleteContentItem(kind, id) {
        UI.confirm('Удалить эту запись?', () => {
            appState.content[kind] = appState.content[kind].filter(x => x.id !== id);
            saveContentKind(kind);
            renderAdminContent();
        });
    }
    function addNewsItem() { addContentItem('news'); }
    function addGuideItem() { addContentItem('guide'); }


    function buildCustomSelect(select) {
        if(!select || select.dataset.customSelectReady === '1') return;
        select.dataset.customSelectReady = '1';
        select.classList.add('custom-select-source');
        const wrap = document.createElement('div');
        wrap.className = 'custom-select';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'custom-select-btn';
        const list = document.createElement('div');
        list.className = 'custom-select-list';
        wrap.appendChild(btn);
        wrap.appendChild(list);
        select.parentNode.insertBefore(wrap, select.nextSibling);
        function syncLabel() {
            const selected = select.options[select.selectedIndex];
            btn.textContent = selected ? selected.textContent : 'Выберите';
        }
        function renderOptions() {
            list.innerHTML = '';
            Array.from(select.options).forEach(opt => {
                const item = document.createElement('div');
                item.className = 'custom-select-option' + (opt.disabled ? ' disabled' : '') + (opt.selected ? ' active' : '');
                item.textContent = opt.textContent;
                item.dataset.value = opt.value;
                item.onclick = () => {
                    if(opt.disabled) return;
                    select.value = opt.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    syncLabel();
                    renderOptions();
                    wrap.classList.remove('open');
                };
                list.appendChild(item);
            });
        }
        function positionCustomSelectList() {
            const rect = btn.getBoundingClientRect();
            const gap = 8;
            const viewportGap = 14;
            const spaceBelow = window.innerHeight - rect.bottom - viewportGap;
            const spaceAbove = rect.top - viewportGap;
            const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
            const maxH = Math.max(160, Math.min(360, (openUp ? spaceAbove : spaceBelow) - gap));
            list.style.width = rect.width + 'px';
            list.style.left = Math.max(viewportGap, Math.min(rect.left, window.innerWidth - rect.width - viewportGap)) + 'px';
            list.style.right = 'auto';
            list.style.maxHeight = maxH + 'px';
            if(openUp) {
                list.style.top = 'auto';
                list.style.bottom = (window.innerHeight - rect.top + gap) + 'px';
            } else {
                list.style.bottom = 'auto';
                list.style.top = (rect.bottom + gap) + 'px';
            }
        }
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.custom-select.open').forEach(x => { if(x !== wrap) x.classList.remove('open'); });
            renderOptions();
            wrap.classList.toggle('open');
            if(wrap.classList.contains('open')) requestAnimationFrame(positionCustomSelectList);
        };
        window.addEventListener('resize', () => { if(wrap.classList.contains('open')) positionCustomSelectList(); });
        window.addEventListener('scroll', () => { if(wrap.classList.contains('open')) positionCustomSelectList(); }, true);
        select.addEventListener('change', () => { syncLabel(); renderOptions(); });
        const observer = new MutationObserver(() => { syncLabel(); renderOptions(); });
        observer.observe(select, { childList:true, subtree:true, attributes:true });
        syncLabel();
        renderOptions();
    }
    function initCustomSelects(root = document) {
        root.querySelectorAll('select').forEach(buildCustomSelect);
    }
    document.addEventListener('click', () => document.querySelectorAll('.custom-select.open').forEach(x => x.classList.remove('open')));
    setTimeout(() => initCustomSelects(), 0);
    setInterval(() => initCustomSelects(), 800);
    function refreshCustomSelectLabels() {
        document.querySelectorAll('select.custom-select-source').forEach(select => {
            select.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }
    function toggleLyricsByTrackType() {
        const lyricsBox = document.getElementById('lyricsFormGroup');
        if(lyricsBox) lyricsBox.classList.remove('hidden');
    }
    function getTrackTypeValue() {
        const typeEl = document.getElementById('t_type');
        return typeEl ? typeEl.value : '';
    }
    function setTrackTypeValue(value) {
        const typeEl = document.getElementById('t_type');
        if(!typeEl) return;
        const standard = ['Original', 'Live', 'Cover', 'Remix', 'Instrumental'];
        typeEl.value = standard.includes(value) ? value : 'Original';
        toggleLyricsByTrackType();
        refreshCustomSelectLabels();
    }


