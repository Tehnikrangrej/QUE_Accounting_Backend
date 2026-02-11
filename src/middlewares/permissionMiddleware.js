const prisma = require("../config/prisma");
const { errorResponse } = require("../utils/response");

const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      const { membership } = req;

      if (!membership) {
        return errorResponse(res, "Membership context missing", 500);
      }

      // 1. Check if user is Admin (Admin role usually has all permissions)
      // In this system, we could either hardcode 'Admin' or check if the Admin role has all permissions.
      // Let's check if the role name is 'Admin' for simplicity, or look up permissions.
      if (membership.role.name === "Admin") {
        return next();
      }

      // 2. Find the permission ID for module.action
      const permission = await prisma.permission.findUnique({
        where: {
          module_action: { module, action },
        },
      });

      if (!permission) {
        // If the permission doesn't exist in the DB, it can't be assigned.
        // For development, we might want to auto-create it or just deny.
        return errorResponse(res, `Permission ${module}.${action} not defined`, 403);
      }

      // 3. Check Role Permissions
      const rolePermission = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: membership.roleId,
            permissionId: permission.id,
          },
        },
      });

      if (rolePermission) {
        return next();
      }

      // 4. Check Direct User Permissions
      const userPermission = await prisma.userPermission.findUnique({
        where: {
          businessUserId_permissionId: {
            businessUserId: membership.id,
            permissionId: permission.id,
          },
        },
      });

      if (userPermission) {
        return next();
      }

      return errorResponse(res, `Permission denied: ${module}.${action}`, 403);
    } catch (error) {
      console.error("Permission Middleware Error:", error);
      return errorResponse(res, "Internal server error");
    }
  };
};

module.exports = checkPermission;
