const mongoose = require("mongoose");

const ArticleSchema = new mongoose.Schema({
  value: String,
  food: { type: mongoose.Schema.Types.ObjectId, ref: "food" },
  quantity: Number,
  selectedOptions: [String],
  selectedSupplements: [String],
  price: Number,
  sum: Number,
  foodCategoryIndex: Number,
});

const OrderSchema = {
  orderNumber: Number,
  restaurantUniqueValue: String,
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
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "restaurant" },
  restaurantUniqueValue: String,
};

const Order = mongoose.model("order", OrderSchema);
module.exports = Order;
