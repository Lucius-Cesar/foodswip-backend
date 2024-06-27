const mongoose = require("mongoose")

const OptionSchema = new mongoose.Schema({
  value: String,
  price: Number,
  isSupplement: { type: Boolean, default: false },
  display: { type: Boolean, default: true },
  isNeededInOrder: { type: Boolean, default: true },
  food: [{ type: mongoose.Schema.Types.ObjectId, ref: "food" }],
  slug: { type: String, ref: "restaurant" },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "restaurant" },
})

const Option = mongoose.model("option", OptionSchema)
module.exports = Option
