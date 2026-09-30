/* Firebase / persistence bootstrap + server-synchronised clock. */
    function createLocalDatabaseAdapter() {
        const STORAGE_KEY = 'aetherlab_local_fallback_db_v1';
        const listeners = {};
        const normalize = (path) => String(path || '').replace(/^\/+|\/+$/g, '');
        const snapshot = (value) => ({ val: () => value === undefined ? null : value });
        const readAll = () => {
            try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
            catch (e) { console.error(e); return {}; }
        };
        const writeAll = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        const parts = (path) => normalize(path).split('/').filter(Boolean);
        const getAt = (obj, path) => {
            let cur = obj;
            for (const key of parts(path)) {
                if (!cur || typeof cur !== 'object' || !(key in cur)) return null;
                cur = cur[key];
            }
            return cur === undefined ? null : cur;
        };
        const setAt = (obj, path, value) => {
            const keys = parts(path);
            if (!keys.length) return value;
            let cur = obj;
            keys.slice(0, -1).forEach(key => { if (!cur[key] || typeof cur[key] !== 'object') cur[key] = {}; cur = cur[key]; });
            cur[keys[keys.length - 1]] = value;
            return obj;
        };
        const removeAt = (obj, path) => {
            const keys = parts(path);
            if (!keys.length) return {};
            let cur = obj;
            for (const key of keys.slice(0, -1)) {
                if (!cur || typeof cur !== 'object') return obj;
                cur = cur[key];
            }
            if (cur && typeof cur === 'object') delete cur[keys[keys.length - 1]];
            return obj;
        };
        const shouldNotify = (changed, watched) => !changed || !watched || changed === watched || changed.startsWith(watched + '/') || watched.startsWith(changed + '/');
        const notify = (changedPath) => {
            const data = readAll();
            Object.keys(listeners).forEach(path => {
                if (shouldNotify(normalize(changedPath), path)) {
                    listeners[path].forEach(cb => setTimeout(() => cb(snapshot(getAt(data, path))), 0));
                }
            });
        };
        return {
            ref(path = '') {
                const cleanPath = normalize(path);
                return {
                    set(value) {
                        try {
                            const data = readAll();
                            writeAll(setAt(data, cleanPath, value));
                            notify(cleanPath);
                            return Promise.resolve();
                        } catch (err) { return Promise.reject(err); }
                    },
                    remove() {
                        try {
                            const data = readAll();
                            writeAll(removeAt(data, cleanPath));
                            notify(cleanPath);
                            return Promise.resolve();
                        } catch (err) { return Promise.reject(err); }
                    },
                    on(eventType, callback) {
                        if (eventType !== 'value') return;
                        if (!listeners[cleanPath]) listeners[cleanPath] = [];
                        listeners[cleanPath].push(callback);
                        setTimeout(() => callback(snapshot(getAt(readAll(), cleanPath))), 0);
                    },
                    once(eventType) {
                        if (eventType !== 'value') return Promise.reject(new Error('Поддерживается только value'));
                        return Promise.resolve(snapshot(getAt(readAll(), cleanPath)));
                    }
                };
            }
        };
    }

let db;
let firebaseOnline = false;

(function initAetherServices(){
    try {
        if(window.emailjs && emailjs.init) emailjs.init(AETHER_CONFIG.emailjs.publicKey);
        else console.warn('EmailJS SDK не загрузился. Уведомления на почту будут пропущены.');
    } catch(err){ console.warn('EmailJS init error:', err); }

    try {
        if (!window.firebase || !firebase.database) throw new Error('Firebase SDK не загрузился');
        if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(AETHER_CONFIG.firebase);
        db = firebase.database();
        firebaseOnline = true;
    } catch (err) {
        console.warn('Firebase недоступен, включён локальный резервный режим:', err);
        db = createLocalDatabaseAdapter();
    }
})();

function sendEmailNotification(subject, text) {
    if (!(window.emailjs && emailjs.send)) {
        console.warn('EmailJS SDK не загружен, письмо не отправлено:', subject);
        return;
    }
    emailjs.send(AETHER_CONFIG.emailjs.serviceId, AETHER_CONFIG.emailjs.templateId, { subject, message: text }).catch(err => console.error(err));
}

window.AetherClock = (function(){
    let offset = 0;
    let synced = false;
    const listeners = new Set();
    const api = {
        now(){ return Date.now() + offset; },
        get offset(){ return offset; },
        get synced(){ return synced; },
        get timeZone(){ try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local'; } catch(e){ return 'Local'; } },
        onChange(fn){ if(typeof fn === 'function'){ listeners.add(fn); try{ fn(api); }catch(e){} } return () => listeners.delete(fn); }
    };
    const notify = () => listeners.forEach(fn => { try{ fn(api); }catch(e){} });
    if(firebaseOnline && db && db.ref){
        try {
            db.ref('.info/serverTimeOffset').on('value', snap => {
                const value = Number(snap && snap.val ? snap.val() : 0);
                if(Number.isFinite(value)) { offset = value; synced = true; notify(); }
            }, () => { synced = false; notify(); });
        } catch(e){ console.warn('Firebase server clock sync unavailable:', e); }
    }
    return api;
})();
