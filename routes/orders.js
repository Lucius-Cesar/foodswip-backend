var express = require("express");
var router = express.Router();
const checkBody = require("../utils/checkBody");
const Order = require("../models/order");
const Restaurant = require("../models/restaurant");
const Counter = require("../models/counter");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const AppError = require("../utils/AppError");
const {
  transporter,
  orderCustomerMailHtml,
  orderRestaurantMailHtml,
} = require("../utils/email");

const { addMoney, multiplyMoney } = require("../utils/moneyCalculations");

const nodemailer = require("nodemailer");

router.post(
  "/addOrder",
  catchAsyncErrors(async (req, res, next) => {
    // Vérification du corps de la requête
    if (
      !checkBody(req.body, [
        "mail",
        "phoneNumber",
        "street",
        "streetNumber",
        "city",
        "postCode",
        "articles",
        "note",
        "orderType",
        "paymentMethod",
        "estimatedArrivalDate",
        "restaurantUniqueValue",
      ])
    ) {
      throw new AppError("Body is incorrect", 400, "BadRequestError");
    }

    // Vérification si le restaurant existe dans la base de données
    const restaurantFound = await Restaurant.findOne({
      uniqueValue: req.body.restaurantUniqueValue,
    });
    if (!restaurantFound) {
      throw new AppError("Restaurant not found", 404, "NotFoundError");
    }

    // Date actuelle
    const currentDate = new Date();

    // Récupération et incrémentation du numéro de commande
    const NewOrderNumber = await Counter.findOneAndUpdate(
      { _id: "orderNumber" },
      { $inc: { count: 1 } }
    );

    const newOrder = new Order({
      orderNumber: NewOrderNumber.count,
      articles: req.body.articles,
      customer: {
        mail: req.body.mail,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        phoneNumber: req.body.phoneNumber,
        ip: req.ip,
        address: {
          street: req.body.street,
          streetNumber: req.body.streetNumber,
          city: req.body.city,
          postCode: req.body.postCode,
        },
      },
      creationDate: currentDate,
      lastUpdate: currentDate,
      note: req.body.note,
      orderType: req.body.orderType,
      paymentMethod: req.body.paymentMethod,
      estimatedArrivalDate: req.body.estimatedArrivalDate,
      status: "completed",
      statusHistory: [{ status: "completed", date: currentDate }],
      restaurant: restaurantFound._id,
      restaurantUniqueValue: restaurantFound.uniqueValue,
    });

    //populate before the creation of newOrder ! usefull tips
    const populatedNewOrder = await Order.populate(newOrder, {
      path: "articles",
      populate: [{ path: "food" }, { path: "options" }],
    });
    populatedNewOrder.articles.forEach((article, i) => {
      // Vérification de l'association des articles avec le restaurant
      if (
        article.food.restaurantUniqueValue !== req.body.restaurantUniqueValue
      ) {
        throw new AppError(
          "Food payload is not associated with the concerned restaurant",
          403,
          "ErrorForbidden"
        );
      }
      article.options.forEach((option, j) => {
        if (option.restaurantUniqueValue !== req.body.restaurantUniqueValue) {
          throw new AppError(
            "Option payload is not associated with the concerned restaurant",
            403,
            "ErrorForbidden"
          );
        }
      });

      const optionsPrice = article.options.reduce(
        (accumulator, option) => addMoney(accumulator, option.price),
        0
      );
      // Calcul du prix de l'article
      populatedNewOrder.articles[i].price = addMoney(
        article.food.price,
        optionsPrice
      );
      // Calcul de la somme de l'article
      populatedNewOrder.articles[i].sum = multiplyMoney(
        article.price,
        article.quantity
      );
    });

    // Tri des articles par index de catégorie alimentaire
    populatedNewOrder.articles.sort(
      (a, b) => a.food.categoryNumber - b.food.categoryNumber
    );

    // Calcul de la somme des articles
    populatedNewOrder.articlesSum = populatedNewOrder.articles.reduce(
      (accumulator, article) => addMoney(accumulator, article.sum),
      0
    );

    // Calcul du total de la commande en fonction du type de commande
    populatedNewOrder.totalSum =
      populatedNewOrder.orderType === 0
        ? addMoney(
            populatedNewOrder.articlesSum,
            restaurantFound.publicSettings.deliveryFees
          )
        : populatedNewOrder.orderType === 1
        ? populatedNewOrder.articlesSum
        : null; // Vous devez définir ce que vous souhaitez faire si orderType n'est ni 0 ni 1

    // Enregistrement de la commande

    //Envoi d'un e-mail de confirmation au client
    const populatedNewOrderCopy = populatedNewOrder;
    populatedNewOrder.save();

    if (populatedNewOrder) {
      const expeditor = `"Foodswip" <noreply@foodswip-order.com>`;
      const customerMail = populatedNewOrderCopy.customer.mail;
      const mailToTheCustomer = await transporter.sendMail({
        from: expeditor,
        to: customerMail,
        subject: `Merci pour votre commande chez ${restaurantFound.name} #${populatedNewOrderCopy.orderNumber}`,
        html: orderCustomerMailHtml(populatedNewOrderCopy, restaurantFound),
      });

      if (!mailToTheCustomer) {
        throw new AppError(
          "Error sending mail to the customer",
          500,
          "ErrorMailCustomer"
        );
      }

      // Envoi d'un e-mail de confirmation au restaurant
      if (restaurantFound.privateSettings.orderMailReception.enabled) {
        const restaurantMail =
          restaurantFound.privateSettings.orderMailReception.mail;
        const mailToTheRestaurant = await transporter.sendMail({
          from: expeditor,
          to: restaurantMail,
          subject: `Nouvelle commande #${populatedNewOrderCopy.orderNumber}`,
          html: orderRestaurantMailHtml(populatedNewOrderCopy, restaurantFound),
        });
        if (!mailToTheRestaurant) {
          throw new AppError(
            "Error sending mail to the restaurant",
            500,
            "ErrorMailRestaurant"
          );
        }
      }
      res.json(populatedNewOrder);
    }
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
