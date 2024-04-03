function catchAsyncErrors(middleware) {
  return async function (req, res, next) {
    try {
      await middleware(req, res, next);
    } catch (err) {
      console.log(err);
      return next(err);
    }
  };
}

module.exports = catchAsyncErrors;
