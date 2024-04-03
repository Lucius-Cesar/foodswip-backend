const mongoose = require("mongoose");

const FoodCategorySchema = new mongoose.Schema({
  title: String,
  display: Boolean,
  foods: [{ type: mongoose.Schema.Types.ObjectId, ref: "food" }],
});

const RestaurantSchema = new mongoose.Schema({
  name: String,
  uniqueValue: String,
  mail: String,
  address: {
    street: String,
    streetNumber: String,
    postCode: String,
    city: String,
    country: String,
  },

  phoneNumber: String,
  website: String,
  publicSettings: {
    _id: false,
    orderTypes: [
      {
        value: Number,
        enabled: Boolean,
        _id: false,
      },
    ],
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
    exceptionalClosings: [
      {
        start: Date,
        end: Date,
        _id: false,
      },
    ],
  },
  privateSettings: {
    _id: false,
    orderMailReception: {
      enabled: Boolean,
      mails: [String],
    },
    pendingOrderAlert: {
      enabled: Boolean,
      interval: Number,
    },
  },
  //foodSchema is nested in foodCategoriesSchema
  menu: [FoodCategorySchema],
});

const Restaurant = mongoose.model("restaurant", RestaurantSchema);
module.exports = Restaurant;
