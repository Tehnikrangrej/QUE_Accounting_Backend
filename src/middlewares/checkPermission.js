const prisma = require("../config/prisma");
const { errorResponse } = require("../utils/response");

const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {

      const userId = req.user.userId || req.user.id;
      const businessId = req.business.id;

      //////////////////////////////////////////////////////
      // GET MEMBERSHIP + PERMISSIONS
      //////////////////////////////////////////////////////
      const membership = await prisma.businessUser.findFirst({
        where: {
          userId,
          businessId,
          isActive: true,
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
          userPermissions: {
            include: { permission: true },
          },
        },
      });

      if (!membership) {
        return errorResponse(res, "Access denied", 403);
      }

      //////////////////////////////////////////////////////
      // OWNER BYPASS ONLY
      //////////////////////////////////////////////////////
      if (membership.role?.name === "Owner") {
        return next();
      }

      const roleAllowed =
        membership.role?.rolePermissions?.some(
          (rp) =>
            rp.permission.module === module &&
            rp.permission.action === action
        ) || false;

      const userAllowed =
        membership.userPermissions?.some(
          (up) =>
            up.permission.module === module &&
            up.permission.action === action
        ) || false;

      if (!roleAllowed && !userAllowed) {
        return errorResponse(
          res,
          `Permission denied (${module}:${action})`,
          403
        );
      }

      next();

    } catch (error) {
      console.error("checkPermission error:", error);
      return errorResponse(res, "Internal server error", 500);
    }
  };
};

module.exports = checkPermission;
