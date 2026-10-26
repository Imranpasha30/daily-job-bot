// Three fixes found by testing resume-picker.html against real job descriptions:
//  1. variant scoring counted raw keyword repeats, so a Python-heavy AI job picked the wrong resume
//  2. "proficiency in Go," was not detected as Go
//  3. a bare "Compensation: 3.6 LPA" (no currency symbol, no range) was not parsed, so the pay cut was missed
const fs = require('fs');
let h = fs.readFileSync('resume-picker.html', 'utf8');
const before = h.length;

// ---- 1. score on DISTINCT lead terms, and let a clear GenAI signal win outright
const oldScore = `  VARIANTS.forEach(function(v){
    var m = low.match(v.lead) || [];
    var uniq = {}; m.forEach(function(x){ uniq[x.toLowerCase()] = 1; });
    r.variants.push({ v:v, hits:m.length, uniq:Object.keys(uniq).length, raw:m.length * v.weight });
  });`;
const newScore = `  VARIANTS.forEach(function(v){
    var m = low.match(v.lead) || [];
    var uniq = {}; m.forEach(function(x){ uniq[x.toLowerCase().replace(/\\s+/g,' ')] = 1; });
    var distinct = Object.keys(uniq).length;
    // distinct technologies named matters far more than how often one word repeats
    r.variants.push({ v:v, hits:m.length, uniq:distinct, raw:(distinct * 3 + Math.min(m.length, distinct * 2)) * v.weight });
  });
  // three or more distinct GenAI terms is a specialist signal that should decide it
  var ai = r.variants.filter(function(x){ return x.v.id === 'ai'; })[0];
  if (ai && ai.uniq >= 3) ai.raw *= 1.6;`;
if (!h.includes(oldScore)) { console.error('scoring block not found'); process.exit(1); }
h = h.replace(oldScore, newScore);

// ---- 2. Go detection that survives "Strong proficiency in Go, with experience in..."
const oldGo = `  ['Go / Golang',/\\b(golang|\\bgo\\b(?=\\s*(developer|engineer|programming|lang|experience|proficien))|written in go|go experience)\\b/i,'No production Go. You debugged a Go RTMP relay once; that is the honest answer.'],`;
const newGo = `  ['Go / Golang',/\\bgolang\\b|proficien\\w*\\s+(in|with)\\s+go\\b|experience\\s+(in|with)\\s+go\\b|\\bgo\\b\\s*,\\s*(with|and|ruby|python|rust|java|zig)|written in go\\b|\\bgo\\b\\s+(developer|engineer|programming|services|microservice)/i,'No production Go. You debugged a Go RTMP relay once; that is the honest answer.'],`;
if (!h.includes(oldGo)) { console.error('go rule not found'); process.exit(1); }
h = h.replace(oldGo, newGo);

// ---- 3. salary: handle a bare "3.6 LPA" with no currency marker and no range
const oldSal = `  if ((sm = t.match(/(?:₹|rs\\.?|inr)\\s*([\\d.,]+)\\s*(?:-|–|to)?\\s*([\\d.,]+)?\\s*(?:lpa|lakh|lacs|l\\b)/i))) {`;
const newSal = `  if ((sm = t.match(/(?:₹|rs\\.?|inr)?\\s*([\\d.,]+)\\s*(?:-|–|to)\\s*(?:₹|rs\\.?|inr)?\\s*([\\d.,]+)\\s*(?:lpa|lakh|lacs)/i))) {
    sal = { cur:'INR', lo:parseFloat(sm[1].replace(/,/g,'')), hi:parseFloat(sm[2].replace(/,/g,'')) };
  } else if ((sm = t.match(/(?:₹|rs\\.?|inr)?\\s*([\\d.,]+)\\s*(?:lpa|lakh|lacs)\\b/i))) {
    sal = { cur:'INR', lo:parseFloat(sm[1].replace(/,/g,'')), hi:null };
  } else if ((sm = t.match(/(?:₹|rs\\.?|inr)\\s*([\\d.,]+)\\s*(?:-|–|to)?\\s*([\\d.,]+)?/i))) {`;
if (!h.includes(oldSal)) { console.error('salary block not found'); process.exit(1); }
h = h.replace(oldSal, newSal);

fs.writeFileSync('resume-picker.html', h);
console.log('patched: ' + before + ' -> ' + h.length + ' chars');
