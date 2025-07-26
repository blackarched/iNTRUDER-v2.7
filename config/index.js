require('dotenv').config();
const { getSecret } = require('./services/vault');

let config;

async function initializeConfig() {
  const secrets = await getSecret('secret/data/nexus');
  config = {
    // Server Configuration
    port: process.env.PORT || 8443,
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.FRONTEND_ORIGIN || `https://localhost:${process.env.PORT || 8443}`,

    // JSON Web Token Secret
    jwtSecret: secrets.JWT_SECRET,

    // Database Connection Details
    db: {
      host: secrets.DB_HOST || 'nexus-db',
      port: parseInt(secrets.DB_PORT, 10) || 5432,
      user: secrets.DB_USER,
      password: secrets.DB_PASSWORD,
      name: secrets.DB_NAME,
    },

    // Logging Level
    logLevel: process.env.LOG_LEVEL || 'info',

    // Redis Connection Details
    redis: {
      host: secrets.REDIS_HOST || 'redis',
      port: parseInt(secrets.REDIS_PORT, 10) || 6379,
    },

    // Vault Configuration
    vault: {
      endpoint: process.env.VAULT_ENDPOINT,
      token: process.env.VAULT_TOKEN,
    },
  };
}

initializeConfig();

  // Vault Configuration
  vault: {
    endpoint: process.env.VAULT_ENDPOINT,
    token: process.env.VAULT_TOKEN,
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
  'VAULT_ENDPOINT',
  'VAULT_TOKEN',
];

requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    throw new Error(`FATAL ERROR: Environment variable ${varName} is not defined.`);
  }
});

module.exports = config;