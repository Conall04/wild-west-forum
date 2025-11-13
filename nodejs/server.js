// server.js
const express = require('express');
const hbs = require('hbs');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 3210;


// Set up Handlebars
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Register partials directory
hbs.registerPartials(path.join(__dirname, 'partials'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Sessions (intentionally weak/insecure per assignment)
app.use(session({
  secret: 'dev-only',           // not secure; fine for this assignment
  resave: false,
  saveUninitialized: false
}));

// Make login info available in all HBS views
app.use((req, res, next) => {
  res.locals.isLoggedIn = !!req.session.user;
  res.locals.username   = req.session.user || null;
  next();
});


function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}


const users = [];     // { username, password }
const comments = [];  // { author, text, createdAt }


// Routes
app.get('/', (req, res) => {
    res.render('home', {
        title: 'Welcome to The Wild West Forum',
        message: 'This is a midterm project by Conall Gouveia for COS 498: Server-side Web-Dev from the University of Maine.'
    });
});


// List comments
app.get('/comments', (req, res) => {
  res.render('comment_list', {
    title: 'Comment Feed',
    message: 'Recent posts',
    comments
  });
});

// Show new-comment form
app.get('/comment/new', (req, res) => {
  res.render('new_comment_form');
});

// Handle new comment
app.post('/comment', (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).send('Text is required.');
  }
  comments.push({ author: req.session.user, text, createdAt: new Date() }); // stored in memory
  res.redirect('/comments');
});


// GET /register
app.get('/register', (req, res) => {
  res.render('register', { title: 'Register' });
});

// POST /register
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password){
    return res.status(400).send('Error: Both Username and password required.');
  } 

  const exists = users.some(u => u.username === username);
  if (exists) {
    return res.status(400).render('register', { title: 'Register', error: 'Username already taken.' });
  }

  users.push({ username, password });
  res.redirect('/login');
});



// GET /login
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' });
});

// POST /login  → set a session cookie / session object
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).render('login', { title: 'Login', error: 'Invalid credentials.' });
  }

  // Minimal session info (intentionally weak)
  req.session.user = username;
  req.session.sessionId = Math.random().toString(36).slice(2);
  req.session.expires = new Date(Date.now() + 1000*60*60);

  res.redirect('/comments');
});

// POST /logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});



// Start the server
app.listen(PORT, () => {
    console.log(`Express server running on http://localhost:${PORT}`);
});
