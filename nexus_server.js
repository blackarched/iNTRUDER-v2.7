// Load environment variables first
require('dotenv').config();

const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const promClient = require('prom-client');

const config = require('./config'); // Assumes a /config/index.js file
const logger = require('./services/logger'); // Assumes a /services/logger.js file

class NexusCommandCenter {
  constructor() {
    this.app = express();
    this.initializeMetrics();
    this.initializeSecurity();
    this.initializeDocs();
    this.establishRouteMatrix();
    this.initializeErrorHandling();
    this.initializeServer();
  }

  initializeMetrics() {
    promClient.collectDefaultMetrics();
    logger.info('Prometheus default metrics collection enabled.');
  }

  initializeSecurity() {
    this.app.use(helmet());
    this.app.use(cors({ origin: config.corsOrigin }));
    const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
    this.app.use('/api/', limiter);
    this.app.use(express.json());
  }

  initializeDocs() {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'NEXUS Security Grid API',
          version: '2.1.2',
          description: 'API for managing the NEXUS advanced surveillance system.',
        },
        servers: [{ url: `https://localhost:${config.port}` }],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
        security: [{ bearerAuth: [] }],
      },
      apis: ['./nexus_server.js'],
    };
    const specs = swaggerJsdoc(swaggerOptions);
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  }

  establishRouteMatrix() {
    /**
     * @openapi
     * /health:
     * get:
     * summary: System Health Check
     * description: Verifies that the server and its dependencies are operational.
     * responses:
     * '200':
     * description: System is operational.
     * '503':
     * description: System is degraded.
     */
    this.app.get('/health', async (req, res) => {
      // In a real application, this would check DB, Redis, etc.
      res.status(200).json({ status: 'operational' });
    });

    /**
     * @openapi
     * /metrics:
     * get:
     * summary: Prometheus Metrics
     * description: Exposes application metrics for Prometheus scraping.
     * responses:
     * '200':
     * description: Prometheus-formatted metrics.
     */
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', promClient.register.contentType);
      res.end(await promClient.register.metrics());
    });
  }
  
  initializeErrorHandling() {
    this.app.use((req, res, next) => {
      res.status(404).json({ error: 'Not Found: The requested endpoint does not exist.' });
    });
    
    this.app.use((err, req, res, next) => {
      logger.error(err.message, { stack: err.stack, path: req.path });
      res.status(500).json({ error: 'Internal Server Error' });
    });
  }

  initializeServer() {
    try {
      const tlsOptions = { 
        key: fs.readFileSync(config.ssl.key), 
        cert: fs.readFileSync(config.ssl.cert) 
      };
      const server = https.createServer(tlsOptions, this.app);
      server.listen(config.port, () => {
        logger.info(`🚀 NEXUS Command Center operational on secure port ${config.port}`);
      });
    } catch (error) {
      logger.error('Server initialization failed. Verify SSL certificate paths and permissions.', { error: error.message });
      process.exit(1);
    }
  }
}

new NexusCommandCenter();