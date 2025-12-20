// modules/password_recovery.js
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');
const { sendEmail } = require('./mailer');
const { validatePassword, hashPassword } = require('./password-utils');

const dbPath = path.join(__dirname, '..', 'database','user-data.db');

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uid INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_uid) REFERENCES users(uid)
  )
`);

function sha256Hex(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function makeToken() {
  return crypto.randomBytes(32).toString('hex'); // 64 hex chars
}

async function requestPasswordReset({ email, baseUrl }) {
  if (!email) return { ok: true };

  const user = db.prepare(`SELECT uid, email FROM users WHERE email = ?`).get(email);
  if (!user) return { ok: true };

  const token = makeToken();
  const tokenHash = sha256Hex(token);

  const now = Date.now();
  const EXPIRES_MS = 1000 * 60 * 15;
  const expiresAt = now + EXPIRES_MS;

  // Invalidate older tokens
  db.prepare(`
    UPDATE password_resets
    SET used_at = ?
    WHERE user_uid = ? AND used_at IS NULL
  `).run(now, user.uid);

  db.prepare(`
    INSERT INTO password_resets (user_uid, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(user.uid, tokenHash, expiresAt, now);

  const resetLink = `${baseUrl}/reset-password?token=${token}`;
  const minutes = Math.floor(EXPIRES_MS / 60000);

  await sendEmail({
    to: user.email,
    subject: 'Password reset request',
    text:
`You requested a password reset.

Use this link to reset your password:
${resetLink}

This link expires in ${minutes} minutes.

If you did not request this, you can ignore this email.`
  });

  return { ok: true };
}


async function resetPasswordWithToken({ token, newPassword }) {
  if (!token || !newPassword) {
    return { ok: false, message: 'Missing token or password.' };
  }

  const pw = validatePassword(newPassword);
  if (!pw.valid) {
    return { ok: false, message: 'Error: ' + pw.errors.join(', ') };
  }

  const now = Date.now();
  const tokenHash = sha256Hex(token);

  const row = db.prepare(`
    SELECT id, user_uid, expires_at, used_at
    FROM password_resets
    WHERE token_hash = ?
  `).get(tokenHash);

  if (!row) {
    return { ok: false, message: 'Invalid or expired reset link.' };
  }
  if (row.used_at) {
    return { ok: false, message: 'This reset link was already used.' };
  }
  if (row.expires_at <= now) {
    return { ok: false, message: 'Reset link expired. Please request a new one.' };
  }

  const newHash = await hashPassword(newPassword);

  // Update user password
  db.prepare(`
    UPDATE users
    SET password = ?, num_fail = 0, lockout_until = NULL
    WHERE uid = ?
  `).run(newHash, row.user_uid);

  // Mark token as used
  db.prepare(`
    UPDATE password_resets
    SET used_at = ?
    WHERE id = ?
  `).run(now, row.id);

  return { ok: true };
}

module.exports = {
  requestPasswordReset,
  resetPasswordWithToken
};
