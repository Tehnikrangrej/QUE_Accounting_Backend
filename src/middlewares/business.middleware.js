const prisma = require("../config/prisma");

module.exports = async (req, res, next) => {
  try {
    let { userId, activeBusinessId } = req.user;

    //////////////////////////////////////////////////////
    // 1️⃣ AUTO PICK BUSINESS IF NOT SET
    //////////////////////////////////////////////////////
    if (!activeBusinessId) {
      const firstMembership = await prisma.businessUser.findFirst({
        where: {
          userId,
          isActive: true,
        },
        include: {
          business: true,
        },
      });

      if (!firstMembership) {
        return res.status(400).json({
          success: false,
          message: "No active business found",
        });
      }

      activeBusinessId = firstMembership.businessId;

      // OPTIONAL: update user default business
      await prisma.user.update({
        where: { id: userId },
        data: { activeBusinessId },
      });

      req.user.activeBusinessId = activeBusinessId;
    }

    //////////////////////////////////////////////////////
    // 2️⃣ FIND MEMBERSHIP
    //////////////////////////////////////////////////////
    const membership = await prisma.businessUser.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: activeBusinessId,
        },
      },
      include: {
        role: true,
        business: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this business",
      });
    }

    //////////////////////////////////////////////////////
    // 3️⃣ BUSINESS ACTIVE
    //////////////////////////////////////////////////////
    if (!membership.business.isActive) {
      return res.status(403).json({
        success: false,
        message: "Business inactive",
      });
    }

    //////////////////////////////////////////////////////
    // 4️⃣ SUBSCRIPTION ACTIVE
    //////////////////////////////////////////////////////
    if (
      !membership.business.subscription ||
      membership.business.subscription.status !== "ACTIVE"
    ) {
      return res.status(403).json({
        success: false,
        message: "Subscription inactive",
      });
    }

    //////////////////////////////////////////////////////
    // 5️⃣ ATTACH TO REQUEST
    //////////////////////////////////////////////////////
    req.business = membership.business;
    req.membership = membership;

    next();

  } catch (error) {
    console.error("Business middleware error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
