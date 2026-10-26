// Playwright Form Detection and Auto-Fill Engine
const { PROFILE, selectResume } = require('./profile');
const { answerQuestion } = require('./ai_answerer');

const TEXT_MAPPINGS = [
  { pattern: /first\s*name|given\s*name/i, value: PROFILE.first },
  { pattern: /last\s*name|surname|family\s*name/i, value: PROFILE.last },
  { pattern: /^name\b|full\s*name|your\s*name/i, value: PROFILE.full },
  { pattern: /e-?mail/i, value: PROFILE.email },
  { pattern: /phone|mobile|contact\s*number/i, value: PROFILE.phone },
  { pattern: /linkedin/i, value: PROFILE.linkedin },
  { pattern: /github/i, value: PROFILE.github },
  { pattern: /portfolio|website|blog|url/i, value: PROFILE.portfolio },
  { pattern: /address|street/i, value: PROFILE.addr1 },
  { pattern: /city|location/i, value: PROFILE.city },
  { pattern: /state|region|province/i, value: PROFILE.state },
  { pattern: /zip|postal|pin\s*code/i, value: PROFILE.zip },
  { pattern: /country/i, value: PROFILE.country },
  { pattern: /current\s*(company|employer|firm)|recent\s*employer/i, value: PROFILE.currentCompany },
  { pattern: /current\s*(title|designation|role)/i, value: PROFILE.currentTitle },
  { pattern: /total\s*years|years\s*of\s*exp|experience\s*in\s*years/i, value: PROFILE.years },
  { pattern: /notice\s*period.*days/i, value: PROFILE.noticeDays },
  { pattern: /notice\s*period|availability|how\s*soon/i, value: PROFILE.notice },
  { pattern: /current\s*(ctc|salary|compensation)/i, value: PROFILE.ctcCurrent },
  { pattern: /expected\s*(ctc|salary|compensation)/i, value: PROFILE.ctcExpected },
  { pattern: /school|university|college|institution/i, value: PROFILE.school },
  { pattern: /degree/i, value: PROFILE.degree },
  { pattern: /discipline|major|field\s*of\s*study/i, value: PROFILE.discipline },
  { pattern: /graduation|year\s*of\s*completion|end\s*year/i, value: PROFILE.gradYear }
];

const CHOICE_RULES = [
  { pattern: /sponsorship|require.*visa|immigration/i, matchText: /^no/i },
  { pattern: /authorized\s*to\s*work|right\s*to\s*work|legally/i, matchText: /^yes|^permanent/i },
  { pattern: /located\s*in\s*india|based\s*in\s*india/i, matchText: /^yes/i },
  { pattern: /willing\s*to\s*relocate|open\s*to\s*relocat/i, matchText: /^yes/i },
  { pattern: /18\s*years|over\s*18/i, matchText: /^yes/i },
  { pattern: /previously\s*employed|worked\s*here/i, matchText: /^no/i },
  { pattern: /relatives|family\s*members/i, matchText: /^no/i },
  { pattern: /agree|consent|privacy\s*policy|terms/i, matchText: /^(yes|agree|accept|confirm|i consent)/i }
];

async function fillApplicationForm(page, job) {
  const report = {
    filled: [],
    uploadedResume: false,
    aiAnswered: [],
    errors: []
  };

  const resumePath = selectResume(job);

  // 1. Upload Resume
  try {
    const fileInputs = await page.$$('input[type="file"]');
    if (fileInputs.length > 0) {
      await fileInputs[0].setInputFiles(resumePath);
      report.uploadedResume = true;
      report.filled.push({ field: 'Resume File', value: resumePath });
    }
  } catch (err) {
    report.errors.push('Resume upload: ' + err.message);
  }

  // 2. Process Input and Textarea Fields
  const inputs = await page.$$('input:not([type="hidden"]):not([type="file"]):not([type="submit"]):not([type="button"]), textarea, select');

  for (const el of inputs) {
    try {
      const isVisible = await el.isVisible();
      if (!isVisible) continue;

      const tagName = await el.evaluate(e => e.tagName.toLowerCase());
      const type = (await el.getAttribute('type') || '').toLowerCase();
      const name = await el.getAttribute('name') || '';
      const id = await el.getAttribute('id') || '';
      const placeholder = await el.getAttribute('placeholder') || '';
      const ariaLabel = await el.getAttribute('aria-label') || '';

      // Get label text
      const labelText = await page.evaluate(element => {
        let text = '';
        if (element.id) {
          const l = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
          if (l) text += l.innerText + ' ';
        }
        const parentLabel = element.closest('label');
        if (parentLabel) text += parentLabel.innerText + ' ';
        const container = element.closest('div, li, fieldset, tr');
        if (container) {
          const lbl = container.querySelector('label, legend, .label, [class*="label"], [class*="question"]');
          if (lbl) text += lbl.innerText + ' ';
        }
        return text.trim();
      }, el);

      const fieldDesc = `${labelText} ${placeholder} ${ariaLabel} ${name} ${id}`.toLowerCase();

      // Checkboxes & Radios
      if (type === 'radio' || type === 'checkbox') {
        for (const rule of CHOICE_RULES) {
          if (rule.pattern.test(fieldDesc)) {
            const isChecked = await el.isChecked();
            if (!isChecked) {
              await el.check().catch(() => el.click());
              report.filled.push({ field: fieldDesc.slice(0, 40), value: 'Checked' });
            }
            break;
          }
        }
        continue;
      }

      // Dropdown Select
      if (tagName === 'select') {
        for (const rule of CHOICE_RULES) {
          if (rule.pattern.test(fieldDesc)) {
            const options = await el.$$('option');
            for (const opt of options) {
              const optText = (await opt.innerText()).trim();
              if (rule.matchText.test(optText)) {
                const optVal = await opt.getAttribute('value');
                await el.selectOption(optVal || optText);
                report.filled.push({ field: fieldDesc.slice(0, 40), value: optText });
                break;
              }
            }
          }
        }
        continue;
      }

      // Long text / Textarea -> AI Answerer
      if (tagName === 'textarea') {
        const val = await el.inputValue();
        if (!val.trim()) {
          const aiAnswer = await answerQuestion(labelText || placeholder || name, job);
          await el.fill(aiAnswer);
          report.aiAnswered.push({ question: labelText.slice(0, 50), answer: aiAnswer.slice(0, 60) + '...' });
        }
        continue;
      }

      // Short Text Inputs
      const currentVal = await el.inputValue();
      if (!currentVal.trim()) {
        for (const m of TEXT_MAPPINGS) {
          if (m.pattern.test(fieldDesc)) {
            await el.fill(m.value);
            report.filled.push({ field: fieldDesc.slice(0, 40), value: m.value });
            break;
          }
        }
      }

    } catch (e) {
      // Continue next element
    }
  }

  return report;
}

module.exports = {
  fillApplicationForm
};
