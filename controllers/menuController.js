const Option = require("../models/option")
const Food = require("../models/food")
const Restaurant = require("../models/restaurant")
const catchAsyncErrors = require("../utils/catchAsyncErrors")

exports.createMenu = catchAsyncErrors(async (menu, restaurant) => {
  const newMenu = []
  const slug = restaurant.slug

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
            slug: slug,
            restaurant: restaurant._id
          })
          let optionId
          if (optionFound) {
            optionId = optionFound._id
          } else {
            const newOption = await Option.create({
              ...option,
              slug: slug,
              restaurant: restaurant._id
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
        slug: slug,
        restaurant: restaurant._id
      })
      foods.push(newFood._id)
    }
    newMenu.push({
      ...foodCategory,
      foods,
    })
  }
  restaurant.menu = newMenu
  await restaurant.save()
  return newMenu
})

exports.replaceMenu = catchAsyncErrors(async (req, res, next) => {
  const restaurant = await Restaurant.findOne({
    slug: req.body.slug,
  })
  if (restaurant) {
    //check if slug inside the jwt token is the same as restaurant.slug
    if (req.user.slug !== restaurant.slug) {
      throw new AppError(
        "Update restaurant settings is Forbidden for this user",
        403,
        "ForbiddenError"
      )
    }
    await Food.deleteMany({ restaurant: restaurant._id })
    await Option.deleteMany({restaurant: restaurant._id })
    restaurant.menu = []
    restaurant.save()
    await createMenu(req.body.menu, restaurant)
  } else {
    throw new AppError("Restaurant Not Found", 404, "NotFoundError")
  }
  res.json("Le menu a été modifié avec succès")
})
