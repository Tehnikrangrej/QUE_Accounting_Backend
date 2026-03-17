const express = require("express");
const router = express.Router();

const vendorController = require("../controllers/vendor");

const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkBusinessSubscription = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/checkPermission");

//////////////////////////////////////////////////////
// CREATE VENDOR
//////////////////////////////////////////////////////
router.post(
  "/",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Expense", "create"),
  vendorController.createVendor
);

//////////////////////////////////////////////////////
// GET ALL VENDORS
//////////////////////////////////////////////////////
router.get(
  "/",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Expense", "view"),
  vendorController.getVendors
);

//////////////////////////////////////////////////////
// GET SINGLE VENDOR
//////////////////////////////////////////////////////
router.get(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Expense", "view"),
  vendorController.getVendor
);

//////////////////////////////////////////////////////
// UPDATE VENDOR
//////////////////////////////////////////////////////
router.patch(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Expense", "update"),
  vendorController.updateVendor
);

//////////////////////////////////////////////////////
// DELETE VENDOR
//////////////////////////////////////////////////////
router.delete(
  "/:id",
  authMiddleware,
  businessMiddleware,
  checkBusinessSubscription,
  checkPermission("Expense", "delete"),
  vendorController.deleteVendor
);

module.exports = router;