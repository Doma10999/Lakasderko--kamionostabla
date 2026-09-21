(function () {
  'use strict';

  /*
    LAKÁS DEKOR – KAMIONOS LED TÁBLA / UNAS
    V4 – mobilbarát, stabil rendelési integráció a házszámtábla-tervező bevált logikája alapján

    FONTOS:
    - UNAS beszúrás: body end
    - MINDEN OLDALON legyen beszúrva
    - Termék: /Tervezd-meg-sajatodat
    - Cikkszám: FL340481
    - Natív UNAS szövegparaméter: Tervazonosító
    - Elsődlegesen a korábbi globális paraméterazonosítót keressük: 8849701
    - LED színe és Gravírozás valódi UNAS választható tulajdonság marad.
      A script beállítja őket, majd csak vizuálisan rejti el.
  */

  const CFG = {
    version: '20260921-kamion-v4-mobile-stabil',
    productPath: '/Tervezd-meg-sajatodat',
    productNameRx: /tervezd\s+meg\s+saj[aá]todat/i,
    productSkuRx: /FL340481/i,
    designerUrl: 'https://lakasderko--kamionostabla.lakasdekor.workers.dev/',
    storageKey: 'lakasDekorKamionosLedTervV3',
    nativeParamId: '8849701',
    nativeParamLabel: 'Tervazonosító',
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
    },
    prices: {
      standard: 8500,
      rgb: 11150
    }
  };

  const pathLower = String(location.pathname || '').replace(/\/$/, '').toLowerCase();
  const isProductPage =
    pathLower === CFG.productPath.toLowerCase() ||
    pathLower.includes(CFG.productPath.toLowerCase());

  if (!isProductPage) return;

  const qs = new URLSearchParams(location.search || '');
  let installing = false;
  let cartRetryCount = 0;

  function txt(el) {
    return String((el && (el.textContent || el.value)) || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function norm(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[ch];
    });
  }

  function huf(value) {
    return new Intl.NumberFormat('hu-HU').format(Math.round(Number(value) || 0)) + ' Ft';
  }

  function fire(el) {
    if (!el) return;

    ['input', 'change', 'keyup', 'blur'].forEach(function (eventName) {
      try {
        el.dispatchEvent(new Event(eventName, { bubbles: true }));
      } catch (_) {}
    });

    try {
      if (window.jQuery) {
        window.jQuery(el)
          .trigger('input')
          .trigger('change')
          .trigger('keyup')
          .trigger('blur');
      }
    } catch (_) {}
  }

  function setNativeValue(el, value) {
    if (!el) return;

    try {
      const proto = el.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;

      const desc = Object.getOwnPropertyDescriptor(proto, 'value');

      if (desc && desc.set) {
        desc.set.call(el, value);
      } else {
        el.value = value;
      }
    } catch (_) {
      el.value = value;
    }
  }

  function setButtonText(button, value) {
    if (!button) return;
    if (button.tagName === 'INPUT') button.value = value;
    else button.textContent = value;
  }

  const state = {
    id: String(qs.get('kamionterv') || '').trim(),
    text: String(qs.get('kamionnev') || '').trim(),
    font: String(qs.get('kamionfont') || '').trim(),
    led: String(qs.get('kamionled') || '').trim(),
    engraving: String(qs.get('kamiongrav') || '').trim(),
    price: Math.max(0, Math.round(Number(qs.get('kamionar') || 0)))
  };

  if (!state.price && state.id) {
    state.price = state.led === 'rgb' ? CFG.prices.rgb : CFG.prices.standard;
  }

  state.hasDesign = Boolean(state.id && state.price > 0);

  function currentData() {
    return {
      id: state.id,
      text: state.text,
      font: state.font,
      led: state.led,
      engraving: state.engraving,
      price: state.price,
      at: Date.now()
    };
  }

  function saveDesign() {
    if (!state.hasDesign) return;
    const raw = JSON.stringify(currentData());

    try {
      sessionStorage.setItem(CFG.storageKey, raw);
    } catch (_) {}

    try {
      localStorage.setItem(CFG.storageKey, raw);
    } catch (_) {}
  }

  if (state.hasDesign) saveDesign();

  function designerLink(editId) {
    const url = new URL(CFG.designerUrl);
    url.searchParams.set('v', CFG.version);
    url.searchParams.set('return', location.origin + CFG.productPath);

    if (editId) {
      url.searchParams.set('edit', editId);
    }

    return url.toString();
  }

  function cartButtons() {
    return Array.from(
      document.querySelectorAll('button,a,input[type="submit"],input[type="button"]')
    ).filter(function (el) {
      const t = txt(el).toLowerCase();
      return /\bkosárba\b|\bkosarba\b/.test(t) || el.dataset.kamionCart === '1';
    });
  }

  function cartButton() {
    return cartButtons()[0] || null;
  }

  function productForm() {
    const btn = cartButton();

    if (btn && btn.closest) {
      const form = btn.closest('form');
      if (form) return form;
    }

    const forms = Array.from(document.querySelectorAll('form'));
    const productFormMatch = forms.find(function (form) {
      const t = txt(form);
      return CFG.productNameRx.test(t) || CFG.productSkuRx.test(t);
    });

    return productFormMatch ||
      document.querySelector('form[action*="cart" i],form[action*="basket" i]') ||
      null;
  }

  function selectScore(select, labels) {
    const options = Array.from(select?.options || []).map(function (o) {
      return norm(txt(o));
    });

    return labels.reduce(function (score, label) {
      const wanted = norm(label);
      return score + (options.some(function (o) {
        return o === wanted || o.includes(wanted);
      }) ? 1 : 0);
    }, 0);
  }

  function findLedSelect() {
    const labels = ['Kék', 'Zöld', 'Piros', 'Fehér', 'RGB'];

    const candidates = Array.from(document.querySelectorAll('select'))
      .map(function (select) {
        return { select: select, score: selectScore(select, labels) };
      })
      .filter(function (item) {
        return item.score >= 4;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });

    return candidates.length ? candidates[0].select : null;
  }

  function findEngravingSelect() {
    const labels = ['Kontúr gravírozás', 'Telibe gravírozott'];

    const candidates = Array.from(document.querySelectorAll('select'))
      .map(function (select) {
        return { select: select, score: selectScore(select, labels) };
      })
      .filter(function (item) {
        return item.score >= 2;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });

    return candidates.length ? candidates[0].select : null;
  }

  function findOptionByText(select, label) {
    if (!select || !label) return null;
    const wanted = norm(label);

    return Array.from(select.options || []).find(function (option) {
      const t = norm(txt(option));
      return t === wanted || t.includes(wanted) || wanted.includes(t);
    }) || null;
  }

  function directText(el) {
    if (!el || !el.childNodes) return '';

    return Array.from(el.childNodes)
      .filter(function (node) {
        return node.nodeType === Node.TEXT_NODE;
      })
      .map(function (node) {
        return String(node.nodeValue || '');
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hideExactCaption(names, datasetKey) {
    const wanted = names.map(norm);

    Array.from(document.querySelectorAll('label,div,span,p,strong,b')).forEach(function (el) {
      const own = norm(
        directText(el)
          .replace(/\s*[:：]\s*$/, '')
          .trim()
      );

      if (wanted.indexOf(own) !== -1) {
        el.style.setProperty('display', 'none', 'important');
        if (datasetKey) el.dataset[datasetKey] = '1';
      }
    });
  }

  function hideSelectRow(select, names, datasetKey) {
    if (!select) return;

    const wrapper = select.parentElement;

    if (wrapper) {
      const selectCount = wrapper.querySelectorAll
        ? wrapper.querySelectorAll('select').length
        : 0;

      if (selectCount === 1) {
        wrapper.style.setProperty('display', 'none', 'important');
        wrapper.style.setProperty('visibility', 'hidden', 'important');
        wrapper.style.setProperty('height', '0', 'important');
        wrapper.style.setProperty('min-height', '0', 'important');
        wrapper.style.setProperty('max-height', '0', 'important');
        wrapper.style.setProperty('margin', '0', 'important');
        wrapper.style.setProperty('padding', '0', 'important');
        wrapper.style.setProperty('border', '0', 'important');
        wrapper.style.setProperty('overflow', 'hidden', 'important');
        if (datasetKey) wrapper.dataset[datasetKey] = '1';
      } else {
        select.style.setProperty('position', 'absolute', 'important');
        select.style.setProperty('left', '-10000px', 'important');
        select.style.setProperty('width', '1px', 'important');
        select.style.setProperty('height', '1px', 'important');
        select.style.setProperty('opacity', '0', 'important');
        select.style.setProperty('pointer-events', 'none', 'important');
      }
    } else {
      select.style.setProperty('position', 'absolute', 'important');
      select.style.setProperty('left', '-10000px', 'important');
      select.style.setProperty('width', '1px', 'important');
      select.style.setProperty('height', '1px', 'important');
      select.style.setProperty('opacity', '0', 'important');
      select.style.setProperty('pointer-events', 'none', 'important');
    }

    hideExactCaption(names, datasetKey + 'Caption');
  }

  function applyChoice(select, label, hideNames, datasetKey) {
    if (!select) {
      return { ok: false, changed: false };
    }

    hideSelectRow(select, hideNames, datasetKey);

    if (!state.hasDesign) {
      return { ok: true, changed: false };
    }

    const option = findOptionByText(select, label);

    if (!option) {
      return { ok: false, changed: false };
    }

    const changed = select.value !== option.value;

    if (changed) {
      select.value = option.value;
      option.selected = true;
      fire(select);
    }

    return { ok: true, changed: changed };
  }

  function applyLed() {
    const label = CFG.ledOptions[state.led] || state.led || '';
    return applyChoice(
      findLedSelect(),
      label,
      ['LED színe', 'LED szin'],
      'kamionLedHidden'
    );
  }

  function applyEngraving() {
    const label = CFG.engravingOptions[state.engraving] || state.engraving || '';
    return applyChoice(
      findEngravingSelect(),
      label,
      ['Gravírozás', 'Gravirozas'],
      'kamionGravHidden'
    );
  }

  function hideNativeChoices() {
    const led = findLedSelect();
    const grav = findEngravingSelect();

    if (led) {
      hideSelectRow(led, ['LED színe', 'LED szin'], 'kamionLedHidden');
    }

    if (grav) {
      hideSelectRow(grav, ['Gravírozás', 'Gravirozas'], 'kamionGravHidden');
    }
  }

  const DESIGN_ID_RX = /terv\s*azonos[ií]t[oó]|tervazonos[ií]t[oó]/i;

  function uniquePush(list, el) {
    if (!el || !el.matches || !el.matches('input,textarea')) return;
    if (list.indexOf(el) === -1) list.push(el);
  }

  function directInputsFrom(node) {
    const out = [];
    if (!node) return out;

    if (node.matches && node.matches('input,textarea')) {
      uniquePush(out, node);
    }

    if (node.querySelectorAll) {
      node.querySelectorAll('input[type="text"],input:not([type]),textarea,input[type="hidden"]')
        .forEach(function (el) {
          uniquePush(out, el);
        });
    }

    return out;
  }

  function findDesignIdInputs() {
    const id = String(CFG.nativeParamId || '').trim();
    const found = [];

    if (id) {
      const selectors = [
        'input[name*="' + id + '"]',
        'textarea[name*="' + id + '"]',
        'input[id*="' + id + '"]',
        'textarea[id*="' + id + '"]',
        'input[data-param-id="' + id + '"]',
        'textarea[data-param-id="' + id + '"]',
        'input[data-parameter-id="' + id + '"]',
        'textarea[data-parameter-id="' + id + '"]',
        'input[data-param="' + id + '"]',
        'textarea[data-param="' + id + '"]',
        'input[data-id="' + id + '"]',
        'textarea[data-id="' + id + '"]'
      ];

      selectors.forEach(function (selector) {
        try {
          document.querySelectorAll(selector).forEach(function (el) {
            uniquePush(found, el);
          });
        } catch (_) {}
      });

      if (found.length) return found;
    }

    const labels = Array.from(document.querySelectorAll('label,div,span,p,strong,b'))
      .filter(function (node) {
        const t = txt(node).replace(/\s*[:：]\s*$/, '').trim();
        return t.length <= 60 && DESIGN_ID_RX.test(t);
      });

    labels.forEach(function (label) {
      if (label.tagName === 'LABEL') {
        try {
          if (label.control) uniquePush(found, label.control);
        } catch (_) {}

        const forId = label.getAttribute('for');
        if (forId) {
          uniquePush(found, document.getElementById(forId));
        }
      }

      const parent = label.parentElement;
      if (!parent) return;

      const candidates = directInputsFrom(parent).filter(function (input) {
        return input.type !== 'checkbox' &&
          input.type !== 'radio' &&
          input.type !== 'submit' &&
          input.type !== 'button';
      });

      if (candidates.length === 1) {
        uniquePush(found, candidates[0]);
      }
    });

    return found;
  }

  function primaryDesignIdInput() {
    const inputs = findDesignIdInputs();
    if (!inputs.length) return null;

    return (
      inputs.find(function (input) {
        return !!input.name && input.type !== 'hidden';
      }) ||
      inputs.find(function (input) {
        return !!input.name;
      }) ||
      inputs[0]
    );
  }

  function visuallyHideNativeParameter() {
    const input = primaryDesignIdInput();
    if (!input || input.type === 'hidden') return;

    let target = input;
    const parent = input.parentElement;

    if (parent) {
      const parentText = txt(parent);
      const inputCount = parent.querySelectorAll
        ? parent.querySelectorAll('input,textarea').length
        : 0;

      if (
        inputCount === 1 &&
        parentText.length < 300 &&
        DESIGN_ID_RX.test(parentText)
      ) {
        target = parent;
      }
    }

    target.style.setProperty('position', 'absolute', 'important');
    target.style.setProperty('left', '-10000px', 'important');
    target.style.setProperty('top', 'auto', 'important');
    target.style.setProperty('width', '1px', 'important');
    target.style.setProperty('height', '1px', 'important');
    target.style.setProperty('overflow', 'hidden', 'important');
    target.style.setProperty('opacity', '0', 'important');
    target.style.setProperty('pointer-events', 'none', 'important');
    target.style.setProperty('margin', '0', 'important');
    target.style.setProperty('padding', '0', 'important');
    target.style.setProperty('border', '0', 'important');
  }

  function ensureNativeMirror(sourceInput) {
    if (!sourceInput || !sourceInput.name || !state.id) return null;

    const form = productForm();
    if (!form) return null;

    if (sourceInput.closest && sourceInput.closest('form') === form) {
      return sourceInput;
    }

    let mirror = form.querySelector('input[data-kamion-design-native-mirror="1"]');

    if (!mirror) {
      mirror = document.createElement('input');
      mirror.type = 'hidden';
      mirror.dataset.kamionDesignNativeMirror = '1';
      form.appendChild(mirror);
    }

    mirror.name = sourceInput.name;
    mirror.value = state.id;
    mirror.setAttribute('value', state.id);

    return mirror;
  }

  function writeNativeDesignId() {
    if (!state.hasDesign || !state.id) return false;

    const input = primaryDesignIdInput();

    if (!input) {
      console.warn(
        '[Kamionos LED V4] Nem található a natív Tervazonosító mező. Paraméter ID:',
        CFG.nativeParamId
      );
      return false;
    }

    input.disabled = false;
    input.removeAttribute('disabled');
    input.readOnly = false;
    input.removeAttribute('readonly');

    if (String(input.value || '').trim() !== state.id) {
      setNativeValue(input, state.id);
      input.setAttribute('value', state.id);
      input.dataset.kamionNativeDesignId = '1';
      fire(input);
    } else {
      input.dataset.kamionNativeDesignId = '1';
    }

    ensureNativeMirror(input);
    visuallyHideNativeParameter();

    return String(input.value || '').trim() === state.id;
  }

  function verifyNativeDesignId() {
    if (!state.hasDesign || !state.id) return false;

    const input = primaryDesignIdInput();

    if (
      input &&
      !input.disabled &&
      String(input.value || '').trim() === state.id
    ) {
      return true;
    }

    const form = productForm();
    if (!form) return false;

    const mirror = form.querySelector('input[data-kamion-design-native-mirror="1"]');

    return !!(
      mirror &&
      mirror.name &&
      String(mirror.value || '').trim() === state.id
    );
  }

  function renderStatus(button) {
    let box = document.getElementById('kamionPlanStatusV4');

    if (!state.hasDesign) {
      if (box) box.remove();
      return;
    }

    if (!box) {
      box = document.createElement('div');
      box.id = 'kamionPlanStatusV4';

      const host = button.parentElement || button;
      host.insertBefore(box, button);
    }

    const ledLabel = CFG.ledOptions[state.led] || state.led || '—';
    const gravLabel = CFG.engravingOptions[state.engraving] || state.engraving || '—';

    box.innerHTML =
      '<div style="font-weight:800;margin-bottom:4px">✓ Terv elmentve</div>' +
      '<div style="font-size:13px;line-height:1.45">' +
        'Tervazonosító: <strong>' + esc(state.id) + '</strong>' +
        (state.text ? '<br />Felirat: <strong>' + esc(state.text) + '</strong>' : '') +
        '<br />LED színe: <strong>' + esc(ledLabel) + '</strong>' +
        '<br />Gravírozás: <strong>' + esc(gravLabel) + '</strong>' +
        '<br />Végleges egységár: <strong>' + esc(huf(state.price)) + '</strong>' +
      '</div>';

    box.style.cssText =
      'display:block;' +
      'width:100%;' +
      'flex:0 0 100%;' +
      'flex-basis:100%;' +
      'grid-column:1/-1;' +
      'box-sizing:border-box;' +
      'margin:0 0 10px;' +
      'padding:12px 13px;' +
      'border:1px solid #BED9C3;' +
      'border-radius:10px;' +
      'background:#F0F8F1;' +
      'color:#2D6739;' +
      'line-height:1.4;';
  }

  function renderDesignerButton(button) {
    if (!button || !button.parentElement) return;

    let wrap = document.getElementById('kamionDesignerWrapV4');
    let designerButton = document.getElementById('kamionDesignerButtonV4');

    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'kamionDesignerWrapV4';
      wrap.style.cssText =
        'display:block;' +
        'width:100%;' +
        'flex:0 0 100%;' +
        'flex-basis:100%;' +
        'grid-column:1/-1;' +
        'box-sizing:border-box;' +
        'margin:0 0 10px;';

      button.parentElement.insertBefore(wrap, button);
    }

    if (!designerButton) {
      designerButton = document.createElement('button');
      designerButton.id = 'kamionDesignerButtonV4';
      designerButton.type = 'button';

      designerButton.style.cssText =
        'display:flex;' +
        'align-items:center;' +
        'justify-content:center;' +
        'width:100%;' +
        'min-height:46px;' +
        'box-sizing:border-box;' +
        'padding:11px 18px;' +
        'border-radius:10px;' +
        'border:1px solid #111;' +
        'background:#fff;' +
        'color:#111;' +
        'font-weight:700;' +
        'font-size:15px;' +
        'line-height:1.2;' +
        'text-align:center;' +
        'cursor:pointer;' +
        'touch-action:manipulation;';

      designerButton.addEventListener('mouseenter', function () {
        designerButton.style.background = '#f7f7f7';
      });

      designerButton.addEventListener('mouseleave', function () {
        designerButton.style.background = '#fff';
      });

      designerButton.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();

        location.href = designerLink(
          state.hasDesign ? state.id : ''
        );
      });

      wrap.appendChild(designerButton);
    }

    designerButton.textContent =
      state.hasDesign
        ? 'Terv módosítása'
        : 'Tervezés';
  }

  function prepareFinalNativeData() {
    saveDesign();

    const ledResult = applyLed();
    const gravResult = applyEngraving();

    if (!ledResult.ok) {
      return { ok: false, changed: false, reason: 'led' };
    }

    if (!gravResult.ok) {
      return { ok: false, changed: false, reason: 'engraving' };
    }

    if (ledResult.changed || gravResult.changed) {
      return { ok: true, changed: true };
    }

    const nativeOk = writeNativeDesignId();
    const verified = nativeOk && verifyNativeDesignId();

    return {
      ok: verified,
      changed: false,
      reason: verified ? '' : 'native'
    };
  }

  function scheduleCartRetry() {
    cartRetryCount++;

    if (cartRetryCount > 5) {
      cartRetryCount = 0;
      alert(
        'Az UNAS LED szín / gravírozás változatokat nem sikerült stabilan beállítani. ' +
        'Ellenőrizd a terméknél a LED színe és Gravírozás választható tulajdonságokat.'
      );
      return;
    }

    setTimeout(function () {
      installProductPage();

      const fresh = cartButton();
      if (fresh) fresh.click();
    }, 850);
  }

  function bindCartButton(button) {
    if (!button) return;

    button.dataset.kamionCart = '1';
    setButtonText(button, 'Kosárba');
    button.disabled = false;

    if (!state.hasDesign) {
      if (button.dataset.kamionNoDesignBound === CFG.version) return;
      button.dataset.kamionNoDesignBound = CFG.version;

      button.addEventListener('click', function (event) {
        if (state.hasDesign) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        location.href = designerLink('');
      }, true);

      return;
    }

    if (button.dataset.kamionCartBound === CFG.version) return;
    button.dataset.kamionCartBound = CFG.version;

    ['pointerdown', 'mousedown', 'touchstart'].forEach(function (eventName) {
      button.addEventListener(eventName, function () {
        saveDesign();
        applyLed();
        applyEngraving();
        writeNativeDesignId();
      }, true);
    });

    button.addEventListener('click', function (event) {
      const result = prepareFinalNativeData();

      if (result.ok && !result.changed) {
        cartRetryCount = 0;
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (result.changed) {
        scheduleCartRetry();
        return;
      }

      cartRetryCount = 0;

      if (result.reason === 'led') {
        alert(
          'A tervezőben kiválasztott LED színt nem találom az UNAS LED színe változatai között.'
        );
        return;
      }

      if (result.reason === 'engraving') {
        alert(
          'A tervezőben kiválasztott gravírozást nem találom az UNAS Gravírozás változatai között.'
        );
        return;
      }

      if (result.reason === 'native') {
        alert(
          'Nem találom vagy nem tudom kitölteni a natív UNAS Tervazonosító mezőt. ' +
          'A termék nem kerül kosárba, hogy ne vesszen el a tervazonosító.'
        );
      }
    }, true);
  }

  function installProductPage() {
    if (!isProductPage || installing) return false;

    installing = true;

    try {
      if (state.hasDesign) {
        saveDesign();
      }

      const ledResult = applyLed();
      const gravResult = applyEngraving();

      if (
        state.hasDesign &&
        ledResult.ok &&
        gravResult.ok &&
        !ledResult.changed &&
        !gravResult.changed
      ) {
        writeNativeDesignId();
      }

      const buttons = cartButtons();
      if (!buttons.length) {
        hideNativeChoices();
        visuallyHideNativeParameter();
        return false;
      }

      buttons.forEach(bindCartButton);

      const main = buttons[0];
      renderDesignerButton(main);
      renderStatus(main);

      hideNativeChoices();
      visuallyHideNativeParameter();

      return true;
    } finally {
      installing = false;
    }
  }

  function install() {
    installProductPage();
  }

  install();

  [250, 700, 1500, 3000, 5000].forEach(function (delay) {
    setTimeout(function () {
      installProductPage();
    }, delay);
  });

  document.addEventListener('submit', function (event) {
    if (!isProductPage || !state.hasDesign) return;

    saveDesign();

    const ledResult = applyLed();
    const gravResult = applyEngraving();

    writeNativeDesignId();

    if (
      !ledResult.ok ||
      !gravResult.ok ||
      ledResult.changed ||
      gravResult.changed ||
      !verifyNativeDesignId()
    ) {
      event.preventDefault();
      event.stopPropagation();

      alert(
        'A rendelési adatok még nem álltak be stabilan. Kérlek kattints újra a Kosárba gombra.'
      );
    }
  }, true);

  document.addEventListener('formdata', function (event) {
    if (!isProductPage || !state.hasDesign || !state.id || !event.formData) return;

    const input = primaryDesignIdInput();

    if (input && input.name) {
      event.formData.set(input.name, state.id);
    }
  }, true);

  console.log(
    '[Kamionos LED V4] aktív:',
    CFG.version,
    'terv:',
    state.id || '-',
    'LED:',
    state.led || '-',
    'gravírozás:',
    state.engraving || '-',
    'UNAS Tervazonosító paraméter:',
    CFG.nativeParamId
  );
})();
