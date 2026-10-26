// End-to-end test of the history feature in resume-picker.html
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join('C:/Users/user/AppData/Local/Temp/claude/e--resume/d86e2230-6c3a-4931-9153-f2eb22e9d1b8/scratchpad/build/node_modules/jsdom'));

const html = fs.readFileSync(path.join(__dirname,'..','resume-picker.html'), 'utf8');

const JOBS = [
  ['Crucifer AI', `Backend Developer at Crucifer AI Technologies.
We are looking for a Backend Developer to build our Academy platform.
Requirements: Strong Python and FastAPI, REST APIs, PostgreSQL, Redis, Docker, SQL.
Experience: 2-4 years. CTC: 14-18 LPA.`],
  ['Techolution', `AI Backend Engineer. Techolution is hiring.
Strong Python, FastAPI or Flask, Pydantic, microservices.
Practical exposure to LLMs, RAG, embedding models, vector databases, AI agents.
Understanding of NoSQL databases. Redis and caching. Exp Range: 1-4 years.`],
  ['No Limit Nodes', `Backend Software Engineer at No Limit Nodes.
Whitefield Bangalore. Compensation: 3.6 LPA. Experience: 6 months to 2 years.
Python, REST APIs, PostgreSQL, Redis, Linux, Docker, WebSockets.`],
];

(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  await new Promise(r => setTimeout(r, 80));
  const D = window.document;
  window.confirm = () => true;
  window.alert = m => console.log('   [alert] ' + m);

  console.log('STEP 1 — analyse and save three jobs\n');
  for (const [name, jd] of JOBS) {
    D.getElementById('jd').value = jd;
    D.getElementById('co').value = '';
    D.getElementById('ti').value = '';
    D.getElementById('run').click();
    const co = D.getElementById('co').value;
    const ti = D.getElementById('ti').value;
    const verdict = D.querySelector('.verdict h2').textContent;
    const resume = D.querySelector('.pick .nm').textContent;
    const saveBtn = D.getElementById('savebtn');
    console.log('  ' + name);
    console.log('    auto-guessed company : "' + co + '"');
    console.log('    auto-guessed title   : "' + ti + '"');
    console.log('    verdict / resume     : ' + verdict + ' / ' + resume);
    console.log('    save button present  : ' + !!saveBtn);
    if (!co) D.getElementById('co').value = name;
    saveBtn.click();
    console.log('    after save           : "' + saveBtn.textContent + '", disabled=' + saveBtn.disabled);
    // Date.now() can repeat inside one millisecond, so space the ids out
    await new Promise(r => setTimeout(r, 5));
  }

  const stored = JSON.parse(window.localStorage.getItem('imran_job_history_v1'));
  console.log('\nSTEP 2 — what landed in storage: ' + stored.length + ' entries');
  stored.forEach(e => console.log('    ' + e.company.padEnd(18) + ' | ' + e.resume.padEnd(22) + ' | ' + e.verdict.padEnd(5) + ' | pay: ' + (e.salary || '-').padEnd(9) + ' | jd kept: ' + e.jd.length + ' chars'));

  console.log('\nSTEP 3 — open the History tab');
  D.getElementById('tabH').click();
  console.log('    rows rendered : ' + D.querySelectorAll('.hrow').length);
  console.log('    tab counter   : ' + D.getElementById('hcount').textContent);
  console.log('    pane visible  : ' + (D.getElementById('paneH').style.display !== 'none'));

  console.log('\nSTEP 4 — search for a company');
  D.getElementById('hq').value = 'crucifer';
  D.getElementById('hq').dispatchEvent(new window.Event('input', { bubbles: true }));
  console.log('    search "crucifer" -> ' + D.querySelectorAll('.hrow').length + ' row(s): ' + [...D.querySelectorAll('.hrow .co')].map(e => e.textContent).join(', '));

  console.log('\nSTEP 5 — search inside the job description text');
  D.getElementById('hq').value = 'vector databases';
  D.getElementById('hq').dispatchEvent(new window.Event('input', { bubbles: true }));
  console.log('    search "vector databases" -> ' + [...D.querySelectorAll('.hrow .co')].map(e => e.textContent).join(', '));

  D.getElementById('hq').value = '';
  D.getElementById('hq').dispatchEvent(new window.Event('input', { bubbles: true }));

  console.log('\nSTEP 6 — change a status to "applied"');
  const sel = D.querySelector('select[data-st]');
  sel.value = 'applied';
  sel.dispatchEvent(new window.Event('change', { bubbles: true }));
  const after = JSON.parse(window.localStorage.getItem('imran_job_history_v1'));
  console.log('    first entry status now: ' + after[0].status);

  console.log('\nSTEP 7 — add a note');
  const note = D.querySelector('textarea[data-note]');
  note.value = 'Andrea called. Interview Wed 6pm.';
  note.dispatchEvent(new window.Event('input', { bubbles: true }));
  console.log('    note saved: "' + JSON.parse(window.localStorage.getItem('imran_job_history_v1'))[0].notes + '"');

  console.log('\nSTEP 8 — expand the stored job description');
  const viewBtn = D.querySelector('button[data-jd]');
  viewBtn.click();
  const jdBox = D.getElementById('jd' + viewBtn.dataset.jd);
  console.log('    description visible: ' + (jdBox.style.display === 'block') + ', button now says "' + viewBtn.textContent + '"');
  console.log('    first line: ' + jdBox.textContent.trim().split('\n')[0]);

  console.log('\nSTEP 9 — delete one entry');
  const n0 = JSON.parse(window.localStorage.getItem('imran_job_history_v1')).length;
  D.querySelector('button[data-del]').click();
  const n1 = JSON.parse(window.localStorage.getItem('imran_job_history_v1')).length;
  console.log('    ' + n0 + ' -> ' + n1 + ' entries, rows now ' + D.querySelectorAll('.hrow').length);

  console.log('\nSTEP 10 — survives a reload?');
  const saved = window.localStorage.getItem('imran_job_history_v1');
  const dom2 = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), pretendToBeVisual: true, url: 'http://localhost/' });
  await new Promise(r => setTimeout(r, 60));
  dom2.window.localStorage.setItem('imran_job_history_v1', saved);
  dom2.window.document.getElementById('tabH').click();
  console.log('    after reopening the page: ' + dom2.window.document.querySelectorAll('.hrow').length + ' row(s) restored');
  dom2.window.close();
  window.close();
  console.log('\nall steps completed');
})();
