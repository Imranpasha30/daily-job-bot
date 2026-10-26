// Show the label text the bot derives for every control on a real form.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join('C:/Users/user/AppData/Local/Temp/claude/e--resume/d86e2230-6c3a-4931-9153-f2eb22e9d1b8/scratchpad/build/node_modules/jsdom'));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

(async () => {
  const url = process.argv[2];
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) });
  const html = await r.text();
  const dom = new JSDOM(html, { url, virtualConsole: new VirtualConsole() });
  const { window } = dom;
  const D = window.document;
  if (!window.CSS) window.CSS = {};
  if (!window.CSS.escape) window.CSS.escape = s => String(s).replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c);

  function lab(f) {
    const b = [];
    if (f.id) { try { const l = D.querySelector('label[for="' + window.CSS.escape(f.id) + '"]'); if (l) b.push(l.textContent); } catch (e) {} }
    const p = f.closest('label'); if (p) b.push(p.textContent);
    let w = f.closest('div,li,fieldset,section,td');
    for (let i = 0; i < 4 && w; i++) {
      const q = w.querySelector('label,legend,.label,[class*="label"],[class*="question"],h3,h4,p');
      if (q && q.textContent && q.textContent.trim().length > 2) { b.push(q.textContent); break; }
      w = w.parentElement;
    }
    b.push(f.getAttribute('aria-label') || '', f.placeholder || '', f.name || '', f.id || '');
    return b.join(' ').replace(/\s+/g, ' ').trim();
  }

  const fields = [...D.querySelectorAll('input,textarea,select')].filter(f => {
    const t = (f.type || '').toLowerCase();
    return !['hidden', 'submit', 'button', 'image', 'reset'].includes(t);
  });
  console.log('controls: ' + fields.length + '\n');
  fields.forEach(f => {
    const t = f.tagName === 'SELECT' ? 'select' : (f.type || 'text');
    console.log('[' + t.padEnd(8) + '] name=' + String(f.name || f.id || '?').slice(0, 34).padEnd(34) + ' | label="' + lab(f).slice(0, 110) + '"');
  });
  dom.window.close();
})();
