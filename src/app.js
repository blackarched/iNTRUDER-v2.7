const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const promClient = require('prom-client');
const config = require('../config');
const { logger } = require('./services/logger');
const apiRouter = require('./routes');
const errorMiddleware = require('./middleware/errorMiddleware');
const sanitizeMiddleware = require('./middleware/sanitizationMiddleware');
const requestIdMiddleware = require('./middleware/requestIdMiddleware');
const csrfMiddleware = require('./middleware/csrfMiddleware');
const securityMiddleware = require('./middleware/securityMiddleware');

const app = express();

app.use(requestIdMiddleware);
app.use(sanitizeMiddleware);
app.use(csrfMiddleware);
app.use(securityMiddleware);

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use(express.json({ limit: '10kb' }));

// API Docs
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NEXUS Security Grid API',
      version: '2.5.0',
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
  apis: ['./src/routes/*.js'],
};
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Metrics Endpoint
promClient.collectDefaultMetrics();

const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000],
});

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestDurationMicroseconds
      .labels(req.method, req.route ? req.route.path : req.path, res.statusCode)
      .observe(Date.now() - res.locals.startTime);
  });
  res.locals.startTime = Date.now();
  next();
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// API Routes
app.use('/api', apiRouter);

// Error Handling
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found: The requested endpoint does not exist.' });
});
app.use(errorMiddleware);

module.exports = app;
