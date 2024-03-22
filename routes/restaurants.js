const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authenticateToken");
const checkBody = require("../utils/checkBody");
const Restaurant = require("../models/restaurant");
const Food = require("../models/food");
const catchAsyncErrors = require("../utils/catchAsyncErrors");
const AppError = require("../utils/AppError");

//utils
const generateUniqueValue = async (name, city) => {
  //check if restaurant name exists as uniqueValue in the db, if exists try name-city, if exists try name-city-index
  let uniqueValue = name.toLowerCase();
  let i = 1;

  while (true) {
    const existingRestaurant = await Restaurant.findOne({ uniqueValue });

    if (!existingRestaurant) {
      break;
    }

    if (i === 1) {
      uniqueValue = `${name}-${city}`.toLowerCase();
    } else {
      uniqueValue = `${name}-${city}-${i}`.toLowerCase();
    }

    i++;
  }

  return uniqueValue;
};

// create a new restaurant Document, this requet is IP limited
router.post(
  "/addRestaurant",
  catchAsyncErrors(async (req, res, next) => {
    const allowedIPs = ["::ffff:127.0.0.1"];
    const clientIP = req.ip;
    if (
      !checkBody(req.body, [
        "name",
        "mail",
        "website",
        "phoneNumber",
        "adress",
        "orderSettings",
        "restaurantSettings",
        "menu",
      ])
    ) {
      throw new AppError("Body is incorrect", 400, "BadRequestError");
    }
    if (!allowedIPs.includes(clientIP)) {
      throw new AppError(
        "This IP address is not allowed for this route",
        400,
        "ForbiddenError"
      );
    }

    const uniqueValue = await generateUniqueValue(
      req.body.name,
      req.body.adress.city
    );

    const foodCategories = await Promise.all(
      req.body.menu.map(async (foodCategory) => {
        return {
          ...foodCategory,
          foods: await Promise.all(
            foodCategory.foods.map(async (food) => {
              food.options.items?.sort((a, b) => a.price - b.price);
              const newFood = await Food.create(food);
              return newFood._id;
            })
          ),
        };
      })
    );

    const newRestaurant = await Restaurant.create({
      name: req.body.name,
      uniqueValue: uniqueValue,
      mail: req.body.mail,
      website: req.body.website,
      phoneNumber: req.body.phoneNumber,
      adress: req.body.adress,
      orderSettings: req.body.orderSettings,
      restaurantSettings: req.body.restaurantSettings,
      menu: foodCategories,
    });

    return res.json(newRestaurant);
  })
);

//get info relative to one specific restaurant by uniqueValue field.
//This is the main route that allows get restaurant info, settings and menu for the eaterView
router.get(
  "/:uniqueValue",
  catchAsyncErrors(async (req, res, next) => {
    const restaurant = await Restaurant.findOne({
      uniqueValue: req.params.uniqueValue.toLowerCase(),
    }).populate("menu.foods");
    if (restaurant) {
      return res.json(restaurant);
    } else {
      throw new AppError("Restaurant Not Found", 404, "NotFoundError");
    }
  })
);

router.post(
  "/updateRestaurantSettings",
  authenticateToken,
  catchAsyncErrors(async (req, res, next) => {
    Restaurant.findOne({ uniqueValue: req.body.uniqueValue }).then(
      (restaurant) => {
        if (restaurant) {
          //check if restaurantUniqueValue inside the jwt token is the same as restaurant.uniqueValue
          if (req.user.restaurantUniqueValue !== restaurant.uniqueValue) {
            throw new AppError(
              "Update restaurant settings is Forbidden for this user",
              403,
              "ForbiddenError"
            );
          }
          restaurant.name = req.body.name;
          restaurant.mail = req.body.mail;
          restaurant.adress = req.body.adress;
          restaurant.phoneNumber = req.body.phoneNumber;
          restaurant.website = req.body.website;
          restaurant.restaurantSettings = req.body.restaurantSettings;
          restaurant.orderSettings = req.body.orderSettings;
          restaurant.save().then((savedRestaurant) => {
            // Vérifiez si l'enregistrement a été sauvegardé avec succès
            if (savedRestaurant === restaurant) {
              return res.json(savedRestaurant);
            } else {
              throw new AppError("Failed to save restaurant settings");
            }
          });
        } else {
          throw new AppError("Restaurant Not Found", 404, "NotFoundError");
        }
      }
    );
  })
);

module.exports = router;
