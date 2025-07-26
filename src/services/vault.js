const vault = require('node-vault');
const config = require('../../config');
const logger = require('./logger');

const vaultOptions = {
  apiVersion: 'v1',
  endpoint: config.vault.endpoint,
  token: config.vault.token,
};

const vaultClient = vault(vaultOptions);

async function getSecret(secretPath) {
  try {
    const { data } = await vaultClient.read(secretPath);
    return data.data;
  } catch (error) {
    logger.error(`Failed to retrieve secret from Vault: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getSecret,
};
