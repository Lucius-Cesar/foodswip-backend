require("dotenv").config();
require("./models/connection");
const { postOrderLimiter } = require("./middlewares/rateLimit");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const https = require("https");
const helmet = require("helmet");
const passport = require("passport");
require("./passport");

const errorHandler = require("./middlewares/errorHandler");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const restaurantsRouter = require("./routes/restaurants");
const ordersRouter = require("./routes/orders");
const { prototype } = require("module");

const app = express();
app.set("trust proxy", "loopback");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  cors({
    origin: "http://localhost:3001",
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
app.use("/orders", ordersRouter);

//error handler
app.use(errorHandler);
/*https.createServer(
    key:'',
    cert:''
).listen(PORT, () => {
    console.log(`Listening on port ${prototype}`)
}) */

module.exports = app;
