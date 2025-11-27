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

// 👉 Use the routing module for all app routes
const router = require('./modules/app_routes');
app.use('/', router);

// Start the server
app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
