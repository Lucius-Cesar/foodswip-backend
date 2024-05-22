const Restaurant = require("../models/restaurant")
const { createMenu } = require("./menuController")
const checkBody = require("../utils/checkBody")
const AppError = require("../utils/AppError")
const catchAsyncErrors = require("../utils/catchAsyncErrors")

exports.getPublicRestaurantData = catchAsyncErrors(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({
    uniqueValue: req.params.uniqueValue.toLowerCase(),
  })
    .select("-privateSettings")
    .populate({
      path: "menu.foods",
      match: { display: true },
      populate: {
        path: "optionGroups",
        populate: {
          path: "options",
        },
      },
    })

  if (!restaurant) {
    throw new AppError("Restaurant Not Found", 404, "NotFoundError")
  } else {
    //only keep element withtiongroup display = true for public data
    restaurant.menu = restaurant.menu
    return res.json(restaurant)
  }
})

exports.getAdminRestaurantData = catchAsyncErrors(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({
    uniqueValue: req.params.uniqueValue.toLowerCase(),
  })
  //
  if (restaurant) {
    //check if restaurantUniqueValue inside the jwt token is the same as restaurant.uniqueValue
    if (req.user.restaurantUniqueValue !== restaurant.uniqueValue) {
      throw new AppError(
        "data access is Forbidden for this user",
        403,
        "ForbiddenError"
      )
    }
    return res.json(restaurant)
  } else {
    throw new AppError("Restaurant Not Found", 404, "NotFoundError")
  }
})

exports.updateRestaurantSettings = catchAsyncErrors(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({
    uniqueValue: req.body.uniqueValue,
  })
  if (restaurant) {
    //check if restaurantUniqueValue inside the jwt token is the same as restaurant.uniqueValue
    if (req.user.restaurantUniqueValue !== restaurant.uniqueValue) {
      throw new AppError(
        "Update restaurant settings is Forbidden for this user",
        403,
        "ForbiddenError"
      )
    }
    //avoid deliveryPostCodes containing empty string
    req.body.publicSettings.deliveryPostCodes =
      req.body.publicSettings.deliveryPostCodes.filter(
        (postCode) => postCode !== ""
      )

    restaurant.name = req.body.name
    restaurant.mail = req.body.mail
    restaurant.address = req.body.address
    restaurant.phoneNumber = req.body.phoneNumber
    restaurant.website = req.body.website
    restaurant.publicSettings = req.body.publicSettings
    restaurant.privateSettings = req.body.privateSettings
    restaurant.save().then((savedRestaurant) => {
      // Vérifiez si l'enregistrement a été sauvegardé avec succès
      if (savedRestaurant === restaurant) {
        return res.json(savedRestaurant)
      } else {
        throw new AppError("Failed to save restaurant settings")
      }
    })
  } else {
    throw new AppError("Restaurant Not Found", 404, "NotFoundError")
  }
})

exports.createRestaurant = catchAsyncErrors(async (req, res, next) => {
  if (
    !checkBody(req.body, [
      "name",
      "mail",
      "website",
      "phoneNumber",
      "address",
      "publicSettings",
      "privateSettings",
      "menu",
    ])
  ) {
    throw new AppError("Body is incorrect", 400, "BadRequestError")
  }
  if (!allowedIPs.includes(clientIP)) {
    throw new AppError(
      "This IP address is not allowed for this route",
      400,
      "ForbiddenError"
    )
  }

  const newRestaurant = await Restaurant.create({
    name: req.body.name,
    uniqueValue: req.body.uniqueValue,
    mail: req.body.mail,
    website: req.body.website,
    phoneNumber: req.body.phoneNumber,
    address: req.body.address,
    publicSettings: req.body.publicSettings,
    privateSettings: req.body.privateSettings,
    menu: [],
  })

  newRestaurant.menu = await createMenu(req.body.menu, newRestaurant)

  return res.json(newRestaurant)
})
