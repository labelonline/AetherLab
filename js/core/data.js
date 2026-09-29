/* AetherLab module extracted from the former monolithic index.html. */
    function enableAuthButton() {
        const authBtn = document.getElementById('mainAuthBtn');
        if(authBtn) { authBtn.disabled = false; authBtn.innerText = 'Войти в кабинет'; }
    }
    function setAuthButtonLoading(text = 'Подключение...') {
        const authBtn = document.getElementById('mainAuthBtn');
        if(authBtn) { authBtn.disabled = true; authBtn.innerText = text; }
    }
    async function loadUsersOnce(showError = true) {
        try {
            const snapshot = await db.ref('users').once('value');
            const data = snapshot.val() || {};
            appState.users = Object.values(data);
            isDBLoaded = true;
            enableAuthButton();
            return true;
        } catch (err) {
            console.error(err);
            enableAuthButton();
            if (showError) UI.alert('Ошибка подключения', 'Не удалось подключиться к базе. Проверьте интернет/Firebase и попробуйте снова.');
            return false;
        }
    }

    function saveUserDB(u) { db.ref('users/' + u.id).set(u); }
    function safeChatKey(email) { return String(email || '').replace(/\./g, '_'); }
    function normalizeChat(raw) {
        if(!raw) return [];
        const arr = Array.isArray(raw) ? raw.filter(Boolean) : Object.values(raw).filter(Boolean);
        return arr.sort((a, b) => Number(a.sentAt || 0) - Number(b.sentAt || 0));
    }
    function makeChatMessage(from, text) {
        return {
            id: 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
            from,
            text,
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            sentAt: Date.now()
        };
    }
    function chatArrayToObject(msgs) {
        const obj = {};
        normalizeChat(msgs).forEach((m, i) => {
            const id = m.id || ('m_' + (m.sentAt || Date.now()) + '_' + i);
            obj[id] = Object.assign({}, m, { id });
        });
        return obj;
    }
    function appendChatMessage(email, msg, onDone) {
        const safe = safeChatKey(email);
        const message = Object.assign({}, msg);
        if(!message.id) message.id = 'm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        if(!message.sentAt) message.sentAt = Date.now();
        if(!message.time) message.time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

        const current = normalizeChat(appState.chats[safe]);
        const exists = current.some(m => m.id === message.id);
        const optimistic = exists ? current.map(m => m.id === message.id ? message : m) : current.concat(message);
        appState.chats[safe] = optimistic;

        const persist = () => {
            const latest = normalizeChat(appState.chats[safe]);
            return db.ref('chats/' + safe).set(chatArrayToObject(latest));
        };

        try {
            db.ref('chats/' + safe).once('value').then(snapshot => {
                const serverMsgs = normalizeChat(snapshot.val());
                const merged = serverMsgs.some(m => m.id === message.id) ? serverMsgs : serverMsgs.concat(message);
                appState.chats[safe] = normalizeChat(merged);
                return db.ref('chats/' + safe).set(chatArrayToObject(appState.chats[safe]));
            }).then(() => { if(typeof onDone === 'function') onDone(true); })
            .catch(err => {
                console.error(err);
                persist().then(() => { if(typeof onDone === 'function') onDone(true); })
                    .catch(e => {
                        console.error(e);
                        if(typeof onDone === 'function') onDone(false);
                        UI.alert('Ошибка отправки', 'Сообщение показано в чате, но не сохранилось в базе. Проверьте подключение или правила Firebase.');
                    });
            });
        } catch(err) {
            console.error(err);
            if(typeof onDone === 'function') onDone(false);
            UI.alert('Ошибка отправки', 'Сообщение показано в чате, но не сохранилось в базе. Проверьте подключение или правила Firebase.');
        }
        return appState.chats[safe];
    }
    function saveChatDB(email, msgs) {
        const safe = safeChatKey(email);
        const normalized = normalizeChat(msgs).map((m, i) => Object.assign({}, m, { id: m.id || ('m_' + (m.sentAt || Date.now()) + '_' + i), sentAt: m.sentAt || Date.now() + i }));
        appState.chats[safe] = normalized;
        return db.ref('chats/' + safe).set(chatArrayToObject(normalized)).catch(err => console.error(err));
    }

