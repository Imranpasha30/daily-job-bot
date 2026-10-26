// Repair backslash escapes that an earlier bash-written patch flattened into control
// characters: \b became a literal 0x08 backspace inside two of the salary regexes.
// Uses fromCharCode so no shell or literal escaping is involved.
const fs = require('fs');
const path = require('path');
const HTML = path.join(__dirname, '..', 'resume-picker.html');

let h = fs.readFileSync(HTML, 'utf8');
const BS = String.fromCharCode(8);

const before = (h.split(BS).length - 1);
h = h.split(BS).join('\\b');

// the original intent was \brs\.? with the dot escaped. The unescaped form is what
// used to match the "rs" inside "years" and produce "NaN LPA", so put the escape back.
const loose = 'rs.?';
const tight = 'rs\\.?';
let fixedDot = 0;
h = h.replace(/\\brs\.\?/g, function () { fixedDot++; return '\\brs\\.?'; });

const src = h.match(/<script>([\s\S]*)<\/script>/)[1];
new Function(src);

fs.writeFileSync(HTML, h);
console.log('backspace chars repaired : ' + before);
console.log('unescaped dots repaired  : ' + fixedDot);
console.log('control chars remaining  : ' + (src.match(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g) || []).length);
console.log('inline script parses     : yes');
