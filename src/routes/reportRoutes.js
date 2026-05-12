const router = require("express").Router();

const auth = require("../middlewares/authMiddleware");
const business = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/checkPermission");

const Controller = require("../controllers/reportController");

//////////////////////////////////////////////////////
// PROFIT & LOSS
//////////////////////////////////////////////////////
router.get(
  "/",
  auth,
  business,
  checkPermission("report", "read"),
  Controller.getProfitLoss
);

module.exports = router;