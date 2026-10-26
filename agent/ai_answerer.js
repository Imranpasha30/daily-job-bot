// AI Application Answer Generator: Gemini 1.5/2.0 + Claude 5.5 + Fallback Engine
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { PROFILE, generateCoverLetter } = require('./profile');

// Load API Keys from environment or .env file
let GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
let ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf8');
  if (!GEMINI_API_KEY) {
    const match = envText.match(/(?:GEMINI_API_KEY|GOOGLE_API_KEY)=(.*)/);
    if (match) GEMINI_API_KEY = match[1].trim();
  }
  if (!ANTHROPIC_API_KEY) {
    const match = envText.match(/(?:ANTHROPIC_API_KEY|CLAUDE_API_KEY)=(.*)/);
    if (match) ANTHROPIC_API_KEY = match[1].trim();
  }
}

// Initialize Clients
let genAI = null;
if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  } catch (e) {
    console.warn('Could not initialize GoogleGenerativeAI client:', e.message);
  }
}

let anthropic = null;
if (ANTHROPIC_API_KEY) {
  try {
    anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  } catch (e) {
    console.warn('Could not initialize Anthropic client:', e.message);
  }
}

// Fallback Answer Knowledge Base
const KNOWLEDGE_BASE = {
  whyCompany: (job) => `I am drawn to ${job.company || 'your team'} because of your technical ambition and engineering standards. With nearly two years of production experience architecting high-throughput backend services (FastAPI/Node.js, PostgreSQL 17, Redis Streams) and tuning latency over 9.9M-row databases, my hands-on background in scalable, resilient systems directly aligns with the challenges your team tackles.`,

  aboutYourself: (job) => `I am a Backend Engineer with nearly two years building production APIs and distributed systems in Python (FastAPI) and Node.js (Express). At Sharkify, I was the founding backend engineer on Kaizer X, architecting 765 REST/WebSocket routes over 150 PostgreSQL tables and reducing p95 latency from 12s to 141ms under load. I also hold an Executive PG in Cyber Security from IIT Roorkee, applying zero-trust and OWASP principles directly to backend design.`,

  databases: () => `I design and tune PostgreSQL for high concurrency: FOR UPDATE SKIP LOCKED job queues with lease fencing, advisory locks for payment settlement, composite indexing from EXPLAIN ANALYZE, and connection pool tuning for pgBouncer. In production, I kept read latency sub-second over a 9.9M-row dataset.`,

  python: () => `Nearly two years of production Python engineering using FastAPI, Pydantic, SQLAlchemy, and Celery. Built high-throughput asynchronous microservices handling video ingestion, task dispatching via Redis Streams, and resilient database transactions.`,

  nodejs: () => `Built production TypeScript/Express APIs with InversifyJS dependency injection: authentication (OAuth 2.0, OTP), RBAC, payment gateway integrations, and WebSocket streaming. Owned 200+ endpoints with clean layered architecture.`,

  cybersecurity: () => `Hold Executive Post Graduate Certification in Cyber Security & Ethical Hacking from IIT Roorkee. Conducted end-to-end security audits covering OWASP API Top 10 (BOLA/IDOR, SSRF, broken auth), network traffic analysis (Wireshark), and SIEM threat detection (Splunk).`,

  biggestChallenge: () => `On Kaizer X, database lock contention and unindexed multi-table joins were driving p95 query latency to 12 seconds during batch video processing. I analyzed query plans with EXPLAIN ANALYZE, eliminated N+1 queries, introduced partial composite indexes on active job states, and replaced naive table locks with PostgreSQL FOR UPDATE SKIP LOCKED queues backed by Redis Streams. This reduced p95 latency to 141ms without increasing server costs.`,

  salary: () => `Expected CTC: 14-18 LPA (Current: 5.54 LPA). Open to discussion based on total compensation and role structure.`,

  notice: () => `30 days notice period, with option to negotiate early release.`,

  location: () => `Based in India (Hyderabad / Mangalore / Bangalore). Open to relocation across India, Dubai/UAE, and Remote positions.`
};

function buildPrompt(questionLabel, jobDetails) {
  const q = String(questionLabel || '').trim();
  const co = jobDetails.company || 'your company';
  const title = jobDetails.title || 'this role';
  const desc = (jobDetails.snippet || jobDetails.full || '').slice(0, 1000);

  return `You are writing a concise job application answer for Imran Pasha.
Candidate Profile:
- Role: Backend Engineer at Sharkify (~1.8-2 yrs exp)
- Languages/Frameworks: Python (FastAPI), Node.js (Express, TypeScript), SQL
- Database & Scaling: PostgreSQL 17 (advisory locks, FOR UPDATE SKIP LOCKED, composite indexing, EXPLAIN ANALYZE), Redis 7 (Streams, consumer groups, Lua scripting). Reduced p95 latency from 12s to 141ms on Kaizer X (765 endpoints, 150 tables, 9.9M rows).
- Security: Executive PG in Cyber Security & Ethical Hacking from IIT Roorkee (OWASP API Top 10, IDOR, SSRF).
- Notice Period: 30 days. Current CTC: 5.54 LPA, Target: 14-18 LPA.
- Location: Hyderabad / Mangalore / Bangalore. Open to Relocate & Remote.

Job: ${title} at ${co}
Context: ${desc}

Question to answer: "${q}"

Instructions:
1. Write a punchy, authentic first-person response ("I ...").
2. Reference concrete production metrics where relevant.
3. Keep it under 100 words unless the question asks for a full cover letter or deep project explanation.
4. Do NOT hallucinate technologies Imran doesn't use (no PySpark, Go, or K8s in prod).
5. Output ONLY the response text to paste directly into the form.`;
}

async function answerQuestion(questionLabel, jobDetails = {}) {
  const prompt = buildPrompt(questionLabel, jobDetails);

  // 1. PRIORITY 1: Google Gemini (if GEMINI_API_KEY is configured)
  if (genAI) {
    const candidateGeminiModels = [
      'gemini-2.5-flash',
      'gemini-flash-latest',
      'gemini-2.5-pro',
      'gemini-pro-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
    for (const modelName of candidateGeminiModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim()) {
          return text.trim();
        }
      } catch (geminiErr) {
        // Try next gemini model
      }
    }
  }

  // 2. PRIORITY 2: Anthropic Claude (if ANTHROPIC_API_KEY is configured)
  if (anthropic) {
    const candidateClaudeModels = ['claude-sonnet-5-5', 'claude-sonnet-4-5-20250929', 'claude-3-5-sonnet-20241022'];
    for (const modelName of candidateClaudeModels) {
      try {
        const msg = await anthropic.messages.create({
          model: modelName,
          max_tokens: 300,
          temperature: 0.2,
          messages: [{ role: 'user', content: prompt }]
        });
        if (msg && msg.content && msg.content[0] && msg.content[0].text) {
          return msg.content[0].text.trim();
        }
      } catch (claudeErr) {
        // Try next model
      }
    }
  }

  // 3. PRIORITY 3: Smart Rule-Based Production Fallback
  const q = String(questionLabel || '').trim();
  if (/why (do you want|are you interested|this company|join|us\b)|what excites you/i.test(q)) {
    return KNOWLEDGE_BASE.whyCompany(jobDetails);
  }
  if (/cover\s*letter/i.test(q)) {
    return generateCoverLetter(jobDetails);
  }
  if (/about yourself|summary|describe yourself|introduce/i.test(q)) {
    return KNOWLEDGE_BASE.aboutYourself(jobDetails);
  }
  if (/database|postgres|sql/i.test(q)) {
    return KNOWLEDGE_BASE.databases();
  }
  if (/python|fastapi|django/i.test(q)) {
    return KNOWLEDGE_BASE.python();
  }
  if (/node|express|typescript|javascript/i.test(q)) {
    return KNOWLEDGE_BASE.nodejs();
  }
  if (/security|cyber|soc|penetration|vapt|ethical hacking/i.test(q)) {
    return KNOWLEDGE_BASE.cybersecurity();
  }
  if (/challenge|accomplishment|project|difficult|proud/i.test(q)) {
    return KNOWLEDGE_BASE.biggestChallenge();
  }
  if (/salary|ctc|compensation|expectation/i.test(q)) {
    return KNOWLEDGE_BASE.salary();
  }
  if (/notice period|availability|how soon/i.test(q)) {
    return KNOWLEDGE_BASE.notice();
  }
  if (/relocat|location|where.*live/i.test(q)) {
    return KNOWLEDGE_BASE.location();
  }

  return KNOWLEDGE_BASE.aboutYourself(jobDetails);
}

module.exports = {
  answerQuestion,
  KNOWLEDGE_BASE
};
