(() => {
  'use strict';

  const MM = {
    boardW: 490,
    boardH: 120,
    left: 50,
    right: 50,
    top: 14,
    bottom: 5
  };

  const SAFE = {
    x: MM.left,
    y: MM.top,
    width: MM.boardW - MM.left - MM.right,
    height: MM.boardH - MM.top - MM.bottom
  };

  const PRICES = {
    standard: 8500,
    rgb: 11150
  };

  const LED_COLORS = [
    { id: 'blue', label: 'Kék', value: '#2f55ff', css: '#2f55ff', price: PRICES.standard },
    { id: 'green', label: 'Zöld', value: '#14cf79', css: '#14cf79', price: PRICES.standard },
    { id: 'red', label: 'Piros', value: '#ff3038', css: '#ff3038', price: PRICES.standard },
    { id: 'white', label: 'Fehér', value: '#ffffff', css: '#ffffff', price: PRICES.standard },
    { id: 'rgb', label: 'RGB', value: 'url(#rgbGradient)', css: 'rgb', price: PRICES.rgb }
  ];

  const FONTS = [
    { id: 'arial-bold', label: 'Arial félkövér', family: 'Arial, Helvetica, sans-serif', weight: 700, placeholder: false },
    { id: 'arial-black', label: 'Arial Black BT', family: 'Arial Black, Arial, sans-serif', weight: 900, placeholder: false },
    { id: 'bevasarlas-bt', label: 'Bevásárlás BT', family: 'Georgia, Times New Roman, serif', weight: 700, placeholder: true },
    { id: 'bunshif-bt', label: 'Bunshif Konzolt BT', family: 'Trebuchet MS, Arial, sans-serif', weight: 800, placeholder: true }
  ];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const els = {
    textInput: $('#textInput'),
    fontSelect: $('#fontSelect'),
    engravingControl: $('#engravingControl'),
    colorGrid: $('#colorGrid'),
    selectedColorLabel: $('#selectedColorLabel'),
    selectedPrice: $('#selectedPrice'),
    headerPrice: $('#headerPrice'),
    sizeRange: $('#sizeRange'),
    xRange: $('#xRange'),
    yRange: $('#yRange'),
    sizeOutput: $('#sizeOutput'),
    xOutput: $('#xOutput'),
    yOutput: $('#yOutput'),
    fitButton: $('#fitButton'),
    centerButton: $('#centerButton'),
    safeZoneToggle: $('#safeZoneToggle'),
    safeZone: $('#safeZone'),
    previewText: $('#previewText'),
    designSvg: $('#designSvg'),
    footerText: $('#footerText'),
    footerEngraving: $('#footerEngraving'),
    footerColor: $('#footerColor'),
    footerPrice: $('#footerPrice'),
    designId: $('#designId'),
    downloadZip: $('#downloadZip'),
    resetButton: $('#resetButton'),
    status: $('#status')
  };

  const params = new URLSearchParams(location.search);
  const returnUrl = params.get('return') || 'https://falmatrica-lakasdekor.hu/Tervezd-meg-sajatodat';
  const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/tervezo@falmatrica-lakasdekor.hu';

  let sendInProgress = false;

  const state = {
    text: params.get('nev') || 'PETI',
    fontId: params.get('font') || 'arial-bold',
    engraving: params.get('grav') === 'fill' ? 'fill' : 'outline',
    led: LED_COLORS.some(c => c.id === params.get('led')) ? params.get('led') : 'blue',
    fontSize: clamp(Number(params.get('meret') || 68), 34, 92),
    xPct: clamp(Number(params.get('x') || 50), 0, 100),
    yPct: clamp(Number(params.get('y') || 50), 0, 100),
    showSafe: true,
    id: makeDesignId()
  };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
  }

  function makeDesignId() {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `KL-${yy}${mm}${dd}-${rand}`;
  }

  function formatHuf(value) {
    return new Intl.NumberFormat('hu-HU').format(Math.round(value)) + ' Ft';
  }

  function selectedFont() {
    return FONTS.find(f => f.id === state.fontId) || FONTS[0];
  }

  function selectedLed() {
    return LED_COLORS.find(c => c.id === state.led) || LED_COLORS[0];
  }

  function safeText(value) {
    return String(value || '').replace(/[<>]/g, '').trim().slice(0, 24);
  }

  function setupControls() {
    els.fontSelect.innerHTML = FONTS.map(f =>
      `<option value="${f.id}">${f.label}${f.placeholder ? ' (helyettesítő)' : ''}</option>`
    ).join('');
    els.fontSelect.value = state.fontId;

    els.colorGrid.innerHTML = LED_COLORS.map(c =>
      `<button type="button" class="color-choice" data-color="${c.id}" style="--swatch:${c.css}" aria-label="${c.label}" role="radio"><span>${c.label}</span></button>`
    ).join('');

    els.textInput.value = state.text;
    els.sizeRange.value = state.fontSize;
    els.xRange.value = state.xPct;
    els.yRange.value = state.yPct;
    els.designId.textContent = state.id;

    $$('[data-section-toggle]').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.card')?.classList.toggle('open'));
    });

    els.textInput.addEventListener('input', () => {
      state.text = safeText(els.textInput.value) || 'PETI';
      render();
      autoFit(false);
    });

    els.fontSelect.addEventListener('change', () => {
      state.fontId = els.fontSelect.value;
      render();
      autoFit(false);
    });

    els.engravingControl.addEventListener('click', (e) => {
      const button = e.target.closest('[data-engraving]');
      if (!button) return;
      state.engraving = button.dataset.engraving;
      render();
    });

    els.colorGrid.addEventListener('click', (e) => {
      const button = e.target.closest('[data-color]');
      if (!button) return;
      state.led = button.dataset.color;
      render();
    });

    els.sizeRange.addEventListener('input', () => {
      state.fontSize = Number(els.sizeRange.value);
      render();
      keepInsideSafeZone();
    });

    els.xRange.addEventListener('input', () => {
      state.xPct = Number(els.xRange.value);
      render();
      keepInsideSafeZone();
    });

    els.yRange.addEventListener('input', () => {
      state.yPct = Number(els.yRange.value);
      render();
      keepInsideSafeZone();
    });

    els.safeZoneToggle.addEventListener('change', () => {
      state.showSafe = els.safeZoneToggle.checked;
      render();
    });

    els.fitButton.addEventListener('click', () => autoFit(true));
    els.centerButton.addEventListener('click', () => {
      state.xPct = 50;
      state.yPct = 50;
      render();
    });
    els.resetButton.addEventListener('click', reset);
    els.downloadZip.addEventListener('click', openSendModal);
  }

  function textPosition() {
    const x = SAFE.x + SAFE.width * (state.xPct / 100);
    // yPct=0 => top; yPct=100 => bottom. Baseline is adjusted by an estimated text height.
    const textH = state.fontSize * 0.78;
    const topY = SAFE.y + textH;
    const bottomY = SAFE.y + SAFE.height;
    const y = topY + (bottomY - topY) * (state.yPct / 100);
    return { x, y };
  }

  function render() {
    const font = selectedFont();
    const led = selectedLed();
    const pos = textPosition();

    els.previewText.textContent = state.text || 'PETI';
    els.previewText.setAttribute('x', pos.x.toFixed(2));
    els.previewText.setAttribute('y', pos.y.toFixed(2));
    els.previewText.style.fontFamily = font.family;
    els.previewText.style.fontWeight = String(font.weight);
    els.previewText.style.fontSize = `${state.fontSize}px`;

    const strokeValue = state.led === 'rgb' ? 'url(#rgbGradient)' : led.value;
    if (state.engraving === 'outline') {
      els.previewText.setAttribute('fill', 'transparent');
      els.previewText.setAttribute('stroke', strokeValue);
      els.previewText.setAttribute('stroke-width', Math.max(1.2, state.fontSize * 0.035).toFixed(2));
      els.previewText.setAttribute('stroke-linejoin', 'round');
    } else {
      els.previewText.setAttribute('fill', strokeValue);
      els.previewText.setAttribute('stroke', strokeValue);
      els.previewText.setAttribute('stroke-width', '0.6');
    }

    els.safeZone.style.display = state.showSafe ? '' : 'none';
    els.sizeOutput.value = `${Math.round(state.fontSize)} mm`;
    els.xOutput.value = `${Math.round(state.xPct)}%`;
    els.yOutput.value = `${Math.round(state.yPct)}%`;
    els.sizeRange.value = state.fontSize;
    els.xRange.value = state.xPct;
    els.yRange.value = state.yPct;

    $$('#engravingControl [data-engraving]').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.engraving === state.engraving)
    );
    $$('#colorGrid [data-color]').forEach(btn => {
      const active = btn.dataset.color === state.led;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-checked', active ? 'true' : 'false');
    });

    els.selectedColorLabel.textContent = led.label;
    els.selectedPrice.textContent = formatHuf(led.price);
    els.headerPrice.textContent = formatHuf(led.price);
    els.footerText.textContent = state.text || 'PETI';
    els.footerEngraving.textContent = state.engraving === 'outline' ? 'Kontúr' : 'Telibe';
    els.footerColor.textContent = led.label;
    els.footerPrice.textContent = formatHuf(led.price);

    const placeholder = font.placeholder;
    setStatus(
      placeholder
        ? `A „${font.label}” jelenleg helyettesítő betűtípussal látható. A végleges fontfájl később külön behelyezhető.`
        : 'A terv a megadott gyártási biztonsági zónán belül tartható.',
      placeholder ? 'warn' : ''
    );
  }

  function bbox() {
    try {
      return els.previewText.getBBox();
    } catch {
      return null;
    }
  }

  function autoFit(showMessage = true) {
    let attempts = 0;
    const maxAttempts = 80;
    const maxSize = 92;

    // First try to use the largest readable size, then shrink until it fits.
    state.fontSize = Math.min(maxSize, Math.max(34, state.fontSize));
    state.xPct = 50;
    state.yPct = 50;
    render();

    requestAnimationFrame(() => {
      while (attempts++ < maxAttempts) {
        const box = bbox();
        if (!box) break;
        const fits = box.width <= SAFE.width - 4 && box.height <= SAFE.height - 4;
        if (fits) break;
        state.fontSize = Math.max(34, state.fontSize - 1);
        els.previewText.style.fontSize = `${state.fontSize}px`;
      }
      render();
      keepInsideSafeZone();
      if (showMessage) setStatus('A felirat automatikusan a gyártási biztonsági zónába lett illesztve.', 'good');
    });
  }

  function keepInsideSafeZone() {
    requestAnimationFrame(() => {
      const box = bbox();
      if (!box) return;

      // If too large, shrink first.
      if (box.width > SAFE.width - 2 || box.height > SAFE.height - 2) {
        autoFit(false);
        return;
      }

      let dx = 0;
      let dy = 0;
      if (box.x < SAFE.x) dx = SAFE.x - box.x;
      if (box.x + box.width > SAFE.x + SAFE.width) dx = (SAFE.x + SAFE.width) - (box.x + box.width);
      if (box.y < SAFE.y) dy = SAFE.y - box.y;
      if (box.y + box.height > SAFE.y + SAFE.height) dy = (SAFE.y + SAFE.height) - (box.y + box.height);

      if (Math.abs(dx) > 0.1) state.xPct = clamp(state.xPct + (dx / SAFE.width) * 100, 0, 100);
      if (Math.abs(dy) > 0.1) state.yPct = clamp(state.yPct + (dy / SAFE.height) * 100, 0, 100);
      if (dx || dy) render();
    });
  }

  function reset() {
    Object.assign(state, {
      text: 'PETI',
      fontId: 'arial-bold',
      engraving: 'outline',
      led: 'blue',
      fontSize: 68,
      xPct: 50,
      yPct: 50,
      showSafe: true
    });
    els.textInput.value = state.text;
    els.fontSelect.value = state.fontId;
    els.safeZoneToggle.checked = true;
    render();
    autoFit(false);
    setStatus('Alaphelyzet visszaállítva.', 'good');
  }

  function setStatus(message, type = '') {
    els.status.textContent = message;
    els.status.className = 'status' + (type ? ` ${type}` : '');
  }

  function serializeProductionSvg() {
    const font = selectedFont();
    const led = selectedLed();
    const pos = textPosition();
    const text = escapeXml(state.text || 'PETI');
    const color = state.led === 'rgb' ? '#000000' : '#000000';
    const modeAttrs = state.engraving === 'outline'
      ? `fill="none" stroke="${color}" stroke-width="${Math.max(1.2, state.fontSize * 0.035).toFixed(2)}" stroke-linejoin="round"`
      : `fill="${color}" stroke="none"`;

    return `<?xml version="1.0" encoding="UTF-8"?>\n` +
`<svg xmlns="http://www.w3.org/2000/svg" width="490mm" height="120mm" viewBox="0 0 490 120">\n` +
`  <!-- Lakás Dekor – Kamionos LED tábla -->\n` +
`  <!-- Tervazonosító: ${state.id} -->\n` +
`  <!-- Biztonsági terület: x=50..440 mm, y=14..115 mm -->\n` +
`  <!-- FONT FIGYELEM: a <text> elemet gyártás előtt görbévé kell alakítani, ha a gravírozó szoftver nem rendelkezik ezzel a betűtípussal. -->\n` +
`  <rect x="0" y="0" width="490" height="120" fill="none" stroke="#000" stroke-width="0.2"/>\n` +
`  <text x="${pos.x.toFixed(2)}" y="${pos.y.toFixed(2)}" text-anchor="middle" ` +
`font-family="${escapeXml(font.family.split(',')[0].replace(/[\"']/g,''))}" font-size="${state.fontSize}" font-weight="${font.weight}" ${modeAttrs}>${text}</text>\n` +
`</svg>\n`;
  }

  function escapeXml(value) {
    return String(value).replace(/[<>&\"']/g, c => ({
      '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
    }[c]));
  }

  function orderJson() {
    const font = selectedFont();
    const led = selectedLed();
    return JSON.stringify({
      version: '1.0.0',
      designId: state.id,
      product: 'Kamionos LED tábla',
      boardMm: { width: 490, height: 120 },
      safeMarginsMm: { left: 50, right: 50, top: 14, bottom: 5 },
      text: state.text,
      font: { id: font.id, label: font.label, browserFallback: font.family, placeholder: font.placeholder },
      engraving: state.engraving === 'outline' ? 'Kontúr gravírozás' : 'Telibe gravírozott',
      ledColor: led.label,
      ledColorId: led.id,
      priceHuf: led.price,
      layout: { fontSizeMm: state.fontSize, xPercent: state.xPct, yPercent: state.yPct },
      createdAt: new Date().toISOString()
    }, null, 2);
  }

  async function svgToPngBlob() {
    const clone = els.designSvg.cloneNode(true);
    const safe = clone.querySelector('#safeZone');
    if (safe) safe.remove();
    clone.setAttribute('width', '1470');
    clone.setAttribute('height', '360');

    // Add all computed style essentials inline for export.
    const sourceText = clone.querySelector('#previewText');
    const font = selectedFont();
    const led = selectedLed();
    if (sourceText) {
      sourceText.style.fontFamily = font.family;
      sourceText.style.fontWeight = String(font.weight);
      sourceText.style.fontSize = `${state.fontSize}px`;
      const paint = state.led === 'rgb' ? 'url(#rgbGradient)' : led.value;
      if (state.engraving === 'outline') {
        sourceText.setAttribute('fill', 'transparent');
        sourceText.setAttribute('stroke', paint);
        sourceText.setAttribute('stroke-width', Math.max(1.2, state.fontSize * 0.035).toFixed(2));
      } else {
        sourceText.setAttribute('fill', paint);
        sourceText.setAttribute('stroke', paint);
        sourceText.setAttribute('stroke-width', '0.6');
      }
    }

    const xml = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    try {
      const image = await loadImage(url);
      const canvas = document.createElement('canvas');
      canvas.width = 1470;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }


  function setSendProgress(title, text, designId) {
    const titleEl = $('#sendModalTitle');
    const intro = document.querySelector('#sendFormView .send-modal-intro');
    const idEl = $('#designIdPreview');
    if (titleEl) titleEl.textContent = title;
    if (intro) intro.textContent = text;
    if (idEl && designId) idEl.textContent = designId;
  }

  function openSendModal() {
    if (sendInProgress) return;
    const modal = $('#sendModal');
    if (!modal) {
      setStatus('A mentési ablak nem található. Frissítsd az oldalt, majd próbáld újra.', 'warn');
      return;
    }
    const err = $('#sendError');
    if (err) err.textContent = '';
    $('#sendFormView').hidden = false;
    $('#sendSuccessView').hidden = true;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    setSendProgress('Terv mentése folyamatban…', 'A ZIP-fájl és az előnézeti kép elküldése folyamatban van.', state.id);
    sendDesign(state.id);
  }

  function closeSendModal() {
    if (sendInProgress) return;
    const modal = $('#sendModal');
    if (modal) modal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  function fetchWithTimeout(url, options, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  async function buildProjectZip() {
    if (!window.JSZip) throw new Error('A ZIP-kezelő nem töltődött be.');
    const zip = new JSZip();
    const base = state.id;

    zip.file(`${base}.svg`, serializeProductionSvg());
    zip.file(`${base}.json`, orderJson());
    zip.file('GYARTASI-MEGJEGYZES.txt',
`Kamionos LED tábla – ${state.id}\n\n` +
`Méret: 490 × 120 mm\n` +
`Biztonsági margók: bal 50 mm, jobb 50 mm, felül 14 mm, alul 5 mm\n` +
`Felirat: ${state.text}\n` +
`Betűtípus: ${selectedFont().label}\n` +
`Gravírozás: ${state.engraving === 'outline' ? 'Kontúr gravírozás' : 'Telibe gravírozott'}\n` +
`LED szín: ${selectedLed().label}\n` +
`Ár: ${formatHuf(selectedLed().price)}\n\n` +
`FONTOS: Az SVG szöveges elemet tartalmaz. Ha a gravírozó szoftver nem rendelkezik a kiválasztott betűtípussal, gyártás előtt alakítsd görbévé/path-tá.\n`);

    let previewBlob = null;
    try {
      previewBlob = await svgToPngBlob();
      if (previewBlob) zip.file(`${base}-elozet.png`, previewBlob);
    } catch (err) {
      console.warn('PNG export kihagyva:', err);
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    return { zipBlob, previewBlob };
  }

  async function sendDesign(designId) {
    if (sendInProgress) return;
    sendInProgress = true;
    els.downloadZip.disabled = true;
    const err = $('#sendError');
    if (err) err.textContent = '';
    setStatus('A gyártási terv mentése és küldése folyamatban…');

    try {
      const { zipBlob, previewBlob } = await buildProjectZip();
      const totalSize = zipBlob.size + (previewBlob?.size || 0);
      if (totalSize > 7_000_000) {
        throw new Error('A terv fájlmérete túl nagy az automatikus küldéshez.');
      }

      const fd = new FormData();
      fd.append('_subject', `Új Lakás Dekor kamionos LED tábla terv – ${designId}`);
      fd.append('_template', 'table');
      fd.append('_captcha', 'false');
      fd.append('_url', location.href);
      fd.append('tervazonosito', designId);
      fd.append('felirat', state.text || '—');
      fd.append('betutipus', selectedFont().label);
      fd.append('gravirozas', state.engraving === 'outline' ? 'Kontúr gravírozás' : 'Telibe gravírozott');
      fd.append('led_szin', selectedLed().label);
      fd.append('meret', '49 × 12 cm');
      fd.append('ar', formatHuf(selectedLed().price));
      fd.append('terv_adatok', orderJson());
      fd.append('terv_zip', new File([zipBlob], `${designId}-kamionos-led-tabla.zip`, { type: 'application/zip' }));
      if (previewBlob) {
        fd.append('terv_kep', new File([previewBlob], `${designId}-elozet.png`, { type: 'image/png' }));
      }

      await fetchWithTimeout(FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        body: fd,
        mode: 'no-cors',
        credentials: 'omit',
        cache: 'no-store'
      });

      $('#successDesignId').textContent = designId;
      $('#sendModal').dataset.sentDesignId = designId;
      $('#sendFormView').hidden = true;
      $('#sendSuccessView').hidden = false;
      setStatus(`Terv sikeresen elmentve: ${designId}`, 'good');
    } catch (error) {
      console.error(error);
      setSendProgress(
        'A terv mentése nem sikerült',
        'Ellenőrizd az internetkapcsolatot, majd próbáld újra.',
        designId
      );
      if (err) {
        err.textContent = error?.name === 'AbortError'
          ? 'A küldés túl sokáig tartott. Kérlek, próbáld újra.'
          : (error?.message || 'A terv küldése nem sikerült.');
      }
      setStatus('A küldés nem sikerült. A terv nem veszett el.', 'warn');
    } finally {
      sendInProgress = false;
      els.downloadZip.disabled = false;
    }
  }

  async function downloadProjectZip() {
    if (!window.JSZip) {
      setStatus('A ZIP könyvtár nem töltődött be. Ellenőrizd az internetkapcsolatot, majd próbáld újra.', 'warn');
      return;
    }

    els.downloadZip.disabled = true;
    els.downloadZip.textContent = 'ZIP készítése…';
    setStatus('A gyártási fájlok készítése folyamatban…');

    try {
      const zip = new JSZip();
      const base = state.id;
      zip.file(`${base}.svg`, serializeProductionSvg());
      zip.file(`${base}.json`, orderJson());
      zip.file('GYARTASI-MEGJEGYZES.txt',
`Kamionos LED tábla – ${state.id}\n\n` +
`Méret: 490 × 120 mm\n` +
`Biztonsági margók: bal 50 mm, jobb 50 mm, felül 14 mm, alul 5 mm\n` +
`Felirat: ${state.text}\n` +
`Betűtípus: ${selectedFont().label}\n` +
`Gravírozás: ${state.engraving === 'outline' ? 'Kontúr' : 'Telibe'}\n` +
`LED szín: ${selectedLed().label}\n` +
`Ár: ${formatHuf(selectedLed().price)}\n\n` +
`FONTOS: Az SVG jelenleg SVG <text> elemet tartalmaz. Ha a gyártó/gravírozó szoftver nem rendelkezik a kiválasztott betűtípussal, a szöveget gyártás előtt görbévé/path-tá kell alakítani.\n`);

      try {
        const png = await svgToPngBlob();
        if (png) zip.file(`${base}-elozet.png`, png);
      } catch (err) {
        console.warn('PNG export kihagyva:', err);
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      downloadBlob(blob, `${base}-kamionos-led-tabla.zip`);
      setStatus('A teljes terv ZIP-ben elkészült és letöltődött.', 'good');
    } catch (error) {
      console.error(error);
      setStatus('A ZIP készítése közben hiba történt. Nyisd meg a böngésző konzolt a részletekhez.', 'warn');
    } finally {
      els.downloadZip.disabled = false;
      els.downloadZip.textContent = 'Teljes terv letöltése ZIP-ben';
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  document.querySelectorAll('[data-close-send]').forEach(el => el.addEventListener('click', closeSendModal));
  document.addEventListener('keydown', e => {
    const modal = $('#sendModal');
    if (e.key === 'Escape' && modal && !modal.hidden && !sendInProgress) closeSendModal();
  });
  $('#returnToShop')?.addEventListener('click', returnToShop);

  function returnToShop() {
    if (!returnUrl) return;
    const url = new URL(returnUrl, location.href);
    url.searchParams.set('kamionterv', state.id);
    url.searchParams.set('kamionnev', state.text);
    url.searchParams.set('kamionfont', state.fontId);
    url.searchParams.set('kamiongrav', state.engraving);
    url.searchParams.set('kamionled', state.led);
    url.searchParams.set('kamionar', String(selectedLed().price));
    location.href = url.toString();
  }

  setupControls();
  render();
  setTimeout(() => autoFit(false), 80);
})();
