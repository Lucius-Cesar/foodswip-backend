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

const { multiplyMoney } = require("../utils/moneyCalculations");

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

    // Vérification si le restaurant existe dans la base de données
    const restaurantFound = await Restaurant.findOne({
      _id: req.body.restaurantId,
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

    // Formatage des articles pour correspondre au modèle de base de données
    const formattedArticles = req.body.articles.map((article) => {
      article.selectedOptions = article.selectedOptions.map(
        (option) => option.value
      );
      article.selectedSupplements = article.selectedSupplements.map(
        (supplement) => supplement.value
      );
      article.sum = multiplyMoney(article.quantity, article.price); // Ajout d'un champ "sum"
      return article;
    });

    // Tri des articles par index de catégorie alimentaire
    formattedArticles.sort((a, b) => a.foodCategoryIndex - b.foodCategoryIndex);

    // Création d'une nouvelle commande
    const newOrder = await Order.create({
      orderNumber: NewOrderNumber.count,
      customer: {
        mail: req.body.mail,
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        phoneNumber: req.body.phoneNumber,
        address: {
          street: req.body.street,
          streetNumber: req.body.streetNumber,
          city: req.body.city,
          postCode: req.body.postCode,
        },
        ip: req.ip,
      },
      articles: formattedArticles,
      articlesSum: req.body.articlesSum,
      totalSum: req.body.totalSum,
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

    // Envoi d'un e-mail de confirmation au client
    if (newOrder) {
      const expeditor = `"Foodswip" <noreply@foodswip-order.com>`;
      const customerMail = newOrder.customer.mail;
      const mailToTheCustomer = await transporter.sendMail({
        from: expeditor,
        to: customerMail,
        subject: `Merci pour votre commande chez ${restaurantFound.name} #${newOrder.orderNumber}`,
        html: orderCustomerMailHtml(newOrder, restaurantFound),
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
          subject: `Nouvelle commande #${newOrder.orderNumber}`,
          html: orderRestaurantMailHtml(newOrder, restaurantFound),
        });
        if (!mailToTheRestaurant) {
          throw new AppError(
            "Error sending mail to the restaurant",
            500,
            "ErrorMailRestaurant"
          );
        }
      }
    }
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
