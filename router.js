
(function () {
    const sectionRoutes = {
        overview: '/dashboard',
        releaseCalendar: '/calendar',
        releaseHub: '/release',
        activityLog: '/activity-log',
        newRelease: '/new-release',
        news: '/news',
        guide: '/instruction',
        userChat: '/support',
        adminChats: '/support',
        adminUsers: '/cabinets',
        adminReleases: '/admin-releases',
        adminContent: '/content-manager',
        karaoke: '/lyrics-karaoke',
        promoLinks: '/promo-links',
        questionnaires: '/questionnaires'
    };

    const catalogRoutes = {
        all: '/releases',
        drafts: '/drafts',
        mod: '/moderation',
        fix: '/fixes'
    };

    const adminOnlyPaths = new Set([
        '/cabinets',
        '/questionnaires',
        '/admin-releases',
        '/content-manager',
        '/activity-log'
    ]);

    const adminOnlySections = new Set([
        'adminUsers',
        'questionnaires',
        'adminReleases',
        'adminContent',
        'activityLog'
    ]);

    const AETHERLAB_BASE_PATH = '/AetherLab/';
    const AETHERLAB_ROUTE_KEY = 'aetherlab_last_route_v1';

    function normalizeAetherLabPath(path) {
        path = String(path || '/').split('?')[0].split('#')[0];
        if(path === '/AetherLab' || path === '/AetherLab/') return '/dashboard';
        if(path.indexOf('/AetherLab/') === 0) path = '/' + path.slice('/AetherLab/'.length);
        path = path.replace(/\/$/, '') || '/';
        return path;
    }

    function kiteIsArtist() {
        return !!(currentUser && currentUser.role === 'Artist');
    }

    function kiteIsAdmin() {
        return !!(currentUser && currentUser.role === 'Administrator');
    }

    function ensureAetherLabAccess404Styles() {
        if (document.getElementById('kiteAccess404Styles')) return;

        const style = document.createElement('style');
        style.id = 'kiteAccess404Styles';
        style.textContent = `
            body.kite-access-404-lock {
                overflow: hidden !important;
            }

            .kite-access-404 {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
                background: radial-gradient(circle at top, rgba(68,110,240,.18), transparent 34%), #0b0d12;
                color: #fff;
                text-align: center;
            }

            .kite-access-404-card {
                width: min(100%, 460px);
                padding: 34px 28px;
                border-radius: 28px;
                border: 1px solid rgba(255,255,255,.10);
                background: linear-gradient(180deg, rgba(23,28,39,.96), rgba(15,19,26,.96));
                box-shadow: 0 28px 80px rgba(0,0,0,.55);
            }

            .kite-access-404-code {
                margin-bottom: 14px;
                font-size: clamp(76px, 18vw, 124px);
                line-height: .9;
                font-weight: 900;
                letter-spacing: -.08em;
                color: #fff;
                text-shadow: 0 0 34px rgba(68,110,240,.35);
            }

            .kite-access-404-card h1 {
                margin: 0 0 10px;
                font-size: 26px;
                font-weight: 800;
                letter-spacing: -.03em;
            }

            .kite-access-404-card p {
                margin: 0 0 24px;
                color: #aab0c0;
                font-size: 14px;
                line-height: 1.6;
            }

            .kite-access-404-card button {
                width: 100%;
                padding: 14px 20px;
                border: 0;
                border-radius: 999px;
                background: linear-gradient(135deg, var(--accent, #446EF0), #5D83FF);
                color: #fff;
                font-weight: 800;
                cursor: pointer;
                box-shadow: 0 16px 34px rgba(68,110,240,.28);
            }
        `;
        document.head.appendChild(style);
    }

    function showAetherLabAccess404() {
        ensureAetherLabAccess404Styles();
        document.body.classList.add('kite-access-404-lock');

        let screen = document.getElementById('kiteAccess404Screen');
        if (!screen) {
            screen = document.createElement('div');
            screen.id = 'kiteAccess404Screen';
            screen.className = 'kite-access-404';
            document.body.appendChild(screen);
        }

        screen.innerHTML = `
            <div class="kite-access-404-card">
                <div class="kite-access-404-code">404</div>
                <h1>Страница не найдена</h1>
                <p>Эта страница недоступна для кабинета артиста.</p>
                <button type="button" id="kiteAccess404HomeBtn">Вернутся домой</button>
            </div>
        `;

        const homeBtn = document.getElementById('kiteAccess404HomeBtn');
        if (homeBtn) {
            homeBtn.onclick = function () {
                hideAetherLabAccess404();
                setAetherLabPath('/dashboard', true);

                window.__kiteRouteOpening = true;
                try { nav('overview', true); } catch (e) { console.warn('AetherLab dashboard open error:', e); }
                window.__kiteRouteOpening = false;
            };
        }
    }

    function hideAetherLabAccess404() {
        document.body.classList.remove('kite-access-404-lock');
        const screen = document.getElementById('kiteAccess404Screen');
        if (screen) screen.remove();
    }

    const pathToAction = {
        '/': () => nav('overview'),
        '/dashboard': () => nav('overview'),
        '/calendar': () => nav('releaseCalendar'),
        '/release': () => nav('releaseHub'),
        '/activity-log': () => nav('activityLog'),
        '/new-release': () => startNewRelease(),
        '/releases': () => navCatalog('all'),
        '/drafts': () => navCatalog('drafts'),
        '/moderation': () => navCatalog('mod'),
        '/fixes': () => navCatalog('fix'),
        '/news': () => nav('news'),
        '/instruction': () => nav('guide'),
        '/support': () => { if (typeof supportSetTab === 'function') supportSetTab('qa'); nav(kiteIsAdmin() ? 'adminChats' : 'userChat'); },
        '/support-ticket': () => { if (typeof supportSetTab === 'function') supportSetTab('tickets'); nav(kiteIsAdmin() ? 'adminChats' : 'userChat'); },
        '/cabinets': () => nav('adminUsers'),
        '/admin-releases': () => nav('adminReleases'),
        '/content-manager': () => nav('adminContent'),
        '/lyrics-karaoke': () => nav('karaoke'),
        '/promo-links': () => nav('promoLinks'),
        '/questionnaires': () => nav('questionnaires')
    };

    function setAetherLabPath(path, replace = false) {
        path = normalizeAetherLabPath(path);

        if (kiteIsArtist() && adminOnlyPaths.has(path)) {
            showAetherLabAccess404();
            return;
        }

        try { sessionStorage.setItem(AETHERLAB_ROUTE_KEY, path); } catch(e) {}

        // GitHub Pages does not provide an SPA fallback for /dashboard, /news, etc.
        // Keep the public address fixed at /AetherLab/ so refresh never becomes a 404.
        if(location.hostname === 'labelonline.github.io' && location.pathname !== AETHERLAB_BASE_PATH) {
            try { history.replaceState({ kitePath:path }, '', AETHERLAB_BASE_PATH); } catch(e) {}
        }
    }

    function openCurrentPath() {
        let path = '';
        try { path = sessionStorage.getItem(AETHERLAB_ROUTE_KEY) || ''; } catch(e) {}

        if(!path) {
            const legacyPath = normalizeAetherLabPath(location.pathname);
            path = pathToAction[legacyPath] ? legacyPath : '/dashboard';
        }
        path = normalizeAetherLabPath(path);
        if(!pathToAction[path]) path = '/dashboard';

        try { sessionStorage.setItem(AETHERLAB_ROUTE_KEY, path); } catch(e) {}
        if(location.hostname === 'labelonline.github.io' && location.pathname !== AETHERLAB_BASE_PATH) {
            try { history.replaceState({ kitePath:path }, '', AETHERLAB_BASE_PATH); } catch(e) {}
        }

        if (kiteIsArtist() && adminOnlyPaths.has(path)) {
            showAetherLabAccess404();
            return;
        }

        hideAetherLabAccess404();

        const action = pathToAction[path] || pathToAction['/dashboard'];

        window.__kiteRouteOpening = true;
        try {
            action();
        } catch (e) {
            console.warn('AetherLab route open error:', e);
        }
        window.__kiteRouteOpening = false;
    }

    function patchNavigation() {
        if (typeof window.nav === 'function' && !window.nav.__kitePatched) {
            const oldNav = window.nav;
            window.nav = function (section) {
                if (kiteIsArtist() && adminOnlySections.has(section)) {
                    showAetherLabAccess404();
                    return;
                }

                hideAetherLabAccess404();

                const result = oldNav.apply(this, arguments);
                if (!window.__kiteRouteOpening && sectionRoutes[section]) {
                    setAetherLabPath(sectionRoutes[section]);
                }
                return result;
            };
            window.nav.__kitePatched = true;
        }

        if (typeof window.navCatalog === 'function' && !window.navCatalog.__kitePatched) {
            const oldNavCatalog = window.navCatalog;
            window.navCatalog = function (type) {
                hideAetherLabAccess404();

                const result = oldNavCatalog.apply(this, arguments);
                if (!window.__kiteRouteOpening && catalogRoutes[type]) {
                    setAetherLabPath(catalogRoutes[type]);
                }
                return result;
            };
            window.navCatalog.__kitePatched = true;
        }

        if (typeof window.startNewRelease === 'function' && !window.startNewRelease.__kitePatched) {
            const oldStartNewRelease = window.startNewRelease;
            window.startNewRelease = function () {
                hideAetherLabAccess404();

                const result = oldStartNewRelease.apply(this, arguments);
                if (!window.__kiteRouteOpening) {
                    setAetherLabPath('/new-release');
                }
                return result;
            };
            window.startNewRelease.__kitePatched = true;
        }
    }

    window.openAetherLabCurrentPath = openCurrentPath;
    window.addEventListener('popstate', openCurrentPath);

    function bootAetherRouter() {
        patchNavigation();
        const routeTimer = setInterval(function () {
            patchNavigation();
            const app = document.getElementById('appView');
            if (app && !app.classList.contains('hidden')) {
                clearInterval(routeTimer);
                openCurrentPath();
            }
        }, 300);
    }
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootAetherRouter);
    else bootAetherRouter();
})();
