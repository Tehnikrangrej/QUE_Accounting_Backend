const router = require("express").Router();
const authMiddleware= require("../middlewares/authMiddleware");

const checkBusinessSubscriptionReadOnly = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/checkPermission");
const businessMiddleware = require("../middlewares/business.middleware");
const controller = require("../controllers/customerController");

// Apply authentication and tenant middleware to all routes
router.use(authMiddleware);

// Allow read operations even with expired subscription
router.get("/", businessMiddleware, checkBusinessSubscriptionReadOnly, checkPermission("customer", "read"), controller.getCustomers);

// Require active subscription for write operations
router.post("/", businessMiddleware, checkBusinessSubscriptionReadOnly, checkPermission("customer", "create"), controller.createCustomer);
router.put("/:id", businessMiddleware, checkBusinessSubscriptionReadOnly, checkPermission("customer", "update"), controller.updateCustomer);
router.delete("/:id", businessMiddleware, checkBusinessSubscriptionReadOnly, checkPermission("customer", "delete"), controller.deleteCustomer);

module.exports = router;
