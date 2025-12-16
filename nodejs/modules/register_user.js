// modules/register_user.js
const Database = require('better-sqlite3');
const path = require('path');
const { validatePassword, hashPassword } = require('./password-utils');

const dbPath = path.join(__dirname, '..','user-data.db');
const db = new Database(dbPath);

// Ensure users table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    uid            INTEGER PRIMARY KEY AUTOINCREMENT, 
    username       TEXT NOT NULL UNIQUE,
    password       TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE,
    display_name   TEXT NOT NULL,
    profile_color  TEXT,
    num_fail INTEGER NOT NULL DEFAULT 0,
    lockout_until INTEGER
  )
`);


async function registerUser({ username, password, email, displayName, profileColor }) {
  // Basic check
  if (!username || !password || !email || !displayName) {
    return {
      ok: false,
      message: 'Error: All fields must be filled'
    };
  }

  if (displayName === username) {
    return {
      ok: false,
      message: 'Error: Display name must be different from username.'
    };
  }

  // Check that Password is valid
  const pw = validatePassword(password);
  if (!pw.valid) {
    return { ok: false, message: 'Error: ' + pw.errors.join(', ') };
  }

  // Check username is unique
  const existingUser = db
    .prepare('SELECT uid FROM users WHERE username = ?')
    .get(username);

  if (existingUser) {
    return { ok: false, message: 'Error: Username already taken.' };
  }

  // Check email uniqueness
  const existingEmail = db
    .prepare('SELECT uid FROM users WHERE email = ?')
    .get(email);

  if (existingEmail) {
    return { ok: false, message: 'Error: Email already in use.' };
  }

  // Insert user
  try {

    const passwordHash = await hashPassword(password);

    const result = db.prepare(`
      INSERT INTO users (username, password, email, display_name, profile_color)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      username,
      passwordHash,
      email,
      displayName,
      profileColor || '#000000'
    );


    return { ok: true, uid: result.lastInsertRowid };
  } catch (err) {
    console.error('registerUser DB error:', err.message);

    // Fallback in case UNIQUE constraint triggers anyway
    if (err.message.includes('UNIQUE') && err.message.includes('username')) {
      return { ok: false, message: 'Error: Username already taken.' };
    }
    if (err.message.includes('UNIQUE') && err.message.includes('email')) {
      return { ok: false, message: 'Error: Email already in use.' };
    }

    return { ok: false, message: 'Error: Problem creating user.' };
  }
}

module.exports = { registerUser };
