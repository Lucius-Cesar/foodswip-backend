var express = require("express")
var router = express.Router()
const orderController = require("../controllers/orderController")

router.post("/createOrder", orderController.createOrder)
router.get("/:orderNumber", orderController.getOrder)
router.post(
  "/processOrderAfterPayment",
  orderController.processOrderAfterPayment
)
module.exports = router
