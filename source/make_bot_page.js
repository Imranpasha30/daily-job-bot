// Wrap apply-bot.js into a bookmarklet and build the install / launcher page.
const fs = require('fs');

const src = fs.readFileSync('apply-bot.js', 'utf8');

// conservative minify: strip // comments on their own line and collapse leading indentation
const slim = src
  .split('\n')
  .map(l => l.replace(/^\s+/, ''))
  .filter(l => !/^\/\*.*\*\/$/.test(l) && !/^\/\//.test(l))
  .join('\n');

const bookmarklet = 'javascript:' + encodeURIComponent(slim);

const tabs = JSON.parse(fs.readFileSync('tabs.json', 'utf8'));
const ranked = fs.existsSync('questions_ranked.json') ? JSON.parse(fs.readFileSync('questions_ranked.json', 'utf8')) : [];
const perJob = fs.existsSync('questions_by_job.json') ? JSON.parse(fs.readFileSync('questions_by_job.json', 'utf8')) : [];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// questions that genuinely need a human answer: free text, not obviously profile data
const PROFILE = /name|email|phone|address|zip|postal|city|state|country|linkedin|github|website|portfolio|resume|cv\b|cover letter|employer|company|title|designation|experience|notice|ctc|salary|compensation|school|university|degree|discipline|graduat|pronoun|referr|gender|race|ethnic|veteran|disabilit|sponsor|authoriz|18 years|privacy|consent|acknowledg|certif|how did you (hear|learn)|where have you learned|zip code/i;
const needsAnswer = ranked.filter(q => !q.options.length && q.label.length > 28 && !PROFILE.test(q.label));

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Apply Bot — setup</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--ink:#16181d;--mut:#5f6673;--line:#e3e6ea;--navy:#1f3a5f;--accent:#1769aa;--ok:#0f7b4f;--warn:#9a6700}
*{box-sizing:border-box}
body{margin:0;font:15px/1.6 -apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink)}
.wrap{max-width:860px;margin:0 auto;padding:24px 18px 70px}
h1{font-size:24px;margin:0 0 6px;color:var(--navy)}
h2{font-size:17px;margin:26px 0 8px;color:var(--navy)}
.sub{color:var(--mut);font-size:14px;margin-bottom:18px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin-bottom:14px}
.bm{display:inline-block;background:var(--navy);color:#fff;text-decoration:none;padding:11px 22px;border-radius:8px;font-weight:700;font-size:15px;cursor:grab}
.bm:hover{background:#2a4d7a}
.note{background:#fff8e6;border:1px solid #f0dfae;border-left:4px solid #d9a441;padding:11px 14px;border-radius:7px;font-size:13.5px;color:#5c4813;margin:12px 0}
.danger{background:#fdecec;border:1px solid #f2cccc;border-left:4px solid #c54b4b;padding:11px 14px;border-radius:7px;font-size:13.5px;color:#8f2b2b;margin:12px 0}
ol,ul{padding-left:20px;margin:8px 0}li{margin-bottom:6px}
code{background:#eef1f4;padding:2px 6px;border-radius:4px;font-size:13px}
textarea{width:100%;height:120px;font:12px/1.5 ui-monospace,Consolas,monospace;padding:9px;border:1px solid var(--line);border-radius:7px}
button.copy{border:1px solid var(--line);background:#fff;border-radius:6px;padding:7px 14px;font-size:13px;cursor:pointer;color:var(--accent);margin-top:8px}
button.copy:hover{background:#eef4fa}
table{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:8px}
th,td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--mut);font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.04em}
.n{color:var(--mut);font-size:12.5px}
a{color:var(--accent)}
</style></head><body><div class="wrap">

<h1>Apply Bot</h1>
<div class="sub">Fills a job application form, shows you exactly what it filled, and submits only after you review and click. Works on Greenhouse, Lever, Ashby and SmartRecruiters forms, which is where ${tabs.tabA.length + tabs.tabB.length} of your listed jobs live.</div>

<div class="card">
<h2 style="margin-top:0">Install it once</h2>
<ol>
<li>Show your browser's bookmarks bar: <code>Ctrl + Shift + B</code>.</li>
<li>Drag this button onto the bookmarks bar:</li>
</ol>
<p style="text-align:center;margin:16px 0"><a class="bm" href="${bookmarklet}">Apply Bot</a></p>
<p class="n">If dragging does not work, right-click the bookmarks bar, choose "Add page", put anything in the name, and paste the code from the box below into the URL field.</p>
<textarea id="code" readonly>${esc(bookmarklet)}</textarea>
<button class="copy" onclick="navigator.clipboard.writeText(document.getElementById('code').value).then(()=>{this.textContent='copied';setTimeout(()=>this.textContent='copy bookmarklet code',1400)})">copy bookmarklet code</button>
</div>

<div class="card">
<h2 style="margin-top:0">Use it on every application</h2>
<ol>
<li>Open a job from your list and click <b>Apply</b> on the company's site.</li>
<li>On the application form, click the <b>Apply Bot</b> bookmark.</li>
<li>Press <b>1 — Fill this form</b>. It fills your details, picks the safe answers on yes/no questions, and drops prepared text into the written ones.</li>
<li><b>Read the table it shows you.</b> Every filled field is listed with its value.</li>
<li>Attach your resume by hand. Browsers do not let scripts touch file inputs, and no tool can get around that.</li>
<li>Press <b>2 — I reviewed it, submit now</b> and confirm.</li>
</ol>
</div>

<div class="danger">
<b>The one thing it will never do for you.</b> It does not answer yes/no questions about technologies you have not used. If a form asks about Debezium, PeerDB, Kafka, Spark, Kubernetes, Terraform, Go, Java or Scala, it stops and shows the question in red. You have no production experience with any of them, and a false tick there is caught in the first technical round. Answer those yourself, honestly.
</div>

<div class="note">
<b>Why it does not submit on its own.</b> Greenhouse, Lever and Ashby all prohibit automated submission, and being flagged can lock your email out of applications at most of these companies at once. One click per application keeps you inside the rules and gives you the chance to catch a wrong answer before it is permanent.
</div>

<h2>What it fills automatically</h2>
<div class="card">
<table>
<tr><th>Field</th><th>Value</th></tr>
<tr><td>Name, email, phone</td><td>Imran Pasha · imranpasha.ahmed@gmail.com · +91 98445 48537</td></tr>
<tr><td>LinkedIn, GitHub, portfolio</td><td>linkedin.com/in/imran-pasha-019b2b213 · github.com/Imranpasha30 · imranportfolio.duckdns.org</td></tr>
<tr><td>Location</td><td>Hyderabad, India</td></tr>
<tr><td>Current employer / title</td><td>Sharkify Private Limited · Backend Engineer</td></tr>
<tr><td>Experience / notice period</td><td>2 years · 30 days</td></tr>
<tr><td>Current / expected CTC</td><td>5.54 · 14-18 (lakhs)</td></tr>
<tr><td>Education</td><td>Sahyadri College of Engineering (VTU) · Computer Science · 2024</td></tr>
<tr><td>Visa sponsorship / work rights</td><td>No sponsorship needed · authorised to work in India</td></tr>
<tr><td>Written answers</td><td>16 prepared answers covering databases, Python, Node.js, AWS, security, incidents, open source, system design, and honest answers for Go and infrastructure as code</td></tr>
</table>
<p class="n">To change any of these, edit the <code>P</code> object at the top of <code>source/apply-bot.js</code>, re-run <code>node make_bot_page.js</code>, and re-install the bookmarklet.</p>
</div>

<h2>Questions that still need your own answer</h2>
<div class="card">
<p class="n">I pulled the real application questions from ${perJob.length} of your listed jobs through the Greenhouse API. ${ranked.length} distinct non-standard questions came back. Almost all are profile data the bot already handles. These ${needsAnswer.length} are the ones that need a human answer, and most appear at a single company.</p>
${needsAnswer.length ? `<table><tr><th>Question</th><th>Asked by</th></tr>
${needsAnswer.slice(0, 30).map(q => `<tr><td>${esc(q.label.slice(0, 190))}</td><td>${q.asked_by} co.</td></tr>`).join('')}
</table>` : '<p class="n">None beyond what the bot already answers.</p>'}
<p class="n" style="margin-top:12px">When the bot hits something it cannot answer, it lists the question and gives you a <b>copy unanswered</b> button. Paste that into Claude and you will get an answer written from your real experience, which you then paste back into the form.</p>
</div>

<h2>The honest limits</h2>
<div class="card">
<ul>
<li><b>Resume upload is manual.</b> A browser will not let any script set a file input. Nothing can change that.</li>
<li><b>"Why this company" is left blank on purpose.</b> It is the one answer that has to be specific, and a generic one is obvious to the reader.</li>
<li><b>Some forms need an account first.</b> Workday and custom portals are not supported; the bot covers the four ATS platforms your list actually uses.</li>
<li><b>CAPTCHAs stop everything.</b> Solve it yourself, then press fill.</li>
<li><b>Check the table before you submit.</b> Label detection is heuristic. It is right most of the time, not always, and you are the one signing the application.</li>
</ul>
</div>

</div></body></html>`;

fs.writeFileSync('apply-bot.html', html);
console.log('apply-bot.html written');
console.log('bookmarklet length: ' + bookmarklet.length + ' chars' + (bookmarklet.length > 65000 ? '  (WARNING: may exceed browser bookmark limits)' : '  (fine for Chrome/Edge)'));
console.log('jobs with harvested questions: ' + perJob.length);
console.log('distinct questions: ' + ranked.length + ' | needing a human answer: ' + needsAnswer.length);
