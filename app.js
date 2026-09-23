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
  const returnUrl = params.get('return') || 'https://falmatrica-lakasdekor.hu/Kamionos-tabla-tervezo';
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

  const FONT_BASE = './Bet%C5%B1t%C3%ADpus/';
  const FONTS = [
    {
      id: 'bahnschrift',
      label: 'Bahnschrift',
      family: 'LakDekorBahnschrift, Bahnschrift, Arial, sans-serif',
      weight: 700,
      urls: [FONT_BASE + 'BAHNSCHRIFT.TTF']
    },
    {
      id: 'bebas-neue',
      label: 'Bebas Neue',
      family: 'LakDekorBebasNeue, "Bebas Neue", Arial, sans-serif',
      weight: 400,
      urls: [FONT_BASE + 'BEBASNEUE-REGULAR.TTF']
    },
    {
      id: 'arial-rounded-bold',
      label: 'Arial Rounded Bold',
      family: 'LakDekorArialRounded, "Arial Rounded MT Bold", Arial, sans-serif',
      weight: 700,
      urls: [FONT_BASE + 'ARLRDBD.TTF']
    },
    {
      id: 'arial',
      label: 'Arial',
      family: 'Arial, Helvetica, sans-serif',
      weight: 700,
      urls: [FONT_BASE + 'ARIAL.TTF', FONT_BASE + 'arial.ttf'],
      optionalFile: true
    },
    {
      id: 'arial-black',
      label: 'Arial Black',
      family: '"Arial Black", Arial, sans-serif',
      weight: 900,
      urls: [FONT_BASE + 'ARIBLK.TTF', FONT_BASE + 'ARIALBLACK.TTF', FONT_BASE + 'arial-black.ttf'],
      optionalFile: true
    }
  ];

  const OUTLINE_PATTERNS = [
    { id:'csillagok', label:'Csillagok', file:'csillagok.svg' },
    { id:'daf', label:'DAF', file:'daf.svg' },
    { id:'h-jelzes', label:'H-jelzés', file:'h-jelzés.svg' },
    { id:'hal', label:'Hal', file:'hal.svg' },
    { id:'iveco', label:'Iveco', file:'iveco.svg' },
    { id:'john-deere', label:'John Deere', file:'john deree.svg' },
    { id:'kalasz', label:'Kalász', file:'kalász.svg' },
    { id:'kamion', label:'Kamion', file:'kamion.svg' },
    { id:'kombajn', label:'Kombájn', file:'kombájn.svg' },
    { id:'man', label:'MAN', file:'man.svg' },
    { id:'mercedes', label:'Mercedes', file:'mercedes.svg' },
    { id:'mtz', label:'MTZ', file:'mtz.svg' },
    { id:'new-holland', label:'New Holland', file:'new holland.svg' },
    { id:'renault', label:'Renault', file:'renault.svg' },
    { id:'scania', label:'Scania', file:'scania.svg' },
    { id:'traktor', label:'Traktor', file:'traktor.svg' },
    { id:'volvo', label:'Volvo', file:'volvo.svg' },
    { id:'vontato', label:'Vontató', file:'vontató.svg' }
  ].map(p => ({ ...p, folder:'kontúr gravírozás', mode:'outline' }));

  const FILL_PATTERNS = [
    { id:'daf', label:'DAF', file:'DAF.svg' },
    { id:'h-jelzes', label:'H-jelzés', file:'H-jelzés.svg' },
    { id:'csillagok', label:'Csillagok', file:'csillagok.svg' },
    { id:'hal', label:'Hal', file:'hal.svg' },
    { id:'iveco', label:'Iveco', file:'iveco.svg' },
    { id:'john-deere', label:'John Deere', file:'john deree.svg' },
    { id:'kalasz', label:'Kalász', file:'kalász.svg' },
    { id:'kamion', label:'Kamion', file:'kamion.svg' },
    { id:'man', label:'MAN', file:'man.svg' },
    { id:'mercedes', label:'Mercedes', file:'mercedes.svg' },
    { id:'mtz', label:'MTZ', file:'mtz.svg' },
    { id:'new-holland', label:'New Holland', file:'new holland.svg' },
    { id:'renault', label:'Renault', file:'renault.svg' },
    { id:'scania', label:'Scania', file:'scania.svg' },
    { id:'traktor', label:'Traktor', file:'traktor.svg' },
    { id:'volvo', label:'Volvo', file:'volvo.svg' },
    { id:'vontato', label:'Vontató', file:'vontató.svg' }
  ].map(p => ({ ...p, folder:'telibe gravírozott', mode:'fill' }));

  const $ = sel => document.querySelector(sel);
  const $$ = sel => [...document.querySelectorAll(sel)];
  const fontCache = new Map();
  const patternSvgCache = new Map();
  let patternRenderToken = 0;
  let lastPatternRenderKey = '';

  const els = {
    textInput: $('#textInput'),
    fontSelect: $('#fontSelect'),
    engravingControl: $('#engravingControl'),
    patternGrid: $('#patternGrid'),
    selectedPatternLabel: $('#selectedPatternLabel'),
    mirrorPatternButton: $('#mirrorPatternButton'),
    duplicatePatternButton: $('#duplicatePatternButton'),
    deletePatternButton: $('#deletePatternButton'),
    clearPatternsButton: $('#clearPatternsButton'),
    patternLayer: $('#patternLayer'),
    selectionLayer: $('#selectionLayer'),
    colorGrid: $('#colorGrid'),
    selectedColorLabel: $('#selectedColorLabel'),
    selectedPrice: $('#selectedPrice'),
    sizeRange: $('#sizeRange'),
    widthRange: $('#widthRange'),
    xRange: $('#xRange'),
    yRange: $('#yRange'),
    sizeOutput: $('#sizeOutput'),
    widthOutput: $('#widthOutput'),
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
  let selectedObject = { type:'text', id:null };

  const state = {
    text: cleanText(params.get('nev')) || 'PETI',
    fontId: FONTS.some(f => f.id === params.get('font')) ? params.get('font') : 'bahnschrift',
    engraving: params.get('grav') === 'fill' ? 'fill' : 'outline',
    patterns: [],
    led: LED_COLORS.some(c => c.id === params.get('led')) ? params.get('led') : 'blue',
    fontSize: clamp(Number(params.get('meret') || 68), 18, 420),
    textScaleX: clamp(Number(params.get('szelesseg') || 100), 25, 800) / 100,
    xPct: clamp(Number(params.get('x') || 50), 0, 100),
    yPct: clamp(Number(params.get('y') || 50), 0, 100),
    showSafe: true,
    id: EDIT_DESIGN_ID || makeDesignId()
  };

  const initialPatternId =
    String(params.get('minta') || params.get('pattern') || params.get('kamionminta') || '')
      .split(',')[0]
      .trim();

  if (initialPatternId && patternsForEngraving(state.engraving).some(p => p.id === initialPatternId)) {
    state.patterns.push(createPatternInstance(initialPatternId, 0));
  }


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
      version: 3,
      designId: state.id,
      savedAt: Date.now(),
      text: state.text,
      fontId: state.fontId,
      engraving: state.engraving,
      patterns: state.patterns.map(p => ({ ...p })),
      led: state.led,
      fontSize: state.fontSize,
      textScaleX: state.textScaleX,
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
    state.fontId = FONTS.some(f => f.id === snap.fontId) ? snap.fontId : 'bahnschrift';
    state.engraving = snap.engraving === 'fill' ? 'fill' : 'outline';
    state.led = LED_COLORS.some(c => c.id === snap.led) ? snap.led : 'blue';
    state.fontSize = clamp(snap.fontSize, 18, 420);
    state.textScaleX = clamp(Number(snap.textScaleX || 1), .25, 8);
    state.xPct = clamp(snap.xPct, 0, 100);
    state.yPct = clamp(snap.yPct, 0, 100);
    state.showSafe = snap.showSafe !== false;

    if (Array.isArray(snap.patterns)) {
      state.patterns = snap.patterns
        .map(sanitizePatternInstance)
        .filter(Boolean)
        .filter(p => patternsForEngraving(state.engraving).some(def => def.id === p.patternId));
    } else if (snap.patternId && patternsForEngraving(state.engraving).some(def => def.id === snap.patternId)) {
      state.patterns = [createPatternInstance(String(snap.patternId), 0)];
    } else {
      state.patterns = [];
    }

    selectedObject = { type:'text', id:null };
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

  function patternsForEngraving(mode = state.engraving) {
    return mode === 'fill' ? FILL_PATTERNS : OUTLINE_PATTERNS;
  }

  function patternDef(patternId, mode = state.engraving) {
    return patternsForEngraving(mode).find(p => p.id === patternId) || null;
  }

  function patternUrl(def) {
    if (!def) return '';
    return encodeURI('./' + def.folder + '/' + def.file);
  }

  function makePatternInstanceId() {
    return 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function createPatternInstance(patternId, order = state.patterns.length) {
    const size = 76;
    const step = (order % 6) * 12;
    return {
      id: makePatternInstanceId(),
      patternId,
      x: clamp(SAFE.x + 6 + step, SAFE.x, SAFE.x + SAFE.width - size),
      y: clamp(SAFE.y + 8 + (order % 3) * 6, SAFE.y, SAFE.y + SAFE.height - size),
      w: size,
      h: size,
      aspect: 0,
      aspectReady: false,
      flipX: false
    };
  }

  function sanitizePatternInstance(raw) {
    if (!raw || !raw.patternId) return null;
    const w = clamp(Number(raw.w || 76), 18, SAFE.width);
    const h = clamp(Number(raw.h || 76), 18, SAFE.height);
    return {
      id: String(raw.id || makePatternInstanceId()),
      patternId: String(raw.patternId),
      x: clamp(Number(raw.x || SAFE.x), SAFE.x, SAFE.x + SAFE.width - w),
      y: clamp(Number(raw.y || SAFE.y), SAFE.y, SAFE.y + SAFE.height - h),
      w,
      h,
      aspect: Number(raw.aspect || 0),
      aspectReady: !!raw.aspectReady,
      flipX: !!raw.flipX
    };
  }

  function svgIntrinsicAspect(source) {
    if (!source) return 1;

    const vb = String(source.getAttribute('viewBox') || '')
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    if (
      vb.length === 4 &&
      Number.isFinite(vb[2]) &&
      Number.isFinite(vb[3]) &&
      vb[2] > 0 &&
      vb[3] > 0
    ) {
      return vb[2] / vb[3];
    }

    const width = parseFloat(source.getAttribute('width')) || 1;
    const height = parseFloat(source.getAttribute('height')) || 1;
    return width > 0 && height > 0 ? width / height : 1;
  }

  function applyPatternAspect(inst, source) {
    if (!inst || inst.aspectReady) return;

    const aspect = clamp(svgIntrinsicAspect(source), .08, 12);
    const centerX = inst.x + inst.w / 2;
    const centerY = inst.y + inst.h / 2;

    /*
      A régi 76×76-os négyzet helyett a kijelölés a VALÓDI SVG
      képarányát kapja. Emiatt a kombájn/kamion stb. nem egy
      nagy üres négyzetben méreteződik.
    */
    let h = clamp(inst.h, 18, SAFE.height);
    let w = h * aspect;

    if (w > SAFE.width) {
      w = SAFE.width;
      h = w / aspect;
    }

    if (h > SAFE.height) {
      h = SAFE.height;
      w = h * aspect;
    }

    inst.w = clamp(w, 18, SAFE.width);
    inst.h = clamp(h, 18, SAFE.height);
    inst.x = clamp(centerX - inst.w / 2, SAFE.x, SAFE.x + SAFE.width - inst.w);
    inst.y = clamp(centerY - inst.h / 2, SAFE.y, SAFE.y + SAFE.height - inst.h);
    inst.aspect = aspect;
    inst.aspectReady = true;
    lastPatternRenderKey = '';
  }

  function selectedPatternInstance() {
    if (selectedObject.type !== 'pattern') return null;
    return state.patterns.find(p => p.id === selectedObject.id) || null;
  }

  function selectedPatternDefinition() {
    const inst = selectedPatternInstance();
    return inst ? patternDef(inst.patternId) : null;
  }

  function targetCenter() {
    return {
      x: SAFE.x + SAFE.width * state.xPct / 100,
      y: SAFE.y + SAFE.height * state.yPct / 100
    };
  }

  function renderPatternChoices() {
    if (!els.patternGrid) return;

    const patterns = patternsForEngraving();

    const buttons = patterns.map(p =>
      '<button type="button" class="pattern-choice" data-pattern="' + p.id + '" aria-label="' + p.label + ' hozzáadása">' +
      '<img src="' + patternUrl(p) + '" alt="" loading="lazy" />' +
      '<span>' + p.label + '</span><small>+ hozzáadás</small></button>'
    ).join('');

    els.patternGrid.innerHTML = buttons;
    updatePatternSummary();
  }

  function updatePatternSummary() {
    const selected = selectedPatternDefinition();
    if (els.selectedPatternLabel) {
      els.selectedPatternLabel.textContent = selected
        ? selected.label + ' • ' + state.patterns.length + ' minta a terven'
        : (state.patterns.length ? state.patterns.length + ' minta a terven' : 'Nincs minta');
    }
    updatePatternActionButtons();
  }

  function updatePatternActionButtons() {
    const active = !!selectedPatternInstance();
    [els.mirrorPatternButton, els.duplicatePatternButton, els.deletePatternButton].forEach(btn => {
      if (btn) btn.disabled = !active;
    });
    if (els.clearPatternsButton) els.clearPatternsButton.disabled = state.patterns.length === 0;
  }

  function addPattern(patternId) {
    if (!patternDef(patternId)) return;
    const inst = createPatternInstance(patternId, state.patterns.length);
    state.patterns.push(inst);
    selectedObject = { type:'pattern', id:inst.id };
    renderPatternChoices();
    render();
    setStatus('Minta hozzáadva. Húzd a táblán a helyére, a sarkokkal méretezheted.', 'good');
  }

  function duplicateSelectedPattern() {
    const src = selectedPatternInstance();
    if (!src) return;
    const copy = sanitizePatternInstance({
      ...src,
      id: makePatternInstanceId(),
      x: src.x + 12,
      y: src.y + 8
    });
    state.patterns.push(copy);
    selectedObject = { type:'pattern', id:copy.id };
    renderPatternChoices();
    render();
  }

  function deleteSelectedPattern() {
    const inst = selectedPatternInstance();
    if (!inst) return;
    state.patterns = state.patterns.filter(p => p.id !== inst.id);
    selectedObject = { type:'text', id:null };
    renderPatternChoices();
    render();
  }

  function clearAllPatterns() {
    state.patterns = [];
    selectedObject = { type:'text', id:null };
    renderPatternChoices();
    render();
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
      '<option value="' + f.id + '">' + f.label + (f.optionalFile ? ' (fontfájl szükséges a gyártási görbéhez)' : '') + '</option>'
    ).join('');
    els.fontSelect.value = state.fontId;
    renderPatternChoices();

    els.colorGrid.innerHTML = LED_COLORS.map(c =>
      '<button type="button" class="color-choice" data-color="' + c.id + '" style="--swatch:' + c.css + '" aria-label="' + c.label + '" role="radio"><span>' + c.label + '</span></button>'
    ).join('');

    els.textInput.value = state.text;
    els.sizeRange.value = state.fontSize;
    els.widthRange.value = Math.round(state.textScaleX * 100);
    els.xRange.value = state.xPct;
    els.yRange.value = state.yPct;
    els.designId.textContent = state.id;

    $$('[data-section-toggle]').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.card')?.classList.toggle('open'));
    });

    els.textInput.addEventListener('input', () => {
      state.text = cleanText(els.textInput.value) || 'PETI';
      selectedObject = { type:'text', id:null };
      autoFit(false);
    });

    els.fontSelect.addEventListener('change', () => {
      state.fontId = els.fontSelect.value;
      selectedObject = { type:'text', id:null };
      autoFit(false);
    });

    els.engravingControl.addEventListener('click', e => {
      const button = e.target.closest('[data-engraving]');
      if (!button) return;

      const nextMode = button.dataset.engraving;
      if (nextMode === state.engraving) return;

      state.engraving = nextMode;

      const available = new Set(patternsForEngraving().map(p => p.id));
      const before = state.patterns.length;
      state.patterns = state.patterns.filter(p => available.has(p.patternId));

      if (selectedObject.type === 'pattern' && !state.patterns.some(p => p.id === selectedObject.id)) {
        selectedObject = { type:'text', id:null };
      }

      renderPatternChoices();
      render();

      if (state.patterns.length < before) {
        setStatus('A másik gravírozási módban nem létező mintákat eltávolítottam.', 'warn');
      }
    });

    els.patternGrid?.addEventListener('click', e => {
      const button = e.target.closest('[data-pattern]');
      if (!button) return;
      addPattern(button.dataset.pattern || '');
    });

    els.mirrorPatternButton?.addEventListener('click', () => {
      const inst = selectedPatternInstance();
      if (!inst) return;
      inst.flipX = !inst.flipX;
      render();
    });

    els.duplicatePatternButton?.addEventListener('click', duplicateSelectedPattern);
    els.deletePatternButton?.addEventListener('click', deleteSelectedPattern);
    els.clearPatternsButton?.addEventListener('click', clearAllPatterns);

    els.colorGrid.addEventListener('click', e => {
      const button = e.target.closest('[data-color]');
      if (!button) return;
      state.led = button.dataset.color;
      render();
    });

    els.sizeRange.addEventListener('input', () => {
      state.fontSize = Number(els.sizeRange.value);
      selectedObject = { type:'text', id:null };
      render();
      constrainTextToSafeZone(true);
    });

    els.widthRange.addEventListener('input', () => {
      state.textScaleX = Number(els.widthRange.value) / 100;
      selectedObject = { type:'text', id:null };
      render();
      constrainTextToSafeZone(true);
    });

    els.xRange.addEventListener('input', () => {
      state.xPct = Number(els.xRange.value);
      selectedObject = { type:'text', id:null };
      render();
      constrainTextToSafeZone(false);
    });

    els.yRange.addEventListener('input', () => {
      state.yPct = Number(els.yRange.value);
      selectedObject = { type:'text', id:null };
      render();
      constrainTextToSafeZone(false);
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

  async function loadPatternSvg(def) {
    if (!def) return null;
    const key = def.mode + ':' + def.file;
    if (patternSvgCache.has(key)) return patternSvgCache.get(key);

    const promise = fetch(patternUrl(def), { cache:'force-cache' })
      .then(response => {
        if (!response.ok) throw new Error('A minta nem tölthető be: ' + def.label);
        return response.text();
      })
      .catch(error => {
        patternSvgCache.delete(key);
        throw error;
      });

    patternSvgCache.set(key, promise);
    return promise;
  }

  function recolorSvgNode(root, paint) {
    root.querySelectorAll('*').forEach(node => {
      const fill = node.getAttribute('fill');
      const stroke = node.getAttribute('stroke');

      if (fill && fill.toLowerCase() !== 'none') node.setAttribute('fill', paint);
      if (stroke && stroke.toLowerCase() !== 'none') node.setAttribute('stroke', paint);

      const style = node.getAttribute('style');
      if (style) {
        node.setAttribute(
          'style',
          style
            .replace(/fill\s*:\s*(?:red|#ff0000|#f00)/gi, 'fill:' + paint)
            .replace(/stroke\s*:\s*(?:red|#ff0000|#f00)/gi, 'stroke:' + paint)
        );
      }
    });
  }

  async function buildPatternPreviewNode(inst, paint) {
    const def = patternDef(inst.patternId);
    if (!def) return null;

    const raw = await loadPatternSvg(def);
    if (!raw) return null;

    const parsed = new DOMParser().parseFromString(raw, 'image/svg+xml');
    const source = parsed.documentElement;
    if (!source || source.nodeName.toLowerCase() !== 'svg') return null;

    applyPatternAspect(inst, source);

    const NS = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(NS, 'g');
    group.setAttribute('class', 'pattern-instance');
    group.dataset.patternInstance = inst.id;
    group.setAttribute(
      'transform',
      inst.flipX
        ? 'translate(' + (inst.x + inst.w).toFixed(3) + ' ' + inst.y.toFixed(3) + ') scale(-1 1)'
        : 'translate(' + inst.x.toFixed(3) + ' ' + inst.y.toFixed(3) + ')'
    );

    const nested = document.createElementNS(NS, 'svg');
    nested.setAttribute('x', '0');
    nested.setAttribute('y', '0');
    nested.setAttribute('width', inst.w.toFixed(3));
    nested.setAttribute('height', inst.h.toFixed(3));
    nested.setAttribute('viewBox', source.getAttribute('viewBox') || '0 0 100 100');
    nested.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    nested.setAttribute('overflow', 'visible');
    nested.setAttribute('filter', 'url(#glow)');

    Array.from(source.childNodes).forEach(node => {
      nested.appendChild(document.importNode(node, true));
    });

    nested.querySelectorAll('metadata,script,foreignObject').forEach(node => node.remove());
    recolorSvgNode(nested, paint);
    group.appendChild(nested);

    const hit = document.createElementNS(NS, 'rect');
    hit.setAttribute('class', 'pattern-hit');
    hit.setAttribute('x', '0');
    hit.setAttribute('y', '0');
    hit.setAttribute('width', inst.w.toFixed(3));
    hit.setAttribute('height', inst.h.toFixed(3));
    hit.setAttribute('fill', 'transparent');
    hit.setAttribute('pointer-events', 'all');
    group.appendChild(hit);

    return group;
  }

  async function updatePatternPreview(paint) {
    if (!els.patternLayer) return;

    const renderKey = JSON.stringify({
      engraving: state.engraving,
      paint,
      patterns: state.patterns
    });

    if (renderKey === lastPatternRenderKey) return;

    const token = ++patternRenderToken;
    els.patternLayer.replaceChildren();

    const nodes = await Promise.all(
      state.patterns.map(inst => buildPatternPreviewNode(inst, paint))
    );

    if (token !== patternRenderToken) return;

    nodes.filter(Boolean).forEach(node => els.patternLayer.appendChild(node));
    lastPatternRenderKey = renderKey;
    updateSelectionOverlay();
  }

  function updatePatternNodeLive(inst) {
    if (!inst || !els.patternLayer) return;

    const group = els.patternLayer.querySelector('[data-pattern-instance="' + inst.id + '"]');
    if (!group) return;

    group.setAttribute(
      'transform',
      inst.flipX
        ? 'translate(' + (inst.x + inst.w).toFixed(3) + ' ' + inst.y.toFixed(3) + ') scale(-1 1)'
        : 'translate(' + inst.x.toFixed(3) + ' ' + inst.y.toFixed(3) + ')'
    );

    const nested = group.querySelector('svg');
    if (nested) {
      nested.setAttribute('width', inst.w.toFixed(3));
      nested.setAttribute('height', inst.h.toFixed(3));
    }

    const hit = group.querySelector('.pattern-hit');
    if (hit) {
      hit.setAttribute('width', inst.w.toFixed(3));
      hit.setAttribute('height', inst.h.toFixed(3));
    }

    lastPatternRenderKey = '';
  }

  function previewBaseline() {
    const p = targetCenter();
    return { x: p.x, y: p.y + state.fontSize * 0.28 };
  }

  function applyTextTransform() {
    const center = targetCenter();
    els.previewText.setAttribute(
      'transform',
      'translate(' + center.x.toFixed(3) + ' 0) scale(' + state.textScaleX.toFixed(4) + ' 1) translate(' + (-center.x).toFixed(3) + ' 0)'
    );
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
    applyTextTransform();

    const paint = state.led === 'rgb' ? 'url(#rgbGradient)' : led.value;
    updatePatternPreview(paint);

    if (state.engraving === 'outline') {
      els.previewText.setAttribute('fill', 'transparent');
      els.previewText.setAttribute('stroke', paint);
      els.previewText.setAttribute('stroke-width', Math.max(1.0, state.fontSize * 0.028).toFixed(2));
      els.previewText.setAttribute('stroke-linejoin', 'round');
    } else {
      els.previewText.setAttribute('fill', paint);
      els.previewText.setAttribute('stroke', paint);
      els.previewText.setAttribute('stroke-width', '0.55');
    }

    els.safeZone.style.display = state.showSafe ? '' : 'none';
    els.sizeOutput.textContent = Math.round(state.fontSize) + ' mm';
    els.widthOutput.textContent = Math.round(state.textScaleX * 100) + '%';
    els.xOutput.textContent = Math.round(state.xPct) + '%';
    els.yOutput.textContent = Math.round(state.yPct) + '%';
    els.sizeRange.value = state.fontSize;
    els.widthRange.value = Math.round(state.textScaleX * 100);
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

    updatePatternSummary();

    if (font.optionalFile) {
      setStatus(
        'A „' + font.label + '” előnézete a gép rendszerbetűjével készül. A pontos gyártási görbéhez a fontfájlt még fel kell tölteni a Betűtípus mappába.',
        'warn'
      );
    } else {
      setStatus('A felirat és a minták a szaggatott gyártási területen belül mozgathatók.');
    }

    queueSnapshotSave();
    updateSelectionOverlay();
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

  function rawTextBox() {
    try {
      return els.previewText.getBBox();
    } catch (_) {
      return null;
    }
  }

  function textVisualBox() {
    /*
      A kijelölő kerethez NEM az SVG <text>.getBBox() font-metrikáját
      használjuk, mert az több betűtípusnál (pl. Bahnschrift) üres
      ascender/descender területet is beleszámol.

      Canvas TextMetrics actualBoundingBox* értékekkel a ténylegesen
      kirajzolt betűk vizuális dobozát mérjük. Így a narancssárga
      kijelölés közvetlenül a kék betűk körül lesz, ugyanúgy, mint
      a minták kijelölése.
    */
    const text = cleanText(state.text);
    if (!text) return null;

    try {
      const canvas =
        textVisualBox._canvas ||
        (textVisualBox._canvas = document.createElement('canvas'));

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Nincs canvas context');

      const font = selectedFont();
      const pos = previewBaseline();

      ctx.font =
        String(font.weight || 400) +
        ' ' +
        String(state.fontSize) +
        'px ' +
        font.family;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      const m = ctx.measureText(text);

      const left =
        Number.isFinite(m.actualBoundingBoxLeft)
          ? m.actualBoundingBoxLeft
          : m.width / 2;

      const right =
        Number.isFinite(m.actualBoundingBoxRight)
          ? m.actualBoundingBoxRight
          : m.width / 2;

      const ascent =
        Number.isFinite(m.actualBoundingBoxAscent)
          ? m.actualBoundingBoxAscent
          : state.fontSize * 0.78;

      const descent =
        Number.isFinite(m.actualBoundingBoxDescent)
          ? m.actualBoundingBoxDescent
          : state.fontSize * 0.06;

      /*
        Kontúr gravírozásnál a látható stroke külső fele is számítson
        a kijelölésbe, de a glow/filter ne, mert az csak látványeffekt.
      */
      const strokeWidth =
        state.engraving === 'outline'
          ? Math.max(1.0, state.fontSize * 0.028)
          : 0.55;

      const padY = strokeWidth / 2;
      const padX = padY * state.textScaleX;

      const x =
        pos.x -
        left * state.textScaleX -
        padX;

      const y =
        pos.y -
        ascent -
        padY;

      const width =
        (left + right) * state.textScaleX +
        padX * 2;

      const height =
        ascent +
        descent +
        padY * 2;

      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        Number.isFinite(width) &&
        Number.isFinite(height) &&
        width > 0 &&
        height > 0
      ) {
        return { x, y, width, height };
      }
    } catch (_) {
      // Fallback lent.
    }

    /*
      Fallback régebbi böngészőre.
    */
    const box = rawTextBox();
    if (!box) return null;

    const center = targetCenter();

    return {
      x: center.x + (box.x - center.x) * state.textScaleX,
      y: box.y,
      width: box.width * state.textScaleX,
      height: box.height
    };
  }

  function currentSelectionBox() {
    if (selectedObject.type === 'pattern') {
      const inst = selectedPatternInstance();
      return inst ? { x:inst.x, y:inst.y, width:inst.w, height:inst.h } : null;
    }

    return cleanText(state.text) ? textVisualBox() : null;
  }

  function updateSelectionOverlay() {
    if (!els.selectionLayer) return;
    els.selectionLayer.replaceChildren();

    const box = currentSelectionBox();
    if (!box || !Number.isFinite(box.width) || !Number.isFinite(box.height)) return;

    const NS = 'http://www.w3.org/2000/svg';
    /*
      A narancssárga kijelölő keret csak vizuális segéd.
      A méretezés alapja maga a VALÓDI szöveg/minta doboza.
      Nincs extra belső/külső ráhagyás.
    */
    const pad = 0;
    const x = box.x;
    const y = box.y;
    const w = box.width;
    const h = box.height;

    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('class', 'truck-selection-box');
    rect.setAttribute('x', x.toFixed(2));
    rect.setAttribute('y', y.toFixed(2));
    rect.setAttribute('width', w.toFixed(2));
    rect.setAttribute('height', h.toFixed(2));
    rect.setAttribute('rx', '1.5');
    els.selectionLayer.appendChild(rect);

    [
      [x, y],
      [x + w, y],
      [x, y + h],
      [x + w, y + h]
    ].forEach((coords, handleIndex) => {
      const handle = document.createElementNS(NS, 'circle');
      handle.setAttribute('class', 'truck-resize-handle');
      handle.setAttribute('cx', coords[0].toFixed(2));
      handle.setAttribute('cy', coords[1].toFixed(2));
      handle.setAttribute('r', '4.2');

      handle.addEventListener('pointerdown', evt => {
        evt.preventDefault();
        evt.stopPropagation();

        const p = svgClientPoint(evt);
        if (!p) return;

        const selection = currentSelectionBox();
        if (!selection) return;

        const cx = selection.x + selection.width / 2;
        const cy = selection.y + selection.height / 2;
        const startDistance = Math.max(1, Math.hypot(p.x - cx, p.y - cy));

        if (selectedObject.type === 'pattern') {
          const inst = selectedPatternInstance();
          if (!inst) return;

          const isLeftHandle = handleIndex === 0 || handleIndex === 2;
          const isTopHandle = handleIndex === 0 || handleIndex === 1;

          directEditInteraction = {
            mode:'pattern-resize',
            pointerId:evt.pointerId,
            patternId:inst.id,
            isLeftHandle,
            isTopHandle,
            anchorX: isLeftHandle ? inst.x + inst.w : inst.x,
            anchorY: isTopHandle ? inst.y + inst.h : inst.y,
            startW:inst.w,
            startH:inst.h
          };
        } else {
          const isLeftHandle = handleIndex === 0 || handleIndex === 2;
          const isTopHandle = handleIndex === 0 || handleIndex === 1;

          directEditInteraction = {
            mode:'text-resize',
            pointerId:evt.pointerId,
            handleIndex,
            isLeftHandle,
            isTopHandle,

            /*
              Az ellentétes szövegsarok fix marad.
              Emiatt ha a jobb oldali fogót húzod jobbra, a bal szövegszél
              nem mozdul el, a jobb szövegszél pedig ténylegesen a
              fehér Biztonsági zónáig húzható.
            */
            anchorX: isLeftHandle
              ? selection.x + selection.width
              : selection.x,

            anchorY: isTopHandle
              ? selection.y + selection.height
              : selection.y,

            startFontSize:state.fontSize,
            startScaleX:state.textScaleX,
            startBoxW:Math.max(1, selection.width),
            startBoxH:Math.max(1, selection.height),
            startAspect:Math.max(.01, selection.width / Math.max(1, selection.height))
          };
        }

        try { els.designSvg.setPointerCapture(evt.pointerId); } catch (_) {}
      });

      els.selectionLayer.appendChild(handle);
    });

    /*
      Jobb oldali ↔ fogó:
      - a sarkok továbbra is arányosan méreteznek
      - ez csak vízszintesen nyújt/keskenyít
      - maximum a fehér Biztonsági zóna jobb széléig
    */
    {
      const stretchX = x + w;
      const stretchY = y + h / 2;

      const stretchGroup = document.createElementNS(NS, 'g');
      stretchGroup.setAttribute('class', 'object-stretch-control');
      stretchGroup.setAttribute(
        'transform',
        'translate(' + stretchX.toFixed(2) + ' ' + stretchY.toFixed(2) + ')'
      );
      stretchGroup.setAttribute('role', 'button');
      stretchGroup.setAttribute('aria-label', 'Széthúzás vagy keskenyítés');

      const stretchCircle = document.createElementNS(NS, 'circle');
      stretchCircle.setAttribute('r', '7.2');
      stretchCircle.setAttribute('class', 'object-stretch-circle');
      stretchGroup.appendChild(stretchCircle);

      const stretchText = document.createElementNS(NS, 'text');
      stretchText.setAttribute('class', 'object-stretch-icon');
      stretchText.setAttribute('x', '0');
      stretchText.setAttribute('y', '0.8');
      stretchText.setAttribute('text-anchor', 'middle');
      stretchText.setAttribute('dominant-baseline', 'middle');
      stretchText.textContent = '↔';
      stretchGroup.appendChild(stretchText);

      stretchGroup.addEventListener('pointerdown', evt => {
        evt.preventDefault();
        evt.stopPropagation();

        const selection = currentSelectionBox();
        if (!selection) return;

        if (selectedObject.type === 'pattern') {
          const inst = selectedPatternInstance();
          if (!inst) return;

          directEditInteraction = {
            mode:'pattern-stretch',
            pointerId:evt.pointerId,
            patternId:inst.id,
            startLeft:selection.x,
            startRight:selection.x + selection.width,
            startW:Math.max(1, selection.width)
          };
        } else {
          directEditInteraction = {
            mode:'text-stretch',
            pointerId:evt.pointerId,
            startLeft:selection.x,
            startRight:selection.x + selection.width,
            startScaleX:state.textScaleX,
            startW:Math.max(1, selection.width)
          };
        }

        try { els.designSvg.setPointerCapture(evt.pointerId); } catch (_) {}
      });

      els.selectionLayer.appendChild(stretchGroup);
    }

    if (selectedObject.type === 'pattern') {
      const inst = selectedPatternInstance();

      if (inst) {
        const controlY = Math.max(6, y - 11);
        const controlX = x + w / 2;

        const mirrorGroup = document.createElementNS(NS, 'g');
        mirrorGroup.setAttribute('class', 'pattern-mirror-control');
        mirrorGroup.setAttribute('transform', 'translate(' + controlX.toFixed(2) + ' ' + controlY.toFixed(2) + ')');
        mirrorGroup.setAttribute('role', 'button');
        mirrorGroup.setAttribute('aria-label', 'Minta tükrözése');

        const mirrorCircle = document.createElementNS(NS, 'circle');
        mirrorCircle.setAttribute('r', '7.2');
        mirrorCircle.setAttribute('class', 'pattern-mirror-circle');
        mirrorGroup.appendChild(mirrorCircle);

        const mirrorText = document.createElementNS(NS, 'text');
        mirrorText.setAttribute('class', 'pattern-mirror-icon');
        mirrorText.setAttribute('x', '0');
        mirrorText.setAttribute('y', '0.8');
        mirrorText.setAttribute('text-anchor', 'middle');
        mirrorText.setAttribute('dominant-baseline', 'middle');
        mirrorText.textContent = '↔';
        mirrorGroup.appendChild(mirrorText);

        mirrorGroup.addEventListener('pointerdown', evt => {
          evt.preventDefault();
          evt.stopPropagation();

          inst.flipX = !inst.flipX;
          updatePatternNodeLive(inst);
          queueSnapshotSave();
          updateSelectionOverlay();
        });

        els.selectionLayer.appendChild(mirrorGroup);

        /*
          Gyors törlés a kijelölt minta jobb felső sarkánál.
          Külön X gomb, hogy a vásárlónak ne kelljen megkeresnie
          a bal oldali "Törlés" gombot.
        */
        const deleteX = Math.min(482, x + w + 10);
        const deleteY = Math.max(8, y - 10);

        const deleteGroup = document.createElementNS(NS, 'g');
        deleteGroup.setAttribute('class', 'pattern-delete-control');
        deleteGroup.setAttribute(
          'transform',
          'translate(' + deleteX.toFixed(2) + ' ' + deleteY.toFixed(2) + ')'
        );
        deleteGroup.setAttribute('role', 'button');
        deleteGroup.setAttribute('aria-label', 'Kijelölt minta törlése');

        const deleteCircle = document.createElementNS(NS, 'circle');
        deleteCircle.setAttribute('r', '7.4');
        deleteCircle.setAttribute('class', 'pattern-delete-circle');
        deleteGroup.appendChild(deleteCircle);

        const deleteText = document.createElementNS(NS, 'text');
        deleteText.setAttribute('class', 'pattern-delete-icon');
        deleteText.setAttribute('x', '0');
        deleteText.setAttribute('y', '0.7');
        deleteText.setAttribute('text-anchor', 'middle');
        deleteText.setAttribute('dominant-baseline', 'middle');
        deleteText.textContent = '×';
        deleteGroup.appendChild(deleteText);

        deleteGroup.addEventListener('pointerdown', evt => {
          evt.preventDefault();
          evt.stopPropagation();

          /*
            Pontosan azt a mintát töröljük, amelyikhez ez az X tartozik.
            Így akkor is biztos a működés, ha több minta van a terven.
          */
          selectedObject = { type:'pattern', id:inst.id };
          deleteSelectedPattern();
        });

        els.selectionLayer.appendChild(deleteGroup);
      }
    }
  }

  function startDirectTextDrag(evt) {
    evt.preventDefault();
    evt.stopPropagation();

    selectedObject = { type:'text', id:null };

    const p = svgClientPoint(evt);
    if (!p) return;

    directEditInteraction = {
      mode:'text-move',
      pointerId:evt.pointerId,
      startPoint:p,
      startXPct:state.xPct,
      startYPct:state.yPct
    };

    els.previewText.classList.add('dragging');
    try { els.designSvg.setPointerCapture(evt.pointerId); } catch (_) {}
    updateSelectionOverlay();
  }

  function startPatternDrag(evt) {
    const group = evt.target.closest?.('[data-pattern-instance]');
    if (!group) return;

    evt.preventDefault();
    evt.stopPropagation();

    const inst = state.patterns.find(p => p.id === group.dataset.patternInstance);
    if (!inst) return;

    selectedObject = { type:'pattern', id:inst.id };
    renderPatternChoices();

    const p = svgClientPoint(evt);
    if (!p) return;

    directEditInteraction = {
      mode:'pattern-move',
      pointerId:evt.pointerId,
      patternId:inst.id,
      startPoint:p,
      startX:inst.x,
      startY:inst.y
    };

    try { els.designSvg.setPointerCapture(evt.pointerId); } catch (_) {}
    updateSelectionOverlay();
  }

  function moveDirectEdit(evt) {
    if (!directEditInteraction || directEditInteraction.pointerId !== evt.pointerId) return;

    evt.preventDefault();
    const p = svgClientPoint(evt);
    if (!p) return;

    if (directEditInteraction.mode === 'text-move') {
      const dx = p.x - directEditInteraction.startPoint.x;
      const dy = p.y - directEditInteraction.startPoint.y;

      state.xPct = clamp(
        directEditInteraction.startXPct + dx / SAFE.width * 100,
        0,
        100
      );

      state.yPct = clamp(
        directEditInteraction.startYPct + dy / SAFE.height * 100,
        0,
        100
      );

      render();
      constrainTextToSafeZone(false);
      return;
    }

    if (directEditInteraction.mode === 'text-resize') {
      /*
        HIBRID MÉRETEZÉS:
        1. A sarok húzásakor először méretarányosan nő a felirat.
        2. Ha magasságban eléri a fehér Biztonsági zónát,
           a további jobbra/balra húzás már csak a SZÉLESSÉGET növeli.
        3. Így a felirat a Biztonsági zóna teljes szélességét
           kihasználhatja anélkül, hogy felül/alul kilógna.
      */
      const i = directEditInteraction;

      const safeLeft = SAFE.x;
      const safeRight = SAFE.x + SAFE.width;
      const safeTop = SAFE.y;
      const safeBottom = SAFE.y + SAFE.height;

      const availableW = Math.max(
        8,
        i.isLeftHandle
          ? i.anchorX - safeLeft
          : safeRight - i.anchorX
      );

      const availableH = Math.max(
        8,
        i.isTopHandle
          ? i.anchorY - safeTop
          : safeBottom - i.anchorY
      );

      const desiredW = Math.max(
        8,
        Math.abs(p.x - i.anchorX)
      );

      const desiredH = Math.max(
        8,
        Math.abs(p.y - i.anchorY)
      );

      const pointerScale = Math.max(
        desiredW / Math.max(1, i.startBoxW),
        desiredH / Math.max(1, i.startBoxH)
      );

      const maxWidthScale =
        availableW / Math.max(1, i.startBoxW);

      const maxHeightScale =
        availableH / Math.max(1, i.startBoxH);

      const proportionalScale = clamp(
        pointerScale,
        .1,
        Math.min(maxWidthScale, maxHeightScale)
      );

      /*
        Normál, arányos nagyítás.
      */
      let heightScale = proportionalScale;
      let targetW = i.startBoxW * proportionalScale;
      let targetH = i.startBoxH * proportionalScale;
      let nextScaleX = i.startScaleX;

      /*
        1) Ha a MAGASSÁG fogy el előbb, de szélességben még van hely,
           a további húzás szélességben tudja növelni a feliratot.
      */
      if (
        maxHeightScale < maxWidthScale &&
        pointerScale >= maxHeightScale
      ) {
        heightScale = maxHeightScale;
        targetH = i.startBoxH * heightScale;

        const pointerTargetW = clamp(
          desiredW,
          i.startBoxW * heightScale,
          availableW
        );

        targetW = pointerTargetW;

        const proportionalWidthAtHeightLimit =
          i.startBoxW * heightScale;

        nextScaleX = clamp(
          i.startScaleX *
            (targetW / Math.max(1, proportionalWidthAtHeightLimit)),
          .25,
          8
        );
      }

      /*
        2) FONTOS JAVÍTÁS:
           ha a SZÉLESSÉG fogy el előbb (ez történik a PETI-nél),
           attól még a felirat MAGASSÁGBAN tovább nőhet egészen
           a fehér szaggatott Biztonsági zónáig.

           Ilyenkor a szélességet a zónán belül tartjuk, és a
           textScaleX-et automatikusan csökkentjük annyira, hogy
           a betűk magasabbak lehessenek anélkül, hogy oldalra kilógnának.
      */
      if (
        maxWidthScale <= maxHeightScale &&
        pointerScale >= maxWidthScale
      ) {
        const heightPointerScale =
          desiredH / Math.max(1, i.startBoxH);

        heightScale = clamp(
          Math.max(maxWidthScale, heightPointerScale),
          maxWidthScale,
          maxHeightScale
        );

        targetH = i.startBoxH * heightScale;
        targetW = availableW;

        const proportionalWidthAtCurrentHeight =
          i.startBoxW * heightScale;

        nextScaleX = clamp(
          i.startScaleX *
            (targetW / Math.max(1, proportionalWidthAtCurrentHeight)),
          .25,
          8
        );
      }

      state.fontSize = clamp(
        i.startFontSize * heightScale,
        18,
        420
      );

      state.textScaleX = nextScaleX;

      /*
        Az ellentétes sarok továbbra is fix marad.
      */
      const left =
        i.isLeftHandle
          ? i.anchorX - targetW
          : i.anchorX;

      const top =
        i.isTopHandle
          ? i.anchorY - targetH
          : i.anchorY;

      const desiredCX = left + targetW / 2;
      const desiredCY = top + targetH / 2;

      state.xPct = clamp(
        (desiredCX - SAFE.x) / SAFE.width * 100,
        0,
        100
      );

      state.yPct = clamp(
        (desiredCY - SAFE.y) / SAFE.height * 100,
        0,
        100
      );

      render();

      /*
        A tényleges betűkontúr dobozát korrigáljuk a kívánt
        középpontra, így a kék felirat széle követi a fogót.
      */
      const actualBox = textVisualBox();

      if (actualBox) {
        const actualCX =
          actualBox.x + actualBox.width / 2;

        const actualCY =
          actualBox.y + actualBox.height / 2;

        state.xPct = clamp(
          state.xPct +
            (desiredCX - actualCX) / SAFE.width * 100,
          0,
          100
        );

        state.yPct = clamp(
          state.yPct +
            (desiredCY - actualCY) / SAFE.height * 100,
          0,
          100
        );

        render();
      }

      constrainTextToSafeZone(false);
      return;
    }

    if (directEditInteraction.mode === 'text-stretch') {
      const i = directEditInteraction;

      const safeLeft = SAFE.x;
      const safeRight = SAFE.x + SAFE.width;

      /*
        A jobb oldali ↔ fogóval most nem csak jobbra nő a felirat.
        A húzás mértékével a bal oldala is balra terjeszkedik.
        Így a PETI a teljes fehér Biztonsági zóna szélességét
        kihasználhatja akkor is, ha eredetileg középen/jobbra áll.
      */
      const dx = p.x - i.startRight;

      let desiredLeft;
      let desiredRight;

      if (dx >= 0) {
        /*
          0..1 progress: amikor a ↔ fogó eléri a fehér jobb határt,
          a bal szél is eléri a fehér bal határt.
        */
        const rightRoom = Math.max(1, safeRight - i.startRight);
        const progress = clamp(dx / rightRoom, 0, 1);

        desiredRight =
          i.startRight +
          (safeRight - i.startRight) * progress;

        desiredLeft =
          i.startLeft -
          (i.startLeft - safeLeft) * progress;
      } else {
        /*
          Keskenyítés: a két oldal a közép felé közelít.
        */
        const shrink = Math.min(
          -dx,
          Math.max(0, (i.startW - 8) / 2)
        );

        desiredLeft = i.startLeft + shrink;
        desiredRight = i.startRight - shrink;
      }

      desiredLeft = clamp(
        desiredLeft,
        safeLeft,
        safeRight - 8
      );

      desiredRight = clamp(
        desiredRight,
        desiredLeft + 8,
        safeRight
      );

      const desiredW = Math.max(8, desiredRight - desiredLeft);
      const desiredCX = desiredLeft + desiredW / 2;

      state.textScaleX = clamp(
        i.startScaleX * (desiredW / Math.max(1, i.startW)),
        .25,
        8
      );

      state.xPct = clamp(
        (desiredCX - SAFE.x) / SAFE.width * 100,
        0,
        100
      );

      render();

      const actualBox = textVisualBox();
      if (actualBox) {
        const actualCX = actualBox.x + actualBox.width / 2;

        state.xPct = clamp(
          state.xPct +
          (desiredCX - actualCX) / SAFE.width * 100,
          0,
          100
        );

        render();
      }

      constrainTextToSafeZone(false);
      return;
    }

    if (directEditInteraction.mode === 'pattern-move') {
      const inst = state.patterns.find(x => x.id === directEditInteraction.patternId);
      if (!inst) return;

      const dx = p.x - directEditInteraction.startPoint.x;
      const dy = p.y - directEditInteraction.startPoint.y;

      inst.x = clamp(
        directEditInteraction.startX + dx,
        SAFE.x,
        SAFE.x + SAFE.width - inst.w
      );

      inst.y = clamp(
        directEditInteraction.startY + dy,
        SAFE.y,
        SAFE.y + SAFE.height - inst.h
      );

      updatePatternNodeLive(inst);
      updateSelectionOverlay();
      queueSnapshotSave();
      return;
    }

    if (directEditInteraction.mode === 'pattern-stretch') {
      const i = directEditInteraction;
      const inst = state.patterns.find(x => x.id === i.patternId);
      if (!inst) return;

      const safeLeft = SAFE.x;
      const safeRight = SAFE.x + SAFE.width;
      const dx = p.x - i.startRight;

      let desiredLeft = i.startLeft - dx;
      let desiredRight = i.startRight + dx;

      desiredLeft = clamp(desiredLeft, safeLeft, safeRight - 8);
      desiredRight = clamp(desiredRight, desiredLeft + 8, safeRight);

      if (p.x > safeRight) {
        desiredRight = safeRight;
        desiredLeft = clamp(
          i.startLeft - (p.x - i.startRight),
          safeLeft,
          desiredRight - 8
        );
      }

      inst.x = desiredLeft;
      inst.w = Math.max(8, desiredRight - desiredLeft);

      updatePatternNodeLive(inst);
      updateSelectionOverlay();
      queueSnapshotSave();
      return;
    }

    if (directEditInteraction.mode === 'pattern-resize') {
      const i = directEditInteraction;
      const inst = state.patterns.find(x => x.id === i.patternId);
      if (!inst) return;

      /*
        A minta mindig méretarányosan nő/kicsinyedik.
        Az ellentétes sarok fix.
        A maximális méretet a FEHÉR szaggatott Biztonsági zóna adja.
      */
      const safeLeft = SAFE.x;
      const safeRight = SAFE.x + SAFE.width;
      const safeTop = SAFE.y;
      const safeBottom = SAFE.y + SAFE.height;

      const availableW = i.isLeftHandle
        ? i.anchorX - safeLeft
        : safeRight - i.anchorX;

      const availableH = i.isTopHandle
        ? i.anchorY - safeTop
        : safeBottom - i.anchorY;

      const desiredW = Math.max(8, Math.abs(p.x - i.anchorX));
      const desiredH = Math.max(8, Math.abs(p.y - i.anchorY));

      const desiredScale = Math.max(
        desiredW / Math.max(1, i.startW),
        desiredH / Math.max(1, i.startH)
      );

      const maxScale = Math.max(
        .05,
        Math.min(
          availableW / Math.max(1, i.startW),
          availableH / Math.max(1, i.startH)
        )
      );

      const scale = clamp(desiredScale, .1, maxScale);

      const newW = i.startW * scale;
      const newH = i.startH * scale;

      inst.w = newW;
      inst.h = newH;

      inst.x = i.isLeftHandle
        ? i.anchorX - newW
        : i.anchorX;

      inst.y = i.isTopHandle
        ? i.anchorY - newH
        : i.anchorY;

      /*
        Végső védőkorlát: pontosan a fehér Biztonsági zónán belül.
      */
      inst.x = clamp(inst.x, safeLeft, safeRight - inst.w);
      inst.y = clamp(inst.y, safeTop, safeBottom - inst.h);

      updatePatternNodeLive(inst);
      updateSelectionOverlay();
      queueSnapshotSave();
      return;
    }
  }

  function endDirectEdit(evt) {
    if (!directEditInteraction) return;

    const completedMode = directEditInteraction.mode;

    try { els.designSvg.releasePointerCapture(evt.pointerId); } catch (_) {}
    directEditInteraction = null;
    els.previewText.classList.remove('dragging');

    if (completedMode.startsWith('pattern-')) {
      render();
    } else if (completedMode === 'text-stretch') {
      constrainTextToSafeZone(false);
    } else {
      constrainTextToSafeZone(true);
    }

    queueSnapshotSave();
    updateSelectionOverlay();
  }

  function setupDirectEditing() {
    els.previewText.style.pointerEvents = 'auto';
    els.previewText.addEventListener('pointerdown', startDirectTextDrag);
    els.patternLayer?.addEventListener('pointerdown', startPatternDrag);

    els.designSvg.addEventListener('pointermove', moveDirectEdit);
    els.designSvg.addEventListener('pointerup', endDirectEdit);
    els.designSvg.addEventListener('pointercancel', endDirectEdit);

    els.designSvg.addEventListener('pointerdown', evt => {
      if (
        evt.target === els.designSvg ||
        evt.target.classList.contains('board-bg') ||
        evt.target.classList.contains('board-edge') ||
        evt.target.classList.contains('safe-zone')
      ) {
        selectedObject = { type:'text', id:null };
        updateSelectionOverlay();
        renderPatternChoices();
      }
    });

    els.previewText.addEventListener('click', () => {
      selectedObject = { type:'text', id:null };
      updateSelectionOverlay();
      renderPatternChoices();
    });
  }


  function bbox() {
    return textVisualBox();
  }

  function autoFit(showMessage = true) {
    state.xPct = 50;
    state.yPct = 50;

    render();

    requestAnimationFrame(() => {
      let box = textVisualBox();
      if (!box) return;

      const maxW = SAFE.width - 0.4;
      const maxH = SAFE.height - 0.4;

      if (box.width > maxW || box.height > maxH) {
        const factor = Math.min(maxW / box.width, maxH / box.height);
        state.fontSize = clamp(state.fontSize * factor, 18, 420);
      }

      render();
      constrainTextToSafeZone(true);

      if (showMessage) {
        setStatus('A felirat a teljes szaggatott gyártási területre lett illesztve.', 'good');
      }
    });
  }

  function constrainTextToSafeZone(allowShrink) {
    requestAnimationFrame(() => {
      let box = textVisualBox();
      if (!box) return;

      const maxW = SAFE.width - 0.4;
      const maxH = SAFE.height - 0.4;

      if (allowShrink && box.width > maxW) {
        state.textScaleX = clamp(
          state.textScaleX * (maxW / box.width),
          .25,
          6
        );
        render();
        box = textVisualBox();
        if (!box) return;
      }

      if (allowShrink && box.height > maxH) {
        const widthBefore = box.width;
        const oldFontSize = state.fontSize;

        state.fontSize = clamp(
          state.fontSize * (maxH / box.height),
          18,
          280
        );

        const fontRatio =
          state.fontSize /
          Math.max(1, oldFontSize);

        /*
          Magasságkorrekció közben megtartjuk a felirat
          vízszintes méretét, hogy ne ugorjon vissza keskenyebbre.
        */
        state.textScaleX = clamp(
          state.textScaleX /
          Math.max(.01, fontRatio),
          .25,
          6
        );

        render();
        box = textVisualBox();
        if (!box) return;

        if (box.width > maxW) {
          state.textScaleX = clamp(
            state.textScaleX * (maxW / box.width),
            .25,
            6
          );
          render();
          box = textVisualBox();
          if (!box) return;
        }
      }

      let dx = 0;
      let dy = 0;

      if (box.x < SAFE.x) dx = SAFE.x - box.x;
      if (box.x + box.width > SAFE.x + SAFE.width) {
        dx = SAFE.x + SAFE.width - (box.x + box.width);
      }
      if (box.y < SAFE.y) dy = SAFE.y - box.y;
      if (box.y + box.height > SAFE.y + SAFE.height) {
        dy = SAFE.y + SAFE.height - (box.y + box.height);
      }

      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) {
        state.xPct = clamp(state.xPct + dx / SAFE.width * 100, 0, 100);
        state.yPct = clamp(state.yPct + dy / SAFE.height * 100, 0, 100);
        render();
      } else {
        updateSelectionOverlay();
      }
    });
  }

  function reset() {
    Object.assign(state, {
      text:'PETI',
      fontId:'bahnschrift',
      engraving:'outline',
      patterns:[],
      led:'blue',
      fontSize:68,
      textScaleX:1,
      xPct:50,
      yPct:50,
      showSafe:true
    });

    selectedObject = { type:'text', id:null };
    els.textInput.value = state.text;
    els.fontSelect.value = state.fontId;
    els.safeZoneToggle.checked = true;
    renderPatternChoices();
    render();
    autoFit(false);
    setStatus('Alaphelyzet visszaállítva.', 'good');
  }


  function loadFont(def) {
    if (!def || !window.opentype) return Promise.resolve(null);
    if (fontCache.has(def.id)) return fontCache.get(def.id);

    const urls = Array.isArray(def.urls) ? def.urls.slice() : (def.url ? [def.url] : []);

    const promise = new Promise(resolve => {
      const tryNext = () => {
        const url = urls.shift();
        if (!url) {
          resolve(null);
          return;
        }

        window.opentype.load(url, (err, font) => {
          if (!err && font) resolve(font);
          else tryNext();
        });
      };

      tryNext();
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
      return '<g transform="translate(' + center.x.toFixed(3) + ' 0) scale(' +
        state.textScaleX.toFixed(4) + ' 1) translate(' + (-center.x).toFixed(3) + ' 0)">' +
        '<text x="' + pos.x.toFixed(2) + '" y="' + pos.y.toFixed(2) + '" text-anchor="middle" font-family="' +
        escapeXml(fontDef.family.split(',')[0].replace(/["']/g,'')) + '" font-size="' + state.fontSize +
        '" font-weight="' + fontDef.weight + '" ' + paintAttrs + '>' + escapeXml(text) + '</text></g>';
    }

    const path = font.getPath(text, 0, 0, state.fontSize, { kerning:true });
    const box = path.getBoundingBox();
    const cx = (box.x1 + box.x2) / 2;
    const cy = (box.y1 + box.y2) / 2;

    return '<g transform="translate(' + center.x.toFixed(3) + ' ' + center.y.toFixed(3) + ') scale(' +
      state.textScaleX.toFixed(4) + ' 1) translate(' + (-cx).toFixed(3) + ' ' + (-cy).toFixed(3) + ')">' +
      '<path d="' + path.toPathData(3) + '" ' + paintAttrs + '/></g>';
  }

  async function productionPatternMarkup() {
    const parts = [];

    for (const inst of state.patterns) {
      const def = patternDef(inst.patternId);
      if (!def) continue;

      const raw = await loadPatternSvg(def);
      const parsed = new DOMParser().parseFromString(raw, 'image/svg+xml');
      const source = parsed.documentElement;

      if (!source || source.nodeName.toLowerCase() !== 'svg') {
        throw new Error('A kiválasztott minta SVG-je hibás: ' + def.label);
      }

      source.querySelectorAll('metadata,script,foreignObject').forEach(node => node.remove());
      recolorSvgNode(source, '#000000');

      const viewBox = source.getAttribute('viewBox') || '0 0 100 100';
      const inner = Array.from(source.childNodes)
        .map(node => new XMLSerializer().serializeToString(node))
        .join('');

      const transform = inst.flipX
        ? 'translate(' + (inst.x + inst.w).toFixed(3) + ' ' + inst.y.toFixed(3) + ') scale(-1 1)'
        : 'translate(' + inst.x.toFixed(3) + ' ' + inst.y.toFixed(3) + ')';

      parts.push(
        '<g transform="' + transform + '" data-role="minta" data-pattern="' + escapeXml(def.label) + '">' +
        '<svg x="0" y="0" width="' + inst.w.toFixed(3) + '" height="' + inst.h.toFixed(3) +
        '" viewBox="' + escapeXml(viewBox) + '" preserveAspectRatio="xMidYMid meet" overflow="visible">' +
        inner + '</svg></g>'
      );
    }

    return parts.join('\n  ');
  }


  async function serializeProductionSvg() {
    const textMarkup = await productionTextMarkup();
    const patternMarkup = await productionPatternMarkup();

    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
      '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="490mm" height="120mm" viewBox="0 0 490 120" ' +
      'data-design-id="' + escapeXml(state.id) + '" data-led="' + escapeXml(selectedLed().label) + '" data-engraving="' +
      escapeXml(state.engraving === 'outline' ? 'Kontúr gravírozás' : 'Telibe gravírozott') + '">\n' +
      '  <!-- Lakás Dekor – Kamionos LED tábla -->\n' +
      '  <!-- Tervazonosító: ' + escapeXml(state.id) + ' -->\n' +
      '  <!-- Gyártási terület: bal/jobb 50 mm, felül 14 mm, alul 5 mm -->\n' +
      '  <rect x="0.2" y="0.2" width="489.6" height="119.6" fill="none" stroke="#000000" stroke-width="0.4" data-role="tabla-kontur"/>\n' +
      (patternMarkup ? '  ' + patternMarkup + '\n' : '') +
      '  ' + textMarkup + '\n' +
      '</svg>';
  }

  function previewSvgString() {
    const clone = els.designSvg.cloneNode(true);
    clone.querySelector('#safeZone')?.remove();
    clone.querySelector('#selectionLayer')?.remove();
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
      'Betűszélesség: ' + Math.round(state.textScaleX * 100) + '%',
      'Gravírozás: ' + (state.engraving === 'outline' ? 'Kontúr gravírozás' : 'Telibe gravírozott'),
      'Minták: ' + (state.patterns.length
        ? state.patterns.map(p => {
            const d = patternDef(p.patternId);
            return (d ? d.label : p.patternId) + (p.flipX ? ' (tükrözve)' : '');
          }).join(', ')
        : 'Nincs minta'),
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
      fd.append('betuszelesseg', Math.round(state.textScaleX * 100) + '%');
      fd.append('gravirozas', state.engraving === 'outline' ? 'Kontúr gravírozás' : 'Telibe gravírozott');
      fd.append('mintak', state.patterns.length
        ? state.patterns.map(p => {
            const d = patternDef(p.patternId);
            return (d ? d.label : p.patternId) + (p.flipX ? ' (tükrözve)' : '');
          }).join(', ')
        : 'Nincs minta');
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
    url.searchParams.set('kamionminta', state.patterns.map(p => p.patternId).join(','));
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

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      render();
      updateSelectionOverlay();
    }).catch(() => {});
  }

  if (missingEditDesign) {
    setStatus('A korábbi terv ebben a böngészőben már nem érhető el, ezért biztonsági okból új tervazonosítóval indult egy új terv.', 'warn');
  }

  setTimeout(() => autoFit(false), 80);
})();