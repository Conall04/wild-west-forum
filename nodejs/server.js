// server.js
const express = require('express');
const hbs = require('hbs');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('./modules/sqlite_session_store');

// NEW: for Socket.IO
const http = require('http');
const { Server } = require('socket.io');

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

// Sessions
const sessionStore = new SQLiteStore({
  db: path.join(__dirname,'database','user-data.db'),
  table: 'sessions'
});

app.use(session({
  store: sessionStore,
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Make login info available in all HBS views
app.use((req, res, next) => {
  res.locals.isLoggedIn = !!req.session.user;
  res.locals.username   = req.session.user || null;
  next();
});

// Use the routing module for all app routes
const router = require('./modules/app_routes');
app.use('/', router);

// NEW: create HTTP server + attach Socket.IO
const server = http.createServer(app);
const io = new Server(server);

// Simple live chat (broadcast messages to everyone)
io.on('connection', (socket) => {
  socket.on('chat:message', (msg) => {
    io.emit('chat:message', msg);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
