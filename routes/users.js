const express = require("express")
const passport = require("passport")
const router = express.Router()
const userController = require("../controllers/userController")
const authenticateToken = require("../middlewares/authenticateToken")

router.post(
  "/signup",
  passport.authenticate("signup", { session: false }),
  async (req, res, next) => {
    res.json(req.user)
  }
)

router.post("/login", userController.login)

router.delete("/logOut", userController.logOut)

router.get("/refreshToken", userController.refreshToken)

router.post("/updatePassword", authenticateToken, userController.updatePassword)

module.exports = router
