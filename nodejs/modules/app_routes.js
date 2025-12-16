// routes/app_routes.js
const express = require('express');
const path = require('path');

const router = express.Router();

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

// Profile helper
const { getUserByUid, updateDisplayName, updateEmail, updateProfileColor, changePasswordAndLogoutAll } = require('../modules/profile_helper');

// Password Recovery
const { requestPasswordReset, resetPasswordWithToken } = require('../modules/password_recovery');

// Comments DB module
const { addComment, getRecentComments } = require('../modules/comments_db');



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

// Comments (NOW PERSISTED IN SQLITE)
router.get('/comments', (req, res) => {
  const comments = getRecentComments(200);

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

  const result = addComment(req.session.userUid, text);
  if (!result.ok) {
    return res.status(400).send(result.message);
  }

  res.redirect('/comments');
});

// Live chat
router.get('/chat', requireAuth, (req, res) => {
  const user = getUserByUid(req.session.userUid)
  res.render('chat', {
    title: 'Live Chat',
    displayname: user.display_name
  });
});



// Profile page---------------------------------
router.get('/profile', requireAuth, (req, res) => {
  const user = getUserByUid(req.session.userUid);

  if (!user) {
    return res.status(404).send('User not found');
  }

  res.render('profile', {
    title: 'Your Profile',
    user
  });
});
// Update Display name
router.post('/profile/display-name', requireAuth, (req, res) => {
  const result = updateDisplayName(req.session.userUid, req.body.display_name);

  if (!result.ok) {
    return res.status(400).render('profile', {
      title: 'Your Profile',
      error: result.message,
      user: getUserByUid(req.session.userUid)
    });
  }

  res.redirect('/profile');
});

// Udate Color
router.post('/profile/color', requireAuth, (req, res) => {
  const result = updateProfileColor(req.session.userUid, req.body.profile_color);

  if (!result.ok) {
    return res.status(400).render('profile', {
      title: 'Your Profile',
      error: result.message,
      user: getUserByUid(req.session.userUid)
    });
  }

  res.redirect('/profile');
});

// Forgot Password
router.get('/forgot-password', (req, res) => {
    res.render('forgot_password', { title: 'Forgot Password' });
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    // baseUrl should match your public site URL (HTTPS in production)
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    try {
        await requestPasswordReset({ email, baseUrl });
    } catch (err) {
        console.error('forgot-password error:', err.message);
        // Still don’t reveal anything; show same message
    }

    res.render('forgot_password', {
        title: 'Forgot Password',
        message: 'If that email exists, we sent a password reset link.'
    });
});

// Reset Password (page from email link)
router.get('/reset-password', (req, res) => {
  const token = req.query.token || '';
  res.render('reset_password', {
    title: 'Reset Password',
    token
  });
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  const result = await resetPasswordWithToken({
    token,
    newPassword: password
  });

  if (!result.ok) {
    return res.status(400).render('reset_password', {
      title: 'Reset Password',
      token,
      error: result.message
    });
  }

  // success: send them to login
  res.redirect('/login');
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