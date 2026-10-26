// Specialized Lever ATS Form Automation Engine
const { PROFILE, selectResume, generateCoverLetter } = require('../profile');
const { answerQuestion } = require('../ai_answerer');

async function handleLever(page, job) {
  const result = {
    ats: 'Lever',
    success: false,
    resumeUploaded: false,
    fieldsFilled: 0,
    questionsAnswered: 0,
    submitFound: false,
    details: []
  };

  const resumePath = selectResume(job);

  // 1. If not on apply page, click "Apply for this job"
  if (!page.url().includes('/apply')) {
    try {
      const applyBtn = await page.$('.postings-btn, a[href*="/apply"], button:has-text("Apply")');
      if (applyBtn) {
        await applyBtn.click();
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      }
    } catch (e) {}
  }

  // 2. Upload Resume File
  try {
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      await fileInputs[0].setInputFiles(resumePath);
      result.resumeUploaded = true;
      result.details.push(`Uploaded resume: ${resumePath.split(/[\\/]/).pop()}`);
      await page.waitForTimeout(1500);
    }
  } catch (err) {
    result.details.push(`Resume upload warning: ${err.message}`);
  }

  // 3. Fill Lever Standard Fields
  const mappings = [
    { selector: 'input[name="name"]', value: PROFILE.full, name: 'Full Name' },
    { selector: 'input[name="email"]', value: PROFILE.email, name: 'Email' },
    { selector: 'input[name="phone"]', value: PROFILE.phone, name: 'Phone' },
    { selector: 'input[name="org"]', value: PROFILE.currentCompany, name: 'Current Company' },
    { selector: 'input[name="urls[LinkedIn]"]', value: PROFILE.linkedin, name: 'LinkedIn' },
    { selector: 'input[name="urls[GitHub]"]', value: PROFILE.github, name: 'GitHub' },
    { selector: 'input[name="urls[Portfolio]"]', value: PROFILE.portfolio, name: 'Portfolio' }
  ];

  for (const m of mappings) {
    try {
      const el = await page.$(m.selector);
      if (el && await el.isVisible()) {
        const cur = await el.inputValue();
        if (!cur) {
          await el.fill(m.value);
          result.fieldsFilled++;
          result.details.push(`Filled ${m.name}`);
        }
      }
    } catch (e) {}
  }

  // 4. Fill Comments / Additional Info / Cover Letter
  try {
    const commentsEl = await page.$('textarea[name="comments"], textarea[name*="additional"]');
    if (commentsEl && await commentsEl.isVisible()) {
      const cur = await commentsEl.inputValue();
      if (!cur) {
        const cl = generateCoverLetter(job);
        await commentsEl.fill(cl);
        result.fieldsFilled++;
        result.details.push('Generated & filled cover letter');
      }
    }
  } catch (e) {}

  // 5. Fill Custom Questions
  const textareas = await page.$$('textarea:not([name="comments"])');
  for (const ta of textareas) {
    try {
      if (!(await ta.isVisible())) continue;
      const cur = await ta.inputValue();
      if (!cur) {
        const ctx = await page.evaluate(el => {
          const lbl = el.closest('.application-question, .custom-question, div')?.querySelector('.text, label, h4');
          return (lbl ? lbl.innerText : el.name || el.placeholder || '').toLowerCase();
        }, ta);

        const ans = await answerQuestion(ctx, job);
        await ta.fill(ans);
        result.questionsAnswered++;
        result.details.push(`Answered custom question: "${ctx.slice(0, 35)}..."`);
      }
    } catch (e) {}
  }

  // 6. Checkboxes & Radios (Compliance / authorization)
  const radios = await page.$$('input[type="radio"], input[type="checkbox"]');
  for (const r of radios) {
    try {
      if (!(await r.isVisible())) continue;
      const ctx = await page.evaluate(el => {
        return (el.closest('label, .custom-question, div')?.innerText || '').toLowerCase();
      }, r);

      if (/sponsorship|require.*visa/i.test(ctx) && /^no/i.test(ctx)) {
        await r.check().catch(() => r.click());
        result.fieldsFilled++;
      } else if (/authorized.*work/i.test(ctx) && /^yes/i.test(ctx)) {
        await r.check().catch(() => r.click());
        result.fieldsFilled++;
      }
    } catch (e) {}
  }

  // 7. Submit Button Detection
  const submitBtn = await page.$('#btn-submit, button[type="submit"], button:has-text("Submit Application")');
  if (submitBtn) {
    result.submitFound = true;
    result.submitElement = submitBtn;
  }

  result.success = (result.resumeUploaded || result.fieldsFilled >= 2);
  return result;
}

module.exports = {
  handleLever
};
