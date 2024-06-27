const mongoose = require("mongoose")

const FoodSchema = new mongoose.Schema({
  value: String,
  description: String,
  price: Number,
  display: Boolean,
  categoryNumber: Number,
  categoryTitle: String,
  tva: { type: Number, default: 6 },
  optionGroups: [
    //options can be items in the option schema (option, supplements etc.) or another food to do this: "Select your dessert" reference other foods in the dessert category
    {
      label: String,
      isMultiChoices: { type: Boolean, default: false },
      options: [{ type: mongoose.Schema.Types.ObjectId, ref: "option" }],
      _id: false,
    },
  ],
  slug: { type: String, ref: "restaurant" },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "restaurant" },
})

const Food = mongoose.model("food", FoodSchema)
module.exports = Food
