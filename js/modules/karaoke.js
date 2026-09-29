/* AetherLab module extracted from the former monolithic index.html. */
    /* ===== Karaoke Text module ===== */
    let karaokeState = {
        mode: '', audioData: '', audioName: '', title: '', artist: '', lyrics: '',
        lines: [], times: [], activeLine: 0, selectedLine: -1, lastMarkedLine: -1, keyBound: false, viewerItems: [], viewerActive: 0
    };

    function karaokeSetMode(mode){
        karaokeState.mode = mode;
        karaokeState.audioData = ''; karaokeState.audioName = ''; karaokeState.title = ''; karaokeState.artist = ''; karaokeState.lyrics = '';
        karaokeState.lines = []; karaokeState.times = []; karaokeState.activeLine = 0; karaokeState.selectedLine = -1; karaokeState.lastMarkedLine = -1; karaokeState.viewerItems = []; karaokeState.viewerActive = 0; document.body.classList.remove('karaoke-mobile-sync');
        renderKaraoke();
    }

    function renderKaraoke(){
        const area = document.getElementById('karaokeWorkArea');
        if(!area) return;
        ['catalog','own','view'].forEach(m=>{
            const el = document.getElementById('karaokeMode' + (m==='catalog'?'Catalog':m==='own'?'Own':'View'));
            if(el) el.classList.toggle('active', karaokeState.mode === m);
        });
        if(!karaokeState.mode){
            area.innerHTML = `<div class="empty-panel">Выберите один из вариантов выше, чтобы начать работу с караоке-текстом.</div>`;
            return;
        }
        if(karaokeState.mode === 'catalog') renderKaraokeCatalogForm(area);
        if(karaokeState.mode === 'own') renderKaraokeOwnForm(area);
        if(karaokeState.mode === 'view') renderKaraokeViewerForm(area);
    }

    function karaokeUserReleases(){
        if(!currentUser) return [];
        return getReleasesVisibleToCurrentUser().filter(r => !r.isDeleted && Array.isArray(r.tracks) && r.tracks.length);
    }

    function renderKaraokeCatalogForm(area){
        const releases = karaokeUserReleases();
        const releaseOptions = releases.map(r=>`<option value="${escapeHTML(r.id)}">${escapeHTML(r.artist || '')} — ${escapeHTML(r.title || 'Без названия')}</option>`).join('');
        area.innerHTML = `<div class="karaoke-panel">
            <div class="karaoke-grid">
                <div class="form-group"><label>Релиз из каталога</label><select id="kr_release" onchange="karaokeLoadReleaseTrack()"><option value="">Выберите релиз</option>${releaseOptions}</select></div>
                <div class="form-group"><label>Трек</label><select id="kr_track" onchange="karaokeLoadReleaseTrack(true)"><option value="">Сначала выберите релиз</option></select></div>
                <div class="karaoke-file-box"><label class="karaoke-file-btn" for="kr_audio_catalog">Добавить аудиофайл</label><input id="kr_audio_catalog" type="file" accept=".wav,audio/wav,audio/x-wav,audio/wave,audio/vnd.wave" onchange="karaokeReadAudio(this)"><span class="karaoke-file-name" id="kr_audio_catalog_name">Если аудио есть в релизе, оно загрузится автоматически.</span></div>
                <div class="form-group"><label>Название трека</label><input id="kr_title" placeholder="Название трека" oninput="karaokeState.title=this.value"></div>
                <div class="form-group"><label>Имя артиста/ов</label><input id="kr_artist" placeholder="Артист" oninput="karaokeState.artist=this.value"></div>
                <div class="form-group" style="grid-column:1/-1"><label>Текст трека</label><textarea id="kr_lyrics" rows="8" placeholder="Каждая строка отдельно" oninput="karaokeState.lyrics=this.value"></textarea></div>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;"><button class="btn-primary" onclick="karaokeStartSync()">Начать синхронизацию</button></div>
        </div><div id="karaokeSyncRoot"></div>`;
        refreshCustomSelectsSoon();
    }

    function karaokeInitPlayer(){
        const audio = document.getElementById('karaokeAudio');
        if(!audio) return;
        const update = () => karaokeUpdatePlayerUI();
        audio.addEventListener('loadedmetadata', update);
        audio.addEventListener('timeupdate', update);
        audio.addEventListener('play', update);
        audio.addEventListener('pause', update);
        audio.addEventListener('ended', update);
        update();
    }

    function karaokeTogglePlay(){
        const audio = document.getElementById('karaokeAudio');
        if(!audio) return;
        if(audio.paused) audio.play(); else audio.pause();
        karaokeUpdatePlayerUI();
    }

    function karaokeUpdatePlayerUI(){
        const audio = document.getElementById('karaokeAudio');
        if(!audio) return;
        const btn = document.getElementById('karaokePlayBtn');
        const fill = document.getElementById('karaokeProgressFill');
        const label = document.getElementById('karaokeTimeLabel');
        const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
        const cur = audio.currentTime || 0;
        if(btn) btn.textContent = audio.paused ? '▶' : 'Ⅱ';
        if(fill) fill.style.width = dur ? Math.min(100, Math.max(0, cur / dur * 100)) + '%' : '0%';
        if(label) label.textContent = `${karaokeFormatClock(cur)} / ${karaokeFormatClock(dur)}`;
    }

    function karaokeFormatClock(sec){
        sec = Math.max(0, Number(sec)||0);
        const m = Math.floor(sec/60);
        const s = Math.floor(sec%60);
        return `${m}:${String(s).padStart(2,'0')}`;
    }

    function karaokeSeek(event){
        const audio = document.getElementById('karaokeAudio');
        const bar = document.getElementById('karaokeProgress');
        if(!audio || !bar || !Number.isFinite(audio.duration)) return;
        const rect = bar.getBoundingClientRect();
        const pct = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        audio.currentTime = pct * audio.duration;
        karaokeUpdatePlayerUI();
    }

    function karaokeSkip(seconds){
        const audio = document.getElementById('karaokeAudio');
        if(!audio) return;
        audio.currentTime = Math.max(0, Math.min(Number.isFinite(audio.duration) ? audio.duration : Infinity, (audio.currentTime || 0) + Number(seconds || 0)));
        karaokeUpdatePlayerUI();
    }

    function karaokeSetRate(value){
        const audio = document.getElementById('karaokeAudio');
        if(audio) audio.playbackRate = Number(value) || 1;
    }

    function karaokeLoadReleaseTrack(trackChanged=false){
        const relSel = document.getElementById('kr_release');
        const trSel = document.getElementById('kr_track');
        const rel = appState.releases.find(r => String(r.id) === String(relSel && relSel.value));
        if(!rel){ if(trSel) trSel.innerHTML='<option value="">Сначала выберите релиз</option>'; return; }
        if(!trackChanged){
            trSel.innerHTML = (rel.tracks || []).map((t,i)=>`<option value="${i}">${i+1}. ${escapeHTML(t.title || t.filename || 'Трек')}</option>`).join('');
        }
        const idx = Number(trSel.value || 0);
        const t = (rel.tracks || [])[idx];
        if(!t) return;
        karaokeState.audioData = t.audioFile || '';
        karaokeState.audioName = t.filename || '';
        karaokeState.title = t.title || rel.title || '';
        karaokeState.artist = t.artist || rel.artist || '';
        karaokeState.lyrics = t.lyrics || '';
        const title = document.getElementById('kr_title'); if(title) title.value = karaokeState.title;
        const artist = document.getElementById('kr_artist'); if(artist) artist.value = karaokeState.artist;
        const lyrics = document.getElementById('kr_lyrics'); if(lyrics) lyrics.value = karaokeState.lyrics;
        const name = document.getElementById('kr_audio_catalog_name'); if(name) name.textContent = karaokeState.audioName ? `Загружено из релиза: ${karaokeState.audioName}` : 'Аудиофайл не найден в релизе. Добавьте его вручную.';
    }

    function renderKaraokeOwnForm(area){
        area.innerHTML = `<div class="karaoke-panel"><div class="karaoke-grid">
            <div class="karaoke-file-box"><label class="karaoke-file-btn" for="kr_audio_own">Добавить аудиофайл</label><input id="kr_audio_own" type="file" accept=".wav,audio/wav,audio/x-wav,audio/wave,audio/vnd.wave" onchange="karaokeReadAudio(this)"><span class="karaoke-file-name" id="kr_audio_own_name">WAV-аудиофайл до 50 МБ.</span></div>
            <div class="form-group"><label>Название релиза</label><input id="kr_title" placeholder="Название релиза" oninput="karaokeState.title=this.value"></div>
            <div class="form-group"><label>Имя артиста</label><input id="kr_artist" placeholder="Артист" oninput="karaokeState.artist=this.value"></div>
            <div class="form-group" style="grid-column:1/-1"><label>Текст</label><textarea id="kr_lyrics" rows="8" placeholder="Каждая строка отдельно" oninput="karaokeState.lyrics=this.value"></textarea></div>
        </div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;"><button class="btn-primary" onclick="karaokeStartSync()">Начать синхронизацию</button></div></div><div id="karaokeSyncRoot"></div>`;
    }

    function karaokeReadAudio(input){
        const file = input.files && input.files[0];
        if(!file) return;
        if(!isAllowedWavFile(file)) return showWrongAudioFormatError(input);
        if(file.size > 50*1024*1024){ input.value=''; return UI.alert('Ошибка', 'Аудиофайл должен быть до 50 МБ.'); }
        const reader = new FileReader();
        reader.onload = () => {
            karaokeState.audioData = reader.result;
            karaokeState.audioName = file.name;
            const nameEl = document.getElementById(input.id + '_name'); if(nameEl) nameEl.textContent = file.name;
        };
        reader.readAsDataURL(file);
    }

    function karaokeStartSync(){
        const titleEl = document.getElementById('kr_title'), artistEl = document.getElementById('kr_artist'), lyricsEl = document.getElementById('kr_lyrics');
        karaokeState.title = (titleEl && titleEl.value || '').trim();
        karaokeState.artist = (artistEl && artistEl.value || '').trim();
        karaokeState.lyrics = (lyricsEl && lyricsEl.value || '').trim();
        if(!karaokeState.audioData) return UI.alert('Не хватает данных', 'Добавьте аудиофайл.');
        if(!karaokeState.title) return UI.alert('Не хватает данных', 'Укажите название трека/релиза.');
        if(!karaokeState.artist) return UI.alert('Не хватает данных', 'Укажите имя артиста.');
        if(!karaokeState.lyrics) return UI.alert('Не хватает данных', 'Добавьте текст трека.');
        karaokeState.lines = karaokeState.lyrics.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
        if(!karaokeState.lines.length) return UI.alert('Ошибка', 'Текст должен содержать хотя бы одну строку.');
        karaokeState.times = Array(karaokeState.lines.length).fill(null);
        karaokeState.activeLine = 0;
        karaokeState.selectedLine = -1;
        karaokeState.lastMarkedLine = -1;
        renderKaraokeSync();
    }

    function renderKaraokeSync(){
        const root = document.getElementById('karaokeSyncRoot'); if(!root) return;
        root.innerHTML = `<div class="karaoke-panel karaoke-sync-area">
            <div class="karaoke-help">Включите трек и нажимайте <b>Пробел</b> в момент начала каждой строки. На телефоне используйте кнопку <b>Поставить таймкод</b> внизу экрана.</div>
            <audio id="karaokeAudio" class="karaoke-native-audio" src="${karaokeState.audioData}" preload="metadata"></audio>
            <div class="aether-audio-player">
                <div class="aether-player-main">
                    <button class="aether-play-btn" id="karaokePlayBtn" onclick="karaokeTogglePlay()" title="Воспроизвести">▶</button>
                    <div class="aether-player-time" id="karaokeTimeLabel">0:00 / 0:00</div>
                    <div class="aether-progress" id="karaokeProgress" onclick="karaokeSeek(event)"><div class="aether-progress-fill" id="karaokeProgressFill"></div></div>
                    <button class="aether-icon-btn" onclick="karaokeSkip(-5)" title="Назад на 5 секунд">−5</button>
                    <button class="aether-icon-btn" onclick="karaokeSkip(5)" title="Вперёд на 5 секунд">+5</button>
                </div>
                <div class="aether-player-bottom">
                    <div class="aether-player-meta">${escapeHTML(karaokeState.artist || 'Артист')} — ${escapeHTML(karaokeState.title || 'Трек')}</div>
                    <div class="aether-player-rate"><label class="text-sm">Скорость</label><select id="karaokeRate" onchange="karaokeSetRate(this.value)"><option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option></select></div>
                </div>
            </div>
            <div class="karaoke-player-tools">
                <button class="btn-outline" onclick="karaokeResetText()">Сбросить текст</button>
                <button class="btn-outline" onclick="karaokeResetLine()">Сбросить строку</button>
                <button class="btn-primary" onclick="karaokeDownloadTTML()">Скачать ttml файл</button>
            </div>
            <div class="karaoke-lines" id="karaokeLines"></div>
            <button class="karaoke-mobile-timecode" id="karaokeMobileTimeBtn" onclick="karaokeMarkLine()">Поставить таймкод</button>
        </div>`;
        document.body.classList.add('karaoke-mobile-sync');
        karaokeRenderLines();
        karaokeBindKeys();
        karaokeInitPlayer();
        refreshCustomSelectsSoon();
    }

    function karaokeBindKeys(){
        if(karaokeState.keyBound) return;
        karaokeState.keyBound = true;
        document.addEventListener('keydown', (e)=>{
            if(currentSection !== 'karaoke' || e.code !== 'Space' || e.repeat) return;
            const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
            if(['input','textarea','select','button'].includes(tag)) return;
            e.preventDefault();
            karaokeMarkLine();
        });
    }

    function karaokeMarkLine(){
        if(!karaokeState.lines.length) return;
        const audio = document.getElementById('karaokeAudio'); if(!audio) return;
        if(karaokeState.activeLine >= karaokeState.lines.length) return;
        const markedIndex = karaokeState.activeLine;
        karaokeState.times[markedIndex] = Math.max(0, audio.currentTime || 0);
        karaokeState.selectedLine = markedIndex;
        karaokeState.lastMarkedLine = markedIndex;
        karaokeState.activeLine = Math.min(karaokeState.activeLine + 1, karaokeState.lines.length);
        karaokeRenderLines(markedIndex);
    }

    function karaokeRenderLines(scrollToIndex){
        const box = document.getElementById('karaokeLines'); if(!box) return;
        const highlightedLine = karaokeState.selectedLine >= 0 ? karaokeState.selectedLine : karaokeState.lastMarkedLine;
        box.innerHTML = karaokeState.lines.map((line,i)=>`<div id="karaokeLine_${i}" class="karaoke-line ${i===karaokeState.activeLine?'active':''} ${i===highlightedLine?'selected-line':''} ${karaokeState.times[i]!=null?'synced':''}" onclick="karaokeSelectLine(${i})" ontouchstart="karaokeSelectLine(${i})" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();karaokeSelectLine(${i});}"><div class="karaoke-line-time">${karaokeState.times[i]!=null ? karaokeFormatTime(karaokeState.times[i]) : '—'}</div><div class="karaoke-line-text">${escapeHTML(line)}</div></div>`).join('');
        const targetIndex = typeof scrollToIndex === 'number' ? scrollToIndex : karaokeState.activeLine;
        setTimeout(()=>karaokeScrollToLine(targetIndex), 0);
    }

    function karaokeSelectLine(index){
        if(!karaokeState.lines.length) return;
        const i = Math.max(0, Math.min(Number(index)||0, karaokeState.lines.length-1));
        karaokeState.activeLine = i;
        karaokeState.selectedLine = i;
        karaokeRenderLines(i);
    }

    function karaokeScrollToLine(index){
        const el = document.getElementById('karaokeLine_' + index);
        if(!el) return;
        el.scrollIntoView({ behavior:'smooth', block:'center', inline:'nearest' });
    }

    function karaokeResetText(){
        karaokeState.times = Array(karaokeState.lines.length).fill(null); karaokeState.activeLine = 0; karaokeState.selectedLine = -1; karaokeState.lastMarkedLine = -1; karaokeRenderLines(0);
    }
    function karaokeResetLine(){
        if(!karaokeState.lines.length) return;
        const fallback = karaokeState.activeLine;
        const i = Math.max(0, Math.min(karaokeState.selectedLine >= 0 ? karaokeState.selectedLine : fallback, karaokeState.lines.length-1));
        karaokeState.times[i] = null;
        karaokeState.activeLine = i;
        karaokeState.selectedLine = i;
        if(karaokeState.lastMarkedLine === i) karaokeState.lastMarkedLine = -1;
        karaokeRenderLines(i);
    }

    function karaokeFormatTime(sec){
        sec = Math.max(0, Number(sec)||0);
        const m = Math.floor(sec/60);
        const s = Math.floor(sec%60);
        const ms = Math.floor((sec - Math.floor(sec))*1000);
        return `[${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}]`;
    }

    function karaokeDownloadTTML(){
        if(!karaokeState.lines.length) return UI.alert('Ошибка', 'Сначала начните синхронизацию.');
        const missing = karaokeState.times.findIndex(x=>x==null);
        if(missing >= 0) return UI.alert('Ошибка', `Не указан таймкод для строки №${missing+1}.`);
        const audio = document.getElementById('karaokeAudio');
        let endTime = audio && isFinite(audio.duration) ? audio.duration : (karaokeState.times[karaokeState.times.length-1] || 0) + 3;
        if(audio && audio.currentTime > (karaokeState.times[karaokeState.times.length-1] || 0)) endTime = audio.currentTime;
        const rows = karaokeState.lines.map((line,i)=>`${karaokeFormatTime(karaokeState.times[i])} ${line}`);
        rows.push(karaokeFormatTime(endTime));
        const blob = new Blob([rows.join('\n') + '\n'], {type:'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(()=>URL.revokeObjectURL(url), 10000);
    }

    function renderKaraokeViewerForm(area){
        area.innerHTML = `<div class="karaoke-panel"><div class="karaoke-grid">
            <div class="karaoke-file-box"><label class="karaoke-file-btn" for="kr_view_audio">Добавить WAV</label><input id="kr_view_audio" type="file" accept=".wav,audio/wav,audio/x-wav,audio/wave,audio/vnd.wave" onchange="karaokeViewerReadAudio(this)"><span class="karaoke-file-name" id="kr_view_audio_name">WAV до 50 МБ</span></div>
            <div class="karaoke-file-box"><label class="karaoke-file-btn" for="kr_view_ttml">Добавить TTML</label><input id="kr_view_ttml" type="file" accept=".ttml" onchange="karaokeViewerReadTTML(this)"><span class="karaoke-file-name" id="kr_view_ttml_name">TTML-файл с таймкодами</span></div>
        </div><div id="karaokeViewerRoot"></div></div>`;
    }

    function karaokeViewerReadAudio(input){
        const file = input.files && input.files[0]; if(!file) return;
        if(!isAllowedWavFile(file)) return showWrongAudioFormatError(input);
        if(file.size > 50*1024*1024){ input.value=''; return UI.alert('Ошибка','Аудиофайл должен быть до 50 МБ.'); }
        const reader = new FileReader();
        reader.onload = ()=>{ karaokeState.audioData = reader.result; karaokeState.audioName = file.name; const n=document.getElementById('kr_view_audio_name'); if(n)n.textContent=file.name; karaokeRenderViewer(); };
        reader.readAsDataURL(file);
    }
    function karaokeViewerReadTTML(input){
        const file = input.files && input.files[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = ()=>{ const n=document.getElementById('kr_view_ttml_name'); if(n)n.textContent=file.name; karaokeState.viewerItems = karaokeParseTTML(String(reader.result||'')); karaokeRenderViewer(); };
        reader.readAsText(file, 'utf-8');
    }
    function karaokeParseTTML(text){
        return text.split(/\r?\n/).map(row=>{
            const m = row.match(/^\[(\d{2,}):(\d{2})[.:](\d{3})\]\s*(.*)$/);
            if(!m) return null;
            return {time:Number(m[1])*60 + Number(m[2]) + Number(m[3])/1000, text:m[4]||''};
        }).filter(Boolean);
    }
    function karaokeRenderViewer(){
        const root = document.getElementById('karaokeViewerRoot'); if(!root) return;
        if(!karaokeState.audioData || !karaokeState.viewerItems.length){ root.innerHTML = `<div class="empty-panel" style="margin-top:16px;">Добавьте аудио и TTML-файл, чтобы запустить просмотр.</div>`; return; }
        karaokeState.viewerActive = -1;
        root.innerHTML = `<audio id="karaokeViewAudio" src="${karaokeState.audioData}" controls data-title="Просмотр караоке" style="width:100%;margin:18px 0 0;"></audio><div class="karaoke-viewer"><div class="karaoke-view-countdown" id="karaokeViewCountdown"><span id="karaokeViewCountdownNum"></span></div><div class="karaoke-viewer-inner" id="karaokeViewerInner" style="transform:translateY(0px);">${karaokeState.viewerItems.map((x)=>`<div class="karaoke-view-line">${escapeHTML(x.text)}</div>`).join('')}</div></div>`;
        const audio = document.getElementById('karaokeViewAudio');
        audio.currentTime = 0;
        audio.ontimeupdate = karaokeUpdateViewerLine;
        audio.onseeked = karaokeUpdateViewerLine;
        audio.onloadedmetadata = karaokeUpdateViewerLine;
        karaokeUpdateViewerLine();
        if(typeof aetherUpgradeAllAudioPlayers === 'function') setTimeout(()=>aetherUpgradeAllAudioPlayers(root), 0);
    }
    function karaokeUpdateViewerLine(){
        const audio = document.getElementById('karaokeViewAudio'); if(!audio) return;
        const items = karaokeState.viewerItems || [];
        const lines = document.querySelectorAll('.karaoke-view-line');
        const inner = document.getElementById('karaokeViewerInner');
        const countdown = document.getElementById('karaokeViewCountdown');
        const countdownNum = document.getElementById('karaokeViewCountdownNum');
        if(!items.length) return;
        const firstTime = Number(items[0].time) || 0;
        const cur = audio.currentTime || 0;
        let idx = -1;
        for(let i=0;i<items.length;i++){
            if(cur >= Number(items[i].time || 0)) idx = i;
            else break;
        }
        if(idx < 0){
            const left = firstTime - cur;
            const showCount = left > 0 && left <= 3;
            if(countdown) countdown.classList.toggle('show', showCount);
            if(countdownNum && showCount) countdownNum.textContent = String(Math.max(1, Math.ceil(left)));
            if(karaokeState.viewerActive !== -1){
                karaokeState.viewerActive = -1;
                lines.forEach(el=>el.classList.remove('active'));
            }
            if(inner) inner.style.transform = 'translateY(0px)';
            return;
        }
        if(countdown) countdown.classList.remove('show');
        if(idx === karaokeState.viewerActive) return;
        karaokeState.viewerActive = idx;
        lines.forEach((el,i)=>el.classList.toggle('active', i===idx));
        if(inner && lines[idx]){
            const viewer = inner.closest('.karaoke-viewer');
            const viewerH = viewer ? viewer.clientHeight : 360;
            const activeTop = lines[idx].offsetTop;
            const activeH = lines[idx].offsetHeight || 54;
            const y = Math.round((viewerH / 2) - activeTop - (activeH / 2));
            inner.style.transform = `translateY(${y}px)`;
            lines[idx].scrollIntoView({block:'nearest', inline:'nearest'});
        }
    }
    function refreshCustomSelectsSoon(){
        setTimeout(()=>{ if(typeof setupCustomSelects === 'function') setupCustomSelects(); if(typeof refreshCustomSelectLabels === 'function') refreshCustomSelectLabels(); },0);
    }


