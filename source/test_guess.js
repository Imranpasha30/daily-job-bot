// Extraction + salary-parse checks for resume-picker.html
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('C:/Users/user/AppData/Local/Temp/claude/e--resume/d86e2230-6c3a-4931-9153-f2eb22e9d1b8/scratchpad/build/node_modules/jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'resume-picker.html'), 'utf8');

// [label, jd, expected company, expected title]
const CASES = [
  ['at <Company>.',
   'Backend Developer at Crucifer AI Technologies.\nWe are looking for a Backend Developer to build our Academy platform.\nPython, FastAPI, PostgreSQL, SQL, Redis. 2-4 years.',
   'Crucifer AI Technologies', 'Backend Developer'],
  ['<Company> is hiring',
   'AI Backend Engineer. Techolution is hiring.\nStrong Python, FastAPI, Pydantic, LLMs, RAG, vector databases. 1-4 years.',
   'Techolution', 'AI Backend Engineer'],
  ['at <Company>, then city',
   'Backend Software Engineer at No Limit Nodes.\nWhitefield Bangalore. Python, REST APIs, PostgreSQL, Redis, Docker. 2 years.',
   'No Limit Nodes', 'Backend Software Engineer'],
  ['About <Company> on its own line',
   'About Zscaler\nZscaler accelerates digital transformation.\nSoftware Development Engineer\nPython, REST APIs, PostgreSQL, 3 years.',
   'Zscaler', 'Software Development Engineer'],
  ['is looking for a <Title>',
   'Sigmoid is looking for a Full Stack Software Development Engineer II.\nPython, SQL, REST API, microservices, AWS. 2-5 years.',
   'Sigmoid', 'Full Stack Software Development Engineer II'],
  ['title line only, no company',
   'Senior Backend Engineer\nPython, Django, PostgreSQL, Redis, Celery, AWS. 4 years.',
   '', 'Senior Backend Engineer'],
  ['Job Description: prefix',
   'Job Description: Backend Engineer\nJoin Razorpay and build payment rails.\nNode.js, Express, MongoDB, Redis. 2 years.',
   'Razorpay', 'Backend Engineer'],
  ['"for" inside a real title',
   'Backend Engineer for Payments Platform\nPython, PostgreSQL, Kafka, REST APIs. 3 years.',
   '', 'Backend Engineer for Payments Platform'],
];

// [label, jd, expected salary string fragment]
const SAL = [
  // the page reports the TOP of a range, so 14-18 LPA shows as "Pays up to 18 LPA"
  ['bare LPA range',    'Backend Engineer. Python, REST APIs. CTC: 14-18 LPA. 2 years.',            '18'],
  ['single LPA',        'Backend Engineer. Python, REST APIs. Compensation: 3.6 LPA. 2 years.',      '3.6'],
  ['Rs absolute',       'Backend Engineer. Python, REST APIs. Salary Rs 9,00,000 per annum. 2 years.', '9'],
  ['rupee symbol',      'Backend Engineer. Python, REST APIs. \u20b9 12 - 16 LPA. 2 years.',         '16'],
  ['no pay stated',     'Backend Engineer. Python, REST APIs, PostgreSQL. 2 years experience.',      null],
  ['"years" must not parse as rupees', 'Backend Engineer. Python, REST APIs. 2 years of experience required.', null],
];

(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), pretendToBeVisual: true, url: 'http://localhost/' });
  await new Promise(r => setTimeout(r, 80));
  const D = dom.window.document;
  let pass = 0, fail = 0;

  const run = jd => {
    D.getElementById('jd').value = jd;
    D.getElementById('co').value = '';
    D.getElementById('ti').value = '';
    D.getElementById('run').click();
  };

  console.log('COMPANY AND TITLE\n');
  for (const [label, jd, wantCo, wantTi] of CASES) {
    run(jd);
    const co = D.getElementById('co').value;
    const ti = D.getElementById('ti').value;
    const ok = co === wantCo && ti === wantTi;
    ok ? pass++ : fail++;
    console.log((ok ? '  ok   ' : '  FAIL ') + label);
    console.log('         company "' + co + '"' + (co === wantCo ? '' : '   expected "' + wantCo + '"'));
    console.log('         title   "' + ti + '"' + (ti === wantTi ? '' : '   expected "' + wantTi + '"'));
  }

  console.log('\nSALARY\n');
  for (const [label, jd, want] of SAL) {
    run(jd);
    const el = dom.window.document.body.textContent;
    const shown = (el.match(/Pays up to [\d.]+ LPA/) || [])[0] || null;
    const hasNaN = /NaN/.test(el);
    const ok = hasNaN ? false : (want === null ? shown === null : (shown || '').indexOf(want) >= 0);
    ok ? pass++ : fail++;
    console.log((ok ? '  ok   ' : '  FAIL ') + label.padEnd(36) + ' -> ' + (shown === null ? 'no pay figure read' : shown) + (hasNaN ? '   [NaN ON PAGE]' : ''));
  }

  dom.window.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exitCode = fail ? 1 : 0;
})();
