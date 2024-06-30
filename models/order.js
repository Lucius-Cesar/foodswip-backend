const mongoose = require("mongoose")

const FoodSchema = new mongoose.Schema({
  value: String,
  description: String,
  price: Number,
  display: Boolean,
  categoryNumber: Number,
  categoryTitle: String,
  tva: Number,
})

const optionSchema = new mongoose.Schema({
  value: String,
  price: Number,
  isSupplement: { type: Boolean, default: false },
  display: { type: Boolean, default: true },
  isNeededInOrder: { type: Boolean, default: true },
})

const ArticleSchema = new mongoose.Schema({
  food: FoodSchema,
  options: [optionSchema],
  quantity: Number,
  price: Number,
  sum: Number,
  _id: false,
})

const OrderSchema = {
  orderNumber: {type:Number, required:true, unique:true},
  customer: {
    firstname: String,
    lastname: String,
    mail: String,
    phoneNumber: String,
    address: {
      street: String,
      streetNumber: String,
      postCode: String,
      city: String,
    },
    ip: String,
  },
  articles: [ArticleSchema],
  formattedArticlesList: [{
    _id: false,
    categoryTitle: String,
    categoryNumber: Number,
    articles: [ArticleSchema]
  }],
  articlesSum: Number,
  deliveryFees: Number,
  totalSum: Number,
  note: String,
  orderType: Number,
  paymentMethod: String,
  creationDate: Date,
  lastUpdate: Date,
  paymentIntentId: String,
  transactionFees: {
    platformCommission: Number, //euro
    onlinePayment: Number, //euro
    total: Number, //euro
  },
  estimatedArrivalDate: Date,
  status: String,
  statusHistory: [{ status: String, date: Date, _id: false }],
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "restaurant" },
  slug: String,

}

const Order = mongoose.model("order", OrderSchema)
module.exports = Order
