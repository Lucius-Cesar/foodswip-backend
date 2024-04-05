const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();
const RefreshToken = require("../models/refreshToken");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const AppError = require("../utils/AppError");
const User = require("../models/user");
const authenticateToken = require("../middlewares/authenticateToken");

function generateAccessToken(userInfo) {
  return jwt.sign(userInfo, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRATION,
  });
}

router.post(
  "/signup",
  passport.authenticate("signup", { session: false }),
  async (req, res, next) => {
    res.json(req.user);
  }
);

router.post(
  "/login",
  catchAsyncErrors(async (req, res, next) => {
    passport.authenticate("login", async (err, user, info) => {
      try {
        if (err || !user) {
          throw new AppError(
            "Invalid username or password",
            401,
            "ErrorInvalidCredentials"
          );
        }
        req.login(user, { session: false }, async (error) => {
          if (error)
            throw new AppError(
              "Invalid username or password",
              401,
              "ErrorInvalidCredentials"
            );

          const userInfo = {
            username: user.mail,
            restaurantUniqueValue: user.restaurantUniqueValue,
          };

          const accessToken = generateAccessToken(userInfo);
          //refreshToken has no expiration, but will be deleted if logout
          const refreshToken = jwt.sign(
            userInfo,
            process.env.JWT_REFRESH_SECRET,
            {
              expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRATION),
            }
          );

          RefreshToken.create({
            token: refreshToken,
          });
          //send refreshToken inside cookie
          res.cookie("token", refreshToken, {
            httpOnly: true,
            sameSite: true,
            secure: true,
          });
          // send accessToken in res.json
          return res.json({
            token: accessToken,
            user: {
              username: user.mail,
              restaurantUniqueValue: user.restaurantUniqueValue,
            },
          });
        });
      } catch (error) {
        next(error); // Passer l'erreur au middleware d'erreur
      }
    })(req, res, next); // Appeler le middleware d'authentification avec req, res, et next
  })
);

router.delete("/logOut", async (req, res) => {
  const refreshToken = req.cookies.token;
  await RefreshToken.deleteOne({ token: refreshToken });
  res.clearCookie("token");
  res.json({ succes: true });
});

router.get(
  "/refreshToken",
  catchAsyncErrors(async (req, res) => {
    const refreshToken = req.cookies.token;
    if (!refreshToken) {
      throw new AppError("No token found", 401, "ErrorUnauthorized");
    } else {
      const tokenFound = await RefreshToken.findOne({ token: refreshToken });

      if (tokenFound) {
        jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET,
          (err, user) => {
            if (err)
              throw new AppError(
                "Unauthorized token",
                403,
                "ErrorUnauthorized"
              );
            const accessToken = generateAccessToken({
              username: user.username,
              restaurantUniqueValue: user.restaurantUniqueValue,
            });
            res.json({
              token: accessToken,
              user: {
                username: user.username,
                restaurantUniqueValue: user.restaurantUniqueValue,
              },
            });
          }
        );
      } else {
        throw new AppError(
          "No corresponding Token Found",
          404,
          "ErrorNotFound"
        );
      }
    }
  })
);

router.post(
  "/updatePassword",
  authenticateToken,
  catchAsyncErrors(async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findOne({ mail: req.user.username });
    if (!user) {
      throw new AppError("User Not Found", 404, "ErrorUserNotFound");
    }
    const validate = await user.isValidPassword(currentPassword);
    if (!validate) {
      throw new AppError("Incorrect Password", 401, "ErrorInvalidCredentials");
    } else {
      user.password = newPassword;
      await user.save();
      res.json({
        success: true,
      });
    }
  })
);

module.exports = router;
