// routes/app_routes.js
const express = require('express');
const path = require('path');

const router = express.Router();

// In-memory “database”
const users = [];     // { username, password }
const comments = [];  // { author, text, createdAt }

// Auth helper (same as before)
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// PDF modules
const pdf_find_data = require('../modules/pdf_find_data');
const pdf_validate  = require('../modules/pdf_validate');


router.get('/', (req, res) => {
  res.render('home', {
    title: 'Welcome to The Wild West Forum stuff',
    message: 'This is a midterm project by Conall Gouveia for COS 498: Server-side Web-Dev from the University of Maine.',
    text: 'If you are a wild west enthusiast, this site is for you! Here you can paot about your favorite cowboy or girl, you can do some reading on the history of the wild west, and more!'
  });
});

router.get('/pdf_view', (req, res) => {
  const pdfs = pdf_find_data.load_pdf_metadata();
  res.render('pdf_view', {
    title: 'Readings',
    message: 'Here are some books, in the form of PDFs, that you can download.',
    pdfs
  });
});

// Secure PDF serving using validation module
router.get('/pdfs/:filename', (req, res) => {
  const filename = req.params.filename;

  const validate_result = pdf_validate.validate_pdf_request(filename);

  if (!validate_result.ok) {
    return res.status(validate_result.status).send(validate_result.message);
  }

  const file_path = validate_result.file_path;

  res.sendFile(file_path, (err) => {
    if (err) {
      console.error('Error: Problem sending PDF file:', err.message);
      if (!res.headersSent) {
        if (err.code === 'ENOENT') {
          return res.status(404).send('Error: PDF file not found on server');
        }
        return res.status(500).send('Error: Problem serving PDF file');
      }
    }
  });
});

// Comments
router.get('/comments', (req, res) => {
  res.render('comment_list', {
    title: 'Comment Feed',
    message: 'Recent posts',
    comments
  });
});

router.get('/comment/new', requireAuth, (req, res) => {
  res.render('new_comment_form');
});

router.post('/comment', requireAuth, (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).send('Text is required.');
  }
  comments.push({ author: req.session.user, text, createdAt: new Date() });
  res.redirect('/comments');
});

// Register
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

router.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send('Error: Both Username and password required.');
  }

  const exists = users.some(u => u.username === username);
  if (exists) {
    return res.status(400).render('register', {
      title: 'Register',
      error: 'Username already taken.'
    });
  }

  users.push({ username, password });
  res.redirect('/login');
});

// Login
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).render('login', { title: 'Login', error: 'Invalid credentials.' });
  }

  req.session.user = username;
  req.session.sessionId = Math.random().toString(36).slice(2);
  req.session.expires = new Date(Date.now() + 1000 * 60 * 60);

  res.redirect('/comments');
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// 404 handler (For routes that aren't valid)
router.use((req, res) => {
  res.status(404).send('Page not found');
});

module.exports = router;
