
(function() {

    // AlphaX integrity guard: detects accidental/basic edits to packaged UI files.
    // This is tamper detection, not an unbreakable anti-crack mechanism.
    const __alphaxExpectedHashes = {"popup.js": "09bf73bcfc0087fd19ff28c0b837aac7d1361062daf154f31af17de62fd0711d", "popup.html": "f1c22cb7aeb80209434496126fee8b1e987a590b3179ba1aea5e763f5725ac1e", "popup.css": "7557a4a742e659cef35a175867b621df8fcbf7eb4428a4000c1f4a568c6bca6d"};
    async function __alphaxVerifyPackagedFiles() {
        try {
            for (const [name, expectedHash] of Object.entries(__alphaxExpectedHashes)) {
                const response = await fetch(chrome.runtime.getURL(name), { cache: "no-store" });
                if (!response.ok) return false;
                const bytes = await response.arrayBuffer();
                const digest = await crypto.subtle.digest("SHA-256", bytes);
                const actualHash = Array.from(new Uint8Array(digest))
                    .map(byte => byte.toString(16).padStart(2, "0")).join("");
                if (actualHash !== expectedHash) return false;
            }
            return true;
        } catch (_) {
            return false;
        }
    }

    __alphaxVerifyPackagedFiles().then(valid => {
        if (!valid) {
            console.error("AlphaXExtensions: integrity check failed; extension UI disabled.");
            return;
        }
        __alphaxStart();
    });

    function __alphaxStart() {

    console.log("Alphax Extensions Tools Active");

    // 1. तैरता हुआ ड्रैगेबल (Movable) आइकन बनाना
    const floatIcon = document.createElement('div');
    floatIcon.id = 'alphax-float-icon';
    
    // फ्लोटिंग आइकन की स्टाइलिंग
    Object.assign(floatIcon.style, {
        position: 'fixed',
        bottom: '100px',
        right: '20px',
        width: '55px',
        height: '55px',
        borderRadius: '50%',
        backgroundImage: `url(${chrome.runtime.getURL('ext_logo.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: '999999',
        cursor: 'move', // माउस/उंगली ले जाने पर मूव का साइन दिखेगा
        boxShadow: '0 0 15px rgba(168, 85, 247, 0.6)',
        border: '2px solid #a855f7',
        userSelect: 'none',
        touchAction: 'none' // मोबाइल स्क्रॉल को ब्लॉक करने के लिए ताकि स्मूथ ड्रैग हो
    });

    document.body.appendChild(floatIcon);
    floatIcon.style.display = 'none';

    // Detect all 11 supported platforms, then show that platform's logo in WinGo.
    // Host/URL/title and page branding are considered before broad visible-text fallback.
    const platformLogos = [
        { id: 'okwin', names: ['okwin', 'ok.win', 'ok win'], file: 'okwin.png' },
        { id: 'jaiclub', names: ['jaiclub', 'jai club'], file: 'jaiclub.png' },
        { id: 'jalwa', names: ['jalwa'], file: 'jalwa.png' },
        { id: 'veergame', names: ['veergame', 'veer game'], file: 'veergame.png' },
        { id: 'shreewin', names: ['shreewin', 'shree win'], file: 'shreewin.png' },
        { id: '82lottery', names: ['82lottery', '82 lottery'], file: '82lottery.png' },
        { id: '55club', names: ['55club', '55 club'], file: '55club.png' },
        { id: '91club', names: ['91club', '91 club'], file: '91.png' },
        { id: 'tashanwin', names: ['tashanwin', 'tashan win'], file: 'tashanwin.png' },
        { id: 'bdgwin', names: ['bdgwin', 'bdg win', 'bdg'], file: 'bdg.png' },
        { id: 'sikkimgame', names: ['sikkimgame', 'sikkim game', 'sikkim'], file: 'sikkim.png' }
    ];

    const normalizeSignal = value => String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');

    function getPageSignals() {
        const urlSignals = [
            location.hostname, location.pathname, location.search, location.hash,
            document.title
        ].join(' ');
        let brandSignals = '';
        try {
            const nodes = document.querySelectorAll(
                'header, nav, [class*="logo" i], [id*="logo" i], [class*="brand" i], [id*="brand" i], h1, h2, [aria-label], [title], img'
            );
            const chunks = [];
            for (const node of Array.from(nodes).slice(0, 250)) {
                chunks.push(node.getAttribute?.('alt') || '');
                chunks.push(node.getAttribute?.('title') || '');
                chunks.push(node.getAttribute?.('aria-label') || '');
                chunks.push(node.getAttribute?.('src') || '');
                chunks.push(typeof node.className === 'string' ? node.className : '');
                chunks.push(node.id || '');
                if (node.matches?.('header, nav, h1, h2, [class*="logo" i], [id*="logo" i], [class*="brand" i], [id*="brand" i]')) {
                    chunks.push((node.innerText || '').slice(0, 180));
                }
            }
            brandSignals = chunks.join(' ');
        } catch (_) {}
        const bodyText = (document.body?.innerText || '').slice(0, 16000);
        return {
            urlSignals: normalizeSignal(urlSignals),
            brandSignals: normalizeSignal(brandSignals),
            bodyText: normalizeSignal(bodyText),
            rawUrlSignals: urlSignals.toLowerCase(),
            rawBrandSignals: brandSignals.toLowerCase(),
            rawBodyText: bodyText.toLowerCase()
        };
    }

    function detectPlatform() {
        const s = getPageSignals();
        // Strong identifiers first: domain/path/title and branding assets.
        for (const platform of platformLogos) {
            const names = platform.names.map(normalizeSignal).filter(Boolean);
            if (names.some(name => s.urlSignals.includes(name) || s.brandSignals.includes(name))) {
                return platform;
            }
        }
        // Fallback to visible page text for SPAs whose URL doesn't include the brand.
        // Require the platform name in the page itself; a generic game page won't match.
        for (const platform of platformLogos) {
            const names = platform.names.map(normalizeSignal).filter(Boolean);
            if (names.some(name => s.bodyText.includes(name))) return platform;
        }
        return null;
    }

    function isWingoSection() {
        const s = getPageSignals();
        const patterns = [
            /win\s*go/i, /wingo/i, /win-go/i, /win\s*go\s*(?:30s|1\s*min|3\s*min|5\s*min)/i
        ];
        if (patterns.some(re => re.test(s.rawUrlSignals) || re.test(s.rawBrandSignals))) return true;

        // Look for a visible WinGo navigation item or section label, not unrelated text in scripts.
        const candidates = document.querySelectorAll(
            'a, button, [role="tab"], [role="button"], nav, header, h1, h2, h3, [aria-label], [title]'
        );
        for (const node of Array.from(candidates).slice(0, 300)) {
            const label = [
                node.innerText || '', node.getAttribute?.('aria-label') || '',
                node.getAttribute?.('title') || '', node.getAttribute?.('href') || ''
            ].join(' ');
            if (/win\s*go|wingo|win-go/i.test(label)) return true;
        }
        // Some game canvases hide their section label in the route, so retain a
        // conservative body-text fallback for these pages.
        return /win\s*go|wingo|win-go/i.test(s.rawBodyText);
    }

    function updateFloatVisibility() {
        const platform = detectPlatform();
        const show = Boolean(platform && isWingoSection());
        floatIcon.style.display = show ? 'block' : 'none';
        if (show && platform) {
            floatIcon.style.backgroundImage = `url("${chrome.runtime.getURL(platform.file)}")`;
            floatIcon.style.backgroundSize = 'cover';
            floatIcon.style.backgroundPosition = 'center';
            floatIcon.style.backgroundRepeat = 'no-repeat';
            floatIcon.dataset.platform = platform.id;
            floatIcon.setAttribute('aria-label', 'AlphaXExtensions - ' + platform.id + ' WinGo');
            floatIcon.title = platform.id + ' WinGo';
        }
    }

    updateFloatVisibility();
    let updateQueued = false;
    const scheduleFloatUpdate = () => {
        if (updateQueued) return;
        updateQueued = true;
        window.setTimeout(() => {
            updateQueued = false;
            updateFloatVisibility();
        }, 250);
    };
    const visibilityObserver = new MutationObserver(scheduleFloatUpdate);
    if (document.body) {
        visibilityObserver.observe(document.body, {
            childList: true, subtree: true, characterData: true, attributes: true
        });
    }
    window.addEventListener('popstate', scheduleFloatUpdate);
    window.addEventListener('hashchange', scheduleFloatUpdate);
    window.addEventListener('pageshow', scheduleFloatUpdate);
    window.addEventListener('focus', scheduleFloatUpdate);
    document.addEventListener('visibilitychange', scheduleFloatUpdate);

    // Read only visible result-history digits from the current platform DOM.
    // This is best-effort because each site has its own markup; canvas-only histories
    // cannot be reliably extracted without a platform-specific adapter.
    function readVisibleWingoResults() {
        const platform = detectPlatform();
        if (!platform || !isWingoSection()) return { platform: 'Waiting for WinGo page', results: [] };
        const candidates = new Set();
        const selectors = [
            '[class*="history" i] [class*="num" i]', '[class*="history" i] [class*="ball" i]',
            '[class*="record" i] [class*="num" i]', '[class*="result" i] [class*="num" i]',
            '[class*="trend" i] [class*="num" i]', '[class*="history" i] span',
            '[class*="history" i] div', '[class*="record" i] span',
            '[class*="result" i] span', '[class*="trend" i] span',
            '[class*="ball" i]', '[class*="lottery-number" i]', '[class*="number-ball" i]'
        ];
        try {
            selectors.forEach(selector => document.querySelectorAll(selector).forEach(node => {
                if (candidates.size < 600) candidates.add(node);
            }));
        } catch (_) {}
        const found = [];
        const seen = new Set();
        for (const node of candidates) {
            if (!node || !node.isConnected) continue;
            const style = getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
            const rect = node.getBoundingClientRect();
            if (rect.width < 5 || rect.height < 5) continue;
            const text = (node.innerText || node.textContent || '').trim();
            if (!/^[0-9]$/.test(text)) continue;
            const key = text + ':' + Math.round(rect.x) + ':' + Math.round(rect.y);
            if (seen.has(key)) continue;
            seen.add(key);
            // Capture a period ID from the same visible history row when the platform exposes one.
            let period = '';
            let row = node;
            for (let depth = 0; row && depth < 5; depth++, row = row.parentElement) {
                const rowText = (row.innerText || row.textContent || '').replace(/\s+/g, ' ').trim();
                const match = rowText.match(/\b\d{12,22}\b/);
                if (match) { period = match[0]; break; }
                if (rowText.length > 220) break;
            }
            found.push({ number: Number(text), period, y: rect.y, x: rect.x });
        }
        // Newest rows are normally at the top. De-duplicate by period so nested
        // number nodes cannot show the same platform result twice; keep only 10.
        found.sort((a, b) => a.y - b.y || a.x - b.x);
        const results = [];
        const seenPeriods = new Set();
        const seenFallback = new Set();
        for (const item of found) {
            const periodKey = String(item.period || '').trim();
            if (periodKey) {
                if (seenPeriods.has(periodKey)) continue;
                seenPeriods.add(periodKey);
            } else {
                const fallbackKey = item.number + ':' + Math.round(item.y / 8);
                if (seenFallback.has(fallbackKey)) continue;
                seenFallback.add(fallbackKey);
            }
            results.push({ number: item.number, period: periodKey });
            if (results.length >= 10) break;
        }
        return { platform: platform.names[0], results };
    }

    // 2. मुख्य एक्सटेंशन विंडो के लिए Iframe बनाना
    const iframeContainer = document.createElement('div');
    iframeContainer.id = 'alphax-popup-container';
    
    // पॉपअप को छोटा करने के लिए आपके अनुसार साइज फिक्स किया गया है
    Object.assign(iframeContainer.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '320px',  // matches alphax.html reference width
        height: '390px', // matches alphax.html reference height
        zIndex: '999999',
        display: 'none',
        borderRadius: '17px',
        background: '#ffffff',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
    });

    const iframe = document.createElement('iframe');
    iframe.src = chrome.runtime.getURL("popup.html");
    
    Object.assign(iframe.style, {
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: '17px',
        background: '#ffffff',
        display: 'block'
    });

    iframeContainer.appendChild(iframe);
    document.body.appendChild(iframeContainer);
    window.addEventListener('message', event => {
        if (event.source === iframe.contentWindow && event.data && event.data.type === 'ALPHAX_CLOSE') iframeContainer.style.display = 'none';
    });
    let lastResultPayload = '';
    const publishActualResults = () => {
        try {
            if (!iframe.contentWindow) return;
            const payload = readVisibleWingoResults();
            const signature = JSON.stringify(payload);
            if (signature !== lastResultPayload) {
                lastResultPayload = signature;
                iframe.contentWindow.postMessage({ type: 'ALPHAX_RESULTS_UPDATE', payload }, '*');
            }
            // Share only visible page timing/period hints; generated numbers remain demo-only.
            const pageText = (document.body?.innerText || '').slice(0, 12000);
            let seconds = 30;
            if (/WinGo\s*5\s*(?:Min|Minute)|5\s*Minutes?/i.test(pageText)) seconds = 300;
            else if (/WinGo\s*3\s*(?:Min|Minute)|3\s*Minutes?/i.test(pageText)) seconds = 180;
            else if (/WinGo\s*1\s*(?:Min|Minute)|1\s*Minute?/i.test(pageText)) seconds = 60;
            else if (/WinGo\s*30\s*(?:s|sec|seconds?)/i.test(pageText)) seconds = 30;
            const period = Array.isArray(payload?.results) && payload.results.length && payload.results[0]?.period ? String(payload.results[0].period) : '';
            iframe.contentWindow.postMessage({ type: 'ALPHAX_WINGO_CLOCK', seconds, period }, '*');
        } catch (_) {}
    };
    iframe.addEventListener('load', publishActualResults);
    window.setInterval(publishActualResults, 2500);
    const resultObserver = new MutationObserver(() => publishActualResults());
    if (document.body) resultObserver.observe(document.body, { childList: true, subtree: true, characterData: true });


    // ==========================================
    // ड्रैगेबल/मूवेबल (Movable) आइकन का लॉजिक
    // ==========================================
    let isDragging = false;
    let startX, startY, initialX, initialY;

    // मोबाइल टच के लिए स्टार्ट इवेंट
    floatIcon.addEventListener('touchstart', (e) => {
        isDragging = false; // क्लिक और ड्रैग में फर्क करने के लिए
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        initialX = floatIcon.offsetLeft;
        initialY = floatIcon.offsetTop;
    }, { passive: true });

    // मोबाइल टच मूव इवेंट
    document.addEventListener('touchmove', (e) => {
        if (startX === undefined || startY === undefined) return;
        
        let currentX = e.touches[0].clientX;
        let currentY = e.touches[0].clientY;
        
        // अगर उंगली थोड़ा ज़्यादा हिली है, तो इसे ड्रैग मानें
        if (Math.abs(currentX - startX) > 5 || Math.abs(currentY - startY) > 5) {
            isDragging = true;
            
            let xOffset = currentX - startX;
            let yOffset = currentY - startY;
            
            // आइकन की नई पोजीशन सेट करना
            floatIcon.style.left = (initialX + xOffset) + 'px';
            floatIcon.style.top = (initialY + yOffset) + 'px';
            floatIcon.style.bottom = 'auto';
            floatIcon.style.right = 'auto';
        }
    }, { passive: false });

    // टच एंड होने पर पॉपअप खोलना (केवल तभी जब आइकन हिलाया न गया हो)
    floatIcon.addEventListener('touchend', (e) => {
        startX = undefined;
        startY = undefined;
        
        if (!isDragging) {
            // अगर यूजर ने केवल टच किया है (हिलाया नहीं), तो पॉपअप टॉगल होगा
            if (iframeContainer.style.display === 'none') {
                iframeContainer.style.display = 'block';
                try { iframe.contentWindow.postMessage({ type: 'ALPHAX_OPEN' }, '*'); } catch (_) {}
            } else {
                iframeContainer.style.display = 'none';
            }
        }
    });

    // पॉपअप के बाहर क्लिक होने पर उसे बंद करना
    document.addEventListener('click', (e) => {
        if (!iframeContainer.contains(e.target) && e.target !== floatIcon) {
            iframeContainer.style.display = 'none';
        }
    });
    }
})();
