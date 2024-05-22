const Option = require("../models/option")
const Food = require("../models/food")
const Restaurant = require("../models/restaurant")
const catchAsyncErrors = require("../utils/catchAsyncErrors")

exports.createMenu = catchAsyncErrors(async (menu, restaurant) => {
  const newMenu = []
  const restaurantUniqueValue = restaurant.uniqueValue

  for (let i = 0; i < menu.length; i++) {
    const foodCategory = menu[i]
    const foods = []
    for (let j = 0; j < foodCategory.foods.length; j++) {
      const food = foodCategory.foods[j]
      const optionGroups = []
      for (let k = 0; k < food.optionGroups.length; k++) {
        const optionGroup = food.optionGroups[k]
        const optionIds = []
        for (let m = 0; m < optionGroup.options.length; m++) {
          const option = optionGroup.options[m]
          //avoid no finding option because IsSupplement is null
          if (!option.isSupplement) {
            option.isSupplement = false
          }
          const optionFound = await Option.findOne({
            value: option.value,
            isSupplement: option.isSupplement,
            price: option.price,
            restaurantUniqueValue: restaurantUniqueValue,
          })
          let optionId
          if (optionFound) {
            console.log("yes found !")
            optionId = optionFound._id
          } else {
            const newOption = await Option.create({
              ...option,
              restaurantUniqueValue: restaurantUniqueValue,
            })
            optionId = newOption._id
          }
          optionIds.push(optionId)
        }
        optionGroup.options = optionIds
        optionGroups.push(optionGroup)
      }

      const newFood = await Food.create({
        ...food,
        categoryNumber: i,
        categoryTitle: foodCategory.title,
        optionGroups: optionGroups,
        restaurantUniqueValue: restaurantUniqueValue,
      })
      foods.push(newFood._id)
    }
    newMenu.push({
      ...foodCategory,
      foods,
    })
  }
  restaurant.menu = newMenu
  restaurant.save()
  res.json("Le menu a été modifié avec succès")
})

exports.replaceMenu = catchAsyncErrors(async (req, res, next) => {
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
    await Food.deleteMany({ restaurantUniqueValue: restaurant.uniqueValue })
    await Option.deleteMany({ restaurantUniqueValue: restaurant.uniqueValue })
    restaurant.menu = []
    restaurant.save()
    await createMenu(req.body.menu, restaurant)
  } else {
    throw new AppError("Restaurant Not Found", 404, "NotFoundError")
  }
  res.json("Le menu a été modifié avec succès")
})
