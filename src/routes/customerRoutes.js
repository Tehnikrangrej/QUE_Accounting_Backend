const router = require("express").Router();
const authMiddleware = require("../middlewares/authMiddleware").default || require("../middlewares/authMiddleware");
const tenantMiddleware = require("../middlewares/tenantMiddleware");
const { checkBusinessSubscriptionReadOnly } = require("../middlewares/subscriptionMiddleware");
const { checkBusinessSubscription } = require("../middlewares/subscriptionMiddleware");
const checkPermission = require("../middlewares/permissionMiddleware");

const controller = require("../controllers/customerController");

// Apply authentication and tenant middleware to all routes
router.use(authMiddleware, tenantMiddleware);

// Allow read operations even with expired subscription
router.get("/", checkBusinessSubscriptionReadOnly, checkPermission("customer.read"), controller.getCustomers);

// Require active subscription for write operations
router.post("/", checkBusinessSubscription, checkPermission("customer.create"), controller.createCustomer);
router.put("/:id", checkBusinessSubscription, checkPermission("customer.update"), controller.updateCustomer);
router.delete("/:id", checkBusinessSubscription, checkPermission("customer.delete"), controller.deleteCustomer);

module.exports = router;
