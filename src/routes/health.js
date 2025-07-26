const express = require('express');
const db = require('../services/db');
const redis = require('../services/redis');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'API Operational' });
});

router.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    await redis.ping();
    res.status(200).json({ status: 'Ready' });
  } catch (error) {
    res.status(503).json({ status: 'Not Ready' });
  }
});

module.exports = router;
