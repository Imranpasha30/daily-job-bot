// Robust Specialized Ashby ATS Form Automation Engine
const { PROFILE, selectResume, generateCoverLetter } = require('../profile');
const { answerQuestion } = require('../ai_answerer');

async function handleAshby(page, job) {
  const result = {
    ats: 'Ashby',
    success: false,
    resumeUploaded: false,
    fieldsFilled: 0,
    questionsAnswered: 0,
    radiosChecked: 0,
    submitFound: false,
    details: []
  };

  const resumePath = selectResume(job);

  // 1. Check if we need to click "Apply for this role"
  try {
    const applyBtn = await page.$('button:has-text("Apply"), a:has-text("Apply")');
    if (applyBtn && await applyBtn.isVisible()) {
      await applyBtn.click().catch(() => {});
      await page.waitForTimeout(1200);
    }
  } catch (e) {}

  // 2. Upload Resume File & wait for Ashby resume parser
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

  // 3. Fill All Input Fields (Contact, CTC, Notice, Experience, URLs)
  const inputs = await page.$$('input:not([type="file"]):not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])');
  for (const input of inputs) {
    try {
      if (!(await input.isVisible())) continue;
      const cur = await input.inputValue();
      if (cur && cur.trim().length > 0) continue;

      const ctx = await getContext(page, input);

      if (/first.*name|given.*name/i.test(ctx)) {
        await input.fill(PROFILE.first);
        result.fieldsFilled++;
      } else if (/last.*name|family.*name|surname/i.test(ctx)) {
        await input.fill(PROFILE.last);
        result.fieldsFilled++;
      } else if (/full.*name|^name\b/i.test(ctx)) {
        await input.fill(PROFILE.full);
        result.fieldsFilled++;
      } else if (/email/i.test(ctx)) {
        await input.fill(PROFILE.email);
        result.fieldsFilled++;
      } else if (/phone|mobile|contact/i.test(ctx)) {
        await input.fill(PROFILE.phoneDigits); // strictly 10 digits
        result.fieldsFilled++;
        result.details.push(`Phone: ${PROFILE.phoneDigits}`);
      } else if (/current.*(ctc|salary|compensation)/i.test(ctx)) {
        const val = /inr|lpa/i.test(ctx) ? PROFILE.ctcCurrent : PROFILE.ctcCurrentNum;
        await input.fill(val);
        result.fieldsFilled++;
      } else if (/expected.*(ctc|salary|compensation)/i.test(ctx)) {
        const val = /inr|lpa/i.test(ctx) ? PROFILE.ctcExpected : PROFILE.ctcExpectedNum;
        await input.fill(val);
        result.fieldsFilled++;
      } else if (/notice.*period/i.test(ctx)) {
        await input.fill(PROFILE.notice);
        result.fieldsFilled++;
      } else if (/years.*exp|experience/i.test(ctx)) {
        await input.fill(PROFILE.years);
        result.fieldsFilled++;
      } else if (/current.*company|employer/i.test(ctx)) {
        await input.fill(PROFILE.currentCompany);
        result.fieldsFilled++;
      } else if (/linkedin/i.test(ctx)) {
        await input.fill(PROFILE.linkedin);
        result.fieldsFilled++;
      } else if (/github/i.test(ctx)) {
        await input.fill(PROFILE.github);
        result.fieldsFilled++;
      } else if (/portfolio|website|url/i.test(ctx)) {
        await input.fill(PROFILE.portfolio);
        result.fieldsFilled++;
      } else if (/location|city/i.test(ctx)) {
        await input.fill(PROFILE.city);
        result.fieldsFilled++;
      }
    } catch (e) {}
  }

  // 4. Handle Textareas (Cover letter & Custom Questions via Gemini / Claude)
  const textareas = await page.$$('textarea');
  for (const ta of textareas) {
    try {
      if (!(await ta.isVisible())) continue;
      const cur = await ta.inputValue();
      if (cur && cur.trim().length > 0) continue;

      const ctx = await getContext(page, ta);
      if (/cover\s*letter/i.test(ctx)) {
        const cl = generateCoverLetter(job);
        await ta.fill(cl);
        result.fieldsFilled++;
        result.details.push('Generated & filled cover letter');
      } else {
        const ans = await answerQuestion(ctx, job);
        await ta.fill(ans);
        result.questionsAnswered++;
        result.details.push(`Answered question: "${ctx.slice(0, 35)}..."`);
      }
    } catch (e) {}
  }

  // 5. Radio Buttons & Checkboxes (Tick properly)
  const radios = await page.$$('input[type="radio"], [role="radio"]');
  for (const r of radios) {
    try {
      const isChecked = await r.isChecked().catch(() => r.getAttribute('aria-checked') === 'true');
      if (isChecked) continue;

      const parentCtx = await page.evaluate(el => {
        const group = el.closest('[role="radiogroup"], fieldset, .field, div');
        const label = el.closest('label')?.innerText || el.value || '';
        return {
          groupText: (group ? group.innerText : '').toLowerCase(),
          labelText: label.toLowerCase()
        };
      }, r);

      let shouldTick = false;
      if (/authorized|legal.*work|18.*years|relocat|hybrid|in-office/i.test(parentCtx.groupText)) {
        if (/^(yes|agree|authorized)/i.test(parentCtx.labelText)) shouldTick = true;
      } else if (/sponsorship|require.*visa|felon|crime|conflict/i.test(parentCtx.groupText)) {
        if (/^(no|none)/i.test(parentCtx.labelText)) shouldTick = true;
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

  // Checkboxes (Consent / Terms)
  const checkboxes = await page.$$('input[type="checkbox"], [role="checkbox"]');
  for (const cb of checkboxes) {
    try {
      const isChecked = await cb.isChecked().catch(() => cb.getAttribute('aria-checked') === 'true');
      if (isChecked) continue;

      const ctx = await getContext(page, cb);
      if (/agree|consent|terms|privacy|confirm|certify/i.test(ctx)) {
        await cb.check({ force: true }).catch(async () => {
          const lbl = await cb.evaluateHandle(el => el.closest('label') || el.parentElement);
          await lbl.asElement()?.click().catch(() => {});
        });
        result.fieldsFilled++;
      }
    } catch (e) {}
  }

  // 6. Submit Button Detection
  const submitBtn = await page.$('button[type="submit"], button:has-text("Submit Application"), button:has-text("Submit")');
  if (submitBtn) {
    result.submitFound = true;
    result.submitElement = submitBtn;
  }

  result.success = (result.resumeUploaded || result.fieldsFilled >= 2);
  return result;
}

async function getContext(page, element) {
  return await page.evaluate(el => {
    let text = '';
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) text += lbl.innerText + ' ';
    }
    const parentLabel = el.closest('label');
    if (parentLabel) text += parentLabel.innerText + ' ';
    const container = el.closest('div, fieldset, [data-testid], .field');
    if (container) {
      const lbl = container.querySelector('label, [class*="label"], [class*="title"], [class*="heading"]');
      if (lbl) text += lbl.innerText + ' ';
    }
    return `${text} ${el.placeholder || ''} ${el.getAttribute('aria-label') || ''} ${el.name || ''}`.trim().toLowerCase();
  }, element);
}

module.exports = {
  handleAshby
};
