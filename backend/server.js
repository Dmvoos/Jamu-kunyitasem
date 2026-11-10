// backend/server.js - Express Server Entry Point
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Sajikan frontend statis dari folder docs/
app.use(express.static(path.join(__dirname, '../docs')));

// Mount API routes
app.use('/api', apiRoutes);

// Fallback route ke docs/index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../docs/index.html'));
});

app.listen(PORT, () => {
  console.log(`🌿 Jamu Kunyit Asem Server berjalan di http://localhost:${PORT}`);
  console.log(`📁 Static Frontend served from /docs`);
});
