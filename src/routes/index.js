const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const authRouter = require('./auth');
const nodesRouter = require('./nodes');

const router = express.Router();
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'NEXUS API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};
const specs = swaggerJsdoc(swaggerOptions);

router.use('/docs', swaggerUi.serve, swaggerUi.setup(specs));
router.get('/health', (req, res) => res.status(200).json({ status: 'API Operational' }));
router.use('/auth', authRouter);
router.use('/nodes', nodesRouter);

module.exports = router;