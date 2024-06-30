const jwt = require("jsonwebtoken");

function authenticateSocketToken(socket, next) {

  const header = socket.handshake.headers["authorization"];

  if (!header) {
    return next(new Error("no token"));
  }

  if (!header.startsWith("bearer ")) {
    return next(new Error("invalid token"));
  }

  const token = header.substring(7);

  if (!token) {
    const err = new Error("Authentication error");
    err.data = { type: "authentication_error", message: "No token provided" };
    return next(err);
  }

  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("invalid token"));
    }
    socket.request.user = decoded; // Attach the decoded token to the socket object
    next();
  });
}

module.exports = authenticateSocketToken;