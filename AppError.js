class AppError extends Error {
  constructor(message, statusCode, name) {
    super(message);
    this.message = message || "Something went wrong";
    this.status = statusCode || 500;
    this.name = name || "Error";
  }
}

module.exports = AppError;
