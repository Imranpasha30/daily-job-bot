// Universal Heuristic ATS & Career Portal Form Automation Engine
const { PROFILE, selectResume, generateCoverLetter } = require('../profile');
const { answerQuestion } = require('../ai_answerer');

const FIELD_RULES = [
  { pattern: /first\s*name|given\s*name/i, value: PROFILE.first, name: 'First Name' },
  { pattern: /last\s*name|surname|family\s*name/i, value: PROFILE.last, name: 'Last Name' },
  { pattern: /^name\b|full\s*name|your\s*name/i, value: PROFILE.full, name: 'Full Name' },
  { pattern: /e-?mail/i, value: PROFILE.email, name: 'Email' },
  { pattern: /phone|mobile|contact\s*number/i, value: PROFILE.phone, name: 'Phone' },
  { pattern: /linkedin/i, value: PROFILE.linkedin, name: 'LinkedIn' },
  { pattern: /github/i, value: PROFILE.github, name: 'GitHub' },
  { pattern: /portfolio|website|blog|personal\s*site/i, value: PROFILE.portfolio, name: 'Portfolio' },
  { pattern: /address|street/i, value: PROFILE.addr1, name: 'Address' },
  { pattern: /city|location/i, value: PROFILE.city, name: 'City' },
  { pattern: /state|region|province/i, value: PROFILE.state, name: 'State' },
  { pattern: /zip|postal|pin\s*code/i, value: PROFILE.zip, name: 'Zip' },
  { pattern: /country/i, value: PROFILE.country, name: 'Country' },
  { pattern: /current\s*(company|employer|firm)|recent\s*employer/i, value: PROFILE.currentCompany, name: 'Current Company' },
  { pattern: /current\s*(title|designation|role)/i, value: PROFILE.currentTitle, name: 'Current Title' },
  { pattern: /total\s*years|years\s*of\s*exp|experience\s*in\s*years/i, value: PROFILE.years, name: 'Years of Exp' },
  { pattern: /notice\s*period.*days/i, value: PROFILE.noticeDays, name: 'Notice (days)' },
  { pattern: /notice\s*period|availability|how\s*soon/i, value: PROFILE.notice, name: 'Notice' },
  { pattern: /current\s*(ctc|salary|compensation)/i, value: PROFILE.ctcCurrent, name: 'Current CTC' },
  { pattern: /expected\s*(ctc|salary|compensation)/i, value: PROFILE.ctcExpected, name: 'Expected CTC' },
  { pattern: /school|university|college|institution/i, value: PROFILE.school, name: 'College' },
  { pattern: /degree/i, value: PROFILE.degree, name: 'Degree' },
  { pattern: /discipline|major|field\s*of\s*study/i, value: PROFILE.discipline, name: 'Major' },
  { pattern: /graduation|year\s*of\s*completion|end\s*year/i, value: PROFILE.gradYear, name: 'Grad Year' }
];

const SELECT_CHOICE_RULES = [
  { pattern: /sponsorship|require.*visa|immigration/i, match: /^no/i },
  { pattern: /authorized\s*to\s*work|right\s*to\s*work|legally/i, match: /^yes|^permanent/i },
  { pattern: /located\s*in\s*india|based\s*in\s*india/i, match: /^yes/i },
  { pattern: /willing\s*to\s*relocate|open\s*to\s*relocat/i, match: /^yes/i },
  { pattern: /18\s*years|over\s*18/i, match: /^yes/i },
  { pattern: /previously\s*employed|worked\s*here/i, match: /^no/i },
  { pattern: /relatives|family\s*members/i, match: /^no/i },
  { pattern: /agree|consent|privacy\s*policy|terms/i, match: /^(yes|agree|accept|confirm|i consent)/i }
];

async function handleGeneric(page, job) {
  const result = {
    ats: 'Generic / Direct Portal',
    success: false,
    resumeUploaded: false,
    fieldsFilled: 0,
    questionsAnswered: 0,
    submitFound: false,
    details: []
  };

  const resumePath = selectResume(job);

  // Targets: Main frame + any embedded career iframes
  const frames = [page.mainFrame(), ...page.frames().filter(f => f !== page.mainFrame())];

  for (const frame of frames) {
    try {
      // 1. Upload Resume
      const fileInputs = await frame.$$('input[type="file"]');
      for (const fi of fileInputs) {
        if (!result.resumeUploaded) {
          await fi.setInputFiles(resumePath).catch(() => {});
          result.resumeUploaded = true;
          result.details.push(`Uploaded resume: ${resumePath.split(/[\\/]/).pop()}`);
        }
      }

      // 2. Text / Email / Phone / URL Inputs
      const textInputs = await frame.$$('input:not([type="hidden"]):not([type="file"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"])');
      for (const input of textInputs) {
        try {
          if (!(await input.isVisible())) continue;
          const curVal = await input.inputValue();
          if (curVal && curVal.trim().length > 0) continue;

          const ctx = await getFrameElementContext(frame, input);
          for (const rule of FIELD_RULES) {
            if (rule.pattern.test(ctx)) {
              await input.fill(rule.value);
              result.fieldsFilled++;
              result.details.push(`Filled ${rule.name}`);
              break;
            }
          }
        } catch (e) {}
      }

      // 3. Textareas
      const textareas = await frame.$$('textarea');
      for (const ta of textareas) {
        try {
          if (!(await ta.isVisible())) continue;
          const curVal = await ta.inputValue();
          if (curVal && curVal.trim().length > 0) continue;

          const ctx = await getFrameElementContext(frame, ta);
          if (/cover\s*letter/i.test(ctx)) {
            const cl = generateCoverLetter(job);
            await ta.fill(cl);
            result.fieldsFilled++;
            result.details.push('Filled Cover Letter');
          } else {
            const ans = await answerQuestion(ctx, job);
            await ta.fill(ans);
            result.questionsAnswered++;
            result.details.push(`Answered question: "${ctx.slice(0, 35)}..."`);
          }
        } catch (e) {}
      }

      // 4. Select Dropdowns
      const selects = await frame.$$('select');
      for (const sel of selects) {
        try {
          if (!(await sel.isVisible())) continue;
          const ctx = await getFrameElementContext(frame, sel);
          const options = await sel.$$('option');

          for (const cr of SELECT_CHOICE_RULES) {
            if (cr.pattern.test(ctx)) {
              for (const opt of options) {
                const optText = (await opt.innerText()).trim();
                if (cr.match.test(optText)) {
                  const val = await opt.getAttribute('value');
                  await sel.selectOption(val !== null ? val : optText);
                  result.fieldsFilled++;
                  break;
                }
              }
              break;
            }
          }
        } catch (e) {}
      }

      // 5. Submit Button Search
      if (!result.submitFound) {
        const submitCandidate = await frame.$('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Apply Now")');
        if (submitCandidate && await submitCandidate.isVisible()) {
          result.submitFound = true;
          result.submitElement = submitCandidate;
        }
      }
    } catch (err) {
      // Continue next frame
    }
  }

  result.success = (result.resumeUploaded || result.fieldsFilled >= 2);
  return result;
}

async function getFrameElementContext(frame, el) {
  return await frame.evaluate(element => {
    let text = '';
    if (element.id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (lbl) text += lbl.innerText + ' ';
    }
    const parentLabel = element.closest('label');
    if (parentLabel) text += parentLabel.innerText + ' ';
    const container = element.closest('div, li, tr, fieldset');
    if (container) {
      const lbl = container.querySelector('label, legend, .label, [class*="label"], [class*="title"], [class*="question"]');
      if (lbl) text += lbl.innerText + ' ';
    }
    const placeholder = element.getAttribute('placeholder') || '';
    const aria = element.getAttribute('aria-label') || '';
    const name = element.getAttribute('name') || '';
    return `${text} ${placeholder} ${aria} ${name}`.trim().toLowerCase();
  }, el);
}

module.exports = {
  handleGeneric
};
