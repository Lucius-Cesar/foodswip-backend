var express = require("express")
var router = express.Router()
const restaurantController = require("../controllers/restaurantController")
const authenticateToken = require("../middlewares/authenticateToken")

router.get("/public/:uniqueValue", restaurantController.getPublicRestaurantData)
router.get(
  "/admin/:uniqueValue",
  authenticateToken,
  restaurantController.getAdminRestaurantData
)
router.post(
  "/admin/updateRestaurantSettings",
  authenticateToken,
  restaurantController.updateRestaurantSettings
)

module.exports = router
