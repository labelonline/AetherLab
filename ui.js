/* AetherLab module extracted from the former monolithic index.html. */
    function isRemoteFileUrl(value) {
        return typeof value === 'string' && /^https?:\/\//i.test(value);
    }
    function isDataUrl(value) {
        return typeof value === 'string' && /^data:/i.test(value);
    }
    function dataURLToBlob(dataUrl) {
        const parts = String(dataUrl).split(',');
        const meta = parts[0] || '';
        const mimeMatch = meta.match(/data:([^;]+)/i);
        const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const binary = atob(parts[1] || '');
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }
    async function uploadFileToCloudinary(fileOrBlob, filename) {
        if(!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) throw new Error('Cloudinary не настроен.');
        const formData = new FormData();
        formData.append('file', fileOrBlob, filename || 'file');
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const response = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: formData });
        const data = await response.json().catch(() => ({}));
        if(!response.ok || !data.secure_url) {
            const message = data && data.error && data.error.message ? data.error.message : 'Не удалось загрузить файл в Cloudinary.';
            throw new Error(message);
        }
        return {
            url: data.secure_url,
            publicId: data.public_id || '',
            resourceType: data.resource_type || '',
            format: data.format || '',
            bytes: data.bytes || 0,
            createdAt: data.created_at || ''
        };
    }
    function cleanTrackForDatabase(track) {
        const clean = Object.assign({}, track || {});
        delete clean._audioFileObj;
        delete clean._uploadPromise;
        delete clean.audioObjectUrl;
        delete clean.cloudinaryPending;
        delete clean.cloudinaryError;
        return clean;
    }
    function cleanReleaseForDatabase(release) {
        const clean = Object.assign({}, release || {});
        clean.tracks = Array.isArray(clean.tracks) ? clean.tracks.map(cleanTrackForDatabase) : [];
        delete clean._coverFileObj;
        delete clean._coverUploadPromise;
        delete clean.coverObjectUrl;
        delete clean.coverUploadError;
        return clean;
    }
    async function ensureReleaseFilesUploaded(releaseId) {
        if(!draftRelease.coverFile) throw new Error('Добавьте обложку.');

        if(draftRelease._coverUploadPromise) await draftRelease._coverUploadPromise;
        if(!isRemoteFileUrl(draftRelease.coverFile)) {
            let coverSource = draftRelease._coverFileObj || null;
            let coverName = coverSource && coverSource.name ? coverSource.name : `${releaseId || Date.now()}_cover.jpg`;
            if(!coverSource && isDataUrl(draftRelease.coverFile)) coverSource = dataURLToBlob(draftRelease.coverFile);
            if(!coverSource) throw new Error('Обложка ещё не загружена. Выберите её заново.');
            const meta = await uploadFileToCloudinary(coverSource, coverName);
            draftRelease.coverFile = meta.url;
            draftRelease.coverCloudinary = meta;
            draftRelease.coverUploadError = '';
            const preview = document.getElementById('coverPreview');
            if(preview) preview.src = meta.url;
        }

        for(const track of (draftRelease.tracks || [])) {
            if(track._uploadPromise) await track._uploadPromise;
            if(isRemoteFileUrl(track.audioFile)) continue;

            let audioSource = track._audioFileObj || null;
            let audioName = track.filename || `${track.title || 'track'}.wav`;
            if(!audioSource && isDataUrl(track.audioFile)) audioSource = dataURLToBlob(track.audioFile);
            if(!audioSource) throw new Error(`Аудиофайл «${track.filename || track.title || 'трек'}» ещё не загружен. Добавьте его заново.`);

            track.cloudinaryPending = true;
            track.cloudinaryError = '';
            renderDraftTracks();
            const meta = await uploadFileToCloudinary(audioSource, audioName);
            track.audioFile = meta.url;
            track.audioCloudinary = meta;
            track.cloudinaryPending = false;
            track.cloudinaryError = '';
            renderDraftTracks();
        }
    }
    function buildReleaseDataForDatabase(releaseData) {
        return cleanReleaseForDatabase(releaseData);
    }
    

    function richLooksLikeHTML(value) {
        return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
    }
    function sanitizeRichHTML(input) {
        const raw = String(input || '');
        const template = document.createElement('template');
        template.innerHTML = raw;
        const allowed = new Set(['B','STRONG','I','EM','U','S','STRIKE','DEL','BLOCKQUOTE','CODE','PRE','A','SPAN','BR','DIV','P','H1','H2','H3']);
        const cleanNode = (node) => {
            if(node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
            if(node.nodeType !== Node.ELEMENT_NODE) return document.createTextNode('');
            const tag = node.tagName.toUpperCase();
            if(!allowed.has(tag)) {
                const frag = document.createDocumentFragment();
                Array.from(node.childNodes).forEach(child => frag.appendChild(cleanNode(child)));
                return frag;
            }
            let outTag = tag.toLowerCase();
            if(['DIV','P','H1','H2','H3'].includes(tag)) outTag = 'span';
            const el = document.createElement(outTag);
            if(tag === 'A') {
                let href = (node.getAttribute('href') || '').trim();
                if(href && !/^(https?:|mailto:|tel:)/i.test(href)) href = 'https://' + href.replace(/^\/+/, '');
                if(href) {
                    el.setAttribute('href', href);
                    el.setAttribute('target', '_blank');
                    el.setAttribute('rel', 'noopener noreferrer');
                }
            }
            if(tag === 'SPAN') {
                const cls = String(node.getAttribute('class') || '').split(/\s+/).filter(c => ['rich-spoiler','rich-section-title'].includes(c));
                if(cls.length) el.setAttribute('class', cls.join(' '));
            }
            if(['H1','H2','H3'].includes(tag)) el.setAttribute('class', 'rich-section-title');
            Array.from(node.childNodes).forEach(child => el.appendChild(cleanNode(child)));
            return el;
        };
        const out = document.createElement('div');
        Array.from(template.content.childNodes).forEach(node => out.appendChild(cleanNode(node)));
        return out.innerHTML;
    }
    function richStoredToEditorHTML(value) {
        const raw = String(value || '');
        if(!richLooksLikeHTML(raw)) return escapeHTML(raw).replace(/\n/g, '<br>');
        return sanitizeRichHTML(raw).replace(/\n/g, '<br>');
    }
    function nodeToSafeRichHTML(node) {
        const holder = document.createElement('div');
        holder.appendChild(node.cloneNode(true));
        return sanitizeRichHTML(holder.innerHTML);
    }
    function richEditorToStoredHTML(editor) {
        if(!editor) return '';
        const lines = [];
        let inline = [];
        const flushInline = () => {
            if(inline.length) {
                lines.push(sanitizeRichHTML(inline.join('')));
                inline = [];
            }
        };
        Array.from(editor.childNodes).forEach(node => {
            if(node.nodeType === Node.TEXT_NODE) {
                inline.push(escapeHTML(node.textContent || ''));
                return;
            }
            if(node.nodeType !== Node.ELEMENT_NODE) return;
            const tag = node.tagName.toUpperCase();
            if(tag === 'BR') {
                flushInline();
                if(!lines.length || lines[lines.length - 1] !== '') lines.push('');
                return;
            }
            if(['DIV','P','H1','H2','H3','BLOCKQUOTE','PRE'].includes(tag)) {
                flushInline();
                const inner = sanitizeRichHTML(node.innerHTML || '');
                if(tag === 'BLOCKQUOTE') lines.push(`<blockquote>${inner || '<br>'}</blockquote>`);
                else if(tag === 'PRE') lines.push(`<pre>${inner || '<br>'}</pre>`);
                else if(['H1','H2','H3'].includes(tag)) lines.push(`<span class="rich-section-title">${inner}</span>`);
                else lines.push(inner || '');
                return;
            }
            inline.push(nodeToSafeRichHTML(node));
        });
        flushInline();
        return sanitizeRichHTML(lines.join('\n')).replace(/(\n){4,}/g, '\n\n\n').trim();
    }
    function richHTMLToPlainText(html) {
        const div = document.createElement('div');
        div.innerHTML = sanitizeRichHTML(String(html || '').replace(/\n/g, '<br>'));
        return (div.innerText || div.textContent || '').replace(/\u00a0/g, ' ').trim();
    }
    function richStoredToLines(value) {
        const raw = String(value || '');
        if(!richLooksLikeHTML(raw)) return raw.split('\n').map(line => escapeHTML(line));
        return sanitizeRichHTML(raw).split('\n');
    }
    function renderRichToolbar(editorId) {
        const id = String(editorId || '').replace(/[^a-zA-Z0-9_-]/g, '');
        return `<div class="rich-toolbar" onmousedown="event.preventDefault()">
            <button type="button" class="rich-undo-tool" title="Отменить · Ctrl+Z" onclick="richEditorUndo('${id}')">↶</button>
            <button type="button" class="rich-undo-tool" title="Вернуть · Ctrl+Shift+Z / Ctrl+Y" onclick="richEditorRedo('${id}')">↷</button>
            <span class="rich-separator"></span>
            <button type="button" title="Жирный · Ctrl+B" onclick="formatRichText('${id}','bold')"><b>B</b></button>
            <button type="button" title="Курсив · Ctrl+I" onclick="formatRichText('${id}','italic')"><i>I</i></button>
            <button type="button" title="Подчёркнутый · Ctrl+U" onclick="formatRichText('${id}','underline')"><u>U</u></button>
            <button type="button" title="Зачёркнутый · Ctrl+Shift+X" onclick="formatRichText('${id}','strike')"><s>S</s></button>
            <button type="button" title="Цитата · Ctrl+Shift+." onclick="formatRichText('${id}','quote')">❝</button>
            <button type="button" title="Моноширинный · Ctrl+Shift+M" onclick="formatRichText('${id}','code')">⌘</button>
            <button type="button" title="Скрытый · Ctrl+Shift+P" onclick="formatRichText('${id}','spoiler')">▣</button>
            <button type="button" title="Добавить ссылку · Ctrl+K" onclick="formatRichText('${id}','link')">↗</button>
            <button type="button" class="rich-tool-wide" title="Сделать выделенный текст большим разделом · Ctrl+Shift+H" onclick="formatRichText('${id}','section')">Раздел</button>
        </div>`;
    }
    const richEditorHistory = {};
    function getRichEditorHistory(editorId) {
        const id = String(editorId || '');
        if(!richEditorHistory[id]) richEditorHistory[id] = { stack: [], index: -1, timer: null, silent: false };
        return richEditorHistory[id];
    }
    function initRichEditorHistory(editorId) {
        const editor = document.getElementById(editorId);
        if(!editor) return;
        const hist = getRichEditorHistory(editorId);
        if(!hist.stack.length) {
            hist.stack = [editor.innerHTML];
            hist.index = 0;
        }
        if(editor.dataset.richHistoryReady === '1') return;
        editor.dataset.richHistoryReady = '1';
        editor.addEventListener('input', () => scheduleRichHistoryPush(editorId));
        editor.addEventListener('paste', () => setTimeout(() => pushRichHistory(editorId, true), 0));
        editor.addEventListener('blur', () => pushRichHistory(editorId, true));
    }
    function pushRichHistory(editorId, force = false) {
        const editor = document.getElementById(editorId);
        if(!editor) return;
        const hist = getRichEditorHistory(editorId);
        if(hist.silent) return;
        const html = editor.innerHTML;
        if(!force && hist.stack[hist.index] === html) return;
        if(hist.stack[hist.index] === html) return;
        if(hist.index < hist.stack.length - 1) hist.stack = hist.stack.slice(0, hist.index + 1);
        hist.stack.push(html);
        if(hist.stack.length > 80) hist.stack.shift();
        hist.index = hist.stack.length - 1;
    }
    function scheduleRichHistoryPush(editorId) {
        const hist = getRichEditorHistory(editorId);
        clearTimeout(hist.timer);
        hist.timer = setTimeout(() => pushRichHistory(editorId, true), 220);
    }
    function restoreRichHistory(editorId, direction) {
        const editor = document.getElementById(editorId);
        if(!editor) return;
        initRichEditorHistory(editorId);
        const hist = getRichEditorHistory(editorId);
        const next = hist.index + direction;
        if(next < 0 || next >= hist.stack.length) return;
        hist.silent = true;
        hist.index = next;
        editor.innerHTML = hist.stack[hist.index] || '';
        hist.silent = false;
        editor.focus();
        editor.dispatchEvent(new Event('input', { bubbles:true }));
    }
    function richEditorUndo(editorId) {
        restoreRichHistory(editorId, -1);
    }
    function richEditorRedo(editorId) {
        restoreRichHistory(editorId, 1);
    }

    function focusRichEditor(editorId) {
        const editor = document.getElementById(editorId);
        if(editor) editor.focus();
        return editor;
    }
    function wrapRichSelection(editorId, tagName, className = '') {
        const editor = focusRichEditor(editorId);
        const sel = window.getSelection();
        if(!editor || !sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        if(!editor.contains(range.commonAncestorContainer) || range.collapsed) return;
        const wrapper = document.createElement(tagName);
        if(className) wrapper.className = className;
        try {
            range.surroundContents(wrapper);
        } catch(e) {
            wrapper.appendChild(range.extractContents());
            range.insertNode(wrapper);
        }
        sel.removeAllRanges();
        const nextRange = document.createRange();
        nextRange.selectNodeContents(wrapper);
        sel.addRange(nextRange);
    }
    function formatRichText(editorId, action) {
        const editor = focusRichEditor(editorId);
        if(!editor) return;
        initRichEditorHistory(editorId);
        if(action === 'undo') return richEditorUndo(editorId);
        if(action === 'redo') return richEditorRedo(editorId);
        pushRichHistory(editorId, true);
        const before = editor.innerHTML;
        if(action === 'bold') document.execCommand('bold', false, null);
        else if(action === 'italic') document.execCommand('italic', false, null);
        else if(action === 'underline') document.execCommand('underline', false, null);
        else if(action === 'strike') document.execCommand('strikeThrough', false, null);
        else if(action === 'quote') document.execCommand('formatBlock', false, 'blockquote');
        else if(action === 'code') wrapRichSelection(editorId, 'code');
        else if(action === 'spoiler') wrapRichSelection(editorId, 'span', 'rich-spoiler');
        else if(action === 'section') wrapRichSelection(editorId, 'span', 'rich-section-title');
        else if(action === 'link') {
            const url = prompt('Вставьте ссылку');
            if(url) document.execCommand('createLink', false, url.trim());
        }
        if(editor.innerHTML !== before) pushRichHistory(editorId, true);
        editor.dispatchEvent(new Event('input', { bubbles:true }));
    }
    function handleRichEditorHotkeys(e, editorId) {
        if(!e.ctrlKey) return;
        const key = String(e.key || '').toLowerCase();
        if(!e.shiftKey && key === 'z') { e.preventDefault(); richEditorUndo(editorId); return; }
        if((e.shiftKey && key === 'z') || (!e.shiftKey && key === 'y')) { e.preventDefault(); richEditorRedo(editorId); return; }
        if(!e.shiftKey && key === 'b') { e.preventDefault(); formatRichText(editorId, 'bold'); }
        else if(!e.shiftKey && key === 'i') { e.preventDefault(); formatRichText(editorId, 'italic'); }
        else if(!e.shiftKey && key === 'u') { e.preventDefault(); formatRichText(editorId, 'underline'); }
        else if(e.shiftKey && key === 'x') { e.preventDefault(); formatRichText(editorId, 'strike'); }
        else if(e.shiftKey && (key === '.' || key === '>')) { e.preventDefault(); formatRichText(editorId, 'quote'); }
        else if(e.shiftKey && key === 'm') { e.preventDefault(); formatRichText(editorId, 'code'); }
        else if(e.shiftKey && key === 'p') { e.preventDefault(); formatRichText(editorId, 'spoiler'); }
        else if(!e.shiftKey && key === 'k') { e.preventDefault(); formatRichText(editorId, 'link'); }
        else if(e.shiftKey && key === 'h') { e.preventDefault(); formatRichText(editorId, 'section'); }
    }
    function getPromptRichEditorValue(id) {
        return richEditorToStoredHTML(document.getElementById(id));
    }

    class UI {
        static alert(title, text) { document.getElementById('uiAlertTitle').innerText = title; document.getElementById('uiAlertText').innerHTML = text; document.getElementById('uiAlert').classList.remove('hidden'); }
        static prompt(title, fields, onConfirm) { 
            document.getElementById('uiPromptTitle').innerText = title; 
            document.getElementById('uiPromptInputs').innerHTML = fields.map(f => {
                const esc = (v) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                if(f.type === 'select') {
                    let opts = f.options.map(o => `<option value="${esc(o.v)}" ${o.v===f.value?'selected':''}>${esc(o.t)}</option>`).join('');
                    return `<div class="form-group"><label>${esc(f.label || '')}</label><select id="prompt_${f.id}">${opts}</select></div>`;
                }
                if(f.type === 'richtext') {
                    const editorId = `prompt_${f.id}`;
                    return `<div class="form-group"><label>${esc(f.label || '')}</label><div class="rich-editor-shell">${renderRichToolbar(editorId)}<div class="rich-editor" id="${editorId}" contenteditable="true" data-placeholder="${esc(f.placeholder || 'Введите текст...')}" onfocus="initRichEditorHistory('${editorId}')" onkeydown="handleRichEditorHotkeys(event,'${editorId}')">${richStoredToEditorHTML(f.value || '')}</div></div><div class="rich-hotkeys-help">Горячие клавиши: Ctrl+Z — отменить, Ctrl+Shift+Z / Ctrl+Y — вернуть, Ctrl+B — жирный, Ctrl+I — курсив, Ctrl+U — подчёркивание, Ctrl+Shift+X — зачёркивание, Ctrl+Shift+. — цитата, Ctrl+Shift+M — моноширинный, Ctrl+Shift+P — скрытый, Ctrl+K — ссылка. Кнопка «Раздел» делает выделенный текст крупным заголовком.</div></div>`;
                }
                if(f.type === 'textarea') {
                    return `<div class="form-group"><label>${esc(f.label || '')}</label><textarea id="prompt_${f.id}" placeholder="${esc(f.placeholder || '')}" rows="${f.rows || 5}">${esc(f.value || '')}</textarea></div>`;
                }
                if(f.type === 'file') {
                    const multipleAttr = f.multiple ? 'multiple' : '';
                    const btnText = f.multiple ? 'Выбрать файлы' : 'Выбрать файл';
                    return `<div class="form-group"><label>${esc(f.label || '')}</label><div class="custom-file-wrap"><input class="custom-file-input" type="file" id="prompt_${f.id}" accept="${esc(f.accept || '')}" ${multipleAttr} onchange="updateCustomFileName('prompt_${f.id}')"><button type="button" class="custom-file-btn" onclick="document.getElementById('prompt_${f.id}').click()">${btnText}</button><span class="custom-file-name" id="prompt_${f.id}_name">Файл не выбран</span></div></div>`;
                }
                return `<div class="form-group"><label>${esc(f.label || '')}</label><input type="${f.type||'text'}" id="prompt_${f.id}" placeholder="${esc(f.placeholder||'')}" value="${esc(f.value||'')}"></div>`;
            }).join(''); 
            document.body.classList.add('kite-modal-locked');
            const promptOverlay = document.getElementById('uiPrompt');
            promptOverlay.classList.remove('hidden');
            promptOverlay.scrollTop = 0;
            const promptInputsBox = document.getElementById('uiPromptInputs');
            if(promptInputsBox) promptInputsBox.scrollTop = 0;
            setTimeout(() => fields.forEach(f => { if(f.type === 'richtext') initRichEditorHistory(`prompt_${f.id}`); }), 0);
            document.getElementById('uiPromptConfirm').onclick = () => { 
                const results = {}; fields.forEach(f => { const el = document.getElementById(`prompt_${f.id}`); results[f.id] = f.type === 'file' ? (f.multiple ? Array.from(el.files || []) : (el.files && el.files[0] ? el.files[0] : null)) : (f.type === 'richtext' ? getPromptRichEditorValue(`prompt_${f.id}`) : el.value); }); 
                this.closePrompt(); onConfirm(results); 
            }; 
        }
        static closePrompt() { document.getElementById('uiPrompt').classList.add('hidden'); document.body.classList.remove('kite-modal-locked'); }
        static confirm(title, onConfirm) { document.getElementById('uiConfirmTitle').innerText = title; document.getElementById('uiConfirm').classList.remove('hidden'); document.getElementById('uiConfirmBtn').onclick = () => { this.closeConfirm(); onConfirm(); }; }
        static closeConfirm() { document.getElementById('uiConfirm').classList.add('hidden'); }
    }

    function initPromptScrollContainment() {
        const prompt = document.getElementById('uiPrompt');
        if(!prompt || prompt.dataset.scrollContainmentReady === '1') return;
        prompt.dataset.scrollContainmentReady = '1';
        prompt.addEventListener('wheel', (e) => {
            const scrollable = e.target.closest('#uiPromptInputs, .rich-editor');
            if(!scrollable) { e.preventDefault(); return; }
            const canScroll = scrollable.scrollHeight > scrollable.clientHeight;
            if(!canScroll) { e.preventDefault(); return; }
            const atTop = scrollable.scrollTop <= 0;
            const atBottom = Math.ceil(scrollable.scrollTop + scrollable.clientHeight) >= scrollable.scrollHeight;
            if((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) e.preventDefault();
        }, { passive:false });
        let touchStartY = 0;
        prompt.addEventListener('touchstart', (e) => { touchStartY = e.touches && e.touches[0] ? e.touches[0].clientY : 0; }, { passive:true });
        prompt.addEventListener('touchmove', (e) => {
            const scrollable = e.target.closest('#uiPromptInputs, .rich-editor');
            if(!scrollable) { e.preventDefault(); return; }
            const currentY = e.touches && e.touches[0] ? e.touches[0].clientY : touchStartY;
            const deltaY = touchStartY - currentY;
            const atTop = scrollable.scrollTop <= 0;
            const atBottom = Math.ceil(scrollable.scrollTop + scrollable.clientHeight) >= scrollable.scrollHeight;
            if((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) e.preventDefault();
        }, { passive:false });
    }
    document.addEventListener('DOMContentLoaded', initPromptScrollContainment);

    function updateCustomFileName(inputId) {
        const input = document.getElementById(inputId);
        const label = document.getElementById(inputId + '_name');
        if(!input || !label) return;
        const files = Array.from(input.files || []);
        if(!files.length) label.textContent = 'Файл не выбран';
        else if(files.length === 1) label.textContent = files[0].name;
        else label.textContent = `Выбрано файлов: ${files.length}`;
    }

