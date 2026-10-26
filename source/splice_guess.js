// Splice source/guess_block.js into resume-picker.html, replacing the old guess().
// The block lives in its own file so no shell or template-literal escaping can touch
// its backslashes -- an earlier attempt through a bash heredoc turned \b into 0x08.
const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, '..', 'resume-picker.html');
const BLOCK = path.join(__dirname, 'guess_block.js');

let h = fs.readFileSync(HTML, 'utf8');
const block = fs.readFileSync(BLOCK, 'utf8');

const start = h.indexOf('function guess(t){');
const end = h.indexOf('function hAdd(');
if (start < 0 || end < 0) { console.error('markers not found'); process.exit(1); }

h = h.slice(0, start) + block + h.slice(end);

// the whole inline script must still parse before we commit the file
const src = h.match(/<script>([\s\S]*)<\/script>/)[1];
new Function(src);

fs.writeFileSync(HTML, h);
console.log('guess() spliced in, inline script parses');
console.log('  bytes:', h.length);
console.log('  no stray control chars:', !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(src));
