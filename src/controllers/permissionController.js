const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// ASSIGN CRUD PERMISSIONS TO USER (ADMIN ONLY)
//////////////////////////////////////////////////////
const assignCrudPermissionsToUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { module, actions } = req.body;
    const businessId = req.business.id;

    if (!module || !actions || !Array.isArray(actions)) {
      return errorResponse(res, "module and actions required", 400);
    }

    //////////////////////////////////////////////////////
    // 1️⃣ FIND MEMBERSHIP
    //////////////////////////////////////////////////////
    const membership = await prisma.businessUser.findFirst({
      where: {
        userId,
        businessId,
        isActive: true,
      },
    });

    if (!membership) {
      return errorResponse(res, "User not found in business", 404);
    }

    //////////////////////////////////////////////////////
    // 2️⃣ FIND PERMISSIONS
    //////////////////////////////////////////////////////
    const permissions = await prisma.permission.findMany({
      where: {
        module,
        action: { in: actions },
      },
    });

    if (!permissions.length) {
      return errorResponse(res, "Permissions not found", 404);
    }

    //////////////////////////////////////////////////////
    // 3️⃣ CREATE USER PERMISSIONS (NO DUPLICATE)
    //////////////////////////////////////////////////////
    const data = permissions.map((p) => ({
      businessUserId: membership.id,
      permissionId: p.id,
    }));

    await prisma.userPermission.createMany({
      data,
      skipDuplicates: true,
    });

    return successResponse(
      res,
      permissions,
      "Permissions assigned successfully"
    );
  } catch (error) {
    console.error("assignCrudPermissionsToUser error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// REMOVE CRUD PERMISSION FROM USER
//////////////////////////////////////////////////////
const removeCrudPermissionsFromUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { module, actions } = req.body;
    const businessId = req.business.id;

    const membership = await prisma.businessUser.findFirst({
      where: { userId, businessId },
    });

    if (!membership) {
      return errorResponse(res, "User not found", 404);
    }

    const permissions = await prisma.permission.findMany({
      where: {
        module,
        action: { in: actions },
      },
    });

    await prisma.userPermission.deleteMany({
      where: {
        businessUserId: membership.id,
        permissionId: { in: permissions.map((p) => p.id) },
      },
    });

    return successResponse(res, null, "Permissions removed");
  } catch (error) {
    console.error("removeCrudPermissionsFromUser error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

//////////////////////////////////////////////////////
// GET USER PERMISSIONS
//////////////////////////////////////////////////////
const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const businessId = req.business.id;

    const membership = await prisma.businessUser.findFirst({
      where: { userId, businessId },
      include: {
        userPermissions: {
          include: { permission: true },
        },
      },
    });

    if (!membership) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(
      res,
      membership.userPermissions,
      "User permissions fetched"
    );
  } catch (error) {
    console.error("getUserPermissions error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = {
  assignCrudPermissionsToUser,
  removeCrudPermissionsFromUser,
  getUserPermissions,
};
