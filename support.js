/* AetherLab module extracted from the former monolithic index.html. */
/* ===== AetherLab Support / FAQ / Tickets engine ===== */
(function(){
    const SUPPORT_CLOSE_MS = 3 * 24 * 60 * 60 * 1000;
    let supportActiveTab = 'qa';
    let supportQuestionId = null;
    let supportTicketId = null;
    let supportSectionsReady = false;

    function supportNow(){ return Date.now(); }
    function supportId(prefix){ return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); }
    function supportDate(ts){ return new Date(ts || Date.now()).toLocaleString(); }
    function supportNum(v){
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : 0;
    }
    function supportLastActivityAt(ticket){
        if(!ticket) return supportNow();
        let max = supportNum(ticket.createdAt);
        const msgs = Array.isArray(ticket.messages) ? ticket.messages : [];
        msgs.forEach(m => {
            max = Math.max(max, supportNum(m && m.createdAt));
        });
        max = Math.max(max, supportNum(ticket.lastArtistReplyAt), supportNum(ticket.lastAdminReplyAt), supportNum(ticket.lastActivityAt));
        return max || supportNow();
    }
    function supportAutoCloseAt(ticket){
        return supportLastActivityAt(ticket) + SUPPORT_CLOSE_MS;
    }
    function supportRefreshTimerFields(ticket){
        const lastActivityAt = supportLastActivityAt(ticket);
        ticket.lastActivityAt = lastActivityAt;
        ticket.autoCloseAt = lastActivityAt + SUPPORT_CLOSE_MS;
        return ticket.autoCloseAt;
    }
    function supportCloseExpiredTicket(ticket, now){
        if(!ticket || ticket.status !== 'open') return false;
        const autoCloseAt = supportRefreshTimerFields(ticket);
        if(Number(now || supportNow()) < autoCloseAt) return false;
        ticket.status = 'closed';
        ticket.closedAt = autoCloseAt;
        ticket.closedBy = 'auto';
        ticket.unreadForAdmin = false;
        ticket.unreadForArtist = false;
        return true;
    }
    function supportSetTicketActivity(ticket, ts){
        const time = supportNum(ts) || supportNow();
        ticket.lastActivityAt = time;
        ticket.autoCloseAt = time + SUPPORT_CLOSE_MS;
    }
    function supportRemainingText(ticket){
        if(!ticket || ticket.status !== 'open') return 'Тикет уже завершён.';
        const left = supportAutoCloseAt(ticket) - supportNow();
        if(left <= 0) return 'Тикет будет закрыт автоматически.';
        const totalMinutes = Math.ceil(left / 60000);
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        const parts = [];
        if(days) parts.push(days + ' дн.');
        if(hours) parts.push(hours + ' ч.');
        if(!days && minutes) parts.push(minutes + ' мин.');
        return 'До автозакрытия: ' + (parts.join(' ') || 'меньше минуты') + '.';
    }
    function supportText(v){ return String(v ?? '').trim(); }
    function supportInitials(name){
        const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
        return (parts[0]?.[0] || 'K').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
    }
    function supportUserByEmail(email){ return (appState.users || []).find(u => String(u.email || '') === String(email || '')); }
    function supportIsAdmin(){ return currentUser && currentUser.role === 'Administrator'; }
    function supportUserName(email, fallback){
        const u = supportUserByEmail(email);
        return (u && (u.login || u.email)) || fallback || email || 'Пользователь';
    }
    function supportAvatarHTML(user){
        const src = user && user.avatar ? String(user.avatar) : '';
        const name = user ? (user.login || user.email || '') : '';
        if(src) return `<div class="support-avatar"><img src="${escapeAttr(src)}" alt=""></div>`;
        return `<div class="support-avatar">${escapeHTML(supportInitials(name))}</div>`;
    }
    function supportAetherLabAvatar(){ return `<div class="support-avatar support-kite">KT</div>`; }
    function ensureSupportArrays(){
        if(!Array.isArray(appState.supportQas)) appState.supportQas = [];
        if(!Array.isArray(appState.supportTickets)) appState.supportTickets = [];
    }
    function normalizeTicket(t){
        if(!t) return null;
        if(!Array.isArray(t.messages)) {
            const first = t.message ? [{
                id: supportId('msg'),
                from: 'artist',
                userEmail: t.userEmail,
                userLogin: t.userLogin || supportUserName(t.userEmail),
                avatar: t.userAvatar || '',
                text: t.message,
                createdAt: Number(t.createdAt || Date.now()),
                date: t.date || supportDate(t.createdAt)
            }] : [];
            t.messages = first;
        }
        t.status = t.status || 'open';
        t.createdAt = Number(t.createdAt || Date.now());
        t.updatedAt = Number(t.updatedAt || t.createdAt);
        t.lastArtistReplyAt = Number(t.lastArtistReplyAt || t.createdAt);
        t.lastAdminReplyAt = Number(t.lastAdminReplyAt || 0);
        const wasOpen = t.status === 'open';
        const becameClosed = supportCloseExpiredTicket(t, supportNow());
        if(wasOpen && becameClosed) {
            setTimeout(() => saveSupportTicket(t), 0);
        } else {
            supportRefreshTimerFields(t);
        }
        return t;
    }
    function getSupportQas(){
        ensureSupportArrays();
        return appState.supportQas.slice().sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
    }
    function getSupportTickets(){
        ensureSupportArrays();
        return appState.supportTickets.map(normalizeTicket).filter(Boolean).sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0));
    }
    function closeExpiredSupportTickets(){
        ensureSupportArrays();
        let changed = false;
        const now = supportNow();
        (appState.supportTickets || []).forEach(ticket => {
            if(!ticket) return;
            normalizeTicket(ticket);
            const wasOpen = ticket.status === 'open';
            const expired = supportCloseExpiredTicket(ticket, now);
            if(wasOpen && expired) {
                changed = true;
                db.ref('supportTickets/' + (ticket.id || ticket.key)).set(ticket);
            }
        });
        if(changed) {
            if(currentUser && (currentSection === 'userChat' || currentSection === 'adminChats')) renderSupport();
            if(currentUser) checkNotifications();
        }
    }
    function startSupportAutoCloseWatcher(){
        if(window.__kiteSupportAutoCloseWatcher) return;
        closeExpiredSupportTickets();
        window.__kiteSupportAutoCloseWatcher = setInterval(closeExpiredSupportTickets, 60 * 1000);
        window.addEventListener('focus', closeExpiredSupportTickets);
        document.addEventListener('visibilitychange', () => {
            if(!document.hidden) closeExpiredSupportTickets();
        });
    }
    function saveSupportQa(item){
        if(!item.id) item.id = supportId('qa');
        item.updatedAt = supportNow();
        const idx = appState.supportQas.findIndex(q => String(q.id) === String(item.id));
        if(idx >= 0) appState.supportQas[idx] = item; else appState.supportQas.unshift(item);
        db.ref('supportQas/' + item.id).set(item);
    }
    function saveSupportTicket(ticket){
        if(!ticket.id) ticket.id = supportId('ticket');
        ticket.updatedAt = supportNow();
        const idx = appState.supportTickets.findIndex(t => String(t.id) === String(ticket.id));
        if(idx >= 0) appState.supportTickets[idx] = ticket; else appState.supportTickets.unshift(ticket);
        db.ref('supportTickets/' + ticket.id).set(ticket);
    }
    function addSupportNotification(userEmail, text, ticketId){
        const u = supportUserByEmail(userEmail);
        if(!u) return;
        if(!Array.isArray(u.notifications)) u.notifications = [];
        u.notifications.push({
            id: supportId('notif'),
            text,
            date: new Date().toLocaleString(),
            read: false,
            type: 'supportTicket',
            ticketId
        });
        saveUserDB(u);
        if(currentUser && String(currentUser.email) === String(u.email)) currentUser = u;
    }
    function notifyAdminsAboutTicket(ticket, text){
        (appState.users || []).filter(u => u.role === 'Administrator' && !u.isDeletedCabinet).forEach(admin => {
            addSupportNotification(admin.email, text || `Новый тикет от ${ticket.userLogin || ticket.userEmail}.`, ticket.id);
        });
    }
    function hasSupportUnread(){
        if(!currentUser) return false;
        const tickets = getSupportTickets();
        if(supportIsAdmin()) return tickets.some(t => t.status === 'open' && !!t.unreadForAdmin);
        return tickets.some(t => String(t.userEmail) === String(currentUser.email) && !!t.unreadForArtist);
    }
    function supportUnreadTicketCount(){
        if(!currentUser) return 0;
        const tickets = getSupportTickets();
        if(supportIsAdmin()) return tickets.filter(t => t.status === 'open' && !!t.unreadForAdmin).length;
        return tickets.filter(t => String(t.userEmail) === String(currentUser.email) && !!t.unreadForArtist).length;
    }
    function ticketNeedsAdminReply(t){
        if(!t || t.status !== 'open') return false;
        const msgs = Array.isArray(t.messages) ? t.messages : [];
        const last = msgs[msgs.length - 1];
        return !t.lastAdminReplyAt || !!t.unreadForAdmin || (last && last.from === 'artist');
    }
    function ensureSupportSections(){
        if(supportSectionsReady) return;
        supportSectionsReady = true;
        const userSec = document.getElementById('sec-userChat');
        if(userSec) userSec.innerHTML = '<div id="kiteSupportRoot"></div>';
        const adminSec = document.getElementById('sec-adminChats');
        if(adminSec) adminSec.innerHTML = '<div id="kiteAdminSupportRoot"></div>';
        const group = document.getElementById('supportNavGroup');
        if(group) group.classList.toggle('hidden', !currentUser);
        supportHighlightNav();
    }
    function supportHighlightNav(){
        const qaBtn = document.getElementById('btn-support-qa');
        const ticketBtn = document.getElementById('btn-support-tickets');
        if(qaBtn) qaBtn.classList.toggle('active', supportActiveTab !== 'tickets');
        if(ticketBtn) ticketBtn.classList.toggle('active', supportActiveTab === 'tickets');
    }
    window.navSupport = function(tab){
        supportActiveTab = tab === 'tickets' ? 'tickets' : 'qa';
        supportQuestionId = null;
        supportTicketId = null;
        setNavMenuState('support', true);
        if(supportIsAdmin()) nav('adminChats', true); else nav('userChat', true);
        setSupportPath(supportActiveTab);
        supportHighlightNav();
        renderSupport();
    };
    function setSupportPath(tab){
        const path = tab === 'tickets' ? '/support-ticket' : '/support';
        try { sessionStorage.setItem('aetherlab_last_route_v1', path); } catch(e) {}
        if(!window.__kiteRouteOpening && location.hostname === 'labelonline.github.io' && location.pathname !== '/AetherLab/') {
            try { history.replaceState({ kitePath:path }, '', '/AetherLab/'); } catch(e) {}
        }
    }
    function renderSupport(){
        ensureSupportSections();
        ensureSupportArrays();
        const isAdmin = supportIsAdmin();
        const root = document.getElementById(isAdmin ? 'kiteAdminSupportRoot' : 'kiteSupportRoot');
        if(!root || !currentUser) return;
        const title = document.getElementById('pageTitle');
        if(title) title.innerText = supportActiveTab === 'tickets' ? 'Тикеты' : 'Вопрос/ответ';
        supportHighlightNav();
        const unread = supportUnreadTicketCount();
        const actionHtml = isAdmin
            ? (supportActiveTab === 'tickets'
                ? `<button class="btn-primary" onclick="showAdminTicketPicker()">Ответить на тикет${unread ? ` (${unread})` : ''}</button>`
                : `<button class="btn-outline" onclick="addSupportQuestion()">Добавить вопрос</button><button class="btn-primary" onclick="showAnswerQuestionDialog()">Ответить на вопрос</button>`)
            : (supportActiveTab === 'tickets'
                ? `<button class="btn-primary" onclick="createSupportTicket()">Создать тикет</button>`
                : '');
        root.innerHTML = `
            <div class="support-shell">
                <div class="support-topbar">
                    <div>
                        <div class="section-kicker">AetherLab • Support Center</div>
                        <h2>${supportActiveTab === 'tickets' ? (isAdmin ? 'Тикеты артистов' : 'Индивидуальная поддержка') : 'Вопрос/ответ'}</h2>
                    </div>
                    <div class="support-actions">${actionHtml}</div>
                </div>
                <div id="supportWorkArea" class="support-work-area"></div>
            </div>`;
        if(supportActiveTab === 'tickets') renderSupportTickets();
        else renderSupportQuestions();
        checkNotifications();
    }
    function renderSupportQuestions(){
        const area = document.getElementById('supportWorkArea');
        if(!area) return;
        const items = getSupportQas();
        if(supportQuestionId) {
            const item = items.find(q => String(q.id) === String(supportQuestionId));
            if(!item) { supportQuestionId = null; return renderSupportQuestions(); }
            area.innerHTML = `
                <div class="support-detail">
                    <div class="support-question-actions">
                        <button class="btn-outline" onclick="backToSupportQuestions()">Назад к вопросам</button>
                        ${supportIsAdmin() ? `<div class="support-question-admin-actions"><button class="btn-danger" onclick="deleteSupportQuestion('${escapeAttr(item.id)}')">Удалить вопрос</button></div>` : ''}
                    </div>
                    <h2>${escapeHTML(item.question || 'Вопрос')}</h2>
                    <div class="support-separator"></div>
                    <div class="support-answer">${escapeHTML(item.answer || 'Администратор скоро даст ответ.')}</div>
                </div>`;
            return;
        }
        if(!items.length) {
            area.innerHTML = `<div class="support-empty">Пока нет вопросов. ${supportIsAdmin() ? 'Добавьте первый вопрос через кнопку сверху.' : 'Администратор скоро добавит ответы на частые вопросы.'}</div>`;
            return;
        }
        area.innerHTML = `<div class="support-grid">${items.map(item => `
            <div class="support-card" onclick="openSupportQuestion('${escapeAttr(item.id)}')">
                <div class="support-card-title">${escapeHTML(item.question || 'Вопрос')}</div>
                <div class="support-card-preview">${escapeHTML(item.answer || 'Администратор скоро даст ответ.')}</div>
                ${supportIsAdmin() ? `<button class="btn-danger support-card-delete" onclick="event.stopPropagation(); deleteSupportQuestion('${escapeAttr(item.id)}')">Удалить</button>` : ''}
            </div>`).join('')}</div>`;
    }
    function renderSupportTickets(){
        const area = document.getElementById('supportWorkArea');
        if(!area || !currentUser) return;
        const all = getSupportTickets();
        const list = supportIsAdmin() ? all : all.filter(t => String(t.userEmail) === String(currentUser.email));
        if(supportTicketId) {
            const ticket = all.find(t => String(t.id || t.key) === String(supportTicketId));
            if(!ticket || (!supportIsAdmin() && String(ticket.userEmail) !== String(currentUser.email))) {
                supportTicketId = null;
                return renderSupportTickets();
            }
            if(supportIsAdmin() && ticket.unreadForAdmin) { ticket.unreadForAdmin = false; saveSupportTicket(ticket); }
            if(!supportIsAdmin() && ticket.unreadForArtist) { ticket.unreadForArtist = false; saveSupportTicket(ticket); }
            area.innerHTML = renderTicketDetail(ticket);
            requestAnimationFrame(() => {
                const chat = area.querySelector('.support-chat');
                if(chat) chat.scrollIntoView({ block: 'end', behavior: 'smooth' });
            });
            checkNotifications();
            return;
        }
        if(!list.length) {
            area.innerHTML = `<div class="support-empty">${supportIsAdmin() ? 'Пока нет тикетов от артистов.' : 'Пока нет тикетов. Создайте тикет, если нужна индивидуальная помощь.'}</div>`;
            return;
        }
        area.innerHTML = `<div class="support-grid">${list.map(t => renderTicketCard(t, true)).join('')}</div>`;
    }
    function renderTicketCard(t, clickable){
        const user = supportUserByEmail(t.userEmail) || {login:t.userLogin, email:t.userEmail, avatar:t.userAvatar};
        const unread = supportIsAdmin() ? t.unreadForAdmin : t.unreadForArtist;
        const safeId = t.id || t.key || '';
        const clickAttrs = clickable ? `data-support-ticket-id="${escapeAttr(safeId)}" onclick="openSupportTicket('${escapeAttr(safeId)}'); return false;" role="button" tabindex="0"` : '';
        return `<div class="support-card support-ticket-card" ${clickAttrs}>
            ${unread ? '<span class="support-dot"></span>' : ''}
            <div class="ticket-card-head">
                ${supportAvatarHTML(user)}
                <div style="min-width:0;">
                    <div class="support-card-title">${escapeHTML(t.userLogin || supportUserName(t.userEmail))}</div>
                    <div class="text-sm">${escapeHTML(t.category || 'Вопрос')} • ${escapeHTML(supportDate(t.createdAt))}</div>
                </div>
            </div>
            <div class="support-card-preview">${escapeHTML((t.messages && t.messages[0] && t.messages[0].text) || t.message || '')}</div>
            <div style="margin-top:12px;"><span class="ticket-status ${t.status === 'open' ? 'open' : 'closed'}">${t.status === 'open' ? 'Открыт' : 'Завершён'}</span></div>
            ${t.status === 'open' ? `<div class="text-sm" style="margin-top:8px;">${escapeHTML(supportRemainingText(t))}</div>` : ''}
        </div>`;
    }
    function renderTicketDetail(ticket){
        const msgs = Array.isArray(ticket.messages) ? ticket.messages : [];
        const canArtistWrite = !supportIsAdmin() && ticket.status === 'open' && String(ticket.userEmail) === String(currentUser.email);
        const canAdminReply = supportIsAdmin() && ticket.status === 'open';
        return `<div class="support-detail">
            <button class="btn-outline" onclick="backToSupportTickets()">Назад к тикетам</button>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;">
                <h2 style="margin:0;">${escapeHTML(ticket.category || 'Тикет')}</h2>
                <span class="ticket-status ${ticket.status === 'open' ? 'open' : 'closed'}">${ticket.status === 'open' ? 'Открыт' : 'Завершён'}</span>
            </div>
            <div class="support-separator" style="margin-top:18px;"></div>
            <div class="support-chat">${msgs.length ? msgs.map(m => renderTicketMessage(m, ticket)).join('') : '<div class="support-empty">История тикета пока пустая.</div>'}</div>
            <div class="support-warning">Тикет автоматически закрывается через 3 дня после последнего сообщения от любого участника. ${escapeHTML(supportRemainingText(ticket))}</div>
            <div class="dialog-actions" style="margin-top:18px;">
                ${canAdminReply ? `<button class="btn-primary" onclick="replySupportTicket('${escapeAttr(ticket.id)}','admin')">Ответить</button>` : ''}
                ${canArtistWrite ? `<button class="btn-primary" onclick="replySupportTicket('${escapeAttr(ticket.id)}','artist')">Продолжить чат</button><button class="btn-danger" onclick="closeSupportTicketByArtist('${escapeAttr(ticket.id)}')">Завершить чат</button>` : ''}
            </div>
        </div>`;
    }
    function renderTicketMessage(m, ticket){
        const isAdminMsg = m.from === 'admin';
        const user = isAdminMsg ? null : (supportUserByEmail(m.userEmail || ticket.userEmail) || {login:m.userLogin || ticket.userLogin, email:m.userEmail || ticket.userEmail, avatar:m.avatar || ticket.userAvatar});
        const name = isAdminMsg ? 'AetherLab | Поддержка' : (m.userLogin || (user && user.login) || ticket.userLogin || 'Артист');
        return `<div class="support-message ${isAdminMsg ? 'admin' : 'artist'}">
            ${isAdminMsg ? supportAetherLabAvatar() : supportAvatarHTML(user)}
            <div class="support-bubble">
                <div class="support-msg-name">${escapeHTML(name)}</div>
                <div class="support-msg-text">${escapeHTML(m.text || '')}</div>
                <div class="support-msg-date">${escapeHTML(m.date || supportDate(m.createdAt))}</div>
            </div>
        </div>`;
    }
    window.supportSetTab = function(tab){
        supportActiveTab = tab === 'tickets' ? 'tickets' : 'qa';
        supportQuestionId = null;
        supportTicketId = null;
        setSupportPath(supportActiveTab);
        supportHighlightNav();
        renderSupport();
    };
    window.openSupportQuestion = function(id){ supportQuestionId = id; renderSupportQuestions(); };
    window.backToSupportQuestions = function(){ supportQuestionId = null; renderSupportQuestions(); };
    window.openSupportTicket = function(id){
        const ticketId = String(id || '').trim();
        if(!ticketId || ticketId === 'undefined' || ticketId === 'null') {
            return UI.alert('Ошибка', 'Тикет не найден. Обновите страницу и попробуйте ещё раз.');
        }
        ensureSupportSections();
        ensureSupportArrays();

        // Ищем тикет не только по полю id, но и по ключу Firebase.
        const ticket = getSupportTickets().find(t => String(t.id || t.key) === ticketId);
        if(!ticket) {
            return UI.alert('Ошибка', 'История этого тикета не найдена в базе.');
        }
        if(!supportIsAdmin() && String(ticket.userEmail || '') !== String(currentUser.email || '')) {
            return UI.alert('Ошибка', 'У вас нет доступа к этому тикету.');
        }

        supportActiveTab = 'tickets';
        supportQuestionId = null;
        supportTicketId = String(ticket.id || ticket.key || ticketId);
        setNavMenuState('support', true);
        setSupportPath('tickets');
        supportHighlightNav();

        const targetSection = supportIsAdmin() ? 'adminChats' : 'userChat';
        if(currentSection !== targetSection) {
            nav(targetSection, true);
        }

        // Принудительно рисуем историю после навигации, чтобы её не сбрасывал refreshUI/роутер.
        setTimeout(() => {
            supportActiveTab = 'tickets';
            supportTicketId = String(ticket.id || ticket.key || ticketId);
            setSupportPath('tickets');
            supportHighlightNav();
            renderSupport();
            requestAnimationFrame(() => {
                const area = document.getElementById('supportWorkArea');
                const chat = area ? area.querySelector('.support-chat') : null;
                if(chat) chat.scrollIntoView({ block:'end', behavior:'smooth' });
                else if(area) area.scrollIntoView({ block:'start', behavior:'smooth' });
            });
            checkNotifications();
        }, 0);
    };
    window.backToSupportTickets = function(){ supportTicketId = null; renderSupportTickets(); };

    document.addEventListener('click', function(ev){
        if(ev.defaultPrevented) return;
        const card = ev.target && ev.target.closest ? ev.target.closest('[data-support-ticket-id]') : null;
        if(!card) return;
        ev.preventDefault();
        ev.stopPropagation();
        window.openSupportTicket(card.getAttribute('data-support-ticket-id'));
    });
    document.addEventListener('keydown', function(ev){
        if(ev.key !== 'Enter' && ev.key !== ' ') return;
        const card = ev.target && ev.target.closest ? ev.target.closest('[data-support-ticket-id]') : null;
        if(!card) return;
        ev.preventDefault();
        window.openSupportTicket(card.getAttribute('data-support-ticket-id'));
    });
    window.deleteSupportQuestion = function(id){
        if(!supportIsAdmin()) return;
        const item = appState.supportQas.find(q => String(q.id) === String(id));
        if(!item) return UI.alert('Ошибка', 'Вопрос не найден.');
        UI.confirm('Удалить этот вопрос вместе с ответом? Он полностью пропадёт из поддержки.', () => {
            appState.supportQas = appState.supportQas.filter(q => String(q.id) !== String(id));
            db.ref('supportQas/' + id).remove();
            if(String(supportQuestionId) === String(id)) supportQuestionId = null;
            renderSupport();
        });
    };
    window.addSupportQuestion = function(){
        if(!supportIsAdmin()) return;
        UI.prompt('Добавить вопрос', [
            {id:'question', label:'Вопрос', placeholder:'Например: Как отправить релиз на модерацию?'}
        ], (res) => {
            const q = supportText(res.question);
            if(!q) return UI.alert('Ошибка', 'Введите вопрос.');
            saveSupportQa({ id:supportId('qa'), question:q, answer:'', createdAt:supportNow(), updatedAt:supportNow() });
            supportQuestionId = null;
            renderSupport();
        });
    };
    window.showAnswerQuestionDialog = function(){
        if(!supportIsAdmin()) return;
        const unanswered = getSupportQas().filter(q => !supportText(q.answer));
        if(!unanswered.length) return UI.alert('Вопросы', 'Нет вопросов без ответа.');
        UI.prompt('Ответить на вопрос', [
            {id:'qid', label:'Выберите вопрос', type:'select', options:unanswered.map(q => ({v:q.id, t:q.question}))},
            {id:'answer', label:'Ответ', type:'textarea', rows:7, placeholder:'Введите ответ на выбранный вопрос...'}
        ], (res) => {
            const item = appState.supportQas.find(q => String(q.id) === String(res.qid));
            if(!item) return UI.alert('Ошибка', 'Вопрос не найден.');
            const answer = supportText(res.answer);
            if(!answer) return UI.alert('Ошибка', 'Введите ответ.');
            item.answer = answer;
            item.answeredAt = supportNow();
            saveSupportQa(item);
            renderSupport();
        });
    };
    window.createSupportTicket = function(){
        if(!currentUser || supportIsAdmin()) return;
        UI.prompt('Создать тикет', [
            {id:'category', label:'Раздел', type:'select', options:[
                {v:'Вопрос', t:'Вопрос'},
                {v:'Ошибка', t:'Ошибка'},
                {v:'О релизе', t:'О релизе'},
                {v:'Другой', t:'Другой'}
            ]},
            {id:'message', label:'Сообщение', type:'textarea', rows:7, placeholder:'Опишите свою проблему или вопрос...'}
        ], (res) => {
            const msg = supportText(res.message);
            if(!msg) return UI.alert('Ошибка', 'Введите сообщение.');
            const ticket = {
                id:supportId('ticket'),
                category:res.category || 'Вопрос',
                userEmail:currentUser.email,
                userLogin:currentUser.login || currentUser.email,
                userAvatar:currentUser.avatar || '',
                status:'open',
                createdAt:supportNow(),
                updatedAt:supportNow(),
                lastArtistReplyAt:supportNow(),
                lastAdminReplyAt:0,
                unreadForAdmin:true,
                unreadForArtist:false,
                messages:[{
                    id:supportId('msg'),
                    from:'artist',
                    userEmail:currentUser.email,
                    userLogin:currentUser.login || currentUser.email,
                    avatar:currentUser.avatar || '',
                    text:msg,
                    createdAt:supportNow(),
                    date:new Date().toLocaleString()
                }]
            };
            supportSetTicketActivity(ticket, ticket.createdAt);
            saveSupportTicket(ticket);
            notifyAdminsAboutTicket(ticket, `Новый тикет от ${ticket.userLogin}: ${ticket.category}.`);
            supportActiveTab = 'tickets';
            supportTicketId = null;
            renderSupport();
            showSupportToast('Ваш тикет был отправлен.');
        });
    };
    window.showAdminTicketPicker = function(){
        if(!supportIsAdmin()) return;
        const tickets = getSupportTickets().filter(ticketNeedsAdminReply);
        if(!tickets.length) return UI.alert('Тикеты', 'Нет тикетов, на которые нужно ответить.');
        const html = `<div class="overlay" id="supportTicketPicker" style="z-index:10004;">
            <button type="button" class="kite-modal-close" onclick="document.getElementById('supportTicketPicker').remove()" aria-label="Закрыть">×</button>
            <div class="dialog" style="max-width:980px;">
                <h3>Ответить на тикет</h3>
                <p class="text-sm" style="margin-bottom:16px;">Выберите тикет артиста, на который нужно ответить.</p>
                <div class="support-picker-grid">${tickets.map(t => {
                    const user = supportUserByEmail(t.userEmail) || {login:t.userLogin,email:t.userEmail,avatar:t.userAvatar};
                    const first = (t.messages && t.messages[0] && t.messages[0].text) || t.message || '';
                    return `<div class="support-picker-card" onclick="document.getElementById('supportTicketPicker').remove(); openSupportTicket('${escapeAttr(t.id || t.key)}')">
                        <div class="ticket-card-head">${supportAvatarHTML(user)}<div><div class="support-card-title">${escapeHTML(t.userLogin || supportUserName(t.userEmail))}</div><div class="text-sm">${escapeHTML(t.category || 'Вопрос')}</div></div></div>
                        <div class="support-card-preview">${escapeHTML(first)}</div>
                        <div style="margin-top:12px;"><span class="ticket-status open">Открыть историю и ответить</span></div>
                    </div>`;
                }).join('')}</div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    };
    window.replySupportTicket = function(ticketId, from){
        const ticket = appState.supportTickets.find(t => String(t.id) === String(ticketId));
        if(!ticket || ticket.status !== 'open') return UI.alert('Ошибка', 'Тикет недоступен.');
        const isAdminReply = from === 'admin';
        if(isAdminReply && !supportIsAdmin()) return;
        if(!isAdminReply && String(ticket.userEmail) !== String(currentUser.email)) return;
        UI.prompt(isAdminReply ? 'Ответить на тикет' : 'Продолжить чат', [
            {id:'message', label:'Сообщение', type:'textarea', rows:7, placeholder:isAdminReply ? 'Введите ответ артиcту...' : 'Введите новое сообщение по этому тикету...'}
        ], (res) => {
            const msg = supportText(res.message);
            if(!msg) return UI.alert('Ошибка', 'Введите сообщение.');
            if(!Array.isArray(ticket.messages)) ticket.messages = [];
            const createdAt = supportNow();
            ticket.messages.push({
                id:supportId('msg'),
                from:isAdminReply ? 'admin' : 'artist',
                userEmail:isAdminReply ? currentUser.email : currentUser.email,
                userLogin:isAdminReply ? 'AetherLab | Поддержка' : (currentUser.login || currentUser.email),
                avatar:isAdminReply ? '' : (currentUser.avatar || ''),
                text:msg,
                createdAt,
                date:new Date().toLocaleString()
            });
            ticket.status = 'open';
            ticket.updatedAt = createdAt;
            supportSetTicketActivity(ticket, createdAt);
            if(isAdminReply) {
                ticket.lastAdminReplyAt = createdAt;
                ticket.unreadForArtist = true;
                ticket.unreadForAdmin = false;
                addSupportNotification(ticket.userEmail, 'AetherLab | Поддержка ответила на ваш тикет.', ticket.id);
            } else {
                ticket.lastArtistReplyAt = createdAt;
                ticket.unreadForAdmin = true;
                ticket.unreadForArtist = false;
                notifyAdminsAboutTicket(ticket, `Новый ответ в тикете от ${currentUser.login || currentUser.email}.`);
            }
            saveSupportTicket(ticket);
            supportActiveTab = 'tickets';
            supportTicketId = ticket.id;
            renderSupport();
        });
    };
    window.closeSupportTicketByArtist = function(ticketId){
        const ticket = appState.supportTickets.find(t => String(t.id) === String(ticketId));
        if(!ticket || String(ticket.userEmail) !== String(currentUser.email)) return;
        UI.confirm('Завершить этот чат? После завершения вы сможете только просматривать историю.', () => {
            ticket.status = 'closed';
            ticket.closedAt = supportNow();
            ticket.closedBy = 'artist';
            ticket.unreadForAdmin = false;
            ticket.unreadForArtist = false;
            saveSupportTicket(ticket);
            renderSupport();
        });
    };
    window.openSupportTicketFromNotification = function(ticketId){
        const alert = document.getElementById('uiAlert');
        if(alert) alert.classList.add('hidden');
        supportActiveTab = 'tickets';
        supportTicketId = ticketId;
        if(supportIsAdmin()) nav('adminChats', true); else nav('userChat', true);
        setSupportPath('tickets');
        supportHighlightNav();
        renderSupport();
    };
    function showSupportToast(text){
        const old = document.querySelector('.support-mini-toast');
        if(old) old.remove();
        const el = document.createElement('div');
        el.className = 'support-mini-toast';
        el.textContent = text;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 5000);
    }

    db.ref('supportQas').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        appState.supportQas = Object.entries(data).map(([key, value]) => {
            const item = value && typeof value === 'object' ? value : {};
            item.key = key;
            if(!item.id) item.id = key;
            return item;
        }).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
        if(currentUser && (currentSection === 'userChat' || currentSection === 'adminChats')) renderSupport();
    }, (err) => console.error(err));
    db.ref('supportTickets').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        appState.supportTickets = Object.entries(data).map(([key, value]) => {
            const ticket = value && typeof value === 'object' ? value : {};
            ticket.key = key;
            if(!ticket.id) ticket.id = key;
            return normalizeTicket(ticket);
        }).filter(Boolean).sort((a,b)=>Number(b.updatedAt||b.createdAt||0)-Number(a.updatedAt||a.createdAt||0));
        closeExpiredSupportTickets();
        if(currentUser && (currentSection === 'userChat' || currentSection === 'adminChats')) renderSupport();
        if(currentUser) checkNotifications();
    }, (err) => console.error(err));

    const __kiteOldRenderUserChat = typeof renderUserChat === 'function' ? renderUserChat : null;
    renderUserChat = function(){ renderSupport(); };
    const __kiteOldRenderAdminChatList = typeof renderAdminChatList === 'function' ? renderAdminChatList : null;
    renderAdminChatList = function(){ renderSupport(); };

    const __kiteOldUpdateSidebarCounts = updateSidebarCounts;
    updateSidebarCounts = function(){
        __kiteOldUpdateSidebarCounts();
        const has = hasSupportUnread();
        toggleDot('chatUnreadDot', currentUser && currentUser.role !== 'Administrator' && has);
        toggleDot('adminChatsUnreadDot', currentUser && currentUser.role === 'Administrator' && has);
    };

    const __kiteOldCheckNotifications = checkNotifications;
    checkNotifications = function(){
        __kiteOldCheckNotifications();
        const has = hasSupportUnread();
        if(has) {
            document.querySelectorAll('.bell-icon').forEach(b => b.classList.add('shake'));
            document.querySelectorAll('.unread-dot:not(#chatUnreadDot)').forEach(d => d.classList.remove('hidden'));
        }
        toggleDot('chatUnreadDot', currentUser && currentUser.role !== 'Administrator' && has);
        toggleDot('adminChatsUnreadDot', currentUser && currentUser.role === 'Administrator' && has);
    };

    showNotifications = function(){
        if(!currentUser) return;
        const notifs = currentUser.notifications || [];
        const listHtml = notifs.slice().reverse().map(n => {
            const clickable = n.ticketId ? `onclick="openSupportTicketFromNotification('${escapeAttr(n.ticketId)}')"` : '';
            const cursor = n.ticketId ? 'cursor:pointer;' : '';
            return `<div ${clickable} style="padding:12px;border-bottom:1px solid var(--border);${n.read?'opacity:.62':''}${cursor}">
                <div style="font-size:13px;font-weight:${n.ticketId ? '800' : '500'};">${escapeHTML(n.text || '')}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${escapeHTML(n.date || '')}</div>
                ${n.ticketId ? '<div class="text-sm" style="margin-top:6px;color:#cfd8ff;">Нажмите, чтобы открыть тикет</div>' : ''}
            </div>`;
        }).join('');
        UI.alert('Уведомления', listHtml || 'Нет новых уведомлений');
        if(notifs.some(n => !n.read)) {
            currentUser.notifications.forEach(n => n.read = true);
            saveUserDB(currentUser);
            checkNotifications();
        }
    };

    function bootSupport(){
        ensureSupportSections();
        supportHighlightNav();
        startSupportAutoCloseWatcher();
    }
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootSupport);
    else bootSupport();
})();

