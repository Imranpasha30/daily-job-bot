// Add an application history / tracker to resume-picker.html.
// Keeps every job description you paste, which resume was recommended, the verdict,
// and a status you can update — so a recruiter call can be looked up instantly.
const fs = require('fs');
let h = fs.readFileSync('resume-picker.html', 'utf8');
const before = h.length;
if (h.includes('HISTORY_KEY')) { console.log('history already added'); process.exit(0); }

/* ---------- 1. CSS ---------- */
h = h.replace('footer{margin-top:24px', `
.tabs{display:flex;gap:7px;margin-bottom:16px}
.tabs button{border:1px solid var(--line);background:#fff;color:var(--mut);border-radius:8px;padding:8px 18px;font-size:14px;font-weight:600;cursor:pointer}
.tabs button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
.tabs .cnt{background:rgba(255,255,255,.25);border-radius:999px;padding:0 7px;margin-left:6px;font-size:12px}
.tabs button:not(.on) .cnt{background:#eef1f4;color:var(--mut)}
.meta{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:10px}
.meta input{flex:1;min-width:180px;padding:9px 11px;border:1px solid var(--line);border-radius:8px;font-size:14px}
.hrow{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:13px 16px;margin-bottom:10px}
.hrow.no{opacity:.62}
.hhead{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:5px}
.hhead .co{font-size:16px;font-weight:700;color:var(--navy)}
.hhead .ti{color:var(--mut);font-size:14px}
.hhead .dt{margin-left:auto;font-size:12.5px;color:var(--mut);white-space:nowrap}
.hmeta{display:flex;gap:7px;flex-wrap:wrap;align-items:center;font-size:13px;margin-bottom:7px}
.hmeta select{padding:4px 9px;border:1px solid var(--line);border-radius:7px;font-size:12.5px;background:#fff}
.hbtn{border:1px solid var(--line);background:#fff;border-radius:6px;padding:4px 11px;font-size:12px;cursor:pointer;color:var(--accent)}
.hbtn:hover{background:#eef4fa}
.hbtn.del{color:var(--bad)}.hbtn.del:hover{background:#fdeceb}
.jd{white-space:pre-wrap;background:#f7f9fb;border:1px solid var(--line);border-radius:8px;padding:11px 13px;font-size:12.5px;max-height:320px;overflow:auto;margin-top:9px;line-height:1.55}
.hnote{width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:7px;font-size:13px;margin-top:8px;font-family:inherit}
.st{font-size:11.5px;font-weight:600;padding:2px 9px;border-radius:999px}
.st.applied{background:#e8f0f9;color:var(--accent)}
.st.interview{background:#fdf4e3;color:var(--warn)}
.st.offer{background:#e6f4ec;color:var(--ok)}
.st.rejected{background:#fdeceb;color:var(--bad)}
.st.saved{background:#eef1f4;color:var(--mut)}
.empty{text-align:center;padding:40px 20px;color:var(--mut)}
footer{margin-top:24px`);

/* ---------- 2. markup: tabs, company/title fields, history panel ---------- */
h = h.replace('<textarea id="jd"', `<div class="tabs">
  <button id="tabA" class="on">Analyse a job</button>
  <button id="tabH">History <span class="cnt" id="hcount">0</span></button>
</div>

<div id="paneA">
<div class="meta">
  <input id="co" placeholder="Company name (auto-filled, edit if wrong)">
  <input id="ti" placeholder="Role title">
</div>
<textarea id="jd"`);

h = h.replace('<div id="out"></div>', `<div id="out"></div>
</div>

<div id="paneH" style="display:none">
  <div class="meta">
    <input id="hq" placeholder="Search by company, role, skill or anything in the description...">
    <button class="hbtn" id="hexp">Export backup</button>
    <button class="hbtn" id="himp">Import</button>
    <input type="file" id="hfile" accept="application/json" style="display:none">
  </div>
  <div id="hlist"></div>
</div>`);

/* ---------- 3. JS: history store + rendering ---------- */
const JS = `
/* ===================== APPLICATION HISTORY ===================== */
var HISTORY_KEY = 'imran_job_history_v1';
var LAST = null;

function hLoad(){ try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(e){ return []; } }
function hSave(list){
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); }
  catch(e){ alert('Storage is full. Export a backup, then delete some old entries.'); }
  hCount();
}
function hCount(){ document.getElementById('hcount').textContent = hLoad().length; }

/* guess the company and role from the pasted text so you rarely have to type them */
function guess(t){
  var lines = t.split('\\n').map(function(l){ return l.trim(); }).filter(Boolean);
  var title = '', company = '';
  var TITLE = /\\b(engineer|developer|architect|analyst|scientist|manager|intern|sde|programmer|consultant)\\b/i;
  for (var i = 0; i < Math.min(lines.length, 12); i++) {
    if (!title && lines[i].length < 90 && TITLE.test(lines[i])) { title = lines[i].replace(/^(job description|about the job|role)\\s*:?\\s*/i,'').trim(); break; }
  }
  var m = t.match(/\\b(?:at|join|about|with)\\s+([A-Z][A-Za-z0-9&.'-]+(?:\\s+[A-Z][A-Za-z0-9&.'-]+){0,3})\\b/);
  if (m) company = m[1].trim();
  if (!company) {
    var m2 = t.match(/\\b([A-Z][A-Za-z0-9&.'-]{2,})\\s+(?:is|are)\\s+(?:looking|hiring|seeking|growing)/);
    if (m2) company = m2[1];
  }
  return { title: title.slice(0,90), company: company.slice(0,60) };
}

function hAdd(r, jd, company, title){
  var list = hLoad();
  list.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    company: company || 'Unknown company',
    title: title || '',
    resume: r.variants[0].v.name,
    file: r.variants[0].v.file,
    verdict: r.verdict,
    years: r.years,
    salary: r.salary ? (r.salary.cur === 'INR' ? ((r.salary.hi||r.salary.lo) + ' LPA') : ('$' + r.salary.lo.toLocaleString() + '-' + r.salary.hi.toLocaleString())) : '',
    lacks: r.lacks.map(function(l){ return l.name; }),
    has: r.has.slice(0,10).map(function(x){ return x.name; }),
    flags: r.flags,
    jd: String(jd).slice(0, 20000),
    status: 'saved',
    notes: ''
  });
  hSave(list);
  return list[0];
}

function hUpdate(id, patch){
  var list = hLoad();
  for (var i=0;i<list.length;i++) if (list[i].id === id) { for (var k in patch) list[i][k] = patch[k]; }
  hSave(list);
}

function hDelete(id){
  if (!confirm('Delete this entry? The job description will be lost.')) return;
  hSave(hLoad().filter(function(x){ return x.id !== id; }));
  hRender();
}

function fmtDate(iso){
  var d = new Date(iso);
  return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) + ' · ' + d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
}

var STATUSES = ['saved','applied','interview','offer','rejected'];

function hRender(){
  var q = (document.getElementById('hq').value || '').toLowerCase().trim();
  var list = hLoad().filter(function(x){
    if (!q) return true;
    return (x.company + ' ' + x.title + ' ' + x.resume + ' ' + (x.lacks||[]).join(' ') + ' ' + (x.has||[]).join(' ') + ' ' + x.jd).toLowerCase().indexOf(q) >= 0;
  });
  var el = document.getElementById('hlist');
  if (!list.length) {
    el.innerHTML = '<div class="empty">' + (q ? 'Nothing matches "' + esc(q) + '".' : 'No saved applications yet. Analyse a job and press <b>Save to history</b>.') + '</div>';
    return;
  }
  var V = { go:['v-go','Apply'], care:['v-care','With care'], no:['v-no','Skip'] };
  el.innerHTML = list.map(function(x){
    return '<div class="hrow' + (x.status==='rejected'?' no':'') + '">' +
      '<div class="hhead"><span class="co">' + esc(x.company) + '</span>' +
        (x.title ? '<span class="ti">' + esc(x.title) + '</span>' : '') +
        '<span class="dt">' + fmtDate(x.date) + '</span></div>' +
      '<div class="hmeta">' +
        '<span class="st ' + esc(x.status) + '">' + esc(x.status) + '</span>' +
        '<span class="pill ' + (x.verdict==='go'?'g':x.verdict==='no'?'r':'b') + '">' + (V[x.verdict]?V[x.verdict][1]:'') + '</span>' +
        '<span><b>Sent:</b> ' + esc(x.resume) + '</span>' +
        (x.salary ? '<span><b>Pay:</b> ' + esc(x.salary) + '</span>' : '') +
        (x.years ? '<span><b>Asked:</b> ' + x.years + '+ yrs</span>' : '') +
        '<select data-st="' + x.id + '">' + STATUSES.map(function(s){ return '<option' + (s===x.status?' selected':'') + '>' + s + '</option>'; }).join('') + '</select>' +
        '<button class="hbtn" data-jd="' + x.id + '">View description</button>' +
        '<button class="hbtn del" data-del="' + x.id + '">Delete</button>' +
      '</div>' +
      (x.lacks && x.lacks.length ? '<div style="font-size:12.5px;color:var(--bad);margin-bottom:5px"><b>Did not claim:</b> ' + esc(x.lacks.join(', ')) + '</div>' : '') +
      '<textarea class="hnote" data-note="' + x.id + '" rows="2" placeholder="Notes — recruiter name, what you said, next step...">' + esc(x.notes||'') + '</textarea>' +
      '<div class="jd" id="jd' + x.id + '" style="display:none">' + esc(x.jd) + '</div>' +
    '</div>';
  }).join('');
}

/* history events */
document.getElementById('hq').addEventListener('input', hRender);
document.getElementById('hlist').addEventListener('click', function(e){
  var b = e.target.closest('button'); if (!b) return;
  if (b.dataset.del) hDelete(Number(b.dataset.del));
  if (b.dataset.jd) {
    var d = document.getElementById('jd' + b.dataset.jd);
    var open = d.style.display !== 'none';
    d.style.display = open ? 'none' : 'block';
    b.textContent = open ? 'View description' : 'Hide description';
  }
});
document.getElementById('hlist').addEventListener('change', function(e){
  if (e.target.dataset.st) { hUpdate(Number(e.target.dataset.st), { status: e.target.value }); hRender(); }
});
document.getElementById('hlist').addEventListener('input', function(e){
  if (e.target.dataset.note) hUpdate(Number(e.target.dataset.note), { notes: e.target.value });
});

/* export / import so the data is not trapped in one browser */
document.getElementById('hexp').onclick = function(){
  var blob = new Blob([JSON.stringify(hLoad(), null, 1)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'job-history-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
};
document.getElementById('himp').onclick = function(){ document.getElementById('hfile').click(); };
document.getElementById('hfile').onchange = function(e){
  var f = e.target.files[0]; if (!f) return;
  var rd = new FileReader();
  rd.onload = function(){
    try {
      var incoming = JSON.parse(rd.result);
      if (!Array.isArray(incoming)) throw new Error('not a list');
      var have = hLoad(), ids = {};
      have.forEach(function(x){ ids[x.id] = 1; });
      var added = 0;
      incoming.forEach(function(x){ if (!ids[x.id]) { have.push(x); added++; } });
      have.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
      hSave(have); hRender();
      alert('Imported ' + added + ' new entr' + (added===1?'y':'ies') + '.');
    } catch(err){ alert('That file could not be read as a history backup.'); }
  };
  rd.readAsText(f);
};

/* tabs */
document.getElementById('tabA').onclick = function(){
  this.classList.add('on'); document.getElementById('tabH').classList.remove('on');
  document.getElementById('paneA').style.display=''; document.getElementById('paneH').style.display='none';
};
document.getElementById('tabH').onclick = function(){
  this.classList.add('on'); document.getElementById('tabA').classList.remove('on');
  document.getElementById('paneA').style.display='none'; document.getElementById('paneH').style.display='';
  hRender();
};
hCount();
`;

// NOTE: a replacement STRING treats $' and $& as special patterns, which silently truncates
// code containing a dollar sign. Use a replacer function so the text is inserted verbatim.
h = h.replace("var out = document.getElementById('out');", function () {
  return JS + "\nvar out = document.getElementById('out');";
});

/* ---------- 4. hook the analyse button: auto-fill company/title, stash result, add save button ---------- */
h = h.replace(`document.getElementById('run').onclick = function(){
  var t = document.getElementById('jd').value.trim();
  if (t.length < 60) { out.innerHTML = '<div class="card"><p class="muted">Paste a bit more of the description — I need the requirements section to judge it.</p></div>'; return; }
  out.innerHTML = render(analyse(t));
  out.scrollIntoView({ behavior:'smooth', block:'start' });
};`, function(){ return `document.getElementById('run').onclick = function(){
  var t = document.getElementById('jd').value.trim();
  if (t.length < 60) { out.innerHTML = '<div class="card"><p class="muted">Paste a bit more of the description — I need the requirements section to judge it.</p></div>'; return; }
  var g = guess(t);
  var coEl = document.getElementById('co'), tiEl = document.getElementById('ti');
  if (!coEl.value.trim() && g.company) coEl.value = g.company;
  if (!tiEl.value.trim() && g.title) tiEl.value = g.title;
  var r = analyse(t);
  LAST = { r:r, jd:t };
  out.innerHTML = render(r) +
    '<div class="card" style="display:flex;gap:11px;align-items:center;flex-wrap:wrap">' +
      '<button class="go" id="savebtn" style="padding:9px 20px">Save to history</button>' +
      '<span class="muted" style="margin:0">Keeps the description, the resume you sent and the verdict, so you can look it up when they call.</span>' +
    '</div>';
  document.getElementById('savebtn').onclick = function(){
    var rec = hAdd(LAST.r, LAST.jd, document.getElementById('co').value.trim(), document.getElementById('ti').value.trim());
    this.textContent = 'Saved';
    this.disabled = true;
    this.style.background = '#0f7b4f';
    hCount();
  };
  out.scrollIntoView({ behavior:'smooth', block:'start' });
};`; });

/* clear should reset the new fields too */
h = h.replace("document.getElementById('clear').onclick = function(){ document.getElementById('jd').value=''; out.innerHTML=''; };",
  "document.getElementById('clear').onclick = function(){ document.getElementById('jd').value=''; document.getElementById('co').value=''; document.getElementById('ti').value=''; out.innerHTML=''; LAST=null; };");

fs.writeFileSync('resume-picker.html', h);
console.log('patched ' + before + ' -> ' + h.length + ' chars');
['HISTORY_KEY','hAdd(','hRender(','Save to history','Export backup','guess('].forEach(function(k){
  console.log((h.indexOf(k) >= 0 ? '  ok   ' : '  MISS ') + k);
});
