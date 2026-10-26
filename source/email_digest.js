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

// Take top 15 backend (~1.8-2 yrs exp) and top 15 cyber (fresher/entry-level) jobs
const topBackend = (backendFinal.jobs || []).slice(0, 15);
const topCyber = (cyberFinal.jobs || []).slice(0, 15);

function jobRow(j, isCyber = false) {
  const loc = j.region || (j.globalRemote ? 'Remote' : (j.inIndia ? 'India' : (j.inDubai ? 'Dubai, UAE' : 'Worldwide')));
  const sal = j.salaryText ? `<span style="color:#d97706;font-size:12px;font-weight:600;display:inline-block;margin-left:8px;">💰 ${j.salaryText}</span>` : '';
  const badges = [];
  if (j.inIndia) badges.push(`<span style="background:#e6f4ea;color:#137333;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">India</span>`);
  if (j.inDubai) badges.push(`<span style="background:#fef7e0;color:#b06000;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">Dubai/UAE</span>`);
  if (j.globalRemote || /remote/i.test(loc)) badges.push(`<span style="background:#e8f0fe;color:#1a73e8;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">Remote</span>`);
  
  const expBadge = isCyber
    ? `<span style="background:#f3e8ff;color:#7e22ce;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">Fresher / Entry-Level</span>`
    : `<span style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:600;">~1.8–2 Yrs Exp Match</span>`;

  return `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:12px 10px;vertical-align:top;">
        <div style="font-weight:600;font-size:14px;color:#111827;">${j.title}</div>
        <div style="font-size:13px;color:#4b5563;margin-top:2px;">
          <strong>${j.company}</strong> &bull; 📍 ${loc}
        </div>
        <div style="margin-top:5px;">${expBadge} ${badges.join(' ')} ${sal}</div>
      </td>
      <td style="padding:12px 10px;vertical-align:middle;text-align:right;white-space:nowrap;">
        <a href="${j.url}" target="_blank" style="background:#2563eb;color:#ffffff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:600;display:inline-block;">Apply &rarr;</a>
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
  <div style="max-width:680px;margin:20px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e5e7eb;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%);padding:24px 20px;color:#ffffff;">
      <h1 style="margin:0;font-size:22px;font-weight:700;">🚀 Filtered Job Alert &mdash; Imran Pasha</h1>
      <p style="margin:6px 0 0 0;font-size:13px;opacity:0.9;">
        ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })} | Rigorously Matched to Your Experience
      </p>
    </div>

    <!-- Profile Filter Notice -->
    <div style="background:#f0fdf4;border-bottom:1px solid #bbf7d0;padding:12px 20px;font-size:12.5px;color:#166534;line-height:1.4;">
      <strong>✓ Strict Experience Screening Applied:</strong><br>
      &bull; <strong>Backend Engineer:</strong> ~1.8 to 2 Years Experience (SDE 1, SDE 2, Intermediate &bull; No Senior/Lead/4+ years)<br>
      &bull; <strong>Cybersecurity:</strong> Fresher / Entry-Level (IIT Roorkee Certification &bull; SOC, AppSec, VAPT &bull; No Senior/Manager)
    </div>

    <!-- Quick Stats -->
    <div style="display:flex;background:#f9fafb;padding:14px 20px;border-bottom:1px solid #e5e7eb;font-size:13px;">
      <div style="flex:1;">
        <div style="color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Backend (~2 Yrs)</div>
        <div style="font-size:18px;font-weight:700;color:#1e3a8a;">${backendFinal.jobs ? backendFinal.jobs.length : 0} Live</div>
      </div>
      <div style="flex:1;">
        <div style="color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Cybersecurity (Fresher)</div>
        <div style="font-size:18px;font-weight:700;color:#0d9488;">${cyberFinal.jobs ? cyberFinal.jobs.length : 0} Live</div>
      </div>
      <div style="flex:1;">
        <div style="color:#6b7280;font-size:11px;text-transform:uppercase;font-weight:600;">Curated Picks</div>
        <div style="font-size:18px;font-weight:700;color:#d97706;">30 Featured</div>
      </div>
    </div>

    <!-- Section 1: Top Backend Jobs -->
    <div style="padding:20px 20px 10px 20px;">
      <h2 style="margin:0 0 4px 0;font-size:17px;color:#1e3a8a;border-bottom:2px solid #1e3a8a;padding-bottom:6px;">
        💻 Top 15 Backend Engineer Roles (~1.8–2 Yrs Exp)
      </h2>
      <p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">Node.js, Express, Python, FastAPI, PostgreSQL, Redis, Microservices</p>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          ${topBackend.map(j => jobRow(j, false)).join('')}
        </tbody>
      </table>
    </div>

    <!-- Section 2: Top Cybersecurity Jobs -->
    <div style="padding:20px 20px 10px 20px;">
      <h2 style="margin:0 0 4px 0;font-size:17px;color:#0d9488;border-bottom:2px solid #0d9488;padding-bottom:6px;">
        🛡️ Top 15 Fresher Cybersecurity Roles (Entry-Level / 0–2 Yrs)
      </h2>
      <p style="margin:0 0 10px 0;font-size:12px;color:#6b7280;">SOC Analyst, AppSec, Vulnerability Research, InfoSec (Dubai, India & Remote)</p>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>
          ${topCyber.map(j => jobRow(j, true)).join('')}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:16px 20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;">
      <p style="margin:0 0 6px 0;">Automated daily sweep delivered by your Cloud Job Bot.</p>
      <p style="margin:0;">Open your full interactive dashboards: <strong>jobs.html</strong> and <strong>cyber_jobs.html</strong>.</p>
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
    subject: `🚀 Filtered Job Digest: Backend (~2 Yrs) & Cybersecurity (Fresher) &bull; ${new Date().toLocaleDateString('en-IN')}`,
    html: html,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log('Email sent successfully:', info.messageId);
}

send().catch(err => {
  console.error('Failed to send email:', err.message);
  process.exit(1);
});
