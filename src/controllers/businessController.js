const prisma = require("../config/prisma");
const {generateToken}  = require("../utils/jwtUtils");
const { successResponse, errorResponse } = require("../utils/response");

exports.createBusiness = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    // 1 create business
    const business = await prisma.business.create({
      data: {
        name,
        ownerId: userId,
      },
    });

    // 2 create subscription (always)
    await prisma.subscription.create({
      data: {
        businessId: business.id,
        status: "INACTIVE",
      },
    });

    // 3 create admin role
    const adminRole = await prisma.role.create({
      data: {
        name: "Admin",
        businessId: business.id,
      },
    });

    // 4 assign permissions
    const permissions = await prisma.permission.findMany();

    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map(p => ({
          roleId: adminRole.id,
          permissionId: p.id,
        })),
      });
    }

    // 5 add owner as business admin
    await prisma.businessUser.create({
      data: {
        userId,
        businessId: business.id,
        roleId: adminRole.id,
      },
    });

    return successResponse(res, business, "Business created", 201);

  } catch (error) {
    console.error(error);
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

    const token = generateToken({
  userId: userId,   // ❗ not id
  email: req.user.email,
  role: req.user.role,
  isActive: req.user.isActive,
  activeBusinessId: businessId   // ❗ direct field
});

    return successResponse(
      res,
      {
        token,
        activeBusinessId: businessId,
      },
      "Business switched successfully"
    );

  } catch (error) {
    console.error("Switch business error:", error);
    return errorResponse(res, error.message, 500);
  }
};
