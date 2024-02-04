// this collection is used to allow auto-increment in mongoDB collection

const mongoose = require("mongoose");
const counterSchema = {
  _id: String,
  count: Number,
};
const Counter = mongoose.model("counter", counterSchema);
module.exports = Counter;

// Counter.create({ _id: "orderNumber", count: 233140 });
