const passport = require("passport")
const LocalStrategy = require("passport-local").Strategy
const User = require("./models/user")

passport.use(
  "signup",
  new LocalStrategy(
    {
      usernameField: "mail",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, mail, password, done) => {
      try {
        const user = await User.create({
          mail,
          password,
          slug: req.body.slug,
        })
        return done(null, user)
      } catch (error) {
        return done(error)
      }
    }
  )
)

passport.use(
  "login",
  new LocalStrategy(
    {
      usernameField: "mail",
      passwordField: "password",
    },
    async (mail, password, done) => {
      try {
        const user = await User.findOne({
          mail: { $regex: new RegExp(mail, "i") },
        })
        if (!user) {
          return done(null, false, { message: "User not found" })
        }

        const validate = await user.isValidPassword(password)
        if (!validate) {
          return done(null, false, { message: "Wrong Password" })
        }

        return done(null, user, { message: "Logged in Successfully" })
      } catch (error) {
        return done(error)
      }
    }
  )
)
