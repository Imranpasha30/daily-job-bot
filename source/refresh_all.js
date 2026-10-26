// Master script to refresh both Backend Engineer and Cybersecurity job pipelines
const { execSync } = require('child_process');
const path = require('path');

function run(cmd, desc) {
  console.log(`\n========================================`);
  console.log(`>>> ${desc} (${cmd})`);
  console.log(`========================================`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: __dirname });
  } catch (err) {
    console.error(`Error running ${cmd}:`, err.message);
  }
}

console.log('Starting full refresh at ' + new Date().toISOString());

// 1. Backend pipeline
run('node fetch.js', 'Fetching remote backend jobs');
run('node ats.js', 'Probing ATS boards for backend jobs (Round 1)');
run('node ats2.js', 'Probing ATS boards for backend jobs (Round 2)');
run('node merge.js', 'Merging and ranking backend jobs');
run('node build_html.js', 'Building backend jobs.html');

// 2. Cybersecurity pipeline
run('node fetch_cyber.js', 'Fetching remote cybersecurity jobs');
run('node ats_cyber.js', 'Probing ATS boards for cybersecurity jobs');
run('node merge_cyber.js', 'Merging and ranking cybersecurity jobs');
run('node build_cyber_html.js', 'Building cybersecurity cyber_jobs.html');

// 3. Unified Web Portal
run('node build_portal.js', 'Building unified web portal index.html');

console.log('\n========================================');
console.log('All jobs successfully refreshed!');
console.log('Unified Web Portal:    Jobs/index.html');
console.log('Backend tracker:       Jobs/jobs.html');
console.log('Cybersecurity tracker: Jobs/cyber_jobs.html');
console.log('========================================\n');
