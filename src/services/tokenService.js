const jwt = require('jsonwebtoken');
const { getEnv } = require('../config/env');

function signAccessToken(payload) {
  // Read secret and expiry from environment config.
  const env = getEnv();

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}

function verifyAccessToken(token) {
  // Throws if token is invalid or expired.
  const env = getEnv();
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  signAccessToken,
  verifyAccessToken
};
