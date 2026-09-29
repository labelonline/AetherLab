
(function(){
    const AI_FULL = 'Трек полностью сгенерирован ИИ';
    const AI_MUSIC = 'ИИ использован частично, только для генерации музыки';
    const AI_TEXT = 'ИИ использован частично, только для генерации текста';
    const AI_VOCAL = 'ИИ использован частично, только для генерации и/или обработки вокала';
    const AI_OPTIONS = [
        AI_FULL,
        AI_MUSIC,
        AI_TEXT,
        AI_VOCAL
    ];

    function getTrackAiInputs(box){
        box = box || document.getElementById('trackAiUsageBox');
        return box ? Array.from(box.querySelectorAll('input.t_ai_usage')) : [];
    }

    function setLabelDisabled(input, disabled){
        const label = input && input.closest ? input.closest('.ai-usage-check') : null;
        if(label) label.classList.toggle('ai-disabled', !!disabled);
    }

    function refreshTrackAiUsageLocks(box){
        const inputs = getTrackAiInputs(box);
        if(!inputs.length) return;
        const full = inputs.find(input => input.value === AI_FULL);
        const partials = inputs.filter(input => input.value !== AI_FULL);
        const fullChecked = !!(full && full.checked);
        const partialChecked = partials.some(input => input.checked);

        if(fullChecked){
            partials.forEach(input => {
                input.checked = false;
                input.disabled = true;
                setLabelDisabled(input, true);
            });
            if(full){ full.disabled = false; setLabelDisabled(full, false); }
            return;
        }

        partials.forEach(input => {
            input.disabled = false;
            setLabelDisabled(input, false);
        });
        if(full){
            full.checked = false;
            full.disabled = partialChecked;
            setLabelDisabled(full, partialChecked);
        }
    }

    window.handleTrackAiUsageChange = function(input){
        const box = input && input.closest ? input.closest('#trackAiUsageBox') : document.getElementById('trackAiUsageBox');
        const inputs = getTrackAiInputs(box);
        const full = inputs.find(item => item.value === AI_FULL);
        const partials = inputs.filter(item => item.value !== AI_FULL);

        if(input && input.value === AI_FULL && input.checked){
            partials.forEach(item => { item.checked = false; });
        } else if(input && input.value !== AI_FULL && input.checked && full){
            full.checked = false;
        }

        refreshTrackAiUsageLocks(box);
        if(typeof window.refreshTrackAiProofFields === 'function') window.refreshTrackAiProofFields();
        try { window.isDraftDirty = true; } catch(e) {}
    };

    function isGoogleDriveUrl(value){
        const url = String(value || '').trim();
        if(!url) return false;
        return /^https?:\/\/(drive\.google\.com|docs\.google\.com|disk\.yandex\.(ru|com)|yadi\.sk)\//i.test(url);
    }

    function setProofBoxVisible(box, input, visible){
        if(box) box.classList.toggle('hidden', !visible);
        if(input){
            input.required = !!visible;
            if(!visible) input.classList.remove('error-field');
        }
    }

    window.refreshTrackAiProofFields = function(){
        const box = document.getElementById('trackAiUsageBox');
        const selected = getTrackAiInputs(box).filter(input => input.checked).map(input => input.value);
        const needsSubscription = selected.includes(AI_FULL) || selected.includes(AI_MUSIC);
        const needsText = selected.includes(AI_TEXT);
        const subBox = document.getElementById('aiProofSubscriptionBox');
        const textBox = document.getElementById('aiProofTextBox');
        const subInput = document.getElementById('t_ai_proof_subscription');
        const textInput = document.getElementById('t_ai_proof_text');
        setProofBoxVisible(subBox, subInput, needsSubscription);
        setProofBoxVisible(textBox, textInput, needsText);
        if(!needsSubscription && subInput) subInput.value = '';
        if(!needsText && textInput) textInput.value = '';
    };

    window.getTrackAiProofState = function(){
        const box = document.getElementById('trackAiUsageBox');
        const selected = getTrackAiInputs(box).filter(input => input.checked).map(input => input.value);
        const needsSubscription = selected.includes(AI_FULL) || selected.includes(AI_MUSIC);
        const needsText = selected.includes(AI_TEXT);
        const subInput = document.getElementById('t_ai_proof_subscription');
        const textInput = document.getElementById('t_ai_proof_text');
        const subscriptionUrl = String((subInput && subInput.value) || '').trim();
        const textUrl = String((textInput && textInput.value) || '').trim();
        const subscriptionValid = !needsSubscription || isGoogleDriveUrl(subscriptionUrl);
        const textValid = !needsText || isGoogleDriveUrl(textUrl);
        if(subInput) subInput.classList.toggle('error-field', needsSubscription && (!subscriptionUrl || !subscriptionValid));
        if(textInput) textInput.classList.toggle('error-field', needsText && (!textUrl || !textValid));
        return { needsSubscription, needsText, subscriptionUrl, textUrl, subscriptionValid, textValid };
    };

    window.setTrackAiProofValues = function(subscriptionUrl, textUrl){
        const subInput = document.getElementById('t_ai_proof_subscription');
        const textInput = document.getElementById('t_ai_proof_text');
        if(subInput) subInput.value = subscriptionUrl || '';
        if(textInput) textInput.value = textUrl || '';
        window.refreshTrackAiProofFields();
    };

    const oldSetAiUsageChecked = window.setAiUsageChecked;
    window.setAiUsageChecked = function(containerId, value){
        if(typeof oldSetAiUsageChecked === 'function') oldSetAiUsageChecked.apply(this, arguments);
        if(containerId === 'trackAiUsageBox') {
            refreshTrackAiUsageLocks(document.getElementById(containerId));
            if(typeof window.refreshTrackAiProofFields === 'function') window.refreshTrackAiProofFields();
        }
    };

    window.getAiUsageChecked = function(containerId){
        const box = document.getElementById(containerId);
        if(!box) return [];
        return Array.from(box.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
    };

    function normalizeAiUsageLocal(value){
        if(typeof window.normalizeAiUsage === 'function') return window.normalizeAiUsage(value);
        let list = [];
        if(Array.isArray(value)) list = value;
        else if(typeof value === 'string' && value.trim()) list = value.split(/[;\n]+/);
        else if(value === true) list = ['Использован ИИ'];
        const aliases = {
            'Трек полностью сгенерирован ИИ (Текст + Музыка)': AI_FULL,
            'ИИ использован частично, только для обработки трека': 'ИИ использован частично, только для генерации и/или обработки вокала',
            'Использован ИИ': AI_FULL
        };
        const result = [];
        list.forEach(item => {
            const clean = String(item || '').trim();
            if(!clean) return;
            const mapped = aliases[clean] || clean;
            if(!result.includes(mapped)) result.push(mapped);
        });
        return result;
    }

    function escapeHTMLLocal(str){
        if(typeof window.escapeHTML === 'function') return window.escapeHTML(str);
        return String(str ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
    }
    function escapeAttrLocal(str){
        if(typeof window.escapeAttr === 'function') return window.escapeAttr(str);
        return String(str ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
    }

    function readonlyAiCheck(label, checked){
        return `<label class="ai-readonly-check"><input type="checkbox" ${checked ? 'checked' : ''} disabled><span>${escapeHTMLLocal(label)}</span></label>`;
    }

    function readonlyAiList(selected){
        selected = normalizeAiUsageLocal(selected);
        return `<div class="ai-readonly-list">${AI_OPTIONS.map(option => readonlyAiCheck(option, selected.includes(option))).join('')}</div>`;
    }

    function patchReleaseInfoAiFields(release){
        const infoBox = document.getElementById('admRelInfo');
        const tracksBox = document.getElementById('admRelTracks');
        if(infoBox){
            Array.from(infoBox.querySelectorAll('.release-info-box')).forEach(box => {
                const label = box.querySelector('.release-meta-label');
                if(label && ['Использование ИИ в обложке','AI use in cover art','Використання ШІ в обкладинці'].includes(label.textContent.trim())){
                    box.innerHTML = `<div class="release-meta-label">Использование ИИ в обложке</div><div class="release-meta-value">${readonlyAiCheck('При создании обложки использовался искусственный интеллект', !!(release && release.aiCoverUsed))}</div>`;
                }
            });
        }
        if(tracksBox){
            const tracks = Array.isArray(release && release.tracks) ? release.tracks : [];
            tracksBox.querySelectorAll('.release-info-ai-summary').forEach(el => el.remove());
            tracksBox.querySelectorAll('.release-info-ai-proof-links').forEach(el => el.remove());
            Array.from(tracksBox.querySelectorAll('.release-info-track-card')).forEach((card, index) => {
                const track = tracks[index] || {};
                const old = card.querySelector('.release-info-ai-checks');
                if(old) old.remove();
                const sub = card.querySelector('.release-info-track-sub');
                const holder = document.createElement('div');
                holder.className = 'release-info-ai-checks';
                const subProof = String(track.aiProofSubscription || track.aiSubscriptionProof || '').trim();
                const textProof = String(track.aiProofText || track.aiTextProof || '').trim();
                const proofLinks = [];
                if(subProof) proofLinks.push(`<a href="${escapeAttrLocal(subProof)}" target="_blank" rel="noopener">Видео-доказательство подписки</a>`);
                if(textProof) proofLinks.push(`<a href="${escapeAttrLocal(textProof)}" target="_blank" rel="noopener">Видео-доказательство текста</a>`);
                const proofHtml = proofLinks.length ? `<div class="release-info-ai-proof-links"><strong>Доказательства:</strong> ${proofLinks.join(' • ')}</div>` : '';
                holder.innerHTML = `<div class="release-info-ai-checks-title">Использование ИИ</div>${readonlyAiList(track.aiUsage || track.aiUsageOptions || track.aiUsageLabels || '')}${proofHtml}`;
                if(sub && sub.parentNode) sub.insertAdjacentElement('afterend', holder);
                else card.appendChild(holder);
            });
        }
    }

    const oldViewReleaseAdmin = window.viewReleaseAdmin;
    window.viewReleaseAdmin = function(id){
        const result = typeof oldViewReleaseAdmin === 'function' ? oldViewReleaseAdmin.apply(this, arguments) : undefined;
        let release = null;
        try { release = (typeof appState !== 'undefined' && Array.isArray(appState.releases)) ? appState.releases.find(x => String(x.id) === String(id)) : null; } catch(e) { release = null; }
        setTimeout(() => patchReleaseInfoAiFields(release), 0);
        return result;
    };
    try { viewReleaseAdmin = window.viewReleaseAdmin; } catch(e) {}

    const oldLogout = window.logout;
    window.logout = function(){
        if(typeof window.clearAetherLabSession === 'function') window.clearAetherLabSession();
        else if(typeof oldLogout === 'function') { try { oldLogout(); } catch(e) {} }
        try { sessionStorage.removeItem('aetherlab_last_route_v1'); } catch(e) {}
        location.replace('https://labelonline.github.io/AetherLab/');
    };
    try { logout = window.logout; } catch(e) {}

    document.addEventListener('change', function(event){
        if(event.target && event.target.id === 'r_cover_ai'){
            try {
                if(typeof draftRelease !== 'undefined' && draftRelease) draftRelease.aiCoverUsed = !!event.target.checked;
                if(typeof isDraftDirty !== 'undefined') isDraftDirty = true;
            } catch(e) {}
        }
    }, true);

    document.addEventListener('click', function(event){
        const help = event.target && event.target.closest ? event.target.closest('.ai-proof-help') : null;
        document.querySelectorAll('.ai-proof-help.open').forEach(item => { if(item !== help) item.classList.remove('open'); });
        if(help){
            event.preventDefault();
            event.stopPropagation();
            help.classList.toggle('open');
        }
    }, true);

    document.addEventListener('input', function(event){
        if(event.target && (event.target.id === 't_ai_proof_subscription' || event.target.id === 't_ai_proof_text')){
            if(typeof window.getTrackAiProofState === 'function') window.getTrackAiProofState();
            try { if(typeof isDraftDirty !== 'undefined') isDraftDirty = true; } catch(e) {}
        }
    }, true);

    function bootAiFields(){
        refreshTrackAiUsageLocks(document.getElementById('trackAiUsageBox'));
        if(typeof window.refreshTrackAiProofFields === 'function') window.refreshTrackAiProofFields();
    }
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootAiFields);
    else bootAiFields();
})();
