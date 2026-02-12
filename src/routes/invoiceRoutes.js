const express = require("express");
const {
  getInvoices,
  createInvoice,
  updateInvoiceStatus,
} = require("../controllers/invoiceController");
const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkBusinessSubscription = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/permissionMiddleware");

const router = express.Router();

// Apply authentication and tenant middleware to all routes
router.use(authMiddleware);

// Allow read operations even with expired subscription
router.get("/", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "read"), getInvoices);

// Require active subscription for write operations
router.post("/",authMiddleware, businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "create"), createInvoice);
router.patch("/:id/status", businessMiddleware, checkBusinessSubscription, checkPermission("invoice", "update"), updateInvoiceStatus);

module.exports = router;
