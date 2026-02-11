const express = require("express");
const {
  getSubscription,
  activateSubscription,
  extendSubscription,
  deactivateSubscription,
  getAllSubscriptions,
  getSubscriptionStats,
} = require("../controllers/subscriptionController");
const { requireSuperAdmin } = require("../middlewares/superAdminMiddleware");

const router = express.Router();

// Apply super admin middleware to all subscription management routes
router.use(requireSuperAdmin);

//////////////////////////////////////////////////////
// ADMIN SUBSCRIPTION MANAGEMENT ENDPOINTS
//////////////////////////////////////////////////////

/**
 * GET /api/admin/subscriptions/stats
 * Get subscription statistics (admin dashboard)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "totalBusinesses": 150,
 *     "activeSubscriptions": 120,
 *     "expiredSubscriptions": 25,
 *     "inactiveSubscriptions": 5,
 *     "statusBreakdown": {
 *       "ACTIVE": 120,
 *       "EXPIRED": 25,
 *       "INACTIVE": 5
 *     }
 *   }
 * }
 */
router.get("/stats", getSubscriptionStats);

/**
 * GET /api/admin/subscriptions
 * Get all subscriptions with pagination and filtering
 * 
 * Query Parameters:
 * - status: ACTIVE | EXPIRED | INACTIVE (optional)
 * - page: page number (default: 1)
 * - limit: items per page (default: 50)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "businessId": "uuid",
 *       "status": "ACTIVE",
 *       "startDate": "2024-01-01T00:00:00.000Z",
 *       "expiresAt": "2024-02-01T00:00:00.000Z",
 *       "planName": "Premium",
 *       "notes": "Annual subscription",
 *       "remainingDays": 15,
 *       "isActive": true,
 *       "business": {
 *         "id": "uuid",
 *         "name": "Business Name",
 *         "createdAt": "2024-01-01T00:00:00.000Z"
 *       }
 *     }
 *   ]
 * }
 */
router.get("/", getAllSubscriptions);

/**
 * GET /api/admin/subscriptions/:businessId
 * Get subscription details for a specific business
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "uuid",
 *     "businessId": "uuid",
 *     "status": "ACTIVE",
 *     "startDate": "2024-01-01T00:00:00.000Z",
 *     "expiresAt": "2024-02-01T00:00:00.000Z",
 *     "planName": "Premium",
 *     "notes": "Annual subscription",
 *     "remainingDays": 15,
 *     "isActive": true
 *   }
 * }
 */
router.get("/:businessId", getSubscription);

/**
 * POST /api/admin/subscriptions/:businessId/activate
 * Activate subscription for a business
 * 
 * Request Body:
 * {
 *   "durationMonths": 12,        // 1-36 months, default: 1
 *   "planName": "Premium",       // optional
 *   "notes": "Annual payment received via PayPal" // optional
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Subscription activated successfully",
 *   "data": {
 *     "id": "uuid",
 *     "businessId": "uuid",
 *     "status": "ACTIVE",
 *     "startDate": "2024-01-01T00:00:00.000Z",
 *     "expiresAt": "2025-01-01T00:00:00.000Z",
 *     "planName": "Premium",
 *     "notes": "Annual payment received via PayPal"
 *   }
 * }
 */
router.post("/:businessId/activate", activateSubscription);

/**
 * POST /api/admin/subscriptions/:businessId/extend
 * Extend subscription for a business
 * 
 * Request Body:
 * {
 *   "durationMonths": 6,         // 1-36 months, default: 1
 *   "planName": "Premium",        // optional
 *   "notes": "Extension payment received" // optional
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Subscription extended successfully",
 *   "data": {
 *     "id": "uuid",
 *     "businessId": "uuid",
 *     "status": "ACTIVE",
 *     "startDate": "2024-01-01T00:00:00.000Z",
 *     "expiresAt": "2025-07-01T00:00:00.000Z", // Extended from previous expiry
 *     "planName": "Premium",
 *     "notes": "Extension payment received"
 *   }
 * }
 */
router.post("/:businessId/extend", extendSubscription);

/**
 * POST /api/admin/subscriptions/:businessId/deactivate
 * Deactivate subscription for a business
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Subscription deactivated successfully",
 *   "data": {
 *     "id": "uuid",
 *     "businessId": "uuid",
 *     "status": "INACTIVE",
 *     "startDate": "2024-01-01T00:00:00.000Z",
 *     "expiresAt": "2025-01-01T00:00:00.000Z",
 *     "planName": "Premium",
 *     "notes": "Deactivated by admin due to policy violation"
 *   }
 * }
 */
router.post("/:businessId/deactivate", deactivateSubscription);

module.exports = router;
