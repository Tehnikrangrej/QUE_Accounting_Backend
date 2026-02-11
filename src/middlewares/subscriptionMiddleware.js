const SubscriptionService = require("../services/subscriptionService");
const { errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// SUBSCRIPTION MIDDLEWARE
//////////////////////////////////////////////////////

/**
 * Middleware to check if business has active subscription
 * This should be applied after authentication and tenant middleware
 * 
 * Usage: router.use(checkBusinessSubscription);
 * 
 * Behavior:
 * - Fetches subscription using businessId from request (set by tenant middleware)
 * - Allows request only if status === ACTIVE and expiresAt is in future
 * - Returns 403 Forbidden if subscription is inactive or expired
 */
const checkBusinessSubscription = async (req, res, next) => {
  try {
    // Get businessId from request (should be set by tenant middleware)
    const businessId = req.business?.id || req.businessId;

    if (!businessId) {
      return errorResponse(
        res, 
        "Business ID not found in request. Ensure tenant middleware is applied first.", 
        400
      );
    }

    // Check if subscription is active
    const isActive = await SubscriptionService.isSubscriptionActive(businessId);

    if (!isActive) {
      return errorResponse(
        res, 
        "Your subscription has expired. Please contact support.", 
        403
      );
    }

    // Optionally attach subscription details to request for use in controllers
    const subscription = await SubscriptionService.getSubscription(businessId);
    req.subscription = subscription;

    next();
  } catch (error) {
    console.error("Subscription Middleware Error:", error);
    return errorResponse(res, "Internal server error while checking subscription", 500);
  }
};

/**
 * Middleware to check subscription with optional bypass for read operations
 * Useful for endpoints that should allow read access even with expired subscription
 */
const checkBusinessSubscriptionReadOnly = async (req, res, next) => {
  try {
    const businessId = req.business?.id || req.businessId;

    if (!businessId) {
      return errorResponse(
        res, 
        "Business ID not found in request. Ensure tenant middleware is applied first.", 
        400
      );
    }

    const subscription = await SubscriptionService.getSubscription(businessId);
    req.subscription = subscription;

    // Allow read operations even with inactive subscription
    if (req.method === 'GET') {
      return next();
    }

    // For write operations, require active subscription
    if (!subscription.isActive) {
      return errorResponse(
        res, 
        "Your subscription has expired. Please contact support to perform write operations.", 
        403
      );
    }

    next();
  } catch (error) {
    console.error("Subscription Middleware Error:", error);
    return errorResponse(res, "Internal server error while checking subscription", 500);
  }
};

/**
 * Middleware to check subscription and add subscription headers
 * Adds subscription info to response headers for frontend consumption
 */
const checkBusinessSubscriptionWithHeaders = async (req, res, next) => {
  try {
    const businessId = req.business?.id || req.businessId;

    if (!businessId) {
      return errorResponse(
        res, 
        "Business ID not found in request. Ensure tenant middleware is applied first.", 
        400
      );
    }

    const subscription = await SubscriptionService.getSubscription(businessId);
    
    // Add subscription info to headers
    res.setHeader('X-Subscription-Status', subscription.status);
    res.setHeader('X-Subscription-Expires-At', subscription.expiresAt);
    res.setHeader('X-Subscription-Remaining-Days', subscription.remainingDays);
    res.setHeader('X-Subscription-Active', subscription.isActive);

    req.subscription = subscription;

    if (!subscription.isActive) {
      return errorResponse(
        res, 
        "Your subscription has expired. Please contact support.", 
        403
      );
    }

    next();
  } catch (error) {
    console.error("Subscription Middleware Error:", error);
    return errorResponse(res, "Internal server error while checking subscription", 500);
  }
};

// Export the main middleware for backward compatibility
const subscriptionMiddleware = checkBusinessSubscription;

module.exports = {
  checkBusinessSubscription,
  checkBusinessSubscriptionReadOnly,
  checkBusinessSubscriptionWithHeaders,
  subscriptionMiddleware, // Backward compatibility
};
