const mongoose = require("mongoose");

const RefreshTokenSchema = new mongoose.Schema({
  token: String,
  createdAt: { type: Date, default: Date.now },
});

//Automatically delete the document after refreshToken expiration
RefreshTokenSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: parseInt(process.env.JWT_REFRESH_EXPIRATION) }
);

const RefreshToken = mongoose.model("RefreshToken", RefreshTokenSchema);

module.exports = RefreshToken;
