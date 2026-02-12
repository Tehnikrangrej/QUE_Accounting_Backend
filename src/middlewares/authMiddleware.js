const { verifyToken, extractTokenFromHeader } = require("../utils/jwtUtils");

const authMiddleware = (req, res, next) => {
  const token = extractTokenFromHeader(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const { success, payload, error } = verifyToken(token);

  if (!success) {
    return res.status(401).json({
      success: false,
      message: error?.message || "Invalid token",
    });
  }

  //////////////////////////////////////////////////////
  // REQUIRED PAYLOAD VALIDATION
  //////////////////////////////////////////////////////
  if (!payload.userId || !payload.email || !payload.role) {
    return res.status(401).json({
      success: false,
      message: "Invalid token payload. Missing required fields.",
    });
  }

  if (payload.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Account is inactive",
    });
  }

  req.user = {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    isActive: payload.isActive,
    activeBusinessId: payload.activeBusinessId || null, // Ensure this field is always present 
  };

  next();
};

module.exports = authMiddleware;
