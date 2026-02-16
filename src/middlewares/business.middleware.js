const prisma = require("../config/prisma");

module.exports = async (req, res, next) => {
  try {
    const { userId, activeBusinessId } = req.user;

    //////////////////////////////////////////////////////
    // 1️⃣ User must have active business
    //////////////////////////////////////////////////////
    if (!activeBusinessId) {
      return res.status(400).json({
        success: false,
        message: "No active business found",
      });
    }

    //////////////////////////////////////////////////////
    // 2️⃣ Membership + business + subscription
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
    // 3️⃣ BUSINESS MUST BE ACTIVE
    //////////////////////////////////////////////////////
    if (!membership.business.isActive) {
      return res.status(403).json({
        success: false,
        message: "Business inactive. Waiting for subscription activation.",
      });
    }

    //////////////////////////////////////////////////////
    // 4️⃣ SUBSCRIPTION MUST BE ACTIVE
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
    // 5️⃣ Attach for next middleware/controllers
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
