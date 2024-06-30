var express = require("express")
var router = express.Router()
const restaurantController = require("../controllers/restaurantController")
const authenticateToken = require("../middlewares/authenticateToken")
const checkEnvironment = require("../middlewares/checkEnvironment")

router.get("/public/:slug", restaurantController.getPublicRestaurantData)
router.get(
  "/admin/:slug",
  authenticateToken,
  restaurantController.getAdminRestaurantData
)

router.post(
  "/createRestaurant",
  checkEnvironment,
  restaurantController.createRestaurant
)

router.post(
  "/admin/updateRestaurantSettings",
  authenticateToken,
  restaurantController.updateRestaurantSettings
)


module.exports = router
