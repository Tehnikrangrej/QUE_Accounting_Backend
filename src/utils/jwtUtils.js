const jwt = require("jsonwebtoken");

//////////////////////////////////////////////////////
// JWT UTILITY FUNCTIONS
//////////////////////////////////////////////////////

/**
 * JWT Configuration
 */
const JWT_CONFIG = {
  algorithm: "HS256",
  expiresIn: "7d",
  issuer: process.env.JWT_ISSUER || "QUE-Accounting",
  audience: process.env.JWT_AUDIENCE || "QUE-Accounting-Users",
};

/**
 * Generate JWT token with user payload
 * @param {Object} user - User object from database
 * @param {Object} options - Additional options
 * @returns {String} JWT token
 */
const generateToken = (user, options = {}) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isSuperAdmin: user.role === "SUPER_ADMIN",
    // Add any additional claims
    ...options.additionalClaims,
  };

  const tokenOptions = {
    algorithm: JWT_CONFIG.algorithm,
    expiresIn: options.expiresIn || JWT_CONFIG.expiresIn,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
    // Add subject (user ID)
    subject: user.id,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, tokenOptions);
};

/**
 * Verify JWT token and return decoded payload
 * @param {String} token - JWT token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: [JWT_CONFIG.algorithm],
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    });

    return {
      success: true,
      payload: decoded,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        name: error.name,
        message: error.message,
      },
    };
  }
};

/**
 * Decode JWT without verification (for debugging)
 * @param {String} token - JWT token
 * @returns {Object} Decoded payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return null;
  }
};

/**
 * Generate refresh token
 * @param {String} userId - User ID
 * @returns {String} Refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { 
      userId, 
      type: "refresh",
      timestamp: Date.now(),
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    {
      expiresIn: "30d",
      algorithm: JWT_CONFIG.algorithm,
    }
  );
};

/**
 * Verify refresh token
 * @param {String} refreshToken - Refresh token
 * @returns {Object} Verification result
 */
const verifyRefreshToken = (refreshToken) => {
  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      {
        algorithms: [JWT_CONFIG.algorithm],
      }
    );

    if (decoded.type !== "refresh") {
      return { success: false, error: { message: "Invalid refresh token" } };
    }

    return { success: true, payload: decoded };
  } catch (error) {
    return {
      success: false,
      error: {
        name: error.name,
        message: error.message,
      },
    };
  }
};

/**
 * Extract token from Authorization header
 * @param {Object} req - Express request object
 * @returns {String|null} Token or null
 */
const extractTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return null;
  }

  // Support "Bearer <token>" format
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Support direct token (for API key scenarios)
  return authHeader;
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  JWT_CONFIG,
};
