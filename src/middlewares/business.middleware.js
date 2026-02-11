const prisma = require("../config/prisma");

module.exports = async (req, res, next) => {
  try {
    const { userId } = req.user;

    // Find membership of this user
    const membership = await prisma.businessUser.findFirst({
      where: {
        userId,
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
        business: {
          include: { subscription: true },
        },
      },
    });

    if (!membership) {
      return res.status(404).json({ message: "No business found for this user" });
    }

    req.membership = membership;
    req.business = membership.business;

    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
