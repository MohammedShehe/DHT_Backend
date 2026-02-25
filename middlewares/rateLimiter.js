const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

/**
 * Global API limiter - 300 requests per 15 minutes
 */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    message: "Too many requests. Please try again later."
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator // ✅ safe for IPv6
});

/**
 * Strict limiter for logging endpoints - 30 requests per minute
 */
const logLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: {
    message: "Too many log attempts. Please slow down."
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Authentication limiter - 10 attempts per 15 minutes
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: "Too many login attempts. Try again in 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Goal creation limiter - 20 goals per hour
 */
const goalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    message: "Too many goal creation attempts. Please slow down."
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  globalLimiter,
  logLimiter,
  authLimiter,
  goalLimiter
};