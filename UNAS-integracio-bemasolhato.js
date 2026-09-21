(function () {
  'use strict';

  /*
   * LAKÁS DEKOR – KAMIONOS LED TÁBLA / UNAS
   * V8 ES5 – külön kamionos integráció
   *
   * Csak ezen az oldalon fut:
   * /Tervezd-meg-sajatodat
   *
   * Cikkszám: FL340481
   * Tervező: https://lakasderko--kamionostabla.lakasdekor.workers.dev/
   *
   * FONTOS:
   * - body end
   * - <script> tagek nélkül kell bemásolni
   * - a házszámtábla scripthez nem nyúl
   */

  var CFG = {
    version: '20260921-kamion-v8-designid-fix',
    productPath: '/Tervezd-meg-sajatodat',
    designerUrl: 'https://lakasderko--kamionostabla.lakasdekor.workers.dev/',
    returnUrl: 'https://falmatrica-lakasdekor.hu/Tervezd-meg-sajatodat',
    designParameterId: '8849701',
    standardPrice: 8500,
    rgbPrice: 11150,
    led: {
      blue: 'Kék',
      green: 'Zöld',
      red: 'Piros',
      white: 'Fehér',
      rgb: 'RGB'
    },
    engraving: {
      outline: 'Kontúr gravírozás',
      fill: 'Telibe gravírozott'
    }
  };

  function currentPath() {
    return String(window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
  }

  function isTargetPage() {
    return currentPath() === String(CFG.productPath).toLowerCase();
  }

  if (!isTargetPage()) {
    return;
  }

  function trimText(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
  }

  function norm(value) {
    var s = String(value == null ? '' : value).toLowerCase();
    try {
      s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (e) {}
    return s.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
  }

  function elementText(el) {
    if (!el) return '';
    if (typeof el.value !== 'undefined' && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
      return trimText(el.value);
    }
    return trimText(el.textContent || el.innerText || '');
  }

  function getParam(name) {
    var q = String(window.location.search || '').replace(/^\?/, '').split('&');
    var i, parts, key, value;
    for (i = 0; i < q.length; i++) {
      if (!q[i]) continue;
      parts = q[i].split('=');
      key = decodeURIComponent(String(parts.shift() || '').replace(/\+/g, ' '));
      if (key === name) {
        value = parts.join('=');
        return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
      }
    }
    return '';
  }

  function huf(value) {
    var n = Math.round(Number(value) || 0);
    try {
      return n.toLocaleString('hu-HU') + ' Ft';
    } catch (e) {
      return String(n) + ' Ft';
    }
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function fire(el) {
    var names = ['input', 'change', 'keyup', 'blur'];
    var i, ev;
    if (!el) return;

    for (i = 0; i < names.length; i++) {
      try {
        ev = document.createEvent('HTMLEvents');
        ev.initEvent(names[i], true, false);
        el.dispatchEvent(ev);
      } catch (e) {}
    }

    try {
      if (window.jQuery) {
        window.jQuery(el).trigger('input').trigger('change').trigger('keyup').trigger('blur');
      }
    } catch (e2) {}
  }

  function setNativeValue(el, value) {
    if (!el) return;
    try {
      el.value = value;
      el.setAttribute('value', value);
    } catch (e) {}
    fire(el);
  }

  var state = {
    id: trimText(getParam('kamionterv')),
    name: trimText(getParam('kamionnev')),
    font: trimText(getParam('kamionfont')),
    engraving: trimText(getParam('kamiongrav')),
    led: trimText(getParam('kamionled')),
    price: Math.round(Number(getParam('kamionar')) || 0)
  };

  if (state.id && !state.price) {
    state.price = state.led === 'rgb' ? CFG.rgbPrice : CFG.standardPrice;
  }

  function hasDesign() {
    return !!state.id;
  }

  function buildDesignerUrl(editId) {
    var url = CFG.designerUrl;
    var sep = url.indexOf('?') === -1 ? '?' : '&';

    url += sep + 'v=' + encodeURIComponent(CFG.version);
    url += '&return=' + encodeURIComponent(CFG.returnUrl);

    if (editId) {
      url += '&edit=' + encodeURIComponent(editId);
    }

    return url;
  }

  function openDesigner() {
    window.location.href = buildDesignerUrl(hasDesign() ? state.id : '');
  }

  function getAllClickable() {
    return document.querySelectorAll('button,a,input[type="submit"],input[type="button"]');
  }

  function findCartButtons() {
    var all = getAllClickable();
    var out = [];
    var i, t;

    for (i = 0; i < all.length; i++) {
      t = norm(elementText(all[i]));
      if (t.indexOf('kosarba') !== -1) {
        out.push(all[i]);
      }
    }
    return out;
  }

  function mainCartButton() {
    var buttons = findCartButtons();
    return buttons.length ? buttons[0] : null;
  }

  function getOptionTexts(select) {
    var out = [];
    var i;
    if (!select || !select.options) return out;

    for (i = 0; i < select.options.length; i++) {
      out.push(norm(select.options[i].text || select.options[i].textContent || ''));
    }
    return out;
  }

  function findLedSelect() {
    var selects = document.getElementsByTagName('select');
    var best = null;
    var bestScore = 0;
    var wanted = ['kek', 'zold', 'piros', 'feher', 'rgb'];
    var i, j, k, options, score;

    for (i = 0; i < selects.length; i++) {
      options = getOptionTexts(selects[i]);
      score = 0;

      for (j = 0; j < wanted.length; j++) {
        for (k = 0; k < options.length; k++) {
          if (options[k] === wanted[j] || options[k].indexOf(wanted[j]) !== -1) {
            score++;
            break;
          }
        }
      }

      if (score > bestScore) {
        best = selects[i];
        bestScore = score;
      }
    }

    return bestScore >= 4 ? best : null;
  }

  function findEngravingSelect() {
    var selects = document.getElementsByTagName('select');
    var best = null;
    var bestScore = 0;
    var i, j, options, score;

    for (i = 0; i < selects.length; i++) {
      options = getOptionTexts(selects[i]);
      score = 0;

      for (j = 0; j < options.length; j++) {
        if (options[j].indexOf('kontur gravirozas') !== -1) score = score | 1;
        if (options[j].indexOf('telibe gravirozott') !== -1) score = score | 2;
      }

      if (score > bestScore) {
        best = selects[i];
        bestScore = score;
      }
    }

    return bestScore === 3 ? best : null;
  }

  function findOption(select, wantedText) {
    var wanted = norm(wantedText);
    var i, t;

    if (!select || !select.options) return null;

    for (i = 0; i < select.options.length; i++) {
      t = norm(select.options[i].text || select.options[i].textContent || '');
      if (t === wanted || t.indexOf(wanted) !== -1 || wanted.indexOf(t) !== -1) {
        return select.options[i];
      }
    }

    return null;
  }

  function setSelectValue(select, wantedText) {
    var option, changed;

    if (!select) {
      return { ok: false, changed: false };
    }

    option = findOption(select, wantedText);
    if (!option) {
      return { ok: false, changed: false };
    }

    changed = String(select.value) !== String(option.value);

    if (changed) {
      select.value = option.value;
      option.selected = true;
      fire(select);
    }

    return { ok: true, changed: changed };
  }

  function syncLed() {
    if (!hasDesign()) return { ok: true, changed: false };
    if (!CFG.led[state.led]) return { ok: false, changed: false };
    return setSelectValue(findLedSelect(), CFG.led[state.led]);
  }

  function syncEngraving() {
    if (!hasDesign()) return { ok: true, changed: false };
    if (!CFG.engraving[state.engraving]) return { ok: false, changed: false };
    return setSelectValue(findEngravingSelect(), CFG.engraving[state.engraving]);
  }

  function hideOffscreen(el) {
    if (!el) return;

    el.style.position = 'absolute';
    el.style.left = '-10000px';
    el.style.top = 'auto';
    el.style.width = '1px';
    el.style.height = '1px';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.style.margin = '0';
    el.style.padding = '0';
  }

  function ownText(el) {
    var nodes, out = '', i;
    if (!el || !el.childNodes) return '';

    nodes = el.childNodes;
    for (i = 0; i < nodes.length; i++) {
      if (nodes[i].nodeType === 3) {
        out += ' ' + String(nodes[i].nodeValue || '');
      }
    }

    return trimText(out);
  }

  function hideExactCaption(names) {
    var wanted = [];
    var tags = document.querySelectorAll('label,span,p,strong,b,div');
    var i, j, t;

    for (i = 0; i < names.length; i++) {
      wanted.push(norm(names[i]));
    }

    for (i = 0; i < tags.length; i++) {
      t = norm(ownText(tags[i]).replace(/[:：]/g, ''));
      if (!t) continue;

      for (j = 0; j < wanted.length; j++) {
        if (t === wanted[j]) {
          tags[i].style.display = 'none';
          break;
        }
      }
    }
  }

  function hideNativeChoices() {
    hideOffscreen(findLedSelect());
    hideOffscreen(findEngravingSelect());

    hideExactCaption(['LED színe', 'LED szin']);
    hideExactCaption(['Gravírozás', 'Gravirozas']);
  }

  function findDesignInput() {
    var id = CFG.designParameterId;
    var selectors = [
      'input[name*="' + id + '"]',
      'textarea[name*="' + id + '"]',
      'input[id*="' + id + '"]',
      'textarea[id*="' + id + '"]',
      'input[data-param-id="' + id + '"]',
      'textarea[data-param-id="' + id + '"]'
    ];
    var i, el, inputs, direct, surrounding, p;

    /* 1) Elsőként próbáljuk a korábbi, ismert UNAS paraméterazonosítót. */
    for (i = 0; i < selectors.length; i++) {
      try {
        el = document.querySelector(selectors[i]);
        if (el) return el;
      } catch (e) {}
    }

    /*
     * 2) Ha az UNAS más HTML nevet / ID-t adott a mezőnek,
     *    akkor a látható "Tervazonosító" felirat alapján keressük meg.
     *    Ez ugyanaz az elv, amit a működő házszámtábla integráció használ.
     */
    inputs = document.querySelectorAll(
      'input[type="text"],input:not([type]),textarea'
    );

    for (i = 0; i < inputs.length; i++) {
      el = inputs[i];

      direct = [
        el.name || '',
        el.id || '',
        el.placeholder || '',
        el.getAttribute('aria-label') || ''
      ].join(' ');

      surrounding = '';

      try {
        if (el.labels && el.labels.length) {
          var li;
          for (li = 0; li < el.labels.length; li++) {
            surrounding += ' ' + (el.labels[li].textContent || '');
          }
        }
      } catch (e2) {}

      p = el.parentElement;
      var depth = 0;
      while (p && depth < 4) {
        surrounding += ' ' + (p.textContent || '');
        p = p.parentElement;
        depth++;
      }

      if (
        /tervazonosító|tervazonosito|terv azonosító|terv azonosito/i.test(
          direct + ' ' + surrounding
        )
      ) {
        return el;
      }
    }

    return null;
  }

  function writeDesignId() {
    var input;

    if (!hasDesign()) return true;

    input = findDesignInput();
    if (!input) return false;

    try {
      input.disabled = false;
      input.removeAttribute('disabled');
      input.readOnly = false;
      input.removeAttribute('readonly');
    } catch (e) {}

    setNativeValue(input, state.id);
    hideOffscreen(input);
    hideExactCaption(['Tervazonosító', 'Terv azonosító']);

    return trimText(input.value) === state.id;
  }

  function renderStatusBox() {
    var box = document.getElementById('kamionSavedDesignBoxV8');
    var cart = mainCartButton();
    var row, host;
    var ledText, gravText;

    if (!hasDesign()) {
      if (box && box.parentNode) box.parentNode.removeChild(box);
      return;
    }

    if (!cart) return;

    if (!box) {
      box = document.createElement('div');
      box.id = 'kamionSavedDesignBoxV8';

      row = cart.parentNode;
      host = row && row.parentNode ? row.parentNode : row;

      if (host && row) {
        host.insertBefore(box, row);
      } else if (row) {
        row.insertBefore(box, cart);
      }
    }

    ledText = CFG.led[state.led] || state.led || '—';
    gravText = CFG.engraving[state.engraving] || state.engraving || '—';

    box.innerHTML =
      '<div style="font-weight:800;margin-bottom:5px">✓ Terv elmentve</div>' +
      '<div style="font-size:13px;line-height:1.48">' +
      'Tervazonosító: <strong>' + esc(state.id) + '</strong>' +
      (state.name ? '<br>Felirat: <strong>' + esc(state.name) + '</strong>' : '') +
      '<br>LED színe: <strong>' + esc(ledText) + '</strong>' +
      '<br>Gravírozás: <strong>' + esc(gravText) + '</strong>' +
      '<br>Végleges egységár: <strong>' + esc(huf(state.price)) + '</strong>' +
      '</div>';

    box.style.display = 'block';
    box.style.width = '100%';
    box.style.boxSizing = 'border-box';
    box.style.margin = '0 0 10px 0';
    box.style.padding = '12px 13px';
    box.style.border = '1px solid #BED9C3';
    box.style.borderRadius = '10px';
    box.style.background = '#F0F8F1';
    box.style.color = '#2D6739';
  }

  function renderDesignerButton() {
    var cart = mainCartButton();
    var row, host, wrap, btn;

    if (!cart) return false;

    wrap = document.getElementById('kamionDesignerWrapV8');
    btn = document.getElementById('kamionDesignerButtonV8');

    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'kamionDesignerWrapV8';
      wrap.style.display = 'block';
      wrap.style.width = '100%';
      wrap.style.boxSizing = 'border-box';
      wrap.style.margin = '0 0 10px 0';

      row = cart.parentNode;
      host = row && row.parentNode ? row.parentNode : row;

      if (host && row) {
        host.insertBefore(wrap, row);
      } else if (row) {
        row.insertBefore(wrap, cart);
      }
    }

    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'kamionDesignerButtonV8';
      btn.type = 'button';

      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.minHeight = '46px';
      btn.style.boxSizing = 'border-box';
      btn.style.padding = '11px 18px';
      btn.style.border = '1px solid #111';
      btn.style.borderRadius = '10px';
      btn.style.background = '#fff';
      btn.style.color = '#111';
      btn.style.fontSize = '15px';
      btn.style.fontWeight = '700';
      btn.style.textAlign = 'center';
      btn.style.cursor = 'pointer';

      btn.onclick = function (event) {
        if (event && event.preventDefault) event.preventDefault();
        openDesigner();
        return false;
      };

      wrap.appendChild(btn);
    }

    btn.innerHTML = hasDesign() ? 'Terv módosítása' : 'Tervezés';
    return true;
  }

  function bindCart() {
    var buttons = findCartButtons();
    var i, button;

    for (i = 0; i < buttons.length; i++) {
      button = buttons[i];

      if (!hasDesign()) {
        if (button.getAttribute('data-kamion-v8-no-design') === '1') continue;
        button.setAttribute('data-kamion-v8-no-design', '1');

        button.addEventListener('click', function (event) {
          if (hasDesign()) return;

          if (event) {
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          }

          openDesigner();
          return false;
        }, true);

      } else {
        if (button.getAttribute('data-kamion-v8-design') === '1') continue;
        button.setAttribute('data-kamion-v8-design', '1');

        button.addEventListener('click', function (event) {
          var ledResult = syncLed();
          var gravResult = syncEngraving();

          if (!ledResult.ok || !gravResult.ok || !writeDesignId()) {
            if (event) {
              event.preventDefault();
              event.stopPropagation();
              if (event.stopImmediatePropagation) event.stopImmediatePropagation();
            }

            alert('A tervezett kamionos tábla adatait nem sikerült teljesen átadni az UNAS-nak. Kérlek próbáld újra.');
            return false;
          }

          return true;
        }, true);
      }
    }
  }

  var installing = false;

  function install() {
    if (!isTargetPage() || installing) return;

    installing = true;

    try {
      renderDesignerButton();

      if (hasDesign()) {
        syncLed();
        syncEngraving();
        writeDesignId();
      }

      renderStatusBox();
      bindCart();
      hideNativeChoices();
    } catch (e) {
      try {
        console.error('[Kamion V8]', e);
      } catch (ignore) {}
    }

    installing = false;
  }

  function boot() {
    var delays = [0, 100, 300, 700, 1200, 2000, 3500, 5500, 8000];
    var i;
    var timer = null;

    for (i = 0; i < delays.length; i++) {
      (function (delay) {
        window.setTimeout(install, delay);
      })(delays[i]);
    }

    try {
      if (window.MutationObserver) {
        var observer = new MutationObserver(function () {
          if (timer) window.clearTimeout(timer);
          timer = window.setTimeout(install, 100);
        });

        observer.observe(document.documentElement, {
          childList: true,
          subtree: true
        });
      }
    } catch (e) {}

    window.setInterval(install, 1800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  try {
    console.log('[Kamionos LED V8] aktív:', CFG.version, 'terv:', state.id || '-');
  } catch (e) {}
})();