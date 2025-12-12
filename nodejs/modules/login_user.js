// modules/login_user.js
const Database = require('better-sqlite3');
const path = require('path');
const { comparePassword } = require('./password-utils');

const dbPath = path.join(__dirname, '..', 'user-data.db');
const db = new Database(dbPath);

// Ensure users table exists
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        uid           INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT NOT NULL UNIQUE,
        password      TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        display_name  TEXT NOT NULL,
        profile_color TEXT
    )
`);

// Ensure logins table exists
db.exec(`
    CREATE TABLE IF NOT EXISTS logins (
        lid        INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uid   INTEGER NOT NULL,
        ip_address TEXT NOT NULL,
        time_stamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        success    INTEGER NOT NULL,
        FOREIGN KEY (user_uid) REFERENCES users(uid)
    )
`);

// Record a login attempt (success or failure)
function recordLoginAttempt(userUid, success, ipAddress) {
    try {
        db.prepare(`
            INSERT INTO logins (user_uid, ip_address, success)
            VALUES (?, ?, ?)
        `).run(userUid, ipAddress || '', success ? 1 : 0);
    } catch (err) {
        console.error('recordLoginAttempt error:', err.message);
    }
}


// Authenticate and log in a user
async function loginUser({ username, password, ipAddress }) {
    if (!username || !password) {
        return {
            ok: false,
            message: 'Username and password are required.'
        };
    }

    try {
        const user = db
            .prepare(`SELECT * FROM users WHERE username = ?`)
            .get(username);

        if (!user) {
            return {
                ok: false,
                message: 'Invalid credentials.'
            };
        }

        const match = await comparePassword(password, user.password);
        if (!match) {
            recordLoginAttempt(user.uid, false, ipAddress);
            return {
                ok: false,
                message: 'Invalid credentials.'
            };
        }

        // Successful login
        recordLoginAttempt(user.uid, true, ipAddress);

        return {
            ok: true,
            user
        };
    } catch (err) {
        console.error('loginUser DB error:', err.message);
        return {
            ok: false,
            message: 'Error logging in.'
        };
    }
}

module.exports = {
    loginUser
};
