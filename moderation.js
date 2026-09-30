/* AetherLab module extracted from the former monolithic index.html. */
    function adminSubmitAllDrafts() {
        const drafts = getReleasesVisibleToCurrentUser().filter(r => r.status === 'Черновик' && !r.isDeleted);
        if(drafts.length === 0) return UI.alert("Инфо", "Нет доступных черновиков.");
        UI.confirm(`Вы уверены, что хотите отправить на модерацию все черновики (${drafts.length} шт.)?`, () => {
            drafts.forEach(r => { 
                r.status = 'Модерация'; 
                db.ref('releases/' + r.id).set(r); 
            });
            UI.alert("Успешно", "Черновики отправлены на модерацию.");
            renderAdminReleases(false);
        });
    }

    function admApprove(id) { 
        const r = appState.releases.find(x => x.id === id); 
        const isAlbum = r.type === 'Альбом/EP';

        const step1Fields = [{id:'upc', placeholder:'UPC', value: r.upc || ''}];
        if (!isAlbum) step1Fields.push({id:'isrc', placeholder:'ISRC', value: r.adminIsrc || (r.tracks && r.tracks[0] && r.tracks[0].isrc) || ''});

        UI.prompt(isAlbum ? "Принять релиз (Шаг 1: UPC)" : "Принять релиз", step1Fields, (res1) => { 
            if(res1.upc) r.upc = res1.upc; 
            if(!isAlbum && res1.isrc) { r.adminIsrc = res1.isrc; if(r.tracks && r.tracks.length > 0) r.tracks[0].isrc = res1.isrc; }
            
            if (isAlbum) {
                const trackFields = (r.tracks || []).map((t, i) => ({ id: 'isrc_'+i, label: `ISRC для: ${t.title}`, placeholder: 'ISRC', value: t.isrc || '' }));
                UI.prompt("Принять релиз (Шаг 2: ISRC треков)", trackFields, (res2) => {
                    r.tracks.forEach((t, i) => { if(res2['isrc_'+i]) t.isrc = res2['isrc_'+i]; });
                    finishAdmApprove(r);
                });
            } else { finishAdmApprove(r); }
        }); 
    }

    function finishAdmApprove(r) {
        r.status = 'Одобрен';
        if(typeof aetherAddReleaseHistory==='function') aetherAddReleaseHistory(r,'Релиз принят AetherLab','Модерация завершена. Релиз принят.','moderation');
        if(typeof aetherRecordActivity==='function') aetherRecordActivity('moderation','Релиз принят AetherLab','Модерация завершена успешно.',r); 
        
        if (currentUser.email === ADMIN_EMAIL && r.userEmail === ADMIN_EMAIL) {
            const userOptions = appState.users.filter(u => !u.isDeletedCabinet).map(u => ({v: u.email, t: `${u.login} (${u.email})`}));
            UI.prompt("Кому передать этот релиз?", [{id: 'targetUser', label: 'Выберите кабинет', type: 'select', options: userOptions}], (resTransfer) => {
                r.userEmail = resTransfer.targetUser;
                const targetU = appState.users.find(x => x.email === resTransfer.targetUser);
                if(targetU) r.userId = targetU.id;
                
                db.ref('releases/' + r.id).set(r);
renderAdminReleases(false); 
            });
        } else {
            db.ref('releases/' + r.id).set(r);
renderAdminReleases(false); 
        }
    }

    function admReject(id) {
        if(typeof openReleaseModerationEditor === 'function') return openReleaseModerationEditor(id);
        return UI.alert('Модерация', 'Откройте детальную модерацию релиза.');
    }
    function admDelete(id) { return UI.alert('Недоступно', 'Удаление релизов отключено.'); }
    function admRestore(id) { return UI.alert('Недоступно', 'Удаление релизов отключено.'); }
    function admRevoke(id) { UI.confirm("Отозвать артисту?", () => { const r = appState.releases.find(x => x.id === id); if(!r) return; r.status = 'Черновик'; if(typeof aetherAddReleaseHistory==='function') aetherAddReleaseHistory(r,'Релиз отозван с модерации','Администратор вернул релиз в черновики.','moderation'); if(typeof aetherRecordActivity==='function') aetherRecordActivity('moderation','Релиз отозван с модерации','Релиз возвращён в черновики.',r); db.ref('releases/' + r.id).set(r); renderAdminReleases(false); }); }
    
    function viewReleaseAdmin(id) {
        const r = appState.releases.find(x => String(x.id) === String(id));
        if(!r) return UI.alert('Ошибка', 'Релиз не найден.');
        const coverUrl = r.coverFile || '';
        const tracks = Array.isArray(r.tracks) ? r.tracks : [];
        const safeTitle = escapeHTML(r.title || 'Без названия');
        const safeArtist = escapeHTML(r.artist || '—');
        document.getElementById('admRelCover').src = coverUrl;
        document.getElementById('admCoverDl').onclick = () => {
            if(!coverUrl) return UI.alert('Обложка недоступна', 'У релиза нет загруженной обложки.');
            window.open(coverUrl, '_blank', 'noopener');
        };

        const explicit = tracks.some(t => String(t.explicit || '').toLowerCase() === 'да') ? 'Да' : 'Нет';
        const getTrackAudioUrl = (t) => String((t && (t.audioFile || t.audioUrl || t.fileUrl || t.url)) || '').trim();
        const formatBytes = (bytes) => {
            const n = Number(bytes || 0);
            if(!n) return '—';
            if(n < 1024) return n + ' Б';
            if(n < 1024 * 1024) return (n / 1024).toFixed(1).replace('.0','') + ' КБ';
            return (n / 1024 / 1024).toFixed(1).replace('.0','') + ' МБ';
        };
        const infoRow = (label, value) => `<div class="release-info-box"><div class="release-meta-label">${escapeHTML(label)}</div><div class="release-meta-value">${escapeHTML(value || '—')}</div></div>`;
        const trackDetailRow = (label, value) => `<div class="release-track-detail-row"><span>${escapeHTML(label)}</span><b>${escapeHTML(value || '—')}</b></div>`;
        const ttmlName = (t) => t.ttmlFilename || (t.ttmlFile && t.ttmlFile.name) || (t.ttmlCloudinary && t.ttmlCloudinary.publicId) || '';
        const ttmlExists = (t) => !!(t.ttmlText || t.ttmlFile || t.ttmlContent || t.ttmlUrl || t.ttmlCloudinary || ttmlName(t));

        const tracksHtml = tracks.map((t, idx) => {
            const audioUrl = getTrackAudioUrl(t);
            const trackTitle = t.title || r.title || 'Без названия';
            const trackArtist = t.artist || r.artist || '—';
            const trackAi = formatAiUsage(t.aiUsage || t.aiUsageOptions || t.aiUsageLabels || '');
            return `
            <div class="release-info-track-card release-info-track-card-full">
                <div class="release-info-track-num">${idx + 1}</div>
                <div class="release-info-track-main">
                    <div class="release-info-track-title">${escapeHTML(trackTitle)}</div>
                    <div class="release-info-track-sub">${escapeHTML(trackArtist)}</div>
                    ${trackAi !== 'Нет' ? `<div class="release-info-ai-summary"><strong>Использование ИИ:</strong> ${escapeHTML(trackAi)}</div>` : ''}
                    <div class="release-track-detail-groups">
                        <div class="release-track-detail-group">
                            ${trackDetailRow('Файл', t.filename || '—')}
                            ${trackDetailRow('Длительность', t.duration || '—')}
                        </div>
                        <div class="release-track-detail-group">
                            ${trackDetailRow('Тип трека', t.type || '—')}
                            ${trackDetailRow('Версия', t.version || '—')}
                            ${trackDetailRow('Начало предпрослушивания', t.previewStart ? (t.previewStart + ' сек.') : '—')}
                            ${trackDetailRow('ISRC', t.isrc || '—')}
                        </div>
                        <div class="release-track-detail-group">
                            ${trackDetailRow('Язык', t.lang || '—')}
                            ${trackDetailRow('Нецензурная лексика', t.explicit || 'Нет')}
                        </div>
                        <div class="release-track-detail-group">
                            ${trackDetailRow('Автор слов', t.author || '—')}
                            ${trackDetailRow('Автор музыки', t.comp || '—')}
                        </div>
                        <div class="release-track-detail-group">
                            ${trackDetailRow('Обычный текст', (t.lyrics || '').trim() ? 'Добавлен' : 'Не добавлен')}
                            ${trackDetailRow('Караоке TTML', ttmlExists(t) ? 'Добавлен' : 'Не добавлен')}
                        </div>
                    </div>
                    ${(t.lyrics || '').trim() ? `<details class="release-info-details"><summary>Показать текст трека</summary><pre>${escapeHTML(t.lyrics)}</pre></details>` : ''}
                    ${audioUrl ? `
                        <div style="margin-top:12px;">
                            <audio controls preload="metadata" data-title="${escapeAttr(trackArtist)} — ${escapeAttr(trackTitle)}" src="${escapeAttr(audioUrl)}"></audio>
                            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
                                <button class="btn-outline" style="padding:8px 12px;font-size:12px;" onclick="downloadTrackFile('${escapeAttr(r.id)}', ${idx})">Скачать аудио</button>
                            </div>
                        </div>
                    ` : `<div class="empty-panel" style="padding:14px;box-shadow:none;margin-top:12px;">Аудиофайл для этого трека не найден.</div>`}
                </div>
            </div>`;
        }).join('') || '<div class="empty-panel">Трек-лист пока пуст.</div>';

        const moderatorComment = (r.comment || '').trim();
        const personEntries = [];
        const addPersonRole = (name, role, badgeClass) => {
            const cleanName = String(name || '').trim();
            if(!cleanName) return;
            const key = `${cleanName.toLowerCase()}__${String(role || '').toLowerCase()}`;
            if(personEntries.some(item => item.key === key)) return;
            personEntries.push({ key, name: cleanName, role, badgeClass });
        };
        addPersonRole(r.artist || '', 'Исполнитель', 'badge-ok');
        tracks.forEach(t => {
            addPersonRole(t.author || '', 'Автор', 'badge-amber');
            addPersonRole(t.comp || '', 'Композитор', 'badge-amber');
        });
        const personsHtml = personEntries.length
            ? personEntries.map(person => `<div class="release-info-person-chip"><span>${escapeHTML(person.name)}</span><span class="badge ${person.badgeClass}">${escapeHTML(person.role)}</span></div>`).join('')
            : '<div class="text-sm">Информация о ролях не указана.</div>';
        const releaseOwner = currentUser && currentUser.role === 'Administrator'
            ? `<div class="release-info-box"><div class="release-meta-label">Кабинет артиста</div><div class="release-meta-value">${escapeHTML(r.userEmail || '—')}</div></div>`
            : '';
        document.getElementById('admRelInfo').innerHTML = `
            <div class="release-info-modern">
                <div class="release-info-hero">
                    <img src="${coverUrl}" class="release-info-cover-big" alt="Обложка">
                    <div>
                        <div class="release-info-eyebrow">Данные релиза</div>
                        <h2>${safeTitle}</h2>
                        <p>${safeArtist}</p>
                    </div>
                </div>
                <div class="release-info-grid-modern">
                    ${releaseOwner}
                    ${infoRow('Формат релиза', r.type || '—')}
                    ${infoRow('Дата релиза', formatReleaseDate(r.releaseDate))}
                    ${infoRow('Оригинальная дата релиза', formatReleaseDate(r.originalReleaseDate))}
                    ${infoRow('Год', r.year || '—')}
                    ${infoRow('Жанр', r.genre || '—')}
                    ${infoRow('UPC', r.upc || '—')}
                    ${infoRow('Использование ИИ в обложке', r.aiCoverUsed ? 'Да' : 'Нет')}
                    ${infoRow('Статус', r.status || '—')}
                    ${infoRow('Дата создания', r.date || '—')}
                </div>
                <div class="release-info-section">
                    <h3>Комментарий для модератора</h3>
                    <div class="release-info-comment">${moderatorComment ? escapeHTML(moderatorComment) : 'Комментарий не указан.'}</div>
                </div>
            </div>`;
        const admRelTracksBox = document.getElementById('admRelTracks');
        admRelTracksBox.innerHTML = tracksHtml;
        document.getElementById('adminReleaseModal').classList.remove('hidden');
        if(typeof aetherUpgradeAllAudioPlayers === 'function') setTimeout(() => aetherUpgradeAllAudioPlayers(document.getElementById('adminReleaseModal')), 0);
    }


    
