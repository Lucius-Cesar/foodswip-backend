var express = require("express")
var router = express.Router()
const orderController = require("../controllers/orderController")
const authenticateToken = require("../middlewares/authenticateToken")
const catchAsyncErrors = require("../utils/catchAsyncErrors")
const AppError = require("../utils/AppError")
const Order = require("../models/order")

router.get(
  "/",
  authenticateToken,
  orderController.getOrders
)
router.post(
  "/updateStatus", authenticateToken, catchAsyncErrors(async function (req, res, next) {
    const {orderId, status} = req.body

    const order = await Order.findOne({_id: orderId})
    if(!order.restaurant.equals(req.user.restaurant)){
      throw new AppError(
        "Update order status is Forbidden for this user",
        403,
        "ForbiddenError")    }
    else{
      const updatedOrder = await orderController.updateOrderStatus(order, status, save = true)
      res.json(updatedOrder)
    }
  }))

router.post("/createOrder", orderController.createOrder)
router.get("/:orderNumber", orderController.getOrder)
router.post(
  "/processOrderAfterPayment",
  orderController.processOrderAfterPayment
)

module.exports = router
