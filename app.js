if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
require("./models/connection");
const { postOrderLimiter } = require("./middlewares/rateLimit");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const passport = require("passport");
const webpush = require("web-push");

require("./passport");
const errorHandler = require("./middlewares/errorHandler");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const menusRouter = require("./routes/menus");
const restaurantsRouter = require("./routes/restaurants");
const ordersRouter = require("./routes/orders");
const stripeRouter = require("./routes/stripe");
const subscriptionsRouter = require("./routes/subscriptions");
const app = express();
app.set("trust proxy", "loopback");

// To add large paylod for example route addRestaurant uncomment it and disabled the catchAsyncError function englobling the route
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use(logger("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

//app.use(cors());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(passport.initialize());
app.use(cookieParser());

app.use(helmet());
// limiters, should be ordered before the routes
app.use("/orders/addOrder", postOrderLimiter);
app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/restaurants", restaurantsRouter);
app.use("/menus", menusRouter);
app.use("/orders", ordersRouter);
app.use("/stripe", stripeRouter);
app.use("/subscriptions", subscriptionsRouter);

//push notification setup
//for web push notifications
webpush.setVapidDetails(
  `mailto:${process.env.CONTACT_MAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

//jobs
require("./jobs/cleanupSubscriptions");
//error handler
app.use(errorHandler);

module.exports = app;
