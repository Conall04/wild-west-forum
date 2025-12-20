// modules/profile_user.js
const Database = require('better-sqlite3');
const path = require('path');
const { validatePassword, hashPassword, comparePassword } = require('./password-utils');

const dbPath = path.join(__dirname, '..', 'database','user-data.db');
const db = new Database(dbPath);

// Ensure users table exists (same schema style as login_user.js)
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        uid           INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT NOT NULL UNIQUE,
        password      TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        display_name  TEXT NOT NULL,
        profile_color TEXT,
        num_fail      INTEGER NOT NULL DEFAULT 0,
        lockout_until INTEGER
    )
`);

// Ensure sessions table exists (so we can invalidate sessions on password change)
db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY,
        sess TEXT NOT NULL,
        expire INTEGER NOT NULL,
        user_uid INTEGER,
        FOREIGN KEY (user_uid) REFERENCES users(uid)
    )
`);

function getUserByUid(uid) {
    if (!uid) return null;

    try {
        return db.prepare(`
            SELECT uid, username, email, display_name, profile_color, num_fail, lockout_until
            FROM users
            WHERE uid = ?
        `).get(uid);
    } catch (err) {
        console.error('getUserByUid DB error:', err.message);
        return null;
    }
}

// Update display name (no password required)
function updateDisplayName(uid, displayName) {
    if (!uid) {
        return { ok: false, message: 'Not logged in.' };
    }

    const name = (displayName || '').trim();

    if (!name) {
        return { ok: false, message: 'Display name is required.' };
    }

    if (name.length < 2 || name.length > 30) {
        return { ok: false, message: 'Display name must be 2–30 characters.' };
    }

    // Simple validation: letters/numbers/space/_/-
    if (!/^[A-Za-z0-9 _-]+$/.test(name)) {
        return { ok: false, message: 'Display name contains invalid characters.' };
    }

    try {
        const result = db.prepare(`
            UPDATE users
            SET display_name = ?
            WHERE uid = ?
        `).run(name, uid);

        if (result.changes === 0) {
            return { ok: false, message: 'User not found.' };
        }

        return { ok: true };
    } catch (err) {
        console.error('updateDisplayName DB error:', err.message);
        return { ok: false, message: 'Error updating display name.' };
    }
}

// Update profile color (no password required)
function updateProfileColor(uid, profileColor) {
    if (!uid) {
        return { ok: false, message: 'Not logged in.' };
    }

    const color = (profileColor || '').trim();

    if (!color) {
        return { ok: false, message: 'Profile color is required.' };
    }

    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
        return { ok: false, message: 'Profile color must be a hex value like #ff0000.' };
    }

    try {
        const result = db.prepare(`
            UPDATE users
            SET profile_color = ?
            WHERE uid = ?
        `).run(color, uid);

        if (result.changes === 0) {
            return { ok: false, message: 'User not found.' };
        }

        return { ok: true };
    } catch (err) {
        console.error('updateProfileColor DB error:', err.message);
        return { ok: false, message: 'Error updating profile color.' };
    }
}

// Update email (requires current password)
async function updateEmail(uid, currentPassword, newEmail) {
    if (!uid) {
        return { ok: false, message: 'Not logged in.' };
    }

    const email = (newEmail || '').trim();

    if (!currentPassword) {
        return { ok: false, message: 'Current password is required.' };
    }

    if (!email) {
        return { ok: false, message: 'Email is required.' };
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, message: 'Invalid email format.' };
    }

    try {
        const user = db.prepare(`
            SELECT uid, password
            FROM users
            WHERE uid = ?
        `).get(uid);

        if (!user) {
            return { ok: false, message: 'User not found.' };
        }

        const match = await comparePassword(currentPassword, user.password);
        if (!match) {
            return { ok: false, message: 'Current password is incorrect.' };
        }

        // Check uniqueness
        const existing = db.prepare(`
            SELECT uid FROM users WHERE email = ?
        `).get(email);

        if (existing && existing.uid !== uid) {
            return { ok: false, message: 'Email already in use.' };
        }

        db.prepare(`
            UPDATE users
            SET email = ?
            WHERE uid = ?
        `).run(email, uid);

        return { ok: true };
    } catch (err) {
        console.error('updateEmail DB error:', err.message);
        return { ok: false, message: 'Error updating email.' };
    }
}

// Helper: delete all sessions for a user (required after password change)
function deleteAllSessionsForUser(uid) {
    try {
        // Best case: we store user_uid
        db.prepare(`
            DELETE FROM sessions
            WHERE user_uid = ?
        `).run(uid);

        // Fallback: if user_uid wasn't stored, try to match session JSON
        // (works if express-session serializes userUid)
        const likeNeedle = `%\"userUid\":${uid}%`;
        db.prepare(`
            DELETE FROM sessions
            WHERE sess LIKE ?
        `).run(likeNeedle);
    } catch (err) {
        console.error('deleteAllSessionsForUser DB error:', err.message);
    }
}

// Change password (requires current password + password rules + hashes + logs out all sessions)
async function changePasswordAndLogoutAll(uid, currentPassword, newPassword, confirmNewPassword) {
    if (!uid) {
        return { ok: false, message: 'Not logged in.' };
    }

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return { ok: false, message: 'All password fields are required.' };
    }

    if (newPassword !== confirmNewPassword) {
        return { ok: false, message: 'New passwords do not match.' };
    }

    const pw = validatePassword(newPassword);
    if (!pw.valid) {
        return { ok: false, message: 'Error: ' + pw.errors.join(', ') };
    }

    try {
        const user = db.prepare(`
            SELECT uid, password
            FROM users
            WHERE uid = ?
        `).get(uid);

        if (!user) {
            return { ok: false, message: 'User not found.' };
        }

        const match = await comparePassword(currentPassword, user.password);
        if (!match) {
            return { ok: false, message: 'Current password is incorrect.' };
        }

        const newHash = await hashPassword(newPassword);

        db.prepare(`
            UPDATE users
            SET password = ?
            WHERE uid = ?
        `).run(newHash, uid);

        // Invalidate all existing sessions (requirement)
        deleteAllSessionsForUser(uid);

        return { ok: true };
    } catch (err) {
        console.error('changePasswordAndLogoutAll DB error:', err.message);
        return { ok: false, message: 'Error changing password.' };
    }
}

module.exports = {
    getUserByUid,
    updateDisplayName,
    updateEmail,
    updateProfileColor,
    changePasswordAndLogoutAll
};
