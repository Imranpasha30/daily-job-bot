/**
 * Strict Application Submission Verifier
 * Verifies that the ATS server has genuinely received and confirmed the application
 */

async function verifySubmission(page, timeoutMs = 7000) {
  const result = {
    isConfirmed: false,
    reason: '',
    confirmationText: '',
    urlAfter: page.url(),
    hasCaptcha: false,
    errors: []
  };

  const startTime = Date.now();

  // Poll until confirmed or timeout
  while (Date.now() - startTime < timeoutMs) {
    const check = await page.evaluate(() => {
      const url = window.location.href.toLowerCase();
      const bodyText = (document.body?.innerText || '').toLowerCase();

      // 1. Check for URL confirmation patterns
      const urlPatterns = ['/confirmation', '/thank', '/submitted', '/applied', '/success', 'application_received'];
      const urlMatches = urlPatterns.some(p => url.includes(p));

      // 2. Check for explicit confirmation text in DOM
      const textPatterns = [
        'thank you for applying',
        'application submitted',
        'application received',
        'we have received your application',
        'thanks for your interest',
        'application was submitted',
        'we have received your submission',
        'successfully submitted',
        'your application has been sent'
      ];
      const textMatches = textPatterns.find(p => bodyText.includes(p));

      // 3. Check for validation errors remaining on page
      const errorElements = Array.from(document.querySelectorAll(
        '.error, [class*="error"], [class*="helper-text--error"], [aria-invalid="true"], [role="alert"]'
      )).map(e => e.innerText?.trim()).filter(Boolean);

      // 4. Check for Captcha blocking submission
      const captchaEl = document.querySelector(
        'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], div[class*="captcha"], #cf-turnstile, [class*="turnstile"]'
      );

      // 5. Check if application form is gone
      const hasForm = !!document.querySelector('form#application_form, form.application-form, #apply_form');

      return {
        urlMatches,
        textMatches,
        errorElements,
        hasCaptcha: !!captchaEl,
        hasForm
      };
    }).catch(() => null);

    if (check) {
      result.hasCaptcha = check.hasCaptcha;
      result.errors = check.errorElements || [];

      // If clear confirmation detected and no blocking errors
      if (check.urlMatches || check.textMatches) {
        result.isConfirmed = true;
        result.confirmationText = check.textMatches || 'Redirected to confirmation page';
        result.urlAfter = page.url();
        return result;
      }

      // If captcha detected and errors present
      if (check.hasCaptcha && check.errorElements.length > 0) {
        result.reason = 'Blocked by Captcha verification';
        return result;
      }
    }

    await new Promise(r => setTimeout(r, 600));
  }

  // Timeout reached without confirmation
  if (result.hasCaptcha) {
    result.reason = 'CAPTCHA challenge detected on form';
  } else if (result.errors.length > 0) {
    result.reason = `Form validation errors: ${result.errors.slice(0, 3).join('; ')}`;
  } else {
    result.reason = 'No confirmation response received from ATS server';
  }

  result.urlAfter = page.url();
  return result;
}

module.exports = {
  verifySubmission
};
