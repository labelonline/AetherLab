/* AetherLab module extracted from the former monolithic index.html. */
    function getPromoForRelease(releaseId){
        return (appState.promoLinks || []).find(x => String(x.releaseId) === String(releaseId) && !x.deleted);
    }
    function savePromoLinkRecord(record){
        if(!record.id) record.id = Date.now().toString();
        const idx = appState.promoLinks.findIndex(x => String(x.id) === String(record.id));
        if(idx >= 0) appState.promoLinks[idx] = record; else appState.promoLinks.push(record);
        db.ref('promoLinks/' + record.id).set(record);
        renderPromoLinks();
    }
    function renderPromoLinks(){
        const area = document.getElementById('promoLinksArea');
        if(!area || !currentUser) return;
        const isAdmin = currentUser.role === 'Administrator';
        const rels = getReleasesVisibleToCurrentUser().filter(r => !r.isDeleted && isApprovedRelease(r));
        if(isAdmin){
            area.innerHTML = `<div class="promo-admin-panel">
                <h2>Промо-ссылки для релизов</h2>
                <p class="text-sm" style="margin-bottom:16px;">Выберите релиз и добавьте ссылку. Артист увидит её в своём кабинете.</p>
                <div class="karaoke-grid">
                    <div class="form-group"><label>Релиз</label><select id="promoReleaseSelect">${rels.map(r=>`<option value="${escapeAttr(r.id)}">${escapeHTML(r.artist || '')} — ${escapeHTML(r.title || 'Без названия')}</option>`).join('')}</select></div>
                    <div class="form-group"><label>Промо-ссылка</label><input type="url" id="promoUrlInput" placeholder="https://..."></div>
                </div>
                <button class="btn-primary" onclick="addPromoLinkFromAdmin()">Сохранить ссылку</button>
            </div><div id="promoCardsList" style="margin-top:18px;">${renderPromoCards(rels, true)}</div>`;
            setTimeout(()=>initCustomSelects(area),0);
        } else {
            area.innerHTML = `<div id="promoCardsList">${renderPromoCards(rels, false)}</div>`;
        }
    }
    function renderPromoCards(rels, isAdmin){
        rels = (rels || []).filter(isApprovedRelease);
        if(!rels.length) return '<div class="empty-panel">Пока нет принятых релизов для промо-ссылок.</div>';
        return rels.map(r => {
            const promo = getPromoForRelease(r.id);
            const url = promo ? promo.url : '';
            return `<div class="promo-release-card">
                <img src="${r.coverFile || ''}" alt="Обложка">
                <div class="promo-release-main">
                    <div class="release-title-pro">${escapeHTML(r.title || 'Без названия')}</div>
                    <div class="release-artist-pro">${escapeHTML(r.artist || '—')}</div>
                    <div class="text-sm">Дата выхода: ${escapeHTML(formatReleaseDate(r.releaseDate))}</div>
                    ${url ? `<div class="promo-url">${escapeHTML(url)}</div>` : `<div class="text-sm" style="margin-top:8px;">Промо-ссылка пока не добавлена.</div>`}
                </div>
                <div class="promo-actions">
                    ${url ? `<button class="btn-outline" onclick="copyPromoLink('${escapeAttr(url)}')">Скопировать ссылку</button><button class="btn-primary" onclick="window.open('${escapeAttr(url)}','_blank','noopener')">Открыть в новой вкладке</button>` : ''}
                    ${isAdmin && url ? `<button class="btn-danger" onclick="deletePromoLink('${escapeAttr(promo.id)}')">Удалить</button>` : ''}
                </div>
            </div>`;
        }).join('');
    }
    function addPromoLinkFromAdmin(){
        const relId = document.getElementById('promoReleaseSelect')?.value;
        const url = (document.getElementById('promoUrlInput')?.value || '').trim();
        if(!relId || !url) return UI.alert('Ошибка', 'Выберите релиз и вставьте ссылку.');
        if(!/^https?:\/\//i.test(url)) return UI.alert('Ошибка', 'Ссылка должна начинаться с http:// или https://');
        const selectedRelease = appState.releases.find(r => String(r.id) === String(relId));
        if(!selectedRelease || !isApprovedRelease(selectedRelease) || selectedRelease.isDeleted) return UI.alert('Ошибка', 'Промо-ссылку можно добавить только к принятому релизу.');
        const existing = getPromoForRelease(relId);
        savePromoLinkRecord({ id: existing ? existing.id : Date.now().toString(), releaseId: relId, url, createdAt: Date.now(), deleted:false });
        UI.alert('Готово', 'Промо-ссылка сохранена.');
    }
    function copyPromoLink(url){
        navigator.clipboard && navigator.clipboard.writeText(url).then(()=>UI.alert('Скопировано', 'Ссылка скопирована.')).catch(()=>UI.alert('Ссылка', escapeHTML(url)));
    }
    function deletePromoLink(id){
        const item = (appState.promoLinks || []).find(x => String(x.id) === String(id));
        if(!item) return;
        item.deleted = true;
        db.ref('promoLinks/' + item.id).set(item);
        renderPromoLinks();
    }

