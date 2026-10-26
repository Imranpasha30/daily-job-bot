// Specialized Ashby ATS Form Automation Engine
const { PROFILE, selectResume, generateCoverLetter } = require('../profile');
const { answerQuestion } = require('../ai_answerer');

async function handleAshby(page, job) {
  const result = {
    ats: 'Ashby',
    success: false,
    resumeUploaded: false,
    fieldsFilled: 0,
    questionsAnswered: 0,
    submitFound: false,
    details: []
  };

  const resumePath = selectResume(job);

  // 1. Check if we need to click "Apply for this role" / navigate to application section
  try {
    const applyBtn = await page.$('button:has-text("Apply"), a:has-text("Apply")');
    if (applyBtn && await applyBtn.isVisible()) {
      await applyBtn.click().catch(() => {});
      await page.waitForTimeout(1000);
    }
  } catch (e) {}

  // 2. Upload Resume File
  try {
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      await fileInputs[0].setInputFiles(resumePath);
      result.resumeUploaded = true;
      result.details.push(`Uploaded resume: ${resumePath.split(/[\\/]/).pop()}`);
      // Ashby parses resume and auto-fills some fields; wait 2s
      await page.waitForTimeout(2000);
    }
  } catch (err) {
    result.details.push(`Resume upload warning: ${err.message}`);
  }

  // 3. Fill Ashby Standard Fields
  const inputs = await page.$$('input:not([type="file"]):not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])');
  for (const input of inputs) {
    try {
      if (!(await input.isVisible())) continue;
      const cur = await input.inputValue();
      if (cur && cur.trim().length > 0) continue; // Skip if Ashby resume parser already filled it

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
      } else if (/phone|mobile/i.test(ctx)) {
        await input.fill(PROFILE.phone);
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

  // 4. Handle Textareas (Cover letter & Questions)
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

  // 5. Submit Button Detection
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
    const container = el.closest('div, fieldset, [data-testid]');
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
