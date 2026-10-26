# Backend job tracker — built 15 Oct 2026

Open **`jobs.html`** in any browser. Every job title and every "Open & apply" button links
straight to the real posting on the company's own careers site. Tick "applied" as you go; the
ticks are saved in that browser so you can close the tab and come back.

`job-links.txt` is the same 100 jobs as plain text if you'd rather work from a list.
`final.json` is the structured data. `source/` holds the scripts that built it.

## What's in the list

100 live openings, 50 of them India-based, across 33 companies. Pulled from each company's
own job-board API, not scraped from an aggregator, so the links go to the real application form.

India-based roles come from Databricks, MongoDB, GitLab, Sarvam AI, Hevo Data, Glance, Paytm,
HackerRank, FamPay, Coursera, Stripe, Adyen, Fivetran, Unacademy, Twilio, Coinbase, InMobi and
Notion. The remaining 50 are remote roles open to candidates outside a single country.

Filters at the top: India only, Remote, Python, Node.js, company, free-text search, and hide
applied. Each card also says which of your two resume files to send, based on the stack named
in the job description.

## About the ₹8 LPA minimum

I could not filter on it, and you should know exactly why. None of these career boards publish
salary. Nothing in the list is advertised below ₹8 LPA, and the companies here pay backend
engineers well above that in India, but that is market knowledge, not something the posting
states. Treat the band as unconfirmed until a recruiter tells you.

Where salary screening matters most, use the Indian boards in the collapsible panel at the top
of the page. Instahyre, Naukri and Hirist all carry a real CTC filter you can set to 8+ in
their sidebar, which is something no API would give me.

## Where the jobs came from

Company boards: Greenhouse, Lever, Ashby and SmartRecruiters public APIs across 77 employers.
Remote boards: Remotive, RemoteOK, Jobicy, Himalayas and Arbeitnow.

LinkedIn, Indeed and Foundit block automated access, so I could not pull their listings.
Instead the page carries pre-filtered search links for them, including your 48-hour LinkedIn
search, which you click through manually.

## Filtering logic

From a pool of 9,321 postings I kept roles whose titles are backend, platform, infrastructure,
API, SDE or software-engineer shaped, then scored each on the stack named in its description
(Python, FastAPI, Django, Node.js, Express, TypeScript, PostgreSQL, Redis, Kafka,
microservices), on being India-based, and on asking for roughly your years of experience.

Excluded: internships, principal, staff, architect, manager and director titles, anything
asking for 8+ years, and every frontend, mobile, QA, data-science and non-engineering role.
Senior titles are included but ranked slightly lower, since you have about two years.

## Refreshing the list

```
cd source
node fetch.js && node ats.js && node ats2.js && node merge.js && node build_html.js
```

The two ATS probes take about eight minutes each. Everything else is seconds. Add more
employers by appending their board token to the `TOKENS` list in `ats.js`.

## Suggested order of attack

1. **The 50 India roles first.** Filter to "India only" and work top down; they are ranked by
   fit to your stack and seniority.
2. **Send the matching resume.** Each card names Python or Node.js. Both files are in
   `E:\resume\Backend-Engineer-2026\`.
3. **Then the LinkedIn 48-hour search** in the panel at the top, which refreshes daily and
   catches the Indian mid-size companies these APIs miss.
4. **Instahyre and Hirist** when you want the salary filter, since they publish CTC.
