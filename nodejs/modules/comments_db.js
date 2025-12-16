// modules/comments_db.js
const Database = require('better-sqlite3');
const path = require('path');

// Keep this consistent with your other modules.
// You are using ../user-data.db in profile_user.js, so match that here.
const dbPath = path.join(__dirname, '..','user-data.db');
const db = new Database(dbPath);

// Create comments table (persisted)
db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    cid        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_uid   INTEGER NOT NULL,
    text       TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_uid) REFERENCES users(uid)
  )
`);

function addComment(userUid, text) {
  if (!userUid) return { ok: false, message: 'Not logged in.' };
  const msg = (text || '').trim();
  if (!msg) return { ok: false, message: 'Text is required.' };

  try {
    db.prepare(`
      INSERT INTO comments (user_uid, text, created_at)
      VALUES (?, ?, ?)
    `).run(userUid, msg, Date.now());

    return { ok: true };
  } catch (err) {
    console.error('addComment DB error:', err.message);
    return { ok: false, message: 'Error saving comment.' };
  }
}

function getRecentComments(limit = 100) {
  try {
    const rows = db.prepare(`
      SELECT
        u.display_name AS author,
        c.text         AS text,
        c.created_at   AS createdAt
      FROM comments c
      JOIN users u ON u.uid = c.user_uid
      ORDER BY c.created_at DESC
      LIMIT ?
    `).all(limit);

    // Convert timestamp -> readable string for your existing HBS
    return rows.map(r => ({
      author: r.author,
      text: r.text,
      createdAt: new Date(r.createdAt).toLocaleString()
    }));
  } catch (err) {
    console.error('getRecentComments DB error:', err.message);
    return [];
  }
}

module.exports = {
  addComment,
  getRecentComments
};
