const checkBody = require("../utils/checkBody");
const Restaurant = require("../models/restaurants");

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

var express = require("express");
var router = express.Router();

// create a new restaurant Document
router.post("/", async function (req, res, next) {
  try {
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
      const err = new Error("Body is incorrect");
      next(err);
    }

    const uniqueValue = await generateUniqueValue(
      req.body.name,
      req.body.adress.city
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
      menu: req.body.menu,
    });

    res.json({ newRestaurant });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

//get info relative to one specific restaurant by uniqueValue field.
//This is the main route that allows get restaurant info, settings and menu for the eaterView
router.get("/:uniqueValue", function (req, res, next) {
  try {
    Restaurant.findOne({ uniqueValue: req.params.uniqueValue }).then(
      (restaurant) => {
        if (restaurant) {
          //sort options and options by ascending price
          restaurant.menu.flatMap((category) =>
            category.foods.flatMap((food) => {
              food.options.forEach((option) => {
                option.items.sort((a, b) => a.price - b.price);
              });
            })
          );
          res.json({ restaurant });
        } else {
          const err = new Error(
            `No restaurant found for the value ${req.params.uniqueValue}`
          );
          next(err);
        }
      }
    );
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
