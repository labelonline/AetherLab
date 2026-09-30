/* AetherLab module extracted from the former monolithic index.html. */
    let appState = { users: [], releases: [], chats: {}, content: { news: [], guide: [] }, promoLinks: [], publicSmartLinks: {}, questionnaires: [], supportQas: [], supportTickets: [], activityLog: [] }; 
    let currentUser = null; 
    let authMode = 'login'; 
    let currentSection = 'overview'; 
    let activeCatalogFilter = 'all'; 
    let isDraftDirty = false; 
    let currentDraftId = null; 
    let draftRelease = { coverFile: null, tracks: [], aiCoverUsed: false }; 
    let editTrackId = null; 
    let activeAdminChatUser = null; 
    let isDBLoaded = false;
    
    const yBox = document.getElementById('r_year'); if(yBox){ yBox.innerHTML = ''; const aetherYear = new Date(window.AetherClock && window.AetherClock.now ? window.AetherClock.now() : Date.now()).getFullYear(); for(let y=aetherYear + 1; y>=2000; y--) yBox.innerHTML += `<option value="${y}">${y}</option>`; }
    setTimeout(() => { if(!isDBLoaded) enableAuthButton(); }, 1500);
