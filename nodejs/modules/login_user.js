// modules/login_user.js
const Database = require('better-sqlite3');
const path = require('path');
const { comparePassword } = require('./password-utils');

const dbPath = path.join(__dirname, '..', 'database','user-data.db');
const db = new Database(dbPath);

const MAX_FAILS  = 5;
const LOCKOUT_MS = 1000 * 60 * 15; // 1000ms * 60 = 1 min, 1min * 15 = 15 min

// Ensure users table exists
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        uid           INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT NOT NULL UNIQUE,
        password      TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        display_name  TEXT NOT NULL,
        profile_color TEXT,
        num_fail INTEGER NOT NULL DEFAULT 0,
        lockout_until INTEGER
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

        const now = Date.now();

        // If user account is locked out, deny access immediately
        if (user.lockout_until && user.lockout_until > now){
            return{
                ok: false,
                message: 'Account locked. Try again later'
            };
        };


        const match = await comparePassword(password, user.password);
        if (!match) {
            recordLoginAttempt(user.uid, false, ipAddress);

            // Increase the number of fails by 1
            fails = user.num_fail + 1;
            let lockout_time = null;
            if (fails >= MAX_FAILS){
                lockout_time = now + LOCKOUT_MS;
            }

            db.prepare(`
                UPDATE users
                SET num_fail = ?, lockout_until = ?
                WHERE uid = ?
            `).run(fails, lockout_time,user.uid);

            return {
                ok: false,
                message: lockout_time
                    ? 'Account locked due to too many failed logins. Try again later.'
                    : 'Invalid credentials.'
            };
        }

        // Successful login
        recordLoginAttempt(user.uid, true, ipAddress);

        // Set the number of fails back to 0
        db.prepare(`
            UPDATE users
            SET num_fail = 0, lockout_until = NULL
            WHERE uid = ?
        `).run(user.uid);

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
