const mongoose = require("mongoose");

const FoodSchema = new mongoose.Schema({
  value: String,
  description: String,
  price: Number,
  display: Boolean,
  options: [
    {
      label: String,
      items: [{ value: String, price: Number }],
      _id: false,
    },
  ],
  supplements: [
    {
      label: String,
      items: [{ value: String, price: Number }],
      _id: false,
    },
  ],
  tva: Number,
});

const Food = mongoose.model("food", FoodSchema);
module.exports = Food;
