const Restaurant = require("../models/restaurant")
const { createMenu } = require("./menuController")
const checkBody = require("../utils/checkBody")
const AppError = require("../utils/AppError")
const catchAsyncErrors = require("../utils/catchAsyncErrors")

exports.getPublicRestaurantData = catchAsyncErrors(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({
    slug: req.params.slug.toLowerCase(),
  })
    .select("-privateSettings -_id")
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
    _id: req.user.restaurant,
  }).select("-_id")

  //
  if (restaurant) {
    //check if slug inside the jwt token is the same as restaurant.slug
    /*
    if (req.user.restaurant !== restaurant._id) {
      throw new AppError(
        "data access is Forbidden for this user",
        403,
        "ForbiddenError"
      )
    }*/
    return res.json(restaurant)
  } else {
    throw new AppError("Restaurant Not Found", 404, "NotFoundError")
  }
})

exports.updateRestaurantSettings = catchAsyncErrors(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({
    _id: req.user.restaurant,
  })
  
  if (restaurant) {
    /*
    if (req.user.restaurant !== restaurant._id) {
      throw new AppError(
        "Update restaurant settings is Forbidden for this user",
        403,
        "ForbiddenError"
      )
    }*/

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
      if (savedRestaurant) {
        delete savedRestaurant._id
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

  const newRestaurant = await Restaurant.create({
    name: req.body.name,
    slug: req.body.slug,
    mail: req.body.mail,
    website: req.body.website,
    phoneNumber: req.body.phoneNumber,
    address: req.body.address,
    publicSettings: req.body.publicSettings,
    privateSettings: req.body.privateSettings,
    menu: [],
  })

  await createMenu(req.body.menu, newRestaurant)

  return res.json(newRestaurant)
})
