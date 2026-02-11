const express = require("express");
const {
  getInvoices,
  createInvoice,
  updateInvoiceStatus,
} = require("../controllers/invoiceController");
const authMiddleware = require("../middlewares/authMiddleware").default || require("../middlewares/authMiddleware");
const tenantMiddleware = require("../middlewares/tenantMiddleware");
const { checkBusinessSubscriptionReadOnly } = require("../middlewares/subscriptionMiddleware");
const { checkBusinessSubscription } = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/permissionMiddleware");

const router = express.Router();

// Apply authentication and tenant middleware to all routes
router.use(authMiddleware);
router.use(tenantMiddleware);

// Allow read operations even with expired subscription
router.get("/", checkBusinessSubscriptionReadOnly, checkPermission("invoice", "read"), getInvoices);

// Require active subscription for write operations
router.post("/", checkBusinessSubscription, checkPermission("invoice", "create"), createInvoice);
router.patch("/:id/status", checkBusinessSubscription, checkPermission("invoice", "update"), updateInvoiceStatus);

module.exports = router;
