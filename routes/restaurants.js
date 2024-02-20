var express = require("express");
var router = express.Router();
const checkBody = require("../utils/checkBody");
const Restaurant = require("../models/restaurant");
const Food = require("../models/food");

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
router.post("/addRestaurant", async function (req, res, next) {
  const allowedIPs = ["::ffff:127.0.0.1"];
  const clientIP = req.ip;

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
      return res.status(400).send({ error: "Bad Request: Body is incorrect" });
    }
    if (!allowedIPs.includes(clientIP)) {
      return res.status(403).send({
        error: "Forbidden: This IP address is not allowed for this route",
      });
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

    return res.status(201).send({ newRestaurant });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

//get info relative to one specific restaurant by uniqueValue field.
//This is the main route that allows get restaurant info, settings and menu for the eaterView
router.get("/:uniqueValue", function (req, res, next) {
  try {
    Restaurant.findOne({ uniqueValue: req.params.uniqueValue })
      .populate("menu.foods")
      .then((restaurant) => {
        if (restaurant) {
          return res.status(201).send(restaurant);
        } else {
          return res.status(404).send({ error: "No restaurant found" });
        }
      });
  } catch (err) {
    console.error(err);
    next(err);
  }
});

module.exports = router;
