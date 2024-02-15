require("dotenv").config();
require("./models/connection");
const { postOrderLimiter } = require("./middlewares/rateLimit");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var restaurantsRouter = require("./routes/restaurants");
var ordersRouter = require("./routes/orders");

var app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());

// limiters, should be ordered before the routes
app.use("/orders/addOrder", postOrderLimiter);

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/restaurants", restaurantsRouter);
app.use("/orders", ordersRouter);

module.exports = app;
