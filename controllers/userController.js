const jwt = require("jsonwebtoken")
const RefreshToken = require("../models/refreshToken")
const catchAsyncErrors = require("../utils/catchAsyncErrors")
const AppError = require("../utils/AppError")
const User = require("../models/user")
const passport = require("passport")
exports.generateAccessToken = function (userInfo) {
  return jwt.sign(userInfo, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRATION,
  })
}

exports.login = catchAsyncErrors(async (req, res, next) => {
  passport.authenticate("login", async (err, user, info) => {
    try {
      if (err || !user) {
        throw new AppError(
          "Invalid username or password",
          401,
          "ErrorInvalidCredentials"
        )
      }
      req.login(user, { session: false }, async (error) => {
        if (error)
          throw new AppError(
            "Invalid username or password",
            401,
            "ErrorInvalidCredentials"
          )

        const userInfo = {
          username: user.mail,
          restaurantUniqueValue: user.restaurantUniqueValue,
        }

        const accessToken = exports.generateAccessToken(userInfo)
        const refreshToken = jwt.sign(
          userInfo,
          process.env.JWT_REFRESH_SECRET,
          {
            expiresIn: parseInt(process.env.JWT_REFRESH_EXPIRATION),
          }
        )

        RefreshToken.create({
          token: refreshToken,
        })
        res.cookie("token", refreshToken, {
          httpOnly: true,
          sameSite: true,
          secure: true,
        })
        return res.json({
          token: accessToken,
          user: {
            username: user.mail,
            restaurantUniqueValue: user.restaurantUniqueValue,
          },
        })
      })
    } catch (error) {
      next(error)
    }
  })(req, res, next)
})

exports.logOut = async (req, res) => {
  const refreshToken = req.cookies.token
  await RefreshToken.deleteOne({ token: refreshToken })
  res.clearCookie("token")
  res.json({ succes: true })
}

exports.refreshToken = catchAsyncErrors(async (req, res) => {
  const refreshToken = req.cookies.token
  if (!refreshToken) {
    throw new AppError("No token found", 401, "ErrorUnauthorized")
  } else {
    const tokenFound = await RefreshToken.findOne({ token: refreshToken })

    if (tokenFound) {
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, user) => {
        if (err)
          throw new AppError("Unauthorized token", 403, "ErrorUnauthorized")
        const accessToken = exports.generateAccessToken({
          username: user.username,
          restaurantUniqueValue: user.restaurantUniqueValue,
        })
        res.json({
          token: accessToken,
          user: {
            username: user.username,
            restaurantUniqueValue: user.restaurantUniqueValue,
          },
        })
      })
    } else {
      throw new AppError("No corresponding Token Found", 404, "ErrorNotFound")
    }
  }
})

exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body
  const user = await User.findOne({ mail: req.user.username })
  if (!user) {
    throw new AppError("User Not Found", 404, "ErrorUserNotFound")
  }
  const validate = await user.isValidPassword(currentPassword)
  if (!validate) {
    throw new AppError("Incorrect Password", 401, "ErrorInvalidCredentials")
  } else {
    user.password = newPassword
    await user.save()
    res.json({
      success: true,
    })
  }
})
