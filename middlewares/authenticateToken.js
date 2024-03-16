const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.sendStatus(401); // Unauthorized
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.sendStatus(401); // Unauthorized
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, user) => {
    if (err) {
      console.error("JWT verification error:", err);
      return res.status(403).json({ error: "Invalid token" }); // Forbidden
    }
    req.user = user;
    next(); // Passer au middleware suivant
  });
}

module.exports = authenticateToken;
