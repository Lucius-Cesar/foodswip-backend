const mongoose = require("mongoose")

const FoodCategorySchema = new mongoose.Schema({
  title: String,
  foods: [{ type: mongoose.Schema.Types.ObjectId, ref: "food" }],
})

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
    statusOverride: {
      open: Boolean,
      start: Date,
      end: Date,
    },
    deliveryEstimate: {
      min: Number,
      max: Number,
    },
    deliveryFees: Number,
    deliveryMin: Number,
    deliveryPostCodes: [String],
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
            delivery: Boolean,
            takeaway: Boolean,
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
      mail: String,
    },
    pendingOrderAlert: {
      enabled: Boolean,
      interval: Number,
    },
  },
  //foodSchema is nested in foodCategoriesSchema
  menu: [FoodCategorySchema],
})

const Restaurant = mongoose.model("restaurant", RestaurantSchema)
module.exports = Restaurant
