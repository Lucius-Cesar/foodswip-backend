var express = require("express");
var router = express.Router();
const checkBody = require("../utils/checkBody");
const Order = require("../models/order");
const Restaurant = require("../models/restaurant");
const Counter = require("../models/counter");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const AppError = require("../AppError");

router.post(
  "/addOrder",
  catchAsyncErrors(async (req, res, next) => {
    //This route have a limiter of 1 request every 15 minutes by ip, see {postOrderLimiter} from @/middlewares/rateLimit imported in the app.js
    if (
      !checkBody(req.body, [
        "mail",
        "phoneNumber",
        "adress",
        "city",
        "postCode",
        "articles",
        "articlesSum",
        "totalSum",
        "note",
        "orderType",
        "paymentMethod",
        "estimatedArrivalDate",
        "restaurantId",
      ])
    ) {
      throw new AppError("Body is incorrect", 400, "BadRequestError");
    }

    //check if restaurant is in the database
    const restaurantFound = await Restaurant.findOne({
      _id: req.body.restaurantId,
    });
    if (!restaurantFound) {
      throw new AppError("Restaurant not found", 404, "NotFoundError");
    }

    const currentDate = new Date();
    const NewOrderNumber = await Counter.findOneAndUpdate(
      { _id: "orderNumber" },
      { $inc: { count: 1 } }
    );

    //sort by foodCategory Index for the ticket
    sortedArticles = req.body.articles.sort(
      (a, b) => a.foodCategoryIndex - b.foodCategoryIndex
    );
    const newOrder = await Order.create({
      orderNumber: NewOrderNumber.count,
      customer: {
        mail: req.body.mail,
        phoneNumber: req.body.phoneNumber,
        adress: req.body.adress,
        city: req.body.city,
        postCode: req.body.postCode,
        ip: req.ip,
      },
      articles: sortedArticles,
      articlesSum: req.body.articlesSum,
      totalSum: req.body.totalSum,
      creationDate: currentDate,
      lastUpdate: currentDate,
      note: req.body.note,
      orderType: req.body.orderType,
      paymentMethod: req.body.paymentMethod,
      estimatedArrivalDate: req.body.estimatedArrivalDate,
      status: "completed",
      statusHistory: [{ status: "completed", date: currentDate }], // Change this in the next versions with "pending"
      restaurantId: restaurantFound._id,
    });
    return res.json(newOrder);
  })
);

router.get(
  "/:orderNumber",
  catchAsyncErrors(async function (req, res, next) {
    const orderFound = await Order.findOne({
      orderNumber: req.params.orderNumber,
    });
    if (orderFound) {
      const allowedIPs = [orderFound.customer.ip];
      const clientIP = req.ip;
      if (!allowedIPs.includes(clientIP)) {
        throw new AppError(
          "This IP address is not allowed for this order",
          403,
          "FordbiddenError"
        );
      } else {
        res.json(orderFound);
      }
    } else {
      throw new AppError("Order Not Found", 404, "NotFoundError");
    }
  })
);

module.exports = router;
