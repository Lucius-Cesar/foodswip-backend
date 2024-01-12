const mongoose = require("mongoose");
const Food = {
  value: String,
  description: String,
  price: Number,
  display: Boolean,
  options: [
    {
      _id: false,
      label: String,
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
};

const FoodCategory = {
  value: String,
  display: Boolean,
  foods: [Food],
};

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
    orderTypes: [
      {
        value: Number,
        label: String,
        enabled: Boolean,
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
      },
    ],
  },
  restaurantSettings: {
    schedule: [
      {
        label: String,
        services: [
          {
            start: String,
            end: String,
          },
        ],
      },
    ],
    exceptionnalClosings: [
      {
        start: Date,
        end: Date,
      },
    ],
  },
  menu: [FoodCategory],
});

const Restaurant = mongoose.model("Restaurant", RestaurantSchema);
module.exports = Restaurant;
