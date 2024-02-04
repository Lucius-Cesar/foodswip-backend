var express = require("express");
var router = express.Router();
const checkBody = require("../utils/checkBody");
const Order = require("../models/order");
const Restaurant = require("../models/restaurant");
const Counter = require("../models/counter");

router.post("/addOrder", async function (req, res, next) {
  try {
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
      return res.status(400).send({ error: "Bad Request: Body is incorrect" });
    }

    //check if restaurant is in the database
    const restaurantFound = await Restaurant.findOne({
      _id: req.body.restaurantId,
    });
    if (!restaurantFound) {
      return res.status(404).send({ error: "Restaurant not found" });
    }

    const currentDate = new Date();
    const NewOrderNumber = await Counter.findOneAndUpdate(
      { _id: "orderNumber" },
      { $inc: { count: 1 } }
    );

    //sort by foodCategory Index for the ticket
    sortedArticles = req.body.articles.sort(
      (a, b) => a.categoryIndex < b.categoryIndex
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
      articles: req.body.articles,
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
    return res.status(201).send(newOrder);
  } catch (err) {
    console.error(err);
    next(err);
  }
});

router.get("/:orderNumber", async function (req, res, next) {
  try {
    const orderFound = await Order.findOne({
      orderNumber: req.params.orderNumber,
    });
    if (orderFound) {
      const allowedIPs = [orderFound.customer.ip];
      const clientIP = req.ip;
      if (!allowedIPs.includes(clientIP)) {
        return res.status(403).send({
          error: "Forbidden: This IP address is not allowed for this order",
        });
      } else {
        res.status(201).send(orderFound);
      }
    } else {
      return res.status(404).send({ error: "Order Not Found" });
    }
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
