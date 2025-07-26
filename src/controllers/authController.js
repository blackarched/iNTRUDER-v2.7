const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const config = require('../../config');
const db = require('../services/db');

/**
 * @description Register a new user.
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 12); // Enforce salt rounds
    const result = await db.query(
      'INSERT INTO system_users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING user_id, username, email',
      [username, email, passwordHash]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};

/**
 * @description Set up MFA for the current user.
 * @route POST /api/auth/mfa/setup
 * @access Private
 */
exports.setupMfa = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const secret = speakeasy.generateSecret({ name: `NEXUS Grid (${req.body.email})` });

    await db.query(
      'INSERT INTO user_mfa_secrets (user_id, secret) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET secret = $2, is_verified = false',
      [userId, secret.base32]
    );

    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) {
        return next(new Error('Failed to generate QR code.'));
      }
      res.json({
        secret: secret.base32,
        qrCodeUrl: data_url,
        message: 'Scan this QR code with your authenticator app and verify to enable MFA.',
      });
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @description Verify MFA for the current user.
 * @route POST /api/auth/mfa/verify
 * @access Private
 */
exports.verifyMfa = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { token } = req.body;

    const { rows } = await db.query('SELECT secret FROM user_mfa_secrets WHERE user_id = $1', [userId]);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'MFA not set up for this user.' });
    }
    const { secret } = rows[0];

    const isVerified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
    });

    if (isVerified) {
      await db.query('UPDATE user_mfa_secrets SET is_verified = true WHERE user_id = $1', [userId]);
      res.json({ message: 'MFA enabled successfully.' });
    } else {
      res.status(400).json({ message: 'Invalid token, verification failed.' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @description Log in a user.
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password, mfaToken } = req.body;
    const { rows } = await db.query('SELECT * FROM system_users WHERE email = $1', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }
    const user = rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const mfaResult = await db.query('SELECT * FROM user_mfa_secrets WHERE user_id = $1 AND is_verified = true', [user.user_id]);
    if (mfaResult.rows.length > 0) {
      if (!mfaToken) {
        return res.status(401).json({ mfaRequired: true, message: 'MFA token is required.' });
      }
      const { secret } = mfaResult.rows[0];
      const isTokenValid = speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: mfaToken,
        window: 1,
      });

      if (!isTokenValid) {
        return res.status(401).json({ message: 'Invalid MFA token.' });
      }
    }

    const token = jwt.sign({ userId: user.user_id, role: user.role }, config.jwtSecret, { expiresIn: '1h' });
    res.json({ token, user: { id: user.user_id, username: user.username, role: user.role } });
  } catch (error) {
    next(error);
  }
};