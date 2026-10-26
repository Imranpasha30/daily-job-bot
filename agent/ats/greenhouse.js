// Specialized Greenhouse ATS Form Automation Engine
const { PROFILE, selectResume, generateCoverLetter } = require('../profile');
const { answerQuestion } = require('../ai_answerer');

async function handleGreenhouse(page, job) {
  const result = {
    ats: 'Greenhouse',
    success: false,
    resumeUploaded: false,
    fieldsFilled: 0,
    questionsAnswered: 0,
    submitFound: false,
    details: []
  };

  const resumePath = selectResume(job);

  // 1. Wait for form to be present
  try {
    await page.waitForSelector('form, #application_form, #apply_form', { timeout: 10000 });
  } catch (e) {
    // Some greenhouse pages require clicking "Apply" or scrolling down
    const applyBtn = await page.$('a[href*="#app"], button:has-text("Apply"), a:has-text("Apply")');
    if (applyBtn) {
      await applyBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
  }

  // 2. Upload Resume
  try {
    const fileInputs = await page.$$('input[type="file"]');
    for (const fi of fileInputs) {
      const name = ((await fi.getAttribute('name')) || (await fi.getAttribute('id')) || '').toLowerCase();
      // Only upload resume to the resume file input, not cover letter file input
      if (!name.includes('cover')) {
        await fi.setInputFiles(resumePath);
        result.resumeUploaded = true;
        result.details.push(`Uploaded resume: ${resumePath.split(/[\\/]/).pop()}`);
        break;
      }
    }
  } catch (err) {
    result.details.push(`Resume upload warning: ${err.message}`);
  }

  // 3. Fill standard Greenhouse fields
  const standardFields = [
    { selectors: ['#first_name', 'input[name="first_name"]', 'input[name*="first_name"]', 'input[autocomplete="given-name"]'], value: PROFILE.first, name: 'First Name' },
    { selectors: ['#last_name', 'input[name="last_name"]', 'input[name*="last_name"]', 'input[autocomplete="family-name"]'], value: PROFILE.last, name: 'Last Name' },
    { selectors: ['#email', 'input[name="email"]', 'input[type="email"]'], value: PROFILE.email, name: 'Email' },
    { selectors: ['#phone', 'input[name="phone"]', 'input[type="tel"]'], value: PROFILE.phone, name: 'Phone' }
  ];

  for (const sf of standardFields) {
    for (const sel of sf.selectors) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) {
          const cur = await el.inputValue();
          if (!cur) {
            await el.fill(sf.value);
            result.fieldsFilled++;
            result.details.push(`Filled ${sf.name}`);
          }
          break;
        }
      } catch (e) {}
    }
  }

  // 4. Fill Social / Portfolio URLs
  const urlFields = [
    { pattern: /linkedin/i, value: PROFILE.linkedin, name: 'LinkedIn' },
    { pattern: /github/i, value: PROFILE.github, name: 'GitHub' },
    { pattern: /portfolio|website|blog/i, value: PROFILE.portfolio, name: 'Portfolio' }
  ];

  const allInputs = await page.$$('input[type="text"], input[type="url"], input:not([type])');
  for (const input of allInputs) {
    try {
      if (!(await input.isVisible())) continue;
      const desc = await getElementContext(page, input);
      for (const uf of urlFields) {
        if (uf.pattern.test(desc)) {
          const val = await input.inputValue();
          if (!val) {
            await input.fill(uf.value);
            result.fieldsFilled++;
            result.details.push(`Filled ${uf.name}`);
          }
          break;
        }
      }
    } catch (e) {}
  }

  // 5. Handle Cover Letter (textarea)
  try {
    const clTextarea = await page.$('textarea#cover_letter_text, textarea[name*="cover_letter"], textarea[name*="coverLetter"]');
    if (clTextarea && await clTextarea.isVisible()) {
      const cur = await clTextarea.inputValue();
      if (!cur) {
        const cl = generateCoverLetter(job);
        await clTextarea.fill(cl);
        result.fieldsFilled++;
        result.details.push('Generated & filled cover letter');
      }
    }
  } catch (e) {}

  // 6. Handle Custom Questions (Textareas, Selects, Radios)
  const textareas = await page.$$('textarea:not(#cover_letter_text)');
  for (const ta of textareas) {
    try {
      if (!(await ta.isVisible())) continue;
      const cur = await ta.inputValue();
      if (!cur) {
        const context = await getElementContext(page, ta);
        const ans = await answerQuestion(context, job);
        await ta.fill(ans);
        result.questionsAnswered++;
        result.details.push(`Answered question: "${context.slice(0, 35)}..."`);
      }
    } catch (e) {}
  }

  // 7. Handle Select dropdowns (Work authorization, relocation, notice period, etc.)
  const selects = await page.$$('select');
  for (const sel of selects) {
    try {
      if (!(await sel.isVisible())) continue;
      const context = await getElementContext(page, sel);
      const options = await sel.$$('option');

      // Authorization in India / location
      if (/authorized|legal.*work/i.test(context)) {
        await selectOptionByRegex(sel, options, /^(yes|authorized)/i);
        result.fieldsFilled++;
      } else if (/require.*(sponsorship|visa)/i.test(context)) {
        await selectOptionByRegex(sel, options, /^no/i);
        result.fieldsFilled++;
      } else if (/relocat/i.test(context)) {
        await selectOptionByRegex(sel, options, /^yes/i);
        result.fieldsFilled++;
      } else if (/notice/i.test(context)) {
        await selectOptionByRegex(sel, options, /30|1 month/i);
        result.fieldsFilled++;
      } else if (/gender/i.test(context)) {
        await selectOptionByRegex(sel, options, /male|decline/i);
        result.fieldsFilled++;
      } else if (/veteran/i.test(context)) {
        await selectOptionByRegex(sel, options, /not.*veteran|decline/i);
        result.fieldsFilled++;
      } else if (/disability/i.test(context)) {
        await selectOptionByRegex(sel, options, /no.*disability|decline/i);
        result.fieldsFilled++;
      }
    } catch (e) {}
  }

  // 8. Find Submit Button
  const submitBtn = await page.$('input#submit_app, button#submit_app, button[type="submit"], input[type="submit"]');
  if (submitBtn) {
    result.submitFound = true;
    result.submitElement = submitBtn;
  }

  result.success = (result.resumeUploaded || result.fieldsFilled >= 3);
  return result;
}

// Helper: Extract label, placeholder, aria-label and surrounding text
async function getElementContext(page, element) {
  return await page.evaluate(el => {
    let text = '';
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) text += lbl.innerText + ' ';
    }
    const parentLabel = el.closest('label');
    if (parentLabel) text += parentLabel.innerText + ' ';
    const container = el.closest('.field, .form-group, div, li, tr');
    if (container) {
      const lbl = container.querySelector('label, legend, .label, [class*="label"], [class*="title"], [class*="question"]');
      if (lbl) text += lbl.innerText + ' ';
    }
    const placeholder = el.getAttribute('placeholder') || '';
    const aria = el.getAttribute('aria-label') || '';
    const name = el.getAttribute('name') || '';
    return `${text} ${placeholder} ${aria} ${name}`.trim().toLowerCase();
  }, element);
}

// Helper: Select option matching regex
async function selectOptionByRegex(selectEl, options, regex) {
  for (const opt of options) {
    const txt = (await opt.innerText()).trim();
    if (regex.test(txt)) {
      const val = await opt.getAttribute('value');
      await selectEl.selectOption(val !== null ? val : txt);
      return true;
    }
  }
  return false;
}

module.exports = {
  handleGreenhouse
};
