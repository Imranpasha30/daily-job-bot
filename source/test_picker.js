// Drive resume-picker.html in jsdom against the real job descriptions from this chat.
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join('C:/Users/user/AppData/Local/Temp/claude/e--resume/d86e2230-6c3a-4931-9153-f2eb22e9d1b8/scratchpad/build/node_modules/jsdom'));

const JDS = {
  'Techolution — AI Backend Engineer': `AI Backend Engineer. Remote. Exp Range: 1-4 years.
We are looking for an AI Backend Engineer with strong Python backend development skills and practical exposure to Generative AI. Develop, maintain and optimize backend services and REST APIs using Python and FastAPI/Flask. Build modular reusable services using Object-Oriented Programming. Design data models and validation logic using Pydantic. Build, customize and integrate AI agents. Develop and integrate Retrieval-Augmented Generation workflows using LLMs, embedding models, and vector databases. Work with NoSQL databases, data modeling, and Redis or other caching mechanisms. Use Python asynchronous programming. Investigate application issues, analyze logs, identify root causes. Work with GCP or AWS environments. Good understanding of Git and version control.`,

  'Zscaler — Sr. Staff SDE': `Sr. Staff Software Development Engineer, hybrid in Bangalore.
Write production-quality code in C and C++ for Linux-based systems. Diagnose and resolve issues in complex distributed systems.
Minimum Qualifications: 8+ years of software development experience with fluency in C and C++. Demonstrated expertise in Linux/Unix kernel development. Strong understanding of networking concepts including TCP/IP RFCs and the Linux kernel networking stack. Experience in containerization technologies such as Kubernetes and Linux namespaces. Hands-on experience with unit testing frameworks like Google Test or JUnit.`,

  'PlanetScale — Postgres SWE': `Software Engineer, Postgres. Remote.
You will design and build the control plane that provisions, scales and heals Postgres clusters. Build and maintain high availability, disaster recovery and data protection. Tune Postgres to operate at scale.
What you will need: 5+ years of software engineering experience designing, building and supporting large-scale systems in production. Strong proficiency in Go, with experience in other languages like Ruby, Python, Zig or Rust. Experience building and maintaining distributed, fault-tolerant services. Working knowledge of Kubernetes and containerized applications.
Base salary range: $120,000 - $290,000 USD`,

  'No Limit Nodes — Backend SWE': `Backend Software Engineer. Whitefield, Bangalore. Compensation: 3.6 LPA. Experience: 6 months to 2 years.
Build and maintain backend applications, APIs and services. Develop data processing pipelines. Improve performance and reliability. Work with real-time data systems and APIs. Support infrastructure and deployment in Linux environments.
Requirements: Good programming skills in at least one language such as Python, Java or C++. Basic understanding of backend applications, REST APIs, networking. Familiarity with relational databases and caching. Exposure to PostgreSQL, ClickHouse or Redis is an advantage. Comfortable with Linux, Git and command-line tools. Familiarity with Docker is a plus. Exposure to WebSockets or gRPC.`,

  'Sigmoid — Full Stack SDE II': `Full Stack Software Development Engineer II, Bengaluru.
Describe a project where you used Python/PySpark and SQL to build or optimize a data pipeline.
Hands-on experience with AWS services like S3, EKS, or MSK. Strong Python, SQL, REST API development, microservices. Experience with Node.js and React a plus. 2-5 years experience.`,
};

(async () => {
  const html = fs.readFileSync(path.join(__dirname,'..','resume-picker.html'), 'utf8');
  for (const [name, jd] of Object.entries(JDS)) {
    const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), pretendToBeVisual: true });
    const { window } = dom;
    await new Promise(r => setTimeout(r, 60));
    const D = window.document;
    D.getElementById('jd').value = jd;
    D.getElementById('run').click();

    const verdictEl = D.querySelector('.verdict h2');
    const picks = [...D.querySelectorAll('.pick')].map(p => p.querySelector('.nm').textContent + ' ' + p.querySelector('.sc').textContent.replace('/100', ''));
    const flags = [...D.querySelectorAll('.kv')].map(k => k.textContent.trim()).filter(t => /✕|!|✓/.test(t));
    const lacks = [...D.querySelectorAll('.c.miss')].map(c => c.textContent);

    console.log('\n' + '='.repeat(74));
    console.log(name);
    console.log('='.repeat(74));
    console.log('VERDICT : ' + (verdictEl ? verdictEl.textContent : 'none'));
    console.log('RESUME  : ' + picks[0]);
    console.log('          ' + picks.slice(1).join('   '));
    flags.forEach(f => console.log('FLAG    : ' + f.replace(/\s+/g, ' ').slice(0, 112)));
    if (lacks.length) console.log('AVOID   : ' + lacks.join(', '));
    window.close();
  }
})();
