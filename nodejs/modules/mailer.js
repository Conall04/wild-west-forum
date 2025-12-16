// modules/mailer.js
const sgMail = require('@sendgrid/mail');

function getConfig() {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey) throw new Error('Missing SENDGRID_API_KEY');
    if (!fromEmail) throw new Error('Missing SENDGRID_FROM_EMAIL');

    return { apiKey, fromEmail };
}

async function sendEmail({ to, subject, html, text }) {
    const { apiKey, fromEmail } = getConfig();

    sgMail.setApiKey(apiKey);

    await sgMail.send({
        to,
        from: fromEmail,
        subject,
        text: text || undefined,
        html: html || undefined
    });
}

module.exports = { sendEmail };
