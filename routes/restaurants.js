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

createFoods = async (menu) => {
  const menuWithFoodIds = await Promise.all(
    menu.map(async (foodCategory) => {
      return {
        ...foodCategory,
        foods: await Promise.all(
          foodCategory.foods.map(async (food) => {
            //sort options by ascending price
            //food.options.items?.sort((a, b) => a.price - b.price);
            const newFood = await Food.create(food);
            return newFood._id;
          })
        ),
      };
    })
  );
  return menuWithFoodIds;
};

async function removeFoodRestaurant(restaurantId) {
  const restaurantFound = await Restaurant.findOne({ _id: restaurantId });

  const foodIds = Object.values(restaurantFound.menu)
    .map((category) => category.foods.map((food) => food._id))
    .flat();

  // delete the foods linked to Restaurant
  await Food.deleteMany({ _id: { $in: foodIds } });

  //delete the restaurant
  await Restaurant.deleteOne({ _id: restaurantFound._id });
}

//routes
// create a new restaurant Document, this requet is IP limited
router.post("/addRestaurant", async (req, res, next) => {
  const allowedIPs = ["::ffff:127.0.0.1"];
  const clientIP = req.ip;
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
    req.body.address.city
  );

  const menuWithFoodIds = await createFoods(req.body.menu);

  const newRestaurant = await Restaurant.create({
    name: req.body.name,
    uniqueValue: uniqueValue,
    mail: req.body.mail,
    website: req.body.website,
    phoneNumber: req.body.phoneNumber,
    address: req.body.address,
    publicSettings: req.body.publicSettings,
    privateSettings: req.body.privateSettings,
    menu: menuWithFoodIds,
  });

  return res.json(newRestaurant);
});

//public restaurant data
router.get(
  "/public/:uniqueValue",
  catchAsyncErrors(async (req, res, next) => {
    const restaurant = await Restaurant.findOne({
      uniqueValue: req.params.uniqueValue.toLowerCase(),
    })
      .select("-privateSettings")
      .populate("menu.foods");

    if (!restaurant) {
      throw new AppError("Restaurant Not Found", 404, "NotFoundError");
    } else {
      //only keep element with display = true for public data
      restaurant.menu = restaurant.menu
        .filter((foodCategory) => foodCategory.display === true) // Filtrer les catégories d'aliments
        .map((foodCategory) => {
          return {
            ...foodCategory,
            foods: foodCategory.foods.filter((food) => food.display === true), // Filtrer les aliments de chaque catégorie
          };
        });
      return res.json(restaurant);
    }
  })
);

//public restaurant data
router.get(
  "/admin/:uniqueValue",
  authenticateToken,
  catchAsyncErrors(async (req, res, next) => {
    const restaurant = await Restaurant.findOne({
      uniqueValue: req.params.uniqueValue.toLowerCase(),
    }).populate("menu.foods");
    //
    if (restaurant) {
      //check if restaurantUniqueValue inside the jwt token is the same as restaurant.uniqueValue
      if (req.user.restaurantUniqueValue !== restaurant.uniqueValue) {
        throw new AppError(
          "data access is Forbidden for this user",
          403,
          "ForbiddenError"
        );
      }
      return res.json(restaurant);
    } else {
      throw new AppError("Restaurant Not Found", 404, "NotFoundError");
    }
  })
);

router.post(
  "/admin/updateRestaurantSettings",
  authenticateToken,
  catchAsyncErrors(async (req, res, next) => {
    const restaurant = await Restaurant.findOne({
      uniqueValue: req.body.uniqueValue,
    });
    if (restaurant) {
      //check if restaurantUniqueValue inside the jwt token is the same as restaurant.uniqueValue
      if (req.user.restaurantUniqueValue !== restaurant.uniqueValue) {
        throw new AppError(
          "Update restaurant settings is Forbidden for this user",
          403,
          "ForbiddenError"
        );
      }
      //avoid deliveryPostCodes containing empty string
      req.body.publicSettings.deliveryPostCodes =
        req.body.publicSettings.deliveryPostCodes.filter(
          (postCode) => postCode !== ""
        );

      restaurant.name = req.body.name;
      restaurant.mail = req.body.mail;
      restaurant.address = req.body.address;
      restaurant.phoneNumber = req.body.phoneNumber;
      restaurant.website = req.body.website;
      restaurant.publicSettings = req.body.publicSettings;
      restaurant.privateSettings = req.body.privateSettings;
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
  })
);

//delete restaurant and all document associated with

/*router.delete(
  "/:restaurantId",
  catchAsyncErrors(async (req, res, next) => {
    removeFoodRestaurant(req.params.restaurantId,true);
    res.json("Le restaurant a été supprimé avec succès");
  })
);
*/

/*router.delete(
  "menu/:restaurantId",
  catchAsyncErrors(async (req, res, next) => {
    removeFoodRestaurant(req.params.restaurantId,false);
    res.json("Le menu a été supprimé avec succès");
  })
);
*/

router.post(
  "/updateMenu",
  catchAsyncErrors(async (req, res, next) => {
    const restaurantFound = await Restaurant.findOne({
      _id: req.body._id,
    });
    const foodIds = Object.values(restaurantFound.menu)
      .map((category) => category.foods.map((food) => food._id))
      .flat();

    // delete the foods linked to Restaurant
    await Food.deleteMany({ _id: { $in: foodIds } });

    const updatedMenu = await createFoods(req.body.menu);
    restaurantFound.menu = updatedMenu;
    await restaurantFound.save();
    res.json("Le menu a été modifié avec succès");
  })
);

module.exports = router;
