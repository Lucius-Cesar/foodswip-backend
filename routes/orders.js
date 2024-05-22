var express = require("express")
var router = express.Router()
const orderController = require("../controllers/orderController")

router.post("/addOrder", orderController.addOrder)
router.get("/:orderNumber", orderController.getOrder)

module.exports = router
