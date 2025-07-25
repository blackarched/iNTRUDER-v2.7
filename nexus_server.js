require('dotenv').config();
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const app = require('./src/app');
const config = require('./config');
const logger = require('./src/services/logger');
const redis = require('./src/services/redis');

class NexusCommandCenter {
  constructor() {
    this.server = this.initializeServer();
    this.wss = this.initializeWebSocketServer();
    this.initializeRedisSubscription();
  }

  initializeServer() {
    try {
      const tlsOptions = {
        key: fs.readFileSync(config.ssl.key),
        cert: fs.readFileSync(config.ssl.cert),
      };
      const server = https.createServer(tlsOptions, app);
      server.listen(config.port, () => {
        logger.info(`🚀 NEXUS Command Center operational on secure port ${config.port}`);
      });
      return server;
    } catch (error) {
      logger.error('Server initialization failed. Verify SSL certificate paths and permissions.', { error: error.message });
      process.exit(1);
    }
  }

  initializeWebSocketServer() {
    const wss = new WebSocket.Server({ server: this.server });
    wss.on('connection', (ws) => {
      logger.info('Frontend HUD connected via WebSocket.');
      ws.on('message', (message) => {
        logger.debug(`Received command from HUD: ${message}`);
        // Handle incoming commands from the frontend
      });
      ws.on('close', () => {
        logger.info('Frontend HUD disconnected.');
      });
    });
    logger.info('WebSocket server initialized and attached to HTTPS server.');
    return wss;
  }

  initializeRedisSubscription() {
    const redisSubscriber = redis.duplicate();
    redisSubscriber.subscribe('motion_events', (message) => {
      const event = JSON.parse(message);
      this.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(event));
        }
      });
    });
    logger.info('Subscribed to motion_events Redis channel.');
  }
}

new NexusCommandCenter();