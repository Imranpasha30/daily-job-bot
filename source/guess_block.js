function guess(t){
  var lines = t.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
  var title = '', company = '';
  var TITLE = /\b(engineer|developer|architect|analyst|scientist|manager|intern|sde|programmer|consultant)\b/i;
  var NOISE = /^(job description|about the job|about the role|role|position|title)\s*:?\s*/i;

  for (var i = 0; i < Math.min(lines.length, 12); i++) {
    var L = lines[i].replace(NOISE, '').trim();
    if (!L || L.length > 110 || !TITLE.test(L)) continue;
    // "<Company> is looking for a Backend Engineer" -> keep only the role
    var lf = L.match(/(?:looking|hiring|seeking|recruiting)\s+for\s+(?:an?\s+)?(.+)/i);
    if (lf) L = lf[1];
    L = L.split(/\s+(?:at|@|with)\s+/i)[0];         // drop " at <Company>"
    L = L.split(/\s+(?:to|who|that|which)\s+/i)[0]; // drop " to build our platform"
    L = L.split(/[.|•–—]/)[0];       // stop at the first sentence or separator
    L = L.replace(/[\s,:;\-]+$/, '').trim();
    if (L && L.length <= 80 && TITLE.test(L)) { title = L; break; }
  }

  // Company names are a run of capitalised words joined by spaces or tabs only, and the
  // character class holds no full stop, so a match can cross neither a sentence boundary
  // ("Crucifer AI Technologies.We") nor a line break ("About Zscaler\nZscaler" -> "ZscalerZscaler").
  var WORD = "[A-Z][A-Za-z0-9&'-]*";
  var NAME = WORD + "(?:[ \\t]+" + WORD + "){0,3}";
  var m = t.match(new RegExp("\\b(?:[Aa]t|[Jj]oin|[Ww]ith)[ \\t]+(" + NAME + ")"));
  if (m) company = m[1];
  if (!company) {
    var m2 = t.match(new RegExp("\\b(" + NAME + ")[ \\t]+(?:is|are)[ \\t]+(?:looking|hiring|seeking|growing|a\\b)"));
    if (m2) company = m2[1];
  }
  if (!company) {
    var m3 = t.match(new RegExp("\\bAbout[ \\t]+(" + NAME + ")"));
    if (m3) company = m3[1];
  }
  // trim trailing filler a capitalised run can still pick up
  if (company) company = company.replace(/[ \t]+(We|The|Our|Is|Are|A|An)$/i, '').trim();

  return { title: title.slice(0,80), company: company.slice(0,60) };
}

