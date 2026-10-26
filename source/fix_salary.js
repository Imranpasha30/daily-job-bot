// Parse absolute rupee figures too ("Rs 9,00,000 per annum"), not just "9 LPA".
const fs = require('fs');
const L = fs.readFileSync('resume-picker.html', 'utf8').split('\n');

const i = L.findIndex(l => l.includes("} else if ((sm = t.match(/₹"));
if (i < 0) { console.error('anchor not found'); process.exit(1); }

L[i] = [
  "  } else if ((sm = t.match(/(?:₹|\\brs\\.?|\\binr\\b)\\s*([\\d][\\d,]{5,})/i))) {",
  "    // absolute annual figure such as Rs 9,00,000 - convert to lakhs",
  "    var abs = parseFloat(sm[1].replace(/,/g, ''));",
  "    if (abs >= 100000 && abs <= 100000000) sal = { cur:'INR', lo: Math.round(abs / 10000) / 10, hi: null };",
  "  } else if ((sm = t.match(/₹\\s*([\\d.,]+)\\s*(?:-|–|to)\\s*₹?\\s*([\\d.,]+)/i))) {",
].join('\n');

fs.writeFileSync('resume-picker.html', L.join('\n'));
const src = L.join('\n');
new Function(src.match(/<script>([\s\S]*)<\/script>/)[1]);
console.log('absolute-rupee branch added, JS syntax OK');
