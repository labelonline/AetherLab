/* AetherLab module extracted from the former monolithic index.html. */
    function getChat(email) { return normalizeChat(appState.chats[safeChatKey(email)]); }
    function renderUserChat() {
        if(currentUser.unreadAdminMsg) { currentUser.unreadAdminMsg = false; saveUserDB(currentUser); }
        const box = document.getElementById('userChatBox'); const msgs = getChat(currentUser.email);
        box.innerHTML = msgs.length ? msgs.map(m => `<div class="msg ${m.from === 'admin' ? 'msg-them' : 'msg-me'}">${escapeHTML(m.text)}<div class="msg-time">${escapeHTML(m.time)}</div></div>`).join('') : `<p class="text-sm" style="text-align:center; margin-top:20px;">У вас пока нет сообщений.</p>`;
        if(box.scrollHeight > 0) box.scrollTop = box.scrollHeight;
    }
    function sendMessageAsUser() {
        const input = document.getElementById('userChatInput');
        if(!input || !input.value.trim()) return;
        const msgText = input.value.trim();
        const msg = makeChatMessage('user', msgText);
        input.value = '';
        notifyTyping(false, 'admin');
        appendChatMessage(currentUser.email, msg);
        renderUserChat();
        markAdminsUnreadForChat(currentUser.email);
        refreshUnreadIndicators();
        sendEmailNotification("Новое сообщение в поддержку AetherLab", `Артист ${currentUser.login} (${currentUser.email}) написал вам:\n\n"${msgText}"`);
    }
    function renderAdminChatList() {
        const list = document.getElementById('adminChatUserList'); const searchVal = document.getElementById('adminChatSearch').value.toLowerCase();
        let usersToChat = appState.users.filter(u => u.id !== currentUser.id && !u.isDeletedCabinet);
        if (searchVal) usersToChat = usersToChat.filter(u => u.login.toLowerCase().includes(searchVal) || u.email.toLowerCase().includes(searchVal));
        const unreadMap = getUnreadArtistChats();
        list.innerHTML = usersToChat.map(u => { 
            const msgs = getChat(u.email); const lastMsg = msgs.length ? msgs[msgs.length-1].text : 'Нет сообщений';
            const safe = u.email.replace(/\./g, '_');
            const unread = !!unreadMap[safe];
            return `<div class="admin-chat-user ${activeAdminChatUser === u.email ? 'active' : ''}" onclick="selectAdminChat('${u.email}')"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;"><div style="font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(u.login)}</div><span class="nav-unread-dot ${unread ? '' : 'hidden'}"></span></div><div class="role-glow" style="font-size:9px;margin-bottom:4px;">${getUserRoleName(u)}</div><div class="text-sm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${msgs.length ? '#fff' : 'var(--text-muted)'};">${escapeHTML(lastMsg)}</div></div>`; 
        }).join('');
        if (activeAdminChatUser) {
            const box = document.getElementById('adminChatBox'); const msgs = getChat(activeAdminChatUser);
            box.innerHTML = msgs.length ? msgs.map(m => `<div class="msg ${m.from === 'admin' ? 'msg-me' : 'msg-them'}">${escapeHTML(m.text)}<div class="msg-time">${escapeHTML(m.time)}</div></div>`).join('') : `<p class="text-sm" style="text-align:center;margin-top:20px;">Диалог пуст</p>`; 
            box.scrollTop = box.scrollHeight;
            clearArtistChatUnread(activeAdminChatUser, true);
        }
    }
    function selectAdminChat(email) { activeAdminChatUser = email; document.getElementById('adminChatInputArea').classList.remove('hidden'); clearArtistChatUnread(email, true); renderAdminChatList(); refreshUnreadIndicators(); }
    function sendMessageAsAdmin() {
        if(!activeAdminChatUser) return;
        const input = document.getElementById('adminChatInput');
        if(!input || !input.value.trim()) return;
        const targetEmail = activeAdminChatUser;
        const msgText = input.value.trim();
        const msg = makeChatMessage('admin', msgText);
        input.value = '';
        notifyTyping(false, targetEmail);
        appendChatMessage(targetEmail, msg);
        renderAdminChatList();
        const u = appState.users.find(x => x.email === targetEmail);
        if(u) {
            u.unreadAdminMsg = true;
            saveUserDB(u);
        }
        refreshUnreadIndicators();
    }
    function showCreateCabinetDialog() {
        const roles = [{v: 'Administrator', t: 'Администратор'}, {v: 'Artist', t: 'Артист'}];
        UI.prompt("Выберите роль нового кабинета", [{ id: 'role', label: 'Роль', type: 'select', options: roles }], (res) => {
            const selectedRole = roles.find(r => r.v === res.role);
            UI.prompt(`Открытие кабинета: ${selectedRole.t}`, [{id: 'login', label: 'Логин', placeholder: 'Введите логин'}, {id: 'email', label: 'Почта', type: 'email', placeholder: 'Введите почту'}, {id: 'pass', label: 'Пароль', placeholder: 'Введите пароль'}], (userData) => {
                if(!userData.login || !userData.email || !userData.pass) return UI.alert("Ошибка", "Заполните все поля");
                let checkEmail = userData.email.toLowerCase();
                if(appState.users.find(x => x.email === checkEmail)) return UI.alert("Ошибка", "Почта уже занята");
                if(appState.users.find(x => String(x.login || '').trim().toLowerCase() === String(userData.login || '').trim().toLowerCase() && !x.isDeletedCabinet)) return UI.alert("Ошибка", "Логин уже занят");
                const newUser = { id: 'u' + Date.now(), login: userData.login, email: checkEmail, pass: userData.pass, role: res.role, createdByAdminId: currentUser && currentUser.id ? String(currentUser.id) : '', createdByAdminEmail: currentUser && currentUser.email ? String(currentUser.email).toLowerCase().trim() : '', createdByAdminLogin: currentUser && currentUser.login ? String(currentUser.login) : '', passwordHistory: [{pass: userData.pass, date: new Date().toLocaleString()}], isBanned: false, banReason: '', unreadAdminMsg: false, unreadArtistChats: {}, readContent: {}, avatar: '', isDeletedCabinet: false };
                saveUserDB(newUser); if(typeof aetherRecordActivity==='function') aetherRecordActivity('user','Создан кабинет',`${newUser.login} (${newUser.email})`,null,{userEmail:newUser.email}); UI.alert("Успешно", "Новый кабинет успешно открыт."); if(currentSection === 'adminUsers') renderAdminUsers();
        if(currentSection === 'questionnaires') renderQuestionnaires();
            });
        });
    }
    function showCabinetInfo(id) {
        const u = appState.users.find(x => x.id === id); if(!u) return;
        let historyHtml = (u.passwordHistory && u.passwordHistory.length > 0) ? u.passwordHistory.slice().reverse().map((h, i) => `<div style="margin-bottom:8px; padding:8px; background:var(--bg-glass); border: 1px solid var(--border); border-radius:8px;"><span class="${i===0?'pass-current':'pass-old'}">${i===0?'Текущий':'Старый'}</span> <code style="margin: 0 10px; font-size:14px; color:#fff;">${h.pass}</code> <span class="text-sm">(${h.date})</span></div>`).join('') : `<p class="text-sm">История паролей отсутствует.</p>`;
        let infoContent = `<div style="text-align:left;"><p style="margin-bottom:8px;"><b>Логин:</b> ${u.login}</p><p style="margin-bottom:8px;"><b>Почта:</b> ${u.email}</p><p style="margin-bottom:16px;"><b>Роль:</b> <span class="role-glow" style="display:inline-block; margin:0;">${getUserRoleName(u)}</span></p><h4 style="margin-bottom:12px; border-bottom:1px solid var(--border); padding-bottom:6px;">Все пароли:</h4><div style="max-height: 200px; overflow-y: auto;">${historyHtml}</div></div>`;
        UI.alert(`Информация: ${u.login}`, infoContent);
    }
    function changeUserRole(id) {
        const u = appState.users.find(x => x.id === id); if(u.email === ADMIN_EMAIL) return UI.alert("Ошибка", "Нельзя изменить роль главного администратора.");
        UI.prompt("Изменение роли", [{ id: 'role', label: `Текущая роль: ${getRoleName(u.role)}`, type: 'select', value: u.role, options: [{v: 'Artist', t: 'Артист'}, {v: 'Administrator', t: 'Администратор'}] }], (res) => { const oldRole=u.role; u.role = res.role; saveUserDB(u); if(typeof aetherRecordActivity==='function') aetherRecordActivity('user','Изменена роль кабинета',`${u.login}: ${getRoleName(oldRole)} → ${getRoleName(res.role)}`,null,{userEmail:u.email}); UI.alert("Успешно", `Роль кабинета изменена на: ${getRoleName(res.role)}`); renderAdminUsers(); });
    }
    function renderAdminUsers() {
        document.getElementById('adminUsersList').innerHTML = appState.users.filter(u => !u.isDeletedCabinet).map(u => {
            let buttons = `<button class="btn-outline" style="padding: 6px 10px; font-size: 12px; margin-right: 8px;" onclick="showCabinetInfo('${u.id}')">Информация</button><button class="btn-outline" style="padding: 6px 10px; font-size: 12px; margin-right: 8px;" onclick="changeUserRole('${u.id}')">Роль</button><button class="btn-outline" style="padding: 6px 10px; font-size: 12px; color: ${u.isBanned?'var(--success)':'var(--danger)'}" onclick="toggleBan('${u.id}')">${u.isBanned?'Разблокировать':'Заблокировать'}</button>`;
            if(u.isBanned && u.email !== ADMIN_EMAIL) buttons += `<button class="btn-danger" style="padding: 6px 10px; font-size: 12px; margin-left: 8px;" onclick="deleteCabinet('${u.id}')">Удалить</button>`;
            return `<div class="card"><div><div style="font-weight: 600; font-size: 16px;">${escapeHTML(u.login || 'Без логина')}</div><div class="text-sm" style="margin-top:4px;">Почта: <span style="color:#eef2fb">${escapeHTML(u.email || '—')}</span></div><div class="role-glow">${getUserRoleName(u)}</div><div class="text-sm" style="margin-top:4px;">Браузеры: <span style="color:var(--success)">${u.devices ? u.devices.join(', ') : 'Нет данных'}</span></div></div><div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">${buttons}</div></div>`;
        }).join('');
    }
    function toggleBan(id) {
        const u = appState.users.find(x => x.id === id); if(u.email === ADMIN_EMAIL) return UI.alert("Ошибка", "Нельзя заблокировать главного администратора.");
        if (u.role === 'Administrator' && currentUser.email !== ADMIN_EMAIL) return UI.alert("Ошибка", "Только главный администратор может блокировать других администраторов.");
        if(u.isBanned) { u.isBanned = false; u.banReason = ''; saveUserDB(u); if(typeof aetherRecordActivity==='function') aetherRecordActivity('user','Кабинет разблокирован',`${u.login} (${u.email})`,null,{userEmail:u.email}); renderAdminUsers(); } 
        else { UI.prompt("Блокировка", [{id: 'r', placeholder: 'Причина закрытия'}], (res) => { u.isBanned = true; u.banReason = res.r || 'Нарушение правил'; saveUserDB(u); if(typeof aetherRecordActivity==='function') aetherRecordActivity('user','Кабинет заблокирован',`${u.login}: ${u.banReason}`,null,{userEmail:u.email}); renderAdminUsers(); }); }
    }
    function deleteCabinet(id) {
        UI.confirm("Полностью удалить этот кабинет? Он исчезнет из списка навсегда.", () => {
            const u = appState.users.find(x => x.id === id);
            if(u) { u.isDeletedCabinet = true; u.isBanned = true; u.banReason = "Ваш кабинет был навсегда удален администрацией."; saveUserDB(u);
                if (activeAdminChatUser === u.email) { activeAdminChatUser = null; document.getElementById('adminChatInputArea').classList.add('hidden'); document.getElementById('adminChatBox').innerHTML = `<div class="empty-state"><h2>Выберите диалог</h2></div>`; }
                renderAdminUsers(); if(currentSection === 'adminChats') renderAdminChatList();
        if(currentSection === 'karaoke') renderKaraoke();
        if(currentSection === 'promoLinks') renderPromoLinks();
            }
        });
    }
    function wipeOldAccounts() {
        if(currentUser.email !== ADMIN_EMAIL) return;
        UI.confirm("ВНИМАНИЕ! Вы уверены, что хотите УДАЛИТЬ ВСЕ АККАУНТЫ кроме вашего?", () => {
            appState.users.forEach(u => { if(u.email !== ADMIN_EMAIL) { db.ref('users/' + u.id).remove(); db.ref('chats/' + u.email.replace(/\./g, '_')).remove(); } });
            UI.alert("Успешно", "Все сторонние аккаунты удалены из базы."); renderAdminUsers();
        });
    }

