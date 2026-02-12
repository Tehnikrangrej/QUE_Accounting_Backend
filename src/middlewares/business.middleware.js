const prisma = require("../config/prisma");

module.exports = async (req, res, next) => {
  try {
    const { userId, activeBusinessId } = req.user;

    // ❌ user has not switched business
    if (!activeBusinessId) {
      return res.status(400).json({
        message: "No active business selected. Please switch business."
      });
    }

    // ✅ find membership for selected business
    const membership = await prisma.businessUser.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: activeBusinessId,
        }
      },
      include: {
        business: {
          include: {
            subscription: true
          }
        },
        role: true // ✅ Needed for permissionMiddleware
      }
    });

    if (!membership) {
      return res.status(404).json({
        message: "You are not member of this business"
      });
    }

    // ✅ attach selected business
    req.business = membership.business;
    req.membership = membership;

    console.log("===== BUSINESS DEBUG =====");
    console.log("User:", req.user.userId);
    console.log("Active Business ID:", activeBusinessId);
    console.log("Loaded Business Name:", membership.business.name);
    console.log("Subscription Status:", membership.business.subscription?.status);
    console.log("==========================");

    next();

  } catch (error) {
    console.error("Business middleware error:", error);
    res.status(500).json({ message: error.message });
  }
};
