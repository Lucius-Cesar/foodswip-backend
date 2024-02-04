const mongoose = require("mongoose");

const FoodSchema = new mongoose.Schema({
  value: String,
  description: String,
  price: Number,
  display: Boolean,
  options: [
    {
      items: [{ value: String, price: Number }],
    },
  ],
  supplements: [
    {
      _id: false,
      label: String,
      items: [{ value: String, price: Number }],
    },
  ],
});

const FoodCategorySchema = new mongoose.Schema({
  value: String,
  display: Boolean,
  foods: [FoodSchema],
});

const RestaurantSchema = new mongoose.Schema({
  name: String,
  uniqueValue: String,
  mail: String,
  website: String,
  phoneNumber: String,
  adress: {
    street: String,
    streetNumber: String,
    postCode: String,
    city: String,
  },
  orderSettings: {
    _id: false,
    orderTypes: [
      {
        value: Number,
        enabled: Boolean,
        _id: false,
      },
    ],
    pendingOrderAlert: {
      enabled: Boolean,
      interval: Number,
    },
    deliveryEstimate: {
      min: Number,
      max: Number,
    },
    deliveryFees: Number,
    deliveryMin: Number,
    takeAwayEstimate: Number,
    paymentMethods: [
      {
        value: String,
        delivery: Boolean,
        takeAway: Boolean,
        _id: false,
      },
    ],
  },
  restaurantSettings: {
    _id: false,
    schedule: [
      {
        value: String,
        services: [
          {
            start: String,
            end: String,
            _id: false,
          },
        ],
        _id: false,
      },
    ],
    exceptionnalClosings: [
      {
        start: Date,
        end: Date,
        _id: false,
      },
    ],
  },
  //foodSchema is nested in foodCategoriesSchema
  menu: [FoodCategorySchema],
});

const Restaurant = mongoose.model("restaurant", RestaurantSchema);
module.exports = Restaurant;
