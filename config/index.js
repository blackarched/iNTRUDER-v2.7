require('dotenv').config();

const config = {
  // Server Configuration
  port: process.env.PORT || 8443,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.FRONTEND_ORIGIN || `https://localhost:${process.env.PORT || 8443}`,

  // JSON Web Token Secret
  jwtSecret: process.env.JWT_SECRET,

  // Database Connection Details
  db: {
    host: process.env.DB_HOST || 'nexus-db',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },

  // Logging Level
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate that critical secrets are provided in the environment
if (!config.jwtSecret) {
  throw new Error('FATAL ERROR: JWT_SECRET is not defined in the environment.');
}

module.exports = config;