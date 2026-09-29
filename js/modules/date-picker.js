/* AetherLab module extracted from the former monolithic index.html. */
    /* ===== AetherLab custom date picker ===== */
    (function(){
        const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
        const monthShort = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];
        const weekNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
        let active = null;
        let popover = null;
        let viewDate = new Date();
        let originalValueDescriptor = null;
        let touchStartY = null;
        let touchLastY = null;
        let touchAccum = 0;

        function pad(n){ return String(n).padStart(2,'0'); }
        function todayStart(){ const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }
        function addDays(d, amount){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + amount); return x; }
        function toIso(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
        function parseIso(v){
            const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if(!m) return null;
            const d = new Date(+m[1], +m[2]-1, +m[3]);
            return Number.isNaN(d.getTime()) ? null : d;
        }
        function formatDate(v){
            const d = parseIso(v);
            return d ? `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}` : '';
        }
        function sameDay(a,b){ return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
        function beforeDay(a,b){ return a && b && new Date(a.getFullYear(),a.getMonth(),a.getDate()).getTime() < new Date(b.getFullYear(),b.getMonth(),b.getDate()).getTime(); }
        function afterDay(a,b){ return a && b && new Date(a.getFullYear(),a.getMonth(),a.getDate()).getTime() > new Date(b.getFullYear(),b.getMonth(),b.getDate()).getTime(); }

        function getDateRole(input){
            return (input && input.dataset && input.dataset.dateRole) || (input && input.id === 'r_releaseDate' ? 'release' : (input && input.id === 'r_originalReleaseDate' ? 'original' : ''));
        }
        function getDateLimits(input){
            const today = todayStart();
            const role = getDateRole(input);
            if(role === 'release') {
                return {
                    min: addDays(today, 5),
                    max: null,
                    hint: 'Дата релиза доступна минимум через 5 дней от сегодняшней даты.'
                };
            }
            if(role === 'original') {
                return {
                    min: null,
                    max: today,
                    hint: 'Оригинальная дата релиза может быть сегодня или раньше.'
                };
            }
            return { min:null, max:null, hint:'Прокрутите календарь вверх/вниз, чтобы переключать месяцы.' };
        }
        function isDisabledForInput(d, input){
            const lim = getDateLimits(input);
            return (lim.min && beforeDay(d, lim.min)) || (lim.max && afterDay(d, lim.max));
        }
        function refreshNativeLimits(input){
            if(!input) return;
            const lim = getDateLimits(input);
            if(lim.min) input.setAttribute('min', toIso(lim.min)); else input.removeAttribute('min');
            if(lim.max) input.setAttribute('max', toIso(lim.max)); else input.removeAttribute('max');
        }
        function defaultViewFor(input){
            const selected = parseIso(getNativeValue(input));
            if(selected) return new Date(selected.getFullYear(), selected.getMonth(), 1);
            const lim = getDateLimits(input);
            const base = lim.min || lim.max || todayStart();
            return new Date(base.getFullYear(), base.getMonth(), 1);
        }

        function getNativeValue(input){
            if(originalValueDescriptor && originalValueDescriptor.get) return originalValueDescriptor.get.call(input);
            return input.getAttribute('value') || '';
        }
        function setNativeValue(input, value){
            if(originalValueDescriptor && originalValueDescriptor.set) originalValueDescriptor.set.call(input, value || '');
            else input.setAttribute('value', value || '');
            if(input.__aetherDateDisplay) input.__aetherDateDisplay.value = formatDate(value);
        }

        function ensurePopover(){
            if(popover) return popover;
            popover = document.createElement('div');
            popover.className = 'aether-date-popover kite-positioned hidden';
            document.body.appendChild(popover);
            popover.addEventListener('pointerdown', e => { if(!e.target.closest('button')) e.preventDefault(); e.stopPropagation(); });
            let wheelLocked = false;
            popover.addEventListener('wheel', (e) => {
                if(!active) return;
                const inPickerList = e.target && e.target.closest && e.target.closest('.aether-picker-list');
                if(popover.dataset.mode === 'monthYear') {
                    if(inPickerList) { e.stopPropagation(); return; }
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                e.preventDefault();
                if(wheelLocked) return;
                wheelLocked = true;
                viewDate.setMonth(viewDate.getMonth() + (e.deltaY > 0 ? 1 : -1));
                renderPicker();
                setTimeout(() => wheelLocked = false, 120);
            }, { passive:false });
            popover.addEventListener('touchstart', (e) => {
                if(!active || !e.touches || !e.touches[0]) return;
                touchStartY = e.touches[0].clientY;
                touchLastY = touchStartY;
                touchAccum = 0;
            }, { passive:true });
            popover.addEventListener('touchmove', (e) => {
                if(!active || touchLastY === null || !e.touches || !e.touches[0]) return;
                const inPickerList = e.target && e.target.closest && e.target.closest('.aether-picker-list');
                if(popover.dataset.mode === 'monthYear') {
                    if(inPickerList) { e.stopPropagation(); return; }
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                e.preventDefault();
                const y = e.touches[0].clientY;
                touchAccum += y - touchLastY;
                touchLastY = y;
                if(Math.abs(touchAccum) >= 52){
                    viewDate.setMonth(viewDate.getMonth() + (touchAccum < 0 ? 1 : -1));
                    touchAccum = 0;
                    renderPicker();
                }
            }, { passive:false });
            popover.addEventListener('touchend', () => { touchStartY = null; touchLastY = null; touchAccum = 0; }, { passive:true });
            return popover;
        }

        function positionPopover(input){
            const p = ensurePopover();
            const display = input.__aetherDateDisplay;
            if(!display) return;
            const rect = display.getBoundingClientRect();
            const width = Math.min(300, window.innerWidth - 28);
            const estimatedHeight = Math.min(350, window.innerHeight - 28);
            let left = Math.min(Math.max(14, rect.left), Math.max(14, window.innerWidth - width - 14));
            let top = rect.bottom + 8;
            if(top + estimatedHeight > window.innerHeight) top = rect.top - estimatedHeight - 8;
            if(top < 14) top = 14;
            p.style.setProperty('--kite-date-left', left + 'px');
            p.style.setProperty('--kite-date-top', top + 'px');
        }

        function openPicker(input){
            active = input;
            refreshNativeLimits(input);
            viewDate = defaultViewFor(input);
            const p = ensurePopover();
            p.classList.remove('hidden');
            renderPicker();
            positionPopover(input);
        }
        function closePicker(){ if(popover) popover.classList.add('hidden'); active = null; }

        function renderPicker(){
            const p = ensurePopover();
            p.dataset.mode = 'calendar';
            const selected = active ? parseIso(getNativeValue(active)) : null;
            const today = todayStart();
            const lim = active ? getDateLimits(active) : {hint:''};
            const year = viewDate.getFullYear();
            const month = viewDate.getMonth();
            const first = new Date(year, month, 1);
            const start = new Date(first);
            const mondayOffset = (first.getDay() + 6) % 7;
            start.setDate(first.getDate() - mondayOffset);
            let days = '';
            for(let i=0;i<42;i++){
                const d = new Date(start);
                d.setDate(start.getDate()+i);
                const disabled = active ? isDisabledForInput(d, active) : false;
                const cls = ['aether-date-day'];
                if(d.getMonth() !== month) cls.push('other');
                if(sameDay(d, today)) cls.push('today');
                if(selected && sameDay(d, selected)) cls.push('selected');
                if(disabled) cls.push('disabled');
                days += `<button type="button" class="${cls.join(' ')}" data-date="${toIso(d)}" ${disabled ? 'disabled aria-disabled="true"' : ''}>${d.getDate()}</button>`;
            }
            p.innerHTML = `
                <div class="aether-date-head">
                    <button type="button" class="aether-date-title" data-action="monthPicker" title="Выбрать месяц и год">${monthNames[month]} ${year}</button>
                </div>
                <div class="aether-date-week">${weekNames.map(w=>`<span>${w}</span>`).join('')}</div>
                <div class="aether-date-grid">${days}</div>
                <div class="aether-date-actions">
                    <button type="button" class="danger-lite" data-action="clear">Удалить</button>
                </div>
                <div class="aether-date-hint">${lim.hint || ''}<br>Прокрутите календарь вверх/вниз, чтобы переключать месяцы.</div>`;
            p.querySelector('[data-action="monthPicker"]').onclick = renderMonthYearPicker;
            p.querySelector('[data-action="clear"]').onclick = () => selectDate('');
            p.querySelectorAll('[data-date]:not([disabled])').forEach(btn => btn.onclick = () => selectDate(btn.dataset.date));
            if(active) positionPopover(active);
        }

        function renderMonthYearPicker(){
            const p = ensurePopover();
            p.dataset.mode = 'monthYear';
            const currentYear = todayStart().getFullYear();
            const role = getDateRole(active);
            const minYear = 2000;
            const maxYear = Math.max(currentYear, viewDate.getFullYear(), role === 'release' ? currentYear + 3 : currentYear);
            let pickedMonth = viewDate.getMonth();
            let pickedYear = Math.min(Math.max(viewDate.getFullYear(), minYear), maxYear);

            function draw(){
                const years = [];
                for(let y=minYear; y<=maxYear; y++) years.push(y);
                p.innerHTML = `
                    <button type="button" class="aether-date-title" data-action="back" title="Вернуться к календарю">${monthNames[pickedMonth]} ${pickedYear}</button>
                    <div class="aether-month-year-picker">
                        <div class="aether-picker-col">
                            <div class="aether-picker-col-title">Месяц</div>
                            <div class="aether-picker-list">
                                ${monthNames.map((name, i) => `<button type="button" class="aether-picker-option ${i === pickedMonth ? 'active' : ''}" data-month="${i}">${i+1}. ${monthShort[i]}</button>`).join('')}
                            </div>
                        </div>
                        <div class="aether-picker-col">
                            <div class="aether-picker-col-title">Год</div>
                            <div class="aether-picker-list" id="aetherYearList">
                                ${years.map(y => `<button type="button" class="aether-picker-option ${y === pickedYear ? 'active' : ''}" data-year="${y}">${y}</button>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="aether-date-actions">
                        <button type="button" class="danger-lite" data-action="back">Назад</button>
                        <button type="button" data-action="choose">Выбрать</button>
                    </div>`;
                p.querySelectorAll('[data-month]').forEach(btn => btn.onclick = () => { pickedMonth = Number(btn.dataset.month); draw(); });
                p.querySelectorAll('[data-year]').forEach(btn => btn.onclick = () => { pickedYear = Number(btn.dataset.year); draw(); });
                p.querySelectorAll('[data-action="back"]').forEach(btn => btn.onclick = renderPicker);
                p.querySelector('[data-action="choose"]').onclick = () => {
                    viewDate = new Date(pickedYear, pickedMonth, 1);
                    renderPicker();
                };
                setTimeout(() => {
                    const activeYear = p.querySelector('[data-year].active');
                    if(activeYear) activeYear.scrollIntoView({block:'center'});
                }, 0);
                if(active) positionPopover(active);
            }
            draw();
        }

        function selectDate(value){
            if(!active) return;
            if(value){
                const d = parseIso(value);
                if(d && isDisabledForInput(d, active)) return;
            }
            setNativeValue(active, value);
            active.dispatchEvent(new Event('input', { bubbles:true }));
            active.dispatchEvent(new Event('change', { bubbles:true }));
            closePicker();
        }

        function validateOne(input, showAlert){
            if(!input || !input.value) return true;
            const d = parseIso(input.value);
            if(!d) return true;
            const lim = getDateLimits(input);
            const label = input.id === 'r_originalReleaseDate' ? 'Оригинальная дата релиза' : 'Дата релиза';
            if(lim.min && beforeDay(d, lim.min)){
                input.classList.add('error-field');
                if(showAlert) UI.alert('Ошибка', `${label} нельзя выбрать раньше ${formatDate(toIso(lim.min))}.`);
                return false;
            }
            if(lim.max && afterDay(d, lim.max)){
                input.classList.add('error-field');
                if(showAlert) UI.alert('Ошибка', `${label} не может быть позже сегодняшней даты.`);
                return false;
            }
            input.classList.remove('error-field');
            return true;
        }

        window.AetherLabValidateReleaseDates = function(showAlert = true){
            const rel = document.getElementById('r_releaseDate');
            const orig = document.getElementById('r_originalReleaseDate');
            return validateOne(rel, showAlert) && validateOne(orig, showAlert);
        };

        function initDateInput(input){
            if(input.__aetherDateReady) return;
            input.__aetherDateReady = true;
            if(!originalValueDescriptor) originalValueDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
            refreshNativeLimits(input);
            const wrapper = document.createElement('div');
            wrapper.className = 'aether-date-field';
            const display = document.createElement('input');
            display.type = 'text';
            display.className = 'aether-date-display';
            display.placeholder = 'дд.мм.гггг';
            display.readOnly = true;
            display.value = formatDate(input.value);
            input.parentNode.insertBefore(wrapper, input);
            wrapper.appendChild(input);
            wrapper.appendChild(display);
            input.classList.add('aether-native-date-hidden');
            input.__aetherDateDisplay = display;
            try{
                Object.defineProperty(input, 'value', {
                    configurable:true,
                    get(){ return getNativeValue(input); },
                    set(v){ setNativeValue(input, v); refreshNativeLimits(input); }
                });
            }catch(e){}
            const openNow = (e) => {
                if(e){ e.preventDefault(); e.stopPropagation(); }
                openPicker(input);
            };
            display.addEventListener('pointerdown', openNow);
            display.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); });
            display.addEventListener('focus', () => openPicker(input));
            display.addEventListener('keydown', (e) => {
                if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openPicker(input); }
                if(e.key === 'Escape') closePicker();
            });
            input.addEventListener('change', () => {
                refreshNativeLimits(input);
                display.value = formatDate(getNativeValue(input));
                validateOne(input, false);
            });
        }

        function initAll(){ document.querySelectorAll('input[type="date"]').forEach(initDateInput); }
        document.addEventListener('DOMContentLoaded', initAll);
        window.addEventListener('load', initAll);
        document.addEventListener('pointerdown', (e) => {
            if(!popover || popover.classList.contains('hidden')) return;
            const isInsidePopover = popover.contains(e.target);
            const isDateField = e.target && e.target.closest && e.target.closest('.aether-date-field');
            if(!isInsidePopover && !isDateField) closePicker();
        });
        window.addEventListener('resize', () => { if(active) positionPopover(active); });
        setInterval(() => {
            document.querySelectorAll('input[type="date"]').forEach(refreshNativeLimits);
            if(active && popover && !popover.classList.contains('hidden')) renderPicker();
        }, 60000);
        window.AetherLabDatePickerInit = initAll;
    })();


