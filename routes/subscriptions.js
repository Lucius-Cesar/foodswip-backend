var express = require("express")
var router = express.Router()
const subscriptionController = require("../controllers/subscriptionController")
const authenticateToken = require("../middlewares/authenticateToken")
router.post("/save", authenticateToken, subscriptionController.saveSubscription)
router.post("/updateLastActivity", authenticateToken, subscriptionController.updateLastActivity)

module.exports = router