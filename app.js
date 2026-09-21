(() => {
  'use strict';

  const MM = { boardW: 490, boardH: 120, left: 50, right: 50, top: 14, bottom: 5 };
  const SAFE = {
    x: MM.left,
    y: MM.top,
    width: MM.boardW - MM.left - MM.right,
    height: MM.boardH - MM.top - MM.bottom
  };

  const PRICES = { standard: 8500, rgb: 11150 };
  const FORMSUBMIT_ENDPOINT = 'https://formsubmit.co/tervezo@falmatrica-lakasdekor.hu';
  const params = new URLSearchParams(location.search);
  const returnUrl = params.get('return') || 'https://falmatrica-lakasdekor.hu/Tervezd-meg-sajatodat';
  const EDIT_DESIGN_ID = String(params.get('edit') || '').trim();
  const DESIGN_STORAGE_PREFIX = 'lakasdekor_truck_led_design_v2_';
  const DESIGN_STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

  let snapshotTimer = null;
  let missingEditDesign = false;

  const LED_COLORS = [
    { id: 'blue', label: 'Kék', value: '#2f55ff', css: '#2f55ff', price: PRICES.standard },
    { id: 'green', label: 'Zöld', value: '#14cf79', css: '#14cf79', price: PRICES.standard },
    { id: 'red', label: 'Piros', value: '#ff3038', css: '#ff3038', price: PRICES.standard },
    { id: 'white', label: 'Fehér', value: '#ffffff', css: '#ffffff', price: PRICES.standard },
    { id: 'rgb', label: 'RGB', value: 'url(#rgbGradient)', css: 'rgb', price: PRICES.rgb }
  ];

  const RAW_FONT_BASE = 'https://raw.githubusercontent.com/Doma10999/Lakasdekor-egyedi-fejleszt-s/main/Bet%C5%B1t%C3%ADpus/';
  const FONTS = [
    { id: 'arial-bold', label: 'Arial félkövér', family: 'Arial, Helvetica, sans-serif', weight: 700, url: RAW_FONT_BASE + 'arial_felkover.otf' },
    { id: 'arial-black', label: 'Arial Black BT', family: 'Arial Black, Arial, sans-serif', weight: 900, url: RAW_FONT_BASE + 'arial_black.otf' },
    { id: 'bevasarlas-bt', label: 'Bevásárlás BT', family: 'Georgia, Times New Roman, serif', weight: 700, url: null, placeholder: true },
    { id: 'bunshif-bt', label: 'Bunshif Konzolt BT', family: 'Trebuchet MS, Arial, sans-serif', weight: 800, url: null, placeholder: true }
  ];

  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const fontCache = new Map();

  const els = {
    textInput: $('#textInput'),
    fontSelect: $('#fontSelect'),
    engravingControl: $('#engravingControl'),
    colorGrid: $('#colorGrid'),
    selectedColorLabel: $('#selectedColorLabel'),
    selectedPrice: $('#selectedPrice'),
    sizeRange: $('#sizeRange'),
    xRange: $('#xRange'),
    yRange: $('#yRange'),
    sizeOutput: $('#sizeOutput'),
    xOutput: $('#xOutput'),
    yOutput: $('#yOutput'),
    fitButton: $('#fitButton'),
    centerButton: $('#centerButton'),
    centerPreviewButton: $('#centerPreviewButton'),
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
    status: $('#status'),
    loading: $('#loading')
  };

  let sendInProgress = false;
  let directEditInteraction = null;
  let previewSelectionVisible = true;

  const state = {
    text: cleanText(params.get('nev')) || 'PETI',
    fontId: FONTS.some(f => f.id === params.get('font')) ? params.get('font') : 'arial-bold',
    engraving: params.get('grav') === 'fill' ? 'fill' : 'outline',
    led: LED_COLORS.some(c => c.id === params.get('led')) ? params.get('led') : 'blue',
    fontSize: clamp(Number(params.get('meret') || 68), 34, 92),
    xPct: clamp(Number(params.get('x') || 50), 0, 100),
    yPct: clamp(Number(params.get('y') || 50), 0, 100),
    showSafe: true,
    id: EDIT_DESIGN_ID || makeDesignId()
  };

  function clamp(n, min, max) {
    const v = Number(n);
    return Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
  }

  function cleanText(value) {
    return String(value || '').replace(/[<>]/g, '').trim().slice(0, 24);
  }

  function escapeXml(value) {
    return String(value ?? '').replace(/[<>&"']/g, c => ({
      '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'
    }[c]));
  }

  function safeName(value) {
    return String(value || 'terv')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80) || 'terv';
  }

  function makeDesignId() {
    const d = new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return 'KL-' + yy + mm + dd + '-' + [...bytes].map(b => chars[b % chars.length]).join('');
  }

  function designStorageKey(id) {
    return DESIGN_STORAGE_PREFIX + String(id || '');
  }

  function designSnapshot() {
    return {
      version: 2,
      designId: state.id,
      savedAt: Date.now(),
      text: state.text,
      fontId: state.fontId,
      engraving: state.engraving,
      led: state.led,
      fontSize: state.fontSize,
      xPct: state.xPct,
      yPct: state.yPct,
      showSafe: !!state.showSafe
    };
  }

  function saveDesignSnapshotNow() {
    if (!state.id) return false;
    const raw = JSON.stringify(designSnapshot());

    try {
      sessionStorage.setItem(designStorageKey(state.id), raw);
    } catch (_) {}

    try {
      localStorage.setItem(designStorageKey(state.id), raw);
    } catch (_) {}

    return true;
  }

  function queueSnapshotSave() {
    clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(saveDesignSnapshotNow, 180);
  }

  function readStoredSnapshot(designId) {
    if (!designId) return null;

    let raw = '';
    try {
      raw = sessionStorage.getItem(designStorageKey(designId)) || '';
    } catch (_) {}

    if (!raw) {
      try {
        raw = localStorage.getItem(designStorageKey(designId)) || '';
      } catch (_) {}
    }

    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      if (!data || data.designId !== designId) return null;
      if (data.savedAt && Date.now() - Number(data.savedAt) > DESIGN_STORAGE_TTL_MS) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function restoreDesignSnapshot(designId) {
    const snap = readStoredSnapshot(designId);
    if (!snap) return false;

    state.id = designId;
    state.text = cleanText(snap.text) || 'PETI';
    state.fontId = FONTS.some(f => f.id === snap.fontId) ? snap.fontId : 'arial-bold';
    state.engraving = snap.engraving === 'fill' ? 'fill' : 'outline';
    state.led = LED_COLORS.some(c => c.id === snap.led) ? snap.led : 'blue';
    state.fontSize = clamp(snap.fontSize, 34, 92);
    state.xPct = clamp(snap.xPct, 0, 100);
    state.yPct = clamp(snap.yPct, 0, 100);
    state.showSafe = snap.showSafe !== false;
    return true;
  }

  function initializeEditSession() {
    if (!EDIT_DESIGN_ID) {
      saveDesignSnapshotNow();
      return;
    }

    if (restoreDesignSnapshot(EDIT_DESIGN_ID)) {
      return;
    }

    missingEditDesign = true;
    state.id = makeDesignId();
    saveDesignSnapshotNow();
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

  function targetCenter() {
    return {
      x: SAFE.x + SAFE.width * state.xPct / 100,
      y: SAFE.y + SAFE.height * state.yPct / 100
    };
  }

  function previewBaseline() {
    const p = targetCenter();
    return { x: p.x, y: p.y + state.fontSize * 0.28 };
  }

  function setStatus(message, type = '') {
    els.status.textContent = message;
    els.status.className = 'status' + (type ? ' ' + type : '');
  }

  function setupControls() {
    els.fontSelect.innerHTML = FONTS.map(f =>
      '<option value="' + f.id + '">' + f.label + (f.placeholder ? ' (fontfájl szükséges)' : '') + '</option>'
    ).join('');
    els.fontSelect.value = state.fontId;

    els.colorGrid.innerHTML = LED_COLORS.map(c =>
      '<button type="button" class="color-choice" data-color="' + c.id + '" style="--swatch:' + c.css + '" aria-label="' + c.label + '" role="radio"><span>' + c.label + '</span></button>'
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
      state.text = cleanText(els.textInput.value) || 'PETI';
      render();
      autoFit(false);
    });

    els.fontSelect.addEventListener('change', () => {
      state.fontId = els.fontSelect.value;
      render();
      autoFit(false);
    });

    els.engravingControl.addEventListener('click', e => {
      const button = e.target.closest('[data-engraving]');
      if (!button) return;
      state.engraving = button.dataset.engraving;
      render();
    });

    els.colorGrid.addEventListener('click', e => {
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
    els.centerButton.addEventListener('click', centerText);
    els.centerPreviewButton?.addEventListener('click', centerText);
    els.resetButton.addEventListener('click', reset);
    els.downloadZip.addEventListener('click', openSendModal);
  }

  function centerText() {
    state.xPct = 50;
    state.yPct = 50;
    render();
  }

  function render() {
    const font = selectedFont();
    const led = selectedLed();
    const pos = previewBaseline();

    els.previewText.textContent = state.text || 'PETI';
    els.previewText.setAttribute('x', pos.x.toFixed(2));
    els.previewText.setAttribute('y', pos.y.toFixed(2));
    els.previewText.style.fontFamily = font.family;
    els.previewText.style.fontWeight = String(font.weight);
    els.previewText.style.fontSize = state.fontSize + 'px';

    const paint = state.led === 'rgb' ? 'url(#rgbGradient)' : led.value;
    if (state.engraving === 'outline') {
      els.previewText.setAttribute('fill', 'transparent');
      els.previewText.setAttribute('stroke', paint);
      els.previewText.setAttribute('stroke-width', Math.max(1.2, state.fontSize * 0.035).toFixed(2));
      els.previewText.setAttribute('stroke-linejoin', 'round');
    } else {
      els.previewText.setAttribute('fill', paint);
      els.previewText.setAttribute('stroke', paint);
      els.previewText.setAttribute('stroke-width', '0.6');
    }

    els.safeZone.style.display = state.showSafe ? '' : 'none';
    els.sizeOutput.textContent = Math.round(state.fontSize) + ' mm';
    els.xOutput.textContent = Math.round(state.xPct) + '%';
    els.yOutput.textContent = Math.round(state.yPct) + '%';
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
    els.footerText.textContent = state.text || 'PETI';
    els.footerEngraving.textContent = state.engraving === 'outline' ? 'Kontúr' : 'Telibe';
    els.footerColor.textContent = led.label;
    els.footerPrice.textContent = formatHuf(led.price);

    if (font.placeholder) {
      setStatus('A „' + font.label + '” előnézete helyettesítő betűtípussal jelenik meg. A pontos gyártási görbéhez ennek a fontfájljára is szükség lesz.', 'warn');
    } else {
      setStatus('A terv a megadott gyártási biztonsági zónán belül tartható.');
    }

    queueSnapshotSave();
    updateDirectEditOverlay();
  }


  function svgClientPoint(evt) {
    const svg = els.designSvg;
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;

    const point = svg.createSVGPoint();
    point.x = evt.clientX;
    point.y = evt.clientY;

    return point.matrixTransform(matrix.inverse());
  }

  function removeDirectEditOverlay() {
    els.designSvg.querySelector('.truck-selection-ui')?.remove();
  }

  function updateDirectEditOverlay() {
    removeDirectEditOverlay();

    if (!previewSelectionVisible || !cleanText(state.text)) return;

    let box;
    try {
      box = els.previewText.getBBox();
    } catch (_) {
      return;
    }

    if (!box || !Number.isFinite(box.width) || !Number.isFinite(box.height)) return;

    const NS = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(NS, 'g');
    group.setAttribute('class', 'truck-selection-ui');

    const pad = 5;
    const x = box.x - pad;
    const y = box.y - pad;
    const w = box.width + pad * 2;
    const h = box.height + pad * 2;

    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('class', 'truck-selection-box');
    rect.setAttribute('x', x.toFixed(2));
    rect.setAttribute('y', y.toFixed(2));
    rect.setAttribute('width', w.toFixed(2));
    rect.setAttribute('height', h.toFixed(2));
    rect.setAttribute('rx', '2');
    group.appendChild(rect);

    [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h]
    ].forEach(function (coords) {
      const handle = document.createElementNS(NS, 'circle');
      handle.setAttribute('class', 'truck-resize-handle');
      handle.setAttribute('cx', coords[0].toFixed(2));
      handle.setAttribute('cy', coords[1].toFixed(2));
      handle.setAttribute('r', '4.3');

      handle.addEventListener('pointerdown', function (evt) {
        evt.preventDefault();
        evt.stopPropagation();

        const p = svgClientPoint(evt);
        if (!p) return;

        const center = targetCenter();
        const startDistance = Math.max(
          1,
          Math.hypot(
            p.x - center.x,
            p.y - center.y
          )
        );

        directEditInteraction = {
          mode: 'resize',
          pointerId: evt.pointerId,
          startFontSize: state.fontSize,
          startDistance: startDistance
        };

        try {
          els.designSvg.setPointerCapture(evt.pointerId);
        } catch (_) {}
      });

      group.appendChild(handle);
    });

    els.designSvg.appendChild(group);
  }

  function startDirectTextDrag(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    previewSelectionVisible = true;

    const p = svgClientPoint(evt);
    if (!p) return;

    directEditInteraction = {
      mode: 'move',
      pointerId: evt.pointerId,
      startPoint: p,
      startXPct: state.xPct,
      startYPct: state.yPct
    };

    els.previewText.classList.add('dragging');

    try {
      els.designSvg.setPointerCapture(evt.pointerId);
    } catch (_) {}

    updateDirectEditOverlay();
  }

  function moveDirectEdit(evt) {
    if (
      !directEditInteraction ||
      directEditInteraction.pointerId !== evt.pointerId
    ) {
      return;
    }

    evt.preventDefault();

    const p = svgClientPoint(evt);
    if (!p) return;

    if (directEditInteraction.mode === 'move') {
      const dx = p.x - directEditInteraction.startPoint.x;
      const dy = p.y - directEditInteraction.startPoint.y;

      state.xPct = clamp(
        directEditInteraction.startXPct +
          dx / SAFE.width * 100,
        0,
        100
      );

      state.yPct = clamp(
        directEditInteraction.startYPct +
          dy / SAFE.height * 100,
        0,
        100
      );

      render();
      return;
    }

    if (directEditInteraction.mode === 'resize') {
      const center = targetCenter();
      const distance = Math.max(
        1,
        Math.hypot(
          p.x - center.x,
          p.y - center.y
        )
      );

      const ratio =
        distance /
        directEditInteraction.startDistance;

      state.fontSize = clamp(
        directEditInteraction.startFontSize * ratio,
        34,
        92
      );

      render();
    }
  }

  function endDirectEdit(evt) {
    if (!directEditInteraction) return;

    try {
      els.designSvg.releasePointerCapture(evt.pointerId);
    } catch (_) {}

    directEditInteraction = null;
    els.previewText.classList.remove('dragging');

    keepInsideSafeZone();
    queueSnapshotSave();
  }

  function setupDirectEditing() {
    els.previewText.style.pointerEvents = 'auto';

    els.previewText.addEventListener(
      'pointerdown',
      startDirectTextDrag
    );

    els.designSvg.addEventListener(
      'pointermove',
      moveDirectEdit
    );

    els.designSvg.addEventListener(
      'pointerup',
      endDirectEdit
    );

    els.designSvg.addEventListener(
      'pointercancel',
      endDirectEdit
    );

    els.designSvg.addEventListener(
      'pointerdown',
      function (evt) {
        if (
          evt.target === els.designSvg ||
          evt.target.classList.contains('board-bg') ||
          evt.target.classList.contains('board-edge')
        ) {
          previewSelectionVisible = false;
          updateDirectEditOverlay();
        }
      }
    );

    els.previewText.addEventListener(
      'click',
      function () {
        previewSelectionVisible = true;
        updateDirectEditOverlay();
      }
    );
  }

  function bbox() {
    try { return els.previewText.getBBox(); } catch { return null; }
  }

  function autoFit(showMessage = true) {
    state.xPct = 50;
    state.yPct = 50;
    state.fontSize = Math.min(92, Math.max(34, state.fontSize));
    render();

    requestAnimationFrame(() => {
      let attempts = 0;
      while (attempts++ < 80) {
        const box = bbox();
        if (!box) break;
        if (box.width <= SAFE.width - 4 && box.height <= SAFE.height - 4) break;
        state.fontSize = Math.max(34, state.fontSize - 1);
        els.previewText.style.fontSize = state.fontSize + 'px';
      }
      render();
      keepInsideSafeZone();
      if (showMessage) setStatus('A felirat automatikusan a gyártási területre lett illesztve.', 'good');
    });
  }

  function keepInsideSafeZone() {
    requestAnimationFrame(() => {
      const box = bbox();
      if (!box) return;
      if (box.width > SAFE.width - 2 || box.height > SAFE.height - 2) {
        autoFit(false);
        return;
      }

      let dx = 0, dy = 0;
      if (box.x < SAFE.x) dx = SAFE.x - box.x;
      if (box.x + box.width > SAFE.x + SAFE.width) dx = SAFE.x + SAFE.width - (box.x + box.width);
      if (box.y < SAFE.y) dy = SAFE.y - box.y;
      if (box.y + box.height > SAFE.y + SAFE.height) dy = SAFE.y + SAFE.height - (box.y + box.height);

      if (Math.abs(dx) > 0.1) state.xPct = clamp(state.xPct + dx / SAFE.width * 100, 0, 100);
      if (Math.abs(dy) > 0.1) state.yPct = clamp(state.yPct + dy / SAFE.height * 100, 0, 100);
      if (dx || dy) render();
    });
  }

  function reset() {
    Object.assign(state, {
      text:'PETI', fontId:'arial-bold', engraving:'outline', led:'blue',
      fontSize:68, xPct:50, yPct:50, showSafe:true
    });
    els.textInput.value = state.text;
    els.fontSelect.value = state.fontId;
    els.safeZoneToggle.checked = true;
    render();
    autoFit(false);
    setStatus('Alaphelyzet visszaállítva.', 'good');
  }

  function loadFont(def) {
    if (!def.url || !window.opentype) return Promise.resolve(null);
    if (fontCache.has(def.id)) return fontCache.get(def.id);
    const promise = new Promise(resolve => {
      window.opentype.load(def.url, (err, font) => resolve(err ? null : font));
    });
    fontCache.set(def.id, promise);
    return promise;
  }

  async function productionTextMarkup() {
    const fontDef = selectedFont();
    const font = await loadFont(fontDef);
    const text = cleanText(state.text) || 'PETI';
    const center = targetCenter();
    const sw = Math.max(0.8, state.fontSize * 0.025).toFixed(2);
    const paintAttrs = state.engraving === 'outline'
      ? 'fill="none" stroke="#000000" stroke-width="' + sw + '" stroke-linejoin="round"'
      : 'fill="#000000" stroke="none"';

    if (!font) {
      const pos = previewBaseline();
      return '<text x="' + pos.x.toFixed(2) + '" y="' + pos.y.toFixed(2) + '" text-anchor="middle" font-family="' +
        escapeXml(fontDef.family.split(',')[0].replace(/["']/g,'')) + '" font-size="' + state.fontSize +
        '" font-weight="' + fontDef.weight + '" ' + paintAttrs + '>' + escapeXml(text) + '</text>';
    }

    const path = font.getPath(text, 0, 0, state.fontSize, { kerning:true });
    const box = path.getBoundingBox();
    const cx = (box.x1 + box.x2) / 2;
    const cy = (box.y1 + box.y2) / 2;
    const tx = center.x - cx;
    const ty = center.y - cy;
    return '<g transform="translate(' + tx.toFixed(3) + ' ' + ty.toFixed(3) + ')"><path d="' +
      path.toPathData(3) + '" ' + paintAttrs + '/></g>';
  }

  async function serializeProductionSvg() {
    const textMarkup = await productionTextMarkup();
    const font = selectedFont();
    const fallbackNote = font.placeholder
      ? '\n  <!-- FIGYELEM: ehhez a BT betűtípushoz a pontos fontfájl nincs a projektben; ellenőrizd gyártás előtt. -->'
      : '';

    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="490mm" height="120mm" viewBox="0 0 490 120" ' +
      'data-design-id="' + escapeXml(state.id) + '" data-led="' + escapeXml(selectedLed().label) + '" data-engraving="' +
      escapeXml(state.engraving === 'outline' ? 'Kontúr gravírozás' : 'Telibe gravírozott') + '">\n' +
      '  <!-- Lakás Dekor – Kamionos LED tábla -->\n' +
      '  <!-- Tervazonosító: ' + escapeXml(state.id) + ' -->\n' +
      '  <!-- Gyártási terület: bal/jobb 50 mm, felül 14 mm, alul 5 mm -->' + fallbackNote + '\n' +
      '  <rect x="0.2" y="0.2" width="489.6" height="119.6" fill="none" stroke="#000000" stroke-width="0.4" data-role="tabla-kontur"/>\n' +
      '  ' + textMarkup + '\n' +
      '</svg>';
  }

  function previewSvgString() {
    const clone = els.designSvg.cloneNode(true);
    clone.querySelector('#safeZone')?.remove();
    clone.querySelector('.truck-selection-ui')?.remove();
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '1470');
    clone.setAttribute('height', '360');

    const bg = clone.querySelector('.board-bg');
    const edge = clone.querySelector('.board-edge');
    const text = clone.querySelector('#previewText');
    if (bg) bg.setAttribute('fill', '#101216');
    if (edge) {
      edge.setAttribute('fill', 'none');
      edge.setAttribute('stroke', 'rgba(225,235,255,.28)');
      edge.setAttribute('stroke-width', '1.2');
    }
    if (text) {
      text.setAttribute('font-family', selectedFont().family);
      text.setAttribute('font-weight', String(selectedFont().weight));
      text.setAttribute('font-size', String(state.fontSize));
      text.setAttribute('filter', 'url(#glow)');
      text.setAttribute('paint-order', 'stroke fill');
    }
    return new XMLSerializer().serializeToString(clone);
  }

  function svgToJpegBlob(svgString) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgString], { type:'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 1470;
          canvas.height = 360;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#0b0d12';
          ctx.fillRect(0,0,canvas.width,canvas.height);
          ctx.drawImage(img,0,0,canvas.width,canvas.height);
          canvas.toBlob(j => {
            URL.revokeObjectURL(url);
            j ? resolve(j) : reject(new Error('Az előnézeti kép nem készíthető el.'));
          }, 'image/jpeg', .93);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Az előnézet feldolgozása sikertelen.'));
      };
      img.src = url;
    });
  }

  function designSummary() {
    return [
      'Felirat: ' + (state.text || '—'),
      'Méret: 49 × 12 cm (490 × 120 mm)',
      'Betűtípus: ' + selectedFont().label,
      'Gravírozás: ' + (state.engraving === 'outline' ? 'Kontúr gravírozás' : 'Telibe gravírozott'),
      'LED szín: ' + selectedLed().label,
      'Ár: ' + formatHuf(selectedLed().price),
      'Gyártási margók: bal 50 mm, jobb 50 mm, felül 14 mm, alul 5 mm'
    ].join(' | ');
  }

  async function buildProjectZip(designId) {
    if (!window.JSZip) throw new Error('A ZIP-kezelő nem töltődött be.');
    const productionSvg = await serializeProductionSvg();
    const previewBlob = await svgToJpegBlob(previewSvgString());
    const zip = new JSZip();

    zip.file(designId + '.svg', productionSvg);
    zip.file(designId + '_TERV.jpg', previewBlob);
    zip.file('00_TERV_ADATOK.txt',
      'LAKÁS DEKOR – KAMIONOS LED TÁBLA\r\n\r\n' +
      'Tervazonosító: ' + designId + '\r\n' +
      designSummary() + '\r\n\r\n' +
      'Gyártási fájl: SVG 1.1, méretarányos 490 × 120 mm.\r\n'
    );

    const zipBlob = await zip.generateAsync({
      type:'blob',
      compression:'DEFLATE',
      compressionOptions:{ level:7 }
    });

    return { zipBlob, previewBlob, productionSvg };
  }

  function setSendProgress(title, text, designId) {
    $('#sendModalTitle').textContent = title;
    const intro = document.querySelector('#sendFormView .send-modal-intro');
    if (intro) intro.textContent = text;
    if (designId) $('#designIdPreview').textContent = designId;
  }

  function openSendModal() {
    if (sendInProgress) return;
    if (!cleanText(state.text)) {
      setStatus('A mentéshez adj meg egy feliratot.', 'warn');
      els.textInput.focus();
      return;
    }
    $('#sendError').textContent = '';
    $('#sendFormView').hidden = false;
    $('#sendSuccessView').hidden = true;
    $('#sendModal').hidden = false;
    document.body.classList.add('modal-open');
    setSendProgress('Terv mentése folyamatban…', '', state.id);
    sendDesign(state.id);
  }

  function closeSendModal() {
    if (sendInProgress) return;
    $('#sendModal').hidden = true;
    document.body.classList.remove('modal-open');
  }

  function fetchWithTimeout(url, options, timeoutMs = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal:controller.signal }).finally(() => clearTimeout(timer));
  }

  async function sendDesign(designId) {
    if (sendInProgress) return;
    saveDesignSnapshotNow();
    sendInProgress = true;
    els.downloadZip.disabled = true;
    els.loading?.classList.remove('hidden');
    const err = $('#sendError');
    if (err) err.textContent = '';
    setStatus('A gyártási terv mentése és küldése folyamatban…');

    try {
      const { zipBlob, previewBlob, productionSvg } = await buildProjectZip(designId);
      if (zipBlob.size + previewBlob.size > 7_000_000) throw new Error('A terv fájlmérete túl nagy az automatikus küldéshez.');

      const fd = new FormData();
      fd.append('_subject', 'Új Lakás Dekor kamionos LED tábla terv – ' + designId);
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
      fd.append('terv_adatok', designSummary());
      fd.append('gyartasi_svg11', new File([productionSvg], designId + '.svg', { type:'image/svg+xml' }));
      fd.append('terv_zip', new File([zipBlob], designId + '-kamionos-led-tabla.zip', { type:'application/zip' }));
      fd.append('terv_kep', new File([previewBlob], designId + '_TERV.jpg', { type:'image/jpeg' }));

      await fetchWithTimeout(FORMSUBMIT_ENDPOINT, {
        method:'POST',
        body:fd,
        mode:'no-cors',
        credentials:'omit',
        cache:'no-store'
      });

      saveDesignSnapshotNow();
      $('#successDesignId').textContent = designId;
      $('#sendModal').dataset.sentDesignId = designId;
      $('#sendFormView').hidden = true;
      $('#sendSuccessView').hidden = false;
      setStatus('Terv sikeresen elmentve: ' + designId, 'good');
    } catch (error) {
      console.error(error);
      setSendProgress('A terv mentése nem sikerült', 'Ellenőrizd az internetkapcsolatot, majd próbáld újra.', designId);
      if (err) {
        err.textContent = error?.name === 'AbortError'
          ? 'A küldés túl sokáig tartott. Kérlek, próbáld újra.'
          : (error?.message || 'A terv küldése nem sikerült.');
      }
      setStatus('A küldés nem sikerült. A terv nem veszett el.', 'warn');
    } finally {
      sendInProgress = false;
      els.downloadZip.disabled = false;
      els.loading?.classList.add('hidden');
    }
  }

  function navigateBackToShop(url) {
    try {
      if (window.top && window.top !== window) window.top.location.href = url;
      else window.location.href = url;
    } catch {
      window.location.href = url;
    }
  }

  function returnToShop() {
    saveDesignSnapshotNow();
    const id = $('#sendModal').dataset.sentDesignId || state.id;
    const url = new URL(returnUrl, location.href);
    url.searchParams.set('kamionterv', id);
    url.searchParams.set('kamionnev', state.text);
    url.searchParams.set('kamionfont', state.fontId);
    url.searchParams.set('kamiongrav', state.engraving);
    url.searchParams.set('kamionled', state.led);
    url.searchParams.set('kamionar', String(selectedLed().price));
    navigateBackToShop(url.toString());
  }

  document.querySelectorAll('[data-close-send]').forEach(el => el.addEventListener('click', closeSendModal));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#sendModal').hidden && !sendInProgress) closeSendModal();
  });
  $('#returnToShop').addEventListener('click', returnToShop);

  initializeEditSession();
  setupControls();
  setupDirectEditing();
  render();

  if (missingEditDesign) {
    setStatus('A korábbi terv ebben a böngészőben már nem érhető el, ezért biztonsági okból új tervazonosítóval indult egy új terv.', 'warn');
  }

  setTimeout(() => autoFit(false), 80);
})();