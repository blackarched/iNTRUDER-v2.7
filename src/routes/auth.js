const express = require('express');
const { login, register, getProfile } = require('../controllers/authController');
const { validate } = require('../middleware/validatorMiddleware');
const { authSchema } = require('../validators/authValidator');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 * post:
 * summary: Register a new user
 * tags: [Auth]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * username:
 * type: string
 * email:
 * type: string
 * password:
 * type: string
 * responses:
 * '201':
 * description: User registered successfully
 */
router.post('/register', validate(authSchema.register), register);

/**
 * @openapi
 * /api/auth/login:
 * post:
 * summary: Log in a user
 * tags: [Auth]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * email:
 * type: string
 * password:
 * type: string
 * responses:
 * '200':
 * description: Login successful, returns JWT token
 */
router.post('/login', validate(authSchema.login), login);

/**
 * @openapi
 * /api/auth/profile:
 * get:
 * summary: Get current user's profile
 * tags: [Auth]
 * security:
 * - bearerAuth: []
 * responses:
 * '200':
 * description: User profile data
 */
router.get('/profile', authMiddleware, getProfile);

module.exports = router;