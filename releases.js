/* AetherLab module extracted from the former monolithic index.html. */
    async function saveDraftAsIs(showSuccess = false) {
        if(window.__kiteSaveDraftBusy) return;
        const finalId = currentDraftId || Date.now().toString();
        const existingRelease = appState.releases.find(r => String(r.id) === String(finalId)) || null;
        const draftBtn = document.getElementById('saveDraftChangesBtn');
        const oldDraftText = draftBtn ? draftBtn.innerText : '';
        window.__kiteSaveDraftBusy = true;
        if(draftBtn) { draftBtn.disabled = true; draftBtn.innerText = 'Загружаем файлы...'; }

        try {
            await ensureReleaseFilesUploaded(finalId);

            const preserveExisting = !!existingRelease;
            const releaseData = buildReleaseDataForDatabase({ 
                id: finalId, 
                userId: preserveExisting ? (existingRelease.userId || currentUser.id) : currentUser.id,
                userEmail: preserveExisting ? (existingRelease.userEmail || currentUser.email) : currentUser.email,
                type: document.getElementById('r_type').value, 
                title: document.getElementById('r_title').value || 'Без названия', 
                artist: getMultiVal('r_artist_container') || currentUser.login, 
                genre: document.getElementById('r_genre').value, 
                year: document.getElementById('r_year').value, 
                releaseDate: document.getElementById('r_releaseDate').value, 
                originalReleaseDate: document.getElementById('r_originalReleaseDate') ? document.getElementById('r_originalReleaseDate').value : '',
                upc: document.getElementById('r_upc').value, 
                comment: document.getElementById('r_comment').value, 
                status: preserveExisting ? (existingRelease.status || 'Черновик') : 'Черновик',
                date: preserveExisting ? (existingRelease.date || new Date().toLocaleDateString()) : new Date().toLocaleDateString(),
                coverFile: draftRelease.coverFile, 
                coverTechnical: draftRelease.coverTechnical || (existingRelease && existingRelease.coverTechnical) || null,
                aiCoverUsed: !!((document.getElementById('r_cover_ai') && document.getElementById('r_cover_ai').checked) || draftRelease.aiCoverUsed),
                coverCloudinary: draftRelease.coverCloudinary || (existingRelease && existingRelease.coverCloudinary) || null,
                tracks: draftRelease.tracks, 
                isDeleted: preserveExisting ? !!existingRelease.isDeleted : false,
                adminIsrc: preserveExisting ? (existingRelease.adminIsrc || '') : '',
                rejectReason: preserveExisting ? (existingRelease.rejectReason || '') : '',
                moderation: preserveExisting ? (existingRelease.moderation || null) : null,
                distribution: preserveExisting ? (existingRelease.distribution || null) : null,
                history: preserveExisting ? (existingRelease.history || []) : []
            });
            if(typeof aetherPrepareReleaseHistory === 'function') aetherPrepareReleaseHistory(existingRelease, releaseData, preserveExisting ? 'draft_saved' : 'draft_created');

            currentDraftId = finalId; 
            isDraftDirty = false;
            const localIndex = appState.releases.findIndex(r => String(r.id) === String(finalId));
            if(localIndex >= 0) appState.releases[localIndex] = releaseData; else appState.releases.push(releaseData);
            refreshUI();

            await db.ref('releases/' + finalId).set(releaseData);
            if(showSuccess) UI.alert("Успешно", preserveExisting ? "Изменения сохранены." : "Черновик сохранён.");
        } catch(err) {
            console.error(err);
            UI.alert("Ошибка загрузки", `Файлы не удалось загрузить/сохранить: ${escapeHTML(err.message || err)}.`);
        } finally {
            if(draftBtn) { draftBtn.disabled = false; draftBtn.innerText = oldDraftText || 'Сохранить как черновик'; }
            window.__kiteSaveDraftBusy = false;
        }
    }

    function startNewRelease() {
        const rejectBox = document.getElementById('editRejectReasonBox');
        if(rejectBox) { rejectBox.classList.add('hidden'); rejectBox.innerHTML = ''; }
        draftRelease = { coverFile: null, coverTechnical: null, tracks: [], aiCoverUsed: false }; 
        setCoverAiUsed(false);
        const coverTech = document.getElementById('coverTechnicalCheck'); if(coverTech){ coverTech.classList.add('hidden'); coverTech.innerHTML=''; }
        if(typeof aetherClearModerationInlineIssues === 'function') aetherClearModerationInlineIssues();
        window.editingOriginalReleaseForComment = null;
        currentDraftId = null; 
        isDraftDirty = false; 
        document.querySelectorAll('.error-field').forEach(el => el.classList.remove('error-field'));
        ['r_type','r_title','r_genre','r_upc','r_releaseDate','r_originalReleaseDate','r_comment'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
        setMultiVal('r_artist_container', currentUser.login, 'Артист');
        
        document.getElementById('coverPreview').src = ''; 
        document.getElementById('coverPreview').classList.add('hidden'); 
        document.getElementById('coverHint').classList.remove('hidden'); 
        
        document.getElementById('submitReleaseBtn').innerText = "Отправить релиз на модерацию";
        
        const draftBtn = document.getElementById('saveDraftChangesBtn');
        draftBtn.classList.remove('hidden');
        draftBtn.innerText = "Сохранить как черновик";
        
        renderDraftTracks(); 
        toggleReleaseType(); 
        refreshCustomSelectLabels();
        nav('newRelease', true);
    }

    function editDraft(id) {
        const r = appState.releases.find(x => x.id === id); 
        const rejectBox = document.getElementById('editRejectReasonBox');
        if(rejectBox) {
            if(r && r.status === 'Отклонён') {
                rejectBox.classList.remove('hidden');
                rejectBox.innerHTML = `<strong>Требуются исправления:</strong><br>${typeof aetherRenderModerationIssues === 'function' ? aetherRenderModerationIssues(r) : escapeHTML(r.rejectReason || 'Причина не указана')}`;
            } else {
                rejectBox.classList.add('hidden');
                rejectBox.innerHTML = '';
            }
        }
        currentDraftId = id; 
        window.editingOriginalReleaseForComment = JSON.parse(JSON.stringify(r || {}));
        bindReleaseChangeCommentWatcher();
        isDraftDirty = false; 
        document.querySelectorAll('.error-field').forEach(el => el.classList.remove('error-field'));
        
        draftRelease.coverFile = r.coverFile; 
        draftRelease.coverTechnical = r.coverTechnical || null;
        draftRelease.aiCoverUsed = !!(r.aiCoverUsed || r.coverAiUsed || r.coverAIUsed);
        setCoverAiUsed(draftRelease.aiCoverUsed);
        draftRelease.tracks = r.tracks || [];
        
        ['type','title','genre','year','upc','releaseDate','originalReleaseDate','comment'].forEach(key => { 
            document.getElementById('r_'+key).value = (key==='title' && r.title==='Без названия') ? '' : (r[key] || ''); 
        });
        
        setMultiVal('r_artist_container', r.artist || '', 'Артист');
        if(r && r.status === 'Отклонён' && currentUser.role !== 'Administrator') setTimeout(updateReleaseChangeComment, 0);

        if(r.coverFile) { 
            document.getElementById('coverPreview').src = r.coverFile; 
            document.getElementById('coverPreview').classList.remove('hidden'); 
            document.getElementById('coverHint').classList.add('hidden'); 
        } else { 
            document.getElementById('coverPreview').classList.add('hidden'); 
            document.getElementById('coverHint').classList.remove('hidden'); 
        }
        const coverTech = document.getElementById('coverTechnicalCheck');
        if(r.coverTechnical && typeof aetherRenderArtworkTechnicalData === 'function') aetherRenderArtworkTechnicalData(r.coverTechnical);
        else if(coverTech) { coverTech.classList.add('hidden'); coverTech.innerHTML=''; }
        if(typeof aetherApplyModerationIssuesToReleaseForm === 'function') setTimeout(() => aetherApplyModerationIssuesToReleaseForm(r), 0);
        
        document.getElementById('submitReleaseBtn').innerText = currentUser.role === 'Administrator' ? "Отправить на модерацию" : (r.status === 'Отклонён' ? "Отправить исправленный релиз на модерацию" : "Отправить релиз на модерацию");
        
        const draftBtn = document.getElementById('saveDraftChangesBtn');
        if (r.status === 'Черновик') { 
            draftBtn.classList.remove('hidden');
            draftBtn.innerText = "Сохранить изменения";
        } else { 
            draftBtn.classList.add('hidden'); 
        }
        
        renderDraftTracks(); 
        toggleReleaseType(); 
        refreshCustomSelectLabels();
        nav('newRelease', true);
    }
    
    function deleteDraft(id) { UI.confirm("Удалить этот черновик навсегда?", () => { const idx = appState.releases.findIndex(r => r.id === id); if(idx>=0){ appState.releases.splice(idx,1); db.ref('releases/'+id).remove(); } renderCatalog(); }); }
    function handleCoverUpload(input) {
        const file = input.files[0];
        if(!file) return;
        const maxCoverSize = 10 * 1024 * 1024;
        if(file.size > maxCoverSize) {
            input.value = "";
            UI.alert("Ошибка", "Обложка не должна быть больше 10 МБ.");
            return;
        }
        const img = new Image();
        const localUrl = URL.createObjectURL(file);
        img.src = localUrl;
        img.onload = () => { 
            if(typeof aetherRenderArtworkTechnicalCheck === 'function') aetherRenderArtworkTechnicalCheck(file, img.width, img.height).then(q => { if(q) draftRelease.coverTechnical = q; }).catch(()=>{});
            if(img.width === 3000 && img.height === 3000) { 
                document.getElementById('r_cover_box').classList.remove('error-field');
                draftRelease.coverFile = localUrl;
                draftRelease.coverObjectUrl = localUrl;
                draftRelease._coverFileObj = file;
                draftRelease.coverUploadError = '';
                isDraftDirty = true;
                const preview = document.getElementById('coverPreview');
                const hint = document.getElementById('coverHint');
                preview.src = localUrl;
                preview.classList.remove('hidden');
                hint.classList.remove('hidden');
                hint.innerHTML = 'Загрузка обложки...';

                draftRelease._coverUploadPromise = uploadFileToCloudinary(file, file.name).then(meta => {
                    draftRelease.coverFile = meta.url;
                    draftRelease.coverCloudinary = meta;
                    draftRelease.coverUploadError = '';
                    preview.src = meta.url;
                    hint.classList.add('hidden');
                    return meta;
                }).catch(err => {
                    console.error(err);
                    draftRelease.coverUploadError = err.message || 'Ошибка загрузки';
                    hint.classList.remove('hidden');
                    hint.innerHTML = 'Ошибка загрузки<br>нажмите, чтобы выбрать заново';
                    return null;
                });
            } else {
                URL.revokeObjectURL(localUrl);
                UI.alert("Ошибка", "Размер обложки должен быть только 3000x3000 px");
                input.value = "";
            } 
        };
    }
    function toggleReleaseType() { const type = document.getElementById('r_type').value; if(type) document.getElementById('tracklistArea').classList.remove('hidden'); else document.getElementById('tracklistArea').classList.add('hidden'); }

    function isAllowedWavFile(file) {
        if(!file) return false;
        const nameOk = /\.wav$/i.test(file.name || '');
        const typeOk = /^(audio\/(wav|wave|x-wav|vnd\.wave))$/i.test(file.type || '');
        return nameOk || typeOk;
    }
    function showWrongAudioFormatError(input) {
        if(input) input.value = '';
        UI.alert('Ошибка', 'не тот формат аудиофайла.');
    }
    function addTracks(input) {
        const files = Array.from(input.files); if(!files.length) return;
        const rType = document.getElementById('r_type').value; const rTitle = document.getElementById('r_title').value.trim(); const rArtist = getMultiVal('r_artist_container');
        files.forEach(file => { 
            if(!isAllowedWavFile(file)) return showWrongAudioFormatError(input);
            if(file.size > 50*1024*1024) return UI.alert("Ошибка", `Файл ${file.name} больше 50 МБ.`); 

            isDraftDirty = true; 
            let trackTitle = file.name.replace(/\.[^/.]+$/, "");
            if (rType === 'Сингл' && rTitle) trackTitle = rTitle;
            const localAudioUrl = URL.createObjectURL(file);
            const newTrack = {
                id: Date.now()+Math.random(),
                filename: file.name,
                audioFile: localAudioUrl,
                audioObjectUrl: localAudioUrl,
                title: trackTitle,
                artist: rArtist,
                version: '',
                author: '',
                comp: '',
                type: 'Original',
                lang: '',
                lyrics: '',
                explicit: 'Нет',
                isrc: '',
                previewStart: '',
                aiUsage: [],
                aiProofSubscription: '',
                aiProofText: '',
                duration: '',
                isFilled: false,
                cloudinaryPending: true,
                cloudinaryError: ''
            };
            newTrack._audioFileObj = file;
            draftRelease.tracks.push(newTrack);
            if(typeof aetherInspectWavFile === 'function') {
                aetherInspectWavFile(file).then(info => {
                    newTrack.audioTechnical = info;
                    renderDraftTracks();
                    if(String(editTrackId) === String(newTrack.id) && typeof aetherRenderTrackTechnicalCheck === 'function') aetherRenderTrackTechnicalCheck(newTrack);
                }).catch(()=>{});
            }

            const audio = new Audio();
            audio.preload = 'metadata';
            audio.onloadedmetadata = () => {
                if(Number.isFinite(audio.duration) && audio.duration > 0) newTrack.duration = formatAudioDuration(audio.duration);
                renderDraftTracks();
                audio.src = '';
            };
            audio.onerror = () => { audio.src = ''; };
            audio.src = localAudioUrl;
            renderDraftTracks();

            newTrack._uploadPromise = uploadFileToCloudinary(file, file.name).then(meta => {
                newTrack.audioFile = meta.url;
                newTrack.audioCloudinary = meta;
                newTrack.cloudinaryPending = false;
                newTrack.cloudinaryError = '';
                renderDraftTracks();
                return meta;
            }).catch(err => {
                console.error(err);
                newTrack.cloudinaryPending = false;
                newTrack.cloudinaryError = err.message || 'Ошибка загрузки';
                renderDraftTracks();
                return null;
            });
        });
        input.value = ""; 
    }
    function renderDraftTracks() {
        const list = document.getElementById('draftTracksList');
        list.innerHTML = draftRelease.tracks.map((t, idx) => {
            const filledLabel = t.isFilled ? '<span style="color:var(--success); font-size: 11px;">✓ Заполнено</span>' : '<span style="color:var(--danger); font-size: 11px; font-weight:bold;">! Требует заполнения</span>';
            const uploadLabel = t.cloudinaryPending ? '<span style="color:var(--warning); font-size: 11px; font-weight:bold;">⏳ Загружается файл</span>' : (t.cloudinaryError ? `<span style="color:var(--danger); font-size: 11px; font-weight:bold;">Ошибка Cloudinary: ${escapeHTML(t.cloudinaryError)}</span>` : '<span style="color:var(--success); font-size: 11px;">✓ Файл загружен</span>');
            const statusLabel = `${filledLabel} &nbsp; ${uploadLabel}`;
            const title = escapeHTML(t.title || 'Без названия');
            const filename = escapeHTML(t.filename || 'Аудиофайл');
            const audio = t.audioFile ? `<div style="margin-top:12px;"><audio controls preload="metadata" data-title="${filename}" src="${t.audioFile}"></audio></div>` : '';
            const tech = typeof aetherTrackTechChipsHTML === 'function' ? aetherTrackTechChipsHTML(t) : '';
            return `<div class="track-list-item" style="${!t.isFilled ? 'border-color: var(--danger);' : ''}"><div style="flex:1;min-width:0;"><div style="font-weight: 500; font-size: 15px;">${idx+1}. ${title}</div><div class="text-sm" style="margin-top:4px;">${filename} &nbsp;|&nbsp; ${statusLabel}</div>${tech}${audio}</div><div style="display: flex; gap: 8px; flex-wrap:wrap;"><button class="btn-outline" style="padding: 6px 12px; font-size: 12px;" onclick="openTrackEdit(${t.id})">Редактировать</button><button class="btn-danger" style="padding: 6px 12px; font-size: 12px;" onclick="removeDraftTrack(${t.id})">Удалить</button></div></div>`;
        }).join('');
        if(typeof aetherUpgradeAllAudioPlayers === 'function') aetherUpgradeAllAudioPlayers(list);
        const editingRelease = appState.releases.find(r => String(r.id) === String(currentDraftId));
        if(editingRelease && editingRelease.status === 'Отклонён' && typeof aetherApplyModerationIssuesToReleaseForm === 'function') setTimeout(() => aetherApplyModerationIssuesToReleaseForm(editingRelease), 0);
    }
    function removeDraftTrack(id) { draftRelease.tracks = draftRelease.tracks.filter(t => t.id !== id); isDraftDirty = true; renderDraftTracks(); }
    
    function openTrackEdit(id) {
        const t = draftRelease.tracks.find(x => x.id === id); editTrackId = id; document.querySelectorAll('.error-field').forEach(el => el.classList.remove('error-field'));
        ['title','version','lang','lyrics','explicit','isrc','previewStart'].forEach(k => { const el = document.getElementById('t_'+k); if(el) el.value = t[k] || ''; }); 
        setTrackTypeValue(t.type || 'Original');
        const ttmlNameEl = document.getElementById('t_ttml_name');
        if(ttmlNameEl) ttmlNameEl.textContent = t.ttmlName || (t.ttmlText || t.ttmlFile || t.ttmlContent ? 'TTML-файл добавлен' : 'Файл не выбран');
        const ttmlInput = document.getElementById('t_ttml_file');
        if(ttmlInput) ttmlInput.value = '';
        document.getElementById('te_filename').innerText = t.filename;
        setAiUsageChecked('trackAiUsageBox', t.aiUsage || t.aiUsageOptions || t.aiUsageLabels || []);
        if(typeof window.setTrackAiProofValues === 'function') {
            window.setTrackAiProofValues(t.aiProofSubscription || t.aiSubscriptionProof || '', t.aiProofText || t.aiTextProof || '');
        } else {
            const subProof = document.getElementById('t_ai_proof_subscription');
            const textProof = document.getElementById('t_ai_proof_text');
            if(subProof) subProof.value = t.aiProofSubscription || t.aiSubscriptionProof || '';
            if(textProof) textProof.value = t.aiProofText || t.aiTextProof || '';
        }
        if(typeof window.refreshTrackAiProofFields === 'function') window.refreshTrackAiProofFields();
        const editAudioBox = document.getElementById('trackEditAudioPlayer');
        if(typeof aetherRenderTrackTechnicalCheck === 'function') aetherRenderTrackTechnicalCheck(t);
        if(editAudioBox) {
            if(t.audioFile) {
                const safeFileName = escapeHTML(t.filename || t.title || 'Аудиофайл');
                editAudioBox.innerHTML = `<audio controls preload="metadata" data-title="${safeFileName}" src="${t.audioFile}"></audio>`;
                if(typeof aetherUpgradeAllAudioPlayers === 'function') aetherUpgradeAllAudioPlayers(editAudioBox);
            } else {
                editAudioBox.innerHTML = `<div class="empty-panel">Аудиофайл не добавлен.</div>`;
            }
        }

        setMultiVal('t_artist_container', t.artist || '', 'Артисты трека');
        setMultiVal('t_author_container', t.author || '', 'Имя Фамилия');
        setMultiVal('t_comp_container', t.comp || '', 'Имя Фамилия');

        toggleLyricsByTrackType();
        refreshCustomSelectLabels();
        document.getElementById('sec-newRelease').classList.add('hidden'); document.getElementById('sec-trackEdit').classList.remove('hidden');
        const editingRelease = appState.releases.find(r => String(r.id) === String(currentDraftId));
        if(typeof aetherApplyTrackModerationIssues === 'function') aetherApplyTrackModerationIssues(editingRelease);
    }
    
    function saveTrackEdit() {
        const reqFields = ['t_title', 't_lang', 't_lyrics']; let hasErr = false;
        reqFields.forEach(id => { const el = document.getElementById(id); if(!el.value) { el.classList.add('error-field'); hasErr = true; } });
        
        const artist = getMultiVal('t_artist_container'); const author = getMultiVal('t_author_container'); const comp = getMultiVal('t_comp_container');
        const resolvedTrackType = getTrackTypeValue();
        const typeSelect = document.getElementById('t_type');
        if(!resolvedTrackType) {
            if(typeSelect) typeSelect.classList.add('error-field');
            hasErr = true;
        } else {
            if(typeSelect) typeSelect.classList.remove('error-field');
        }
        if(!artist) { document.getElementById('t_artist_container').classList.add('error-field'); hasErr = true; } else document.getElementById('t_artist_container').classList.remove('error-field');
        if(!author) { document.getElementById('t_author_container').classList.add('error-field'); hasErr = true; } else document.getElementById('t_author_container').classList.remove('error-field');
        if(!comp) { document.getElementById('t_comp_container').classList.add('error-field'); hasErr = true; } else document.getElementById('t_comp_container').classList.remove('error-field');

        const aiProofState = typeof window.getTrackAiProofState === 'function' ? window.getTrackAiProofState() : { needsSubscription:false, needsText:false, subscriptionUrl:'', textUrl:'', subscriptionValid:true, textValid:true };
        if(aiProofState.needsSubscription && (!aiProofState.subscriptionUrl || !aiProofState.subscriptionValid)) {
            const el = document.getElementById('t_ai_proof_subscription');
            if(el) el.classList.add('error-field');
            hasErr = true;
        }
        if(aiProofState.needsText && (!aiProofState.textUrl || !aiProofState.textValid)) {
            const el = document.getElementById('t_ai_proof_text');
            if(el) el.classList.add('error-field');
            hasErr = true;
        }

        if(hasErr) return UI.alert("Ошибка", "Заполните все обязательные поля. Для полного ИИ, генерации музыки или текста ссылка на Google Drive или Яндекс Диск обязательна и должна вести на Google Drive или Яндекс Диск.");
        const t = draftRelease.tracks.find(x => x.id === editTrackId);
        const lyricsEl = document.getElementById('t_lyrics');
        const lyricsValue = lyricsEl ? lyricsEl.value.trim() : '';
        const hasTTML = !!(t && (t.ttmlText || t.ttmlFile || t.ttmlContent));
        if(hasTTML && !lyricsValue) {
            if(lyricsEl) lyricsEl.classList.add('error-field');
            return UI.alert('Нужен обычный текст', 'Вы добавили караоке-файл TTML, но не добавили обычный текст песни. Сначала вставьте обычный текст в поле «Текст песни», затем сохраните трек.');
        }
        ['title','version','lang','lyrics','explicit','isrc','previewStart'].forEach(k => { const el = document.getElementById('t_'+k); if(el) t[k] = el.value; }); 
        t.type = resolvedTrackType;
        t.aiUsage = getAiUsageChecked('trackAiUsageBox');
        t.aiProofSubscription = aiProofState.needsSubscription ? aiProofState.subscriptionUrl : '';
        t.aiProofText = aiProofState.needsText ? aiProofState.textUrl : '';
        t.artist = artist; t.author = author; t.comp = comp;

        t.isFilled = true; isDraftDirty = true;
        updateReleaseChangeComment();
        cancelTrackEdit(); renderDraftTracks();

    }
    
    function cancelTrackEdit() {
        const editAudioBox = document.getElementById('trackEditAudioPlayer');
        if(editAudioBox) {
            editAudioBox.querySelectorAll('audio').forEach(a => { try { a.pause(); } catch(e){} });
            editAudioBox.innerHTML = '';
        }
        document.getElementById('sec-trackEdit').classList.add('hidden');
        document.getElementById('sec-newRelease').classList.remove('hidden');
        editTrackId = null;
    }
    
    // Отправка на модерацию: сначала догружаем файлы в Cloudinary, потом в Firebase кладём только ссылки.
    async function submitFinalRelease() {
        if(window.__kiteSubmitFinalBusy) return;
        document.querySelectorAll('.error-field').forEach(el => el.classList.remove('error-field'));
        let hasError = false;
        ['r_type', 'r_title', 'r_genre', 'r_year', 'r_releaseDate'].forEach(id => {
            const el = document.getElementById(id);
            if(!el || !el.value) { if(el) el.classList.add('error-field'); hasError = true; }
        });

        if(!getMultiVal('r_artist_container')) { document.getElementById('r_artist_container').classList.add('error-field'); hasError = true; }
        if(!draftRelease.coverFile) { document.getElementById('r_cover_box').classList.add('error-field'); hasError = true; }
        if(hasError) return UI.alert("Ошибка", "Заполните обязательные поля релиза.");
        if(window.AetherLabValidateReleaseDates && !window.AetherLabValidateReleaseDates(true)) return;

        const type = document.getElementById('r_type').value;
        if(draftRelease.tracks.length === 0) return UI.alert("Ошибка", "Добавьте трек");
        for(let i=0; i < draftRelease.tracks.length; i++) {
            if(!draftRelease.tracks[i].isFilled) return UI.alert("Ошибка", `Заполните инфо о треке №${i+1}`);
            if(!(draftRelease.tracks[i].lyrics || '').trim()) return UI.alert("Ошибка", `В треке №${i+1} не добавлен обычный статичный текст песни. Он обязателен для отправки релиза.`);
            if((draftRelease.tracks[i].ttmlText || draftRelease.tracks[i].ttmlFile || draftRelease.tracks[i].ttmlContent) && !(draftRelease.tracks[i].lyrics || '').trim()) return UI.alert("TTML без обычного текста", `В треке №${i+1} добавлен караоке-файл, но нет обычного текста песни. Добавьте обычный текст и попробуйте снова.`);
        }
        if(typeof aetherValidateDraftTechnicalChecks === 'function') {
            const techCheck = await aetherValidateDraftTechnicalChecks(draftRelease);
            if(!techCheck.ok) return UI.alert('Artwork & Audio Checker', `Перед отправкой исправьте технические ошибки:<br><br>${techCheck.errors.map(x => '• ' + escapeHTML(x)).join('<br>')}`);
        }

        window.__kiteSubmitFinalBusy = true;
        const submitBtn = document.getElementById('submitReleaseBtn');
        if(submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.oldText = submitBtn.innerText;
            submitBtn.innerText = 'Загружаем файлы...';
        }

        const existingRelease = appState.releases.find(r => r.id === currentDraftId);
        const isAdmin = currentUser.role === 'Administrator';
        if(existingRelease && existingRelease.status === 'Отклонён' && !isAdmin) updateReleaseChangeComment();
        const finalId = currentDraftId || Date.now().toString();

        try {
            await ensureReleaseFilesUploaded(finalId);
            if(submitBtn) submitBtn.innerText = 'Сохраняем релиз...';

            const releaseData = buildReleaseDataForDatabase({
                id: finalId,
                userId: (existingRelease && isAdmin) ? existingRelease.userId : currentUser.id,
                userEmail: (existingRelease && isAdmin) ? existingRelease.userEmail : currentUser.email,
                type,
                title: document.getElementById('r_title').value,
                artist: getMultiVal('r_artist_container'),
                genre: document.getElementById('r_genre').value,
                year: document.getElementById('r_year').value,
                releaseDate: document.getElementById('r_releaseDate').value,
                originalReleaseDate: document.getElementById('r_originalReleaseDate') ? document.getElementById('r_originalReleaseDate').value : '',
                comment: document.getElementById('r_comment').value,
                status: (existingRelease && isAdmin) ? existingRelease.status : 'Модерация',
                date: existingRelease ? existingRelease.date : new Date().toLocaleDateString(),
                coverFile: draftRelease.coverFile,
                coverTechnical: draftRelease.coverTechnical || (existingRelease && existingRelease.coverTechnical) || null,
                aiCoverUsed: !!((document.getElementById('r_cover_ai') && document.getElementById('r_cover_ai').checked) || draftRelease.aiCoverUsed),
                coverCloudinary: draftRelease.coverCloudinary || null,
                tracks: draftRelease.tracks,
                isDeleted: false,
                upc: document.getElementById('r_upc').value,
                adminIsrc: existingRelease ? existingRelease.adminIsrc : '',
                moderation: existingRelease ? (existingRelease.moderation || null) : null,
                distribution: existingRelease ? (existingRelease.distribution || null) : null,
                history: existingRelease ? (existingRelease.history || []) : []
            });
            if(typeof aetherPrepareReleaseHistory === 'function') {
                const historyContext = (existingRelease && existingRelease.status === 'Отклонён' && !isAdmin) ? 'resubmitted' : (isAdmin ? 'admin_saved' : 'submitted');
                aetherPrepareReleaseHistory(existingRelease, releaseData, historyContext);
            }

            await db.ref('releases/' + finalId).set(releaseData);

            const localIndex = appState.releases.findIndex(r => String(r.id) === String(finalId));
            if(localIndex >= 0) appState.releases[localIndex] = releaseData;
            else appState.releases.push(releaseData);

            isDraftDirty = false;
            currentDraftId = finalId;
            refreshUI();

            if(!isAdmin) {
                navCatalog('mod');
                sendEmailNotification("Новый релиз на модерации", `Артист ${currentUser.login} (${currentUser.email}) отправил релиз "${releaseData.title}" (${releaseData.type}) на проверку.\n\nЗайдите в панель управления, чтобы проверить.`);
                setTimeout(() => UI.alert("Поздравляем!", "Релиз успешно отправлен на модерацию. Модерация занимает до 5 рабочих дней."), 40);
            } else {
                nav('adminReleases', true);
                setTimeout(() => UI.alert("Сохранено!", "Изменения применены."), 40);
            }
        } catch(err) {
            console.error(err);
            UI.alert("Ошибка загрузки", `Релиз не отправлен: ${escapeHTML(err.message || err)}. Проверь Cloudinary Upload preset и попробуй ещё раз.`);
        } finally {
            if(submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = submitBtn.dataset.oldText || 'Отправить на модерацию';
                delete submitBtn.dataset.oldText;
            }
            window.__kiteSubmitFinalBusy = false;
        }
    }

    
    function releaseIcon(name){
        const icons = {
            info:'<svg viewBox="0 0 24 24"><path d="M8 7h8"/><path d="M8 12h5"/><path d="M8 17h8"/><rect x="4" y="4" width="16" height="16" rx="4"/></svg>',
            tracks:'<svg viewBox="0 0 24 24"><path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
            lyrics:'<svg viewBox="0 0 24 24"><path d="M7 4h10v16H7z"/><path d="M10 8h4"/><path d="M10 12h4"/><path d="M10 16h2"/></svg>',
            sync:'<svg viewBox="0 0 24 24"><path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h16"/><path d="M18 10l2 2-2 2"/></svg>',
            edit:'<svg viewBox="0 0 24 24"><path d="M17 3a2.8 2.8 0 0 1 4 4L8 20l-5 1 1-5L17 3z"/><path d="M15 5l4 4"/></svg>',
            copy:'<svg viewBox="0 0 24 24"><path d="M8 8h10v12H8z"/><path d="M6 16H4V4h12v2"/></svg>',
            trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 14h10l1-14"/><path d="M9 7V4h6v3"/></svg>',
            download:'<svg viewBox="0 0 24 24"><path d="M12 4v10"/><path d="m8 10 4 4 4-4"/><path d="M5 20h14"/></svg>',
            return:'<svg viewBox="0 0 24 24"><path d="M10 7 5 12l5 5"/><path d="M5 12h9a5 5 0 1 1 0 10h-2"/></svg>',
            play:'<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7-11-7Z" fill="currentColor" stroke="none"/></svg>'
        };
        return icons[name] || '';
    }
    function releaseTooltip(text){ return `<span class="release-tooltip">${escapeHTML(text)}</span>`; }
    function escapeAttr(v){ return String(v || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    function releaseHasLyrics(t){ return !!String(t && t.lyrics || '').trim(); }
    function releaseHasTTML(t){ return !!String((t && (t.ttmlText || t.ttmlFile || t.ttmlContent)) || '').trim(); }
    function formatReleaseDate(v){
        if(!v) return '-';
        const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return m ? `${m[3]}.${m[2]}.${m[1]}` : v;
    }
    function formatAudioDuration(seconds){
        seconds = Math.max(0, Number(seconds) || 0);
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const sec = Math.floor(seconds % 60);
        return h ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    }
    function probeTrackDuration(r, t, trackIndex){
        if(!r || !t || !t.audioFile || t._durationProbeStarted) return;
        t._durationProbeStarted = true;
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
            if(Number.isFinite(audio.duration) && audio.duration > 0){
                t.duration = formatAudioDuration(audio.duration);
                const cell = document.getElementById(`trackDuration_${r.id}_${trackIndex}`);
                if(cell) cell.textContent = t.duration;
                try{ db.ref(`releases/${r.id}/tracks/${trackIndex}/duration`).set(t.duration); }catch(e){}
            }
            audio.src = '';
        };
        audio.onerror = () => {
            const cell = document.getElementById(`trackDuration_${r.id}_${trackIndex}`);
            if(cell) cell.textContent = '—';
            audio.src = '';
        };
        audio.src = t.audioFile;
    }
    function releaseTrackDuration(t, r, trackIndex){
        if(t && (t.duration || t.length || t.trackDuration)) return t.duration || t.length || t.trackDuration;
        if(t && t.audioFile && r){ probeTrackDuration(r, t, trackIndex); return '…'; }
        return '—';
    }
    function sanitizeDownloadFilePart(value, fallback){
        const raw = String(value || '').trim() || fallback || 'Audio';
        return raw
            .replace(/[\\/:*?"<>|]/g, '-')
            .replace(/[\u0000-\u001f\u007f]/g, '')
            .replace(/\s+/g, ' ')
            .replace(/\.+$/g, '')
            .trim() || fallback || 'Audio';
    }
    function getTrackAudioExtension(t, audioUrl){
        const sources = [t && t.filename, t && t.audioName, t && t.fileName, audioUrl];
        for(const source of sources){
            const clean = String(source || '').split('?')[0].split('#')[0];
            const match = clean.match(/\.([a-z0-9]{2,8})$/i);
            if(match) return '.' + match[1].toLowerCase();
        }
        return '.wav';
    }
    function buildTrackAudioDownloadName(r, t, audioUrl){
        const artist = sanitizeDownloadFilePart((t && t.artist) || (r && r.artist), 'Unknown Artist');
        const title = sanitizeDownloadFilePart((t && t.title) || (r && r.title), 'Untitled');
        return `${artist} - ${title}${getTrackAudioExtension(t, audioUrl)}`;
    }
    function triggerNamedDownload(url, filename){
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
    async function downloadTrackFile(releaseId, trackIndex){
        const r = appState.releases.find(x => String(x.id) === String(releaseId));
        const t = r && r.tracks && r.tracks[trackIndex];
        const audioUrl = t && (t.audioFile || t.audioUrl || t.fileUrl || t.url);
        if(!t || !audioUrl) return UI.alert('Файл недоступен', 'У этого трека нет загруженного аудиофайла.');

        const filename = buildTrackAudioDownloadName(r, t, audioUrl);

        try {
            if(/^data:/i.test(String(audioUrl))) {
                triggerNamedDownload(audioUrl, filename);
                return;
            }

            const response = await fetch(audioUrl, { mode: 'cors' });
            if(!response.ok) throw new Error('download failed');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            triggerNamedDownload(blobUrl, filename);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch(e) {
            console.warn('Named audio download fallback:', e);
            const a = document.createElement('a');
            a.href = audioUrl;
            a.download = filename;
            a.target = '_blank';
            a.rel = 'noopener';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    }
    function duplicateRelease(id){
        const r = appState.releases.find(x => String(x.id) === String(id));
        if(!r) return;
        const copy = JSON.parse(JSON.stringify(r));
        copy.id = Date.now().toString();
        copy.title = (copy.title || 'Релиз') + ' — копия';
        copy.status = 'Черновик';
        copy.date = new Date().toLocaleDateString();
        copy.rejectReason = '';
        appState.releases.push(copy);
        db.ref('releases/' + copy.id).set(buildReleaseDataForDatabase(copy));
        refreshUI();
        UI.alert('Готово', 'Копия релиза сохранена в черновики.');
    }
    function toggleReleaseTracklist(id){
        const panel = document.getElementById('trackPanel_' + id);
        const btn = document.getElementById('trackToggle_' + id);
        if(!panel) return;
        panel.classList.toggle('hidden');
        if(btn) btn.classList.toggle('open', !panel.classList.contains('hidden'));
        if(typeof aetherUpgradeAllAudioPlayers === 'function') setTimeout(()=>aetherUpgradeAllAudioPlayers(panel),0);
    }
    function getTrackTTMLText(t){
        if(!t) return '';
        return String(t.ttmlText || t.ttmlFile || t.ttmlContent || '');
    }
    function showTrackLyrics(releaseId, trackIndex){
        const r = appState.releases.find(x => String(x.id) === String(releaseId));
        const t = r && r.tracks && r.tracks[trackIndex];
        const lyrics = String(t && t.lyrics || '').trim();
        if(!lyrics) return UI.alert('Текст трека', 'Текст для этого трека не добавлен.');
        const title = `${escapeHTML(t.title || r.title || 'Трек')} — текст трека`;
        UI.alert(title, `<div style="white-space:pre-wrap;line-height:1.7;color:#eef2fb;font-size:14px;">${escapeHTML(lyrics)}</div>`);
    }
    function downloadTrackTTML(releaseId, trackIndex){
        const r = appState.releases.find(x => String(x.id) === String(releaseId));
        const t = r && r.tracks && r.tracks[trackIndex];
        const ttml = getTrackTTMLText(t).trim();
        if(!ttml) return UI.alert('TTML недоступен', 'Синхронизированный караоке-текст для этого трека не добавлен.');
        if(/^data:/i.test(ttml)) {
            window.open(ttml, '_blank', 'noopener');
            return;
        }
        const blob = new Blob([ttml], {type:'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(()=>URL.revokeObjectURL(url), 10000);
    }
    function renderReleaseTrackTable(r){
        const tracks = Array.isArray(r.tracks) ? r.tracks : [];
        if(!tracks.length) return '<div class="empty-panel">Трек-лист пуст</div>';
        return `<table class="release-track-table"><thead><tr><th style="width:46px;"></th><th style="width:54px;"></th><th>Название</th><th>Исполнитель</th><th>Длительность</th><th>Доля прав</th><th>Сервисы</th></tr></thead><tbody>${tracks.map((t,i)=>{
            const hasLyrics = releaseHasLyrics(t);
            const hasTTML = releaseHasTTML(t);
            return `<tr>
                <td>${i+1}</td>
                <td><button class="track-download-btn" onclick="downloadTrackFile('${escapeAttr(r.id)}', ${i})">${releaseIcon('download')}${releaseTooltip('Скачать файл')}</button></td>
                <td><div class="release-track-title">${escapeHTML(t.title || 'Без названия')}</div><div class="release-track-sub">ISRC ${escapeHTML(t.isrc || '—')}</div></td>
                <td>${escapeHTML(t.artist || r.artist || '—')}</td>
                <td id="trackDuration_${escapeAttr(r.id)}_${i}">${escapeHTML(releaseTrackDuration(t, r, i))}</td>
                <td>100%</td>
                <td><div class="track-services"><button type="button" class="track-service-icon ${hasLyrics ? 'active' : ''}" onclick="showTrackLyrics('${escapeAttr(r.id)}', ${i})">${releaseIcon('lyrics')}${releaseTooltip(hasLyrics ? 'Открыть текст трека' : 'Текст трека не добавлен')}</button><button type="button" class="track-service-icon ${hasTTML ? 'active' : ''}" onclick="downloadTrackTTML('${escapeAttr(r.id)}', ${i})">${releaseIcon('sync')}${releaseTooltip(hasTTML ? 'Скачать караоке TTML' : 'Синхронизированный текст не добавлен')}</button></div></td>
            </tr>`;
        }).join('')}</tbody></table>`;
    }
    function getCurrentReleaseSnapshotForComment(){
        return {
            type: document.getElementById('r_type') && document.getElementById('r_type').value,
            title: document.getElementById('r_title') && document.getElementById('r_title').value,
            artist: getMultiVal('r_artist_container'),
            genre: document.getElementById('r_genre') && document.getElementById('r_genre').value,
            year: document.getElementById('r_year') && document.getElementById('r_year').value,
            releaseDate: document.getElementById('r_releaseDate') && document.getElementById('r_releaseDate').value,
            originalReleaseDate: document.getElementById('r_originalReleaseDate') && document.getElementById('r_originalReleaseDate').value,
            upc: document.getElementById('r_upc') && document.getElementById('r_upc').value,
            tracks: (draftRelease.tracks || []).map(t => ({title:t.title, artist:t.artist, lyrics:t.lyrics, isrc:t.isrc, ttml:!!(t.ttmlText||t.ttmlFile||t.ttmlContent)}))
        };
    }
    function buildReleaseChangeSummary(oldR, current){
        if(!oldR || !current) return 'данные релиза';
        const changes = [];
        const map = {type:'формат релиза', title:'название релиза', artist:'артисты', genre:'жанр', year:'год', releaseDate:'дата релиза', originalReleaseDate:'оригинальная дата релиза', upc:'UPC'};
        Object.keys(map).forEach(k => { if(String(oldR[k] || '') !== String(current[k] || '')) changes.push(map[k]); });
        const oldTracks = oldR.tracks || [];
        const newTracks = current.tracks || [];
        if(oldTracks.length !== newTracks.length) changes.push('трек-лист');
        else {
            for(let i=0;i<newTracks.length;i++){
                const o = oldTracks[i] || {}, n = newTracks[i] || {};
                if(String(o.title||'')!==String(n.title||'') || String(o.artist||'')!==String(n.artist||'') || String(o.lyrics||'')!==String(n.lyrics||'') || String(o.isrc||'')!==String(n.isrc||'') || Boolean(o.ttmlText||o.ttmlFile||o.ttmlContent)!==Boolean(n.ttml)) { changes.push(`данные трека №${i+1}`); }
            }
        }
        return changes.length ? Array.from(new Set(changes)).join(', ') : 'данные релиза проверены без изменений';
    }
    function updateReleaseChangeComment(){
        if(!window.editingOriginalReleaseForComment || !currentUser || currentUser.role === 'Administrator') return;
        const comment = document.getElementById('r_comment');
        if(!comment) return;
        const summary = buildReleaseChangeSummary(window.editingOriginalReleaseForComment, getCurrentReleaseSnapshotForComment());
        comment.value = `Релиз был изменён: ${summary}.`;
    }
    function bindReleaseChangeCommentWatcher(){
        ['r_type','r_title','r_genre','r_year','r_releaseDate','r_originalReleaseDate','r_upc'].forEach(id=>{
            const el=document.getElementById(id); if(el && !el.dataset.changeWatcher){ el.dataset.changeWatcher='1'; el.addEventListener('input', updateReleaseChangeComment); el.addEventListener('change', updateReleaseChangeComment); }
        });
    }
    function handleTrackTTMLUpload(input){
        const file = input.files && input.files[0];
        const label = document.getElementById('t_ttml_name');
        if(!file) return;
        if(!/\.ttml$/i.test(file.name || '')) { input.value = ''; return UI.alert('Ошибка', 'Файл караоке должен быть только в формате TTML.'); }
        const lyricsEl = document.getElementById('t_lyrics');
        if(lyricsEl && !lyricsEl.value.trim()) UI.alert('Нужен обычный текст', 'Вы добавляете караоке-файл TTML. Не забудьте также добавить обычный текст песни в поле «Текст песни».');
        const reader = new FileReader();
        reader.onload = () => {
            const t = draftRelease.tracks.find(x => x.id === editTrackId);
            if(t){ t.ttmlText = String(reader.result || ''); t.ttmlName = file.name; }
            if(label) label.textContent = file.name;
            isDraftDirty = true;
            updateReleaseChangeComment();
        };
        reader.readAsText(file, 'utf-8');
    }
function renderCard(r, isAdmin) {
        let status = '';
        if(r.status === 'Черновик') status = '<span class="badge badge-draft">Черновик</span>';
        else if(r.status === 'Модерация') status = '<span class="badge badge-mod">Модерация</span>';
        else if(r.status === 'Одобрен') status = '<span class="badge badge-ok">Одобрен</span>';
        else if(r.status === 'Отклонён') status = `<span class="badge badge-err">Требует исправления</span>`;
        if(r.isDeleted) status = '<span class="badge badge-err">Удалён</span>';
        const coverSrc = r.coverFile || '';
        const tracks = Array.isArray(r.tracks) ? r.tracks : [];
        const hasLyrics = tracks.some(releaseHasLyrics);
        const hasTTML = tracks.some(releaseHasTTML);
        const canEdit = currentUser.role === 'Administrator' || (!isAdmin && (r.status === 'Черновик' || r.status === 'Отклонён'));
        const canDelete = !isAdmin && currentUser.role !== 'Administrator' && r.status === 'Черновик';
        const safeId = escapeAttr(r.id);
        const showOwnerAccount = isAdmin || (currentUser && currentUser.role === 'Administrator' && !releaseBelongsToUser(r, currentUser));
        const metaAdmin = showOwnerAccount ? `<div class="release-meta-item"><div class="release-meta-label">Кабинет</div><div class="release-meta-value">${escapeHTML(r.userEmail || '—')}</div></div>` : '';
        const actions = `
            <button class="release-icon-btn" onclick="openReleaseHub('${safeId}')">${releaseIcon('info')}${releaseTooltip('Открыть Release Hub')}</button>
            ${canEdit ? `<button class="release-icon-btn" onclick="editDraft('${safeId}')">${releaseIcon('edit')}${releaseTooltip('Редактировать релиз')}</button>` : ''}
            <button class="release-icon-btn" onclick="duplicateRelease('${safeId}')">${releaseIcon('copy')}${releaseTooltip('Создать копию в черновиках')}</button>
            ${canDelete ? `<button class="release-icon-btn danger" onclick="deleteDraft('${safeId}')">${releaseIcon('trash')}${releaseTooltip('Удалить черновик')}</button>` : ''}
            ${isAdmin && !r.isDeleted && currentUser.role === 'Administrator' && r.status !== 'Черновик' ? `<button class="release-icon-btn" onclick="admRevoke('${safeId}')">${releaseIcon('return')}${releaseTooltip('Отозвать с модерации')}</button>` : ''}
            ${isAdmin && !r.isDeleted && currentUser.role === 'Administrator' && (r.status === 'Модерация' || r.status === 'Отклонён') ? `<button class="release-icon-btn" onclick="openReleaseModerationEditor('${safeId}')">☑${releaseTooltip('Детальная модерация')}</button>` : ''}
            ${isAdmin && !r.isDeleted && currentUser.role === 'Administrator' && r.status === 'Модерация' ? `<button class="release-icon-btn glow" onclick="admApprove('${safeId}')">✓${releaseTooltip('Одобрить')}</button>` : ''}
        `;
        return `<div class="release-card-pro release-card-hub-link" role="button" tabindex="0" onclick="if(!event.target.closest('button,a,audio,input,select,textarea,.release-track-panel')) openReleaseHub('${safeId}')" onkeydown="if((event.key==='Enter'||event.key===' ')&&!event.target.closest('button,a,input,select,textarea')){event.preventDefault();openReleaseHub('${safeId}')}">
            <img src="${coverSrc}" class="release-cover-pro" alt="Обложка">
            <div class="release-main-pro">
                <div class="release-title-pro">${escapeHTML(r.title || 'Без названия')}</div>
                <div class="release-artist-pro">${escapeHTML(r.artist || '—')}</div>
                <div class="release-meta-grid">
                    <div class="release-meta-item"><div class="release-meta-label">UPC</div><div class="release-meta-value">${escapeHTML(r.upc || '—')}</div></div>
                    <div class="release-meta-item"><div class="release-meta-label">Дата создания</div><div class="release-meta-value">${escapeHTML(r.date || '—')}</div></div>
                    <div class="release-meta-item"><div class="release-meta-label">Дата релиза</div><div class="release-meta-value">${escapeHTML(formatReleaseDate(r.releaseDate))}</div></div>
                    <div class="release-meta-item"><div class="release-meta-label">Ориг. дата релиза</div><div class="release-meta-value">${escapeHTML(formatReleaseDate(r.originalReleaseDate))}</div></div>
                    <div class="release-meta-item"><div class="release-meta-label">Жанр</div><div class="release-meta-value">${escapeHTML(r.genre || '—')}</div></div>
                    <div class="release-meta-item"><div class="release-meta-label">Треков</div><div class="release-meta-value">${tracks.length}</div></div>
                    ${metaAdmin}
                    <div class="release-meta-item"><div class="release-meta-label">Статус</div><div class="release-meta-value">${status}</div></div>
                </div>
                <button class="release-track-toggle" id="trackToggle_${safeId}" onclick="toggleReleaseTracklist('${safeId}')">Трек-лист <svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
            </div>
            <div class="release-actions-pro">${actions}</div>
            <div class="release-track-panel hidden" id="trackPanel_${safeId}">${renderReleaseTrackTable(r)}</div>
        </div>`;
    }
    function renderCatalog() {
        const searchQuery = document.getElementById('searchReleases').value.toLowerCase();
        let list = getReleasesVisibleToCurrentUser().filter(r => !r.isDeleted);
        list = list.filter(r => {
            if (activeCatalogFilter === 'drafts') return isDraftRelease(r);
            if (activeCatalogFilter === 'mod') return isModerationRelease(r);
            if (activeCatalogFilter === 'fix') return isFixRelease(r);
            if (activeCatalogFilter === 'all') return isApprovedRelease(r);
            return isApprovedRelease(r);
        });
        if (searchQuery) list = list.filter(r => `${r.title} ${r.artist} ${r.upc || ''}`.toLowerCase().includes(searchQuery));
        const container = document.getElementById('userReleasesList');
        if (list.length === 0 && !searchQuery) {
            const emptyTitles = { all: 'Нет принятых релизов', drafts: 'Нет черновиков', mod: 'Нет релизов на модерации', fix: 'Нет релизов, требующих исправления' };
            const canCreate = activeCatalogFilter === 'drafts' || activeCatalogFilter === 'all';
            container.innerHTML = `<div class="empty-state"><h2>${escapeHTML(emptyTitles[activeCatalogFilter] || 'Нет релизов')}</h2>${canCreate ? '<button class="btn-primary" style="padding: 16px 24px; font-size: 16px; margin-top: 20px;" onclick="startNewRelease()">Создать релиз</button>' : ''}</div>`;
        } else container.innerHTML = list.map(r => renderCard(r, false)).reverse().join(''); 
    }
    function renderAdminReleases(showDeleted) {
        // showDeleted=false: показываем только релизы, доступные текущему пользователю по иерархии:
        // главный администратор — все; обычный администратор — свои + кабинеты, созданные им; артист — свои.
        // !r.isDeleted нужен, чтобы старые релизы без поля isDeleted тоже не пропадали.
        let list = getReleasesVisibleToCurrentUser().filter(r => !!r && (showDeleted ? !!r.isDeleted : !r.isDeleted));

        if (!showDeleted) {
            const searchInput = document.getElementById('searchAdminReleases');
            const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
            if (searchVal) list = list.filter(r => `${r.title || ''} ${r.artist || ''} ${r.upc || ''} ${r.userEmail || ''} ${r.status || ''}`.toLowerCase().includes(searchVal));
        }

        const target = document.getElementById(showDeleted ? 'adminDeletedList' : 'adminReleasesList');
        if(!target) return;
        target.innerHTML = list.length ? list.map(r => renderCard(r, true)).reverse().join('') : '<p class="text-sm">Список пуст</p>';
    }

