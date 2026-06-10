'use strict';

const express = require('express');
const cors = require('cors');
const { requestLogger } = require('./middlewares/requestLogger');
const { errorHandler } = require('./middlewares/errorHandler');
const tokenRoutes = require('./routes/tokenRoutes');
const settingRoutes = require('./routes/settingRoutes');

const app = express();

// ─── Core Middlewares ───────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/v1', tokenRoutes);
app.use('/api/v1/settings', settingRoutes);

// ─── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ─── Global Error Handler (must be LAST) ────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
