const express = require("express");
const {
  getBusinessUsers,
  inviteUser,
  toggleUserStatus,
  assignDirectPermission,
  removeDirectPermission,
} = require("../controllers/userManagementController");
const { getAllPermissions } = require("../controllers/permissionController");
const authMiddleware = require("../middlewares/authMiddleware");
const businessMiddleware = require("../middlewares/business.middleware");
const checkPermission = require("../middlewares/permissionMiddleware");

const router = express.Router();

router.use(authMiddleware);
router.use(businessMiddleware);

// Only Admin can manage users and permissions
router.get("/", checkPermission("user", "read"), getBusinessUsers);
router.get("/permissions", checkPermission("user", "read"), getAllPermissions);
router.post("/invite", checkPermission("user", "create"), inviteUser);
router.patch("/:membershipId/status", checkPermission("user", "update"), toggleUserStatus);
router.post("/:membershipId/permissions", checkPermission("user", "update"), assignDirectPermission);
router.delete("/:membershipId/permissions/:permissionId", checkPermission("user", "update"), removeDirectPermission);

module.exports = router;
