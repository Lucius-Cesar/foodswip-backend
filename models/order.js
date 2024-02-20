const mongoose = require("mongoose");
const OptionSupplementSchema = new mongoose.Schema({
  value: String,
  price: Number,
  _id: false,
});
const ArticleSchema = new mongoose.Schema({
  value: String,
  food: { type: mongoose.Schema.Types.ObjectId, ref: "food" },
  quantity: Number,
  selectedOptions: [OptionSupplementSchema],
  selectedSupplements: [OptionSupplementSchema],
  foodCategoryIndex: Number,
});

const OrderSchema = {
  orderNumber: Number,
  customer: {
    mail: String,
    phoneNumber: String,
    adress: String,
    city: String,
    postCode: String,
    ip: String,
  },
  articles: [ArticleSchema],
  articlesSum: Number,
  totalSum: Number,
  note: String,
  orderType: Number,
  paymentMethod: String,
  creationDate: Date,
  lastUpdate: Date,
  estimatedArrivalDate: Date,
  status: String,
  statusHistory: [{ status: String, date: Date, _id: false }],
};

const Order = mongoose.model("order", OrderSchema);
module.exports = Order;
