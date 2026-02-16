const prisma = require("../config/prisma");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// CREATE BUSINESS
//////////////////////////////////////////////////////
exports.createBusiness = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    //////////////////////////////////////////////////////
    // 1️⃣ CREATE BUSINESS (INACTIVE BY DEFAULT)
    //////////////////////////////////////////////////////
    const business = await prisma.business.create({
      data: {
        name,
        ownerId: userId,
        isActive: false, // ❗ only subscription admin activates
      },
    });

    //////////////////////////////////////////////////////
    // 2️⃣ CREATE SUBSCRIPTION (INACTIVE)
    //////////////////////////////////////////////////////
    await prisma.subscription.create({
      data: {
        businessId: business.id,
        status: "INACTIVE",
      },
    });

   //////////////////////////////////////////////////////
    // 3️⃣ CREATE ROLES
    //////////////////////////////////////////////////////

    // Admin role
    const adminRole = await prisma.role.create({
      data: {
        name: "Admin",
        businessId: business.id,
      },
    });

    // ⭐ Default User role (IMPORTANT FOR INVITE)
    await prisma.role.create({
      data: {
        name: "User",
        businessId: business.id,
      },
    });

    //////////////////////////////////////////////////////
    // 4️⃣ ASSIGN ALL PERMISSIONS TO ADMIN
    //////////////////////////////////////////////////////
    const permissions = await prisma.permission.findMany();

    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({
          roleId: adminRole.id,
          permissionId: p.id,
        })),
      });
    }

    //////////////////////////////////////////////////////
    // 5️⃣ ADD OWNER AS BUSINESS ADMIN
    //////////////////////////////////////////////////////
    await prisma.businessUser.create({
      data: {
        userId,
        businessId: business.id,
        roleId: adminRole.id,
      },
    });

    //////////////////////////////////////////////////////
    // ⭐ AUTO SET ACTIVE BUSINESS FOR USER
    //////////////////////////////////////////////////////
    await prisma.user.update({
      where: { id: userId },
      data: {
        activeBusinessId: business.id,
      },
    });

    return successResponse(res, business, "Business created", 201);

  } catch (error) {
    console.error("Create business error:", error);
    return errorResponse(res, error.message, 500);
  }
};

