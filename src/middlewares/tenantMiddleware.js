const prisma = require("../config/prisma");
const { errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// TENANT MIDDLEWARE
//////////////////////////////////////////////////////

/**
 * Middleware to set up tenant context for multi-tenant application
 * This middleware should be applied after authentication
 * 
 * Usage: router.use(tenantMiddleware);
 * 
 * Behavior:
 * - Extracts businessId from x-business-id header
 * - Validates user membership in the business
 * - Sets req.business, req.businessId, req.membership
 * - Enforces business and user active status
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    const businessId = req.headers["x-business-id"];

    if (!businessId) {
      return errorResponse(res, "Business ID (x-business-id) header is required", 400);
    }

    // Get user membership in this business
    const membership = await prisma.businessUser.findUnique({
      where: {
        userId_businessId: {
          userId: req.user.userId,
          businessId,
        },
      },
      include: {
        business: {
          include: {
            subscription: true,
          },
        },
        role: true,
      },
    });

    if (!membership) {
      return errorResponse(res, "You are not a member of this business", 403);
    }

    if (!membership.isActive) {
      return errorResponse(res, "Your access to this business has been disabled", 403);
    }

    if (!membership.business.isActive) {
      return errorResponse(res, "This business is inactive", 403);
    }

    // Set tenant context for subsequent middleware and controllers
    req.businessId = businessId;
    req.business = membership.business;
    req.membership = membership;
    req.role = membership.role;

    next();
  } catch (error) {
    console.error("Tenant Middleware Error:", error);
    return errorResponse(res, "Internal server error", 500);
  }
};

module.exports = tenantMiddleware;
