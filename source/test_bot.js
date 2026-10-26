// Run apply-bot.js against real application-form HTML in a jsdom window and report what it filled.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join('C:/Users/user/AppData/Local/Temp/claude/e--resume/d86e2230-6c3a-4931-9153-f2eb22e9d1b8/scratchpad/build/node_modules/jsdom'));

const BOT = fs.readFileSync('apply-bot.js', 'utf8');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36';

const TARGETS = process.argv.slice(2);

async function getHtml(url) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return await r.text();
}

(async () => {
  for (const url of TARGETS) {
    console.log('\n' + '='.repeat(78));
    console.log(url);
    console.log('='.repeat(78));
    let html;
    try { html = await getHtml(url); } catch (e) { console.log('  fetch failed: ' + e.message); continue; }

    const vc = new VirtualConsole(); // swallow page console noise
    const dom = new JSDOM(html, { url, runScripts: 'outside-only', virtualConsole: vc, pretendToBeVisual: true });
    const { window } = dom;

    // jsdom has no layout, so offsetParent is always null; make visibility checks pass
    Object.defineProperty(window.HTMLElement.prototype, 'offsetParent', { get() { return this.ownerDocument.body; } });
    if (!window.CSS) window.CSS = {};
    if (!window.CSS.escape) window.CSS.escape = s => String(s).replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c);
    window.confirm = () => false;
    window.alert = () => {};

    const inputs = window.document.querySelectorAll('input,textarea,select');
    console.log('form controls found in HTML: ' + inputs.length);
    if (!inputs.length) { console.log('  (form is rendered client-side; cannot test statically)'); dom.window.close(); continue; }

    try { window.eval(BOT); } catch (e) { console.log('  bot threw: ' + e.message); dom.window.close(); continue; }

    const panel = window.document.getElementById('iab');
    if (!panel) { console.log('  panel did not mount'); dom.window.close(); continue; }
    const fillBtn = panel.querySelector('button.b1');
    fillBtn.dispatchEvent(new window.Event('click', { bubbles: true }));

    // read back what it actually wrote into the real form
    const filled = [];
    window.document.querySelectorAll('input,textarea').forEach(f => {
      if (f.closest('#iab')) return;
      const t = (f.type || '').toLowerCase();
      if (t === 'radio' || t === 'checkbox') { if (f.checked) filled.push([f.name || f.id, 'CHECKED']); return; }
      if ((f.value || '').trim()) filled.push([(f.name || f.id || f.placeholder || '?').slice(0, 44), String(f.value).slice(0, 52)]);
    });
    console.log('fields the bot populated: ' + filled.length);
    filled.slice(0, 22).forEach(([k, v]) => console.log('   ' + String(k).padEnd(46) + ' = ' + v));

    const boxes = panel.querySelectorAll('.box');
    boxes.forEach(b => {
      const txt = b.textContent.replace(/\s+/g, ' ').trim();
      console.log('   PANEL: ' + txt.slice(0, 600));
    });
    const written = panel.querySelectorAll('.q');
    if (written.length) console.log('   written questions surfaced: ' + written.length);
    const sub = panel.querySelector('button.b2');
    console.log('   submit button present: ' + !!sub + (sub ? ' ("' + sub.textContent + '")' : ''));
    dom.window.close();
  }
})();
