# Imran Pasha — Autonomous AI Job Application Agent & Daily Job Bot

A full-stack, autonomous job hunting platform engineered for **Imran Pasha** (Backend Engineer ~1.8–2 years exp, IIT Roorkee Certified in Cyber Security & Ethical Hacking).

- **Live Web Portal**: [https://imranpasha30.github.io/daily-job-bot/](https://imranpasha30.github.io/daily-job-bot/)
- **Daily Automated Cloud Refresh**: GitHub Actions cron runs daily at **9:00 AM IST** (`30 3 * * *`).
- **Autonomous AI Apply Agent**: Playwright + Claude 3.5 Sonnet engine applying up to 1,000 jobs.

---

## 🚀 Live Job Tracker (1,713 Openings)

The tracker combines **1,306 Backend Engineering roles** and **407 Cybersecurity openings** across India (Bengaluru, Hyderabad, Pune, Mumbai, Delhi-NCR, Mangalore), Dubai/UAE, and Worldwide Remote.

### What is Included:
- **Backend Track (1,306 jobs)**: SDE 1, SDE 2, Intermediate Backend, Python (FastAPI/Django), Node.js (Express/TypeScript), PostgreSQL, Redis, Microservices. Excludes senior/staff/principal/10+ year roles.
- **Cybersecurity Track (407 jobs)**: Fresher, SOC Analyst L1, AppSec Engineer, Penetration Tester, Vulnerability Management, Information Security Analyst, plus curated Dubai/UAE roles.
- **Direct MNC Career Portals**: One-click deep links to Capgemini, Cognizant, Wipro, Tata Communications, Kyndryl, Infosys.
- **Direct Resume Pairing**: Every single card specifies the exact resume PDF to submit:
  - `Imran-Pasha-Backend-Python.pdf`
  - `Imran-Pasha-Backend-NodeJS.pdf`
  - `Imran-Pasha-Cyber-Security-Dubai.pdf`
  - `Imran-Pasha-Penetration-Tester.pdf`

---

## 🤖 Autonomous AI Job Apply Agent

The automated agent is located in `agent/` and operates via Playwright Chromium.

### Architecture

```
agent/
├── profile.js          # Candidate profile, address, education, contact, resume router, cover letter generator
├── ai_answerer.js      # Claude 3.5 Sonnet / Haiku integration + production fallback knowledge base
├── form_router.js      # Detects ATS platform and dispatches to specialized handlers
├── ats/
│   ├── greenhouse.js   # Specialized Greenhouse ATS automation (638 jobs)
│   ├── ashby.js        # Specialized Ashby ATS automation (444 jobs)
│   ├── lever.js        # Specialized Lever ATS automation (52 jobs)
│   └── generic.js      # Universal heuristic handler for custom career portals
└── apply_agent.js      # Master CLI runner with Safe Mode, Auto Mode, and rate pacing
```

### Key Capabilities:
1. **Resume File Upload**: Detects file inputs and automatically attaches the matched PDF resume from `resumes/`.
2. **Form Auto-Fill**: Intelligently identifies inputs (First/Last Name, Email, Phone, LinkedIn, GitHub, Portfolio, Current Employer, Title, Notice Period, CTC, Education) and fills them.
3. **Claude 3.5 Sonnet Question Answering**: For open-ended questions (*"Why do you want to work here?"*, *"Describe a challenging bug"*), the agent uses Claude 3.5 Sonnet to craft tailored, authentic answers referencing Imran's real production metrics (Kaizer X, 765 routes, 150 tables, 9.9M rows, sub-second query tuning, idempotent payment gateways, IIT Roorkee certification).
4. **Fallback Engine**: If no Claude API key is provided, the agent falls back instantly to the built-in production knowledge base.
5. **Two Execution Modes**:
   - **Safe Mode (`--mode safe`)**: Launches a visible browser, fills out every form field, uploads the resume, answers questions, and pauses for your confirmation before submitting.
   - **Full Auto Mode (`--mode auto`)**: Runs autonomously, submitting applications sequentially with anti-bot jitter pacing (3–6s), saving submission screenshots to `screenshots/` and recording progress in `applied_history.json`.

---

## 💻 Quick Start & Commands

### 1. Interactive Menu (Windows)
Double-click `apply.bat` in `E:\resume\Jobs` or run:
```powershell
.\apply.bat
```

### 2. Run Safe Mode (Interactive Verification)
```bash
# Verify backend applications one-by-one in a visible browser
npm run apply

# Or specific category
node agent/apply_agent.js --category backend --mode safe
node agent/apply_agent.js --category cyber --mode safe
```

### 3. Run Autonomous Full-Auto Mode (Goal: 1,000 Jobs)
```bash
# Apply to up to 1,000 jobs autonomously
node agent/apply_agent.js --mode auto --limit 1000

# Or run in the background (headless)
node agent/apply_agent.js --mode auto --limit 1000 --headless true
```

### 4. Target Specific ATS Systems First
Over 1,130 jobs in the list run on standard ATS platforms:
```bash
# Greenhouse (638 jobs)
node agent/apply_agent.js --ats greenhouse --mode auto --limit 500

# Ashby (444 jobs)
node agent/apply_agent.js --ats ashby --mode auto --limit 400

# Lever (52 jobs)
node agent/apply_agent.js --ats lever --mode auto --limit 50
```

### 5. Dry Run Test (No Submissions)
```bash
node agent/apply_agent.js --dry-run --limit 5
```

### 6. View Statistics
```bash
node agent/apply_agent.js --stats
```

---

## 🔑 Using Claude API (Optional)

To enable dynamic Claude 3.5 Sonnet generated answers for application questions:
```powershell
$env:ANTHROPIC_API_KEY="sk-ant-api03-..."
node agent/apply_agent.js --mode auto --limit 100
```
*(If no API key is provided, the agent automatically uses the built-in rule-based answers).*

---

## 📊 Application History & Resumability

Every application is recorded in `applied_history.json` with:
- Company name, job title, and URL
- Submission timestamp
- ATS engine used
- Exact resume PDF uploaded
- Screenshot proof of submission (`screenshots/`)

If an application run is stopped or interrupted, restarting the agent will automatically skip already-applied jobs without duplicates.
