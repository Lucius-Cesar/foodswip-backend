const checkBody = require("../utils/checkBody");
const Restaurant = require("../models/restaurant");
const Subscription = require("../models/subscription");
const Order = require("../models/order");
const PrePopulatedOrder = require("../models/prePopulatedOrder");
const TmpOrder = require("../models/tmpOrder");
const Counter = require("../models/counter");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const AppError = require("../utils/AppError");
const { sendNewOrderToRestaurantSocket } = require("../websocket.js");
const webpush = require("web-push");

//helpers
const {
  transporter,
  orderCustomerMailHtml,
  orderRestaurantMailHtml,
} = require("../utils/email");

const { addMoney, multiplyMoney } = require("../utils/moneyCalculations");
const stripeController = require("./stripeController");

//this function format order.articles to allow easily display foodCategories in the order ticket
const buildFormattedArticleList = (articles) => {
  const groupedArticles = articles.reduce((acc, article) => {
    const categoryTitle = article.food.categoryTitle;
    if (!acc[categoryTitle]) {
      acc[categoryTitle] = {
        categoryTitle: categoryTitle,
        categoryNumber: article.food.categoryNumber,
        articles: [],
      };
    }
    acc[categoryTitle].articles.push(article);
    return acc;
  }, {});

  // Convertir les groupes en une liste et trier par categoryNumber
  const sortedGroupedArticles = Object.values(groupedArticles).sort(
    (a, b) => a.categoryNumber - b.categoryNumber
  );

  return sortedGroupedArticles;
};

//controller

exports.sendOrderMail = async (order, restaurant) => {
  console.log(restaurant);
  const expeditor = `${restaurant.name} <${process.env.MAIL_NOREPLY}>`;
  const customerMail = order.customer.mail;
  const mailToTheCustomer = await transporter.sendMail({
    from: expeditor,
    to: customerMail,
    subject: `Merci pour votre commande chez ${restaurant.name} #${order.orderNumber}`,
    html: orderCustomerMailHtml(order, restaurant),
  });

  if (!mailToTheCustomer) {
    throw new AppError(
      "Error sending mail to the customer",
      500,
      "ErrorMailCustomer"
    );
  }

  // Envoi d'un e-mail de confirmation au restaurant
  if (restaurant?.privateSettings?.orderMailReception?.enabled) {
    const restaurantMail = restaurant.privateSettings.orderMailReception.mail;
    const mailToTheRestaurant = await transporter.sendMail({
      from: `Foodswip <${process.env.MAIL_NOREPLY}>`,
      to: restaurantMail,
      subject: `Nouvelle commande #${order.orderNumber}`,
      html: orderRestaurantMailHtml(order, restaurant),
    });
    if (!mailToTheRestaurant) {
      throw new AppError(
        "Error sending mail to the restaurant",
        500,
        "ErrorMailRestaurant"
      );
    }
  }
  return { success: true };
};

exports.sendNewOrderToRestaurant = async (order, restaurant) => {
  try {
    // First send to the restaurant websocket
    sendNewOrderToRestaurantSocket(order, restaurant._id);
  } catch (error) {
    console.error(
      "Erreur lors de l'envoi à la websocket du restaurant:",
      error
    );
  }

  try {
    // Send the mail to customer and/or restaurant
    await exports.sendOrderMail(order, restaurant);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email:", error);
  }

  try {
    // Send the push notification to the restaurant
    const restaurantSubscriptions = await Subscription.find({
      restaurant: restaurant._id,
    });
    if (restaurantSubscriptions) {
      for (let subscription of restaurantSubscriptions) {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: `Nouvelle commande #${order.orderNumber}`,
              message: `${
                order.orderType === 0 ? "Livraison" : "À emporter"
              } - ${order.totalSum} €`,
            })
          );
        } catch (error) {
          console.error(
            "Erreur lors de l'envoi de la notification push:",
            error
          );
          continue;
        }
      }
    }
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des abonnements du restaurant:",
      error
    );
  }
};

exports.updateOrderStatus = async (order, newStatus, save = true) => {
  const currentDate = new Date();
  order.status = newStatus;
  order.statusHistory.push({ status: newStatus, date: currentDate });
  if (save) {
    const orderSaved = await order.save();
    if (!orderSaved) {
      throw new AppError(
        "Error updating order status",
        500,
        "ErrorUpdateOrderStatus"
      );
    }
  }
  return order;
};

exports.createOrder = catchAsyncErrors(async (req, res, next) => {
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
      "slug",
    ])
  ) {
    throw new AppError("Body is incorrect", 400, "BadRequestError");
  }

  // Date actuelle
  const currentDate = new Date();

  // Récupération et incrémentation du numéro de commande
  const NewOrderNumber = await Counter.findOneAndUpdate(
    { _id: "orderNumber" },
    { $inc: { count: 1 } }
  );

  // if the payment method is cash, the order is new, if it's online, the order is pending
  const newOrderStatus = ["cash", "bancontact"].includes(req.body.paymentMethod)
    ? "new"
    : req.body.paymentMethod === "online"
    ? "paymentPending"
    : null;
  const prePopulatedOrder = new PrePopulatedOrder({
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
    status: newOrderStatus,
    statusHistory: [{ status: newOrderStatus, date: currentDate }],
    slug: req.body.slug,
  });

  let tmpOrder = await PrePopulatedOrder.populate(prePopulatedOrder, {
    path: "articles",
    populate: [{ path: "food" }, { path: "options" }],
  });

  //important to convert the document to an object to avoid keeping the prepopulatedOrderSchema
  tmpOrder = tmpOrder.toObject();

  const restaurant = await Restaurant.findOne({ slug: req.body.slug });
  if (!restaurant) {
    throw new AppError("Restaurant not found", 404, "ErrorNotFound");
  }
  tmpOrder.restaurant = restaurant._id;

  tmpOrder.articles.forEach((article, i) => {
    // Vérification de l'association des articles avec le restaurant
    if (!article.food.restaurant === restaurant._id) {
      throw new AppError(
        "Food payload is not associated with the concerned restaurant",
        403,
        "ErrorForbidden"
      );
    }
    article.options.forEach((option, j) => {
      if (!option.restaurant === restaurant._id) {
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
    // calculate article price
    tmpOrder.articles[i].price = addMoney(article.food.price, optionsPrice);
    // calculate article sum (article X quantity)
    tmpOrder.articles[i].sum = multiplyMoney(article.price, article.quantity);
  });

  // sort articles by categoryNumber
  tmpOrder.articles.sort(
    (a, b) => a.food.categoryNumber - b.food.categoryNumber
  );
  // calculate sum of all articles
  tmpOrder.articlesSum = tmpOrder.articles.reduce(
    (accumulator, article) => addMoney(accumulator, article.sum),
    0
  );

  tmpOrder.formattedArticlesList = buildFormattedArticleList(tmpOrder.articles);

  if (tmpOrder.orderType === 0) {
    const deliveryFees = restaurant.publicSettings.deliveryFees;

    tmpOrder.totalSum = addMoney(tmpOrder.articlesSum, deliveryFees);
    tmpOrder.deliveryFees = deliveryFees;
  } else if (tmpOrder.orderType === 1) {
    tmpOrder.totalSum = tmpOrder.articlesSum;
  }

  //formattedArticleList to easily display the order
  //if the order is paid by cash, we send the mail directly
  if (["cash", "bancontact"].includes(tmpOrder.paymentMethod)) {
    const newOrder = new Order(tmpOrder);
    await newOrder.save();
    await exports.sendNewOrderToRestaurant(newOrder, restaurant);
    res.json(newOrder);
  }
  //if the order is paid online, create a payment intent, send the client secret and the order id
  else if (tmpOrder.paymentMethod === "online") {
    const newPayment = await stripeController.createPaymentIntent(
      tmpOrder,
      restaurant
    );

    const newTmpOrder = new TmpOrder(tmpOrder);
    newTmpOrder.paymentIntentId = newPayment.paymentIntent.id;
    newTmpOrder.transactionFees = newPayment.transactionFees;
    // add formattedArticleList to easily display orders
    await newTmpOrder.save();

    if (!newTmpOrder) {
      throw new AppError(
        "Error creating TmpOrder",
        500,
        "ErrorCreatingTmpOrder"
      );
    }
    res.json({
      clientSecret: newPayment.paymentIntent.client_secret,
      orderId: newTmpOrder._id,
      orderNumber: newTmpOrder.orderNumber,
      totalSum: newTmpOrder.totalSum,
    });
  }
});

exports.getOrder = catchAsyncErrors(async function (req, res, next) {
  const orderFound = await Order.findOne({
    orderNumber: req.params.orderNumber,
  }).select("-paymentIntentId -transactionFees");
  if (orderFound) {
    const allowedIPs = [orderFound.customer.ip];

    /*
    const clientIP = req.ip;
    if (!allowedIPs.includes(clientIP)) {
      throw new AppError(
        "This IP address is not allowed for this order",
        403,
        "FordbiddenError"
      );
    } else {
     */
    //for security reasons, we delete the customer object from the order
    delete orderFound.customer;
    res.json(orderFound);
  } else {
    //if the order is not found, we check in the tmpOrder collection (for online payment, the order is created in the order collection only after stripe wehbook actions)
    const tmpOrderFound = await TmpOrder.findOne({
      orderNumber: req.params.orderNumber,
    });
    if (tmpOrderFound) {
      //for security reasons, we delete the customer object from the order
      delete tmpOrderFound.customer;
      res.json(tmpOrderFound);
    } else {
      throw new AppError("Order Not Found", 404, "NotFoundError");
    }
  }
});

exports.processOrderAfterPayment = async (paymentIntent) => {
  try {
    let tmpOrder = await TmpOrder.findOne({
      _id: paymentIntent.metadata.tmpOrderId,
    })
      .populate("restaurant")
      .lean();
    if (!tmpOrder) {
      throw new AppError("Order not found", 404, "OrderNotFound");
    }

    const restaurant = tmpOrder.restaurant;
    delete tmpOrder._id;
    delete tmpOrder.__v;

    const newOrder = new Order(tmpOrder);
    const updatedOrder = await exports.updateOrderStatus(
      newOrder,
      "new",
      (save = false)
    );
    await updatedOrder.save();

    //send the order to the restaurant websocket and mail
    await exports.sendNewOrderToRestaurant(updatedOrder, restaurant);

    const updatedOrderObject = updatedOrder.toObject();
    delete updatedOrderObject.customer;
    delete updatedOrderObject.paymentIntentId;
    delete updatedOrderObject.transactionFees;
    delete updatedOrderObject.restaurant;

    return updatedOrderObject;
  } catch (error) {
    const mailList = [process.env.CONTACT_MAIL, process.env.CONTACT_MAIL_2];

    const mail = await transporter.sendMail({
      from: `FoodSwip Bug <${process.env.MAIL_NOREPLY}>`,
      to: mailList,
      subject: "Error processing order after payment",
      html: `<b>Un problème un survenu sur foodswip: l'utilisateur a payé en ligne mais la commande n'a pas été enregistrée.</b>`,
    });
    throw new AppError(
      "Error processing order after payment",
      500,
      "ErrorProcessingOrderAfterPayment"
    );
  }
};

exports.getOrders = catchAsyncErrors(async function (req, res, next) {
  const { start, end, status, sortBy, sortDirection } = req.query;
  const orders = await Order.find({
    restaurant: req.user.restaurant,
    creationDate: {
      $gte: new Date(start),
      $lte: new Date(end),
    },
    // Conditionally include status query
    ...(status ? { status: status } : { status: { $ne: null } }),
  }).sort({ [sortBy]: sortDirection === "desc" ? -1 : 1 });

  res.json(orders);
});
