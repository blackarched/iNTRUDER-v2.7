const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const promClient = require('prom-client');
const config = require('../config');
const { logger } = require('./services/logger');
const apiRouter = require('./routes');
const errorMiddleware = require('./middleware/errorMiddleware');
const sanitizeMiddleware = require('./middleware/sanitizationMiddleware');
const requestIdMiddleware = require('./middleware/requestIdMiddleware');

const app = express();

app.use(requestIdMiddleware);
app.use(sanitizeMiddleware);

// Security Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://fonts.googleapis.com"],
            styleSrc: ["'self'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'", `wss://${config.corsOrigin}`],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      action: 'deny',
    },
  })
);
app.use(cors({ origin: config.corsOrigin }));
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api/', globalLimiter);
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
