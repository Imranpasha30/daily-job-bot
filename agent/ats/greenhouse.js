// Robust Specialized Greenhouse ATS Form Automation Engine
const { PROFILE, selectResume, generateCoverLetter } = require('../profile');
const { answerQuestion } = require('../ai_answerer');

async function handleGreenhouse(page, job) {
  const result = {
    ats: 'Greenhouse',
    success: false,
    resumeUploaded: false,
    fieldsFilled: 0,
    questionsAnswered: 0,
    radiosChecked: 0,
    submitFound: false,
    details: []
  };

  const resumePath = selectResume(job);

  // 1. Wait for form to be present
  try {
    await page.waitForSelector('form, #application_form, #apply_form, .application-form', { timeout: 8000 });
  } catch (e) {
    const applyBtn = await page.$('a[href*="#app"], button:has-text("Apply"), a:has-text("Apply")');
    if (applyBtn && await applyBtn.isVisible()) {
      await applyBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
  }

  // 2. Upload Resume PDF & wait for Greenhouse async upload to register
  try {
    const fileInputs = await page.$$('input[type="file"]');
    for (const fi of fileInputs) {
      const id = (await fi.getAttribute('id') || '').toLowerCase();
      const name = (await fi.getAttribute('name') || '').toLowerCase();
      // Only target resume file input, not cover letter
      if (!name.includes('cover') && !id.includes('cover')) {
        await fi.setInputFiles(resumePath);
        result.resumeUploaded = true;
        result.details.push(`Attached resume: ${resumePath.split(/[\\/]/).pop()}`);
        
        // Wait 3.5s for Greenhouse React/S3 async upload to complete
        await page.waitForTimeout(3500);
        break;
      }
    }
  } catch (err) {
    result.details.push(`Resume upload warning: ${err.message}`);
  }

  // 3. Fill Standard Contact Info
  // First Name
  const fn = await page.$('#first_name, input[name="first_name"], input[name*="first_name" i], input[autocomplete="given-name"]');
  if (fn && await fn.isVisible()) {
    await fn.fill(PROFILE.first);
    result.fieldsFilled++;
    result.details.push(`First Name: ${PROFILE.first}`);
  }

  // Last Name
  const ln = await page.$('#last_name, input[name="last_name"], input[name*="last_name" i], input[autocomplete="family-name"]');
  if (ln && await ln.isVisible()) {
    await ln.fill(PROFILE.last);
    result.fieldsFilled++;
    result.details.push(`Last Name: ${PROFILE.last}`);
  }

  // Email
  const em = await page.$('#email, input[name="email"], input[type="email"]');
  if (em && await em.isVisible()) {
    await em.fill(PROFILE.email);
    result.fieldsFilled++;
    result.details.push(`Email: ${PROFILE.email}`);
  }

  // Country Code Picker (Ensure +91 / India is selected)
  try {
    const countryPicker = await page.$('#country, select[name*="country" i], [aria-label*="country" i]');
    if (countryPicker && await countryPicker.isVisible()) {
      const tagName = await countryPicker.evaluate(e => e.tagName.toLowerCase());
      if (tagName === 'select') {
        const options = await countryPicker.$$('option');
        for (const opt of options) {
          const txt = (await opt.innerText()).toLowerCase();
          if (txt.includes('india') || txt.includes('+91')) {
            const val = await opt.getAttribute('value');
            await countryPicker.selectOption(val || txt);
            break;
          }
        }
      }
    }
  } catch (e) {}

  // Phone Number: STRICTLY 10 digits without +91
  const ph = await page.$('#phone, input[name="phone"], input[type="tel"]');
  if (ph && await ph.isVisible()) {
    await ph.fill(PROFILE.phoneDigits); // '9844548537'
    result.fieldsFilled++;
    result.details.push(`Phone: ${PROFILE.phoneDigits} (Clean 10 Digits)`);
  }

  // 4. Fill ALL Custom Text and Number Inputs (CTC, Notice Period, URLs, Experience)
  const textInputs = await page.$$('input[type="text"], input[type="number"], input[type="url"], input:not([type])');
  for (const input of textInputs) {
    try {
      if (!(await input.isVisible())) continue;
      const id = await input.getAttribute('id') || '';
      if (['first_name', 'last_name', 'email', 'phone', 'country'].includes(id)) continue;

      const curVal = await input.inputValue();
      if (curVal && curVal.trim().length > 0) continue; // Already filled

      const ctx = await getElementContext(page, input);

      // Current CTC / Salary
      if (/current.*(ctc|salary|compensation|package)/i.test(ctx)) {
        const val = /inr|lpa|lakhs/i.test(ctx) ? PROFILE.ctcCurrent : PROFILE.ctcCurrentNum;
        await input.fill(val);
        result.fieldsFilled++;
        result.details.push(`Current CTC: ${val}`);
        continue;
      }

      // Expected CTC / Salary
      if (/expected.*(ctc|salary|compensation|package)/i.test(ctx)) {
        const val = /inr|lpa|lakhs/i.test(ctx) ? PROFILE.ctcExpected : PROFILE.ctcExpectedNum;
        await input.fill(val);
        result.fieldsFilled++;
        result.details.push(`Expected CTC: ${val}`);
        continue;
      }

      // Notice Period
      if (/notice.*period.*(days|day)/i.test(ctx)) {
        await input.fill(PROFILE.noticeDays);
        result.fieldsFilled++;
        result.details.push(`Notice: ${PROFILE.noticeDays} days`);
        continue;
      }
      if (/notice.*period|availability|how.*soon/i.test(ctx)) {
        await input.fill(PROFILE.notice);
        result.fieldsFilled++;
        result.details.push(`Notice: ${PROFILE.notice}`);
        continue;
      }

      // Experience / Years
      if (/years.*of.*exp|total.*exp|relevant.*exp/i.test(ctx)) {
        await input.fill(PROFILE.years);
        result.fieldsFilled++;
        result.details.push(`Experience: ${PROFILE.years} years`);
        continue;
      }

      // URLs
      if (/linkedin/i.test(ctx)) {
        await input.fill(PROFILE.linkedin);
        result.fieldsFilled++;
        result.details.push(`LinkedIn: ${PROFILE.linkedin}`);
        continue;
      }
      if (/github/i.test(ctx)) {
        await input.fill(PROFILE.github);
        result.fieldsFilled++;
        result.details.push(`GitHub: ${PROFILE.github}`);
        continue;
      }
      if (/portfolio|website|blog|personal.*site/i.test(ctx)) {
        await input.fill(PROFILE.portfolio);
        result.fieldsFilled++;
        result.details.push(`Portfolio: ${PROFILE.portfolio}`);
        continue;
      }

      // Current Location / City
      if (/current.*location|city|where.*live|residence/i.test(ctx)) {
        await input.fill(PROFILE.city);
        result.fieldsFilled++;
        result.details.push(`City: ${PROFILE.city}`);
        continue;
      }

      // Current Company / Organization
      if (/current.*(company|employer|org|firm)/i.test(ctx)) {
        await input.fill(PROFILE.currentCompany);
        result.fieldsFilled++;
        result.details.push(`Current Company: ${PROFILE.currentCompany}`);
        continue;
      }

      // Current Title / Designation
      if (/current.*(title|designation|role)/i.test(ctx)) {
        await input.fill(PROFILE.currentTitle);
        result.fieldsFilled++;
        result.details.push(`Current Role: ${PROFILE.currentTitle}`);
        continue;
      }

      // College / University
      if (/school|college|university|institution/i.test(ctx)) {
        await input.fill(PROFILE.school);
        result.fieldsFilled++;
        continue;
      }

      // If required text input with unknown label -> use Gemini 2.5 Flash to synthesize answer
      const isRequired = await input.evaluate(el => el.required || el.getAttribute('aria-required') === 'true' || el.closest('.field, div')?.innerText?.includes('*'));
      if (isRequired) {
        const ans = await answerQuestion(ctx, job);
        await input.fill(ans.slice(0, 80));
        result.questionsAnswered++;
        result.details.push(`AI Answered text field: "${ctx.slice(0, 30)}..."`);
      }

    } catch (e) {}
  }

  // 5. Handle Cover Letter (Textarea)
  try {
    const clTextarea = await page.$('textarea#cover_letter_text, textarea[name*="cover_letter" i]');
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

  // 6. Handle All Other Textareas (Custom Open-Ended Questions)
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
        result.details.push(`AI Answered question: "${context.slice(0, 35)}..."`);
      }
    } catch (e) {}
  }

  // 7. Handle Select Dropdowns (Authorization, Relocation, Notice, Demographics)
  const selects = await page.$$('select');
  for (const sel of selects) {
    try {
      if (!(await sel.isVisible())) continue;
      const ctx = await getElementContext(page, sel);
      const options = await sel.$$('option');

      // Authorization in India / legal right to work -> YES
      if (/authorized|legal.*work|right.*to.*work|eligible/i.test(ctx)) {
        await selectOptionByRegex(sel, options, /^(yes|authorized|eligible)/i);
        result.fieldsFilled++;
        result.details.push('Selected: Authorized to work (Yes)');
      }
      // Require visa sponsorship -> NO
      else if (/require.*(sponsorship|visa)|immigration/i.test(ctx)) {
        await selectOptionByRegex(sel, options, /^no\b/i);
        result.fieldsFilled++;
        result.details.push('Selected: Require sponsorship (No)');
      }
      // Relocation -> YES
      else if (/relocat|willing.*to.*relocate/i.test(ctx)) {
        await selectOptionByRegex(sel, options, /^yes\b/i);
        result.fieldsFilled++;
        result.details.push('Selected: Willing to relocate (Yes)');
      }
      // Notice Period Dropdown -> 30 days
      else if (/notice/i.test(ctx)) {
        await selectOptionByRegex(sel, options, /30|1 month|one month/i);
        result.fieldsFilled++;
        result.details.push('Selected: Notice period (30 days)');
      }
      // EEO Demographics
      else if (/gender/i.test(ctx)) {
        await selectOptionByRegex(sel, options, /male|decline/i);
        result.fieldsFilled++;
      } else if (/veteran/i.test(ctx)) {
        await selectOptionByRegex(sel, options, /not.*veteran|decline/i);
        result.fieldsFilled++;
      } else if (/disability/i.test(ctx)) {
        await selectOptionByRegex(sel, options, /no.*disability|decline/i);
        result.fieldsFilled++;
      }
    } catch (e) {}
  }

  // 8. Handle Radio Buttons & Checkboxes (CRITICAL: Tick options properly)
  const fieldsets = await page.$$('fieldset, .field:has(input[type="radio"]), div:has(input[type="radio"])');
  for (const fs of fieldsets) {
    try {
      const radios = await fs.$$('input[type="radio"]');
      if (radios.length === 0) continue;

      // Check if any radio is already selected
      let anyChecked = false;
      for (const r of radios) {
        if (await r.isChecked()) { anyChecked = true; break; }
      }
      if (anyChecked) continue;

      const groupContext = await getElementContext(page, fs);

      // Determine correct choice (Yes vs No)
      let targetPattern = null;
      if (/authorized|legal.*work|right.*to.*work|18.*years|relocat|hybrid|in-office/i.test(groupContext)) {
        targetPattern = /^(yes|agree|authorized)/i;
      } else if (/sponsorship|require.*visa|criminal|felon|relative|conflict/i.test(groupContext)) {
        targetPattern = /^(no|none)/i;
      }

      if (targetPattern) {
        for (const r of radios) {
          const rLabel = await page.evaluate(el => {
            const lbl = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
            return (lbl ? lbl.innerText : el.value || '').trim();
          }, r);

          if (targetPattern.test(rLabel)) {
            await tickRadioOrCheckbox(page, r);
            result.radiosChecked++;
            result.details.push(`Ticked radio: "${rLabel}" for ${groupContext.slice(0, 30)}`);
            break;
          }
        }
      }
    } catch (e) {}
  }

  // Check all compliance checkboxes (Consent, Privacy, Accuracy)
  const checkboxes = await page.$$('input[type="checkbox"]');
  for (const cb of checkboxes) {
    try {
      if (await cb.isChecked()) continue;
      const ctx = await getElementContext(page, cb);
      if (/agree|consent|terms|privacy|accurate|certify|confirm/i.test(ctx)) {
        await tickRadioOrCheckbox(page, cb);
        result.fieldsFilled++;
        result.details.push('Ticked consent/agreement checkbox');
      }
    } catch (e) {}
  }

  // 9. Find Submit Button
  const submitBtn = await page.$('input#submit_app, button#submit_app, button[type="submit"], input[type="submit"], button:has-text("Submit Application")');
  if (submitBtn) {
    result.submitFound = true;
    result.submitElement = submitBtn;
  }

  result.success = (result.resumeUploaded || result.fieldsFilled >= 3);
  return result;
}

// Bulletproof Radio/Checkbox ticker handling custom styled DOM elements
async function tickRadioOrCheckbox(page, inputEl) {
  try {
    await inputEl.check({ force: true }).catch(async () => {
      await inputEl.click({ force: true }).catch(async () => {
        // Click parent label if input is visually hidden
        const label = await inputEl.evaluateHandle(el => el.closest('label') || el.parentElement);
        await label.asElement()?.click().catch(() => {});
      });
    });
  } catch (e) {}
}

async function getElementContext(page, element) {
  return await page.evaluate(el => {
    let text = '';
    if (el.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (lbl) text += lbl.innerText + ' ';
    }
    const parentLabel = el.closest('label');
    if (parentLabel) text += parentLabel.innerText + ' ';
    const container = el.closest('.field, .form-group, div, li, tr, fieldset');
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
