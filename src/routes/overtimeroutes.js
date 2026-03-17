const express = require("express");
const router = express.Router();

const overtimeController = require("../controllers/overtime");

const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkBusinessSubscription = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/checkPermission");

//////////////////////////////////////////////////////
// CREATE OVERTIME
//////////////////////////////////////////////////////
router.post(
  "/",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Payroll", "create"),
  overtimeController.createOvertime
);

//////////////////////////////////////////////////////
// GET ALL OVERTIME
//////////////////////////////////////////////////////
router.get(
  "/",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Payroll", "view"),
  overtimeController.getAllOvertime
);

//////////////////////////////////////////////////////
// GET SINGLE OVERTIME
//////////////////////////////////////////////////////
router.get(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Payroll", "view"),
  overtimeController.getSingleOvertime
);

//////////////////////////////////////////////////////
// UPDATE OVERTIME
//////////////////////////////////////////////////////
router.put(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Payroll", "update"),
  overtimeController.updateOvertime
);

//////////////////////////////////////////////////////
// DELETE OVERTIME
//////////////////////////////////////////////////////
router.delete(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Payroll", "delete"),
  overtimeController.deleteOvertime
);

module.exports = router;