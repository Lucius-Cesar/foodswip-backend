const checkBody = require("../utils/checkBody")
const Order = require("../models/order")
const PrePopulatedOrder = require("../models/prePopulatedOrder")
const TmpOrder = require("../models/tmpOrder")

const Counter = require("../models/counter")
const catchAsyncErrors = require("../utils/catchAsyncErrors")
const AppError = require("../utils/AppError")
const {
  transporter,
  orderCustomerMailHtml,
  orderRestaurantMailHtml,
} = require("../utils/email")

const { addMoney, multiplyMoney } = require("../utils/moneyCalculations")
const stripeController = require("./stripeController")

exports.sendOrderMail = async (order, restaurant) => {
  const expeditor = `${restaurant.name} <noreply@foodswip-order.com>`
  const customerMail = order.customer.mail
  const mailToTheCustomer = await transporter.sendMail({
    from: expeditor,
    to: customerMail,
    subject: `Merci pour votre commande chez ${restaurant.name} #${order.orderNumber}`,
    html: orderCustomerMailHtml(order, restaurant),
  })

  if (!mailToTheCustomer) {
    throw new AppError(
      "Error sending mail to the customer",
      500,
      "ErrorMailCustomer"
    )
  }

  // Envoi d'un e-mail de confirmation au restaurant
  if (restaurant?.privateSettings?.orderMailReception?.enabled) {
    const restaurantMail = restaurant.privateSettings.orderMailReception.mail
    const mailToTheRestaurant = await transporter.sendMail({
      from: "Foodswip <noreply@foodswip-order.com>",
      to: restaurantMail,
      subject: `Nouvelle commande #${order.orderNumber}`,
      html: orderRestaurantMailHtml(order, restaurant),
    })
    if (!mailToTheRestaurant) {
      throw new AppError(
        "Error sending mail to the restaurant",
        500,
        "ErrorMailRestaurant"
      )
    }
  }
  return { success: true }
}

exports.updateOrderStatus = async (order, newStatus, save = true) => {
  const currentDate = new Date()
  order.status = newStatus
  order.statusHistory.push({ status: newStatus, date: currentDate })
  if (save) {
    orderSaved = await order.save()
    if (!orderSaved) {
      throw new AppError(
        "Error updating order status",
        500,
        "ErrorUpdateOrderStatus"
      )
    }
  }
  return order
}

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
      "restaurant",
    ])
  ) {
    throw new AppError("Body is incorrect", 400, "BadRequestError")
  }

  // Date actuelle
  const currentDate = new Date()

  // Récupération et incrémentation du numéro de commande
  const NewOrderNumber = await Counter.findOneAndUpdate(
    { _id: "orderNumber" },
    { $inc: { count: 1 } }
  )

  // if the payment method is cash, the order is completed, if it's online, the order is pending
  const newOrderStatus = ["cash", "bancontact"].includes(req.body.paymentMethod)
    ? "completed"
    : req.body.paymentMethod === "online"
    ? "paymentPending"
    : null
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
    restaurant: req.body.restaurant,
  })

  //populate before the creation of newOrder !
  let tmpOrder = await PrePopulatedOrder.populate(prePopulatedOrder, {
    path: "restaurant",
    select: "-menu",
  })

  tmpOrder = await PrePopulatedOrder.populate(prePopulatedOrder, {
    path: "articles",
    populate: [{ path: "food" }, { path: "options" }],
  })

  const restaurant = prePopulatedOrder.restaurant
  if (!restaurant) {
    throw new AppError("Restaurant not found", 404, "ErrorNotFound")
  }
  tmpOrder.slug = restaurant.slug
  tmpOrder.restaurant = restaurant._id
  const restaurantInfo = {
    name: restaurant.name,
    phoneNumber: restaurant.phoneNumber,
    address: restaurant.address,
    website: restaurant.website,
    privateSettings: {
      orderMailReception: restaurant.privateSettings.orderMailReception,
    },
  }

  tmpOrder.articles.forEach((article, i) => {
    // Vérification de l'association des articles avec le restaurant
    if (article.food.slug !== restaurant.slug) {
      throw new AppError(
        "Food payload is not associated with the concerned restaurant",
        403,
        "ErrorForbidden"
      )
    }
    article.options.forEach((option, j) => {
      if (option.slug !== restaurant.slug) {
        throw new AppError(
          "Option payload is not associated with the concerned restaurant",
          403,
          "ErrorForbidden"
        )
      }
    })

    const optionsPrice = article.options.reduce(
      (accumulator, option) => addMoney(accumulator, option.price),
      0
    )
    // calculate article price
    tmpOrder.articles[i].price = addMoney(article.food.price, optionsPrice)
    // calculate article sum (article X quantity)
    tmpOrder.articles[i].sum = multiplyMoney(article.price, article.quantity)
  })

  // sort articles by categoryNumber
  tmpOrder.articles.sort(
    (a, b) => a.food.categoryNumber - b.food.categoryNumber
  )

  // calculate sum of all articles
  tmpOrder.articlesSum = tmpOrder.articles.reduce(
    (accumulator, article) => addMoney(accumulator, article.sum),
    0
  )

  if (tmpOrder.orderType === 0) {
    const deliveryFees = restaurant.publicSettings.deliveryFees

    tmpOrder.totalSum = addMoney(tmpOrder.articlesSum, deliveryFees)
    tmpOrder.deliveryFees = deliveryFees
  } else if (tmpOrder.orderType === 1) {
    tmpOrder.totalSum = tmpOrder.articlesSum
  }

  //if the order is paid by cash, we send the mail directly
  if (["cash", "bancontact"].includes(tmpOrder.paymentMethod)) {
    const newOrder = await Order.create(tmpOrder)
    await exports.sendOrderMail(newOrder, restaurantInfo)
    res.json(newOrder)
  }
  //if the order is paid online, create a payment intent, send the client secret and the order id
  else if (tmpOrder.paymentMethod === "online") {
    const newPayment = await stripeController.createPaymentIntent(
      tmpOrder,
      restaurant
    )

    const newTmpOrder = new TmpOrder(tmpOrder)
    newTmpOrder.restaurantInfo = restaurantInfo
    newTmpOrder.paymentIntentId = newPayment.paymentIntent.id
    newTmpOrder.transactionFees = newPayment.transactionFees
    await newTmpOrder.save()

    if (!newTmpOrder) {
      throw new AppError(
        "Error creating TmpOrder",
        500,
        "ErrorCreatingTmpOrder"
      )
    }
    res.json({
      clientSecret: newPayment.paymentIntent.client_secret,
      orderId: newTmpOrder._id,
      orderNumber: newTmpOrder.orderNumber,
      totalSum: newTmpOrder.totalSum,
    })
  }
})

exports.getOrder = catchAsyncErrors(async function (req, res, next) {
  const orderFound = await Order.findOne({
    orderNumber: req.params.orderNumber,
  })
  if (orderFound) {
    const allowedIPs = [orderFound.customer.ip]
    const clientIP = req.ip
    if (!allowedIPs.includes(clientIP)) {
      throw new AppError(
        "This IP address is not allowed for this order",
        403,
        "FordbiddenError"
      )
    } else {
      //don't send the restaurant proprieties to the client
      delete orderFound.paymentIntendId
      delete orderFound.transactionFees

      res.json(orderFound)
    }
  } else {
    //if the order is not found, we check in the tmpOrder collection (for online payment, the order is created in the order collection only after stripe wehbook actions)
    const tmpOrderFound = await TmpOrder.findOne({
      orderNumber: req.params.orderNumber,
    })
    if (tmpOrderFound) {
      res.json(tmpOrderFound)
    } else {
      throw new AppError("Order Not Found", 404, "NotFoundError")
    }
  }
})

exports.processOrderAfterPayment = async (paymentIntent) => {
  // Update the order status to paid

  const tmpOrder = await TmpOrder.findById(paymentIntent.metadata.tmpOrderId)

  if (!tmpOrder) {
    throw new AppError("Order not found", 404, "OrderNotFound")
  }

  // Create a plain object from the tmpOrder document
  const tmpOrderObject = tmpOrder.toObject()
  delete tmpOrderObject._id
  delete tmpOrderObject.__v

  const restaurantInfo = tmpOrderObject.restaurantInfo

  // Create the document in the real order collection
  const newOrder = new Order(tmpOrderObject)
  const updatedOrder = await exports.updateOrderStatus(newOrder, "completed")

  // Send the order confirmation email, we use tmp order because contain restaurantInfo
  await exports.sendOrderMail(updatedOrder, restaurantInfo)

  return newOrder
}
