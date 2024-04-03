const rateLimit = require("express-rate-limit");

const postOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1, // Un appel toutes les 15 minutes
  skipFailedRequests: true, // Do not count failed requests (status >= 400)
});

module.exports = { postOrderLimiter };
