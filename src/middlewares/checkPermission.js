const prisma = require("../config/prisma");
const { errorResponse } = require("../utils/response");

const checkPermission = (moduleName, action) => {
  return async (req, res, next) => {
    try {

      const userId = req.user.userId || req.user.id;
      const businessId = req.business.id;

      console.log("CHECK:", moduleName, action);
      console.log("USER:", userId);
      console.log("BUSINESS:", businessId);

      const permission = await prisma.userPermission.findFirst({
        where: {
          businessUser: {
            userId: userId,
            businessId: businessId,
            isActive: true,
          },
          permission: {
            action: action,
            module: {
              name: moduleName,
            },
          },
        },
      });

      if (!permission) {
        return errorResponse(
          res,
          `Permission denied (${moduleName}:${action})`,
          403
        );
      }

      next();
    } catch (err) {
      console.error("Permission Error:", err);
      return errorResponse(res, "Internal server error", 500);
    }
  };
};

module.exports = checkPermission;