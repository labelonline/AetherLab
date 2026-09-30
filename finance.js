
(function(){
    const FINANCE_MASTER_NODE = 'financeReportsMaster';
    const FINANCE_CABINET_NODE = 'financeReportsByCabinet';
    const FINANCE_ADMIN_NODE = 'financeReportsByAdmin';
    const FINANCE_MAX_BYTES = 10 * 1024 * 1024;
    const FINANCE_SCALE = 100000000;
    const financeState = { reports: [], draft: null, lastExpandedReport: null, boundPath: '', bindToken: 0 };

    const FCOPY = {
        ru: {
            title:'Финансовые отчёты', intro:'Здесь находятся опубликованные финансовые отчёты и суммы по доступным вам релизам.',
            uploadReports:'Загрузить отчёты', uploadFile:'Загрузить файл', uploadHint:'Поддерживаются XLSX, XLS и CSV. Максимальный размер файла — 10 МБ.', close:'Закрыть',
            fileTooLarge:'Файл больше 10 МБ. Выберите файл меньшего размера.', unsupported:'Поддерживаются только XLSX, XLS и CSV.', processing:'Обработка файла…',
            noMatches:'В файле не найдено ни одной строки, которую можно точно сопоставить с релизами из базы AetherLab.', parseError:'Не удалось обработать файл.',
            success:'Успешно!', parsedSuccess:'Файл обработан. Совпавшие релизы добавлены в черновик отчёта; строки с релизами, которых нет в базе AetherLab, пропущены.',
            matchedRows:'Совпавших строк', skippedRows:'Пропущено строк', matchedReleases:'Релизов найдено', draft:'Черновик отчёта', quarter:'Квартал', amount:'Сумма', actions:'Действия',
            saveReport:'Сохранить отчёт', saved:'Изменения сохранены', cancel:'Отменить', sendReport:'Отправить отчёт', loadedAt:'Файл загружен', quarterPlaceholder:'Например: Q3 2026',
            quarterRequired:'Укажите квартал перед отправкой отчёта.', fxLoading:'Фиксируем курсы валют на момент публикации…', fxError:'Не удалось получить актуальные курсы EUR → RUB/USD/UAH. Отчёт не опубликован, чтобы не сохранять неточную конвертацию.',
            publishedTitle:'Отчёт опубликован', publishedText:'Отчёт сохранён в базе и распределён по кабинетам по владельцам релизов.', noReports:'Пока нет доступных финансовых отчётов.',
            created:'Опубликован', download:'Скачать отчёт', delete:'Удалить', deleteConfirm:'Удалить этот финансовый отчёт полностью? Он моментально исчезнет из базы и из всех кабинетов.', deleted:'Отчёт удалён.',
            releases:'Релизы', rows:'строк', cabinet:'Кабинет', release:'Релиз', owner:'Владелец', filesByCabinet:'Файлы по кабинетам', downloadCabinet:'Скачать',
            rateFixed:'Курс зафиксирован при публикации', locked:'Упс! Этот раздел ещё не доработан. Пожалуйста, дождитесь его открытия.',
            onlyMainUpload:'Загрузка и удаление отчётов доступны только главному администратору.', amountColumnMissing:'Не удалось определить колонку с суммой в евро.',
            sheetLibraryMissing:'Модуль XLSX не загрузился. Для Excel-файлов обновите страницу и попробуйте снова.', unknownCabinet:'Неизвестный кабинет', allReport:'Полный отчёт', source:'Источник',
            cancelDraftConfirm:'Отменить редактирование этого загруженного отчёта? Несохранённый черновик будет удалён.', currencyNotice:'Суммы рассчитываются из строк отчёта, сопоставленных с релизами AetherLab. Строки без точного совпадения не попадают в систему.', recentReports:'Недавние отчёты:', recentReportType:'Финансовый отчёт', recentReportHint:'Чтобы увидеть сумму и скачать отчёт нужно зайти в раздел Финансовые отчёты.'
        },
        en: {
            title:'Financial Reports', intro:'Published financial reports and totals for releases available to your account are shown here.',
            uploadReports:'Upload reports', uploadFile:'Upload file', uploadHint:'XLSX, XLS and CSV are supported. Maximum file size: 10 MB.', close:'Close',
            fileTooLarge:'The file is larger than 10 MB. Choose a smaller file.', unsupported:'Only XLSX, XLS and CSV are supported.', processing:'Processing file…',
            noMatches:'No rows in the file could be matched exactly to releases in the AetherLab database.', parseError:'The file could not be processed.',
            success:'Success!', parsedSuccess:'The file was processed. Matching releases were added to the report draft; rows for releases that are not in AetherLab were skipped.',
            matchedRows:'Matched rows', skippedRows:'Skipped rows', matchedReleases:'Releases found', draft:'Report draft', quarter:'Quarter', amount:'Amount', actions:'Actions',
            saveReport:'Save report', saved:'Changes saved', cancel:'Cancel', sendReport:'Send report', loadedAt:'File uploaded', quarterPlaceholder:'For example: Q3 2026',
            quarterRequired:'Enter the quarter before sending the report.', fxLoading:'Locking exchange rates at the publication time…', fxError:'Current EUR → RUB/USD/UAH rates could not be obtained. The report was not published so an inaccurate conversion is not stored.',
            publishedTitle:'Report published', publishedText:'The report was saved to the database and distributed to accounts according to release ownership.', noReports:'There are no financial reports available yet.',
            created:'Published', download:'Download report', delete:'Delete', deleteConfirm:'Delete this financial report completely? It will disappear from the database and every account immediately.', deleted:'Report deleted.',
            releases:'Releases', rows:'rows', cabinet:'Account', release:'Release', owner:'Owner', filesByCabinet:'Files by account', downloadCabinet:'Download',
            rateFixed:'Rate fixed at publication', locked:'Oops! This section is still under development. Please wait until it becomes available.',
            onlyMainUpload:'Only the Main Administrator can upload and delete reports.', amountColumnMissing:'The EUR amount column could not be detected.',
            sheetLibraryMissing:'The XLSX module did not load. Refresh the page and try the Excel file again.', unknownCabinet:'Unknown account', allReport:'Full report', source:'Source',
            cancelDraftConfirm:'Cancel editing this uploaded report? The unsent draft will be discarded.', currencyNotice:'Totals are calculated only from report rows matched to AetherLab releases. Rows without an exact match are not added.', recentReports:'Recent reports:', recentReportType:'Financial report', recentReportHint:'To see the amount and download the report, go to the Financial Reports section.'
        },
        uk: {
            title:'Фінансові звіти', intro:'Тут відображаються опубліковані фінансові звіти та суми за релізами, доступними вашому кабінету.',
            uploadReports:'Завантажити звіти', uploadFile:'Завантажити файл', uploadHint:'Підтримуються XLSX, XLS і CSV. Максимальний розмір файлу — 10 МБ.', close:'Закрити',
            fileTooLarge:'Файл більший за 10 МБ. Виберіть файл меншого розміру.', unsupported:'Підтримуються лише XLSX, XLS і CSV.', processing:'Обробка файлу…',
            noMatches:'У файлі не знайдено жодного рядка, який можна точно зіставити з релізами в базі AetherLab.', parseError:'Не вдалося обробити файл.',
            success:'Успішно!', parsedSuccess:'Файл оброблено. Релізи, що збіглися, додані до чернетки звіту; рядки з релізами, яких немає в AetherLab, пропущені.',
            matchedRows:'Рядків зі збігом', skippedRows:'Пропущено рядків', matchedReleases:'Знайдено релізів', draft:'Чернетка звіту', quarter:'Квартал', amount:'Сума', actions:'Дії',
            saveReport:'Зберегти звіт', saved:'Зміни збережено', cancel:'Скасувати', sendReport:'Надіслати звіт', loadedAt:'Файл завантажено', quarterPlaceholder:'Наприклад: Q3 2026',
            quarterRequired:'Вкажіть квартал перед надсиланням звіту.', fxLoading:'Фіксуємо курси валют на момент публікації…', fxError:'Не вдалося отримати актуальні курси EUR → RUB/USD/UAH. Звіт не опубліковано, щоб не зберігати неточну конвертацію.',
            publishedTitle:'Звіт опубліковано', publishedText:'Звіт збережено в базі та розподілено між кабінетами за власниками релізів.', noReports:'Поки немає доступних фінансових звітів.',
            created:'Опубліковано', download:'Завантажити звіт', delete:'Видалити', deleteConfirm:'Повністю видалити цей фінансовий звіт? Він одразу зникне з бази та з усіх кабінетів.', deleted:'Звіт видалено.',
            releases:'Релізи', rows:'рядків', cabinet:'Кабінет', release:'Реліз', owner:'Власник', filesByCabinet:'Файли за кабінетами', downloadCabinet:'Завантажити',
            rateFixed:'Курс зафіксовано під час публікації', locked:'Упс! Цей розділ ще не допрацьований. Будь ласка, дочекайтеся його відкриття.',
            onlyMainUpload:'Завантажувати та видаляти звіти може лише Головний адміністратор.', amountColumnMissing:'Не вдалося визначити колонку із сумою в євро.',
            sheetLibraryMissing:'Модуль XLSX не завантажився. Оновіть сторінку та спробуйте Excel-файл ще раз.', unknownCabinet:'Невідомий кабінет', allReport:'Повний звіт', source:'Джерело',
            cancelDraftConfirm:'Скасувати редагування цього завантаженого звіту? Ненадіслану чернетку буде видалено.', currencyNotice:'Суми обчислюються лише з рядків звіту, зіставлених із релізами AetherLab. Рядки без точного збігу не додаються.', recentReports:'Нещодавні звіти:', recentReportType:'Фінансовий звіт', recentReportHint:'Щоб побачити суму та завантажити звіт, потрібно перейти до розділу «Фінансові звіти».'
        }
    };

    function financeLang(){
        try {
            if(window.AetherI18n && /^(ru|en|uk)$/.test(window.AetherI18n.language || '')) return window.AetherI18n.language;
            if(typeof getAetherInterfaceLanguage === 'function') return getAetherInterfaceLanguage();
            const v = localStorage.getItem('aetherlab_language_v1');
            return /^(ru|en|uk)$/.test(v || '') ? v : 'ru';
        } catch(e) { return 'ru'; }
    }
    function ft(key){ const l=financeLang(); return (FCOPY[l] && FCOPY[l][key]) || FCOPY.ru[key] || key; }
    function fesc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
    function fattr(v){ return fesc(v); }
    function fLocale(){ return financeLang()==='en' ? 'en-US' : financeLang()==='uk' ? 'uk-UA' : 'ru-RU'; }
    function fDateTime(ts){
        const n = Number(ts || 0); if(!n) return '—';
        try { return new Intl.DateTimeFormat(fLocale(), {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(n)); }
        catch(e){ return new Date(n).toLocaleString(); }
    }
    function fMoney(v,currency){
        const n=Number(v||0);
        try { return new Intl.NumberFormat(fLocale(), {style:'currency',currency:currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(n); }
        catch(e){ return `${n.toFixed(2)} ${currency}`; }
    }
    function fScaled(v){ return Math.round(Number(v||0) * FINANCE_SCALE); }
    function fUnscaled(v){ return Number(v||0) / FINANCE_SCALE; }
    function fSumRows(rows){ return fUnscaled((rows||[]).reduce((sum,r)=>sum + Number(r.amountScaled || fScaled(r.amountEUR || 0)),0)); }
    function fSafeFileName(v){ return String(v||'report').replace(/[\\/:*?"<>|]+/g,'_').replace(/\s+/g,' ').trim().slice(0,120) || 'report'; }
    function fNormCode(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,''); }
    function fNormText(v){
        return String(v||'').normalize('NFKD').toLowerCase().replace(/[’'`]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
    }
    function fCell(v){ if(v==null) return ''; if(v instanceof Date) return v.toISOString(); return String(v); }


    function isFinanceLabelRateHeader(h){
        const x=fNormText(h);
        return x==='label rate' || x.includes('label rate') || x.includes('лейбл рейт') || x.includes('ставка лейбла') || x.includes('ставка лейблу');
    }
    function isFinanceReleaseTitleHeader(h){
        const x=fNormText(h);
        return x==='release title' || x==='release name' || x==='название релиза' || x==='назва релізу' || x==='релиз название' || x==='реліз назва';
    }
    function isFinanceTrackTitleHeader(h){
        const x=fNormText(h);
        return x==='track title' || x==='track name' || x==='название трека' || x==='назва треку' || x==='назва трека';
    }
    function financeReleaseById(id){
        try{
            return (appState&&Array.isArray(appState.releases)?appState.releases:[]).find(r=>String(r&&r.id||'')===String(id||'')) || null;
        }catch(e){ return null; }
    }
    function financeTrackForSourceRow(release,headers,cells){
        const tracks=release&&Array.isArray(release.tracks)?release.tracks.filter(Boolean):[];
        if(!tracks.length) return null;
        const isrcIdx=[];
        (headers||[]).forEach((h,i)=>{ if(headerMatches(h,ALIASES.isrc)) isrcIdx.push(i); });
        const sourceIsrc=new Set(isrcIdx.map(i=>fNormCode((cells||[])[i])).filter(Boolean));
        if(sourceIsrc.size){
            const exact=tracks.filter(t=>sourceIsrc.has(fNormCode(t&&t.isrc||'')));
            if(exact.length===1) return exact[0];
        }
        const trackTitleIdx=[];
        (headers||[]).forEach((h,i)=>{ if(isFinanceTrackTitleHeader(h)) trackTitleIdx.push(i); });
        const titleVals=new Set(trackTitleIdx.map(i=>fNormText((cells||[])[i])).filter(Boolean));
        if(titleVals.size){
            const exact=tracks.filter(t=>titleVals.has(fNormText(t&&t.title||'')));
            if(exact.length===1) return exact[0];
        }
        if(tracks.length===1) return tracks[0];
        return null;
    }
    function financeResolvedReleaseTitle(row){
        const rel=financeReleaseById(row&&row.releaseId);
        return String(rel&&rel.title || row&&row.releaseTitle || '');
    }
    function financeResolvedTrackTitle(row,headers){
        if(row&&row.releaseTrackTitle) return String(row.releaseTrackTitle);
        const rel=financeReleaseById(row&&row.releaseId);
        const track=financeTrackForSourceRow(rel,headers,row&&row.cells||[]);
        return String(track&&track.title || (rel&&Array.isArray(rel.tracks)&&rel.tracks.length===1&&rel.tracks[0]&&rel.tracks[0].title) || row&&row.releaseTitle || rel&&rel.title || '');
    }

    function parseEuropeanNumber(value){
        if(typeof value === 'number' && Number.isFinite(value)) return value;
        let s = String(value == null ? '' : value).trim();
        if(!s) return NaN;
        let negative = false;
        if(/^\(.*\)$/.test(s)){ negative=true; s=s.slice(1,-1); }
        s = s.replace(/[€$£₽₴A-Za-zА-Яа-яІіЇїЄє\s\u00a0]/g,'');
        s = s.replace(/[−–—]/g,'-');
        if(s.startsWith('-')){ negative=!negative; s=s.slice(1); }
        const lastComma=s.lastIndexOf(','), lastDot=s.lastIndexOf('.');
        if(lastComma>=0 && lastDot>=0){
            if(lastComma>lastDot) s=s.replace(/\./g,'').replace(',','.');
            else s=s.replace(/,/g,'');
        } else if(lastComma>=0){
            const after=s.length-lastComma-1;
            if(after>=1 && after<=8) s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,'');
        } else if(lastDot>=0){
            const parts=s.split('.');
            if(parts.length>2){ const dec=parts.pop(); s=parts.join('')+'.'+dec; }
        }
        s=s.replace(/[^0-9.]/g,'');
        if(!s) return NaN;
        const n=Number(s); return Number.isFinite(n) ? (negative?-n:n) : NaN;
    }

    const ALIASES = {
        amount:['amount','amount eur','eur amount','royalty','royalties','net royalty','net royalties','earnings','net earnings','payable','revenue','net revenue','your share','sum','сумма','роялти','отчислен','вознаграж','начислен','доход','сумма авторских отчислений','сума','винагород','нарахув','дохід'],
        upc:['upc','ean','barcode','штрихкод','штрих код'],
        isrc:['isrc'],
        title:['track title','release title','title','название релиза','название трека','название','трек','релиз','назва релізу','назва треку','назва'],
        artist:['artist','artists','artist name','performer','исполнитель','артист','артисты','виконавець','виконавці'],
        currency:['currency','валюта','валюти','cur']
    };
    function headerText(v){ return fNormText(v); }
    function headerMatches(h, aliases){ const x=headerText(h); return aliases.some(a=>x===fNormText(a) || x.includes(fNormText(a))); }
    function findHeaderIndex(matrix){
        let best=-1,bestScore=-1;
        const max=Math.min(matrix.length,30);
        for(let i=0;i<max;i++){
            const row=matrix[i]||[]; let score=0;
            row.forEach(cell=>{
                if(headerMatches(cell,ALIASES.amount)) score+=5;
                if(headerMatches(cell,ALIASES.upc)||headerMatches(cell,ALIASES.isrc)) score+=4;
                if(headerMatches(cell,ALIASES.title)) score+=3;
                if(headerMatches(cell,ALIASES.artist)) score+=2;
            });
            if(score>bestScore){bestScore=score;best=i;}
        }
        if(bestScore>=5) return best;
        return matrix.findIndex(r=>(r||[]).some(c=>String(c||'').trim()));
    }
    function findColumns(headers, aliases){
        const out=[]; headers.forEach((h,i)=>{if(headerMatches(h,aliases)) out.push(i);}); return out;
    }
    function chooseAmountColumn(headers, matrix, startRow){
        const candidates=findColumns(headers,ALIASES.amount);
        if(!candidates.length) return -1;
        let best=candidates[0],bestScore=-1;
        candidates.forEach(idx=>{
            let score=0; const hn=headerText(headers[idx]);
            if(hn.includes('eur') || String(headers[idx]||'').includes('€')) score+=20;
            for(let r=startRow;r<Math.min(matrix.length,startRow+300);r++) if(Number.isFinite(parseEuropeanNumber((matrix[r]||[])[idx]))) score++;
            if(score>bestScore){bestScore=score;best=idx;}
        });
        return best;
    }

    function buildReleaseIndex(){
        const releases=(typeof appState!=='undefined' && Array.isArray(appState.releases) ? appState.releases : []).filter(Boolean);
        const index={upc:new Map(),isrc:new Map(),pair:new Map()};
        const add=(map,key,r)=>{ if(!key) return; const arr=map.get(key)||[]; if(!arr.some(x=>String(x.id)===String(r.id))) arr.push(r); map.set(key,arr); };
        releases.forEach(r=>{
            const upc=fNormCode(r.upc||''); if(upc) add(index.upc,upc,r);
            const mainArtist=r.artist||'';
            const relPair=fNormText(r.title||'')+'||'+fNormText(mainArtist);
            if(fNormText(r.title||'') && fNormText(mainArtist)) add(index.pair,relPair,r);
            if(r.adminIsrc) add(index.isrc,fNormCode(r.adminIsrc),r);
            (Array.isArray(r.tracks)?r.tracks:[]).forEach(t=>{
                if(t && t.isrc) add(index.isrc,fNormCode(t.isrc),r);
                const ta=t && t.artist ? t.artist : mainArtist;
                if(t && fNormText(t.title||'') && fNormText(ta||'')) add(index.pair,fNormText(t.title)+'||'+fNormText(ta),r);
            });
        });
        return index;
    }
    function intersectReleaseArrays(arrays){
        const usable=arrays.filter(a=>a && a.length);
        if(!usable.length) return [];
        let ids=new Set(usable[0].map(r=>String(r.id)));
        for(let i=1;i<usable.length;i++){ const s=new Set(usable[i].map(r=>String(r.id))); ids=new Set([...ids].filter(id=>s.has(id))); }
        return usable[0].filter(r=>ids.has(String(r.id)));
    }
    function matchReleaseFromRow(row, cols, index){
        const strong=[];
        const upcVals=(cols.upc||[]).map(i=>fNormCode(row[i])).filter(Boolean);
        const isrcVals=(cols.isrc||[]).map(i=>fNormCode(row[i])).filter(Boolean);
        upcVals.forEach(v=>{ const a=index.upc.get(v); if(a&&a.length) strong.push(a); });
        isrcVals.forEach(v=>{ const a=index.isrc.get(v); if(a&&a.length) strong.push(a); });
        if(strong.length){
            const inter=intersectReleaseArrays(strong);
            if(inter.length===1) return inter[0];
            const union=[...new Map(strong.flat().map(r=>[String(r.id),r])).values()];
            if(union.length===1) return union[0];
        }
        const titleI=(cols.title||[])[0], artistI=(cols.artist||[])[0];
        if(titleI!=null && artistI!=null){
            const key=fNormText(row[titleI])+'||'+fNormText(row[artistI]);
            if(key!=='||'){
                const a=index.pair.get(key)||[];
                // Text fallback is intentionally strict: only one exact release/track match is accepted.
                if(a.length===1) return a[0];
            }
        }
        return null;
    }
    function releaseOwnerMeta(release){
        const owner=(typeof getReleaseOwnerAccount==='function' ? getReleaseOwnerAccount(release) : null) || null;
        let managerId=String((owner&&owner.createdByAdminId)||'');
        let managerEmail=String((owner&&owner.createdByAdminEmail)||'').toLowerCase().trim();
        let managerLogin=String((owner&&owner.createdByAdminLogin)||'');
        // Legacy fallback: for older cabinets, detect the administrator through the existing hierarchy helper.
        if(owner && !managerId && !managerEmail){
            try{
                const manager=(appState.users||[]).find(u=>u && u.role==='Administrator' && !(typeof isMainAdministrator==='function'&&isMainAdministrator(u)) && typeof accountWasCreatedByAdmin==='function' && accountWasCreatedByAdmin(owner,u));
                if(manager){managerId=String(manager.id||'');managerEmail=String(manager.email||'').toLowerCase().trim();managerLogin=String(manager.login||'');}
            }catch(e){}
        }
        return {
            ownerId:String((owner&&owner.id)||release.userId||''),
            ownerEmail:String((owner&&owner.email)||release.userEmail||'').toLowerCase().trim(),
            ownerLogin:String((owner&&owner.login)||''),
            ownerRole:String((owner&&owner.role)||''),
            managerAdminId:managerId,
            managerAdminEmail:managerEmail,
            managerAdminLogin:managerLogin
        };
    }

    async function parseFinanceFile(file){
        const ext=(file.name.split('.').pop()||'').toLowerCase();
        if(!['xlsx','xls','csv'].includes(ext)) throw new Error(ft('unsupported'));
        if(file.size>FINANCE_MAX_BYTES) throw new Error(ft('fileTooLarge'));
        let workbook;
        if(window.XLSX){
            const buffer=await file.arrayBuffer();
            workbook=XLSX.read(buffer,{type:'array',cellDates:false,raw:false});
        } else {
            throw new Error(ft('sheetLibraryMissing'));
        }

        const releaseIndex=buildReleaseIndex();
        let matched=0, skipped=0, totalDataRows=0;
        const matchedReleaseIds=new Set();
        const sheets=[];

        workbook.SheetNames.forEach(sheetName=>{
            const ws=workbook.Sheets[sheetName];
            const matrix=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:''}).map(r=>(r||[]).map(fCell));
            if(!matrix.length) return;
            const headerRow=findHeaderIndex(matrix); if(headerRow<0) return;
            const headers=(matrix[headerRow]||[]).map((h,i)=>String(h||'').trim() || `Column ${i+1}`);
            const cols={
                amount:chooseAmountColumn(headers,matrix,headerRow+1),
                upc:findColumns(headers,ALIASES.upc), isrc:findColumns(headers,ALIASES.isrc),
                title:findColumns(headers,ALIASES.title), artist:findColumns(headers,ALIASES.artist), currency:findColumns(headers,ALIASES.currency)
            };
            if(cols.amount<0) return;
            const outRows=[];
            for(let ri=headerRow+1;ri<matrix.length;ri++){
                const row=matrix[ri]||[];
                if(!row.some(c=>String(c||'').trim())) continue;
                totalDataRows++;
                const currencyI=cols.currency[0];
                if(currencyI!=null){
                    const cv=String(row[currencyI]||'').trim().toUpperCase();
                    if(cv && !/^(EUR|EURO|€)$/.test(cv)){ skipped++; continue; }
                }
                const amount=parseEuropeanNumber(row[cols.amount]);
                if(!Number.isFinite(amount)){ skipped++; continue; }
                const rel=matchReleaseFromRow(row,cols,releaseIndex);
                if(!rel){ skipped++; continue; }
                const meta=releaseOwnerMeta(rel);
                const cells=headers.map((_,ci)=>fCell(row[ci]));
                const matchedTrack=financeTrackForSourceRow(rel,headers,cells);
                const scaled=fScaled(amount);
                outRows.push({
                    sourceRow:ri+1,cells,amountScaled:scaled,amountEUR:fUnscaled(scaled),
                    releaseId:String(rel.id||''),releaseTitle:String(rel.title||''),releaseTrackTitle:String(matchedTrack&&matchedTrack.title || (Array.isArray(rel.tracks)&&rel.tracks.length===1&&rel.tracks[0]&&rel.tracks[0].title) || rel.title||''),releaseArtist:String(rel.artist||''),releaseUPC:String(rel.upc||''),
                    ownerId:meta.ownerId,ownerEmail:meta.ownerEmail,ownerLogin:meta.ownerLogin,ownerRole:meta.ownerRole,
                    managerAdminId:meta.managerAdminId,managerAdminEmail:meta.managerAdminEmail,managerAdminLogin:meta.managerAdminLogin
                });
                matched++; matchedReleaseIds.add(String(rel.id||''));
            }
            if(outRows.length) sheets.push({name:String(sheetName||'Report'),headers,rows:outRows});
        });
        if(!matched) throw new Error(ft('noMatches'));
        const total=fUnscaled(sheets.reduce((sum,sh)=>sum+(sh.rows||[]).reduce((a,r)=>a+Number(r.amountScaled||0),0),0));
        return {
            id:'finance_'+Date.now()+'_'+Math.random().toString(36).slice(2,8), quarter:'', loadedAt:Date.now(), sourceFile:{name:file.name,size:file.size,type:file.type||'',extension:ext},
            sheets,summary:{matchedRows:matched,skippedRows:skipped,totalRows:totalDataRows,matchedReleaseCount:matchedReleaseIds.size,amountEUR:total}
        };
    }

    function flattenFinanceRows(report){ return (report&&Array.isArray(report.sheets)?report.sheets:[]).flatMap(sh=>(sh.rows||[]).map(r=>Object.assign({sheetName:sh.name,headers:sh.headers},r))); }
    function rowVisibleToUser(row,user){
        if(!row||!user) return false;
        if(typeof isMainAdministrator==='function' && isMainAdministrator(user)) return true;
        const uid=String(user.id||''), email=String(user.email||'').toLowerCase().trim();
        if((uid&&String(row.ownerId||'')===uid)||(email&&String(row.ownerEmail||'').toLowerCase().trim()===email)) return true;
        if(user.role!=='Administrator') return false;
        if((uid&&String(row.managerAdminId||'')===uid)||(email&&String(row.managerAdminEmail||'').toLowerCase().trim()===email)) return true;
        try {
            const owner=(appState.users||[]).find(u=>String(u.id||'')===String(row.ownerId||'') || String(u.email||'').toLowerCase().trim()===String(row.ownerEmail||'').toLowerCase().trim());
            return owner && typeof accountWasCreatedByAdmin==='function' && accountWasCreatedByAdmin(owner,user);
        } catch(e){ return false; }
    }
    function visibleRows(report,user=currentUser){ return flattenFinanceRows(report).filter(r=>rowVisibleToUser(r,user)); }
    function visibleReports(){ return financeState.reports.map(report=>({report,rows:visibleRows(report)})).filter(x=>x.rows.length>0 || (typeof isMainAdministrator==='function'&&isMainAdministrator(currentUser))); }

    function renderOverviewFinancePreview(){
        const area=document.getElementById('overviewFinanceRecent');
        if(!area) return;
        if(!currentUser){ area.innerHTML=''; return; }
        const vr=visibleReports();
        const latest=vr.length ? vr[0].report : null;
        if(!latest){
            area.innerHTML=`<div class="finance-overview-recent"><h3 class="finance-overview-title">${fesc(ft('recentReports'))}</h3><div class="finance-overview-empty">${fesc(ft('noReports'))}</div></div>`;
            return;
        }
        const published=latest.publishedAt||latest.createdAt||latest.loadedAt;
        area.innerHTML=`<div class="finance-overview-recent">
            <h3 class="finance-overview-title">${fesc(ft('recentReports'))}</h3>
            <div class="finance-overview-card" aria-label="${fattr(ft('recentReportType'))}">
                <div class="finance-overview-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5"/><path d="M10 13h5M10 17h5"/></svg></div>
                <div class="finance-overview-main">
                    <div class="finance-overview-quarter">${fesc(latest.quarter||ft('recentReportType'))}</div>
                    <div class="finance-overview-meta">${fesc(ft('created'))}: ${fesc(fDateTime(published))}</div>
                </div>
                <div class="finance-overview-badge">${fesc(ft('recentReportType'))}</div>
            </div>
            <div class="finance-overview-warning">${fesc(ft('recentReportHint'))}</div>
        </div>`;
    }
    window.renderOverviewFinancePreview=renderOverviewFinancePreview;

    function localCurrencyForLang(){ return financeLang()==='uk'?'UAH':financeLang()==='en'?'USD':'RUB'; }
    function localAmountHTML(report,eur){
        const cur=localCurrencyForLang();
        const rate=report&&report.fx&&Number(report.fx[cur]);
        if(!rate) return '';
        const value=eur*rate;
        return `<div class="finance-local">${fesc(fMoney(value,cur))}</div><div class="finance-rate">${fesc(ft('rateFixed'))}: 1 EUR = ${rate.toFixed(6)} ${cur}</div>`;
    }
    function reportGroupsByRelease(rows){
        const map=new Map();
        rows.forEach(r=>{
            const key=String(r.releaseId||'')||`${r.releaseTitle}|${r.ownerEmail}`;
            if(!map.has(key)) map.set(key,{releaseId:r.releaseId,title:r.releaseTitle,artist:r.releaseArtist,ownerEmail:r.ownerEmail,ownerLogin:r.ownerLogin,amountScaled:0,rows:0});
            const g=map.get(key); g.amountScaled+=Number(r.amountScaled||0); g.rows++;
        });
        return [...map.values()].sort((a,b)=>b.amountScaled-a.amountScaled);
    }
    function reportGroupsByCabinet(rows){
        const map=new Map();
        rows.forEach(r=>{
            const key=String(r.ownerEmail||r.ownerId||'unknown');
            if(!map.has(key)) map.set(key,{key,email:r.ownerEmail||'',id:r.ownerId||'',login:r.ownerLogin||ft('unknownCabinet'),amountScaled:0,rows:[]});
            const g=map.get(key); g.amountScaled+=Number(r.amountScaled||0); g.rows.push(r);
        });
        return [...map.values()].sort((a,b)=>b.amountScaled-a.amountScaled);
    }

    function financeFirebaseKey(id,email){
        const raw=String(id||email||'').trim();
        return raw.replace(/[.#$\[\]\/]/g,'_') || 'unknown';
    }
    function currentFinancePath(){
        if(!currentUser) return '';
        if(typeof isMainAdministrator==='function'&&isMainAdministrator(currentUser)) return FINANCE_MASTER_NODE;
        const key=financeFirebaseKey(currentUser.id,currentUser.email);
        return currentUser.role==='Administrator' ? `${FINANCE_ADMIN_NODE}/${key}` : `${FINANCE_CABINET_NODE}/${key}`;
    }
    function financeRowKey(r){ return `${r.sheetName||''}|${r.sourceRow||''}|${r.releaseId||''}|${r.ownerId||r.ownerEmail||''}|${r.amountScaled||0}`; }
    function filteredReportCopy(report,selectedRows){
        const selected=new Map((selectedRows||[]).map(r=>[financeRowKey(r),r]));
        const sheets=(report.sheets||[]).map(sh=>{
            const rows=(sh.rows||[]).filter(r=>selected.has(financeRowKey(Object.assign({sheetName:sh.name},r))));
            return rows.length?{name:sh.name,headers:sh.headers,rows}:null;
        }).filter(Boolean);
        const rows=sheets.flatMap(sh=>(sh.rows||[]).map(r=>Object.assign({sheetName:sh.name,headers:sh.headers},r)));
        const releaseCount=new Set(rows.map(r=>String(r.releaseId||''))).size;
        return Object.assign({},report,{sheets,summary:Object.assign({},report.summary||{}, {matchedRows:rows.length,matchedReleaseCount:releaseCount,amountEUR:fSumRows(rows)})});
    }
    function adminDistributionGroups(rows){
        const map=new Map();
        const add=(id,email,login,row)=>{
            if(!id&&!email)return;
            const key=financeFirebaseKey(id,email);
            if(!map.has(key))map.set(key,{key,id:String(id||''),email:String(email||'').toLowerCase().trim(),login:String(login||''),rows:[]});
            const arr=map.get(key).rows;
            if(!arr.some(x=>financeRowKey(x)===financeRowKey(row)))arr.push(row);
        };
        (rows||[]).forEach(r=>{
            if(r.managerAdminId||r.managerAdminEmail)add(r.managerAdminId,r.managerAdminEmail,r.managerAdminLogin,r);
            if(r.ownerRole==='Administrator')add(r.ownerId,r.ownerEmail,r.ownerLogin,r);
        });
        return [...map.values()];
    }
    function bindFinanceReportsForCurrentUser(){
        const path=currentFinancePath();
        if(!path||path===financeState.boundPath)return;
        financeState.boundPath=path;
        const token=++financeState.bindToken;
        financeState.reports=[]; syncFinanceNav();
        try{
            db.ref(path).on('value',snapshot=>{
                if(token!==financeState.bindToken||financeState.boundPath!==path)return;
                const data=snapshot.val()||{};
                financeState.reports=Object.values(data).filter(Boolean).sort((a,b)=>Number(b.publishedAt||0)-Number(a.publishedAt||0));
                syncFinanceNav();
                try{renderOverviewFinancePreview();}catch(e){}
                try{if(currentSection==='financialReports')renderFinancialReports();}catch(e){}
                try{if(currentSection==='releaseHub' && window.currentReleaseHubTab==='finance' && typeof renderReleaseHub==='function')renderReleaseHub();}catch(e){}
            },err=>console.error('Finance reports:',err));
        }catch(e){console.error('Finance listener:',e);}
    }

    function financeDetailsHTML(report,rows){
        const rels=reportGroupsByRelease(rows);
        const cabinets=reportGroupsByCabinet(rows);
        let html=`<details class="finance-details"><summary>${fesc(ft('releases'))}: ${rels.length} · ${rows.length} ${fesc(ft('rows'))}</summary>`;
        html+=`<div class="finance-breakdown">${rels.map(g=>`<div class="finance-release-line"><div class="finance-release-title">${fesc(g.title||'—')}</div><div class="finance-release-sub">${fesc(g.artist||'—')}<br>${fesc(ft('cabinet'))}: ${fesc(g.ownerLogin||g.ownerEmail||ft('unknownCabinet'))}${g.ownerEmail?` · ${fesc(g.ownerEmail)}`:''}</div><div class="finance-release-sum">${fesc(fMoney(fUnscaled(g.amountScaled),'EUR'))}</div></div>`).join('')}</div>`;
        if(currentUser && currentUser.role==='Administrator'){
            html+=`<div class="finance-cabinet-files"><div class="finance-cabinet-files-title">${fesc(ft('filesByCabinet'))}</div><div class="finance-cabinet-grid">${cabinets.map(c=>`<div class="finance-cabinet-line"><div><div class="finance-release-title">${fesc(c.login||c.email||ft('unknownCabinet'))}</div><div class="finance-release-sub">${fesc(c.email||'')} · ${fesc(fMoney(fUnscaled(c.amountScaled),'EUR'))}</div></div><button class="btn-outline" onclick="downloadFinanceReportForCabinet('${fattr(report.id)}','${fattr(c.email||c.id)}')">${fesc(ft('downloadCabinet'))}</button></div>`).join('')}</div></div>`;
        }
        html+='</details>';
        return html;
    }

    function renderFinanceDraft(){
        const d=financeState.draft; if(!d) return '';
        return `<div class="finance-draft"><div class="finance-draft-head"><h3>${fesc(ft('draft'))}</h3><span class="finance-draft-badge">${fesc(d.sourceFile&&d.sourceFile.name||'')}</span></div>
            <table class="finance-draft-table"><thead><tr><th>${fesc(ft('quarter'))}</th><th>${fesc(ft('amount'))}</th><th>${fesc(ft('actions'))}</th></tr></thead><tbody><tr>
            <td><input id="financeDraftQuarter" type="text" value="${fattr(d.quarter||'')}" placeholder="${fattr(ft('quarterPlaceholder'))}"></td>
            <td><div class="finance-eur">${fesc(fMoney(d.summary.amountEUR,'EUR'))}</div></td>
            <td><button class="btn-primary finance-action-btn" onclick="saveFinanceDraftMeta()">${fesc(ft('saveReport'))}</button></td>
            </tr></tbody></table>
            <div class="finance-draft-meta"><span>${fesc(ft('loadedAt'))}: ${fesc(fDateTime(d.loadedAt))}</span><span>${fesc(ft('matchedRows'))}: ${d.summary.matchedRows}</span><span>${fesc(ft('matchedReleases'))}: ${d.summary.matchedReleaseCount}</span><span>${fesc(ft('skippedRows'))}: ${d.summary.skippedRows}</span></div>
            <div id="financeDraftSaveNote" class="finance-save-note"></div>
            <div class="finance-draft-actions"><button class="btn-outline" onclick="cancelFinanceDraft()">${fesc(ft('cancel'))}</button><button class="btn-primary" id="financeSendReportBtn" onclick="publishFinanceDraft()">${fesc(ft('sendReport'))}</button></div>
        </div>`;
    }

    function renderFinancialReports(){
        const area=document.getElementById('financialReportsArea'); if(!area||!currentUser) return;
        const main=typeof isMainAdministrator==='function'&&isMainAdministrator(currentUser);
        const vr=visibleReports();
        const toolbar=main?`<button class="btn-primary finance-upload-main" onclick="openFinanceUploadModal()"><svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></svg>${fesc(ft('uploadReports'))}</button>`:'';
        let html=`<div class="finance-shell"><div class="finance-topbar"><div><h2>${fesc(ft('title'))} <span class="aether-beta-badge">BETA</span></h2><p>${fesc(ft('intro'))}</p></div>${toolbar}</div>`;
        if(main&&financeState.draft) html+=renderFinanceDraft();
        if(!vr.length){ html+=`<div class="finance-empty">${fesc(ft('noReports'))}</div></div>`; area.innerHTML=html; return; }
        html+=`<div class="finance-table-wrap"><table class="finance-table"><thead><tr><th style="width:34%">${fesc(ft('quarter'))}</th><th style="width:31%">${fesc(ft('amount'))}</th><th style="width:35%;text-align:right">${fesc(ft('actions'))}</th></tr></thead><tbody>`;
        vr.forEach(({report,rows})=>{
            const eur=fSumRows(rows);
            const actions=[`<button class="btn-outline finance-action-btn" onclick="downloadFinanceReport('${fattr(report.id)}')"><svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>${fesc(ft('download'))}</button>`];
            if(main) actions.push(`<button class="finance-action-btn danger" onclick="deleteFinanceReport('${fattr(report.id)}')"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></svg>${fesc(ft('delete'))}</button>`);
            html+=`<tr><td><div class="finance-quarter">${fesc(report.quarter||'—')}</div><div class="finance-created">${fesc(ft('created'))}: ${fesc(fDateTime(report.publishedAt||report.createdAt))}</div></td><td><div class="finance-eur">${fesc(fMoney(eur,'EUR'))}</div>${localAmountHTML(report,eur)}</td><td><div class="finance-actions">${actions.join('')}</div></td></tr>`;
            html+=`<tr><td class="finance-details-cell" colspan="3">${financeDetailsHTML(report,rows)}</td></tr>`;
        });
        html+=`</tbody></table></div><p class="text-sm" style="margin-top:12px;line-height:1.55;">${fesc(ft('currencyNotice'))}</p></div>`;
        area.innerHTML=html;
    }

    function canCurrentUserOpenFinance(){
        // Financial Reports are available to every signed-in account.
        // Uploading and deleting remain restricted to the Main Administrator.
        return !!currentUser;
    }
    function syncFinanceNav(){
        const btn=document.getElementById('btn-financialReports'), label=document.getElementById('financialReportsMenuLabel'), lock=document.getElementById('financialReportsNavLock');
        if(!btn||!label) return;
        label.innerHTML=fesc(ft('title'))+' <span class="sidebar-beta">BETA</span>';
        const open=canCurrentUserOpenFinance();
        btn.classList.toggle('aether-finance-locked',!open);
        if(lock) lock.classList.toggle('hidden',open);
        btn.onclick=function(){ if(open) openFinancialReports(); else { if(typeof openFinancialReportsLocked==='function') openFinancialReportsLocked(); } };
    }

    window.openFinancialReports=function(){
        if(!currentUser) return;
        if(!canCurrentUserOpenFinance()){ if(typeof openFinancialReportsLocked==='function') openFinancialReportsLocked(); return; }
        try{ currentSection='financialReports'; }catch(e){}
        document.querySelectorAll('.view-section').forEach(el=>{el.classList.add('hidden');el.classList.remove('fade-in');});
        const sec=document.getElementById('sec-financialReports'); if(sec){sec.classList.remove('hidden');void sec.offsetWidth;sec.classList.add('fade-in');}
        document.querySelectorAll('.sidebar .menu-btn').forEach(b=>b.classList.remove('active'));
        const btn=document.getElementById('btn-financialReports'); if(btn) btn.classList.add('active');
        const title=document.getElementById('pageTitle'); if(title) title.textContent=ft('title');
        renderFinancialReports(); syncFinanceNav();
        if(window.innerWidth<=768){const sidebar=document.querySelector('.sidebar');if(sidebar)sidebar.classList.remove('open');}
    };

    window.openFinanceUploadModal=function(){
        if(!(typeof isMainAdministrator==='function'&&isMainAdministrator(currentUser))){ UI.alert(ft('title'),ft('onlyMainUpload')); return; }
        const modal=document.getElementById('financeUploadModal'); if(!modal) return;
        document.getElementById('financeUploadKicker').textContent=ft('title');
        document.getElementById('financeUploadTitle').textContent=ft('uploadFile');
        document.getElementById('financeUploadHint').textContent=ft('uploadHint');
        document.getElementById('financeChooseFileBtn').textContent=ft('uploadFile');
        document.getElementById('financeUploadCloseBtn').textContent=ft('close');
        const status=document.getElementById('financeUploadStatus'); if(status) status.textContent='';
        const input=document.getElementById('financeFileInput'); if(input) input.value='';
        modal.classList.remove('hidden');
    };
    window.closeFinanceUploadModal=function(){ const m=document.getElementById('financeUploadModal');if(m)m.classList.add('hidden'); };
    window.closeFinanceSuccess=function(){ const m=document.getElementById('financeSuccessModal');if(m)m.classList.add('hidden'); openFinancialReports(); };
    function showFinanceParseSuccess(draft){
        const m=document.getElementById('financeSuccessModal'); if(!m) return;
        document.getElementById('financeSuccessTitle').textContent=ft('success');
        document.getElementById('financeSuccessText').innerHTML=`${fesc(ft('parsedSuccess'))}<br><br><b>${fesc(ft('matchedRows'))}:</b> ${draft.summary.matchedRows} · <b>${fesc(ft('matchedReleases'))}:</b> ${draft.summary.matchedReleaseCount} · <b>${fesc(ft('skippedRows'))}:</b> ${draft.summary.skippedRows}`;
        document.getElementById('financeSuccessCloseBtn').textContent=ft('close');
        m.classList.remove('hidden');
    }

    window.saveFinanceDraftMeta=function(){
        const input=document.getElementById('financeDraftQuarter'); if(financeState.draft&&input) financeState.draft.quarter=input.value.trim();
        const note=document.getElementById('financeDraftSaveNote'); if(note){note.textContent=ft('saved');setTimeout(()=>{if(note)note.textContent='';},1800);}
    };
    window.cancelFinanceDraft=function(){
        if(!financeState.draft) return;
        UI.confirm(ft('cancelDraftConfirm'),()=>{financeState.draft=null;renderFinancialReports();});
    };

    async function fetchFinanceFx(){
        const capturedAt=Date.now();
        const tryOpenER=async()=>{
            const r=await fetch('https://open.er-api.com/v6/latest/EUR',{cache:'no-store'}); if(!r.ok) throw new Error('fx');
            const d=await r.json(); if(d.result!=='success'||!d.rates) throw new Error('fx');
            const out={EUR:1,RUB:Number(d.rates.RUB),USD:Number(d.rates.USD),UAH:Number(d.rates.UAH),capturedAt,provider:'open.er-api.com',providerUpdatedAt:Number(d.time_last_update_unix||0)*1000};
            if(!out.RUB||!out.USD||!out.UAH) throw new Error('fx'); return out;
        };
        const tryFawaz=async(url,provider)=>{
            const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error('fx');
            const d=await r.json(); const x=d.eur||{};
            const out={EUR:1,RUB:Number(x.rub),USD:Number(x.usd),UAH:Number(x.uah),capturedAt,provider,providerDate:d.date||''};
            if(!out.RUB||!out.USD||!out.UAH) throw new Error('fx'); return out;
        };
        const sources=[
            tryOpenER,
            ()=>tryFawaz('https://latest.currency-api.pages.dev/v1/currencies/eur.json','currency-api.pages.dev'),
            ()=>tryFawaz('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json','jsDelivr currency-api')
        ];
        for(const fn of sources){try{return await fn();}catch(e){}}
        throw new Error(ft('fxError'));
    }

    window.publishFinanceDraft=async function(){
        if(!financeState.draft || !(typeof isMainAdministrator==='function'&&isMainAdministrator(currentUser))) return;
        const input=document.getElementById('financeDraftQuarter');
        financeState.draft.quarter=(input?input.value:financeState.draft.quarter||'').trim();
        if(!financeState.draft.quarter){UI.alert(ft('title'),ft('quarterRequired'));return;}
        const btn=document.getElementById('financeSendReportBtn'); if(btn){btn.disabled=true;btn.textContent=ft('fxLoading');}
        const written=[];
        try{
            const fx=await fetchFinanceFx();
            const d=financeState.draft;
            const baseReport={
                id:d.id,version:2,quarter:d.quarter,loadedAt:d.loadedAt,publishedAt:Date.now(),
                publishedByEmail:String(currentUser.email||''),publishedById:String(currentUser.id||''),publishedByLogin:String(currentUser.login||''),
                sourceFile:d.sourceFile,summary:d.summary,fx,sheets:d.sheets
            };
            const allRows=flattenFinanceRows(baseReport);
            const cabinetGroups=reportGroupsByCabinet(allRows);
            const adminGroups=adminDistributionGroups(allRows);
            const master=Object.assign({},baseReport,{distribution:{cabinetKeys:cabinetGroups.map(g=>financeFirebaseKey(g.id,g.email)),adminKeys:adminGroups.map(g=>g.key)}});

            const masterPath=`${FINANCE_MASTER_NODE}/${master.id}`;
            await db.ref(masterPath).set(master); written.push(masterPath);
            for(const c of cabinetGroups){
                const key=financeFirebaseKey(c.id,c.email), path=`${FINANCE_CABINET_NODE}/${key}/${master.id}`;
                await db.ref(path).set(filteredReportCopy(baseReport,c.rows)); written.push(path);
            }
            for(const a of adminGroups){
                const path=`${FINANCE_ADMIN_NODE}/${a.key}/${master.id}`;
                await db.ref(path).set(filteredReportCopy(baseReport,a.rows)); written.push(path);
            }

            financeState.draft=null;
            try{ if(typeof aetherRecordActivity==='function') aetherRecordActivity('finance','Загружен финансовый отчёт',`${baseReport.quarter || 'Отчёт'}: ${baseReport.summary && baseReport.summary.matchedRows || 0} строк, ${baseReport.summary && baseReport.summary.matchedReleaseCount || 0} релизов.`,null,{financeReportId:baseReport.id||''}); }catch(e){}
            bindFinanceReportsForCurrentUser(); renderFinancialReports(); syncFinanceNav();
            UI.alert(ft('publishedTitle'),ft('publishedText'));
        }catch(err){
            console.error(err);
            for(const path of written.reverse()){try{await db.ref(path).remove();}catch(e){}}
            UI.alert(ft('title'),err&&err.message?fesc(err.message):ft('fxError'));
        } finally { if(btn){btn.disabled=false;btn.textContent=ft('sendReport');} }
    };

    function rowsForCabinet(report,cabinetKey){
        const k=String(cabinetKey||'').toLowerCase().trim();
        return flattenFinanceRows(report).filter(r=>String(r.ownerEmail||'').toLowerCase().trim()===k || String(r.ownerId||'').toLowerCase().trim()===k);
    }
    function buildFilteredWorkbook(report,rows){
        if(!window.XLSX) throw new Error(ft('sheetLibraryMissing'));
        const wb=XLSX.utils.book_new();
        const bySheet=new Map();
        rows.forEach(r=>{const k=String(r.sheetName||'Report');if(!bySheet.has(k))bySheet.set(k,[]);bySheet.get(k).push(r);});
        const reportSheets=Array.isArray(report.sheets)?report.sheets:[];
        reportSheets.forEach(sh=>{
            const selected=(bySheet.get(String(sh.name||'Report'))||[]).sort((a,b)=>Number(a.sourceRow||0)-Number(b.sourceRow||0));
            if(!selected.length) return;
            const headers=(sh.headers||[]).map(fCell);
            // Never expose the internal label percentage in user downloads.
            const keepIndexes=headers.map((h,i)=>({h,i})).filter(x=>!isFinanceLabelRateHeader(x.h)).map(x=>x.i);
            const exportHeaders=keepIndexes.map(i=>headers[i]);
            const exportRows=selected.map(r=>{
                const source=(r.cells||[]).map(fCell);
                const releaseTitle=financeResolvedReleaseTitle(r);
                const trackTitle=financeResolvedTrackTitle(r,headers);
                headers.forEach((h,i)=>{
                    if(isFinanceReleaseTitleHeader(h) && releaseTitle) source[i]=releaseTitle;
                    if(isFinanceTrackTitleHeader(h) && trackTitle) source[i]=trackTitle;
                });
                return keepIndexes.map(i=>fCell(source[i]));
            });
            const aoa=[exportHeaders,...exportRows];
            const ws=XLSX.utils.aoa_to_sheet(aoa);
            let name=String(sh.name||'Report').replace(/[\\/?*\[\]:]/g,' ').slice(0,31)||'Report';
            let base=name,n=2; while(wb.SheetNames.includes(name)){name=(base.slice(0,27)+' '+n++).slice(0,31);}
            XLSX.utils.book_append_sheet(wb,ws,name);
        });
        return wb;
    }
    function downloadFinanceRows(report,rows,label){
        if(!rows.length){UI.alert(ft('title'),ft('noReports'));return;}
        try{
            const wb=buildFilteredWorkbook(report,rows);
            if(!wb.SheetNames.length){UI.alert(ft('title'),ft('noReports'));return;}
            const file=`AetherLab_${fSafeFileName(report.quarter)}_${fSafeFileName(label||ft('allReport'))}.xlsx`;
            XLSX.writeFile(wb,file,{compression:true});
        }catch(err){console.error(err);UI.alert(ft('title'),err&&err.message?fesc(err.message):ft('parseError'));}
    }
    window.downloadFinanceReport=function(id){
        const report=financeState.reports.find(r=>String(r.id)===String(id)); if(!report)return;
        const rows=visibleRows(report,currentUser);
        downloadFinanceRows(report,rows,currentUser&&currentUser.login?currentUser.login:ft('allReport'));
    };
    window.downloadFinanceReportForCabinet=function(id,cabinetKey){
        const report=financeState.reports.find(r=>String(r.id)===String(id)); if(!report||!currentUser)return;
        let rows=rowsForCabinet(report,cabinetKey).filter(r=>rowVisibleToUser(r,currentUser));
        const c=reportGroupsByCabinet(rows)[0];
        downloadFinanceRows(report,rows,c&&(c.login||c.email)||cabinetKey);
    };
    window.deleteFinanceReport=function(id){
        if(!(typeof isMainAdministrator==='function'&&isMainAdministrator(currentUser))) return;
        UI.confirm(ft('deleteConfirm'),async()=>{
            try{
                const report=financeState.reports.find(r=>String(r.id)===String(id));
                const cabinetKeys=(report&&report.distribution&&report.distribution.cabinetKeys)||[];
                const adminKeys=(report&&report.distribution&&report.distribution.adminKeys)||[];
                // Delete distributed copies first. The master is removed last so a failed cleanup can be retried without losing the distribution map.
                for(const key of cabinetKeys){await db.ref(`${FINANCE_CABINET_NODE}/${key}/${id}`).remove();}
                for(const key of adminKeys){await db.ref(`${FINANCE_ADMIN_NODE}/${key}/${id}`).remove();}
                await db.ref(`${FINANCE_MASTER_NODE}/${id}`).remove();
                try{ if(typeof aetherRecordActivity==='function') aetherRecordActivity('finance','Удалён финансовый отчёт',report && report.quarter ? `Удалён отчёт ${report.quarter}.` : 'Удалён финансовый отчёт.',null,{financeReportId:id}); }catch(e){}
                UI.alert(ft('title'),ft('deleted'));
            }catch(err){console.error(err);UI.alert(ft('title'),ft('parseError'));}
        });
    };

    function updateLockedModalCopy(){
        const title=document.getElementById('financialReportsLockedTitle'),text=document.getElementById('financialReportsLockedText'),close=document.getElementById('financialReportsLockedClose');
        if(title)title.textContent=ft('title');if(text)text.textContent=ft('locked');if(close)close.textContent=ft('close');
    }

    function initFinance(){
        const input=document.getElementById('financeFileInput');
        if(input&&!input.dataset.financeReady){
            input.dataset.financeReady='1';
            input.addEventListener('change',async function(){
                const file=input.files&&input.files[0]; if(!file)return;
                const status=document.getElementById('financeUploadStatus');
                if(file.size>FINANCE_MAX_BYTES){if(status)status.textContent=ft('fileTooLarge');input.value='';return;}
                const ext=(file.name.split('.').pop()||'').toLowerCase();
                if(!['xlsx','xls','csv'].includes(ext)){if(status)status.textContent=ft('unsupported');input.value='';return;}
                if(status){status.innerHTML=`<span class="finance-processing">${fesc(ft('processing'))}</span>`;}
                try{
                    const draft=await parseFinanceFile(file);
                    financeState.draft=draft;
                    closeFinanceUploadModal();
                    openFinancialReports();
                    showFinanceParseSuccess(draft);
                }catch(err){console.error(err);if(status)status.textContent=err&&err.message?err.message:ft('parseError');}
                finally{input.value='';}
            });
        }
        updateLockedModalCopy(); syncFinanceNav();
        bindFinanceReportsForCurrentUser();
        try{renderOverviewFinancePreview();}catch(e){}

        // Keep the button/section synchronized after login, role refresh and language restoration.
        try{
            const oldRefresh=window.refreshUI;
            if(typeof oldRefresh==='function'&&!oldRefresh.__financeWrapped){
                const wrapped=function(){const result=oldRefresh.apply(this,arguments);bindFinanceReportsForCurrentUser();syncFinanceNav();try{if(currentSection==='financialReports')renderFinancialReports();}catch(e){}return result;};
                wrapped.__financeWrapped=true;window.refreshUI=wrapped;try{refreshUI=wrapped;}catch(e){}
            }
        }catch(e){}
        [0,150,450,900,1800].forEach(ms=>setTimeout(()=>{updateLockedModalCopy();syncFinanceNav();},ms));
    }

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initFinance); else initFinance();
    window.AetherFinance={render:renderFinancialReports,get reports(){return financeState.reports;},get draft(){return financeState.draft;}};
})();
