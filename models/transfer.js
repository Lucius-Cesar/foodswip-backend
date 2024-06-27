//file not used anymore

const transferSchema = new mongoose.Schema({
  orders: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  ], // "only completed" orders
  completedPaymentIntents: [{ type: String, required: true }], // stored in the order collection, "only completed" orders
  slug: { type: String, ref: "Restaurant", required: true },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true,
  },
  stripeConnectedAccountId: { type: String, required: true },
  isFirstMonthlyTransfer: { type: Boolean, required: true },
  stripeTransactionFees: {
    incoming: { type: Number, required: true }, // sum Fees from the paymentIntents confirmation
    outgoing: { type: Number, required: true, default: 0 }, // (0.25% x transferTotalSum) + 0.10 + isFirstMonthlyTransfer ? 2euros : 0 euros
    total: { type: Number, required: true }, // Total of 'in' and 'out' fees
  },
  totalOrderAmount: { type: Number, required: true }, // Total sum of the orders
  totalOnlinePaymentAmount: { type: Number, required: true }, //sum of the orders paid online
  netOnlinePaymentAmount: { type: Number, required: true }, //sum of the net online payments || onlinePaymentsTotalSum - stripeFees.in
  preCommissionTransferAmount: { type: Number, required: true }, // onlinePaymentsNetSum - stripeFees.out
  foodswipServiceCharge: { type: Number, required: true, default: 0 }, // 0 || 0.10 x (orderTotalSum - stripeFeees.total)
  finalTransferAmount: { type: Number, required: true }, // transferSumWithoutFoodswipCommisssion - foodswipCommission
  stripeTransferId: { type: String, required: true }, // Stripe transfer ID
})

const Transfer = mongoose.model("Transfer", transferSchema)
