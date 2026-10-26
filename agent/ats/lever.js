// Robust Specialized Lever ATS Form Automation Engine
const { PROFILE, selectResume, generateCoverLetter } = require('../profile');
const { answerQuestion } = require('../ai_answerer');

async function handleLever(page, job) {
  const result = {
    ats: 'Lever',
    success: false,
    resumeUploaded: false,
    fieldsFilled: 0,
    questionsAnswered: 0,
    radiosChecked: 0,
    submitFound: false,
    details: []
  };

  const resumePath = selectResume(job);

  // 1. If not on apply page, navigate or click apply
  if (!page.url().includes('/apply')) {
    try {
      const applyBtn = await page.$('.postings-btn, a[href*="/apply"], button:has-text("Apply")');
      if (applyBtn) {
        await applyBtn.click();
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
      }
    } catch (e) {}
  }

  // 2. Upload Resume File & wait for Lever upload
  try {
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      await fileInputs[0].setInputFiles(resumePath);
      result.resumeUploaded = true;
      result.details.push(`Uploaded resume: ${resumePath.split(/[\\/]/).pop()}`);
      await page.waitForTimeout(2500);
    }
  } catch (err) {
    result.details.push(`Resume upload warning: ${err.message}`);
  }

  // 3. Fill Lever Standard Fields
  const mappings = [
    { selector: 'input[name="name"]', value: PROFILE.full, name: 'Full Name' },
    { selector: 'input[name="email"]', value: PROFILE.email, name: 'Email' },
    { selector: 'input[name="phone"]', value: PROFILE.phoneDigits, name: 'Phone' }, // strictly 10 digits
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
    const commentsEl = await page.$('textarea[name="comments"], textarea[name*="additional" i]');
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

  // 5. Fill Custom Questions (Text Inputs & Textareas)
  const customInputs = await page.$$('.custom-question input[type="text"], .application-question input[type="text"]');
  for (const ci of customInputs) {
    try {
      if (!(await ci.isVisible())) continue;
      const cur = await ci.inputValue();
      if (cur) continue;

      const ctx = await page.evaluate(el => {
        const q = el.closest('.custom-question, .application-question, div')?.querySelector('.text, label, h4');
        return (q ? q.innerText : '').toLowerCase();
      }, ci);

      if (/current.*(ctc|salary)/i.test(ctx)) {
        await ci.fill(PROFILE.ctcCurrent);
        result.fieldsFilled++;
      } else if (/expected.*(ctc|salary)/i.test(ctx)) {
        await ci.fill(PROFILE.ctcExpected);
        result.fieldsFilled++;
      } else if (/notice.*period/i.test(ctx)) {
        await ci.fill(PROFILE.notice);
        result.fieldsFilled++;
      } else if (/experience/i.test(ctx)) {
        await ci.fill(PROFILE.years);
        result.fieldsFilled++;
      } else {
        const ans = await answerQuestion(ctx, job);
        await ci.fill(ans.slice(0, 100));
        result.questionsAnswered++;
      }
    } catch (e) {}
  }

  const customTextareas = await page.$$('textarea:not([name="comments"])');
  for (const ta of customTextareas) {
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
        result.details.push(`AI Answered question: "${ctx.slice(0, 35)}..."`);
      }
    } catch (e) {}
  }

  // 6. Checkboxes & Radios (Ticked properly)
  const radios = await page.$$('input[type="radio"], input[type="checkbox"]');
  for (const r of radios) {
    try {
      if (await r.isChecked()) continue;
      const ctx = await page.evaluate(el => {
        const parent = el.closest('.application-question, .custom-question, label, div');
        const text = parent ? parent.innerText : '';
        return text.toLowerCase();
      }, r);

      let shouldTick = false;
      if (/sponsorship|require.*visa/i.test(ctx) && /^no\b/i.test(ctx)) {
        shouldTick = true;
      } else if (/authorized.*work|legal/i.test(ctx) && /^yes\b/i.test(ctx)) {
        shouldTick = true;
      } else if (/relocat/i.test(ctx) && /^yes\b/i.test(ctx)) {
        shouldTick = true;
      } else if (/agree|consent|terms|privacy|certify/i.test(ctx)) {
        shouldTick = true;
      }

      if (shouldTick) {
        await r.check({ force: true }).catch(async () => {
          const lbl = await r.evaluateHandle(el => el.closest('label') || el.parentElement);
          await lbl.asElement()?.click().catch(() => {});
        });
        result.radiosChecked++;
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
