/* AetherLab module extracted from the former monolithic index.html. */
    /* ===== Label questionnaires ===== */
    function openQuestionnaireForm() {
        authMode = 'login';
        const auth = document.getElementById('authView');
        const q = document.getElementById('questionnaireView');
        if(auth) auth.classList.add('hidden');
        if(q) q.classList.remove('hidden');
        ['qArtistName','qFirstName','qLastName','qSocialLinks','qMusicLinks','qArtistDescription','qWhyAetherLab','qEmail','qTelegram'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.remove('error-field');
        });

    }
    function closeQuestionnaireForm() {
        const q = document.getElementById('questionnaireView');
        const auth = document.getElementById('authView');
        if(q) q.classList.add('hidden');
        if(auth) auth.classList.remove('hidden');
    }
    function showQuestionnaireCheck() {
        UI.alert('Проверка анкеты', 'Проверьте свою электронную почту, которую вы указывали при заполнении анкеты. Также не забывайте проверить спам, ведь письмо с ответом может попасть туда.');
    }
    function getQuestionnaireStatusClass(status) {
        const st = String(status || '').toLowerCase();
        if(st.includes('прин')) return 'accepted';
        if(st.includes('отк')) return 'rejected';
        return 'pending';
    }
    function getQuestionnaireStatusText(status) {
        return status || 'На проверке';
    }
    async function submitQuestionnaire() {
        const artistNameEl = document.getElementById('qArtistName');
        const firstNameEl = document.getElementById('qFirstName');
        const lastNameEl = document.getElementById('qLastName');
        const socialLinksEl = document.getElementById('qSocialLinks');
        const musicLinksEl = document.getElementById('qMusicLinks');
        const artistDescriptionEl = document.getElementById('qArtistDescription');
        const whyAetherLabEl = document.getElementById('qWhyAetherLab');
        const emailEl = document.getElementById('qEmail');
        const telegramEl = document.getElementById('qTelegram');
        const fields = [artistNameEl, firstNameEl, lastNameEl, socialLinksEl, musicLinksEl, artistDescriptionEl, whyAetherLabEl, emailEl, telegramEl];
        fields.forEach(el => el && el.classList.remove('error-field'));
        const artistName = (artistNameEl?.value || '').trim();
        const firstName = (firstNameEl?.value || '').trim();
        const lastName = (lastNameEl?.value || '').trim();
        const socialLinks = (socialLinksEl?.value || '').trim();
        const musicLinks = (musicLinksEl?.value || '').trim();
        const artistDescription = (artistDescriptionEl?.value || '').trim();
        const whyAetherLab = (whyAetherLabEl?.value || '').trim();
        const email = (emailEl?.value || '').toLowerCase().trim();
        const telegram = (telegramEl?.value || '').trim();
        let hasError = false;
        if(!artistName) { artistNameEl && artistNameEl.classList.add('error-field'); hasError = true; }
        if(!firstName) { firstNameEl && firstNameEl.classList.add('error-field'); hasError = true; }
        if(!lastName) { lastNameEl && lastNameEl.classList.add('error-field'); hasError = true; }
        if(!socialLinks) { socialLinksEl && socialLinksEl.classList.add('error-field'); hasError = true; }
        if(!musicLinks) { musicLinksEl && musicLinksEl.classList.add('error-field'); hasError = true; }
        if(!artistDescription) { artistDescriptionEl && artistDescriptionEl.classList.add('error-field'); hasError = true; }
        if(!whyAetherLab) { whyAetherLabEl && whyAetherLabEl.classList.add('error-field'); hasError = true; }
        if(!email || !email.includes('@')) { emailEl && emailEl.classList.add('error-field'); hasError = true; }
        if(!telegram) { telegramEl && telegramEl.classList.add('error-field'); hasError = true; }
        if(hasError) return UI.alert('Ошибка', 'Заполните все обязательные поля анкеты.' );

        const btn = event && event.target ? event.target : null;
        const oldText = btn ? btn.innerText : '';
        if(btn) { btn.disabled = true; btn.innerText = 'Отправка...'; }
        const id = 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const item = { id, artistName, firstName, lastName, socialLinks, musicLinks, artistDescription, whyAetherLab, email, telegram, description: artistDescription, status: 'На проверке', createdAt: Date.now(), updatedAt: Date.now() };
        try {
            appState.questionnaires = [item].concat((appState.questionnaires || []).filter(q => q.id !== id));
            await db.ref('questionnaires/' + id).set(item);
            closeQuestionnaireForm();
            fields.forEach(el => { if(el) el.value = ''; });
            UI.alert('Анкета отправлена', 'Спасибо! Ваша анкета отправлена на рассмотрение. Проверьте электронную почту, которую вы указали при заполнении анкеты.');
        } catch (err) {
            console.error(err);
            UI.alert('Ошибка', 'Не удалось отправить анкету. Проверьте подключение к интернету и попробуйте ещё раз.');
        } finally {
            if(btn) { btn.disabled = false; btn.innerText = oldText || 'Отправить анкету'; }
        }
    }

    function renderQuestionnaires() {
        const area = document.getElementById('questionnairesList');
        if(!area) return;
        const list = (appState.questionnaires || []).slice().sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
        const countEl = document.getElementById('questionnairesCount');
        if(countEl) countEl.innerText = String(list.filter(q => (q.status || 'На проверке') === 'На проверке').length || list.length || 0);
        if(!list.length) {
            area.innerHTML = '<div class="empty-panel">Пока нет отправленных анкет.</div>';
            return;
        }
        area.innerHTML = list.map(q => {
            const status = getQuestionnaireStatusText(q.status);
            const cls = getQuestionnaireStatusClass(status);
            const created = q.createdAt ? new Date(q.createdAt).toLocaleString('ru-RU') : '—';
            return `<div class="questionnaire-card" onclick="openQuestionnaireDetails('${escapeAttr(q.id)}')">
                <div class="questionnaire-card-head">
                    <div>
                        <div class="questionnaire-name">${escapeHTML(q.artistName || ((q.firstName || '') + ' ' + (q.lastName || '')).trim() || 'Артист')}</div>
                        <div class="questionnaire-email">${escapeHTML(q.email || '—')}</div>
                        <div class="text-sm" style="margin-top:4px;">Отправлена: ${escapeHTML(created)}</div>
                    </div>
                    <span class="questionnaire-status ${cls}">${escapeHTML(status)}</span>
                </div>
                <div class="questionnaire-desc-preview">${escapeHTML(q.artistDescription || q.description || '')}</div>
            </div>`;
        }).join('');
    }
    function openQuestionnaireDetails(id) {
        const q = (appState.questionnaires || []).find(item => String(item.id) === String(id));
        if(!q) return UI.alert('Ошибка', 'Анкета не найдена.');
        const existing = document.getElementById('questionnaireDetailModal');
        if(existing) existing.remove();
        const status = getQuestionnaireStatusText(q.status);
        const cls = getQuestionnaireStatusClass(status);
        const created = q.createdAt ? new Date(q.createdAt).toLocaleString('ru-RU') : '—';
        document.body.insertAdjacentHTML('beforeend', `<div id="questionnaireDetailModal" class="overlay" style="z-index:10004; padding:24px; overflow-y:auto; align-items:flex-start;">
            <button type="button" class="kite-modal-close" onclick="closeQuestionnaireDetails()" aria-label="Закрыть">×</button>
            <div class="dialog questionnaire-dialog" style="margin:auto;">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px;">
                    <div>
                        <h2 style="margin:0 0 8px;font-size:26px;font-weight:800;">Анкета артиста</h2>
                        <span class="questionnaire-status ${cls}">${escapeHTML(status)}</span>
                    </div>
                </div>
                <div class="questionnaire-detail-grid">
                    <div class="questionnaire-detail-box"><span>Псевдоним</span><strong>${escapeHTML(q.artistName || '—')}</strong></div>
                    <div class="questionnaire-detail-box"><span>Имя</span><strong>${escapeHTML(q.firstName || '—')}</strong></div>
                    <div class="questionnaire-detail-box"><span>Фамилия</span><strong>${escapeHTML(q.lastName || '—')}</strong></div>
                    <div class="questionnaire-detail-box"><span>Почта</span><strong>${escapeHTML(q.email || '—')}</strong></div>
                    <div class="questionnaire-detail-box"><span>Telegram</span><strong>${escapeHTML(q.telegram || '—')}</strong></div>
                    <div class="questionnaire-detail-box"><span>Дата отправки</span><strong>${escapeHTML(created)}</strong></div>
                </div>
                <div class="questionnaire-detail-box" style="margin-bottom:18px;"><span>Соц.сети</span><strong style="white-space:pre-wrap;font-weight:600;line-height:1.6;">${escapeHTML(q.socialLinks || '—')}</strong></div>
                <div class="questionnaire-detail-box" style="margin-bottom:18px;"><span>Музыкальные платформы</span><strong style="white-space:pre-wrap;font-weight:600;line-height:1.6;">${escapeHTML(q.musicLinks || '—')}</strong></div>
                <div class="questionnaire-detail-box" style="margin-bottom:18px;"><span>Описание артиста</span><strong style="white-space:pre-wrap;font-weight:600;line-height:1.6;">${escapeHTML(q.artistDescription || q.description || '—')}</strong></div>
                <div class="questionnaire-detail-box" style="margin-bottom:18px;"><span>Почему AetherLab</span><strong style="white-space:pre-wrap;font-weight:600;line-height:1.6;">${escapeHTML(q.whyAetherLab || '—')}</strong></div>
                <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end;">
                    <button class="btn-danger" onclick="setQuestionnaireStatus('${escapeAttr(q.id)}','Отклонена')">Отклонить</button>
                    <button class="btn-success" onclick="openQuestionnaireCabinetDialog('${escapeAttr(q.id)}')">Принять</button>
                </div>
            </div>
        </div>`);
    }
    function closeQuestionnaireDetails(){
        const modal = document.getElementById('questionnaireDetailModal');
        if(modal) modal.remove();
    }

    function generateAetherLabPassword(length = 16) {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?';
        const randomValues = new Uint32Array(length);
        if(window.crypto && crypto.getRandomValues) crypto.getRandomValues(randomValues);
        else for(let i = 0; i < length; i++) randomValues[i] = Math.floor(Math.random() * alphabet.length);
        let password = '';
        for(let i = 0; i < length; i++) password += alphabet[randomValues[i] % alphabet.length];
        return password;
    }
    function openQuestionnaireCabinetDialog(id) {
        const q = (appState.questionnaires || []).find(item => String(item.id) === String(id));
        if(!q) return UI.alert('Ошибка', 'Анкета не найдена.');
        const fullName = (q.artistName || `${(q.firstName || '').trim()} ${(q.lastName || '').trim()}`.trim() || 'Новый артист').trim();
        const email = String(q.email || '').toLowerCase().trim();
        if(!email || !email.includes('@')) return UI.alert('Ошибка', 'В анкете указана некорректная почта.');
        if(appState.users.find(x => String(x.email || '').toLowerCase() === email)) {
            return UI.alert('Кабинет уже существует', 'Кабинет с этой почтой уже есть в разделе «Кабинеты».');
        }
        closeQuestionnaireDetails();
        UI.prompt('Открытие кабинета: Артист', [
            {id: 'login', label: 'Логин', placeholder: 'Введите логин', value: fullName},
            {id: 'email', label: 'Почта', type: 'email', placeholder: 'Введите почту', value: email},
            {id: 'pass', label: 'Пароль', placeholder: 'Введите пароль', value: generateAetherLabPassword()}
        ], async (userData) => {
            const login = String(userData.login || '').trim();
            const userEmail = String(userData.email || '').toLowerCase().trim();
            const pass = String(userData.pass || '').trim();
            if(!login || !userEmail || !userEmail.includes('@') || !pass) return UI.alert('Ошибка', 'Заполните логин, почту и пароль.');
            if(appState.users.find(x => String(x.email || '').toLowerCase() === userEmail)) return UI.alert('Ошибка', 'Почта уже занята.');
            if(appState.users.find(x => String(x.login || '').trim().toLowerCase() === login.toLowerCase() && !x.isDeletedCabinet)) return UI.alert('Ошибка', 'Логин уже занят.');
            const newUser = {
                id: 'u' + Date.now(),
                login,
                email: userEmail,
                pass,
                role: 'Artist',
                createdByAdminId: currentUser && currentUser.id ? String(currentUser.id) : '',
                createdByAdminEmail: currentUser && currentUser.email ? String(currentUser.email).toLowerCase().trim() : '',
                createdByAdminLogin: currentUser && currentUser.login ? String(currentUser.login) : '',
                passwordHistory: [{pass, date: new Date().toLocaleString()}],
                isBanned: false,
                banReason: '',
                unreadAdminMsg: false,
                unreadArtistChats: {},
                readContent: {},
                avatar: '',
                isDeletedCabinet: false,
                mustChangePassword: true,
                passwordChangedOnFirstLogin: false,
                createdFromQuestionnaire: q.id,
                createdAt: Date.now()
            };
            q.status = 'Принята';
            q.updatedAt = Date.now();
            q.reviewedBy = currentUser ? currentUser.email : '';
            q.createdCabinetId = newUser.id;
            try {
                appState.users.push(newUser);
                await db.ref('users/' + newUser.id).set(newUser);
                await db.ref('questionnaires/' + q.id).set(q);
                try{ if(typeof aetherRecordActivity==='function') aetherRecordActivity('user','Создан новый пользователь',`Создан кабинет ${login} (${userEmail}) из анкеты.`,null,{userEmail:userEmail,targetUserId:newUser.id}); }catch(e){}
                renderQuestionnaires();
                if(currentSection === 'adminUsers') renderAdminUsers();
                UI.alert('Кабинет открыт', `Анкета принята, кабинет артиста создан.<br><br><b>Логин:</b> ${escapeHTML(login)}<br><b>Почта:</b> ${escapeHTML(userEmail)}<br><b>Пароль:</b> <code>${escapeHTML(pass)}</code>`);
            } catch(err) {
                console.error(err);
                appState.users = appState.users.filter(u => u.id !== newUser.id);
                UI.alert('Ошибка', 'Не удалось создать кабинет. Проверьте подключение к Firebase и попробуйте ещё раз.');
            }
        });
    }
    async function setQuestionnaireStatus(id, status) {
        const q = (appState.questionnaires || []).find(item => String(item.id) === String(id));
        if(!q) return UI.alert('Ошибка', 'Анкета не найдена.');
        q.status = status;
        q.updatedAt = Date.now();
        q.reviewedBy = currentUser ? currentUser.email : '';
        try {
            await db.ref('questionnaires/' + q.id).set(q);
            closeQuestionnaireDetails();
            renderQuestionnaires();
            UI.alert('Готово', status === 'Принята' ? 'Анкета принята.' : 'Анкета отклонена.');
        } catch(err) {
            console.error(err);
            UI.alert('Ошибка', 'Не удалось изменить статус анкеты.');
        }
    }

    document.addEventListener('DOMContentLoaded', restoreAetherLabSession);
    window.addEventListener('pageshow', () => { if(!currentUser) restoreAetherLabSession(); });



