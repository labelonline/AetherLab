
    (function(){
        try {
            var v = localStorage.getItem('aetherlab_language_v1');
            if(!/^(ru|en|uk)$/.test(v || '')) document.documentElement.classList.add('aether-language-pending');
        } catch(e) {
            document.documentElement.classList.add('aether-language-pending');
        }
    })();
    