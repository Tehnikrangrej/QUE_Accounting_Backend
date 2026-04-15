const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");
const Controller = require("../controllers/BillController");

router.post("/", auth, business, checkPermission("bill", "create"), Controller.createBill);

module.exports = router;