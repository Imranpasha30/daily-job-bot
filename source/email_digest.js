// Generate HTML email digest and send to Imran Pasha
const fs = require('fs');
const path = require('path');

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  // nodemailer optional locally; installed in cloud/GitHub Actions
}

const backendFinal = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'final.json'), 'utf8'));
const cyberFinal = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cyber_final.json'), 'utf8'));

const TO_EMAIL = process.env.TO_EMAIL || 'imranpasha.ahmed@gmail.com';
const FROM_EMAIL = process.env.EMAIL_USER;
const PASS = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

// Take top 15 backend and top 15 cyber jobs
const topBackend = (backendFinal.jobs || []).slice(0, 15);
const topCyber = (cyberFinal.jobs || []).slice(0, 15);

function jobRow(j, isCyber = false) {
  const loc = j.region || (j.globalRemote ? 'Remote' : (j.inIndia ? 'India' : 'Worldwide'));
  const score = j.score || 0;
  const sal = j.salaryText ? `<span style="color:#d97706;font-size:12px;font-weight:600;display:block;">💰 ${j.salaryText}</span>` : '';
  const badges = [];
  if (j.inIndia) badges.push(`<span style="background:#e6f4ea;color:#137333;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">India</span>`);
  if (j.inDubai) badges.push(`<span style="background:#fef7e0;color:#b06000;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">Dubai</span>`);
  if (j.globalRemote || /remote/i.test(loc)) badges.push(`<span style="background:#e8f0fe;color:#1a73e8;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">Remote</span>`);
  
  return `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:12px 10px;vertical-align:top;">
        <div style="font-weight:600;font-size:14px;color:#111827;">${j.title}</div>
        <div style="font-size:13px;color:#4b5563;margin-top:2px;">
          <strong>${j.company}</strong> &bull; 📍 ${loc}
        </div>
        <div style="margin-top:4px;">${badges.join(' ')} ${sal}</div>
      </td>
      <td style="padding:12px 10px;vertical-align:middle;text-align:right;white-space:nowrap;">
        <a href="${j.url}" target="_blank" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:7px 14px;border-radius:6px;font-size:12px;font-weight:600;display:inline-block;">Apply &rarr;</a>
      </td>
    </tr>
  `;
}

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Job Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <div style="max-width:650px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%);padding:24px 20px;color:#ffffff;">
      <h1 style="margin:0;font-size:22px;font-weight:700;">🚀 Daily Job Alert &mdash; Imran Pasha</h1>
      <p style="margin:6px 0 0 0;font-size:13px;opacity:0.9;">
        ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })} | Fresh Job Sweep
      </p>
    </div>

    <!-- Quick Stats -->
    <div style="display:flex;background:#f9fafb;padding:14px 20px;border-bottom:1px solid #e5e7eb;font-size:13px;">
      <div style="flex:1;">
        <div style="color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Backend Roles</div>
        <div style="font-size:18px;font-weight:700;color:#1e3a8a;">${backendFinal.jobs ? backendFinal.jobs.length : 0} Live</div>
      </div>
      <div style="flex:1;">
        <div style="color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Cybersecurity Roles</div>
        <div style="font-size:18px;font-weight:700;color:#0d9488;">${cyberFinal.jobs ? cyberFinal.jobs.length : 0} Live</div>
      </div>
      <div style="flex:1;">
        <div style="color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Fresh Top Picks</div>
        <div style="font-size:18px;font-weight:700;color:#d97706;">30 Featured</div>
      </div>
    </div>

    <!-- Section 1: Top Backend Jobs -->
    <div style="padding:20px 20px 10px 20px;">
      <h2 style="margin:0 0 12px 0;font-size:17px;color:#1e3a8a;border-bottom:2px solid #1e3a8a;padding-bottom:6px;">
        💻 Top 15 Backend Engineer Roles
      </h2>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          ${topBackend.map(j => jobRow(j, false)).join('')}
        </tbody>
      </table>
    </div>

    <!-- Section 2: Top Cybersecurity Jobs -->
    <div style="padding:20px 20px 10px 20px;">
      <h2 style="margin:0 0 12px 0;font-size:17px;color:#0d9488;border-bottom:2px solid #0d9488;padding-bottom:6px;">
        🛡️ Top 15 Fresher Cybersecurity & SOC Roles
      </h2>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          ${topCyber.map(j => jobRow(j, true)).join('')}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;">
      <p style="margin:0 0 6px 0;">This email was sent automatically by your Cloud Job Bot.</p>
      <p style="margin:0;">Open your full interactive dashboards anytime from your local workspace: <strong>jobs.html</strong> and <strong>cyber_jobs.html</strong>.</p>
    </div>

  </div>
</body>
</html>
`;

// Save email HTML locally as a preview/artifact
fs.writeFileSync(path.join(__dirname, '..', 'email_preview.html'), html);
console.log('Saved email preview to Jobs/email_preview.html');

async function send() {
  if (!FROM_EMAIL || !PASS) {
    console.log('EMAIL_USER or EMAIL_PASS not set. Skipping SMTP send. (Preview saved to Jobs/email_preview.html)');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: FROM_EMAIL,
      pass: PASS,
    },
  });

  const mailOptions = {
    from: `"Job Bot" <${FROM_EMAIL}>`,
    to: TO_EMAIL,
    subject: `🚀 Daily Job Digest: 100+ Backend & 200+ Cybersecurity Roles (${new Date().toLocaleDateString('en-IN')})`,
    html: html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent successfully:', info.messageId);
}

send().catch(err => {
  console.error('Failed to send email:', err.message);
  process.exit(1);
});
