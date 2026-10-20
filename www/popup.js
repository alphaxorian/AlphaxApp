document.addEventListener('DOMContentLoaded', () => {
  const screens = [...document.querySelectorAll('.app-screen')];
  const backBtn = document.getElementById('global-back');
  const historyStack = [];
  let currentScreen = 'screen-splash';
  const showScreen = (id, remember = true) => {
    if (!document.getElementById(id)) return;
    const previousScreen = currentScreen;
    if (remember && currentScreen !== id) historyStack.push(currentScreen);
    currentScreen = id;
    screens.forEach(s => {
      const active = s.id === id;
      s.style.display = active ? (id === 'screen-splash' || id === 'screen-diwali' ? 'flex' : 'block') : 'none';
      s.classList.toggle('active-screen', active);
    });
    if (backBtn) backBtn.style.display = (id === 'screen-splash' || id === 'screen-home' || id === 'screen-diwali') ? 'none' : 'grid';
    const quick = document.querySelector('.quick-links');
    if (quick) quick.style.display = id === 'screen-home' ? 'grid' : 'none';
    const panel = document.querySelector('.extension-floating-popup');
    const viewport = document.querySelector('.mobile-center-viewport-wrapper');
    if (panel) { panel.scrollTop = 0; panel.classList.toggle('diwali-mode', id === 'screen-diwali'); }
    if (viewport) viewport.classList.toggle('diwali-mode', id === 'screen-diwali');
    if (previousScreen === 'screen-diwali' && id !== 'screen-diwali') stopDiwaliAudio();
  };
  showScreen('screen-splash', false);
  let splashTimer = window.setTimeout(() => { showScreen('screen-diwali', false); startDiwaliAudio(); }, 2500);
  window.addEventListener('message', event => {
    if (event.data && event.data.type === 'ALPHAX_OPEN') {
      window.clearTimeout(splashTimer); historyStack.length = 0;
      showScreen('screen-splash', false);
      splashTimer = window.setTimeout(() => { showScreen('screen-diwali', false); startDiwaliAudio(); }, 2500);
    }
  });

  const diwaliCloseButton = document.getElementById('diwali-close-btn');
  if (diwaliCloseButton) diwaliCloseButton.addEventListener('click', () => {
    stopDiwaliAudio();
    showScreen('screen-home', false);
  });

  // Keep the festive melody running only while the Diwali screen is visible.
  // Attempt playback as soon as the Diwali screen appears; retain a gesture fallback for browsers that block autoplay.
  let diwaliAudioContext = null, diwaliMaster = null, diwaliLoop = null, diwaliAudioUnlocked = false;
  function stopDiwaliAudio() {
    if (diwaliLoop) { clearInterval(diwaliLoop); diwaliLoop = null; }
    const oldContext = diwaliAudioContext;
    const oldMaster = diwaliMaster;
    // Silence immediately, then close the context so scheduled notes cannot continue.
    try {
      if (oldMaster && oldContext) {
        oldMaster.gain.cancelScheduledValues(oldContext.currentTime);
        oldMaster.gain.setValueAtTime(0, oldContext.currentTime);
        oldMaster.disconnect();
      }
    } catch (_) {}
    diwaliAudioContext = null;
    diwaliMaster = null;
    diwaliAudioUnlocked = false;
    if (oldContext) {
      try { const closing = oldContext.close(); if (closing && closing.catch) closing.catch(() => {}); } catch (_) {}
    }
  }
  function playDiwaliMelody() {
    if (!diwaliAudioContext || !diwaliMaster || diwaliAudioContext.state !== 'running') return;
    const now = diwaliAudioContext.currentTime + .04;
    const melody = [[659,0],[784,.18],[988,.36],[784,.57],[880,.78],[1047,.98],[988,1.20],[784,1.43],[659,1.68],[784,1.91],[880,2.15],[784,2.39],[659,2.65],[523,2.9],[659,3.05]];
    melody.forEach(([freq, offset]) => {
      const osc = diwaliAudioContext.createOscillator(), gain = diwaliAudioContext.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, now + offset);
      gain.gain.setValueAtTime(.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(.045, now + offset + .025);
      gain.gain.exponentialRampToValueAtTime(.0001, now + offset + .36);
      osc.connect(gain); gain.connect(diwaliMaster); osc.start(now + offset); osc.stop(now + offset + .4);
    });
  }
  function startDiwaliAudio() {
    if (currentScreen !== 'screen-diwali' || diwaliAudioUnlocked) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!diwaliAudioContext || diwaliAudioContext.state === 'closed') {
        diwaliAudioContext = new AudioCtx();
        diwaliMaster = diwaliAudioContext.createGain();
        diwaliMaster.gain.setValueAtTime(.32, diwaliAudioContext.currentTime);
        diwaliMaster.connect(diwaliAudioContext.destination);
      }
      const context = diwaliAudioContext;
      context.resume().then(() => {
        if (currentScreen !== 'screen-diwali' || context !== diwaliAudioContext || context.state !== 'running') return;
        diwaliAudioUnlocked = true;
        playDiwaliMelody();
        if (!diwaliLoop) diwaliLoop = window.setInterval(() => {
          if (currentScreen === 'screen-diwali' && diwaliAudioContext === context && context.state === 'running') playDiwaliMelody();
        }, 4200);
      }).catch(() => { diwaliAudioUnlocked = false; });
    } catch (_) { diwaliAudioUnlocked = false; }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopDiwaliAudio(); });

  const originalShowScreen = showScreen;
  // Retry on a user gesture only if the browser blocked automatic playback. Audio stops as soon as the screen is left.
  document.addEventListener('pointerdown', e => {
    if (currentScreen === 'screen-diwali' && !e.target.closest('#diwali-close-btn')) startDiwaliAudio();
  }, true);

  const getPredictions = document.getElementById('get-predictions-btn');
  if (getPredictions) getPredictions.addEventListener('click', () => showScreen('screen-platforms'));
  const freeToolButton = document.getElementById('free-predictions-tool-btn');
  if (freeToolButton) freeToolButton.addEventListener('click', () => showScreen('screen-prediction-tool'));
  const getPrimePredictionsButton = document.getElementById('get-prime-predictions-btn');
  if (getPrimePredictionsButton) getPrimePredictionsButton.addEventListener('click', () => showScreen('screen-platforms'));

  // PredictWingo premium overlay UI. Unlock stays server-gated; no client-side fake approval.
  const licenseGate = document.getElementById('license-gate');
  const premiumView = document.getElementById('prediction-premium-view');
  const recentView = document.getElementById('prediction-recent-view');
  const licenseMessage = document.getElementById('prediction-license-message');
  const licenseInput = document.getElementById('prediction-license-key');
  const licenseActivate = document.getElementById('activate-prediction-license');
  const recentGeneratedList = document.getElementById('prediction-recent-list');
  const generatedResults = [];
  let generatedPeriodKey = '';
  let detectedPeriodLabel = 'Period: unavailable';
  let detectedModeSeconds = 30;
  const classifyGeneratedNumber = n => ({ size: n >= 5 ? 'BIG' : 'SMALL', colour: (n === 0 || n % 2 === 0) ? 'RED' : 'GREEN', purple: n === 0 || n === 5 });
  const renderGeneratedResult = (n, period) => {
    const c = classifyGeneratedNumber(n);
    const ball = document.getElementById('predictwingo-ball');
    const size = document.getElementById('predictwingo-size');
    const colour = document.getElementById('predictwingo-colour');
    if (ball) { ball.src = n + '.png'; ball.alt = 'Generated number ' + n; }
    if (size) size.textContent = c.size;
    if (colour) { colour.textContent = c.purple ? (c.colour + ' + PURPLE') : c.colour; colour.className = 'predictwingo-colour ' + c.colour.toLowerCase() + (c.purple ? ' has-purple' : ''); }
    generatedResults.unshift({number:n,period, ...c});
    while (generatedResults.length > 10) generatedResults.pop();
    renderGeneratedHistory();
  };
  const renderGeneratedHistory = () => {
    if (!recentGeneratedList) return;
    recentGeneratedList.replaceChildren();
    if (!generatedResults.length) { recentGeneratedList.textContent = 'No generated results yet.'; return; }
    generatedResults.forEach(row => {
      const item = document.createElement('div'); item.className = 'prediction-recent-row';
      const img = document.createElement('img'); img.src = row.number + '.png'; img.alt = 'Generated ' + row.number;
      const period = document.createElement('span'); period.textContent = row.period;
      const details = document.createElement('strong'); details.textContent = row.number + ' · ' + row.size + ' · ' + row.colour + (row.purple ? ' + PURPLE' : '');
      item.append(img, period, details); recentGeneratedList.appendChild(item);
    });
  };
if (licenseActivate) licenseActivate.addEventListener('click', () => {
  const key = (licenseInput?.value || "").trim();
  if (!key) { 
    if (licenseMessage) licenseMessage.textContent = 'Please enter your license key.'; 
    return; 
  }
  if (licenseMessage) licenseMessage.textContent = 'Verifying license...';

  // Cloudflare Worker ka asali URL connect kar diya hai
  fetch('https://alphax-license-api.arsalankhanyt0786.workers.dev/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ licenseKey: key })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success && data.valid) {
      if (licenseMessage) licenseMessage.textContent = 'License verified successfully!';
      // On successful verification, open the intentionally blank prediction page.
      // Keep this page empty for now; prediction UI will be added later.
      window.location.href = 'alphax.html';
    } else {
      if (licenseMessage) licenseMessage.textContent = data.message || 'Invalid or Expired License Key!';
    }
  })
  .catch(error => {
    console.error('Error:', error);
    if (licenseMessage) licenseMessage.textContent = 'License verification server error. Please try again.';
  });
});
  const showPremiumPrediction = () => { if (licenseGate) licenseGate.hidden = true; if (premiumView) premiumView.hidden = false; if (recentView) recentView.hidden = true; };
  const showGeneratedHistory = () => { if (premiumView) premiumView.hidden = true; if (recentView) recentView.hidden = false; renderGeneratedHistory(); };
  document.getElementById('show-recent-results')?.addEventListener('click', showGeneratedHistory);
  document.getElementById('recent-back-to-prediction')?.addEventListener('click', showPremiumPrediction);
  document.getElementById('predictwingo-close')?.addEventListener('click', () => {
    window.parent.postMessage({ type: 'ALPHAX_CLOSE' }, '*');
  });
  const renderPredictWingoClock = () => {
    const now = Math.floor(Date.now()/1000), left = detectedModeSeconds - (now % detectedModeSeconds);
    const timer = document.getElementById('predictwingo-timer');
    if (timer) timer.textContent = String(Math.floor(left/60)).padStart(2,'0') + ':' + String(left%60).padStart(2,'0');
    const key = detectedModeSeconds + '-' + Math.floor(now/detectedModeSeconds);
    if (key !== generatedPeriodKey) {
      generatedPeriodKey = key;
      // Random demonstration result; this is not an official WinGo result.
      renderGeneratedResult(Math.floor(Math.random()*10), detectedPeriodLabel === 'Period: unavailable' ? 'Demo ' + key : detectedPeriodLabel);
    }
  };
  renderPredictWingoClock();
  window.setInterval(renderPredictWingoClock, 250);
  window.addEventListener('message', event => {
    if (event.source !== window.parent || !event.data || event.data.type !== 'ALPHAX_WINGO_CLOCK') return;
    const seconds = Number(event.data.seconds);
    if ([30,60,180,300].includes(seconds)) detectedModeSeconds = seconds;
    if (event.data.period) detectedPeriodLabel = String(event.data.period).slice(0,80);
    const periodNode = document.getElementById('predictwingo-period');
    if (periodNode) periodNode.textContent = detectedPeriodLabel === 'Period: unavailable' ? 'PERIOD: Waiting for page' : 'PERIOD: ' + detectedPeriodLabel;
  });

  // Actual platform result history is supplied by the content script when readable.
  // Empty state is intentional: never substitute fabricated results for real history.
  const recentResultsNode = document.getElementById('recent-results-list');
  const resultSourceLabel = document.getElementById('result-source-label');
  const sourceStatus = document.getElementById('prediction-source-status');
  const statsTotal = document.getElementById('stats-total');
  const statsBigSmall = document.getElementById('stats-big-small');
  const statsRedGreen = document.getElementById('stats-red-green');
  const numberDistribution = document.getElementById('number-distribution');
  let actualResults = [];

  const classifyWingoNumber = n => ({
    size: n >= 5 ? 'BIG' : 'SMALL',
    // Common WinGo colour mapping. 0 and 5 also carry violet.
    colour: (n === 0 || n % 2 === 0) ? 'red' : 'green',
    violet: n === 0 || n === 5
  });

  const lockedResultsNode = document.getElementById('locked-platform-results-list');
  const lockedResultsSource = document.getElementById('locked-results-source');
  const renderLockedPlatformResults = (rows, source) => {
    if (lockedResultsSource) lockedResultsSource.textContent = rows.length ? String(source || 'PLATFORM').toUpperCase() : 'WAITING FOR PAGE';
    if (!lockedResultsNode) return;
    lockedResultsNode.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement('div'); empty.className = 'locked-results-empty';
      empty.textContent = 'Waiting for visible WinGo results…'; lockedResultsNode.appendChild(empty); return;
    }
    rows.slice(0, 10).forEach((row, index) => {
      const n = row.number; const cls = classifyWingoNumber(n);
      const item = document.createElement('div'); item.className = 'locked-platform-result-row';
      const ball = document.createElement('img'); ball.src = n + '.png'; ball.alt = 'Platform result ' + n;
      const meta = document.createElement('div'); meta.className = 'locked-platform-result-meta';
      const label = document.createElement('strong'); label.textContent = n + ' · ' + cls.size + ' · ' + cls.colour.toUpperCase() + (cls.violet ? ' + PURPLE' : '');
      const period = document.createElement('small'); period.textContent = row.period || ('Result ' + (index + 1)); period.title = row.period || '';
      meta.append(label, period); item.append(ball, meta); lockedResultsNode.appendChild(item);
    });
  };

  const renderActualResultStats = (payload) => {
    const rawRows = Array.isArray(payload?.results)
      ? payload.results.map(x => ({ number: Number(typeof x === 'object' ? x.number : x), period: typeof x === 'object' ? String(x.period || '').trim() : '' }))
          .filter(x => Number.isInteger(x.number) && x.number >= 0 && x.number <= 9)
      : [];
    const rows = [];
    const seenPeriods = new Set();
    const seenFallback = new Set();
    for (const row of rawRows) {
      if (row.period) {
        if (seenPeriods.has(row.period)) continue;
        seenPeriods.add(row.period);
      } else {
        const key = row.number + ':' + rows.length;
        if (seenFallback.has(key)) continue;
        seenFallback.add(key);
      }
      rows.push(row);
      if (rows.length === 10) break;
    }
    const nums = rows.map(x => x.number);
    actualResults = nums;
    const source = String(payload?.platform || 'PLATFORM').replace(/[^a-z0-9 _.-]/gi, '').slice(0, 24);
    renderLockedPlatformResults(rows, source);
    if (resultSourceLabel) {
      resultSourceLabel.textContent = nums.length ? source.toUpperCase() : 'WAITING';
      const pill = resultSourceLabel.closest('.stats-live-pill');
      if (pill) pill.classList.toggle('is-live', nums.length > 0);
    }
    if (sourceStatus) {
      sourceStatus.textContent = nums.length
        ? 'Showing ' + nums.length + ' recent result(s) detected on ' + source + '.'
        : 'No readable actual result history detected on the current page yet. No results are fabricated.';
    }
    if (statsTotal) statsTotal.textContent = String(nums.length);
    const big = nums.filter(n => n >= 5).length;
    const small = nums.length - big;
    const red = nums.filter(n => classifyWingoNumber(n).colour === 'red').length;
    const green = nums.length - red;
    if (statsBigSmall) statsBigSmall.textContent = nums.length ? big + ' / ' + small : '— / —';
    if (statsRedGreen) statsRedGreen.textContent = nums.length ? red + ' / ' + green : '— / —';

    if (recentResultsNode) {
      recentResultsNode.replaceChildren();
      if (!rows.length) {
        const empty = document.createElement('div');
        empty.className = 'results-empty';
        empty.innerHTML = '<span class="results-empty-icon">◷</span><b>Waiting for platform data</b><small>Open a WinGo page with visible result history.</small>';
        recentResultsNode.appendChild(empty);
      } else {
        const table = document.createElement('table');
        table.className = 'actual-results-table';
        table.innerHTML = '<thead><tr><th>Period</th><th>Number</th><th>Big Small</th><th>Color</th></tr></thead>';
        const tbody = document.createElement('tbody');
        rows.slice(0, 10).forEach((result, index) => {
          const n = result.number;
          const cls = classifyWingoNumber(n);
          const tr = document.createElement('tr');
          const period = document.createElement('td');
          period.className = 'actual-period';
          period.textContent = result.period || '—';
          period.title = result.period || 'Period ID not exposed by page';
          const number = document.createElement('td');
          number.className = 'actual-number ' + cls.colour + (cls.violet ? ' violet' : '');
          const ball = document.createElement('img');
          ball.src = n + '.png';
          ball.alt = 'Result ' + n;
          ball.loading = 'lazy';
          ball.decoding = 'async';
          ball.className = 'result-number-ball';
          number.appendChild(ball);
          const size = document.createElement('td');
          size.textContent = cls.size.charAt(0) + cls.size.slice(1).toLowerCase();
          const colour = document.createElement('td');
          colour.className = 'actual-colors';
          const dot = document.createElement('i');
          dot.className = 'actual-color-dot ' + cls.colour;
          colour.appendChild(dot);
          if (cls.violet) { const violet = document.createElement('i'); violet.className = 'actual-color-dot violet-dot'; colour.appendChild(violet); }
          tr.title = 'Recent result ' + (index + 1) + ': ' + n;
          tr.append(period, number, size, colour);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        recentResultsNode.appendChild(table);
      }
    }

  };

  window.addEventListener('message', event => {
    if (event.source !== window.parent || !event.data || event.data.type !== 'ALPHAX_RESULTS_UPDATE') return;
    renderActualResultStats(event.data.payload || {});
  });
  renderActualResultStats({results: []});

  // Local demo capsule: interval countdown and illustrative random labels only.
  const predictionModes = [{seconds:30},{seconds:60},{seconds:180},{seconds:300}];
  let predictionMode = 0, predictionLastKey = '', predictionPrevious = null;
  const predictionOptions = [
    {size:'BIG', colour:'red', label:'🔴 RED'},
    {size:'SMALL', colour:'green', label:'🟢 GREEN'},
    {size:'SMALL', colour:'red', label:'🔴 RED'},
    {size:'BIG', colour:'green', label:'🟢 GREEN'}
  ];
  const updatePredictionResult = () => {
    let item;
    if (predictionPrevious && Math.random() < .25) item = predictionPrevious;
    else {
      const choices = predictionOptions.filter(x => !(x.size === predictionPrevious?.size && x.colour === predictionPrevious?.colour));
      item = choices[Math.floor(Math.random() * choices.length)];
    }
    predictionPrevious = item;
    const result = document.getElementById('prediction-result');
    if (result) result.innerHTML = '<span class="prediction-size">'+item.size+'</span><span class="prediction-sep">|</span><span class="prediction-colour '+item.colour+'">'+item.label+'</span>';
  };
  document.querySelectorAll('[data-pred-mode]').forEach(button => button.addEventListener('click', () => {
    predictionMode = Number(button.dataset.predMode);
    document.querySelectorAll('[data-pred-mode]').forEach(b => b.classList.toggle('active', b === button));
    predictionLastKey = '';
    renderPredictionBar();
  }));
  const renderPredictionBar = () => {
    const seconds = predictionModes[predictionMode].seconds;
    const now = Math.floor(Date.now()/1000);
    const left = seconds - (now % seconds);
    const timer = document.getElementById('prediction-timer');
    if (timer) timer.textContent = String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
    const key = predictionMode+'-'+Math.floor(now/seconds);
    if (key !== predictionLastKey) { predictionLastKey = key; updatePredictionResult(); }
  };
  renderPredictionBar();
  const predictionTimerId = window.setInterval(renderPredictionBar, 200);
  window.addEventListener('pagehide', () => window.clearInterval(predictionTimerId), {once:true});
  if (backBtn) backBtn.addEventListener('click', () => {
    const previous = historyStack.pop();
    if (previous) showScreen(previous, false);
    else showScreen('screen-home', false);
  });

  document.querySelectorAll('.get-pred-btn').forEach(button => button.addEventListener('click', e => {
    e.preventDefault(); button.classList.add('loading-active'); button.setAttribute('aria-busy','true');
    window.setTimeout(() => { button.classList.remove('loading-active'); button.removeAttribute('aria-busy'); showScreen('screen-plan'); }, 350);
  }));

  document.querySelectorAll('.plan-option').forEach(option => option.addEventListener('click', () => {
    document.querySelectorAll('.plan-option').forEach(x => x.classList.toggle('selected', x === option));
    const selectedPlan = option.dataset.plan || 'Gold';
    const name = document.getElementById('selected-plan-name'); if (name) name.textContent = selectedPlan;
    const title = document.getElementById('plan-title'); if (title) title.textContent = selectedPlan.toUpperCase() + ' MEMBERSHIP';
    const price = document.getElementById('payment-amount'); if (price) price.textContent = '₹' + (option.dataset.price || '1969');
    const paymentPlan = document.getElementById('payment-plan-name'); if (paymentPlan) paymentPlan.textContent = selectedPlan.toUpperCase() + ' PLAN';
    const predictions = document.getElementById('plan-predictions'); if (predictions) predictions.textContent = (option.dataset.predictions || '20') + ' NUMBERS PREDICTIONS';
    const priceAmount = document.querySelector('.price-amount'); if (priceAmount) priceAmount.textContent = option.dataset.price || '1969';
    const planBadge = document.querySelector('.plan-badge'); if (planBadge) planBadge.textContent = '✦ ' + selectedPlan.toUpperCase() + ' PLAN';
    const paymentQr = document.getElementById('payment-qr-image');
    if (paymentQr) paymentQr.src = ({ Gold: 'qr-gold.png', Diamond: 'qr-diamond.png', Prime: 'qr-prime.png' })[selectedPlan] || 'qr-gold.png';
  }));
  const activate = document.getElementById('activate-now-btn');
  if (activate) activate.addEventListener('click', e => { e.preventDefault(); showScreen('screen-qr'); });


  // UPI payment shortcuts added without changing existing plan/navigation logic.
  const upiId = 'renux@ptaxis';
  const upiName = 'ALPHAX';
  const upiFeedback = document.getElementById('upi-feedback');
  const getPaymentAmount = () => {
    const amountText = (document.getElementById('payment-amount')?.textContent || '').replace(/[^0-9.]/g, '');
    return amountText || '1969';
  };
  const buildUpiQuery = () => new URLSearchParams({ pa: upiId, pn: upiName, am: getPaymentAmount(), cu: 'INR', tn: 'Alphax Membership' }).toString();
  document.querySelectorAll('[data-upi-app]').forEach(button => button.addEventListener('click', () => {
    const query = buildUpiQuery();
    const app = button.dataset.upiApp;
    const appUrls = {
      gpay: 'gpay://upi/pay?' + query,
      paytm: 'paytmmp://pay?' + query,
      phonepe: 'phonepe://pay?' + query
    };
    if (upiFeedback) { upiFeedback.textContent = 'Opening payment app…'; upiFeedback.className = 'upi-feedback visible'; }
    // Try the selected app first, then offer Android's generic UPI chooser as a fallback.
    window.location.href = appUrls[app] || ('upi://pay?' + query);
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        if (upiFeedback) upiFeedback.textContent = 'If the app did not open, use the QR code or copy the UPI ID.';
        window.location.href = 'upi://pay?' + query;
      }
    }, 1200);
  }));
  const copyUpiButton = document.getElementById('copy-upi-id');
  if (copyUpiButton) copyUpiButton.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(upiId);
      else { const temp = document.createElement('textarea'); temp.value = upiId; document.body.appendChild(temp); temp.select(); document.execCommand('copy'); temp.remove(); }
      if (upiFeedback) { upiFeedback.textContent = 'UPI ID copied: ' + upiId; upiFeedback.className = 'upi-feedback visible'; }
    } catch (_) {
      if (upiFeedback) { upiFeedback.textContent = 'UPI ID: ' + upiId; upiFeedback.className = 'upi-feedback visible'; }
    }
  });

  const form = document.getElementById('utr-form');
  const input = document.getElementById('utr-input');
  const input2 = document.getElementById('utr-input-2');
  const feedback = document.getElementById('utr-feedback');
  if (input && feedback) input.addEventListener('input', () => { input.value = input.value.replace(/\s+/g, '').slice(0,30); feedback.className = 'utr-feedback'; feedback.textContent = ''; });
  if (input2 && feedback) input2.addEventListener('input', () => { input2.value = input2.value.replace(/\s+/g, '').slice(0,30); feedback.className = 'utr-feedback'; feedback.textContent = ''; });
  if (form && input && feedback) form.addEventListener('submit', async e => {
    e.preventDefault(); const utr = input.value.trim();
    const utr2 = input2 ? input2.value.trim() : '';
    if (utr2 && !/^[A-Za-z0-9]{6,30}$/.test(utr2)) { feedback.className = 'utr-feedback visible error'; feedback.textContent = 'Second UTR must be 6–30 letters or numbers.'; input2.focus(); return; }
    if (utr2 && utr2.toLowerCase() === utr.toLowerCase()) { feedback.className = 'utr-feedback visible error'; feedback.textContent = 'The two UTRs must be different.'; input2.focus(); return; }
    if (!/^[A-Za-z0-9]{6,30}$/.test(utr)) { feedback.className = 'utr-feedback visible error'; feedback.textContent = 'Enter a valid transaction ID (6–30 letters or numbers).'; input.focus(); return; }
    const selected = document.querySelector('.plan-option.selected') || document.querySelector('.plan-option');
    const plan = selected?.dataset.plan || 'Gold';
    const amount = Number(selected?.dataset.price || 1969);
    const button = form.querySelector('button[type="submit"],button:not([type])');
    if (button) { button.disabled = true; button.setAttribute('aria-busy', 'true'); }
    feedback.className = 'utr-feedback visible'; feedback.textContent = 'Submitting payment request securely…';
    try {
      // Firebase Anonymous Auth REST API; no Firebase SDK or remote executable code is loaded.
      const apiKey = 'AIzaSyDw8o3k3khdvC-v6LcRJBePidhM4heEMKI';
      const projectId = 'alphax-admin123';
      const authResponse = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + apiKey, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({returnSecureToken:true})
      });
      const authData = await authResponse.json();
      if (!authResponse.ok || !authData.idToken || !authData.localId) throw new Error(authData.error?.message || 'Anonymous sign-in failed. Check Firebase Authentication settings.');
      const paymentId = 'pay_' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : (Date.now().toString(36) + Math.random().toString(36).slice(2))).slice(0, 28);
      const now = new Date().toISOString();
      const fields = { ownerUid:{stringValue:authData.localId}, utr:{stringValue:utr}, ...(utr2 ? {utr2:{stringValue:utr2}} : {}), plan:{stringValue:plan}, amount:{integerValue:String(amount)}, platform:{stringValue:'ALPHAX'}, status:{stringValue:'Pending'}, createdAt:{stringValue:now}, updatedAt:{stringValue:now} };
      const saveResponse = await fetch('https://firestore.googleapis.com/v1/projects/' + projectId + '/databases/(default)/documents/payments?documentId=' + encodeURIComponent(paymentId), {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer ' + authData.idToken}, body:JSON.stringify({fields})
      });
      const saveData = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saveData.error?.message || 'Could not save request. Check Firestore rules.');
      const submitted = document.getElementById('submitted-utr-value'); if (submitted) submitted.textContent = utr + (utr2 ? ' / ' + utr2 : '');
      feedback.className = 'utr-feedback'; feedback.textContent = '';
      showScreen('screen-processing');
    } catch (error) {
      feedback.className = 'utr-feedback visible error';
      feedback.textContent = 'Request not submitted: ' + (error.message || 'network error') + '. Please retry.';
    } finally { if (button) { button.disabled = false; button.removeAttribute('aria-busy'); } }
  });

  // Live Wins demo: simulated count/feed. Values are generated locally and are not real platform data.
  const liveDemoButton = document.getElementById('live-playing-demo-btn');
  if (liveDemoButton) liveDemoButton.addEventListener('click', () => showScreen('screen-live-demo'));
  const demoCount = document.getElementById('live-demo-online-count');
  const demoWinners = document.getElementById('live-demo-winners');
  let demoCounterTimer = null;
  let demoWinnerTimer = null;
  const demoUidPrefixes = ['22', '44', '78', '64', '67', '28', '12', '41', '54', '55', '98', '37'];
  const randomDemoUid = () => {
    const prefix = demoUidPrefixes[Math.floor(Math.random() * demoUidPrefixes.length)];
    const length = Math.random() < 0.5 ? 6 : 7;
    const remainingDigits = length - prefix.length;
    return 'UID ' + prefix + String(Math.floor(Math.random() * (10 ** remainingDigits))).padStart(remainingDigits, '0');
  };
  const demoPlatforms = [
    { name: 'OK.Win', logo: 'okwin.png' }, { name: '82 Lottery', logo: '82lottery.png' },
    { name: '55Club', logo: '55club.png' }, { name: 'Sikkim', logo: 'sikkim.png' },
    { name: 'Jalwa', logo: 'jalwa.png' }, { name: 'ShreeWin', logo: 'shreewin.png' },
    { name: 'VeerGame', logo: 'veergame.png' }, { name: 'JaiClub', logo: 'jaiclub.png' }
  ];
  const demoGames = ['WinGo 30s Win Just Now', 'WinGo 1Min Win Just Now', 'WinGo 5Min Win Just Now'];
  const updateDemoCount = () => {
    if (!demoCount) return;
    const current = Number(demoCount.textContent.replace(/,/g, '')) || 3824;
    let next = current + Math.floor(Math.random() * 81) - 40;
    if (next < 3000 || next > 5000) next = 3000 + Math.floor(Math.random() * 2001);
    demoCount.textContent = next.toLocaleString('en-IN');
    demoCount.classList.remove('demo-count-pop');
    void demoCount.offsetWidth;
    demoCount.classList.add('demo-count-pop');
  };
  const randomDemoAmount = () => {
    // Simulated demo amounts: 70% in ₹1,744–₹10,660 and 30% in ₹10,660–₹44,260.
    const min = 1744;
    const max = Math.random() < 0.70 ? 10660 : 44260;
    return min + Math.random() * (max - min);
  };
  const addDemoWinner = () => {
    if (!demoWinners) return;
    const name = randomDemoUid();
    const game = demoGames[Math.floor(Math.random() * demoGames.length)];
    const amount = randomDemoAmount();
    const digit = Math.floor(Math.random() * 10);
    const row = document.createElement('div');
    row.className = 'live-demo-winner-row live-demo-winner-new';
    // Show a Wingo 0-9 number ball instead of a third-party platform logo.
    const logo = document.createElement('img'); logo.className = 'live-demo-trophy live-demo-number-symbol'; logo.alt = 'Wingo number ' + digit; logo.src = digit + '.png'; logo.onerror = () => { logo.onerror = null; logo.style.visibility = 'hidden'; };
    const user = document.createElement('span'); user.className = 'live-demo-winner-user';
    const username = document.createElement('b'); username.textContent = name;
    const time = document.createElement('small'); time.textContent = game;
    user.append(username, time);
    const prize = document.createElement('strong'); prize.textContent = '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    row.append(logo, user, prize);
    demoWinners.prepend(row);
    while (demoWinners.children.length > 8) demoWinners.lastElementChild.remove();
    window.setTimeout(() => row.classList.remove('live-demo-winner-new'), 700);
  };
  const startDemoFeed = () => {
    if (demoCounterTimer === null) demoCounterTimer = window.setInterval(updateDemoCount, 1000);
    if (demoWinnerTimer === null) {
      const scheduleWinner = () => {
        addDemoWinner();
        demoWinnerTimer = window.setTimeout(scheduleWinner, 1000 + Math.floor(Math.random() * 1001));
      };
      demoWinnerTimer = window.setTimeout(scheduleWinner, 1200);
    }
  };
  startDemoFeed();

  // Button tap sound only: short, subtle two-tone tune using Web Audio.
  // No visual, plan, payment, or navigation behavior is changed.
  document.addEventListener('click', event => {
    const button = event.target && event.target.closest ? event.target.closest('button') : null;
    if (!button || !document.contains(button)) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const audio = new AudioContextClass();
      const now = audio.currentTime;
      const playTone = (frequency, start, duration) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now + start);
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.exponentialRampToValueAtTime(0.12, now + start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(now + start);
        oscillator.stop(now + start + duration + 0.01);
      };
      playTone(880, 0, 0.075);
      playTone(1174.66, 0.065, 0.095);
      window.setTimeout(() => { try { audio.close(); } catch (_) {} }, 350);
    } catch (_) {}
  }, true);

});

// Moving Stars & 25% Today Discount Controller (2s Duration)
function triggerFestivalOffer() {
  const layer = document.getElementById('festival-blast-layer');
  const canvas = document.getElementById('festival-stars-canvas');
  if (!layer || !canvas) return;

  const ctx = canvas.getContext('2d');
  const W = layer.clientWidth || 320;
  const H = layer.clientHeight || 390;
  canvas.width = W;
  canvas.height = H;

  function drawStar(cx, cy, spikes, outerRadius, innerRadius, color, alpha) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const starColors = [
    '#a855f7', '#7c3aed', // Purple
    '#00d4ff', '#3b82f6', // Electric Blue
    '#ff2a85', '#ec4899', // Hot Pink
    '#ffffff', '#f8fafc'  // Crystal White
  ];

  const stars = [];
  for (let i = 0; i < 30; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 1.8,
      vy: (Math.random() - 0.5) * 1.8,
      size: Math.random() * 4.5 + 2.5,
      color: starColors[Math.floor(Math.random() * starColors.length)],
      alpha: Math.random() * 0.7 + 0.3,
      pulseSpeed: Math.random() * 0.05 + 0.02
    });
  }

  let animating = true;
  function renderStars() {
    if (!animating) return;
    ctx.clearRect(0, 0, W, H);

    stars.forEach(s => {
      s.x += s.vx;
      s.y += s.vy;

      if (s.x < 10 || s.x > W - 10) s.vx *= -1;
      if (s.y < 10 || s.y > H - 10) s.vy *= -1;

      s.alpha += Math.sin(Date.now() * s.pulseSpeed) * 0.02;

      drawStar(s.x, s.y, 4, s.size, s.size * 0.35, s.color, Math.min(1, Math.max(0.2, s.alpha)));
    });

    requestAnimationFrame(renderStars);
  }
  renderStars();

  // Theek 2 second baad fade out hoke hide hoga
  setTimeout(() => {
    layer.style.opacity = '0';
    setTimeout(() => {
      animating = false;
      layer.style.display = 'none';
    }, 400);
  }, 2000);
}

// Splash screen ke baad Home screen par trigger karein
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(triggerFestivalOffer, 1500);
});