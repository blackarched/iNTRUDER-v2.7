const express = require('express');
const rateLimit = require('express-rate-limit');
const bruteforce = require('../middleware/bruteForceMiddleware');
const {
  login,
  register,
  getProfile,
  setupMfa,
  verifyMfa,
} = require('../controllers/authController');
const { validate } = require('../middleware/validatorMiddleware');
const { authSchema } = require('../validators/authValidator');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
});

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
router.post('/login', bruteforce.prevent, loginLimiter, validate(authSchema.login), login);

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

router.post('/mfa/setup', authMiddleware, setupMfa);
router.post('/mfa/verify', authMiddleware, verifyMfa);

module.exports = router;