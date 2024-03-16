var express = require("express");
var router = express.Router();
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const AppError = require("../AppError");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "Express" });
});

router.post(
  "/test",
  catchAsyncErrors(async (req, res, next) => {
    if (!req.body.id)
      throw new AppError("notFoundError", 404, "Id is required!");
  })
);
module.exports = router;
