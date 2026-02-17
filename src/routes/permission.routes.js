const router = require("express").Router();

const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const adminOnly = require("../middlewares/adminOnly");

const controller = require("../controllers/permissionController");

//////////////////////////////////////////////////////
// GLOBAL MIDDLEWARE
//////////////////////////////////////////////////////
router.use(authMiddleware);
router.use(businessMiddleware);
router.use(adminOnly);

//////////////////////////////////////////////////////
// PERMISSION MANAGEMENT
//////////////////////////////////////////////////////

// Assign CRUD permissions
router.post("/user/:userId", controller.assignCrudPermissionsToUser);

// Remove permissions
router.delete("/user/:userId", controller.removeCrudPermissionsFromUser);

// Get user permissions
router.get("/user/:userId", controller.getUserPermissions);

module.exports = router;
