const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// GET ALL BUSINESS USERS
//////////////////////////////////////////////////////

const getBusinessUsers = async (req, res) => {
  try {
    const businessId = req.business.id;

    const users = await prisma.businessUser.findMany({
      where: { businessId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        role: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return successResponse(res, "Users fetched successfully", users);
  } catch (error) {
    console.error("Get Users Error:", error);
    return errorResponse(res, "Internal server error");
  }
};

//////////////////////////////////////////////////////
// INVITE USER
//////////////////////////////////////////////////////

const inviteUser = async (req, res) => {
  try {
    const { email, roleId } = req.body;
    const businessId = req.business.id;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const existing = await prisma.businessUser.findUnique({
      where: {
        userId_businessId: {
          userId: user.id,
          businessId,
        },
      },
    });

    if (existing) {
      return errorResponse(res, "User already in this business", 400);
    }

    const membership = await prisma.businessUser.create({
      data: {
        userId: user.id,
        businessId,
        roleId,
      },
    });

    return successResponse(res, "User invited successfully", membership);
  } catch (error) {
    console.error("Invite User Error:", error);
    return errorResponse(res, "Internal server error");
  }
};

//////////////////////////////////////////////////////
// TOGGLE USER STATUS
//////////////////////////////////////////////////////

const toggleUserStatus = async (req, res) => {
  try {
    const { membershipId } = req.params;

    const membership = await prisma.businessUser.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      return errorResponse(res, "Membership not found", 404);
    }

    const updated = await prisma.businessUser.update({
      where: { id: membershipId },
      data: {
        isActive: !membership.isActive,
      },
    });

    return successResponse(res, "User status updated", updated);
  } catch (error) {
    console.error("Toggle Status Error:", error);
    return errorResponse(res, "Internal server error");
  }
};

//////////////////////////////////////////////////////
// ASSIGN DIRECT PERMISSION
//////////////////////////////////////////////////////

const assignDirectPermission = async (req, res) => {
  try {
    const { membershipId } = req.params;
    const { permissionId } = req.body;

    const record = await prisma.userPermission.create({
      data: {
        businessUserId: membershipId,
        permissionId,
      },
    });

    return successResponse(res, "Permission assigned", record);
  } catch (error) {
    console.error("Assign Permission Error:", error);
    return errorResponse(res, "Internal server error");
  }
};

//////////////////////////////////////////////////////
// REMOVE DIRECT PERMISSION
//////////////////////////////////////////////////////

const removeDirectPermission = async (req, res) => {
  try {
    const { membershipId, permissionId } = req.params;

    await prisma.userPermission.deleteMany({
      where: {
        businessUserId: membershipId,
        permissionId,
      },
    });

    return successResponse(res, "Permission removed");
  } catch (error) {
    console.error("Remove Permission Error:", error);
    return errorResponse(res, "Internal server error");
  }
};

//////////////////////////////////////////////////////
// EXPORT ALL
//////////////////////////////////////////////////////

module.exports = {
  getBusinessUsers,
  inviteUser,
  toggleUserStatus,
  assignDirectPermission,
  removeDirectPermission,
};
