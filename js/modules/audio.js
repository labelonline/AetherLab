/* AetherLab module extracted from the former monolithic index.html. */
    /* ===== Global AetherLab custom audio players ===== */
    function aetherAudioIcon(name){
        if(name === 'play') return '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7-11-7Z" fill="currentColor" stroke="none"/></svg>';
        if(name === 'back') return '<svg viewBox="0 0 24 24"><path d="M11 8 7 12l4 4"/><path d="M7 12h10"/></svg>';
        if(name === 'forward') return '<svg viewBox="0 0 24 24"><path d="m13 8 4 4-4 4"/><path d="M7 12h10"/></svg>';
        return '<span class="pause-bars">Ⅱ</span>';
    }

    function aetherAudioFormatTime(sec){
        sec = Math.max(0, Number(sec) || 0);
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`;
    }

    function aetherMakeCustomAudioPlayer(audio){
        if(!audio || audio.dataset.aetherPlayerBound === '1' || !audio.hasAttribute('controls')) return;
        audio.dataset.aetherPlayerBound = '1';
        audio.classList.add('aether-audio-native-hidden');
        audio.removeAttribute('controls');

        const player = document.createElement('div');
        player.className = 'aether-audio-player global-audio-player';
        const title = audio.getAttribute('data-title') || audio.getAttribute('title') || audio.getAttribute('aria-label') || 'Аудиофайл';
        player.innerHTML = `
            <div class="aether-player-main">
                <button type="button" class="aether-play-btn" title="Воспроизвести">${aetherAudioIcon('play')}</button>
                <div class="aether-player-time">0:00 / 0:00</div>
                <div class="aether-progress"><div class="aether-progress-fill"></div></div>
                <button type="button" class="aether-icon-btn" title="Назад на 5 секунд">−5</button>
                <button type="button" class="aether-icon-btn" title="Вперёд на 5 секунд">+5</button>
            </div>
            <div class="aether-player-bottom">
                <div class="aether-player-meta"></div>
                <div class="aether-player-rate">
                    <label class="text-sm">Скорость</label>
                    <select class="aether-global-rate">
                        <option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1" selected>1x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2x</option>
                    </select>
                </div>
            </div>`;
        const meta = player.querySelector('.aether-player-meta');
        if(meta) meta.textContent = title;
        audio.insertAdjacentElement('afterend', player);

        const playBtn = player.querySelector('.aether-play-btn');
        const timeEl = player.querySelector('.aether-player-time');
        const progress = player.querySelector('.aether-progress');
        const fill = player.querySelector('.aether-progress-fill');
        const backBtn = player.querySelectorAll('.aether-icon-btn')[0];
        const forwardBtn = player.querySelectorAll('.aether-icon-btn')[1];
        const rate = player.querySelector('.aether-global-rate');

        const update = () => {
            const dur = Number.isFinite(audio.duration) ? audio.duration : 0;
            const cur = audio.currentTime || 0;
            if(playBtn) playBtn.innerHTML = audio.paused ? aetherAudioIcon('play') : aetherAudioIcon('pause');
            if(timeEl) timeEl.textContent = `${aetherAudioFormatTime(cur)} / ${aetherAudioFormatTime(dur)}`;
            if(fill) fill.style.width = dur ? Math.min(100, Math.max(0, cur / dur * 100)) + '%' : '0%';
        };

        playBtn && playBtn.addEventListener('click', () => {
            document.querySelectorAll('audio').forEach(a => { if(a !== audio && !a.paused) a.pause(); });
            if(audio.paused) audio.play(); else audio.pause();
            update();
        });
        progress && progress.addEventListener('click', (e) => {
            if(!Number.isFinite(audio.duration)) return;
            const rect = progress.getBoundingClientRect();
            const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            audio.currentTime = pct * audio.duration;
            update();
        });
        backBtn && backBtn.addEventListener('click', () => {
            audio.currentTime = Math.max(0, (audio.currentTime || 0) - 5);
            update();
        });
        forwardBtn && forwardBtn.addEventListener('click', () => {
            const max = Number.isFinite(audio.duration) ? audio.duration : Infinity;
            audio.currentTime = Math.min(max, (audio.currentTime || 0) + 5);
            update();
        });
        rate && rate.addEventListener('change', () => { audio.playbackRate = Number(rate.value) || 1; });
        ['loadedmetadata','durationchange','timeupdate','play','pause','ended','seeking','seeked'].forEach(ev => audio.addEventListener(ev, update));
        update();
        if(typeof refreshCustomSelectsSoon === 'function') refreshCustomSelectsSoon();
    }

    function aetherUpgradeAllAudioPlayers(root=document){
        try{
            root.querySelectorAll && root.querySelectorAll('audio[controls]').forEach(aetherMakeCustomAudioPlayer);
        }catch(e){ console.warn('Aether audio player init skipped:', e); }
    }

    document.addEventListener('DOMContentLoaded', () => aetherUpgradeAllAudioPlayers());
    const aetherAudioObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes && m.addedNodes.forEach(node => {
                if(node.nodeType !== 1) return;
                if(node.matches && node.matches('audio[controls]')) aetherMakeCustomAudioPlayer(node);
                aetherUpgradeAllAudioPlayers(node);
            });
        });
    });
    aetherAudioObserver.observe(document.documentElement, { childList:true, subtree:true });



