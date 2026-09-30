/* AetherLab module extracted from the former monolithic index.html. */
    db.ref('users').on('value', (snapshot) => {
        isDBLoaded = true;
        const authBtn = document.getElementById('mainAuthBtn');
        if(authBtn && authBtn.disabled) { authBtn.disabled = false; authBtn.innerText = authMode === 'login' ? 'Войти в кабинет' : 'Создать кабинет'; }
        const data = snapshot.val() || {}; appState.users = Object.values(data);
        if(currentUser) { 
            const updatedUser = appState.users.find(u => u.id === currentUser.id);
            if(updatedUser) {
                currentUser = updatedUser;
                if(currentUser.email === ADMIN_EMAIL) currentUser.role = 'Administrator';
                saveAetherLabSession(currentUser);
                if(currentSection === 'userChat' && currentUser.unreadAdminMsg) { currentUser.unreadAdminMsg = false; saveUserDB(currentUser); }
                if(currentSection === 'adminChats' && activeAdminChatUser) clearArtistChatUnread(activeAdminChatUser, true);
                document.getElementById('userAvatar').src = currentUser.avatar || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
                document.getElementById('userNameDisplay').innerText = currentUser.login;
                document.getElementById('userRoleDisplay').innerText = getUserRoleName(currentUser);
            }
            if(currentUser.isBanned) { 
                document.getElementById('banView').classList.remove('hidden'); 
                if(currentUser.isDeletedCabinet) document.getElementById('banTitleText').innerText = "Ваш кабинет удален";
                document.getElementById('appView').classList.add('hidden'); document.getElementById('mobHeader').classList.add('hidden'); 
                return; 
            }
            refreshUI(); checkNotifications();
        }
    }, (err) => {
        console.error(err);
        enableAuthButton();
    });

    window.__kitePendingReleases = window.__kitePendingReleases || {};
    function mergePendingReleases(remoteList) {
        const map = {};
        (remoteList || []).forEach(r => { if(r && r.id) map[String(r.id)] = r; });
        Object.keys(window.__kitePendingReleases || {}).forEach(id => {
            const pending = window.__kitePendingReleases[id];
            if(pending && pending.id) map[String(pending.id)] = pending;
        });
        return Object.values(map);
    }

    db.ref('releases').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        appState.releases = mergePendingReleases(Object.values(data));
        if(currentUser) { refreshUI(); checkNotifications(); }
    }, (err) => console.error(err));

    db.ref('chats').on('value', (snapshot) => {
        const data = snapshot.val() || {}; appState.chats = {};
        Object.keys(data).forEach(k => { appState.chats[k] = normalizeChat(data[k]); });
        if(currentUser) {
            if(currentUser.role === 'Administrator' && currentSection === 'adminChats' && activeAdminChatUser) clearArtistChatUnread(activeAdminChatUser, true);
            if(currentUser.role !== 'Administrator' && currentSection === 'userChat' && currentUser.unreadAdminMsg) { currentUser.unreadAdminMsg = false; saveUserDB(currentUser); }
            if(currentSection === 'userChat' || currentSection === 'adminChats') refreshUI();
            checkNotifications();
        }
    }, (err) => console.error(err));


    db.ref('content').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        appState.content = {
            news: normalizeContentItems(data.news),
            guide: normalizeContentItems(data.guide)
        };
        if(currentUser) {
            if(['news','guide'].includes(currentSection)) markContentRead(currentSection, true);
            if(['news','guide','adminContent'].includes(currentSection)) refreshUI();
            checkNotifications();
        }
    }, (err) => console.error(err));

    db.ref('promoLinks').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        appState.promoLinks = Object.values(data);
        if(currentUser && currentSection === 'promoLinks') refreshUI();
    }, (err) => console.error(err));

    db.ref('questionnaires').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        appState.questionnaires = Object.values(data).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
        if(currentUser) {
            if(currentSection === 'questionnaires') renderQuestionnaires();
            updateSidebarCounts();
        }
    }, (err) => console.error(err));

