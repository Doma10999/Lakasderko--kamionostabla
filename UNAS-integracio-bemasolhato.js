(function () {
  'use strict';

  /*
    LAKÁS DEKOR – KAMIONOS LED TÁBLA / UNAS
    V1 – végleges kamionos tervező integráció

    UNAS termék:
    https://falmatrica-lakasdekor.hu/Tervezd-meg-sajatodat

    Kamionos tervező:
    https://lakasderko--kamionostabla.lakasdekor.workers.dev/

    FONTOS:
    A termékhez legyen egy SZÖVEGBEVITELI termékparaméter:
    Név: Tervazonosító
    Ezt a script kitölti és vizuálisan elrejti.
  */

  const CFG = {
    productPath: '/Tervezd-meg-sajatodat',
    productSku: 'FL340481',
    designerUrl: 'https://lakasderko--kamionostabla.lakasdekor.workers.dev/',
    storageKey: 'lakasDekorKamionosLedTervV1',
    ledOptions: {
      blue: 'Kék',
      green: 'Zöld',
      red: 'Piros',
      white: 'Fehér',
      rgb: 'RGB'
    },
    engravingOptions: {
      outline: 'Kontúr gravírozás',
      fill: 'Telibe gravírozott'
    }
  };

  const norm = value => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const txt = el => String((el && (el.textContent || el.value)) || '')
    .replace(/\s+/g, ' ')
    .trim();

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[ch]));

  const qs = new URLSearchParams(location.search || '');
  const isProductPage =
    String(location.pathname || '').replace(/\/$/, '').toLowerCase() === CFG.productPath.toLowerCase() ||
    document.body.innerText.includes(CFG.productSku);

  if (!isProductPage) return;

  const state = {
    id: String(qs.get('kamionterv') || '').trim(),
    text: String(qs.get('kamionnev') || '').trim(),
    font: String(qs.get('kamionfont') || '').trim(),
    led: String(qs.get('kamionled') || '').trim(),
    engraving: String(qs.get('kamiongrav') || '').trim(),
    price: Math.max(0, Number(qs.get('kamionar') || 0))
  };

  function saveState() {
    if (!state.id) return;
    try { sessionStorage.setItem(CFG.storageKey, JSON.stringify(state)); } catch (_) {}
    try { localStorage.setItem(CFG.storageKey, JSON.stringify(state)); } catch (_) {}
  }

  function restoreState() {
    if (state.id) return;
    let raw = '';
    try { raw = sessionStorage.getItem(CFG.storageKey) || ''; } catch (_) {}
    if (!raw) {
      try { raw = localStorage.getItem(CFG.storageKey) || ''; } catch (_) {}
    }
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data && data.id) Object.assign(state, data);
    } catch (_) {}
  }

  restoreState();
  if (state.id) saveState();

  function fire(el) {
    if (!el) return;
    ['input','change','keyup','blur'].forEach(name => {
      try { el.dispatchEvent(new Event(name, { bubbles:true })); } catch (_) {}
    });
    try {
      if (window.jQuery) window.jQuery(el).trigger('input').trigger('change').trigger('keyup').trigger('blur');
    } catch (_) {}
  }

  function setNativeValue(el, value) {
    if (!el) return;
    try {
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) desc.set.call(el, value);
      else el.value = value;
    } catch (_) {
      el.value = value;
    }
  }

  function designerLink(editId) {
    const url = new URL(CFG.designerUrl);
    url.searchParams.set('return', location.origin + CFG.productPath);
    if (editId) url.searchParams.set('edit', editId);
    return url.toString();
  }

  function cartButtons() {
    return [...document.querySelectorAll('button,a,input[type="submit"],input[type="button"]')]
      .filter(el => /\bkosárba\b|\bkosarba\b/i.test(txt(el)));
  }

  function cartButton() {
    return cartButtons()[0] || null;
  }

  function productForm() {
    const btn = cartButton();
    if (btn?.closest) {
      const f = btn.closest('form');
      if (f) return f;
    }
    return document.querySelector('form[action*="cart" i], form[action*="basket" i]') || null;
  }

  function selectScore(select, labels) {
    const options = [...(select?.options || [])].map(o => norm(txt(o)));
    return labels.reduce((score, label) => score + (options.some(o => o === norm(label) || o.includes(norm(label))) ? 1 : 0), 0);
  }

  function findLedSelect() {
    const labels = ['Kék','Zöld','Piros','Fehér','RGB'];
    return [...document.querySelectorAll('select')]
      .map(select => ({ select, score:selectScore(select, labels) }))
      .sort((a,b) => b.score - a.score)
      .find(x => x.score >= 4)?.select || null;
  }

  function findEngravingSelect() {
    const labels = ['Kontúr gravírozás','Telibe gravírozott'];
    return [...document.querySelectorAll('select')]
      .map(select => ({ select, score:selectScore(select, labels) }))
      .sort((a,b) => b.score - a.score)
      .find(x => x.score >= 2)?.select || null;
  }

  function setSelectByText(select, label) {
    if (!select || !label) return false;
    const wanted = norm(label);
    const option = [...select.options].find(o => {
      const t = norm(txt(o));
      return t === wanted || t.includes(wanted) || wanted.includes(t);
    });
    if (!option) return false;
    select.value = option.value;
    option.selected = true;
    fire(select);
    return true;
  }

  function visuallyHideChoiceRow(select, captionWords) {
    if (!select) return;

    const words = (captionWords || []).map(norm);
    let target = select;

    // Walk upward to the smallest wrapper that contains this select and its caption,
    // but avoid hiding a large product-info container.
    let p = select.parentElement;
    for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
      const t = norm(txt(p));
      const selectCount = p.querySelectorAll ? p.querySelectorAll('select').length : 0;
      const hit = words.some(w => t.includes(w));
      if (hit && selectCount <= 1 && t.length < 220) {
        target = p;
        break;
      }
    }

    target.style.setProperty('display','none','important');
    target.style.setProperty('visibility','hidden','important');
    target.style.setProperty('height','0','important');
    target.style.setProperty('min-height','0','important');
    target.style.setProperty('margin','0','important');
    target.style.setProperty('padding','0','important');
    target.style.setProperty('overflow','hidden','important');

    // Hide a separate caption too, if UNAS renders it outside the select wrapper.
    [...document.querySelectorAll('label,div,span,p,strong,b')].forEach(node => {
      const own = norm(txt(node).replace(/\s*[:：]\s*$/, ''));
      if (!own || own.length > 70) return;
      if (words.some(w => own === w || own.startsWith(w + ' '))) {
        if (!node.contains(select) && !select.contains(node)) {
          node.style.setProperty('display','none','important');
        }
      }
    });
  }

  function hideNativeDesignerChoices() {
    visuallyHideChoiceRow(findLedSelect(), ['LED színe', 'LED szin']);
    visuallyHideChoiceRow(findEngravingSelect(), ['Gravírozás', 'Gravirozas']);
  }

  const DESIGN_RX = /terv\s*azonos[ií]t[oó]|tervazonos[ií]t[oó]/i;

  function fieldContext(el) {
    let out = [el?.name, el?.id, el?.getAttribute?.('aria-label'), el?.getAttribute?.('data-name')].filter(Boolean).join(' ');
    let p = el?.parentElement;
    for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
      const t = txt(p);
      if (t && t.length < 600) out += ' ' + t;
    }
    return out;
  }

  function findDesignInput() {
    const controls = [...document.querySelectorAll('input[type="text"],input:not([type]),textarea,input[type="hidden"]')];

    const direct = controls.find(el => DESIGN_RX.test(fieldContext(el)));
    if (direct) return direct;

    const labels = [...document.querySelectorAll('label,div,span,p,strong,b')].filter(node => {
      const t = txt(node).replace(/\s*[:：]\s*$/, '');
      return t.length <= 70 && DESIGN_RX.test(t);
    });

    for (const label of labels) {
      if (label.tagName === 'LABEL') {
        try { if (label.control) return label.control; } catch (_) {}
        const forId = label.getAttribute('for');
        if (forId) {
          const el = document.getElementById(forId);
          if (el?.matches?.('input,textarea')) return el;
        }
      }
      const parent = label.parentElement;
      if (!parent) continue;
      const candidates = [...parent.querySelectorAll('input[type="text"],input:not([type]),textarea,input[type="hidden"]')]
        .filter(el => !['checkbox','radio','submit','button'].includes(el.type));
      if (candidates.length === 1) return candidates[0];
    }
    return null;
  }

  function hideDesignParameter(input) {
    if (!input || input.type === 'hidden') return;
    let target = input;
    const parent = input.parentElement;
    if (parent && parent.querySelectorAll('input,textarea').length === 1 && DESIGN_RX.test(txt(parent))) target = parent;

    target.style.setProperty('position','absolute','important');
    target.style.setProperty('left','-10000px','important');
    target.style.setProperty('width','1px','important');
    target.style.setProperty('height','1px','important');
    target.style.setProperty('overflow','hidden','important');
    target.style.setProperty('opacity','0','important');
    target.style.setProperty('pointer-events','none','important');
    target.style.setProperty('margin','0','important');
    target.style.setProperty('padding','0','important');
    target.style.setProperty('border','0','important');
  }

  function ensureNativeMirror(input) {
    if (!input?.name || !state.id) return null;
    const form = productForm();
    if (!form) return null;

    if (input.closest?.('form') === form) return input;

    let mirror = form.querySelector('input[data-kamion-design-mirror="1"]');
    if (!mirror) {
      mirror = document.createElement('input');
      mirror.type = 'hidden';
      mirror.dataset.kamionDesignMirror = '1';
      form.appendChild(mirror);
    }
    mirror.name = input.name;
    mirror.value = state.id;
    mirror.setAttribute('value', state.id);
    return mirror;
  }

  function writeDesignId() {
    if (!state.id) return false;
    const input = findDesignInput();
    if (!input) {
      console.warn('[Kamionos LED tervező] Nem található a natív „Tervazonosító” szövegparaméter.');
      return false;
    }

    input.disabled = false;
    input.removeAttribute('disabled');
    input.readOnly = false;
    input.removeAttribute('readonly');

    setNativeValue(input, state.id);
    input.setAttribute('value', state.id);
    input.dataset.kamionDesignId = '1';
    fire(input);
    ensureNativeMirror(input);
    hideDesignParameter(input);

    return String(input.value || '').trim() === state.id;
  }

  function ensureDesignerButton() {
    if (document.getElementById('kamion-designer-button')) return;
    const cart = cartButton();
    if (!cart?.parentElement) return;

    const btn = document.createElement('button');
    btn.id = 'kamion-designer-button';
    btn.type = 'button';
    btn.textContent = state.id ? 'Terv módosítása' : 'Tervezés';
    btn.style.cssText = [
      'width:100%',
      'margin:0 0 10px',
      'padding:14px 18px',
      'border:1px solid #111',
      'border-radius:10px',
      'background:#fff',
      'color:#111',
      'font-weight:800',
      'cursor:pointer'
    ].join(';');

    btn.addEventListener('click', () => {
      location.href = designerLink(state.id || '');
    });

    cart.parentElement.insertBefore(btn, cart);
  }

  function summaryBox() {
    const old = document.getElementById('kamion-plan-summary');
    if (!state.id) {
      old?.remove();
      return;
    }

    let box = old;
    if (!box) {
      box = document.createElement('div');
      box.id = 'kamion-plan-summary';
      box.style.cssText = [
        'margin:10px 0',
        'padding:12px 14px',
        'border:1px solid #b8d7bf',
        'border-radius:10px',
        'background:#eef8f0',
        'color:#286b36',
        'font-size:13px',
        'line-height:1.5'
      ].join(';');
      const cart = cartButton();
      cart?.parentElement?.insertBefore(box, cart);
    }

    const ledLabel = CFG.ledOptions[state.led] || state.led || '—';
    const gravLabel = CFG.engravingOptions[state.engraving] || state.engraving || '—';

    box.innerHTML =
      '<strong>✓ Terv elmentve</strong><br>' +
      'Tervazonosító: <b>' + esc(state.id) + '</b><br>' +
      'Felirat: <b>' + esc(state.text || '—') + '</b><br>' +
      'LED színe: <b>' + esc(ledLabel) + '</b><br>' +
      'Gravírozás: <b>' + esc(gravLabel) + '</b><br>' +
      'Végleges egységár: <b>' + new Intl.NumberFormat('hu-HU').format(state.price || 8500) + ' Ft</b>';
  }

  function applyReturnedDesign() {
    if (!state.id) return;

    const ledLabel = CFG.ledOptions[state.led] || state.led;
    const gravLabel = CFG.engravingOptions[state.engraving] || state.engraving;

    const ledSelect = findLedSelect();
    const engravingSelect = findEngravingSelect();

    setSelectByText(ledSelect, ledLabel);
    setSelectByText(engravingSelect, gravLabel);
    hideNativeDesignerChoices();
    writeDesignId();
    summaryBox();

    const btn = document.getElementById('kamion-designer-button');
    if (btn) btn.textContent = 'Terv módosítása';
  }

  function install() {
    ensureDesignerButton();
    hideNativeDesignerChoices();
    if (state.id) applyReturnedDesign();
    else summaryBox();
  }

  install();

  let runs = 0;
  const observer = new MutationObserver(() => {
    if (++runs > 80) return;
    ensureDesignerButton();
    hideNativeDesignerChoices();
    if (state.id) {
      writeDesignId();
      summaryBox();
    }
  });

  observer.observe(document.body, { childList:true, subtree:true });
  setTimeout(() => observer.disconnect(), 15000);
})();