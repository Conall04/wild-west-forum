// server.js
const express = require('express');
const app = express();
const PORT = 3210;

// Basic route
app.get('/', (req, res) => {
    res.send('Hello from Express!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Express server running on http://localhost:${PORT}`);
});
