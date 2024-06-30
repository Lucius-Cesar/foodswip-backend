const mongoose = require("mongoose")

//this model is used only to calculate prices before creation of a paymentIntent but the document is never stored in the database.

const ArticleSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: "food" },
  options: [{ type: mongoose.Schema.Types.ObjectId, ref: "option" }],
  quantity: Number,
  price: Number,
  sum: Number,
  _id: false,
})

const PrePopulatedOrderSchema = new mongoose.Schema({
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
  estimatedArrivalDate: Date,
  status: String,
  statusHistory: [{ status: String, date: Date, _id: false }],
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "restaurant" },
  slug: String,
})

const PrePopulatedOrder = mongoose.model(
  "prePopulatedOrder",
  PrePopulatedOrderSchema
)
module.exports = PrePopulatedOrder
