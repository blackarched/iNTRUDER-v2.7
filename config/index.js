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

  // Redis Connection Details
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },
};

// Validate that critical secrets are provided in the environment
const requiredEnvVars = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'REDIS_HOST',
  'REDIS_PORT',
  'FRONTEND_ORIGIN',
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`FATAL ERROR: Environment variable ${varName} is not defined.`);
  }
});

module.exports = config;