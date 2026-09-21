(() => {
  'use strict';

  /*
    KAMIONOS LED TÁBLA – UNAS INTEGRÁCIÓ
    Termékoldal: https://falmatrica-lakasdekor.hu/Tervezd-meg-sajatodat

    FONTOS:
    Ha elkészül a kamionos tervező végleges domainje,
    CSAK a DESIGNER_URL értékét kell átírni.
  */

  const CFG = {
    productPath: '/Tervezd-meg-sajatodat',
    productSku: 'FL340481',
    designerUrl: 'https://IDE-IRD-BE-A-KAMIONOS-TERVEZO-DOMAINED/',
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

  const norm = s => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();

  function onProductPage() {
    return location.pathname.replace(/\/$/, '') === CFG.productPath.replace(/\/$/, '') ||
      document.body.innerText.includes(CFG.productSku);
  }

  function findSelectByOptions(requiredLabels) {
    const req = requiredLabels.map(norm);
    return [...document.querySelectorAll('select')].find(sel => {
      const opts = [...sel.options].map(o => norm(o.textContent));
      return req.every(x => opts.some(o => o.includes(x)));
    }) || null;
  }

  function setSelectByText(select, label) {
    if (!select) return false;
    const wanted = norm(label);
    const opt = [...select.options].find(o => norm(o.textContent).includes(wanted));
    if (!opt) return false;
    select.value = opt.value;
    opt.selected = true;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function findPlanInput() {
    const controls = [...document.querySelectorAll('input[type="text"], textarea')];
    return controls.find(el => {
      const wrap = el.closest('label, .form-group, .parameter, .product_param, tr, div');
      const txt = norm(wrap?.innerText || '');
      return txt.includes('tervazonosito');
    }) || controls.find(el => norm(el.name).includes('tervazonosito') || norm(el.id).includes('tervazonosito')) || null;
  }

  function fillPlanId(id) {
    const input = findPlanInput();
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
    if (setter) setter.call(input, id); else input.value = id;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function designerLink() {
    const url = new URL(CFG.designerUrl);
    url.searchParams.set('return', location.origin + CFG.productPath);
    return url.toString();
  }

  function findCartButton() {
    return [...document.querySelectorAll('button, input[type="submit"], a')].find(el => {
      const t = norm(el.textContent || el.value || '');
      return t === 'kosarba' || t.includes('kosarba');
    }) || null;
  }

  function ensureDesignerButton() {
    if (document.getElementById('kamion-designer-button')) return;
    const cart = findCartButton();
    if (!cart) return;

    const btn = document.createElement('button');
    btn.id = 'kamion-designer-button';
    btn.type = 'button';
    btn.textContent = 'Tervezés';
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
      if (CFG.designerUrl.includes('IDE-IRD-BE')) {
        alert('A kamionos tervező végleges domainjét még be kell írni az UNAS script DESIGNER_URL mezőjébe.');
        return;
      }
      location.href = designerLink();
    });

    cart.parentElement?.insertBefore(btn, cart);
  }

  function summaryBox(data) {
    let box = document.getElementById('kamion-plan-summary');
    if (!box) {
      box = document.createElement('div');
      box.id = 'kamion-plan-summary';
      box.style.cssText = 'margin:10px 0;padding:12px 14px;border:1px solid #b8d7bf;border-radius:10px;background:#eef8f0;color:#286b36;font-size:13px;line-height:1.45';
      const cart = findCartButton();
      cart?.parentElement?.insertBefore(box, cart);
    }
    box.innerHTML =
      '<strong>✓ Terv elmentve</strong><br>' +
      'Tervazonosító: <b>' + data.id + '</b><br>' +
      'Felirat: <b>' + data.text + '</b><br>' +
      'LED színe: <b>' + data.ledLabel + '</b><br>' +
      'Gravírozás: <b>' + data.gravLabel + '</b><br>' +
      'Végleges egységár: <b>' + Number(data.price || 8500).toLocaleString('hu-HU') + ' Ft</b>';
  }

  function processReturnedDesign() {
    const p = new URLSearchParams(location.search);
    const id = p.get('kamionterv');
    if (!id) return;

    const ledId = p.get('kamionled') || 'blue';
    const gravId = p.get('kamiongrav') || 'outline';
    const data = {
      id,
      text: p.get('kamionnev') || '—',
      ledId,
      ledLabel: CFG.ledOptions[ledId] || ledId,
      gravId,
      gravLabel: CFG.engravingOptions[gravId] || gravId,
      price: p.get('kamionar') || '8500'
    };

    const ledSelect = findSelectByOptions(['Kék', 'Zöld', 'Piros', 'Fehér', 'RGB']);
    const gravSelect = findSelectByOptions(['Kontúr gravírozás', 'Telibe gravírozott']);

    const ledOk = setSelectByText(ledSelect, data.ledLabel);
    const gravOk = setSelectByText(gravSelect, data.gravLabel);
    const idOk = fillPlanId(data.id);

    summaryBox(data);

    if (!ledOk || !gravOk || !idOk) {
      console.warn('Kamionos tervező: valamelyik UNAS mezőt nem sikerült automatikusan kitölteni.', {
        ledOk, gravOk, idOk
      });
    }
  }

  function boot() {
    if (!onProductPage()) return;
    ensureDesignerButton();
    processReturnedDesign();

    const observer = new MutationObserver(() => ensureDesignerButton());
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 12000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
