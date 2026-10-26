(function () {
'use strict';
if (window.__iab) { window.__iab.show(); return; }

/* ============ 1. PROFILE ============ */
var P = {
  first:'Imran', last:'Pasha', full:'Imran Pasha',
  email:'imranpasha.ahmed@gmail.com',
  phone:'+91 98445 48537',
  linkedin:'https://linkedin.com/in/imran-pasha-019b2b213',
  github:'https://github.com/Imranpasha30',
  portfolio:'https://imranportfolio.duckdns.org',
  addr1:'Hyderabad', addr2:'', city:'Hyderabad', state:'Telangana', zip:'500001',
  country:'India', location:'Hyderabad, India',
  company:'Sharkify Private Limited', title:'Backend Engineer',
  years:'2', notice:'30 days', noticeDays:'30',
  ctcCurrent:'5.54', ctcExpected:'14-18',
  school:'Sahyadri College of Engineering (VTU)', degree:"Bachelor's Degree",
  discipline:'Computer Science', gradYear:'2024',
  startMonth:'08', startYear:'2020', endMonth:'06', endYear:'2024',
  heard:'LinkedIn'
};

/* ============ 2. TEXT FIELD RULES ============ */
var MAP = [
  [/legal first name|^first ?name|given name/i, P.first],
  [/legal last name|^last ?name|surname|family name/i, P.last],
  [/preferred (first )?name|name you'?d prefer|what'?s the name you/i, P.first],
  [/preferred last name/i, P.last],
  [/^name\b(?! of )|full name|your name|candidate name|type your (full )?name/i, P.full],
  [/e-?mail/i, P.email],
  [/phone|mobile|contact number|whatsapp/i, P.phone],
  [/linked ?in/i, P.linkedin],
  [/git ?hub/i, P.github],
  [/portfolio|personal (web)?site|^website|blog|other website/i, P.portfolio],
  [/address line 1|street address|mailing address|legal mailing/i, P.addr1],
  [/address line 2/i, P.addr2],
  [/zip|postal code|pin ?code/i, P.zip],
  [/^city|current city|city and state|where do you reside|primary residence/i, P.city],
  [/^state|province|region/i, P.state],
  [/country/i, P.country],
  [/location \(city\)|candidate-location|current (location|address)|where are you (based|located)|^location\b(?! preference)/i, P.city],
  [/location preference|preferred (work )?location|which (office|location)/i, 'Bangalore'],
  [/did you know about .{0,30}before|have you heard of|aware of (us|our company)/i, 'No'],
  [/how did you come to know|how did you find (us|this)|source of application/i, P.heard],
  [/name of (your )?current employer|current (company|employer|firm)|present company|most recent employer|who is your current/i, P.company],
  [/current (or previous )?(job )?title|current designation|current role|present designation/i, P.title],
  [/relevant for this role|total (years|professional)|years? of experience|experience.{0,14}(years|yrs)|relevant professional experience/i, P.years],
  [/notice period.{0,12}(days|in days)/i, P.noticeDays],
  [/notice period|how soon can you|availability to (start|join)|when can you (start|join)|earliest start/i, P.notice],
  [/current ctc|current.{0,18}(salary|compensation|fixed)/i, P.ctcCurrent],
  [/expected ctc|expected.{0,18}(salary|compensation|fixed)|salary expectation|compensation expectation/i, P.ctcExpected],
  [/school|university|college|institution/i, P.school],
  [/degree/i, P.degree],
  [/discipline|major|field of study|branch/i, P.discipline],
  [/primary programming language|primary (tech|technology|stack|language)|main (language|stack)|languages? (you|and framework)/i, 'Python (FastAPI) and Node.js (Express), with PostgreSQL and Redis'],
  [/start date month|start-month/i, P.startMonth],
  [/start date year|start-year/i, P.startYear],
  [/end date month|end-month/i, P.endMonth],
  [/graduat|year of (passing|completion)|end date year|end-year|end year/i, P.gradYear]
];

/* ============ 3. CHOICE RULES (safe, factual only) ============ */
var CHOICE = [
  [/require sponsorship|require .{0,20}(visa|immigration)|need sponsorship|sponsor .{0,20}(you|immigration)|commence .{0,12}sponsor/i, /^no$/i],
  [/legally authorized to work|right to work|authorised to work|work authorization/i, /permanent work rights|^yes$/i],
  [/are you (currently )?(located|based|residing) in|located in india|based in india/i, /^yes$/i],
  [/willing to relocate|open to relocat/i, /^yes$/i],
  [/at least 18|18 years of age|over 18/i, /^yes$/i],
  [/(previously|ever) (worked|been employed)|do you currently or have you previously worked|have you been employed by/i, /^no$/i],
  [/family members|relatives or personal relationships|personal relationship/i, /^no$/i],
  [/outside business activit/i, /^no$/i],
  [/employment agreements|post-employment restrictions|non-?compete/i, /^no$/i],
  [/notice period/i, /30-45 days|^30 days|1 month/i],
  [/total years of experience|years of experience/i, /^2$/],
  [/current designation/i, /experienced professional/i],
  [/how did you (learn|hear)|where have you learned/i, /linkedin/i],
  [/sanctions and export controls|confirm whether any of the below/i, /none of the above/i],
  [/acknowledge|consent|privacy policy|processing of personal data|i certify|agree to its terms/i, /^(yes|i acknowledge|acknowledge|confirm|i agree|agree)/i]
];

/* ============ 4. WRITTEN ANSWERS ============ */
var A = [
 ['Why this company (WRITE YOURSELF)', /why (do you want|are you interested|this company|join|us\b)|what excites you about|interest in (our|the) (company|role|team)|why should we/i,
  '*** WRITE THIS ONE YOURSELF. Name the product and one specific thing about it. A generic answer here is obvious and costs you the screen. ***'],
 ['Tell us about yourself / summary', /about yourself|tell us about you|^summary|cover letter|introduce yourself|describe yourself/i,
  'I am a backend engineer with nearly two years building production APIs and distributed systems in Python with FastAPI and in Node.js with Express. I am the founding backend engineer on Kaizer X, an AI video production SaaS, where I rewrote a Django prototype as FastAPI and owned it solo for five months; it now serves 765 REST and WebSocket routes over 150 PostgreSQL tables. I also built a field-service payments platform end to end as the sole backend engineer: three payment gateways behind one facade with HMAC-verified webhooks and idempotent settlement. I hold a postgraduate certification in cyber security from IIT Roorkee and apply it directly to API design.'],
 ['Why looking for a change', /looking for a (change|new role)|why (are you )?leav|reason for (change|switch|leaving)/i,
  'I have taken my current backend work about as far as the scope allows. In under two years I have gone from building features to founding and owning a production backend end to end, and I am looking for a team where I can keep working on systems at that level of complexity alongside more senior engineers I can learn from.'],
 ['Databases', /database|postgres|\bsql\b|rdbms|data model/i,
  'Databases are my strongest area. I design and tune PostgreSQL rather than just query it: 68 tables across 37 transactional migrations on a payments platform I owned solo, 150 tables on the AI video SaaS I founded the backend for, and a 9.9 million row dataset I held under a second per read using composite indexes designed off EXPLAIN ANALYZE, rewritten aggregates and Redis caching. Day to day that means FOR UPDATE SKIP LOCKED job queues with lease fencing, advisory locks for reserve-and-confirm flows, ON CONFLICT upserts, row locks on wallet and payout tables, and pool tuning for pgBouncer. On Redis I use Streams with consumer groups, XCLAIM recovery and dead-letter streams, plus Lua token-bucket rate limiting.'],
 ['Python / pipelines / scale', /python|pipeline|\betl\b|scale of data|large dataset|throughput|data volume/i,
  'At Sharkify I built the backend for Voter Connect, a campaign platform running on a 9.9 million row PostgreSQL dataset. Reads had to stay under a second for field volunteers on mobile, which I achieved with composite indexes designed off EXPLAIN ANALYZE query plans, rewritten aggregate queries, and Redis caching on the hot lookup paths.\n\nOn Kaizer X I own a multi-stage Python pipeline that moves video through transcription, LLM-driven edit decisions and FFmpeg rendering. Stages are coordinated by a durable PostgreSQL job queue using FOR UPDATE SKIP LOCKED with lease fencing and exponential backoff, plus a Redis Streams consumer-group queue with XCLAIM crash recovery and a dead-letter stream.'],
 ['Node.js / TypeScript', /node\.?js|typescript|javascript|express/i,
  'I built the user-identity domain of a TypeScript/Express API using InversifyJS dependency injection: registration with email one-time passcodes, multi-role login, a three-step password reset, referral codes and Google OAuth 2.0 authorization-code exchange, plus the post-payment fulfilment pipeline for PayU checkout. I also built an entire field-service platform on Node.js and Express as sole backend engineer: 23 modules, roughly 200 REST endpoints, three payment gateways, and about 400 parameterised node-postgres queries with ON CONFLICT upserts and row locks.'],
 ['AWS / cloud', /\baws\b|cloud (experience|services|platform)|\bs3\b|\bec2\b|lambda|\bgcp\b|azure/i,
  'S3: hands-on and heavy. I migrated object storage from AWS SDK v2 to v3 with dynamic per-user key paths, delete-on-replace and guaranteed temp-file cleanup on failed uploads, and built storage layers against the same S3 API using boto3 with presigned URLs, environment-prefixed key namespaces and a local fallback.\n\nEC2: two services deploy there as Docker containers through GitHub Actions, writing env from secrets, rebuilding the image and replacing the running container behind NGINX.\n\nLambda: I prototyped handlers for availability checks and OTP dispatch, then folded them back into the FastAPI service to reduce operational surface.'],
 ['Infrastructure as code (honest)', /infrastructure as code|\biac\b|terraform|pulumi|ansible|cloudformation/i,
  'I have not used Terraform, Pulumi or Ansible. What I have done is define infrastructure declaratively in multi-stage Dockerfiles running as non-root, Docker Compose, render.yaml, railway.toml and nixpacks for build-time system dependencies, Procfiles and systemd units for multi-process deployments, and GitHub Actions pipelines that build an image and replace the running container on EC2. The concepts transfer; the specific tool would be a ramp-up.'],
 ['Go (honest)', /\bgolang\b|\bgo\b.{0,18}(experience|lang)|experience with go/i,
  'I have not shipped Go in production. My closest exposure was debugging a Go RTMP relay that panicked in production and took every channel on a live broadcast off air. I traced it to an index-out-of-range on a video-only FLV header after an ffmpeg restart, found that every test fixture emitted two streams from frame zero so the single-stream path was never covered, and wrote the regression test. I can read Go and I want to write it.'],
 ['Hardest problem / incident', /incident|outage|debug|hardest|most challenging|difficult (bug|problem)|production issue|proud of/i,
  'A Redis upload stream on Kaizer X grew from 8 entries to over 619,000 at roughly 80 enqueues per second. I traced it to a time-of-check-to-time-of-use race between two worker paths reading job status and a re-enqueue loop with no backoff. I replaced the status check with an atomic conditional UPDATE claim and removed the loop; the stream then held steady at one message. I wrote a regression test that reproduces the race before shipping the fix.'],
 ['Security', /security|owasp|vulnerab|appsec|secure cod|penetration/i,
  "I hold an Executive Post Graduate Certification in Cyber Security and Ethical Hacking from IIT Roorkee's iHUB DivyaSampark, and I apply it to API design rather than keeping it separate. I closed a two-round adversarial security review on Kaizer X with a regression test behind every fix, covering cross-tenant authorization (BOLA and IDOR) on live-broadcast controls and WebSockets, an OAuth callback XSS, and password-reset links that trusted an attacker-controlled Origin header. I also wrote an SSRF guard that resolves DNS before refusing loopback, private, link-local and cloud-metadata addresses."],
 ['Open source', /open ?source|oss contribution|github contribution/i,
  'Nothing upstream in other projects yet, so I will not pretend otherwise. What I do have is public work of my own: an LLM Red-Team Platform with a deliberately vulnerable RAG target, a four-control guardrail layer in dependency-free Python, and an OWASP LLM Top 10 attack harness around both, including 35 hand-written detection signatures and Unicode normalisation so zero-width evasion still matches.\n\ngithub.com/Imranpasha30/llm-redteam-platform'],
 ['Microservices / system design', /microservice|system design|distributed system|scalab|architecture/i,
  'I designed a durable publish queue on PostgreSQL using FOR UPDATE SKIP LOCKED with lease fencing, heartbeat renewal, priority aging and jittered exponential backoff, so workers on separate hosts claim each job exactly once without an external coordinator, plus a leader-elected cron runner on advisory locks. Alongside it I built a Redis Streams consumer-group queue with three priority lanes, XCLAIM crash recovery and a dead-letter stream, and eliminated duplicate publishes with SHA-256 idempotency keys arbitrated by a database UNIQUE constraint.'],
 ['AI tools you use', /\bai tools?\b|how are you using (ai|llm)|use of ai|genai tools/i,
  'I use Claude and Gemini daily as a pair-programmer for scaffolding, refactors and reviewing my own designs, and I treat their output as a draft I am responsible for rather than something to paste. I have also integrated them as product features: a provider-agnostic LLM layer over Gemini, Claude and OpenAI with per-model token buckets, circuit breakers, Retry-After aware retry ladders and a cost meter.'],
 ['Accommodations', /accommodat|accessible.{0,20}interview|adjustments/i, 'No accommodations needed, thank you for asking.'],
 ['Referral name', /referred by|employee referral|name of the employee/i, 'N/A'],
 ['Pronouns', /pronoun/i, 'he/him']
];

/* ============ 5. TECHNOLOGIES HE MUST NOT CLAIM ============ */
var RISK = /debezium|peerdb|pyspark|\bspark\b|\bscala\b|\bkafka\b|\bmsk\b|\beks\b|kubernetes|\bk8s\b|terraform|pulumi|ansible|\bgolang\b|\brust\b|hadoop|airflow|snowflake|databricks|\bflink\b|cassandra|elasticsearch|\bjava\b|c\+\+|\.net\b|salesforce|\bphp\b|ruby|kotlin|swift|\bgo\b/i;

/* optional diversity questions - yours to answer or skip, so they are listed apart */
var EEO = /gender|hispanic|latino|\brace\b|ethnic|veteran|disabilit|self.?identif|sexual orientation|transgender/i;

/* ============ 6. DOM HELPERS ============ */
/* Forms are often not in the top document: Greenhouse and Lever are frequently embedded
   in an iframe on the company's own careers page, and some platforms use shadow DOM.
   Collect every root we are actually allowed to touch. */
var BLOCKED=0;
function roots(){
  var out=[document],seen=[document];
  function shadows(root){
    var all;
    try{all=root.querySelectorAll('*');}catch(e){return;}
    for(var i=0;i<all.length;i++){
      if(all[i].shadowRoot&&seen.indexOf(all[i].shadowRoot)<0){
        seen.push(all[i].shadowRoot);out.push(all[i].shadowRoot);shadows(all[i].shadowRoot);
      }
    }
  }
  function frames(d){
    var fr;
    try{fr=d.querySelectorAll('iframe,frame');}catch(e){return;}
    for(var i=0;i<fr.length;i++){
      var cd=null;
      try{cd=fr[i].contentDocument;}catch(e){cd=null;}
      if(cd&&cd.querySelectorAll){ if(seen.indexOf(cd)<0){seen.push(cd);out.push(cd);frames(cd);shadows(cd);} }
      else BLOCKED++;
    }
  }
  shadows(document); frames(document);
  return out;
}
function queryAll(sel){
  var out=[];
  roots().forEach(function(r){
    try{ out = out.concat([].slice.call(r.querySelectorAll(sel))); }catch(e){}
  });
  return out;
}
function docOf(f){ return f.ownerDocument||document; }

function lab(f){
  var b=[],l;
  if(f.id){try{l=docOf(f).querySelector('label[for="'+CSS.escape(f.id)+'"]');if(l)b.push(l.textContent);}catch(e){}}
  var p=f.closest('label'); if(p)b.push(p.textContent);
  var w=f.closest('div,li,fieldset,section,td');
  for(var i=0;i<4&&w;i++){
    var q=w.querySelector('label,legend,.label,[class*="label"],[class*="question"],h3,h4,p');
    if(q&&q.textContent&&q.textContent.trim().length>2){b.push(q.textContent);break;}
    w=w.parentElement;
  }
  b.push(f.getAttribute('aria-label')||'',f.placeholder||'',f.name||'',f.id||'');
  return b.join(' ').replace(/\s+/g,' ').trim();
}
/* label text only, with no name/id appended - used to spot duplicate shell inputs */
function labCore(f){
  var b=[],l;
  if(f.id){try{l=docOf(f).querySelector('label[for="'+CSS.escape(f.id)+'"]');if(l)b.push(l.textContent);}catch(e){}}
  var p=f.closest('label'); if(p)b.push(p.textContent);
  var w=f.closest('div,li,fieldset,section,td');
  for(var i=0;i<4&&w;i++){
    var q=w.querySelector('label,legend,.label,[class*="label"],[class*="question"],h3,h4,p');
    if(q&&q.textContent&&q.textContent.trim().length>2){b.push(q.textContent);break;}
    w=w.parentElement;
  }
  b.push(f.getAttribute('aria-label')||'',f.placeholder||'');
  return b.join(' ').replace(/\s+/g,' ').trim();
}
function setv(f,v){
  var proto=f instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  var s=Object.getOwnPropertyDescriptor(proto,'value').set; s.call(f,v);
  ['input','change','blur'].forEach(function(e){f.dispatchEvent(new Event(e,{bubbles:true}));});
}
function visible(f){
  if(f.tagName==='SELECT')return true;
  if(f.offsetParent!==null)return true;
  /* offsetParent is null for position:fixed subtrees and inside some frames, so fall back
     to a box measurement before deciding a field is hidden */
  try{var r=f.getBoundingClientRect();if(r.width>0&&r.height>0)return true;}catch(e){}
  return false;
}
function groupName(f){ return f.name||lab(f).slice(0,60); }

/* ============ 7. THE FILL PASS ============ */
function fill(){
  var res={done:[],written:[],risk:[],todo:[],eeo:[],files:0,blocked:0,scanned:0};
  BLOCKED=0;
  var fields=queryAll('input,textarea,select')
    .filter(function(f){
      if(f.closest('#iab'))return false;
      var t=(f.type||'').toLowerCase();
      if(['hidden','submit','button','image','reset'].indexOf(t)>=0)return false;
      if(t==='file'){res.files++;return false;}
      if(f.readOnly||f.disabled)return false;
      return visible(f);
    });

  /* Some platforms render a visible shell input next to the real one, both carrying the
     same label. Keep one per label, preferring whichever has a name or id. */
  var byLabel={};
  fields.forEach(function(f){
    if((f.type||'')==='radio'||(f.type||'')==='checkbox')return;
    /* key on the visible label only - including name/id would stop the shell and the
       real field from grouping, which is the whole point */
    var k=labCore(f).toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,70);
    if(!k)return;
    if(!byLabel[k])byLabel[k]=[];
    byLabel[k].push(f);
  });
  var drop=new Set();
  Object.keys(byLabel).forEach(function(k){
    var g=byLabel[k];
    if(g.length<2)return;
    var keep=g.filter(function(f){return f.name||f.id;})[0]||g[0];
    g.forEach(function(f){if(f!==keep)drop.add(f);});
  });
  fields=fields.filter(function(f){return !drop.has(f);});

  var seenGroup={};
  fields.forEach(function(f){
    var L=lab(f), t=(f.type||'').toLowerCase();

    /* radios + checkboxes */
    if(t==='radio'||t==='checkbox'){
      var g=groupName(f);
      if(seenGroup[g])return;
      if(RISK.test(L)){ res.risk.push({q:L.slice(0,170),el:f}); seenGroup[g]=1; return; }
      for(var i=0;i<CHOICE.length;i++){
        if(CHOICE[i][0].test(L)){
          var opts=f.name?[].slice.call(docOf(f).querySelectorAll('input[name="'+f.name.replace(/"/g,'')+'"]')):[];
          if(!opts.length)opts=[f];
          for(var k=0;k<opts.length;k++){
            var ol=lab(opts[k]).replace(L,'')||opts[k].value||'';
            if(CHOICE[i][1].test(ol.trim())||CHOICE[i][1].test(opts[k].value||'')){
              if(!opts[k].checked)opts[k].click();
              res.done.push({q:L.slice(0,90),v:(ol||opts[k].value).trim().slice(0,60)});
              seenGroup[g]=1; return;
            }
          }
          (EEO.test(L)?res.eeo:res.todo).push({q:L.slice(0,170),el:f}); seenGroup[g]=1; return;
        }
      }
      (EEO.test(L)?res.eeo:res.todo).push({q:L.slice(0,170),el:f}); seenGroup[g]=1; return;
    }

    /* selects */
    if(f.tagName==='SELECT'){
      if(f.value&&f.selectedIndex>0)return;
      if(RISK.test(L)){res.risk.push({q:L.slice(0,170),el:f});return;}
      for(var j=0;j<CHOICE.length;j++){
        if(CHOICE[j][0].test(L)){
          for(var o=0;o<f.options.length;o++){
            if(CHOICE[j][1].test(f.options[o].text.trim())){
              f.selectedIndex=o; f.dispatchEvent(new Event('change',{bubbles:true}));
              res.done.push({q:L.slice(0,90),v:f.options[o].text.trim().slice(0,60)}); return;
            }
          }
        }
      }
      (EEO.test(L)?res.eeo:res.todo).push({q:L.slice(0,170),el:f}); return;
    }

    /* long text — textareas only. A short input with a generous maxlength is still a short input. */
    if(f.tagName==='TEXTAREA'){
      if((f.value||'').trim())return;
      if(RISK.test(L)){res.risk.push({q:L.slice(0,170),el:f});}
      var hit=null;
      for(var a=0;a<A.length;a++)if(A[a][1].test(L)){hit=A[a];break;}
      res.written.push({q:L.slice(0,200),el:f,text:hit?hit[2]:'',src:hit?hit[0]:'no prepared answer'});
      return;
    }

    /* short text */
    if((f.value||'').trim())return;
    for(var m=0;m<MAP.length;m++){
      if(MAP[m][0].test(L)){
        if(MAP[m][1]!=='') setv(f,MAP[m][1]);
        res.done.push({q:L.slice(0,90),v:MAP[m][1]||'(blank)'});
        return;
      }
    }
    (EEO.test(L)?res.eeo:res.todo).push({q:L.slice(0,170),el:f});
  });
  res.blocked=BLOCKED; res.roots=roots().length;
  return res;
}

/* ============ 8. UI ============ */
var CSS_T='#iab,#iab *{all:revert;box-sizing:border-box;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif}'+'#iab{position:fixed;top:10px;right:10px;width:390px;max-height:94vh;overflow:auto;z-index:2147483647;background:#fff;border:1px solid #d7dbe0;border-radius:10px;box-shadow:0 10px 36px rgba(0,0,0,.22);font:13px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#16181d}'
+'#iab h6{margin:0;padding:11px 13px;background:#1f3a5f;color:#fff;border-radius:10px 10px 0 0;display:flex;gap:8px;align-items:center;font-size:13.5px;position:sticky;top:0;z-index:2}'
+'#iab h6 span{flex:1}#iab h6 button{background:rgba(255,255,255,.16);color:#fff;border:0;border-radius:5px;padding:4px 9px;cursor:pointer;font-size:12px}'
+'#iab .bd{display:block;position:static;padding:12px 13px}#iab .big{width:100%;padding:10px;border:0;border-radius:7px;font-weight:700;cursor:pointer;font-size:13.5px;margin-bottom:8px}'
+'#iab .b1{background:#1f3a5f;color:#fff}#iab .b1:hover{background:#2a4d7a}'
+'#iab .b2{background:#0f7b4f;color:#fff}#iab .b2:hover{background:#0c6340}#iab .b2:disabled{background:#b6c2cc;cursor:not-allowed}'
+'#iab .box{display:block;position:static;float:none;clear:both;margin:9px 0;padding:9px 10px;border-radius:7px;font-size:12.5px;line-height:1.5}'
+'#iab .ok{background:#e8f5ee;border:1px solid #bfe3d0;color:#0f5f3c}'
+'#iab .wa{background:#fff4e5;border:1px solid #f0d9ae;color:#7a4d00}'
+'#iab .da{background:#fdecec;border:1px solid #f2cccc;color:#8f2b2b}'
+'#iab table{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:5px}'
+'#iab td{padding:3px 4px;border-bottom:1px solid #eef1f4;vertical-align:top}'
+'#iab td.k{color:#5f6673;width:48%}#iab td.v{font-weight:600}'
+'#iab .q{border-top:1px solid #eceef1;padding:9px 0}#iab .q b{display:block;font-size:12px;color:#1f3a5f;margin-bottom:4px}'
+'#iab textarea{width:100%;height:84px;font:12px/1.45 inherit;padding:6px;border:1px solid #d7dbe0;border-radius:6px;resize:vertical}'
+'#iab .row{display:flex;gap:5px;margin-top:5px}#iab .row button{flex:1;padding:5px;font-size:11.5px;border:1px solid #d7dbe0;background:#f6f8fa;border-radius:5px;cursor:pointer}'
+'#iab .row button:hover{background:#eaf0f6}#iab .mini{font-size:11px;color:#5f6673;margin-top:5px}'
+'.iab-hl{outline:3px solid #d9a441 !important;outline-offset:2px}';

function E(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!==undefined)e.innerHTML=h;return e;}
var st=E('style');st.textContent=CSS_T;document.head.appendChild(st);
var box=E('div');box.id='iab';
var hd=E('h6','','<span>Apply bot &mdash; Imran Pasha</span>');
var bMin=E('button','','_');var bX=E('button','','x');hd.appendChild(bMin);hd.appendChild(bX);box.appendChild(hd);
var bd=E('div','bd');box.appendChild(bd);document.body.appendChild(box);

var bFill=E('button','big b1','1 — Fill this form');bd.appendChild(bFill);
var out=E('div');bd.appendChild(out);

function copy(t,b){
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).catch(function(){
    var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');}catch(e){}ta.remove();});
  var o=b.textContent;b.textContent='copied';setTimeout(function(){b.textContent=o;},1100);
}
function flash(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('iab-hl');setTimeout(function(){el.classList.remove('iab-hl');},2600);}

bFill.onclick=function(){
  var r=fill();
  out.innerHTML='';

  var touched=r.done.length+r.todo.length+r.written.length+r.risk.length+r.eeo.length;
  if(touched===0){
    var why=E('div','box da','<b>No form fields found on this page.</b>');
    var ul0=E('ul');ul0.style.cssText='margin:6px 0 0 16px;padding:0';
    var reasons=[];
    if(r.blocked)reasons.push('This page has '+r.blocked+' iframe(s) from another domain that a bookmarklet is not allowed to read. Right-click inside the form, choose "This Frame" then "Open Frame in New Tab", and run the bot there.');
    reasons.push('The form may still be loading. Wait until you can see the fields, then press Fill again.');
    reasons.push('You may be on the job advert rather than the application form. Click Apply first.');
    reasons.push('Some portals (Workday and most custom career sites) are not supported.');
    reasons.forEach(function(x){var li=E('li');li.textContent=x;li.style.marginBottom='5px';ul0.appendChild(li);});
    why.appendChild(ul0);
    why.appendChild(E('div','mini','Scanned '+r.roots+' document root(s) including iframes and shadow DOM.'));
    out.appendChild(why);
  }
  var sum=E('div','box ok','<b>Filled '+r.done.length+' field(s).</b> Review every line below before submitting.'
    +(r.blocked?' <span style="color:#8f2b2b">'+r.blocked+' cross-domain iframe(s) could not be read.</span>':''));
  if(r.done.length){
    var tb=E('table');
    r.done.forEach(function(d){
      var tr=E('tr');var k=E('td','k');k.textContent=d.q;var v=E('td','v');v.textContent=d.v;
      tr.appendChild(k);tr.appendChild(v);tb.appendChild(tr);
    });
    sum.appendChild(tb);
  }
  out.appendChild(sum);

  if(r.files)out.appendChild(E('div','box wa','<b>'+r.files+' file upload(s).</b> Attach your resume by hand — browsers do not allow a script to do this. Send the Python variant unless the job leads with Node.js.'));

  if(r.risk.length){
    var d=E('div','box da','<b>Do not claim these.</b> You have no production experience with the technology named, and the first technical round will check:');
    var ul=E('ul');ul.style.cssText='margin:6px 0 0 16px;padding:0';
    r.risk.forEach(function(x){var li=E('li');li.textContent=x.q;li.style.cssText='margin-bottom:4px;cursor:pointer;text-decoration:underline';li.onclick=function(){flash(x.el);};ul.appendChild(li);});
    d.appendChild(ul);out.appendChild(d);
  }

  if(r.todo.length){
    var t=E('div','box wa','<b>'+r.todo.length+' field(s) I could not answer.</b> Click one to jump to it. Use "copy unanswered" to send them to Claude.');
    var ul2=E('ul');ul2.style.cssText='margin:6px 0 0 16px;padding:0';
    r.todo.slice(0,14).forEach(function(x){var li=E('li');li.textContent=x.q;li.style.cssText='margin-bottom:4px;cursor:pointer;text-decoration:underline';li.onclick=function(){flash(x.el);};ul2.appendChild(li);});
    t.appendChild(ul2);
    var cb=E('button','','copy unanswered');cb.style.cssText='margin-top:7px;padding:5px 10px;font-size:11.5px;border:1px solid #d7dbe0;background:#fff;border-radius:5px;cursor:pointer';
    cb.onclick=function(){copy('Job: '+document.title+'\nURL: '+location.href+'\n\nQuestions I could not answer:\n'+r.todo.map(function(x,i){return (i+1)+'. '+x.q;}).join('\n'),cb);};
    t.appendChild(cb);out.appendChild(t);
  }

  if(r.eeo&&r.eeo.length){var eb=E('div','box','<b>'+r.eeo.length+' optional diversity question(s)</b> left untouched. These are yours to answer or skip; employers may not require them.');out.appendChild(eb);}
  r.written.forEach(function(w){
    var box2=E('div','q');box2.appendChild(E('b','',w.q));
    var ta=E('textarea');ta.value=w.text;box2.appendChild(ta);
    box2.appendChild(E('div','mini',w.src));
    var row=E('div','row');
    var ins=E('button','','insert');var cp=E('button','','copy');var go=E('button','','show');
    ins.onclick=function(){setv(w.el,ta.value);ins.textContent='inserted';setTimeout(function(){ins.textContent='insert';},1100);};
    cp.onclick=function(){copy(ta.value,cp);};
    go.onclick=function(){flash(w.el);};
    row.appendChild(ins);row.appendChild(cp);row.appendChild(go);box2.appendChild(row);
    out.appendChild(box2);
  });

  var sub=E('button','big b2','2 — I reviewed it, submit now');
  sub.style.marginTop='12px';
  sub.onclick=function(){
    if(!confirm('Submit this application as it stands?\n\nMake sure your resume is attached and every answer is true.'))return;
    var f=queryAll('form')[0];
    var btn=queryAll('button,input[type=submit]').filter(function(b){
      var t=(b.innerText||b.textContent||b.value||'').trim().toLowerCase();
      return /^(submit|submit application|apply|send application|submit my application)$/.test(t)&&b.offsetParent!==null;
    })[0];
    if(btn){btn.click();sub.textContent='submitted — check the page';sub.disabled=true;}
    else if(f){f.submit();sub.textContent='form submitted';sub.disabled=true;}
    else alert('Could not find the submit button. Scroll down and click it yourself.');
  };
  out.appendChild(sub);
  out.appendChild(E('div','mini','Nothing is sent until you click button 2 and confirm.'));
};

bMin.onclick=function(){bd.style.display=bd.style.display==='none'?'block':'none';};
bX.onclick=function(){box.remove();st.remove();window.__iab=null;};
window.__iab={show:function(){box.style.display='block';}};
})();
