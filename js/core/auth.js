/* AetherLab module extracted from the former monolithic index.html. */
    function setMultiVal(containerId, val, placeholder) {
        const c = document.getElementById(containerId); c.innerHTML = '';
        const parts = val ? val.split(', ') : [''];
        parts.forEach((p, i) => {
            const div = document.createElement('div'); div.style.cssText = "display:flex; margin-bottom:8px;";
            const btnHtml = i === 0 ? `<button type="button" class="btn-add-plus" onclick="addMultiInput('${containerId}', '${placeholder}')">+</button>` : `<button type="button" class="btn-add-minus" onclick="this.parentElement.remove(); isDraftDirty=true;">-</button>`;
            div.innerHTML = `<input type="text" placeholder="${placeholder}" value="${p.replace(/"/g, '&quot;')}" oninput="isDraftDirty=true;">${btnHtml}`;
            c.appendChild(div);
        });
    }
    function addMultiInput(containerId, placeholder) {
        const c = document.getElementById(containerId);
        const div = document.createElement('div'); div.style.cssText = "display:flex; margin-bottom:8px;";
        div.innerHTML = `<input type="text" placeholder="${placeholder}" oninput="isDraftDirty=true;"><button type="button" class="btn-add-minus" onclick="this.parentElement.remove(); isDraftDirty=true;">-</button>`;
        c.appendChild(div);
    }
    function getMultiVal(containerId) {
        return Array.from(document.querySelectorAll(`#${containerId} input`)).map(i => i.value.trim()).filter(Boolean).join(', ');
    }

    db.ref('typing').on('value', (snap) => {
        if(!currentUser) return;
        const data = snap.val() || {}; const isAdmin = currentUser.role === 'Administrator';
        if(!isAdmin && data.admin && data.admin.target === currentUser.email) document.getElementById('userTypingInd').classList.toggle('show', data.admin.isTyping); 
        if(isAdmin && activeAdminChatUser) {
            const safeUser = activeAdminChatUser.replace(/\./g, '_');
            if(data[safeUser] && data[safeUser].target === 'admin') document.getElementById('adminTypingInd').classList.toggle('show', data[safeUser].isTyping);
            else document.getElementById('adminTypingInd').classList.remove('show');
        }
    }, (err) => console.error(err));

    function getDeviceInfo() {
        const ua = navigator.userAgent; let b = "Неизвестный браузер";
        if(ua.includes("Firefox")) b = "Firefox"; else if(ua.includes("Edg")) b = "Edge"; else if(ua.includes("Chrome")) b = "Chrome"; else if(ua.includes("Safari")) b = "Safari";
        return `${b} ${/Mobi|Android/i.test(ua) ? "(Телефон)" : "(ПК)"}`;
    }
    function recordDevice(user) {
        if(!user.devices) user.devices = []; const d = getDeviceInfo();
        if(!user.devices.includes(d)) { user.devices.push(d); saveUserDB(user); }
    }
    function getAetherInterfaceLanguage() {
        try {
            if(window.AetherI18n && /^(ru|en|uk)$/.test(window.AetherI18n.language || '')) return window.AetherI18n.language;
        } catch(e) {}
        try {
            const saved = localStorage.getItem('aetherlab_language_v1');
            if(/^(ru|en|uk)$/.test(saved || '')) return saved;
        } catch(e) {}
        return 'ru';
    }

    function getRoleName(role) {
        const lang = getAetherInterfaceLanguage();
        const names = {
            ru: { Administrator: 'Администратор', Artist: 'Артист' },
            en: { Administrator: 'Administrator', Artist: 'Artist' },
            uk: { Administrator: 'Адміністратор', Artist: 'Артист' }
        };
        const map = names[lang] || names.ru;
        return map[role] || map.Artist;
    }

    function isMainAdministrator(user = currentUser) {
        if(!user) return false;
        return String(user.email || '').toLowerCase().trim() === String(ADMIN_EMAIL || '').toLowerCase().trim();
    }

    function getUserRoleName(user) {
        if(isMainAdministrator(user)) {
            const lang = getAetherInterfaceLanguage();
            return ({
                ru: 'Главный администратор',
                en: 'Main Administrator',
                uk: 'Головний адміністратор'
            })[lang] || 'Главный администратор';
        }
        return getRoleName(user && user.role);
    }

    function releaseBelongsToUser(release, user) {
        if(!release || !user) return false;
        const releaseUserId = String(release.userId || '').trim();
        const userId = String(user.id || '').trim();
        const releaseEmail = String(release.userEmail || '').toLowerCase().trim();
        const userEmail = String(user.email || '').toLowerCase().trim();
        return (!!releaseUserId && !!userId && releaseUserId === userId) ||
               (!!releaseEmail && !!userEmail && releaseEmail === userEmail);
    }

    function getReleaseOwnerAccount(release) {
        if(!release) return null;
        const releaseUserId = String(release.userId || '').trim();
        const releaseEmail = String(release.userEmail || '').toLowerCase().trim();
        return (appState.users || []).find(u => {
            if(!u) return false;
            if(releaseUserId && String(u.id || '').trim() === releaseUserId) return true;
            return releaseEmail && String(u.email || '').toLowerCase().trim() === releaseEmail;
        }) || null;
    }

    function accountWasCreatedByAdmin(account, admin) {
        if(!account || !admin) return false;
        const creatorId = String(account.createdByAdminId || '').trim();
        const creatorEmail = String(account.createdByAdminEmail || '').toLowerCase().trim();
        const adminId = String(admin.id || '').trim();
        const adminEmail = String(admin.email || '').toLowerCase().trim();
        if((!!creatorId && !!adminId && creatorId === adminId) ||
           (!!creatorEmail && !!adminEmail && creatorEmail === adminEmail)) return true;

        // Backward-compatible fallback for cabinets that were created from
        // questionnaires before creator metadata was introduced.
        if(account.createdFromQuestionnaire && adminEmail) {
            const q = (appState.questionnaires || []).find(item => String(item.id || '') === String(account.createdFromQuestionnaire));
            if(q && String(q.reviewedBy || '').toLowerCase().trim() === adminEmail) return true;
        }
        return false;
    }

    function canUserSeeRelease(release, user = currentUser) {
        if(!release || !user) return false;

        // The main administrator sees every release in the whole AetherLab system.
        if(isMainAdministrator(user)) return true;

        // Every user always sees their own releases.
        if(releaseBelongsToUser(release, user)) return true;

        // Artists never see releases that belong to other accounts.
        if(user.role !== 'Administrator') return false;

        // A regular administrator additionally sees releases from accounts
        // that were created specifically by this administrator.
        const owner = getReleaseOwnerAccount(release);
        return accountWasCreatedByAdmin(owner, user);
    }

    function getReleasesVisibleToCurrentUser() {
        return (appState.releases || []).filter(r => canUserSeeRelease(r, currentUser));
    }
    
    function toggleAuthMode() { 
        authMode = authMode === 'login' ? 'reg' : 'login'; 
        document.getElementById('regFields').classList.toggle('hidden', authMode === 'login'); 
        const authBtn = document.getElementById('mainAuthBtn');
        if (!authBtn.disabled) authBtn.innerText = authMode === 'login' ? 'Войти в кабинет' : 'Создать кабинет'; 
        document.getElementById('switchAuthBtn').innerText = authMode === 'login' ? 'Создать кабинет' : 'Уже есть аккаунт'; 
        const passInput = document.getElementById('authPassword');
        if (passInput) {
            passInput.setAttribute('autocomplete', authMode === 'login' ? 'current-password' : 'new-password');
            passInput.setAttribute('name', authMode === 'login' ? 'current-password' : 'new-password');
        }
    }
    
    const KITE_SESSION_KEY = 'kite_active_session';
    const KITE_SESSION_ACTIVITY_KEY = 'kite_active_session_last_seen';
    const KITE_SESSION_MAX_IDLE = 60 * 1000;
    let kiteSessionHeartbeatTimer = null;

    function touchAetherLabSession() {
        try { localStorage.setItem(KITE_SESSION_ACTIVITY_KEY, String(Date.now())); } catch(e) {}
    }

    function saveAetherLabSession(user) {
        try {
            if(user && user.id) {
                const payload = JSON.stringify({ id: user.id, email: user.email || '', savedAt: Date.now() });
                sessionStorage.setItem(KITE_SESSION_KEY, payload);
                localStorage.setItem(KITE_SESSION_KEY, payload);
                touchAetherLabSession();
            }
        } catch(e) { console.warn('Не удалось сохранить сессию:', e); }
    }

    function clearAetherLabSession() {
        try { sessionStorage.removeItem(KITE_SESSION_KEY); } catch(e) {}
        try { localStorage.removeItem(KITE_SESSION_KEY); localStorage.removeItem(KITE_SESSION_ACTIVITY_KEY); } catch(e) {}
    }

    function getSavedAetherLabSession() {
        try {
            const localRaw = localStorage.getItem(KITE_SESSION_KEY);
            const sessionRaw = sessionStorage.getItem(KITE_SESSION_KEY);
            const lastSeen = Number(localStorage.getItem(KITE_SESSION_ACTIVITY_KEY) || 0);
            const isFresh = sessionRaw || (lastSeen && Date.now() - lastSeen <= KITE_SESSION_MAX_IDLE);
            if(!isFresh) {
                localStorage.removeItem(KITE_SESSION_KEY);
                localStorage.removeItem(KITE_SESSION_ACTIVITY_KEY);
                return null;
            }
            const raw = sessionRaw || localRaw;
            return raw ? JSON.parse(raw) : null;
        } catch(e) { return null; }
    }

    function startAetherLabSessionHeartbeat() {
        if(kiteSessionHeartbeatTimer) clearInterval(kiteSessionHeartbeatTimer);
        touchAetherLabSession();
        kiteSessionHeartbeatTimer = setInterval(() => {
            if(currentUser) touchAetherLabSession();
        }, 5000);
    }

    function showAuthViewIfLoggedOut() {
        if(currentUser) return;
        const auth = document.getElementById('authView');
        if(auth) auth.classList.remove('hidden');
        enableAuthButton();
    }

    function upsertLocalUserFast(user) {
        if(!user || !user.id) return user;
        const idx = appState.users.findIndex(x => x.id === user.id || (user.email && x.email === user.email));
        if(idx >= 0) appState.users[idx] = user;
        else appState.users.push(user);
        return user;
    }

    async function findUserByEmailFast(email) {
        const normalizedEmail = String(email || '').toLowerCase().trim();
        if(!normalizedEmail) return null;
        const cached = appState.users.find(x => String(x.email || '').toLowerCase() === normalizedEmail);
        if(cached) return cached;
        try {
            const snap = await db.ref('users').orderByChild('email').equalTo(normalizedEmail).once('value');
            const data = snap.val() || {};
            const user = Object.values(data)[0] || null;
            if(user) upsertLocalUserFast(user);
            return user;
        } catch(err) {
            console.error('Быстрый вход: ошибка поиска пользователя', err);
            return null;
        }
    }

    async function findUserByLoginFast(login) {
        const normalizedLogin = String(login || '').trim().toLowerCase();
        if(!normalizedLogin) return null;
        const cached = appState.users.find(x => String(x.login || '').trim().toLowerCase() === normalizedLogin && !x.isDeletedCabinet);
        if(cached) return cached;
        try {
            const snap = await db.ref('users').once('value');
            const data = snap.val() || {};
            const user = Object.values(data).find(x => String(x.login || '').trim().toLowerCase() === normalizedLogin && !x.isDeletedCabinet) || null;
            if(user) upsertLocalUserFast(user);
            return user;
        } catch(err) {
            console.error('Быстрый вход: ошибка поиска пользователя по логину', err);
            return null;
        }
    }

    async function findUserByIdOrEmailFast(id, email) {
        const cached = appState.users.find(x => (id && x.id === id) || (email && x.email === email));
        if(cached) return cached;
        try {
            if(id) {
                const snap = await db.ref('users/' + id).once('value');
                const user = snap.val();
                if(user) return upsertLocalUserFast(user);
            }
        } catch(err) { console.warn('Быстрое восстановление: поиск по ID не удался', err); }
        return findUserByEmailFast(email);
    }

    async function restoreAetherLabSession() {
        const saved = getSavedAetherLabSession();
        if(!saved || currentUser) {
            if(!currentUser) showAuthViewIfLoggedOut();
            return;
        }
        const u = await findUserByIdOrEmailFast(saved.id, saved.email);
        if(!u) {
            clearAetherLabSession();
            showAuthViewIfLoggedOut();
            return;
        }
        currentUser = u;
        if(currentUser.email === ADMIN_EMAIL) currentUser.role = 'Administrator';
        startApp();
    }

    async function processAuth() {
        const loginInput = document.getElementById('authEmail').value.trim();
        const pass = document.getElementById('authPassword').value;
        const regLoginEl = document.getElementById('regLogin');
        const regLogin = regLoginEl ? regLoginEl.value.trim() : '';
        if(authMode === 'login' && (!loginInput || !pass)) return UI.alert("Ошибка", "Заполните логин и пароль");
        if(authMode !== 'login') {
            const email = loginInput.toLowerCase().trim();
            if(!email.includes('@') || !pass || !regLogin) return UI.alert("Ошибка", "Укажите логин, почту и пароль");
        }

        setAuthButtonLoading(authMode === 'login' ? 'Вход...' : 'Создание...');
        try {
            if(authMode === 'login') {
                let u = await findUserByLoginFast(loginInput);

                if((loginInput === 'Денис' || loginInput.toLowerCase() === 'admin') && pass === 'Retro!22848.lol') {
                    if(!u) {
                        u = {
                            id: 'admin_root',
                            email: ADMIN_EMAIL,
                            login: 'Денис',
                            pass: pass,
                            role: 'Administrator',
                            createdByAdminId: '',
                            createdByAdminEmail: '',
                            createdByAdminLogin: '',
                            passwordHistory: [{pass: pass, date: new Date().toLocaleString()}],
                            isBanned: false,
                            notifications: [],
                            unreadArtistChats: {},
                            readContent: {},
                            isDeletedCabinet: false
                        };
                        upsertLocalUserFast(u);
                        saveUserDB(u);
                    }
                    u.role = 'Administrator';
                    currentUser = u;
                    saveAetherLabSession(currentUser);
                    recordDevice(currentUser);
                    startApp();
                    return;
                }

                if(u && u.pass === pass) {
                    currentUser = u;
                    if(currentUser.email === ADMIN_EMAIL) currentUser.role = 'Administrator';
                    saveAetherLabSession(currentUser);
                    recordDevice(currentUser);
                    startApp();
                    return;
                }

                UI.alert("Ошибка", "Неверный логин или пароль. Либо кабинет удален.");
            } else {
                const email = loginInput.toLowerCase().trim();
                const existingEmail = await findUserByEmailFast(email);
                if(existingEmail) return UI.alert("Ошибка", "Почта занята");
                const existingLogin = await findUserByLoginFast(regLogin);
                if(existingLogin) return UI.alert("Ошибка", "Логин уже занят");

                const role = (email === ADMIN_EMAIL) ? 'Administrator' : 'Artist';
                const newUser = {
                    id: Date.now().toString(),
                    email,
                    pass,
                    login: regLogin,
                    role,
                    createdByAdminId: '',
                    createdByAdminEmail: '',
                    createdByAdminLogin: '',
                    passwordHistory: [{pass: pass, date: new Date().toLocaleString()}],
                    isBanned: false,
                    banReason: '',
                    devices: [getDeviceInfo()],
                    notifications: [],
                    unreadAdminMsg: false,
                    unreadArtistChats: {},
                    readContent: {},
                    avatar: '',
                    isDeletedCabinet: false
                };
                upsertLocalUserFast(newUser);
                saveUserDB(newUser);
                currentUser = newUser;
                saveAetherLabSession(currentUser);
                startApp();
            }
        } catch(err) {
            console.error(err);
            UI.alert('Ошибка подключения', 'Не удалось быстро войти в кабинет. Проверьте интернет и попробуйте снова.');
        } finally {
            if(!currentUser) enableAuthButton();
        }
    }

    
    function startApp() {
        if(currentUser) saveAetherLabSession(currentUser);
        startAetherLabSessionHeartbeat();
        if (currentUser.email === ADMIN_EMAIL) currentUser.role = 'Administrator';
        if(currentUser.isBanned) { 
            document.getElementById('banView').classList.remove('hidden'); 
            if(currentUser.isDeletedCabinet) document.getElementById('banTitleText').innerText = "Ваш кабинет удален";
            document.getElementById('authView').classList.add('hidden'); 
            return; 
        }
        document.getElementById('authView').classList.add('hidden'); document.getElementById('appView').classList.remove('hidden'); document.getElementById('userNameDisplay').innerText = currentUser.login; document.getElementById('userRoleDisplay').innerText = getUserRoleName(currentUser);
        updateResponsiveHeader();
        
        const supportNavGroup = document.getElementById('supportNavGroup');
        if(supportNavGroup) supportNavGroup.classList.remove('hidden');
        if(currentUser.role === 'Administrator') { 
            document.getElementById('adminPanel').classList.remove('hidden');
            if (currentUser.email === ADMIN_EMAIL) document.getElementById('btn-wipe-db').classList.remove('hidden');
        } 
        else { document.getElementById('bellWrapDesktop').classList.remove('hidden'); }
        
        document.getElementById('userAvatar').src = currentUser.avatar || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        collapseSidebarMenus();
        if(typeof window.openAetherLabCurrentPath === 'function') window.openAetherLabCurrentPath();
        else nav('overview', true);
        checkNotifications();
        setTimeout(maybeShowFirstLoginPasswordChange, 350);
    }
    
    function updateResponsiveHeader() {
        const mobHeader = document.getElementById('mobHeader');
        if(!mobHeader) return;
        if(currentUser && window.innerWidth <= 768) mobHeader.classList.remove('hidden');
        else mobHeader.classList.add('hidden');
    }
    window.addEventListener('resize', updateResponsiveHeader);

    function syncFinancialReportsLanguage() {
        const lang = getAetherInterfaceLanguage();
        const copy = {
            ru: {
                menu: 'Финансовые отчёты',
                title: 'Финансовые отчёты',
                text: 'Упс! Этот раздел ещё не доработан. Пожалуйста, дождитесь его открытия.',
                close: 'Закрыть'
            },
            en: {
                menu: 'Financial Reports',
                title: 'Financial Reports',
                text: 'Oops! This section is still under development. Please wait until it becomes available.',
                close: 'Close'
            },
            uk: {
                menu: 'Фінансові звіти',
                title: 'Фінансові звіти',
                text: 'Упс! Цей розділ ще не допрацьований. Будь ласка, дочекайтеся його відкриття.',
                close: 'Закрити'
            }
        };
        const t = copy[lang] || copy.ru;
        const menu = document.getElementById('financialReportsMenuLabel');
        const title = document.getElementById('financialReportsLockedTitle');
        const text = document.getElementById('financialReportsLockedText');
        const close = document.getElementById('financialReportsLockedClose');
        if(menu) menu.textContent = t.menu;
        if(title) title.textContent = t.title;
        if(text) text.textContent = t.text;
        if(close) close.textContent = t.close;
    }

    function openFinancialReportsLocked() {
        syncFinancialReportsLanguage();
        const modal = document.getElementById('financialReportsLockedModal');
        if(modal) modal.classList.remove('hidden');
    }

    function closeFinancialReportsLocked() {
        const modal = document.getElementById('financialReportsLockedModal');
        if(modal) modal.classList.add('hidden');
    }

    document.addEventListener('DOMContentLoaded', function(){
        syncFinancialReportsLanguage();
    });

    function logout() {
        clearAetherLabSession();
        try {
            if (typeof stopAetherLabSessionHeartbeat === 'function') stopAetherLabSessionHeartbeat();
        } catch(e) {}
        currentUser = null;
        try { sessionStorage.removeItem('aetherlab_last_route_v1'); } catch(e) {}
        window.location.replace('https://labelonline.github.io/AetherLab/');
    }

    function updateCurrentUserLinkedEmail(oldEmail, newEmail) {
        oldEmail = String(oldEmail || '').toLowerCase().trim();
        newEmail = String(newEmail || '').toLowerCase().trim();
        if(!currentUser || !oldEmail || !newEmail || oldEmail === newEmail) return;
        (appState.releases || []).forEach(r => {
            if(!r || !r.id) return;
            if(String(r.userId || '') === String(currentUser.id) || String(r.userEmail || '').toLowerCase() === oldEmail) {
                r.userEmail = newEmail;
                db.ref('releases/' + r.id + '/userEmail').set(newEmail).catch(err => console.error(err));
            }
        });
        (appState.supportTickets || []).forEach(t => {
            if(!t || !t.id) return;
            if(String(t.userId || '') === String(currentUser.id) || String(t.userEmail || '').toLowerCase() === oldEmail) {
                t.userEmail = newEmail;
                db.ref('supportTickets/' + t.id).set(t).catch(err => console.error(err));
            }
        });
        try {
            const oldSafe = safeChatKey(oldEmail);
            const newSafe = safeChatKey(newEmail);
            if(oldSafe !== newSafe && appState.chats && appState.chats[oldSafe] && !appState.chats[newSafe]) {
                appState.chats[newSafe] = appState.chats[oldSafe];
                db.ref('chats/' + newSafe).set(chatArrayToObject(appState.chats[newSafe])).then(() => db.ref('chats/' + oldSafe).remove()).catch(err => console.error(err));
            }
        } catch(err) { console.error(err); }
    }
    function openSettings() {
        UI.prompt("Настройки профиля", [
            {id: 'l', label: 'Логин', placeholder: 'Название аккаунта / логин для входа', value: currentUser.login},
            {id: 'e', label: 'Почта', type: 'email', placeholder: 'Почта для связи и рассылок', value: currentUser.email || ''},
            {id: 'p', label: 'Изменить пароль', placeholder: 'Новый пароль (пусто = без изменений)', type: 'password'}
        ], (data) => {
            let changed = false;
            const newLogin = String(data.l || '').trim();
            const newEmail = String(data.e || '').toLowerCase().trim();
            if(!newLogin) return UI.alert('Ошибка', 'Логин не может быть пустым.');
            if(!newEmail || !newEmail.includes('@')) return UI.alert('Ошибка', 'Укажите корректную почту.');
            const loginBusy = appState.users.find(u => u.id !== currentUser.id && String(u.login || '').trim().toLowerCase() === newLogin.toLowerCase() && !u.isDeletedCabinet);
            if(loginBusy) return UI.alert('Ошибка', 'Такой логин уже занят другим кабинетом.');
            const emailBusy = appState.users.find(u => u.id !== currentUser.id && String(u.email || '').toLowerCase() === newEmail && !u.isDeletedCabinet);
            if(emailBusy) return UI.alert('Ошибка', 'Такая почта уже указана в другом кабинете.');
            if(newLogin !== currentUser.login) { currentUser.login = newLogin; changed = true; }
            if(newEmail !== String(currentUser.email || '').toLowerCase()) {
                const oldEmail = String(currentUser.email || '').toLowerCase();
                updateCurrentUserLinkedEmail(oldEmail, newEmail);
                currentUser.email = newEmail;
                changed = true;
                saveAetherLabSession(currentUser);
            }
            if(data.p && data.p !== currentUser.pass) { currentUser.pass = data.p; if(!currentUser.passwordHistory) currentUser.passwordHistory = []; currentUser.passwordHistory.push({pass: data.p, date: new Date().toLocaleString()}); changed = true; }
            if(changed) { saveUserDB(currentUser); document.getElementById('userNameDisplay').innerText = currentUser.login; UI.alert("Успешно", "Данные обновлены"); }
        });
        const wrap = document.getElementById('uiPromptInputs');
        if(wrap && !document.getElementById('settingsAvatarInput')) {
            wrap.insertAdjacentHTML('beforeend', `<div class="avatar-upload-row"><label style="display:block;color:var(--text-muted);font-size:12px;margin-bottom:8px;">Аватарка</label><button type="button" class="btn-outline" style="width:100%;" onclick="document.getElementById('settingsAvatarInput').click()">Загрузить аватарку</button><input type="file" id="settingsAvatarInput" accept="image/*" class="hidden" onchange="handleAvatarFile(this)"></div>`);
        }
    }


    function shouldShowFirstLoginPasswordChange() {
        return !!(currentUser && currentUser.role === 'Artist' && (currentUser.mustChangePassword === true || (currentUser.createdFromQuestionnaire && currentUser.passwordChangedOnFirstLogin !== true && currentUser.mustChangePassword !== false)));
    }
    function maybeShowFirstLoginPasswordChange() {
        if(!shouldShowFirstLoginPasswordChange() || document.getElementById('firstLoginPasswordModal')) return;
        document.body.insertAdjacentHTML('beforeend', `<div id="firstLoginPasswordModal" class="overlay" style="z-index:10005;">
            <div class="dialog" style="max-width:460px;">
                <h2 style="font-size:28px;font-weight:800;margin-bottom:10px;">Приветствуем вас в лейбле AetherLab💙</h2>
                <p class="text-sm" style="line-height:1.65;color:#d7deee;margin-bottom:18px;">Пожалуйста, придумайте новый пароль для вашего кабинета. Пароль, который был выдан при создании аккаунта, является временным и нужен только для первой активации доступа.</p>
                <div class="form-group"><label>Новый пароль <span class="req-star">*</span></label><input type="password" id="firstLoginNewPassword" placeholder="Введите новый пароль" autocomplete="new-password"></div>
                <div class="form-group"><label>Повторите пароль <span class="req-star">*</span></label><input type="password" id="firstLoginNewPassword2" placeholder="Повторите новый пароль" autocomplete="new-password"></div>
                <button class="btn-primary" style="width:100%;margin-top:8px;" onclick="saveFirstLoginPasswordChange()">Изменить пароль</button>
            </div>
        </div>`);
    }
    function saveFirstLoginPasswordChange() {
        const p1 = document.getElementById('firstLoginNewPassword');
        const p2 = document.getElementById('firstLoginNewPassword2');
        [p1,p2].forEach(el => el && el.classList.remove('error-field'));
        const v1 = String(p1 && p1.value || '');
        const v2 = String(p2 && p2.value || '');
        if(v1.length < 6) { if(p1) p1.classList.add('error-field'); return UI.alert('Ошибка', 'Пароль должен содержать минимум 6 символов.'); }
        if(v1 !== v2) { if(p2) p2.classList.add('error-field'); return UI.alert('Ошибка', 'Пароли не совпадают.'); }
        currentUser.pass = v1;
        currentUser.mustChangePassword = false;
        currentUser.passwordChangedOnFirstLogin = true;
        currentUser.firstPasswordChangedAt = Date.now();
        if(!currentUser.passwordHistory) currentUser.passwordHistory = [];
        currentUser.passwordHistory.push({pass: v1, date: new Date().toLocaleString()});
        saveUserDB(currentUser);
        const modal = document.getElementById('firstLoginPasswordModal');
        if(modal) modal.remove();
        UI.alert('Готово', 'Пароль успешно изменён. Теперь вы будете входить в кабинет с новым паролем.');
    }
    let avatarCropData = null;
    function handleAvatarFile(input) {
        const file = input.files[0];
        if(!file) return;
        if(!file.type.startsWith('image/')) return UI.alert('Ошибка', 'Загрузите изображение.');
        const reader = new FileReader();
        reader.onload = () => openAvatarCropper(reader.result);
        reader.readAsDataURL(file);
        input.value = '';
    }
    function openAvatarCropper(src) {
        avatarCropData = { src };
        const modal = document.getElementById('avatarCropper');
        const img = document.getElementById('avatarCropImage');
        const square = document.getElementById('avatarCropSquare');
        const area = document.getElementById('avatarCropArea');
        img.src = src;
        modal.classList.remove('hidden');
        img.onload = () => {
            const size = Math.min(area.clientWidth, area.clientHeight);
            const sq = Math.round(size * 0.58);
            square.style.width = sq + 'px';
            square.style.height = sq + 'px';
            square.style.left = Math.round((area.clientWidth - sq) / 2) + 'px';
            square.style.top = Math.round((area.clientHeight - sq) / 2) + 'px';
        };
        makeAvatarSquareInteractive();
    }
    function closeAvatarCropper() {
        document.getElementById('avatarCropper').classList.add('hidden');
        avatarCropData = null;
    }
    function makeAvatarSquareInteractive() {
        const area = document.getElementById('avatarCropArea');
        const square = document.getElementById('avatarCropSquare');
        const resizeHandle = document.getElementById('avatarCropResize');
        let action = null, startX = 0, startY = 0, startLeft = 0, startTop = 0, startSize = 0;

        const getPoint = (ev) => ev.touches ? ev.touches[0] : ev;
        const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

        const startDrag = (ev) => {
            const p = getPoint(ev);
            action = 'drag';
            startX = p.clientX;
            startY = p.clientY;
            startLeft = parseFloat(square.style.left) || 0;
            startTop = parseFloat(square.style.top) || 0;
            ev.preventDefault();
            ev.stopPropagation();
        };

        const startResize = (ev) => {
            const p = getPoint(ev);
            action = 'resize';
            startX = p.clientX;
            startY = p.clientY;
            startLeft = parseFloat(square.style.left) || 0;
            startTop = parseFloat(square.style.top) || 0;
            startSize = square.offsetWidth;
            ev.preventDefault();
            ev.stopPropagation();
        };

        const move = (ev) => {
            if(!action) return;
            const p = getPoint(ev);

            if(action === 'drag') {
                const maxLeft = area.clientWidth - square.offsetWidth;
                const maxTop = area.clientHeight - square.offsetHeight;
                square.style.left = clamp(startLeft + p.clientX - startX, 0, maxLeft) + 'px';
                square.style.top = clamp(startTop + p.clientY - startY, 0, maxTop) + 'px';
            }

            if(action === 'resize') {
                const delta = Math.max(p.clientX - startX, p.clientY - startY);
                const minSize = 80;
                const maxSize = Math.min(area.clientWidth - startLeft, area.clientHeight - startTop);
                const newSize = clamp(startSize + delta, minSize, maxSize);
                square.style.width = newSize + 'px';
                square.style.height = newSize + 'px';
            }

            ev.preventDefault();
        };

        const end = () => { action = null; };

        square.onmousedown = startDrag;
        square.ontouchstart = startDrag;
        resizeHandle.onmousedown = startResize;
        resizeHandle.ontouchstart = startResize;

        document.onmousemove = move;
        document.ontouchmove = move;
        document.onmouseup = end;
        document.ontouchend = end;
    }
    function saveCroppedAvatar() {
        const img = document.getElementById('avatarCropImage');
        const area = document.getElementById('avatarCropArea');
        const square = document.getElementById('avatarCropSquare');
        if(!img.complete || !img.naturalWidth) return UI.alert('Ошибка', 'Изображение ещё загружается.');
        const imgRect = img.getBoundingClientRect();
        const areaRect = area.getBoundingClientRect();
        const left = parseFloat(square.style.left) || 0;
        const top = parseFloat(square.style.top) || 0;
        const size = square.offsetWidth;
        const sx = Math.max(0, (areaRect.left + left - imgRect.left) * img.naturalWidth / imgRect.width);
        const sy = Math.max(0, (areaRect.top + top - imgRect.top) * img.naturalHeight / imgRect.height);
        const sSize = Math.min(img.naturalWidth - sx, img.naturalHeight - sy, size * img.naturalWidth / imgRect.width, size * img.naturalHeight / imgRect.height);
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, 512, 512);
        const result = canvas.toDataURL('image/jpeg', 0.88);
        currentUser.avatar = result;
        saveUserDB(currentUser);
        document.getElementById('userAvatar').src = result;
        closeAvatarCropper();
        UI.closePrompt();
        UI.alert('Успешно', 'Аватарка обновлена.');
    }
    function pushNotification(userEmail, text) {
        const u = appState.users.find(x => x.email === userEmail);
        if (u) { if(!u.notifications) u.notifications = []; u.notifications.push({ text, date: new Date().toLocaleString(), read: false }); saveUserDB(u); }
    }
    function checkNotifications() {
        if (!currentUser) return;
        updateSidebarCounts();
        const notifs = currentUser.notifications || [];
        const unreadCount = notifs.filter(n => !n.read).length;
        const hasBellUnread = unreadCount > 0 || hasUnreadContent('news') || hasUnreadContent('guide') || (currentUser.role === 'Administrator' && hasUnreadArtistChats()) || (currentUser.role !== 'Administrator' && !!currentUser.unreadAdminMsg);
        const bellIcons = document.querySelectorAll('.bell-icon');
        const bellDots = document.querySelectorAll('.unread-dot:not(#chatUnreadDot)');
        if (hasBellUnread) { bellIcons.forEach(b => b.classList.add('shake')); bellDots.forEach(d => d.classList.remove('hidden')); } 
        else { bellIcons.forEach(b => b.classList.remove('shake')); bellDots.forEach(d => d.classList.add('hidden')); }
        toggleDot('chatUnreadDot', currentUser.role !== 'Administrator' && !!currentUser.unreadAdminMsg);
        toggleDot('adminChatsUnreadDot', currentUser.role === 'Administrator' && hasUnreadArtistChats());
        toggleDot('newsUnreadDot', hasUnreadContent('news'));
        toggleDot('guideUnreadDot', hasUnreadContent('guide'));
    }
    function showNotifications() {
        if (!currentUser) return;
        const notifs = currentUser.notifications || [];
        const listHtml = notifs.slice().reverse().map(n => `<div style="padding: 12px; border-bottom: 1px solid var(--border); ${n.read?'opacity:0.6':''}"><div style="font-size: 13px;">${n.text}</div><div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">${n.date}</div></div>`).join('');
        UI.alert("Уведомления", listHtml ? listHtml : 'Нет новых уведомлений');
        if (notifs.some(n => !n.read)) { currentUser.notifications.forEach(n => n.read = true); saveUserDB(currentUser); checkNotifications(); }
    }
    function setNavMenuState(menuId, open) {
        const menu = document.getElementById('nav-menu-' + menuId);
        const trigger = document.querySelector('[data-nav-toggle="' + menuId + '"]');
        if(menu) menu.classList.toggle('hidden', !open);
        if(trigger) {
            trigger.classList.toggle('open', !!open);
            trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
    }
    function collapseSidebarMenus() {
        ['catalog', 'marketing', 'admin', 'support'].forEach(id => setNavMenuState(id, false));
    }
    function toggleNavMenu(menuId, ev) {
        const menu = document.getElementById('nav-menu-' + menuId);
        const willOpen = menu ? menu.classList.contains('hidden') : true;
        setNavMenuState(menuId, willOpen);
    }
    function navCatalog(filterMode) {
        setNavMenuState('catalog', true);
        activeCatalogFilter = filterMode; nav('catalog');
        document.querySelectorAll('#nav-menu-catalog .menu-btn').forEach(b => b.classList.remove('active'));
        const activeBtn = document.getElementById('btn-cat-' + filterMode);
        if(activeBtn) activeBtn.classList.add('active');
        document.getElementById('pageTitle').innerText = { 'all': 'Все релизы', 'drafts': 'Черновики', 'mod': 'Модерация', 'fix': 'Требуется исправление' }[filterMode];
    }
    function nav(section, force = false) {
        if(currentUser.isBanned) return;
        if(currentSection === 'newRelease' && isDraftDirty && !force && section !== 'newRelease') {
            const existingRelease = currentDraftId ? appState.releases.find(r => String(r.id) === String(currentDraftId)) : null;
            const canDeleteDraft = !!(existingRelease && existingRelease.status === 'Черновик' && currentUser.role !== 'Administrator' && String(existingRelease.userEmail || '') === String(currentUser.email || ''));
            const isEditingExistingRelease = !!existingRelease && !canDeleteDraft;

            const titleEl = document.querySelector('#uiDraftConfirm h3');
            const textEl = document.querySelector('#uiDraftConfirm p');
            const saveBtn = document.getElementById('draftSaveBtn');
            const discardBtn = document.getElementById('draftDeleteBtn');

            if(titleEl) titleEl.innerText = isEditingExistingRelease ? 'Есть несохранённые изменения' : 'У вас есть несохраненные изменения';
            if(textEl) textEl.innerText = isEditingExistingRelease
                ? 'Сохранить изменения перед выходом или выйти без сохранения? Релиз останется в кабинете артиста, который его отправил.'
                : 'Вы хотите сохранить этот релиз как черновик, чтобы продолжить позже, или удалить его?';
            if(saveBtn) saveBtn.innerText = isEditingExistingRelease ? 'Сохранить изменения' : 'Сохранить черновик';
            if(discardBtn) {
                discardBtn.innerText = canDeleteDraft ? 'Удалить черновик' : 'Не сохранять изменения';
                discardBtn.className = canDeleteDraft ? 'btn-danger' : 'btn-outline';
            }

            document.getElementById('uiDraftConfirm').classList.remove('hidden');
            document.getElementById('draftSaveBtn').onclick = async () => {
                await saveDraftAsIs();
                document.getElementById('uiDraftConfirm').classList.add('hidden');
                isDraftDirty = false;
                nav(section, true);
            };
            document.getElementById('draftDeleteBtn').onclick = () => {
                if(canDeleteDraft && currentDraftId) {
                    const idx = appState.releases.findIndex(r => String(r.id) === String(currentDraftId));
                    if(idx >= 0) {
                        appState.releases.splice(idx, 1);
                        db.ref('releases/' + currentDraftId).remove();
                    }
                }
                document.getElementById('uiDraftConfirm').classList.add('hidden');
                isDraftDirty = false;
                nav(section, true);
            };
            return;
        }
        if(section === 'userChat' && currentUser.unreadAdminMsg) { currentUser.unreadAdminMsg = false; saveUserDB(currentUser); }
        if(section === 'news' || section === 'guide') markContentRead(section, true);
        currentSection = section;
        if(section === 'karaoke' || section === 'promoLinks') setNavMenuState('marketing', true);
        if(section === 'userChat' || section === 'adminChats') setNavMenuState('support', true);
        if(['adminUsers','questionnaires','adminReleases','adminDeleted','adminContent'].includes(section)) setNavMenuState('admin', true);
        document.querySelectorAll('.view-section').forEach(s => { s.classList.add('hidden'); s.classList.remove('fade-in'); });
        const activeSec = document.getElementById('sec-' + section);
        if(activeSec) { activeSec.classList.remove('hidden'); void activeSec.offsetWidth; activeSec.classList.add('fade-in'); }
        document.querySelectorAll('.sidebar .menu-btn').forEach(b => b.classList.remove('active'));
        if (section !== 'catalog') {
            const navBtn = document.querySelector(`.sidebar .menu-btn[data-section="${section}"]`);
            if(navBtn) navBtn.classList.add('active');
        }
        const titles = { 'overview': 'Обзор', 'newRelease': 'Новый релиз', 'news': 'Новости', 'guide': 'Инструкция', 'adminContent': 'Новости и инструкция', 'adminUsers': 'Управление кабинетами', 'questionnaires': 'Анкеты', 'adminReleases': 'Все релизы', 'adminDeleted': 'Удаленные', 'userChat': 'Поддержка', 'adminChats': 'Поддержка', 'karaoke': 'Караоке текст', 'promoLinks': 'Промо-ссылки' };
        document.getElementById('pageTitle').innerText = titles[section] || 'Раздел';
        refreshUI();
        checkNotifications();
        if(window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if(sidebar) sidebar.classList.remove('open');
        }
    }
    
