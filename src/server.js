const express = require('express');
const https = require('https');
const fs = require('fs');
const helmet = require('helmet');

const config = require('../config');
const logger = require('./services/logger');
const apiRouter = require('./routes');
const errorMiddleware = require('./middleware/errorMiddleware');

class NexusServer {
  constructor() {
    this.app = express();
    this.server = this.initializeServer();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }
  initializeMiddleware() {
    this.app.use(helmet());
    this.app.use(express.json());
    this.app.use(express.static('public'));
  }
  initializeRoutes() {
    this.app.use('/api', apiRouter);
  }
  initializeErrorHandling() {
    this.app.use((req, res) => res.status(404).json({ message: 'Not Found' }));
    this.app.use(errorMiddleware);
  }
  initializeServer() {
    try {
      const tlsOptions = {
        key: fs.readFileSync(config.ssl.key),
        cert: fs.readFileSync(config.ssl.cert),
      };
      const server = https.createServer(tlsOptions, this.app);
      server.listen(config.port, () => {
        logger.info(`🚀 NEXUS server operational on port ${config.port}`);
      });
      return server;
    } catch (error) {
      logger.error('Server initialization failed', { error: error.message });
      process.exit(1);
    }
  }
}
new NexusServer();