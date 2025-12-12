// routes/app_routes.js
const express = require('express');
const path = require('path');

const router = express.Router();

// In-memory “database”
const users = [];     // { username, password }
const comments = [];  // { author, text, createdAt }

// Auth helper
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

// PDF modules
const pdf_find_data = require('../modules/pdf_find_data');
const pdf_validate  = require('../modules/pdf_validate');

// Login
const { loginUser } = require('../modules/login_user');

// Register
const { registerUser } = require('../modules/register_user');


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

router.post('/register', async (req, res) => {
  const { username, password, email, display_name, profile_color } = req.body;

  // Basic check
  if (!username || !password || !email || !display_name) {
    return res.status(400).render('register', {
      title: 'Register',
      error: 'Username, email, password, and display name are required.'
    });
  }

  // Use the SQLite register module
  const result = await registerUser({
    username,
    password,
    email,
    displayName: display_name,
    profileColor: profile_color
  });

  if (!result.ok) {
    
    return res.status(400).render('register', {
      title: 'Register',
      error: result.message
    });
  }

  // On success, redirect to login
  res.redirect('/login');
});


// Login
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const result = await loginUser({
    username,
    password,
    ipAddress: req.ip
  });

  if (!result.ok) {
    return res.status(401).render('login', {
      title: 'Login',
      error: result.message
    });
  }

  req.session.user = result.user.username;
  req.session.userUid = result.user.uid;

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
