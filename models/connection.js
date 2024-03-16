const mongoose = require("mongoose");
const crypto = require("crypto");

const connectionString = process.env.CONNECTION_STRING;
mongoose
  .connect(connectionString, { connectTimeoutMs: 2000 })
  .then(() => console.log("Database connected"))
  .catch((error) => console.error(error));
