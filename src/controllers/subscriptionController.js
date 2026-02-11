const SubscriptionService = require("../services/subscriptionService");
const { successResponse, errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// SUBSCRIPTION CONTROLLER
//////////////////////////////////////////////////////

/**
 * Get subscription details for a business
 * Admin only endpoint
 */
exports.getSubscription = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return errorResponse(res, "Business ID is required", 400);
    }

    const subscription = await SubscriptionService.getSubscription(businessId);
    
    return successResponse(res, subscription, "Subscription details retrieved successfully");
  } catch (error) {
    console.error("Get subscription error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Activate subscription for a business
 * Admin only endpoint
 */
exports.activateSubscription = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { 
      durationMonths = 1, 
      planName, 
      notes 
    } = req.body;

    if (!businessId) {
      return errorResponse(res, "Business ID is required", 400);
    }

    if (durationMonths < 1 || durationMonths > 36) {
      return errorResponse(res, "Duration must be between 1 and 36 months", 400);
    }

    const subscription = await SubscriptionService.activateSubscription(businessId, {
      durationMonths,
      planName,
      notes,
    });

    return successResponse(res, subscription, "Subscription activated successfully");
  } catch (error) {
    console.error("Activate subscription error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Extend subscription for a business
 * Admin only endpoint
 */
exports.extendSubscription = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { 
      durationMonths = 1, 
      planName, 
      notes 
    } = req.body;

    if (!businessId) {
      return errorResponse(res, "Business ID is required", 400);
    }

    if (durationMonths < 1 || durationMonths > 36) {
      return errorResponse(res, "Duration must be between 1 and 36 months", 400);
    }

    const subscription = await SubscriptionService.extendSubscription(businessId, {
      durationMonths,
      planName,
      notes,
    });

    return successResponse(res, subscription, "Subscription extended successfully");
  } catch (error) {
    console.error("Extend subscription error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Deactivate subscription for a business
 * Admin only endpoint
 */
exports.deactivateSubscription = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return errorResponse(res, "Business ID is required", 400);
    }

    const subscription = await SubscriptionService.deactivateSubscription(businessId);

    return successResponse(res, subscription, "Subscription deactivated successfully");
  } catch (error) {
    console.error("Deactivate subscription error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all subscriptions (admin dashboard)
 * Admin only endpoint
 */
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { 
      status, 
      page = 1, 
      limit = 50 
    } = req.query;

    const subscriptions = await SubscriptionService.getAllSubscriptions({
      status,
      page: parseInt(page),
      limit: parseInt(limit),
    });

    return successResponse(res, subscriptions, "Subscriptions retrieved successfully");
  } catch (error) {
    console.error("Get all subscriptions error:", error);
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get subscription statistics (admin dashboard)
 * Admin only endpoint
 */
exports.getSubscriptionStats = async (req, res) => {
  try {
    const prisma = require("../config/prisma");
    
    const stats = await prisma.subscription.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const totalBusinesses = await prisma.business.count();
    
    // Calculate active/expired based on actual dates
    const now = new Date();
    const activeCount = await prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          gt: now
        }
      }
    });

    const expiredCount = await prisma.subscription.count({
      where: {
        OR: [
          { status: 'EXPIRED' },
          {
            status: 'ACTIVE',
            expiresAt: {
              lt: now
            }
          }
        ]
      }
    });

    const statistics = {
      totalBusinesses,
      activeSubscriptions: activeCount,
      expiredSubscriptions: expiredCount,
      inactiveSubscriptions: totalBusinesses - activeCount - expiredCount,
      statusBreakdown: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {})
    };

    return successResponse(res, statistics, "Subscription statistics retrieved successfully");
  } catch (error) {
    console.error("Get subscription stats error:", error);
    return errorResponse(res, error.message, 500);
  }
};
