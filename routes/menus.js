var express = require("express")
var router = express.Router()
const menuController = require("../controllers/menuController")
const checkEnvironment = require("../middlewares/checkEnvironment")

router.post("/createMenu", checkEnvironment, menuController.createMenu)
router.post("/replaceMenu", checkEnvironment, menuController.replaceMenu)

module.exports = router
