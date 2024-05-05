const express = require("express");
const router = express.Router();
const authenticateToken = require("../middlewares/authenticateToken");
const checkBody = require("../utils/checkBody");
const Restaurant = require("../models/restaurant");
const Food = require("../models/food");
const Option = require("../models/option");

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

createMenu = async (menu, restaurantUniqueValue) => {
  const populatedMenu = await Promise.all(
    menu.map(async (foodCategory, i) => {
      const foods = [];
      for (const food of foodCategory.foods) {
        const optionGroups = [];
        for (const optionGroup of food.optionGroups) {
          const optionIds = [];
          for (const option of optionGroup.options) {
            const optionFound = await Option.findOne({
              value: option.value,
              isSupplement: option.isSupplement,
              price: option.price,
              restaurantUniqueValue: restaurantUniqueValue,
            });
            if (optionFound) {
              optionIds.push(optionFound._id);
            } else {
              const newOption = await Option.create({
                ...option,
                restaurantUniqueValue: restaurantUniqueValue,
              });
              optionIds.push(newOption._id);
            }
          }
          optionGroup.options = optionIds;
          optionGroups.push(optionGroup);
        }

        const newFood = await Food.create({
          ...food,
          categoryNumber: i,
          categoryTitle: foodCategory.title,
          optionGroups: optionGroups,
          restaurantUniqueValue: restaurantUniqueValue,
        });
        foods.push(newFood._id);
      }
      return {
        ...foodCategory,
        foods,
      };
    })
  );
  return populatedMenu;
};

updateMenu = async (menu, restaurantUniqueValue) => {
  const populatedMenu = await Promise.all(
    menu.map(async (foodCategory, i) => {
      const foods = [];
      for (const food of foodCategory.foods) {
        const optionGroups = [];
        for (const optionGroup of food.optionGroups) {
          const optionIds = [];
          for (const option of optionGroup.options) {
            const optionFound = await Option.findOne({
              _id: option._id,
            });
            if (optionFound) {
              const { _id, ...optionData } = option;
              // Merge the properties of optionData into optionFound
              Object.assign(optionFound, optionData);
              optionFound.save();
              optionIds.push(optionFound.ids);
            } else {
              const newOption = await Option.create({
                ...option,
                restaurantUniqueValue: restaurantUniqueValue,
              });
              optionIds.push(newOption._id);
            }
          }
          optionGroup.options = optionIds;
          optionGroups.push(optionGroup);
        }

        const foodFound = await Food.findOne({ _id: food._id });
        if (foodFound) {
          const { _id, ...foodData } = food;
          // Merge the properties of optionData into optionFound
          Object.assign(optionFound, foodData);
          (foodFound.categoryTitle = foodCategory.title),
            (foodFound.categoryNumber = i);
          foodFound.save();
          foods.push(foodFound.ids);
        } else {
          const newFood = await Food.create({
            ...food,
            categoryNumber: i,
            categoryTitle: foodCategory.title,
            optionGroups: optionGroups,
            restaurantUniqueValue: restaurantUniqueValue,
          });
          foods.push(newFood._id);
        }
      }
      return {
        ...foodCategory,
        foods,
      };
    })
  );
  return populatedMenu;
};

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

  const menuWithFoodIds = await createMenu(req.body.menu);

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
      });

    if (!restaurant) {
      throw new AppError("Restaurant Not Found", 404, "NotFoundError");
    } else {
      //only keep element withtiongroup display = true for public data
      restaurant.menu = restaurant.menu;
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
    });
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
  "/createMenu",
  catchAsyncErrors(async (req, res, next) => {
    const restaurantFound = await Restaurant.findOne({
      uniqueValue: req.body.uniqueValue,
    });
    if (!restaurantFound) {
      throw new AppError("Restaurant Not Foud", 404, "ErrorNotFound");
    }
    // delete the foods linked to Restaurant
    await Food.deleteMany({ restaurantUniqueValue: req.body.uniqueValue });
    await Option.deleteMany({ restaurantUniqueValue: req.body.uniqueValue });
    const newMenu = await createMenu(req.body.menu, req.body.uniqueValue);
    restaurantFound.menu = newMenu;
    restaurantFound.save();
    res.json("Le menu a été créé avec succès");
  })
);

router.post(
  "/createMenu",
  catchAsyncErrors(async (req, res, next) => {
    const restaurantFound = await Restaurant.findOne({
      uniqueValue: req.body.uniqueValue,
    });
    if (!restaurantFound) {
      throw new AppError("Restaurant Not Foud", 404, "ErrorNotFound");
    }
    // delete the foods linked to Restaurant
    await Food.deleteMany({ restaurantUniqueValue: req.body.uniqueValue });
    await Option.deleteMany({ restaurantUniqueValue: req.body.uniqueValue });
    const newMenu = await createMenu(req.body.menu, req.body.uniqueValue);
    restaurantFound.menu = newMenu;
    restaurantFound.save();
    res.json("Le menu a été modifié avec succès");
  })
);

router.post(
  "/updateMenu",
  catchAsyncErrors(async (req, res, next) => {
    if (!req.body.menu[0].foods[0]._id) {
      throw new AppError(
        "The payload needs foodIds to update the menu",
        404,
        "ErrorNotFound"
      );
    }
    const restaurantFound = await Restaurant.findOne({
      uniqueValue: req.body.uniqueValue,
    });
    if (!restaurantFound) {
      throw new AppError("Restaurant Not Foud", 404, "ErrorNotFound");
    }
    // delete the foods linked to Restaurant
    await Food.deleteMany({ restaurantUniqueValue: req.body.uniqueValue });
    await Option.deleteMany({ restaurantUniqueValue: req.body.uniqueValue });
    const newMenu = await updateMenu(req.body.menu, req.body.uniqueValue);
    restaurantFound.menu = newMenu;
    restaurantFound.save();
    res.json("Le menu a été modifié avec succès");
  })
);

module.exports = router;
