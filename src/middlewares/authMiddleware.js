const { verifyToken, extractTokenFromHeader } = require("../utils/jwtUtils");
const { errorResponse } = require("../utils/response");

//////////////////////////////////////////////////////
// AUTHENTICATION MIDDLEWARE
//////////////////////////////////////////////////////

/**
 * Authentication middleware that verifies JWT tokens
 * and attaches user payload to request object
 * 
 * Usage: router.use(authMiddleware);
 * 
 * Features:
 * - JWT token verification with proper validation
 * - User status checking
 * - Detailed error responses
 * - Security headers
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = extractTokenFromHeader(req);

    if (!token) {
      return errorResponse(
        res, 
        "Authentication required. Please provide a valid token.", 
        401
      );
    }

    // Verify token
    const { success, payload, error } = verifyToken(token);

    if (!success) {
      // Handle different JWT errors appropriately
      let errorMessage = "Invalid token";
      let statusCode = 401;

      switch (error.name) {
        case "TokenExpiredError":
          errorMessage = "Token has expired. Please login again.";
          statusCode = 401;
          break;
        case "JsonWebTokenError":
          errorMessage = "Invalid token format or signature.";
          statusCode = 401;
          break;
        case "NotBeforeError":
          errorMessage = "Token not active yet.";
          statusCode = 401;
          break;
        default:
          errorMessage = "Token verification failed.";
          statusCode = 401;
      }

      return errorResponse(res, errorMessage, statusCode);
    }

    // Validate required payload fields
    if (!payload.userId || !payload.email || !payload.role) {
      return errorResponse(
        res, 
        "Invalid token payload. Missing required fields.", 
        401
      );
    }

    // Check if user is active (from token)
    if (payload.isActive === false) {
      return errorResponse(
        res, 
        "Account has been deactivated. Please contact support.", 
        403
      );
    }

    // Attach user payload to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      isActive: payload.isActive,
      isSuperAdmin: payload.isSuperAdmin || payload.role === "SUPER_ADMIN",
    };

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    next();

  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return errorResponse(
      res, 
      "Authentication failed. Please try again.", 
      500
    );
  }
};

/**
 * Optional authentication middleware
 * Allows request to proceed without authentication
 * but attaches user info if token is present
 * 
 * Usage: router.use(optionalAuthMiddleware);
 */
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req);

    if (!token) {
      // No token provided, continue without user context
      return next();
    }

    const { success, payload } = verifyToken(token);

    if (success) {
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        isActive: payload.isActive,
        isSuperAdmin: payload.isSuperAdmin || payload.role === "SUPER_ADMIN",
      };
    }

    // Continue regardless of token validity
    next();

  } catch (error) {
    console.error("Optional Auth Middleware Error:", error);
    // Continue without user context on error
    next();
  }
};

/**
 * Role-based authentication middleware factory
 * Creates middleware that checks if user has required role
 * 
 * Usage: router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(
        res, 
        "Authentication required.", 
        401
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res, 
        `Access denied. Required roles: ${allowedRoles.join(', ')}. Current role: ${req.user.role}`, 
        403
      );
    }

    next();
  };
};

/**
 * Minimum role requirement middleware factory
 * Creates middleware that checks if user has minimum required role
 * Role hierarchy: USER < ADMIN < SUPER_ADMIN
 * 
 * Usage: router.use(requireMinimumRole('ADMIN'));
 */
const requireMinimumRole = (minimumRole) => {
  const roleHierarchy = {
    'USER': 1,
    'ADMIN': 2,
    'SUPER_ADMIN': 3,
  };

  const minimumLevel = roleHierarchy[minimumRole];

  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(
        res, 
        "Authentication required.", 
        401
      );
    }

    const userLevel = roleHierarchy[req.user.role];

    if (!userLevel || userLevel < minimumLevel) {
      return errorResponse(
        res, 
        `Access denied. Minimum role required: ${minimumRole}. Current role: ${req.user.role}`, 
        403
      );
    }

    next();
  };
};

module.exports = authMiddleware;
