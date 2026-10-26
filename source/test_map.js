// Check which MAP rule (if any) matches each real-world label.
const fs = require('fs');
const src = fs.readFileSync('apply-bot.js', 'utf8');
const pSrc = src.match(/var P = \{[\s\S]*?\n\};/)[0];
const mSrc = src.match(/var MAP = \[[\s\S]*?\n\];/)[0];
const cSrc = src.match(/var CHOICE = \[[\s\S]*?\n\];/)[0];
const get = new Function(pSrc + mSrc + cSrc + ' return {P:P, MAP:MAP, CHOICE:CHOICE};');
const { MAP, CHOICE } = get();

const LABELS = [
  'Total Professional Experience* question_37941940002',
  'Relevant Professional Experience* question_37941941002',
  'Did you know about Sigmoid before our reach-out? * question_37941944002',
  'How did you come to know about Sigmoid?* question_37941945002',
  'Location Preference* question_37941949002',
  'Start date month* start-month--0',
  'Start date year* Start date year* Start date year start-year--0',
  'End date month* end-month--0',
  'What is the one word that comes to your mind when you think of Sigmoid as a place to work?* question_37941946002',
  'First Name* First Name* First Name first_name',
  'Location (City)* candidate-location',
  'Current Company* Current Company* Current Company question_37941938002',
  'Notice Period (In Days)* Notice Period (In Days)* Notice Period (In Days) question_37941939002',
  'Current CTC (In Lakhs - INR)* question_37941942002',
  'Expected CTC (In Lakhs - INR)* question_37941943002',
  'LinkedIn Profile* LinkedIn Profile* LinkedIn Profile question_37941947002',
  'Website Website Website question_37941948002',
];

console.log('MAP rules: ' + MAP.length + ', CHOICE rules: ' + CHOICE.length + '\n');
for (const L of LABELS) {
  let hit = null, idx = -1;
  for (let i = 0; i < MAP.length; i++) if (MAP[i][0].test(L)) { hit = MAP[i][1]; idx = i; break; }
  const tag = hit !== null ? ('#' + idx + ' -> ' + String(hit).slice(0, 30)) : 'NO RULE';
  console.log(tag.padEnd(44) + ' | ' + L.slice(0, 68));
}
