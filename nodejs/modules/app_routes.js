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
const { addComment, countComments, getCommentsPage, getCommentById } = require('../modules/comments_db');



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

// Comments (PAGINATED)
router.get('/comments', (req, res) => {
  const PAGE_SIZE = 10;

  // page comes from query string: /comments?page=2
  let page = parseInt(req.query.page, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;

  const total = countComments();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // clamp page so /comments?page=999 doesn't break
  if (page > totalPages) page = totalPages;

  const offset = (page - 1) * PAGE_SIZE;

  const comments = getCommentsPage({ limit: PAGE_SIZE, offset });

  const TRUNCATE_LEN = 10;

  const viewComments = comments.map(c => {
    const needsTruncate = c.text.length > TRUNCATE_LEN;
    return {
      ...c,
      previewText: needsTruncate ? c.text.slice(0, TRUNCATE_LEN) + '…' : c.text,
      isTruncated: needsTruncate,
    };
  });

  res.render('comment_list', {
    title: 'Comment Feed',
    message: 'Recent posts',
    comments: viewComments,
    page,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
    prevPage: page - 1,
    nextPage: page + 1,
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
// to see full comment if trunckated
router.get('/comment/:cid', (req, res) => {

  try{
    const comment = getCommentById(req.params.cid);
    if (!comment) return res.status(404).send('Comment not found.');

    res.render('comment_detail', {
      title: 'Comment',
      comment
    });
  }catch(err){
    console.error('Get /comment/:cid error:', err)
    return res.status(500).send('internal server error. (Comment detail)')
  }
});

// Live chat
router.get('/chat', requireAuth, (req, res) => {
  const user = getUserByUid(req.session.userUid)
  res.render('chat', {
    title: 'Live Chat',
    displayname: user.display_name,
    color: user.profile_color
  });
});



// Profile page---------------------------------
router.get('/profile', requireAuth, (req, res) => {
  const user = getUserByUid(req.session.userUid);
  if (!user) return res.status(404).send('User not found');

  // one-time message (clears itself)
  const message = req.session.flashMessage || null;
  const error = req.session.flashError || null;
  req.session.flashMessage = null;
  req.session.flashError = null;

  res.render('profile', {
    title: 'Your Profile',
    user,
    message,
    error
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
// Update Email
router.post('/profile/email', requireAuth, async (req, res) => {
  try {
    const { current_password, email } = req.body;

    const result = await updateEmail(req.session.userUid, current_password, email);

    if (!result.ok) {
      req.session.flashError = result.message;
      return res.redirect('/profile');
    }

    req.session.flashMessage = 'Email updated successfully.';
    return res.redirect('/profile');
  } catch (err) {
    console.error('POST /profile/email error:', err);
    req.session.flashError = 'Server error updating email.';
    return res.redirect('/profile');
  }
});
// Change Password (logs out all sessions)
router.post('/profile/password', requireAuth, async (req, res) => {
  const { current_password, new_password, confirm_new_password } = req.body;

  const result = await changePasswordAndLogoutAll(
    req.session.userUid,
    current_password,
    new_password,
    confirm_new_password
  );

  if (!result.ok) {
    return res.status(400).render('profile', {
      title: 'Your Profile',
      error: result.message,
      user: getUserByUid(req.session.userUid)
    });
  }

  // Your helper invalidates sessions in DB, now kill this browser session too
  req.session.destroy(() => {
    res.redirect('/login');
  });
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