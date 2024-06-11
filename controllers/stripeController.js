const AppError = require("../utils/AppError")
const catchAsyncErrors = require("../utils/catchAsyncErrors")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const { addMoney, multiplyMoney } = require("../utils/moneyCalculations")

exports.createPaymentIntent = async (order, restaurant) => {
  const isRestaurantOnCommission = restaurant.privateSettings.commission

  const percentStripeFee = 0.0175 // 1.5 card + 0.2
  const fixedStripeFee = 0.35 //0.25  card + 0.10 stripe connect
  const onlinePaymentFees = addMoney(
    multiplyMoney(percentStripeFee, order.totalSum),
    fixedStripeFee
  )
  const platformCommission = isRestaurantOnCommission
    ? multiplyMoney(0.1, order.totalSum)
    : 0
  const totalFees = isRestaurantOnCommission
    ? addMoney(onlinePaymentFees, platformCommission)
    : onlinePaymentFees

  const totalFeesInCents = multiplyMoney(totalFees, 100)

  const paymentIntentObject = {
    amount: multiplyMoney(order.totalSum, 100), // Stripe attend l'amount en centimes
    currency: "eur", // Remplacez 'eur' par la devise que vous utilisez
    description: `Payment for order ${order.orderNumber}`,

    metadata: {
      platform: "foodswip",
      slug: restaurant.slug,
      tmpOrderId: order._id.toString(),
      orderNumber: order.orderNumber,
    },
    application_fee_amount: totalFeesInCents,
    transfer_data: {
      destination: restaurant.privateSettings.stripeConnectId,
    },
  }

  const paymentIntent = await stripe.paymentIntents.create(paymentIntentObject)
  if (paymentIntent) {
    return {
      paymentIntent: paymentIntent,
      transactionFees: {
        platformCommission: platformCommission,
        onlinePayment: onlinePaymentFees,
        total: totalFees,
      },
    }
  } else {
    throw new AppError(
      "Error creating payment intent",
      400,
      "ErrorPaymentIntent"
    )
  }
}
