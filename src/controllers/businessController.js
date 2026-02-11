const prisma = require("../config/prisma");
const { generateToken } = require("../utils/jwtUtils");
const { successResponse, errorResponse } = require("../utils/response");

exports.createBusiness = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    const business = await prisma.$transaction(async (tx) => {
      const newBusiness = await tx.business.create({
        data: {
          name,
          ownerId: userId,
        },
      });

      await tx.subscription.create({
        data: {
          businessId: newBusiness.id,
          status: "INACTIVE",
        },
      });

      const adminRole = await tx.role.create({
        data: {
          name: "Admin",
          businessId: newBusiness.id,
        },
      });

      const permissions = await tx.permission.findMany();

      for (let perm of permissions) {
        await tx.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        });
      }

      await tx.businessUser.create({
        data: {
          userId,
          businessId: newBusiness.id,
          roleId: adminRole.id,
        },
      });

      return newBusiness;
    });

    // Generate token with proper user data
    const token = generateToken({
      id: userId,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
    });

    return successResponse(res, {
      business,
      token,
    }, "Business created successfully", 201);
  } catch (error) {
    console.error("Create business error:", error);
    return errorResponse(res, error.message, 500);
  }
};

exports.switchBusiness = async (req, res) => {
  try {
    const { businessId } = req.body;
    const userId = req.user.userId;

    const membership = await prisma.businessUser.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
    });

    if (!membership) {
      return errorResponse(res, "Not a member of this business", 403);
    }

    // Generate token with active business context
    const token = generateToken({
      id: userId,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      additionalClaims: {
        activeBusinessId: businessId,
      },
    });

    return successResponse(res, {
      token,
      activeBusinessId: businessId,
    }, "Business switched successfully");
  } catch (error) {
    console.error("Switch business error:", error);
    return errorResponse(res, error.message, 500);
  }
};
